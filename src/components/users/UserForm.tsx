'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, updateUser, type CreateUserData, type UpdateUserData, type User } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface UserFormProps {
  mode: 'create' | 'edit'
  user?: User
  empresaId: number
}

interface FormData {
  email: string
  nombre: string
  apellidos: string
  role: 'vendedor' | 'admin' | 'superadmin'
  status?: 'active' | 'inactive' | 'pending'
}

export default function UserForm({ mode, user, empresaId }: UserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: user?.email || '',
    nombre: user?.nombre || '',
    apellidos: user?.apellidos || '',
    role: user?.role || 'vendedor',
    status: user?.status || 'active'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const router = useRouter()

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSelectChange = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      if (mode === 'create') {
        // Crear usuario
        const createData: CreateUserData = {
          email: formData.email,
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          role: formData.role,
          empresa_id: empresaId
        }

        const result = await createUser(createData)

        if (!result.success) {
          setErrors({ general: result.error || 'Error al crear usuario' })
          return
        }

        // Mostrar password temporal
        if (result.temporaryPassword) {
          setTemporaryPassword(result.temporaryPassword)
        }

        toast.success('Usuario creado correctamente')

        // No redirigir aún, mostrar password primero

      } else {
        // Actualizar usuario
        const updateData: UpdateUserData = {
          nombre: formData.nombre !== user?.nombre ? formData.nombre : undefined,
          apellidos: formData.apellidos !== user?.apellidos ? formData.apellidos : undefined,
          role: formData.role !== user?.role ? formData.role : undefined,
          status: formData.status !== user?.status ? formData.status : undefined
        }

        // Si no hay cambios
        if (Object.values(updateData).every(v => v === undefined)) {
          toast.info('No hay cambios que guardar')
          return
        }

        const result = await updateUser(user!.id, updateData)

        if (!result.success) {
          setErrors({ general: result.error || 'Error al actualizar usuario' })
          return
        }

        toast.success('Usuario actualizado correctamente')
        router.push('/users')
        router.refresh()
      }

    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Error inesperado'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPassword = async () => {
    if (!temporaryPassword) return

    try {
      await navigator.clipboard.writeText(temporaryPassword)
      setCopiedPassword(true)
      toast.success('Contraseña copiada al portapapeles')

      setTimeout(() => setCopiedPassword(false), 2000)
    } catch (error) {
      toast.error('Error al copiar contraseña')
    }
  }

  const handleGoToUsers = () => {
    router.push('/users')
    router.refresh()
  }

  // Si ya se creó el usuario y hay password temporal
  if (mode === 'create' && temporaryPassword) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-green-600">
            ✓ Usuario Creado
          </CardTitle>
          <CardDescription className="text-center">
            El usuario ha sido creado correctamente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Importante:</strong> Esta es la única vez que verás esta contraseña.
              Cópiala y envíala al usuario de forma segura.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Email del usuario</Label>
            <div className="p-3 bg-muted rounded-md font-mono">
              {formData.email}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contraseña temporal</Label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-lg">
                {temporaryPassword}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyPassword}
              >
                {copiedPassword ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              El usuario deberá cambiar esta contraseña en su primer inicio de sesión.
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={handleGoToUsers} className="w-full">
            Volver a Usuarios
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Formulario normal
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">
          {mode === 'create' ? 'Crear Usuario' : 'Editar Usuario'}
        </CardTitle>
        <CardDescription>
          {mode === 'create'
            ? 'Invita a un nuevo usuario a tu empresa'
            : 'Modifica los datos del usuario'}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Email (solo en creación) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={formData.email}
                onChange={handleInputChange('email')}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
                required
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          )}

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="p-3 bg-muted rounded-md text-muted-foreground">
                {formData.email}
              </div>
              <p className="text-xs text-muted-foreground">
                El email no se puede modificar
              </p>
            </div>
          )}

          {/* Nombre y Apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                type="text"
                placeholder="Juan"
                value={formData.nombre}
                onChange={handleInputChange('nombre')}
                className={errors.nombre ? 'border-red-500' : ''}
                disabled={isLoading}
                required
              />
              {errors.nombre && (
                <p className="text-sm text-red-600">{errors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input
                id="apellidos"
                type="text"
                placeholder="García López"
                value={formData.apellidos}
                onChange={handleInputChange('apellidos')}
                className={errors.apellidos ? 'border-red-500' : ''}
                disabled={isLoading}
                required
              />
              {errors.apellidos && (
                <p className="text-sm text-red-600">{errors.apellidos}</p>
              )}
            </div>
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select
              value={formData.role}
              onValueChange={handleSelectChange('role')}
              disabled={isLoading}
            >
              <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role}</p>
            )}
            <p className="text-xs text-muted-foreground">
              <strong>Vendedor:</strong> Solo crear/editar presupuestos.{' '}
              <strong>Admin:</strong> Gestión completa empresa.
            </p>
          </div>

          {/* Status (solo en edición) */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={handleSelectChange('status')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Los usuarios inactivos no pueden acceder al sistema
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/users')}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creando...' : 'Guardando...'}
              </>
            ) : (
              mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
