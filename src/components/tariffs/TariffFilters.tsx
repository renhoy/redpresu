'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

  const handleClearFilters = () => {
    setStatus('all')
    setSearch('')
    onFiltersChange({ status: 'all', search: '' })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por título o descripción..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="w-full sm:w-48">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Activa">Activas</SelectItem>
            <SelectItem value="Inactiva">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(status !== 'all' || search.trim()) && (
        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="whitespace-nowrap"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}