import { Suspense } from 'react'
import AcceptInvitationForm from '@/components/auth/AcceptInvitationForm'

export const metadata = {
  title: 'Aceptar Invitación',
  description: 'Acepta tu invitación y configura tu contraseña',
}

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-50 to-cyan-50 p-4">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      }>
        <AcceptInvitationForm />
      </Suspense>
    </div>
  )
}
