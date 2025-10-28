"use client";

import { useState } from "react";
import { PDFTemplate } from "@/app/actions/config";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";

interface TemplatePreviewModalProps {
  template: PDFTemplate | null;
  open: boolean;
  onClose: () => void;
}

export function TemplatePreviewModal({
  template,
  open,
  onClose,
}: TemplatePreviewModalProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  if (!template || !template.sections || template.sections.length === 0) {
    return null;
  }

  // Extraer información de la sección actual
  const currentSection = template.sections[currentSectionIndex];
  const sectionKey = Object.keys(currentSection)[0];
  const sectionData = currentSection[sectionKey];

  const hasMultipleSections = template.sections.length > 1;
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === template.sections.length - 1;

  const handlePrevious = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (!isLastSection) {
      setCurrentSectionIndex((prev) => prev + 1);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentSectionIndex(0); // Reset al cerrar
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[80vw] h-[90vh] p-6 flex flex-col overflow-hidden">
        {/* Línea 2: Navegación */}
        <div className="flex items-center justify-between mt-8 mb-2">
          <div className="text-sm font-medium text-gray-700">
            Sección {currentSectionIndex + 1} de {template.sections.length}
          </div>
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

        {/* Línea 3: Vista Previa Plantilla: {nombre} */}
        <div className="mb-1">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Vista Previa de Plantilla: {template.name}
          </DialogTitle>
          {/* Línea 4: Descripción de la plantilla */}
          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
        </div>

        {/* Línea 5: Imagen (ocupa espacio restante) */}
        <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden mb-3 min-h-0">
          <Image
            src={sectionData.preview_url}
            alt={sectionData.title}
            fill
            className="object-contain"
            sizes="90vw"
            unoptimized
          />
        </div>

        {/* Línea 6: Título de la sección */}
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          {sectionData.title}
        </h3>

        {/* Línea 7: Descripción de la sección */}
        <div className="bg-lime-50 border border-lime-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">{sectionData.description}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
