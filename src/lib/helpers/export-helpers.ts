/**
 * Export Helpers
 *
 * Funciones para convertir tarifas y presupuestos a formatos exportables (CSV, JSON)
 */

import type { Tariff } from '@/lib/types/database'

/**
 * Convierte una tarifa a formato CSV de estructura de precios
 * Formato compatible con plantilla de importación
 */
export function convertTariffToPriceStructureCSV(tariff: Tariff): string {
  // Headers CSV (mismo formato que plantilla)
  const headers = [
    'Nivel',
    'ID',
    'Nombre',
    'Descripción',
    'Ud',
    '%IVA',
    'PVP'
  ]

  const rows: string[] = [headers.map(h => `"${h}"`).join(',')]

  // Parsear json_tariff_data
  let items: any[] = []
  if (typeof tariff.json_tariff_data === 'string') {
    try {
      items = JSON.parse(tariff.json_tariff_data)
    } catch (e) {
      console.error('[convertTariffToPriceStructureCSV] Error parsing json_tariff_data:', e)
      return rows.join('\n')
    }
  } else if (Array.isArray(tariff.json_tariff_data)) {
    items = tariff.json_tariff_data
  }

  // Aplanar jerarquía con formato de plantilla
  flattenHierarchyForPriceStructure(items, rows)

  return rows.join('\n')
}

/**
 * Mapeo de niveles internos a nombres de visualización
 */
const LEVEL_NAMES: Record<string, string> = {
  'chapter': 'Capítulo',
  'subchapter': 'Subcapítulo',
  'section': 'Apartado',
  'item': 'Partida'
}

/**
 * Aplana la jerarquía para formato de estructura de precios
 */
function flattenHierarchyForPriceStructure(
  items: any[],
  rows: string[]
) {
  for (const item of items) {
    const level = item.level || 'item'
    const levelName = LEVEL_NAMES[level] || level

    // Construir fila CSV según formato plantilla
    const row = [
      `"${levelName}"`,                                    // Nivel
      item.code || item.id,                                // ID
      escapeCsvValue(item.name || ''),                     // Nombre
      level === 'item' ? escapeCsvValue(item.description || '') : '', // Descripción (solo items)
      level === 'item' ? escapeCsvValue(item.unit || '') : '',        // Ud (solo items)
      level === 'item' ? (item.iva || item.iva_percentage || '') : '', // %IVA (solo items)
      level === 'item' ? (item.price_sell || '') : ''                  // PVP (solo items)
    ]

    rows.push(row.join(','))

    // Recursión para hijos
    if (item.children && item.children.length > 0) {
      flattenHierarchyForPriceStructure(item.children, rows)
    }
  }
}


/**
 * Convierte un array de tarifas a formato CSV
 * Solo exporta los items de cada tarifa (estructura jerárquica aplanada)
 */
export function convertTariffsToCSV(tariffs: Tariff[]): string {
  if (tariffs.length === 0) {
    return ''
  }

  // Headers CSV
  const headers = [
    'Tarifa ID',
    'Nombre Tarifa',
    'Capítulo',
    'Subcapítulo',
    'Sección',
    'Código',
    'Descripción',
    'Precio Venta',
    'IVA (%)',
    'Precio Final',
    'Nivel'
  ]

  const rows: string[] = [headers.join(',')]

  // Procesar cada tarifa
  for (const tariff of tariffs) {
    const tariffName = escapeCsvValue(tariff.name)
    const tariffId = tariff.id

    // Parsear json_tariff_data
    let items: any[] = []
    if (typeof tariff.json_tariff_data === 'string') {
      try {
        items = JSON.parse(tariff.json_tariff_data)
      } catch (e) {
        console.error('[convertTariffsToCSV] Error parsing json_tariff_data:', e)
        continue
      }
    } else if (Array.isArray(tariff.json_tariff_data)) {
      items = tariff.json_tariff_data
    }

    // Aplanar jerarquía recursivamente
    flattenHierarchy(items, tariffId, tariffName, rows)
  }

  return rows.join('\n')
}

/**
 * Aplana la jerarquía de items recursivamente
 */
function flattenHierarchy(
  items: any[],
  tariffId: string,
  tariffName: string,
  rows: string[],
  parentPath: { chapter?: string; subchapter?: string; section?: string } = {}
) {
  for (const item of items) {
    const level = item.level || 'item'
    const currentPath = { ...parentPath }

    // Actualizar path según nivel
    if (level === 'chapter') {
      currentPath.chapter = item.description
      currentPath.subchapter = undefined
      currentPath.section = undefined
    } else if (level === 'subchapter') {
      currentPath.subchapter = item.description
      currentPath.section = undefined
    } else if (level === 'section') {
      currentPath.section = item.description
    }

    // Construir fila CSV
    const row = [
      tariffId,
      escapeCsvValue(tariffName),
      escapeCsvValue(currentPath.chapter || ''),
      escapeCsvValue(currentPath.subchapter || ''),
      escapeCsvValue(currentPath.section || ''),
      escapeCsvValue(item.code || ''),
      escapeCsvValue(item.description || ''),
      item.price_sell || '',
      item.iva || '',
      item.price_final || '',
      level
    ]

    rows.push(row.join(','))

    // Recursión para hijos
    if (item.children && item.children.length > 0) {
      flattenHierarchy(item.children, tariffId, tariffName, rows, currentPath)
    }
  }
}

/**
 * Convierte un array de presupuestos a formato CSV
 * Solo exporta los items de cada presupuesto
 */
export function convertBudgetsToCSV(budgets: any[]): string {
  if (budgets.length === 0) {
    return ''
  }

  // Headers CSV
  const headers = [
    'Presupuesto ID',
    'Código Presupuesto',
    'Cliente',
    'Fecha',
    'Capítulo',
    'Subcapítulo',
    'Sección',
    'Código',
    'Descripción',
    'Cantidad',
    'Precio Venta',
    'IVA (%)',
    'Precio Final',
    'Subtotal',
    'Nivel'
  ]

  const rows: string[] = [headers.join(',')]

  // Procesar cada presupuesto
  for (const budget of budgets) {
    const budgetCode = escapeCsvValue(budget.budget_code)
    const budgetId = budget.id
    const clientName = escapeCsvValue(budget.client_name || 'Sin nombre')
    const budgetDate = budget.budget_date || ''

    // Parsear json_budget_data
    let items: any[] = []
    if (typeof budget.json_budget_data === 'string') {
      try {
        const data = JSON.parse(budget.json_budget_data)
        items = data.items || []
      } catch (e) {
        console.error('[convertBudgetsToCSV] Error parsing json_budget_data:', e)
        continue
      }
    } else if (budget.json_budget_data?.items) {
      items = budget.json_budget_data.items
    }

    // Aplanar jerarquía recursivamente
    flattenBudgetHierarchy(items, budgetId, budgetCode, clientName, budgetDate, rows)
  }

  return rows.join('\n')
}

/**
 * Aplana la jerarquía de items de presupuesto recursivamente
 */
function flattenBudgetHierarchy(
  items: any[],
  budgetId: string,
  budgetCode: string,
  clientName: string,
  budgetDate: string,
  rows: string[],
  parentPath: { chapter?: string; subchapter?: string; section?: string } = {}
) {
  for (const item of items) {
    const level = item.level || 'item'
    const currentPath = { ...parentPath }

    // Actualizar path según nivel
    if (level === 'chapter') {
      currentPath.chapter = item.description
      currentPath.subchapter = undefined
      currentPath.section = undefined
    } else if (level === 'subchapter') {
      currentPath.subchapter = item.description
      currentPath.section = undefined
    } else if (level === 'section') {
      currentPath.section = item.description
    }

    // Calcular subtotal si es item
    let subtotal = ''
    if (level === 'item' && item.cantidad && item.price_final) {
      const cantidad = parseFloat(item.cantidad.toString().replace(',', '.'))
      const priceFinal = parseFloat(item.price_final.toString().replace(',', '.'))
      subtotal = (cantidad * priceFinal).toFixed(2)
    }

    // Construir fila CSV
    const row = [
      budgetId,
      escapeCsvValue(budgetCode),
      escapeCsvValue(clientName),
      budgetDate,
      escapeCsvValue(currentPath.chapter || ''),
      escapeCsvValue(currentPath.subchapter || ''),
      escapeCsvValue(currentPath.section || ''),
      escapeCsvValue(item.code || ''),
      escapeCsvValue(item.description || ''),
      item.cantidad || '',
      item.price_sell || '',
      item.iva || '',
      item.price_final || '',
      subtotal,
      level
    ]

    rows.push(row.join(','))

    // Recursión para hijos
    if (item.children && item.children.length > 0) {
      flattenBudgetHierarchy(item.children, budgetId, budgetCode, clientName, budgetDate, rows, currentPath)
    }
  }
}

/**
 * Escapa valores CSV (comillas dobles y comas)
 */
function escapeCsvValue(value: string): string {
  if (!value) return ''

  const stringValue = String(value)

  // Si contiene comas, comillas, o saltos de línea, escapar con comillas
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Convierte tarifas a JSON (completo)
 */
export function convertTariffsToJSON(tariffs: Tariff[]): string {
  // Limpiar campos internos y regenerables
  const cleanTariffs = tariffs.map((tariff) => {
    const { id, created_at, updated_at, empresa_id, user_id, ...rest } = tariff
    return rest
  })

  return JSON.stringify(cleanTariffs, null, 2)
}

/**
 * Convierte presupuestos a JSON (completo)
 */
export function convertBudgetsToJSON(budgets: any[]): string {
  // Limpiar campos internos y regenerables
  const cleanBudgets = budgets.map((budget) => {
    const {
      id,
      created_at,
      updated_at,
      empresa_id,
      user_id,
      parent_budget_id,
      version_number,
      ...rest
    } = budget
    return rest
  })

  return JSON.stringify(cleanBudgets, null, 2)
}

/**
 * Trigger browser download de archivo
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
