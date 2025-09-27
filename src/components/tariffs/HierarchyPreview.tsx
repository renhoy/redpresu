'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/validators'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface BudgetItem {
  level: 'chapter' | 'subchapter' | 'section' | 'item'
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

interface HierarchyPreviewProps {
  data: BudgetItem[]
}

interface HierarchyItemProps {
  item: BudgetItem
  depth: number
}

function HierarchyItem({ item, depth }: HierarchyItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = item.children && item.children.length > 0

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'chapter':
        return {
          bg: 'bg-primary',
          text: 'text-primary-foreground',
          border: 'border-primary'
        }
      case 'subchapter':
        return {
          bg: 'bg-orange-500',
          text: 'text-white',
          border: 'border-orange-500'
        }
      case 'section':
        return {
          bg: 'bg-white',
          text: 'text-primary',
          border: 'border-primary'
        }
      case 'item':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-900',
          border: 'border-gray-300'
        }
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200'
        }
    }
  }

  const styles = getLevelStyles(item.level)

  return (
    <div className="mb-1">
      {/* Header del item */}
      <div
        className={`flex items-center p-3 border cursor-pointer transition-all hover:brightness-95 ${styles.bg} ${styles.text} ${styles.border}`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        {/* Toggle de expansión */}
        <div className="w-4 mr-2 flex justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4" />
          )}
        </div>

        {/* Contenido del header */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>

            {/* Botón de información para items con descripción */}
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
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Línea 2: Información adicional solo para items */}
          {item.level === 'item' && (
            <div className="flex items-center gap-4 text-xs mt-1 opacity-90">
              {item.unit && (
                <span className="font-mono">
                  Unidad: {item.unit}
                </span>
              )}
              {item.iva_percentage && (
                <span className="font-mono">
                  IVA: {item.iva_percentage}%
                </span>
              )}
              {item.pvp && (
                <span className="font-mono font-bold">
                  Precio: {formatCurrency(parseFloat(item.pvp))}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="pl-4">
          {item.children?.map((child, index) => (
            <HierarchyItem
              key={`${child.id}-${index}`}
              item={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function HierarchyPreview({ data }: HierarchyPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay datos para mostrar</p>
      </div>
    )
  }

  // Función para construir jerarquía a partir de datos planos
  const buildHierarchy = (items: unknown[]): BudgetItem[] => {
    const hierarchy: BudgetItem[] = []
    const itemMap = new Map<string, BudgetItem>()

    // Convertir items planos a estructura jerárquica
    items.forEach((item) => {
      const budgetItem: BudgetItem = {
        level: item.level,
        id: item.id,
        name: item.name,
        description: item.description,
        amount: item.amount,
        unit: item.unit,
        quantity: item.quantity,
        iva_percentage: item.iva_percentage,
        pvp: item.pvp,
        children: []
      }

      itemMap.set(item.id, budgetItem)

      // Determinar el padre basado en el ID
      const idParts = item.id.split('.')
      if (idParts.length === 1) {
        // Es un chapter (raíz)
        hierarchy.push(budgetItem)
      } else {
        // Buscar el padre
        const parentId = idParts.slice(0, -1).join('.')
        const parent = itemMap.get(parentId)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(budgetItem)
        }
      }
    })

    return hierarchy
  }

  const hierarchyData = buildHierarchy(data)

  return (
    <div>
      <div className="space-y-1">
        {hierarchyData.map((item, index) => (
          <HierarchyItem
            key={`${item.id}-${index}`}
            item={item}
            depth={0}
          />
        ))}
      </div>

      {/* Estadísticas */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>Total items:</strong> {data.length}
          </p>
          <p>
            <strong>Capítulos:</strong> {data.filter(i => i.level === 'chapter').length}
          </p>
          <p>
            <strong>Subcapítulos:</strong> {data.filter(i => i.level === 'subchapter').length}
          </p>
          <p>
            <strong>Secciones:</strong> {data.filter(i => i.level === 'section').length}
          </p>
          <p>
            <strong>Partidas:</strong> {data.filter(i => i.level === 'item').length}
          </p>
        </div>
      </div>
    </div>
  )
}