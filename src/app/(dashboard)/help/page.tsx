import {
  getAllHelpArticles,
  filterArticlesByRole,
} from "@/lib/helpers/markdown-helpers";
import { HelpIndex } from "@/components/help/HelpIndex";
import { TourButton } from "@/components/help/TourButton";
import { HelpPageHeader } from "@/components/help/HelpPageHeader";
import { HelpPageFooter } from "@/components/help/HelpPageFooter";
import { BookOpen, HelpCircle } from "lucide-react";
import { getServerUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata() {
  return generatePageMetadata(
    "Ayuda",
    "Centro de ayuda y documentación de la aplicación"
  );
}

export default async function HelpPage() {
  // Obtener usuario autenticado
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener todos los artículos
  const allArticles = await getAllHelpArticles();

  // Filtrar artículos según el rol del usuario
  const articles = filterArticlesByRole(allArticles, user.role);

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <HelpPageHeader />

        {/* Sección Guías Interactivas */}
        <Card className="mb-6 bg-lime-100">
          <CardHeader>
            <CardTitle className="text-2xl">Guías Interactivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-lime-50 transition-colors">
                <span className="font-medium">Tarifas</span>
                <TourButton tourId="tarifas-page" targetPath="/tariffs" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-lime-50 transition-colors">
                <span className="font-medium">Nueva Tarifa</span>
                <TourButton
                  tourId="tarifa-create"
                  targetPath="/tariffs/create"
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-lime-50 transition-colors">
                <span className="font-medium">Presupuestos</span>
                <TourButton tourId="presupuestos-page" targetPath="/budgets" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-lime-50 transition-colors">
                <span className="font-medium">Mi Perfil</span>
                <TourButton tourId="profile-page" targetPath={`/users/${user.id}/edit`} />
              </div>
              {(user.role === "admin" || user.role === "superadmin") && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-lime-50 transition-colors">
                  <span className="font-medium">Usuarios</span>
                  <TourButton tourId="usuarios-page" targetPath="/users" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <HelpIndex articles={articles} />

        {/* Footer */}
        <HelpPageFooter />
      </div>
    </div>
  );
}
