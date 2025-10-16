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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: ensure_single_template(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_template() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Si se está marcando como plantilla (is_template = true)
  IF NEW.is_template = true THEN
    -- Desmarcar todas las demás plantillas de la misma empresa
    UPDATE public.tariffs
    SET is_template = false
    WHERE empresa_id = NEW.empresa_id
      AND id != NEW.id
      AND is_template = true;

    -- Log para debugging
    RAISE NOTICE 'Plantilla establecida: tariff_id=%, empresa_id=%', NEW.id, NEW.empresa_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION ensure_single_template(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ensure_single_template() IS 'Trigger que garantiza que solo haya una tarifa marcada como plantilla por empresa';


--
-- Name: get_budget_children_recursive(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_budget_children_recursive(p_budget_id uuid) RETURNS TABLE(id uuid, parent_budget_id uuid, version_number integer, client_name text, total numeric, status text, created_at timestamp with time zone, depth integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE budget_tree AS (
    -- Caso base: el presupuesto raíz
    SELECT
      b.id,
      b.parent_budget_id,
      b.version_number,
      b.client_name,
      b.total,
      b.status,
      b.created_at,
      0 AS depth
    FROM public.budgets b
    WHERE b.id = p_budget_id

    UNION ALL

    -- Caso recursivo: los hijos
    SELECT
      b.id,
      b.parent_budget_id,
      b.version_number,
      b.client_name,
      b.total,
      b.status,
      b.created_at,
      bt.depth + 1
    FROM public.budgets b
    INNER JOIN budget_tree bt ON b.parent_budget_id = bt.id
  )
  SELECT * FROM budget_tree
  ORDER BY depth, version_number;
END;
$$;


--
-- Name: get_next_budget_version_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_budget_version_number(p_parent_budget_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  -- Si no hay padre, es la versión 1
  IF p_parent_budget_id IS NULL THEN
    RETURN 1;
  END IF;

  -- Obtener el máximo version_number de los hijos del padre
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM public.budgets
  WHERE parent_budget_id = p_parent_budget_id;

  RETURN v_max_version;
END;
$$;


--
-- Name: get_next_version_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_version_number(p_budget_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM public.budget_versions
  WHERE budget_id = p_budget_id;

  RETURN v_max_version;
END;
$$;


--
-- Name: get_user_empresa_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_empresa_id(user_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  user_empresa_id integer;
BEGIN
  SELECT empresa_id INTO user_empresa_id
  FROM public.users
  WHERE id = user_id;

  RETURN user_empresa_id;
END;
$$;


--
-- Name: FUNCTION get_user_empresa_id(user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_empresa_id(user_id uuid) IS 'Returns empresa_id for a user (SECURITY DEFINER to avoid RLS recursion)';


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;

  RETURN user_role;
END;
$$;


--
-- Name: FUNCTION get_user_role(user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_role(user_id uuid) IS 'Returns role for a user (SECURITY DEFINER to avoid RLS recursion)';


--
-- Name: get_user_role_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role_by_id(user_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;

  RETURN user_role;
END;
$$;


--
-- Name: FUNCTION get_user_role_by_id(user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_role_by_id(user_id uuid) IS 'Returns role for a specific user (SECURITY DEFINER to avoid RLS recursion)';


--
-- Name: update_budget_notes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_budget_notes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_issuers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_issuers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_user_last_login(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_last_login(user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.users
  SET last_login = NOW()
  WHERE id = user_id;
END;
$$;


--
-- Name: FUNCTION update_user_last_login(user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_user_last_login(user_id uuid) IS 'Updates last_login timestamp for a user (called from auth actions)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: budget_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budget_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_versions (
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
    total_pagar numeric(10,2) DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    notes text
);


--
-- Name: TABLE budget_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.budget_versions IS 'Almacena versiones históricas de presupuestos';


--
-- Name: COLUMN budget_versions.version_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budget_versions.version_number IS 'Número secuencial de versión por presupuesto';


--
-- Name: COLUMN budget_versions.json_budget_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budget_versions.json_budget_data IS 'Snapshot completo de json_budget_data en el momento de la versión';


--
-- Name: COLUMN budget_versions.json_client_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budget_versions.json_client_data IS 'Snapshot completo de json_client_data en el momento de la versión';


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_id integer DEFAULT 1 NOT NULL,
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
    total_pagar numeric(10,2) NOT NULL,
    json_client_data jsonb,
    parent_budget_id uuid,
    version_number integer DEFAULT 1,
    re_aplica boolean DEFAULT false NOT NULL,
    re_total numeric(10,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT budgets_client_type_check CHECK ((client_type = ANY (ARRAY['particular'::text, 'autonomo'::text, 'empresa'::text]))),
    CONSTRAINT budgets_status_check CHECK ((status = ANY (ARRAY['borrador'::text, 'pendiente'::text, 'enviado'::text, 'aprobado'::text, 'rechazado'::text, 'caducado'::text]))),
    CONSTRAINT chk_budgets_irpf CHECK ((irpf >= (0)::numeric)),
    CONSTRAINT chk_budgets_irpf_percentage CHECK (((irpf_percentage >= (0)::numeric) AND (irpf_percentage <= (100)::numeric))),
    CONSTRAINT chk_budgets_re_total CHECK ((re_total >= (0)::numeric)),
    CONSTRAINT chk_budgets_totals CHECK (((total >= (0)::numeric) AND (iva >= (0)::numeric) AND (base >= (0)::numeric) AND (irpf >= (0)::numeric) AND (total_pagar >= (0)::numeric))),
    CONSTRAINT chk_budgets_validity CHECK (((validity_days > 0) AND (validity_days <= 365)))
);


--
-- Name: TABLE budgets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.budgets IS 'Presupuestos generados con datos de cliente y configuración';


--
-- Name: COLUMN budgets.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.id IS 'Identificador único del presupuesto';


--
-- Name: COLUMN budgets.empresa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.empresa_id IS 'ID de la empresa (siempre 1 en MVP)';


--
-- Name: COLUMN budgets.tariff_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.tariff_id IS 'Referencia a la tarifa utilizada';


--
-- Name: COLUMN budgets.json_tariff_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.json_tariff_data IS 'Copia de la configuración de tarifa al momento de crear el presupuesto';


--
-- Name: COLUMN budgets.client_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_type IS 'Tipo de cliente: particular, autónomo o empresa';


--
-- Name: COLUMN budgets.client_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_name IS 'Nombre del cliente';


--
-- Name: COLUMN budgets.client_nif_nie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_nif_nie IS 'NIF/NIE del cliente';


--
-- Name: COLUMN budgets.client_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_phone IS 'Teléfono del cliente';


--
-- Name: COLUMN budgets.client_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_email IS 'Email del cliente';


--
-- Name: COLUMN budgets.client_web; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_web IS 'Web del cliente';


--
-- Name: COLUMN budgets.client_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_address IS 'Dirección del cliente';


--
-- Name: COLUMN budgets.client_postal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_postal_code IS 'Código postal del cliente';


--
-- Name: COLUMN budgets.client_locality; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_locality IS 'Localidad del cliente';


--
-- Name: COLUMN budgets.client_province; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_province IS 'Provincia del cliente';


--
-- Name: COLUMN budgets.client_acceptance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.client_acceptance IS 'Aceptación del cliente (firmado)';


--
-- Name: COLUMN budgets.json_budget_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.json_budget_data IS 'Estructura JSON con items y configuración del presupuesto';


--
-- Name: COLUMN budgets.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.status IS 'Estado: borrador → pendiente → enviado → {aprobado|rechazado|caducado}';


--
-- Name: COLUMN budgets.total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.total IS 'Total del presupuesto (base + IVA)';


--
-- Name: COLUMN budgets.iva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.iva IS 'Importe del IVA';


--
-- Name: COLUMN budgets.base; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.base IS 'Base imponible (sin IVA)';


--
-- Name: COLUMN budgets.pdf_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.pdf_url IS 'URL del PDF generado';


--
-- Name: COLUMN budgets.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.start_date IS 'Fecha de inicio del proyecto';


--
-- Name: COLUMN budgets.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.end_date IS 'Fecha de fin del proyecto';


--
-- Name: COLUMN budgets.validity_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.validity_days IS 'Días de validez del presupuesto';


--
-- Name: COLUMN budgets.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.user_id IS 'Usuario que creó el presupuesto';


--
-- Name: COLUMN budgets.irpf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.irpf IS 'Importe de IRPF a retener (solo si emisor es autónomo y cliente es empresa/autónomo)';


--
-- Name: COLUMN budgets.irpf_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.irpf_percentage IS 'Porcentaje de IRPF aplicado (típicamente 15%)';


--
-- Name: COLUMN budgets.total_pagar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.total_pagar IS 'Total a pagar final (total con IVA - IRPF + RE)';


--
-- Name: COLUMN budgets.json_client_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.json_client_data IS 'Snapshot de datos del cliente para versionado';


--
-- Name: COLUMN budgets.parent_budget_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.parent_budget_id IS 'ID del presupuesto padre (para jerarquía de versiones)';


--
-- Name: COLUMN budgets.version_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.version_number IS 'Número de versión dentro de la jerarquía (1, 2, 3...)';


--
-- Name: COLUMN budgets.re_aplica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.re_aplica IS 'Indica si se aplica Recargo de Equivalencia (solo si cliente es autónomo)';


--
-- Name: COLUMN budgets.re_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.re_total IS 'Importe total del Recargo de Equivalencia aplicado';


--
-- Name: config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.config IS 'Tabla de configuración global del sistema (IVA-RE, plantillas PDF, defaults, etc.)';


--
-- Name: COLUMN config.key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.config.key IS 'Clave única de configuración (ej: iva_re_equivalences, pdf_templates)';


--
-- Name: COLUMN config.value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.config.value IS 'Valor en formato JSON para flexibilidad';


--
-- Name: COLUMN config.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.config.description IS 'Descripción del parámetro de configuración';


--
-- Name: COLUMN config.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.config.category IS 'Categoría: general, fiscal, pdf, defaults';


--
-- Name: COLUMN config.is_system; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.config.is_system IS 'Si es true, solo superadmin puede modificar';


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nombre text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT empresas_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: TABLE empresas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.empresas IS 'Empresas/Emisores del sistema - cada registro es un tenant independiente';


--
-- Name: COLUMN empresas.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empresas.id IS 'ID único de la empresa';


--
-- Name: COLUMN empresas.nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empresas.nombre IS 'Nombre de la empresa/emisor';


--
-- Name: COLUMN empresas.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empresas.status IS 'Estado de la empresa: active o inactive';


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: issuers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issuers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id integer DEFAULT 1 NOT NULL,
    issuers_type text NOT NULL,
    issuers_name text NOT NULL,
    issuers_nif text NOT NULL,
    issuers_address text NOT NULL,
    issuers_postal_code text,
    issuers_locality text,
    issuers_province text,
    issuers_country text DEFAULT 'España'::text,
    issuers_phone text,
    issuers_email text,
    issuers_web text,
    issuers_irpf_percentage numeric(5,2),
    issuers_logo_url text,
    issuers_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT issuers_email_check CHECK (((issuers_email IS NULL) OR (issuers_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT issuers_irpf_percentage_check CHECK (((issuers_irpf_percentage >= (0)::numeric) AND (issuers_irpf_percentage <= (100)::numeric))),
    CONSTRAINT issuers_type_check CHECK ((issuers_type = ANY (ARRAY['empresa'::text, 'autonomo'::text])))
);


--
-- Name: TABLE issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issuers IS 'Fiscal data for issuers (company or freelancer) for invoicing and budgets';


--
-- Name: COLUMN issuers.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.user_id IS 'Owner/responsible user for this issuer';


--
-- Name: COLUMN issuers.company_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.company_id IS 'Company ID for multi-tenant (default 1 = first company)';


--
-- Name: COLUMN issuers.issuers_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_type IS 'Issuer type: empresa (company) or autonomo (freelancer)';


--
-- Name: COLUMN issuers.issuers_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_name IS 'Business/commercial name';


--
-- Name: COLUMN issuers.issuers_nif; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_nif IS 'Tax identification number (NIF/CIF)';


--
-- Name: COLUMN issuers.issuers_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_address IS 'Fiscal/legal address';


--
-- Name: COLUMN issuers.issuers_postal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_postal_code IS 'Postal/ZIP code';


--
-- Name: COLUMN issuers.issuers_locality; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_locality IS 'City/Locality';


--
-- Name: COLUMN issuers.issuers_province; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_province IS 'State/Province';


--
-- Name: COLUMN issuers.issuers_country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_country IS 'Country';


--
-- Name: COLUMN issuers.issuers_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_phone IS 'Contact phone number';


--
-- Name: COLUMN issuers.issuers_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_email IS 'Contact email';


--
-- Name: COLUMN issuers.issuers_web; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_web IS 'Website URL';


--
-- Name: COLUMN issuers.issuers_irpf_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_irpf_percentage IS 'IRPF withholding percentage (only for freelancers, typically 15%)';


--
-- Name: COLUMN issuers.issuers_logo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_logo_url IS 'Logo image URL';


--
-- Name: COLUMN issuers.issuers_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issuers.issuers_note IS 'Additional notes';


--
-- Name: tariffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tariffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_id integer DEFAULT 1 NOT NULL,
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
    CONSTRAINT tariffs_status_check CHECK ((status = ANY (ARRAY['Activa'::text, 'Inactiva'::text])))
);


--
-- Name: TABLE tariffs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tariffs IS 'Tarifas y configuración de empresa con estructura de precios';


--
-- Name: COLUMN tariffs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.id IS 'Identificador único de la tarifa';


--
-- Name: COLUMN tariffs.empresa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.empresa_id IS 'ID de la empresa (siempre 1 en MVP)';


--
-- Name: COLUMN tariffs.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.title IS 'Título de la tarifa';


--
-- Name: COLUMN tariffs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.description IS 'Descripción de la tarifa';


--
-- Name: COLUMN tariffs.logo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.logo_url IS 'URL del logo de la empresa';


--
-- Name: COLUMN tariffs.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.name IS 'Nombre de la empresa';


--
-- Name: COLUMN tariffs.nif; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.nif IS 'NIF/CIF de la empresa';


--
-- Name: COLUMN tariffs.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.address IS 'Dirección de la empresa';


--
-- Name: COLUMN tariffs.contact; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.contact IS 'Información de contacto';


--
-- Name: COLUMN tariffs.summary_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.summary_note IS 'Nota resumen para presupuestos';


--
-- Name: COLUMN tariffs.conditions_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.conditions_note IS 'Condiciones generales';


--
-- Name: COLUMN tariffs.legal_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.legal_note IS 'Nota legal';


--
-- Name: COLUMN tariffs.template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.template IS 'Plantilla de diseño';


--
-- Name: COLUMN tariffs.primary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.primary_color IS 'Color primario de la empresa';


--
-- Name: COLUMN tariffs.secondary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.secondary_color IS 'Color secundario de la empresa';


--
-- Name: COLUMN tariffs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.status IS 'Estado de la tarifa: Activa o Inactiva';


--
-- Name: COLUMN tariffs.validity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.validity IS 'Validez en días de los presupuestos';


--
-- Name: COLUMN tariffs.json_tariff_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.json_tariff_data IS 'Estructura JSON con categorías e items de la tarifa';


--
-- Name: COLUMN tariffs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.user_id IS 'User who created this tariff (for audit trail)';


--
-- Name: COLUMN tariffs.ivas_presentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.ivas_presentes IS 'Array de porcentajes de IVA presentes en la tarifa (ej: {21.00, 10.00, 4.00}). Detectado automáticamente al importar CSV.';


--
-- Name: COLUMN tariffs.is_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tariffs.is_template IS 'Indica si esta tarifa es la plantilla por defecto de la empresa. Solo puede haber una plantilla activa por empresa.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    role text NOT NULL,
    empresa_id integer DEFAULT 1 NOT NULL,
    nombre text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    invited_by uuid,
    last_login timestamp with time zone,
    apellidos text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'vendedor'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Extensión de auth.users con campos personalizados para roles y empresa';


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id IS 'Referencia directa al usuario en auth.users';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS 'Rol del usuario: superadmin (acceso total), admin (su empresa), vendedor (sus presupuestos)';


--
-- Name: COLUMN users.empresa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.empresa_id IS 'ID de la empresa (siempre 1 en MVP)';


--
-- Name: COLUMN users.nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.nombre IS 'Nombre del usuario';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS 'Email del usuario (sincronizado con auth.users)';


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.status IS 'User status: active, inactive, pending';


--
-- Name: COLUMN users.invited_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.invited_by IS 'User ID who invited this user (for audit trail)';


--
-- Name: COLUMN users.last_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login IS 'Timestamp of last successful login';


--
-- Name: COLUMN users.apellidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.apellidos IS 'Apellidos del usuario';


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: budget_notes budget_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_notes
    ADD CONSTRAINT budget_notes_pkey PRIMARY KEY (id);


--
-- Name: budget_versions budget_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_versions
    ADD CONSTRAINT budget_versions_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: config config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config
    ADD CONSTRAINT config_pkey PRIMARY KEY (key);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: issuers issuers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issuers
    ADD CONSTRAINT issuers_pkey PRIMARY KEY (id);


--
-- Name: tariffs tariffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tariffs
    ADD CONSTRAINT tariffs_pkey PRIMARY KEY (id);


--
-- Name: budget_versions unique_budget_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_versions
    ADD CONSTRAINT unique_budget_version UNIQUE (budget_id, version_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_budget_notes_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_notes_budget_id ON public.budget_notes USING btree (budget_id);


--
-- Name: idx_budget_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_notes_created_at ON public.budget_notes USING btree (created_at DESC);


--
-- Name: idx_budget_notes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_notes_user_id ON public.budget_notes USING btree (user_id);


--
-- Name: idx_budget_versions_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_versions_budget_id ON public.budget_versions USING btree (budget_id);


--
-- Name: idx_budget_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_versions_created_at ON public.budget_versions USING btree (created_at DESC);


--
-- Name: idx_budget_versions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_versions_created_by ON public.budget_versions USING btree (created_by);


--
-- Name: idx_budgets_client_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_client_name ON public.budgets USING btree (client_name);


--
-- Name: idx_budgets_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_created_at ON public.budgets USING btree (created_at DESC);


--
-- Name: idx_budgets_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_empresa_id ON public.budgets USING btree (empresa_id);


--
-- Name: idx_budgets_parent_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_parent_budget_id ON public.budgets USING btree (parent_budget_id);


--
-- Name: idx_budgets_parent_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_parent_version ON public.budgets USING btree (parent_budget_id, version_number DESC);


--
-- Name: idx_budgets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_status ON public.budgets USING btree (status);


--
-- Name: idx_budgets_tariff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_tariff_id ON public.budgets USING btree (tariff_id);


--
-- Name: idx_budgets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_user_id ON public.budgets USING btree (user_id);


--
-- Name: idx_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_category ON public.config USING btree (category);


--
-- Name: idx_config_is_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_is_system ON public.config USING btree (is_system);


--
-- Name: idx_empresas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresas_status ON public.empresas USING btree (status);


--
-- Name: idx_issuers_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_company_id ON public.issuers USING btree (company_id);


--
-- Name: idx_issuers_nif_company; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_issuers_nif_company ON public.issuers USING btree (issuers_nif, company_id);


--
-- Name: idx_issuers_nif_original; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_nif_original ON public.issuers USING btree (issuers_nif);


--
-- Name: idx_issuers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_type ON public.issuers USING btree (issuers_type);


--
-- Name: idx_issuers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_user_id ON public.issuers USING btree (user_id);


--
-- Name: idx_tariffs_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_empresa_id ON public.tariffs USING btree (empresa_id);


--
-- Name: idx_tariffs_empresa_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_empresa_user ON public.tariffs USING btree (empresa_id, user_id);


--
-- Name: idx_tariffs_is_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_is_template ON public.tariffs USING btree (empresa_id, is_template) WHERE (is_template = true);


--
-- Name: idx_tariffs_ivas_presentes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_ivas_presentes ON public.tariffs USING gin (ivas_presentes);


--
-- Name: idx_tariffs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_status ON public.tariffs USING btree (status);


--
-- Name: idx_tariffs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_user_id ON public.tariffs USING btree (user_id);


--
-- Name: idx_users_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_empresa_id ON public.users USING btree (empresa_id);


--
-- Name: idx_users_empresa_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_empresa_status ON public.users USING btree (empresa_id, status);


--
-- Name: idx_users_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_invited_by ON public.users USING btree (invited_by);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: budget_notes budget_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_notes_updated_at BEFORE UPDATE ON public.budget_notes FOR EACH ROW EXECUTE FUNCTION public.update_budget_notes_updated_at();


--
-- Name: budgets trigger_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tariffs trigger_ensure_single_template; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_single_template BEFORE INSERT OR UPDATE OF is_template ON public.tariffs FOR EACH ROW EXECUTE FUNCTION public.ensure_single_template();


--
-- Name: TRIGGER trigger_ensure_single_template ON tariffs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_ensure_single_template ON public.tariffs IS 'Ejecuta ensure_single_template() antes de INSERT/UPDATE para mantener una sola plantilla por empresa';


--
-- Name: issuers trigger_issuers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_issuers_updated_at BEFORE UPDATE ON public.issuers FOR EACH ROW EXECUTE FUNCTION public.update_issuers_updated_at();


--
-- Name: tariffs trigger_tariffs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_tariffs_updated_at BEFORE UPDATE ON public.tariffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users trigger_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budget_notes budget_notes_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_notes
    ADD CONSTRAINT budget_notes_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;


--
-- Name: budget_notes budget_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_notes
    ADD CONSTRAINT budget_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: budget_versions budget_versions_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_versions
    ADD CONSTRAINT budget_versions_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;


--
-- Name: budget_versions budget_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_versions
    ADD CONSTRAINT budget_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: budgets budgets_parent_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_parent_budget_id_fkey FOREIGN KEY (parent_budget_id) REFERENCES public.budgets(id) ON DELETE SET NULL;


--
-- Name: budgets budgets_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariffs(id) ON DELETE RESTRICT;


--
-- Name: budgets budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: issuers emisores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issuers
    ADD CONSTRAINT emisores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tariffs tariffs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tariffs
    ADD CONSTRAINT tariffs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: budget_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_notes budget_notes_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_delete_policy ON public.budget_notes FOR DELETE USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))));


--
-- Name: budget_notes budget_notes_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_insert_policy ON public.budget_notes FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.budgets b
     JOIN public.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_notes.budget_id) AND (u.empresa_id = ( SELECT users.empresa_id
           FROM public.users
          WHERE (users.id = auth.uid()))))))));


--
-- Name: budget_notes budget_notes_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_select_policy ON public.budget_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.budgets b
     JOIN public.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_notes.budget_id) AND (u.empresa_id = ( SELECT users.empresa_id
           FROM public.users
          WHERE (users.id = auth.uid())))))));


--
-- Name: budget_notes budget_notes_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_update_policy ON public.budget_notes FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: budget_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_versions budget_versions_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_versions_delete_policy ON public.budget_versions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.budgets b
     JOIN public.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_versions.budget_id) AND (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (users.empresa_id = u.empresa_id))))))));


--
-- Name: budget_versions budget_versions_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_versions_insert_policy ON public.budget_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.budgets b
     JOIN public.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_versions.budget_id) AND ((b.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.users
          WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (users.empresa_id = u.empresa_id)))))))));


--
-- Name: budget_versions budget_versions_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_versions_select_policy ON public.budget_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.budgets b
     JOIN public.users u ON ((b.user_id = u.id)))
  WHERE ((b.id = budget_versions.budget_id) AND (u.empresa_id = ( SELECT users.empresa_id
           FROM public.users
          WHERE (users.id = auth.uid())))))));


--
-- Name: budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

--
-- Name: config config_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_delete_policy ON public.config FOR DELETE USING (((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text) AND (is_system = false)));


--
-- Name: config config_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_insert_policy ON public.config FOR INSERT WITH CHECK ((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text));


--
-- Name: config config_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_select_policy ON public.config FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: config config_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_update_policy ON public.config FOR UPDATE USING ((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text)) WITH CHECK ((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text));


--
-- Name: empresas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

--
-- Name: empresas empresas_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY empresas_select_own ON public.empresas FOR SELECT TO authenticated USING ((id IN ( SELECT users.empresa_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: empresas empresas_select_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY empresas_select_superadmin ON public.empresas FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: issuers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.issuers ENABLE ROW LEVEL SECURITY;

--
-- Name: issuers issuers_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_delete_policy ON public.issuers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: issuers issuers_insert_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_insert_superadmin ON public.issuers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: POLICY issuers_insert_superadmin ON issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY issuers_insert_superadmin ON public.issuers IS 'Solo superadmin puede crear issuers (registro normal crea via admin API)';


--
-- Name: issuers issuers_select_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_select_own_company ON public.issuers FOR SELECT TO authenticated USING ((company_id IN ( SELECT users.empresa_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: POLICY issuers_select_own_company ON issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY issuers_select_own_company ON public.issuers IS 'Usuarios pueden ver issuers de su propia empresa';


--
-- Name: issuers issuers_select_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_select_superadmin ON public.issuers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: POLICY issuers_select_superadmin ON issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY issuers_select_superadmin ON public.issuers IS 'Superadmin puede ver todos los issuers del sistema';


--
-- Name: issuers issuers_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_update_own ON public.issuers FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: POLICY issuers_update_own ON issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY issuers_update_own ON public.issuers IS 'Usuarios pueden actualizar su propio issuer (perfil)';


--
-- Name: issuers issuers_update_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_update_superadmin ON public.issuers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'superadmin'::text)))));


--
-- Name: POLICY issuers_update_superadmin ON issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY issuers_update_superadmin ON public.issuers IS 'Superadmin puede actualizar cualquier issuer';


--
-- Name: tariffs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete_policy ON public.users FOR DELETE USING ((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text));


--
-- Name: POLICY users_delete_policy ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY users_delete_policy ON public.users IS 'Solo superadmin puede eliminar usuarios (preferir soft delete)';


--
-- Name: users users_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_policy ON public.users FOR INSERT WITH CHECK (((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (empresa_id = public.get_user_empresa_id(auth.uid()))));


--
-- Name: POLICY users_insert_policy ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY users_insert_policy ON public.users IS 'Solo admin/superadmin pueden crear usuarios en su empresa';


--
-- Name: users users_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_policy ON public.users FOR SELECT USING (((id = auth.uid()) OR (empresa_id = public.get_user_empresa_id(auth.uid()))));


--
-- Name: POLICY users_select_policy ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY users_select_policy ON public.users IS 'Usuarios pueden ver su propio registro y otros usuarios de su empresa';


--
-- Name: users users_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_policy ON public.users FOR UPDATE USING (((id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (empresa_id = public.get_user_empresa_id(auth.uid()))))) WITH CHECK (((id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (empresa_id = public.get_user_empresa_id(auth.uid())))));


--
-- Name: POLICY users_update_policy ON users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY users_update_policy ON public.users IS 'Usuarios actualizan su perfil, admin actualiza usuarios de su empresa';


--
-- PostgreSQL database dump complete
--

