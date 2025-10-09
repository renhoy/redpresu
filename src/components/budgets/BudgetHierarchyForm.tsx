"use client"

import { useState, useEffect, useRef } from 'react'
import { Info, Minus, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency, formatNumberES, parseNumber } from '@/lib/helpers/format'

// Helpers de formato numérico
const parseSpanishNumber = (value: string | number): number => {
  if (typeof value === 'number') return value

  // Detectar si viene en formato inglés (punto) o español (coma)
  const str = value.toString().trim()

  // Si tiene punto Y coma, asumir formato español (punto=miles, coma=decimal)
  if (str.includes('.') && str.includes(',')) {
    return parseNumber(str, 'es')
  }

  // Si solo tiene coma, es formato español
  if (str.includes(',')) {
    return parseNumber(str, 'es')
  }

  // Si solo tiene punto o ninguno, parseFloat directo (formato inglés)
  return parseFloat(str) || 0
}

const formatSpanishNumber = (value: number, decimals = 2): string => {
  return formatNumberES(value, decimals)
}

interface BudgetItem {
  level: "chapter" | "subchapter" | "section" | "item"
  id: string
  name: string
  description?: string
  amount?: string
  unit?: string
  quantity?: string
  iva_percentage?: string
  pvp?: string
  children?: BudgetItem[]
}

interface BudgetHierarchyFormProps {
  tariffData: BudgetItem[]
  onBudgetDataChange: (budgetData: BudgetItem[]) => void
  onTotalsChange?: (totals: { base: number; total: number }) => void
  primaryColor?: string
  secondaryColor?: string
  irpf?: number
  irpfPercentage?: number
  reByIVA?: Record<number, number>
  totalRE?: number
}

interface IVAGroup {
  percentage: number
  amount: number
}

interface Totals {
  base: number
  ivaGroups: IVAGroup[]
  total: number
}

export function BudgetHierarchyForm({
  tariffData,
  onBudgetDataChange,
  onTotalsChange,
  primaryColor = '#3b82f6',
  secondaryColor = '#1e40af',
  irpf = 0,
  irpfPercentage = 0,
  reByIVA = {},
  totalRE = 0
}: BudgetHierarchyFormProps) {
  const [budgetData, setBudgetData] = useState<BudgetItem[]>([])
  const [totals, setTotals] = useState<Totals>({ base: 0, ivaGroups: [], total: 0 })

  // ESTADO GLOBAL: activeItemId controla qué partida muestra controles
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  // Refs para evitar bucles infinitos en useEffect
  const prevBudgetDataRef = useRef<string>('')
  const isInitialMount = useRef(true)

  // Normalizar formato de números: convertir puntos a comas
  const normalizeNumberFormat = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    // Convertir punto decimal a coma
    return value.replace('.', ',')
  }

  // Initialize budget data - preserve existing quantities or set to 0
  useEffect(() => {
    const initialBudgetData = tariffData.map(item => ({
      ...item,
      // Preservar quantity y amount si ya existen (normalizando formato), sino inicializar a 0,00
      quantity: item.quantity !== undefined
        ? normalizeNumberFormat(item.quantity)
        : (item.level === 'item' ? '0,00' : undefined),
      amount: item.amount !== undefined
        ? normalizeNumberFormat(item.amount)
        : '0,00'
    }))

    setBudgetData(initialBudgetData)

    // Establecer primera partida como activa
    const firstItem = initialBudgetData.find(i => i.level === 'item')
    if (firstItem) {
      setActiveItemId(firstItem.id)
    }
  }, [tariffData])

  // Calculate totals whenever budget data changes
  useEffect(() => {
    // Skip en mount inicial cuando budgetData está vacío
    if (isInitialMount.current && budgetData.length === 0) {
      isInitialMount.current = false
      return
    }

    // Serializar budgetData para comparar si cambió realmente
    const currentBudgetDataStr = JSON.stringify(budgetData)

    // Solo notificar si budgetData cambió realmente
    if (currentBudgetDataStr !== prevBudgetDataRef.current) {
      prevBudgetDataRef.current = currentBudgetDataStr

      const newTotals = calculateTotals(budgetData)
      setTotals(newTotals)

      onBudgetDataChange(budgetData)

      // Notificar totals al padre
      if (onTotalsChange) {
        onTotalsChange({
          base: newTotals.base,
          total: newTotals.total
        })
      }
    }
  }, [budgetData, onBudgetDataChange, onTotalsChange])

  const calculateTotals = (items: BudgetItem[]): Totals => {
    let totalAmount = 0
    const ivaMap = new Map<number, number>()

    const processItems = (items: BudgetItem[]) => {
      items.forEach(item => {
        if (item.level === 'item' && item.quantity && item.pvp && item.iva_percentage) {
          // Parsear valores usando formato español
          const quantity = parseSpanishNumber(item.quantity)
          const pvp = parseSpanishNumber(item.pvp)
          const ivaPercentage = parseSpanishNumber(item.iva_percentage)

          if (quantity > 0) {
            const itemTotal = quantity * pvp
            totalAmount += itemTotal

            // Fórmula IVA incluido: iva_amount = total × (% / (100 + %))
            const ivaAmount = itemTotal * (ivaPercentage / (100 + ivaPercentage))

            if (ivaAmount > 0) {
              const currentIva = ivaMap.get(ivaPercentage) || 0
              ivaMap.set(ivaPercentage, currentIva + ivaAmount)
            }
          }
        }

        if (item.children) {
          processItems(item.children)
        }
      })
    }

    processItems(items)

    // Convert IVA map to sorted array (highest percentage first)
    const ivaGroups = Array.from(ivaMap.entries())
      .filter(([_, amount]) => amount > 0)
      .map(([percentage, amount]) => ({ percentage, amount }))
      .sort((a, b) => b.percentage - a.percentage)

    const totalIva = ivaGroups.reduce((sum, group) => sum + group.amount, 0)
    const base = totalAmount - totalIva

    return { base, ivaGroups, total: totalAmount }
  }

  const updateItemQuantity = (itemId: string, newQuantity: string) => {
    setBudgetData(prevData => {
      // 1. Actualizar cantidad y amount del item
      const updatedData = prevData.map(item => {
        if (item.id === itemId && item.level === 'item') {
          const quantity = parseSpanishNumber(newQuantity)
          const pvp = parseSpanishNumber(item.pvp || '0')
          const amount = quantity * pvp

          return {
            ...item,
            quantity: formatSpanishNumber(quantity),
            amount: formatSpanishNumber(amount)
          }
        }
        return item
      })

      // 2. Calcular totales de ancestros
      // Crear mapa de totales por ID
      const totalsMap = new Map<string, number>()

      // Acumular amounts de items en sus ancestros
      updatedData.forEach(item => {
        if (item.level === 'item' && item.amount) {
          const itemAmount = parseSpanishNumber(item.amount)
          const idParts = item.id.split('.')

          // Generar IDs de ancestros: "1.1.1.1" → ["1", "1.1", "1.1.1"]
          for (let i = 1; i <= idParts.length - 1; i++) {
            const ancestorId = idParts.slice(0, i).join('.')
            const current = totalsMap.get(ancestorId) || 0
            totalsMap.set(ancestorId, current + itemAmount)
          }
        }
      })

      // 3. Aplicar totales calculados a chapters/subchapters/sections
      return updatedData.map(item => {
        if (item.level !== 'item' && totalsMap.has(item.id)) {
          return {
            ...item,
            amount: formatSpanishNumber(totalsMap.get(item.id)!)
          }
        }
        return item
      })
    })
  }

  const incrementQuantity = (itemId: string, currentQuantity: string) => {
    const quantity = parseSpanishNumber(currentQuantity)
    const newQuantity = formatSpanishNumber(quantity + 1)
    updateItemQuantity(itemId, newQuantity)
  }

  const decrementQuantity = (itemId: string, currentQuantity: string) => {
    const quantity = parseSpanishNumber(currentQuantity)
    const newQuantity = Math.max(0, quantity - 1)
    updateItemQuantity(itemId, formatSpanishNumber(newQuantity))
  }

  // FUNCIONES DE NAVEGACIÓN (inspiradas en ItemNavigation)

  /**
   * Obtener ruta de ancestros de un itemId
   * "1.1.1.1" → ["1", "1.1", "1.1.1"]
   */
  const getAncestorsPath = (itemId: string): string[] => {
    const parts = itemId.split('.')
    const ancestors: string[] = []

    for (let i = 1; i < parts.length; i++) {
      ancestors.push(parts.slice(0, i).join('.'))
    }

    return ancestors
  }

  /**
   * Obtener siguiente partida en el archivo JSON plano
   * Wrap around al principio si es la última
   */
  const getNextItem = (currentId: string | null): string | null => {
    const items = budgetData.filter(i => i.level === 'item')
    if (items.length === 0) return null

    if (!currentId) return items[0].id

    const currentIdx = items.findIndex(i => i.id === currentId)
    if (currentIdx === -1) return items[0].id

    const nextIdx = (currentIdx + 1) % items.length
    return items[nextIdx].id
  }

  /**
   * Obtener partida anterior en el archivo JSON plano
   * Wrap around al final si es la primera
   */
  const getPrevItem = (currentId: string | null): string | null => {
    const items = budgetData.filter(i => i.level === 'item')
    if (items.length === 0) return null

    if (!currentId) return items[items.length - 1].id

    const currentIdx = items.findIndex(i => i.id === currentId)
    if (currentIdx === -1) return items[items.length - 1].id

    const prevIdx = currentIdx === 0 ? items.length - 1 : currentIdx - 1
    return items[prevIdx].id
  }

  /**
   * Obtener primera partida descendiente de un contenedor
   */
  const getFirstItemInContainer = (containerId: string): string | null => {
    const items = budgetData.filter(i => i.level === 'item')
    const firstItem = items.find(i => i.id.startsWith(containerId + '.'))
    return firstItem ? firstItem.id : null
  }

  /**
   * Navegar a una partida específica
   * type: 'specific' | 'firstInContainer' | 'next' | 'prev'
   */
  const navigateToItem = (type: 'specific' | 'firstInContainer' | 'next' | 'prev', targetId: string) => {
    let newActiveId: string | null = null

    switch(type) {
      case 'specific':
        // Click directo en partida
        newActiveId = targetId
        break

      case 'firstInContainer':
        // Click en chapter/subchapter/section → ir a primera partida descendiente
        newActiveId = getFirstItemInContainer(targetId)
        if (!newActiveId) {
          // Si no hay partidas en este contenedor, ir a la primera general
          const items = budgetData.filter(i => i.level === 'item')
          newActiveId = items.length > 0 ? items[0].id : null
        }
        break

      case 'next':
        // Siguiente partida con wrap-around
        newActiveId = getNextItem(activeItemId)
        break

      case 'prev':
        // Partida anterior con wrap-around
        newActiveId = getPrevItem(activeItemId)
        break
    }

    if (newActiveId) {
      setActiveItemId(newActiveId)
    }
  }

  /**
   * Verificar si un item debe estar expandido
   * Solo si está en la ruta hacia activeItemId
   */
  const isInActivePath = (itemId: string): boolean => {
    if (!activeItemId) return false

    // Si es el item activo, está en la ruta
    if (itemId === activeItemId) return true

    // Si activeItemId es descendiente de itemId, está en la ruta
    return activeItemId.startsWith(itemId + '.')
  }

  // Construir jerarquía desde array plano
  const buildHierarchy = (items: BudgetItem[]): BudgetItem[] => {
    const hierarchy: BudgetItem[] = []
    const itemMap = new Map<string, BudgetItem>()

    // Crear copias con children array
    items.forEach(item => {
      const itemWithChildren: BudgetItem = { ...item, children: [] }
      itemMap.set(item.id, itemWithChildren)
    })

    // Construir jerarquía
    items.forEach(item => {
      const idParts = item.id.split('.')
      const itemWithChildren = itemMap.get(item.id)!

      if (idParts.length === 1) {
        // Es un chapter (raíz)
        hierarchy.push(itemWithChildren)
      } else {
        // Buscar el padre
        const parentId = idParts.slice(0, -1).join('.')
        const parent = itemMap.get(parentId)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(itemWithChildren)
        }
      }
    })

    return hierarchy
  }

  const renderItem = (item: BudgetItem, depth: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isItem = item.level === 'item'
    const isActive = item.id === activeItemId
    const shouldBeExpanded = isInActivePath(item.id)

    const getLevelStyles = () => {
      switch (item.level) {
        case 'chapter':
          return {
            backgroundColor: secondaryColor,
            color: 'white',
            borderColor: secondaryColor,
          }
        case 'subchapter':
          return {
            backgroundColor: primaryColor,
            color: 'white',
            borderColor: primaryColor,
            opacity: 0.9,
          }
        case 'section':
          return {
            backgroundColor: 'white',
            color: secondaryColor,
            borderColor: secondaryColor,
          }
        case 'item':
          return {
            backgroundColor: '#f3f4f6',
            color: '#111827',
            borderColor: '#d1d5db',
          }
        default:
          return {
            backgroundColor: '#fafafa',
            color: '#374151',
            borderColor: '#e5e7eb',
          }
      }
    }

    const getPaddingLeft = () => {
      switch (item.level) {
        case 'chapter': return 0
        case 'subchapter': return 16
        case 'section': return 32
        case 'item': return 48
        default: return 0
      }
    }

    if (hasChildren) {
      const styles = getLevelStyles()

      const handleContainerClick = (e: React.MouseEvent) => {
        e.preventDefault()

        // Si está en la ruta activa (expandido), cerrarlo significa ir al siguiente
        if (shouldBeExpanded) {
          // Ir a la siguiente partida
          navigateToItem('next', activeItemId || '')
        } else {
          // Si está cerrado, abrirlo significa ir a su primera partida
          navigateToItem('firstInContainer', item.id)
        }
      }

      return (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger
            className="hover:no-underline p-0 [&>svg]:hidden"
            onClick={handleContainerClick}
          >
            <div
              className="flex items-center p-0 border transition-all hover:brightness-95 w-full cursor-pointer"
              style={{
                marginLeft: `${depth * 2}px`,
                ...styles,
              }}
            >
              {/* Chevron indicator */}
              <div className="w-4 mr-2 flex justify-center">
                {shouldBeExpanded ? (
                  <span className="text-xs">▼</span>
                ) : (
                  <span className="text-xs">▶</span>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 flex items-center justify-between pr-2">
                <span className="font-medium">{item.name}</span>
                <span className="font-mono text-sm">
                  {formatCurrency(parseSpanishNumber(item.amount || '0'))}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-0 m-0">
            <Accordion type="multiple" value={shouldBeExpanded ? item.children?.filter(c => isInActivePath(c.id)).map(c => c.id) : []}>
              {item.children?.map(child => renderItem(child, depth + 1))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      )
    }

    // Render item level (partida)
    const styles = getLevelStyles()

    const handleItemClick = () => {
      // Si está activa, cerrarla significa ir a la siguiente
      if (isActive) {
        navigateToItem('next', item.id)
      } else {
        // Si está cerrada, abrirla
        navigateToItem('specific', item.id)
      }
    }

    return (
      <div key={item.id} className="mb-1">
        {/* Línea 1: Nombre + Importe con chevron */}
        <div
          className="flex items-center p-0 border transition-all hover:brightness-95 cursor-pointer"
          style={{
            marginLeft: `${depth * 2}px`,
            ...styles,
          }}
          onClick={handleItemClick}
        >
          {/* Chevron indicator */}
          <div className="w-4 mr-2 flex justify-center">
            {isActive ? (
              <span className="text-xs">▼</span>
            ) : (
              <span className="text-xs">▶</span>
            )}
          </div>

          {/* Contenido línea 1 */}
          <div className="flex-1 flex items-center justify-between pr-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.name}</span>

              {/* Info button inline */}
              {item.description && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      className="p-1 rounded-full hover:bg-black/10 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Descripción: {item.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-gray-600">{item.description || 'Sin descripción disponible'}</p>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Importe de la partida */}
            <span className="font-mono text-sm">
              {formatCurrency(parseSpanishNumber(item.amount || '0'))}
            </span>
          </div>
        </div>

        {/* Línea 2: Controls - SOLO SI ES LA PARTIDA ACTIVA */}
        {isActive && (
          <div
            className="flex items-center justify-between gap-4 text-xs py-2 border border-t-0"
            style={{
              marginLeft: `${depth * 2}px`,
              paddingLeft: '1.5rem',
              paddingRight: '0.5rem',
              backgroundColor: '#f3f4f6',
              borderColor: '#d1d5db',
            }}
          >
            {/* Unidad - alineada con el nombre */}
            <span className="font-mono">
              <strong>Unidad:</strong> {item.unit || 'ud'}
            </span>

            {/* IVA */}
            <span className="font-mono">
              <strong>%IVA:</strong> {formatSpanishNumber(parseSpanishNumber(item.iva_percentage || '0'))}
            </span>

            {/* Cantidad con controles */}
            <div className="flex items-center gap-2">
              <span className="font-mono">
                <strong>Cantidad:</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 bg-gray-200 border-gray-400 hover:bg-gray-300"
                onClick={(e) => {
                  e.stopPropagation()
                  decrementQuantity(item.id, item.quantity || '0,00')
                }}
              >
                <Minus className="h-3 w-3" />
              </Button>

              <Input
                type="text"
                value={item.quantity || '0,00'}
                onChange={(e) => {
                  // Permitir solo números y coma
                  const value = e.target.value.replace(/[^0-9,]/g, '')
                  // Actualizar directamente sin formatear para permitir edición
                  setBudgetData(prevData => {
                    return prevData.map(i => {
                      if (i.id === item.id) {
                        return { ...i, quantity: value }
                      }
                      return i
                    })
                  })
                }}
                onBlur={(e) => {
                  // Formatear al salir del input
                  const numericValue = parseSpanishNumber(e.target.value || '0')
                  const formattedValue = formatSpanishNumber(Math.max(0, numericValue))
                  updateItemQuantity(item.id, formattedValue)
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-20 text-center h-7 bg-white text-black border-gray-300"
              />

              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 bg-gray-200 border-gray-400 hover:bg-gray-300"
                onClick={(e) => {
                  e.stopPropagation()
                  incrementQuantity(item.id, item.quantity || '0,00')
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Precio - 20px más a la izquierda */}
            <span className="font-mono font-bold mr-5">
              <strong>Precio:</strong> {formatCurrency(parseSpanishNumber(item.pvp || '0'))}
            </span>
          </div>
        )}
      </div>
    )
  }

  // Calcular qué accordions deben estar abiertos inicialmente
  const getOpenAccordions = (): string[] => {
    if (!activeItemId) return []
    return getAncestorsPath(activeItemId)
  }

  return (
    <div className="space-y-2">
      {/* Totals Block */}
      <div className="w-full max-w-md ml-auto space-y-0.5">
        <div className="flex justify-between text-sm font-mono bg-white px-2 py-1 rounded text-black">
          <span>Base Imponible</span>
          <span className="font-bold">{formatCurrency(totals.base)}</span>
        </div>

        {totals.ivaGroups.map(group => (
          <div key={group.percentage} className="flex justify-between text-sm font-mono bg-white px-2 py-1 rounded text-black">
            <span>IVA {formatSpanishNumber(group.percentage, 2)}%</span>
            <span className="font-bold">{formatCurrency(group.amount)}</span>
          </div>
        ))}

        {/* Subtotal - Solo mostrar si hay IRPF o RE */}
        {(irpf > 0 || totalRE > 0) && (
          <div className="flex justify-between text-sm font-mono font-bold bg-white px-2 py-1 rounded border-2 text-black" style={{ borderColor: primaryColor }}>
            <span>Subtotal</span>
            <span className="font-bold">{formatCurrency(totals.total)}</span>
          </div>
        )}

        {/* IRPF - Solo mostrar si aplica */}
        {irpf > 0 && (
          <div className="flex justify-between text-sm font-mono bg-white px-2 py-1 rounded text-black items-center">
            <div className="flex items-center gap-2">
              <span>IRPF {formatSpanishNumber(irpfPercentage, 2)}%</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-gray-500 hover:text-gray-700">
                    <Info className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>IRPF - Retención</DialogTitle>
                    <DialogDescription>
                      El IRPF (Impuesto sobre la Renta de las Personas Físicas) se aplica automáticamente
                      cuando el emisor es autónomo y el cliente es empresa o autónomo.
                      Este importe se retiene del total a pagar.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
            <span className="font-bold">-{formatCurrency(irpf)}</span>
          </div>
        )}

        {/* Recargo de Equivalencia - Solo mostrar si aplica */}
        {totalRE > 0 && Object.keys(reByIVA).length > 0 && (
          <>
            {Object.entries(reByIVA).map(([iva, amount]) => {
              const ivaNum = parseFloat(iva)
              return (
                <div key={iva} className="flex justify-between text-sm font-mono bg-white px-2 py-1 rounded text-black">
                  <span>RE {formatSpanishNumber(ivaNum, 2)}%</span>
                  <span className="font-bold">{formatCurrency(amount)}</span>
                </div>
              )
            })}
          </>
        )}

        {/* Total Presupuesto - Mostrar siempre */}
        {(irpf > 0 || totalRE > 0) ? (
          <div className="flex justify-between text-lg font-mono font-bold bg-white px-2 py-1 rounded border-2" style={{ borderColor: primaryColor, color: primaryColor }}>
            <span className="font-bold">Total Presupuesto</span>
            <span className="font-bold">{formatCurrency(totals.total - irpf + totalRE)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-lg font-mono font-bold bg-white px-2 py-1 rounded border-2" style={{ borderColor: primaryColor, color: primaryColor }}>
            <span className="font-bold">Total Presupuesto</span>
            <span className="font-bold">{formatCurrency(totals.total)}</span>
          </div>
        )}
      </div>

      {/* Hierarchical Form */}
      <div>
        <Accordion type="multiple" value={getOpenAccordions()}>
          {buildHierarchy(budgetData).map(item => renderItem(item))}
        </Accordion>
      </div>
    </div>
  )
}
