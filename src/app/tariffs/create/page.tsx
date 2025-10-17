import { TariffForm } from '@/components/tariffs/TariffForm'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { getTemplateTariff, getUserIssuerData } from '@/app/actions/tariffs'
import { getTariffDefaultsAction, getDefaultEmpresaId } from '@/app/actions/config'

export default async function CreateTariffPage() {
  // Verificar autenticación
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener empresa_id (usar empresa por defecto si usuario no tiene asignada)
  let empresaId = user.empresa_id
  if (!empresaId) {
    console.log('[CreateTariffPage] Usuario sin empresa_id, obteniendo empresa por defecto...')
    empresaId = await getDefaultEmpresaId()
    console.log('[CreateTariffPage] Usando empresa por defecto:', empresaId)
  }

  // Intentar cargar plantilla de la empresa correspondiente
  let templateData = undefined
  try {
    const result = await getTemplateTariff(empresaId)
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
      // Si no hay plantilla, cargar valores por defecto de configuración (default_tariff)
      console.log('[CreateTariffPage] No hay plantilla, cargando valores por defecto...')
      const defaultsResult = await getTariffDefaultsAction(empresaId)
      const issuerResult = await getUserIssuerData(user.id)

      if (defaultsResult.success && defaultsResult.data) {
        // Usar TODOS los valores de default_tariff
        templateData = {
          validity: defaultsResult.data.validity,
          status: defaultsResult.data.status,
          logo_url: defaultsResult.data.logo_url,
          name: defaultsResult.data.name,
          nif: defaultsResult.data.nif,
          address: defaultsResult.data.address,
          contact: defaultsResult.data.contact,
          primary_color: defaultsResult.data.primary_color,
          secondary_color: defaultsResult.data.secondary_color,
          template: defaultsResult.data.template,
          summary_note: defaultsResult.data.summary_note,
          conditions_note: defaultsResult.data.conditions_note,
          legal_note: defaultsResult.data.legal_note,
          // Si hay datos de issuer, sobrescribir los datos de empresa
          ...(issuerResult.success && issuerResult.data ? {
            name: issuerResult.data.name,
            nif: issuerResult.data.nif,
            address: issuerResult.data.address,
            contact: issuerResult.data.contact,
          } : {})
        }
        console.log('[CreateTariffPage] Valores default_tariff cargados:', defaultsResult.data)
      } else {
        // Fallback si no existe default_tariff en BD (no debería ocurrir después de migración 028)
        templateData = {
          primary_color: '#84cc16',
          secondary_color: '#0891b2',
          template: '',
          validity: 30,
          status: 'Activa' as const,
          logo_url: '',
          name: '',
          nif: '',
          address: '',
          contact: '',
          summary_note: '',
          conditions_note: '',
          legal_note: '',
          // Si hay datos de issuer, usarlos
          ...(issuerResult.success && issuerResult.data ? {
            name: issuerResult.data.name,
            nif: issuerResult.data.nif,
            address: issuerResult.data.address,
            contact: issuerResult.data.contact,
          } : {})
        }
        console.warn('[CreateTariffPage] default_tariff no encontrado, usando fallback hardcodeado')
      }
    }
  } catch (error) {
    console.warn('[CreateTariffPage] Error al cargar datos iniciales:', error)
    // Intentar cargar al menos los valores por defecto de configuración
    try {
      const defaultsResult = await getTariffDefaultsAction(empresaId)
      const issuerResult = await getUserIssuerData(user.id)

      if (defaultsResult.success && defaultsResult.data) {
        templateData = {
          validity: defaultsResult.data.validity,
          status: defaultsResult.data.status,
          logo_url: defaultsResult.data.logo_url,
          name: defaultsResult.data.name,
          nif: defaultsResult.data.nif,
          address: defaultsResult.data.address,
          contact: defaultsResult.data.contact,
          primary_color: defaultsResult.data.primary_color,
          secondary_color: defaultsResult.data.secondary_color,
          template: defaultsResult.data.template,
          summary_note: defaultsResult.data.summary_note,
          conditions_note: defaultsResult.data.conditions_note,
          legal_note: defaultsResult.data.legal_note,
          // Si hay datos de issuer, sobrescribir los datos de empresa
          ...(issuerResult.success && issuerResult.data ? {
            name: issuerResult.data.name,
            nif: issuerResult.data.nif,
            address: issuerResult.data.address,
            contact: issuerResult.data.contact,
          } : {})
        }
      } else {
        // Fallback mínimo
        templateData = {
          primary_color: '#84cc16',
          secondary_color: '#0891b2',
          template: '',
          validity: 30,
          status: 'Activa' as const,
          logo_url: '',
          name: '',
          nif: '',
          address: '',
          contact: '',
          summary_note: '',
          conditions_note: '',
          legal_note: ''
        }
      }
    } catch (defaultError) {
      console.error('[CreateTariffPage] Error al cargar valores por defecto:', defaultError)
      // Usar fallback mínimo si todo falla
      templateData = {
        primary_color: '#84cc16',
        secondary_color: '#0891b2',
        template: '',
        validity: 30,
        status: 'Activa' as const,
        logo_url: '',
        name: '',
        nif: '',
        address: '',
        contact: '',
        summary_note: '',
        conditions_note: '',
        legal_note: ''
      }
    }
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <TariffForm mode="create" initialData={templateData as any} />
    </div>
  )
}