"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, deleteCompany } from "@/app/actions/companies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

  const getTipoLabel = (type: string) => {
    return type === "empresa" ? "Empresa" : "Autónomo";
  };

  const tipoColors = {
    empresa: "bg-lime-50 text-blue-800",
    autonomo: "bg-purple-50 text-purple-800",
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
            {companies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay empresas registradas
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
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
                    <div className="flex justify-center gap-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{company.user_count || 0}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Usuarios</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs">
                              <Layers className="h-3 w-3 text-muted-foreground" />
                              <span>{company.tariff_count || 0}</span>
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
                            <div className="flex items-center gap-1 text-xs">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span>{company.budget_count || 0}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Presupuestos</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                        {/* Botón Editar */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" asChild>
                              <Link href={`/companies/${company.uuid}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar</p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Botón Eliminar */}
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
                                  : "border-red-500 text-red-600 hover:bg-red-50"
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
        {companies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay empresas registradas
          </div>
        ) : (
          companies.map((company) => (
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
            <AlertDialogDescription className="space-y-3">
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
    </>
  );
}
