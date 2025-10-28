import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/server";
import { getCompanies } from "@/app/actions/companies";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompanyTable from "@/components/companies/CompanyTable";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata(
    "Gestión de Empresas",
    "Administrar empresas del sistema"
  );
}

export default async function CompaniesPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Solo superadmin puede acceder a esta página
  if (user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Obtener empresas
  const result = await getCompanies();

  if (!result.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {result.error}
        </div>
      </div>
    );
  }

  const companies = Array.isArray(result.data) ? result.data : [];

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="text-center md:text-left w-full md:w-auto">
            <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
              <Building2 className="h-6 w-6" />
              Empresas
            </h1>
            <p className="text-sm">Gestiona todas las empresas del sistema</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center md:justify-end w-full md:w-auto">
            <Button asChild>
              <Link href="/companies/create">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Empresa
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-lime-600">
              {companies.length}
            </div>
            <div className="text-sm text-lime-600">Total Empresas</div>
          </div>
          <div className="bg-lime-100 rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-800">
              {companies.filter((c) => c.type === "empresa").length}
            </div>
            <div className="text-sm text-blue-800">Empresas</div>
          </div>
          <div className="bg-purple-100 rounded-lg border p-4">
            <div className="text-2xl font-bold text-purple-600">
              {companies.filter((c) => c.type === "autonomo").length}
            </div>
            <div className="text-sm text-purple-800">Autónomos</div>
          </div>
        </div>

        {/* Table */}
        <CompanyTable companies={companies} />
      </div>
    </div>
  );
}
