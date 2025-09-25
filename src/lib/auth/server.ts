import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export async function getServerUser() {
  const supabase = createServerComponentClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return null

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return {
    ...session.user,
    ...userData
  }
}