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

interface BudgetFormProps {
  activeTariffs: Tariff[]
}

interface ClientData {
  client_type: 'particular' | 'autonomo' | 'empresa' | ''
  client_name: string
  client_nif_nie: string
  client_phone: string
  client_email: string
  client_address: string
  client_postal_code: string
  client_locality: string
  client_province: string
  client_acceptance: boolean
}

export function BudgetForm({ activeTariffs }: BudgetFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTariffId, setSelectedTariffId] = useState<string>('')
  const [clientData, setClientData] = useState<ClientData>({
    client_type: '',
    client_name: '',
    client_nif_nie: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    client_postal_code: '',
    client_locality: '',
    client_province: '',
    client_acceptance: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedTariff = activeTariffs.find(t => t.id === selectedTariffId)

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedTariffId) {
      newErrors.tariff = 'Debes seleccionar una tarifa'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
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

  const handleStep2Continue = () => {
    if (validateStep2()) {
      // TODO: Próxima tarea - ir a formulario jerárquico
      console.log('Datos listos para formulario jerárquico:', {
        tariffId: selectedTariffId,
        clientData
      })
      alert('Próxima tarea: Formulario jerárquico basado en tarifa seleccionada')
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
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Seleccionar Tarifa</span>
          </div>
          <div className="flex-1 h-px bg-border mx-4" />
          <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Datos Cliente</span>
          </div>
          <div className="flex-1 h-px bg-border mx-4" />
          <div className={`flex items-center ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Presupuesto</span>
          </div>
        </div>
      </div>

      {/* Step 1: Selector de tarifa */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 1: Seleccionar Tarifa</CardTitle>
            <CardDescription>
              Elige la tarifa que aplicarás para este presupuesto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tariff">Tarifa *</Label>
              <Select value={selectedTariffId} onValueChange={setSelectedTariffId}>
                <SelectTrigger className={errors.tariff ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecciona una tarifa activa" />
                </SelectTrigger>
                <SelectContent>
                  {activeTariffs.map((tariff) => (
                    <SelectItem key={tariff.id} value={tariff.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{tariff.title}</span>
                        {tariff.description && (
                          <span className="text-sm text-muted-foreground">
                            {tariff.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tariff && (
                <p className="text-sm text-destructive">{errors.tariff}</p>
              )}
            </div>

            {selectedTariff && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Tarifa seleccionada:</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Título:</strong> {selectedTariff.title}</p>
                  {selectedTariff.description && (
                    <p><strong>Descripción:</strong> {selectedTariff.description}</p>
                  )}
                  <p><strong>Validez:</strong> {selectedTariff.validity} días</p>
                  <p><strong>Empresa:</strong> {selectedTariff.name}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleCancel}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleStep1Continue} disabled={!selectedTariffId}>
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Datos del cliente */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 2: Datos del Cliente</CardTitle>
            <CardDescription>
              Completa la información del cliente para el presupuesto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo de cliente */}
              <div className="space-y-2">
                <Label htmlFor="client_type">Tipo de Cliente *</Label>
                <Select
                  value={clientData.client_type}
                  onValueChange={(value) => handleClientDataChange('client_type', value)}
                >
                  <SelectTrigger className={errors.client_type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">Particular</SelectItem>
                    <SelectItem value="autonomo">Autónomo</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                  </SelectContent>
                </Select>
                {errors.client_type && (
                  <p className="text-sm text-destructive">{errors.client_type}</p>
                )}
              </div>

              {/* Nombre */}
              <div className="space-y-2">
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

              {/* NIF/NIE */}
              <div className="space-y-2">
                <Label htmlFor="client_nif_nie">
                  {clientData.client_type === 'empresa' ? 'NIF' : 'DNI/NIE'} *
                </Label>
                <Input
                  id="client_nif_nie"
                  value={clientData.client_nif_nie}
                  onChange={(e) => handleClientDataChange('client_nif_nie', e.target.value.toUpperCase())}
                  className={errors.client_nif_nie ? 'border-destructive' : ''}
                  placeholder={clientData.client_type === 'empresa' ? 'A12345678B' : '12345678Z o X1234567L'}
                />
                {errors.client_nif_nie && (
                  <p className="text-sm text-destructive">{errors.client_nif_nie}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="client_phone">Teléfono</Label>
                <Input
                  id="client_phone"
                  type="tel"
                  value={clientData.client_phone}
                  onChange={(e) => handleClientDataChange('client_phone', e.target.value)}
                  placeholder="600123456"
                />
              </div>

              {/* Email */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={clientData.client_email}
                  onChange={(e) => handleClientDataChange('client_email', e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              {/* Dirección */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client_address">Dirección</Label>
                <Input
                  id="client_address"
                  value={clientData.client_address}
                  onChange={(e) => handleClientDataChange('client_address', e.target.value)}
                  placeholder="Calle, número, piso..."
                />
              </div>

              {/* Código postal */}
              <div className="space-y-2">
                <Label htmlFor="client_postal_code">Código Postal</Label>
                <Input
                  id="client_postal_code"
                  value={clientData.client_postal_code}
                  onChange={(e) => handleClientDataChange('client_postal_code', e.target.value)}
                  placeholder="28001"
                />
              </div>

              {/* Localidad */}
              <div className="space-y-2">
                <Label htmlFor="client_locality">Localidad</Label>
                <Input
                  id="client_locality"
                  value={clientData.client_locality}
                  onChange={(e) => handleClientDataChange('client_locality', e.target.value)}
                  placeholder="Madrid"
                />
              </div>

              {/* Provincia */}
              <div className="space-y-2 md:col-span-2">
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
                El cliente acepta recibir el presupuesto *
              </Label>
            </div>
            {errors.client_acceptance && (
              <p className="text-sm text-destructive">{errors.client_acceptance}</p>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              <Button onClick={handleStep2Continue}>
                Continuar al Presupuesto
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}