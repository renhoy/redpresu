"use client"

import { useState, useEffect } from 'react'
import { NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { BudgetNotesDialog } from './BudgetNotesDialog'
import { getBudgetNotes, type BudgetNote } from '@/app/actions/budget-notes'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface BudgetNotesIconProps {
  budgetId: string
  initialCount?: number
}

export function BudgetNotesIcon({ budgetId, initialCount = 0 }: BudgetNotesIconProps) {
  const [notes, setNotes] = useState<BudgetNote[]>([])
  const [notesCount, setNotesCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const loadNotes = async () => {
    setLoading(true)
    const result = await getBudgetNotes(budgetId)
    if (result.success && Array.isArray(result.data)) {
      setNotes(result.data)
      setNotesCount(result.data.length)
    }
    setLoading(false)
  }

  // Cargar notas cuando se abre el popover
  useEffect(() => {
    if (popoverOpen && notes.length === 0) {
      loadNotes()
    }
  }, [popoverOpen])

  const handleNotesUpdated = () => {
    loadNotes()
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es
      })
    } catch (error) {
      return dateString
    }
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <NotebookPen className="h-4 w-4 text-blue-600" />
            {notesCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-blue-600 text-white"
              >
                {notesCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Notas del presupuesto</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  setPopoverOpen(false)
                  setDialogOpen(true)
                }}
              >
                Editar
              </Button>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Cargando notas...
              </div>
            ) : notes.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No hay notas aún. Haz clic en "Editar" para añadir una.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="border-l-2 border-blue-600 pl-3 py-1"
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {note.users?.name || 'Usuario'} • {formatDate(note.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <BudgetNotesDialog
        budgetId={budgetId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onNotesUpdated={handleNotesUpdated}
      />
    </>
  )
}
