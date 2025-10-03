import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UserForm from '@/components/users/UserForm'

export const metadata = {
  title: 'Crear Usuario | JEYCA Presupuestos',
  description: 'Invitar nuevo usuario a la empresa'
}

export default async function CreateUserPage() {
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

  return (
    <div className="container mx-auto py-10">
      <UserForm
        mode="create"
        empresaId={currentUser.empresa_id}
      />
    </div>
  )
}
