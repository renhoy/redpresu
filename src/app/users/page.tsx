import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server'
import { getUsers } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import UserTable from '@/components/users/UserTable'

export const metadata = {
  title: 'Gestión de Usuarios | JEYCA Presupuestos',
  description: 'Administrar usuarios de la empresa'
}

export default async function UsersPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Permitir acceso a vendedores también (solo lectura de su propio usuario)
  const canCreateUsers = ['admin', 'superadmin'].includes(user.role)

  // Obtener usuarios
  const result = await getUsers()

  if (!result.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {result.error}
        </div>
      </div>
    )
  }

  const users = result.data || []

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto py-10">
        <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground">
              Administra los usuarios de tu empresa
            </p>
          </div>

          {canCreateUsers && (
            <Button asChild>
              <Link href="/users/create">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm font-medium text-muted-foreground">
              Total Usuarios
            </div>
            <div className="text-2xl font-bold">{users.length}</div>
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm font-medium text-muted-foreground">
              Usuarios Activos
            </div>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm font-medium text-muted-foreground">
              Pendientes
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {users.filter(u => u.status === 'pending').length}
            </div>
          </div>
        </div>

          {/* Table */}
          <UserTable
            users={users}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </div>
      </div>
    </div>
  )
}
