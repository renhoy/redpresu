import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getUserById } from "@/app/actions/users";
import { getUserProfile } from "@/app/actions/auth";
import UnifiedUserEditForm from "@/components/users/UnifiedUserEditForm";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export async function generateMetadata() {
  return generatePageMetadata(
    "Editar Usuario",
    "Gestionar información del usuario"
  );
}

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  const currentUser = await getServerUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Determinar si el usuario está editando su propio perfil
  const isOwnProfile = currentUser.id === id;

  // Comercial solo puede editar su propio perfil
  if (currentUser.role === "comercial" && !isOwnProfile) {
    redirect("/users");
  }

  // Cargar datos del usuario a editar
  const userResult = await getUserById(id);

  if (!userResult.success || !userResult.data) {
    notFound();
  }

  const userToEdit = userResult.data;

  // Cargar perfil completo del usuario (incluye emisor)
  // Si es propio perfil, usar getUserProfile(), si no, necesitamos una función similar
  let profileResult;

  if (isOwnProfile) {
    profileResult = await getUserProfile();
  } else {
    // TODO: Crear función getUserProfileById(userId) en server actions
    // Por ahora, usamos getUserProfile que ya carga el emisor del usuario actual
    // En producción necesitarás una función que cargue el perfil de cualquier usuario
    profileResult = await getUserProfile(); // TEMPORAL - necesita función específica
  }

  if (!profileResult.success || !profileResult.data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {profileResult.error || "Error al cargar el perfil del usuario"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <UnifiedUserEditForm
          user={userToEdit}
          profile={profileResult.data}
          isOwnProfile={isOwnProfile}
          currentUserRole={currentUser.role}
          currentUserId={currentUser.id}
        />
      </div>
    </div>
  );
}
