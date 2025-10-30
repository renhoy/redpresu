import { Header } from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { BackButton } from "@/components/shared/BackButton";
import {
  getAppName,
  getLegalPageContent,
  getSubscriptionsEnabled,
} from "@/lib/helpers/config-helpers";
import { isMultiEmpresa } from "@/lib/helpers/app-mode";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata("Aviso Legal", "Información legal del sitio");
}

export default async function LegalPage() {
  const appName = await getAppName();
  const legalContent = await getLegalPageContent();
  const subscriptionsEnabled = await getSubscriptionsEnabled();
  const multiempresa = await isMultiEmpresa();

  return (
    <div className="min-h-screen bg-lime-50 flex flex-col">
      <Header
        isAuthenticated={false}
        appName={appName}
        multiempresa={multiempresa}
        subscriptionsEnabled={subscriptionsEnabled}
      />

      <div className="container mx-auto px-4 py-16 flex-grow">
        {/* Botón Cancelar Superior */}
        <div className="flex justify-end mb-6">
          <BackButton />
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div
            className="prose prose-lg max-w-none [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-2 [&_a]:text-lime-600 [&_a]:underline [&_a]:hover:text-lime-700"
            dangerouslySetInnerHTML={{ __html: legalContent }}
          />
        </div>

        {/* Botón Cancelar Inferior */}
        <div className="flex justify-end mt-8">
          <BackButton />
        </div>
      </div>

      {/* Footer */}
      <PublicFooter
        appName={appName}
        showPricing={subscriptionsEnabled}
        showRegister={multiempresa}
      />
    </div>
  );
}
