"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Plus, Check, X } from 'lucide-react'
import {
  getBudgetNotes,
  addBudgetNote,
  updateBudgetNote,
  deleteBudgetNote,
  type BudgetNote
} from '@/app/actions/budget-notes'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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

interface BudgetNotesDialogProps {
  budgetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onNotesUpdated?: () => void
}

export function BudgetNotesDialog({
  budgetId,
  open,
  onOpenChange,
  onNotesUpdated
}: BudgetNotesDialogProps) {
  const [notes, setNotes] = useState<BudgetNote[]>([])
  const [loading, setLoading] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const loadNotes = async () => {
    setLoading(true)
    const result = await getBudgetNotes(budgetId)
    if (result.success && Array.isArray(result.data)) {
      setNotes(result.data)
    } else {
      toast.error(result.error || 'Error al cargar notas')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      loadNotes()
    }
  }, [open, budgetId])

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error('Escribe algo antes de guardar')
      return
    }

    setSaving(true)
    const result = await addBudgetNote(budgetId, newNoteContent)

    if (result.success) {
      toast.success('Nota añadida')
      setNewNoteContent('')
      loadNotes()
      onNotesUpdated?.()
    } else {
      toast.error(result.error || 'Error al añadir nota')
    }

    setSaving(false)
  }

  const handleStartEdit = (note: BudgetNote) => {
    setEditingNoteId(note.id)
    setEditingContent(note.content)
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditingContent('')
  }

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim()) {
      toast.error('El contenido no puede estar vacío')
      return
    }

    setSaving(true)
    const result = await updateBudgetNote(noteId, editingContent)

    if (result.success) {
      toast.success('Nota actualizada')
      setEditingNoteId(null)
      setEditingContent('')
      loadNotes()
      onNotesUpdated?.()
    } else {
      toast.error(result.error || 'Error al actualizar nota')
    }

    setSaving(false)
  }

  const handleDeleteConfirm = (noteId: string) => {
    setNoteToDelete(noteId)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!noteToDelete) return

    setSaving(true)
    const result = await deleteBudgetNote(noteToDelete)

    if (result.success) {
      toast.success('Nota eliminada')
      loadNotes()
      onNotesUpdated?.()
    } else {
      toast.error(result.error || 'Error al eliminar nota')
    }

    setSaving(false)
    setDeleteConfirmOpen(false)
    setNoteToDelete(null)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM 'de' yyyy, HH:mm", {
        locale: es
      })
    } catch (error) {
      return dateString
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bitácora del Presupuesto</DialogTitle>
            <DialogDescription>
              Añade notas, comentarios o apuntes sobre este presupuesto
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Nueva nota */}
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <label className="text-sm font-medium">Nueva nota</label>
              <Textarea
                placeholder="Escribe tu nota aquí..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={saving || !newNoteContent.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir nota
                </Button>
              </div>
            </div>

            {/* Lista de notas */}
            <div className="flex-1 min-h-0">
              <h3 className="text-sm font-medium mb-2">
                Historial ({notes.length})
              </h3>
              <ScrollArea className="h-full border rounded-lg">
                <div className="p-3 space-y-3">
                  {loading ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Cargando notas...
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No hay notas aún
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="border-l-4 border-blue-600 pl-3 pr-2 py-2 bg-card rounded-r"
                      >
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                disabled={saving}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(note.id)}
                                disabled={saving || !editingContent.trim()}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap break-words mb-2">
                              {note.content}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">{note.users?.name || 'Usuario'}</span>
                                <span className="mx-1">•</span>
                                <span>{formatDate(note.created_at)}</span>
                                {note.updated_at !== note.created_at && (
                                  <span className="ml-1">(editado)</span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => handleStartEdit(note)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteConfirm(note.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La nota será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
