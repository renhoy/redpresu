"use client";

import { useState, useEffect } from "react";
import { Plus, Layers, Download, Upload, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { startTour, checkAndStartPendingTour } from "@/lib/helpers/tour-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TariffFilters } from "./TariffFilters";
import { TariffRow } from "./TariffRow";
import { TariffCard } from "./TariffCard";
import { getTariffs } from "@/app/actions/tariffs";
import { exportTariffs } from "@/app/actions/export";
import { importTariffs } from "@/app/actions/import";
import { downloadFile } from "@/lib/helpers/export-helpers";
import { Database } from "@/lib/types/database.types";
import { toast } from "sonner";
import { validateJSONFile } from "@/lib/helpers/file-validation";

type Tariff = Database["public"]["Tables"]["tariffs"]["Row"];

interface User {
  id: string;
  name: string | null;
  last_name: string | null;
}

interface TariffListProps {
  empresaId: number;
  initialTariffs?: Tariff[];
  users?: User[];
  currentUserRole?: string;
  tariffId?: string;
}

// Verificar si puede importar (admin/superadmin)
const canImport = (role?: string) => {
  return role === "admin" || role === "superadmin";
};

export function TariffList({
  empresaId,
  initialTariffs = [],
  users = [],
  currentUserRole,
  tariffId,
}: TariffListProps) {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<Tariff[]>(initialTariffs);
  const [loading, setLoading] = useState(false);
  const [selectedTariffs, setSelectedTariffs] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState<{
    status?: "Activa" | "Inactiva" | "all";
    search?: string;
    user_id?: string;
    tariff_id?: string;
  }>({ status: "all", search: "", user_id: undefined, tariff_id: tariffId });

  // Filtrar tarifas si hay tariff_id
  const filteredTariffs = tariffId
    ? tariffs.filter((t) => t.id === tariffId)
    : tariffs;

  const loadTariffs = async () => {
    setLoading(true);
    try {
      const data = await getTariffs(empresaId, filters);
      setTariffs(data);
    } catch (error) {
      console.error("Error loading tariffs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTariffs.length === 0) {
      loadTariffs();
    }
  }, []);

  useEffect(() => {
    loadTariffs();
  }, [filters]);

  // Detectar y ejecutar tour pendiente
  useEffect(() => {
    checkAndStartPendingTour();
  }, []);

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleRefresh = () => {
    loadTariffs();
  };

  // Selección múltiple
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTariffs(filteredTariffs.map((t) => t.id));
    } else {
      setSelectedTariffs([]);
    }
  };

  const handleSelectTariff = (tariffId: string, checked: boolean) => {
    if (checked) {
      setSelectedTariffs((prev) => [...prev, tariffId]);
    } else {
      setSelectedTariffs((prev) => prev.filter((id) => id !== tariffId));
    }
  };

  const isAllSelected =
    filteredTariffs.length > 0 &&
    selectedTariffs.length === filteredTariffs.length;
  const isSomeSelected = selectedTariffs.length > 0;

  // Exportación
  const handleExportClick = () => {
    if (selectedTariffs.length === 0) {
      toast.error("Selecciona al menos una tarifa");
      return;
    }
    setShowExportDialog(true);
  };

  const handleExport = async (format: "json" | "price-structure") => {
    setExporting(true);
    setShowExportDialog(false);

    const result = await exportTariffs(selectedTariffs, format);

    if (result.success && result.data) {
      // Detectar si es un array de archivos o un único archivo
      if ("files" in result.data) {
        // Múltiples archivos: descargar con delay
        for (const file of result.data.files) {
          downloadFile(file.content, file.filename, file.mimeType);
          await new Promise((resolve) => setTimeout(resolve, 300)); // delay 300ms
        }
        toast.success(`${result.data.files.length} archivo(s) exportado(s)`);
      } else {
        // Un único archivo
        downloadFile(
          result.data.content,
          result.data.filename,
          result.data.mimeType
        );
        if (format === "json") {
          toast.success(`Tarifa exportada a JSON`);
        } else {
          toast.success(`Estructura de precios exportada a CSV`);
        }
      }
      setSelectedTariffs([]);
    } else {
      toast.error(result.error || "Error al exportar");
    }

    setExporting(false);
  };

  const isSingleSelection = selectedTariffs.length === 1;

  // Importación
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // SECURITY (VULN-015): Validar tipo y tamaño de archivo
    const validation = validateJSONFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Archivo no válido");
      e.target.value = ""; // Limpiar input
      return;
    }

    setImporting(true);

    try {
      // Leer contenido del archivo
      const content = await file.text();

      // Importar tarifas
      const result = await importTariffs(content);

      if (result.success && result.data) {
        toast.success(
          `${result.data.count} tarifa(s) importada(s) correctamente`
        );
        // Recargar tarifas
        loadTariffs();
      } else {
        toast.error(result.error || "Error al importar tarifas");
      }
    } catch (error) {
      toast.error("Error al leer el archivo");
    } finally {
      setImporting(false);
      // Limpiar input
      e.target.value = "";
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="text-center md:text-left w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <h1 className="text-3xl font-bold text-lime-600 flex items-center gap-2">
              <Layers className="h-6 w-6" />
              Tarifas
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tourId = filteredTariffs.length === 0 ? "tarifas-page-vacia" : "tarifas-page";
                startTour(tourId);
              }}
              className="border-lime-500 text-lime-600 hover:bg-lime-50 h-8 px-3 gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Tour</span>
            </Button>
          </div>
          <p className="text-sm text-lime-600">
            Gestiona tus tarifas y crea presupuestos
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center md:justify-end w-full md:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  id="btn-exportar-tarifa"
                  variant="outline"
                  disabled={!isSomeSelected || exporting}
                  onClick={handleExportClick}
                  className="border-lime-500 text-lime-600 hover:bg-lime-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isSomeSelected
                    ? `Exportar (${selectedTariffs.length})`
                    : "Exportar"}
                </Button>
              </TooltipTrigger>
              {!isSomeSelected && (
                <TooltipContent>
                  <p>
                    Selecciona uno o varios elementos de la lista para exportar
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Export Dialog */}
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-lime-600">
                  Exportar {isSingleSelection ? "Tarifa" : "Tarifas"}
                </DialogTitle>
                <DialogDescription>
                  {isSingleSelection
                    ? "Selecciona el formato de exportación para la tarifa"
                    : `Selecciona el formato de exportación para las ${selectedTariffs.length} tarifas seleccionadas`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <Button
                  className="w-full justify-start h-auto py-2.5 px-3 border-lime-500 hover:bg-lime-50"
                  variant="outline"
                  onClick={() => handleExport("json")}
                  disabled={exporting}
                >
                  <div className="flex flex-col items-start text-left w-full min-w-0">
                    <div className="font-semibold text-lime-600 text-xs leading-tight break-words w-full">
                      {isSingleSelection
                        ? "Tarifa completa (JSON)"
                        : `${selectedTariffs.length} Tarifas completas (JSON)`}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-tight break-words w-full">
                      Incluye todos los datos de la tarifa
                    </div>
                  </div>
                </Button>

                <Button
                  className="w-full justify-start h-auto py-2.5 px-3 border-lime-500 hover:bg-lime-50"
                  variant="outline"
                  onClick={() => handleExport("price-structure")}
                  disabled={exporting}
                >
                  <div className="flex flex-col items-start text-left w-full min-w-0">
                    <div className="font-semibold text-lime-600 text-xs leading-tight break-words w-full">
                      {isSingleSelection
                        ? "Estructura de precios (CSV)"
                        : `Estructura de precios de cada tarifa (CSV)`}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-tight break-words w-full">
                      Compatible con plantilla de importación
                    </div>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {canImport(currentUserRole) && (
            <>
              <input
                id="import-file-input"
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
                disabled={importing}
              />
              <Button
                id="btn-importar-tarifa"
                variant="outline"
                className="border-lime-500 text-lime-600 hover:bg-lime-50"
                onClick={() =>
                  document.getElementById("import-file-input")?.click()
                }
                disabled={importing}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? "Importando..." : "Importar"}
              </Button>
            </>
          )}
          <Button id="btn-nueva-tarifa-list" asChild className="bg-lime-500 hover:bg-lime-600">
            <Link href="/tariffs/create">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Tarifa
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtro activo por tariff_id */}
      {tariffId && (
        <div className="mb-4 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Mostrando tarifa específica
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/tariffs")}
          >
            Ver todas las tarifas
          </Button>
        </div>
      )}

      {/* Filters */}
      <TariffFilters
        onFiltersChange={handleFiltersChange}
        defaultStatus={filters.status}
        defaultSearch={filters.search}
        defaultUserId={filters.user_id}
        users={users}
        currentUserRole={currentUserRole}
      />

      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          {filteredTariffs.length === 0 ? (
            <div id="nota-crear-primera-tarifa" className="flex flex-col items-center justify-center py-12 text-center bg-white">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay tarifas</h3>
              <p className="text-muted-foreground mb-2">
                {filters.status !== "all" || filters.search?.trim()
                  ? "No se encontraron tarifas con los filtros aplicados"
                  : "Aún no has creado ninguna tarifa"}
              </p>
              {(!filters.status || filters.status === "all") &&
                !filters.search?.trim() && (
                  <>
                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                      Las tarifas son necesarias para crear presupuestos. Contienen las partidas, precios y configuración (plantilla PDF, logo, etc.) que se usarán como base para generar presupuestos personalizados para tus clientes.
                    </p>
                    <Button asChild className="bg-lime-500 hover:bg-lime-600">
                      <Link href="/tariffs/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear primera tarifa
                      </Link>
                    </Button>
                  </>
                )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted bg-indigo-50">
                <tr>
                  <th className="text-left p-4 font-medium w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 font-medium">Tarifa</th>
                  <th className="text-center p-4 font-medium">Presupuesto</th>
                  <th className="text-center p-4 font-medium">Estado</th>
                  <th className="text-center p-4 font-medium">Usuario</th>
                  <th className="text-center p-4 font-medium">Validez</th>
                  <th className="text-center p-4 font-medium">Fecha</th>
                  <th className="text-center p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTariffs.map((tariff) => (
                  <TariffRow
                    key={tariff.id}
                    tariff={tariff}
                    onStatusChange={handleRefresh}
                    onDelete={handleRefresh}
                    currentUserRole={currentUserRole}
                    selected={selectedTariffs.includes(tariff.id)}
                    onSelectChange={(checked) =>
                      handleSelectTariff(tariff.id, checked)
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden">
        {filteredTariffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay tarifas</h3>
            <p className="text-muted-foreground mb-2">
              {filters.status !== "all" || filters.search?.trim()
                ? "No se encontraron tarifas con los filtros aplicados"
                : "Aún no has creado ninguna tarifa"}
            </p>
            {(!filters.status || filters.status === "all") &&
              !filters.search?.trim() && (
                <>
                  <p className="text-sm text-muted-foreground max-w-md mb-4 px-4">
                    Las tarifas son necesarias para crear presupuestos. Contienen las partidas, precios y configuración (plantilla PDF, logo, etc.) que se usarán como base para generar presupuestos personalizados para tus clientes.
                  </p>
                  <Button asChild className="bg-lime-500 hover:bg-lime-600">
                    <Link href="/tariffs/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primera tarifa
                    </Link>
                  </Button>
                </>
              )}
          </div>
        ) : (
          filteredTariffs.map((tariff) => (
            <TariffCard
              key={tariff.id}
              tariff={tariff}
              onStatusChange={handleRefresh}
              onDelete={handleRefresh}
              currentUserRole={currentUserRole}
            />
          ))
        )}
      </div>
    </>
  );
}
