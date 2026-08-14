import { Link, createFileRoute } from '@tanstack/react-router'
import { SiteFooter, SITE_AGENT, SITE_FIRM } from '../components/SiteFooter'
import { SiteAccountLink } from '../components/SiteAccountLink'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [{ title: `Privacy | ${SITE_AGENT}` }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-navy/10 bg-brand-navy">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            aria-label="Back to home search"
            className="text-sm font-semibold text-brand-cream transition hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            ← Back to search
          </Link>
          <SiteAccountLink />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-4 py-10"
        aria-labelledby="privacy-heading"
      >
        <h1
          id="privacy-heading"
          className="text-3xl font-semibold tracking-tight text-brand-navy"
        >
          Privacy
        </h1>
        <p className="mt-2 text-sm text-brand-slate">{SITE_FIRM}</p>
        <div className="mt-6 space-y-4 text-brand-slate">
          <p>
            We collect contact details you type into a showing or lead form,
            a tab-scoped search session, and — if you sign in — an email so
            we can keep saved homes and showing requests with your account.
          </p>
          <p>
            Chat with Rou is kept in this browser tab. We record that a chat
            happened for lead scoring. We do not store the transcript in that
            event log. We do not sell your information.
          </p>
          <p>
            Magic-link sign-in uses your email. You can ask Nick to close the
            account. Questions: use the contact form on the home page or call
            the number in the footer.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
