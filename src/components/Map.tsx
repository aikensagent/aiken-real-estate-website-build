import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { filterListings } from '../lib/filterListings'
import type {
  SearchFilters,
  Listing,
  MapViewportBounds,
} from '../lib/filterListings'
import { rouPersonaRouter } from '../lib/rou/live'
import {
  applyTransientFilters,
  applyTransientViewport,
  hydrateTransientMapState,
  persistTransientMapState,
} from '../lib/rou/transient-map-state'
import { BOUNDARY_LEGEND } from '../data/boundaryStyles'
import { setupBoundaryLayers, setBoundaryLayersVisible } from '../lib/boundaryLayers'
import { GOLF_COURSES } from '../lib/golfCourses'
import {
  parksAndRec,
  parkIconMap,
  PARK_LEGEND,
  type ParkType,
} from '../lib/parksAndRec'
import {
  isWalkDisplayable,
  pointAlongLine,
  type AmenityRouteOverlay,
} from '../lib/rou/map-directions'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const BRAND_NAVY = '#0F2B5B'
const BRAND_CREAM = '#F7F8FA'
const ROUTE_LINE = '#D92D20'
const BRAND_SLATE = '#1E1E2E'
const SOURCE_ID = 'listings'
const CLUSTER_LAYER = 'clusters'
const CLUSTER_COUNT_LAYER = 'cluster-count'
const UNCLUSTERED_LAYER = 'unclustered-point'

const GOLF_SOURCE_ID = 'golf-courses'
const GOLF_LAYER = 'golf-course-markers'
const GOLF_ICON_ID = 'golf-flag'
const GOLF_ICON_PX = 20
const GOLF_FLAG_RED = '#D92D20'

const PARK_SOURCE_ID = 'parks-and-rec'
const PARK_LAYER = 'parks-and-rec-markers'
const PARK_ICON_PX = 22

const ROUTE_WALK_WIDTH = [
  'interpolate',
  ['linear'],
  ['zoom'],
  11,
  5,
  14,
  8,
  17,
  11,
] as const
const ROUTE_DRIVE_WIDTH = [
  'interpolate',
  ['linear'],
  ['zoom'],
  11,
  4,
  14,
  6,
  17,
  8,
] as const
const ROUTE_DRIVE_SOURCE_ID = 'rou-amenity-route-drive'
const ROUTE_DRIVE_LAYER = 'rou-amenity-route-drive-line'
const ROUTE_WALK_SOURCE_ID = 'rou-amenity-route-walk'
const ROUTE_WALK_LAYER = 'rou-amenity-route-walk-line'
const ROUTE_ENDPOINTS_SOURCE = 'rou-amenity-route-ends'
const ROUTE_ENDPOINTS_LAYER = 'rou-amenity-route-ends-layer'
const LEGACY_ROUTE_SOURCE_ID = 'rou-amenity-route'
const LEGACY_ROUTE_LAYER = 'rou-amenity-route-line'

const ROUTE_LABEL_WALK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>'
const ROUTE_LABEL_DRIVE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>'

function routePathLabelElement(
  mode: 'walking' | 'driving',
  minutes: number
): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:4px',
    'white-space:nowrap',
    'pointer-events:none',
    `background:${BRAND_CREAM}`,
    `color:${BRAND_NAVY}`,
    `border:1px solid ${BRAND_NAVY}33`,
    'border-radius:999px',
    'padding:3px 8px',
    'font:600 12px/1.2 system-ui,-apple-system,sans-serif',
    'box-shadow:0 2px 8px rgba(15,43,91,0.18)',
  ].join(';')
  el.setAttribute(
    'aria-label',
    mode === 'walking'
      ? `Walk, about ${minutes} minutes`
      : `Drive, about ${minutes} minutes`
  )
  el.innerHTML = `${mode === 'walking' ? ROUTE_LABEL_WALK_SVG : ROUTE_LABEL_DRIVE_SVG}<span>${minutes} min</span>`
  return el
}

type MapProps = {
  filters?: SearchFilters
  /** When false (e.g. mobile List tab), map may be display:none — resize when it becomes true. */
  visible?: boolean
  /** Shortest amenity route from Ask Rou — drawn as a line with endpoints. */
  routeOverlay?: AmenityRouteOverlay | null
  /** Left-rail cards follow this camera bbox after pan/zoom. */
  onViewportBounds?: (bounds: MapViewportBounds) => void
  /** Area search / chip — fly here when the list stays on mobile List. */
  cameraFocus?: { lng: number; lat: number; zoom: number } | null
  /** Buyer standing in town — blue-dot only, never a parcel. */
  userLocation?: { lng: number; lat: number } | null
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

function searchFiltersToTransientInput(filters?: SearchFilters) {
  return {
    searchQuery: filters?.location?.trim() || null,
    beds: filters?.beds ? Number(filters.beds) : null,
    baths: filters?.baths ? Number(filters.baths) : null,
    minPrice: filters?.price ? Number(filters.price) : null,
    propertyType: 'Residential' as const,
  }
}

function searchFiltersFromTransient(
  state: ReturnType<typeof hydrateTransientMapState>
): SearchFilters {
  return {
    location: state.searchQuery || undefined,
    beds: state.filters.beds != null ? String(state.filters.beds) : undefined,
    baths: state.filters.baths != null ? String(state.filters.baths) : undefined,
    price: state.filters.minPrice != null ? String(state.filters.minPrice) : undefined,
  }
}

function persistMapViewport(m: mapboxgl.Map) {
  const current = hydrateTransientMapState()
  const center = m.getCenter()
  persistTransientMapState(
    applyTransientViewport(current, {
      center: [center.lng, center.lat],
      zoom: m.getZoom(),
      bearing: m.getBearing(),
      pitch: m.getPitch(),
    })
  )
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

type GolfFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: { id: string; name: string }
  }>
}

function golfCoursesToGeoJSON(): GolfFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: GOLF_COURSES.map((course) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [course.lng, course.lat] as [number, number],
      },
      properties: { id: course.id, name: course.name },
    })),
  }
}

/** Drawn at 2x and registered with pixelRatio 2 so the flag stays sharp on retina. */
const GOLF_FLAG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${GOLF_ICON_PX * 2}" height="${GOLF_ICON_PX * 2}" viewBox="0 0 20 20">
  <g stroke="#FFFFFF" fill="#FFFFFF" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M6.6 18.2V2.4" fill="none"/>
    <path d="M6.6 3.1 14.8 5.8 6.6 8.5 Z"/>
    <ellipse cx="6.6" cy="18.2" rx="3.1" ry="1.3" stroke-width="2"/>
  </g>
  <ellipse cx="6.6" cy="18.2" rx="3.1" ry="1.3" fill="${BRAND_NAVY}"/>
  <path d="M6.6 18.2V2.4" fill="none" stroke="${BRAND_NAVY}" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M6.6 3.1 14.8 5.8 6.6 8.5 Z" fill="${GOLF_FLAG_RED}"/>
</svg>`

function golfPopupContent(name: string) {
  const el = document.createElement('div')
  el.style.cssText =
    'font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 600; color: #0F2B5B; white-space: nowrap;'
  el.textContent = name
  return el
}

type ParkFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: { id: string; name: string; note: string; icon: string }
  }>
}

const parkIconId = (type: ParkType) => `park-${type}`

function parksToGeoJSON(): ParkFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: parksAndRec.map((facility) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [facility.lng, facility.lat] as [number, number],
      },
      properties: {
        id: facility.id,
        name: facility.name,
        note: facility.note ?? '',
        icon: parkIconId(facility.type),
      },
    })),
  }
}

/**
 * Mapbox glyph fonts carry no emoji coverage, so each type icon is rasterized
 * with the system emoji font and registered as a map image. Drawn at 2x and
 * registered with pixelRatio 2 to stay sharp on retina.
 */
function renderParkIcon(emoji: string): ImageData | null {
  const size = PARK_ICON_PX * 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const center = size / 2
  ctx.beginPath()
  ctx.arc(center, center, center - 2, 0, Math.PI * 2)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = BRAND_NAVY
  ctx.stroke()

  ctx.font = `${size * 0.52}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, center, center + size * 0.03)

  return ctx.getImageData(0, 0, size, size)
}

function parkPopupContent(name: string, note: string) {
  const el = document.createElement('div')
  el.style.cssText = 'font-family: system-ui, -apple-system, sans-serif; max-width: 190px;'

  const title = document.createElement('div')
  title.style.cssText = `font-size: 13px; font-weight: 700; color: ${BRAND_NAVY};`
  title.textContent = name
  el.appendChild(title)

  if (note) {
    const detail = document.createElement('div')
    detail.style.cssText = `margin-top: 2px; font-size: 12px; line-height: 1.35; color: ${BRAND_SLATE};`
    detail.textContent = note
    el.appendChild(detail)
  }

  return el
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

export default function Map({
  filters,
  visible = true,
  routeOverlay = null,
  onViewportBounds,
  cameraFocus = null,
  userLocation = null,
}: MapProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const onViewportBoundsRef = useRef(onViewportBounds)
  onViewportBoundsRef.current = onViewportBounds
  const lastReportedBounds = useRef<MapViewportBounds | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const popup = useRef<mapboxgl.Popup | null>(null)
  const golfPopup = useRef<mapboxgl.Popup | null>(null)
  const parkPopup = useRef<mapboxgl.Popup | null>(null)
  const pendingGeoJSON = useRef<ListingFeatureCollection | null>(null)
  const [status, setStatus] = useState('Loading…')
  const [showBoundaries, setShowBoundaries] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const walkLabelMarker = useRef<mapboxgl.Marker | null>(null)
  const driveLabelMarker = useRef<mapboxgl.Marker | null>(null)
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null)

  function clearRouteLabelMarkers() {
    walkLabelMarker.current?.remove()
    walkLabelMarker.current = null
    driveLabelMarker.current?.remove()
    driveLabelMarker.current = null
  }

  function placeRouteLabelMarker(
    m: mapboxgl.Map,
    slot: 'walking' | 'driving',
    lngLat: [number, number],
    minutes: number
  ) {
    const marker = new mapboxgl.Marker({
      element: routePathLabelElement(slot, minutes),
      anchor: 'center',
      pitchAlignment: 'viewport',
      rotationAlignment: 'viewport',
    })
      .setLngLat(lngLat)
      .addTo(m)
    if (slot === 'walking') walkLabelMarker.current = marker
    else driveLabelMarker.current = marker
  }

  function ensureRouteLayers(m: mapboxgl.Map) {
    if (m.getLayer(LEGACY_ROUTE_LAYER)) m.removeLayer(LEGACY_ROUTE_LAYER)
    if (m.getSource(LEGACY_ROUTE_SOURCE_ID)) m.removeSource(LEGACY_ROUTE_SOURCE_ID)

    if (!m.getSource(ROUTE_DRIVE_SOURCE_ID)) {
      m.addSource(ROUTE_DRIVE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      m.addLayer({
        id: ROUTE_DRIVE_LAYER,
        type: 'line',
        source: ROUTE_DRIVE_SOURCE_ID,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ROUTE_LINE,
          'line-width': [...ROUTE_DRIVE_WIDTH],
          'line-opacity': 0.92,
        },
      })
    }
    if (!m.getSource(ROUTE_WALK_SOURCE_ID)) {
      m.addSource(ROUTE_WALK_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      m.addLayer({
        id: ROUTE_WALK_LAYER,
        type: 'line',
        source: ROUTE_WALK_SOURCE_ID,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ROUTE_LINE,
          'line-width': [...ROUTE_WALK_WIDTH],
          'line-opacity': 1,
          'line-dasharray': [0, 2],
        },
      })
    }
    if (!m.getSource(ROUTE_ENDPOINTS_SOURCE)) {
      m.addSource(ROUTE_ENDPOINTS_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      m.addLayer({
        id: ROUTE_ENDPOINTS_LAYER,
        type: 'circle',
        source: ROUTE_ENDPOINTS_SOURCE,
        paint: {
          'circle-radius': [
            'match',
            ['get', 'role'],
            'origin',
            6,
            8,
          ],
          'circle-color': [
            'match',
            ['get', 'role'],
            'origin',
            '#FFFFFF',
            ROUTE_LINE,
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': [
            'match',
            ['get', 'role'],
            'origin',
            ROUTE_LINE,
            '#FFFFFF',
          ],
        },
      })
    }
  }

  function applyRouteOverlay(overlay: AmenityRouteOverlay | null) {
    const m = map.current
    if (!m?.isStyleLoaded()) return
    ensureRouteLayers(m)
    clearRouteLabelMarkers()

    const driveSource = m.getSource(ROUTE_DRIVE_SOURCE_ID) as mapboxgl.GeoJSONSource
    const walkSource = m.getSource(ROUTE_WALK_SOURCE_ID) as mapboxgl.GeoJSONSource
    const endsSource = m.getSource(ROUTE_ENDPOINTS_SOURCE) as mapboxgl.GeoJSONSource

    if (!overlay) {
      driveSource.setData({ type: 'FeatureCollection', features: [] })
      walkSource.setData({ type: 'FeatureCollection', features: [] })
      endsSource.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const driveGeometry = overlay.driveGeometry
    const showWalk =
      isWalkDisplayable(overlay.walkMinutes) && overlay.walkGeometry != null
    const walkGeometry = showWalk ? overlay.walkGeometry : null

    driveSource.setData(
      driveGeometry
        ? { type: 'Feature', properties: {}, geometry: driveGeometry }
        : { type: 'FeatureCollection', features: [] }
    )
    walkSource.setData(
      walkGeometry
        ? { type: 'Feature', properties: {}, geometry: walkGeometry }
        : { type: 'FeatureCollection', features: [] }
    )
    endsSource.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { role: 'origin' },
          geometry: { type: 'Point', coordinates: overlay.origin },
        },
        {
          type: 'Feature',
          properties: { role: 'destination' },
          geometry: { type: 'Point', coordinates: overlay.destination },
        },
      ],
    })

    const walkFraction = driveGeometry && walkGeometry ? 0.42 : 0.5
    const driveFraction = driveGeometry && walkGeometry ? 0.62 : 0.5
    if (walkGeometry && overlay.walkMinutes != null) {
      const at = pointAlongLine(walkGeometry.coordinates, walkFraction)
      if (at) placeRouteLabelMarker(m, 'walking', at, overlay.walkMinutes)
    }
    if (driveGeometry && overlay.driveMinutes != null) {
      const at = pointAlongLine(driveGeometry.coordinates, driveFraction)
      if (at) placeRouteLabelMarker(m, 'driving', at, overlay.driveMinutes)
    }

    const bounds = new mapboxgl.LngLatBounds(overlay.origin, overlay.origin)
    for (const line of [driveGeometry, walkGeometry]) {
      if (!line) continue
      for (const c of line.coordinates) {
        bounds.extend(c as [number, number])
      }
    }
    m.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 })
  }

  function reportViewportBounds(m: mapboxgl.Map) {
    const b = m.getBounds()
    const next: MapViewportBounds = {
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    }
    const prev = lastReportedBounds.current
    if (
      prev &&
      prev.west === next.west &&
      prev.south === next.south &&
      prev.east === next.east &&
      prev.north === next.north
    ) {
      return
    }
    lastReportedBounds.current = next
    onViewportBoundsRef.current?.(next)
  }

  function resizeMap() {
    const m = map.current
    if (!m) return
    m.resize()
    reportViewportBounds(m)
  }

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

  function setupGolfCourseLayer(m: mapboxgl.Map) {
    if (m.getSource(GOLF_SOURCE_ID)) return

    m.addSource(GOLF_SOURCE_ID, {
      type: 'geojson',
      data: golfCoursesToGeoJSON(),
    })

    const showCourseName = (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      m.getCanvas().style.cursor = 'pointer'
      golfPopup.current?.remove()
      golfPopup.current = new mapboxgl.Popup({
        offset: GOLF_ICON_PX + 4,
        closeButton: false,
        closeOnClick: false,
      })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(golfPopupContent(String(feature.properties?.name ?? 'Golf course')))
        .addTo(m)
    }

    const hideCourseName = () => {
      m.getCanvas().style.cursor = ''
      golfPopup.current?.remove()
      golfPopup.current = null
    }

    const image = new Image(GOLF_ICON_PX * 2, GOLF_ICON_PX * 2)

    image.onload = () => {
      // The component can unmount while the SVG decodes
      if (map.current !== m || m.getLayer(GOLF_LAYER)) return

      if (!m.hasImage(GOLF_ICON_ID)) {
        m.addImage(GOLF_ICON_ID, image, { pixelRatio: 2 })
      }

      m.addLayer(
        {
          id: GOLF_LAYER,
          type: 'symbol',
          source: GOLF_SOURCE_ID,
          layout: {
            'icon-image': GOLF_ICON_ID,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        },
        // Keep flags beneath the listing pins so real estate stays primary
        m.getLayer(CLUSTER_LAYER) ? CLUSTER_LAYER : undefined
      )

      m.on('mouseenter', GOLF_LAYER, showCourseName)
      m.on('mouseleave', GOLF_LAYER, hideCourseName)
      m.on('click', GOLF_LAYER, showCourseName)
    }

    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(GOLF_FLAG_SVG)}`
  }

  function setupParksLayer(m: mapboxgl.Map) {
    if (m.getSource(PARK_SOURCE_ID)) return

    m.addSource(PARK_SOURCE_ID, {
      type: 'geojson',
      data: parksToGeoJSON(),
    })

    const usedTypes = parksAndRec
      .map((facility) => facility.type)
      .filter((type, i, all) => all.indexOf(type) === i)

    for (const type of usedTypes) {
      const iconId = parkIconId(type)
      if (m.hasImage(iconId)) continue

      const icon = renderParkIcon(parkIconMap[type])
      if (icon) m.addImage(iconId, icon, { pixelRatio: 2 })
    }

    // Beneath the golf flags and listing pins so real estate stays primary.
    // Golf adds itself before the clusters once its SVG decodes, which leaves
    // it above the parks regardless of which layer lands first.
    let beforeId: string | undefined
    if (m.getLayer(GOLF_LAYER)) beforeId = GOLF_LAYER
    else if (m.getLayer(CLUSTER_LAYER)) beforeId = CLUSTER_LAYER

    m.addLayer(
      {
        id: PARK_LAYER,
        type: 'symbol',
        source: PARK_SOURCE_ID,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      },
      beforeId
    )

    const showFacility = (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      m.getCanvas().style.cursor = 'pointer'
      parkPopup.current?.remove()
      parkPopup.current = new mapboxgl.Popup({
        offset: PARK_ICON_PX / 2 + 6,
        closeButton: false,
        closeOnClick: false,
      })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(
          parkPopupContent(
            String(feature.properties?.name ?? 'Park'),
            String(feature.properties?.note ?? '')
          )
        )
        .addTo(m)
    }

    const hideFacility = () => {
      m.getCanvas().style.cursor = ''
      parkPopup.current?.remove()
      parkPopup.current = null
    }

    m.on('mouseenter', PARK_LAYER, showFacility)
    m.on('mouseleave', PARK_LAYER, hideFacility)
    m.on('click', PARK_LAYER, showFacility)
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

  // Initialize map once from tab-scoped Interface Rou state
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const initial = hydrateTransientMapState()

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initial.center,
      zoom: initial.zoom,
      bearing: initial.bearing ?? 0,
      pitch: initial.pitch ?? 0,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      if (!map.current) return
      // Boundaries first so the listing clusters render above them
      setupBoundaryLayers(map.current)
      setupClusterLayers(map.current)
      setupGolfCourseLayer(map.current)
      setupParksLayer(map.current)
      resizeMap()
      reportViewportBounds(map.current)
    })

    map.current.on('moveend', () => {
      if (!map.current) return
      persistMapViewport(map.current)
      reportViewportBounds(map.current)
    })

    return () => {
      popup.current?.remove()
      popup.current = null
      golfPopup.current?.remove()
      golfPopup.current = null
      parkPopup.current?.remove()
      parkPopup.current = null
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Recalculate Mapbox size when the container is shown or its box changes
  // (mobile List | Map toggle uses display:none, which leaves a stale canvas size).
  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      resizeMap()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return

    let cancelled = false
    const frame = requestAnimationFrame(() => {
      if (cancelled) return
      resizeMap()
      // Second pass after paint — layout from display:none → visible can lag one frame
      requestAnimationFrame(() => {
        if (!cancelled) resizeMap()
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [visible])

  // Load + filter listings through Node A. Camera stays on the last
  // sessionStorage viewport if the listing RPC drops mid-pan.
  useEffect(() => {
    persistTransientMapState(
      applyTransientFilters(
        hydrateTransientMapState(),
        searchFiltersToTransientInput(filters)
      )
    )

    let cancelled = false

    async function load() {
      setStatus('Loading listings…')

      try {
        const data = await rouPersonaRouter.interface.loadPublicListings()
        if (cancelled) return

        const state = hydrateTransientMapState()
        const filtered = filterListings(
          data as Listing[],
          searchFiltersFromTransient(state)
        )

        setStatus(`${filtered.length} homes`)
        setListingsData(filtered)
      } catch {
        if (cancelled) return
        setStatus('Could not load listings')
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

  useEffect(() => {
    const m = map.current
    if (!m || !cameraFocus) return
    const fly = () => {
      m.flyTo({
        center: [cameraFocus.lng, cameraFocus.lat],
        zoom: cameraFocus.zoom,
        duration: 700,
      })
    }
    if (m.isStyleLoaded()) fly()
    else m.once('load', fly)
    return () => {
      m.off('load', fly)
    }
  }, [cameraFocus])

  useEffect(() => {
    const m = map.current
    userLocationMarker.current?.remove()
    userLocationMarker.current = null
    if (!m || !userLocation) return
    const el = document.createElement('div')
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', 'Your location')
    el.className =
      'h-3.5 w-3.5 rounded-full border-2 border-brand-cream bg-brand-gold shadow'
    userLocationMarker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(m)
    return () => {
      userLocationMarker.current?.remove()
      userLocationMarker.current = null
    }
  }, [userLocation])

  useEffect(() => {
    const m = map.current
    if (!m) return

    const paint = () => applyRouteOverlay(routeOverlay)
    if (m.isStyleLoaded()) paint()
    else m.once('load', paint)
    return () => {
      m.off('load', paint)
    }
  }, [routeOverlay])

  return (
    <div ref={rootRef} className="relative h-full w-full min-h-0">
      <div ref={mapContainer} className="absolute inset-0 h-full w-full" />
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="rounded-md bg-white/95 px-3 py-1.5 text-sm font-medium text-brand-navy shadow">
          {status}
        </div>
        <button
          type="button"
          onClick={() => setShowBoundaries((v) => !v)}
          aria-pressed={showBoundaries}
          aria-label={showBoundaries ? 'Hide boundaries' : 'Show boundaries'}
          className="rounded-md bg-white/95 px-3 py-1.5 text-left text-sm font-medium text-brand-navy shadow hover:bg-white"
        >
          {showBoundaries ? 'Hide boundaries' : 'Show boundaries'}
        </button>
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          aria-pressed={showLegend}
          aria-label={showLegend ? 'Hide legend' : 'Show legend'}
          className="rounded-md bg-white/95 px-3 py-1.5 text-left text-sm font-medium text-brand-navy shadow hover:bg-white"
        >
          {showLegend ? 'Hide legend' : 'Show legend'}
        </button>
        {showLegend && (
          <div
            role="group"
            aria-label="Map legend"
            className="rounded-md bg-white/95 px-3 py-2 shadow"
          >
            <ul className="space-y-1">
              {showBoundaries &&
                BOUNDARY_LEGEND.map((item) => (
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
              <li className="flex items-center gap-2 text-xs text-brand-navy">
                <svg viewBox="0 0 20 20" className="h-3 w-3 shrink-0" aria-hidden>
                  <path
                    d="M6.6 18.2V2.4"
                    fill="none"
                    stroke={BRAND_NAVY}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.6 3.1 14.8 5.8 6.6 8.5 Z"
                    fill={GOLF_FLAG_RED}
                    strokeWidth="0"
                  />
                </svg>
                Golf course
              </li>
            </ul>
            <details className="mt-2 border-t border-slate-200 pt-1.5" open>
              <summary className="cursor-pointer text-xs font-semibold text-brand-navy">
                Parks &amp; recreation
              </summary>
              <ul className="mt-1 space-y-1">
                {PARK_LEGEND.map((item) => (
                  <li key={item.type} className="flex items-center gap-2 text-xs text-brand-navy">
                    <span className="w-3.5 shrink-0 text-center text-[11px] leading-none" aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
