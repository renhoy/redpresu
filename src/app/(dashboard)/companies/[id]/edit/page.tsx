import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getCompanyById } from "@/app/actions/companies";
import CompanyForm from "@/components/companies/CompanyForm";

export const metadata = {
  title: "Editar Empresa - Respresu",
  description: "Modificar datos de la empresa",
};

interface EditCompanyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCompanyPage({
  params,
}: EditCompanyPageProps) {
  const { id: companyId } = await params;
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Solo superadmin puede acceder a esta ruta
  if (user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Obtener empresa a editar
  const result = await getCompanyById(companyId);

  if (!result.success || !result.data) {
    notFound();
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
