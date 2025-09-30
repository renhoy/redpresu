"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tariff } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { BudgetHierarchyForm } from './BudgetHierarchyForm'

interface BudgetFormProps {
  tariff: Tariff
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

export function BudgetForm({ tariff }: BudgetFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [budgetData, setBudgetData] = useState<any[]>([])
  const [clientData, setClientData] = useState<ClientData>({
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
  const [errors, setErrors] = useState<Record<string, string>>({})



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
    if (!clientData.client_acceptance) {
      newErrors.client_acceptance = 'Debe aceptar el presupuesto'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStep1Continue = () => {
    if (validateStep1()) {
      setCurrentStep(2)
    }
  }

  const handleBudgetDataChange = (newBudgetData: any[]) => {
    setBudgetData(newBudgetData)
  }

  const handleFinalizeBudget = () => {
    // TODO: Implementar guardado del presupuesto
    console.log('Datos completos del presupuesto:', {
      tariffId: tariff.id,
      clientData,
      budgetData
    })
    alert('Próxima tarea: Guardar presupuesto en base de datos')
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
    <div className="max-w-4xl mx-auto">
      {/* Company Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
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
            <div className="space-y-1">
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
                {tariff.address ? `${tariff.address}, ${tariff.postal_code} ${tariff.locality}, ${tariff.province}` : 'Dirección no especificada'}
              </p>
              <p className="text-sm text-muted-foreground">
                {tariff.phone && `Tel: ${tariff.phone}`}
                {tariff.phone && tariff.email && ' | '}
                {tariff.email && `Email: ${tariff.email}`}
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
            Borrar
          </Button>
          <Button
            onClick={handleStep1Continue}
            style={{ backgroundColor: tariff.primary_color }}
          >
            Siguiente
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="flex justify-between mb-6">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          <Button
            onClick={handleFinalizeBudget}
            style={{ backgroundColor: tariff.primary_color }}
          >
            Finalizar Presupuesto
          </Button>
        </div>
      )}

      {/* Step 1: Datos del cliente */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 1: Datos del Cliente</CardTitle>
            <CardDescription>
              Completa la información del cliente para el presupuesto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Línea 1: Tipo de cliente con botones */}
            <div className="space-y-2">
              <Label>Tipo de Cliente *</Label>
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
                <Label htmlFor="client_name">
                  {clientData.client_type === 'empresa' ? 'Razón Social' : 'Nombre Completo'} *
                </Label>
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
                <Label htmlFor="client_nif_nie">NIF/NIE *</Label>
                <Input
                  id="client_nif_nie"
                  value={clientData.client_nif_nie}
                  onChange={(e) => handleClientDataChange('client_nif_nie', e.target.value.toUpperCase())}
                  className={errors.client_nif_nie ? 'border-destructive' : ''}
                  placeholder="12345678Z"
                />
                {errors.client_nif_nie && (
                  <p className="text-sm text-destructive">{errors.client_nif_nie}</p>
                )}
              </div>
            </div>

            {/* Línea 3: Teléfono (25%) + Email (50%) + Web (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-2">
                <Label htmlFor="client_phone">Teléfono</Label>
                <Input
                  id="client_phone"
                  type="tel"
                  value={clientData.client_phone}
                  onChange={(e) => handleClientDataChange('client_phone', e.target.value)}
                  placeholder="600123456"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={clientData.client_email}
                  onChange={(e) => handleClientDataChange('client_email', e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="client_web">Web</Label>
                <Input
                  id="client_web"
                  type="url"
                  value={clientData.client_web || ''}
                  onChange={(e) => handleClientDataChange('client_web', e.target.value)}
                  placeholder="www.ejemplo.com"
                />
              </div>
            </div>

            {/* Línea 4: Dirección (75%) + Código Postal (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="client_address">Dirección</Label>
                <Input
                  id="client_address"
                  value={clientData.client_address}
                  onChange={(e) => handleClientDataChange('client_address', e.target.value)}
                  placeholder="Calle, número, piso..."
                />
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="client_postal_code">Código Postal</Label>
                <Input
                  id="client_postal_code"
                  value={clientData.client_postal_code}
                  onChange={(e) => handleClientDataChange('client_postal_code', e.target.value)}
                  placeholder="28001"
                />
              </div>
            </div>

            {/* Línea 5: Localidad (75%) + Provincia (25%) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="client_locality">Localidad</Label>
                <Input
                  id="client_locality"
                  value={clientData.client_locality}
                  onChange={(e) => handleClientDataChange('client_locality', e.target.value)}
                  placeholder="Madrid"
                />
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="client_province">Provincia</Label>
                <Input
                  id="client_province"
                  value={clientData.client_province}
                  onChange={(e) => handleClientDataChange('client_province', e.target.value)}
                  placeholder="Madrid"
                />
              </div>
            </div>

            {/* Aceptación */}
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

            {/* Notas legales */}
            {tariff.legal_notes && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Notas legales página presupuesto</Label>
                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                  {tariff.legal_notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Formulario jerárquico */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paso 2: Configurar Presupuesto</CardTitle>
              <CardDescription>
                Ajusta las cantidades de los elementos para crear tu presupuesto personalizado
              </CardDescription>
            </CardHeader>
          </Card>

          {tariff.json_tariff_data && (
            <BudgetHierarchyForm
              tariffData={tariff.json_tariff_data as any[]}
              onBudgetDataChange={handleBudgetDataChange}
              primaryColor={tariff.primary_color}
              secondaryColor={tariff.secondary_color}
            />
          )}
        </div>
      )}
    </div>
  )
}