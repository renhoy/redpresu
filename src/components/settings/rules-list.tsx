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
import { Loader2, Trash2, Eye, CheckCircle2, XCircle, Search, Pencil } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  onEditRule?: (rule: BusinessRule) => void;
}

export function RulesList({ selectedCompanyId, onEditRule }: RulesListProps) {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingRule, setViewingRule] = useState<BusinessRule | null>(null);

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
                <TableHead>Descripción</TableHead>
                <TableHead>Fechas</TableHead>
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
                    <Select
                      value={rule.is_active ? 'active' : 'inactive'}
                      onValueChange={async (value) => {
                        const newStatus = value === 'active';
                        try {
                          const res = await fetch(`/api/superadmin/rules/${selectedCompanyId}/status/${rule.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ is_active: newStatus }),
                          });

                          if (!res.ok) throw new Error('Error al cambiar estado');

                          toast.success(`Estado actualizado a ${newStatus ? 'Activa' : 'Inactiva'}`);

                          // Recargar lista
                          setRules((prev) =>
                            prev.map((r) => (r.id === rule.id ? { ...r, is_active: newStatus } : r))
                          );
                        } catch (error) {
                          toast.error('No se pudo cambiar el estado');
                        }
                      }}
                    >
                      <SelectTrigger className="w-[130px] bg-white">
                        <SelectValue>
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
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="active">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Activa
                          </span>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <span className="flex items-center gap-1 text-gray-400">
                            <XCircle className="h-4 w-4" />
                            Inactiva
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground mb-2">
                        {getActiveRulesCount(rule)}/{getRulesCount(rule)} activas
                      </div>
                      {rule.rules?.rules?.map((r) => (
                        <div key={r.id} className="text-sm">
                          <span className={r.active ? 'text-foreground font-medium' : 'text-muted-foreground line-through'}>
                            • {r.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs">
                    {rule.rules?.rules?.length > 0 ? (
                      <div className="space-y-1">
                        {rule.rules.rules.map((r) => (
                          r.description && (
                            <div key={r.id} className="text-muted-foreground truncate">
                              • {r.description}
                            </div>
                          )
                        ))}
                        {!rule.rules.rules.some(r => r.description) && (
                          <span className="text-muted-foreground">Sin descripción</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Creación:</div>
                      <div>{formatDate(rule.created_at)}</div>
                      <div className="text-xs text-muted-foreground mt-2">Actualización:</div>
                      <div>{formatDate(rule.updated_at)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onEditRule) {
                            onEditRule(rule);
                            toast.success('Cargando regla en el editor...');
                          }
                        }}
                        title="Editar esta regla"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Dialog open={viewingRule?.id === rule.id} onOpenChange={(open) => !open && setViewingRule(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingRule(rule)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Regla v{rule.version} - Detalles</DialogTitle>
                            <DialogDescription>
                              Información completa de esta versión de reglas
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-semibold text-muted-foreground">Estado</p>
                                <p className="text-sm">
                                  {rule.is_active ? (
                                    <span className="text-green-600">✓ Activa</span>
                                  ) : (
                                    <span className="text-gray-400">✗ Inactiva</span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-muted-foreground">Versión</p>
                                <p className="text-sm font-mono">v{rule.version}</p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-muted-foreground">Fecha Creación</p>
                                <p className="text-sm font-mono">{formatDate(rule.created_at)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-muted-foreground">Última Actualización</p>
                                <p className="text-sm font-mono">{formatDate(rule.updated_at)}</p>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <p className="text-sm font-semibold text-muted-foreground mb-2">
                                Reglas ({getRulesCount(rule)})
                              </p>
                              {rule.rules?.rules?.map((r, idx) => (
                                <div key={r.id} className="mb-4 p-4 border rounded-lg bg-muted/30">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold">{r.name}</h4>
                                    <span className={`text-xs px-2 py-1 rounded ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {r.active ? 'Activa' : 'Inactiva'}
                                    </span>
                                  </div>
                                  {r.description && (
                                    <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                                  )}
                                  <div className="text-xs space-y-1">
                                    <p><span className="font-semibold">Prioridad:</span> {r.priority}</p>
                                    <p><span className="font-semibold">Condición:</span></p>
                                    <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(r.condition, null, 2)}
                                    </pre>
                                    <p><span className="font-semibold">Acción:</span></p>
                                    <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                                      {JSON.stringify(r.action, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="border-t pt-4">
                              <p className="text-sm font-semibold text-muted-foreground mb-2">JSON Completo</p>
                              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto max-h-64">
                                {JSON.stringify(rule.rules, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
