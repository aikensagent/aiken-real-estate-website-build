import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { ChatWidget } from '../components/ChatWidget'
import { RouCardIntroDialog } from '../components/RouCardIntroDialog'
import { Hero } from '@/components/Hero'
import Map from '../components/Map'
import { supabase } from '../lib/supabase'
import {
  filterListings,
  filterListingsInBounds,
  type SearchFilters,
  type Listing,
  type MapViewportBounds,
} from '../lib/filterListings'
import {
  hasSeenRouCardIntro,
  markRouCardIntroSeen,
} from '../lib/rou/card-intro'
import {
  buildAmenityRouteOverlay,
  type AmenityRouteOverlay,
} from '../lib/rou/map-directions'
import {
  findNearestGroceryStores,
  findNearestPlaygrounds,
  findNearestSchools,
} from '../lib/playgrounds'
import { resolveNamedPlace } from '../lib/rou/named-place'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [isDesktop, setIsDesktop] = useState(false)
  /** Listing Rou is answering about (activated). */
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  /** Listing the visitor opened/focused without activating Rou. */
  const [focusedListingId, setFocusedListingId] = useState<string | null>(null)
  const [showRouIntro, setShowRouIntro] = useState(false)
  const [routeOverlay, setRouteOverlay] = useState<AmenityRouteOverlay | null>(
    null
  )
  const [mapBounds, setMapBounds] = useState<MapViewportBounds | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function handleHeroSearch(newFilters: SearchFilters) {
    setFilters(newFilters)
    setShowResults(true)
    setSelectedListing(null)
    setFocusedListingId(null)
    setRouteOverlay(null)
    setMapBounds(null)
    setMobileView('list')
  }

  function handleCardOpen(listing: Listing) {
    setFocusedListingId(listing.id)
    if (!hasSeenRouCardIntro()) {
      setShowRouIntro(true)
    }
  }

  function handleDismissRouIntro() {
    markRouCardIntroSeen()
    setShowRouIntro(false)
  }

  function handleActivateRou(listing: Listing) {
    setFocusedListingId(listing.id)
    setSelectedListing(listing)
  }

  function handleClearRou() {
    setSelectedListing(null)
    setRouteOverlay(null)
  }

  async function handleAmenityIntent(kind: 'playground' | 'school' | 'grocery') {
    const listing = selectedListing
    if (
      listing?.lng == null ||
      listing?.lat == null ||
      !Number.isFinite(listing.lng) ||
      !Number.isFinite(listing.lat)
    ) {
      return
    }

    const origin = { lng: listing.lng, lat: listing.lat }
    const nearest =
      kind === 'playground'
        ? findNearestPlaygrounds(origin, 1)[0]
        : kind === 'school'
          ? findNearestSchools(origin, 1)[0]
          : findNearestGroceryStores(origin, 1)[0]

    if (!nearest) return

    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
    if (!token) return

    const major = nearest.majorRoadsOnFoot
    const hazardNote =
      major.length > 0
        ? major.join(', ')
        : null

    const overlay = await buildAmenityRouteOverlay({
      from: origin,
      to: {
        lng: nearest.amenity.lng,
        lat: nearest.amenity.lat,
      },
      destinationLabel: nearest.amenity.name,
      accessToken: token,
      hazardNote,
    })

    if (!overlay) return
    setRouteOverlay(overlay)
    setMobileView('map')
  }

  async function handleNamedPlaceQuery(query: string) {
    const listing = selectedListing
    if (
      listing?.lng == null ||
      listing?.lat == null ||
      !Number.isFinite(listing.lng) ||
      !Number.isFinite(listing.lat)
    ) {
      return
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
    if (!token) return

    const origin = { lng: listing.lng, lat: listing.lat }
    const hit = await resolveNamedPlace({
      query,
      proximity: origin,
      accessToken: token,
    })
    if (!hit) return

    const overlay = await buildAmenityRouteOverlay({
      from: origin,
      to: { lng: hit.lng, lat: hit.lat },
      destinationLabel: hit.name,
      accessToken: token,
    })
    if (!overlay) return
    setRouteOverlay(overlay)
    setMobileView('map')
  }

  // Public Rou uses selected listing as distance origin
  const rouOrigin = selectedListing
    ? {
        lng: selectedListing.lng,
        lat: selectedListing.lat,
        label: selectedListing.address || 'the selected listing',
      }
    : null

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!showResults) return

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase.rpc('get_listings_with_coords', {
          p_property_type: 'Residential',
        })
        if (cancelled) return

        if (error || !data) {
          console.error(error)
          setListings([])
          return
        }

        const filtered = filterListings(data as Listing[], filters)
        setListings(filtered)
      } catch (err) {
        console.error(err)
        setListings([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [showResults, filters])

  const visibleListings = filterListingsInBounds(listings, mapBounds)
  const visibleListingKey = visibleListings.map((l) => l.id).join(',')

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [visibleListingKey])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!showResults ? (
        <Hero onSearch={handleHeroSearch} />
      ) : (
        <div className="flex h-dvh flex-col overflow-hidden">
          <div className="bg-brand-navy text-white px-4 py-3 flex items-center justify-between shrink-0">
            <button
              onClick={() => setShowResults(false)}
              className="text-sm font-medium hover:underline"
            >
              ← Back to search
            </button>
            <span className="text-sm opacity-90">
              {loading
                ? 'Loading…'
                : `${visibleListings.length} homes${
                    mapBounds && visibleListings.length !== listings.length
                      ? ' in view'
                      : ''
                  }`}
            </span>
          </div>

          {selectedListing && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-gold/40 bg-brand-gold/15 px-4 py-2">
              <span className="truncate text-sm text-brand-navy">
                Rou is helping with{' '}
                <span className="font-semibold">
                  {selectedListing.address || 'the selected home'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleClearRou}
                aria-label="Clear the home Rou is helping with"
                className="shrink-0 rounded-md border border-brand-navy/25 bg-white px-2.5 py-1 text-xs font-medium text-brand-navy transition hover:bg-brand-navy/5"
              >
                Clear
              </button>
            </div>
          )}

          <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 shrink-0">
            <div
              className="flex rounded-lg bg-slate-100 p-1"
              role="tablist"
              aria-label="View mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobileView === 'list'}
                aria-pressed={mobileView === 'list'}
                onClick={() => setMobileView('list')}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium transition ${
                  mobileView === 'list'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-brand-navy'
                }`}
              >
                List
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileView === 'map'}
                aria-pressed={mobileView === 'map'}
                onClick={() => setMobileView('map')}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium transition ${
                  mobileView === 'map'
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-brand-navy'
                }`}
              >
                Map
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div
              ref={listRef}
              className={`w-full md:w-[420px] lg:w-[480px] min-h-0 overflow-y-auto border-r border-slate-200 bg-white ${
                mobileView === 'list' ? 'block' : 'hidden'
              } md:block`}
            >
              {loading ? (
                <div className="p-6 text-slate-500">Loading homes…</div>
              ) : visibleListings.length === 0 ? (
                <div className="p-6 text-slate-500">
                  {listings.length === 0
                    ? 'No homes found'
                    : 'No homes in this map view'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
                  {visibleListings.map((listing) => {
                    const isRouActive = selectedListing?.id === listing.id
                    const isFocused = focusedListingId === listing.id
                    const listingLabel = listing.address || 'this Aiken listing'

                    return (
                      <div
                        key={listing.id}
                        className={`group overflow-hidden rounded-lg bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                          isRouActive
                            ? 'ring-2 ring-brand-gold'
                            : isFocused
                              ? 'ring-2 ring-brand-navy/40'
                              : 'ring-1 ring-slate-200/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleCardOpen(listing)}
                          className="w-full text-left"
                          aria-label={`Open listing ${listingLabel}`}
                          aria-pressed={isFocused || isRouActive}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                            {listing.primary_photo_url ? (
                              <img
                                src={listing.primary_photo_url}
                                alt={listing.address || 'Listing photo'}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                No photo
                              </div>
                            )}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-10">
                              <div className="text-lg font-semibold tracking-tight text-white">
                                ${Number(listing.price || 0).toLocaleString()}
                              </div>
                            </div>
                            {isRouActive && (
                              <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-brand-gold px-2 py-1 text-[11px] font-semibold text-brand-navy shadow">
                                Rou is on this home
                              </div>
                            )}
                          </div>
                          <div className="px-3 py-2.5">
                            <div className="truncate text-[15px] font-semibold leading-snug text-brand-navy">
                              {listing.address || 'Aiken Listing'}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                              <span>{listing.beds || 0} bed</span>
                              <span className="text-slate-300">·</span>
                              <span>{listing.baths || 0} bath</span>
                            </div>
                          </div>
                        </button>
                        {(isFocused || isRouActive) && (
                          <div className="flex items-center justify-end border-t border-brand-navy/10 px-3 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                isRouActive
                                  ? handleClearRou()
                                  : handleActivateRou(listing)
                              }
                              aria-pressed={isRouActive}
                              aria-label={
                                isRouActive
                                  ? `Stop asking Rou about ${listingLabel}`
                                  : `Ask Rou about ${listingLabel}`
                              }
                              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                                isRouActive
                                  ? 'bg-brand-navy text-white hover:bg-brand-navy/90'
                                  : 'border border-brand-navy/20 bg-white text-brand-navy hover:bg-brand-navy/5'
                              }`}
                            >
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  isRouActive
                                    ? 'bg-brand-gold'
                                    : 'bg-brand-gold/80'
                                }`}
                                aria-hidden
                              />
                              {isRouActive ? 'Rou active · clear' : 'Ask Rou'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div
              className={`relative min-h-0 flex-1 ${
                mobileView === 'map' ? 'block' : 'hidden'
              } md:block`}
            >
              <div className="absolute inset-0 min-h-0">
                <Map
                  filters={filters || undefined}
                  visible={isDesktop || mobileView === 'map'}
                  routeOverlay={routeOverlay}
                  onViewportBounds={setMapBounds}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <RouCardIntroDialog open={showRouIntro} onDismiss={handleDismissRouIntro} />
      <ChatWidget
        origin={rouOrigin}
        onAmenityIntent={handleAmenityIntent}
        onNamedPlaceQuery={handleNamedPlaceQuery}
      />
    </div>
  )
}
