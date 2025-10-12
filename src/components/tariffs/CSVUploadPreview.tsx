"use client";

import { useState } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HierarchyPreview } from "./HierarchyPreview";
import { processCSV } from "@/app/actions/tariffs";

interface CSVUploadPreviewProps {
  data: unknown;
  error?: string;
  onChange: (data: unknown) => void;
  primaryColor?: string;
  secondaryColor?: string;
}

export function CSVUploadPreview({
  data,
  error,
  onChange,
  primaryColor,
  secondaryColor,
}: CSVUploadPreviewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processingErrors, setProcessingErrors] = useState<unknown[]>([]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await processCSV(formData);

      if (result.success && result.jsonData) {
        onChange(result.jsonData);
      } else {
        setProcessingErrors(
          result.errors || [{ message: "Error al procesar el CSV" }]
        );
      }
    } catch (error) {
      console.error("Error processing CSV:", error);
      setProcessingErrors([
        { message: "Error inesperado al procesar el archivo" },
      ]);
    } finally {
      setIsProcessing(false);
      // Limpiar el input file
      event.target.value = "";
    }
  };

  const handleDeleteCSV = () => {
    onChange(null);
    setProcessingErrors([]);
    setShowDeleteDialog(false);
  };

  // Estado inicial: sin datos CSV cargados
  if (!data) {
    return (
      <Card className="bg-cyan-50">
        <CardHeader>
          <CardTitle>Estructura Tarifa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selector de archivo */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <FileText className="h-12 w-12 text-gray-400" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Subir archivo CSV
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Suba un archivo CSV con la estructura de la tarifa
                  </p>
                  <Label
                    htmlFor="csv-upload"
                    className="cursor-pointer inline-flex items-center gap-2 bg-cyan-600 text-white hover:bg-cyan-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    {isProcessing ? "Procesando..." : "Seleccionar archivo CSV"}
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Botón de descarga de plantilla */}
            <div className="flex justify-center">
              <a
                href="/tarifa-plantilla.csv"
                download="tarifa-plantilla.csv"
                className="inline-flex items-center gap-2 bg-cyan-600 text-white hover:bg-cyan-700 px-6 py-3 rounded-md text-sm font-medium transition-colors"
              >
                <FileText className="h-4 w-4" />
                Descargar plantilla de ejemplo
              </a>
            </div>

            {/* Información explicativa */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Formato CSV requerido
              </h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  • <strong>Separador:</strong> coma (,) o punto y coma (;)
                </p>
                <p>
                  • <strong>Codificación:</strong> UTF-8
                </p>
                <p>
                  • <strong>Columnas obligatorias:</strong> Nivel, ID, Nombre, Descripción, Ud, %IVA, PVP
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>
                    <strong>Nivel:</strong> Capítulo, Subcapítulo, Apartado o Partida
                  </li>
                  <li>
                    <strong>ID:</strong> Numérico jerárquico (ejemplos: 1, 1.1, 1.1.1, 1.1.1.1)
                  </li>
                  <li>
                    Los demás campos son texto o números según corresponda
                  </li>
                </ul>
              </div>
            </div>

            {/* Errores y advertencias de procesamiento */}
            {processingErrors.length > 0 && (
              <div className="space-y-3">
                {/* Separar errores de advertencias */}
                {processingErrors.filter((e) => e.severity !== 'warning').length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-900 mb-2">
                          ❌ Errores encontrados (bloquean la importación)
                        </h4>
                        <div className="space-y-2">
                          {processingErrors
                            .filter((e) => e.severity !== 'warning')
                            .map((error, index) => (
                              <div key={index} className="text-sm text-red-800">
                                <p className="mb-1">
                                  {error.line ? `Línea ${error.line}: ` : ""}
                                  {error.message.replace('Descarga plantilla: /tarifa-plantilla.csv', '')}
                                </p>
                                {error.message.includes('/tarifa-plantilla.csv') && (
                                  <a
                                    href="/tarifa-plantilla.csv"
                                    download="tarifa-plantilla.csv"
                                    className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-900 underline font-medium"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Descargar plantilla de ejemplo
                                  </a>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advertencias */}
                {processingErrors.filter((e) => e.severity === 'warning').length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-900 mb-2">
                          ⚠️ Advertencias encontradas (no bloquean la importación)
                        </h4>
                        <div className="space-y-2">
                          {processingErrors
                            .filter((e) => e.severity === 'warning')
                            .map((warning, index) => (
                              <p key={index} className="text-sm text-yellow-800">
                                {warning.message}
                              </p>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error general del formulario */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado con datos CSV cargados: mostrar preview
  return (
    <Card className="bg-cyan-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Previsualización Tarifa</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 w-8 p-0 hover:bg-destructive/10"
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <HierarchyPreview
          data={data}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </CardContent>

      {/* Dialog de confirmación para borrar CSV */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar datos CSV cargados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la estructura de tarifa cargada. Tendrá que
              volver a subir el archivo CSV.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCSV}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
