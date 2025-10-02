'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LogoUploader } from './LogoUploader'
import { type TariffFormData } from '@/app/actions/tariffs'

interface TariffFormFieldsProps {
  data: TariffFormData
  errors: Record<string, string>
  onChange: (data: Partial<TariffFormData>) => void
}

export function TariffFormFields({ data, errors, onChange }: TariffFormFieldsProps) {
  const handleInputChange = (field: keyof TariffFormData, value: string | number) => {
    onChange({ [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Datos Tarifa */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Tarifa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Nombre de la tarifa"
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción de la tarifa (opcional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="validity">Validez (días) *</Label>
              <Input
                id="validity"
                type="number"
                value={data.validity}
                onChange={(e) => handleInputChange('validity', parseInt(e.target.value) || 30)}
                min="1"
                max="365"
              />
            </div>

            <div>
              <Label htmlFor="status">Estado *</Label>
              <Select
                value={data.status}
                onValueChange={(value: 'Activa' | 'Inactiva') => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activa">Activa</SelectItem>
                  <SelectItem value="Inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Datos Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LogoUploader
            value={data.logo_url}
            onChange={(url) => handleInputChange('logo_url', url)}
            error={errors.logo_url}
          />

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nombre completo de la empresa"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div className="col-span-1">
              <Label htmlFor="nif">NIF *</Label>
              <Input
                id="nif"
                value={data.nif}
                onChange={(e) => handleInputChange('nif', e.target.value.toUpperCase())}
                placeholder="12345678A"
                className={errors.nif ? 'border-destructive' : ''}
              />
              {errors.nif && (
                <p className="text-sm text-destructive mt-1">{errors.nif}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="address">Dirección fiscal completa *</Label>
            <Input
              id="address"
              value={data.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Dirección, código postal, ciudad, provincia"
              className={errors.address ? 'border-destructive' : ''}
            />
            {errors.address && (
              <p className="text-sm text-destructive mt-1">{errors.address}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contact">Teléfono, email, web *</Label>
            <Input
              id="contact"
              value={data.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              placeholder="Información de contacto"
              className={errors.contact ? 'border-destructive' : ''}
            />
            {errors.contact && (
              <p className="text-sm text-destructive mt-1">{errors.contact}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Configuración Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="template">Plantilla *</Label>
              <Input
                id="template"
                value={data.template}
                onChange={(e) => handleInputChange('template', e.target.value)}
                placeholder="41200-00001"
              />
            </div>

            <div>
              <Label htmlFor="primary_color">Color Primario *</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="primary_color"
                  type="color"
                  value={data.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  className="w-10 h-10 p-1 border rounded cursor-pointer"
                />
                <Input
                  value={data.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  placeholder="#e8951c"
                  className="flex-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondary_color">Color Secundario *</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="secondary_color"
                  type="color"
                  value={data.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  className="w-10 h-10 p-1 border rounded cursor-pointer"
                />
                <Input
                  value={data.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  placeholder="#109c61"
                  className="flex-1 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Notas PDF */}
      <Card>
        <CardHeader>
          <CardTitle>Notas PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="summary_note">Texto resumen PDF *</Label>
            <Textarea
              id="summary_note"
              value={data.summary_note}
              onChange={(e) => handleInputChange('summary_note', e.target.value)}
              placeholder="Texto que aparecerá en el resumen del PDF"
              rows={4}
              className={errors.summary_note ? 'border-destructive' : ''}
            />
            {errors.summary_note && (
              <p className="text-sm text-destructive mt-1">{errors.summary_note}</p>
            )}
          </div>

          <div>
            <Label htmlFor="conditions_note">Texto condiciones PDF *</Label>
            <Textarea
              id="conditions_note"
              value={data.conditions_note}
              onChange={(e) => handleInputChange('conditions_note', e.target.value)}
              placeholder="Condiciones generales que aparecerán en el PDF"
              rows={4}
              className={errors.conditions_note ? 'border-destructive' : ''}
            />
            {errors.conditions_note && (
              <p className="text-sm text-destructive mt-1">{errors.conditions_note}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Notas Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Formulario</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="legal_note">Notas legales página presupuesto *</Label>
            <Textarea
              id="legal_note"
              value={data.legal_note}
              onChange={(e) => handleInputChange('legal_note', e.target.value)}
              placeholder="Notas legales que aparecerán en la página de presupuesto"
              rows={3}
              className={errors.legal_note ? 'border-destructive' : ''}
            />
            {errors.legal_note && (
              <p className="text-sm text-destructive mt-1">{errors.legal_note}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}