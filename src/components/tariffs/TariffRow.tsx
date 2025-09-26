'use client'

import { useState } from 'react'
import { Eye, Edit, Power, Trash2, MoreHorizontal, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

type Tariff = Database['public']['Tables']['tariffs']['Row']

interface TariffRowProps {
  tariff: Tariff
  onStatusChange?: () => void
  onDelete?: () => void
}

export function TariffRow({ tariff, onStatusChange, onDelete }: TariffRowProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleToggleStatus = async () => {
    if (isToggling) return

    setIsToggling(true)
    try {
      const result = await toggleTariffStatus(tariff.id, tariff.status as 'Activa' | 'Inactiva')
      if (result.success) {
        onStatusChange?.()
      } else {
        console.error('Error:', result.error)
      }
    } catch (error) {
      console.error('Error toggling status:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      const result = await deleteTariff(tariff.id)
      if (result.success) {
        onDelete?.()
        setShowDeleteDialog(false)
      } else {
        console.error('Error:', result.error)
      }
    } catch (error) {
      console.error('Error deleting tariff:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = () => {
    switch (tariff.status) {
      case 'Activa':
        return <Badge variant="default" className="bg-green-100 text-green-800">Activa</Badge>
      case 'Inactiva':
        return <Badge variant="secondary">Inactiva</Badge>
      default:
        return <Badge variant="outline">{tariff.status}</Badge>
    }
  }

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {tariff.title}
          </div>
        </TableCell>

        <TableCell className="hidden md:table-cell">
          <div className="max-w-xs truncate text-muted-foreground">
            {tariff.description || 'Sin descripción'}
          </div>
        </TableCell>

        <TableCell>
          {getStatusBadge()}
        </TableCell>

        <TableCell className="hidden lg:table-cell">
          {tariff.validity_start ? formatDate(tariff.validity_start) : '-'}
        </TableCell>

        <TableCell className="hidden lg:table-cell">
          {tariff.validity_end ? formatDate(tariff.validity_end) : '-'}
        </TableCell>

        <TableCell className="hidden sm:table-cell text-muted-foreground">
          {formatDate(tariff.created_at)}
        </TableCell>

        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleToggleStatus}
                disabled={isToggling}
              >
                <Power className="mr-2 h-4 w-4" />
                {tariff.status === 'Activa' ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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