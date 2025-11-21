export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[]

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  COMERCIAL = 'comercial'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  AWAITING_APPROVAL = 'awaiting_approval',
  REJECTED = 'rejected'
}

export enum TariffStatus {
  ACTIVA = 'Activa',
  INACTIVA = 'Inactiva'
}

export enum BudgetStatus {
  BORRADOR = 'borrador',
  PENDIENTE = 'pendiente',
  ENVIADO = 'enviado',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  CADUCADO = 'caducado'
}

export enum ClientType {
  PARTICULAR = 'particular',
  AUTONOMO = 'autonomo',
  EMPRESA = 'empresa'
}

// ============================================
// Tipos para Suscripciones (Stripe)
// ============================================

export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  company_id: number;
  plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string
  role: string
  company_id: number | null
  issuer_id: string | null
  name: string
  email: string
  status: string
  created_at: string
  updated_at: string
}

export interface Tariff {
  id: string
  company_id: number
  title: string
  description: string | null
  logo_url: string | null
  name: string
  nif: string | null
  address: string | null
  contact: string | null
  summary_note: string | null
  conditions_note: string | null
  legal_note: string | null
  template: string | null
  primary_color: string
  secondary_color: string
  status: string
  validity: number | null
  json_tariff_data: JsonValue
  ivas_presentes?: number[]
  user_id?: string
  is_template?: boolean
  created_at: string
  updated_at: string
}

export interface TariffData {
  categories: TariffCategory[]
  general_config?: {
    iva_percentage?: number
    default_margin?: number
    currency?: string
  }
}

export interface TariffCategory {
  id: string
  name: string
  items: TariffItem[]
}

export interface TariffItem {
  id: string
  name: string
  unit: string
  base_price: number
  description?: string
}

export interface Budget {
  id: string
  company_id: number
  tariff_id: string
  budget_number: string
  json_tariff_data: JsonValue
  client_type: string
  client_name: string
  client_nif_nie: string | null
  client_phone: string | null
  client_email: string | null
  client_web: string | null
  client_address: string | null
  client_postal_code: string | null
  client_locality: string | null
  client_province: string | null
  client_acceptance: boolean | null
  json_budget_data: JsonValue
  json_client_data?: JsonValue
  parent_budget_id?: string | null
  version_number?: number
  status: string
  total: number
  iva: number
  base: number
  irpf?: number
  irpf_percentage?: number
  total_pay?: number
  pdf_url: string | null
  start_date: string | null
  end_date: string | null
  validity_days: number | null
  user_id: string
  created_at: string
  updated_at: string
  tariffs?: {
    title: string
  }
  users?: {
    name: string
  }
  children?: Budget[]
}

export interface BudgetVersion {
  id: string
  budget_id: string
  version_number: number
  version_name: string | null
  json_budget_data: JsonValue
  json_client_data: JsonValue
  total_amount: number
  base_amount: number
  irpf: number | null
  irpf_percentage: number | null
  total_pay: number | null
  created_by: string | null
  created_at: string
  notes: string | null
  users?: {
    name: string
    email: string
  }
}

export interface BudgetData {
  items: BudgetItem[]
  totals: {
    subtotal: number
    iva_amount: number
    total: number
  }
  client_data: {
    name: string
    email?: string
    phone?: string
    address?: string
  }
  company_data?: {
    name: string
    logo?: string
    address?: string
    phone?: string
    email?: string
  }
}

export interface BudgetItem {
  id: string
  tariff_item_id: string
  name: string
  description?: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

export interface TariffDataLevel {
  level: number
  id: string
  name: string
  amount: number
  unit?: string
  description?: string
}

export interface BudgetDataLevel {
  level: number
  id: string
  name: string
  quantity: number
  amount: number
  unit?: string
  description?: string
  total: number
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      tariffs: {
        Row: Tariff
        Insert: Omit<Tariff, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Tariff, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
      budgets: {
        Row: Budget
        Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string
        }
      }
    }
  }
}

export interface DatabaseResponse<T> {
  data: T | null
  error: Error | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}