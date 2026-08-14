import { Link, createFileRoute } from '@tanstack/react-router'
import { SiteFooter, SITE_AGENT, SITE_FIRM, SITE_PHONE } from '../components/SiteFooter'
import { SiteAccountLink } from '../components/SiteAccountLink'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [{ title: `About ${SITE_AGENT} | ${SITE_FIRM}` }],
  }),
  component: AboutPage,
})

function AboutPage() {
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
        aria-labelledby="about-heading"
      >
        <h1
          id="about-heading"
          className="text-3xl font-semibold tracking-tight text-brand-navy"
        >
          {SITE_AGENT}
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-brand-gold">
          {SITE_FIRM}
        </p>
        <div className="mt-6 space-y-4 text-brand-slate">
          <p>
            I help people buy and sell homes in Aiken, South Carolina. This
            site is the public search and a guide named Rou. Showings, offers,
            and contracts go through me.
          </p>
          <p>
            Call{' '}
            <a
              href={`tel:${SITE_PHONE}`}
              className="font-semibold text-brand-navy underline decoration-brand-gold underline-offset-2"
            >
              {SITE_PHONE}
            </a>
            . Hours for a live call are 9 AM – 9 PM Eastern.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
