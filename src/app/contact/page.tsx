import { ContactForm } from "@/components/contact/ContactForm";
import { Header } from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { BackButton } from "@/components/shared/BackButton";
import {
  getAppName,
  getFormsLegalNotice,
  getSubscriptionsEnabled,
} from "@/lib/helpers/config-helpers";
import { isMultiEmpresa } from "@/lib/helpers/app-mode";
import { generatePageMetadata } from "@/lib/helpers/metadata-helpers";

export async function generateMetadata() {
  return generatePageMetadata("Contacto", "Contacta con nosotros");
}

export default async function ContactPage() {
  const appName = await getAppName();
  const legalNotice = await getFormsLegalNotice();
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

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contacto</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            ¿Tienes alguna pregunta o necesitas ayuda? Completa el formulario y
            nos pondremos en contacto contigo lo antes posible.
          </p>
        </div>

        {/* Formulario */}
        <div className="max-w-2xl mx-auto">
          <ContactForm legalNotice={legalNotice} />
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
