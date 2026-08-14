import { createClient } from '@supabase/supabase-js'

export function isAccessToken(value: string): boolean {
  return value.split('.').length === 3 && value.length > 40
}

export function buyerUserClient(accessToken: string) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anon =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Supabase env is missing')
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
