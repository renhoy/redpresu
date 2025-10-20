import {
  getAllHelpArticles,
  filterArticlesByRole,
} from "@/lib/helpers/markdown-helpers";
import { HelpIndex } from "@/components/help/HelpIndex";
import { BookOpen, HelpCircle } from "lucide-react";
import { getServerUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata("Ayuda", "Centro de ayuda y documentación de la aplicación");
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <HelpCircle className="h-6 w-6" />
              Centro de Ayuda
            </h1>
            <p className="text-sm">
              Encuentra toda la ayduda en información para aprovechar al máximo
              la aplicación
            </p>
          </div>
        </div>

        <HelpIndex articles={articles} />
      </div>
    </div>
  );
}
