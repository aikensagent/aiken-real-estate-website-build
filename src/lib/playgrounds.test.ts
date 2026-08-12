import { describe, expect, it } from 'vitest'
import { parksAndRec } from './parksAndRec'
import {
  COMFORTABLE_WALK_MILES,
  LOCAL_COVERAGE_MILES,
  WALK_REPORT_LIMIT_MILES,
  findNearestPlaygrounds,
  getPlaygroundContext,
  mentionsPlayground,
  playgrounds,
  resolveOriginFromMessage,
  straightLineMiles,
} from './playgrounds'

const LIBRARY_PARK = { lng: -81.72109, lat: 33.55482 }
const KALMIA_HILL = { lng: -81.75791, lat: 33.55939 }
const VIRGINIA_ACRES = { lng: -81.72086, lat: 33.52851 }

const LISTINGS = [
  { address: '123 Elm Street, Aiken, SC 29801', lng: -81.72, lat: 33.555 },
  { address: '456 Whiskey Road, Aiken, SC 29803', lng: -81.7209, lat: 33.5275 },
  {
    address: '789 Georgia Avenue, North Augusta, SC 29841',
    lng: -81.9608,
    lat: 33.512,
  },
]

describe('straightLineMiles', () => {
  it('is zero for the same point', () => {
    expect(straightLineMiles(LIBRARY_PARK, LIBRARY_PARK)).toBe(0)
  })

  it('measures a known Aiken pair', () => {
    // Library Park to the Virginia Acres playground is roughly 1.8 mi north-south
    const miles = straightLineMiles(LIBRARY_PARK, VIRGINIA_ACRES)
    expect(miles).toBeGreaterThan(1.7)
    expect(miles).toBeLessThan(1.9)
  })
})

describe('findNearestPlaygrounds', () => {
  it('returns matches sorted by distance', () => {
    const matches = findNearestPlaygrounds(LIBRARY_PARK, 3)
    expect(matches).toHaveLength(3)
    expect(matches[0].miles).toBeLessThanOrEqual(matches[1].miles)
    expect(matches[1].miles).toBeLessThanOrEqual(matches[2].miles)
  })

  it('recommends walking to a close site with no arterial beside it', () => {
    const [nearest] = findNearestPlaygrounds(KALMIA_HILL, 1)
    expect(nearest.playground.id).toBe('kalmia-hill-playground')
    expect(nearest.withinWalkRange).toBe(true)
    expect(nearest.majorRoadsOnFoot).toEqual([])
    expect(nearest.recommendation).toBe('walk')
  })

  it('recommends driving to a close site that sits on a major road', () => {
    const [nearest] = findNearestPlaygrounds(LIBRARY_PARK, 1)
    expect(nearest.playground.id).toBe('library-park')
    expect(nearest.withinWalkRange).toBe(true)
    expect(nearest.majorRoadsOnFoot).toContain('Whiskey Road (SC 19)')
    expect(nearest.recommendation).toBe('drive')
  })

  it('recommends driving when nothing is within walking range', () => {
    const [nearest] = findNearestPlaygrounds({ lng: -81.9, lat: 33.42 }, 1)
    expect(nearest.miles).toBeGreaterThan(COMFORTABLE_WALK_MILES)
    expect(nearest.withinWalkRange).toBe(false)
    expect(nearest.recommendation).toBe('drive')
  })

  it('stops quoting a walk time once the trip is clearly a drive', () => {
    // Ridge Spring is far outside the corridor the curated list covers
    const [nearest] = findNearestPlaygrounds({ lng: -81.4707, lat: 33.8474 }, 1)
    expect(nearest.miles).toBeGreaterThan(WALK_REPORT_LIMIT_MILES)
    expect(nearest.walkMinutes).toBeNull()
  })

  it('flags a distant origin as outside the covered area', () => {
    const [nearest] = findNearestPlaygrounds({ lng: -81.4707, lat: 33.8474 }, 1)
    expect(nearest.miles).toBeGreaterThan(LOCAL_COVERAGE_MILES)
    expect(nearest.outsideLocalCoverage).toBe(true)
  })

  it('keeps a walk time for a genuinely walkable trip', () => {
    const [nearest] = findNearestPlaygrounds(KALMIA_HILL, 1)
    expect(nearest.walkMinutes).not.toBeNull()
    expect(nearest.outsideLocalCoverage).toBe(false)
  })

  it('uses a faster average speed for longer drives', () => {
    const [inTown] = findNearestPlaygrounds(KALMIA_HILL, 1)
    const [longHaul] = findNearestPlaygrounds({ lng: -81.4707, lat: 33.8474 }, 1)
    const inTownMph = inTown.miles / (inTown.driveMinutes / 60)
    const longHaulMph = longHaul.miles / (longHaul.driveMinutes / 60)
    expect(longHaulMph).toBeGreaterThan(inTownMph)
  })
})

describe('mentionsPlayground', () => {
  it.each([
    'nearest playground?',
    'Is there a play ground close by?',
    'anywhere with a swing set nearby',
    'somewhere my kids can play at a park',
  ])('matches %j', (text) => {
    expect(mentionsPlayground(text)).toBe(true)
  })

  it.each([
    'how close is the nearest golf course',
    'any parks with tennis courts',
    'what is the property tax rate',
  ])('does not match %j', (text) => {
    expect(mentionsPlayground(text)).toBe(false)
  })
})

describe('resolveOriginFromMessage', () => {
  it('matches an abbreviated street mention to a listing', () => {
    const origin = resolveOriginFromMessage(
      'how far is the nearest playground from 123 Elm St?',
      LISTINGS
    )
    expect(origin?.label).toBe('123 Elm Street, Aiken, SC 29801')
    expect(origin?.lat).toBe(33.555)
  })

  it('matches a street name when only one listing sits on it', () => {
    const origin = resolveOriginFromMessage(
      'nearest playground to the Whiskey Road listing?',
      LISTINGS
    )
    expect(origin?.label).toBe('456 Whiskey Road, Aiken, SC 29803')
  })

  it('prefers the full number-and-street match over a street-only one', () => {
    const origin = resolveOriginFromMessage(
      'playground near 789 Georgia Avenue, not Whiskey Road',
      LISTINGS
    )
    expect(origin?.label).toBe('789 Georgia Avenue, North Augusta, SC 29841')
  })

  it('stays null when no address is named', () => {
    expect(resolveOriginFromMessage('nearest playground?', LISTINGS)).toBeNull()
  })

  it('stays null when a street is ambiguous', () => {
    const origin = resolveOriginFromMessage('playground near Elm Street', [
      ...LISTINGS,
      { address: '999 Elm Street, Aiken, SC 29801', lng: -81.71, lat: 33.56 },
    ])
    expect(origin).toBeNull()
  })

  it('ignores listings without coordinates', () => {
    const origin = resolveOriginFromMessage('playground near 123 Elm Street', [
      { address: '123 Elm Street, Aiken, SC 29801', lng: null, lat: null },
    ])
    expect(origin).toBeNull()
  })

  it('feeds a typed address straight into a computed closest answer', () => {
    const origin = resolveOriginFromMessage(
      'nearest playground to 456 Whiskey Rd?',
      LISTINGS
    )
    const context = getPlaygroundContext(origin)
    expect(context).toContain('CLOSEST — lead with this one')
    expect(context).toContain('456 Whiskey Road')
    expect(context).not.toContain('NO COORDINATES')
  })
})

describe('getPlaygroundContext', () => {
  it('answers from the list without distances when no origin is known', () => {
    const context = getPlaygroundContext(null)
    expect(context).toContain('NO COORDINATES FOR THIS QUESTION')
    expect(context).not.toContain('straight-line — walk')
  })

  it('forbids handoffs and data-gap excuses in both branches', () => {
    for (const context of [
      getPlaygroundContext(null),
      getPlaygroundContext(LIBRARY_PARK),
    ]) {
      expect(context).toContain('PLAYGROUND QUESTIONS ARE YOURS TO ANSWER')
      expect(context).toContain('Never say you lack playground data')
      expect(context).toContain('Never route a playground')
    }
  })

  it('precomputes distances and flags the road warning for an origin', () => {
    const context = getPlaygroundContext({
      ...LIBRARY_PARK,
      label: '123 Test Street',
    })
    expect(context).toContain('123 Test Street')
    expect(context).toContain('Library Park')
    expect(context).toContain('MAJOR ROAD ON FOOT: Whiskey Road (SC 19)')
  })

  it('marks a single closest site ahead of the backup options', () => {
    const context = getPlaygroundContext(LIBRARY_PARK)
    const closestAt = context.indexOf('CLOSEST — lead with this one')
    const backupsAt = context.indexOf('BACKUP OPTIONS')

    expect(closestAt).toBeGreaterThan(-1)
    expect(backupsAt).toBeGreaterThan(closestAt)

    // Exactly one site is presented as the lead
    const closestLine = context.slice(closestAt, backupsAt).trimEnd()
    expect(closestLine.split('\n')).toHaveLength(1)
    expect(closestLine).toContain('Library Park')
  })

  it('always carries the required order, safety and Fair Housing rules', () => {
    for (const context of [
      getPlaygroundContext(null),
      getPlaygroundContext(LIBRARY_PARK),
    ]) {
      expect(context).toContain('REQUIRED ORDER')
      expect(context).toContain('Name the single closest playground first')
      expect(context).toContain('busy main road')
      expect(context).toContain('Fair Housing')
    }
  })
})

describe('playground data', () => {
  it('has unique ids', () => {
    const ids = playgrounds.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps every coordinate inside the Aiken / North Augusta corridor', () => {
    for (const playground of playgrounds) {
      expect(playground.lng).toBeGreaterThan(-82.02)
      expect(playground.lng).toBeLessThan(-81.6)
      expect(playground.lat).toBeGreaterThan(33.42)
      expect(playground.lat).toBeLessThan(33.62)
    }
  })

  it('only points mapFacilityId at facilities that exist on the map', () => {
    const facilityIds = new Set(parksAndRec.map((f) => f.id))
    for (const playground of playgrounds) {
      if (playground.mapFacilityId) {
        expect(facilityIds).toContain(playground.mapFacilityId)
      }
    }
  })

  it('includes sites that are not on the map', () => {
    expect(playgrounds.some((p) => !p.mapFacilityId)).toBe(true)
  })
})
