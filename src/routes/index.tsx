import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { ChatWidget } from '../components/ChatWidget'
import { RouCardIntroDialog } from '../components/RouCardIntroDialog'
import { Hero } from '@/components/Hero'
import { SiteAccountLink } from '../components/SiteAccountLink'
import Map from '../components/Map'
import { supabase } from '../lib/supabase'
import {
  filterListings,
  filterListingsInBounds,
  isListingSort,
  LISTING_SORT_OPTIONS,
  sortListings,
  type ListingSort,
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
import {
  AIKEN_AREA_CHIPS,
  boundsFromAreaFocus,
  resolveAikenArea,
  zoomForAreaFocus,
  type AikenAreaFocus,
} from '../lib/rou/aiken-areas'
import {
  boundsAroundPoint,
  cityFromCoordinates,
  classifyOnSiteMatch,
  isOnSiteInCoverage,
  readDeviceLocation,
  type LatLng,
} from '../lib/rou/on-site-home'
import { trackEvent } from '../lib/leadTracking'
import { isListingId } from '../lib/listing-facts'
import { readAccessToken, useBuyerSignedIn } from '../lib/auth-browser'
import {
  buildSavedSearchPayload,
  filtersFromPayload,
  labelSavedSearch,
} from '../lib/saved-search'
import { listBuyerSearches, saveBuyerSearch } from './api/-saved-searches'

type HomeSearch = {
  listingId?: string
  saved?: string
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    listingId:
      typeof search.listingId === 'string' && isListingId(search.listingId)
        ? search.listingId
        : undefined,
    saved:
      typeof search.saved === 'string' && isListingId(search.saved)
        ? search.saved
        : undefined,
  }),
  component: Home,
})

function Home() {
  const { listingId: returnListingId, saved: savedSearchId } = Route.useSearch()
  const signedIn = useBuyerSignedIn()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const [showResults, setShowResults] = useState(
    () => Boolean(returnListingId) || Boolean(savedSearchId)
  )
  const [saveNote, setSaveNote] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [isDesktop, setIsDesktop] = useState(false)
  /** Listing Rou is answering about (activated). */
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [showRouIntro, setShowRouIntro] = useState(false)
  const [routeOverlay, setRouteOverlay] = useState<AmenityRouteOverlay | null>(
    null
  )
  const [mapBounds, setMapBounds] = useState<MapViewportBounds | null>(null)
  const [listingSort, setListingSort] = useState<ListingSort>('featured')
  const [areaQuery, setAreaQuery] = useState('')
  const [activeArea, setActiveArea] = useState<AikenAreaFocus | null>(null)
  const [areaError, setAreaError] = useState<string | null>(null)
  const [cameraFocus, setCameraFocus] = useState<{
    lng: number
    lat: number
    zoom: number
  } | null>(null)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [onSiteNearby, setOnSiteNearby] = useState<Listing[] | null>(null)
  const [onSiteNote, setOnSiteNote] = useState<string | null>(null)
  const [onSiteBusy, setOnSiteBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const mobileViewRef = useRef(mobileView)
  const isDesktopRef = useRef(isDesktop)
  const skipHiddenBoundsRef = useRef(false)
  const appliedReturnRef = useRef<string | null>(null)
  const appliedSavedRef = useRef<string | null>(null)
  mobileViewRef.current = mobileView
  isDesktopRef.current = isDesktop

  function handleHeroSearch(newFilters: SearchFilters) {
    setFilters(newFilters)
    setShowResults(true)
    setSelectedListing(null)
    setRouteOverlay(null)
    setMapBounds(null)
    setListingSort('featured')
    setAreaQuery('')
    setActiveArea(null)
    setAreaError(null)
    setCameraFocus(null)
    setUserLocation(null)
    setOnSiteNearby(null)
    setOnSiteNote(null)
    skipHiddenBoundsRef.current = false
    setMobileView('list')
    appliedReturnRef.current = null
    if (returnListingId || savedSearchId) {
      void navigate({ to: '/', search: {}, replace: true })
    }
  }

  function handleBackToHero() {
    setShowResults(false)
    appliedReturnRef.current = null
    appliedSavedRef.current = null
    if (returnListingId || savedSearchId) {
      void navigate({ to: '/', search: {}, replace: true })
    }
  }

  async function handleSaveSearch() {
    if (saveBusy) return
    if (!signedIn) {
      void navigate({ to: '/login', search: { next: '/account' } })
      return
    }
    const token = await readAccessToken()
    if (!token) {
      void navigate({ to: '/login', search: { next: '/account' } })
      return
    }
    const payload = buildSavedSearchPayload(filters, activeArea)
    const label = labelSavedSearch(payload)
    setSaveBusy(true)
    setSaveNote(null)
    const result = await saveBuyerSearch({
      data: { accessToken: token, label, payload },
    })
    setSaveBusy(false)
    setSaveNote(result.ok ? 'Search saved.' : 'Could not save that search.')
  }

  function applyAreaFocus(focus: AikenAreaFocus) {
    skipHiddenBoundsRef.current = true
    setActiveArea(focus)
    setAreaQuery(focus.label)
    setAreaError(null)
    setMapBounds(boundsFromAreaFocus(focus))
    setCameraFocus({
      lng: focus.lng,
      lat: focus.lat,
      zoom: zoomForAreaFocus(focus),
    })
  }

  function clearAreaFocus() {
    skipHiddenBoundsRef.current = false
    setActiveArea(null)
    setAreaQuery('')
    setAreaError(null)
    setCameraFocus(null)
    setMapBounds(null)
  }

  function clearOnSite() {
    setUserLocation(null)
    setOnSiteNearby(null)
    setOnSiteNote(null)
    if (!activeArea) {
      skipHiddenBoundsRef.current = false
      setCameraFocus(null)
      setMapBounds(null)
    }
  }

  function applyOnSitePoint(point: LatLng) {
    skipHiddenBoundsRef.current = true
    setUserLocation(point)
    setMapBounds(boundsAroundPoint(point))
    setCameraFocus({ lng: point.lng, lat: point.lat, zoom: 16 })
    const match = classifyOnSiteMatch(listings, point)
    if (match.kind === 'unique') {
      setOnSiteNearby(match.nearby)
      setOnSiteNote(`This looks like ${match.listing.address || 'this home'}.`)
      handleActivateRou(match.listing)
      window.setTimeout(() => {
        document
          .getElementById(`listing-card-${match.listing.id}`)
          ?.scrollIntoView({ block: 'start' })
      }, 50)
      void trackEvent('listing_view', {
        eventData: {
          kind: 'im_at_a_home',
          inBbox: true,
          listingId: match.listing.id,
        },
      })
      return
    }
    if (match.kind === 'several' || match.kind === 'area') {
      setOnSiteNearby(match.nearby)
      setOnSiteNote(
        match.kind === 'several'
          ? 'A few homes are right here. Pick the one you’re at.'
          : 'No listing pin is on this spot. Homes in this area:'
      )
      void trackEvent('map_interaction', {
        eventData: { kind: 'im_at_a_home', inBbox: true, match: match.kind },
      })
      return
    }
    setOnSiteNearby(null)
    setOnSiteNote('No active listing right at this spot. Pick an area or pan the map.')
    void trackEvent('map_interaction', {
      eventData: { kind: 'im_at_a_home', inBbox: true, match: 'none' },
    })
  }

  async function handleImAtAHome() {
    if (onSiteBusy) return
    setOnSiteBusy(true)
    setOnSiteNote(null)
    try {
      const located = await readDeviceLocation()
      if (!located.ok) {
        setOnSiteNote(
          located.reason === 'denied'
            ? 'Location is blocked. You can still pick an area below.'
            : 'Couldn’t read your location. You can still pick an area below.'
        )
        return
      }
      if (!isOnSiteInCoverage(located.point)) {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
        const city = await cityFromCoordinates({
          point: located.point,
          accessToken: token ?? '',
        })
        setUserLocation(null)
        setOnSiteNearby(null)
        setOnSiteNote(
          city
            ? `Looks like you’re browsing from ${city}. This map is Aiken — pick an area below.`
            : 'You’re outside the Aiken area. Pick an area below to browse homes here.'
        )
        void trackEvent('map_interaction', {
          eventData: {
            kind: 'im_at_a_home',
            inBbox: false,
            city: city ?? null,
          },
        })
        return
      }
      applyOnSitePoint(located.point)
    } finally {
      setOnSiteBusy(false)
    }
  }

  function handleViewportBounds(bounds: MapViewportBounds) {
    if (
      skipHiddenBoundsRef.current &&
      !isDesktopRef.current &&
      mobileViewRef.current !== 'map'
    ) {
      return
    }
    skipHiddenBoundsRef.current = false
    setMapBounds(bounds)
  }

  async function handleAreaSubmit(event: FormEvent) {
    event.preventDefault()
    const query = areaQuery.trim()
    if (query.length < 2) return
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
    const hit = await resolveAikenArea({
      query,
      accessToken: token ?? '',
    })
    if (!hit) {
      setAreaError('Couldn’t find that in the Aiken area.')
      return
    }
    applyAreaFocus(hit)
  }

  function handleDismissRouIntro() {
    markRouCardIntroSeen()
    setShowRouIntro(false)
  }

  function handleActivateRou(listing: Listing) {
    setSelectedListing(listing)
    if (!hasSeenRouCardIntro()) {
      setShowRouIntro(true)
    }
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

  // Public Rou uses selected listing as distance origin + fact card
  const rouOrigin = selectedListing
    ? {
        lng: selectedListing.lng,
        lat: selectedListing.lat,
        label: selectedListing.address || 'the selected listing',
        listingId: selectedListing.id,
        price: selectedListing.price,
        beds: selectedListing.beds,
        baths: selectedListing.baths,
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

  useEffect(() => {
    if (!returnListingId || listings.length === 0) return
    if (appliedReturnRef.current === returnListingId) return
    const listing = listings.find((row) => row.id === returnListingId)
    if (!listing) return
    appliedReturnRef.current = returnListingId
    handleActivateRou(listing)
    if (
      listing.lng == null ||
      listing.lat == null ||
      !Number.isFinite(listing.lng) ||
      !Number.isFinite(listing.lat)
    ) {
      return
    }
    skipHiddenBoundsRef.current = true
    const point = { lng: listing.lng, lat: listing.lat }
    setMapBounds(boundsAroundPoint(point))
    setCameraFocus({ lng: point.lng, lat: point.lat, zoom: 16 })
    window.setTimeout(() => {
      document
        .getElementById(`listing-card-${listing.id}`)
        ?.scrollIntoView({ block: 'start' })
    }, 120)
  }, [returnListingId, listings])

  useEffect(() => {
    if (!savedSearchId || appliedSavedRef.current === savedSearchId) return
    let cancelled = false
    void (async () => {
      const token = await readAccessToken()
      if (!token) {
        void navigate({ to: '/login', search: { next: '/account' } })
        return
      }
      const rows = await listBuyerSearches({ data: { accessToken: token } })
      if (cancelled) return
      const found = rows.find((row) => row.id === savedSearchId)
      if (!found) return
      appliedSavedRef.current = savedSearchId
      setFilters(filtersFromPayload(found.payload))
      setShowResults(true)
      setSelectedListing(null)
      setRouteOverlay(null)
      setListingSort('featured')
      setUserLocation(null)
      setOnSiteNearby(null)
      setOnSiteNote(null)
      setMobileView('list')
      if (found.payload.area) {
        applyAreaFocus(found.payload.area)
      } else {
        skipHiddenBoundsRef.current = false
        setActiveArea(null)
        setAreaQuery('')
        setCameraFocus(null)
        setMapBounds(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, savedSearchId])

  const visibleListings = sortListings(
    onSiteNearby ?? filterListingsInBounds(listings, mapBounds),
    listingSort
  )
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
              type="button"
              onClick={handleBackToHero}
              className="text-sm font-medium hover:underline"
            >
              ← Back to search
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-90">
                {loading
                  ? 'Loading…'
                  : `${visibleListings.length} homes${
                      mapBounds && visibleListings.length !== listings.length
                        ? ' in view'
                        : ''
                    }`}
              </span>
              {saveNote && (
                <span className="text-sm text-brand-gold" role="status">
                  {saveNote}
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleSaveSearch()}
                disabled={saveBusy}
                className="text-sm font-semibold text-white underline decoration-brand-gold underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60"
              >
                {signedIn ? 'Save this search' : 'Sign in to save'}
              </button>
              <SiteAccountLink />
            </div>
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
              {!loading && (
                <div className="sticky top-0 z-10 space-y-2 border-b border-brand-navy/10 bg-white px-3 py-2">
                  {listings.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="listing-sort"
                        className="text-sm font-medium text-brand-navy"
                      >
                        Sort by
                      </label>
                      <select
                        id="listing-sort"
                        value={listingSort}
                        onChange={(event) => {
                          const next = event.target.value
                          if (isListingSort(next)) setListingSort(next)
                        }}
                        aria-label="Sort homes in view"
                        className="rounded-md border border-brand-navy/20 bg-brand-cream px-2.5 py-1.5 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                      >
                        {LISTING_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="md:hidden space-y-2">
                    <button
                      type="button"
                      onClick={() => void handleImAtAHome()}
                      disabled={onSiteBusy}
                      className="w-full rounded-md border border-brand-gold bg-brand-navy px-3 py-2 text-sm font-semibold text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60"
                    >
                      {onSiteBusy ? 'Finding this home…' : "I'm at a home"}
                    </button>
                    {onSiteNote && (
                      <div className="flex items-start justify-between gap-2 text-xs text-brand-slate">
                        <p role="status">{onSiteNote}</p>
                        <button
                          type="button"
                          onClick={clearOnSite}
                          className="shrink-0 font-medium text-brand-navy underline decoration-brand-gold underline-offset-2"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    <form
                      onSubmit={handleAreaSubmit}
                      className="flex items-end gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor="listing-area"
                          className="text-sm font-medium text-brand-navy"
                        >
                          Where in Aiken
                        </label>
                        <input
                          id="listing-area"
                          type="search"
                          value={areaQuery}
                          onChange={(event) => {
                            setAreaQuery(event.target.value)
                            setAreaError(null)
                          }}
                          placeholder="Downtown, Hitchcock, a street…"
                          autoComplete="off"
                          aria-describedby={
                            areaError
                              ? 'listing-area-error'
                              : activeArea
                                ? 'listing-area-status'
                                : undefined
                          }
                          className="mt-1 w-full rounded-md border border-brand-navy/20 bg-brand-cream px-2.5 py-1.5 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-md bg-brand-navy px-3 py-1.5 text-sm font-semibold text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                      >
                        Go
                      </button>
                    </form>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Aiken areas">
                      {AIKEN_AREA_CHIPS.map((chip) => {
                        const pressed = activeArea?.id === chip.id
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            aria-pressed={pressed}
                            onClick={() => applyAreaFocus(chip)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                              pressed
                                ? 'bg-brand-navy text-brand-cream'
                                : 'border border-brand-navy/20 bg-brand-cream text-brand-navy'
                            }`}
                          >
                            {chip.label}
                          </button>
                        )
                      })}
                    </div>
                    {activeArea && (
                      <div
                        id="listing-area-status"
                        className="flex items-center justify-between gap-2 text-xs text-brand-slate"
                      >
                        <p>Showing {activeArea.label}</p>
                        <button
                          type="button"
                          onClick={clearAreaFocus}
                          className="font-medium text-brand-navy underline decoration-brand-gold underline-offset-2"
                        >
                          Clear area
                        </button>
                      </div>
                    )}
                    {areaError && (
                      <p
                        id="listing-area-error"
                        role="alert"
                        className="text-xs text-brand-navy"
                      >
                        {areaError}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {loading ? (
                <div className="p-6 text-slate-500">Loading homes…</div>
              ) : visibleListings.length === 0 ? (
                <div className="p-6 text-slate-500">
                  {listings.length === 0
                    ? 'No homes found'
                    : 'No homes in this map view'}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 p-3">
                  {visibleListings.map((listing) => {
                    const isRouActive = selectedListing?.id === listing.id
                    const listingLabel = listing.address || 'this Aiken listing'

                    return (
                      <div
                        id={`listing-card-${listing.id}`}
                        key={listing.id}
                        className={`group overflow-hidden rounded-lg bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                          isRouActive
                            ? 'ring-2 ring-brand-gold'
                            : 'ring-1 ring-slate-200/80'
                        }`}
                      >
                        <Link
                          to="/listing/$listingId"
                          params={{ listingId: listing.id }}
                          className="block w-full text-left"
                          aria-label={`Open listing ${listingLabel}`}
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
                        </Link>
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
                  cameraFocus={cameraFocus}
                  userLocation={userLocation}
                  onViewportBounds={handleViewportBounds}
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
