"use client"

import { useState, useEffect } from 'react'
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
  return parseNumber(value.toString(), 'es')
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
  primaryColor?: string
  secondaryColor?: string
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
  primaryColor = '#3b82f6',
  secondaryColor = '#1e40af'
}: BudgetHierarchyFormProps) {
  const [budgetData, setBudgetData] = useState<BudgetItem[]>([])
  const [totals, setTotals] = useState<Totals>({ base: 0, ivaGroups: [], total: 0 })

  // Initialize budget data with quantities set to 0
  useEffect(() => {
    const initializeBudgetData = (items: BudgetItem[]): BudgetItem[] => {
      return items.map(item => ({
        ...item,
        quantity: item.level === 'item' ? '0,00' : undefined,
        amount: '0,00',
        children: item.children ? initializeBudgetData(item.children) : undefined
      }))
    }

    const initialBudgetData = initializeBudgetData(tariffData)
    setBudgetData(initialBudgetData)
  }, [tariffData])

  // Calculate totals whenever budget data changes
  useEffect(() => {
    const newTotals = calculateTotals(budgetData)
    setTotals(newTotals)
    onBudgetDataChange(budgetData)
  }, [budgetData, onBudgetDataChange])

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
      const updateData = (items: BudgetItem[]): BudgetItem[] => {
        const updatedItems = items.map(item => {
          if (item.id === itemId && item.level === 'item') {
            // Parsear usando formato español
            const quantity = parseSpanishNumber(newQuantity)
            const pvp = parseSpanishNumber(item.pvp || '0')
            // Cálculo: amount = quantity × pvp (ambos en formato numérico)
            const amount = quantity * pvp

            return {
              ...item,
              quantity: formatSpanishNumber(quantity),
              amount: formatSpanishNumber(amount)
            }
          }

          if (item.children) {
            const updatedChildren = updateData(item.children)

            // Recalcular importe del padre sumando todos los hijos recursivamente
            const calculateChildrenTotal = (children: BudgetItem[]): number => {
              return children.reduce((sum, child) => {
                if (child.level === 'item') {
                  return sum + parseSpanishNumber(child.amount || '0')
                } else if (child.children) {
                  return sum + calculateChildrenTotal(child.children)
                }
                return sum
              }, 0)
            }

            const childrenTotal = calculateChildrenTotal(updatedChildren)

            return {
              ...item,
              children: updatedChildren,
              amount: formatSpanishNumber(childrenTotal)
            }
          }

          return item
        })

        return updatedItems
      }

      return updateData(prevData)
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

  const renderItem = (item: BudgetItem, depth: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isItem = item.level === 'item'

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

      return (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="hover:no-underline">
            <div
              className="flex items-center justify-between p-3 border transition-all hover:brightness-95 w-full"
              style={{
                paddingLeft: `${getPaddingLeft() + 12}px`,
                ...styles,
              }}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-right font-mono mr-2">
                {formatCurrency(parseSpanishNumber(item.amount || '0'))}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0">
            <Accordion type="multiple">
              {item.children?.map(child => renderItem(child, depth + 1))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      )
    }

    // Render item level
    const styles = getLevelStyles()

    return (
      <div key={item.id} className="mb-1">
        {/* Item line 1: Name, Amount */}
        <div
          className="flex items-center justify-between p-3 border transition-all hover:brightness-95"
          style={{
            paddingLeft: `${getPaddingLeft() + 12}px`,
            ...styles,
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium">{item.name}</span>

            {/* Info button inline */}
            {item.description && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-60 hover:opacity-100">
                    <Info className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{item.name}</DialogTitle>
                    <DialogDescription>
                      {item.description || 'Sin descripción disponible'}
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="text-right font-mono">
            {formatCurrency(parseSpanishNumber(item.amount || '0'))}
          </div>
        </div>

        {/* Item line 2: Controls */}
        <div
          className="flex items-center gap-4 p-3 text-xs"
          style={{
            paddingLeft: `${getPaddingLeft() + 12}px`,
            backgroundColor: '#f9fafb',
            borderLeft: `4px solid ${styles.borderColor}`,
            opacity: 0.9,
          }}
        >
          {/* Unit info */}
          <span className="text-sm text-muted-foreground">
            Unidad: {item.unit || 'ud'}
          </span>

          {/* IVA info */}
          <span className="text-sm text-muted-foreground">
            %IVA: {formatSpanishNumber(parseSpanishNumber(item.iva_percentage || '0'))}
          </span>

          {/* Quantity controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => decrementQuantity(item.id, item.quantity || '0,00')}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <Input
              type="text"
              value={item.quantity || '0,00'}
              onChange={(e) => {
                // Permitir solo números y coma
                const value = e.target.value.replace(/[^0-9,]/g, '')
                // Actualizar directamente sin formatear para permitir edición
                setBudgetData(prevData => {
                  const updateData = (items: BudgetItem[]): BudgetItem[] => {
                    return items.map(i => {
                      if (i.id === item.id) {
                        return { ...i, quantity: value }
                      }
                      if (i.children) {
                        return { ...i, children: updateData(i.children) }
                      }
                      return i
                    })
                  }
                  return updateData(prevData)
                })
              }}
              onBlur={(e) => {
                // Formatear al salir del input
                const numericValue = parseSpanishNumber(e.target.value || '0')
                const formattedValue = formatSpanishNumber(Math.max(0, numericValue))
                updateItemQuantity(item.id, formattedValue)
              }}
              className="w-20 text-center h-8"
            />

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => incrementQuantity(item.id, item.quantity || '0,00')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* PVP info */}
          <span className="text-sm text-muted-foreground">
            PVP: {formatCurrency(parseSpanishNumber(item.pvp || '0'))}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Totals Block */}
      <Card className="w-full max-w-md ml-auto">
        <CardContent className="p-4">
          <div className="space-y-2 text-right font-mono">
            <div className="flex justify-between">
              <span>Base</span>
              <span>{formatCurrency(totals.base)}</span>
            </div>

            {totals.ivaGroups.map(group => (
              <div key={group.percentage} className="flex justify-between">
                <span>IVA {formatSpanishNumber(group.percentage)}%</span>
                <span>{formatCurrency(group.amount)}</span>
              </div>
            ))}

            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL PRESUPUESTO</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical Form */}
      <Card>
        <CardContent className="p-0">
          <Accordion type="multiple" defaultValue={budgetData.map(item => item.id)}>
            {budgetData.map(item => renderItem(item))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}