"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Company,
  deleteCompany,
  duplicateCompany,
  permanentDeleteCompany,
} from "@/app/actions/companies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CompanyCard } from "./CompanyCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  FileText,
  Layers,
  Pencil,
  Trash2,
  Users,
  Copy,
  XCircle,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CompanyTableProps {
  companies: Company[];
}

export default function CompanyTable({
  companies: initialCompanies,
}: CompanyTableProps) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "empresa" | "autonomo">(
    "all"
  );
  const router = useRouter();

  // Calcular contadores por tipo
  const typeCounts = companies.reduce((acc, company) => {
    acc[company.type] = (acc[company.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtrado local
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      !search ||
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      (company.nif &&
        company.nif.toLowerCase().includes(search.toLowerCase())) ||
      (company.email &&
        company.email.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "all" || company.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (!selectedCompany || !selectedCompany.uuid) return;

    setIsLoading(true);

    const result = await deleteCompany(selectedCompany.uuid);

    if (result.success) {
      toast.success(
        `Empresa "${selectedCompany.name}" eliminada correctamente`
      );

      // Actualizar lista local
      setCompanies((prev) => prev.filter((c) => c.id !== selectedCompany.id));

      router.refresh();
    } else {
      toast.error(result.error || "Error al eliminar empresa");
    }

    setIsLoading(false);
    setIsDeleteDialogOpen(false);
    setSelectedCompany(null);
  };

  const handleDuplicate = async (company: Company) => {
    if (!company.uuid || isDuplicating) return;

    setIsDuplicating(company.uuid);

    const result = await duplicateCompany(company.uuid);

    if (result.success && result.data) {
      // Actualizar lista local inmediatamente (optimistic update)
      setCompanies((prev) => [...prev, result.data as Company]);
      toast.success(`Empresa "${company.name}" duplicada exitosamente`);
      router.refresh();
    } else {
      toast.error(result.error || "Error al duplicar empresa");
    }

    setIsDuplicating(null);
  };

  const handlePermanentDelete = async () => {
    if (!selectedCompany || !selectedCompany.uuid) return;

    setIsLoading(true);

    const result = await permanentDeleteCompany(selectedCompany.uuid);

    if (result.success) {
      toast.success(
        `Empresa "${selectedCompany.name}" eliminada definitivamente`
      );

      // Remover de lista local
      setCompanies((prev) => prev.filter((c) => c.id !== selectedCompany.id));

      router.refresh();
    } else {
      toast.error(result.error || "Error al eliminar empresa definitivamente");
    }

    setIsLoading(false);
    setIsPermanentDeleteDialogOpen(false);
    setSelectedCompany(null);
  };

  const getTipoLabel = (type: string) => {
    return type === "empresa" ? "Empresa" : "Autónomo";
  };

  const tipoColors = {
    empresa: "bg-lime-100 text-blue-800",
    autonomo: "bg-purple-100 text-purple-800",
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Filtros */}
      <div className="flex gap-4 mb-4 flex-wrap items-center">
        <Input
          placeholder="Buscar por nombre, NIF/CIF o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-white"
        />

        {/* Botones de filtro de tipo */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={
              typeFilter === "all" && search === "" ? "default" : "outline"
            }
            size="sm"
            onClick={() => {
              setTypeFilter("all");
              setSearch("");
            }}
            className={
              typeFilter === "all" && search === ""
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Todas ({companies.length})
          </Button>
          <Button
            variant={typeFilter === "empresa" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("empresa")}
            disabled={!typeCounts["empresa"]}
            className={
              typeFilter === "empresa"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Empresas{typeCounts["empresa"] ? ` (${typeCounts["empresa"]})` : ""}
          </Button>
          <Button
            variant={typeFilter === "autonomo" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("autonomo")}
            disabled={!typeCounts["autonomo"]}
            className={
              typeFilter === "autonomo"
                ? "bg-lime-500 hover:bg-lime-600"
                : "border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
            }
          >
            Autónomos
            {typeCounts["autonomo"] ? ` (${typeCounts["autonomo"]})` : ""}
          </Button>
        </div>
      </div>

      {/* Contador de resultados */}
      {companies.length > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          Mostrando {filteredCompanies.length} de {companies.length} Empresas
        </div>
      )}

      {/* Vista Desktop - Tabla */}
      <div className="hidden lg:block rounded-md border bg-lime-100">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="p-4">Empresa</TableHead>
              <TableHead className="p-4 text-center">Tipo</TableHead>
              <TableHead className="p-4 text-center">NIF/CIF</TableHead>
              <TableHead className="p-4 text-center">Contacto</TableHead>
              <TableHead className="p-4 text-center">Estadísticas</TableHead>
              <TableHead className="p-4 text-center">Creada</TableHead>
              <TableHead className="p-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  {search || typeFilter !== "all"
                    ? "No se encontraron empresas con los filtros aplicados"
                    : "No hay empresas registradas"}
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => (
                <TableRow
                  key={company.id}
                  className="bg-white border-t hover:bg-lime-100/100"
                >
                  {/* Columna Empresa */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="font-medium"
                            style={{ fontSize: "12px" }}
                          >
                            {company.name}
                          </div>
                          {company.id === 1 && (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">
                              Por defecto
                            </Badge>
                          )}
                          {company.deleted_at && (
                            <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0">
                              Eliminada
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {company.address}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Columna Tipo */}
                  <TableCell className="p-4 text-center">
                    <Badge
                      className={
                        tipoColors[company.type as keyof typeof tipoColors] ||
                        "bg-gray-200 text-gray-700"
                      }
                    >
                      {getTipoLabel(company.type)}
                    </Badge>
                  </TableCell>

                  {/* Columna NIF/CIF */}
                  <TableCell className="p-4 text-center">
                    <span className="text-xs">{company.nif}</span>
                  </TableCell>

                  {/* Columna Contacto */}
                  <TableCell className="p-4">
                    <div className="space-y-0.5 text-center">
                      <div className="text-xs">{company.phone}</div>
                      <div className="text-xs text-muted-foreground">
                        {company.email}
                      </div>
                    </div>
                  </TableCell>

                  {/* Columna Estadísticas */}
                  <TableCell className="p-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {/* Fila 1: Iconos */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Usuarios (Admin/Comercial)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tarifas</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Presupuestos</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Fila 2: Valores */}
                      <div className="text-xs font-medium">
                        {company.admin_count || 0}/{company.comercial_count || 0}
                      </div>
                      <div className="text-xs font-medium">
                        {company.tariff_count || 0}
                      </div>
                      <div className="text-xs font-medium">
                        {company.budget_count || 0}
                      </div>
                    </div>
                  </TableCell>

                  {/* Columna Creada */}
                  <TableCell
                    className="p-4 text-center text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  >
                    {formatDate(company.created_at)}
                  </TableCell>

                  {/* Columna Acciones */}
                  <TableCell className="p-4">
                    <TooltipProvider>
                      <div className="flex justify-end gap-2">
                        {/* Botón Editar - Solo para empresas activas */}
                        {!company.deleted_at && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                              >
                                <Link href={`/companies/create?id=${company.uuid}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Botón Crear Usuario - Solo para empresas activas */}
                        {!company.deleted_at && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                              >
                                <Link href={`/users/create?company_id=${company.uuid}`}>
                                  <UserPlus className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Crear usuario</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Botón Duplicar - Solo para empresas activas */}
                        {!company.deleted_at && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDuplicate(company)}
                                disabled={isDuplicating === company.uuid}
                                className="border-lime-500 text-lime-600 hover:bg-lime-500 hover:text-white"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Duplicar empresa</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Botón Eliminar / Eliminar Definitivamente */}
                        {!company.deleted_at ? (
                          // Empresa activa: Botón Eliminar (soft delete)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setIsDeleteDialogOpen(true);
                                }}
                                disabled={company.id === 1}
                                className={
                                  company.id === 1
                                    ? "opacity-50 cursor-not-allowed"
                                    : "border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {company.id === 1
                                  ? "Empresa por defecto - No se puede eliminar"
                                  : "Eliminar"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          // Empresa eliminada: Botón Eliminar Definitivamente (hard delete)
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setSelectedCompany(company);
                                  setIsPermanentDeleteDialogOpen(true);
                                }}
                                disabled={company.id === 1}
                                className={
                                  company.id === 1
                                    ? "opacity-50 cursor-not-allowed"
                                    : "border-red-700 text-red-700 hover:bg-red-700 hover:text-white"
                                }
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {company.id === 1
                                  ? "Empresa por defecto - No se puede eliminar"
                                  : "Eliminar definitivamente (irreversible)"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista Mobile/Tablet - Cards */}
      <div className="lg:hidden">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search || typeFilter !== "all"
              ? "No se encontraron empresas con los filtros aplicados"
              : "No hay empresas registradas"}
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))
        )}
      </div>

      {/* Dialog confirmar eliminación */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              ⚠️ Marcar empresa como eliminada
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ¿Estás seguro de que quieres eliminar la empresa{" "}
                  <strong className="text-foreground">
                    {selectedCompany?.name}
                  </strong>
                  ?
                </p>

                <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                  <p className="font-semibold text-red-800">
                    Esta acción ocultará la empresa y su contenido:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>
                      <strong>{selectedCompany?.user_count || 0}</strong> usuarios
                    </li>
                    <li>
                      <strong>{selectedCompany?.tariff_count || 0}</strong>{" "}
                      tarifas
                    </li>
                    <li>
                      <strong>{selectedCompany?.budget_count || 0}</strong>{" "}
                      presupuestos
                    </li>
                    <li>Todos los PDFs generados</li>
                    <li>Todas las versiones y notas</li>
                  </ul>
                </div>

                <div className="bg-lime-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    ℹ️ <strong>Nota:</strong> Los datos se marcarán como
                    eliminados pero podrán ser recuperados por un superadmin si
                    fue un error. Para eliminar permanentemente, contacta con
                    soporte técnico.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Eliminando..." : "Sí, marcar como eliminada"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog confirmar eliminación PERMANENTE */}
      <AlertDialog
        open={isPermanentDeleteDialogOpen}
        onOpenChange={setIsPermanentDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">
              🚨 ELIMINAR DEFINITIVAMENTE
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-base font-semibold">
                  ¿Estás COMPLETAMENTE seguro de eliminar definitivamente la
                  empresa{" "}
                  <strong className="text-foreground">
                    {selectedCompany?.name}
                  </strong>
                  ?
                </p>

                <div className="bg-red-100 border-2 border-red-600 rounded-md p-4 space-y-2">
                  <p className="font-bold text-red-900 text-base">
                    ⚠️ ESTA ACCIÓN ES IRREVERSIBLE
                  </p>
                  <p className="text-sm text-red-800">
                    Se eliminarán PERMANENTEMENTE todos los datos:
                  </p>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside ml-2">
                    <li>
                      <strong>{selectedCompany?.user_count || 0}</strong> usuarios
                      y sus accesos
                    </li>
                    <li>
                      <strong>{selectedCompany?.tariff_count || 0}</strong>{" "}
                      tarifas
                    </li>
                    <li>
                      <strong>{selectedCompany?.budget_count || 0}</strong>{" "}
                      presupuestos
                    </li>
                    <li>Todas las versiones de presupuestos</li>
                    <li>Todas las notas</li>
                    <li>Todos los PDFs generados</li>
                    <li>Todos los archivos y configuraciones</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-md p-3">
                  <p className="text-sm text-yellow-900 font-semibold">
                    ⚡ NO PODRÁS RECUPERAR ESTOS DATOS
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    El sistema quedará limpio como si esta empresa nunca se
                    hubiera registrado.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isLoading}
              className="bg-red-700 hover:bg-red-800 font-bold"
            >
              {isLoading
                ? "Eliminando definitivamente..."
                : "SÍ, ELIMINAR DEFINITIVAMENTE"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
