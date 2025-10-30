import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getUserById } from "@/app/actions/users";
import UserForm from "@/components/users/UserForm";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata("Gestionar Usuario", "Crear o editar usuario");
}

interface CreateUserPageProps {
  searchParams: Promise<{ id?: string; company_id?: string }>;
}

export default async function CreateUserPage({ searchParams }: CreateUserPageProps) {
  const { id, company_id } = await searchParams;
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Si hay id, es modo edición - redirigir a la nueva ruta unificada
  if (id) {
    redirect(`/users/${id}/edit`);
  }

  // Solo admin/superadmin pueden crear usuarios
  if (!["admin", "superadmin"].includes(user.role)) {
    redirect("/dashboard");
  }

  const mode = "create";

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <UserForm
          mode={mode}
          user={undefined}
          empresaId={user.company_id}
          currentUserRole={user.role}
          preselectedCompanyId={company_id}
        />
      </div>
    </div>
  );
}
