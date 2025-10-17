"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Eye } from "lucide-react";
import { getPDFTemplatesAction, type PDFTemplate } from "@/app/actions/config";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

interface TemplateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function TemplateSelector({
  value,
  onChange,
  error,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    // Cargar plantillas desde la configuración
    async function loadTemplates() {
      try {
        const result = await getPDFTemplatesAction();

        if (result.success && result.data) {
          setTemplates(result.data);
        } else {
          console.error("[TemplateSelector] Error:", result.error);
          // Fallback a plantillas por defecto
          setTemplates([
            {
              id: "modern",
              name: "Moderna",
              description: "Diseño limpio y minimalista",
            },
            {
              id: "classic",
              name: "Clásica",
              description: "Diseño tradicional profesional",
            },
            {
              id: "elegant",
              name: "Elegante",
              description: "Diseño sofisticado con detalles",
            },
          ]);
        }
      } catch (error) {
        console.error("[TemplateSelector] Error loading templates:", error);
        // Fallback a plantillas por defecto
        setTemplates([
          {
            id: "modern",
            name: "Moderna",
            description: "Diseño limpio y minimalista",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplates();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === value);

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
                Selecciona el diseño visual que se aplicará al PDF del
                presupuesto. Cada plantilla tiene un estilo único.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger
          className={`bg-white ${error ? "border-destructive" : ""}`}
        >
          <SelectValue placeholder="Selecciona una plantilla" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}

      {/* Botón de preview */}
      {selectedTemplate &&
        selectedTemplate.sections &&
        selectedTemplate.sections.length > 0 && (
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-2 text-cyan-600 border-cyan-600 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4" />
              Vista Previa de {selectedTemplate.name}
            </Button>
          </div>
        )}

      {/* Modal de preview */}
      <TemplatePreviewModal
        template={selectedTemplate}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
