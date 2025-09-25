import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import LogoutButton from '@/components/auth/LogoutButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Building2, Shield } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'vendedor':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con logout */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Página temporal para testing</p>
          </div>
          <LogoutButton variant="outline" />
        </div>

        {/* Card principal con información del usuario */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Usuario
            </CardTitle>
            <CardDescription>
              Datos del usuario autenticado actualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Nombre:</span>
                  <span>{user.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Email:</span>
                  <span className="text-gray-600">{user.email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Rol:</span>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Empresa ID:</span>
                  <span>{user.empresa_id}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">User ID:</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {user.id}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de testing */}
        <Card>
          <CardHeader>
            <CardTitle>🚧 Dashboard en Desarrollo</CardTitle>
            <CardDescription>
              Esta es una página temporal para testing del sistema de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Estado del módulo Auth</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✅ Configuración Supabase Auth</li>
                  <li>✅ Sistema de Login con Server Actions</li>
                  <li>✅ Middleware de protección de rutas</li>
                  <li>✅ Hook useAuth y ProtectedRoute</li>
                  <li>✅ Logout funcional</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-900 mb-2">Próximos pasos</h3>
                <p className="text-sm text-yellow-800">
                  Una vez completado el módulo Auth, se desarrollará el dashboard real
                  con las funcionalidades específicas según el rol del usuario.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <LogoutButton variant="destructive" size="sm" />
                <LogoutButton variant="ghost" size="sm" showText={false} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}