"use client"

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Info, Minus, Plus } from 'lucide-react'
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

export function BudgetHierarchyForm({ tariffData, onBudgetDataChange }: BudgetHierarchyFormProps) {
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
          const quantity = parseNumber(item.quantity)
          const pvp = parseNumber(item.pvp)
          const ivaPercentage = parseNumber(item.iva_percentage)

          if (quantity > 0) {
            const itemTotal = quantity * pvp
            totalAmount += itemTotal

            // Calculate IVA amount using the formula: iva_amount = amount_item × (iva_% / (100 + iva_%))
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
    const updateData = (items: BudgetItem[]): BudgetItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          const quantity = parseNumber(newQuantity)
          const pvp = parseNumber(item.pvp || '0')
          const amount = quantity * pvp

          return {
            ...item,
            quantity: newQuantity,
            amount: formatNumberES(amount)
          }
        }

        if (item.children) {
          const updatedChildren = updateData(item.children)
          // Recalculate parent amount as sum of children
          const childrenTotal = updatedChildren
            .filter(child => child.amount)
            .reduce((sum, child) => sum + parseNumber(child.amount || '0'), 0)

          return {
            ...item,
            children: updatedChildren,
            amount: formatNumberES(childrenTotal)
          }
        }

        return item
      })
    }

    setBudgetData(updateData(budgetData))
  }

  const incrementQuantity = (itemId: string, currentQuantity: string) => {
    const quantity = parseNumber(currentQuantity)
    const newQuantity = formatNumberES(quantity + 1)
    updateItemQuantity(itemId, newQuantity)
  }

  const decrementQuantity = (itemId: string, currentQuantity: string) => {
    const quantity = parseNumber(currentQuantity)
    const newQuantity = Math.max(0, quantity - 1)
    updateItemQuantity(itemId, formatNumberES(newQuantity))
  }

  const handleQuantityChange = (itemId: string, value: string) => {
    // Allow typing, but validate on blur
    const formattedValue = formatNumberES(parseNumber(value))
    updateItemQuantity(itemId, formattedValue)
  }

  const renderItem = (item: BudgetItem, depth: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isItem = item.level === 'item'

    const getLevelIcon = () => {
      switch (item.level) {
        case 'chapter': return '📁'
        case 'subchapter': return '📂'
        case 'section': return '📄'
        case 'item': return '📝'
        default: return '📋'
      }
    }

    const getLevelStyles = () => {
      const baseClasses = "flex items-center justify-between p-3 border-b"
      switch (item.level) {
        case 'chapter': return `${baseClasses} bg-primary/5 font-semibold text-lg`
        case 'subchapter': return `${baseClasses} bg-secondary/5 font-medium text-base`
        case 'section': return `${baseClasses} bg-muted/5 font-medium text-sm`
        case 'item': return `${baseClasses} bg-background text-sm`
        default: return baseClasses
      }
    }

    if (hasChildren) {
      return (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="hover:no-underline">
            <div className={getLevelStyles()}>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">{getLevelIcon()}</span>
                <span>{item.name}</span>
              </div>
              <div className="text-right font-mono">
                {formatCurrency(item.amount || '0')}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-0">
            <Accordion type="multiple" className="ml-4">
              {item.children?.map(child => renderItem(child, depth + 1))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      )
    }

    // Render item level
    return (
      <div key={item.id} className="border-b">
        {/* Item line 1: Icon, Name, Amount */}
        <div className={getLevelStyles()}>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">{getLevelIcon()}</span>
            <span>{item.name}</span>
          </div>
          <div className="text-right font-mono">
            {formatCurrency(item.amount || '0')}
          </div>
        </div>

        {/* Item line 2: Controls */}
        <div className="flex items-center gap-4 p-3 bg-muted/2">
          {/* Info button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Info className="h-4 w-4" />
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

          {/* Unit info */}
          <span className="text-sm text-muted-foreground">
            Unidad: {item.unit || 'ud'}
          </span>

          {/* IVA info */}
          <span className="text-sm text-muted-foreground">
            %IVA: {formatNumberES(parseNumber(item.iva_percentage || '0'))}
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
              type="number"
              step="0.01"
              min="0"
              value={parseNumber(item.quantity || '0,00')}
              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
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
            PVP: {formatCurrency(item.pvp || '0')}
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
                <span>IVA {formatNumberES(group.percentage)}%</span>
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