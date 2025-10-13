import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { ImportBudgetsForm } from '@/components/budgets/ImportBudgetsForm'

export const metadata = {
  title: 'Importar Presupuestos | Jeyca Presu',
  description: 'Importa presupuestos desde archivos JSON',
}

export default async function ImportBudgetsPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Solo admin y superadmin pueden importar
  if (user.role === 'vendedor') {
    redirect('/budgets')
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-600 mb-2">
          Importar Presupuestos
        </h1>
        <p className="text-muted-foreground">
          Sube un archivo JSON con los presupuestos que deseas importar
        </p>
      </div>

      <ImportBudgetsForm />
    </div>
  )
}
