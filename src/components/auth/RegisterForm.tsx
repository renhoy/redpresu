"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRegistrationToken } from "@/app/actions/registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, User } from "lucide-react";
import { validateEmail } from "@/lib/helpers/email-validation";
import { EmailConfirmationMessage } from "@/components/auth/EmailConfirmationMessage";

interface RegisterStep1Errors {
  name?: string;
  last_name?: string;
  email?: string;
  confirmEmail?: string;
  tipo?: string;
  general?: string;
}

export default function RegisterForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    email: "",
    confirmEmail: "",
    tipo: "empresa" as "empresa" | "autonomo",
  });

  const [errors, setErrors] = useState<RegisterStep1Errors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const [registrationToken, setRegistrationToken] = useState<string>("");
  const [isDevelopment, setIsDevelopment] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: RegisterStep1Errors = {};

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    // Validar apellidos
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Los apellidos son obligatorios";
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.valid) {
        newErrors.email = emailValidation.error || "Email no válido";
      }
    }

    // Validar confirmación de email
    if (!formData.confirmEmail.trim()) {
      newErrors.confirmEmail = "Debes confirmar el email";
    } else if (formData.email !== formData.confirmEmail) {
      newErrors.confirmEmail = "Los emails no coinciden";
    }

    // Validar tipo
    if (!formData.tipo) {
      newErrors.tipo = "Debes seleccionar un tipo de emisor";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[RegisterForm PASO 1] Submit iniciado");

    if (!validateForm()) {
      console.log("[RegisterForm PASO 1] Validación falló");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createRegistrationToken({
        name: formData.name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        tipo_emisor: formData.tipo,
      });

      if (!result.success) {
        setErrors({
          general: result.error || "Error desconocido durante el registro",
        });
        return;
      }

      // PASO 1 completado exitosamente
      console.log("[RegisterForm PASO 1] Token creado exitosamente");

      setRegisteredEmail(formData.email);
      setRegistrationToken(result.data?.token || "");
      setIsDevelopment(process.env.NODE_ENV === "development");
      setRegistrationSuccess(true);

      // En desarrollo: auto-redirigir a PASO 2 después de 10s
      if (process.env.NODE_ENV === "development" && result.data?.token) {
        console.log("[RegisterForm PASO 1] Modo desarrollo: programando redirección a PASO 2");
        setTimeout(() => {
          router.push(`/register/complete?token=${result.data.token}`);
        }, 10000);
      }
    } catch (error) {
      console.error("[RegisterForm PASO 1] Error inesperado:", error);
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

      // Validar email en tiempo real
      if (field === "email" && value.trim()) {
        const validation = validateEmail(value);
        if (!validation.valid) {
          setErrors((prev) => ({
            ...prev,
            email: validation.error || "Email no válido",
          }));
          return;
        }
      }

      // Limpiar error del campo cuando el usuario empieza a escribir
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleTabChange = (value: "empresa" | "autonomo") => {
    setFormData((prev) => ({
      ...prev,
      tipo: value,
    }));

    if (errors.tipo) {
      setErrors((prev) => ({
        ...prev,
        tipo: undefined,
      }));
    }
  };

  // Si el PASO 1 fue exitoso, mostrar mensaje de confirmación de email
  if (registrationSuccess && registeredEmail) {
    return (
      <EmailConfirmationMessage
        email={registeredEmail}
        isDevelopment={isDevelopment}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          Crear Cuenta - Paso 1 de 2
        </CardTitle>
        <CardDescription className="text-center">
          Datos de Acceso (Administrador)
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

          {/* Tipo de Emisor - Tabs */}
          <div className="space-y-2">
            <Tabs
              value={formData.tipo}
              onValueChange={handleTabChange}
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
            {errors.tipo && (
              <p className="text-sm text-red-600">{errors.tipo}</p>
            )}
          </div>

          {/* Nombre y Apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                id="name"
                type="text"
                placeholder="Nombre *"
                value={formData.name}
                onChange={handleInputChange("name")}
                className={errors.name ? "border-red-500" : ""}
                disabled={isLoading}
                autoComplete="given-name"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                id="last_name"
                type="text"
                placeholder="Apellidos *"
                value={formData.last_name}
                onChange={handleInputChange("last_name")}
                className={errors.last_name ? "border-red-500" : ""}
                disabled={isLoading}
                autoComplete="family-name"
              />
              {errors.last_name && (
                <p className="text-sm text-red-600">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Email y Confirmar Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={handleInputChange("email")}
                className={errors.email ? "border-red-500" : ""}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                id="confirmEmail"
                type="email"
                placeholder="Confirmar Email *"
                value={formData.confirmEmail}
                onChange={handleInputChange("confirmEmail")}
                className={errors.confirmEmail ? "border-red-500" : ""}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.confirmEmail && (
                <p className="text-sm text-red-600">{errors.confirmEmail}</p>
              )}
            </div>
          </div>

          {/* Texto aclaratorio sobre el email */}
          <Alert>
            <AlertDescription className="text-sm text-muted-foreground">
              <strong>Nota importante:</strong> Este correo electrónico es el que
              se usará para el administrador y para hacer login en el sistema como
              administrador.
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Continuar al Paso 2"
            )}
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
