'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TariffFormFields } from './TariffFormFields'
import { CSVUploadPreview } from './CSVUploadPreview'
import { createTariff, updateTariff, type TariffFormData } from '@/app/actions/tariffs'
import { Database } from '@/lib/types/database.types'

type Tariff = Database['public']['Tables']['tariffs']['Row']

interface TariffFormProps {
  mode: 'create' | 'edit'
  initialData?: Tariff
}

export function TariffForm({ mode, initialData }: TariffFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<TariffFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    validity: initialData?.validity || 30,
    status: (initialData?.status as 'Activa' | 'Inactiva') || 'Activa',
    logo_url: initialData?.logo_url || '',
    name: initialData?.name || '',
    nif: initialData?.nif || '',
    address: initialData?.address || '',
    contact: initialData?.contact || '',
    template: initialData?.template || '41200-00001',
    primary_color: initialData?.primary_color || '#e8951c',
    secondary_color: initialData?.secondary_color || '#109c61',
    summary_note: initialData?.summary_note || '',
    conditions_note: initialData?.conditions_note || '',
    legal_note: initialData?.legal_note || '',
    json_tariff_data: initialData?.json_tariff_data || null
  })

  const [csvData, setCsvData] = useState<unknown>(initialData?.json_tariff_data || null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isFormValid = () => {
    const requiredFields = [
      'title', 'validity', 'status', 'logo_url', 'name', 'nif',
      'address', 'contact', 'template', 'primary_color', 'secondary_color',
      'summary_note', 'conditions_note', 'legal_note'
    ]

    const hasRequiredFields = requiredFields.every(field =>
      formData[field as keyof TariffFormData]
    )

    const hasCSVData = csvData !== null

    return hasRequiredFields && hasCSVData
  }

  const handleSave = async () => {
    if (!isFormValid()) {
      // Mostrar errores de validación
      const newErrors: Record<string, string> = {}
      if (!formData.title) newErrors.title = 'El título es obligatorio'
      if (!formData.logo_url) newErrors.logo_url = 'El logo es obligatorio'
      if (!formData.name) newErrors.name = 'El nombre de empresa es obligatorio'
      if (!formData.nif) newErrors.nif = 'El NIF es obligatorio'
      if (!formData.address) newErrors.address = 'La dirección es obligatoria'
      if (!formData.contact) newErrors.contact = 'El contacto es obligatorio'
      if (!formData.summary_note) newErrors.summary_note = 'La nota resumen es obligatoria'
      if (!formData.conditions_note) newErrors.conditions_note = 'Las condiciones son obligatorias'
      if (!formData.legal_note) newErrors.legal_note = 'Las notas legales son obligatorias'
      if (!csvData) newErrors.csv = 'Debe cargar un archivo CSV válido'

      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const dataWithCSV = {
        ...formData,
        json_tariff_data: csvData
      }

      let result
      if (mode === 'create') {
        result = await createTariff(dataWithCSV)
      } else {
        result = await updateTariff(initialData!.id, dataWithCSV)
      }

      if (result.success) {
        router.push('/tariffs')
      } else {
        setErrors({ general: result.error || 'Error al guardar la tarifa' })
      }
    } catch {
      setErrors({ general: 'Error inesperado al guardar' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/tariffs')
  }

  const handleFormDataChange = (newData: Partial<TariffFormData>) => {
    setFormData(prev => ({ ...prev, ...newData }))
    // Limpiar errores del campo modificado
    if (errors) {
      const clearedErrors = { ...errors }
      Object.keys(newData).forEach(key => {
        delete clearedErrors[key]
      })
      setErrors(clearedErrors)
    }
  }

  const handleCSVChange = (data: unknown) => {
    setCsvData(data)
    if (errors.csv) {
      const clearedErrors = { ...errors }
      delete clearedErrors.csv
      setErrors(clearedErrors)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Línea 2: Título + Botones (sticky) */}
      <div className="sticky top-16 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {mode === 'create' ? 'Nueva Tarifa' : 'Editar Tarifa'}
              </h1>
              <p className="text-muted-foreground">
                Complete los datos de la tarifa
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || !isFormValid()}
                className="min-w-[100px]"
              >
                {isLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>

          {/* Mostrar errores generales */}
          {errors.general && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}
        </div>
      </div>

      {/* Línea 3: Contenido (scroll) */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Columna izquierda - Formulario (60%) */}
          <div className="lg:col-span-3">
            <TariffFormFields
              data={formData}
              errors={errors}
              onChange={handleFormDataChange}
            />
          </div>

          {/* Columna derecha - CSV y Preview (40%) */}
          <div className="lg:col-span-2">
            <CSVUploadPreview
              data={csvData}
              error={errors.csv}
              onChange={handleCSVChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}