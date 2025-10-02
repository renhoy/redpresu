'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@/lib/supabase/server'
import { Budget } from '@/lib/types/database'

interface DashboardStats {
  countsByStatus: Record<string, number>
  totalsByStatus: Record<string, string>
  monthCount: number
  conversionRate: number
  recentBudgets: Budget[]
  expiringBudgets: Budget[]
  totalValue: string
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'año'

/**
 * Obtener estadísticas del dashboard
 */
export async function getDashboardStats(periodo: Periodo = 'mes'): Promise<DashboardStats | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[getDashboardStats] Error de autenticación:', authError)
      return null
    }

    // Obtener empresa_id y rol del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('empresa_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('[getDashboardStats] Error obteniendo usuario:', userError)
      return null
    }

    // Calcular fecha de inicio según período
    const now = new Date()
    let startDate = new Date()

    switch (periodo) {
      case 'hoy':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'semana':
        startDate.setDate(now.getDate() - 7)
        break
      case 'mes':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'año':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Construir query base según rol
    let query = supabase
      .from('budgets')
      .select('*, tariffs(title), users(name)')
      .eq('empresa_id', userData.empresa_id)

    // Vendedor: solo sus presupuestos
    if (userData.role === 'vendedor') {
      query = query.eq('user_id', user.id)
    }

    // Admin/Superadmin: todos de la empresa
    // (ya filtrado por empresa_id arriba)

    const { data: budgets, error: budgetsError } = await query

    if (budgetsError) {
      console.error('[getDashboardStats] Error obteniendo presupuestos:', budgetsError)
      return null
    }

    if (!budgets) {
      return {
        countsByStatus: {},
        totalsByStatus: {},
        monthCount: 0,
        conversionRate: 0,
        recentBudgets: [],
        expiringBudgets: [],
        totalValue: '€0,00'
      }
    }

    // Filtrar por período
    const budgetsInPeriod = budgets.filter(b => {
      const createdAt = new Date(b.created_at)
      return createdAt >= startDate
    })

    // Calcular estadísticas por estado
    const countsByStatus: Record<string, number> = {}
    const totalsByStatus: Record<string, number> = {}

    budgetsInPeriod.forEach(budget => {
      const status = budget.status
      countsByStatus[status] = (countsByStatus[status] || 0) + 1
      totalsByStatus[status] = (totalsByStatus[status] || 0) + (budget.total || 0)
    })

    // Formatear totales a string con formato español
    const totalsByStatusFormatted: Record<string, string> = {}
    Object.entries(totalsByStatus).forEach(([status, total]) => {
      totalsByStatusFormatted[status] = formatCurrency(total)
    })

    // Valor total
    const totalValue = budgetsInPeriod.reduce((sum, b) => sum + (b.total || 0), 0)

    // Presupuestos del mes actual
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)
    const monthCount = budgets.filter(b => {
      const createdAt = new Date(b.created_at)
      return createdAt >= currentMonth
    }).length

    // Tasa de conversión: (aprobados / enviados) × 100
    const enviadosCount = budgetsInPeriod.filter(b => b.status === 'enviado').length
    const aprobadosCount = budgetsInPeriod.filter(b => b.status === 'aprobado').length
    const conversionRate = enviadosCount > 0 ? (aprobadosCount / enviadosCount) * 100 : 0

    // Últimos 5 presupuestos
    const recentBudgets = [...budgets]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5) as Budget[]

    // Próximos a caducar (< 7 días restantes)
    const expiringBudgets = budgets.filter(b => {
      if (!b.end_date) return false

      const endDate = new Date(b.end_date)
      const today = new Date()
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      return daysRemaining > 0 && daysRemaining < 7 && b.status !== 'aprobado' && b.status !== 'rechazado'
    }).sort((a, b) => {
      const daysA = Math.ceil((new Date(a.end_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const daysB = Math.ceil((new Date(b.end_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysA - daysB
    }) as Budget[]

    return {
      countsByStatus,
      totalsByStatus: totalsByStatusFormatted,
      monthCount,
      conversionRate: Math.round(conversionRate * 10) / 10,
      recentBudgets,
      expiringBudgets,
      totalValue: formatCurrency(totalValue)
    }

  } catch (error) {
    console.error('[getDashboardStats] Error crítico:', error)
    return null
  }
}

/**
 * Formatear número a moneda española
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}
