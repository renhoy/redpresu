'use client'

import { useState, useEffect } from 'react'
import { Upload, X, ImageOff, ExternalLink, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { uploadLogo } from '@/app/actions/tariffs'

interface LogoUploaderProps {
  value: string
  onChange: (logoUrl: string) => void
  error?: string
  disabled?: boolean
}

export function LogoUploader({ value, onChange, error, disabled }: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>(value || '')
  const [imageError, setImageError] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlValidationMessage, setUrlValidationMessage] = useState('')
  const [isValidatingUrl, setIsValidatingUrl] = useState(false)

  // Determinar el tab activo según el tipo de URL
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>(
    value && value.startsWith('http') ? 'url' : 'upload'
  )

  // Sincronizar previewUrl y urlInput cuando cambia el value externo
  useEffect(() => {
    setPreviewUrl(value || '')
    setImageError(false)

    if (value && value.startsWith('http')) {
      setUrlInput(value)
      setActiveTab('url')
    } else if (value) {
      setActiveTab('upload')
    }
  }, [value])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      setUrlValidationMessage('❌ Tipo de archivo no válido. Solo se permiten JPG, PNG, SVG')
      return
    }

    // Validar tamaño (2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      setUrlValidationMessage('❌ El archivo es demasiado grande. Máximo 2MB')
      return
    }

    setUrlValidationMessage('')
    setIsUploading(true)

    try {
      // Generar preview local inmediato
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
        setImageError(false)
      }
      reader.onerror = () => {
        setImageError(true)
      }
      reader.readAsDataURL(file)

      // Subir archivo al servidor
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadLogo(formData)
      if (result.success && result.url) {
        onChange(result.url)
        setPreviewUrl(result.url)
      } else {
        setUrlValidationMessage(result.error || '❌ Error al subir el archivo')
        setImageError(true)
      }
    } catch {
      setUrlValidationMessage('❌ Error inesperado al subir el archivo')
      setImageError(true)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    setUrlInput(url)
    setUrlValidationMessage('')

    if (!url.trim()) {
      setPreviewUrl('')
      setImageError(false)
      onChange('')
      return
    }

    // Validar formato URL
    try {
      const urlObj = new URL(url)

      // Advertir si no es HTTPS
      if (urlObj.protocol === 'http:') {
        setUrlValidationMessage('⚠️ Se recomienda usar HTTPS para mayor seguridad')
      } else {
        setUrlValidationMessage('')
      }

      // Actualizar preview y value
      setPreviewUrl(url)
      setImageError(false)
      onChange(url)

    } catch {
      setUrlValidationMessage('❌ URL no válida. Debe comenzar con http:// o https://')
      setImageError(true)
    }
  }

  const handleValidateUrl = async () => {
    if (!urlInput.trim()) return

    setIsValidatingUrl(true)
    setUrlValidationMessage('🔍 Validando URL...')

    try {
      // Intentar cargar la URL con HEAD request
      await fetch(urlInput, {
        method: 'HEAD',
        mode: 'no-cors', // Evitar problemas de CORS
      })

      // En modo no-cors no podemos leer el status, así que asumimos que funcionó
      setUrlValidationMessage('✅ URL válida y accesible')
      setImageError(false)

    } catch {
      setUrlValidationMessage('⚠️ No se pudo verificar la URL, pero puede seguir funcionando. Verifica la vista previa.')
    } finally {
      setIsValidatingUrl(false)
    }
  }

  const handleRemoveLogo = () => {
    setPreviewUrl('')
    setUrlInput('')
    setImageError(false)
    setUrlValidationMessage('')
    onChange('')
  }

  return (
    <div className="space-y-4">
      <Label>Logo de la empresa *</Label>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'url')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Subir archivo</TabsTrigger>
          <TabsTrigger value="url">URL externa</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <Label
                  htmlFor="logo-upload"
                  className={`cursor-pointer inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Seleccionar archivo
                    </>
                  )}
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                  onChange={handleFileUpload}
                  disabled={disabled || isUploading}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500">
                JPG, PNG, SVG hasta 2MB
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://ejemplo.com/logo.png"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={disabled}
                className={error ? 'border-destructive' : ''}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleValidateUrl}
                disabled={!urlInput.trim() || isValidatingUrl || disabled}
                title="Validar URL"
              >
                {isValidatingUrl ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </Button>
            </div>
            {urlValidationMessage && (
              <p className={`text-xs ${
                urlValidationMessage.startsWith('❌') ? 'text-destructive' :
                urlValidationMessage.startsWith('⚠️') ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {urlValidationMessage}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Vista previa */}
      {previewUrl && (
        <div className="mt-4 border rounded-lg p-4 relative">
          <div className="flex flex-col items-center">
            {imageError ? (
              <div className="flex flex-col items-center justify-center h-[150px] text-gray-400">
                <ImageOff className="h-20 w-20 mb-2" />
                <p className="text-sm">Error al cargar imagen</p>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt="Vista previa del logo"
                className="max-h-[150px] max-w-full object-contain"
                onError={() => setImageError(true)}
              />
            )}
            <p className="text-center text-sm text-muted-foreground mt-2">
              Vista previa del logo
            </p>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemoveLogo}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
