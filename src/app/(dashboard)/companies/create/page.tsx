import { redirect, notFound } from "next/navigation";
import { getServerUser } from "@/lib/auth/server";
import { getCompanyById } from "@/app/actions/companies";
import CompanyForm from "@/components/companies/CompanyForm";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata("Gestionar Empresa", "Crear o editar empresa");
}

interface CreateCompanyPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function CreateCompanyPage({ searchParams }: CreateCompanyPageProps) {
  const { id } = await searchParams;
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  // Solo superadmin puede crear/editar empresas
  if (user.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Si hay id, es modo edición - cargar empresa
  let editCompany = undefined;
  if (id) {
    const result = await getCompanyById(id);
    if (!result.success || !result.data) {
      notFound();
    }
    // Asegurarse de que data es un objeto Company, no un array
    editCompany = Array.isArray(result.data) ? result.data[0] : result.data;
  }

  const mode = id ? "edit" : "create";

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <CompanyForm
          mode={mode}
          company={editCompany}
          currentUserRole={user.role}
        />
      </div>
    </div>
  );
}
