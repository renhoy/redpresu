import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/server";
import { isPublicRegistrationEnabled } from "@/lib/helpers/config-helpers";
import RegisterForm from "@/components/auth/RegisterForm";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/Header";

export default async function RegisterPage() {
  // Verificar si el usuario ya está autenticado
  const user = await getServerUser();

  if (user) {
    // Redirigir según rol
    switch (user.role) {
      case "superadmin":
      case "admin":
        redirect("/dashboard");
      case "vendedor":
        redirect("/budgets");
      default:
        redirect("/dashboard");
    }
  }

  // Verificar si el registro público está habilitado
  const registrationEnabled = await isPublicRegistrationEnabled();

  // Si el registro está deshabilitado, mostrar mensaje
  if (!registrationEnabled) {
    return (
      <>
        <Header isAuthenticated={false} />
        <div
          className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
          style={{ background: "#f7fee7" }}
        >
          <div className="w-full max-w-md space-y-8">
            {/* Mensaje de registro deshabilitado */}
            <Alert className="border-amber-500 bg-blue-50">
              <Lock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <p className="font-semibold mb-2">
                  Registro temporalmente deshabilitado
                </p>
                <p className="text-sm">
                  El registro público no está disponible en este momento. Si
                  necesitas acceso al sistema, contacta con el administrador.
                </p>
              </AlertDescription>
            </Alert>

            {/* Link para volver al login */}
            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-lime-600 hover:text-lime-700 font-medium"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header isAuthenticated={false} />
      <div
        className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
        style={{ background: "#f7fee7" }}
      >
        <div className="w-full max-w-2xl space-y-8">
          {/* Formulario de registro */}
          <RegisterForm />

          {/* Footer con info adicional */}
          <div className="text-center pb-8">
            <p className="text-xs text-gray-500">
              Al registrarte, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
