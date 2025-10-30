"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { clearMockEmails } from "@/app/actions/testing/subscriptions-testing";
import { toast } from "sonner";
import { Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MockEmail {
  id: string;
  type: string;
  to_email: string;
  subject: string;
  body: string;
  data: Record<string, unknown> | null;
  company_id: number | null;
  created_at: string;
}

interface MockEmailsTableProps {
  emails: MockEmail[];
}

export function MockEmailsTable({ emails }: MockEmailsTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);

  async function handleClearAll() {
    if (!confirm(`¿Eliminar todos los ${emails.length} emails mockeados?`)) {
      return;
    }

    setLoading(true);

    try {
      const result = await clearMockEmails();

      if (result.success) {
        toast.success(`${result.data?.count || 0} emails eliminados`);
        router.refresh();
      } else {
        toast.error(result.error || "Error al limpiar emails");
      }
    } finally {
      setLoading(false);
    }
  }

  // Helper: Badge de tipo
  function getTypeBadge(type: string) {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }> = {
      payment_failed: { variant: 'destructive', text: 'Pago Fallido' },
      expiring_soon: { variant: 'default', text: 'Expira Pronto' },
      expired: { variant: 'destructive', text: 'Expirada' },
      grace_period_ending: { variant: 'outline', text: 'Fin Grace Period' },
      upgraded: { variant: 'default', text: 'Mejorada' },
      canceled: { variant: 'secondary', text: 'Cancelada' },
      custom: { variant: 'secondary', text: 'Personalizado' },
    };

    const config = variants[type] || { variant: 'secondary' as const, text: type };

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  }

  // Sin emails
  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-muted-foreground">
        <p>No hay emails mockeados.</p>
        <p className="text-sm mt-2">
          Los emails de suscripciones se guardarán aquí cuando se ejecuten flujos de testing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botón limpiar todo */}
      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAll}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar Todos ({emails.length})
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Empresa ID</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email) => (
                <TableRow key={email.id}>
                  {/* Fecha */}
                  <TableCell className="text-sm font-mono">
                    {new Date(email.created_at).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>

                  {/* Tipo */}
                  <TableCell>
                    {getTypeBadge(email.type)}
                  </TableCell>

                  {/* Destinatario */}
                  <TableCell className="text-sm">
                    {email.to_email}
                  </TableCell>

                  {/* Asunto */}
                  <TableCell className="text-sm max-w-xs truncate">
                    {email.subject}
                  </TableCell>

                  {/* Empresa ID */}
                  <TableCell className="text-sm font-mono">
                    {email.company_id || '-'}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmail(email)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Detalles del Email</DialogTitle>
                          <DialogDescription>
                            Email mockeado guardado el {new Date(email.created_at).toLocaleString("es-ES")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Tipo */}
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Tipo:</p>
                            {getTypeBadge(email.type)}
                          </div>

                          {/* Destinatario */}
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Destinatario:</p>
                            <p className="text-sm">{email.to_email}</p>
                          </div>

                          {/* Asunto */}
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Asunto:</p>
                            <p className="text-sm">{email.subject}</p>
                          </div>

                          {/* Cuerpo */}
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Cuerpo:</p>
                            <div className="bg-slate-50 p-4 rounded text-sm whitespace-pre-wrap">
                              {email.body}
                            </div>
                          </div>

                          {/* Metadata */}
                          {email.data && Object.keys(email.data).length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-muted-foreground mb-1">Metadata:</p>
                              <pre className="bg-slate-50 p-4 rounded text-xs overflow-x-auto">
                                {JSON.stringify(email.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
