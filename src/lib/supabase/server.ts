// SECURITY: Este archivo solo puede importarse en server-side
import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Runtime validation adicional para prevenir uso en cliente
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin can only be used server-side')
}

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

// Cliente admin para operaciones server-side con service role
// SOLO para uso en API routes y server components
// NUNCA importar en componentes cliente o código que se ejecute en browser
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)