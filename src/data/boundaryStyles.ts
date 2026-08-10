/**
 * Styling + legend config for the map boundary overlays.
 *
 * Geometry lives in boundaries.json and comes from authoritative sources only:
 * - Municipalities / CDPs: US Census TIGERweb (Incorporated Places + Census Designated Places)
 * - Savannah River Site: OpenStreetMap relation 17745657 (ODbL), DOE-operated site
 * - SC / GA state line: Mapbox Streets `admin` tiles (admin_level 1)
 *
 * Never hand-write or approximate coordinates here.
 */

export type BoundaryId =
  | 'aiken'
  | 'north-augusta'
  | 'new-ellenton'
  | 'graniteville'
  | 'belvedere'
  | 'burnettown'
  | 'srs'

export type BoundaryStyle = {
  id: BoundaryId
  name: string
  fill: string
  outline: string
}

/** Fills render semi-transparent; outlines are darker for definition. */
export const BOUNDARY_STYLES: Record<BoundaryId, BoundaryStyle> = {
  aiken: {
    id: 'aiken',
    name: 'City of Aiken',
    fill: '#D4A017',
    outline: '#7A5A00',
  },
  'north-augusta': {
    id: 'north-augusta',
    name: 'North Augusta',
    fill: '#0E8C7A',
    outline: '#075F53',
  },
  'new-ellenton': {
    id: 'new-ellenton',
    name: 'New Ellenton',
    fill: '#E08A4E',
    outline: '#B86830',
  },
  graniteville: {
    id: 'graniteville',
    name: 'Graniteville',
    fill: '#A66B5A',
    outline: '#7D4E41',
  },
  belvedere: {
    id: 'belvedere',
    name: 'Belvedere',
    fill: '#7D8C21',
    outline: '#545E15',
  },
  burnettown: {
    id: 'burnettown',
    name: 'Burnettown',
    fill: '#6F8FB5',
    outline: '#47607F',
  },
  srs: {
    id: 'srs',
    name: 'Savannah River Site',
    fill: '#78716C',
    outline: '#57534E',
  },
}

export const STATE_LINE_STYLE = {
  id: 'sc-ga',
  name: 'SC / GA state line',
  color: '#DC2626',
}

export type LegendItem = {
  id: string
  name: string
  swatch: 'fill' | 'dotted-line'
  color: string
}

/** Legend rows — must match exactly what the map renders. */
export const BOUNDARY_LEGEND: LegendItem[] = [
  ...Object.values(BOUNDARY_STYLES).map(
    (s): LegendItem => ({ id: s.id, name: s.name, swatch: 'fill', color: s.fill })
  ),
  {
    id: STATE_LINE_STYLE.id,
    name: STATE_LINE_STYLE.name,
    swatch: 'dotted-line',
    color: STATE_LINE_STYLE.color,
  },
]
