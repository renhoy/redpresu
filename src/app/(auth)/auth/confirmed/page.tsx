import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { getAppName } from "@/lib/helpers/config-helpers";

export default async function EmailConfirmedPage() {
  const appName = await getAppName();

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ background: "#f7fee7" }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-lime-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            ¡Email Confirmado!
          </CardTitle>
          <CardDescription className="text-base">
            Tu cuenta ha sido verificada exitosamente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-lime-50 border border-lime-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 text-center">
              Ya puedes iniciar sesión en <strong>{appName}</strong> con tu email
              y contraseña.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Después de iniciar sesión, completarás tu perfil con los datos de
              tu empresa o negocio.
            </p>
          </div>

          <Link href="/login" className="block w-full">
            <Button className="w-full bg-lime-500 hover:bg-lime-600" size="lg">
              Iniciar Sesión
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
