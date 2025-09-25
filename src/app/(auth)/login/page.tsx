'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth/supabase-auth'
import LoginForm from '@/components/auth/LoginForm'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const userResult = await getUser()

        if (userResult.success && userResult.data) {
          // Usuario ya autenticado - redirect según rol
          switch (userResult.data.role) {
            case 'superadmin':
            case 'admin':
              router.replace('/dashboard')
              break
            case 'vendedor':
              router.replace('/budgets')
              break
            default:
              router.replace('/dashboard')
          }
        } else {
          // Usuario no autenticado - mostrar formulario login
          setIsCheckingAuth(false)
        }
      } catch (error) {
        // Error al verificar auth - mostrar formulario login
        console.error('Error checking auth status:', error)
        setIsCheckingAuth(false)
      }
    }

    checkAuthStatus()
  }, [router])

  // Mostrar loading mientras se verifica el estado de autenticación
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header con logo/título */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            JEYCA Presupuestos
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de gestión de presupuestos para comerciales
          </p>
        </div>

        {/* Formulario de login */}
        <LoginForm />

        {/* Footer con info adicional */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Compatible con tablets y dispositivos móviles
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-400">
            <span>Usuarios de prueba:</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            <div>Admin: admin@jeyca.net / Admin123!</div>
            <div>Vendedor: vendedor@jeyca.net / Vendedor123!</div>
          </div>
        </div>
      </div>
    </div>
  )
}