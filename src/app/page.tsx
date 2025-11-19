import { redirect } from 'next/navigation'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Zap, TrendingUp, Clock, CheckCircle, Users, DollarSign, Shield, Sparkles } from "lucide-react";
import { getServerUser } from '@/lib/auth/server'
import { getAppName, getSubscriptionsEnabled } from '@/lib/helpers/config-helpers'
import { isMultiEmpresa } from '@/lib/helpers/app-mode'
import { Header } from '@/components/layout/Header'
import { PublicFooter } from '@/components/layout/PublicFooter'

export default async function Index() {
  // Verificar si el usuario ya está autenticado
  const user = await getServerUser()
  const appName = await getAppName()
  const subscriptionsEnabled = await getSubscriptionsEnabled()
  const multiempresa = await isMultiEmpresa()

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
    <div className="min-h-screen bg-gradient-to-b from-lime-50 to-white">
      {/* Header */}
      <Header
        isAuthenticated={false}
        appName={appName}
        multiempresa={multiempresa}
        subscriptionsEnabled={subscriptionsEnabled}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-lime-200/30 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full border-2 border-lime-500 text-lime-700 font-semibold mb-8 shadow-sm">
              <Zap className="h-4 w-4" />
              <span>Presupuestos profesionales en minutos</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Gestión de presupuestos<br/>
              <span className="bg-gradient-to-r from-lime-600 to-lime-500 bg-clip-text text-transparent">
                que cierra ventas
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              La plataforma completa para crear, gestionar y enviar presupuestos profesionales.
              Diseñada para empresas y autónomos que valoran su tiempo.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-lime-600 to-lime-500 hover:from-lime-700 hover:to-lime-600 text-white text-lg px-8 py-6 shadow-lg shadow-lime-500/30 hover:shadow-xl hover:shadow-lime-500/40 transition-all"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Comenzar gratis
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 border-2 border-lime-500 text-lime-700 hover:bg-lime-50"
                >
                  Ver cómo funciona
                </Button>
              </a>
            </div>

            {/* Stats Display */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-lime-200 max-w-2xl mx-auto">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-lime-600 mb-1">5 min</div>
                  <div className="text-sm text-gray-600">Tiempo medio por presupuesto</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-lime-600 mb-1">+40%</div>
                  <div className="text-sm text-gray-600">Más presupuestos aceptados</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-lime-600 mb-1">100%</div>
                  <div className="text-sm text-gray-600">Profesional y personalizable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para{' '}
              <span className="bg-gradient-to-r from-lime-600 to-lime-500 bg-clip-text text-transparent">
                destacar
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {appName} simplifica tu proceso comercial de principio a fin
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-lime-50 to-white border border-lime-200 rounded-2xl p-8 hover:shadow-xl hover:border-lime-400 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Presupuestos Impecables</h3>
              <p className="text-gray-600 leading-relaxed">
                Crea documentos profesionales con tu imagen corporativa. Añade logo, colores personalizados
                y estructura cada partida de forma clara y detallada.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-lime-50 to-white border border-lime-200 rounded-2xl p-8 hover:shadow-xl hover:border-lime-400 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Ahorra Tiempo</h3>
              <p className="text-gray-600 leading-relaxed">
                Crea tarifas reutilizables y genera presupuestos en minutos. Duplica, versiona y adapta
                sin empezar desde cero cada vez.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-lime-50 to-white border border-lime-200 rounded-2xl p-8 hover:shadow-xl hover:border-lime-400 transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Cierra Más Ventas</h3>
              <p className="text-gray-600 leading-relaxed">
                Presupuestos claros, profesionales y bien presentados generan más confianza.
                Tus clientes entienden exactamente qué están contratando.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Así de sencillo es{' '}
              <span className="bg-gradient-to-r from-lime-600 to-lime-500 bg-clip-text text-transparent">
                trabajar con {appName}
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Cuatro pasos para presupuestos profesionales que impresionan
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-lime-500 text-white rounded-full font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-3xl font-bold mb-4 text-gray-900">Configura tu empresa</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Añade tu logo, datos fiscales y personaliza la apariencia de tus presupuestos.
                  Solo lo haces una vez y queda guardado para siempre.
                </p>
              </div>
              <div className="flex-1 bg-gradient-to-br from-lime-100 to-lime-50 rounded-2xl p-12 border-2 border-lime-300 flex items-center justify-center min-h-[200px]">
                <Users className="h-24 w-24 text-lime-400" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-lime-500 text-white rounded-full font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-3xl font-bold mb-4 text-gray-900">Crea tus tarifas</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Define servicios, productos y paquetes que ofreces. Estructura por categorías,
                  subcategorías y partidas. Reutilízalos en cada presupuesto.
                </p>
              </div>
              <div className="flex-1 bg-gradient-to-br from-lime-100 to-lime-50 rounded-2xl p-12 border-2 border-lime-300 flex items-center justify-center min-h-[200px]">
                <DollarSign className="h-24 w-24 text-lime-400" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-lime-500 text-white rounded-full font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="text-3xl font-bold mb-4 text-gray-900">Genera presupuestos</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Selecciona tu tarifa, añade datos del cliente, ajusta cantidades y precios.
                  El sistema calcula automáticamente subtotales, IVA, IRPF y recargo de equivalencia.
                </p>
              </div>
              <div className="flex-1 bg-gradient-to-br from-lime-100 to-lime-50 rounded-2xl p-12 border-2 border-lime-300 flex items-center justify-center min-h-[200px]">
                <FileText className="h-24 w-24 text-lime-400" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-lime-500 text-white rounded-full font-bold text-xl mb-4">
                  4
                </div>
                <h3 className="text-3xl font-bold mb-4 text-gray-900">Envía y cierra</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Descarga el PDF profesional con tu marca y envíalo al cliente. Gestiona versiones,
                  duplica para nuevos clientes y mantén todo organizado en un solo lugar.
                </p>
              </div>
              <div className="flex-1 bg-gradient-to-br from-lime-100 to-lime-50 rounded-2xl p-12 border-2 border-lime-300 flex items-center justify-center min-h-[200px]">
                <CheckCircle className="h-24 w-24 text-lime-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Diseñado para{' '}
              <span className="bg-gradient-to-r from-lime-600 to-lime-500 bg-clip-text text-transparent">
                profesionales
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Los valores que guían cada funcionalidad de {appName}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Value 1 */}
            <div className="bg-white border-2 border-lime-100 rounded-xl p-6 text-center hover:border-lime-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Rapidez</h3>
              <p className="text-sm text-gray-600">
                Crea presupuestos en minutos, no en horas. Tu tiempo vale oro.
              </p>
            </div>

            {/* Value 2 */}
            <div className="bg-white border-2 border-lime-100 rounded-xl p-6 text-center hover:border-lime-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Profesionalidad</h3>
              <p className="text-sm text-gray-600">
                Documentos impecables que reflejan la calidad de tu trabajo.
              </p>
            </div>

            {/* Value 3 */}
            <div className="bg-white border-2 border-lime-100 rounded-xl p-6 text-center hover:border-lime-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Escalabilidad</h3>
              <p className="text-sm text-gray-600">
                Desde autónomos hasta empresas multiusuario. Crece sin límites.
              </p>
            </div>

            {/* Value 4 */}
            <div className="bg-white border-2 border-lime-100 rounded-xl p-6 text-center hover:border-lime-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Seguridad</h3>
              <p className="text-sm text-gray-600">
                Tus datos y los de tus clientes protegidos con los más altos estándares.
              </p>
            </div>

            {/* Value 5 */}
            <div className="bg-white border-2 border-lime-100 rounded-xl p-6 text-center hover:border-lime-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Simplicidad</h3>
              <p className="text-sm text-gray-600">
                Interfaz intuitiva. Sin curva de aprendizaje, productivo desde el día 1.
              </p>
            </div>

            {/* Value 6 */}
            <div className="bg-white border-2 border-lime-100 rounded-xl p-6 text-center hover:border-lime-400 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-lime-600" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Colaboración</h3>
              <p className="text-sm text-gray-600">
                Gestiona equipos, asigna permisos y trabaja de forma coordinada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-lime-600 to-lime-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            El presupuesto perfecto está a un clic
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-lime-50">
            Únete a cientos de profesionales que ya confían en {appName}
          </p>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8">
            <div className="space-y-4 text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0 mt-1" />
                <p className="text-lg">
                  <strong>Sin costes ocultos</strong> - Prueba gratis sin tarjeta de crédito
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0 mt-1" />
                <p className="text-lg">
                  <strong>Configuración en minutos</strong> - Crea tu primer presupuesto hoy mismo
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-white flex-shrink-0 mt-1" />
                <p className="text-lg">
                  <strong>Soporte incluido</strong> - Te ayudamos a sacar el máximo partido
                </p>
              </div>
            </div>
          </div>

          <Link href="/register">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-lime-700 hover:bg-gray-50 text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all font-semibold"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Crear mi cuenta GRATIS
            </Button>
          </Link>

          <p className="mt-6 text-lime-100 text-sm">
            Sin permanencia • Cancela cuando quieras • Datos seguros
          </p>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter
        appName={appName}
        showPricing={subscriptionsEnabled}
        showRegister={multiempresa}
      />
    </div>
  );
}
