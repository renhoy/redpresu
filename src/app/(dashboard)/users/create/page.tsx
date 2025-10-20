import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import UserForm from '@/components/users/UserForm'

export const metadata = {
  title: 'Crear Usuario | JEYCA Presupuestos',
  description: 'Invitar nuevo usuario a la empresa'
}

export default async function CreateUserPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  if (!['admin', 'superadmin'].includes(user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        <UserForm
          mode="create"
          empresaId={user.company_id}
          currentUserRole={user.role}
        />
      </div>
    </div>
  )
}
