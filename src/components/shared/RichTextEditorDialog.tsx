'use client'

import { useState } from 'react'
import { Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { RichTextEditor } from './RichTextEditor'

interface RichTextEditorDialogProps {
  value: string
  onChange: (html: string) => void
  label: string
  description?: string
  placeholder?: string
  disabled?: boolean
}

export function RichTextEditorDialog({
  value,
  onChange,
  label,
  description,
  placeholder = 'Escribe aquí...',
  disabled = false
}: RichTextEditorDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  const handleOpen = () => {
    setTempValue(value)
    setIsOpen(true)
  }

  const handleSave = () => {
    onChange(tempValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsOpen(false)
  }

  // Convertir HTML a texto plano para preview
  const getPlainText = (html: string) => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

  const plainText = getPlainText(value)
  const preview = plainText.trim() ? (plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText) : 'Sin contenido'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        {/* Campo de solo lectura con preview */}
        <div className="relative">
          <div className="bg-gray-50 border border-gray-300 rounded-md p-3 pr-24 min-h-[80px] text-sm text-gray-700">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">Sin contenido</p>' }}
            />
          </div>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpen}
              disabled={disabled}
              className="absolute top-2 right-2 gap-2 bg-cyan-600 text-white hover:bg-cyan-700 border-cyan-600"
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
          </DialogTrigger>
        </div>
      </div>

      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(80vh-200px)]">
          <RichTextEditor
            value={tempValue}
            onChange={setTempValue}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="border-gray-600 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
