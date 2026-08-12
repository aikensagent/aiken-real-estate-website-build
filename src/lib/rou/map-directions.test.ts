import { describe, expect, it } from 'vitest'
import {
  buildAmenityRouteOverlay,
  fetchMapboxRoute,
  formatRoutedTimesBlock,
  minutesFromSeconds,
} from './map-directions'

describe('map directions', () => {
  it('rounds duration seconds to whole minutes', () => {
    expect(minutesFromSeconds(30)).toBe(1)
    expect(minutesFromSeconds(90)).toBe(2)
  })

  it('parses a Mapbox Directions success payload', async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 1609,
              duration: 300,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-81.72, 33.55],
                  [-81.71, 33.56],
                ],
              },
            },
          ],
        }),
      }) as Response

    const route = await fetchMapboxRoute(
      { lng: -81.72, lat: 33.55 },
      { lng: -81.71, lat: 33.56 },
      'driving',
      'pk.test',
      fetchImpl
    )
    expect(route?.durationSeconds).toBe(300)
    expect(route?.geometry.coordinates).toHaveLength(2)
  })

  it('builds an overlay preferring driving geometry', async () => {
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input)
      const walking = url.includes('/walking/')
      return {
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: walking ? 800 : 1600,
              duration: walking ? 600 : 240,
              geometry: {
                type: 'LineString',
                coordinates: walking
                  ? [
                      [-81.72, 33.55],
                      [-81.719, 33.551],
                    ]
                  : [
                      [-81.72, 33.55],
                      [-81.7, 33.56],
                    ],
              },
            },
          ],
        }),
      } as Response
    }

    const overlay = await buildAmenityRouteOverlay({
      from: { lng: -81.72, lat: 33.55 },
      to: { lng: -81.7, lat: 33.56 },
      destinationLabel: 'Library Park',
      accessToken: 'pk.test',
      hazardNote: 'Whiskey Road (SC 19)',
      fetchImpl,
    })

    expect(overlay?.destinationLabel).toBe('Library Park')
    expect(overlay?.driveMinutes).toBe(4)
    expect(overlay?.walkMinutes).toBe(10)
    expect(overlay?.geometry.coordinates.at(-1)?.[0]).toBe(-81.7)
    expect(overlay?.hazardNote).toContain('Whiskey')
  })

  it('formats Mapbox times as the spoken-answer authority block', () => {
    const block = formatRoutedTimesBlock({
      destinationLabel: 'Library Park',
      driveMinutes: 3,
      walkMinutes: 12,
      hazardNote: 'Whiskey Road (SC 19)',
    })
    expect(block).toContain('MAPBOX ROUTE TIMES')
    expect(block).toContain('Library Park')
    expect(block).toContain('~3 min drive')
    expect(block).toContain('~12 min walk')
    expect(block).toContain('Whiskey Road')
  })

  it('returns null when Directions fails', async () => {
    const fetchImpl = async () => ({ ok: false }) as Response
    const route = await fetchMapboxRoute(
      { lng: -81.72, lat: 33.55 },
      { lng: -81.71, lat: 33.56 },
      'driving',
      'pk.test',
      fetchImpl
    )
    expect(route).toBeNull()
  })
})
