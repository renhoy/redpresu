"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    // Verificar si hay un hash en la URL (token de Supabase)
    // Supabase redirige con formato: #access_token=xxx&type=recovery
    const checkToken = () => {
      try {
        const hash = window.location.hash;

        if (!hash) {
          console.log("[ResetPassword] No hay hash en la URL");
          setIsValidToken(false);
          setIsCheckingToken(false);
          return;
        }

        // Parsear el hash para verificar que tiene access_token y type=recovery
        const params = new URLSearchParams(hash.substring(1)); // Quitar el #
        const accessToken = params.get("access_token");
        const type = params.get("type");

        if (!accessToken || type !== "recovery") {
          console.log("[ResetPassword] Token inválido o tipo incorrecto");
          setIsValidToken(false);
          setIsCheckingToken(false);
          return;
        }

        console.log("[ResetPassword] Token válido encontrado");
        setIsValidToken(true);
        setIsCheckingToken(false);
      } catch (error) {
        console.error("[ResetPassword] Error al verificar token:", error);
        setIsValidToken(false);
        setIsCheckingToken(false);
      }
    };

    // Esperar a que el hash esté disponible (Supabase puede tardar un momento)
    const timeout = setTimeout(checkToken, 500);

    return () => clearTimeout(timeout);
  }, []);

  // Mostrar loading mientras se verifica el token
  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Verificando enlace de recuperación...</p>
        </div>
      </div>
    );
  }

  // Si el token no es válido, mostrar mensaje de error
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">J</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Redpresu</h2>
          </div>

          <Card className="w-full">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-center text-red-600">
                Enlace Inválido o Expirado
              </CardTitle>
              <CardDescription className="text-center">
                El enlace de recuperación no es válido o ha caducado
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Los enlaces de recuperación expiran después de 1 hora por
                  seguridad. Por favor, solicita un nuevo enlace.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Link href="/forgot-password" className="w-full">
                  <Button className="w-full">Solicitar Nuevo Enlace</Button>
                </Link>

                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Token válido - mostrar formulario de reset
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header con logo/título */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Redpresu</h2>
          <p className="mt-2 text-sm text-gray-600">
            Crea una nueva contraseña para tu cuenta
          </p>
        </div>

        {/* Formulario de reset */}
        <PasswordResetForm />

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/login" className="text-orange-600 hover:underline">
              Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
