import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { ImportTariffsForm } from '@/components/tariffs/ImportTariffsForm'

export const metadata = {
  title: 'Importar Tarifas | Jeyca Presu',
  description: 'Importa tarifas desde archivos JSON',
}

export default async function ImportTariffsPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Solo admin y superadmin pueden importar
  if (user.role === 'vendedor') {
    redirect('/tariffs')
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-600 mb-2">
          Importar Tarifas
        </h1>
        <p className="text-muted-foreground">
          Sube un archivo JSON con las tarifas que deseas importar
        </p>
      </div>

      <ImportTariffsForm />
    </div>
  )
}
