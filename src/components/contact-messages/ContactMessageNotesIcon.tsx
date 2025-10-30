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
import { ContactMessageDialog } from './ContactMessageDialog'
import { getContactMessageNotes, type ContactMessageNote } from '@/app/actions/contact-message-notes'
import { getContactMessageById } from '@/app/actions/contact-messages'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ContactMessageNotesIconProps {
  messageId: string
  initialCount?: number
  className?: string
  variant?: 'icon' | 'button'
  'data-tour'?: string
}

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  status: "nuevo" | "leido" | "respondido";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function ContactMessageNotesIcon({
  messageId,
  initialCount = 0,
  className = '',
  variant = 'icon',
  'data-tour': dataTour
}: ContactMessageNotesIconProps) {
  const router = useRouter()
  const [notes, setNotes] = useState<ContactMessageNote[]>([])
  const [notesCount, setNotesCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<ContactMessage | null>(null)
  const [loadingMessage, setLoadingMessage] = useState(false)

  const loadNotes = async () => {
    console.log('[ContactMessageNotesIcon] Loading notes for message:', messageId)
    setLoading(true)
    const result = await getContactMessageNotes(messageId)
    console.log('[ContactMessageNotesIcon] Result:', result)
    if (result.success && Array.isArray(result.data)) {
      setNotes(result.data)
      setNotesCount(result.data.length)
      console.log('[ContactMessageNotesIcon] Notes loaded:', result.data.length)
    } else {
      console.error('[ContactMessageNotesIcon] Error loading notes:', result.error)
    }
    setLoading(false)
  }

  const loadMessage = async () => {
    console.log('[ContactMessageNotesIcon] Loading message:', messageId)
    setLoadingMessage(true)
    const result = await getContactMessageById(messageId)
    console.log('[ContactMessageNotesIcon] Message result:', result)

    if (result.success && result.data) {
      setCurrentMessage(result.data)
      setPopoverOpen(false)
      setDialogOpen(true)
    } else {
      toast.error('Error al cargar el mensaje')
      console.error('[ContactMessageNotesIcon] Error loading message:', result.error)
    }
    setLoadingMessage(false)
  }

  // Cargar contador de notas al inicio
  useEffect(() => {
    loadNotes()
  }, [messageId])

  // Recargar notas cuando se abre el popover
  useEffect(() => {
    if (popoverOpen) {
      loadNotes()
    }
  }, [popoverOpen])

  const handleNotesUpdated = (updatedMessage: ContactMessage) => {
    setCurrentMessage(updatedMessage)
    loadNotes()
    router.refresh()
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
                  size={variant === 'icon' ? 'icon' : 'sm'}
                  className={variant === 'icon' ? `relative h-9 w-9 border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white ${className}` : `relative h-7 px-2 gap-1.5 text-xs border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white ${className}`}
                  onClick={(e) => {
                    console.log('[ContactMessageNotesIcon] Button clicked')
                    e.stopPropagation()
                  }}
                  data-tour={dataTour}
                >
                  <NotebookPen className={variant === 'icon' ? 'h-4 w-4' : 'h-3.5 w-3.5 flex-shrink-0'} />
                  {variant === 'button' && <span>Notas</span>}
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
              <p>Notas internas</p>
            </TooltipContent>
            <PopoverContent
              className="w-80 p-0"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Notas internas</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      console.log('[ContactMessageNotesIcon] Ver todas button clicked')
                      e.stopPropagation()
                      loadMessage()
                    }}
                    disabled={loadingMessage}
                  >
                    {loadingMessage ? 'Cargando...' : 'Ver todas'}
                  </Button>
                </div>

                {loading ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Cargando notas...
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No hay notas aún. Haz clic en &quot;Ver todas&quot; para añadir una.
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
                          {note.users?.name || 'Usuario'} • {formatDate(note.created_at)}
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

      {currentMessage && (
        <ContactMessageDialog
          message={currentMessage}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpdate={handleNotesUpdated}
        />
      )}
    </>
  )
}
