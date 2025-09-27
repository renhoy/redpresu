import { getTariffById } from '@/app/actions/tariffs'
import { TariffForm } from '@/components/tariffs/TariffForm'
import { notFound } from 'next/navigation'

interface EditTariffPageProps {
  params: { id: string }
}

export default async function EditTariffPage({ params }: EditTariffPageProps) {
  const tariff = await getTariffById(parseInt(params.id))

  if (!tariff) {
    notFound()
  }

  return <TariffForm mode="edit" initialData={tariff} />
}