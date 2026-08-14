import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ChatWidget } from '../components/ChatWidget'
import { LeadCaptureForm } from '../components/LeadCaptureForm'
import { ListingPinMap } from '../components/ListingPinMap'
import { RouThumbs } from '../components/RouThumbs'
import { ListingCompareTray } from '../components/ListingCompareTray'
import { SiteAccountLink } from '../components/SiteAccountLink'
import { readAccessToken, useBuyerSignedIn } from '../lib/auth-browser'
import { requestBuyerShowing } from './api/-showing-requests'
import type { PriceSnapshot } from '../lib/price-history'
import { RouCardIntroDialog } from '../components/RouCardIntroDialog'
import { AIKEN_COUNTY_PROPERTY_SEARCH_URL, formatListingCourtesy, formatListingFactRows } from '../lib/listing-facts'
import {
  hydrateCompareIds,
  persistCompareIds,
  toggleCompareId,
  moveCompareId,
} from '../lib/listing-compare'
import {
  hasSeenRouCardIntro,
  markRouCardIntroSeen,
} from '../lib/rou/card-intro'
import { getListingDetail } from './api/-listing-detail'

type ListingPageData = Awaited<ReturnType<typeof getListingDetail>>
type ListingPageListing = NonNullable<ListingPageData>

const NICK_PHONE = '803-292-2921'

export const Route = createFileRoute('/listing/$listingId')({
  loader: async ({ params }) => {
    const detail = await getListingDetail({
      data: { listingId: params.listingId },
    })
    if (!detail) throw notFound()
    return detail
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.address
          ? `${loaderData.address} | Nick Williams`
          : 'Listing | Nick Williams',
      },
    ],
  }),
  component: ListingPage,
})

function ListingPage() {
  const listing = Route.useLoaderData()
  const signedIn = useBuyerSignedIn()
  const [showRouIntro, setShowRouIntro] = useState(false)
  const [showingNote, setShowingNote] = useState<string | null>(null)
  const [showingBusy, setShowingBusy] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])

  useEffect(() => {
    if (!hasSeenRouCardIntro()) setShowRouIntro(true)
  }, [])

  useEffect(() => {
    setCompareIds(hydrateCompareIds())
  }, [])

  const address = listing.address || 'Aiken listing'
  const courtesy = formatListingCourtesy(listing.facts.list_office_name)

  async function requestShowing() {
    if (showingBusy) return
    setShowingBusy(true)
    setShowingNote(null)
    const token = await readAccessToken()
    if (!token) {
      setShowingBusy(false)
      setShowingNote('Sign in to request a showing.')
      return
    }
    const result = await requestBuyerShowing({
      data: { accessToken: token, listingId: listing.id },
    })
    setShowingBusy(false)
    setShowingNote(
      result.ok
        ? result.already
          ? 'Nick already has this request.'
          : 'Nick will submit this showing request.'
        : 'Could not send that request.'
    )
  }

  function handleShowingIntent() {
    if (signedIn) {
      void requestShowing()
      return
    }
    document.getElementById('schedule-showing')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function handleToggleCompare() {
    const result = toggleCompareId(compareIds, listing.id)
    setCompareIds(persistCompareIds(result.ids))
  }

  const inCompare = compareIds.includes(listing.id)
  const rouOrigin = {
    lng: listing.lng,
    lat: listing.lat,
    label: address,
    listingId: listing.id,
    price: listing.price,
    beds: listing.beds,
    baths: listing.baths,
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-navy/10 bg-brand-navy">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            search={{ listingId: listing.id }}
            aria-label="Back to search"
            className="text-sm font-semibold text-brand-cream transition hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            ← Back to search
          </Link>
          <SiteAccountLink />
        </div>
      </header>

      <main
        className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]"
        aria-labelledby="listing-heading"
      >
        <div className="space-y-6">
          <ListingGallery photos={listing.photos} address={address} />

          <section>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
              {listing.facts.property_subtype || 'Residential'}
            </p>
            <h1
              id="listing-heading"
              className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy"
            >
              {address}
            </h1>
            <p className="mt-2 text-2xl font-semibold text-brand-navy">
              {formatPrice(listing.price)}
            </p>
            <PriceHistoryList rows={listing.priceHistory} />
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-brand-slate">
              {listing.beds != null && <li>{listing.beds} bed</li>}
              {listing.baths != null && <li>{listing.baths} bath</li>}
              {listing.facts.sqft != null && (
                <li>{listing.facts.sqft.toLocaleString()} sqft</li>
              )}
              {listing.facts.year_built != null && (
                <li>Built {listing.facts.year_built}</li>
              )}
              {listing.facts.lot_size_acres != null && (
                <li>{listing.facts.lot_size_acres} acres</li>
              )}
            </ul>
          </section>

          {listing.facts.remarks && (
            <section aria-labelledby="listing-remarks-heading">
              <h2
                id="listing-remarks-heading"
                className="text-lg font-semibold text-brand-navy"
              >
                About this home
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-brand-slate">
                {listing.facts.remarks}
              </p>
            </section>
          )}

          <SpecList listing={listing} />

          {courtesy && (
            <p className="text-sm text-brand-navy">{courtesy}</p>
          )}

          {listing.inAikenCounty && (
            <p className="text-sm text-brand-slate">
              County records:{' '}
              <a
                href={AIKEN_COUNTY_PROPERTY_SEARCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-navy underline decoration-brand-gold underline-offset-2"
              >
                Search this address on the Aiken County site
              </a>
              . Assessment data can differ from the MLS.
            </p>
          )}

          {listing.lng != null &&
            listing.lat != null &&
            Number.isFinite(listing.lng) &&
            Number.isFinite(listing.lat) && (
              <ListingPinMap
                lng={listing.lng}
                lat={listing.lat}
                address={address}
              />
            )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div id="schedule-showing">
            {signedIn ? (
              <div className="rounded-lg border border-brand-navy/10 bg-white p-5">
                <h2 className="text-lg font-semibold text-brand-navy">
                  Request a showing
                </h2>
                <p className="mt-1 text-sm text-brand-slate">
                  Nick already has your account. No extra consent on this page.
                </p>
                <button
                  type="button"
                  onClick={() => void requestShowing()}
                  disabled={showingBusy}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-brand-navy px-4 py-2.5 text-sm font-semibold text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60"
                >
                  {showingBusy ? 'Sending…' : 'Request a showing'}
                </button>
                {showingNote && (
                  <p className="mt-3 text-sm text-brand-navy" role="status">
                    {showingNote}
                  </p>
                )}
              </div>
            ) : (
              <LeadCaptureForm
                source={`listing:${listing.id}`}
                heading="Schedule a showing"
                description="Nick will submit the showing request."
                defaultMessage={`I'd like to schedule a showing at ${address}.`}
              />
            )}
          </div>

          <div className="rounded-lg border border-brand-navy/10 bg-white p-5">
            <h2 className="text-lg font-semibold text-brand-navy">
              Talk to Nick
            </h2>
            <p className="mt-1 text-sm text-brand-slate">
              Available 9 AM – 9 PM Eastern.
            </p>
            <a
              href={`tel:${NICK_PHONE}`}
              aria-label={`Call Nick Williams at ${NICK_PHONE}`}
              className="mt-4 flex w-full flex-col items-center rounded-md border border-brand-navy bg-white px-4 py-2.5 text-brand-navy transition hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <span className="text-sm font-semibold">Call Nick</span>
              <span className="text-xs text-brand-slate">{NICK_PHONE}</span>
            </a>
          </div>

          <button
            type="button"
            onClick={handleToggleCompare}
            aria-pressed={inCompare}
            aria-label={
              inCompare
                ? `Remove ${address} from compare`
                : `Add ${address} to compare`
            }
            className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              inCompare
                ? 'bg-brand-gold text-brand-navy'
                : 'border border-brand-navy/20 bg-white text-brand-navy'
            }`}
          >
            {inCompare ? 'In compare' : 'Add to compare'}
          </button>

          <RouThumbs listingId={listing.id} address={address} />
        </aside>
      </main>

      <RouCardIntroDialog
        open={showRouIntro}
        onDismiss={() => {
          markRouCardIntroSeen()
          setShowRouIntro(false)
        }}
      />
      <ListingCompareTray
        listingIds={compareIds}
        labels={{ [listing.id]: address }}
        onRemove={(id) =>
          setCompareIds(persistCompareIds(compareIds.filter((item) => item !== id)))
        }
        onMove={(from, to) =>
          setCompareIds(persistCompareIds(moveCompareId(compareIds, from, to)))
        }
        onClear={() => setCompareIds(persistCompareIds([]))}
      />
      <ChatWidget
        origin={rouOrigin}
        onShowingIntent={handleShowingIntent}
        showingHint={
          signedIn
            ? 'Nick will submit this showing request.'
            : 'The showing form is on this page. I’ll scroll you there.'
        }
      />
    </div>
  )
}

function ListingGallery({
  photos,
  address,
}: {
  photos: string[]
  address: string
}) {
  const [index, setIndex] = useState(0)
  const total = photos.length
  const current = photos[index]

  if (total === 0) {
    return (
      <div
        className="flex aspect-[4/3] items-center justify-center rounded-lg bg-brand-navy/10 text-sm text-brand-slate"
        role="img"
        aria-label={`No photo available for ${address}`}
      >
        No photo
      </div>
    )
  }

  function go(next: number) {
    setIndex((next + total) % total)
  }

  return (
    <figure className="space-y-3">
      <div className="relative overflow-hidden rounded-lg bg-brand-navy/10">
        <img
          src={current}
          alt={`${address}, photo ${index + 1} of ${total}`}
          className="aspect-[4/3] w-full object-cover"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-brand-navy/80 px-3 py-2 text-sm font-semibold text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-brand-navy/80 px-3 py-2 text-sm font-semibold text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Next
            </button>
          </>
        )}
      </div>
      <figcaption className="sr-only" aria-live="polite">
        Photo {index + 1} of {total}
      </figcaption>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto" role="list">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              role="listitem"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1} of ${total}`}
              aria-current={i === index}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ${
                i === index ? 'border-brand-gold' : 'border-transparent'
              }`}
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </figure>
  )
}

function SpecList({ listing }: { listing: ListingPageListing }) {
  const rows = formatListingFactRows(listing.facts, { mls_id: listing.mls_id })
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="listing-specs-heading">
      <h2
        id="listing-specs-heading"
        className="text-lg font-semibold text-brand-navy"
      >
        Facts
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-slate/70">
              {row.label}
            </dt>
            <dd className="mt-0.5 text-sm text-brand-navy">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function formatPrice(price: number | null): string {
  if (price == null) return 'Price on request'
  return `$${Number(price).toLocaleString()}`
}

function formatObservedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'recently'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function PriceHistoryList({ rows }: { rows: PriceSnapshot[] }) {
  if (rows.length === 0) return null
  return (
    <section className="mt-3" aria-labelledby="listing-price-history-heading">
      <h2
        id="listing-price-history-heading"
        className="text-sm font-semibold text-brand-navy"
      >
        Price we’ve seen
      </h2>
      <p className="mt-1 text-xs text-brand-slate">
        Recorded from our 15-minute MLS updates. This is not a full MLS history.
      </p>
      <ol className="mt-2 space-y-1 text-sm text-brand-slate">
        {rows.map((row) => (
          <li key={`${row.observed_at}-${row.list_price}`}>
            {formatPrice(row.list_price)} · {formatObservedDate(row.observed_at)}
          </li>
        ))}
      </ol>
    </section>
  )
}
