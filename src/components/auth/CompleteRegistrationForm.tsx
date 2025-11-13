"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  validateRegistrationToken,
  completeRegistration,
} from "@/app/actions/registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, CheckCircle2, Info } from "lucide-react";

interface CompleteRegistrationFormProps {
  token: string;
}

interface TokenData {
  email: string;
  name: string;
  password: string;
  tipo_emisor: "empresa" | "autonomo";
}

interface FormErrors {
  nif?: string;
  razon_social?: string;
  domicilio?: string;
  codigo_postal?: string;
  poblacion?: string;
  provincia?: string;
  telefono?: string;
  email_contacto?: string;
  general?: string;
}

export default function CompleteRegistrationForm({
  token,
}: CompleteRegistrationFormProps) {
  const router = useRouter();

  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [tokenError, setTokenError] = useState<string>("");

  const [formData, setFormData] = useState({
    nif: "",
    razon_social: "",
    domicilio: "",
    codigo_postal: "",
    poblacion: "",
    provincia: "",
    telefono: "",
    email_contacto: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Validar token al montar el componente
  useEffect(() => {
    const validateToken = async () => {
      console.log("[CompleteRegistration] Validando token...");
      setValidatingToken(true);

      const result = await validateRegistrationToken(token);

      if (!result.success || !result.data) {
        console.error("[CompleteRegistration] Token inválido:", result.error);
        setTokenError(
          result.error || "Token inválido. Por favor, inicia el registro de nuevo."
        );
        setValidatingToken(false);
        return;
      }

      console.log("[CompleteRegistration] Token válido:", result.data);
      setTokenData(result.data);
      setValidatingToken(false);
    };

    validateToken();
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validar NIF
    if (!formData.nif.trim()) {
      newErrors.nif = "El NIF/CIF es obligatorio";
    }

    // Validar razón social
    if (!formData.razon_social.trim()) {
      newErrors.razon_social = "La razón social es obligatoria";
    }

    // Validar dirección
    if (!formData.domicilio.trim()) {
      newErrors.domicilio = "La dirección es obligatoria";
    }

    // Validar código postal
    if (!formData.codigo_postal.trim()) {
      newErrors.codigo_postal = "El código postal es obligatorio";
    } else if (!/^\d{5}$/.test(formData.codigo_postal)) {
      newErrors.codigo_postal = "El código postal debe tener 5 dígitos";
    }

    // Validar población
    if (!formData.poblacion.trim()) {
      newErrors.poblacion = "La población es obligatoria";
    }

    // Validar provincia
    if (!formData.provincia.trim()) {
      newErrors.provincia = "La provincia es obligatoria";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[CompleteRegistration] Submit iniciado");

    if (!validateForm()) {
      console.log("[CompleteRegistration] Validación falló");
      return;
    }

    setIsLoading(true);

    try {
      const result = await completeRegistration(token, {
        nif: formData.nif.trim(),
        razon_social: formData.razon_social.trim(),
        domicilio: formData.domicilio.trim(),
        codigo_postal: formData.codigo_postal.trim(),
        poblacion: formData.poblacion.trim(),
        provincia: formData.provincia.trim(),
        telefono: formData.telefono.trim(),
        email_contacto: formData.email_contacto.trim() || tokenData?.email || "",
      });

      if (!result.success) {
        setErrors({
          general: result.error || "Error desconocido durante el registro",
        });
        return;
      }

      // Registro completado exitosamente
      console.log("[CompleteRegistration] Registro completado, redirigiendo...");
      setRegistrationComplete(true);

      // Esperar 2 segundos y redirigir al dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("[CompleteRegistration] Error inesperado:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Error inesperado durante el registro",
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
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  // Si el token está siendo validado
  if (validatingToken) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-lime-600 mb-4" />
          <p className="text-muted-foreground">Validando enlace de registro...</p>
        </CardContent>
      </Card>
    );
  }

  // Si el token es inválido
  if (tokenError) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            Enlace Inválido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{tokenError}</AlertDescription>
          </Alert>
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => router.push("/register")}
              className="mx-auto"
            >
              Volver al Registro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si el registro se completó exitosamente
  if (registrationComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <CheckCircle2 className="h-16 w-16 text-lime-600" />
          <h2 className="text-2xl font-semibold text-center">
            ¡Registro Completado!
          </h2>
          <p className="text-muted-foreground text-center">
            Tu cuenta ha sido creada exitosamente. Redirigiendo al dashboard...
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-lime-600" />
        </CardContent>
      </Card>
    );
  }

  // Formulario principal (PASO 2)
  return (
    <TooltipProvider>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            Completar Registro - Paso 2 de 2
          </CardTitle>
          <CardDescription className="text-center">
            Hola {tokenData?.name}, completa los datos de tu {tokenData?.tipo_emisor === "empresa" ? "empresa" : "actividad"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Error general */}
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Información sobre los datos fiscales */}
            <Alert className="border-lime-200 bg-lime-50">
              <Info className="h-4 w-4 text-lime-600" />
              <AlertDescription className="text-sm text-lime-800">
                <strong>¿Por qué pedimos estos datos?</strong> Esta información aparecerá en todos los presupuestos que generes. Podrás modificarla más tarde desde el menú <strong>Empresa</strong>.
              </AlertDescription>
            </Alert>

            {/* Sección: Datos Fiscales */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Datos Fiscales</h3>

              {/* Razón Social + NIF */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9 space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="razon_social"
                        type="text"
                        placeholder={
                          tokenData?.tipo_emisor === "empresa"
                            ? "Razón Social (Empresa) *"
                            : "Nombre Completo (Autónomo) *"
                        }
                        value={formData.razon_social}
                        onChange={handleInputChange("razon_social")}
                        className={errors.razon_social ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {tokenData?.tipo_emisor === "empresa"
                          ? "Mi Empresa S.L."
                          : "Juan Pérez García"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.razon_social && (
                    <p className="text-sm text-red-600">{errors.razon_social}</p>
                  )}
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="nif"
                        type="text"
                        placeholder="NIF/CIF *"
                        value={formData.nif}
                        onChange={handleInputChange("nif")}
                        className={errors.nif ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {tokenData?.tipo_emisor === "empresa"
                          ? "B12345678"
                          : "12345678A"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.nif && (
                    <p className="text-sm text-red-600">{errors.nif}</p>
                  )}
                </div>
              </div>

              {/* Dirección + Código Postal */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9 space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="domicilio"
                        type="text"
                        placeholder="Dirección *"
                        value={formData.domicilio}
                        onChange={handleInputChange("domicilio")}
                        className={errors.domicilio ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Calle Real, 123</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.domicilio && (
                    <p className="text-sm text-red-600">{errors.domicilio}</p>
                  )}
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="codigo_postal"
                        type="text"
                        placeholder="C.P. *"
                        maxLength={5}
                        value={formData.codigo_postal}
                        onChange={handleInputChange("codigo_postal")}
                        className={errors.codigo_postal ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>41200</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.codigo_postal && (
                    <p className="text-sm text-red-600">{errors.codigo_postal}</p>
                  )}
                </div>
              </div>

              {/* Población + Provincia */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-9 space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="poblacion"
                        type="text"
                        placeholder="Población *"
                        value={formData.poblacion}
                        onChange={handleInputChange("poblacion")}
                        className={errors.poblacion ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Alcalá del Río</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.poblacion && (
                    <p className="text-sm text-red-600">{errors.poblacion}</p>
                  )}
                </div>

                <div className="md:col-span-3 space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="provincia"
                        type="text"
                        placeholder="Provincia *"
                        value={formData.provincia}
                        onChange={handleInputChange("provincia")}
                        className={errors.provincia ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sevilla</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.provincia && (
                    <p className="text-sm text-red-600">{errors.provincia}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección: Datos de Contacto */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Datos de Contacto</h3>

              {/* Teléfono + Email de Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="telefono"
                        type="tel"
                        placeholder="Teléfono (opcional)"
                        value={formData.telefono}
                        onChange={handleInputChange("telefono")}
                        className={errors.telefono ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>678 912 345</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.telefono && (
                    <p className="text-sm text-red-600">{errors.telefono}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="email_contacto"
                        type="email"
                        placeholder="Email de Contacto (opcional)"
                        value={formData.email_contacto}
                        onChange={handleInputChange("email_contacto")}
                        className={errors.email_contacto ? "border-red-500" : ""}
                        disabled={isLoading}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Por defecto: {tokenData?.email}</p>
                    </TooltipContent>
                  </Tooltip>
                  {errors.email_contacto && (
                    <p className="text-sm text-red-600">{errors.email_contacto}</p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completando registro...
                </>
              ) : (
                "Completar Registro"
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </TooltipProvider>
  );
}
