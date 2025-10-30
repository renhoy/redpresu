import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { ContactMessagesPageHeader } from "@/components/contact-messages/ContactMessagesPageHeader";
import { ContactMessagesTable } from "@/components/contact-messages/ContactMessagesTable";
import { getContactMessages, getContactMessagesStats } from "@/app/actions/contact-messages";

export const metadata = {
  title: "Mensajes de Contacto - Redpresu",
  description: "Gestionar mensajes de contacto recibidos",
};

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
    <div className="space-y-6">
      <ContactMessagesPageHeader stats={stats} currentFilter={statusFilter} />
      <ContactMessagesTable messages={messages} />
    </div>
  );
}
