"use client"

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { type TariffFormData } from '@/app/actions/tariffs'

interface CompanyDataPreviewModalProps {
  open: boolean
  onClose: () => void
  data: TariffFormData
}

export function CompanyDataPreviewModal({ open, onClose, data }: CompanyDataPreviewModalProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[80vw] h-[90vh] p-6 flex flex-col overflow-hidden">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Vista Previa - Datos Empresa</h2>
          <p className="text-sm text-gray-600">Así se verá esta sección en la página de presupuestos</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Card className="bg-cyan-50">
            <CardHeader>
              <CardTitle>Datos Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              {data.logo_url && (
                <div>
                  <Label className="mb-2 block">Logo *</Label>
                  <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
                    <Image
                      src={data.logo_url}
                      alt="Logo empresa"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {/* Nombre y NIF */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="preview-name">Nombre *</Label>
                  <Input
                    id="preview-name"
                    value={data.name}
                    readOnly
                    className="bg-white"
                  />
                </div>

                <div className="col-span-1">
                  <Label htmlFor="preview-nif">NIF/CIF *</Label>
                  <Input
                    id="preview-nif"
                    value={data.nif}
                    readOnly
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <Label htmlFor="preview-address">Dirección fiscal completa *</Label>
                <Input
                  id="preview-address"
                  value={data.address}
                  readOnly
                  className="bg-white"
                />
              </div>

              {/* Contacto */}
              <div>
                <Label htmlFor="preview-contact">Teléfono, email, web *</Label>
                <Input
                  id="preview-contact"
                  value={data.contact}
                  readOnly
                  className="bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
