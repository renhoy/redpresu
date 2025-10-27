import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getUserProfileById } from "@/app/actions/auth";
import ProfileForm from "@/components/profile/ProfileForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata(
    "Editar Perfil de Usuario",
    "Modificar perfil completo del usuario"
  );
}

interface UserProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { id: userId } = await params;
  const currentUser = await getServerUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Comercial no tiene acceso a esta funcionalidad
  if (currentUser.role === "comercial") {
    redirect("/users");
  }

  // Obtener perfil del usuario a editar
  const profileResult = await getUserProfileById(userId);

  if (!profileResult.success || !profileResult.data) {
    return (
      <div className="min-h-screen bg-lime-50">
        <div className="container mx-auto py-8 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {profileResult.error || "Error al cargar el perfil"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Banner indicando que se está editando otro usuario */}
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Editando perfil de:{" "}
            <strong>
              {profileResult.data.name} {profileResult.data.last_name}
            </strong>{" "}
            ({profileResult.data.email})
          </AlertDescription>
        </Alert>

        {/* Formulario de perfil con userId para indicar que es edición de otro usuario */}
        <ProfileForm profile={profileResult.data} userId={userId} />
      </div>
    </div>
  );
}
