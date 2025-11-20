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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface CompleteProfileModalProps {
  tipoEmisor: "empresa" | "autonomo";
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
  tipoEmisor,
  userName,
  userEmail,
  legalNotice,
  onComplete,
}: CompleteProfileModalProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nif: "",
    razon_social: "",
    domicilio: "",
    codigo_postal: "",
    poblacion: "",
    provincia: "",
    irpf_percentage: tipoEmisor === "autonomo" ? 15 : 0,
    telefono: "",
    email_contacto: userEmail,
    web: "",
    privacyAccepted: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validar NIF
    if (!formData.nif.trim()) {
      newErrors.nif = "El NIF es obligatorio";
    }

    // Validar Razón Social
    if (!formData.razon_social.trim()) {
      newErrors.razon_social = "La razón social es obligatoria";
    }

    // Validar domicilio
    if (!formData.domicilio.trim()) {
      newErrors.domicilio = "El domicilio es obligatorio";
    }

    // Validar código postal
    if (!formData.codigo_postal.trim()) {
      newErrors.codigo_postal = "El código postal es obligatorio";
    } else if (!/^\d{5}$/.test(formData.codigo_postal)) {
      newErrors.codigo_postal = "Código postal inválido (debe tener 5 dígitos)";
    }

    // Validar población
    if (!formData.poblacion.trim()) {
      newErrors.poblacion = "La población es obligatoria";
    }

    // Validar provincia
    if (!formData.provincia.trim()) {
      newErrors.provincia = "La provincia es obligatoria";
    }

    // Validar teléfono
    if (!formData.telefono.trim()) {
      newErrors.telefono = "El teléfono es obligatorio";
    }

    // Validar email de contacto
    if (!formData.email_contacto.trim()) {
      newErrors.email_contacto = "El email de contacto es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_contacto)) {
      newErrors.email_contacto = "Email de contacto inválido";
    }

    // Validar IRPF para autónomos
    if (tipoEmisor === "autonomo") {
      if (
        formData.irpf_percentage < 0 ||
        formData.irpf_percentage > 100
      ) {
        newErrors.irpf_percentage = "El IRPF debe estar entre 0 y 100";
      }
    }

    // Validar privacidad
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

      // Llamar al callback con el estado de aprobación
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

      // Limpiar error del campo cuando el usuario empieza a escribir
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
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Completa tu Perfil
          </DialogTitle>
          <DialogDescription>
            Para continuar, necesitamos algunos datos adicionales
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Información del usuario */}
          <div className="bg-lime-50 p-4 rounded-lg space-y-1">
            <p className="text-sm font-medium">Usuario: {userName}</p>
            <p className="text-sm text-muted-foreground">Email: {userEmail}</p>
            <p className="text-sm text-muted-foreground">
              Tipo: {tipoEmisor === "empresa" ? "Empresa" : "Autónomo"}
            </p>
          </div>

          {/* Datos fiscales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datos Fiscales</h3>

            {/* NIF y Razón Social */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nif">
                  NIF / CIF <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nif"
                  type="text"
                  placeholder="12345678A"
                  value={formData.nif}
                  onChange={handleInputChange("nif")}
                  className={errors.nif ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.nif && (
                  <p className="text-sm text-red-600">{errors.nif}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="razon_social">
                  Razón Social <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="razon_social"
                  type="text"
                  placeholder="Mi Empresa S.L."
                  value={formData.razon_social}
                  onChange={handleInputChange("razon_social")}
                  className={errors.razon_social ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.razon_social && (
                  <p className="text-sm text-red-600">{errors.razon_social}</p>
                )}
              </div>
            </div>

            {/* Domicilio */}
            <div className="space-y-2">
              <Label htmlFor="domicilio">
                Domicilio Fiscal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="domicilio"
                type="text"
                placeholder="Calle Principal, 123"
                value={formData.domicilio}
                onChange={handleInputChange("domicilio")}
                className={errors.domicilio ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.domicilio && (
                <p className="text-sm text-red-600">{errors.domicilio}</p>
              )}
            </div>

            {/* Código Postal, Población, Provincia */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_postal">
                  Código Postal <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="codigo_postal"
                  type="text"
                  placeholder="28001"
                  maxLength={5}
                  value={formData.codigo_postal}
                  onChange={handleInputChange("codigo_postal")}
                  className={errors.codigo_postal ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.codigo_postal && (
                  <p className="text-sm text-red-600">{errors.codigo_postal}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="poblacion">
                  Población <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="poblacion"
                  type="text"
                  placeholder="Madrid"
                  value={formData.poblacion}
                  onChange={handleInputChange("poblacion")}
                  className={errors.poblacion ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.poblacion && (
                  <p className="text-sm text-red-600">{errors.poblacion}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="provincia">
                  Provincia <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="provincia"
                  type="text"
                  placeholder="Madrid"
                  value={formData.provincia}
                  onChange={handleInputChange("provincia")}
                  className={errors.provincia ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.provincia && (
                  <p className="text-sm text-red-600">{errors.provincia}</p>
                )}
              </div>
            </div>

            {/* IRPF (solo para autónomos) */}
            {tipoEmisor === "autonomo" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="irpf_percentage">
                    IRPF (%) <span className="text-red-500">*</span>
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Porcentaje de retención de IRPF aplicable a tus
                          facturas. Por defecto 15%.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="irpf_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.irpf_percentage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      irpf_percentage: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={errors.irpf_percentage ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.irpf_percentage && (
                  <p className="text-sm text-red-600">
                    {errors.irpf_percentage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Datos de contacto */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Datos de Contacto</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="912345678"
                  value={formData.telefono}
                  onChange={handleInputChange("telefono")}
                  className={errors.telefono ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.telefono && (
                  <p className="text-sm text-red-600">{errors.telefono}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_contacto">
                  Email de Contacto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email_contacto"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={formData.email_contacto}
                  onChange={handleInputChange("email_contacto")}
                  className={errors.email_contacto ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.email_contacto && (
                  <p className="text-sm text-red-600">{errors.email_contacto}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="web">Página Web (opcional)</Label>
              <Input
                id="web"
                type="url"
                placeholder="https://miempresa.com"
                value={formData.web}
                onChange={handleInputChange("web")}
                className={errors.web ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.web && (
                <p className="text-sm text-red-600">{errors.web}</p>
              )}
            </div>
          </div>

          {/* Checkbox de privacidad */}
          <div className="flex items-start space-x-2 pt-4 border-t">
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completando perfil...
              </>
            ) : (
              "Completar Perfil"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
