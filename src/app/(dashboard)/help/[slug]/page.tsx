import {
  getHelpArticle,
  getAllHelpArticles,
  canUserViewArticle,
} from "@/lib/helpers/markdown-helpers";
import { MarkdownReader } from "@/components/help/MarkdownReader";
import { TourButton } from "@/components/help/TourButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";

interface HelpArticlePageProps {
  params: {
    slug: string;
  };
}

// Generar rutas estáticas para todos los artículos
export async function generateStaticParams() {
  const articles = await getAllHelpArticles();
  return articles.map((article) => ({
    slug: article.id,
  }));
}

// Generar metadata dinámica
export async function generateMetadata({ params }: HelpArticlePageProps) {
  const article = await getHelpArticle(params.slug);

  if (!article) {
    return {
      title: "Artículo no encontrado",
    };
  }

  return {
    title: `${article.title} - Ayuda`,
    description: `Guía de ayuda: ${article.title}`,
  };
}

export default async function HelpArticlePage({
  params,
}: HelpArticlePageProps) {
  // Obtener usuario autenticado
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  const article = await getHelpArticle(params.slug);

  if (!article) {
    notFound();
  }

  // Verificar permisos de acceso al artículo
  const canView = canUserViewArticle(article.visible, user.role);

  if (!canView) {
    // El usuario no tiene permisos para ver este artículo
    return (
      <div className="min-h-screen bg-lime-50">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="mb-6">
            <Link href="/help">
              <Button variant="outline" className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Volver al Índice
              </Button>
            </Link>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-gray-900">
              Acceso Restringido
            </h1>
            <p className="text-gray-700 mb-4">
              No tienes permisos para ver este artículo de ayuda.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Este contenido está disponible solo para:{" "}
              <strong>
                {article.visible === "superadmin"
                  ? "Superadministradores"
                  : article.visible === "admin"
                  ? "Administradores y superiores"
                  : "Comerciales y superiores"}
              </strong>
            </p>
            <Link href="/help">
              <Button variant="outline">Volver al Índice</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Determinar la ruta objetivo para el tour basado en el tourId
  const tourTargetPaths: Record<string, string> = {
    "crear-tarifa": "/tariffs/create",
    "editar-usuario": "/users",
    "generar-presupuesto": "/budgets/create",
    // Añadir más mapeos según sea necesario
  };

  const targetPath = article.tourId
    ? tourTargetPaths[article.tourId]
    : undefined;

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header con navegación y botones */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <Link href="/help">
              <Button variant="outline" className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Volver al Índice
              </Button>
            </Link>

            {article.tourId && targetPath && (
              <TourButton tourId={article.tourId} targetPath={targetPath} />
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-lime-600 mb-2">
              {article.title}
            </h1>
            <Badge variant="secondary">{article.category}</Badge>
          </div>
        </div>

        {/* Contenido del artículo */}
        <div className="bg-white border rounded-lg p-8">
          <MarkdownReader htmlContent={article.htmlContent} />
        </div>

        {/* Footer con navegación de vuelta */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <Link href="/help">
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Volver al Índice
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
