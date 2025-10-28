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

  // Comercial solo puede editar su propio usuario
  if (user.role === "comercial" && id && id !== user.id) {
    redirect("/users");
  }

  if (!["admin", "superadmin"].includes(user.role)) {
    redirect("/dashboard");
  }

  // Si hay id, es modo edición - cargar usuario
  let editUser = undefined;
  if (id) {
    const result = await getUserById(id);
    if (!result.success || !result.data) {
      notFound();
    }
    editUser = result.data;
  }

  const mode = id ? "edit" : "create";

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <UserForm
          mode={mode}
          user={editUser}
          empresaId={user.company_id}
          currentUserRole={user.role}
          preselectedCompanyId={company_id}
        />
      </div>
    </div>
  );
}
