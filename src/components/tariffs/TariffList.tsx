'use client'

import { useState, useEffect } from 'react'
import { Plus, FileText, Download, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TariffFilters } from './TariffFilters'
import { TariffRow } from './TariffRow'
import { TariffCard } from './TariffCard'
import { getTariffs } from '@/app/actions/tariffs'
import { exportTariffs } from '@/app/actions/export'
import { downloadFile } from '@/lib/helpers/export-helpers'
import { Database } from '@/lib/types/database.types'
import { toast } from 'sonner'

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
  tariffId?: string
}

// Verificar si puede importar (admin/superadmin)
const canImport = (role?: string) => {
  return role === 'admin' || role === 'superadmin'
}

export function TariffList({
  empresaId,
  initialTariffs = [],
  users = [],
  currentUserRole,
  tariffId
}: TariffListProps) {
  const router = useRouter()
  const [tariffs, setTariffs] = useState<Tariff[]>(initialTariffs)
  const [loading, setLoading] = useState(false)
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [filters, setFilters] = useState<{
    status?: 'Activa' | 'Inactiva' | 'all'
    search?: string
    user_id?: string
    tariff_id?: string
  }>({ status: 'all', search: '', user_id: undefined, tariff_id: tariffId })

  // Filtrar tarifas si hay tariff_id
  const filteredTariffs = tariffId
    ? tariffs.filter(t => t.id === tariffId)
    : tariffs

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

  // Selección múltiple
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTariffs(filteredTariffs.map(t => t.id))
    } else {
      setSelectedTariffs([])
    }
  }

  const handleSelectTariff = (tariffId: string, checked: boolean) => {
    if (checked) {
      setSelectedTariffs(prev => [...prev, tariffId])
    } else {
      setSelectedTariffs(prev => prev.filter(id => id !== tariffId))
    }
  }

  const isAllSelected = filteredTariffs.length > 0 && selectedTariffs.length === filteredTariffs.length
  const isSomeSelected = selectedTariffs.length > 0

  // Exportación
  const handleExportClick = () => {
    if (selectedTariffs.length === 0) {
      toast.error('Selecciona al menos una tarifa')
      return
    }
    setShowExportDialog(true)
  }

  const handleExport = async (format: 'json' | 'price-structure') => {
    setExporting(true)
    setShowExportDialog(false)

    const result = await exportTariffs(selectedTariffs, format)

    if (result.success && result.data) {
      // Detectar si es un array de archivos o un único archivo
      if ('files' in result.data) {
        // Múltiples archivos: descargar con delay
        for (const file of result.data.files) {
          downloadFile(file.content, file.filename, file.mimeType)
          await new Promise(resolve => setTimeout(resolve, 300)) // delay 300ms
        }
        toast.success(`${result.data.files.length} archivo(s) exportado(s)`)
      } else {
        // Un único archivo
        downloadFile(result.data.content, result.data.filename, result.data.mimeType)
        if (format === 'json') {
          toast.success(`Tarifa exportada a JSON`)
        } else {
          toast.success(`Estructura de precios exportada a CSV`)
        }
      }
      setSelectedTariffs([])
    } else {
      toast.error(result.error || 'Error al exportar')
    }

    setExporting(false)
  }

  const isSingleSelection = selectedTariffs.length === 1

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-600">Tarifas</h1>
          <p className="text-sm text-cyan-600">
            Gestiona las tarifas de tu empresa
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!isSomeSelected || exporting}
                  onClick={handleExportClick}
                  className="border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isSomeSelected
                    ? `Exportar (${selectedTariffs.length})`
                    : 'Exportar'
                  }
                </Button>
              </TooltipTrigger>
              {!isSomeSelected && (
                <TooltipContent>
                  <p>Selecciona uno o varios elementos de la lista para exportar</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Export Dialog */}
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-cyan-600">Exportar {isSingleSelection ? 'Tarifa' : 'Tarifas'}</DialogTitle>
                <DialogDescription>
                  {isSingleSelection
                    ? 'Selecciona el formato de exportación para la tarifa'
                    : `Selecciona el formato de exportación para las ${selectedTariffs.length} tarifas seleccionadas`
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <Button
                  className="w-full justify-start h-auto py-2.5 px-3 border-cyan-600 hover:bg-cyan-50"
                  variant="outline"
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                >
                  <div className="flex flex-col items-start text-left w-full min-w-0">
                    <div className="font-semibold text-cyan-600 text-xs leading-tight break-words w-full">
                      {isSingleSelection
                        ? 'Tarifa completa (JSON)'
                        : `${selectedTariffs.length} Tarifas completas (JSON)`
                      }
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-tight break-words w-full">
                      Incluye todos los datos de la tarifa
                    </div>
                  </div>
                </Button>

                <Button
                  className="w-full justify-start h-auto py-2.5 px-3 border-cyan-600 hover:bg-cyan-50"
                  variant="outline"
                  onClick={() => handleExport('price-structure')}
                  disabled={exporting}
                >
                  <div className="flex flex-col items-start text-left w-full min-w-0">
                    <div className="font-semibold text-cyan-600 text-xs leading-tight break-words w-full">
                      {isSingleSelection
                        ? 'Estructura de precios (CSV)'
                        : `Estructura de precios de cada tarifa (CSV)`
                      }
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-tight break-words w-full">
                      Compatible con plantilla de importación
                    </div>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {canImport(currentUserRole) && (
            <Button variant="outline" asChild className="border-cyan-600 text-cyan-600 hover:bg-cyan-50">
              <Link href="/tariffs/import">
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Link>
            </Button>
          )}
          <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
            <Link href="/tariffs/create">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Tarifa
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtro activo por tariff_id */}
      {tariffId && (
        <div className="mb-4 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Mostrando tarifa específica
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/tariffs')}
          >
            Ver todas las tarifas
          </Button>
        </div>
      )}

      {/* Filters */}
      <TariffFilters
        onFiltersChange={handleFiltersChange}
        defaultStatus={filters.status}
        defaultSearch={filters.search}
        defaultUserId={filters.user_id}
        users={users}
        currentUserRole={currentUserRole}
      />

      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          {filteredTariffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay tarifas</h3>
              <p className="text-muted-foreground mb-4">
                {filters.status !== 'all' || filters.search?.trim()
                  ? 'No se encontraron tarifas con los filtros aplicados'
                  : 'Aún no has creado ninguna tarifa'
                }
              </p>
              {(!filters.status || filters.status === 'all') && !filters.search?.trim() && (
                <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
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
                  <th className="text-left p-4 font-medium w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
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
                {filteredTariffs.map((tariff) => (
                  <TariffRow
                    key={tariff.id}
                    tariff={tariff}
                    onStatusChange={handleRefresh}
                    onDelete={handleRefresh}
                    currentUserRole={currentUserRole}
                    selected={selectedTariffs.includes(tariff.id)}
                    onSelectChange={(checked) => handleSelectTariff(tariff.id, checked)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden">
        {filteredTariffs.length === 0 ? (
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
              <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
                <Link href="/tariffs/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera tarifa
                </Link>
              </Button>
            )}
          </div>
        ) : (
          filteredTariffs.map((tariff) => (
            <TariffCard
              key={tariff.id}
              tariff={tariff}
              onStatusChange={handleRefresh}
              onDelete={handleRefresh}
              currentUserRole={currentUserRole}
            />
          ))
        )}
      </div>
    </>
  )
}
