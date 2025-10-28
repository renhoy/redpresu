import { Budget, Tariff } from '@/lib/types/database'
import { formatCurrency } from './format'
import path from 'path'

// Usar require para fs.promises (compatible con Next.js Server Actions)
const fs = require('fs').promises

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
    budget_number: string
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
      subtotal?: {
        name: string
        amount: string
      }
      base: {
        name: string
        amount: string
      }
      ivas: Array<{
        name: string
        amount: string
      }>
      irpf?: {
        name: string
        amount: string
      }
      re?: Array<{
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
 * Formatea un número a formato español sin símbolo de euro
 * Ejemplo: 1234.56 → "1.234,56"
 */
function formatSpanishNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Filtra elementos con amount > 0 y elimina ancestros vacíos
 * Paso 2 del algoritmo correcto:
 * - Elimina partidas con importe = 0
 * - Elimina sus ancestros (secciones, subcapítulos, capítulos) que también tengan importe = 0
 */
function filterNonZeroItems(items: BudgetDataItem[]): BudgetDataItem[] {
  // Primero, filtrar todos los elementos con amount > 0
  const nonZeroItems = items.filter(item => {
    const amount = parseSpanishNumber(item.amount)
    return amount > 0
  })

  // Crear set de IDs que tienen descendientes con importe > 0
  const idsWithChildren = new Set<string>()

  nonZeroItems.forEach(item => {
    // Añadir el ID del item
    idsWithChildren.add(item.id)

    // Añadir todos los ancestros
    const parts = item.id.split('.')
    for (let i = 1; i < parts.length; i++) {
      const ancestorId = parts.slice(0, i).join('.')
      idsWithChildren.add(ancestorId)
    }
  })

  // Retornar solo los items que tienen importe > 0 O tienen descendientes con importe > 0
  return items.filter(item => idsWithChildren.has(item.id))
}

/**
 * Renumera IDs jerárquicos después de filtrar
 * Ejemplo: si eliminamos 1.1, entonces 1.2 pasa a ser 1.1, 1.3 pasa a ser 1.2, etc.
 */
function renumberHierarchicalIds(items: BudgetDataItem[]): BudgetDataItem[] {
  const renumbered: BudgetDataItem[] = []

  // Agrupar por padre usando IDs ORIGINALES
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
  // originalParentId: ID original del padre (para buscar en itemsByParent)
  // newParentId: Nuevo ID del padre (para construir nuevos IDs de hijos)
  function renumberLevel(originalParentId: string, newParentId: string, counter = 1): void {
    const key = originalParentId || 'root'
    const children = itemsByParent.get(key) || []

    children.forEach((item, index) => {
      const newNumber = counter + index
      const newId = newParentId ? `${newParentId}.${newNumber}` : `${newNumber}`

      renumbered.push({
        ...item,
        id: newId
      })

      // Renumerar hijos: buscar usando el ID ORIGINAL del item actual
      // pero construir IDs usando el NUEVO ID
      renumberLevel(item.id, newId, 1)
    })
  }

  // Iniciar desde la raíz
  renumberLevel('', '', 1)

  return renumbered
}

/**
 * Extrae solo los capítulos (level="chapter") del array filtrado
 * Devuelve amounts en formato inglés (Rapid-PDF los convertirá a español)
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
      amount: parseSpanishNumber(item.amount).toFixed(2)
    }))
}

/**
 * Calcula totales desde los items con cantidad > 0
 * Incluye IRPF y RE si están presentes en el presupuesto
 */
function calculateTotals(
  items: BudgetDataItem[],
  budget: Budget
): {
  subtotal?: { name: string; amount: string }
  base: { name: string; amount: string }
  ivas: Array<{ name: string; amount: string }>
  irpf?: { name: string; amount: string }
  re?: Array<{ name: string; amount: string }>
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

  // Formatear IVAs agrupados - amounts en inglés (Rapid-PDF los convertirá)
  const ivas = Array.from(ivaGroups.entries())
    .map(([percentage, amount]) => {
      return {
        name: `${percentage.toFixed(2)}% IVA`,
        amount: amount.toFixed(2)
      }
    })
    .sort((a, b) => {
      const aNum = parseFloat(a.name)
      const bNum = parseFloat(b.name)
      return aNum - bNum
    })

  // Calcular total a pagar (base + IVA - IRPF + RE)
  let totalPagar = totalAmount
  let hasIRPF = false
  let hasRE = false

  // Construir objeto de retorno base
  const result: {
    subtotal?: { name: string; amount: string }
    base: { name: string; amount: string }
    ivas: Array<{ name: string; amount: string }>
    irpf?: { name: string; amount: string }
    re?: Array<{ name: string; amount: string }>
    total: { name: string; amount: string }
  } = {
    base: {
      name: 'Base Imponible',
      amount: base.toFixed(2)
    },
    ivas,
    total: {
      name: 'TOTAL PRESUPUESTO',
      amount: totalAmount.toFixed(2)
    }
  }

  // Agregar IRPF si existe y es mayor que 0
  if (budget.irpf && budget.irpf > 0 && budget.irpf_percentage) {
    hasIRPF = true
    result.irpf = {
      name: `${budget.irpf_percentage.toFixed(2)}% IRPF`,
      amount: (-budget.irpf).toFixed(2) // Negativo porque es una retención
    }
    totalPagar -= budget.irpf
  }

  // Agregar Recargos de Equivalencia si existen
  const budgetData = budget.json_budget_data as any
  if (budgetData?.recargo?.aplica && budgetData.recargo.reByIVA) {
    const recargosArray: Array<{ name: string; amount: string }> = []

    // Iterar sobre cada IVA y su recargo
    Object.entries(budgetData.recargo.reByIVA).forEach(([ivaPercentage, reAmount]) => {
      const ivaNum = Number(ivaPercentage)
      const reAmountNum = reAmount as number

      // Calcular porcentaje de RE según IVA
      // RE = (reAmount / baseIVA) * 100
      // Necesitamos encontrar la base del IVA correspondiente
      const ivaAmountFromMap = ivaGroups.get(ivaNum) || 0
      const baseIVA = ivaAmountFromMap / (ivaNum / 100)
      const rePercentage = baseIVA > 0 ? (reAmountNum / baseIVA) * 100 : 0

      recargosArray.push({
        name: `${rePercentage.toFixed(2)}% RE (IVA ${ivaNum.toFixed(2)}%)`,
        amount: reAmountNum.toFixed(2)
      })

      totalPagar += reAmountNum
    })

    // Ordenar por IVA ascendente
    recargosArray.sort((a, b) => {
      const aIva = parseFloat(a.name.match(/IVA\s+([\d.]+)%/)?.[1] || '0')
      const bIva = parseFloat(b.name.match(/IVA\s+([\d.]+)%/)?.[1] || '0')
      return aIva - bIva
    })

    if (recargosArray.length > 0) {
      hasRE = true
      result.re = recargosArray
    }
  }

  // Añadir subtotal SOLO si hay IRPF o RE
  if (hasIRPF || hasRE) {
    result.subtotal = {
      name: 'Subtotal',
      amount: totalAmount.toFixed(2)
    }
  }

  // Actualizar total a pagar
  result.total.amount = totalPagar.toFixed(2)

  return result
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
 * Formatea campos numéricos de items en formato español
 * - amount y pvp: '1.234,56 €'
 * - quantity: '1.234,56'
 * - iva_percentage: '21,00'
 */
/**
 * Normaliza números a formato inglés para el payload
 * El payload debe tener TODOS los números en formato inglés (punto decimal, sin separadores)
 * Rapid-PDF se encargará de convertirlos a español al renderizar
 */
function formatItemNumbers(items: BudgetDataItem[]): BudgetDataItem[] {
  return items.map(item => {
    const formatted: BudgetDataItem = {
      ...item
    }

    // Normalizar amount a formato inglés (sin formato, solo número)
    if (item.amount) {
      const amountNum = parseSpanishNumber(item.amount)
      formatted.amount = amountNum.toFixed(2)
    }

    // Normalizar pvp a formato inglés (solo para items)
    if (item.level === 'item' && item.pvp) {
      const pvpNum = parseSpanishNumber(item.pvp)
      formatted.pvp = pvpNum.toFixed(2)
    }

    // Normalizar quantity a formato inglés (solo para items)
    if (item.level === 'item' && item.quantity) {
      const quantityNum = parseSpanishNumber(item.quantity)
      formatted.quantity = quantityNum.toFixed(2)
    }

    // Normalizar iva_percentage a formato inglés (solo para items)
    if (item.level === 'item' && item.iva_percentage) {
      const ivaNum = parseSpanishNumber(item.iva_percentage)
      formatted.iva_percentage = ivaNum.toFixed(2)
    }

    return formatted
  })
}

/**
 * Guarda un archivo JSON intermedio en temp/ para depuración
 */
async function saveIntermediateFile(filename: string, data: any): Promise<void> {
  try {
    const tempDir = path.join(process.cwd(), 'temp')

    // Crear directorio temp si no existe
    try {
      await fs.access(tempDir)
    } catch {
      await fs.mkdir(tempDir, { recursive: true })
    }

    const filePath = path.join(tempDir, filename)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`[buildPDFPayload] ✓ Guardado: ${filename}`)
  } catch (error) {
    console.error(`[buildPDFPayload] ✗ Error guardando ${filename}:`, error)
  }
}

/**
 * Construye el payload completo para Rapid-PDF API
 */
export async function buildPDFPayload(budget: Budget, tariff: Tariff): Promise<PDFPayload> {
  console.log('[buildPDFPayload] === INICIANDO CONSTRUCCIÓN DE PAYLOAD ===')

  // 1. Obtener datos del presupuesto
  // Manejar dos formatos posibles:
  // - Formato simple: json_budget_data es directamente un array
  // - Formato con recargo: json_budget_data = { items: [...], recargo: {...} }
  const rawData = budget.json_budget_data as any
  const budgetData: BudgetDataItem[] = Array.isArray(rawData)
    ? rawData
    : rawData?.items || []

  console.log(`[buildPDFPayload] Paso 1: Datos crudos - ${budgetData.length} elementos`)
  await saveIntermediateFile('payload-step1-raw-data.json', {
    step: 'Paso 1 - Datos crudos de json_budget_data',
    totalItems: budgetData.length,
    data: budgetData
  })

  // 2. Filtrar elementos con amount > 0
  const filteredItems = filterNonZeroItems(budgetData)

  console.log(`[buildPDFPayload] Paso 2: Filtrados - ${filteredItems.length} elementos (eliminados ${budgetData.length - filteredItems.length})`)
  await saveIntermediateFile('payload-step2-filtered.json', {
    step: 'Paso 2 - Después de filterNonZeroItems()',
    totalItems: filteredItems.length,
    removedItems: budgetData.length - filteredItems.length,
    data: filteredItems
  })

  // 3. Renumerar IDs jerárquicos
  const renumberedItems = renumberHierarchicalIds(filteredItems)

  console.log(`[buildPDFPayload] Paso 3: Renumerados - ${renumberedItems.length} elementos`)
  await saveIntermediateFile('payload-step3-renumbered.json', {
    step: 'Paso 3 - Después de renumberHierarchicalIds()',
    totalItems: renumberedItems.length,
    data: renumberedItems
  })

  // 4. Formatear números en formato español
  const formattedItems = formatItemNumbers(renumberedItems)

  console.log(`[buildPDFPayload] Paso 4: Formateados - ${formattedItems.length} elementos`)
  await saveIntermediateFile('payload-step4-formatted.json', {
    step: 'Paso 4 - Después de formatItemNumbers() - budget.levels',
    totalItems: formattedItems.length,
    data: formattedItems
  })

  // 5. Extraer solo capítulos para summary
  const summaryLevels = extractChapters(formattedItems)

  console.log(`[buildPDFPayload] Paso 5: Capítulos extraídos - ${summaryLevels.length} elementos`)
  await saveIntermediateFile('payload-step5-chapters.json', {
    step: 'Paso 5 - Después de extractChapters() - summary.levels',
    totalChapters: summaryLevels.length,
    data: summaryLevels
  })

  // 6. Calcular totales (incluye IRPF y RE del budget)
  const totals = calculateTotals(formattedItems, budget)

  console.log('[buildPDFPayload] Paso 6: Totales calculados')
  await saveIntermediateFile('payload-step6-totals.json', {
    step: 'Paso 6 - Totales calculados',
    data: totals
  })

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
      budget_number: budget.budget_number,
      client: {
        name: budget.client_name,
        nif_nie: budget.client_nif_nie || '',
        address: formatClientAddress(budget),
        contact: formatClientContact(budget),
        budget_date: formatDate(budget.created_at),
        validity: tariff.validity ? tariff.validity.toString().replace(/[^0-9]/g, '') : '0'
      },
      title: 'Resumen del Presupuesto',
      note: budget.summary_note || tariff.summary_note || '',
      levels: summaryLevels,
      totals
    },
    budget: {
      title: 'Detalles del Presupuesto',
      levels: formattedItems
    },
    conditions: {
      title: 'Condiciones del Presupuesto',
      note: budget.conditions_note || tariff.conditions_note || ''
    },
    mode: 'produccion'
  }

  return payload
}
