import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";
import { MockEmailsTable } from "@/components/subscriptions/testing/MockEmailsTable";
import { Mail, FlaskConical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function generateMetadata() {
  return generatePageMetadata(
    "Emails Mockeados",
    "Visualizar emails de testing guardados en BD (superadmin)"
  );
}

export default async function MockEmailsPage() {
  // ============================================
  // 1. Verificar autenticación y permisos
  // ============================================

  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Verificar NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          ⚠️ Visualización de emails mockeados no disponible en producción
        </div>
      </div>
    );
  }

  // ============================================
  // 2. Cargar emails mockeados
  // ============================================

  const { data: mockEmails, error } = await supabaseAdmin
    .from('mock_emails')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error al cargar emails: {error.message}
        </div>
      </div>
    );
  }

  // ============================================
  // 3. Render UI
  // ============================================

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Emails Mockeados
            </h1>
            <Link href="/settings/subscriptions-testing">
              <Button variant="outline" size="sm">
                <FlaskConical className="h-4 w-4 mr-2" />
                Panel Testing
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Emails de suscripciones guardados en BD durante testing (no enviados realmente)
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-100 border border-blue-300 text-blue-900 px-4 py-3 rounded">
          <p className="text-sm">
            💡 <strong>Nota:</strong> En modo testing (NODE_ENV !== production), todos los emails
            de suscripciones se guardan en esta tabla en lugar de enviarse. Esto permite verificar
            que el sistema de notificaciones funciona correctamente sin enviar emails reales.
          </p>
        </div>

        {/* Tabla de emails */}
        <MockEmailsTable emails={mockEmails || []} />

        {/* Enlaces rápidos */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Enlaces Rápidos</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/settings/subscriptions-testing"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              🧪 Panel Testing Suscripciones
            </Link>
            <Link
              href="/settings"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ⚙️ Configuración General
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
