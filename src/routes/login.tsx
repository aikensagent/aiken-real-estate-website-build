import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { requestMagicLink, useBuyerSignedIn } from '../lib/auth-browser'
import { isLikelyEmail } from '../lib/auth-email'
import {
  authNextTarget,
  parseAuthNext,
  rememberAuthNext,
  serializeAuthNext,
} from '../lib/auth-next'

type LoginSearch = {
  next?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    if (typeof search.next !== 'string' || !search.next.trim()) return {}
    return { next: serializeAuthNext(parseAuthNext(search.next)) }
  },
  head: () => ({
    meta: [{ title: 'Sign in | Nick Williams' }],
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const signedIn = useBuyerSignedIn()
  const { next } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!signedIn) return
    void navigate(authNextTarget(next))
  }, [signedIn, navigate, next])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!consent) {
      setError('Please agree so Nick can keep this account with your search.')
      return
    }
    if (!isLikelyEmail(email)) {
      setError('Enter a valid email.')
      return
    }
    setBusy(true)
    setError(null)
    rememberAuthNext(next)
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback${
            next ? `?next=${encodeURIComponent(next)}` : ''
          }`
        : ''
    const result = await requestMagicLink(email, redirectTo)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-navy/10 bg-brand-navy">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm font-semibold text-brand-cream">Sign in</p>
          <Link
            to="/"
            aria-label="Back to search"
            className="text-sm font-semibold text-brand-cream transition hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Back to search
          </Link>
        </div>
      </header>

      <main
        className="mx-auto max-w-lg px-4 py-10"
        aria-labelledby="login-heading"
      >
        <h1
          id="login-heading"
          className="text-3xl font-semibold tracking-tight text-brand-navy"
        >
          Open your dashboard
        </h1>
        <p className="mt-2 text-brand-slate">
          We’ll email a sign-in link. No password. After you tap it, we bring
          you back to where you left off. Gholi keeps rated homes and trash
          with this account; Rou stays on the public map.
        </p>

        {sent ? (
          <p className="mt-6 rounded-lg border border-brand-navy/10 bg-white p-5 text-sm text-brand-navy" role="status">
            Check your email for the sign-in link. You can close this tab.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <label
                htmlFor="login-email"
                className="text-sm font-semibold text-brand-navy"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2 text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-brand-slate">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1"
              />
              <span>
                I agree that Nick Williams / Best Life Realty may use this
                email to keep my saved homes and follow up about Aiken listings.
              </span>
            </label>
            {error && (
              <p className="text-sm text-brand-navy" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
