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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TariffFilters } from './TariffFilters'
import { TariffRow } from './TariffRow'
import { getTariffs } from '@/app/actions/tariffs'
import { Database } from '@/lib/types/database.types'

type Tariff = Database['public']['Tables']['tariffs']['Row']

interface TariffListProps {
  empresaId: number
  initialTariffs?: Tariff[]
}

export function TariffList({ empresaId, initialTariffs = [] }: TariffListProps) {
  const [tariffs, setTariffs] = useState<Tariff[]>(initialTariffs)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<{
    status?: 'Activa' | 'Inactiva' | 'all'
    search?: string
  }>({ status: 'all', search: '' })

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

  if (loading && tariffs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando tarifas...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Tarifas</h1>
          <p className="text-muted-foreground">
            Administra las tarifas de tu empresa
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
      />

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tarifas ({tariffs.length})
            </CardTitle>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
          </div>
        </CardHeader>
        <CardContent>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarifa</TableHead>
                    <TableHead className="w-24">Presupuesto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Validez</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead className="w-12">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tariffs.map((tariff) => (
                    <TariffRow
                      key={tariff.id}
                      tariff={tariff}
                      onStatusChange={handleRefresh}
                      onDelete={handleRefresh}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}