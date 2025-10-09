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
import { ArrowLeft, ArrowRight, Trash2, Save, FileStack, Loader2, Check, X } from 'lucide-react'
import { BudgetHierarchyForm } from './BudgetHierarchyForm'
import { createDraftBudget, updateBudgetDraft, saveBudget, generateBudgetPDF, duplicateBudget } from '@/app/actions/budgets'
import { getIVAtoREEquivalencesAction } from '@/app/actions/config'
import { calculateRecargo, getTotalRecargo, shouldApplyIRPF, calculateIRPF, getDefaultIRPFPercentage } from '@/lib/helpers/fiscal-calculations'
import { toast } from 'sonner'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

  // Nuevos diálogos según especificaciones
  const [showSaveAsOrSaveDialog, setShowSaveAsOrSaveDialog] = useState(false) // "Guardar" vs "Guardar como"
  const [showOverwriteOrVersionDialog, setShowOverwriteOrVersionDialog] = useState(false) // "Sobreescribir" vs "Nueva versión"
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false) // Confirmación final sobreescribir

  const [showPdfConfirm, setShowPdfConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const isEditMode = !!existingBudget?.id
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

  // Estados para Recargo de Equivalencia
  const [aplicaRecargo, setAplicaRecargo] = useState(false)
  const [recargos, setRecargos] = useState<Record<number, number>>({})
  const [ivasReconocidos, setIvasReconocidos] = useState<Set<number>>(new Set())

  // Estados para cálculos fiscales en tiempo real
  const [calculatedIRPF, setCalculatedIRPF] = useState(0)
  const [calculatedIRPFPercentage, setCalculatedIRPFPercentage] = useState(0)
  const [calculatedREByIVA, setCalculatedREByIVA] = useState<Record<number, number>>({})
  const [calculatedTotalRE, setCalculatedTotalRE] = useState(0)
  const [issuerType, setIssuerType] = useState<'empresa' | 'autonomo'>('empresa')
  const [issuerIRPFPercentage, setIssuerIRPFPercentage] = useState(15)

  // Cargar budgetData del borrador existente
  useEffect(() => {
    if (existingBudget?.json_budget_data) {
      setBudgetData(existingBudget.json_budget_data as unknown[])
      // Siempre comenzar en paso 1 (datos del cliente), incluso al editar
    }
  }, [existingBudget])

  // Detectar cambios en clientData o budgetData
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    // Marcar que hay cambios sin guardar
    setHasUnsavedChanges(true)
  }, [clientData, budgetData, totals])

  // Resetear flag cuando se guarda
  useEffect(() => {
    if (saveStatus === 'saved') {
      setHasUnsavedChanges(false)
    }
  }, [saveStatus])

  // Cargar valores por defecto de RE cuando el cliente es autónomo y se activa el checkbox
  useEffect(() => {
    async function loadREDefaults() {
      if (clientData.client_type === 'autonomo' && aplicaRecargo && Object.keys(recargos).length === 0) {
        const result = await getIVAtoREEquivalencesAction()

        if (result.success && result.data && tariff.ivas_presentes) {
          // Solo cargar recargos para los IVAs presentes en la tarifa
          const recargosInicial: Record<number, number> = {}
          const ivasReconocidosSet = new Set<number>()

          tariff.ivas_presentes.forEach((iva: number) => {
            // Normalizar el IVA a 2 decimales para matchear las claves del objeto de equivalencias
            const ivaKey = Number(iva).toFixed(2)
            const reValue = result.data![ivaKey] || 0
            recargosInicial[iva] = reValue

            // Marcar como reconocido si tiene un valor > 0 en la config
            if (reValue > 0) {
              ivasReconocidosSet.add(iva)
            }
          })

          setRecargos(recargosInicial)
          setIvasReconocidos(ivasReconocidosSet)
        }
      }
    }

    loadREDefaults()
  }, [clientData.client_type, aplicaRecargo, tariff.ivas_presentes])

  // Cargar datos del emisor al inicio
  useEffect(() => {
    async function loadIssuerData() {
      try {
        // Crear una acción temporal para obtener datos del emisor
        const response = await fetch('/api/user/issuer')
        if (response.ok) {
          const data = await response.json()
          if (data.issuer) {
            setIssuerType(data.issuer.issuers_type || 'empresa')
            setIssuerIRPFPercentage(data.issuer.issuers_irpf_percentage || 15)
          }
        }
      } catch (error) {
        console.error('[loadIssuerData] Error:', error)
      }
    }

    loadIssuerData()
  }, [])

  // Calcular IRPF y RE en tiempo real cuando cambian budgetData o totals
  useEffect(() => {
    // Calcular IRPF si aplica
    if (totals.base > 0 && clientData.client_type) {
      const aplica = shouldApplyIRPF(issuerType, clientData.client_type)
      if (aplica) {
        const irpfAmount = calculateIRPF(totals.base, issuerIRPFPercentage)
        setCalculatedIRPF(irpfAmount)
        setCalculatedIRPFPercentage(issuerIRPFPercentage)
      } else {
        setCalculatedIRPF(0)
        setCalculatedIRPFPercentage(0)
      }
    } else {
      setCalculatedIRPF(0)
      setCalculatedIRPFPercentage(0)
    }

    // Calcular RE si aplica (solo para clientes autónomos)
    if (aplicaRecargo && clientData.client_type === 'autonomo' && budgetData.length > 0 && Object.keys(recargos).length > 0) {
      try {
        const reByIVA = calculateRecargo(budgetData as any[], recargos)
        const totalRE = getTotalRecargo(reByIVA)

        setCalculatedREByIVA(reByIVA)
        setCalculatedTotalRE(totalRE)
      } catch (error) {
        console.error('[calculateFiscalValues] Error calculating RE:', error)
        setCalculatedREByIVA({})
        setCalculatedTotalRE(0)
      }
    } else {
      setCalculatedREByIVA({})
      setCalculatedTotalRE(0)
    }
  }, [budgetData, totals, aplicaRecargo, recargos, clientData.client_type, issuerType, issuerIRPFPercentage])

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

    // NUEVA LÓGICA SEGÚN ESPECIFICACIONES:

    // 1. Primera vez guardando (modo creación, no existe budgetId)
    if (!isEditMode) {
      await executeCreateNew()
      return
    }

    // 2. Editando presupuesto existente
    // Mostrar opciones: "Guardar" vs "Guardar como"
    setShowSaveAsOrSaveDialog(true)
  }

  const executeCreateNew = async () => {
    setSaveStatus('saving')

    try {
      // Crear presupuesto nuevo
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

        const newBudgetId = createResult.budgetId

        const recargoData = aplicaRecargo ? { aplica: true, recargos } : undefined
        const result = await saveBudget(newBudgetId, totals, budgetData, clientData, recargoData)

        if (result.success) {
          toast.success('Presupuesto creado correctamente')
          setBudgetId(newBudgetId)
          setSaveStatus('saved')
          setHasUnsavedChanges(false)

          // Redirigir a /budgets filtrando por este presupuesto (sin hijos, es nuevo)
          setTimeout(() => {
            router.push(`/budgets?budget_id=${newBudgetId}`)
          }, 1000)
        } else {
          toast.error(result.error || 'Error al guardar')
          setSaveStatus('idle')
        }
      } else {
        // Ya existe budgetId (caso raro en create mode)
        const recargoData = aplicaRecargo ? { aplica: true, recargos } : undefined
        const result = await saveBudget(budgetId, totals, budgetData, clientData, recargoData)

        if (result.success) {
          toast.success('Presupuesto guardado correctamente')
          setSaveStatus('saved')
          setHasUnsavedChanges(false)

          // Redirigir a /budgets filtrando por este presupuesto
          setTimeout(() => {
            router.push(`/budgets?budget_id=${budgetId}`)
          }, 1000)
        } else {
          toast.error(result.error || 'Error al guardar')
          setSaveStatus('idle')
        }
      }
    } catch (error) {
      console.error('Error al guardar:', error)
      toast.error('Error inesperado al guardar')
      setSaveStatus('idle')
    }
  }

  const executeOverwrite = async () => {
    setShowOverwriteConfirm(false)
    setShowSaveAsOrSaveDialog(false)
    setShowOverwriteOrVersionDialog(false)
    setSaveStatus('saving')

    try {
      if (!budgetId) return

      const recargoData = aplicaRecargo ? { aplica: true, recargos } : undefined
      const result = await saveBudget(budgetId, totals, budgetData, clientData, recargoData)

      if (result.success) {
        toast.success('Presupuesto actualizado correctamente')
        if (result.had_pdf) {
          toast.info('PDF eliminado. Genera uno nuevo cuando estés listo.')
        }
        setSaveStatus('saved')
        setHasUnsavedChanges(false)

        // Redirigir a /budgets filtrando por este presupuesto y todos sus hijos
        setTimeout(() => {
          router.push(`/budgets?budget_id=${budgetId}`)
        }, 1000)
      } else {
        toast.error(result.error || 'Error al actualizar')
        setSaveStatus('idle')
      }
    } catch (error) {
      console.error('Error al sobrescribir:', error)
      toast.error('Error inesperado')
      setSaveStatus('idle')
    }
  }

  const executeCreateVersion = async () => {
    setShowOverwriteOrVersionDialog(false)
    setShowSaveAsOrSaveDialog(false)
    setSaveStatus('saving')

    try {
      if (!budgetId) return

      // Determinar el parent_budget_id correcto
      const parentId = existingBudget?.parent_budget_id || budgetId

      // Duplicar el presupuesto con parent_budget_id = padre original
      const result = await duplicateBudget(budgetId, {
        clientData,
        budgetData: budgetData as any[],
        totals,
        recargo: aplicaRecargo ? { aplica: true, recargos } : undefined,
        asVersion: true  // Crear como versión hijo
      })

      if (result.success && result.newBudgetId) {
        toast.success('Nueva versión creada correctamente')
        setSaveStatus('saved')
        setHasUnsavedChanges(false)

        // Redirigir a /budgets filtrando por el padre y todos sus hijos (incluyendo nueva versión)
        setTimeout(() => {
          router.push(`/budgets?budget_id=${parentId}`)
        }, 1000)
      } else {
        toast.error(result.error || 'Error al crear versión')
        setSaveStatus('idle')
      }
    } catch (error) {
      console.error('Error al crear versión:', error)
      toast.error('Error inesperado')
      setSaveStatus('idle')
    }
  }

  const executeSaveAs = async () => {
    setShowSaveAsOrSaveDialog(false)
    setSaveStatus('saving')

    try {
      if (!budgetId) return

      // Crear nuevo presupuesto independiente (sin parent_budget_id)
      const result = await duplicateBudget(budgetId, {
        clientData,
        budgetData: budgetData as any[],
        totals,
        recargo: aplicaRecargo ? { aplica: true, recargos } : undefined,
        asVersion: false  // NO es versión, es nuevo presupuesto independiente
      })

      if (result.success && result.newBudgetId) {
        toast.success('Nuevo presupuesto creado como independiente')
        setSaveStatus('saved')
        setHasUnsavedChanges(false)

        // Redirigir a /budgets filtrando por el nuevo y sus hijos (inicialmente ninguno)
        setTimeout(() => {
          router.push(`/budgets?budget_id=${result.newBudgetId}`)
        }, 1000)
      } else {
        toast.error(result.error || 'Error al crear nuevo presupuesto')
        setSaveStatus('idle')
      }
    } catch (error) {
      console.error('Error al duplicar:', error)
      toast.error('Error inesperado')
      setSaveStatus('idle')
    }
  }

  const handleGeneratePDF = async () => {
    if (!budgetId) {
      toast.error('Debe guardar el presupuesto antes de generar PDF')
      return
    }

    // Validar que hay items con cantidad > 0
    const itemsWithQuantity = budgetData
      .map((item: unknown) => {
        const budgetItem = item as { level?: string; quantity?: string }
        if (budgetItem.level !== 'item') return null
        const quantityStr = budgetItem.quantity || '0'
        const quantity = parseFloat(quantityStr.replace(',', '.'))
        return quantity > 0 ? budgetItem : null
      })
      .filter(item => item !== null)

    if (itemsWithQuantity.length === 0) {
      toast.error('Debe incluir al menos un elemento en el presupuesto')
      return
    }

    // Si ya existe PDF, mostrar confirmación
    if (existingBudget?.pdf_url) {
      setShowPdfConfirm(true)
      return
    }

    // Si no hay PDF previo, generar directamente
    await executeGeneratePDF()
  }

  const executeGeneratePDF = async () => {
    setShowPdfConfirm(false)

    try {
      // Primero guardar los datos actuales
      setSaveStatus('saving')

      if (!budgetId) return

      const recargoData = aplicaRecargo ? { aplica: true, recargos } : undefined
      const saveResult = await saveBudget(budgetId, totals, budgetData, clientData, recargoData)

      if (!saveResult.success) {
        toast.error(saveResult.error || 'Error al guardar')
        setSaveStatus('idle')
        return
      }

      toast.success('Datos guardados correctamente')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)

      // Luego generar el PDF
      setPdfStatus('generating')
      toast.info('Generando PDF... Esto puede tardar hasta 60 segundos')

      const result = await generateBudgetPDF(budgetId)

      // MODO DESARROLLO: Solo debug
      if (result.success && result.debug) {
        setPdfStatus('idle')
        console.log('📄 PAYLOAD PDF GENERADO (desarrollo):', result.payload)
        toast.success('Payload generado (revisa consola del servidor)')
        return
      }

      // MODO PRODUCCIÓN: Flujo completo
      if (result.success && result.pdf_url) {
        setPdfStatus('generated')
        toast.success('PDF generado exitosamente')

        // Abrir PDF en nueva pestaña
        window.open(result.pdf_url, '_blank')

        // Refrescar página para actualizar existingBudget.pdf_url
        router.refresh()
      } else {
        setPdfStatus('idle')
        toast.error(result.error || 'Error generando PDF')
      }
    } catch (error) {
      setPdfStatus('idle')
      setSaveStatus('idle')
      console.error('Error en executeGeneratePDF:', error)
      toast.error('Error generando PDF')
    }
  }

  const handleClientDataChange = (field: keyof ClientData, value: string | boolean) => {
    setClientData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo modificado
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Si se cambia el tipo de cliente y NO es autónomo, limpiar RE
    if (field === 'client_type' && value !== 'autonomo') {
      setAplicaRecargo(false)
      setRecargos({})
      setCalculatedREByIVA({})
      setCalculatedTotalRE(0)
    }
  }

  const handleCancel = () => {
    router.push('/budgets')
  }

  const handleClose = () => {
    // Si hay cambios sin guardar, mostrar confirmación
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true)
      return
    }

    // Si no hay cambios, cerrar directamente
    window.close()
  }

  const executeClose = () => {
    setShowCloseConfirm(false)
    window.close()
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={handleStep1Continue}
                    style={{ backgroundColor: tariff.primary_color }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Siguiente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>
                  <p>Borrar Datos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClose}
                    className="border-gray-300 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cerrar Pestaña</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    style={{ backgroundColor: tariff.primary_color }}
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atrás</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    style={{ backgroundColor: tariff.primary_color }}
                    onClick={handleSaveBudget}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Guardar Presupuesto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    style={{ backgroundColor: tariff.primary_color }}
                    onClick={handleGeneratePDF}
                    disabled={pdfStatus === 'generating'}
                  >
                    {pdfStatus === 'generating' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileStack className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generar PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-red-600 text-white hover:bg-red-700 border-red-600"
                    onClick={handleClearBudgetData}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Borrar Datos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClose}
                    className="border-gray-300 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cerrar Pestaña</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Step 1: Datos del cliente */}
      {currentStep === 1 && (
        <Card className="gap-0">
          <CardHeader
            style={{ backgroundColor: tariff.primary_color }}
            className="text-white rounded-t-lg py-3"
          >
            <CardTitle className="text-white">Datos del Cliente</CardTitle>
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

            {/* Recargo de Equivalencia - Checkbox (solo si cliente es autónomo) */}
            {clientData.client_type === 'autonomo' && (
              <div className="space-y-3 p-4 border rounded-lg bg-amber-50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aplica_recargo"
                    checked={aplicaRecargo}
                    onCheckedChange={(checked) => {
                      setAplicaRecargo(!!checked)
                      if (!checked) {
                        setRecargos({})
                      }
                    }}
                  />
                  <Label htmlFor="aplica_recargo" className="text-sm font-medium">
                    Aplicar Recargo de Equivalencia
                  </Label>
                </div>

                {/* Tabla de recargos - Solo visible cuando checkbox está marcado */}
                {aplicaRecargo && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Porcentajes de RE por tipo de IVA:
                    </p>
                    {tariff.ivas_presentes && tariff.ivas_presentes.length > 0 ? (
                      <div className="grid gap-3">
                        {tariff.ivas_presentes.map((iva: number) => {
                          const ivaFormatted = Number(iva).toFixed(2).replace('.', ',')
                          const reValue = recargos[iva] || 0
                          const reFormatted = reValue.toFixed(2).replace('.', ',')
                          // Usar el Set de IVAs reconocidos, no el valor actual
                          const isIVARecognized = ivasReconocidos.has(iva)

                          return (
                            <div key={iva} className={`flex items-center gap-4 p-3 rounded border ${!isIVARecognized ? 'bg-yellow-50 border-yellow-300' : 'bg-white'}`}>
                              <Label className="min-w-[80px] font-medium">{ivaFormatted}% IVA</Label>
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  type="text"
                                  value={reFormatted}
                                  onChange={(e) => {
                                    // Convertir formato español a número
                                    const valueStr = e.target.value.replace(',', '.')
                                    const value = parseFloat(valueStr) || 0
                                    setRecargos(prev => ({ ...prev, [iva]: value }))
                                  }}
                                  className="w-28 bg-white"
                                />
                                <span className="text-sm text-muted-foreground">% RE</span>
                              </div>
                              {!isIVARecognized && (
                                <div className="flex items-center gap-1 text-xs text-yellow-700">
                                  <span>⚠️</span>
                                  <span>IVA no reconocido</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No se detectaron IVAs en esta tarifa. Por favor, verifica la tarifa.
                      </p>
                    )}
                    {tariff.ivas_presentes && tariff.ivas_presentes.some((iva: number) => !ivasReconocidos.has(iva)) && (
                      <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 rounded text-xs">
                        <p className="font-semibold">⚠️ Advertencia de IVAs no reconocidos:</p>
                        <p className="mt-1">
                          Algunos porcentajes de IVA no están configurados en el sistema. El Recargo de Equivalencia por defecto es 0,00%.
                          Puedes corregir el IVA en la tarifa o aceptar el valor 0,00% si es correcto.
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground italic">
                      Los valores por defecto se cargan automáticamente según la normativa.
                      Puedes modificarlos si es necesario.
                    </p>
                  </div>
                )}
              </div>
            )}

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
        <Card className="gap-0">
          <CardHeader
            style={{ backgroundColor: tariff.primary_color }}
            className="text-white rounded-t-lg py-3"
          >
            <CardTitle className="text-white">Datos del Presupuesto</CardTitle>
            <CardDescription className="text-white/90">
              Ajusta las cantidades de los elementos para crear tu presupuesto personalizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {(existingBudget?.json_budget_data || tariff.json_tariff_data) && (
              <BudgetHierarchyForm
                tariffData={
                  existingBudget?.json_budget_data
                    ? (existingBudget.json_budget_data as any)?.items || (existingBudget.json_budget_data as unknown[])
                    : (tariff.json_tariff_data as unknown[])
                }
                onBudgetDataChange={handleBudgetDataChange}
                onTotalsChange={setTotals}
                primaryColor={tariff.primary_color}
                secondaryColor={tariff.secondary_color}
                irpf={calculatedIRPF}
                irpfPercentage={calculatedIRPFPercentage}
                reByIVA={calculatedREByIVA}
                totalRE={calculatedTotalRE}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogo 1: "Guardar" vs "Guardar como" (en modo edición) */}
      <AlertDialog open={showSaveAsOrSaveDialog} onOpenChange={setShowSaveAsOrSaveDialog}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cómo deseas guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Elige si deseas guardar los cambios en este presupuesto o crear uno nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => {
                setShowSaveAsOrSaveDialog(false)
                setShowOverwriteOrVersionDialog(true)
              }}
              className="w-full flex flex-col items-start h-auto py-3"
              style={{ backgroundColor: tariff.primary_color }}
            >
              <span className="font-semibold">Guardar</span>
              <span className="text-xs font-normal opacity-90">
                Guardar cambios en este presupuesto (sobreescribir o nueva versión)
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={executeSaveAs}
              className="w-full flex flex-col items-start h-auto py-3"
            >
              <span className="font-semibold">Guardar como</span>
              <span className="text-xs font-normal opacity-90">
                Crear un nuevo presupuesto independiente{existingBudget?.pdf_url && " (sin copiar PDF)"}
              </span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo 2: "Sobreescribir" vs "Nueva versión" (dentro de "Guardar") */}
      <AlertDialog open={showOverwriteOrVersionDialog} onOpenChange={setShowOverwriteOrVersionDialog}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Sobreescribir o nueva versión?</AlertDialogTitle>
            <AlertDialogDescription>
              Elige cómo guardar los cambios en este presupuesto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="destructive"
              onClick={() => {
                setShowOverwriteOrVersionDialog(false)
                setShowOverwriteConfirm(true)
              }}
              className="w-full flex flex-col items-start h-auto py-3"
            >
              <span className="font-semibold">Sobreescribir</span>
              <span className="text-xs font-normal opacity-90">
                ⚠️ Los datos anteriores de cliente y presupuesto serán sobreescritos{existingBudget?.pdf_url && ". Se eliminará el archivo PDF si existe"}
              </span>
            </Button>
            <Button
              onClick={executeCreateVersion}
              className="w-full flex flex-col items-start h-auto py-3"
              style={{ backgroundColor: tariff.primary_color }}
            >
              <span className="font-semibold">Nueva versión</span>
              <span className="text-xs font-normal opacity-90">
                ✨ Crear nueva versión como hijo del presupuesto actual
              </span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSaveAsOrSaveDialog(true)}>
              Volver atrás
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo 3: Confirmación final de sobrescritura */}
      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirma que deseas sobrescribir</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">Esta acción NO se puede deshacer.</p>
              <p>Los datos anteriores de cliente y presupuesto serán sobreescritos por los actuales.</p>
              {existingBudget?.pdf_url && (
                <p className="text-destructive font-medium">Se eliminará el archivo PDF si existe.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOverwriteOrVersionDialog(true)}>
              No, volver atrás
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeOverwrite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, sobrescribir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Confirmación de generación de PDF (cuando ya existe uno) */}
      <AlertDialog open={showPdfConfirm} onOpenChange={setShowPdfConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirma la generación del nuevo PDF</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Al generar un nuevo PDF se realizarán las siguientes acciones:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Se guardarán los datos actuales del presupuesto</li>
                <li>Se eliminará el PDF anterior</li>
                <li>Se generará un nuevo PDF con los datos actualizados</li>
              </ul>
              <p className="font-semibold mt-2">⚠️ Los datos y PDF anteriores se perderán permanentemente</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeGeneratePDF}
              style={{ backgroundColor: tariff.primary_color }}
            >
              Sí, generar nuevo PDF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* AlertDialog: Confirmación de cierre con cambios sin guardar */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar ventana con cambios sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Has realizado cambios que no se han guardado. Si cierras la ventana ahora, se perderán todos los cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver al formulario</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cerrar sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}