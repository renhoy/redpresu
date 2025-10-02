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

interface TariffFiltersProps {
  onFiltersChange: (filters: {
    status?: 'Activa' | 'Inactiva' | 'all'
    search?: string
  }) => void
  defaultStatus?: 'Activa' | 'Inactiva' | 'all'
  defaultSearch?: string
}

export function TariffFilters({
  onFiltersChange,
  defaultStatus = 'all',
  defaultSearch = ''
}: TariffFiltersProps) {
  const [status, setStatus] = useState<'Activa' | 'Inactiva' | 'all'>(defaultStatus)
  const [search, setSearch] = useState(defaultSearch)

  const handleStatusChange = (value: 'Activa' | 'Inactiva' | 'all') => {
    setStatus(value)
    onFiltersChange({ status: value, search })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onFiltersChange({ status, search: value })
  }

  return (
    <div className="flex gap-4 mb-4">
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
    </div>
  )
}