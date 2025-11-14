// ============================================================
// Schemas Zod para Sistema de Reglas de Negocio - Redpresu
// Fecha: 14-Nov-2025
// ============================================================

import { z } from 'zod';

export const ActionSchema = z.object({
  allow: z.boolean().optional(),
  max_limit: z.number().optional(),
  send_email: z.string().optional(), // Template ID
  downgrade_to: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
  block_feature: z.string().optional(),
  schedule_action: z.object({
    days: z.number(),
    action: z.string()
  }).optional(),
  message: z.string().optional() // Para UX
});

export const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  active: z.boolean().default(true),
  priority: z.number().default(10),
  condition: z.record(z.any()), // JsonLogic condition
  action: ActionSchema
});

export const BusinessRulesConfigSchema = z.object({
  version: z.number(),
  updated_at: z.string().datetime(),
  updated_by: z.string().email(),
  rules: z.array(RuleSchema)
});

export type BusinessRulesConfig = z.infer<typeof BusinessRulesConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Action = z.infer<typeof ActionSchema>;

// Tipos para audit log
export const AuditLogEntrySchema = z.object({
  id: z.string(),
  rule_id: z.string().optional(),
  company_id: z.string(),
  action: z.enum(['created', 'updated', 'rollback', 'activated', 'deactivated']),
  changed_by: z.string().optional(),
  changed_by_email: z.string().email().optional(),
  changes: z.record(z.any()).optional(),
  version_before: z.number().optional(),
  version_after: z.number().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.string().datetime()
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
