'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface User {
  id: string
  nombre: string | null
  apellidos: string | null
}

interface TariffFiltersProps {
  onFiltersChange: (filters: {
    status?: 'Activa' | 'Inactiva' | 'all'
    search?: string
    user_id?: string
  }) => void
  defaultStatus?: 'Activa' | 'Inactiva' | 'all'
  defaultSearch?: string
  defaultUserId?: string
  users?: User[]
  currentUserRole?: string
}

export function TariffFilters({
  onFiltersChange,
  defaultStatus = 'all',
  defaultSearch = '',
  defaultUserId = '',
  users = [],
  currentUserRole
}: TariffFiltersProps) {
  const [status, setStatus] = useState<'Activa' | 'Inactiva' | 'all'>(defaultStatus)
  const [search, setSearch] = useState(defaultSearch)
  const [userId, setUserId] = useState(defaultUserId)

  const handleStatusChange = (value: 'Activa' | 'Inactiva' | 'all') => {
    setStatus(value)
    onFiltersChange({ status: value, search, user_id: userId || undefined })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onFiltersChange({ status, search: value, user_id: userId || undefined })
  }

  const handleUserChange = (value: string) => {
    setUserId(value)
    onFiltersChange({ status, search, user_id: value || undefined })
  }

  // Solo mostrar filtro de usuario si es admin/superadmin
  const showUserFilter = currentUserRole && ['admin', 'superadmin'].includes(currentUserRole)

  return (
    <div className="flex gap-4 mb-4 flex-wrap">
      <Input
        placeholder="Buscar por título o descripción..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-xs"
      />
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="max-w-[200px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="Activa">Activas</SelectItem>
          <SelectItem value="Inactiva">Inactivas</SelectItem>
        </SelectContent>
      </Select>

      {showUserFilter && users.length > 0 && (
        <Select value={userId} onValueChange={handleUserChange}>
          <SelectTrigger className="max-w-[200px]">
            <SelectValue placeholder="Todos los usuarios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los usuarios</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.nombre} {user.apellidos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}