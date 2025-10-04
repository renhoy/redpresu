'use client'

import { useState, useEffect } from 'react'
import { Plus, FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TariffFilters } from './TariffFilters'
import { TariffRow } from './TariffRow'
import { getTariffs } from '@/app/actions/tariffs'
import { Database } from '@/lib/types/database.types'

type Tariff = Database['public']['Tables']['tariffs']['Row']

interface User {
  id: string
  nombre: string | null
  apellidos: string | null
}

interface TariffListProps {
  empresaId: number
  initialTariffs?: Tariff[]
  users?: User[]
  currentUserRole?: string
}

export function TariffList({
  empresaId,
  initialTariffs = [],
  users = [],
  currentUserRole
}: TariffListProps) {
  const [tariffs, setTariffs] = useState<Tariff[]>(initialTariffs)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<{
    status?: 'Activa' | 'Inactiva' | 'all'
    search?: string
    user_id?: string
  }>({ status: 'all', search: '', user_id: undefined })

  const loadTariffs = async () => {
    setLoading(true)
    try {
      const data = await getTariffs(empresaId, filters)
      setTariffs(data)
    } catch (error) {
      console.error('Error loading tariffs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialTariffs.length === 0) {
      loadTariffs()
    }
  }, [])

  useEffect(() => {
    loadTariffs()
  }, [filters])

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const handleRefresh = () => {
    loadTariffs()
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tarifas</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las tarifas de tu empresa
          </p>
        </div>
        <Button asChild>
          <Link href="/tariffs/create">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tarifa
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <TariffFilters
        onFiltersChange={handleFiltersChange}
        defaultStatus={filters.status}
        defaultSearch={filters.search}
        defaultUserId={filters.user_id}
        users={users}
        currentUserRole={currentUserRole}
      />

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {tariffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay tarifas</h3>
              <p className="text-muted-foreground mb-4">
                {filters.status !== 'all' || filters.search?.trim()
                  ? 'No se encontraron tarifas con los filtros aplicados'
                  : 'Aún no has creado ninguna tarifa'
                }
              </p>
              {(!filters.status || filters.status === 'all') && !filters.search?.trim() && (
                <Button asChild>
                  <Link href="/tariffs/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera tarifa
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-medium">Tarifa</th>
                  <th className="text-center p-4 font-medium">Presupuesto</th>
                  <th className="text-center p-4 font-medium">Estado</th>
                  <th className="text-center p-4 font-medium">Usuario</th>
                  <th className="text-center p-4 font-medium">Validez</th>
                  <th className="text-center p-4 font-medium">Fecha</th>
                  <th className="text-center p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tariffs.map((tariff) => (
                  <TariffRow
                    key={tariff.id}
                    tariff={tariff}
                    onStatusChange={handleRefresh}
                    onDelete={handleRefresh}
                    currentUserRole={currentUserRole}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
