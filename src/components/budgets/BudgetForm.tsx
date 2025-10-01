"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Tariff, Budget } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, ArrowRight, Trash2, Save, FileStack, Loader2, Check } from 'lucide-react'
import { BudgetHierarchyForm } from './BudgetHierarchyForm'
import { createDraftBudget, updateBudgetDraft, saveBudget, generateBudgetPDF } from '@/app/actions/budgets'
import { toast } from 'sonner'

interface BudgetFormProps {
  tariff: Tariff
  existingBudget?: Budget | null
}

interface ClientData {
  client_type: 'particular' | 'autonomo' | 'empresa' | ''
  client_name: string
  client_nif_nie: string
  client_phone: string
  client_email: string
  client_web?: string
  client_address: string
  client_postal_code: string
  client_locality: string
  client_province: string
  client_acceptance: boolean
}

export function BudgetForm({ tariff, existingBudget }: BudgetFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [budgetData, setBudgetData] = useState<unknown[]>([])
  const [budgetId, setBudgetId] = useState<string | null>(existingBudget?.id || null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'generated'>('idle')
  const [totals, setTotals] = useState<{ base: number; total: number }>({ base: 0, total: 0 })
  const [clientData, setClientData] = useState<ClientData>({
    client_type: (existingBudget?.client_type as ClientData['client_type']) || 'empresa',
    client_name: existingBudget?.client_name || '',
    client_nif_nie: existingBudget?.client_nif_nie || '',
    client_phone: existingBudget?.client_phone || '',
    client_email: existingBudget?.client_email || '',
    client_web: existingBudget?.client_web || '',
    client_address: existingBudget?.client_address || '',
    client_postal_code: existingBudget?.client_postal_code || '',
    client_locality: existingBudget?.client_locality || '',
    client_province: existingBudget?.client_province || '',
    client_acceptance: existingBudget?.client_acceptance || false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isInitialMount = useRef(true)

  // Cargar budgetData del borrador existente
  useEffect(() => {
    if (existingBudget?.json_budget_data) {
      setBudgetData(existingBudget.json_budget_data as unknown[])
      if (Array.isArray(existingBudget.json_budget_data) && existingBudget.json_budget_data.length > 0) {
        setCurrentStep(2) // Si ya tiene datos, mostrar paso 2
      }
    }
  }, [existingBudget])



  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}

    if (!clientData.client_type) {
      newErrors.client_type = 'Tipo de cliente es obligatorio'
    }
    if (!clientData.client_name.trim()) {
      newErrors.client_name = 'Nombre del cliente es obligatorio'
    }
    if (!clientData.client_nif_nie.trim()) {
      newErrors.client_nif_nie = 'NIF/NIE es obligatorio'
    } else {
      // Validación básica según tipo de cliente
      const nifNie = clientData.client_nif_nie.trim().toUpperCase()
      if (clientData.client_type === 'empresa') {
        // NIF empresa: letra + 8 números + letra
        if (!/^[A-Z]\d{8}[A-Z]$/.test(nifNie)) {
          newErrors.client_nif_nie = 'NIF de empresa inválido (formato: A12345678B)'
        }
      } else if (clientData.client_type === 'particular' || clientData.client_type === 'autonomo') {
        // DNI: 8 números + letra O NIE: letra + 7 números + letra
        if (!/^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(nifNie)) {
          newErrors.client_nif_nie = 'DNI/NIE inválido'
        }
      }
    }
    if (!clientData.client_phone.trim()) {
      newErrors.client_phone = 'Teléfono es obligatorio'
    }
    if (!clientData.client_email.trim()) {
      newErrors.client_email = 'Email es obligatorio'
    }
    if (!clientData.client_address.trim()) {
      newErrors.client_address = 'Dirección es obligatoria'
    }
    if (!clientData.client_postal_code.trim()) {
      newErrors.client_postal_code = 'Código Postal es obligatorio'
    }
    if (!clientData.client_locality.trim()) {
      newErrors.client_locality = 'Localidad es obligatoria'
    }
    if (!clientData.client_province.trim()) {
      newErrors.client_province = 'Provincia es obligatoria'
    }
    if (!clientData.client_acceptance) {
      newErrors.client_acceptance = 'Debe aceptar el presupuesto'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Auto-guardado desactivado - solo guardado manual con el botón "Guardar"
  // useEffect(() => {
  //   // Skip en el primer mount
  //   if (isInitialMount.current) {
  //     isInitialMount.current = false
  //     return
  //   }

  //   // Solo auto-guardar si hay datos
  //   if (budgetData.length === 0) return

  //   // Solo auto-guardar si es borrador (los presupuestos guardados no se pueden editar)
  //   if (existingBudget && existingBudget.status !== 'borrador') {
  //     console.log('[Auto-guardado] Saltando auto-guardado porque el presupuesto no es borrador, estado:', existingBudget.status)
  //     return
  //   }

  //   const timer = setTimeout(async () => {
  //     setSaveStatus('saving')

  //     try {
  //       if (budgetId) {
  //         // Actualizar borrador existente
  //         const result = await updateBudgetDraft(budgetId, { budgetData, totals })
  //         if (result.success) {
  //           setSaveStatus('saved')
  //           setTimeout(() => setSaveStatus('idle'), 2000)
  //         } else {
  //           console.error('Error auto-guardando:', result.error)
  //           setSaveStatus('idle')
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Error en auto-guardado:', error)
  //       setSaveStatus('idle')
  //     }
  //   }, 1500)

  //   return () => clearTimeout(timer)
  // }, [budgetData, budgetId, totals, existingBudget])

  const handleStep1Continue = () => {
    // Solo validar y cambiar de paso, sin guardar en BD
    if (validateStep1()) {
      setCurrentStep(2)
    }
  }

  const handleBudgetDataChange = (newBudgetData: unknown[]) => {
    setBudgetData(newBudgetData)
  }

  const handleClearBudgetData = () => {
    // Resetear todas las cantidades a 0
    if (window.confirm('¿Estás seguro de que quieres borrar todos los datos del presupuesto?')) {
      setBudgetData([])
      // Forzar recarga del formulario jerárquico
      setCurrentStep(1)
      setTimeout(() => setCurrentStep(2), 0)
    }
  }

  const handleSaveBudget = async () => {
    // Validar al menos una partida con cantidad > 0
    const itemsWithQuantity = budgetData
      .map((item: unknown) => {
        const budgetItem = item as { level?: string; quantity?: string; id?: string; name?: string }
        if (budgetItem.level !== 'item') return null

        // Parsear cantidad en formato español (con coma)
        const quantityStr = budgetItem.quantity || '0'
        const quantity = parseFloat(quantityStr.replace(',', '.'))

        return quantity > 0 ? budgetItem : null
      })
      .filter(item => item !== null)

    const hasItems = itemsWithQuantity.length > 0

    if (!hasItems) {
      toast.error('Debe incluir al menos un elemento en el presupuesto')
      return
    }

    setSaveStatus('saving')

    try {
      // Si no existe budgetId, crear presupuesto nuevo
      if (!budgetId) {
        const createResult = await createDraftBudget({
          tariffId: tariff.id,
          clientData: clientData,
          tariffData: budgetData,
          validity: tariff.validity,
          totals: totals
        })

        if (!createResult.success || !createResult.budgetId) {
          toast.error(createResult.error || 'Error al crear presupuesto')
          setSaveStatus('idle')
          return
        }

        // Usar el budgetId recién creado
        const newBudgetId = createResult.budgetId

        // Guardar como borrador
        const result = await saveBudget(newBudgetId, totals, budgetData)

        if (result.success) {
          toast.success('Presupuesto guardado correctamente')
          router.push('/budgets')
        } else {
          toast.error(result.error || 'Error al guardar el presupuesto')
          setSaveStatus('idle')
        }
      } else {
        // Si ya existe, solo actualizar
        const result = await saveBudget(budgetId, totals, budgetData)

        if (result.success) {
          toast.success('Presupuesto guardado correctamente')
          router.push('/budgets')
        } else {
          toast.error(result.error || 'Error al guardar el presupuesto')
          setSaveStatus('idle')
        }
      }
    } catch (error) {
      console.error('Error al guardar presupuesto:', error)
      toast.error('Error inesperado al guardar')
      setSaveStatus('idle')
    }
  }

  const handleGeneratePDF = async () => {
    if (!budgetId) {
      toast.error('Debe guardar el presupuesto antes de generar PDF')
      return
    }

    try {
      setPdfStatus('generating')
      toast.info('Generando PDF... Esto puede tardar hasta 60 segundos')

      const result = await generateBudgetPDF(budgetId)

      if (result.success && result.pdf_url) {
        setPdfStatus('generated')
        toast.success('PDF generado exitosamente')

        // Abrir PDF en nueva pestaña
        window.open(result.pdf_url, '_blank')

        // Redirigir al listado después de 1 segundo
        setTimeout(() => {
          router.push('/budgets')
        }, 1000)
      } else {
        setPdfStatus('idle')
        toast.error(result.error || 'Error generando PDF')
      }
    } catch (error) {
      setPdfStatus('idle')
      console.error('Error en handleGeneratePDF:', error)
      toast.error('Error generando PDF')
    }
  }

  const handleClientDataChange = (field: keyof ClientData, value: string | boolean) => {
    setClientData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo modificado
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCancel = () => {
    router.push('/budgets')
  }

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Indicador de guardado */}
      {saveStatus !== 'idle' && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white border rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Guardando...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Guardado</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Company Header */}
      <Card className="mb-6">
        <CardContent className="py-3 px-6">
          <div className="grid grid-cols-[auto_1fr] gap-6">
            {/* Columna 1: Logo */}
            <div className="flex items-start">
              {tariff.logo_url ? (
                <img
                  src={tariff.logo_url}
                  alt={tariff.name}
                  className="w-24 h-24 object-contain"
                />
              ) : (
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Sin logo</span>
                </div>
              )}
            </div>

            {/* Columna 2: Datos empresa */}
            <div className="space-y-0.5">
              <h2
                className="text-xl font-bold"
                style={{ color: tariff.primary_color }}
              >
                {tariff.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tariff.nif || 'NIF no especificado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {tariff.address || 'Dirección no especificada'}
              </p>
              <p className="text-sm text-muted-foreground">
                {tariff.contact || 'Contacto no especificado'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      {currentStep === 1 && (
        <div className="flex justify-end gap-3 mb-6">
          <Button
            variant="outline"
            size="icon"
            className="bg-red-600 text-white hover:bg-red-700 border-red-600"
            onClick={() => {
              setClientData({
                client_type: 'empresa',
                client_name: '',
                client_nif_nie: '',
                client_phone: '',
                client_email: '',
                client_web: '',
                client_address: '',
                client_postal_code: '',
                client_locality: '',
                client_province: '',
                client_acceptance: false
              })
              setErrors({})
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleStep1Continue}
            style={{ backgroundColor: tariff.primary_color }}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="flex justify-end gap-3 mb-6">
          <Button
            size="icon"
            style={{ backgroundColor: tariff.primary_color }}
            onClick={() => setCurrentStep(1)}
            title="Atrás"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="bg-red-600 text-white hover:bg-red-700 border-red-600"
            onClick={handleClearBudgetData}
            title="Borrar Datos"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            style={{ backgroundColor: tariff.primary_color }}
            onClick={handleSaveBudget}
            title="Guardar"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            style={{ backgroundColor: tariff.primary_color }}
            onClick={handleGeneratePDF}
            disabled={pdfStatus === 'generating'}
            title="Generar PDF"
          >
            {pdfStatus === 'generating' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileStack className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {/* Step 1: Datos del cliente */}
      {currentStep === 1 && (
        <Card>
          <CardHeader
            style={{ backgroundColor: tariff.primary_color }}
            className="text-white rounded-t-lg"
          >
            <CardTitle className="text-white">Paso 1: Datos del Cliente</CardTitle>
            <CardDescription className="text-white/90">
              Completa la información del cliente para el presupuesto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Línea 1: Tipo de cliente con botones */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-gray-100"
                  style={clientData.client_type === 'empresa' ? {
                    borderColor: tariff.primary_color,
                    backgroundColor: `${tariff.primary_color}20`,
                    color: '#000'
                  } : {}}
                  onClick={() => handleClientDataChange('client_type', 'empresa')}
                >
                  Empresa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-gray-100"
                  style={clientData.client_type === 'autonomo' ? {
                    borderColor: tariff.primary_color,
                    backgroundColor: `${tariff.primary_color}20`,
                    color: '#000'
                  } : {}}
                  onClick={() => handleClientDataChange('client_type', 'autonomo')}
                >
                  Autónomo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-gray-100"
                  style={clientData.client_type === 'particular' ? {
                    borderColor: tariff.primary_color,
                    backgroundColor: `${tariff.primary_color}20`,
                    color: '#000'
                  } : {}}
                  onClick={() => handleClientDataChange('client_type', 'particular')}
                >
                  Particular
                </Button>
              </div>
              {errors.client_type && (
                <p className="text-sm text-destructive">{errors.client_type}</p>
              )}
            </div>

            {/* Línea 2: Nombre (75%) + NIF/NIE (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Input
                  id="client_name"
                  value={clientData.client_name}
                  onChange={(e) => handleClientDataChange('client_name', e.target.value)}
                  className={errors.client_name ? 'border-destructive' : ''}
                  placeholder={clientData.client_type === 'empresa' ? 'Nombre de la empresa' : 'Nombre y apellidos'}
                />
                {errors.client_name && (
                  <p className="text-sm text-destructive">{errors.client_name}</p>
                )}
              </div>

              <div className="col-span-1 space-y-2">
                <Input
                  id="client_nif_nie"
                  value={clientData.client_nif_nie}
                  onChange={(e) => handleClientDataChange('client_nif_nie', e.target.value.toUpperCase())}
                  className={errors.client_nif_nie ? 'border-destructive' : ''}
                  placeholder="NIF/NIE"
                />
                {errors.client_nif_nie && (
                  <p className="text-sm text-destructive">{errors.client_nif_nie}</p>
                )}
              </div>
            </div>

            {/* Línea 3: Teléfono (25%) + Email (50%) + Web (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-2">
                <Input
                  id="client_phone"
                  type="tel"
                  value={clientData.client_phone}
                  onChange={(e) => handleClientDataChange('client_phone', e.target.value)}
                  placeholder="Teléfono"
                  className={errors.client_phone ? 'border-destructive' : ''}
                />
                {errors.client_phone && (
                  <p className="text-sm text-destructive">{errors.client_phone}</p>
                )}
              </div>

              <div className="col-span-2 space-y-2">
                <Input
                  id="client_email"
                  type="email"
                  value={clientData.client_email}
                  onChange={(e) => handleClientDataChange('client_email', e.target.value)}
                  placeholder="Email"
                  className={errors.client_email ? 'border-destructive' : ''}
                />
                {errors.client_email && (
                  <p className="text-sm text-destructive">{errors.client_email}</p>
                )}
              </div>

              <div className="col-span-1 space-y-2">
                <Input
                  id="client_web"
                  type="url"
                  value={clientData.client_web || ''}
                  onChange={(e) => handleClientDataChange('client_web', e.target.value)}
                  placeholder="Web"
                />
              </div>
            </div>

            {/* Línea 4: Dirección (75%) + Código Postal (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Input
                  id="client_address"
                  value={clientData.client_address}
                  onChange={(e) => handleClientDataChange('client_address', e.target.value)}
                  placeholder="Dirección"
                  className={errors.client_address ? 'border-destructive' : ''}
                />
                {errors.client_address && (
                  <p className="text-sm text-destructive">{errors.client_address}</p>
                )}
              </div>

              <div className="col-span-1 space-y-2">
                <Input
                  id="client_postal_code"
                  value={clientData.client_postal_code}
                  onChange={(e) => handleClientDataChange('client_postal_code', e.target.value)}
                  placeholder="C.P."
                  className={errors.client_postal_code ? 'border-destructive' : ''}
                />
                {errors.client_postal_code && (
                  <p className="text-sm text-destructive">{errors.client_postal_code}</p>
                )}
              </div>
            </div>

            {/* Línea 5: Localidad (75%) + Provincia (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Input
                  id="client_locality"
                  value={clientData.client_locality}
                  onChange={(e) => handleClientDataChange('client_locality', e.target.value)}
                  placeholder="Localidad"
                  className={errors.client_locality ? 'border-destructive' : ''}
                />
                {errors.client_locality && (
                  <p className="text-sm text-destructive">{errors.client_locality}</p>
                )}
              </div>

              <div className="col-span-1 space-y-2">
                <Input
                  id="client_province"
                  value={clientData.client_province}
                  onChange={(e) => handleClientDataChange('client_province', e.target.value)}
                  placeholder="Provincia"
                  className={errors.client_province ? 'border-destructive' : ''}
                />
                {errors.client_province && (
                  <p className="text-sm text-destructive">{errors.client_province}</p>
                )}
              </div>
            </div>

            {/* Aceptación */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="client_acceptance"
                  checked={clientData.client_acceptance}
                  onCheckedChange={(checked) => handleClientDataChange('client_acceptance', !!checked)}
                  className={errors.client_acceptance ? 'border-destructive' : ''}
                />
                <Label htmlFor="client_acceptance" className="text-sm">
                  Acepto la política de privacidad *
                </Label>
              </div>
              {errors.client_acceptance && (
                <p className="text-sm text-destructive">{errors.client_acceptance}</p>
              )}

              {/* Nota legal */}
              {tariff.legal_note && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tariff.legal_note}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Formulario jerárquico */}
      {currentStep === 2 && (
        <Card>
          <CardHeader
            style={{ backgroundColor: tariff.primary_color }}
            className="text-white rounded-t-lg"
          >
            <CardTitle className="text-white">Presupuesto para {clientData.client_name || 'Cliente'}</CardTitle>
            <CardDescription className="text-white/90">
              Ajusta las cantidades de los elementos para crear tu presupuesto personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {(existingBudget?.json_budget_data || tariff.json_tariff_data) && (
              <BudgetHierarchyForm
                tariffData={
                  existingBudget?.json_budget_data
                    ? (existingBudget.json_budget_data as unknown[])
                    : (tariff.json_tariff_data as unknown[])
                }
                onBudgetDataChange={handleBudgetDataChange}
                onTotalsChange={setTotals}
                primaryColor={tariff.primary_color}
                secondaryColor={tariff.secondary_color}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}