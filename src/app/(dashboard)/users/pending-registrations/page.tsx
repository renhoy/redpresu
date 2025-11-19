import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getPendingUsers } from "@/app/actions/user-approvals";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import { PendingRegistrationsTable } from "@/components/users/PendingRegistrationsTable";
import { Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  return generatePageMetadata(
    "Solicitudes de Registro Pendientes",
    "Gestionar solicitudes de registro pendientes de aprobación"
  );
}

export default async function PendingRegistrationsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Solo superadmin puede acceder
  if (user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Obtener usuarios pendientes
  const result = await getPendingUsers();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-lime-50">
        <div className="container mx-auto px-4 py-10">
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {result.error}
          </div>
        </div>
      </div>
    );
  }

  const pendingUsers = result.users || [];

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/users">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Usuarios
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Solicitudes de Registro Pendientes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gestiona las solicitudes de registro que requieren aprobación
                </p>
              </div>
            </div>

            {/* Contador */}
            {pendingUsers.length > 0 && (
              <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-semibold">
                {pendingUsers.length} {pendingUsers.length === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
              </div>
            )}
          </div>
        </div>

        {/* Tabla */}
        {pendingUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No hay solicitudes pendientes
            </h2>
            <p className="text-gray-500">
              Todas las solicitudes de registro han sido procesadas
            </p>
          </div>
        ) : (
          <PendingRegistrationsTable users={pendingUsers} />
        )}
      </div>
    </div>
  );
}
