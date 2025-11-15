'use client';

// ============================================================
// RulesList Component - Redpresu
// Lista todas las versiones de reglas con filtros y borrado
// ============================================================

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2, Eye, CheckCircle2, XCircle, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BusinessRule {
  id: string;
  company_id: number | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rules: {
    version: number;
    updated_at: string;
    updated_by: string;
    rules: Array<{
      id: string;
      name: string;
      description?: string;
      active: boolean;
      priority: number;
    }>;
  };
}

interface RulesListProps {
  selectedCompanyId: string;
}

export function RulesList({ selectedCompanyId }: RulesListProps) {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar todas las reglas
  useEffect(() => {
    if (!selectedCompanyId) return;

    async function loadRules() {
      setLoading(true);
      try {
        const res = await fetch(`/api/superadmin/rules/${selectedCompanyId}/list`);

        if (!res.ok) throw new Error('Error al cargar reglas');
        const data = await res.json();
        setRules(data);
        setFilteredRules(data);
      } catch (error) {
        toast.error('No se pudieron cargar las reglas');
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, [selectedCompanyId]);

  // Filtrar reglas
  useEffect(() => {
    let filtered = [...rules];

    // Filtro por estado
    if (statusFilter === 'active') {
      filtered = filtered.filter((r) => r.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((r) => !r.is_active);
    }

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter((r) => {
        const rulesContent = JSON.stringify(r.rules).toLowerCase();
        return rulesContent.includes(searchTerm.toLowerCase());
      });
    }

    setFilteredRules(filtered);
  }, [rules, statusFilter, searchTerm]);

  const handleDelete = async (ruleId: string) => {
    setDeletingId(ruleId);
    try {
      const res = await fetch(`/api/superadmin/rules/${selectedCompanyId}/delete/${ruleId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al borrar regla');

      toast.success('Regla borrada exitosamente');

      // Recargar lista
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (error) {
      toast.error('No se pudo borrar la regla');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRulesCount = (rule: BusinessRule) => {
    return rule.rules?.rules?.length || 0;
  };

  const getActiveRulesCount = (rule: BusinessRule) => {
    return rule.rules?.rules?.filter((r) => r.active).length || 0;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Buscar en reglas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRules.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Reglas</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono font-semibold">
                    v{rule.version}
                  </TableCell>
                  <TableCell>
                    {rule.is_active ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Activa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400">
                        <XCircle className="h-4 w-4" />
                        Inactiva
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {getActiveRulesCount(rule)}/{getRulesCount(rule)} activas
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatDate(rule.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatDate(rule.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Mostrar detalles de la regla
                          toast.info('Ver detalles: ' + rule.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === rule.id}
                          >
                            {deletingId === rule.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Borrar esta regla?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará permanentemente la regla versión {rule.version}.
                              {rule.is_active && (
                                <span className="block mt-2 text-orange-600 font-semibold">
                                  ⚠️ Esta regla está activa y se dejará de aplicar.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(rule.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Borrar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm || statusFilter !== 'all'
            ? 'No se encontraron reglas con los filtros aplicados'
            : 'No hay reglas creadas para esta empresa'}
        </div>
      )}

      {/* Resumen */}
      {!loading && filteredRules.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredRules.length} de {rules.length} reglas
        </div>
      )}
    </div>
  );
}
