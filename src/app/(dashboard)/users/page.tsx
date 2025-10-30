import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getUsers } from "@/app/actions/users";
import UserTable from "@/components/users/UserTable";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import { UsersPageHeader } from "@/components/users/UsersPageHeader";
import { UsersPageFooter } from "@/components/users/UsersPageFooter";

export async function generateMetadata() {
  return generatePageMetadata("Gestión de Usuarios", "Administrar usuarios de la empresa");
}

export default async function UsersPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Permitir acceso a comerciales también (solo lectura de su propio usuario)
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
        <UsersPageHeader canCreateUsers={canCreateUsers} />

        {/* Table */}
        <UserTable
          users={users}
          currentUserId={user.id}
          currentUserRole={user.role}
        />

        {/* Footer */}
        <UsersPageFooter canCreateUsers={canCreateUsers} />
      </div>
    </div>
  );
}
