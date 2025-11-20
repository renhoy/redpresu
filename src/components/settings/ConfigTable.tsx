"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Pencil, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

// Mapeo de keys a nombres en español
const CONFIG_NAMES: Record<string, string> = {
  app_name: "Nombre de la aplicación",
  app_mode: "Modo de la aplicación",
  multiempresa: "Modo multiempresa",
  public_registration_enabled: "Registro público",
  registration_requires_approval: "Requiere aprobación de superadmin",
  subscriptions_enabled: "Suscripciones habilitadas",
  subscription_plans: "Planes de suscripción",
  subscription_grace_period_days: "Días de período de gracia",
  default_empresa_id: "ID de empresa por defecto",
  invitation_email_template: "Plantilla de email de invitación",
  invitation_token_expiration_days: "Días de expiración del token de invitación",
  default_tariff: "Tarifa por defecto",
  iva_re_equivalences: "Equivalencias IVA/RE",
  pdf_templates: "Plantillas PDF",
  rapid_pdf_mode: "Modo PDF rápido",
  contact_notification_emails: "Emails de notificación de contacto",
  forms_legal_notice: "Aviso legal de formularios",
  legal_page_content: "Contenido de página legal",
};

// Función helper para obtener el estado de un valor de configuración
const getValueStatus = (value: unknown, key?: string): string => {
  if (typeof value === 'boolean') {
    return value ? 'Activado' : 'Desactivado';
  }
  if (typeof value === 'string') {
    // Si es HTML (contiene tags), no mostrar el contenido
    if (value.includes('<') && value.includes('>')) {
      return 'Configurado';
    }
    // Si es un string muy largo, truncar
    if (value.length > 50) {
      return 'Configurado';
    }
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object' && value !== null) {
    return 'Configurado';
  }
  return 'Configurado';
};

// Función helper para formatear la descripción con nombre en negrita
const getFormattedDescription = (key: string, value: unknown, description: string): string => {
  const name = CONFIG_NAMES[key] || key;
  const status = getValueStatus(value);
  return `**${name} (${status})** ${description || ''}`;
};

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RichTextEditor } from "@/components/shared/RichTextEditor";

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

  const isHTMLValue = (key: string): boolean => {
    const htmlKeys = ["forms_legal_notice", "legal_page_content"];
    return htmlKeys.includes(key);
  };

  const isSimpleValue = (item: ConfigRow): boolean => {
    return (
      isBooleanValue(item.value) ||
      isEnumValue(item.key) !== null ||
      isNumberValue(item.key) ||
      isStringValue(item.key)
    );
  };

  const handleToggleBoolean = async (item: ConfigRow) => {
    const newValue = !item.value;

    const result = await updateConfigValue(
      item.key,
      newValue,
      item.description || ""
    );

    if (result.success) {
      toast.success("Configuración actualizada");
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar");
    }
  };

  const handleUpdateValue = async (
    item: ConfigRow,
    newValue: string | number
  ) => {
    const result = await updateConfigValue(
      item.key,
      newValue,
      item.description || ""
    );

    if (result.success) {
      toast.success("Configuración actualizada");
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar");
    }
  };

  return (
    <>
      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="table-fixed w-full min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Acciones</TableHead>
                <TableHead className="w-auto">Configuración</TableHead>
                <TableHead className="w-72">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No hay configuración en esta categoría
                  </TableCell>
                </TableRow>
              ) : (
                config.map((item) => {
                  const enumValues = isEnumValue(item.key);
                  const isNumber = isNumberValue(item.key);
                  const isString = isStringValue(item.key);
                  const isBoolean = isBooleanValue(item.value);
                  const isSimple = isSimpleValue(item);

                  return (
                    <TableRow
                      key={item.key}
                      className="bg-white hover:bg-lime-50/50"
                    >
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {!isSimple && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              title="Editar valor"
                              className="border bg-white shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50 size-9 border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {item.key === "default_empresa_id" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleViewIssuer(item.value as number)
                              }
                              disabled={isLoadingIssuer}
                              title="Ver datos de la empresa"
                              className="border bg-white shadow-xs dark:bg-input/30 dark:border-input dark:hover:bg-input/50 size-9 border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="break-words whitespace-normal">
                          <strong className="text-gray-900">
                            {CONFIG_NAMES[item.key] || item.key} ({getValueStatus(item.value)})
                          </strong>
                          {item.description && (
                            <span className="text-muted-foreground"> {item.description}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isBoolean ? (
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={item.value as boolean}
                              onCheckedChange={() => handleToggleBoolean(item)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {item.value ? "Activado" : "Desactivado"}
                            </span>
                          </div>
                        ) : enumValues ? (
                          <Select
                            value={item.value as string}
                            onValueChange={(value) =>
                              handleUpdateValue(item, value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {enumValues.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : isNumber ? (
                          <Input
                            type="number"
                            defaultValue={item.value as number}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                handleUpdateValue(item, value);
                              }
                            }}
                            className="w-full"
                          />
                        ) : isString ? (
                          <Input
                            type="text"
                            defaultValue={item.value as string}
                            onBlur={(e) =>
                              handleUpdateValue(item, e.target.value)
                            }
                            className="w-full"
                          />
                        ) : (
                          <pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto break-words whitespace-pre-wrap">
                            {formatValue(item.value)}
                          </pre>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden">
        {config.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay configuración en esta categoría
          </div>
        ) : (
          config.map((item) => (
            <ConfigCard
              key={item.key}
              item={item}
              onEdit={handleEdit}
              onToggle={handleToggleBoolean}
              onUpdate={handleUpdateValue}
            />
          ))
        )}
      </div>

      {/* Dialog de edición */}
      <Dialog
        open={!!editingConfig}
        onOpenChange={() => setEditingConfig(null)}
      >
        <DialogContent
          className={
            editingConfig && isHTMLValue(editingConfig.key)
              ? "w-[90vw] max-w-none sm:max-w-none max-h-[90vh] overflow-y-auto"
              : "w-[80vw] max-w-none sm:max-w-none"
          }
        >
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
              {editingConfig && isHTMLValue(editingConfig.key) ? (
                <>
                  <Label htmlFor="value">Contenido HTML</Label>
                  <div className="border rounded-md min-h-[400px]">
                    <RichTextEditor
                      value={editValue ? JSON.parse(editValue) : ""}
                      onChange={(html) => setEditValue(JSON.stringify(html))}
                      placeholder="Escribe el contenido aquí..."
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usa el editor para dar formato al contenido. El HTML se
                    guardará automáticamente.
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}
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
