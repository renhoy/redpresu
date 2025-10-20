"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { importBudgets } from "@/app/actions/import";
import { toast } from "sonner";
import Link from "next/link";
import { validateJSONFile } from "@/lib/helpers/file-validation";

export function ImportBudgetsForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ count: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // SECURITY (VULN-015): Validar tipo y tamaño de archivo
    const validation = validateJSONFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || "Archivo no válido");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);
  };

  const handleImport = async () => {
    if (!file) {
      setError("Selecciona un archivo");
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Leer archivo
      const content = await file.text();

      // Importar
      const result = await importBudgets(content);

      if (result.success && result.data) {
        setSuccess({ count: result.data.count });
        toast.success(`${result.data.count} presupuesto(s) importado(s)`);
        setFile(null);

        // Resetear input
        const input = document.getElementById("file-input") as HTMLInputElement;
        if (input) input.value = "";

        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push("/budgets");
        }, 2000);
      } else {
        setError(result.error || "Error al importar");
        toast.error(result.error || "Error al importar");
      }
    } catch (e) {
      const errorMsg = "Error al leer el archivo";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones</CardTitle>
          <CardDescription>
            Cómo importar presupuestos correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p className="font-medium">Formato del archivo:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Archivo JSON con un array de presupuestos</li>
              <li>
                Cada presupuesto debe tener:{" "}
                <code className="bg-muted px-1">tariff_id</code>,{" "}
                <code className="bg-muted px-1">client_name</code>
              </li>
              <li>Los IDs se regenerarán automáticamente</li>
              <li>Los presupuestos se asignarán a tu empresa y usuario</li>
              <li>
                El estado se resetea a{" "}
                <code className="bg-muted px-1">borrador</code>
              </li>
              <li>Las relaciones de versiones se resetean</li>
            </ul>
          </div>

          <div className="text-sm space-y-2">
            <p className="font-medium">Campos requeridos:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>
                <code className="bg-muted px-1">tariff_id</code> - ID de tarifa
                existente
              </li>
              <li>
                <code className="bg-muted px-1">client_name</code> - Nombre del
                cliente
              </li>
              <li>
                <code className="bg-muted px-1">json_budget_data</code> - Datos
                del presupuesto
              </li>
            </ul>
          </div>

          <div className="text-sm space-y-2">
            <p className="font-medium">Campos opcionales:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>
                <code className="bg-muted px-1">client_nif_nie</code> - NIF/NIE
                del cliente
              </li>
              <li>
                <code className="bg-muted px-1">client_type</code> - Tipo de
                cliente
              </li>
              <li>
                <code className="bg-muted px-1">budget_code</code> - Código
                presupuesto
              </li>
              <li>
                <code className="bg-muted px-1">start_date</code>,{" "}
                <code className="bg-muted px-1">end_date</code> - Fechas
              </li>
              <li>
                <code className="bg-muted px-1">base</code>,{" "}
                <code className="bg-muted px-1">iva</code>,{" "}
                <code className="bg-muted px-1">total</code> - Totales
              </li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Las tarifas referenciadas deben
              existir en tu empresa. Si una tarifa no existe, el presupuesto no
              se importará.
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Nota:</strong> Puedes exportar presupuestos existentes
              para obtener un ejemplo del formato correcto.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar archivo</CardTitle>
          <CardDescription>
            Sube un archivo JSON con los presupuestos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input file */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="file-input"
              className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-cyan-500 hover:bg-blue-50/50 transition-colors"
            >
              <FileJson className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {file ? file.name : "Haz clic para seleccionar un archivo"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JSON (máximo 5MB)
                </p>
              </div>
            </label>
            <input
              id="file-input"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Mensajes */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>¡Éxito!</strong> {success.count} presupuesto(s)
                importado(s). Redirigiendo...
              </AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" asChild disabled={importing}>
              <Link href="/budgets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancelar
              </Link>
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando..." : "Importar Presupuestos"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
