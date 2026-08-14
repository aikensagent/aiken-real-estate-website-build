import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { completeMagicLink } from '../lib/auth-browser'
import { resolveBuyerAccount } from '../lib/account-session'
import {
  authNextTarget,
  clearAuthNext,
  parseAuthNext,
  resolveCallbackNext,
  serializeAuthNext,
} from '../lib/auth-next'

type CallbackSearch = {
  next?: string
}

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => {
    if (typeof search.next !== 'string' || !search.next.trim()) return {}
    return { next: serializeAuthNext(parseAuthNext(search.next)) }
  },
  head: () => ({
    meta: [{ title: 'Signing in | Nick Williams' }],
  }),
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const navigate = useNavigate()
  const { next } = Route.useSearch()
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
      const dest = resolveCallbackNext(next)
      await navigate(authNextTarget(serializeAuthNext(dest)))
      if (!cancelled) clearAuthNext()
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, next])

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
        <>
          <p className="mt-3 max-w-md text-center text-sm text-brand-slate">
            Try the link again, or request a new one from the sign-in page.
          </p>
          <Link
            to="/login"
            aria-label="Request a new sign-in link"
            className="mt-4 text-sm font-semibold text-brand-navy underline decoration-brand-gold underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Request a new link
          </Link>
        </>
      )}
    </main>
  )
}
