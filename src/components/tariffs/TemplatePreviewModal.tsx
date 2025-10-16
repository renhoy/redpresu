"use client"

import { useState } from 'react'
import { PDFTemplate } from '@/app/actions/config'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Vista Previa de Plantilla
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la plantilla */}
          <div className="border-b pb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {template.description}
            </p>
          </div>

          {/* Información de la sección actual */}
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-cyan-700">
                {sectionData.title}
              </h4>
            </div>

            {/* Preview de la imagen en proporción A4 */}
            <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '210/297' }}>
              <Image
                src={sectionData.preview_url}
                alt={sectionData.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
                priority
              />
            </div>

            {/* Descripción de la sección */}
            <div className="bg-lime-50 border border-lime-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                {sectionData.description}
              </p>
            </div>
          </div>

          {/* Navegación entre secciones */}
          {hasMultipleSections && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstSection}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="text-sm text-gray-600">
                Sección {currentSectionIndex + 1} de {template.sections.length}
              </div>

              <Button
                variant="outline"
                onClick={handleNext}
                disabled={isLastSection}
                className="flex items-center gap-2"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Botón cerrar */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
