"use client";

import { useState } from "react";
import Link from "next/link";
import { Company, deleteCompany } from "@/app/actions/companies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Building2, Users, Layers, FileText } from "lucide-react";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CompanyCardProps {
  company: Company;
}

const tipoColors = {
  empresa: "bg-lime-50 text-blue-800",
  autonomo: "bg-purple-50 text-purple-800",
};

export function CompanyCard({ company }: CompanyCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (isDeleting || !company.uuid) return;

    setIsDeleting(true);
    try {
      const result = await deleteCompany(company.uuid);
      if (result.success) {
        toast.success(`Empresa "${company.name}" eliminada correctamente`);
        router.refresh();
        setShowDeleteDialog(false);
      } else {
        toast.error(result.error || "Error al eliminar");
      }
    } catch {
      toast.error("Error inesperado al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  const getTipoLabel = (type: string) => {
    return type === "empresa" ? "Empresa" : "Autónomo";
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
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{company.name}</div>
                <div className="text-xs text-muted-foreground truncate">{company.address}</div>
              </div>
            </div>
            {company.id === 1 && (
              <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 shrink-0">
                Por defecto
              </Badge>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">Tipo</div>
              <Badge
                className={
                  tipoColors[company.type as keyof typeof tipoColors] ||
                  "bg-gray-200 text-gray-700"
                }
              >
                {getTipoLabel(company.type)}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">NIF/CIF</div>
              <div className="font-mono">{company.nif}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Teléfono</div>
              <div>{company.phone}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Email</div>
              <div className="truncate">{company.email}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-around py-2 border-t border-b mb-3">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="text-xs">Usuarios</span>
              </div>
              <div className="font-bold text-sm">{company.user_count || 0}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Layers className="h-3 w-3" />
                <span className="text-xs">Tarifas</span>
              </div>
              <div className="font-bold text-sm">{company.tariff_count || 0}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span className="text-xs">Presupuestos</span>
              </div>
              <div className="font-bold text-sm">{company.budget_count || 0}</div>
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground mb-3">
            Creada el {formatDate(company.created_at)}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/companies/${company.uuid}/edit`}>
                <Pencil className="h-3 w-3 mr-1" />
                Editar
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={company.id === 1}
              className={
                company.id === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "border-red-500 text-red-600 hover:bg-red-50"
              }
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog confirmar eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              ⚠️ Marcar empresa como eliminada
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                ¿Estás seguro de que quieres eliminar la empresa{" "}
                <strong className="text-foreground">{company.name}</strong>?
              </p>

              <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                <p className="font-semibold text-red-800">
                  Esta acción ocultará la empresa y su contenido:
                </p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>
                    <strong>{company.user_count || 0}</strong> usuarios
                  </li>
                  <li>
                    <strong>{company.tariff_count || 0}</strong> tarifas
                  </li>
                  <li>
                    <strong>{company.budget_count || 0}</strong> presupuestos
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
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Eliminando..." : "Sí, marcar como eliminada"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
