import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { ContactMessagesPageHeader } from "@/components/contact-messages/ContactMessagesPageHeader";
import { ContactMessagesPageFooter } from "@/components/contact-messages/ContactMessagesPageFooter";
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
              !statusFilter
                ? "border-lime-500 shadow-md"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/contact-messages";
              }
            }}
          >
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Mensajes</div>
          </div>

          <div
            className={`bg-blue-50 rounded-lg border-2 p-4 cursor-pointer transition-all ${
              statusFilter === "nuevo"
                ? "border-lime-500 shadow-md"
                : "border-blue-200 hover:border-blue-300"
            }`}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/contact-messages?status=nuevo";
              }
            }}
          >
            <div className="text-2xl font-bold text-blue-600">{stats.nuevo}</div>
            <div className="text-sm text-blue-800">Nuevos</div>
          </div>

          <div
            className={`bg-yellow-50 rounded-lg border-2 p-4 cursor-pointer transition-all ${
              statusFilter === "leido"
                ? "border-lime-500 shadow-md"
                : "border-yellow-200 hover:border-yellow-300"
            }`}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/contact-messages?status=leido";
              }
            }}
          >
            <div className="text-2xl font-bold text-yellow-600">{stats.leido}</div>
            <div className="text-sm text-yellow-800">Leídos</div>
          </div>

          <div
            className={`bg-green-50 rounded-lg border-2 p-4 cursor-pointer transition-all ${
              statusFilter === "respondido"
                ? "border-lime-500 shadow-md"
                : "border-green-200 hover:border-green-300"
            }`}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/contact-messages?status=respondido";
              }
            }}
          >
            <div className="text-2xl font-bold text-green-600">{stats.respondido}</div>
            <div className="text-sm text-green-800">Respondidos</div>
          </div>
        </div>

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
            <a
              href="/contact-messages"
              className="text-sm text-lime-600 hover:text-lime-700 underline"
            >
              Ver todos
            </a>
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
