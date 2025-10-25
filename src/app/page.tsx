import { redirect } from 'next/navigation'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Clock, Users } from "lucide-react";
import { getServerUser } from '@/lib/auth/server'
import { getAppName } from '@/lib/helpers/config-helpers'
import { Header } from '@/components/layout/Header'

export default async function Index() {
  // Verificar si el usuario ya está autenticado
  const user = await getServerUser()
  const appName = await getAppName()

  if (user) {
    // Redirigir según rol
    switch (user.role) {
      case 'superadmin':
      case 'admin':
        redirect('/dashboard')
      case 'comercial':
        redirect('/budgets')
      default:
        redirect('/dashboard')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>
      {/* Header */}
      <Header isAuthenticated={false} appName={appName} />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Crea presupuestos
            <span className="text-lime-500"> profesionales</span>
            <br />
            en minutos
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            La herramienta más fácil para crear, gestionar y enviar presupuestos profesionales.
            Perfecto para empresas y autónomos que quieren ahorrar tiempo y cerrar más ventas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-lime-500 hover:bg-lime-600 text-lg px-8 py-3">
                Registro
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Ver Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-lime-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Rápido y Fácil</h3>
            <p className="text-gray-600">
              Crea presupuestos profesionales en pocos minutos con nuestras plantillas prediseñadas.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-lime-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Profesional</h3>
            <p className="text-gray-600">
              Impresiona a tus clientes con presupuestos elegantes y profesionales que reflejan la calidad de tu trabajo.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-lime-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestión Completa</h3>
            <p className="text-gray-600">
              Gestiona clientes, tarifas y presupuestos desde una sola plataforma intuitiva.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-lime-500 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para crear tu primer presupuesto?
          </h2>
          <p className="text-lime-100 mb-8 text-lg">
            Únete a miles de profesionales que ya confían en {appName}
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Crear Cuenta Gratis
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-lime-500 rounded flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">{appName}</span>
          </div>
          <p className="text-center text-gray-400">
            © 2024 {appName}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
