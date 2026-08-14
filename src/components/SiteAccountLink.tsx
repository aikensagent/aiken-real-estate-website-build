import { Link } from '@tanstack/react-router'
import { useBuyerSignedIn } from '../lib/auth-browser'

const accountChipClass =
  'inline-flex items-center rounded-md bg-brand-gold px-3 py-1.5 text-sm font-semibold text-brand-navy no-underline shadow-sm transition hover:bg-brand-gold/90 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy'

export function SiteAccountLink() {
  const signedIn = useBuyerSignedIn()

  if (signedIn) {
    return (
      <Link to="/account" aria-label="Open your dashboard" className={accountChipClass}>
        Dashboard
      </Link>
    )
  }

  return (
    <Link
      to="/login"
      search={{ next: '/account' }}
      aria-label="Sign in"
      className={accountChipClass}
    >
      Sign in
    </Link>
  )
}
