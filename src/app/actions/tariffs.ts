'use server'

import { supabaseAdmin } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database.types'
import { revalidatePath } from 'next/cache'
import { CSV2JSONConverter } from '@/lib/validators'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

type Tariff = Database['public']['Tables']['tariffs']['Row']

export interface TariffFormData {
  title: string
  description?: string
  validity: number
  status: 'Activa' | 'Inactiva'
  logo_url: string
  name: string
  nif: string
  address: string
  contact: string
  template: string
  primary_color: string
  secondary_color: string
  summary_note: string
  conditions_note: string
  legal_note: string
  json_tariff_data?: unknown
}

export async function getTariffs(
  empresaId: number,
  filters?: {
    status?: 'Activa' | 'Inactiva' | 'all'
    search?: string
  }
): Promise<Tariff[]> {
  const supabase = supabaseAdmin

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
  const supabase = supabaseAdmin

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
  const supabase = supabaseAdmin

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
  const supabase = supabaseAdmin

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

export async function createTariff(data: TariffFormData): Promise<{
  success: boolean
  tariffId?: number
  error?: string
}> {
  const supabase = supabaseAdmin

  // Obtener empresa_id del usuario actual
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Usuario no autenticado' }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.empresa_id) {
    return { success: false, error: 'No se pudo obtener la empresa del usuario' }
  }

  const { error } = await supabase
    .from('tariffs')
    .insert({
      empresa_id: userData.empresa_id,
      title: data.title,
      description: data.description,
      validity: data.validity,
      status: data.status,
      logo_url: data.logo_url,
      name: data.name,
      nif: data.nif,
      address: data.address,
      contact: data.contact,
      template: data.template,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      summary_note: data.summary_note,
      conditions_note: data.conditions_note,
      legal_note: data.legal_note,
      json_tariff_data: data.json_tariff_data,
      validity_start: new Date().toISOString(),
      validity_end: new Date(Date.now() + data.validity * 24 * 60 * 60 * 1000).toISOString()
    })

  if (error) {
    console.error('Error creating tariff:', error)
    return { success: false, error: 'Error al crear la tarifa' }
  }

  revalidatePath('/tariffs')
  return { success: true }
}

export async function updateTariff(id: number, data: TariffFormData): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = supabaseAdmin

  const { error } = await supabase
    .from('tariffs')
    .update({
      title: data.title,
      description: data.description,
      validity: data.validity,
      status: data.status,
      logo_url: data.logo_url,
      name: data.name,
      nif: data.nif,
      address: data.address,
      contact: data.contact,
      template: data.template,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      summary_note: data.summary_note,
      conditions_note: data.conditions_note,
      legal_note: data.legal_note,
      json_tariff_data: data.json_tariff_data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating tariff:', error)
    return { success: false, error: 'Error al actualizar la tarifa' }
  }

  revalidatePath('/tariffs')
  revalidatePath(`/tariffs/edit/${id}`)
  return { success: true }
}

export async function uploadLogo(formData: FormData): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No se seleccionó ningún archivo' }
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Formato de archivo no válido. Use JPG, PNG o SVG' }
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'El archivo es demasiado grande. Máximo 2MB' }
    }

    // Generar nombre único
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const publicPath = join(process.cwd(), 'public', 'logos')
    const filePath = join(publicPath, fileName)

    // Crear directorio si no existe
    await mkdir(publicPath, { recursive: true })

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const publicUrl = `/logos/${fileName}`
    return { success: true, url: publicUrl }

  } catch (error) {
    console.error('Error uploading logo:', error)
    return { success: false, error: 'Error al subir el archivo' }
  }
}

export async function processCSV(formData: FormData): Promise<{
  success: boolean
  jsonData?: unknown[]
  errors?: unknown[]
}> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, errors: [{ message: 'No se seleccionó ningún archivo' }] }
    }

    // Validar tipo de archivo
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return { success: false, errors: [{ message: 'El archivo debe ser de tipo CSV' }] }
    }

    // Leer contenido del archivo
    const csvContent = await file.text()

    // Procesar con validador de Common
    const converter = new CSV2JSONConverter()
    const result = await converter.convertCSVToJSON(csvContent)

    if (!result.success) {
      return {
        success: false,
        errors: result.errors || [{ message: 'Error al procesar el CSV' }]
      }
    }

    return {
      success: true,
      jsonData: result.data
    }

  } catch (error) {
    console.error('Error processing CSV:', error)
    return {
      success: false,
      errors: [{ message: 'Error al procesar el archivo CSV' }]
    }
  }
}