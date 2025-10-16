'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Building2, LogOut, Home, FileText, Receipt, Users, Settings, CircleUser } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HeaderProps {
  userRole?: string
  userName?: string
  isAuthenticated?: boolean
  hasBudgets?: boolean
}

export function Header({ userRole, userName, isAuthenticated = true, hasBudgets = true }: HeaderProps) {
  const pathname = usePathname()

  // Si no está autenticado, mostrar header público
  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Redpresu</span>
            </Link>

            {/* Botones de autenticación */}
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="outline">Iniciar Sesión</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-lime-500 hover:bg-lime-600">
                  Registro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // Construir navegación según rol (solo si está autenticado)
  const isSuperadmin = userRole === 'superadmin'

  const navigation = [
    { name: 'Inicio', href: '/dashboard', icon: Home, show: true },
    { name: 'Tarifas', href: '/tariffs', icon: FileText, show: true },
    { name: 'Presupuestos', href: '/budgets', icon: Receipt, show: true },
    { name: 'Usuarios', href: '/users', icon: Users, show: true }, // Todos los roles ven Usuarios
    { name: 'Configuración', href: '/settings', icon: Settings, show: isSuperadmin },
  ].filter(item => item.show)

  // Formatear rol para mostrar
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'Superadmin'
      case 'admin': return 'Admin'
      case 'vendedor': return 'Vendedor'
      default: return 'Usuario'
    }
  }

  // Debug log
  useEffect(() => {
    console.log('[Header] userRole:', userRole)
    console.log('[Header] userName:', userName)
    console.log('[Header] navigation items:', navigation.map(n => n.name))
  }, [userRole, userName, navigation])

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Redpresu</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden lg:flex items-center space-x-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon
              const isTarifasButton = item.href === '/tariffs'
              const isPresupuestosButton = item.href === '/budgets'
              const isDisabled = isPresupuestosButton && !hasBudgets

              // Si está deshabilitado, mostrar como span en vez de Link
              if (isDisabled) {
                return (
                  <span
                    key={item.name}
                    className="px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                    title="No tienes presupuestos creados"
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </span>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'text-lime-700 bg-lime-50'
                      : isTarifasButton
                      ? 'text-white bg-cyan-600 hover:bg-cyan-700'
                      : 'text-white bg-lime-500 hover:bg-lime-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Navigation - Mobile/Tablet (solo iconos) */}
          <nav className="flex lg:hidden items-center gap-2">
            <TooltipProvider>
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                const Icon = item.icon
                const isPresupuestosButton = item.href === '/budgets'
                const isDisabled = isPresupuestosButton && !hasBudgets

                // Si está deshabilitado, mostrar como span
                if (isDisabled) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <span className="p-2 rounded-md border bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-60">
                          <Icon className="w-5 h-5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>No tienes presupuestos creados</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={`p-2 rounded-md transition-colors border ${
                          isActive
                            ? 'text-lime-700 bg-lime-50 border-lime-500'
                            : 'text-green-600 bg-white border-green-600 hover:bg-green-50'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>
          </nav>

          {/* User info + Logout */}
          <div className="flex items-center gap-3">
            {/* User info - Desktop */}
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <CircleUser className="h-8 w-8 text-green-600" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{userName || 'Usuario'}</span>
                <span className="text-xs text-gray-500">{getRoleLabel(userRole)}</span>
              </div>
            </div>

            {/* User info - Mobile/Tablet (solo icono con tooltip) */}
            <div className="lg:hidden">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 rounded-md border border-green-600 bg-white cursor-help">
                      <CircleUser className="h-5 w-5 text-green-600" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col">
                      <span className="font-medium">{userName || 'Usuario'}</span>
                      <span className="text-xs">{getRoleLabel(userRole)}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Logout Button - Desktop */}
            <div className="hidden lg:block">
              <LogoutButton
                variant="outline"
                size="sm"
                showText={true}
                className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
              />
            </div>

            {/* Logout Button - Mobile/Tablet (con tooltip) */}
            <div className="lg:hidden">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <LogoutButton
                        variant="outline"
                        size="sm"
                        showText={false}
                        className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cerrar Sesión</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}