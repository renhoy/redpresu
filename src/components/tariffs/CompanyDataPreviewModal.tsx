"use client"

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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
      <DialogContent className="max-w-2xl p-6">
        <DialogTitle className="text-xl font-semibold text-gray-900">
          Vista Previa - Datos Empresa
        </DialogTitle>

        <div className="grid grid-cols-[200px_1fr] gap-6 mt-4">
          {/* Columna 1: Logo */}
          <div className="flex items-start justify-center">
            {data.logo_url ? (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={data.logo_url}
                  alt="Logo empresa"
                  fill
                  className="object-contain p-4"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Sin logo</span>
              </div>
            )}
          </div>

          {/* Columna 2: Datos */}
          <div className="space-y-3">
            {/* Nombre */}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Nombre</div>
              <div className="text-base text-gray-900">{data.name || '—'}</div>
            </div>

            {/* NIF */}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">NIF/CIF</div>
              <div className="text-base text-gray-900">{data.nif || '—'}</div>
            </div>

            {/* Dirección */}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Dirección</div>
              <div className="text-base text-gray-900">{data.address || '—'}</div>
            </div>

            {/* Contacto */}
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">Contacto</div>
              <div className="text-base text-gray-900">{data.contact || '—'}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
