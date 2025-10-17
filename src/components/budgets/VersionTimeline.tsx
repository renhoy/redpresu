'use client'

import { useState } from 'react'
import { BudgetVersion } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { RotateCcw, Trash2, Clock, User, FileText } from 'lucide-react'
import { restoreBudgetVersion, deleteBudgetVersion } from '@/app/actions/budget-versions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/helpers/format'

interface VersionTimelineProps {
  versions: BudgetVersion[]
  currentUserId: string
  currentUserRole: string
  onVersionRestored?: () => void
}

export function VersionTimeline({
  versions,
  currentUserId,
  currentUserRole,
  onVersionRestored
}: VersionTimelineProps) {
  const router = useRouter()
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<BudgetVersion | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = currentUserRole === 'admin' || currentUserRole === 'superadmin'

  async function handleRestore() {
    if (!selectedVersion) return

    setIsRestoring(true)

    const result = await restoreBudgetVersion(selectedVersion.id, true)

    if (result.success) {
      toast.success(`Versión #${selectedVersion.version_number} restaurada correctamente`)
      setShowRestoreConfirm(false)
      setSelectedVersion(null)

      // Recargar la página o navegar de vuelta
      if (onVersionRestored) {
        onVersionRestored()
      } else {
        router.refresh()
      }
    } else {
      toast.error(result.error || 'Error restaurando versión')
    }

    setIsRestoring(false)
  }

  async function handleDelete() {
    if (!selectedVersion) return

    setIsDeleting(true)

    const result = await deleteBudgetVersion(selectedVersion.id)

    if (result.success) {
      toast.success(`Versión #${selectedVersion.version_number} eliminada`)
      setShowDeleteConfirm(false)
      setSelectedVersion(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Error eliminando versión')
    }

    setIsDeleting(false)
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Formato relativo
    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`

    // Formato absoluto
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay versiones guardadas para este presupuesto</p>
          <p className="text-sm mt-1">Las versiones se guardan automáticamente al realizar cambios importantes</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {versions.map((version, index) => {
          const isLatest = index === 0
          const userName = version.users?.name || 'Usuario desconocido'
          const userEmail = version.users?.email || ''

          return (
            <Card key={version.id} className={isLatest ? 'border-2 border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Información de la versión */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg">
                        {version.version_name || `Versión ${version.version_number}`}
                      </div>
                      {isLatest && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Más reciente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(version.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span title={userEmail}>{userName}</span>
                      </div>
                    </div>

                    {version.notes && (
                      <div className="flex items-start gap-1 text-sm">
                        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground italic">{version.notes}</p>
                      </div>
                    )}

                    {/* Totales de la versión */}
                    <div className="grid grid-cols-3 gap-2 mt-3 p-2 bg-muted rounded">
                      <div>
                        <p className="text-xs text-muted-foreground">Base</p>
                        <p className="font-semibold">{formatCurrency(version.base_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold">{formatCurrency(version.total_amount)}</p>
                      </div>
                      {version.total_pay && version.total_pay !== version.total_amount && (
                        <div>
                          <p className="text-xs text-muted-foreground">A Pagar</p>
                          <p className="font-semibold">{formatCurrency(version.total_pay)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVersion(version)
                        setShowRestoreConfirm(true)
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restaurar
                    </Button>
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVersion(version)
                          setShowDeleteConfirm(true)
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog confirmar restauración */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar esta versión?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedVersion && (
                <>
                  <p className="mb-2">
                    Se restaurará la <strong>Versión #{selectedVersion.version_number}</strong> del presupuesto.
                  </p>
                  <p className="mb-2">
                    El estado actual se guardará automáticamente como una nueva versión antes de restaurar.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Esta acción se puede deshacer restaurando otra versión posteriormente.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? 'Restaurando...' : 'Restaurar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog confirmar eliminación */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta versión?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedVersion && (
                <>
                  <p className="mb-2">
                    Se eliminará permanentemente la <strong>Versión #{selectedVersion.version_number}</strong>.
                  </p>
                  <p className="text-destructive font-semibold">
                    Esta acción no se puede deshacer.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
