"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeUserProfile } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Info, Building2, User } from "lucide-react";
import { toast } from "sonner";

interface CompleteProfileModalProps {
  userName: string;
  userEmail: string;
  legalNotice: string;
  onComplete: (requiresApproval: boolean) => void;
}

interface FormErrors {
  nif?: string;
  razon_social?: string;
  domicilio?: string;
  codigo_postal?: string;
  poblacion?: string;
  provincia?: string;
  irpf_percentage?: string;
  telefono?: string;
  email_contacto?: string;
  web?: string;
  general?: string;
}

export function CompleteProfileModal({
  userName,
  userEmail,
  legalNotice,
  onComplete,
}: CompleteProfileModalProps) {
  const router = useRouter();

  const [tipoEmisor, setTipoEmisor] = useState<"empresa" | "autonomo">("empresa");
  const [formData, setFormData] = useState({
    nif: "",
    razon_social: "",
    domicilio: "",
    codigo_postal: "",
    poblacion: "",
    provincia: "",
    irpf_percentage: 15,
    telefono: "",
    email_contacto: userEmail,
    web: "",
    privacyAccepted: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nif.trim()) {
      newErrors.nif = "El NIF es obligatorio";
    }

    if (!formData.razon_social.trim()) {
      newErrors.razon_social = "La razón social es obligatoria";
    }

    if (!formData.domicilio.trim()) {
      newErrors.domicilio = "El domicilio es obligatorio";
    }

    if (!formData.codigo_postal.trim()) {
      newErrors.codigo_postal = "El código postal es obligatorio";
    } else if (!/^\d{5}$/.test(formData.codigo_postal)) {
      newErrors.codigo_postal = "Código postal inválido (debe tener 5 dígitos)";
    }

    if (!formData.poblacion.trim()) {
      newErrors.poblacion = "La población es obligatoria";
    }

    if (!formData.provincia.trim()) {
      newErrors.provincia = "La provincia es obligatoria";
    }

    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es obligatorio";
    }

    if (!formData.email_contacto.trim()) {
      newErrors.email_contacto = "El email de contacto es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_contacto)) {
      newErrors.email_contacto = "Email de contacto inválido";
    }

    if (tipoEmisor === "autonomo") {
      if (formData.irpf_percentage < 0 || formData.irpf_percentage > 100) {
        newErrors.irpf_percentage = "El IRPF debe estar entre 0 y 100";
      }
    }

    if (!formData.privacyAccepted) {
      newErrors.general = "Debes aceptar la política de privacidad para continuar";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[CompleteProfileModal] Submit iniciado");

    if (!validateForm()) {
      console.log("[CompleteProfileModal] Validación falló");
      return;
    }

    setIsLoading(true);

    try {
      const result = await completeUserProfile({
        tipo_emisor: tipoEmisor,
        nif: formData.nif.trim(),
        razon_social: formData.razon_social.trim(),
        domicilio: formData.domicilio.trim(),
        codigo_postal: formData.codigo_postal.trim(),
        poblacion: formData.poblacion.trim(),
        provincia: formData.provincia.trim(),
        irpf_percentage:
          tipoEmisor === "autonomo" ? formData.irpf_percentage : undefined,
        telefono: formData.telefono.trim(),
        email_contacto: formData.email_contacto.trim(),
        web: formData.web.trim() || undefined,
      });

      if (!result.success) {
        setErrors({
          general: result.error || "Error desconocido al completar el perfil",
        });
        return;
      }

      console.log("[CompleteProfileModal] Perfil completado exitosamente");
      console.log("[CompleteProfileModal] Requiere aprobación:", result.requiresApproval);

      toast.success("Perfil completado exitosamente");
      onComplete(result.requiresApproval || false);
    } catch (error) {
      console.error("[CompleteProfileModal] Error inesperado:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Error inesperado al completar el perfil",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-4xl w-[90vw] overflow-visible"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {tipoEmisor === "empresa" ? "Datos de Empresa" : "Datos de Autónomo"}
          </DialogTitle>
          <DialogDescription>
            Para continuar, necesitamos algunos datos adicionales
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Datos del Administrador */}
          <div className="bg-lime-50 px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Administrador:</span>
            <span className="font-medium">{userName}</span>
            <span className="text-muted-foreground">({userEmail})</span>
          </div>

          {/* Tipo de Emisor - Tabs */}
          <Tabs
            value={tipoEmisor}
            onValueChange={(value) => setTipoEmisor(value as "empresa" | "autonomo")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="empresa" disabled={isLoading}>
                <Building2 className="h-4 w-4 mr-2" />
                Empresa
              </TabsTrigger>
              <TabsTrigger value="autonomo" disabled={isLoading}>
                <User className="h-4 w-4 mr-2" />
                Autónomo
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Datos fiscales */}
          <div className="space-y-3">
            {/* Razón Social + IRPF (solo autónomo) + NIF */}
            <div className="grid grid-cols-12 gap-3">
              {tipoEmisor === "empresa" ? (
                <>
                  {/* Empresa: Razón Social (75%) + NIF (25%) */}
                  <div className="col-span-9">
                    <Input
                      id="razon_social"
                      type="text"
                      placeholder="Razón Social*: Mi Empresa S.L."
                      value={formData.razon_social}
                      onChange={handleInputChange("razon_social")}
                      className={errors.razon_social ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.razon_social && (
                      <p className="text-xs text-red-600 mt-1">{errors.razon_social}</p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Input
                      id="nif"
                      type="text"
                      placeholder="NIF/CIF*: B12345678"
                      value={formData.nif}
                      onChange={handleInputChange("nif")}
                      className={errors.nif ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.nif && (
                      <p className="text-xs text-red-600 mt-1">{errors.nif}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Autónomo: Nombre (50%) + IRPF (25%) + NIF (25%) */}
                  <div className="col-span-6">
                    <Input
                      id="razon_social"
                      type="text"
                      placeholder="Nombre Completo*: Juan García López"
                      value={formData.razon_social}
                      onChange={handleInputChange("razon_social")}
                      className={errors.razon_social ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.razon_social && (
                      <p className="text-xs text-red-600 mt-1">{errors.razon_social}</p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <Input
                        id="irpf_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="IRPF %*"
                        value={formData.irpf_percentage}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            irpf_percentage: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className={errors.irpf_percentage ? "border-red-500 pr-8" : "pr-8"}
                        disabled={isLoading}
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button" className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Porcentaje de retención de IRPF aplicable a tus facturas. Por defecto 15%.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {errors.irpf_percentage && (
                      <p className="text-xs text-red-600 mt-1">{errors.irpf_percentage}</p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Input
                      id="nif"
                      type="text"
                      placeholder="NIF*: 12345678A"
                      value={formData.nif}
                      onChange={handleInputChange("nif")}
                      className={errors.nif ? "border-red-500" : ""}
                      disabled={isLoading}
                    />
                    {errors.nif && (
                      <p className="text-xs text-red-600 mt-1">{errors.nif}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Domicilio (75%) + Código Postal (25%) */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-9">
                <Input
                  id="domicilio"
                  type="text"
                  placeholder="Domicilio Fiscal*: Calle Principal, 123"
                  value={formData.domicilio}
                  onChange={handleInputChange("domicilio")}
                  className={errors.domicilio ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.domicilio && (
                  <p className="text-xs text-red-600 mt-1">{errors.domicilio}</p>
                )}
              </div>
              <div className="col-span-3">
                <Input
                  id="codigo_postal"
                  type="text"
                  placeholder="C.P.*: 28001"
                  maxLength={5}
                  value={formData.codigo_postal}
                  onChange={handleInputChange("codigo_postal")}
                  className={errors.codigo_postal ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.codigo_postal && (
                  <p className="text-xs text-red-600 mt-1">{errors.codigo_postal}</p>
                )}
              </div>
            </div>

            {/* Población (75%) + Provincia (25%) */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-9">
                <Input
                  id="poblacion"
                  type="text"
                  placeholder="Población*: Madrid"
                  value={formData.poblacion}
                  onChange={handleInputChange("poblacion")}
                  className={errors.poblacion ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.poblacion && (
                  <p className="text-xs text-red-600 mt-1">{errors.poblacion}</p>
                )}
              </div>
              <div className="col-span-3">
                <Input
                  id="provincia"
                  type="text"
                  placeholder="Provincia*: Madrid"
                  value={formData.provincia}
                  onChange={handleInputChange("provincia")}
                  className={errors.provincia ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.provincia && (
                  <p className="text-xs text-red-600 mt-1">{errors.provincia}</p>
                )}
              </div>
            </div>

            {/* Teléfono (25%) + Email (50%) + Web (25%) */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="Teléfono*: 912345678"
                  value={formData.telefono}
                  onChange={handleInputChange("telefono")}
                  className={errors.telefono ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.telefono && (
                  <p className="text-xs text-red-600 mt-1">{errors.telefono}</p>
                )}
              </div>
              <div className="col-span-6">
                <Input
                  id="email_contacto"
                  type="email"
                  placeholder="Email*: contacto@empresa.com"
                  value={formData.email_contacto}
                  onChange={handleInputChange("email_contacto")}
                  className={errors.email_contacto ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.email_contacto && (
                  <p className="text-xs text-red-600 mt-1">{errors.email_contacto}</p>
                )}
              </div>
              <div className="col-span-3">
                <Input
                  id="web"
                  type="url"
                  placeholder="Web: https://miweb.com"
                  value={formData.web}
                  onChange={handleInputChange("web")}
                  className={errors.web ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.web && (
                  <p className="text-xs text-red-600 mt-1">{errors.web}</p>
                )}
              </div>
            </div>
          </div>

          {/* Checkbox de privacidad */}
          <div className="flex items-start space-x-2 pt-3 border-t">
            <Checkbox
              id="privacyAccepted"
              checked={formData.privacyAccepted}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  privacyAccepted: checked as boolean,
                }))
              }
              disabled={isLoading}
            />
            <Label
              htmlFor="privacyAccepted"
              className="text-sm font-normal leading-relaxed cursor-pointer"
            >
              Acepto la{" "}
              <a
                href="/legal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime-600 underline hover:text-lime-700"
              >
                política de privacidad
              </a>{" "}
              y el tratamiento de mis datos personales{" "}
              <span className="text-red-500">*</span>
            </Label>
          </div>

          {/* Botón de submit */}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </form>

        {/* Información Legal */}
        <Card className="mt-4">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm">Información Legal</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="text-xs text-muted-foreground max-h-28 overflow-y-auto">
              {legalNotice ? (
                <div dangerouslySetInnerHTML={{ __html: legalNotice }} />
              ) : (
                <p>
                  Al registrarte y completar tus datos fiscales, aceptas nuestros términos de servicio
                  y política de privacidad. Tus datos serán tratados de acuerdo con la normativa vigente
                  de protección de datos (RGPD). Para más información, consulta nuestra página de
                  información legal.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
