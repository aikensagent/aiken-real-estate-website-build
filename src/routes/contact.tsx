import { Link, createFileRoute } from '@tanstack/react-router'
import { LeadCaptureForm } from '../components/LeadCaptureForm'
import { SiteAccountLink } from '../components/SiteAccountLink'
import {
  SiteFooter,
  SITE_AGENT,
  SITE_FIRM,
  SITE_HOME_DESCRIPTION,
  SITE_PHONE,
} from '../components/SiteFooter'

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [
      { title: `Contact ${SITE_AGENT} | ${SITE_FIRM}` },
      { name: 'description', content: SITE_HOME_DESCRIPTION },
    ],
  }),
  component: ContactPage,
})

function ContactPage() {
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
        aria-labelledby="contact-heading"
      >
        <h1
          id="contact-heading"
          className="text-3xl font-semibold tracking-tight text-brand-navy"
        >
          Contact {SITE_AGENT}
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-brand-gold">
          {SITE_FIRM}
        </p>
        <p className="mt-4 text-brand-slate">
          Call{' '}
          <a
            href={`tel:${SITE_PHONE}`}
            className="font-semibold text-brand-navy underline decoration-brand-gold underline-offset-2"
          >
            {SITE_PHONE}
          </a>
          . Hours for a live call are 9 AM – 9 PM Eastern. Or send a note
          below — Nick will follow up.
        </p>
        <div className="mt-8">
          <LeadCaptureForm
            source="contact_page"
            heading="Send a note"
            description="Showings, selling, or a question about a home. Nick reads these."
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
