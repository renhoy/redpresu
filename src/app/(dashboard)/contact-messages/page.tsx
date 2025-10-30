import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/server";
import { ContactMessagesPageHeader } from "@/components/contact-messages/ContactMessagesPageHeader";
import { ContactMessagesPageFooter } from "@/components/contact-messages/ContactMessagesPageFooter";
import { ContactMessagesStats } from "@/components/contact-messages/ContactMessagesStats";
import { ContactMessagesTable } from "@/components/contact-messages/ContactMessagesTable";
import { getContactMessages, getContactMessagesStats } from "@/app/actions/contact-messages";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata(
    "Mensajes de Contacto",
    "Gestionar mensajes de contacto recibidos"
  );
}

interface PageProps {
  searchParams: Promise<{ status?: "nuevo" | "leido" | "respondido" }>;
}

export default async function ContactMessagesPage({ searchParams }: PageProps) {
  // Verificar autenticación y permisos
  const user = await getServerUser();
  if (!user || user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Obtener parámetros de búsqueda
  const params = await searchParams;
  const statusFilter = params.status;

  // Obtener mensajes y estadísticas
  const [messagesResult, statsResult] = await Promise.all([
    getContactMessages(statusFilter),
    getContactMessagesStats(),
  ]);

  const messages = messagesResult.success ? messagesResult.data : [];
  const stats = statsResult.success ? statsResult.data : { total: 0, nuevo: 0, leido: 0, respondido: 0 };

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <ContactMessagesPageHeader />

        {/* Stats */}
        <ContactMessagesStats stats={stats} currentFilter={statusFilter} />

        {/* Filtro activo */}
        {statusFilter && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Mostrando:{" "}
              <span className="font-medium text-gray-900">
                {statusFilter === "nuevo" && "Nuevos"}
                {statusFilter === "leido" && "Leídos"}
                {statusFilter === "respondido" && "Respondidos"}
              </span>
            </span>
            <Link
              href="/contact-messages"
              className="text-sm text-lime-600 hover:text-lime-700 underline"
            >
              Ver todos
            </Link>
          </div>
        )}

        {/* Table */}
        <ContactMessagesTable messages={messages} />

        {/* Footer */}
        <ContactMessagesPageFooter />
      </div>
    </div>
  );
}
