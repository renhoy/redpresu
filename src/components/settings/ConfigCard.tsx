"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  getIssuerByEmpresaId,
  type IssuerData,
} from "@/app/actions/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfigRow = Database["public"]["Tables"]["config"]["Row"];

interface ConfigCardProps {
  item: ConfigRow;
  onEdit: (item: ConfigRow) => void;
}

export function ConfigCard({ item, onEdit }: ConfigCardProps) {
  const [viewingIssuer, setViewingIssuer] = useState<IssuerData | null>(null);
  const [isLoadingIssuer, setIsLoadingIssuer] = useState(false);

  const handleViewIssuer = async (empresaId: number) => {
    setIsLoadingIssuer(true);
    try {
      const result = await getIssuerByEmpresaId(empresaId);

      if (result.success && result.data) {
        setViewingIssuer(result.data);
      } else {
        toast.error(result.error || "Error al obtener datos del issuer");
      }
    } catch (error) {
      toast.error("Error inesperado al cargar issuer");
    } finally {
      setIsLoadingIssuer(false);
    }
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  };

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          {/* Clave */}
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Clave</div>
            <div className="font-mono text-sm font-medium">{item.key}</div>
          </div>

          {/* Descripción */}
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Descripción</div>
            <div className="text-sm">{item.description || "-"}</div>
          </div>

          {/* Valor */}
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Valor</div>
            <pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
              {formatValue(item.value)}
            </pre>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(item)}
              className="flex-1"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
            {item.key === "default_empresa_id" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewIssuer(item.value as number)}
                disabled={isLoadingIssuer}
              >
                <Eye className="h-3 w-3 mr-1" />
                Ver Empresa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para visualizar issuer */}
      <Dialog
        open={!!viewingIssuer}
        onOpenChange={() => setViewingIssuer(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Datos de la Empresa por Defecto</DialogTitle>
            <DialogDescription>
              Información del issuer asociado
            </DialogDescription>
          </DialogHeader>

          {viewingIssuer && (
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-semibold text-base">
                  {viewingIssuer.name} ({viewingIssuer.nif_nie})
                </p>
                <p className="text-muted-foreground capitalize">
                  ({viewingIssuer.type})
                </p>
              </div>

              <div className="text-sm space-y-1">
                <p>
                  {viewingIssuer.address}, {viewingIssuer.postal_code},{" "}
                  {viewingIssuer.locality} ({viewingIssuer.province})
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  {viewingIssuer.phone} • {viewingIssuer.email} •{" "}
                  {viewingIssuer.web || "-"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewingIssuer(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
