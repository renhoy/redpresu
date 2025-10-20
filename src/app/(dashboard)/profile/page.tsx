import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { getUserProfile } from '@/app/actions/auth'
import ProfileForm from '@/components/profile/ProfileForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default async function ProfilePage() {
  // Verificar autenticación
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener perfil completo del usuario
  const profileResult = await getUserProfile()

  if (!profileResult.success || !profileResult.data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {profileResult.error || 'Error al cargar el perfil'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-lime-50">
      <div className="container mx-auto px-4 py-6">
        {/* Formulario de perfil */}
        <ProfileForm profile={profileResult.data} />
      </div>
    </div>
  )
}
