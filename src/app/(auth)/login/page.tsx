import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server'
import { isDevelopmentMode } from '@/lib/helpers/config-helpers'
import LoginForm from '@/components/auth/LoginForm'
import { FileText } from 'lucide-react'

export default async function LoginPage() {
  // Verificar si el usuario ya está autenticado
  const user = await getServerUser()

  if (user) {
    // Redirigir según rol
    switch (user.role) {
      case 'superadmin':
      case 'admin':
        redirect('/dashboard')
      case 'vendedor':
        redirect('/budgets')
      default:
        redirect('/dashboard')
    }
  }

  // Obtener el modo de la aplicación
  const isDev = await isDevelopmentMode()

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#f7fee7' }}>
      <div className="w-full max-w-md space-y-8">
        {/* Header con logo/título */}
        <div className="text-center">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <div className="mx-auto h-12 w-12 bg-lime-500 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Redpresu
            </h2>
          </Link>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de gestión de presupuestos profesionales
          </p>
        </div>

        {/* Formulario de login */}
        <LoginForm />

        {/* Footer con info adicional - Solo en desarrollo */}
        {isDev && (
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
        )}
      </div>
    </div>
  )
}
