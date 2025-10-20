import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export async function getServerUser() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Primero intentar getSession() para ser consistente con middleware
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session?.user) {
    console.log('[getServerUser] No auth session:', sessionError?.message)
    return null
  }

  const user = session.user
  console.log('[getServerUser] Auth user found:', user.id, user.email)

  const { data: userData, error: dbError } = await supabase
    .from('redpresu_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (dbError) {
    console.error('[getServerUser] Error fetching user data:', {
      message: dbError.message,
      details: dbError.details,
      hint: dbError.hint,
      code: dbError.code,
      full: dbError
    })
    return null
  }

  if (!userData) {
    console.error('[getServerUser] No user data found for id:', user.id)
    return null
  }

  console.log('[getServerUser] User data loaded:', userData.email, userData.role)

  // Retornar solo datos de la tabla users + id y email del auth
  // Evitar spread de user.* para no sobreescribir campos con metadata de auth
  return {
    id: user.id,
    email: user.email,
    ...userData
  }
}