import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ChatWidget } from '../components/ChatWidget'
import { Hero } from '@/components/Hero'
import Map from '../components/Map'
import { supabase } from '../lib/supabase'
import { filterListings, type SearchFilters, type Listing } from '../lib/filterListings'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [isDesktop, setIsDesktop] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)

  function handleHeroSearch(newFilters: SearchFilters) {
    setFilters(newFilters)
    setShowResults(true)
    setSelectedListing(null)
    setMobileView('list') // always start on List when a new search runs
  }

  // Gives Rou a reference point for "how far is the nearest playground" questions
  const rouOrigin =
    selectedListing?.lng != null && selectedListing.lat != null
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!showResults ? (
        <Hero onSearch={handleHeroSearch} />
      ) : (
        <div className="flex h-dvh flex-col overflow-hidden">
          {/* Top bar */}
          <div className="bg-brand-navy text-white px-4 py-3 flex items-center justify-between shrink-0">
            <button
              onClick={() => setShowResults(false)}
              className="text-sm font-medium hover:underline"
            >
              ← Back to search
            </button>
            <span className="text-sm opacity-90">
              {loading ? 'Loading…' : `${listings.length} homes`}
            </span>
          </div>

          {/* Mobile List | Map toggle */}
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

          {/* Main results area */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Results list */}
            <div
              className={`w-full md:w-[420px] lg:w-[480px] min-h-0 overflow-y-auto border-r border-slate-200 bg-white ${
                mobileView === 'list' ? 'block' : 'hidden'
              } md:block`}
            >
              {loading ? (
                <div className="p-6 text-slate-500">Loading homes…</div>
              ) : listings.length === 0 ? (
                <div className="p-6 text-slate-500">No homes found</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
                  {listings.map((listing) => (
                    <div
                      key={listing.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedListing?.id === listing.id}
                      aria-label={`Select ${listing.address || 'this Aiken listing'} so Rou can answer questions about it`}
                      onClick={() => setSelectedListing(listing)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedListing(listing)
                        }
                      }}
                      className={`group cursor-pointer overflow-hidden rounded-lg bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        selectedListing?.id === listing.id
                          ? 'ring-2 ring-brand-gold'
                          : 'ring-1 ring-slate-200/80'
                      }`}
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Map */}
            <div
              className={`relative min-h-0 flex-1 ${
                mobileView === 'map' ? 'block' : 'hidden'
              } md:block`}
            >
              <div className="absolute inset-0 min-h-0">
                <Map
                  filters={filters || undefined}
                  visible={isDesktop || mobileView === 'map'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <ChatWidget origin={rouOrigin} />
    </div>
  )
}