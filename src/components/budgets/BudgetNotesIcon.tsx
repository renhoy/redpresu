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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BudgetNotesDialog } from './BudgetNotesDialog'
import { getBudgetNotes, type BudgetNote } from '@/app/actions/budget-notes'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface BudgetNotesIconProps {
  budgetId: string
  initialCount?: number
  className?: string
}

export function BudgetNotesIcon({ budgetId, initialCount = 0, className = '' }: BudgetNotesIconProps) {
  const [notes, setNotes] = useState<BudgetNote[]>([])
  const [notesCount, setNotesCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const loadNotes = async () => {
    console.log('[BudgetNotesIcon] Loading notes for budget:', budgetId)
    setLoading(true)
    const result = await getBudgetNotes(budgetId)
    console.log('[BudgetNotesIcon] Result:', result)
    if (result.success && Array.isArray(result.data)) {
      setNotes(result.data)
      setNotesCount(result.data.length)
      console.log('[BudgetNotesIcon] Notes loaded:', result.data.length)
    } else {
      console.error('[BudgetNotesIcon] Error loading notes:', result.error)
    }
    setLoading(false)
  }

  // Cargar contador de notas al inicio
  useEffect(() => {
    loadNotes()
  }, [budgetId])

  // Recargar notas cuando se abre el popover
  useEffect(() => {
    if (popoverOpen) {
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
      <TooltipProvider>
        <Tooltip>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`relative h-7 w-7 border-lime-500 text-lime-500 hover:bg-lime-50 hover:text-lime-600 ${className}`}
                  onClick={(e) => {
                    console.log('[BudgetNotesIcon] Button clicked')
                    e.stopPropagation()
                  }}
                >
                  <NotebookPen className="h-3.5 w-3.5 flex-shrink-0" />
                  {notesCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-lime-500 text-white"
                    >
                      {notesCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notas</p>
            </TooltipContent>
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
                      console.log('[BudgetNotesIcon] Editar button clicked')
                      e.stopPropagation()
                      setPopoverOpen(false)
                      setDialogOpen(true)
                      console.log('[BudgetNotesIcon] Dialog should open now')
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
                        className="border-l-2 border-lime-600 pl-3 py-1"
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {note.content}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {note.users?.nombre || 'Usuario'} • {formatDate(note.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </Tooltip>
      </TooltipProvider>

      <BudgetNotesDialog
        budgetId={budgetId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onNotesUpdated={handleNotesUpdated}
      />
    </>
  )
}
