import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getUserById } from "@/app/actions/users";
import UserForm from "@/components/users/UserForm";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata("Editar Usuario", "Modificar datos del usuario");
}

interface EditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id: userId } = await params;
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Comercial solo puede editar su propio usuario
  if (user.role === "vendedor" && userId !== user.id) {
    redirect("/users");
  }

  // Obtener usuario a editar
  const result = await getUserById(userId);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <UserForm
          mode="edit"
          user={result.data}
          empresaId={user.company_id}
          currentUserRole={user.role}
        />
      </div>
    </div>
  );
}
