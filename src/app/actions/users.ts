/**
 * Server Actions para gestión de usuarios (CRUD)
 * Solo accesible por admin/superadmin
 */

'use server'

import { supabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'
import { getServerUser } from '@/lib/auth/server'

// ============================================
// TIPOS
// ============================================

export interface User {
  id: string
  email: string
  nombre: string | null
  apellidos: string | null
  role: 'vendedor' | 'admin' | 'superadmin'
  empresa_id: number
  status: 'active' | 'inactive' | 'pending'
  invited_by: string | null
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UserWithInviter extends User {
  inviter_name?: string
  inviter_email?: string
}

// ============================================
// SCHEMAS DE VALIDACIÓN
// ============================================

const createUserSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  nombre: z.string().min(1, 'El nombre es requerido').max(100).trim(),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').max(100).trim(),
  role: z.enum(['vendedor', 'admin', 'superadmin'], {
    required_error: 'El rol es requerido'
  }),
  empresa_id: z.number().int().positive()
})

const updateUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100).trim().optional(),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').max(100).trim().optional(),
  role: z.enum(['vendedor', 'admin', 'superadmin']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional()
})

export type CreateUserData = z.infer<typeof createUserSchema>
export type UpdateUserData = z.infer<typeof updateUserSchema>

// ============================================
// HELPERS
// ============================================

/**
 * Verifica si el usuario actual es admin o superadmin
 */
async function checkAdminPermission(): Promise<{ allowed: boolean; currentUser: { id: string; role: string; empresa_id: number } | null }> {
  const user = await getServerUser()

  if (!user || !['admin', 'superadmin'].includes(user.role)) {
    return { allowed: false, currentUser: null }
  }

  return {
    allowed: true,
    currentUser: {
      id: user.id,
      role: user.role,
      empresa_id: user.empresa_id
    }
  }
}

/**
 * Genera password temporal segura
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// ============================================
// ACTIONS
// ============================================

/**
 * Obtener lista de usuarios de la empresa
 */
export async function getUsers() {
  const { allowed, currentUser } = await checkAdminPermission()

  if (!allowed) {
    return {
      success: false,
      error: 'No tienes permisos para ver usuarios'
    }
  }

  // Obtener usuarios de la misma empresa con información del invitador
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      inviter:invited_by (
        nombre,
        apellidos,
        email
      )
    `)
    .eq('empresa_id', currentUser.empresa_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return {
      success: false,
      error: 'Error al obtener usuarios'
    }
  }

  // Formatear datos
  const formattedUsers: UserWithInviter[] = users.map(user => ({
    ...user,
    inviter_name: user.inviter ? `${user.inviter.nombre} ${user.inviter.apellidos}` : undefined,
    inviter_email: user.inviter?.email
  }))

  return {
    success: true,
    data: formattedUsers
  }
}

/**
 * Obtener un usuario por ID
 */
export async function getUserById(userId: string) {
  const { allowed, currentUser } = await checkAdminPermission()

  if (!allowed) {
    return {
      success: false,
      error: 'No tienes permisos para ver este usuario'
    }
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      inviter:invited_by (
        nombre,
        apellidos,
        email
      )
    `)
    .eq('id', userId)
    .eq('empresa_id', currentUser.empresa_id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return {
      success: false,
      error: 'Usuario no encontrado'
    }
  }

  const formattedUser: UserWithInviter = {
    ...user,
    inviter_name: user.inviter ? `${user.inviter.nombre} ${user.inviter.apellidos}` : undefined,
    inviter_email: user.inviter?.email
  }

  return {
    success: true,
    data: formattedUser
  }
}

/**
 * Crear nuevo usuario (admin invita)
 */
export async function createUser(data: CreateUserData) {
  // Validar permisos
  const { allowed, currentUser } = await checkAdminPermission()

  if (!allowed) {
    return {
      success: false,
      error: 'No tienes permisos para crear usuarios'
    }
  }

  // Validar que sea de la misma empresa
  if (data.empresa_id !== currentUser.empresa_id) {
    return {
      success: false,
      error: 'No puedes crear usuarios de otra empresa'
    }
  }

  // Validar schema
  try {
    createUserSchema.parse(data)
  } catch (error) {
    const zodError = error as z.ZodError
    return {
      success: false,
      error: zodError.errors?.[0]?.message || 'Datos inválidos'
    }
  }

  // Generar password temporal
  const temporaryPassword = generateTemporaryPassword()

  try {
    // 1. Crear usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: temporaryPassword,
      email_confirm: true // Auto-confirmar email
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return {
        success: false,
        error: authError.message === 'User already registered'
          ? 'Este email ya está registrado'
          : 'Error al crear usuario en sistema de autenticación'
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Error al crear usuario'
      }
    }

    // 2. Crear registro en public.users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        nombre: data.nombre,
        apellidos: data.apellidos,
        role: data.role,
        empresa_id: data.empresa_id,
        status: 'pending', // Usuario debe cambiar password en primer login
        invited_by: currentUser.id
      })
      .select()
      .single()

    if (userError) {
      // Rollback: eliminar usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      console.error('Error creating user record:', userError)
      return {
        success: false,
        error: 'Error al crear registro de usuario'
      }
    }

    // TODO: Enviar email con password temporal
    // Por ahora retornamos el password para que el admin lo copie

    return {
      success: true,
      data: userData,
      temporaryPassword // Retornar para mostrar al admin
    }

  } catch (error) {
    console.error('Unexpected error creating user:', error)
    return {
      success: false,
      error: 'Error inesperado al crear usuario'
    }
  }
}

/**
 * Actualizar usuario existente
 */
export async function updateUser(userId: string, data: UpdateUserData) {
  // Validar permisos
  const { allowed, currentUser } = await checkAdminPermission()

  if (!allowed) {
    return {
      success: false,
      error: 'No tienes permisos para actualizar usuarios'
    }
  }

  // Validar schema
  try {
    updateUserSchema.parse(data)
  } catch (error) {
    const zodError = error as z.ZodError
    return {
      success: false,
      error: zodError.errors?.[0]?.message || 'Datos inválidos'
    }
  }

  // Verificar que el usuario pertenece a la misma empresa
  const { data: targetUser, error: checkError } = await supabaseAdmin
    .from('users')
    .select('empresa_id, role')
    .eq('id', userId)
    .single()

  if (checkError || !targetUser) {
    return {
      success: false,
      error: 'Usuario no encontrado'
    }
  }

  if (targetUser.empresa_id !== currentUser.empresa_id) {
    return {
      success: false,
      error: 'No puedes actualizar usuarios de otra empresa'
    }
  }

  // Prevenir que admin se quite sus propios permisos
  if (userId === currentUser.id && data.role && data.role !== currentUser.role) {
    return {
      success: false,
      error: 'No puedes cambiar tu propio rol'
    }
  }

  // Actualizar usuario
  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating user:', updateError)
    return {
      success: false,
      error: 'Error al actualizar usuario'
    }
  }

  return {
    success: true,
    data: updatedUser
  }
}

/**
 * Cambiar status de usuario (soft delete)
 */
export async function toggleUserStatus(userId: string, newStatus: 'active' | 'inactive') {
  return updateUser(userId, { status: newStatus })
}

/**
 * Eliminar usuario (físicamente - solo superadmin)
 */
export async function deleteUser(userId: string) {
  const { allowed, currentUser } = await checkAdminPermission()

  if (!allowed || currentUser.role !== 'superadmin') {
    return {
      success: false,
      error: 'Solo superadmin puede eliminar usuarios permanentemente'
    }
  }

  // No permitir auto-eliminación
  if (userId === currentUser.id) {
    return {
      success: false,
      error: 'No puedes eliminarte a ti mismo'
    }
  }

  // Verificar que el usuario pertenece a la misma empresa
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('empresa_id')
    .eq('id', userId)
    .single()

  if (!targetUser || targetUser.empresa_id !== currentUser.empresa_id) {
    return {
      success: false,
      error: 'Usuario no encontrado'
    }
  }

  // Eliminar de auth.users (cascada eliminará de public.users)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (authError) {
    console.error('Error deleting user:', authError)
    return {
      success: false,
      error: 'Error al eliminar usuario'
    }
  }

  return {
    success: true
  }
}
