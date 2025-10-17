'use client'

import { useState } from 'react'
import { Edit, Copy, Check } from 'lucide-react'
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
import { toast } from 'sonner'

interface RichTextEditorDialogProps {
  value: string
  onChange: (html: string) => void
  label: string
  description?: string
  placeholder?: string
  disabled?: boolean
  buttonOnly?: boolean
}

export function RichTextEditorDialog({
  value,
  onChange,
  label,
  description,
  placeholder = 'Escribe aquí...',
  disabled = false,
  buttonOnly = false
}: RichTextEditorDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState(value)
  const [copied, setCopied] = useState(false)

  const handleOpen = () => {
    setTempValue(value)
    setIsOpen(true)
    setCopied(false) // Reset copied state when opening
  }

  const handleSave = () => {
    onChange(tempValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsOpen(false)
  }

  const handleCopyHTML = async () => {
    try {
      // Escapar el HTML para que sea compatible con JSON
      // Reemplazar comillas dobles por comillas simples y escapar backslashes
      const jsonSafeHTML = tempValue
        .replace(/\\/g, '\\\\')  // Escapar backslashes primero
        .replace(/"/g, '\\"')     // Escapar comillas dobles
        .replace(/\n/g, '\\n')    // Escapar saltos de línea
        .replace(/\r/g, '\\r')    // Escapar retornos de carro
        .replace(/\t/g, '\\t')    // Escapar tabulaciones

      await navigator.clipboard.writeText(jsonSafeHTML)
      setCopied(true)
      toast.success('HTML copiado al portapapeles (compatible JSON)')

      // Reset icon after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast.error('Error al copiar al portapapeles')
    }
  }

  // Convertir HTML a texto plano para preview
  const getPlainText = (html: string) => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

  const plainText = getPlainText(value)
  const preview = plainText.trim() ? (plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText) : 'Sin contenido'

  // Si buttonOnly es true, solo mostrar el botón (usado en labels)
  if (buttonOnly) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpen}
            disabled={disabled}
            className="gap-2 bg-cyan-600 text-white hover:bg-cyan-700 hover:text-white border-cyan-600"
          >
            <Edit className="h-3 w-3" />
            Editar
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[80vw] h-[80vh] max-w-none flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>{label}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <RichTextEditor
              value={tempValue}
              onChange={setTempValue}
              placeholder={placeholder}
              disabled={disabled}
            />
          </div>

          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyHTML}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar HTML
                </>
              )}
            </Button>
            <div className="flex gap-2">
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
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Modo completo con preview
  return (
    <>
      {/* Campo de solo lectura con preview - Clicable */}
      <div
        className="bg-gray-50 border border-gray-300 rounded-md p-3 min-h-[80px] text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleOpen()
          }
        }}
      >
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">Sin contenido</p>' }}
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[80vw] h-[80vh] max-w-none flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{label}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <RichTextEditor
              value={tempValue}
              onChange={setTempValue}
              placeholder={placeholder}
              disabled={disabled}
            />
          </div>

          <DialogFooter className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyHTML}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar HTML
                </>
              )}
            </Button>
            <div className="flex gap-2">
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
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
