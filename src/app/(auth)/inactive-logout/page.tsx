"use client";

import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function InactiveLogoutPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function logout() {
      try {
        // Intentar cerrar sesión en Supabase
        await supabase.auth.signOut();
      } catch (error) {
        // Si falla el signOut (error de red, etc), continuar igual
        console.error("[inactive-logout] Error en signOut:", error);

        // Limpiar cookies manualmente
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      } finally {
        // Siempre redirigir al login, incluso si falló el signOut
        router.replace("/login?reason=inactive");
      }
    }

    logout();
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-lime-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cerrando sesión...</p>
      </div>
    </div>
  );
}
