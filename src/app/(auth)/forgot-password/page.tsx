'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft, FileText } from 'lucide-react'
import { forgotPasswordSchema } from '@/lib/validators/auth-schemas'

interface ForgotPasswordFormData {
  email: string
}

interface ForgotPasswordErrors {
  email?: string
  general?: string
}

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  })
  const [errors, setErrors] = useState<ForgotPasswordErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const validateForm = (): boolean => {
    try {
      forgotPasswordSchema.parse(formData)
      setErrors({})
      return true
    } catch (error: any) {
      const newErrors: ForgotPasswordErrors = {}

      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path[0]
          newErrors[field as keyof ForgotPasswordErrors] = err.message
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
      const result = await requestPasswordReset(formData.email)

      if (!result.success) {
        setErrors({
          general: result.error || 'Error desconocido al solicitar recuperación'
        })
        return
      }

      // Mostrar mensaje de éxito (incluso si el email no existe, por seguridad)
      setEmailSent(true)

    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Error inesperado al solicitar recuperación'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ email: e.target.value })

    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
  }

  // Si el email ya fue enviado, mostrar mensaje de confirmación
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#f7fee7' }}>
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <div className="mx-auto h-12 w-12 bg-lime-500 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Redpresu
              </h2>
            </Link>
          </div>

          <Card className="w-full">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <Mail className="h-16 w-16 text-lime-500" />
              </div>
              <CardTitle className="text-2xl text-center">
                Revisa tu Email
              </CardTitle>
              <CardDescription className="text-center">
                Hemos enviado un enlace de recuperación
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="border-lime-500 bg-lime-50">
                <AlertDescription className="text-lime-800">
                  Si el email <strong>{formData.email}</strong> está registrado en el sistema,
                  recibirás un enlace para resetear tu contraseña.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Revisa tu bandeja de entrada</p>
                <p>• Verifica la carpeta de spam</p>
                <p>• El enlace expira en 1 hora</p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Login
                </Button>
              </Link>

              <Button
                variant="ghost"
                onClick={() => setEmailSent(false)}
                className="w-full text-sm"
              >
                ¿No recibiste el email? Intentar de nuevo
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#f7fee7' }}>
      <div className="w-full max-w-md space-y-8">
        {/* Header con logo/título */}
        <div className="text-center">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <div className="mx-auto h-12 w-12 bg-lime-500 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Redpresu
            </h2>
          </Link>
          <p className="mt-2 text-sm text-gray-600">
            Recupera el acceso a tu cuenta
          </p>
        </div>

        {/* Formulario */}
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Recuperar Contraseña
            </CardTitle>
            <CardDescription className="text-center">
              Ingresa tu email para recibir un enlace de recuperación
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

              {/* Campo Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'border-red-500' : ''}
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Botón de envío */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando enlace...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Enlace de Recuperación
                  </>
                )}
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-6">
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Login
                </Button>
              </Link>
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="text-lime-600 hover:text-lime-700 hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
