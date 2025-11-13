"use client";

import { useState } from "react";
import Link from "next/link";
import { createRegistrationToken } from "@/app/actions/registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

interface RegisterStep1Errors {
  name?: string;
  email?: string;
  password?: string;
  tipo?: string;
  general?: string;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    tipo: "empresa" as "empresa" | "autonomo",
  });

  const [errors, setErrors] = useState<RegisterStep1Errors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  const validateForm = (): boolean => {
    const newErrors: RegisterStep1Errors = {};

    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
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

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = "La contraseña es obligatoria";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
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
        email: formData.email.trim(),
        password: formData.password,
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
      console.log("[RegisterForm PASO 1] Enlace de verificación: /register/complete?token=" + result.data?.token);

      setRegisteredEmail(formData.email);
      setRegistrationSuccess(true);
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
      <div className="fixed inset-0 bg-gradient-to-b from-lime-50 to-white flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-lime-600" />
            </div>
            <CardTitle className="text-2xl">Confirma tu email</CardTitle>
            <CardDescription>
              Hemos enviado un correo de verificación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                <p className="mb-2">
                  Hemos enviado un correo electrónico a:
                </p>
                <p className="font-semibold text-gray-900">{registeredEmail}</p>
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm text-gray-600">
              <p>Para completar tu registro:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Revisa tu bandeja de entrada</li>
                <li>Haz clic en el enlace de verificación</li>
                <li>Completa los datos de tu empresa</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          Crear Cuenta - Paso 1 de 2
        </CardTitle>
        <CardDescription className="text-center">
          Datos básicos para crear tu cuenta
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

          {/* Nombre de usuario */}
          <div className="space-y-2">
            <Input
              id="name"
              type="text"
              placeholder="Nombre de usuario *"
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

          {/* Email y Contraseña - 50% cada uno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
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

            {/* Contraseña */}
            <div className="space-y-2">
              <PasswordInput
                id="password"
                placeholder="Contraseña * (mínimo 6 caracteres)"
                value={formData.password}
                onChange={handleInputChange("password")}
                className={errors.password ? "border-red-500" : ""}
                disabled={isLoading}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Crear Cuenta"
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
