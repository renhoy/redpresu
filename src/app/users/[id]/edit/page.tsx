import { redirect, notFound } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { getUserById } from '@/app/actions/users'
import UserForm from '@/components/users/UserForm'

export const metadata = {
  title: 'Editar Usuario | JEYCA Presupuestos',
  description: 'Modificar datos del usuario'
}

interface EditUserPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id: userId } = await params
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Vendedor solo puede editar su propio usuario
  if (user.role === 'vendedor' && userId !== user.id) {
    redirect('/users')
  }

  // Obtener usuario a editar
  const result = await getUserById(userId)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <div className="container mx-auto py-10">
      <UserForm
        mode="edit"
        user={result.data}
        empresaId={user.company_id}
        currentUserRole={user.role}
      />
    </div>
  )
}
