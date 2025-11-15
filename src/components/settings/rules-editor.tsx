'use client';

// ============================================================
// RulesEditor Component - Redpresu
// Editor de reglas de negocio para superadmin
// ============================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, Undo2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface RulesEditorProps {
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
}

export function RulesEditor({ selectedCompanyId, onCompanyChange }: RulesEditorProps) {
  const [rules, setRules] = useState<string>('');
  const [originalRules, setOriginalRules] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar reglas cuando se selecciona una empresa
  useEffect(() => {
    if (!selectedCompanyId) return;

    async function loadRules() {
      setLoading(true);
      try {
        const res = await fetch(`/api/superadmin/rules/${selectedCompanyId}`);
        if (!res.ok) throw new Error('Error al cargar reglas');
        const data = await res.json();
        const rulesJson = JSON.stringify(data.rules || data, null, 2);
        setRules(rulesJson);
        setOriginalRules(rulesJson);
        setHasChanges(false);
        setValidationStatus(null);
      } catch (error) {
        toast.error('No se pudieron cargar las reglas');
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, [selectedCompanyId]);

  // Detectar cambios
  useEffect(() => {
    setHasChanges(rules !== originalRules);
  }, [rules, originalRules]);

  // Validar JSON en tiempo real
  const handleRulesChange = (value: string) => {
    setRules(value);

    try {
      JSON.parse(value);
      setValidationStatus('valid');
    } catch {
      setValidationStatus('invalid');
    }
  };

  // Validar reglas en servidor
  const handleValidate = async () => {
    if (!selectedCompanyId) return;

    try {
      const parsed = JSON.parse(rules);
      setLoading(true);

      const res = await fetch(`/api/superadmin/rules/${selectedCompanyId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const result = await res.json();

      if (result.valid) {
        toast.success(
          result.matchedRule
            ? `✅ Reglas válidas. Regla coincidente: ${result.matchedRule.name}`
            : '✅ Las reglas son válidas y están listas para guardar'
        );
        setValidationStatus('valid');
      } else {
        toast.error(`❌ Reglas inválidas: ${result.error || 'Error en la validación'}`);
        setValidationStatus('invalid');
      }
    } catch (error) {
      toast.error(
        `Error de validación: ${error instanceof Error ? error.message : 'JSON inválido'}`
      );
      setValidationStatus('invalid');
    } finally {
      setLoading(false);
    }
  };

  // Guardar reglas
  const handleSave = async () => {
    if (!selectedCompanyId || validationStatus === 'invalid') return;

    try {
      const parsed = JSON.parse(rules);
      setLoading(true);

      const res = await fetch(`/api/superadmin/rules/${selectedCompanyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) throw new Error('Error al guardar reglas');

      const data = await res.json();
      const rulesJson = JSON.stringify(data.rules, null, 2);
      setRules(rulesJson);
      setOriginalRules(rulesJson);
      setHasChanges(false);

      toast.success(`✅ Reglas guardadas - Versión ${data.version}`);
    } catch (error) {
      toast.error(
        `Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Rollback a versión anterior
  const handleRollback = async () => {
    if (!selectedCompanyId) return;

    if (!confirm('¿Estás seguro de revertir a la versión anterior? Esta acción creará una nueva versión.')) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/superadmin/rules/${selectedCompanyId}/rollback`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al hacer rollback');
      }

      const data = await res.json();
      const rulesJson = JSON.stringify(data.data.rules, null, 2);
      setRules(rulesJson);
      setOriginalRules(rulesJson);
      setHasChanges(false);

      toast.success(
        `✅ Rollback exitoso - Se restauró la versión anterior. Nueva versión: ${data.data.version}`
      );
    } catch (error) {
      toast.error(
        `Error en rollback: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editor JSON */}
      {selectedCompanyId && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rules-editor">Reglas (JSON)</Label>
              <div className="flex items-center gap-2 text-sm">
                {validationStatus === 'valid' && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    JSON válido
                  </span>
                )}
                {validationStatus === 'invalid' && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    JSON inválido
                  </span>
                )}
              </div>
            </div>
            <Textarea
              id="rules-editor"
              value={rules}
              onChange={(e) => handleRulesChange(e.target.value)}
              placeholder="Cargando reglas..."
              className="font-mono text-sm h-[400px]"
              disabled={loading}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button
              onClick={handleValidate}
              variant="outline"
              disabled={loading || !rules || validationStatus === 'invalid'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Validar
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={loading || !hasChanges || validationStatus === 'invalid'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>

            <Button
              onClick={handleRollback}
              variant="destructive"
              disabled={loading}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Rollback
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
