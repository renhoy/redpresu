import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export async function getServerUser() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Usar getUser() en lugar de getSession() para mayor seguridad
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
    .single()

  if (dbError) {
    console.error('[getServerUser] Error fetching user data:', dbError)
    return null
  }

  if (!userData) {
    console.error('[getServerUser] No user data found for id:', user.id)
    return null
  }

  console.log('[getServerUser] User data loaded:', userData.email, userData.role)

  return {
    ...user,
    ...userData
  }
}