'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserWithInviter, toggleUserStatus } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Edit, UserX, UserCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface UserTableProps {
  users: UserWithInviter[]
  currentUserId: string
  currentUserRole: string
}

export default function UserTable({ users: initialUsers, currentUserId, currentUserRole }: UserTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [selectedUser, setSelectedUser] = useState<UserWithInviter | null>(null)
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleToggleStatus = async () => {
    if (!selectedUser) return

    setIsLoading(true)

    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active'

    const result = await toggleUserStatus(selectedUser.id, newStatus)

    if (result.success) {
      toast.success(
        `Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} correctamente`
      )

      // Actualizar lista local
      setUsers(prev =>
        prev.map(u =>
          u.id === selectedUser.id
            ? { ...u, status: newStatus }
            : u
        )
      )

      router.refresh()
    } else {
      toast.error(result.error || 'Error al cambiar estado')
    }

    setIsLoading(false)
    setIsToggleDialogOpen(false)
    setSelectedUser(null)
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      superadmin: 'destructive',
      admin: 'default',
      vendedor: 'secondary'
    }

    const labels: Record<string, string> = {
      superadmin: 'Superadmin',
      admin: 'Admin',
      vendedor: 'Vendedor'
    }

    return (
      <Badge variant={variants[role] || 'secondary'}>
        {labels[role] || role}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      pending: 'outline'
    }

    const labels: Record<string, string> = {
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente'
    }

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'

    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Invitado por</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.nombre} {user.apellidos}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    {user.inviter_name ? (
                      <div className="text-sm">
                        <div>{user.inviter_name}</div>
                        <div className="text-muted-foreground text-xs">
                          {user.inviter_email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(user.last_login)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Vendedor solo puede editar su propio usuario */}
                    {currentUserRole === 'vendedor' && user.id !== currentUserId ? (
                      <span className="text-muted-foreground text-sm">-</span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/users/${user.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          {/* Solo admin/superadmin pueden cambiar estado */}
                          {currentUserRole !== 'vendedor' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user)
                                setIsToggleDialogOpen(true)
                              }}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          {user.status === 'pending' && currentUserRole !== 'vendedor' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Reenviar invitación
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog confirmar cambio de estado */}
      <AlertDialog open={isToggleDialogOpen} onOpenChange={setIsToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.status === 'active' ? 'Desactivar' : 'Activar'} usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres{' '}
              {selectedUser?.status === 'active' ? 'desactivar' : 'activar'} a{' '}
              <strong>
                {selectedUser?.nombre} {selectedUser?.apellidos}
              </strong>
              ?
              {selectedUser?.status === 'active' && (
                <span className="block mt-2 text-destructive">
                  El usuario no podrá acceder al sistema hasta que sea reactivado.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus} disabled={isLoading}>
              {isLoading ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
