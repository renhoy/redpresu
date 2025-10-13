'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileJson, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { importTariffs } from '@/app/actions/import'
import { toast } from 'sonner'
import Link from 'next/link'

export function ImportTariffsForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ count: number } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]

    if (!selectedFile) {
      setFile(null)
      return
    }

    // Validar tipo de archivo
    if (!selectedFile.name.endsWith('.json')) {
      setError('Solo se permiten archivos JSON')
      setFile(null)
      return
    }

    // Validar tamaño (máximo 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máximo 5MB)')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(null)
  }

  const handleImport = async () => {
    if (!file) {
      setError('Selecciona un archivo')
      return
    }

    setImporting(true)
    setError(null)
    setSuccess(null)

    try {
      // Leer archivo
      const content = await file.text()

      // Importar
      const result = await importTariffs(content)

      if (result.success && result.data) {
        setSuccess({ count: result.data.count })
        toast.success(`${result.data.count} tarifa(s) importada(s)`)
        setFile(null)

        // Resetear input
        const input = document.getElementById('file-input') as HTMLInputElement
        if (input) input.value = ''

        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push('/tariffs')
        }, 2000)
      } else {
        setError(result.error || 'Error al importar')
        toast.error(result.error || 'Error al importar')
      }
    } catch (e) {
      const errorMsg = 'Error al leer el archivo'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones</CardTitle>
          <CardDescription>
            Cómo importar tarifas correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p className="font-medium">Formato del archivo:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Archivo JSON con un array de tarifas</li>
              <li>Cada tarifa debe tener: <code className="bg-muted px-1">name</code>, <code className="bg-muted px-1">title</code></li>
              <li>Los IDs se regenerarán automáticamente</li>
              <li>Las tarifas se asignarán a tu empresa y usuario</li>
              <li>El campo <code className="bg-muted px-1">is_template</code> se resetea a false</li>
            </ul>
          </div>

          <div className="text-sm space-y-2">
            <p className="font-medium">Campos opcionales:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li><code className="bg-muted px-1">description</code> - Descripción</li>
              <li><code className="bg-muted px-1">hierarchy_data</code> - Datos jerárquicos</li>
              <li><code className="bg-muted px-1">validity_days</code> - Días de validez</li>
              <li><code className="bg-muted px-1">status</code> - Estado (Activa/Inactiva)</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Nota:</strong> Puedes exportar tarifas existentes para obtener un ejemplo del formato correcto.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar archivo</CardTitle>
          <CardDescription>
            Sube un archivo JSON con las tarifas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input file */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="file-input"
              className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-cyan-500 hover:bg-cyan-50/50 transition-colors"
            >
              <FileJson className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {file ? file.name : 'Haz clic para seleccionar un archivo'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JSON (máximo 5MB)
                </p>
              </div>
            </label>
            <input
              id="file-input"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Mensajes */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>¡Éxito!</strong> {success.count} tarifa(s) importada(s). Redirigiendo...
              </AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              asChild
              disabled={importing}
            >
              <Link href="/tariffs">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancelar
              </Link>
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? 'Importando...' : 'Importar Tarifas'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
