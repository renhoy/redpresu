"use client"

import { UserWithInviter } from '@/app/actions/users'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Mail, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'

interface UserCardProps {
  user: UserWithInviter
  currentUserId: string
  currentUserRole: string
  onToggleStatus: (user: UserWithInviter) => void
  formatDate: (date: string | null) => string
}

export function UserCard({
  user,
  currentUserId,
  currentUserRole,
  onToggleStatus,
  formatDate
}: UserCardProps) {
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

  const canEdit = currentUserRole !== 'vendedor' || user.id === currentUserId

  return (
    <Card className="w-full mb-3">
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Fila 1: Nombre + Rol + Estado */}
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              {/* Nombre */}
              <div className="font-semibold text-sm truncate">
                {user.nombre} {user.apellidos}
              </div>
              {/* Email + Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
              </div>
            </div>
          </div>

          {/* Fila 2: Invitado por + Último acceso */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
            <div className="min-w-0">
              <div className="text-muted-foreground mb-1">Invitado por</div>
              {user.inviter_name ? (
                <div className="space-y-0.5">
                  <div className="font-medium truncate">{user.inviter_name}</div>
                  <div className="text-muted-foreground truncate">{user.inviter_email}</div>
                </div>
              ) : (
                <div className="text-muted-foreground">-</div>
              )}
            </div>
            <div className="min-w-0 text-right">
              <div className="text-muted-foreground mb-1">Último acceso</div>
              <div className="text-sm font-medium">{formatDate(user.last_login)}</div>
            </div>
          </div>

          {/* Fila 3: Acciones */}
          <div className="flex justify-end items-center gap-1 border-t pt-3">
            {!canEdit ? (
              <span className="text-muted-foreground text-sm">-</span>
            ) : (
              <>
                {/* Botón Editar */}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-7 px-2"
                >
                  <Link href={`/users/${user.id}/edit`}>
                    <Pencil className="h-3 w-3" />
                  </Link>
                </Button>

                {/* Botón Activar/Desactivar - Solo admin/superadmin */}
                {currentUserRole !== 'vendedor' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(user)}
                    className={`h-7 px-2 ${
                      user.status === 'active'
                        ? 'border-orange-500 text-orange-600 hover:bg-orange-50'
                        : 'border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {user.status === 'active' ? (
                      <UserX className="h-3 w-3" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                  </Button>
                )}

                {/* Botón Reenviar invitación - Solo si pending */}
                {user.status === 'pending' && currentUserRole !== 'vendedor' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <Mail className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
