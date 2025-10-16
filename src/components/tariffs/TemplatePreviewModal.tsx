"use client"

import { useState } from 'react'
import { PDFTemplate } from '@/app/actions/config'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'

interface TemplatePreviewModalProps {
  template: PDFTemplate | null
  open: boolean
  onClose: () => void
}

export function TemplatePreviewModal({ template, open, onClose }: TemplatePreviewModalProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  if (!template || !template.sections || template.sections.length === 0) {
    return null
  }

  // Extraer información de la sección actual
  const currentSection = template.sections[currentSectionIndex]
  const sectionKey = Object.keys(currentSection)[0]
  const sectionData = currentSection[sectionKey]

  const hasMultipleSections = template.sections.length > 1
  const isFirstSection = currentSectionIndex === 0
  const isLastSection = currentSectionIndex === template.sections.length - 1

  const handlePrevious = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (!isLastSection) {
      setCurrentSectionIndex(prev => prev + 1)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentSectionIndex(0) // Reset al cerrar
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[80vw] h-[90vh] p-6 flex flex-col overflow-hidden">
        {/* Línea 1: Botón Cerrar a la derecha */}
        <div className="flex justify-end mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Cerrar
          </Button>
        </div>

        {/* Línea 2: Navegación */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={isFirstSection || !hasMultipleSections}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="text-sm font-medium text-gray-700">
            Sección {currentSectionIndex + 1} de {template.sections.length}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={isLastSection || !hasMultipleSections}
            className="flex items-center gap-1"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Línea 3: Vista Previa */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">Vista Previa</h2>

        {/* Línea 4: Plantilla: {nombre} */}
        <div className="mb-1">
          <span className="text-base font-semibold text-gray-900">Plantilla: </span>
          <span className="text-base text-gray-900">{template.name}</span>
        </div>

        {/* Línea 5: Descripción de la plantilla */}
        <p className="text-sm text-gray-600 mb-3">
          {template.description}
        </p>

        {/* Línea 6: Título de la sección */}
        <h3 className="text-lg font-semibold text-cyan-700 mb-3">
          {sectionData.title}
        </h3>

        {/* Línea 7: Imagen (tamaño reducido, sin scroll) */}
        <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden mb-3 min-h-0">
          <Image
            src={sectionData.preview_url}
            alt={sectionData.title}
            fill
            className="object-contain"
            sizes="80vw"
            unoptimized
          />
        </div>

        {/* Línea 8: Descripción de la sección */}
        <div className="bg-lime-50 border border-lime-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            {sectionData.description}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
