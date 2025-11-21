"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction, testServerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { validateEmail as validateEmailHelper } from "@/lib/helpers/email-validation";
import { InactiveUserDialog } from "@/components/auth/InactiveUserDialog";

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showInactiveDialog, setShowInactiveDialog] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    // SECURITY (VULN-019): Validar email con helper seguro
    const emailValidation = validateEmailHelper(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error || "Email no válido";
    }

    // Validar password
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginForm] Submit iniciado', { email: formData.email });

    // Limpiar errores anteriores
    setErrors({});

    // Validar formulario
    if (!validateForm()) {
      console.log('[LoginForm] Validación fallida');
      return;
    }

    console.log('[LoginForm] Validación OK, iniciando login...');
    setIsLoading(true);

    try {
      // Llamar al API endpoint para login (establece cookies correctamente)
      console.log('[LoginForm] ========== LLAMANDO A API /auth/login ==========');
      console.log('[LoginForm] Versión: 3.0 - Using API Route Handler');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
        credentials: 'include', // IMPORTANTE: Incluir cookies
      });

      console.log('[LoginForm] Response status:', response.status);

      const result = await response.json();
      console.log('[LoginForm] ========== API RETORNÓ ==========');
      console.log('[LoginForm] Respuesta recibida:', result);

      // Si result.success es false, mostrar error
      if (!result.success) {
        console.error('[LoginForm] Error de login:', result.error);

        // Verificar si es usuario inactivo
        if (result.error === 'INACTIVE_USER') {
          setShowInactiveDialog(true);
          return;
        }

        // Verificar si es usuario pendiente de aprobación
        if (result.error === 'PENDIENTE') {
          console.log('[LoginForm] Usuario pendiente de aprobación, redirigiendo con query param');
          router.push('/login?reason=pendiente');
          return;
        }

        setErrors({ general: result.error || 'Error en el login' });
        return;
      }

      // Login exitoso - redirigir donde indica el servidor
      console.log('[LoginForm] Login exitoso, redirigiendo a:', result.redirectTo || '/dashboard');
      router.push(result.redirectTo || '/dashboard');
      router.refresh(); // Forzar refresh para que el servidor recargue la sesión

    } catch (error) {
      console.error('[LoginForm] Error crítico:', error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Error inesperado durante el login",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof LoginFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      // Limpiar error del campo cuando el usuario empieza a escribir
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error general */}
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Campo Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={formData.email}
                onChange={handleInputChange("email")}
                className={errors.email ? "border-red-500" : ""}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Campo Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <PasswordInput
                id="password"
                placeholder="Tu contraseña"
                value={formData.password}
                onChange={handleInputChange("password")}
                className={errors.password ? "border-red-500" : ""}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Enlace Recuperar contraseña */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-lime-600 hover:text-lime-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* Diálogo de usuario inactivo */}
      <InactiveUserDialog showDialog={showInactiveDialog} />
    </>
  );
}
