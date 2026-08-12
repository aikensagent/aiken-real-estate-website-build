import { describe, expect, it } from 'vitest'
import {
  extractNamedPlaceQuery,
  formatNamedPlaceBlock,
  geocodeNamedPlace,
  matchCuratedNamedPlace,
  pointInAikenBbox,
  resolveNamedPlace,
} from './named-place'

describe('extractNamedPlaceQuery', () => {
  it('pulls a named destination from distance phrasing', () => {
    expect(extractNamedPlaceQuery('how far to Bridgestone')).toBe('Bridgestone')
    expect(extractNamedPlaceQuery('How far is it to Bridgestone?')).toBe(
      'Bridgestone'
    )
    expect(extractNamedPlaceQuery('directions to Hitchcock Woods')).toBe(
      'Hitchcock Woods'
    )
    expect(
      extractNamedPlaceQuery("where's Bridgestone from this home")
    ).toBe('Bridgestone')
    expect(
      extractNamedPlaceQuery(
        'how far is it from 111 Greenville Street NW to Bridgestone'
      )
    ).toBe('Bridgestone')
    expect(
      extractNamedPlaceQuery('how far from this house to Bridgestone')
    ).toBe('Bridgestone')
    expect(extractNamedPlaceQuery('how far to the hospital')).toBe('hospital')
    expect(
      extractNamedPlaceQuery('how far to Aiken Regional Medical Center')
    ).toBe('Aiken Regional Medical Center')
  })

  it('does not steal curated amenity intents', () => {
    expect(extractNamedPlaceQuery('nearby playgrounds')).toBeNull()
    expect(extractNamedPlaceQuery('schools nearby')).toBeNull()
    expect(extractNamedPlaceQuery('grocery and daily needs')).toBeNull()
  })

  it('refuses Fair Housing place probes', () => {
    expect(
      extractNamedPlaceQuery('how far to the black neighborhood')
    ).toBeNull()
  })
})

describe('matchCuratedNamedPlace', () => {
  it('resolves a known playground without geocoding', () => {
    const hit = matchCuratedNamedPlace('Library Park')
    expect(hit?.name).toMatch(/Library Park/i)
  })

  it('resolves Bridgestone to the Graniteville plant', () => {
    const hit = matchCuratedNamedPlace('Bridgestone')
    expect(hit?.id).toBe('bridgestone-graniteville')
    expect(hit?.lng).toBeCloseTo(-81.855)
    expect(hit?.lat).toBeCloseTo(33.622)
  })

  it('resolves hospital phrasing to Aiken Regional Medical Center', () => {
    const hit = matchCuratedNamedPlace('hospital')
    expect(hit?.id).toBe('aiken-regional-medical')
    expect(matchCuratedNamedPlace('Aiken Regional Medical Center')?.id).toBe(
      'aiken-regional-medical'
    )
    expect(matchCuratedNamedPlace('Aiken')?.id).not.toBe('aiken-regional-medical')
  })
})

describe('geocodeNamedPlace', () => {
  it('parses a Mapbox feature inside the Aiken bbox', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'Bridgestone',
              place_name: 'Bridgestone, Graniteville, South Carolina, United States',
              center: [-81.83, 33.57],
            },
          ],
        }),
      }) as Response

    const hit = await geocodeNamedPlace({
      query: 'Bridgestone',
      accessToken: 'pk.test',
      fetchImpl,
    })
    expect(hit?.name).toBe('Bridgestone')
    expect(hit?.source).toBe('geocode')
    expect(hit?.lng).toBeCloseTo(-81.83)
  })

  it('rejects a city-level Aiken hit', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'Aiken',
              place_name: 'Aiken, South Carolina, United States',
              place_type: ['place'],
              center: [-81.7198, 33.5604],
            },
          ],
        }),
      }) as Response

    const hit = await geocodeNamedPlace({
      query: 'Aiken Regional Medical Center',
      accessToken: 'pk.test',
      fetchImpl,
    })
    expect(hit).toBeNull()
  })

  it('rejects a hit outside the Aiken bbox', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        json: async () => ({
          features: [
            {
              text: 'Bridgestone',
              place_name: 'Bridgestone, Nashville, Tennessee, United States',
              center: [-86.78, 36.16],
            },
          ],
        }),
      }) as Response

    const hit = await geocodeNamedPlace({
      query: 'Bridgestone',
      accessToken: 'pk.test',
      fetchImpl,
    })
    expect(hit).toBeNull()
  })
})

describe('resolveNamedPlace', () => {
  it('prefers curated matches over geocode', async () => {
    const fetchImpl = async () => {
      throw new Error('geocode should not run')
    }
    const hit = await resolveNamedPlace({
      query: 'Library Park',
      accessToken: 'pk.test',
      fetchImpl,
    })
    expect(hit?.source).toBe('curated')
    expect(hit?.name).toMatch(/Library Park/i)
  })
})

describe('formatNamedPlaceBlock', () => {
  it('tells Rou not to invent a different destination', () => {
    const block = formatNamedPlaceBlock({
      name: 'Bridgestone',
      lng: -81.83,
      lat: 33.57,
      source: 'geocode',
      placeName: 'Bridgestone, Graniteville, South Carolina, United States',
    })
    expect(block).toContain('NAMED PLACE LOOKUP')
    expect(block).toContain('Bridgestone')
    expect(block).toContain('Do not browse the web')
  })
})

describe('pointInAikenBbox', () => {
  it('includes downtown Aiken and excludes Nashville', () => {
    expect(pointInAikenBbox(-81.7198, 33.5604)).toBe(true)
    expect(pointInAikenBbox(-86.78, 36.16)).toBe(false)
  })
})
