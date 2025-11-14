-- ============================================================
-- Sistema de Reglas de Negocio Configurables - Redpresu
-- Fecha: 14-Nov-2025
-- Descripción: Crea tablas para gestionar reglas de negocio
--              externas con auditoría completa
-- ============================================================

-- Tabla principal de reglas
CREATE TABLE redpresu.business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER REFERENCES redpresu.companies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  rules JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES redpresu.users(id),

  -- Para rollback
  previous_version JSONB,

  -- Índices
  CONSTRAINT unique_active_per_company UNIQUE (company_id, is_active)
);

-- Índices para performance
CREATE INDEX idx_business_rules_company_active
  ON redpresu.business_rules(company_id, is_active)
  WHERE is_active = true;

CREATE INDEX idx_business_rules_company
  ON redpresu.business_rules(company_id);

-- Tabla de auditoría
CREATE TABLE redpresu.rules_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES redpresu.business_rules(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'rollback', 'activated', 'deactivated'
  changed_by UUID REFERENCES redpresu.users(id),
  changed_by_email VARCHAR(255),
  changes JSONB, -- Diff de cambios o metadata
  version_before INTEGER,
  version_after INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rules_audit_company ON redpresu.rules_audit_log(company_id);
CREATE INDEX idx_rules_audit_rule ON redpresu.rules_audit_log(rule_id);
CREATE INDEX idx_rules_audit_date ON redpresu.rules_audit_log(created_at DESC);

-- RLS Policies para business_rules
ALTER TABLE redpresu.business_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access on business_rules"
  ON redpresu.business_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM redpresu.users
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

CREATE POLICY "Companies read own rules"
  ON redpresu.business_rules
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM redpresu.users
      WHERE id = auth.uid()
    )
  );

-- RLS Policies para audit log
ALTER TABLE redpresu.rules_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin read audit log"
  ON redpresu.rules_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM redpresu.users
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_business_rules_updated_at
  BEFORE UPDATE ON redpresu.business_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para auditoría automática
CREATE OR REPLACE FUNCTION log_business_rules_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO redpresu.rules_audit_log (
      rule_id, company_id, action, changed_by, changed_by_email,
      version_after, changes
    ) VALUES (
      NEW.id, NEW.company_id, 'created', NEW.updated_by,
      (SELECT email FROM auth.users WHERE id = NEW.updated_by),
      NEW.version,
      jsonb_build_object('rules', NEW.rules)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO redpresu.rules_audit_log (
      rule_id, company_id, action, changed_by, changed_by_email,
      version_before, version_after, changes
    ) VALUES (
      NEW.id, NEW.company_id,
      CASE
        WHEN OLD.is_active = true AND NEW.is_active = false THEN 'deactivated'
        WHEN OLD.is_active = false AND NEW.is_active = true THEN 'activated'
        ELSE 'updated'
      END,
      NEW.updated_by,
      (SELECT email FROM auth.users WHERE id = NEW.updated_by),
      OLD.version, NEW.version,
      jsonb_build_object(
        'old_rules', OLD.rules,
        'new_rules', NEW.rules,
        'is_active_changed', OLD.is_active != NEW.is_active
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_business_rules_changes
  AFTER INSERT OR UPDATE ON redpresu.business_rules
  FOR EACH ROW
  EXECUTE FUNCTION log_business_rules_changes();

-- Comentarios para documentación
COMMENT ON TABLE redpresu.business_rules IS 'Almacena reglas de negocio configurables en formato JSONB con versionado';
COMMENT ON TABLE redpresu.rules_audit_log IS 'Log de auditoría para cambios en business_rules';
COMMENT ON COLUMN redpresu.business_rules.rules IS 'JSONB con estructura: {version, updated_at, updated_by, rules: [{id, name, condition, action}]}';
COMMENT ON COLUMN redpresu.business_rules.previous_version IS 'Backup de la versión anterior para rollback';
