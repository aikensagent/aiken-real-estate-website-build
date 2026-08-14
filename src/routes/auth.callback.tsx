import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { completeMagicLink } from '../lib/auth-browser'
import { resolveBuyerAccount } from '../lib/account-session'

type CallbackSearch = {
  next?: string
}

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    next: search.next === '/account' ? '/account' : undefined,
  }),
  head: () => ({
    meta: [{ title: 'Signing in | Nick Williams' }],
  }),
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const href = typeof window !== 'undefined' ? window.location.href : ''
      const completed = await completeMagicLink(href)
      if (cancelled) return
      if (!completed.ok) {
        setError(true)
        return
      }
      const account = await resolveBuyerAccount()
      if (cancelled) return
      if (!account.authenticated) {
        setError(true)
        return
      }
      await navigate({ to: '/account' })
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-brand-cream px-6"
      aria-labelledby="auth-callback-heading"
    >
      <h1
        id="auth-callback-heading"
        className="text-2xl font-semibold text-brand-navy"
      >
        {error ? 'Sign-in didn’t finish' : 'Signing you in…'}
      </h1>
      {error && (
        <p className="mt-3 max-w-md text-center text-sm text-brand-slate">
          Try the link again, or request a new one from the sign-in page.
        </p>
      )}
    </main>
  )
}
