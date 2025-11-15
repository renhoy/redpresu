'use server';

// ============================================================
// Motor de Evaluación de Reglas de Negocio - Redpresu
// Evalúa reglas usando JsonLogic y ejecuta acciones automáticas
// ============================================================

import * as jsonLogic from 'json-logic-js';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getEmailService } from '@/lib/services/email';
import type { Rule, Action } from '@/lib/types/business-rules';

// Caché in-memory con TTL
const rulesCache = new Map<string, { rules: Rule[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export interface RuleContext {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  users_count: number;
  tariffs_count: number;
  budgets_count: number;
  days_since_payment: number;
  days_since_signup: number;
  is_trial: boolean;
  features_used: string[];
  action?: string; // Opcional: nombre de la acción que se intenta realizar
  [key: string]: any; // Campos custom
}

export interface EvaluationResult {
  allow: boolean;
  action?: Action;
  message?: string;
  matchedRule?: Rule;
}

/**
 * Evalúa todas las reglas de un company y retorna la acción resultante
 */
export async function evaluateRules(
  companyId: string,
  context: RuleContext
): Promise<EvaluationResult> {
  try {
    const rules = await getRulesForCompany(companyId);

    if (!rules || rules.length === 0) {
      return { allow: true }; // Sin reglas = permitir
    }

    // Ordenar por prioridad (menor número = mayor prioridad)
    const sortedRules = rules
      .filter(rule => rule.active)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const matches = jsonLogic.apply(rule.condition, context);

      if (matches) {
        logger.info({
          ruleId: rule.id,
          ruleName: rule.name,
          companyId,
          context
        }, 'Business rule matched');

        // Ejecutar acciones de la regla
        await executeRuleActions(rule, companyId, context);

        return {
          allow: rule.action.allow ?? true,
          action: rule.action,
          message: rule.action.message,
          matchedRule: rule
        };
      }
    }

    return { allow: true }; // Ninguna regla coincidió

  } catch (error) {
    logger.error({ error, companyId }, 'Error evaluating business rules');
    // Fail-open: en caso de error, permitir para no bloquear la app
    return { allow: true };
  }
}

/**
 * Ejecuta las acciones definidas en una regla
 */
async function executeRuleActions(
  rule: Rule,
  companyId: string,
  context: RuleContext
): Promise<void> {
  const { action } = rule;

  try {
    // Enviar email si está configurado
    if (action.send_email) {
      await sendRuleEmail(action.send_email, companyId, context);
    }

    // Downgrade de plan
    if (action.downgrade_to) {
      await downgradePlan(companyId, action.downgrade_to);
    }

    // Bloquear feature
    if (action.block_feature) {
      await blockFeature(companyId, action.block_feature);
    }

    // Programar acción futura
    if (action.schedule_action) {
      await scheduleAction(
        companyId,
        action.schedule_action.action,
        action.schedule_action.days
      );
    }

  } catch (error) {
    logger.error({ error, ruleId: rule.id, companyId }, 'Error executing rule actions');
  }
}

/**
 * Envía email usando el servicio agnóstico
 */
async function sendRuleEmail(
  templateId: string,
  companyId: string,
  context: RuleContext
): Promise<void> {
  const supabase = supabaseAdmin;

  // Obtener datos de la empresa e issuer
  const { data: company } = await supabase
    .from('companies')
    .select('name, status')
    .eq('id', companyId)
    .single();

  if (!company) {
    logger.warn({ companyId, templateId }, 'Company not found');
    return;
  }

  // Obtener email del issuer de la empresa
  const { data: issuer } = await supabase
    .from('issuers')
    .select('email, name')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (!issuer?.email) {
    logger.warn({ companyId, templateId }, 'No email found for company issuer');
    return;
  }

  const emailService = getEmailService();

  await emailService.sendTemplate(templateId, issuer.email, {
    company_name: issuer.name || company.name,
    plan: context.plan,
    app_name: 'Redpresu',
    upgrade_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    billing_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    days_overdue: context.days_since_payment,
    ...context
  });
}

/**
 * Downgrade de plan
 */
async function downgradePlan(
  companyId: string,
  targetPlan: 'FREE' | 'PRO' | 'ENTERPRISE'
): Promise<void> {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from('companies')
    .update({
      plan: targetPlan,
      downgraded_at: new Date().toISOString()
    })
    .eq('id', companyId);

  if (error) {
    logger.error({ error, companyId, targetPlan }, 'Error downgrading plan');
  } else {
    logger.info({ companyId, targetPlan }, 'Plan downgraded by business rule');
  }
}

/**
 * Bloquear feature
 */
async function blockFeature(companyId: string, feature: string): Promise<void> {
  const supabase = supabaseAdmin;

  // Crear tabla si no existe (migración futura)
  const { error } = await supabase
    .from('blocked_features')
    .insert({ company_id: companyId, feature, blocked_at: new Date().toISOString() });

  if (error && error.code !== '23505') { // Ignorar duplicados
    logger.error({ error, companyId, feature }, 'Error blocking feature');
  }
}

/**
 * Programar acción futura (ejemplo: crear tarea en cola)
 */
async function scheduleAction(
  companyId: string,
  action: string,
  days: number
): Promise<void> {
  const supabase = supabaseAdmin;

  const executeAt = new Date();
  executeAt.setDate(executeAt.getDate() + days);

  // Insertar en tabla de scheduled_actions (crear si no existe)
  const { error } = await supabase
    .from('scheduled_actions')
    .insert({
      company_id: companyId,
      action,
      execute_at: executeAt.toISOString(),
      status: 'pending'
    });

  if (error) {
    logger.error({ error, companyId, action }, 'Error scheduling action');
  }
}

/**
 * Obtiene reglas con caché
 * Busca tanto reglas específicas de la empresa como reglas globales
 * Prioridad: reglas específicas > reglas globales
 */
async function getRulesForCompany(companyId: string): Promise<Rule[]> {
  // Check cache
  const cached = rulesCache.get(companyId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rules;
  }

  const supabase = supabaseAdmin;

  // Buscar reglas específicas de la empresa Y reglas globales
  const { data, error } = await supabase
    .from('business_rules')
    .select('rules, company_id')
    .or(`company_id.eq.${companyId},company_id.is.null`)
    .eq('is_active', true);

  if (error) {
    logger.error({ error, companyId }, 'Error fetching business rules');
    return [];
  }

  if (!data || data.length === 0) {
    logger.info({ companyId }, 'No rules found for company');
    return [];
  }

  // Combinar reglas de todas las fuentes
  // Prioridad: reglas específicas primero, luego globales
  const allRules: Rule[] = [];

  // Primero agregar reglas específicas (company_id = companyId)
  const specificRules = data.find(r => r.company_id === parseInt(companyId));
  if (specificRules?.rules?.rules) {
    allRules.push(...(specificRules.rules.rules as Rule[]).map(r => ({
      ...r,
      priority: r.priority || 10 // Asegurar que tienen prioridad
    })));
  }

  // Luego agregar reglas globales (company_id IS NULL)
  const globalRules = data.find(r => r.company_id === null);
  if (globalRules?.rules?.rules) {
    allRules.push(...(globalRules.rules.rules as Rule[]).map(r => ({
      ...r,
      // Las reglas globales tienen prioridad más baja (+100)
      priority: (r.priority || 10) + 100
    })));
  }

  // Cachear
  rulesCache.set(companyId, { rules: allRules, timestamp: Date.now() });

  return allRules;
}

/**
 * Invalida caché cuando se actualizan reglas
 * Si companyId es 'global' o null, invalida toda la caché
 * porque las reglas globales afectan a todas las empresas
 */
export function invalidateRulesCache(companyId: string | null): void {
  if (!companyId || companyId === 'global' || companyId === 'null') {
    // Reglas globales cambiaron: invalidar TODA la caché
    rulesCache.clear();
    logger.info({}, 'All business rules cache invalidated (global rules changed)');
  } else {
    // Solo invalidar caché de esta empresa
    rulesCache.delete(companyId);
    logger.info({ companyId }, 'Business rules cache invalidated');
  }
}

/**
 * Limpia caché expirado (llamar en cron si es necesario)
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [companyId, cached] of rulesCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      rulesCache.delete(companyId);
    }
  }
}

/**
 * Validar reglas en dry-run (sin aplicar)
 */
export function validateRules(
  rules: Rule[],
  testContext: RuleContext
): { valid: boolean; matchedRule?: Rule; error?: string } {
  try {
    for (const rule of rules) {
      if (!rule.active) continue;

      const matches = jsonLogic.apply(rule.condition, testContext);
      if (matches) {
        return { valid: true, matchedRule: rule };
      }
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid rule syntax'
    };
  }
}
