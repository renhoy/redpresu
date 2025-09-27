'use client'

import { useState } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { HierarchyPreview } from './HierarchyPreview'
import { processCSV } from '@/app/actions/tariffs'

interface CSVUploadPreviewProps {
  data: unknown
  error?: string
  onChange: (data: unknown) => void
}

export function CSVUploadPreview({ data, error, onChange }: CSVUploadPreviewProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [processingErrors, setProcessingErrors] = useState<unknown[]>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setProcessingErrors([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await processCSV(formData)

      if (result.success && result.jsonData) {
        onChange(result.jsonData)
      } else {
        setProcessingErrors(result.errors || [{ message: 'Error al procesar el CSV' }])
      }
    } catch (error) {
      console.error('Error processing CSV:', error)
      setProcessingErrors([{ message: 'Error inesperado al procesar el archivo' }])
    } finally {
      setIsProcessing(false)
      // Limpiar el input file
      event.target.value = ''
    }
  }

  const handleDeleteCSV = () => {
    onChange(null)
    setProcessingErrors([])
    setShowDeleteDialog(false)
  }

  // Estado inicial: sin datos CSV cargados
  if (!data) {
    return (
      <Card className="sticky top-24">
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
                    className="cursor-pointer inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    {isProcessing ? 'Procesando...' : 'Seleccionar archivo CSV'}
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

            {/* Información explicativa */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Formato CSV requerido
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• <strong>Separador:</strong> coma (,) o punto y coma (;)</p>
                <p>• <strong>Codificación:</strong> UTF-8</p>
                <p>• <strong>Columnas obligatorias:</strong></p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>nivel (chapter, subchapter, section, item)</li>
                  <li>nombre</li>
                  <li>descripcion</li>
                  <li>cantidad (para items)</li>
                  <li>unidad (para items)</li>
                  <li>iva_porcentaje (para items)</li>
                  <li>pvp (para items)</li>
                </ul>
              </div>
            </div>

            {/* Errores de procesamiento */}
            {processingErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive mb-2">
                      Errores en el archivo CSV
                    </h4>
                    <div className="space-y-1">
                      {processingErrors.map((error, index) => (
                        <p key={index} className="text-sm text-destructive">
                          {error.line ? `Línea ${error.line}: ` : ''}{error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
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
    )
  }

  // Estado con datos CSV cargados: mostrar preview
  return (
    <Card className="sticky top-24">
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
        <HierarchyPreview data={data} />
      </CardContent>

      {/* Dialog de confirmación para borrar CSV */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar datos CSV cargados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la estructura de tarifa cargada.
              Tendrá que volver a subir el archivo CSV.
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
  )
}