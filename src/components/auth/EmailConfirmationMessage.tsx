"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailConfirmationMessageProps {
  email: string;
  isDevelopment?: boolean;
}

export function EmailConfirmationMessage({
  email,
  isDevelopment = false,
}: EmailConfirmationMessageProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isDevelopment) {
      // En desarrollo: contador de 10 segundos y redirigir al login
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setRedirecting(true);
            // Redirigir después de 500ms adicionales para mostrar mensaje
            setTimeout(() => {
              router.push("/login");
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isDevelopment, router]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-lime-50 to-white flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center">
            {redirecting ? (
              <CheckCircle2 className="h-8 w-8 text-lime-600" />
            ) : (
              <Mail className="h-8 w-8 text-lime-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {redirecting ? "¡Listo!" : "Confirma tu email"}
          </CardTitle>
          <CardDescription>
            {redirecting
              ? "Redirigiendo al login..."
              : "Hemos enviado un correo de confirmación"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!redirecting && (
            <>
              <Alert>
                <AlertDescription className="text-sm">
                  <p className="mb-2">
                    Hemos enviado un correo electrónico a:
                  </p>
                  <p className="font-semibold text-gray-900">{email}</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm text-gray-600">
                <p>Para activar tu cuenta:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Revisa tu bandeja de entrada</li>
                  <li>Haz clic en el enlace de confirmación</li>
                  <li>Inicia sesión con tus credenciales</li>
                </ol>
              </div>

              {isDevelopment && countdown > 0 && (
                <Alert className="border-lime-200 bg-lime-50">
                  <AlertDescription className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-lime-600" />
                    <span className="text-sm">
                      <strong className="text-lime-700">Modo desarrollo:</strong>{" "}
                      Tu email ya está confirmado. Redirigiendo al login en{" "}
                      <strong className="text-lime-700">{countdown}</strong>{" "}
                      segundo{countdown !== 1 ? "s" : ""}...
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {!isDevelopment && (
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/login")}
                  >
                    Ir al login
                  </Button>
                </div>
              )}
            </>
          )}

          {redirecting && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-lime-600" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
