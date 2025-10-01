"use client"

import { useState } from 'react'
import { Budget } from '@/lib/types/database'
import { formatCurrency } from '@/lib/helpers/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Pencil, Trash2, FileStack } from 'lucide-react'
import { deleteBudget, updateBudgetStatus } from '@/app/actions/budgets'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface BudgetsTableProps {
  budgets: Budget[]
}

const statusColors = {
  borrador: 'bg-black text-neutral-200',
  pendiente: 'bg-orange-100 text-yellow-800',
  enviado: 'bg-slate-100 text-cyan-600',
  aprobado: 'bg-emerald-50 text-green-600',
  rechazado: 'bg-pink-100 text-rose-600',
  caducado: 'bg-neutral-200 text-black'
}

export function BudgetsTable({ budgets }: BudgetsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Filtrado local
  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = !search ||
      budget.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (budget.client_nif_nie && budget.client_nif_nie.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || budget.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleDelete = async (budgetId: string, clientName: string) => {
    if (!confirm(`¿Eliminar presupuesto de ${clientName}?`)) return

    const result = await deleteBudget(budgetId)

    if (result.success) {
      toast.success('Presupuesto eliminado')
      router.refresh()
    } else {
      toast.error(result.error || 'Error al eliminar')
    }
  }

  const getDaysRemaining = (startDate: string | null, validityDays: number | null) => {
    if (!startDate || !validityDays) return null

    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + validityDays)

    const today = new Date()
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return {
      current: Math.max(0, validityDays - daysLeft),
      total: validityDays,
      remaining: Math.max(0, daysLeft),
      isExpiring: daysLeft < 7 && daysLeft > 0
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getUserName = (budget: Budget) => {
    if (budget.users && typeof budget.users === 'object' && 'name' in budget.users) {
      return (budget.users as { name: string }).name
    }
    return 'N/A'
  }

  // Transiciones válidas de estado
  const getValidTransitions = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      'borrador': ['pendiente', 'enviado'],
      'pendiente': ['borrador', 'enviado'],
      'enviado': ['pendiente', 'aprobado', 'rechazado'],
      'aprobado': ['borrador'],
      'rechazado': ['borrador'],
      'caducado': ['borrador']
    }
    return transitions[currentStatus] || []
  }

  const handleStatusChange = async (budgetId: string, currentStatus: string, newStatus: string, clientName: string) => {
    // Confirmar cambios críticos
    const criticalTransitions = ['aprobado', 'rechazado']
    if (criticalTransitions.includes(newStatus)) {
      const action = newStatus === 'aprobado' ? 'aprobar' : 'rechazar'
      if (!confirm(`¿Estás seguro de ${action} el presupuesto de ${clientName}?`)) {
        return
      }
    }

    const result = await updateBudgetStatus(budgetId, newStatus)

    if (result.success) {
      toast.success(`Estado actualizado a ${newStatus}`)
      router.refresh()
    } else {
      toast.error(result.error || 'Error al actualizar estado')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-4">
        <Input
          placeholder="Buscar por cliente o NIF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="max-w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
            <SelectItem value="caducado">Caducado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium">Cliente</th>
                <th className="text-left p-4 font-medium">Tarifa</th>
                <th className="text-right p-4 font-medium">Total</th>
                <th className="text-left p-4 font-medium">Estado</th>
                <th className="text-left p-4 font-medium">Usuario</th>
                <th className="text-center p-4 font-medium">PDF</th>
                <th className="text-right p-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredBudgets.map(budget => {
                const days = getDaysRemaining(budget.start_date, budget.validity_days)
                const tariffTitle = budget.tariffs && typeof budget.tariffs === 'object' && 'title' in budget.tariffs
                  ? (budget.tariffs as { title: string }).title
                  : 'N/A'

                return (
                  <tr key={budget.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {budget.client_name} ({budget.client_nif_nie || 'N/A'})
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {budget.client_type}
                          </Badge>
                        </div>
                        {days && budget.start_date && budget.end_date && (
                          <div className={`text-xs ${days.isExpiring ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                            {formatDate(budget.start_date)} - {formatDate(budget.end_date)} ({days.remaining} de {days.total} días restantes)
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-sm truncate max-w-[200px] block">
                        {tariffTitle}
                      </span>
                    </td>

                    <td className="p-4 text-right font-mono">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {formatCurrency(budget.total || 0)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-sm">
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Base Imponible:</span>
                                <span className="font-medium">{formatCurrency(budget.base || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">IVA:</span>
                                <span className="font-medium">{formatCurrency(budget.iva || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-4 border-t pt-1">
                                <span className="font-semibold">Total:</span>
                                <span className="font-semibold">{formatCurrency(budget.total || 0)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>

                    <td className="p-4">
                      <Select
                        value={budget.status}
                        onValueChange={(newStatus) => handleStatusChange(budget.id, budget.status, newStatus, budget.client_name)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue>
                            <Badge className={statusColors[budget.status as keyof typeof statusColors]}>
                              {budget.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={budget.status}>
                            <Badge className={statusColors[budget.status as keyof typeof statusColors]}>
                              {budget.status}
                            </Badge>
                          </SelectItem>
                          {getValidTransitions(budget.status).map((status) => (
                            <SelectItem key={status} value={status}>
                              <Badge className={statusColors[status as keyof typeof statusColors]}>
                                {status}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="p-4 text-sm text-muted-foreground">
                      {getUserName(budget)}
                    </td>

                    <td className="p-4 text-center">
                      {budget.pdf_url ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(budget.pdf_url!, '_blank')}
                          title="Descargar PDF"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <FileStack className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin PDF</span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/budgets/create?tariff_id=${budget.tariff_id}&budget_id=${budget.id}`)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(budget.id, budget.client_name)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredBudgets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No se encontraron presupuestos
          </div>
        )}
      </div>
    </div>
  )
}
