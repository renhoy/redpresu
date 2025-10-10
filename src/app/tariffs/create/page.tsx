import { TariffForm } from '@/components/tariffs/TariffForm'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { getTemplateTariff, getUserIssuerData } from '@/app/actions/tariffs'
import { getTariffDefaultsAction } from '@/app/actions/config'

export default async function CreateTariffPage() {
  // Verificar autenticación
  const user = await getServerUser()

  if (!user || !user.empresa_id) {
    redirect('/login')
  }

  // Intentar cargar plantilla
  let templateData = undefined
  try {
    const result = await getTemplateTariff(user.empresa_id)
    if (result.success && result.data) {
      // Pre-cargar datos de la plantilla (excepto id, created_at, updated_at, json_tariff_data)
      templateData = {
        title: result.data.title,
        description: result.data.description,
        validity: result.data.validity,
        status: 'Activa' as const, // Nueva tarifa siempre empieza activa
        logo_url: result.data.logo_url,
        name: result.data.name,
        nif: result.data.nif,
        address: result.data.address,
        contact: result.data.contact,
        template: result.data.template,
        primary_color: result.data.primary_color,
        secondary_color: result.data.secondary_color,
        summary_note: result.data.summary_note,
        conditions_note: result.data.conditions_note,
        legal_note: result.data.legal_note,
        // NO incluir: json_tariff_data (el CSV debe ser nuevo)
        // NO incluir: is_template (solo la original es plantilla)
      }
      console.log('[CreateTariffPage] Plantilla cargada:', result.data.title)
    } else {
      // Si no hay plantilla, cargar valores por defecto de configuración y datos del issuer
      console.log('[CreateTariffPage] No hay plantilla, cargando valores por defecto...')
      const defaultsResult = await getTariffDefaultsAction()
      const issuerResult = await getUserIssuerData(user.id)

      templateData = {
        // Valores de configuración
        primary_color: defaultsResult.success && defaultsResult.data ? defaultsResult.data.primary_color : '#e8951c',
        secondary_color: defaultsResult.success && defaultsResult.data ? defaultsResult.data.secondary_color : '#109c61',
        template: defaultsResult.success && defaultsResult.data ? defaultsResult.data.template : '41200-00001',
        // Valores básicos
        validity: 30,
        status: 'Activa' as const,
        // Datos del issuer si están disponibles
        ...(issuerResult.success && issuerResult.data ? {
          name: issuerResult.data.name,
          nif: issuerResult.data.nif,
          address: issuerResult.data.address,
          contact: issuerResult.data.contact,
        } : {})
      }
      console.log('[CreateTariffPage] Valores por defecto cargados:', { defaults: defaultsResult.data, issuer: issuerResult.data })
    }
  } catch (error) {
    console.warn('[CreateTariffPage] Error al cargar datos iniciales:', error)
    // Intentar cargar al menos los valores por defecto de configuración e issuer
    try {
      const defaultsResult = await getTariffDefaultsAction()
      const issuerResult = await getUserIssuerData(user.id)

      templateData = {
        // Valores de configuración
        primary_color: defaultsResult.success && defaultsResult.data ? defaultsResult.data.primary_color : '#e8951c',
        secondary_color: defaultsResult.success && defaultsResult.data ? defaultsResult.data.secondary_color : '#109c61',
        template: defaultsResult.success && defaultsResult.data ? defaultsResult.data.template : '41200-00001',
        // Valores básicos
        validity: 30,
        status: 'Activa' as const,
        // Datos del issuer si están disponibles
        ...(issuerResult.success && issuerResult.data ? {
          name: issuerResult.data.name,
          nif: issuerResult.data.nif,
          address: issuerResult.data.address,
          contact: issuerResult.data.contact,
        } : {})
      }
    } catch (defaultError) {
      console.error('[CreateTariffPage] Error al cargar valores por defecto:', defaultError)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <TariffForm mode="create" initialData={templateData as any} />
    </div>
  )
}