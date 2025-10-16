"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { type TariffFormData } from "@/app/actions/tariffs";

interface CompanyDataPreviewModalProps {
  open: boolean;
  onClose: () => void;
  data: TariffFormData;
}

export function CompanyDataPreviewModal({
  open,
  onClose,
  data,
}: CompanyDataPreviewModalProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogTitle className="text-xl font-semibold text-gray-900">
          Vista Previa - Datos Empresa
        </DialogTitle>

        <p className="text-sm text-gray-600 mb-4">
          Así se verá esta sección en la página de presupuestos
        </p>

        {/* Company Header - Replica del diseño de presupuestos */}
        <Card>
          <CardContent className="py-3 px-6">
            <div className="grid grid-cols-[auto_1fr] gap-6">
              {/* Columna 1: Logo */}
              <div className="flex items-start">
                {data.logo_url ? (
                  <img
                    src={data.logo_url}
                    alt={data.name}
                    className="w-24 h-24 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      Sin logo
                    </span>
                  </div>
                )}
              </div>

              {/* Columna 2: Datos empresa */}
              <div className="space-y-0.5">
                <h2
                  className="text-xl font-bold"
                  style={{ color: data.primary_color }}
                >
                  {data.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {data.nif || "NIF no especificado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.address || "Dirección no especificada"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.contact || "Contacto no especificado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
