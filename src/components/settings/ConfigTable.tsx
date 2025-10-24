"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Pencil, Eye } from "lucide-react";
import { ConfigCard } from "./ConfigCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  updateConfigValue,
  getIssuerByEmpresaId,
  type IssuerData,
} from "@/app/actions/config";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ConfigRow = Database["public"]["Tables"]["config"]["Row"];

interface ConfigTableProps {
  config: ConfigRow[];
}

export function ConfigTable({ config }: ConfigTableProps) {
  const router = useRouter();
  const [editingConfig, setEditingConfig] = useState<ConfigRow | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Estado para visualizar issuer
  const [viewingIssuer, setViewingIssuer] = useState<IssuerData | null>(null);
  const [isLoadingIssuer, setIsLoadingIssuer] = useState(false);

  const handleEdit = (item: ConfigRow) => {
    setEditingConfig(item);
    setEditValue(JSON.stringify(item.value, null, 2));
    setEditDescription(item.description || "");
  };

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

  const handleSave = async () => {
    if (!editingConfig) return;

    setIsSaving(true);
    try {
      // Parsear el JSON
      const parsedValue = JSON.parse(editValue);

      const result = await updateConfigValue(
        editingConfig.key,
        parsedValue,
        editDescription
      );

      if (result.success) {
        toast.success("Configuración actualizada");
        setEditingConfig(null);
        router.refresh();
      } else {
        toast.error(result.error || "Error al actualizar");
      }
    } catch (error) {
      toast.error("Error: JSON inválido");
    } finally {
      setIsSaving(false);
    }
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  };

  return (
    <>
      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead className="w-[200px]">Clave</TableHead>
              <TableHead className="w-[200px]">Descripción</TableHead>
              <TableHead>Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay configuración en esta categoría
                </TableCell>
              </TableRow>
            ) : (
              config.map((item) => (
                <TableRow
                  key={item.key}
                  className="bg-white hover:bg-lime-50/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        title="Editar valor"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {item.key === "default_empresa_id" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewIssuer(item.value as number)}
                          disabled={isLoadingIssuer}
                          title="Ver datos de la empresa"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.key}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.description || "-"}
                  </TableCell>
                  <TableCell>
                    <pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
                      {formatValue(item.value)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden">
        {config.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay configuración en esta categoría
          </div>
        ) : (
          config.map((item) => (
            <ConfigCard key={item.key} item={item} onEdit={handleEdit} />
          ))
        )}
      </div>

      {/* Dialog de edición */}
      <Dialog
        open={!!editingConfig}
        onOpenChange={() => setEditingConfig(null)}
      >
        <DialogContent className="w-[80vw] max-w-none sm:max-w-none">
          <DialogHeader>
            <DialogTitle>Editar valor de Clave</DialogTitle>
            <DialogDescription>
              <code className="font-mono">{editingConfig?.key}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor (JSON)</Label>
              <Textarea
                id="value"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                El valor debe ser JSON válido
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingConfig(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
