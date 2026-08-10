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

  function handleHeroSearch(newFilters: SearchFilters) {
    setFilters(newFilters)
    setShowResults(true)
  }

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
        <div className="flex flex-col h-screen">
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

          {/* Main results area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Results list */}
            <div className="w-full md:w-[420px] lg:w-[480px] overflow-y-auto border-r border-slate-200 bg-white">
              {loading ? (
                <div className="p-6 text-slate-500">Loading homes…</div>
              ) : listings.length === 0 ? (
                <div className="p-6 text-slate-500">No homes found</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
                  {listings.map((listing) => (
                    <div
                      key={listing.id}
                      className="group cursor-pointer overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
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
            <div className="hidden md:block flex-1 relative">
              <Map filters={filters || undefined} />
            </div>
          </div>
        </div>
      )}

      <ChatWidget />
    </div>
  )
}