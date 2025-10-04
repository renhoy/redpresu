'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import Image from 'next/image'

interface PDFTemplate {
  id: string
  name: string
  description: string
}

interface TemplateSelectorProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function TemplateSelector({ value, onChange, error }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PDFTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Cargar plantillas desde la configuración
    async function loadTemplates() {
      try {
        // Por ahora usamos plantillas hardcoded, pero en el futuro
        // podríamos cargar desde un endpoint que lea la config
        const defaultTemplates: PDFTemplate[] = [
          { id: 'modern', name: 'Moderna', description: 'Diseño limpio y minimalista' },
          { id: 'classic', name: 'Clásica', description: 'Diseño tradicional profesional' },
          { id: 'elegant', name: 'Elegante', description: 'Diseño sofisticado con detalles' }
        ]

        setTemplates(defaultTemplates)
      } catch (error) {
        console.error('[TemplateSelector] Error loading templates:', error)
        // Fallback a plantillas por defecto
        setTemplates([
          { id: 'modern', name: 'Moderna', description: 'Diseño limpio y minimalista' }
        ])
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplates()
  }, [])

  const selectedTemplate = templates.find(t => t.id === value)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Label htmlFor="template">Plantilla PDF *</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Selecciona el diseño visual que se aplicará al PDF del presupuesto.
                Cada plantilla tiene un estilo único.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Select
        value={value}
        onValueChange={onChange}
        disabled={isLoading}
      >
        <SelectTrigger className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder="Selecciona una plantilla" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{template.name}</span>
                <span className="text-xs text-muted-foreground">
                  - {template.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

      {/* Preview hover tooltip */}
      {selectedTemplate && (
        <div className="mt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                  <Info className="h-3 w-3" />
                  Ver preview de {selectedTemplate.name}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-0">
                <div className="relative w-64 h-80">
                  <Image
                    src={`/templates/${selectedTemplate.id}-preview.png`}
                    alt={`Preview ${selectedTemplate.name}`}
                    fill
                    className="object-contain rounded"
                    onError={(e) => {
                      // Fallback si no existe la imagen
                      e.currentTarget.src = '/templates/placeholder.png'
                    }}
                  />
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
