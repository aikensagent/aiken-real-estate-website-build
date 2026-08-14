import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Listing } from '../filterListings'
import {
  boundsAroundPoint,
  cityFromCoordinates,
  classifyOnSiteMatch,
  distanceMeters,
  isOnSiteInCoverage,
} from './on-site-home'

const here = dirname(fileURLToPath(import.meta.url))

function home(
  id: string,
  lng: number,
  lat: number
): Listing {
  return {
    id,
    address: id,
    price: 300000,
    beds: 3,
    baths: 2,
    lng,
    lat,
    primary_photo_url: null,
  }
}

const downtown = { lng: -81.7198, lat: 33.5604 }

describe('on-site home match', () => {
  it('treats Aiken as in coverage and Atlanta as out', () => {
    expect(isOnSiteInCoverage(downtown)).toBe(true)
    expect(isOnSiteInCoverage({ lng: -84.388, lat: 33.749 })).toBe(false)
  })

  it('picks a unique listing within 40m and stays ambiguous for two close pins', () => {
    const hereHome = home('here', downtown.lng, downtown.lat)
    const neighbor = home('next', downtown.lng + 0.0002, downtown.lat)
    const far = home('far', downtown.lng + 0.02, downtown.lat)

    const unique = classifyOnSiteMatch([hereHome, far], downtown)
    expect(unique.kind).toBe('unique')
    if (unique.kind === 'unique') expect(unique.listing.id).toBe('here')

    const several = classifyOnSiteMatch([hereHome, neighbor], downtown)
    expect(several.kind).toBe('several')
    if (several.kind === 'several') {
      expect(several.nearby.map((l) => l.id)).toContain('here')
      expect(several.nearby.map((l) => l.id)).toContain('next')
    }
  })

  it('does not invent a match when nothing is nearby', () => {
    const far = home('far', -81.9, 33.3)
    expect(classifyOnSiteMatch([far], downtown).kind).toBe('none')
    expect(distanceMeters(downtown, downtown)).toBeLessThan(1)
    const box = boundsAroundPoint(downtown)
    expect(box.west).toBeLessThan(downtown.lng)
    expect(box.east).toBeGreaterThan(downtown.lng)
  })

  it('reads a city name for out-of-market GPS and never asks for owner data', async () => {
    const city = await cityFromCoordinates({
      point: { lng: -84.388, lat: 33.749 },
      accessToken: 'token',
      fetchImpl: async (url) => {
        expect(String(url)).toContain('types=place')
        expect(String(url)).not.toContain('owner')
        return {
          ok: true,
          json: async () => ({ features: [{ text: 'Atlanta' }] }),
        } as Response
      },
    })
    expect(city).toBe('Atlanta')
  })
})

describe('I’m at a home control', () => {
  it('is mobile-only, uses in-memory listings, and does not scrape parcels', () => {
    const page = readFileSync(join(here, '../../routes/index.tsx'), 'utf8')
    expect(page).toContain("I'm at a home")
    expect(page).toContain('readDeviceLocation')
    expect(page).toContain('classifyOnSiteMatch')
    expect(page).toContain('md:hidden')
    expect(page).not.toContain('qpublic')
    expect(page).not.toContain('OwnerName')
    expect(page).not.toContain('school_rating')
  })
})
