'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ShieldX } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
  requiredRoles?: UserRole[]
  fallback?: ReactNode
  showError?: boolean
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  fallback,
  showError = true
}: ProtectedRouteProps) {
  const { user, loading, error, isAuthenticated, hasRole } = useAuth()

  // Loading state
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600" />
            <p className="text-gray-600">Verificando permisos...</p>
          </div>
        </div>
      )
    )
  }

  // Error state
  if (error) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldX className="h-5 w-5" />
                Error de Autenticación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )
    )
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <ShieldX className="h-5 w-5" />
                Acceso Restringido
              </CardTitle>
              <CardDescription>
                Debes iniciar sesión para acceder a esta página
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Tu sesión ha expirado o no tienes acceso a esta página.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )
    )
  }

  // Check specific role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    if (!showError) {
      return fallback || null
    }

    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldX className="h-5 w-5" />
                Sin Permisos
              </CardTitle>
              <CardDescription>
                No tienes los permisos necesarios para acceder a esta página
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>
                  Se requiere rol: <strong>{requiredRole}</strong>
                  <br />
                  Tu rol actual: <strong>{user.role}</strong>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )
    )
  }

  // Check multiple roles requirement
  if (requiredRoles && !requiredRoles.some(role => hasRole(role))) {
    if (!showError) {
      return fallback || null
    }

    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldX className="h-5 w-5" />
                Sin Permisos
              </CardTitle>
              <CardDescription>
                No tienes los permisos necesarios para acceder a esta página
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>
                  Se requiere uno de estos roles: <strong>{requiredRoles.join(', ')}</strong>
                  <br />
                  Tu rol actual: <strong>{user.role}</strong>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )
    )
  }

  // User has access, render children
  return <>{children}</>
}