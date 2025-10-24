import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/server";
import { getUsers } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import UserTable from "@/components/users/UserTable";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import { TourButton } from "@/components/help/TourButton";

export async function generateMetadata() {
  return generatePageMetadata("Gestión de Usuarios", "Administrar usuarios de la empresa");
}

export default async function UsersPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Permitir acceso a vendedores también (solo lectura de su propio usuario)
  const canCreateUsers = ["admin", "superadmin"].includes(user.role);

  // Obtener usuarios
  const result = await getUsers();

  if (!result.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {result.error}
        </div>
      </div>
    );
  }

  const users = result.data || [];

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-center md:text-left w-full md:w-auto">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Usuarios
              </h1>
              <TourButton tourId="usuarios-page" />
            </div>
            <p className="text-sm">Gestiona tus usuarios de la empresa</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center md:justify-end w-full md:w-auto">
            {canCreateUsers && (
              <Button asChild>
                <Link href="/users/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Usuario
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <UserTable
          users={users}
          currentUserId={user.id}
          currentUserRole={user.role}
        />
      </div>
    </div>
  );
}
