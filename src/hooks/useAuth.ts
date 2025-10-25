'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/database'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  empresa_id: number
}

interface UseAuthReturn {
  user: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  hasRole: (role: UserRole) => boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  isVendedor: boolean
  refetch: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getUserWithRole = async (): Promise<AuthUser | null> => {
    try {
      setError(null)

      // Verificar sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[useAuth] Session error:', sessionError)
        setError(`Error de sesión: ${sessionError.message}`)
        return null
      }

      if (!session?.user) {
        return null
      }

      // Obtener datos extendidos del usuario desde public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, role, empresa_id')
        .eq('id', session.user.id)
        .single()

      if (userError) {
        console.error('[useAuth] User data error:', userError)
        setError(`Error al obtener datos del usuario: ${userError.message}`)
        return null
      }

      if (!userData) {
        setError('Usuario no encontrado en la base de datos')
        return null
      }

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role as UserRole,
        empresa_id: userData.empresa_id
      }

    } catch (error) {
      console.error('[useAuth] Error crítico:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener usuario'
      setError(errorMessage)
      return null
    }
  }

  const fetchUser = async () => {
    setLoading(true)
    const userData = await getUserWithRole()
    setUser(userData)
    setLoading(false)
  }

  const refetch = async () => {
    await fetchUser()
  }

  useEffect(() => {
    // Obtener usuario inicial
    fetchUser()

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[useAuth] Auth state change: ${event}`)

        if (event === 'SIGNED_IN' && session) {
          // Usuario se ha logueado
          const userData = await getUserWithRole()
          setUser(userData)
        } else if (event === 'SIGNED_OUT' || !session) {
          // Usuario se ha deslogueado
          setUser(null)
          setError(null)
        }

        setLoading(false)
      }
    )

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Funciones helper para verificar roles
  const hasRole = (role: UserRole): boolean => {
    if (!user) return false

    // Superadmin tiene acceso a todo
    if (user.role === 'superadmin') return true

    // Verificar rol específico
    return user.role === role
  }

  const isAdmin = user?.role === 'admin'
  const isSuperAdmin = user?.role === 'superadmin'
  const isVendedor = user?.role === 'comercial'
  const isAuthenticated = !!user && !error

  return {
    user,
    loading,
    error,
    isAuthenticated,
    hasRole,
    isAdmin,
    isSuperAdmin,
    isVendedor,
    refetch
  }
}