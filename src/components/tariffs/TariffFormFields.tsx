"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { LogoUploader } from "./LogoUploader";
import { TemplateSelector } from "./TemplateSelector";
import { RichTextEditorDialog } from "@/components/shared/RichTextEditorDialog";
import { type TariffFormData } from "@/app/actions/tariffs";

interface TariffFormFieldsProps {
  data: TariffFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<TariffFormData>) => void;
}

export function TariffFormFields({
  data,
  errors,
  onChange,
}: TariffFormFieldsProps) {
  const handleInputChange = (
    field: keyof TariffFormData,
    value: string | number
  ) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Datos Tarifa */}
      <Card id="card-datos-tarifa" className="bg-lime-50">
        <CardHeader>
          <CardTitle>Datos Tarifa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="title">Título *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Nombre identificativo de esta tarifa. Se utiliza para
                      identificarla en el listado y al crear presupuestos.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Nombre de la tarifa"
              className={`bg-white ${errors.title ? "border-destructive" : ""}`}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="description">Descripción</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Descripción opcional de la tarifa. Solo para uso interno,
                      no se muestra en presupuestos ni PDFs.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descripción de la tarifa (opcional)"
              rows={3}
              className="bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="validity">Validez (días) *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Número de días que tendrá validez el presupuesto desde
                        su fecha de emisión. Este valor se mostrará en el PDF
                        generado.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="validity"
                type="number"
                value={data.validity}
                onChange={(e) =>
                  handleInputChange("validity", parseInt(e.target.value) || 30)
                }
                min="1"
                max="365"
                className={`bg-white ${
                  errors.validity ? "border-destructive" : ""
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="status">Estado *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Si la tarifa está activa, podrá usarse para crear
                        presupuestos. Las tarifas inactivas no aparecen en el
                        selector.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={data.status}
                onValueChange={(value: "Activa" | "Inactiva") =>
                  handleInputChange("status", value)
                }
              >
                <SelectTrigger
                  id="status"
                  className={`bg-white ${
                    errors.status ? "border-destructive" : ""
                  }`}
                >
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
      <Card id="card-datos-empresa" className="bg-lime-50">
        <CardHeader>
          <CardTitle>Datos Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id="logo-uploader">
            <LogoUploader
              value={data.logo_url}
              onChange={(url) => handleInputChange("logo_url", url)}
              error={errors.logo_url}
            />
          </div>

          {/* Vista Previa Inline */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600 mb-3">
              Vista previa (así se verá en el PDF y en la página de presupuesto)
            </div>
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
                  {data.name || "Nombre*"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {data.nif || "NIF/CIF*"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.address || "Dirección fiscal completa*"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.contact || "Teléfono, email, web*"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="name">Nombre *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Nombre completo de tu empresa o nombre como autónomo. Se
                        mostrará en los presupuestos y en los PDFs generados.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nombre completo de la empresa"
                className={`bg-white ${
                  errors.name ? "border-destructive" : ""
                }`}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
            </div>

            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="nif">NIF/CIF *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        CIF de tu empresa (ej: A12345678) o DNI/NIE como
                        autónomo (ej: 12345678Z). Se mostrará en los
                        presupuestos y en los PDFs generados.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="nif"
                value={data.nif}
                onChange={(e) =>
                  handleInputChange("nif", e.target.value.toUpperCase())
                }
                placeholder="A12345678 o 12345678Z"
                className={`bg-white ${errors.nif ? "border-destructive" : ""}`}
              />
              {errors.nif && (
                <p className="text-sm text-destructive mt-1">{errors.nif}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="address">Dirección fiscal completa *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Dirección completa de tu empresa o domicilio fiscal
                      (calle, código postal, ciudad, provincia). Se mostrará en
                      los presupuestos y PDFs.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="address"
              value={data.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Dirección, código postal, ciudad, provincia"
              className={`bg-white ${
                errors.address ? "border-destructive" : ""
              }`}
            />
            {errors.address && (
              <p className="text-sm text-destructive mt-1">{errors.address}</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="contact">Teléfono, email, web *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Información de contacto (teléfono, email, web). Se
                      mostrará en los presupuestos y PDFs para que tus clientes
                      puedan contactarte.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="contact"
              value={data.contact}
              onChange={(e) => handleInputChange("contact", e.target.value)}
              placeholder="Información de contacto"
              className={`bg-white ${
                errors.contact ? "border-destructive" : ""
              }`}
            />
            {errors.contact && (
              <p className="text-sm text-destructive mt-1">{errors.contact}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Configuración Visual */}
      <Card id="card-configuracion-visual" className="bg-lime-50">
        <CardHeader>
          <CardTitle>Configuración Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div id="template-selector">
              <TemplateSelector
                value={data.template}
                onChange={(value) => handleInputChange("template", value)}
                error={errors.template}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="primary_color">Color Primario *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Color principal que se utilizará en la página de
                        presupuestos y en las plantillas PDF que usan colores.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={data.primary_color}
                  onChange={(e) =>
                    handleInputChange("primary_color", e.target.value)
                  }
                  className="w-10 h-10 p-1 border rounded cursor-pointer bg-white"
                />
                <Input
                  value={data.primary_color}
                  onChange={(e) =>
                    handleInputChange("primary_color", e.target.value)
                  }
                  placeholder="#e8951c"
                  className="flex-1 text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="secondary_color">Color Secundario *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Color secundario que se utilizará en la página de
                        presupuestos y en las plantillas PDF que usan colores.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={data.secondary_color}
                  onChange={(e) =>
                    handleInputChange("secondary_color", e.target.value)
                  }
                  className="w-10 h-10 p-1 border rounded cursor-pointer bg-white"
                />
                <Input
                  value={data.secondary_color}
                  onChange={(e) =>
                    handleInputChange("secondary_color", e.target.value)
                  }
                  placeholder="#109c61"
                  className="flex-1 text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Notas PDF */}
      <Card id="card-notas-pdf" className="bg-lime-50">
        <CardHeader>
          <CardTitle>Notas PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id="summary_note">
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="summary_note">Texto resumen PDF *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Texto que aparecerá en la sección de resumen del PDF
                      generado. Puedes incluir información adicional sobre el
                      presupuesto.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RichTextEditorDialog
              value={data.summary_note}
              onChange={(html) => handleInputChange("summary_note", html)}
              label="Texto resumen PDF"
              description="Texto que aparecerá en la sección de resumen del PDF generado"
              placeholder="Escribe el texto del resumen aquí..."
            />
            {errors.summary_note && (
              <p className="text-sm text-destructive mt-1">
                {errors.summary_note}
              </p>
            )}
          </div>

          <div id="conditions_note">
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="conditions_note">Texto condiciones PDF *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Condiciones generales que aparecerán en el PDF. Por
                      ejemplo: forma de pago, plazos de entrega, garantías, etc.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RichTextEditorDialog
              value={data.conditions_note}
              onChange={(html) => handleInputChange("conditions_note", html)}
              label="Texto condiciones PDF"
              description="Condiciones generales que aparecerán en el PDF (forma de pago, plazos, garantías, etc.)"
              placeholder="Escribe las condiciones del presupuesto aquí..."
            />
            {errors.conditions_note && (
              <p className="text-sm text-destructive mt-1">
                {errors.conditions_note}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Notas Formulario */}
      <Card id="card-notas-formulario" className="bg-lime-50">
        <CardHeader>
          <CardTitle>Notas Formulario</CardTitle>
        </CardHeader>
        <CardContent>
          <div id="legal_note">
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="legal_note">
                Notas legales página presupuesto *
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Notas legales que aparecerán en la página web del
                      presupuesto. Por ejemplo: política de privacidad, RGPD,
                      avisos legales, etc.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RichTextEditorDialog
              value={data.legal_note}
              onChange={(html) => handleInputChange("legal_note", html)}
              label="Notas legales página presupuesto"
              description="Notas legales que aparecerán en la página web del presupuesto (RGPD, privacidad, avisos legales, etc.)"
              placeholder="Escribe las notas legales aquí..."
            />
            {errors.legal_note && (
              <p className="text-sm text-destructive mt-1">
                {errors.legal_note}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
