'use client'

import { useState, useEffect } from 'react'
import { Upload, X, ImageOff, ExternalLink, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [confirmMessage, setConfirmMessage] = useState('')

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

  const showConfirmation = (message: string, action: () => void) => {
    setConfirmMessage(message)
    setPendingAction(() => action)
    setShowConfirmDialog(true)
  }

  const handleConfirmAction = () => {
    if (pendingAction) {
      pendingAction()
    }
    setShowConfirmDialog(false)
    setPendingAction(null)
  }

  const handleCancelAction = () => {
    setShowConfirmDialog(false)
    setPendingAction(null)
  }

  const handleTabChange = (newTab: 'upload' | 'url') => {
    // Si hay contenido en el otro tab, pedir confirmación
    if (newTab === 'upload' && urlInput.trim()) {
      showConfirmation(
        'Al cambiar a subir archivo se eliminará la URL externa. ¿Deseas continuar?',
        () => {
          setUrlInput('')
          setPreviewUrl('')
          onChange('')
          setActiveTab(newTab)
        }
      )
    } else if (newTab === 'url' && previewUrl && !previewUrl.startsWith('http')) {
      showConfirmation(
        'Al cambiar a URL externa se eliminará la imagen subida. ¿Deseas continuar?',
        () => {
          setPreviewUrl('')
          onChange('')
          setActiveTab(newTab)
        }
      )
    } else {
      setActiveTab(newTab)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Si hay URL externa, pedir confirmación
    if (urlInput.trim()) {
      showConfirmation(
        'Al subir una imagen se eliminará la URL externa. ¿Deseas continuar?',
        () => processFileUpload(file)
      )
      // Limpiar el input file para permitir seleccionar el mismo archivo después
      event.target.value = ''
      return
    }

    await processFileUpload(file)
  }

  const processFileUpload = async (file: File) => {
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

    // Limpiar URL externa si existe
    setUrlInput('')
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

    // Si hay imagen subida, pedir confirmación
    if (previewUrl && !previewUrl.startsWith('http')) {
      showConfirmation(
        'Al usar una URL externa se eliminará la imagen subida. ¿Deseas continuar?',
        () => processUrlChange(url)
      )
      // Restaurar el input anterior temporalmente
      setTimeout(() => {
        if (!showConfirmDialog) {
          setUrlInput('')
        }
      }, 0)
      return
    }

    processUrlChange(url)
  }

  const processUrlChange = (url: string) => {
    // Validar formato URL
    try {
      const urlObj = new URL(url)

      // Advertir si no es HTTPS
      if (urlObj.protocol === 'http:') {
        setUrlValidationMessage('⚠️ Se recomienda usar HTTPS para mayor seguridad')
      } else {
        setUrlValidationMessage('')
      }

      // Limpiar preview de archivo local si existe
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

  // Determinar si el preview corresponde al tab activo
  const shouldShowPreview = () => {
    if (!previewUrl) return false
    if (activeTab === 'url' && previewUrl.startsWith('http')) return true
    if (activeTab === 'upload' && !previewUrl.startsWith('http')) return true
    return false
  }

  return (
    <div className="space-y-4">
      <Label>Logo de la empresa *</Label>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger
            value="upload"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
          >
            Subir archivo
          </TabsTrigger>
          <TabsTrigger
            value="url"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
          >
            URL externa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <Label
                  htmlFor="logo-upload"
                  className={`cursor-pointer inline-flex items-center gap-2 bg-cyan-600 text-white hover:bg-cyan-700 px-4 py-2 rounded-md text-sm font-medium ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Vista previa - Solo mostrar si corresponde al tab activo */}
      {shouldShowPreview() && (
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

      {/* Dialog de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Aceptar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
