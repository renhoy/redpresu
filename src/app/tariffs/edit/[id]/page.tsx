import { getTariffById } from '@/app/actions/tariffs'
import { TariffForm } from '@/components/tariffs/TariffForm'
import { redirect } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

export default async function EditTariffPage({ params }: PageProps) {
  const tariffId = params.id

  // Validar que es un UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(tariffId)) {
    redirect('/tariffs')
  }

  const tariff = await getTariffById(tariffId)

  if (!tariff) {
    redirect('/tariffs')
  }

  return (
    <div className="min-h-screen bg-white">
      <TariffForm mode="edit" tariffId={tariffId} initialData={tariff} />
    </div>
  )
}