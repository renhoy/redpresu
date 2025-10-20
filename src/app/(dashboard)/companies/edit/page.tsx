import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getCompanyById } from "@/app/actions/companies";
import CompanyForm from "@/components/companies/CompanyForm";

export const metadata = {
  title: "Editar Empresa - Respresu",
  description: "Modificar datos de la empresa",
};

export default async function EditCompanyPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Solo admin y superadmin pueden acceder
  if (!["admin", "superadmin"].includes(user.role)) {
    redirect("/dashboard");
  }

  // Admin solo puede editar su propia empresa
  const result = await getCompanyById(user.company_id.toString());

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {result.error || "Empresa no encontrada"}
        </div>
      </div>
    );
  }

  const company = Array.isArray(result.data) ? result.data[0] : result.data;

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <CompanyForm company={company} currentUserRole={user.role} />
      </div>
    </div>
  );
}
