import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { resolveBuyerAccount, signOutAccount } from '../lib/account-session'
import { readAccessToken } from '../lib/auth-browser'
import { isListingId } from '../lib/listing-facts'
import type { SavedSearchRow } from '../lib/saved-search'
import {
  type GholiNotebook,
} from '../lib/rou/gholi-thumbs'
import { GHOLI_DISPLAY_NAME, GHOLI_TITLE } from '../lib/rou/gholi-persona'
import { getListingDetail } from './api/-listing-detail'
import { listGholiNotebook, restoreGholiListing } from './api/-gholi-thumbs'
import { deleteBuyerSearch, listBuyerSearches } from './api/-saved-searches'
import { listBuyerShowings } from './api/-showing-requests'
import { formatShowingRequestedAt } from '../lib/showing-requests'

type ListingCard = {
  id: string
  address: string | null
  price: number | null
}

type ShowingCard = ListingCard & {
  requestedAt: string
}

export const Route = createFileRoute('/account')({
  head: () => ({
    meta: [{ title: `Dashboard | ${GHOLI_DISPLAY_NAME}` }],
  }),
  component: GholiDashboardPage,
})

function GholiDashboardPage() {
  const navigate = useNavigate()
  const [sessionKey, setSessionKey] = useState('')
  const [email, setEmail] = useState('')
  const [ready, setReady] = useState(false)
  const [notebook, setNotebook] = useState<GholiNotebook>({
    ratedListingIds: [],
    trashedListingIds: [],
  })
  const [ratedCards, setRatedCards] = useState<ListingCard[]>([])
  const [trashCards, setTrashCards] = useState<ListingCard[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>([])
  const [showingCards, setShowingCards] = useState<ShowingCard[]>([])
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [notebookTick, setNotebookTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    void resolveBuyerAccount().then((account) => {
      if (cancelled) return
      if (!account.authenticated) {
        void navigate({ to: '/login', search: { next: '/account' } })
        return
      }
      setSessionKey(account.sessionKey)
      setEmail(account.email)
      setReady(true)
      void readAccessToken().then((token) => {
        if (!token || cancelled) return
        return Promise.all([
          listBuyerSearches({ data: { accessToken: token } }),
          listBuyerShowings({ data: { accessToken: token } }),
        ]).then(async ([rows, showings]) => {
          if (cancelled) return
          setSavedSearches(rows)
          const cards = await loadCards(showings.map((row) => row.listingId))
          if (cancelled) return
          const byId = new Map(cards.map((card) => [card.id, card]))
          setShowingCards(
            showings.map((row) => ({
              ...(byId.get(row.listingId) ?? {
                id: row.listingId,
                address: null,
                price: null,
              }),
              requestedAt: row.createdAt,
            }))
          )
        })
      })
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (!sessionKey) return
    let cancelled = false
    void listGholiNotebook({ data: { sessionKey } }).then(async (book) => {
      if (cancelled) return
      setNotebook(book)
      const [rated, trashed] = await Promise.all([
        loadCards(book.ratedListingIds),
        loadCards(book.trashedListingIds),
      ])
      if (cancelled) return
      setRatedCards(rated)
      setTrashCards(trashed)
    })
    return () => {
      cancelled = true
    }
  }, [sessionKey, notebookTick])

  async function handleRestore(listingId: string) {
    if (!sessionKey || restoringId) return
    setRestoringId(listingId)
    const result = await restoreGholiListing({
      data: { sessionKey, listingId },
    })
    setRestoringId(null)
    if (result.ok) setNotebookTick((n) => n + 1)
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-navy/10 bg-brand-navy">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <p className="text-sm font-semibold text-brand-cream">
            {GHOLI_DISPLAY_NAME} · Dashboard
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                void signOutAccount().then(() =>
                  navigate({ to: '/login', search: { next: '/account' } })
                )
              }}
              className="text-sm font-semibold text-brand-cream transition hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Sign out
            </button>
            <Link
              to="/"
              aria-label="Back to home search"
              className="text-sm font-semibold text-brand-cream transition hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Back to search
            </Link>
          </div>
        </div>
      </header>

      {!ready ? (
        <p className="mx-auto max-w-5xl px-4 py-8 text-sm text-brand-slate">
          Opening your dashboard…
        </p>
      ) : null}

      <main
        className={`mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] ${
          ready ? '' : 'hidden'
        }`}
        aria-labelledby="gholi-account-heading"
      >
        <div className="space-y-6">
          <section>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
              {GHOLI_TITLE}
            </p>
            <h1
              id="gholi-account-heading"
              className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy"
            >
              Your dashboard
            </h1>
            <p className="mt-2 text-brand-slate">
              Gholi keeps what you already told Rou — rated homes, showing
              requests, and a trash bin. The public map stays with Rou.
            </p>
            {email && (
              <p className="mt-2 text-sm text-brand-slate">Signed in as {email}</p>
            )}
          </section>

          <DashboardList
            heading="Rated homes"
            headingId="gholi-rated-heading"
            empty="No rated homes yet. Open a listing and answer Rou’s yes-or-no questions."
            cards={ratedCards}
          />
          <section
            className="rounded-lg border border-brand-navy/10 bg-white p-5"
            aria-labelledby="gholi-showings-heading"
          >
            <h2
              id="gholi-showings-heading"
              className="text-lg font-semibold text-brand-navy"
            >
              Showing requests
            </h2>
            {showingCards.length === 0 ? (
              <p className="mt-2 text-sm text-brand-slate">
                No showing requests yet. Ask from a listing — Nick will submit
                the request, and it will show up here.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {showingCards.map((card) => {
                  const when = formatShowingRequestedAt(card.requestedAt)
                  return (
                    <li key={card.id}>
                      <Link
                        to="/listing/$listingId"
                        params={{ listingId: card.id }}
                        className="block rounded-md border border-brand-navy/10 px-3 py-2 text-sm text-brand-navy hover:border-brand-gold"
                      >
                        <span className="font-semibold">
                          {card.address || 'Aiken listing'}
                        </span>
                        {card.price != null && (
                          <span className="mt-0.5 block text-brand-slate">
                            ${Number(card.price).toLocaleString()}
                          </span>
                        )}
                        {when && (
                          <span className="mt-0.5 block text-sm text-brand-slate">
                            Requested {when}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          <DashboardList
            heading="Trash"
            headingId="gholi-trash-heading"
            empty="Nothing in the trash. A No on “keep as a favorite” lands here."
            cards={trashCards}
            restoreBusyId={restoringId}
            onRestore={(id) => void handleRestore(id)}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section
            className="rounded-lg border border-brand-navy/10 bg-white p-5"
            aria-labelledby="gholi-saved-heading"
          >
            <h2
              id="gholi-saved-heading"
              className="text-lg font-semibold text-brand-navy"
            >
              Saved searches
            </h2>
            {savedSearches.length === 0 ? (
              <p className="mt-2 text-sm text-brand-slate">
                You haven’t saved a search yet. When you save one from the map,
                it will show up here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {savedSearches.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      to="/"
                      search={{ saved: row.id }}
                      className="text-sm font-semibold text-brand-navy underline decoration-brand-gold underline-offset-2"
                    >
                      {row.label}
                    </Link>
                    <button
                      type="button"
                      aria-label={`Remove saved search ${row.label}`}
                      onClick={() => {
                        void readAccessToken().then(async (token) => {
                          if (!token) return
                          const result = await deleteBuyerSearch({
                            data: { accessToken: token, id: row.id },
                          })
                          if (result.ok) {
                            setSavedSearches((prev) =>
                              prev.filter((item) => item.id !== row.id)
                            )
                          }
                        })
                      }}
                      className="text-xs font-semibold text-brand-slate underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-xs text-brand-slate">
            {notebook.ratedListingIds.length} rated ·{' '}
            {notebook.trashedListingIds.length} in trash
          </p>
        </aside>
      </main>
    </div>
  )
}

function DashboardList({
  heading,
  headingId,
  empty,
  cards,
  restoreBusyId,
  onRestore,
}: {
  heading: string
  headingId: string
  empty: string
  cards: ListingCard[]
  restoreBusyId?: string | null
  onRestore?: (listingId: string) => void
}) {
  return (
    <section
      className="rounded-lg border border-brand-navy/10 bg-white p-5"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="text-lg font-semibold text-brand-navy">
        {heading}
      </h2>
      {cards.length === 0 ? (
        <p className="mt-2 text-sm text-brand-slate">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {cards.map((card) => (
            <li key={card.id} className="flex items-stretch gap-2">
              <Link
                to="/listing/$listingId"
                params={{ listingId: card.id }}
                className="block min-w-0 flex-1 rounded-md border border-brand-navy/10 px-3 py-2 text-sm text-brand-navy hover:border-brand-gold"
              >
                <span className="font-semibold">
                  {card.address || 'Aiken listing'}
                </span>
                {card.price != null && (
                  <span className="mt-0.5 block text-brand-slate">
                    ${Number(card.price).toLocaleString()}
                  </span>
                )}
              </Link>
              {onRestore && (
                <button
                  type="button"
                  aria-label={`Restore ${card.address || 'this listing'} from trash`}
                  disabled={restoreBusyId === card.id}
                  onClick={() => onRestore(card.id)}
                  className="shrink-0 rounded-md border border-brand-navy/20 bg-brand-cream px-3 py-2 text-sm font-semibold text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60"
                >
                  {restoreBusyId === card.id ? 'Restoring…' : 'Restore'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

async function loadCards(ids: string[]): Promise<ListingCard[]> {
  const unique = ids.filter(isListingId).slice(0, 12)
  const rows = await Promise.all(
    unique.map(async (id) => {
      const detail = await getListingDetail({ data: { listingId: id } })
      if (!detail) return { id, address: null, price: null }
      return { id, address: detail.address, price: detail.price }
    })
  )
  return rows
}
