import { Link, createFileRoute } from '@tanstack/react-router'
import { SiteFooter, SITE_AGENT, SITE_FIRM } from '../components/SiteFooter'
import { SiteAccountLink } from '../components/SiteAccountLink'

export const Route = createFileRoute('/fair-housing')({
  head: () => ({
    meta: [{ title: `Fair Housing | ${SITE_AGENT}` }],
  }),
  component: FairHousingPage,
})

function FairHousingPage() {
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
        aria-labelledby="fair-housing-heading"
      >
        <h1
          id="fair-housing-heading"
          className="text-3xl font-semibold tracking-tight text-brand-navy"
        >
          Fair Housing
        </h1>
        <p className="mt-2 text-sm text-brand-slate">{SITE_FIRM}</p>
        <div className="mt-6 space-y-4 text-brand-slate">
          <p>
            We follow the Fair Housing Act. We do not steer, score, or describe
            people, schools, or neighborhoods by race, color, national origin,
            religion, sex, familial status, disability, or any stand-in for
            those classes.
          </p>
          <p>
            Rou will refuse those questions and offer homes, commute, amenities,
            and process instead. Equal Housing Opportunity.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
