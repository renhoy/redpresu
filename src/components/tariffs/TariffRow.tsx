'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, FileText, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/validators'
import { toggleTariffStatus, deleteTariff } from '@/app/actions/tariffs'
import { Database } from '@/lib/types/database.types'
import { toast } from 'sonner'

type Tariff = Database['public']['Tables']['tariffs']['Row']

interface TariffRowProps {
  tariff: Tariff
  onStatusChange?: () => void
  onDelete?: () => void
}

export function TariffRow({ tariff, onStatusChange, onDelete }: TariffRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    try {
      const result = await toggleTariffStatus(tariff.id, tariff.status as 'Activa' | 'Inactiva')
      if (result.success) {
        toast.success(`Estado actualizado a ${newStatus}`)
        onStatusChange?.()
      } else {
        toast.error(result.error || 'Error al actualizar estado')
      }
    } catch {
      toast.error('Error inesperado al actualizar estado')
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      const result = await deleteTariff(tariff.id)
      if (result.success) {
        toast.success('Tarifa eliminada')
        onDelete?.()
        setShowDeleteDialog(false)
      } else {
        toast.error(result.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error inesperado al eliminar')
    } finally {
      setIsDeleting(false)
    }
  }

  const statusColors = {
    'Activa': 'bg-green-100 text-green-800',
    'Inactiva': 'bg-gray-200 text-gray-700'
  }

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        {/* Columna Tarifa (Nombre + Descripción) */}
        <TableCell className="font-medium">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{tariff.title}</span>
            </div>
            <div className="text-sm text-muted-foreground max-w-xs truncate">
              {tariff.description || 'Sin descripción'}
            </div>
          </div>
        </TableCell>

        {/* Columna Presupuesto */}
        <TableCell>
          {tariff.status === 'Activa' ? (
            <Link
              href={`/budgets/create?tariff_id=${tariff.id}`}
              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
              title="Crear presupuesto con esta tarifa"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Crear</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground" title="Solo se pueden crear presupuestos de tarifas activas">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">-</span>
            </span>
          )}
        </TableCell>

        {/* Columna Estado */}
        <TableCell>
          <Select
            value={tariff.status || 'Activa'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue>
                <Badge className={statusColors[tariff.status as keyof typeof statusColors] || 'bg-gray-200 text-gray-700'}>
                  {tariff.status || 'Activa'}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Activa">
                <Badge className="bg-green-100 text-green-800">
                  Activa
                </Badge>
              </SelectItem>
              <SelectItem value="Inactiva">
                <Badge className="bg-gray-200 text-gray-700">
                  Inactiva
                </Badge>
              </SelectItem>
            </SelectContent>
          </Select>
        </TableCell>

        {/* Columna Validez */}
        <TableCell className="hidden md:table-cell">
          <div className="text-sm">
            {tariff.validity ? (
              <span>{tariff.validity} días</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>

        {/* Columna Fecha */}
        <TableCell className="hidden sm:table-cell text-muted-foreground">
          {formatDate(tariff.created_at)}
        </TableCell>

        <TableCell>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              title="Editar tarifa"
            >
              <Link href={`/tariffs/edit/${tariff.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              title="Eliminar tarifa"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarifa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la tarifa
              <strong> &quot;{tariff.title}&quot;</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}