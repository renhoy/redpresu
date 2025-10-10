'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Receipt,
  PlusCircle,
  TrendingUp,
  Calendar,
  Euro,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { getDashboardStats } from '@/app/actions/dashboard'
import { Budget } from '@/lib/types/database'
import { formatCurrency } from '@/lib/helpers/format'

interface DashboardClientProps {
  initialStats: {
    countsByStatus: Record<string, number>
    totalsByStatus: Record<string, string>
    monthCount: number
    conversionRate: number
    recentBudgets: Budget[]
    expiringBudgets: Budget[]
    totalValue: string
  }
  userRole: string
}

const statusColors = {
  borrador: 'bg-black text-neutral-200',
  pendiente: 'bg-orange-100 text-yellow-800',
  enviado: 'bg-slate-100 text-cyan-600',
  aprobado: 'bg-emerald-50 text-green-600',
  rechazado: 'bg-pink-100 text-rose-600',
  caducado: 'bg-neutral-200 text-black'
}

const statusIcons = {
  borrador: AlertCircle,
  pendiente: Clock,
  enviado: FileText,
  aprobado: CheckCircle,
  rechazado: XCircle,
  caducado: AlertCircle
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'año'

export function DashboardClient({ initialStats, userRole }: DashboardClientProps) {
  const [stats, setStats] = useState(initialStats)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [loading, setLoading] = useState(false)

  const handlePeriodoChange = async (newPeriodo: Periodo) => {
    setPeriodo(newPeriodo)
    setLoading(true)

    const newStats = await getDashboardStats(newPeriodo)
    if (newStats) {
      setStats(newStats)
    }

    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header con filtro de período */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-lime-700">Dashboard</h1>
            <p className="text-lime-600 mt-1">Resumen y estadísticas de presupuestos</p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Select value={periodo} onValueChange={(value) => handlePeriodoChange(value as Periodo)}>
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="año">Este año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      {/* Estadísticas principales - Grid 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total presupuestos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Presupuestos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <div className="text-xl font-bold">
                {Object.values(stats.countsByStatus).reduce((sum, count) => sum + count, 0)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valor total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="text-xl font-bold">{stats.totalValue}</div>
            )}
          </CardContent>
        </Card>

        {/* Presupuestos del mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mes Actual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <div className="text-xl font-bold">{stats.monthCount}</div>
            )}
          </CardContent>
        </Card>

        {/* Tasa de conversión */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <div className="text-xl font-bold">{stats.conversionRate}%</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rápidos</CardTitle>
          <CardDescription>Acciones frecuentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/tariffs/create">
              <Button className="w-full h-16 flex items-center gap-2 justify-center" variant="outline">
                <PlusCircle className="w-5 h-5" />
                <span>Crear Tarifa</span>
              </Button>
            </Link>

            <Link href="/tariffs">
              <Button className="w-full h-16 flex items-center gap-2 justify-center" variant="outline">
                <FileText className="w-5 h-5" />
                <span>Ver Tarifas</span>
              </Button>
            </Link>

            <Link href="/budgets">
              <Button className="w-full h-16 flex items-center gap-2 justify-center" variant="outline">
                <Receipt className="w-5 h-5" />
                <span>Ver Presupuestos</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Listados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos presupuestos */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos 5 Presupuestos</CardTitle>
            <CardDescription>Presupuestos creados recientemente</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats.recentBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay presupuestos recientes
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentBudgets.map((budget) => (
                  <Link
                    key={budget.id}
                    href={`/budgets/create?tariff_id=${budget.tariff_id}&budget_id=${budget.id}`}
                    className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{budget.client_name}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(budget.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={statusColors[budget.status as keyof typeof statusColors]}>
                          {budget.status}
                        </Badge>
                        <span className="text-sm font-medium">{formatCurrency(budget.total || 0)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos a caducar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Próximos a Caducar
            </CardTitle>
            <CardDescription>Menos de 7 días restantes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats.expiringBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay presupuestos próximos a caducar
              </p>
            ) : (
              <div className="space-y-3">
                {stats.expiringBudgets.map((budget) => {
                  const daysRemaining = Math.ceil(
                    (new Date(budget.end_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )

                  return (
                    <Link
                      key={budget.id}
                      href={`/budgets/create?tariff_id=${budget.tariff_id}&budget_id=${budget.id}`}
                      className="block p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{budget.client_name}</p>
                          <p className="text-sm text-orange-700">
                            {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={statusColors[budget.status as keyof typeof statusColors]}>
                            {budget.status}
                          </Badge>
                          <span className="text-sm font-medium">{formatCurrency(budget.total || 0)}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
