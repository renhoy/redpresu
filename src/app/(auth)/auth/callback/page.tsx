"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verificando tu email...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      console.log("[auth/callback/page] ========================================");
      console.log("[auth/callback/page] CALLBACK CLIENTE INICIADO");
      console.log("[auth/callback/page] Code:", code ? "presente" : "ausente");
      console.log("[auth/callback/page] Error:", error || "ninguno");
      console.log("[auth/callback/page] ========================================");

      if (error) {
        console.error("[auth/callback/page] Error de Supabase:", error, errorDescription);
        setStatus("error");
        setMessage(errorDescription || "Error al verificar el email");
        setTimeout(() => router.push("/login?error=confirmation"), 3000);
        return;
      }

      if (!code) {
        console.log("[auth/callback/page] Sin código, redirigiendo a login");
        setStatus("error");
        setMessage("No se recibió código de verificación");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      try {
        // IMPORTANTE: Esto se ejecuta en el CLIENTE donde está el code_verifier
        console.log("[auth/callback/page] Intercambiando código por sesión...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("[auth/callback/page] Error en exchangeCodeForSession:", exchangeError);
          setStatus("error");
          setMessage(exchangeError.message || "Error al verificar el email");
          setTimeout(() => router.push("/login?error=confirmation"), 3000);
          return;
        }

        if (!data.user) {
          console.error("[auth/callback/page] No se obtuvo usuario");
          setStatus("error");
          setMessage("No se pudo obtener la información del usuario");
          setTimeout(() => router.push("/login?error=no_user"), 3000);
          return;
        }

        console.log("[auth/callback/page] ✅ Email verificado para:", data.user.email);

        // Crear usuario en public.users llamando a una API
        console.log("[auth/callback/page] Creando usuario en BD...");
        const createUserResponse = await fetch("/api/auth/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || "Usuario",
          }),
        });

        const createUserResult = await createUserResponse.json();

        if (!createUserResult.success) {
          console.error("[auth/callback/page] Error creando usuario:", createUserResult.error);
          // No es crítico - el usuario puede existir ya
        } else {
          console.log("[auth/callback/page] ✅ Usuario creado en BD");
        }

        setStatus("success");
        setMessage("¡Email verificado correctamente!");

        // Redirigir a página de confirmación
        setTimeout(() => router.push("/auth/confirmed"), 1500);

      } catch (err) {
        console.error("[auth/callback/page] Error inesperado:", err);
        setStatus("error");
        setMessage("Error inesperado al verificar el email");
        setTimeout(() => router.push("/login?error=unexpected"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-lime-50 to-white">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-lime-600 mx-auto" />
            <p className="text-lg text-gray-600">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <p className="text-lg text-green-600 font-medium">{message}</p>
            <p className="text-sm text-gray-500">Redirigiendo...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-600 mx-auto" />
            <p className="text-lg text-red-600 font-medium">{message}</p>
            <p className="text-sm text-gray-500">Redirigiendo al login...</p>
          </>
        )}
      </div>
    </div>
  );
}
