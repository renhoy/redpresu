'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Building2, LogOut, Home, FileText, Receipt, Users, Settings } from 'lucide-react'
import LogoutButton from '@/components/auth/LogoutButton'

interface HeaderProps {
  userRole?: string
}

export function Header({ userRole }: HeaderProps) {
  const pathname = usePathname()

  // Construir navegación según rol
  const isSuperadmin = userRole === 'superadmin'

  const navigation = [
    { name: 'Inicio', href: '/dashboard', icon: Home, show: true },
    { name: 'Tarifas', href: '/tariffs', icon: FileText, show: true },
    { name: 'Presupuestos', href: '/budgets', icon: Receipt, show: true },
    { name: 'Usuarios', href: '/users', icon: Users, show: true }, // Todos los roles ven Usuarios
    { name: 'Configuración', href: '/settings', icon: Settings, show: isSuperadmin },
  ].filter(item => item.show)

  // Debug log
  useEffect(() => {
    console.log('[Header] userRole:', userRole)
    console.log('[Header] navigation items:', navigation.map(n => n.name))
  }, [userRole, navigation])

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">Jeyca Presu</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Mobile menu button + Logout */}
          <div className="flex items-center gap-2">
            {/* Mobile navigation */}
            <div className="md:hidden">
              <select
                className="text-sm border rounded px-2 py-1"
                value={pathname}
                onChange={(e) => window.location.href = e.target.value}
              >
                {navigation.map((item) => (
                  <option key={item.name} value={item.href}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Logout Button */}
            <LogoutButton variant="ghost" size="sm" showText={false}>
              <LogOut className="h-4 w-4" />
            </LogoutButton>
          </div>
        </div>
      </div>
    </header>
  )
}