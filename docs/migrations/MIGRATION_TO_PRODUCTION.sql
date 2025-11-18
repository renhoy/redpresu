-- ============================================
-- MIGRACIÓN A PRODUCCIÓN - REDPRESU
-- ============================================
-- Fecha: 2025-01-18
-- Propósito: Migrar schema redpresu de Supabase local a producción
--
-- INSTRUCCIONES:
-- 1. El schema 'redpresu' DEBE existir antes de ejecutar este script
--    Si no existe, créalo con: CREATE SCHEMA IF NOT EXISTS redpresu;
-- 2. Ejecutar en Supabase producción (SQL Editor)
-- 3. Recomendado: Ejecutar en una transacción para poder revertir si algo falla
--    BEGIN; ... COMMIT; o ROLLBACK;
-- ============================================

BEGIN;

-- Desactivar validación de cuerpos de funciones durante la creación
-- Esto permite crear funciones que referencian tablas que aún no existen
SET check_function_bodies = false;

-- ============================================
-- SECCIÓN 1: Tipos ENUM del schema public
-- ============================================

DO $body$ 
BEGIN 
    CREATE TYPE public.contact_message_status AS ENUM ('nuevo', 'leido', 'respondido'); 
EXCEPTION 
    WHEN duplicate_object THEN null; 
END $body$;


-- ============================================
-- SECCIÓN 2: TODAS las funciones del schema public
-- ============================================
-- PostgreSQL permite crear funciones antes de que existan las tablas que referencian
-- La validación solo ocurre al EJECUTAR la función, no al crearla

-- Funciones simples de updated_at
CREATE OR REPLACE FUNCTION public.update_budget_notes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contact_message_note_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contact_message_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_issuers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Funciones de protección
CREATE OR REPLACE FUNCTION public.prevent_delete_company_1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.id = 1 THEN
    RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede eliminar la empresa con id=1 (%). Esta es la empresa del sistema y es crítica para el funcionamiento.', OLD.name
      USING HINT = 'La empresa 1 sirve como fallback para usuarios huérfanos. No debe eliminarse nunca.';
  END IF;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_superadmin_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.email = 'josivela+super@gmail.com' THEN
    IF NEW.company_id IS NULL THEN
      RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede asignar company_id=NULL al superadmin principal (%)', OLD.email
        USING HINT = 'El superadmin debe estar siempre asociado a una empresa válida';
    END IF;

    IF NEW.company_id != OLD.company_id THEN
      IF NOT EXISTS (SELECT 1 FROM redpresu.companies WHERE id = NEW.company_id) THEN
        RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede asignar el superadmin a empresa inexistente (company_id=%)', NEW.company_id;
      END IF;

      RAISE NOTICE 'PROTECCIÓN SISTEMA: Superadmin % cambió de empresa % a empresa %',
        OLD.email, OLD.company_id, NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Funciones de lógica de negocio
CREATE OR REPLACE FUNCTION public.log_business_rules_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'redpresu', 'auth'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.ensure_single_template()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_template = true THEN
    UPDATE redpresu.tariffs
    SET is_template = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_template = true;

    RAISE NOTICE 'Plantilla establecida: tariff_id=%, company_id=%', NEW.id, NEW.company_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Funciones auxiliares para RLS
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_company_id integer;
BEGIN
  SELECT company_id
  INTO v_company_id
  FROM redpresu.users
  WHERE id = p_user_id;

  RETURN v_company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_by_id(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role
  INTO v_role
  FROM redpresu.users
  WHERE id = p_user_id;

  RETURN v_role;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_company_id()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT company_id
  FROM redpresu.users
  WHERE id = auth.uid()
  LIMIT 1;
$function$;


-- ============================================
-- SECCIÓN 3: Schema redpresu - DDL completo
-- ============================================
-- Tablas, función del schema, triggers, políticas RLS

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: redpresu; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: prevent_delete_critical_superadmin(); Type: FUNCTION; Schema: redpresu; Owner: -
--

CREATE FUNCTION redpresu.prevent_delete_critical_superadmin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Verificar si es un superadmin (cualquier empresa)
  IF OLD.role = 'superadmin' THEN
    -- Si el usuario está ACTIVO, no permitir eliminación
    IF OLD.status = 'active' THEN
      RAISE EXCEPTION 'PROTECCIÓN SISTEMA: No se puede eliminar usuarios superadmin activos (id: %). Desactiva primero el usuario (status=inactive) antes de eliminarlo.', OLD.id
        USING HINT = 'Cambia el status a inactive antes de intentar eliminar';
    END IF;

    -- Si el usuario está INACTIVO, permitir eliminación (no hacer nada, continuar)
    -- Log opcional para auditoría (solo si tienes tabla de logs)
    -- INSERT INTO redpresu.audit_log (action, user_id, details)
    -- VALUES ('delete_inactive_superadmin', OLD.id, 'Superadmin inactivo eliminado');
  END IF;

  RETURN OLD;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: issuers; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.issuers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id integer DEFAULT 1 NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    nif text NOT NULL,
    address text NOT NULL,
    postal_code text,
    locality text,
    province text,
    country text DEFAULT 'España'::text,
    phone text,
    email text,
    web text,
    irpf_percentage numeric(5,2),
    logo_url text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT issuers_email_check CHECK (((email IS NULL) OR (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT issuers_irpf_percentage_check CHECK (((irpf_percentage >= (0)::numeric) AND (irpf_percentage <= (100)::numeric))),
    CONSTRAINT issuers_type_check CHECK ((type = ANY (ARRAY['empresa'::text, 'autonomo'::text])))
);


--
-- Name: TABLE issuers; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.issuers IS 'Datos fiscales de emisores (empresa o autónomo) para facturación';


--
-- Name: COLUMN issuers.user_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.user_id IS 'Owner/responsible user for this issuer';


--
-- Name: COLUMN issuers.company_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.company_id IS 'Company ID for multi-tenant (default 1 = first company)';


--
-- Name: COLUMN issuers.type; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.type IS 'Tipo de emisor: empresa o autonomo';


--
-- Name: COLUMN issuers.name; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.name IS 'Nombre o razón social del emisor';


--
-- Name: COLUMN issuers.nif; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.nif IS 'NIF/CIF del emisor';


--
-- Name: COLUMN issuers.address; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.address IS 'Dirección del emisor';


--
-- Name: COLUMN issuers.postal_code; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.postal_code IS 'Código postal';


--
-- Name: COLUMN issuers.locality; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.locality IS 'Localidad';


--
-- Name: COLUMN issuers.province; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.province IS 'Provincia';


--
-- Name: COLUMN issuers.country; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.country IS 'País';


--
-- Name: COLUMN issuers.phone; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.phone IS 'Teléfono de contacto';


--
-- Name: COLUMN issuers.email; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.email IS 'Email de contacto';


--
-- Name: COLUMN issuers.web; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.web IS 'Sitio web';


--
-- Name: COLUMN issuers.irpf_percentage; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.irpf_percentage IS 'Porcentaje de IRPF (solo autónomos)';


--
-- Name: COLUMN issuers.logo_url; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.logo_url IS 'URL del logo del emisor';


--
-- Name: COLUMN issuers.note; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.note IS 'Nota o descripción adicional';


--
-- Name: COLUMN issuers.deleted_at; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.issuers.deleted_at IS 'Timestamp de eliminación (soft-delete). NULL = activo, timestamp = eliminado';


--
-- Name: budget_notes; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.budget_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE budget_notes; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.budget_notes IS 'Notas y comentarios asociados a presupuestos';


--
-- Name: budget_versions; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.budget_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    version_number integer NOT NULL,
    version_name text,
    json_budget_data jsonb NOT NULL,
    json_client_data jsonb NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    base_amount numeric(10,2) DEFAULT 0 NOT NULL,
    irpf numeric(10,2) DEFAULT 0,
    irpf_percentage numeric(5,2) DEFAULT 0,
    total_pay numeric(10,2) DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    notes text
);


--
-- Name: TABLE budget_versions; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.budget_versions IS 'Historial de versiones de presupuestos';


--
-- Name: COLUMN budget_versions.version_number; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budget_versions.version_number IS 'Número secuencial de versión por presupuesto';


--
-- Name: COLUMN budget_versions.json_budget_data; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budget_versions.json_budget_data IS 'Snapshot completo de json_budget_data en el momento de la versión';


--
-- Name: COLUMN budget_versions.json_client_data; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budget_versions.json_client_data IS 'Snapshot completo de json_client_data en el momento de la versión';


--
-- Name: COLUMN budget_versions.total_pay; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budget_versions.total_pay IS 'Total a pagar (con IVA, IRPF y RE aplicados)';


--
-- Name: budgets; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id integer DEFAULT 1 NOT NULL,
    tariff_id uuid NOT NULL,
    json_tariff_data jsonb NOT NULL,
    client_type text NOT NULL,
    client_name text NOT NULL,
    client_nif_nie text,
    client_phone text,
    client_email text,
    client_web text,
    client_address text,
    client_postal_code text,
    client_locality text,
    client_province text,
    client_acceptance boolean DEFAULT false,
    json_budget_data jsonb NOT NULL,
    status text DEFAULT 'borrador'::text NOT NULL,
    total numeric(10,2) DEFAULT 0.00 NOT NULL,
    iva numeric(10,2) DEFAULT 0.00 NOT NULL,
    base numeric(10,2) DEFAULT 0.00 NOT NULL,
    pdf_url text,
    start_date date,
    end_date date,
    validity_days integer DEFAULT 30,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    irpf numeric(10,2) DEFAULT 0.00,
    irpf_percentage numeric(5,2) DEFAULT 0.00,
    total_pay numeric(10,2) NOT NULL,
    json_client_data jsonb,
    parent_budget_id uuid,
    version_number integer DEFAULT 1,
    re_apply boolean DEFAULT false NOT NULL,
    re_total numeric(10,2) DEFAULT 0.00 NOT NULL,
    budget_number character varying(100) NOT NULL,
    summary_note text,
    conditions_note text,
    CONSTRAINT budgets_client_type_check CHECK ((client_type = ANY (ARRAY['particular'::text, 'autonomo'::text, 'empresa'::text]))),
    CONSTRAINT budgets_status_check CHECK ((status = ANY (ARRAY['borrador'::text, 'pendiente'::text, 'enviado'::text, 'aprobado'::text, 'rechazado'::text, 'caducado'::text]))),
    CONSTRAINT chk_budgets_irpf CHECK ((irpf >= (0)::numeric)),
    CONSTRAINT chk_budgets_irpf_percentage CHECK (((irpf_percentage >= (0)::numeric) AND (irpf_percentage <= (100)::numeric))),
    CONSTRAINT chk_budgets_re_total CHECK ((re_total >= (0)::numeric)),
    CONSTRAINT chk_budgets_totals CHECK (((total >= (0)::numeric) AND (iva >= (0)::numeric) AND (base >= (0)::numeric) AND (irpf >= (0)::numeric) AND (total_pay >= (0)::numeric))),
    CONSTRAINT chk_budgets_validity CHECK (((validity_days > 0) AND (validity_days <= 365)))
);


--
-- Name: TABLE budgets; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.budgets IS 'Presupuestos generados a partir de tarifas con datos de cliente';


--
-- Name: COLUMN budgets.id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.id IS 'Identificador único del presupuesto';


--
-- Name: COLUMN budgets.company_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.company_id IS 'ID de la empresa (company)';


--
-- Name: COLUMN budgets.tariff_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.tariff_id IS 'Referencia a la tarifa utilizada';


--
-- Name: COLUMN budgets.json_tariff_data; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.json_tariff_data IS 'Copia de la configuración de tarifa al momento de crear el presupuesto';


--
-- Name: COLUMN budgets.client_type; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_type IS 'Tipo de cliente: particular, autónomo o empresa';


--
-- Name: COLUMN budgets.client_name; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_name IS 'Nombre del cliente';


--
-- Name: COLUMN budgets.client_nif_nie; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_nif_nie IS 'NIF/NIE del cliente';


--
-- Name: COLUMN budgets.client_phone; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_phone IS 'Teléfono del cliente';


--
-- Name: COLUMN budgets.client_email; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_email IS 'Email del cliente';


--
-- Name: COLUMN budgets.client_web; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_web IS 'Web del cliente';


--
-- Name: COLUMN budgets.client_address; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_address IS 'Dirección del cliente';


--
-- Name: COLUMN budgets.client_postal_code; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_postal_code IS 'Código postal del cliente';


--
-- Name: COLUMN budgets.client_locality; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_locality IS 'Localidad del cliente';


--
-- Name: COLUMN budgets.client_province; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_province IS 'Provincia del cliente';


--
-- Name: COLUMN budgets.client_acceptance; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.client_acceptance IS 'Aceptación del cliente (firmado)';


--
-- Name: COLUMN budgets.json_budget_data; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.json_budget_data IS 'Estructura JSON con items y configuración del presupuesto';


--
-- Name: COLUMN budgets.status; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.status IS 'Estado: borrador → pendiente → enviado → {aprobado|rechazado|caducado}';


--
-- Name: COLUMN budgets.total; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.total IS 'Total del presupuesto (base + IVA)';


--
-- Name: COLUMN budgets.iva; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.iva IS 'Importe del IVA';


--
-- Name: COLUMN budgets.base; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.base IS 'Base imponible (sin IVA)';


--
-- Name: COLUMN budgets.pdf_url; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.pdf_url IS 'URL del PDF generado';


--
-- Name: COLUMN budgets.start_date; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.start_date IS 'Fecha de inicio del proyecto';


--
-- Name: COLUMN budgets.end_date; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.end_date IS 'Fecha de fin del proyecto';


--
-- Name: COLUMN budgets.validity_days; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.validity_days IS 'Días de validez del presupuesto';


--
-- Name: COLUMN budgets.user_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.user_id IS 'Usuario que creó el presupuesto';


--
-- Name: COLUMN budgets.irpf; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.irpf IS 'Importe de IRPF a retener (solo si emisor es autónomo y cliente es empresa/autónomo)';


--
-- Name: COLUMN budgets.irpf_percentage; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.irpf_percentage IS 'Porcentaje de IRPF aplicado (típicamente 15%)';


--
-- Name: COLUMN budgets.total_pay; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.total_pay IS 'Total a pagar (con IVA, IRPF y RE aplicados)';


--
-- Name: COLUMN budgets.json_client_data; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.json_client_data IS 'Snapshot de datos del cliente para versionado';


--
-- Name: COLUMN budgets.parent_budget_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.parent_budget_id IS 'ID del presupuesto padre (para jerarquía de versiones)';


--
-- Name: COLUMN budgets.version_number; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.version_number IS 'Número de versión dentro de la jerarquía (1, 2, 3...)';


--
-- Name: COLUMN budgets.re_apply; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.re_apply IS 'Indica si se aplica Recargo de Equivalencia';


--
-- Name: COLUMN budgets.re_total; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.re_total IS 'Importe total del Recargo de Equivalencia aplicado';


--
-- Name: COLUMN budgets.budget_number; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.budget_number IS 'Número único del presupuesto (alfanumérico, editable). Formato por defecto: YYYYMMDD-HHMMSS. Único dentro de cada empresa (no global).';


--
-- Name: COLUMN budgets.summary_note; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.summary_note IS 'Nota personalizada del sumario para este presupuesto (independiente de la tarifa)';


--
-- Name: COLUMN budgets.conditions_note; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.budgets.conditions_note IS 'Nota personalizada de condiciones para este presupuesto (independiente de la tarifa)';


--
-- Name: business_rules; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.business_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id integer,
    version integer DEFAULT 1 NOT NULL,
    rules jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    previous_version jsonb
);


--
-- Name: TABLE business_rules; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.business_rules IS 'Almacena reglas de negocio configurables en formato JSONB con versionado';


--
-- Name: COLUMN business_rules.rules; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.business_rules.rules IS 'JSONB con estructura: {version, updated_at, updated_by, rules: [{id, name, condition, action}]}';


--
-- Name: COLUMN business_rules.previous_version; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.business_rules.previous_version IS 'Backup de la versión anterior para rollback';


--
-- Name: companies; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.companies (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT empresas_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: TABLE companies; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.companies IS 'Empresas del sistema multi-tenant';


--
-- Name: COLUMN companies.id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.companies.id IS 'ID único de la empresa';


--
-- Name: COLUMN companies.name; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.companies.name IS 'Nombre de la empresa';


--
-- Name: COLUMN companies.status; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.companies.status IS 'Estado de la empresa: active o inactive';


--
-- Name: company_deletion_log; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.company_deletion_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id integer,
    issuer_id uuid,
    deleted_by uuid NOT NULL,
    deletion_type text NOT NULL,
    company_snapshot jsonb NOT NULL,
    issuer_snapshot jsonb,
    full_backup jsonb,
    users_count integer DEFAULT 0,
    tariffs_count integer DEFAULT 0,
    budgets_count integer DEFAULT 0,
    deletion_reason text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT redpresu_company_deletion_log_deletion_type_check CHECK ((deletion_type = ANY (ARRAY['soft_delete'::text, 'permanent_delete'::text, 'restore'::text])))
);


--
-- Name: TABLE company_deletion_log; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.company_deletion_log IS 'Registro de auditoría de eliminaciones de empresas';


--
-- Name: COLUMN company_deletion_log.company_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.company_deletion_log.company_id IS 'ID de la empresa eliminada (nullable con ON DELETE SET NULL)';


--
-- Name: COLUMN company_deletion_log.deletion_type; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.company_deletion_log.deletion_type IS 'soft_delete, permanent_delete o restore';


--
-- Name: config; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.config (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE config; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.config IS 'Configuración global del sistema editable por superadmin';


--
-- Name: COLUMN config.key; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.config.key IS 'Clave única de configuración (ej: iva_re_equivalences, pdf_templates)';


--
-- Name: COLUMN config.value; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.config.value IS 'Valor en formato JSON para flexibilidad';


--
-- Name: COLUMN config.description; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.config.description IS 'Descripción del parámetro de configuración';


--
-- Name: COLUMN config.category; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.config.category IS 'Categoría: general, fiscal, pdf, defaults';


--
-- Name: COLUMN config.is_system; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.config.is_system IS 'Si es true, solo superadmin puede modificar';


--
-- Name: contact_message_notes; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.contact_message_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE contact_message_notes; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.contact_message_notes IS 'Notas internas asociadas a mensajes de contacto (solo superadmin)';


--
-- Name: contact_messages; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status public.contact_message_status DEFAULT 'nuevo'::public.contact_message_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: redpresu; Owner: -
--

CREATE SEQUENCE redpresu.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: redpresu; Owner: -
--

ALTER SEQUENCE redpresu.empresas_id_seq OWNED BY redpresu.companies.id;


--
-- Name: mock_emails; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.mock_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    data jsonb,
    company_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT redpresu_mock_emails_type_check CHECK ((type = ANY (ARRAY['payment_failed'::text, 'expiring_soon'::text, 'expired'::text, 'grace_period_ending'::text, 'upgraded'::text, 'canceled'::text, 'custom'::text])))
);


--
-- Name: TABLE mock_emails; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.mock_emails IS 'Emails mockeados para testing (NODE_ENV !== production). Se guardan en lugar de enviarse.';


--
-- Name: registration_tokens; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.registration_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    tipo_emisor text NOT NULL,
    used boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    password text DEFAULT ''::text NOT NULL,
    CONSTRAINT redpresu_registration_tokens_tipo_emisor_check CHECK ((tipo_emisor = ANY (ARRAY['empresa'::text, 'autonomo'::text])))
);


--
-- Name: TABLE registration_tokens; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.registration_tokens IS 'Tokens de registro temporal para flujo en 2 pasos';


--
-- Name: COLUMN registration_tokens.token; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.registration_tokens.token IS 'Token único generado para el enlace de completado de registro';


--
-- Name: COLUMN registration_tokens.email; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.registration_tokens.email IS 'Email del usuario (del PASO 1)';


--
-- Name: COLUMN registration_tokens.tipo_emisor; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.registration_tokens.tipo_emisor IS 'Tipo de emisor: empresa o autonomo';


--
-- Name: COLUMN registration_tokens.used; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.registration_tokens.used IS 'Indica si el token ya fue usado para completar el registro';


--
-- Name: COLUMN registration_tokens.expires_at; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.registration_tokens.expires_at IS 'Fecha de expiración del token (24-48h típicamente)';


--
-- Name: COLUMN registration_tokens.password; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.registration_tokens.password IS 'Contraseña temporal del usuario (se elimina al completar registro o expirar)';


--
-- Name: rules_audit_log; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.rules_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid,
    company_id integer,
    action character varying(50) NOT NULL,
    changed_by uuid,
    changed_by_email character varying(255),
    changes jsonb,
    version_before integer,
    version_after integer,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE rules_audit_log; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.rules_audit_log IS 'Log de auditoría para cambios en business_rules';


--
-- Name: subscriptions; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id integer DEFAULT 1 NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text DEFAULT 'active'::text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT redpresu_subscriptions_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text]))),
    CONSTRAINT redpresu_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'canceled'::text, 'past_due'::text, 'trialing'::text])))
);


--
-- Name: tariffs; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.tariffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id integer DEFAULT 1 NOT NULL,
    title text NOT NULL,
    description text,
    logo_url text,
    name text NOT NULL,
    nif text,
    address text,
    contact text,
    summary_note text,
    conditions_note text,
    legal_note text,
    template text,
    primary_color text DEFAULT '#000000'::text,
    secondary_color text DEFAULT '#666666'::text,
    status text DEFAULT 'Activa'::text NOT NULL,
    validity integer DEFAULT 30,
    json_tariff_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    ivas_presentes numeric(5,2)[] DEFAULT '{}'::numeric[],
    is_template boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_tariffs_validity CHECK (((validity > 0) AND (validity <= 365))),
    CONSTRAINT tariffs_status_check CHECK ((status = ANY (ARRAY['Borrador'::text, 'Activa'::text, 'Inactiva'::text])))
);


--
-- Name: TABLE tariffs; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.tariffs IS 'Tarifas con estructura jerárquica (capítulos, subcapítulos, partidas)';


--
-- Name: COLUMN tariffs.id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.id IS 'Identificador único de la tarifa';


--
-- Name: COLUMN tariffs.company_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.company_id IS 'ID de la empresa (company)';


--
-- Name: COLUMN tariffs.title; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.title IS 'Título de la tarifa';


--
-- Name: COLUMN tariffs.description; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.description IS 'Descripción de la tarifa';


--
-- Name: COLUMN tariffs.logo_url; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.logo_url IS 'URL del logo de la empresa';


--
-- Name: COLUMN tariffs.name; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.name IS 'Nombre de la empresa';


--
-- Name: COLUMN tariffs.nif; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.nif IS 'NIF/CIF de la empresa';


--
-- Name: COLUMN tariffs.address; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.address IS 'Dirección de la empresa';


--
-- Name: COLUMN tariffs.contact; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.contact IS 'Información de contacto';


--
-- Name: COLUMN tariffs.summary_note; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.summary_note IS 'Nota resumen para presupuestos';


--
-- Name: COLUMN tariffs.conditions_note; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.conditions_note IS 'Condiciones generales';


--
-- Name: COLUMN tariffs.legal_note; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.legal_note IS 'Nota legal';


--
-- Name: COLUMN tariffs.template; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.template IS 'Plantilla de diseño';


--
-- Name: COLUMN tariffs.primary_color; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.primary_color IS 'Color primario de la empresa';


--
-- Name: COLUMN tariffs.secondary_color; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.secondary_color IS 'Color secundario de la empresa';


--
-- Name: COLUMN tariffs.status; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.status IS 'Estado de la tarifa: Borrador (incompleta), Activa (puede usarse en presupuestos), Inactiva (archivada)';


--
-- Name: COLUMN tariffs.validity; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.validity IS 'Validez en días de los presupuestos';


--
-- Name: COLUMN tariffs.json_tariff_data; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.json_tariff_data IS 'Estructura JSON con categorías e items de la tarifa';


--
-- Name: COLUMN tariffs.user_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.user_id IS 'User who created this tariff (for audit trail)';


--
-- Name: COLUMN tariffs.ivas_presentes; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.ivas_presentes IS 'Array de porcentajes de IVA presentes en la tarifa (ej: {21.00, 10.00, 4.00}). Detectado automáticamente al importar CSV.';


--
-- Name: COLUMN tariffs.is_template; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.tariffs.is_template IS 'Indica si esta tarifa es la plantilla por defecto de la empresa. Solo puede haber una plantilla activa por empresa.';


--
-- Name: user_invitations; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.user_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inviter_id uuid NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: TABLE user_invitations; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.user_invitations IS 'Tabla de invitaciones de usuarios con tokens de acceso';


--
-- Name: COLUMN user_invitations.inviter_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.user_invitations.inviter_id IS 'Usuario que envía la invitación';


--
-- Name: COLUMN user_invitations.email; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.user_invitations.email IS 'Email del usuario invitado';


--
-- Name: COLUMN user_invitations.token; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.user_invitations.token IS 'Token único para validar la invitación';


--
-- Name: COLUMN user_invitations.expires_at; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.user_invitations.expires_at IS 'Fecha de expiración del token';


--
-- Name: COLUMN user_invitations.status; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.user_invitations.status IS 'Estado: pending, accepted, expired, cancelled';


--
-- Name: users; Type: TABLE; Schema: redpresu; Owner: -
--

CREATE TABLE redpresu.users (
    id uuid NOT NULL,
    role text NOT NULL,
    company_id integer,
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    invited_by uuid,
    last_login timestamp with time zone,
    last_name text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'comercial'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TABLE redpresu.users IS 'Usuarios del sistema con roles y empresa asignada';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.id IS 'Referencia directa al usuario en auth.users';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.role IS 'Rol del usuario: superadmin (acceso total), admin (su empresa), vendedor (sus presupuestos)';


--
-- Name: COLUMN users.company_id; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.company_id IS 'ID de la empresa (company)';


--
-- Name: COLUMN users.name; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.name IS 'Nombre del usuario';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.email IS 'Email del usuario (sincronizado con auth.users)';


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.status IS 'User status: active, inactive, pending';


--
-- Name: COLUMN users.invited_by; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.invited_by IS 'User ID who invited this user (for audit trail)';


--
-- Name: COLUMN users.last_login; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.last_login IS 'Timestamp of last successful login';


--
-- Name: COLUMN users.last_name; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON COLUMN redpresu.users.last_name IS 'Apellidos del usuario';


--
-- Name: companies id; Type: DEFAULT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.companies ALTER COLUMN id SET DEFAULT nextval('redpresu.empresas_id_seq'::regclass);


--
-- Name: budget_notes budget_notes_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budget_notes
    ADD CONSTRAINT budget_notes_pkey PRIMARY KEY (id);


--
-- Name: budget_versions budget_versions_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budget_versions
    ADD CONSTRAINT budget_versions_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: business_rules business_rules_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.business_rules
    ADD CONSTRAINT business_rules_pkey PRIMARY KEY (id);


--
-- Name: config config_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.config
    ADD CONSTRAINT config_pkey PRIMARY KEY (key);


--
-- Name: registration_tokens email_unique_per_token; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.registration_tokens
    ADD CONSTRAINT email_unique_per_token UNIQUE (email, token);


--
-- Name: companies empresas_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.companies
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: issuers issuers_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.issuers
    ADD CONSTRAINT issuers_pkey PRIMARY KEY (id);


--
-- Name: company_deletion_log redpresu_company_deletion_log_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.company_deletion_log
    ADD CONSTRAINT redpresu_company_deletion_log_pkey PRIMARY KEY (id);


--
-- Name: contact_message_notes redpresu_contact_message_notes_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.contact_message_notes
    ADD CONSTRAINT redpresu_contact_message_notes_pkey PRIMARY KEY (id);


--
-- Name: contact_messages redpresu_contact_messages_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.contact_messages
    ADD CONSTRAINT redpresu_contact_messages_pkey PRIMARY KEY (id);


--
-- Name: mock_emails redpresu_mock_emails_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.mock_emails
    ADD CONSTRAINT redpresu_mock_emails_pkey PRIMARY KEY (id);


--
-- Name: registration_tokens redpresu_registration_tokens_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.registration_tokens
    ADD CONSTRAINT redpresu_registration_tokens_pkey PRIMARY KEY (id);


--
-- Name: registration_tokens redpresu_registration_tokens_token_key; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.registration_tokens
    ADD CONSTRAINT redpresu_registration_tokens_token_key UNIQUE (token);


--
-- Name: subscriptions redpresu_subscriptions_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.subscriptions
    ADD CONSTRAINT redpresu_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions redpresu_subscriptions_stripe_customer_id_key; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.subscriptions
    ADD CONSTRAINT redpresu_subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: subscriptions redpresu_subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.subscriptions
    ADD CONSTRAINT redpresu_subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: user_invitations redpresu_user_invitations_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.user_invitations
    ADD CONSTRAINT redpresu_user_invitations_pkey PRIMARY KEY (id);


--
-- Name: user_invitations redpresu_user_invitations_token_key; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.user_invitations
    ADD CONSTRAINT redpresu_user_invitations_token_key UNIQUE (token);


--
-- Name: rules_audit_log rules_audit_log_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.rules_audit_log
    ADD CONSTRAINT rules_audit_log_pkey PRIMARY KEY (id);


--
-- Name: tariffs tariffs_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.tariffs
    ADD CONSTRAINT tariffs_pkey PRIMARY KEY (id);


--
-- Name: budget_versions unique_budget_version; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budget_versions
    ADD CONSTRAINT unique_budget_version UNIQUE (budget_id, version_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_budget_notes_budget_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budget_notes_budget_id ON redpresu.budget_notes USING btree (budget_id);


--
-- Name: idx_budget_notes_created_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budget_notes_created_at ON redpresu.budget_notes USING btree (created_at DESC);


--
-- Name: idx_budget_notes_user_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budget_notes_user_id ON redpresu.budget_notes USING btree (user_id);


--
-- Name: idx_budget_versions_budget_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budget_versions_budget_id ON redpresu.budget_versions USING btree (budget_id);


--
-- Name: idx_budget_versions_created_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budget_versions_created_at ON redpresu.budget_versions USING btree (created_at DESC);


--
-- Name: idx_budget_versions_created_by; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budget_versions_created_by ON redpresu.budget_versions USING btree (created_by);


--
-- Name: idx_budgets_client_name; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_client_name ON redpresu.budgets USING btree (client_name);


--
-- Name: idx_budgets_created_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_created_at ON redpresu.budgets USING btree (created_at DESC);


--
-- Name: idx_budgets_empresa_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_empresa_id ON redpresu.budgets USING btree (company_id);


--
-- Name: idx_budgets_number_unique_by_company; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE UNIQUE INDEX idx_budgets_number_unique_by_company ON redpresu.budgets USING btree (company_id, budget_number);


--
-- Name: idx_budgets_parent_budget_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_parent_budget_id ON redpresu.budgets USING btree (parent_budget_id);


--
-- Name: idx_budgets_parent_version; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_parent_version ON redpresu.budgets USING btree (parent_budget_id, version_number DESC);


--
-- Name: idx_budgets_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_status ON redpresu.budgets USING btree (status);


--
-- Name: idx_budgets_tariff_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_tariff_id ON redpresu.budgets USING btree (tariff_id);


--
-- Name: idx_budgets_user_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_budgets_user_id ON redpresu.budgets USING btree (user_id);


--
-- Name: idx_business_rules_active_null; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_business_rules_active_null ON redpresu.business_rules USING btree (is_active, company_id) WHERE (is_active = true);


--
-- Name: idx_business_rules_company; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_business_rules_company ON redpresu.business_rules USING btree (company_id);


--
-- Name: idx_business_rules_company_active; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_business_rules_company_active ON redpresu.business_rules USING btree (company_id, is_active) WHERE (is_active = true);


--
-- Name: idx_business_rules_company_null; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_business_rules_company_null ON redpresu.business_rules USING btree (company_id) WHERE (company_id IS NULL);


--
-- Name: idx_config_category; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_config_category ON redpresu.config USING btree (category);


--
-- Name: idx_config_is_system; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_config_is_system ON redpresu.config USING btree (is_system);


--
-- Name: idx_contact_message_notes_created_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_contact_message_notes_created_at ON redpresu.contact_message_notes USING btree (created_at DESC);


--
-- Name: idx_contact_message_notes_message_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_contact_message_notes_message_id ON redpresu.contact_message_notes USING btree (contact_message_id);


--
-- Name: idx_contact_messages_created_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_contact_messages_created_at ON redpresu.contact_messages USING btree (created_at DESC);


--
-- Name: idx_contact_messages_email; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_contact_messages_email ON redpresu.contact_messages USING btree (email);


--
-- Name: idx_contact_messages_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_contact_messages_status ON redpresu.contact_messages USING btree (status);


--
-- Name: idx_deletion_log_company_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_deletion_log_company_id ON redpresu.company_deletion_log USING btree (company_id);


--
-- Name: idx_deletion_log_created_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_deletion_log_created_at ON redpresu.company_deletion_log USING btree (created_at DESC);


--
-- Name: idx_deletion_log_deleted_by; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_deletion_log_deleted_by ON redpresu.company_deletion_log USING btree (deleted_by);


--
-- Name: idx_deletion_log_type; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_deletion_log_type ON redpresu.company_deletion_log USING btree (deletion_type);


--
-- Name: idx_empresas_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_empresas_status ON redpresu.companies USING btree (status);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_invitations_email ON redpresu.user_invitations USING btree (email);


--
-- Name: idx_invitations_expires_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_invitations_expires_at ON redpresu.user_invitations USING btree (expires_at);


--
-- Name: idx_invitations_inviter_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_invitations_inviter_id ON redpresu.user_invitations USING btree (inviter_id);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_invitations_status ON redpresu.user_invitations USING btree (status);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_invitations_token ON redpresu.user_invitations USING btree (token);


--
-- Name: idx_issuers_active; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_issuers_active ON redpresu.issuers USING btree (company_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_issuers_company_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_issuers_company_id ON redpresu.issuers USING btree (company_id);


--
-- Name: idx_issuers_deleted_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_issuers_deleted_at ON redpresu.issuers USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_issuers_nif_company; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE UNIQUE INDEX idx_issuers_nif_company ON redpresu.issuers USING btree (nif, company_id);


--
-- Name: idx_issuers_nif_original; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_issuers_nif_original ON redpresu.issuers USING btree (nif);


--
-- Name: idx_issuers_type; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_issuers_type ON redpresu.issuers USING btree (type);


--
-- Name: idx_issuers_user_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_issuers_user_id ON redpresu.issuers USING btree (user_id);


--
-- Name: idx_mock_emails_company_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_mock_emails_company_id ON redpresu.mock_emails USING btree (company_id);


--
-- Name: idx_mock_emails_created_at; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_mock_emails_created_at ON redpresu.mock_emails USING btree (created_at DESC);


--
-- Name: idx_mock_emails_to_email; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_mock_emails_to_email ON redpresu.mock_emails USING btree (to_email);


--
-- Name: idx_mock_emails_type; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_mock_emails_type ON redpresu.mock_emails USING btree (type);


--
-- Name: idx_redpresu_subscriptions_company; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_redpresu_subscriptions_company ON redpresu.subscriptions USING btree (company_id);


--
-- Name: idx_redpresu_subscriptions_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_redpresu_subscriptions_status ON redpresu.subscriptions USING btree (status);


--
-- Name: idx_redpresu_subscriptions_stripe_customer; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_redpresu_subscriptions_stripe_customer ON redpresu.subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_registration_tokens_email; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_registration_tokens_email ON redpresu.registration_tokens USING btree (email) WHERE (NOT used);


--
-- Name: idx_registration_tokens_expires; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_registration_tokens_expires ON redpresu.registration_tokens USING btree (expires_at) WHERE (NOT used);


--
-- Name: idx_registration_tokens_token; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_registration_tokens_token ON redpresu.registration_tokens USING btree (token) WHERE (NOT used);


--
-- Name: idx_rules_audit_company; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_rules_audit_company ON redpresu.rules_audit_log USING btree (company_id);


--
-- Name: idx_rules_audit_date; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_rules_audit_date ON redpresu.rules_audit_log USING btree (created_at DESC);


--
-- Name: idx_rules_audit_rule; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_rules_audit_rule ON redpresu.rules_audit_log USING btree (rule_id);


--
-- Name: idx_tariffs_empresa_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_tariffs_empresa_id ON redpresu.tariffs USING btree (company_id);


--
-- Name: idx_tariffs_empresa_user; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_tariffs_empresa_user ON redpresu.tariffs USING btree (company_id, user_id);


--
-- Name: idx_tariffs_is_template; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_tariffs_is_template ON redpresu.tariffs USING btree (company_id, is_template) WHERE (is_template = true);


--
-- Name: idx_tariffs_ivas_presentes; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_tariffs_ivas_presentes ON redpresu.tariffs USING gin (ivas_presentes);


--
-- Name: idx_tariffs_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_tariffs_status ON redpresu.tariffs USING btree (status);


--
-- Name: idx_tariffs_user_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_tariffs_user_id ON redpresu.tariffs USING btree (user_id);


--
-- Name: idx_users_company; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_users_company ON redpresu.users USING btree (company_id);


--
-- Name: idx_users_empresa_id; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_users_empresa_id ON redpresu.users USING btree (company_id);


--
-- Name: idx_users_empresa_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_users_empresa_status ON redpresu.users USING btree (company_id, status);


--
-- Name: idx_users_invited_by; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_users_invited_by ON redpresu.users USING btree (invited_by);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_users_last_login ON redpresu.users USING btree (last_login);


--
-- Name: idx_users_role; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_users_role ON redpresu.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE INDEX idx_users_status ON redpresu.users USING btree (status);


--
-- Name: unique_active_global_rule; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE UNIQUE INDEX unique_active_global_rule ON redpresu.business_rules USING btree (is_active) WHERE ((company_id IS NULL) AND (is_active = true));


--
-- Name: unique_active_per_company_rule; Type: INDEX; Schema: redpresu; Owner: -
--

CREATE UNIQUE INDEX unique_active_per_company_rule ON redpresu.business_rules USING btree (company_id, is_active) WHERE ((company_id IS NOT NULL) AND (is_active = true));


--
-- Name: business_rules audit_business_rules_changes; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER audit_business_rules_changes AFTER INSERT OR UPDATE ON redpresu.business_rules FOR EACH ROW EXECUTE FUNCTION public.log_business_rules_changes();


--
-- Name: budget_notes budget_notes_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER budget_notes_updated_at BEFORE UPDATE ON redpresu.budget_notes FOR EACH ROW EXECUTE FUNCTION public.update_budget_notes_updated_at();


--
-- Name: users prevent_delete_critical_superadmin; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER prevent_delete_critical_superadmin BEFORE DELETE ON redpresu.users FOR EACH ROW EXECUTE FUNCTION redpresu.prevent_delete_critical_superadmin();


--
-- Name: budgets trigger_budgets_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_budgets_updated_at BEFORE UPDATE ON redpresu.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tariffs trigger_ensure_single_template; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_ensure_single_template BEFORE INSERT OR UPDATE OF is_template ON redpresu.tariffs FOR EACH ROW EXECUTE FUNCTION public.ensure_single_template();


--
-- Name: TRIGGER trigger_ensure_single_template ON tariffs; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TRIGGER trigger_ensure_single_template ON redpresu.tariffs IS 'Ejecuta ensure_single_template() antes de INSERT/UPDATE para mantener una sola plantilla por empresa';


--
-- Name: issuers trigger_issuers_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_issuers_updated_at BEFORE UPDATE ON redpresu.issuers FOR EACH ROW EXECUTE FUNCTION public.update_issuers_updated_at();


--
-- Name: companies trigger_prevent_delete_company_1; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_prevent_delete_company_1 BEFORE DELETE ON redpresu.companies FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_company_1();


--
-- Name: TRIGGER trigger_prevent_delete_company_1 ON companies; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON TRIGGER trigger_prevent_delete_company_1 ON redpresu.companies IS 'Previene la eliminación de la empresa con id=1 (empresa del sistema)';


--
-- Name: users trigger_protect_superadmin_company; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_protect_superadmin_company BEFORE UPDATE ON redpresu.users FOR EACH ROW EXECUTE FUNCTION public.protect_superadmin_company();


--
-- Name: tariffs trigger_tariffs_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_tariffs_updated_at BEFORE UPDATE ON redpresu.tariffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contact_message_notes trigger_update_contact_message_note_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_update_contact_message_note_updated_at BEFORE UPDATE ON redpresu.contact_message_notes FOR EACH ROW EXECUTE FUNCTION public.update_contact_message_note_updated_at();


--
-- Name: contact_messages trigger_update_contact_message_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_update_contact_message_updated_at BEFORE UPDATE ON redpresu.contact_messages FOR EACH ROW EXECUTE FUNCTION public.update_contact_message_updated_at();


--
-- Name: users trigger_users_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON redpresu.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_rules update_business_rules_updated_at; Type: TRIGGER; Schema: redpresu; Owner: -
--

CREATE TRIGGER update_business_rules_updated_at BEFORE UPDATE ON redpresu.business_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budget_notes budget_notes_budget_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budget_notes
    ADD CONSTRAINT budget_notes_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES redpresu.budgets(id);


--
-- Name: budget_notes budget_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budget_notes
    ADD CONSTRAINT budget_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: budget_versions budget_versions_budget_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budget_versions
    ADD CONSTRAINT budget_versions_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES redpresu.budgets(id);


--
-- Name: budget_versions budget_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budget_versions
    ADD CONSTRAINT budget_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES redpresu.users(id);


--
-- Name: budgets budgets_parent_budget_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budgets
    ADD CONSTRAINT budgets_parent_budget_id_fkey FOREIGN KEY (parent_budget_id) REFERENCES redpresu.budgets(id);


--
-- Name: budgets budgets_tariff_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budgets
    ADD CONSTRAINT budgets_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES redpresu.tariffs(id);


--
-- Name: budgets budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.budgets
    ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: company_deletion_log company_deletion_log_company_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.company_deletion_log
    ADD CONSTRAINT company_deletion_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES redpresu.companies(id);


--
-- Name: company_deletion_log company_deletion_log_deleted_by_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.company_deletion_log
    ADD CONSTRAINT company_deletion_log_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: company_deletion_log company_deletion_log_issuer_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.company_deletion_log
    ADD CONSTRAINT company_deletion_log_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES redpresu.issuers(id);


--
-- Name: contact_message_notes contact_message_notes_message_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.contact_message_notes
    ADD CONSTRAINT contact_message_notes_message_fkey FOREIGN KEY (contact_message_id) REFERENCES redpresu.contact_messages(id);


--
-- Name: contact_message_notes contact_message_notes_user_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.contact_message_notes
    ADD CONSTRAINT contact_message_notes_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: issuers issuers_company_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.issuers
    ADD CONSTRAINT issuers_company_id_fkey FOREIGN KEY (company_id) REFERENCES redpresu.companies(id) ON DELETE CASCADE;


--
-- Name: issuers issuers_user_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.issuers
    ADD CONSTRAINT issuers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: rules_audit_log rules_audit_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.rules_audit_log
    ADD CONSTRAINT rules_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES redpresu.users(id);


--
-- Name: rules_audit_log rules_audit_log_rule_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.rules_audit_log
    ADD CONSTRAINT rules_audit_log_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES redpresu.business_rules(id) ON DELETE CASCADE;


--
-- Name: tariffs tariffs_user_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.tariffs
    ADD CONSTRAINT tariffs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_invitations user_invitations_inviter_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.user_invitations
    ADD CONSTRAINT user_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES redpresu.users(id);


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES redpresu.companies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: users users_invited_by_fkey; Type: FK CONSTRAINT; Schema: redpresu; Owner: -
--

ALTER TABLE ONLY redpresu.users
    ADD CONSTRAINT users_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES redpresu.users(id);


--
-- Name: business_rules Companies read own rules; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY "Companies read own rules" ON redpresu.business_rules FOR SELECT USING ((company_id IN ( SELECT users.company_id
   FROM redpresu.users
  WHERE (users.id = auth.uid()))));


--
-- Name: rules_audit_log Superadmin full access audit log; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY "Superadmin full access audit log" ON redpresu.rules_audit_log USING (((auth.uid() IS NULL) OR (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))));


--
-- Name: business_rules Superadmin full access on business_rules; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY "Superadmin full access on business_rules" ON redpresu.business_rules USING (((auth.uid() IS NULL) OR (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))));


--
-- Name: rules_audit_log Superadmin read audit log; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY "Superadmin read audit log" ON redpresu.rules_audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: budget_notes; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.budget_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_notes budget_notes_delete_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budget_notes_delete_policy ON redpresu.budget_notes FOR DELETE USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))));


--
-- Name: budget_notes budget_notes_insert_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budget_notes_insert_policy ON redpresu.budget_notes FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (redpresu.budgets b
     JOIN redpresu.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_notes.budget_id) AND (u.company_id = ( SELECT users.company_id AS empresa_id
           FROM redpresu.users
          WHERE (users.id = auth.uid()))))))));


--
-- Name: budget_notes budget_notes_select_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budget_notes_select_policy ON redpresu.budget_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (redpresu.budgets b
     JOIN redpresu.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_notes.budget_id) AND (u.company_id = ( SELECT users.company_id AS empresa_id
           FROM redpresu.users
          WHERE (users.id = auth.uid())))))));


--
-- Name: budget_notes budget_notes_update_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budget_notes_update_policy ON redpresu.budget_notes FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: budget_versions; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.budget_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_versions budget_versions_delete_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budget_versions_delete_policy ON redpresu.budget_versions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (redpresu.budgets b
     JOIN redpresu.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_versions.budget_id) AND (EXISTS ( SELECT 1
           FROM redpresu.users
          WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (users.company_id = u.company_id))))))));


--
-- Name: budget_versions budget_versions_insert_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budget_versions_insert_policy ON redpresu.budget_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (redpresu.budgets b
     JOIN redpresu.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_versions.budget_id) AND ((b.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM redpresu.users
          WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (users.company_id = u.company_id)))))))));


--
-- Name: budget_versions budget_versions_select_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budget_versions_select_policy ON redpresu.budget_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (redpresu.budgets b
     JOIN redpresu.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_versions.budget_id) AND (u.company_id = ( SELECT users.company_id AS empresa_id
           FROM redpresu.users
          WHERE (users.id = auth.uid())))))));


--
-- Name: budgets; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: budgets budgets_delete_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budgets_delete_policy ON redpresu.budgets FOR DELETE USING (((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))));


--
-- Name: budgets budgets_insert_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budgets_insert_policy ON redpresu.budgets FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));


--
-- Name: budgets budgets_select_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budgets_select_policy ON redpresu.budgets FOR SELECT USING (((company_id = public.get_user_empresa_id(auth.uid())) OR (public.get_user_role_by_id(auth.uid()) = 'superadmin'::text)));


--
-- Name: budgets budgets_update_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY budgets_update_policy ON redpresu.budgets FOR UPDATE USING (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))))) WITH CHECK (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid())))));


--
-- Name: companies; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: company_deletion_log; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.company_deletion_log ENABLE ROW LEVEL SECURITY;

--
-- Name: config; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.config ENABLE ROW LEVEL SECURITY;

--
-- Name: config config_select_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY config_select_policy ON redpresu.config FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: contact_message_notes; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.contact_message_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_message_notes contact_message_notes_delete_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY contact_message_notes_delete_superadmin ON redpresu.contact_message_notes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: contact_message_notes contact_message_notes_insert_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY contact_message_notes_insert_superadmin ON redpresu.contact_message_notes FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))));


--
-- Name: contact_message_notes contact_message_notes_select_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY contact_message_notes_select_superadmin ON redpresu.contact_message_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: contact_message_notes contact_message_notes_update_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY contact_message_notes_update_superadmin ON redpresu.contact_message_notes FOR UPDATE USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))))) WITH CHECK ((user_id = auth.uid()));


--
-- Name: contact_messages; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_messages contact_messages_select_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY contact_messages_select_superadmin ON redpresu.contact_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: contact_messages contact_messages_update_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY contact_messages_update_superadmin ON redpresu.contact_messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: company_deletion_log deletion_log_insert_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY deletion_log_insert_superadmin ON redpresu.company_deletion_log FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: company_deletion_log deletion_log_select_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY deletion_log_select_superadmin ON redpresu.company_deletion_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: companies empresas_select_own; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY empresas_select_own ON redpresu.companies FOR SELECT TO authenticated USING ((id IN ( SELECT users.company_id AS empresa_id
   FROM redpresu.users
  WHERE (users.id = auth.uid()))));


--
-- Name: companies empresas_select_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY empresas_select_superadmin ON redpresu.companies FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: user_invitations invitations_delete_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY invitations_delete_policy ON redpresu.user_invitations FOR DELETE USING (((inviter_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))));


--
-- Name: user_invitations invitations_insert_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY invitations_insert_policy ON redpresu.user_invitations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));


--
-- Name: user_invitations invitations_select_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY invitations_select_policy ON redpresu.user_invitations FOR SELECT USING ((auth.uid() IN ( SELECT u1.id
   FROM (redpresu.users u1
     JOIN redpresu.users u2 ON ((u1.company_id = u2.company_id)))
  WHERE (u2.id = user_invitations.inviter_id))));


--
-- Name: user_invitations invitations_update_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY invitations_update_policy ON redpresu.user_invitations FOR UPDATE USING (((inviter_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))));


--
-- Name: issuers; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.issuers ENABLE ROW LEVEL SECURITY;

--
-- Name: issuers issuers_delete_own_company; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_delete_own_company ON redpresu.issuers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: issuers issuers_delete_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_delete_policy ON redpresu.issuers FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: issuers issuers_insert_own_company; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_insert_own_company ON redpresu.issuers FOR INSERT WITH CHECK (((company_id IN ( SELECT users.company_id
   FROM redpresu.users
  WHERE (users.id = auth.uid()))) AND (deleted_at IS NULL)));


--
-- Name: issuers issuers_insert_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_insert_superadmin ON redpresu.issuers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: issuers issuers_select_own_company; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_select_own_company ON redpresu.issuers FOR SELECT USING (((company_id IN ( SELECT users.company_id
   FROM redpresu.users
  WHERE (users.id = auth.uid()))) AND (deleted_at IS NULL)));


--
-- Name: issuers issuers_select_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_select_superadmin ON redpresu.issuers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: issuers issuers_update_own; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_update_own ON redpresu.issuers FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: issuers issuers_update_own_company; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_update_own_company ON redpresu.issuers FOR UPDATE USING (((company_id IN ( SELECT users.company_id
   FROM redpresu.users
  WHERE (users.id = auth.uid()))) AND (deleted_at IS NULL))) WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM redpresu.users
  WHERE (users.id = auth.uid()))));


--
-- Name: issuers issuers_update_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY issuers_update_superadmin ON redpresu.issuers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: mock_emails; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.mock_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: mock_emails mock_emails_delete_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY mock_emails_delete_superadmin ON redpresu.mock_emails FOR DELETE USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: mock_emails mock_emails_insert_system; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY mock_emails_insert_system ON redpresu.mock_emails FOR INSERT WITH CHECK (true);


--
-- Name: mock_emails mock_emails_select_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY mock_emails_select_superadmin ON redpresu.mock_emails FOR SELECT USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: subscriptions redpresu_subscriptions_delete_superadmin; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY redpresu_subscriptions_delete_superadmin ON redpresu.subscriptions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: subscriptions redpresu_subscriptions_insert_own_company; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY redpresu_subscriptions_insert_own_company ON redpresu.subscriptions FOR INSERT WITH CHECK (((company_id = user_company_id()) AND (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))));


--
-- Name: subscriptions redpresu_subscriptions_select_own_company; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY redpresu_subscriptions_select_own_company ON redpresu.subscriptions FOR SELECT USING (((company_id = user_company_id()) OR (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))));


--
-- Name: subscriptions redpresu_subscriptions_update_own_company; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY redpresu_subscriptions_update_own_company ON redpresu.subscriptions FOR UPDATE USING ((((company_id = user_company_id()) AND (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))) OR (EXISTS ( SELECT 1
   FROM redpresu.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))));


--
-- Name: registration_tokens; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.registration_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: registration_tokens registration_tokens_public_select; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY registration_tokens_public_select ON redpresu.registration_tokens FOR SELECT USING (((NOT used) AND (expires_at > now())));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tariffs; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.tariffs ENABLE ROW LEVEL SECURITY;

--
-- Name: tariffs tariffs_delete_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY tariffs_delete_policy ON redpresu.tariffs FOR DELETE USING (((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))));


--
-- Name: tariffs tariffs_insert_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY tariffs_insert_policy ON redpresu.tariffs FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (company_id = public.get_user_empresa_id(auth.uid())) AND (user_id = auth.uid())));


--
-- Name: tariffs tariffs_select_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY tariffs_select_policy ON redpresu.tariffs FOR SELECT USING ((company_id = public.get_user_empresa_id(auth.uid())));


--
-- Name: tariffs tariffs_update_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY tariffs_update_policy ON redpresu.tariffs FOR UPDATE USING (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))))) WITH CHECK (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid())))));


--
-- Name: user_invitations; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.user_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: redpresu; Owner: -
--

ALTER TABLE redpresu.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_delete_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY users_delete_policy ON redpresu.users FOR DELETE USING ((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text));


--
-- Name: users users_insert_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY users_insert_policy ON redpresu.users FOR INSERT WITH CHECK (((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['superadmin'::text, 'admin'::text])) OR (auth.uid() IS NULL)));


--
-- Name: POLICY users_insert_policy ON users; Type: COMMENT; Schema: redpresu; Owner: -
--

COMMENT ON POLICY users_insert_policy ON redpresu.users IS 'Permite a superadmin/admin crear usuarios manualmente y registro público vía service_role';


--
-- Name: users users_select_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY users_select_policy ON redpresu.users FOR SELECT USING (((id = auth.uid()) OR (public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text]))));


--
-- Name: users users_update_policy; Type: POLICY; Schema: redpresu; Owner: -
--

CREATE POLICY users_update_policy ON redpresu.users FOR UPDATE USING (((id = auth.uid()) OR (public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])))) WITH CHECK (((id = auth.uid()) OR (public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text]))));


--
-- PostgreSQL database dump complete
--



-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

COMMIT;

-- Si todo fue bien, verás el mensaje "COMMIT" arriba
-- Si hubo algún error, ejecuta: ROLLBACK;


-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
-- Ejecuta estas queries para verificar que todo se migró correctamente:

-- 1. Ver todas las tablas del schema redpresu:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'redpresu' ORDER BY table_name;

-- 2. Contar políticas RLS:
-- SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'redpresu';

-- 3. Contar triggers:
-- SELECT COUNT(*) FROM pg_trigger t
-- JOIN pg_class c ON t.tgrelid = c.oid
-- JOIN pg_namespace n ON c.relnamespace = n.oid
-- WHERE n.nspname = 'redpresu' AND NOT t.tgisinternal;

-- 4. Verificar funciones del schema public:
-- SELECT proname FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND proname IN ('update_updated_at_column', 'log_business_rules_changes', 'get_user_empresa_id', 'get_user_role_by_id', 'user_company_id');

-- 5. Verificar tipos ENUM:
-- SELECT typname FROM pg_type WHERE typname = 'contact_message_status';
