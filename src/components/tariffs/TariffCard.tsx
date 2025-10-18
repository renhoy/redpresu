"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Database } from '@/lib/types/database.types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Trash2, Plus, Receipt, Star, FileText, Eye, Copy } from 'lucide-react'
import { formatDate } from '@/lib/validators'
import { toggleTariffStatus, deleteTariff, setTariffAsTemplate, unsetTariffAsTemplate, duplicateTariff } from '@/app/actions/tariffs'
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
import { toast } from 'sonner'

type Tariff = Database['public']['Tables']['tariffs']['Row'] & {
  creator?: {
    name: string
    role: string
  } | null
  budget_count?: number
}

interface TariffCardProps {
  tariff: Tariff
  onStatusChange?: () => void
  onDelete?: () => void
  currentUserRole?: string
}

const statusColors = {
  'Activa': 'bg-green-100 text-green-800',
  'Inactiva': 'bg-gray-200 text-gray-700'
}

export function TariffCard({ tariff, onStatusChange, onDelete, currentUserRole }: TariffCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [isTogglingTemplate, setIsTogglingTemplate] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

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

  const handleToggleTemplate = async () => {
    if (isTogglingTemplate) return

    setIsTogglingTemplate(true)
    try {
      const result = tariff.is_template
        ? await unsetTariffAsTemplate(tariff.id)
        : await setTariffAsTemplate(tariff.id)

      if (result.success) {
        toast.success(tariff.is_template ? 'Plantilla desmarcada' : 'Tarifa marcada como plantilla')
        onStatusChange?.()
        setShowTemplateDialog(false)
      } else {
        toast.error(result.error || 'Error al cambiar plantilla')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsTogglingTemplate(false)
    }
  }

  const handleDuplicate = async () => {
    if (isDuplicating) return

    setIsDuplicating(true)
    try {
      const result = await duplicateTariff(tariff.id)

      if (result.success) {
        toast.success(`Tarifa "${tariff.title}" duplicada exitosamente`)
        onStatusChange?.()
      } else {
        toast.error(result.error || 'Error al duplicar tarifa')
      }
    } catch {
      toast.error('Error inesperado al duplicar')
    } finally {
      setIsDuplicating(false)
    }
  }

  const isAdmin = currentUserRole && ['admin', 'superadmin'].includes(currentUserRole)

  return (
    <>
      <Card className="w-full mb-4">
        <CardContent className="p-3">
          <div className="space-y-3">
            {/* Header: Título + Icono */}
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{tariff.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tariff.description || 'Sin descripción'}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Estado</div>
                <Select value={tariff.status || 'Activa'} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full h-7 text-xs">
                    <SelectValue>
                      <Badge className={statusColors[tariff.status as keyof typeof statusColors] || 'bg-gray-200 text-gray-700'}>
                        {tariff.status || 'Activa'}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activa">
                      <Badge className="bg-green-100 text-green-800">Activa</Badge>
                    </SelectItem>
                    <SelectItem value="Inactiva">
                      <Badge className="bg-gray-200 text-gray-700">Inactiva</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 text-right">
                <div className="text-xs text-muted-foreground mb-1">Validez</div>
                <div className="text-sm font-medium">
                  {tariff.validity ? `${tariff.validity} días` : '-'}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Usuario</div>
                {tariff.creator ? (
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium truncate">{tariff.creator.name}</div>
                    <div className="text-xs text-muted-foreground capitalize truncate">
                      {tariff.creator.role}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">-</div>
                )}
              </div>

              <div className="min-w-0 text-right">
                <div className="text-xs text-muted-foreground mb-1">Fecha</div>
                <div className="text-sm">{formatDate(tariff.created_at)}</div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1 border-t pt-3">
              {tariff.status === 'Activa' ? (
                <Button variant="outline" size="sm" asChild className="flex-1 h-7 px-2">
                  <Link href={`/budgets/create?tariff_id=${tariff.id}`} target="_blank" rel="noopener noreferrer">
                    <Plus className="h-3 w-3 mr-1" />
                    <Receipt className="h-3 w-3 mr-1" />
                    <span className="text-xs">Presup.</span>
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled className="flex-1 h-7 px-2">
                  <Plus className="h-3 w-3 mr-1" />
                  <Receipt className="h-3 w-3 mr-1" />
                  <span className="text-xs">Presup.</span>
                </Button>
              )}

              {/* Contador de presupuestos */}
              {tariff.budget_count !== undefined && tariff.budget_count > 0 && (
                <Button variant="outline" size="sm" asChild className="h-7 px-2">
                  <Link href={`/budgets?tariff_id=${tariff.id}`}>
                    <span className="text-xs font-medium">{tariff.budget_count}</span>
                    <Eye className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button
                  variant={tariff.is_template ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowTemplateDialog(true)}
                  className="h-7 px-2"
                >
                  <Star className={`h-3 w-3 ${tariff.is_template ? 'fill-current' : ''}`} />
                </Button>
              )}

              <Button variant="outline" size="sm" asChild className="h-7 px-2">
                <Link href={`/tariffs/edit/${tariff.id}`}>
                  <Pencil className="h-3 w-3" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={isDuplicating}
                className="h-7 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="border-destructive text-destructive hover:bg-destructive/10 h-7 px-2"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para confirmar cambio de plantilla */}
      <AlertDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tariff.is_template ? '¿Desmarcar plantilla?' : '¿Marcar como plantilla?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tariff.is_template ? (
                <>
                  La tarifa <strong>&quot;{tariff.title}&quot;</strong> dejará de ser la plantilla por defecto.
                  Las nuevas tarifas no se pre-cargarán con estos datos.
                </>
              ) : (
                <>
                  La tarifa <strong>&quot;{tariff.title}&quot;</strong> se marcará como plantilla por defecto.
                  Si existe otra plantilla activa, será reemplazada automáticamente.
                  Las nuevas tarifas se pre-cargarán con los datos de esta tarifa (excepto el CSV).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleTemplate}
              disabled={isTogglingTemplate}
            >
              {isTogglingTemplate ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
