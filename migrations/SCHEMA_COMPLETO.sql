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
-- Name: check_plan_limit(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_plan_limit(p_company_id integer, p_resource_type text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_plan TEXT;
  v_limits JSONB;
  v_current_count INTEGER;
  v_max_limit INTEGER;
  v_config_value JSONB;
BEGIN
  -- Obtener plan actual
  SELECT plan INTO v_plan
  FROM redpresu_subscriptions
  WHERE company_id = p_company_id AND status = 'active'
  LIMIT 1;

  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  -- Obtener configuración de planes
  SELECT config_value::JSONB INTO v_config_value
  FROM redpresu_config
  WHERE config_key = 'stripe_plans';

  IF v_config_value IS NULL THEN
    RETURN true; -- Sin configuración, permitir todo
  END IF;

  -- Obtener límites del plan
  v_limits := v_config_value->v_plan->'limits';

  IF v_limits IS NULL THEN
    RETURN true; -- Plan sin límites definidos
  END IF;

  -- Obtener límite del recurso
  v_max_limit := (v_limits->>p_resource_type)::INTEGER;

  IF v_max_limit IS NULL THEN
    RETURN true; -- Recurso sin límite
  END IF;

  -- Contar recursos actuales
  IF p_resource_type = 'tariffs' THEN
    SELECT COUNT(*) INTO v_current_count FROM redpresu_tariffs WHERE company_id = p_company_id;
  ELSIF p_resource_type = 'budgets' THEN
    SELECT COUNT(*) INTO v_current_count FROM redpresu_budgets WHERE company_id = p_company_id;
  ELSIF p_resource_type = 'users' THEN
    SELECT COUNT(*) INTO v_current_count FROM redpresu_users WHERE company_id = p_company_id;
  ELSE
    RETURN true; -- Recurso no limitado
  END IF;

  -- Verificar si puede crear más
  RETURN v_current_count < v_max_limit;
END;
$$;


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
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_max_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_max_version
  FROM public.redpresu_budgets
  WHERE parent_budget_id = p_parent_budget_id;

  RETURN v_max_version;
END;
$$;


--
-- Name: FUNCTION get_next_budget_version_number(p_parent_budget_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_next_budget_version_number(p_parent_budget_id uuid) IS 'Obtiene el siguiente número de versión para un presupuesto hijo';


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

CREATE FUNCTION public.get_user_empresa_id(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_company_id integer;
BEGIN
  SELECT company_id
  INTO v_company_id
  FROM public.redpresu_users
  WHERE id = p_user_id;

  RETURN v_company_id;
END;
$$;


--
-- Name: FUNCTION get_user_empresa_id(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_empresa_id(p_user_id uuid) IS 'Obtiene el company_id de un usuario dado su user_id (nombre mantenido para compatibilidad)';


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

CREATE FUNCTION public.get_user_role_by_id(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role
  INTO v_role
  FROM public.redpresu_users
  WHERE id = p_user_id;

  RETURN v_role;
END;
$$;


--
-- Name: FUNCTION get_user_role_by_id(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_role_by_id(p_user_id uuid) IS 'Obtiene el rol de un usuario dado su user_id';


--
-- Name: mark_expired_invitations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_expired_invitations() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.redpresu_user_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$;


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
-- Name: redpresu_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_companies (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT empresas_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: TABLE redpresu_companies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_companies IS 'Empresas del sistema multi-tenant';


--
-- Name: COLUMN redpresu_companies.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_companies.id IS 'ID único de la empresa';


--
-- Name: COLUMN redpresu_companies.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_companies.name IS 'Nombre de la empresa';


--
-- Name: COLUMN redpresu_companies.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_companies.status IS 'Estado de la empresa: active o inactive';


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

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.redpresu_companies.id;


--
-- Name: redpresu_issuers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_issuers (
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
-- Name: TABLE redpresu_issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_issuers IS 'Datos fiscales de emisores (empresa o autónomo) para facturación';


--
-- Name: COLUMN redpresu_issuers.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.user_id IS 'Owner/responsible user for this issuer';


--
-- Name: COLUMN redpresu_issuers.company_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.company_id IS 'Company ID for multi-tenant (default 1 = first company)';


--
-- Name: COLUMN redpresu_issuers.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.type IS 'Tipo de emisor: empresa o autonomo';


--
-- Name: COLUMN redpresu_issuers.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.name IS 'Nombre o razón social del emisor';


--
-- Name: COLUMN redpresu_issuers.nif; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.nif IS 'NIF/CIF del emisor';


--
-- Name: COLUMN redpresu_issuers.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.address IS 'Dirección del emisor';


--
-- Name: COLUMN redpresu_issuers.postal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.postal_code IS 'Código postal';


--
-- Name: COLUMN redpresu_issuers.locality; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.locality IS 'Localidad';


--
-- Name: COLUMN redpresu_issuers.province; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.province IS 'Provincia';


--
-- Name: COLUMN redpresu_issuers.country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.country IS 'País';


--
-- Name: COLUMN redpresu_issuers.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.phone IS 'Teléfono de contacto';


--
-- Name: COLUMN redpresu_issuers.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.email IS 'Email de contacto';


--
-- Name: COLUMN redpresu_issuers.web; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.web IS 'Sitio web';


--
-- Name: COLUMN redpresu_issuers.irpf_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.irpf_percentage IS 'Porcentaje de IRPF (solo autónomos)';


--
-- Name: COLUMN redpresu_issuers.logo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.logo_url IS 'URL del logo del emisor';


--
-- Name: COLUMN redpresu_issuers.note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.note IS 'Nota o descripción adicional';


--
-- Name: COLUMN redpresu_issuers.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_issuers.deleted_at IS 'Timestamp de eliminación (soft-delete). NULL = activo, timestamp = eliminado';


--
-- Name: redpresu_active_issuers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.redpresu_active_issuers AS
 SELECT redpresu_issuers.id,
    redpresu_issuers.user_id,
    redpresu_issuers.company_id,
    redpresu_issuers.type,
    redpresu_issuers.name,
    redpresu_issuers.nif,
    redpresu_issuers.address,
    redpresu_issuers.postal_code,
    redpresu_issuers.locality,
    redpresu_issuers.province,
    redpresu_issuers.country,
    redpresu_issuers.phone,
    redpresu_issuers.email,
    redpresu_issuers.web,
    redpresu_issuers.irpf_percentage,
    redpresu_issuers.logo_url,
    redpresu_issuers.note,
    redpresu_issuers.created_at,
    redpresu_issuers.updated_at,
    redpresu_issuers.deleted_at
   FROM public.redpresu_issuers
  WHERE (redpresu_issuers.deleted_at IS NULL);


--
-- Name: VIEW redpresu_active_issuers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.redpresu_active_issuers IS 'Vista de emisores activos (no eliminados). Usar en queries normales.';


--
-- Name: redpresu_budget_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_budget_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE redpresu_budget_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_budget_notes IS 'Notas y comentarios asociados a presupuestos';


--
-- Name: redpresu_budget_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_budget_versions (
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
-- Name: TABLE redpresu_budget_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_budget_versions IS 'Historial de versiones de presupuestos';


--
-- Name: COLUMN redpresu_budget_versions.version_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budget_versions.version_number IS 'Número secuencial de versión por presupuesto';


--
-- Name: COLUMN redpresu_budget_versions.json_budget_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budget_versions.json_budget_data IS 'Snapshot completo de json_budget_data en el momento de la versión';


--
-- Name: COLUMN redpresu_budget_versions.json_client_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budget_versions.json_client_data IS 'Snapshot completo de json_client_data en el momento de la versión';


--
-- Name: COLUMN redpresu_budget_versions.total_pay; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budget_versions.total_pay IS 'Total a pagar (con IVA, IRPF y RE aplicados)';


--
-- Name: redpresu_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_budgets (
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
    CONSTRAINT budgets_client_type_check CHECK ((client_type = ANY (ARRAY['particular'::text, 'autonomo'::text, 'empresa'::text]))),
    CONSTRAINT budgets_status_check CHECK ((status = ANY (ARRAY['borrador'::text, 'pendiente'::text, 'enviado'::text, 'aprobado'::text, 'rechazado'::text, 'caducado'::text]))),
    CONSTRAINT chk_budgets_irpf CHECK ((irpf >= (0)::numeric)),
    CONSTRAINT chk_budgets_irpf_percentage CHECK (((irpf_percentage >= (0)::numeric) AND (irpf_percentage <= (100)::numeric))),
    CONSTRAINT chk_budgets_re_total CHECK ((re_total >= (0)::numeric)),
    CONSTRAINT chk_budgets_totals CHECK (((total >= (0)::numeric) AND (iva >= (0)::numeric) AND (base >= (0)::numeric) AND (irpf >= (0)::numeric) AND (total_pay >= (0)::numeric))),
    CONSTRAINT chk_budgets_validity CHECK (((validity_days > 0) AND (validity_days <= 365)))
);


--
-- Name: TABLE redpresu_budgets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_budgets IS 'Presupuestos generados a partir de tarifas con datos de cliente';


--
-- Name: COLUMN redpresu_budgets.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.id IS 'Identificador único del presupuesto';


--
-- Name: COLUMN redpresu_budgets.company_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.company_id IS 'ID de la empresa (company)';


--
-- Name: COLUMN redpresu_budgets.tariff_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.tariff_id IS 'Referencia a la tarifa utilizada';


--
-- Name: COLUMN redpresu_budgets.json_tariff_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.json_tariff_data IS 'Copia de la configuración de tarifa al momento de crear el presupuesto';


--
-- Name: COLUMN redpresu_budgets.client_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_type IS 'Tipo de cliente: particular, autónomo o empresa';


--
-- Name: COLUMN redpresu_budgets.client_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_name IS 'Nombre del cliente';


--
-- Name: COLUMN redpresu_budgets.client_nif_nie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_nif_nie IS 'NIF/NIE del cliente';


--
-- Name: COLUMN redpresu_budgets.client_phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_phone IS 'Teléfono del cliente';


--
-- Name: COLUMN redpresu_budgets.client_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_email IS 'Email del cliente';


--
-- Name: COLUMN redpresu_budgets.client_web; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_web IS 'Web del cliente';


--
-- Name: COLUMN redpresu_budgets.client_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_address IS 'Dirección del cliente';


--
-- Name: COLUMN redpresu_budgets.client_postal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_postal_code IS 'Código postal del cliente';


--
-- Name: COLUMN redpresu_budgets.client_locality; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_locality IS 'Localidad del cliente';


--
-- Name: COLUMN redpresu_budgets.client_province; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_province IS 'Provincia del cliente';


--
-- Name: COLUMN redpresu_budgets.client_acceptance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.client_acceptance IS 'Aceptación del cliente (firmado)';


--
-- Name: COLUMN redpresu_budgets.json_budget_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.json_budget_data IS 'Estructura JSON con items y configuración del presupuesto';


--
-- Name: COLUMN redpresu_budgets.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.status IS 'Estado: borrador → pendiente → enviado → {aprobado|rechazado|caducado}';


--
-- Name: COLUMN redpresu_budgets.total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.total IS 'Total del presupuesto (base + IVA)';


--
-- Name: COLUMN redpresu_budgets.iva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.iva IS 'Importe del IVA';


--
-- Name: COLUMN redpresu_budgets.base; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.base IS 'Base imponible (sin IVA)';


--
-- Name: COLUMN redpresu_budgets.pdf_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.pdf_url IS 'URL del PDF generado';


--
-- Name: COLUMN redpresu_budgets.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.start_date IS 'Fecha de inicio del proyecto';


--
-- Name: COLUMN redpresu_budgets.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.end_date IS 'Fecha de fin del proyecto';


--
-- Name: COLUMN redpresu_budgets.validity_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.validity_days IS 'Días de validez del presupuesto';


--
-- Name: COLUMN redpresu_budgets.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.user_id IS 'Usuario que creó el presupuesto';


--
-- Name: COLUMN redpresu_budgets.irpf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.irpf IS 'Importe de IRPF a retener (solo si emisor es autónomo y cliente es empresa/autónomo)';


--
-- Name: COLUMN redpresu_budgets.irpf_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.irpf_percentage IS 'Porcentaje de IRPF aplicado (típicamente 15%)';


--
-- Name: COLUMN redpresu_budgets.total_pay; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.total_pay IS 'Total a pagar (con IVA, IRPF y RE aplicados)';


--
-- Name: COLUMN redpresu_budgets.json_client_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.json_client_data IS 'Snapshot de datos del cliente para versionado';


--
-- Name: COLUMN redpresu_budgets.parent_budget_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.parent_budget_id IS 'ID del presupuesto padre (para jerarquía de versiones)';


--
-- Name: COLUMN redpresu_budgets.version_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.version_number IS 'Número de versión dentro de la jerarquía (1, 2, 3...)';


--
-- Name: COLUMN redpresu_budgets.re_apply; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.re_apply IS 'Indica si se aplica Recargo de Equivalencia';


--
-- Name: COLUMN redpresu_budgets.re_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_budgets.re_total IS 'Importe total del Recargo de Equivalencia aplicado';


--
-- Name: redpresu_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_config (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE redpresu_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_config IS 'Configuración global del sistema editable por superadmin';


--
-- Name: COLUMN redpresu_config.key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_config.key IS 'Clave única de configuración (ej: iva_re_equivalences, pdf_templates)';


--
-- Name: COLUMN redpresu_config.value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_config.value IS 'Valor en formato JSON para flexibilidad';


--
-- Name: COLUMN redpresu_config.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_config.description IS 'Descripción del parámetro de configuración';


--
-- Name: COLUMN redpresu_config.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_config.category IS 'Categoría: general, fiscal, pdf, defaults';


--
-- Name: COLUMN redpresu_config.is_system; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_config.is_system IS 'Si es true, solo superadmin puede modificar';


--
-- Name: redpresu_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_subscriptions (
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
    CONSTRAINT redpresu_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'trialing'::text])))
);


--
-- Name: redpresu_tariffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_tariffs (
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
    CONSTRAINT tariffs_status_check CHECK ((status = ANY (ARRAY['Activa'::text, 'Inactiva'::text])))
);


--
-- Name: TABLE redpresu_tariffs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_tariffs IS 'Tarifas con estructura jerárquica (capítulos, subcapítulos, partidas)';


--
-- Name: COLUMN redpresu_tariffs.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.id IS 'Identificador único de la tarifa';


--
-- Name: COLUMN redpresu_tariffs.company_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.company_id IS 'ID de la empresa (company)';


--
-- Name: COLUMN redpresu_tariffs.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.title IS 'Título de la tarifa';


--
-- Name: COLUMN redpresu_tariffs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.description IS 'Descripción de la tarifa';


--
-- Name: COLUMN redpresu_tariffs.logo_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.logo_url IS 'URL del logo de la empresa';


--
-- Name: COLUMN redpresu_tariffs.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.name IS 'Nombre de la empresa';


--
-- Name: COLUMN redpresu_tariffs.nif; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.nif IS 'NIF/CIF de la empresa';


--
-- Name: COLUMN redpresu_tariffs.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.address IS 'Dirección de la empresa';


--
-- Name: COLUMN redpresu_tariffs.contact; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.contact IS 'Información de contacto';


--
-- Name: COLUMN redpresu_tariffs.summary_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.summary_note IS 'Nota resumen para presupuestos';


--
-- Name: COLUMN redpresu_tariffs.conditions_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.conditions_note IS 'Condiciones generales';


--
-- Name: COLUMN redpresu_tariffs.legal_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.legal_note IS 'Nota legal';


--
-- Name: COLUMN redpresu_tariffs.template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.template IS 'Plantilla de diseño';


--
-- Name: COLUMN redpresu_tariffs.primary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.primary_color IS 'Color primario de la empresa';


--
-- Name: COLUMN redpresu_tariffs.secondary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.secondary_color IS 'Color secundario de la empresa';


--
-- Name: COLUMN redpresu_tariffs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.status IS 'Estado de la tarifa: Activa o Inactiva';


--
-- Name: COLUMN redpresu_tariffs.validity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.validity IS 'Validez en días de los presupuestos';


--
-- Name: COLUMN redpresu_tariffs.json_tariff_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.json_tariff_data IS 'Estructura JSON con categorías e items de la tarifa';


--
-- Name: COLUMN redpresu_tariffs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.user_id IS 'User who created this tariff (for audit trail)';


--
-- Name: COLUMN redpresu_tariffs.ivas_presentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.ivas_presentes IS 'Array de porcentajes de IVA presentes en la tarifa (ej: {21.00, 10.00, 4.00}). Detectado automáticamente al importar CSV.';


--
-- Name: COLUMN redpresu_tariffs.is_template; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_tariffs.is_template IS 'Indica si esta tarifa es la plantilla por defecto de la empresa. Solo puede haber una plantilla activa por empresa.';


--
-- Name: redpresu_user_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_user_invitations (
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
-- Name: TABLE redpresu_user_invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_user_invitations IS 'Tabla de invitaciones de usuarios con tokens de acceso';


--
-- Name: COLUMN redpresu_user_invitations.inviter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_user_invitations.inviter_id IS 'Usuario que envía la invitación';


--
-- Name: COLUMN redpresu_user_invitations.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_user_invitations.email IS 'Email del usuario invitado';


--
-- Name: COLUMN redpresu_user_invitations.token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_user_invitations.token IS 'Token único para validar la invitación';


--
-- Name: COLUMN redpresu_user_invitations.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_user_invitations.expires_at IS 'Fecha de expiración del token';


--
-- Name: COLUMN redpresu_user_invitations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_user_invitations.status IS 'Estado: pending, accepted, expired, cancelled';


--
-- Name: redpresu_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redpresu_users (
    id uuid NOT NULL,
    role text NOT NULL,
    company_id integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    invited_by uuid,
    last_login timestamp with time zone,
    last_name text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'vendedor'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])))
);


--
-- Name: TABLE redpresu_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.redpresu_users IS 'Usuarios del sistema con roles y empresa asignada';


--
-- Name: COLUMN redpresu_users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.id IS 'Referencia directa al usuario en auth.users';


--
-- Name: COLUMN redpresu_users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.role IS 'Rol del usuario: superadmin (acceso total), admin (su empresa), vendedor (sus presupuestos)';


--
-- Name: COLUMN redpresu_users.company_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.company_id IS 'ID de la empresa (company)';


--
-- Name: COLUMN redpresu_users.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.name IS 'Nombre del usuario';


--
-- Name: COLUMN redpresu_users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.email IS 'Email del usuario (sincronizado con auth.users)';


--
-- Name: COLUMN redpresu_users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.status IS 'User status: active, inactive, pending';


--
-- Name: COLUMN redpresu_users.invited_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.invited_by IS 'User ID who invited this user (for audit trail)';


--
-- Name: COLUMN redpresu_users.last_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.last_login IS 'Timestamp of last successful login';


--
-- Name: COLUMN redpresu_users.last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.redpresu_users.last_name IS 'Apellidos del usuario';


--
-- Name: redpresu_companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_companies ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: redpresu_budget_notes budget_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budget_notes
    ADD CONSTRAINT budget_notes_pkey PRIMARY KEY (id);


--
-- Name: redpresu_budget_versions budget_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budget_versions
    ADD CONSTRAINT budget_versions_pkey PRIMARY KEY (id);


--
-- Name: redpresu_budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: redpresu_config config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_config
    ADD CONSTRAINT config_pkey PRIMARY KEY (key);


--
-- Name: redpresu_companies empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_companies
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: redpresu_issuers issuers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_issuers
    ADD CONSTRAINT issuers_pkey PRIMARY KEY (id);


--
-- Name: redpresu_subscriptions redpresu_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_subscriptions
    ADD CONSTRAINT redpresu_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: redpresu_subscriptions redpresu_subscriptions_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_subscriptions
    ADD CONSTRAINT redpresu_subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: redpresu_subscriptions redpresu_subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_subscriptions
    ADD CONSTRAINT redpresu_subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: redpresu_user_invitations redpresu_user_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_user_invitations
    ADD CONSTRAINT redpresu_user_invitations_pkey PRIMARY KEY (id);


--
-- Name: redpresu_user_invitations redpresu_user_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_user_invitations
    ADD CONSTRAINT redpresu_user_invitations_token_key UNIQUE (token);


--
-- Name: redpresu_tariffs tariffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_tariffs
    ADD CONSTRAINT tariffs_pkey PRIMARY KEY (id);


--
-- Name: redpresu_budget_versions unique_budget_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budget_versions
    ADD CONSTRAINT unique_budget_version UNIQUE (budget_id, version_number);


--
-- Name: redpresu_users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_budget_notes_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_notes_budget_id ON public.redpresu_budget_notes USING btree (budget_id);


--
-- Name: idx_budget_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_notes_created_at ON public.redpresu_budget_notes USING btree (created_at DESC);


--
-- Name: idx_budget_notes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_notes_user_id ON public.redpresu_budget_notes USING btree (user_id);


--
-- Name: idx_budget_versions_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_versions_budget_id ON public.redpresu_budget_versions USING btree (budget_id);


--
-- Name: idx_budget_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_versions_created_at ON public.redpresu_budget_versions USING btree (created_at DESC);


--
-- Name: idx_budget_versions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_versions_created_by ON public.redpresu_budget_versions USING btree (created_by);


--
-- Name: idx_budgets_client_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_client_name ON public.redpresu_budgets USING btree (client_name);


--
-- Name: idx_budgets_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_created_at ON public.redpresu_budgets USING btree (created_at DESC);


--
-- Name: idx_budgets_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_empresa_id ON public.redpresu_budgets USING btree (company_id);


--
-- Name: idx_budgets_parent_budget_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_parent_budget_id ON public.redpresu_budgets USING btree (parent_budget_id);


--
-- Name: idx_budgets_parent_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_parent_version ON public.redpresu_budgets USING btree (parent_budget_id, version_number DESC);


--
-- Name: idx_budgets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_status ON public.redpresu_budgets USING btree (status);


--
-- Name: idx_budgets_tariff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_tariff_id ON public.redpresu_budgets USING btree (tariff_id);


--
-- Name: idx_budgets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_user_id ON public.redpresu_budgets USING btree (user_id);


--
-- Name: idx_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_category ON public.redpresu_config USING btree (category);


--
-- Name: idx_config_is_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_is_system ON public.redpresu_config USING btree (is_system);


--
-- Name: idx_empresas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresas_status ON public.redpresu_companies USING btree (status);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email ON public.redpresu_user_invitations USING btree (email);


--
-- Name: idx_invitations_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_expires_at ON public.redpresu_user_invitations USING btree (expires_at);


--
-- Name: idx_invitations_inviter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_inviter_id ON public.redpresu_user_invitations USING btree (inviter_id);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_status ON public.redpresu_user_invitations USING btree (status);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_token ON public.redpresu_user_invitations USING btree (token);


--
-- Name: idx_issuers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_active ON public.redpresu_issuers USING btree (company_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_issuers_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_company_id ON public.redpresu_issuers USING btree (company_id);


--
-- Name: idx_issuers_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_deleted_at ON public.redpresu_issuers USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_issuers_nif_company; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_issuers_nif_company ON public.redpresu_issuers USING btree (nif, company_id);


--
-- Name: idx_issuers_nif_original; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_nif_original ON public.redpresu_issuers USING btree (nif);


--
-- Name: idx_issuers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_type ON public.redpresu_issuers USING btree (type);


--
-- Name: idx_issuers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issuers_user_id ON public.redpresu_issuers USING btree (user_id);


--
-- Name: idx_redpresu_subscriptions_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redpresu_subscriptions_company ON public.redpresu_subscriptions USING btree (company_id);


--
-- Name: idx_redpresu_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redpresu_subscriptions_status ON public.redpresu_subscriptions USING btree (status);


--
-- Name: idx_redpresu_subscriptions_stripe_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redpresu_subscriptions_stripe_customer ON public.redpresu_subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_tariffs_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_empresa_id ON public.redpresu_tariffs USING btree (company_id);


--
-- Name: idx_tariffs_empresa_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_empresa_user ON public.redpresu_tariffs USING btree (company_id, user_id);


--
-- Name: idx_tariffs_is_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_is_template ON public.redpresu_tariffs USING btree (company_id, is_template) WHERE (is_template = true);


--
-- Name: idx_tariffs_ivas_presentes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_ivas_presentes ON public.redpresu_tariffs USING gin (ivas_presentes);


--
-- Name: idx_tariffs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_status ON public.redpresu_tariffs USING btree (status);


--
-- Name: idx_tariffs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tariffs_user_id ON public.redpresu_tariffs USING btree (user_id);


--
-- Name: idx_users_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_company ON public.redpresu_users USING btree (company_id);


--
-- Name: idx_users_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_empresa_id ON public.redpresu_users USING btree (company_id);


--
-- Name: idx_users_empresa_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_empresa_status ON public.redpresu_users USING btree (company_id, status);


--
-- Name: idx_users_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_invited_by ON public.redpresu_users USING btree (invited_by);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login ON public.redpresu_users USING btree (last_login);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.redpresu_users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.redpresu_users USING btree (status);


--
-- Name: redpresu_budget_notes budget_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_notes_updated_at BEFORE UPDATE ON public.redpresu_budget_notes FOR EACH ROW EXECUTE FUNCTION public.update_budget_notes_updated_at();


--
-- Name: redpresu_budgets trigger_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_budgets_updated_at BEFORE UPDATE ON public.redpresu_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: redpresu_tariffs trigger_ensure_single_template; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_single_template BEFORE INSERT OR UPDATE OF is_template ON public.redpresu_tariffs FOR EACH ROW EXECUTE FUNCTION public.ensure_single_template();


--
-- Name: TRIGGER trigger_ensure_single_template ON redpresu_tariffs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_ensure_single_template ON public.redpresu_tariffs IS 'Ejecuta ensure_single_template() antes de INSERT/UPDATE para mantener una sola plantilla por empresa';


--
-- Name: redpresu_issuers trigger_issuers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_issuers_updated_at BEFORE UPDATE ON public.redpresu_issuers FOR EACH ROW EXECUTE FUNCTION public.update_issuers_updated_at();


--
-- Name: redpresu_tariffs trigger_tariffs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_tariffs_updated_at BEFORE UPDATE ON public.redpresu_tariffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: redpresu_users trigger_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.redpresu_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: redpresu_budget_notes budget_notes_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budget_notes
    ADD CONSTRAINT budget_notes_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.redpresu_budgets(id) ON DELETE CASCADE;


--
-- Name: redpresu_budget_notes budget_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budget_notes
    ADD CONSTRAINT budget_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: redpresu_budget_versions budget_versions_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budget_versions
    ADD CONSTRAINT budget_versions_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.redpresu_budgets(id) ON DELETE CASCADE;


--
-- Name: redpresu_budget_versions budget_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budget_versions
    ADD CONSTRAINT budget_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.redpresu_users(id) ON DELETE SET NULL;


--
-- Name: redpresu_budgets budgets_parent_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budgets
    ADD CONSTRAINT budgets_parent_budget_id_fkey FOREIGN KEY (parent_budget_id) REFERENCES public.redpresu_budgets(id) ON DELETE SET NULL;


--
-- Name: redpresu_budgets budgets_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budgets
    ADD CONSTRAINT budgets_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.redpresu_tariffs(id) ON DELETE RESTRICT;


--
-- Name: redpresu_budgets budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_budgets
    ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: redpresu_issuers emisores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_issuers
    ADD CONSTRAINT emisores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: redpresu_user_invitations redpresu_user_invitations_inviter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_user_invitations
    ADD CONSTRAINT redpresu_user_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.redpresu_users(id) ON DELETE CASCADE;


--
-- Name: redpresu_tariffs tariffs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_tariffs
    ADD CONSTRAINT tariffs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: redpresu_users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: redpresu_users users_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redpresu_users
    ADD CONSTRAINT users_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.redpresu_users(id) ON DELETE SET NULL;


--
-- Name: redpresu_budget_notes budget_notes_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_delete_policy ON public.redpresu_budget_notes FOR DELETE USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text))))));


--
-- Name: redpresu_budget_notes budget_notes_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_insert_policy ON public.redpresu_budget_notes FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.redpresu_budgets b
     JOIN public.redpresu_users u ON ((b.user_id = u.id)))
  WHERE ((b.id = redpresu_budget_notes.budget_id) AND (u.company_id = ( SELECT redpresu_users.company_id AS empresa_id
           FROM public.redpresu_users
          WHERE (redpresu_users.id = auth.uid()))))))));


--
-- Name: redpresu_budget_notes budget_notes_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_select_policy ON public.redpresu_budget_notes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.redpresu_budgets b
     JOIN public.redpresu_users u ON ((b.user_id = u.id)))
  WHERE ((b.id = redpresu_budget_notes.budget_id) AND (u.company_id = ( SELECT redpresu_users.company_id AS empresa_id
           FROM public.redpresu_users
          WHERE (redpresu_users.id = auth.uid())))))));


--
-- Name: redpresu_budget_notes budget_notes_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_notes_update_policy ON public.redpresu_budget_notes FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: redpresu_budget_versions budget_versions_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_versions_delete_policy ON public.redpresu_budget_versions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.redpresu_budgets b
     JOIN public.redpresu_users u ON ((b.user_id = u.id)))
  WHERE ((b.id = redpresu_budget_versions.budget_id) AND (EXISTS ( SELECT 1
           FROM public.redpresu_users
          WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (redpresu_users.company_id = u.company_id))))))));


--
-- Name: redpresu_budget_versions budget_versions_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_versions_insert_policy ON public.redpresu_budget_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.redpresu_budgets b
     JOIN public.redpresu_users u ON ((b.user_id = u.id)))
  WHERE ((b.id = redpresu_budget_versions.budget_id) AND ((b.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.redpresu_users
          WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (redpresu_users.company_id = u.company_id)))))))));


--
-- Name: redpresu_budget_versions budget_versions_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_versions_select_policy ON public.redpresu_budget_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.redpresu_budgets b
     JOIN public.redpresu_users u ON ((b.user_id = u.id)))
  WHERE ((b.id = redpresu_budget_versions.budget_id) AND (u.company_id = ( SELECT redpresu_users.company_id AS empresa_id
           FROM public.redpresu_users
          WHERE (redpresu_users.id = auth.uid())))))));


--
-- Name: redpresu_budgets budgets_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_delete_policy ON public.redpresu_budgets FOR DELETE USING (((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))));


--
-- Name: redpresu_budgets budgets_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_insert_policy ON public.redpresu_budgets FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));


--
-- Name: redpresu_budgets budgets_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_select_policy ON public.redpresu_budgets FOR SELECT USING (((company_id = public.get_user_empresa_id(auth.uid())) OR (public.get_user_role_by_id(auth.uid()) = 'superadmin'::text)));


--
-- Name: redpresu_budgets budgets_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budgets_update_policy ON public.redpresu_budgets FOR UPDATE USING (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))))) WITH CHECK (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid())))));


--
-- Name: redpresu_config config_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_select_policy ON public.redpresu_config FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: redpresu_companies empresas_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY empresas_select_own ON public.redpresu_companies FOR SELECT TO authenticated USING ((id IN ( SELECT redpresu_users.company_id AS empresa_id
   FROM public.redpresu_users
  WHERE (redpresu_users.id = auth.uid()))));


--
-- Name: redpresu_companies empresas_select_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY empresas_select_superadmin ON public.redpresu_companies FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text)))));


--
-- Name: redpresu_user_invitations invitations_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invitations_delete_policy ON public.redpresu_user_invitations FOR DELETE USING (((inviter_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))));


--
-- Name: redpresu_user_invitations invitations_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invitations_insert_policy ON public.redpresu_user_invitations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));


--
-- Name: redpresu_user_invitations invitations_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invitations_select_policy ON public.redpresu_user_invitations FOR SELECT USING ((auth.uid() IN ( SELECT u1.id
   FROM (public.redpresu_users u1
     JOIN public.redpresu_users u2 ON ((u1.company_id = u2.company_id)))
  WHERE (u2.id = redpresu_user_invitations.inviter_id))));


--
-- Name: redpresu_user_invitations invitations_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invitations_update_policy ON public.redpresu_user_invitations FOR UPDATE USING (((inviter_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = ANY (ARRAY['admin'::text, 'superadmin'::text])))))));


--
-- Name: redpresu_issuers issuers_delete_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_delete_own_company ON public.redpresu_issuers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text)))));


--
-- Name: redpresu_issuers issuers_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_delete_policy ON public.redpresu_issuers FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text)))));


--
-- Name: redpresu_issuers issuers_insert_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_insert_own_company ON public.redpresu_issuers FOR INSERT WITH CHECK (((company_id IN ( SELECT redpresu_users.company_id
   FROM public.redpresu_users
  WHERE (redpresu_users.id = auth.uid()))) AND (deleted_at IS NULL)));


--
-- Name: redpresu_issuers issuers_insert_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_insert_superadmin ON public.redpresu_issuers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text)))));


--
-- Name: redpresu_issuers issuers_select_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_select_own_company ON public.redpresu_issuers FOR SELECT USING (((company_id IN ( SELECT redpresu_users.company_id
   FROM public.redpresu_users
  WHERE (redpresu_users.id = auth.uid()))) AND (deleted_at IS NULL)));


--
-- Name: redpresu_issuers issuers_select_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_select_superadmin ON public.redpresu_issuers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text)))));


--
-- Name: redpresu_issuers issuers_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_update_own ON public.redpresu_issuers FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: redpresu_issuers issuers_update_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_update_own_company ON public.redpresu_issuers FOR UPDATE USING (((company_id IN ( SELECT redpresu_users.company_id
   FROM public.redpresu_users
  WHERE (redpresu_users.id = auth.uid()))) AND (deleted_at IS NULL))) WITH CHECK ((company_id IN ( SELECT redpresu_users.company_id
   FROM public.redpresu_users
  WHERE (redpresu_users.id = auth.uid()))));


--
-- Name: redpresu_issuers issuers_update_superadmin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY issuers_update_superadmin ON public.redpresu_issuers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.redpresu_users
  WHERE ((redpresu_users.id = auth.uid()) AND (redpresu_users.role = 'superadmin'::text)))));


--
-- Name: redpresu_budget_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_budget_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_budget_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_budget_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_companies ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_config ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_issuers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_issuers ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_subscriptions redpresu_subscriptions_insert_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY redpresu_subscriptions_insert_own_company ON public.redpresu_subscriptions FOR INSERT WITH CHECK ((company_id = 1));


--
-- Name: redpresu_subscriptions redpresu_subscriptions_select_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY redpresu_subscriptions_select_own_company ON public.redpresu_subscriptions FOR SELECT USING ((company_id = 1));


--
-- Name: redpresu_subscriptions redpresu_subscriptions_update_own_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY redpresu_subscriptions_update_own_company ON public.redpresu_subscriptions FOR UPDATE USING ((company_id = 1));


--
-- Name: redpresu_tariffs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_tariffs ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_user_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_user_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.redpresu_users ENABLE ROW LEVEL SECURITY;

--
-- Name: redpresu_tariffs tariffs_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tariffs_delete_policy ON public.redpresu_tariffs FOR DELETE USING (((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))));


--
-- Name: redpresu_tariffs tariffs_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tariffs_insert_policy ON public.redpresu_tariffs FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (company_id = public.get_user_empresa_id(auth.uid())) AND (user_id = auth.uid())));


--
-- Name: redpresu_tariffs tariffs_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tariffs_select_policy ON public.redpresu_tariffs FOR SELECT USING ((company_id = public.get_user_empresa_id(auth.uid())));


--
-- Name: redpresu_tariffs tariffs_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tariffs_update_policy ON public.redpresu_tariffs FOR UPDATE USING (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid()))))) WITH CHECK (((user_id = auth.uid()) OR ((public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (company_id = public.get_user_empresa_id(auth.uid())))));


--
-- Name: redpresu_users users_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete_policy ON public.redpresu_users FOR DELETE USING ((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text));


--
-- Name: redpresu_users users_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_policy ON public.redpresu_users FOR INSERT WITH CHECK ((public.get_user_role_by_id(auth.uid()) = 'superadmin'::text));


--
-- Name: redpresu_users users_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_policy ON public.redpresu_users FOR SELECT USING (((id = auth.uid()) OR (public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text]))));


--
-- Name: redpresu_users users_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_policy ON public.redpresu_users FOR UPDATE USING (((id = auth.uid()) OR (public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text])))) WITH CHECK (((id = auth.uid()) OR (public.get_user_role_by_id(auth.uid()) = ANY (ARRAY['admin'::text, 'superadmin'::text]))));


--
-- PostgreSQL database dump complete
--

