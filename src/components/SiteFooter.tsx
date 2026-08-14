import { Link } from '@tanstack/react-router'

export const SITE_FIRM = 'Coldwell Banker Best Life Realty'
export const SITE_AGENT = 'Nick Williams'
export const SITE_PHONE = '803-292-2921'
export const SITE_HOME_TITLE = 'Find your place in Aiken | Nick Williams'
export const SITE_HOME_DESCRIPTION =
  'Search Aiken, South Carolina homes with Nick Williams at Coldwell Banker Best Life Realty. Equal Housing Opportunity.'

export function agentJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: SITE_AGENT,
    telephone: SITE_PHONE,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Aiken',
      addressRegion: 'SC',
      addressCountry: 'US',
    },
    worksFor: {
      '@type': 'RealEstateAgent',
      name: SITE_FIRM,
    },
  }
}

type SiteFooterProps = {
  compact?: boolean
}

export function SiteFooter({ compact = false }: SiteFooterProps) {
  return (
    <footer
      className={`border-t border-brand-navy/10 bg-brand-navy text-brand-cream ${
        compact ? 'px-3 py-3' : 'px-4 py-8'
      }`}
    >
      <div className={compact ? 'space-y-2' : 'mx-auto max-w-6xl space-y-4'}>
        <p className={compact ? 'text-xs' : 'text-sm'}>
          {SITE_AGENT} · {SITE_FIRM} · Aiken, South Carolina ·{' '}
          <a
            href={`tel:${SITE_PHONE}`}
            className="underline decoration-brand-gold underline-offset-2"
          >
            {SITE_PHONE}
          </a>
        </p>
        <p className={compact ? 'text-[11px] leading-snug text-brand-cream/80' : 'text-xs leading-relaxed text-brand-cream/80'}>
          Listing information is provided by MLS participants and is deemed
          reliable but not guaranteed. Each listing is courtesy of the listing
          brokerage named on that home. We do not default courtesy to this
          office. Equal Housing Opportunity.
        </p>
        <nav
          aria-label="Legal"
          className={`flex flex-wrap gap-x-4 gap-y-1 ${compact ? 'text-[11px]' : 'text-sm'}`}
        >
          <Link
            to="/about"
            className="underline decoration-brand-gold underline-offset-2"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="underline decoration-brand-gold underline-offset-2"
          >
            Contact
          </Link>
          <Link
            to="/privacy"
            className="underline decoration-brand-gold underline-offset-2"
          >
            Privacy
          </Link>
          <Link
            to="/fair-housing"
            className="underline decoration-brand-gold underline-offset-2"
          >
            Fair Housing
          </Link>
        </nav>
      </div>
    </footer>
  )
}
