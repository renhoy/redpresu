import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Verificar que el usuario es admin o superadmin
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, empresa_id')
    .eq('id', authUser.id)
    .single()

  if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role)) {
    redirect('/dashboard')
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
        empresaId={currentUser.empresa_id}
      />
    </div>
  )
}
