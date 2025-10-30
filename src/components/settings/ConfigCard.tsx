"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { getIssuerByEmpresaId, type IssuerData } from "@/app/actions/config";
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
  onToggle?: (item: ConfigRow) => void;
  onUpdate?: (item: ConfigRow, newValue: string | number) => void;
}

export function ConfigCard({
  item,
  onEdit,
  onToggle,
  onUpdate,
}: ConfigCardProps) {
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

  const isBooleanValue = (value: unknown): boolean => {
    return typeof value === "boolean";
  };

  const isEnumValue = (key: string): string[] | null => {
    const enums: Record<string, string[]> = {
      app_mode: ["development", "production"],
      rapid_pdf_mode: ["development", "production"],
    };
    return enums[key] || null;
  };

  const isNumberValue = (key: string): boolean => {
    const numberKeys = [
      "default_empresa_id",
      "invitation_token_expiration_days",
    ];
    return numberKeys.includes(key);
  };

  const isStringValue = (key: string): boolean => {
    const stringKeys = ["app_name"];
    return stringKeys.includes(key);
  };

  const isSimpleValue = (): boolean => {
    return (
      isBooleanValue(item.value) ||
      isEnumValue(item.key) !== null ||
      isNumberValue(item.key) ||
      isStringValue(item.key)
    );
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
            <div className="text-xs text-muted-foreground mb-1">
              Descripción
            </div>
            <div className="text-sm">{item.description || "-"}</div>
          </div>

          {/* Valor */}
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">Valor</div>
            {isBooleanValue(item.value) ? (
              <div className="flex items-center gap-3">
                <Switch
                  checked={item.value as boolean}
                  onCheckedChange={() => onToggle?.(item)}
                />
                <span className="text-sm text-muted-foreground">
                  {item.value ? "Activado" : "Desactivado"}
                </span>
              </div>
            ) : isEnumValue(item.key) ? (
              <Select
                value={item.value as string}
                onValueChange={(value) => onUpdate?.(item, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isEnumValue(item.key)!.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : isNumberValue(item.key) ? (
              <Input
                type="number"
                defaultValue={item.value as number}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    onUpdate?.(item, value);
                  }
                }}
                className="w-full"
              />
            ) : isStringValue(item.key) ? (
              <Input
                type="text"
                defaultValue={item.value as string}
                onBlur={(e) => onUpdate?.(item, e.target.value)}
                className="w-full"
              />
            ) : (
              <pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto break-words whitespace-pre-wrap">
                {formatValue(item.value)}
              </pre>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {!isSimpleValue() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(item)}
                className="flex-1"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Button>
            )}
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
