import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/leadTracking'
import { filterListings, type SearchFilters, type Listing } from '../lib/filterListings'
import { BOUNDARY_LEGEND } from '../data/boundaryStyles'
import { setupBoundaryLayers, setBoundaryLayersVisible } from '../lib/boundaryLayers'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const BRAND_NAVY = '#0F2B5B'
const SOURCE_ID = 'listings'
const CLUSTER_LAYER = 'clusters'
const CLUSTER_COUNT_LAYER = 'cluster-count'
const UNCLUSTERED_LAYER = 'unclustered-point'

// Aiken / North Augusta corridor — dense local market, not statewide
const AIKEN_CENTER: [number, number] = [-81.84, 33.53]
const AIKEN_ZOOM = 10.5

type MapProps = {
  filters?: SearchFilters
}

type ListingFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: {
      id: string
      address: string
      price: number
      beds: number
      baths: number
    }
  }>
}

function listingsToGeoJSON(listings: Listing[]): ListingFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: listings
      .filter((l) => l.lng != null && l.lat != null)
      .map((l) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [l.lng as number, l.lat as number] as [number, number],
        },
        properties: {
          id: l.id,
          address: l.address || 'Aiken Listing',
          price: Number(l.price || 0),
          beds: l.beds || 0,
          baths: l.baths || 0,
        },
      })),
  }
}

function popupHtml(props: {
  address?: string
  price?: number
  beds?: number
  baths?: number
}) {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 180px;">
      <div style="font-size: 15px; font-weight: 700; color: ${BRAND_NAVY}; margin-bottom: 4px;">
        ${props.address || 'Aiken Listing'}
      </div>
      <div style="font-size: 14px; font-weight: 600; color: #C9A84C; margin-bottom: 6px;">
        $${Number(props.price || 0).toLocaleString()}
      </div>
      <div style="font-size: 13px; color: #1E1E2E;">
        ${props.beds || 0} bed · ${props.baths || 0} bath
      </div>
    </div>
  `
}

export default function Map({ filters }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const popup = useRef<mapboxgl.Popup | null>(null)
  const pendingGeoJSON = useRef<ListingFeatureCollection | null>(null)
  const [status, setStatus] = useState('Loading…')
  const [showBoundaries, setShowBoundaries] = useState(true)

  function setListingsData(listings: Listing[]) {
    const geojson = listingsToGeoJSON(listings)
    const source = map.current?.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined

    if (source) {
      source.setData(geojson)
      pendingGeoJSON.current = null
    } else {
      pendingGeoJSON.current = geojson
    }
  }

  function setupClusterLayers(m: mapboxgl.Map) {
    if (m.getSource(SOURCE_ID)) return

    m.addSource(SOURCE_ID, {
      type: 'geojson',
      data: pendingGeoJSON.current || { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 16,
      clusterRadius: 50,
    })

    m.addLayer({
      id: CLUSTER_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': BRAND_NAVY,
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          18,
          25,
          22,
          100,
          28,
        ],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })

    m.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 13,
      },
      paint: {
        'text-color': '#ffffff',
      },
    })

    m.addLayer({
      id: UNCLUSTERED_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': BRAND_NAVY,
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })

    m.on('click', CLUSTER_LAYER, (e) => {
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      const clusterId = feature.properties?.cluster_id
      const source = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource
      const coordinates = feature.geometry.coordinates as [number, number]

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return
        m.easeTo({
          center: coordinates,
          zoom,
        })
      })
    })

    m.on('click', UNCLUSTERED_LAYER, (e) => {
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      const coordinates = [...feature.geometry.coordinates] as [number, number]
      const props = feature.properties || {}

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
      }

      popup.current?.remove()
      popup.current = new mapboxgl.Popup({ offset: 25 })
        .setLngLat(coordinates)
        .setHTML(
          popupHtml({
            address: props.address,
            price: Number(props.price || 0),
            beds: Number(props.beds || 0),
            baths: Number(props.baths || 0),
          })
        )
        .addTo(m)
    })

    m.on('mouseenter', CLUSTER_LAYER, () => {
      m.getCanvas().style.cursor = 'pointer'
    })
    m.on('mouseleave', CLUSTER_LAYER, () => {
      m.getCanvas().style.cursor = ''
    })
    m.on('mouseenter', UNCLUSTERED_LAYER, () => {
      m.getCanvas().style.cursor = 'pointer'
    })
    m.on('mouseleave', UNCLUSTERED_LAYER, () => {
      m.getCanvas().style.cursor = ''
    })
  }

  // Initialize map once
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: AIKEN_CENTER,
      zoom: AIKEN_ZOOM,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      if (!map.current) return
      // Boundaries first so the listing clusters render above them
      setupBoundaryLayers(map.current)
      setupClusterLayers(map.current)
      map.current.resize()
    })

    return () => {
      popup.current?.remove()
      popup.current = null
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Load + filter listings
  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('Loading listings…')

      try {
        const { data, error } = await supabase.rpc('get_listings_with_coords')

        if (cancelled) return

        if (error || !data) {
          console.error(error)
          setStatus('Could not load listings')
          return
        }

        console.log('Total listings from RPC:', data.length)
        if (data[0]) console.log('Sample listing keys:', Object.keys(data[0]))

        const filtered = filterListings(data as Listing[], filters)

        setStatus(`${filtered.length} homes`)
        setListingsData(filtered)
      } catch (err) {
        console.error(err)
        setStatus('Error loading')
      }
    }

    const t = setTimeout(load, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [filters])

  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return
    setBoundaryLayersVisible(map.current, showBoundaries)
  }, [showBoundaries])

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapContainer} className="w-full h-full min-h-[500px] rounded-lg" />
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="rounded-md bg-white/95 px-3 py-1.5 text-sm font-medium text-brand-navy shadow">
          {status}
        </div>
        <button
          type="button"
          onClick={() => setShowBoundaries((v) => !v)}
          aria-pressed={showBoundaries}
          aria-label={showBoundaries ? 'Hide area boundaries' : 'Show area boundaries'}
          className="rounded-md bg-white/95 px-3 py-1.5 text-left text-sm font-medium text-brand-navy shadow hover:bg-white"
        >
          {showBoundaries ? 'Hide boundaries' : 'Show boundaries'}
        </button>
        {showBoundaries && (
          <ul
            className="rounded-md bg-white/95 px-3 py-2 shadow space-y-1"
            aria-label="Area boundary legend"
          >
            {BOUNDARY_LEGEND.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-xs text-brand-navy">
                {item.swatch === 'fill' ? (
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                ) : (
                  <span
                    className="inline-block h-[2px] w-3 shrink-0"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to right, ${item.color} 0 2px, transparent 2px 4px)`,
                    }}
                    aria-hidden
                  />
                )}
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
