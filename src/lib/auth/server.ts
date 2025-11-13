import { createServerComponentClient } from '@/lib/supabase/helpers'

export async function getServerUser() {
  const supabase = await createServerComponentClient()

  // Usar getUser() para validación segura del token
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.log('[getServerUser] No auth user:', authError?.message)
    return null
  }

  console.log('[getServerUser] Auth user found:', user.id, user.email)

  const { data: userData, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (dbError) {
    console.error('[getServerUser] Error fetching user data:', {
      userId: user.id,
      userEmail: user.email,
      errorType: dbError.constructor.name,
      errorString: JSON.stringify(dbError),
      message: dbError.message,
      details: dbError.details,
      hint: dbError.hint,
      code: dbError.code
    })
    return null
  }

  if (!userData) {
    console.error('[getServerUser] No user data found in users for authenticated user:', {
      userId: user.id,
      userEmail: user.email,
      hint: 'Usuario existe en auth.users pero no en users - posible desincronización'
    })
    return null
  }

  console.log('[getServerUser] User data loaded:', userData.email, userData.role, 'status:', userData.status)

  // Verificar si el usuario está inactivo
  if (userData.status === 'inactive') {
    console.warn('[getServerUser] Usuario inactivo:', userData.email)
    return null
  }

  // Retornar solo datos de la tabla users + id y email del auth
  // Evitar spread de user.* para no sobreescribir campos con metadata de auth
  return {
    id: user.id,
    email: user.email,
    ...userData
  }
}