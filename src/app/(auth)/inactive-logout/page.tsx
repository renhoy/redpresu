"use client";

import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function InactiveLogoutPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function logout() {
      // Cerrar sesión
      await supabase.auth.signOut();

      // Redirigir al login con parámetro reason
      router.replace("/login?reason=inactive");
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
