'use client';

// ============================================================
// AuditLog Component - Redpresu
// Historial de cambios en reglas de negocio
// ============================================================

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/types/business-rules';

interface Company {
  id: number;
  name: string;
  status: string;
}

interface AuditResponse {
  data: AuditLogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function AuditLog() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const LIMIT = 20;

  // Cargar lista de empresas
  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetch('/api/superadmin/companies');
        if (!res.ok) throw new Error('Error al cargar empresas');
        const data = await res.json();
        setCompanies(data);
      } catch (error) {
        toast.error('No se pudieron cargar las empresas');
      } finally {
        setLoadingCompanies(false);
      }
    }
    loadCompanies();
  }, [toast]);

  // Cargar audit log cuando cambia empresa o página
  useEffect(() => {
    if (!selectedCompany) return;

    async function loadAuditLog() {
      setLoading(true);
      try {
        const offset = currentPage * LIMIT;
        const res = await fetch(
          `/api/superadmin/rules/${selectedCompany}/audit?limit=${LIMIT}&offset=${offset}`
        );

        if (!res.ok) throw new Error('Error al cargar historial');
        const data = await res.json();
        setAuditData(data);
      } catch (error) {
        toast.error('No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    }
    loadAuditLog();
  }, [selectedCompany, currentPage, toast]);

  // Resetear página al cambiar empresa
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCompany]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    const colors = {
      created: 'bg-green-100 text-green-800',
      updated: 'bg-blue-100 text-blue-800',
      rollback: 'bg-orange-100 text-orange-800',
      activated: 'bg-emerald-100 text-emerald-800',
      deactivated: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {action}
      </span>
    );
  };

  const totalPages = auditData
    ? Math.ceil(auditData.pagination.total / LIMIT)
    : 0;

  return (
    <div className="space-y-6">
      {/* Selector de empresa */}
      <div className="space-y-2">
        <Label htmlFor="audit-company-select">Empresa</Label>
        <Select
          value={selectedCompany}
          onValueChange={setSelectedCompany}
          disabled={loadingCompanies}
        >
          <SelectTrigger id="audit-company-select">
            <SelectValue placeholder="Selecciona una empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.name} {company.status !== 'active' && `(${company.status})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de audit log */}
      {selectedCompany && (
        <>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : auditData && auditData.data.length > 0 ? (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Versión</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.data.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(entry.created_at)}
                        </TableCell>
                        <TableCell>{getActionBadge(entry.action)}</TableCell>
                        <TableCell>
                          {entry.changed_by_email || 'Sistema'}
                        </TableCell>
                        <TableCell>
                          {entry.version_before && entry.version_after ? (
                            <span className="font-mono text-sm">
                              {entry.version_before} → {entry.version_after}
                            </span>
                          ) : entry.version_after ? (
                            <span className="font-mono text-sm">
                              v{entry.version_after}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {entry.ip_address || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {currentPage * LIMIT + 1} -{' '}
                  {Math.min((currentPage + 1) * LIMIT, auditData.pagination.total)}{' '}
                  de {auditData.pagination.total} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!auditData.pagination.hasMore || loading}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No hay registros de auditoría para esta empresa
            </div>
          )}
        </>
      )}
    </div>
  );
}
