import { TariffForm } from '@/components/tariffs/TariffForm'
import { getServerUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { getTemplateTariff } from '@/app/actions/tariffs'

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
    }
  } catch (error) {
    console.warn('[CreateTariffPage] No se pudo cargar plantilla:', error)
    // Continuar sin plantilla
  }

  return <TariffForm mode="create" initialData={templateData as any} />
}