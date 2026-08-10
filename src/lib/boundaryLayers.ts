import type { ExpressionSpecification, Map as MapboxMap } from 'mapbox-gl'
import type { FeatureCollection } from 'geojson'
import boundaryData from '../data/boundaries.json'
import { BOUNDARY_STYLES, STATE_LINE_STYLE } from '../data/boundaryStyles'

export const BOUNDARY_SOURCE_ID = 'boundaries'

export const SITE_FILL_LAYER = 'boundary-site-fill'
export const SITE_OUTLINE_LAYER = 'boundary-site-outline'
export const SITE_LABEL_LAYER = 'boundary-site-label'
export const MUNI_FILL_LAYER = 'boundary-muni-fill'
export const MUNI_OUTLINE_LAYER = 'boundary-muni-outline'
export const MUNI_LABEL_LAYER = 'boundary-muni-label'
export const STATE_LINE_LAYER = 'boundary-state-line'

export const BOUNDARY_LAYER_IDS = [
  STATE_LINE_LAYER,
  SITE_FILL_LAYER,
  SITE_OUTLINE_LAYER,
  SITE_LABEL_LAYER,
  MUNI_FILL_LAYER,
  MUNI_OUTLINE_LAYER,
  MUNI_LABEL_LAYER,
] as const

/** Basemap state lines are hidden while ours is shown, so the border isn't doubled. */
const BASEMAP_STATE_LAYERS = ['admin-1-boundary', 'admin-1-boundary-bg'] as const

export const boundaryStyleDefaults = {
  fillOpacity: 0.22,
  /** City of Aiken is the priority boundary — heavier fill and outline. */
  aikenFillOpacity: 0.42,
  outlineWidth: 1.75,
  aikenOutlineWidth: 3,
  outlineOpacity: 0.9,
  siteFillOpacity: 0.25,
  siteOutlineWidth: 1.75,
  stateLineWidth: 1.5,
  stateLineOpacity: 0.9,
  labelSize: 12,
  aikenLabelSize: 14,
  labelColor: '#0F2B5B',
  labelHaloColor: '#ffffff',
  labelHaloWidth: 1.5,
  visible: true,
}

export type BoundaryLayerOptions = Partial<typeof boundaryStyleDefaults> & {
  /** Insert below this layer so listing clusters stay on top. */
  beforeId?: string
}

function colorMatch(channel: 'fill' | 'outline'): ExpressionSpecification {
  const entries = Object.values(BOUNDARY_STYLES).flatMap((s) => [
    s.id,
    channel === 'fill' ? s.fill : s.outline,
  ])
  return ['match', ['get', 'id'], ...entries, '#888888'] as ExpressionSpecification
}

function setBasemapStateLines(map: MapboxMap, visible: boolean) {
  for (const id of BASEMAP_STATE_LAYERS) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  }
}

export function setBoundaryLayersVisible(map: MapboxMap, visible: boolean) {
  for (const id of BOUNDARY_LAYER_IDS) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  }
  setBasemapStateLines(map, !visible)
}

/**
 * Adds boundary overlays beneath the listing clusters.
 *
 * Draw order (bottom → top): state line, SRS, municipalities.
 * Call before the cluster layers are added.
 */
export function setupBoundaryLayers(map: MapboxMap, options: BoundaryLayerOptions = {}) {
  if (map.getSource(BOUNDARY_SOURCE_ID)) return

  const opts = { ...boundaryStyleDefaults, ...options }
  const beforeId = opts.beforeId
  const visibility = opts.visible ? 'visible' : 'none'

  // SC / GA line comes from Mapbox's own admin tiles — real geometry, no local copy.
  if (map.getSource('composite')) {
    setBasemapStateLines(map, !opts.visible)

    map.addLayer(
      {
        id: STATE_LINE_LAYER,
        type: 'line',
        source: 'composite',
        'source-layer': 'admin',
        filter: [
          'all',
          ['==', ['get', 'admin_level'], 1],
          ['==', ['get', 'maritime'], 'false'],
          ['==', ['get', 'disputed'], 'false'],
        ],
        layout: {
          visibility,
          'line-cap': 'round',
        },
        paint: {
          'line-color': STATE_LINE_STYLE.color,
          'line-width': opts.stateLineWidth,
          'line-opacity': opts.stateLineOpacity,
          'line-dasharray': [0.5, 2.5],
        },
      },
      beforeId
    )
  }

  map.addSource(BOUNDARY_SOURCE_ID, {
    type: 'geojson',
    data: boundaryData as FeatureCollection,
  })

  const isSite: ExpressionSpecification = ['==', ['get', 'kind'], 'site']
  const isMunicipality: ExpressionSpecification = ['==', ['get', 'kind'], 'municipality']
  // One Census internal point per place, so MultiPolygon parts don't each get a label.
  const isMunicipalityLabel: ExpressionSpecification = ['==', ['get', 'kind'], 'muni-label']

  map.addLayer(
    {
      id: SITE_FILL_LAYER,
      type: 'fill',
      source: BOUNDARY_SOURCE_ID,
      filter: isSite,
      layout: { visibility },
      paint: {
        'fill-color': colorMatch('fill'),
        'fill-opacity': opts.siteFillOpacity,
      },
    },
    beforeId
  )

  map.addLayer(
    {
      id: SITE_OUTLINE_LAYER,
      type: 'line',
      source: BOUNDARY_SOURCE_ID,
      filter: isSite,
      layout: { visibility },
      paint: {
        'line-color': colorMatch('outline'),
        'line-width': opts.siteOutlineWidth,
        'line-opacity': 0.85,
      },
    },
    beforeId
  )

  map.addLayer(
    {
      id: SITE_LABEL_LAYER,
      type: 'symbol',
      source: BOUNDARY_SOURCE_ID,
      filter: isSite,
      layout: {
        visibility,
        'text-field': ['get', 'name'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': opts.labelSize,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.04,
        'text-max-width': 12,
      },
      paint: {
        'text-color': opts.labelColor,
        'text-halo-color': opts.labelHaloColor,
        'text-halo-width': opts.labelHaloWidth,
      },
    },
    beforeId
  )

  map.addLayer(
    {
      id: MUNI_FILL_LAYER,
      type: 'fill',
      source: BOUNDARY_SOURCE_ID,
      filter: isMunicipality,
      layout: { visibility },
      paint: {
        'fill-color': colorMatch('fill'),
        'fill-opacity': [
          'match',
          ['get', 'id'],
          'aiken',
          opts.aikenFillOpacity,
          opts.fillOpacity,
        ],
      },
    },
    beforeId
  )

  map.addLayer(
    {
      id: MUNI_OUTLINE_LAYER,
      type: 'line',
      source: BOUNDARY_SOURCE_ID,
      filter: isMunicipality,
      layout: { visibility },
      paint: {
        'line-color': colorMatch('outline'),
        'line-width': [
          'match',
          ['get', 'id'],
          'aiken',
          opts.aikenOutlineWidth,
          opts.outlineWidth,
        ],
        'line-opacity': opts.outlineOpacity,
      },
    },
    beforeId
  )

  map.addLayer(
    {
      id: MUNI_LABEL_LAYER,
      type: 'symbol',
      source: BOUNDARY_SOURCE_ID,
      filter: isMunicipalityLabel,
      layout: {
        visibility,
        'text-field': ['get', 'name'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': ['match', ['get', 'id'], 'aiken', opts.aikenLabelSize, opts.labelSize],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.05,
        'text-max-width': 10,
      },
      paint: {
        'text-color': opts.labelColor,
        'text-halo-color': opts.labelHaloColor,
        'text-halo-width': opts.labelHaloWidth,
      },
    },
    beforeId
  )
}
