import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/server";
import { getUsers } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import UserTable from "@/components/users/UserTable";

export const metadata = {
  title: "Gestión de Usuarios | JEYCA Presupuestos",
  description: "Administrar usuarios de la empresa",
};

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Usuarios
            </h1>
            <p className="text-sm">Gestiona tus usuarios de la empresa</p>
          </div>

          {canCreateUsers && (
            <Button asChild>
              <Link href="/users/create">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Link>
            </Button>
          )}
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
