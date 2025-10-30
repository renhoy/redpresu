import Link from "next/link";
import { FileText } from "lucide-react";

interface PublicFooterProps {
  appName?: string;
  showPricing?: boolean;
  showRegister?: boolean;
}

export function PublicFooter({
  appName = "Redpresu",
  showPricing = true,
  showRegister = true,
}: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="w-6 h-6 bg-lime-500 rounded flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold">{appName}</span>
        </div>

        {/* Enlaces */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-6">
          <Link
            href="/"
            className="text-gray-400 hover:text-lime-500 transition-colors text-sm"
          >
            Inicio
          </Link>
          {showPricing && (
            <Link
              href="/pricing"
              className="text-gray-400 hover:text-lime-500 transition-colors text-sm"
            >
              Precios
            </Link>
          )}
          <Link
            href="/contact"
            className="text-gray-400 hover:text-lime-500 transition-colors text-sm"
          >
            Contacto
          </Link>
          {showRegister && (
            <Link
              href="/register"
              className="text-gray-400 hover:text-lime-500 transition-colors text-sm"
            >
              Registro
            </Link>
          )}
          <Link
            href="/login"
            className="text-gray-400 hover:text-lime-500 transition-colors text-sm"
          >
            Acceso
          </Link>
          <Link
            href="/legal"
            className="text-gray-400 hover:text-lime-500 transition-colors text-sm"
          >
            Aviso Legal
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-center text-gray-400">
          © {currentYear} {appName}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
