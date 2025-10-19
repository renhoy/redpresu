import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getCompanies } from "@/app/actions/companies";
import { Building2 } from "lucide-react";
import CompanyTable from "@/components/companies/CompanyTable";

export const metadata = {
  title: "Gestión de Empresas | JEYCA Presupuestos",
  description: "Administrar empresas del sistema",
};

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

  const companies = result.data || [];

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-cyan-600 flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Empresas
            </h1>
            <p className="text-sm text-cyan-600">
              Gestiona todas las empresas del sistema
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Total Empresas</div>
            <div className="text-2xl font-bold text-cyan-600">
              {companies.length}
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">
              Empresas (tipo empresa)
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {companies.filter((c) => c.tipo === "empresa").length}
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Autónomos</div>
            <div className="text-2xl font-bold text-purple-600">
              {companies.filter((c) => c.tipo === "autonomo").length}
            </div>
          </div>
        </div>

        {/* Table */}
        <CompanyTable companies={companies} />
      </div>
    </div>
  );
}
