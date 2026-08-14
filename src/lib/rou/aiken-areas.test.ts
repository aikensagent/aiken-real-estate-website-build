import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { pointInAikenBbox } from './named-place'
import {
  AIKEN_AREA_CHIPS,
  boundsFromAreaFocus,
  geocodeAikenArea,
  matchAikenAreaChip,
  resolveAikenArea,
} from './aiken-areas'

const here = dirname(fileURLToPath(import.meta.url))

describe('Aiken area chips', () => {
  it('keeps every chip inside the coverage bbox', () => {
    expect(AIKEN_AREA_CHIPS.map((c) => c.label)).toEqual([
      'Downtown',
      'City of Aiken',
      'Hitchcock Woods',
      'North Augusta',
      'Graniteville',
    ])
    for (const chip of AIKEN_AREA_CHIPS) {
      expect(pointInAikenBbox(chip.lng, chip.lat)).toBe(true)
    }
  })

  it('matches chips without calling Mapbox', async () => {
    expect(matchAikenAreaChip('downtown aiken')?.id).toBe('downtown')
    expect(matchAikenAreaChip('North Augusta')?.label).toBe('North Augusta')
    const hit = await resolveAikenArea({
      query: 'Hitchcock Woods',
      accessToken: '',
      fetchImpl: async () => {
        throw new Error('geocode should not run for a chip')
      },
    })
    expect(hit?.id).toBe('hitchcock')
  })

  it('builds a bbox around the chip and refuses Fair Housing probes', async () => {
    const downtown = matchAikenAreaChip('Downtown')
    expect(downtown).not.toBeNull()
    const box = boundsFromAreaFocus(downtown!)
    expect(box.west).toBeLessThan(downtown!.lng)
    expect(box.east).toBeGreaterThan(downtown!.lng)
    expect(
      await resolveAikenArea({
        query: 'black neighborhood',
        accessToken: 'token',
      })
    ).toBeNull()
  })

  it('geocodes only inside the Aiken bbox', async () => {
    const hit = await geocodeAikenArea({
      query: 'Cedar Creek',
      accessToken: 'token',
      fetchImpl: async (url) => {
        expect(String(url)).toContain('bbox=')
        expect(String(url)).toContain('types=place,locality,neighborhood,address')
        return {
          ok: true,
          json: async () => ({
            features: [
              {
                text: 'Cedar Creek',
                center: [-81.78, 33.51],
              },
            ],
          }),
        } as Response
      },
    })
    expect(hit?.label).toBe('Cedar Creek')
    expect(hit?.id).toBe('geocode')
  })
})

describe('mobile area control', () => {
  it('is list-only on mobile and does not add a school-quality sort', () => {
    const home = readFileSync(join(here, '../../routes/index.tsx'), 'utf8')
    expect(home).toContain('id="listing-area"')
    expect(home).toContain('md:hidden')
    expect(home).toContain('AIKEN_AREA_CHIPS')
    expect(home).toContain('resolveAikenArea')
    expect(home).toContain('Where in Aiken')
    expect(home).not.toContain('school_rating')
    expect(home).not.toContain('navigator.geolocation')
  })
})
