import { Budget, Tariff } from '@/lib/types/database'
import { formatCurrency } from './format'

interface BudgetDataItem {
  level: 'chapter' | 'subchapter' | 'section' | 'item'
  id: string
  name: string
  description?: string
  unit?: string
  quantity?: string
  iva_percentage?: string
  pvp?: string
  amount?: string
}

interface PDFPayload {
  company: {
    logo: string
    name: string
    nif: string
    address: string
    contact: string
    template: string
    styles: Array<{ primary_color?: string; secondary_color?: string }>
  }
  pdf: {
    title: string
    author: string
    subject: string
    creator: string
    keywords: string
  }
  summary: {
    client: {
      name: string
      nif_nie: string
      address: string
      contact: string
      budget_date: string
      validity: string
    }
    title: string
    note: string
    levels: Array<{
      level: string
      id: string
      name: string
      amount: string
    }>
    totals: {
      base: {
        name: string
        amount: string
      }
      ivas: Array<{
        name: string
        amount: string
      }>
      total: {
        name: string
        amount: string
      }
    }
  }
  budget: {
    title: string
    levels: Array<BudgetDataItem>
  }
  conditions: {
    title: string
    note: string
  }
  mode: string
}

/**
 * Parsea un número en formato español (con coma) a number
 */
function parseSpanishNumber(value: string | undefined): number {
  if (!value) return 0
  return parseFloat(value.replace(',', '.')) || 0
}

/**
 * Formatea un número a formato español con símbolo de euro
 * Ejemplo: 4995.00 → "4.995,00 €"
 */
function formatSpanishCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Filtra elementos con amount > 0
 */
function filterNonZeroItems(items: BudgetDataItem[]): BudgetDataItem[] {
  return items.filter(item => {
    const amount = parseSpanishNumber(item.amount)
    return amount > 0
  })
}

/**
 * Renumera IDs jerárquicos después de filtrar
 * Ejemplo: si eliminamos 1.1, entonces 1.2 pasa a ser 1.1, 1.3 pasa a ser 1.2, etc.
 */
function renumberHierarchicalIds(items: BudgetDataItem[]): BudgetDataItem[] {
  const renumbered: BudgetDataItem[] = []
  const idMap = new Map<string, string>() // oldId -> newId

  // Agrupar por nivel jerárquico
  const itemsByParent = new Map<string, BudgetDataItem[]>()

  items.forEach(item => {
    const parts = item.id.split('.')
    const parentId = parts.slice(0, -1).join('.')
    const key = parentId || 'root'

    if (!itemsByParent.has(key)) {
      itemsByParent.set(key, [])
    }
    itemsByParent.get(key)!.push(item)
  })

  // Función recursiva para renumerar
  function renumberLevel(parentId: string, counter = 1): void {
    const key = parentId || 'root'
    const children = itemsByParent.get(key) || []

    children.forEach((item, index) => {
      const newNumber = counter + index
      const newId = parentId ? `${parentId}.${newNumber}` : `${newNumber}`

      idMap.set(item.id, newId)

      renumbered.push({
        ...item,
        id: newId
      })

      // Renumerar hijos
      renumberLevel(newId, 1)
    })
  }

  renumberLevel('', 1)

  return renumbered
}

/**
 * Extrae solo los capítulos (level="chapter") del array filtrado
 */
function extractChapters(items: BudgetDataItem[]): Array<{
  level: string
  id: string
  name: string
  amount: string
}> {
  return items
    .filter(item => item.level === 'chapter')
    .map(item => ({
      level: item.level,
      id: item.id,
      name: item.name,
      amount: formatSpanishCurrency(parseSpanishNumber(item.amount))
    }))
}

/**
 * Calcula totales desde los items con cantidad > 0
 */
function calculateTotals(items: BudgetDataItem[]): {
  base: { name: string; amount: string }
  ivas: Array<{ name: string; amount: string }>
  total: { name: string; amount: string }
} {
  let totalAmount = 0
  const ivaGroups = new Map<number, number>()

  // Solo considerar items (partidas)
  items.forEach(item => {
    if (item.level === 'item') {
      const amount = parseSpanishNumber(item.amount)
      const ivaPercentage = parseSpanishNumber(item.iva_percentage)

      totalAmount += amount

      // Calcular IVA incluido: iva_amount = total × (% / (100 + %))
      const ivaAmount = amount * (ivaPercentage / (100 + ivaPercentage))

      if (!ivaGroups.has(ivaPercentage)) {
        ivaGroups.set(ivaPercentage, 0)
      }
      ivaGroups.set(ivaPercentage, ivaGroups.get(ivaPercentage)! + ivaAmount)
    }
  })

  // Calcular total IVA
  const totalIva = Array.from(ivaGroups.values()).reduce((sum, iva) => sum + iva, 0)

  // Base imponible = Total - IVA
  const base = totalAmount - totalIva

  // Formatear IVAs agrupados con formato esperado por Rapid-PDF
  const ivas = Array.from(ivaGroups.entries())
    .map(([percentage, amount]) => {
      // Formatear porcentaje con coma decimal (5.00 → 5,00)
      const percentageFormatted = percentage.toFixed(2).replace('.', ',')
      return {
        name: `${percentageFormatted}% IVA`,
        amount: formatSpanishCurrency(amount)
      }
    })
    .sort((a, b) => {
      const aNum = parseFloat(a.name.replace(',', '.'))
      const bNum = parseFloat(b.name.replace(',', '.'))
      return aNum - bNum
    })

  return {
    base: {
      name: 'Base',
      amount: formatSpanishCurrency(base)
    },
    ivas,
    total: {
      name: 'Total Presupuesto',
      amount: formatSpanishCurrency(totalAmount)
    }
  }
}

/**
 * Formatea dirección completa del cliente
 */
function formatClientAddress(budget: Budget): string {
  const parts = [
    budget.client_address,
    budget.client_postal_code && budget.client_locality
      ? `${budget.client_postal_code} ${budget.client_locality}`
      : budget.client_postal_code || budget.client_locality,
    budget.client_province
  ].filter(Boolean)

  return parts.join(', ')
}

/**
 * Formatea contacto del cliente
 */
function formatClientContact(budget: Budget): string {
  const parts = [
    budget.client_phone,
    budget.client_email
  ].filter(Boolean)

  return parts.join(' - ')
}

/**
 * Formatea fecha en formato DD-MM-YYYY
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

/**
 * Construye el payload completo para Rapid-PDF API
 */
export function buildPDFPayload(budget: Budget, tariff: Tariff): PDFPayload {
  // 1. Obtener datos del presupuesto
  const budgetData = budget.json_budget_data as unknown as BudgetDataItem[]

  // 2. Filtrar elementos con amount > 0
  const filteredItems = filterNonZeroItems(budgetData)

  // 3. Renumerar IDs jerárquicos
  const renumberedItems = renumberHierarchicalIds(filteredItems)

  // 4. Extraer solo capítulos para summary
  const summaryLevels = extractChapters(renumberedItems)

  // 5. Calcular totales
  const totals = calculateTotals(renumberedItems)

  // 6. Construir payload
  // Construir URL completa del logo para que Rapid-PDF pueda acceder
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const logoUrl = tariff.logo_url
    ? tariff.logo_url.startsWith('http')
      ? tariff.logo_url // Ya es URL completa
      : `${baseUrl}${tariff.logo_url}` // Convertir ruta relativa a absoluta
    : ''

  const payload: PDFPayload = {
    company: {
      logo: logoUrl,
      name: tariff.name || '',
      nif: tariff.nif || '',
      address: tariff.address || '',
      contact: tariff.contact || '',
      template: tariff.template || '41200-00001',
      styles: [
        { primary_color: tariff.primary_color },
        { secondary_color: tariff.secondary_color }
      ]
    },
    pdf: {
      title: `Presupuesto - ${budget.client_name} (${budget.client_nif_nie})`,
      author: tariff.name || '',
      subject: 'Documento de Presupuesto',
      creator: 'app server rapidPDF',
      keywords: 'presupuesto'
    },
    summary: {
      client: {
        name: budget.client_name,
        nif_nie: budget.client_nif_nie || '',
        address: formatClientAddress(budget),
        contact: formatClientContact(budget),
        budget_date: formatDate(budget.created_at),
        validity: tariff.validity ? tariff.validity.toString().replace(/[^0-9]/g, '') : '0'
      },
      title: 'Resumen del Presupuesto',
      note: tariff.legal_note || 'En cumplimiento del Reglamento General de Protección de Datos (RGPD), le informamos que sus datos serán tratados confidencialmente.',
      levels: summaryLevels,
      totals
    },
    budget: {
      title: 'Detalles del Presupuesto',
      levels: renumberedItems
    },
    conditions: {
      title: 'Condiciones del Presupuesto',
      note: tariff.summary_note || tariff.conditions_note || 'Presupuesto válido según plazo indicado. Precios IVA incluido.'
    },
    mode: 'produccion'
  }

  return payload
}
