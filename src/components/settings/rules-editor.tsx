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
import { Loader2, Save, Undo2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface BusinessRuleToEdit {
  id: string;
  version: number;
  rules: unknown;
  [key: string]: unknown;
}

interface RulesEditorProps {
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
  ruleToEdit?: BusinessRuleToEdit | null;
  onEditComplete?: () => void;
}

export function RulesEditor({ selectedCompanyId, onCompanyChange, ruleToEdit, onEditComplete }: RulesEditorProps) {
  const [rules, setRules] = useState<string>('');
  const [originalRules, setOriginalRules] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Limpiar editor cuando se selecciona una empresa
  useEffect(() => {
    if (!selectedCompanyId) return;

    // Iniciar con editor vacío o regla vacía
    const emptyRule = {
      version: 1,
      updated_at: new Date().toISOString(),
      updated_by: '',
      rules: []
    };
    const emptyJson = JSON.stringify(emptyRule, null, 2);
    setRules(emptyJson);
    setOriginalRules(emptyJson);
    setHasChanges(false);
    setValidationStatus(null);
  }, [selectedCompanyId]);

  // Detectar cambios
  useEffect(() => {
    setHasChanges(rules !== originalRules);
  }, [rules, originalRules]);

  // Cargar regla para editar
  useEffect(() => {
    if (ruleToEdit) {
      const rulesJson = JSON.stringify(ruleToEdit.rules || ruleToEdit, null, 2);
      setRules(rulesJson);
      setOriginalRules(rulesJson);
      setHasChanges(false);
      setValidationStatus('valid'); // Asumimos que la regla cargada es válida
      toast.info(`📝 Regla v${ruleToEdit.version} cargada en el editor`);

      // Llamar onEditComplete para limpiar el estado
      if (onEditComplete) {
        onEditComplete();
      }
    }
  }, [ruleToEdit, onEditComplete]);

  // Cargar ejemplo
  const handleLoadExample = () => {
    const example = {
      version: 1,
      updated_at: new Date().toISOString(),
      updated_by: 'admin@example.com',
      rules: [
        {
          id: 'limit-tariffs-pro-plan',
          name: 'Limitar tarifas en plan PRO',
          description: 'Plan PRO: máximo 50 tarifas',
          active: true,
          priority: 10,
          condition: {
            and: [
              { '==': [{ var: 'plan' }, 'PRO'] },
              { '>=': [{ var: 'tariffs_count' }, 50] }
            ]
          },
          action: {
            allow: false,
            message: 'Has alcanzado el límite de 50 tarifas para tu plan PRO. Contacta con soporte para ampliar tu plan.'
          }
        }
      ]
    };

    const exampleJson = JSON.stringify(example, null, 2);
    setRules(exampleJson);
    toast.info('📄 Ejemplo cargado. Puedes editarlo y guardarlo.');
  };

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
        credentials: 'include', // Asegurar que se envíen las cookies
        body: JSON.stringify(parsed),
      });

      const result = await res.json();

      if (res.ok && result.valid) {
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
      console.error('Validation error:', error);
      const errorMessage = error instanceof SyntaxError
        ? `Error de sintaxis JSON: ${error.message}`
        : error instanceof Error
          ? `Error: ${error.message}`
          : 'JSON inválido';

      toast.error(`❌ ${errorMessage}`);
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
        credentials: 'include',
        body: JSON.stringify(parsed),
      });

      const data = await res.json();

      if (!res.ok) {
        // Mostrar el error específico del servidor
        throw new Error(data.error || `Error ${res.status}: ${res.statusText}`);
      }

      const rulesJson = JSON.stringify(data.rules, null, 2);
      setRules(rulesJson);
      setOriginalRules(rulesJson);
      setHasChanges(false);

      toast.success(`✅ Reglas guardadas - Versión ${data.version}`);
    } catch (error) {
      console.error('Save error:', error);
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
        credentials: 'include',
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
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleLoadExample}
              variant="secondary"
              disabled={loading}
            >
              <FileText className="mr-2 h-4 w-4" />
              Cargar Ejemplo
            </Button>

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
