'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database.types'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type Tariff = Database['public']['Tables']['tariffs']['Row']

export async function getTariffs(
  empresaId: number,
  filters?: {
    status?: 'Activa' | 'Inactiva' | 'all'
    search?: string
  }
): Promise<Tariff[]> {
  const supabase = createClient()

  let query = supabase
    .from('tariffs')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  // Filtro por estado
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Filtro por búsqueda (título y descripción)
  if (filters?.search && filters.search.trim()) {
    const searchTerm = `%${filters.search.trim()}%`
    query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tariffs:', error)
    throw new Error('Error al obtener las tarifas')
  }

  return data || []
}

export async function toggleTariffStatus(
  tariffId: number,
  currentStatus: 'Activa' | 'Inactiva'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const newStatus = currentStatus === 'Activa' ? 'Inactiva' : 'Activa'

  const { error } = await supabase
    .from('tariffs')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', tariffId)

  if (error) {
    console.error('Error toggling tariff status:', error)
    return {
      success: false,
      error: 'Error al cambiar el estado de la tarifa'
    }
  }

  revalidatePath('/tariffs')
  return { success: true }
}

export async function deleteTariff(
  tariffId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  // Verificar si la tarifa tiene presupuestos asociados
  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select('id')
    .eq('tariff_id', tariffId)
    .limit(1)

  if (budgetError) {
    console.error('Error checking associated budgets:', budgetError)
    return {
      success: false,
      error: 'Error al verificar presupuestos asociados'
    }
  }

  if (budgets && budgets.length > 0) {
    return {
      success: false,
      error: 'No se puede eliminar una tarifa que tiene presupuestos asociados'
    }
  }

  const { error } = await supabase
    .from('tariffs')
    .delete()
    .eq('id', tariffId)

  if (error) {
    console.error('Error deleting tariff:', error)
    return {
      success: false,
      error: 'Error al eliminar la tarifa'
    }
  }

  revalidatePath('/tariffs')
  return { success: true }
}

export async function getTariffById(
  tariffId: number
): Promise<Tariff | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tariffs')
    .select('*')
    .eq('id', tariffId)
    .single()

  if (error) {
    console.error('Error fetching tariff:', error)
    return null
  }

  return data
}