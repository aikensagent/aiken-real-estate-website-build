import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const STREETS_STYLE = 'mapbox://styles/mapbox/streets-v12'
const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'
const LISTING_PIN_ZOOM = 17

type ListingPinMapProps = {
  lng: number
  lat: number
  address: string
}

export function ListingPinMap({ lng, lat, address }: ListingPinMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [satellite, setSatellite] = useState(false)
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

  useEffect(() => {
    const node = containerRef.current
    if (!node || !token) return
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: node,
      style: satellite ? SATELLITE_STYLE : STREETS_STYLE,
      center: [lng, lat],
      zoom: LISTING_PIN_ZOOM,
      attributionControl: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    const pin = document.createElement('div')
    pin.className =
      'h-3.5 w-3.5 rounded-full border-2 border-brand-cream bg-brand-gold shadow'
    pin.setAttribute('role', 'img')
    pin.setAttribute('aria-label', `Listing pin for ${address}`)

    const marker = new mapboxgl.Marker({ element: pin })
      .setLngLat([lng, lat])
      .addTo(map)

    return () => {
      marker.remove()
      map.remove()
    }
  }, [address, lat, lng, satellite, token])

  if (!token) {
    return (
      <p className="text-sm text-brand-slate" role="status">
        Map is unavailable right now.
      </p>
    )
  }

  return (
    <section
      className="space-y-3"
      aria-labelledby="listing-pin-map-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="listing-pin-map-heading"
            className="text-lg font-semibold text-brand-navy"
          >
            Location
          </h2>
          <p className="mt-1 text-sm text-brand-slate">
            One pin on this listing. Satellite is an aerial look at the lot and
            nearby properties.
          </p>
        </div>
        <div
          className="flex rounded-md border border-brand-navy/15 bg-white p-1"
          role="radiogroup"
          aria-label="Map style"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!satellite}
            onClick={() => setSatellite(false)}
            className={`rounded px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              !satellite
                ? 'bg-brand-navy text-brand-cream'
                : 'text-brand-navy'
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={satellite}
            onClick={() => setSatellite(true)}
            className={`rounded px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
              satellite
                ? 'bg-brand-navy text-brand-cream'
                : 'text-brand-navy'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-lg border border-brand-navy/10"
        role="region"
        aria-label={`Map of ${address}`}
      />
    </section>
  )
}
