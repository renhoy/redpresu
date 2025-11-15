// ============================================================
// Business Rules Validator - Redpresu
// Funciones de validación que pueden ejecutarse en cliente o servidor
// ============================================================

import * as jsonLogic from 'json-logic-js';
import type { Rule } from '@/lib/types/business-rules';

export interface RuleContext {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  users_count: number;
  tariffs_count: number;
  budgets_count: number;
  days_since_payment: number;
  days_since_signup: number;
  is_trial: boolean;
  features_used: string[];
  action?: string;
  [key: string]: any;
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
