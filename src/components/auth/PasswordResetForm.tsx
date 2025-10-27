'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { resetPasswordSchema } from '@/lib/validators/auth-schemas'

interface ResetFormData {
  password: string
  confirmPassword: string
}

interface ResetFormErrors {
  password?: string
  confirmPassword?: string
  general?: string
}

export default function PasswordResetForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<ResetFormData>({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<ResetFormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateForm = (): boolean => {
    try {
      resetPasswordSchema.parse(formData)
      setErrors({})
      return true
    } catch (error: any) {
      const newErrors: ResetFormErrors = {}

      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path[0]
          newErrors[field as keyof ResetFormErrors] = err.message
        })
      }

      setErrors(newErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Limpiar errores anteriores
    setErrors({})

    // Validar formulario
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const result = await resetPassword(formData.password)

      if (!result.success) {
        setErrors({
          general: result.error || 'Error desconocido al resetear contraseña'
        })
        return
      }

      // Mostrar mensaje de éxito
      setSuccess(true)

      // Redirect a login después de 3 segundos
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Error inesperado al resetear contraseña'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ResetFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  // Si ya se actualizó exitosamente, mostrar mensaje de éxito
  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-center">
            ¡Contraseña Actualizada!
          </CardTitle>
          <CardDescription className="text-center">
            Tu contraseña ha sido cambiada exitosamente
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription className="text-green-800">
              Redirigiendo al login en 3 segundos...
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Ir al Login Ahora
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          Nueva Contraseña
        </CardTitle>
        <CardDescription className="text-center">
          Ingresa tu nueva contraseña
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Error general */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña</Label>
            <PasswordInput
              id="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleInputChange('password')}
              className={errors.password ? 'border-red-500' : ''}
              disabled={isLoading}
              autoComplete="new-password"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Debe contener mayúsculas, minúsculas y números
            </p>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-500' : ''}
              disabled={isLoading}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando contraseña...
              </>
            ) : (
              'Actualizar Contraseña'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
