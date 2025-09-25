-- =====================================================
-- MIGRACIÓN 001: Esquema inicial de la base de datos
-- =====================================================
-- Creación de tablas principales del sistema de presupuestos
-- Fecha: 2024-09-25
-- Descripción: Esquema base para usuarios, tarifas y presupuestos

-- =====================================================
-- TABLA: users
-- =====================================================
-- Extensión de la tabla auth.users de Supabase con campos personalizados
-- Almacena información adicional del usuario como rol y empresa
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'vendedor')),
    empresa_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios para la tabla users
COMMENT ON TABLE public.users IS 'Extensión de auth.users con campos personalizados para roles y empresa';
COMMENT ON COLUMN public.users.id IS 'Referencia directa al usuario en auth.users';
COMMENT ON COLUMN public.users.role IS 'Rol del usuario: superadmin (acceso total), admin (su empresa), vendedor (sus presupuestos)';
COMMENT ON COLUMN public.users.empresa_id IS 'ID de la empresa (siempre 1 en MVP)';
COMMENT ON COLUMN public.users.name IS 'Nombre completo del usuario';
COMMENT ON COLUMN public.users.email IS 'Email del usuario (sincronizado con auth.users)';

-- =====================================================
-- TABLA: tariffs
-- =====================================================
-- Almacena las tarifas y configuración de empresa
-- Incluye datos de empresa, configuración visual y estructura de precios
CREATE TABLE public.tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    name TEXT NOT NULL,
    nif TEXT,
    address TEXT,
    contact TEXT,
    summary_note TEXT,
    conditions_note TEXT,
    legal_note TEXT,
    template TEXT,
    primary_color TEXT DEFAULT '#000000',
    secondary_color TEXT DEFAULT '#666666',
    status TEXT NOT NULL DEFAULT 'Activa' CHECK (status IN ('Activa', 'Inactiva')),
    validity INTEGER DEFAULT 30,
    json_tariff_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios para la tabla tariffs
COMMENT ON TABLE public.tariffs IS 'Tarifas y configuración de empresa con estructura de precios';
COMMENT ON COLUMN public.tariffs.id IS 'Identificador único de la tarifa';
COMMENT ON COLUMN public.tariffs.empresa_id IS 'ID de la empresa (siempre 1 en MVP)';
COMMENT ON COLUMN public.tariffs.title IS 'Título de la tarifa';
COMMENT ON COLUMN public.tariffs.description IS 'Descripción de la tarifa';
COMMENT ON COLUMN public.tariffs.logo_url IS 'URL del logo de la empresa';
COMMENT ON COLUMN public.tariffs.name IS 'Nombre de la empresa';
COMMENT ON COLUMN public.tariffs.nif IS 'NIF/CIF de la empresa';
COMMENT ON COLUMN public.tariffs.address IS 'Dirección de la empresa';
COMMENT ON COLUMN public.tariffs.contact IS 'Información de contacto';
COMMENT ON COLUMN public.tariffs.summary_note IS 'Nota resumen para presupuestos';
COMMENT ON COLUMN public.tariffs.conditions_note IS 'Condiciones generales';
COMMENT ON COLUMN public.tariffs.legal_note IS 'Nota legal';
COMMENT ON COLUMN public.tariffs.template IS 'Plantilla de diseño';
COMMENT ON COLUMN public.tariffs.primary_color IS 'Color primario de la empresa';
COMMENT ON COLUMN public.tariffs.secondary_color IS 'Color secundario de la empresa';
COMMENT ON COLUMN public.tariffs.status IS 'Estado de la tarifa: Activa o Inactiva';
COMMENT ON COLUMN public.tariffs.validity IS 'Validez en días de los presupuestos';
COMMENT ON COLUMN public.tariffs.json_tariff_data IS 'Estructura JSON con categorías e items de la tarifa';

-- =====================================================
-- TABLA: budgets
-- =====================================================
-- Almacena los presupuestos generados
-- Incluye datos del cliente, configuración y estado del presupuesto
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id INTEGER NOT NULL DEFAULT 1,
    tariff_id UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE RESTRICT,
    json_tariff_data JSONB NOT NULL,
    client_type TEXT NOT NULL CHECK (client_type IN ('particular', 'autonomo', 'empresa')),
    client_name TEXT NOT NULL,
    client_nif_nie TEXT,
    client_phone TEXT,
    client_email TEXT,
    client_web TEXT,
    client_address TEXT,
    client_postal_code TEXT,
    client_locality TEXT,
    client_province TEXT,
    client_acceptance BOOLEAN DEFAULT false,
    json_budget_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'pendiente', 'enviado', 'aprobado', 'rechazado', 'caducado')),
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    pdf_url TEXT,
    start_date DATE,
    end_date DATE,
    validity_days INTEGER DEFAULT 30,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios para la tabla budgets
COMMENT ON TABLE public.budgets IS 'Presupuestos generados con datos de cliente y configuración';
COMMENT ON COLUMN public.budgets.id IS 'Identificador único del presupuesto';
COMMENT ON COLUMN public.budgets.empresa_id IS 'ID de la empresa (siempre 1 en MVP)';
COMMENT ON COLUMN public.budgets.tariff_id IS 'Referencia a la tarifa utilizada';
COMMENT ON COLUMN public.budgets.json_tariff_data IS 'Copia de la configuración de tarifa al momento de crear el presupuesto';
COMMENT ON COLUMN public.budgets.client_type IS 'Tipo de cliente: particular, autónomo o empresa';
COMMENT ON COLUMN public.budgets.client_name IS 'Nombre del cliente';
COMMENT ON COLUMN public.budgets.client_nif_nie IS 'NIF/NIE del cliente';
COMMENT ON COLUMN public.budgets.client_phone IS 'Teléfono del cliente';
COMMENT ON COLUMN public.budgets.client_email IS 'Email del cliente';
COMMENT ON COLUMN public.budgets.client_web IS 'Web del cliente';
COMMENT ON COLUMN public.budgets.client_address IS 'Dirección del cliente';
COMMENT ON COLUMN public.budgets.client_postal_code IS 'Código postal del cliente';
COMMENT ON COLUMN public.budgets.client_locality IS 'Localidad del cliente';
COMMENT ON COLUMN public.budgets.client_province IS 'Provincia del cliente';
COMMENT ON COLUMN public.budgets.client_acceptance IS 'Aceptación del cliente (firmado)';
COMMENT ON COLUMN public.budgets.json_budget_data IS 'Estructura JSON con items y configuración del presupuesto';
COMMENT ON COLUMN public.budgets.status IS 'Estado: borrador → pendiente → enviado → {aprobado|rechazado|caducado}';
COMMENT ON COLUMN public.budgets.total IS 'Total del presupuesto (base + IVA)';
COMMENT ON COLUMN public.budgets.iva IS 'Importe del IVA';
COMMENT ON COLUMN public.budgets.base IS 'Base imponible (sin IVA)';
COMMENT ON COLUMN public.budgets.pdf_url IS 'URL del PDF generado';
COMMENT ON COLUMN public.budgets.start_date IS 'Fecha de inicio del proyecto';
COMMENT ON COLUMN public.budgets.end_date IS 'Fecha de fin del proyecto';
COMMENT ON COLUMN public.budgets.validity_days IS 'Días de validez del presupuesto';
COMMENT ON COLUMN public.budgets.user_id IS 'Usuario que creó el presupuesto';

-- =====================================================
-- ÍNDICES
-- =====================================================
-- Índices para optimizar consultas frecuentes

-- Índices para users
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_empresa_id ON public.users(empresa_id);

-- Índices para tariffs
CREATE INDEX idx_tariffs_empresa_id ON public.tariffs(empresa_id);
CREATE INDEX idx_tariffs_status ON public.tariffs(status);

-- Índices para budgets
CREATE INDEX idx_budgets_empresa_id ON public.budgets(empresa_id);
CREATE INDEX idx_budgets_tariff_id ON public.budgets(tariff_id);
CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_status ON public.budgets(status);
CREATE INDEX idx_budgets_client_name ON public.budgets(client_name);
CREATE INDEX idx_budgets_created_at ON public.budgets(created_at DESC);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================
-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_tariffs_updated_at
    BEFORE UPDATE ON public.tariffs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONSTRAINTS ADICIONALES
-- =====================================================
-- Constraint para empresa_id (siempre 1 en MVP)
ALTER TABLE public.users ADD CONSTRAINT chk_users_empresa_id CHECK (empresa_id = 1);
ALTER TABLE public.tariffs ADD CONSTRAINT chk_tariffs_empresa_id CHECK (empresa_id = 1);
ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_empresa_id CHECK (empresa_id = 1);

-- Constraint para validez de presupuestos
ALTER TABLE public.tariffs ADD CONSTRAINT chk_tariffs_validity CHECK (validity > 0 AND validity <= 365);
ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_validity CHECK (validity_days > 0 AND validity_days <= 365);

-- Constraint para totales positivos
ALTER TABLE public.budgets ADD CONSTRAINT chk_budgets_totals CHECK (
    total >= 0 AND iva >= 0 AND base >= 0 AND (base + iva) = total
);