import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth/server';
import { generatePageMetadata } from '@/lib/helpers/metadata-helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RulesEditor } from '@/components/settings/rules-editor';
import { AuditLog } from '@/components/settings/audit-log';
import { Shield, FileText, History } from 'lucide-react';

export async function generateMetadata() {
  return generatePageMetadata(
    'Reglas de Negocio',
    'Configuración de reglas de negocio por empresa (solo superadmin)'
  );
}

export default async function BusinessRulesPage() {
  // Verificar autenticación y rol
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'superadmin') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Reglas de Negocio</h1>
        </div>
        <p className="text-muted-foreground">
          Gestiona las reglas de negocio configurables para cada empresa. Las reglas se evalúan
          automáticamente en acciones críticas como creación de usuarios, tarifas y presupuestos.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Editor de Reglas</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Edita las reglas en formato JSON. Las reglas usan JsonLogic para evaluar condiciones
              y ejecutar acciones automáticas como envío de emails, cambio de plan o bloqueo de features.
            </p>
            <RulesEditor />
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Historial de Auditoría</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Registro completo de todos los cambios realizados en las reglas de negocio,
              incluyendo quién, cuándo y desde qué IP se realizó el cambio.
            </p>
            <AuditLog />
          </div>
        </TabsContent>
      </Tabs>

      {/* Documentación */}
      <div className="mt-8 border rounded-lg p-6 bg-muted/30">
        <h3 className="text-lg font-semibold mb-3">📚 Documentación</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Estructura JSON:</strong> Las reglas siguen el formato BusinessRulesConfig con
            campos: version, updated_at, updated_by y un array de rules.
          </p>
          <p>
            <strong>Condiciones:</strong> Usa sintaxis JsonLogic para definir cuándo se aplica una regla.
            Ejemplo: <code className="bg-muted px-1 rounded">{'{"==": [{"var": "plan"}, "PRO"]}'}</code>
          </p>
          <p>
            <strong>Acciones:</strong> Define qué hacer cuando una regla coincide: allow, max_limit,
            send_email, downgrade_to, block_feature, schedule_action.
          </p>
          <p>
            <strong>Validación:</strong> Usa el botón "Validar" para probar las reglas antes de guardarlas.
          </p>
          <p>
            <strong>Rollback:</strong> Puedes revertir a la versión anterior en cualquier momento.
            Esto crea una nueva versión con el contenido previo.
          </p>
        </div>
      </div>
    </div>
  );
}
