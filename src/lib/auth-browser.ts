import { useEffect, useState } from 'react'
import { isLikelyEmail } from './auth-email'
import { supabase } from './supabase'

export { isLikelyEmail }

export function useBuyerSignedIn() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let cancelled = false
    function apply(token: string | null) {
      if (!cancelled) setSignedIn(Boolean(token))
    }
    void readAccessToken().then(apply)
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token
      apply(typeof token === 'string' && token.split('.').length === 3 ? token : null)
    })
    function refresh() {
      void readAccessToken().then(apply)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return signedIn
}

export async function readAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return typeof token === 'string' && token.split('.').length === 3 ? token : null
}

export async function requestMagicLink(email: string, redirectTo: string) {
  if (!isLikelyEmail(email)) {
    return { ok: false as const, error: 'Enter a valid email.' }
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })
  if (error) {
    const detail = error.message.toLowerCase()
    if (detail.includes('rate') || detail.includes('security')) {
      return {
        ok: false as const,
        error:
          'A link was already sent. Check that inbox — wait a minute before asking again.',
      }
    }
    return { ok: false as const, error: 'Could not send the sign-in link.' }
  }
  return { ok: true as const }
}

export async function completeMagicLink(href: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(href)
  if (!error) return { ok: true as const }
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) return { ok: true as const }
  return { ok: false as const }
}

export async function signOutBuyer() {
  await supabase.auth.signOut()
}
