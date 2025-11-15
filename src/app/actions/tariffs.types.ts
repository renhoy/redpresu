// ============================================================
// Tariffs Types - Redpresu
// Tipos compartidos para evitar imports de server actions en cliente
// ============================================================

/**
 * Datos del formulario de tarifa
 * Usado por componentes cliente para tipado sin importar server actions
 */
export interface TariffFormData {
  title: string
  description?: string
  validity: number
  status: 'Borrador' | 'Activa' | 'Inactiva'
  logo_url: string
  name: string
  nif: string
  address: string
  contact: string
  template: string
  primary_color: string
  secondary_color: string
  summary_note: string
  conditions_note: string
  legal_note: string
  json_tariff_data?: unknown
}
