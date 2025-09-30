import { getTariffById } from '@/app/actions/tariffs'
import { TariffForm } from '@/components/tariffs/TariffForm'
import { redirect } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

export default async function EditTariffPage({ params }: PageProps) {
  const tariffId = parseInt(params.id)

  if (isNaN(tariffId)) {
    redirect('/tariffs')
  }

  const tariff = await getTariffById(tariffId)

  if (!tariff) {
    redirect('/tariffs')
  }

  return <TariffForm mode="edit" tariffId={tariffId} initialData={tariff} />
}