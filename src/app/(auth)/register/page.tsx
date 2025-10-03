'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/auth/supabase-auth'
import RegisterForm from '@/components/auth/RegisterForm'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
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
          // Usuario no autenticado - mostrar formulario registro
          setIsCheckingAuth(false)
        }
      } catch (error) {
        // Error al verificar auth - mostrar formulario registro
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
      <div className="w-full max-w-2xl space-y-8">
        {/* Header con logo/título */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            JEYCA Presupuestos
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Crea tu cuenta para empezar a gestionar presupuestos
          </p>
        </div>

        {/* Formulario de registro */}
        <RegisterForm />

        {/* Footer con info adicional */}
        <div className="text-center pb-8">
          <p className="text-xs text-gray-500">
            Al registrarte, aceptas nuestros términos y condiciones
          </p>
        </div>
      </div>
    </div>
  )
}
