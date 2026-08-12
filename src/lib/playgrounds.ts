export type LatLng = { lng: number; lat: number }

/** A reference point for a question — usually the listing currently on screen. */
export type PlaygroundOrigin = LatLng & { label?: string }

export interface Playground {
  id: string
  name: string
  lng: number
  lat: number
  /** Geographic label used in replies — location only, never a description of who lives there. */
  area: string
  /** parksAndRec id when the site already carries a permanent marker on the map. */
  mapFacilityId?: string
  /**
   * Named arterials running within 220 m of the playground. Reaching the site on
   * foot generally means crossing or following one of these.
   */
  majorRoads?: string[]
}

/**
 * Curated playgrounds Rou can search — Aiken, North Augusta and Horse Creek Valley.
 *
 * Coordinates come from OpenStreetMap `leisure=playground` geometry inside Aiken
 * County (ODbL), resolved to the enclosing named park. School playgrounds are
 * excluded because they are not public amenities. `majorRoads` lists the named
 * OSM `highway=trunk|primary|secondary` ways within 220 m of each site.
 *
 * This list is intentionally broader than the map: several of these sites have no
 * permanent marker, and none of them should be added to the map layers just to
 * appear here. Do not add an entry without a verified coordinate.
 */
export const playgrounds: Playground[] = [
  // ——— Aiken ———
  {
    id: 'library-park',
    name: 'Library Park',
    lng: -81.72109,
    lat: 33.55482,
    area: 'Aiken (downtown)',
    majorRoads: ['Whiskey Road (SC 19)', 'Chesterfield Street South'],
  },
  {
    id: 'gyles-park',
    name: 'Gyles Park',
    lng: -81.71493,
    lat: 33.55727,
    area: 'Aiken (near Richland Avenue East)',
    majorRoads: ['Richland Avenue East (US 78)'],
  },
  {
    id: 'osbon-park',
    name: 'Osbon Park',
    lng: -81.71913,
    lat: 33.57266,
    area: 'Aiken (north of downtown)',
    majorRoads: ['Laurens Street Northwest (SC 19)'],
  },
  {
    id: 'charleston-street-playground',
    name: 'Charleston Street Playground',
    lng: -81.70274,
    lat: 33.5505,
    area: 'Aiken (east side)',
  },
  {
    id: 'perry-memorial-park',
    name: 'Perry Memorial Park',
    lng: -81.70672,
    lat: 33.5624,
    area: 'Aiken (east side)',
  },
  {
    id: 'hammond-williams-park',
    name: 'Hammond/Williams Park',
    lng: -81.6993,
    lat: 33.56584,
    area: 'Aiken (northeast)',
  },
  {
    id: 'crosland-park-playground',
    name: 'Crosland Park Playground',
    lng: -81.69979,
    lat: 33.58461,
    area: 'Aiken (Crosland Park)',
    majorRoads: ['Columbia Highway North (US 1)', 'York Street Northeast (US 1)'],
  },
  {
    id: 'kennedy-colony-playground',
    name: 'Kennedy Colony Playground',
    lng: -81.73699,
    lat: 33.57801,
    area: 'Aiken (northwest)',
  },
  {
    id: 'earnest-weaver-park',
    name: 'Earnest Weaver Park',
    lng: -81.72712,
    lat: 33.59038,
    area: 'Aiken (north)',
  },
  {
    id: 'kalmia-hill-playground',
    name: 'Kalmia Hill Park',
    lng: -81.75791,
    lat: 33.55939,
    area: 'Aiken (Kalmia Hill)',
    mapFacilityId: 'kalmia-hill',
  },
  {
    id: 'virginia-acres-playground',
    name: 'Virginia Acres Park playground',
    lng: -81.72086,
    lat: 33.52851,
    area: 'Aiken (Whiskey Road)',
    mapFacilityId: 'virginia-acres',
    majorRoads: ['Whiskey Road (SC 19)'],
  },

  // ——— Aiken County / Horse Creek Valley ———
  {
    id: 'gregg-park-playground',
    name: 'Gregg Park',
    lng: -81.7985,
    lat: 33.57601,
    area: 'Graniteville',
    mapFacilityId: 'gregg-park',
  },
  {
    id: 'aiken-county-rec-center',
    name: 'Aiken County Recreation Center',
    lng: -81.80596,
    lat: 33.55495,
    area: 'Aiken County (Jefferson Davis Highway, Horse Creek Valley)',
    majorRoads: ['Jefferson Davis Highway (US 1 / US 78)'],
  },
  {
    id: 'fun-valley-sassafras-park',
    name: 'Fun Valley Sassafras Park',
    lng: -81.85546,
    lat: 33.51177,
    area: 'Aiken County (Augusta Road corridor)',
    majorRoads: ['Augusta Road (SC 421)'],
  },
  {
    id: 'boyd-pond-playground',
    name: 'Boyd Pond Park',
    lng: -81.79339,
    lat: 33.45595,
    area: 'Aiken County (south of Aiken)',
    mapFacilityId: 'boyd-pond-park',
  },

  // ——— North Augusta ———
  {
    id: 'creighton-park',
    name: 'Creighton Park',
    lng: -81.97382,
    lat: 33.49505,
    area: 'North Augusta',
  },
  {
    id: 'bunting-park',
    name: 'Bunting Park',
    lng: -81.96076,
    lat: 33.51212,
    area: 'North Augusta (Georgia Avenue)',
    majorRoads: ['Georgia Avenue (US 25 Business)'],
  },
  {
    id: 'riverview-park-playground',
    name: 'Riverview Park',
    lng: -81.98419,
    lat: 33.50009,
    area: 'North Augusta',
    mapFacilityId: 'riverview-park',
  },
  {
    id: 'leroy-hammond-playground',
    name: 'Col. LeRoy Hammond Park',
    lng: -81.97279,
    lat: 33.5329,
    area: 'North Augusta',
    mapFacilityId: 'leroy-hammond-park',
  },
  {
    id: 'hammonds-ferry-playground',
    name: "Hammond's Ferry Playground",
    lng: -81.98121,
    lat: 33.49003,
    area: "North Augusta (Hammond's Ferry)",
    mapFacilityId: 'hammonds-ferry-playground',
  },
]

const EARTH_RADIUS_MILES = 3958.8
const WALK_SPEED_MPH = 3

/** Straight-line distance most people will still consider walking. */
export const COMFORTABLE_WALK_MILES = 1

/** Past this a walk time is noise rather than an option, so we stop quoting one. */
export const WALK_REPORT_LIMIT_MILES = 2

/** Past this the curated list has probably missed a closer neighborhood site. */
export const LOCAL_COVERAGE_MILES = 10

/** Short hops crawl on town streets; longer trips pick up main roads and highway. */
function driveSpeedMph(miles: number): number {
  if (miles <= 3) return 25
  if (miles <= 10) return 35
  return 45
}

export function straightLineMiles(from: LatLng, to: LatLng): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)))
}

export type PlaygroundMatch = {
  playground: Playground
  miles: number
  /** Null once the distance makes walking irrelevant. */
  walkMinutes: number | null
  driveMinutes: number
  withinWalkRange: boolean
  /** Far enough out that closer sites likely exist outside this data set. */
  outsideLocalCoverage: boolean
  /** Arterials a walking trip would likely have to cross or follow. */
  majorRoadsOnFoot: string[]
  recommendation: 'walk' | 'drive'
}

export function findNearestPlaygrounds(
  origin: LatLng,
  count = 3
): PlaygroundMatch[] {
  return playgrounds
    .map((playground) => {
      const miles = straightLineMiles(origin, playground)
      const majorRoadsOnFoot = playground.majorRoads ?? []
      const withinWalkRange = miles <= COMFORTABLE_WALK_MILES
      return {
        playground,
        miles,
        walkMinutes:
          miles <= WALK_REPORT_LIMIT_MILES
            ? Math.max(1, Math.round((miles / WALK_SPEED_MPH) * 60))
            : null,
        driveMinutes: Math.max(2, Math.round((miles / driveSpeedMph(miles)) * 60)),
        withinWalkRange,
        outsideLocalCoverage: miles > LOCAL_COVERAGE_MILES,
        majorRoadsOnFoot,
        recommendation:
          withinWalkRange && majorRoadsOnFoot.length === 0 ? 'walk' : 'drive',
      } satisfies PlaygroundMatch
    })
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count)
}

const STREET_WORDS: Record<string, string> = {
  rd: 'road',
  st: 'street',
  ave: 'avenue',
  av: 'avenue',
  dr: 'drive',
  ln: 'lane',
  ct: 'court',
  cir: 'circle',
  blvd: 'boulevard',
  hwy: 'highway',
  pkwy: 'parkway',
  pl: 'place',
  ter: 'terrace',
  trl: 'trail',
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
}

function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => STREET_WORDS[word] ?? word)
    .join(' ')
}

/** Anything with an address and coordinates — a listing row, in practice. */
export type AddressedPlace = {
  address?: string | null
  lng?: number | null
  lat?: number | null
}

/**
 * Pull a reference point out of the message itself, so a typed address gets a
 * real answer even when nothing is selected on screen. Matches "123 Elm St"
 * against "123 Elm Street", and falls back to a street name only when exactly
 * one place sits on it.
 */
export function resolveOriginFromMessage(
  message: string,
  places: AddressedPlace[]
): PlaygroundOrigin | null {
  const haystack = normalizeAddress(message)
  if (!haystack) return null

  const located = places.filter(
    (place) => place.address && place.lng != null && place.lat != null
  )

  let best: AddressedPlace | null = null
  let bestLength = 0
  const streetOnlyMatches: AddressedPlace[] = []

  for (const place of located) {
    const street = normalizeAddress((place.address ?? '').split(',')[0])
    if (!street) continue

    // Full "number + street" mention is the strongest signal
    if (/^\d/.test(street) && street.length >= 6 && haystack.includes(street)) {
      if (street.length > bestLength) {
        best = place
        bestLength = street.length
      }
      continue
    }

    // "the Whiskey Road listing" — only usable if one place is on that street
    const withoutNumber = street.replace(/^\d+\s+/, '')
    if (
      withoutNumber.includes(' ') &&
      withoutNumber.length >= 8 &&
      haystack.includes(withoutNumber)
    ) {
      streetOnlyMatches.push(place)
    }
  }

  const match =
    best ?? (streetOnlyMatches.length === 1 ? streetOnlyMatches[0] : null)
  if (!match) return null

  return {
    lng: match.lng as number,
    lat: match.lat as number,
    label: match.address ?? 'that address',
  }
}

/** Playground / kids-park intent. Plain "park" only counts alongside a kid word. */
export function mentionsPlayground(text: string): boolean {
  const lower = text.toLowerCase()
  if (/play\s?ground/.test(lower)) return true
  if (/(swing set|swings|jungle gym|monkey bars)/.test(lower)) return true
  return (
    /\bparks?\b/.test(lower) &&
    /(kid|kids|child|children|toddler|son|daughter|grandkid)/.test(lower)
  )
}

const DATA_OWNERSHIP = [
  'PLAYGROUND QUESTIONS ARE YOURS TO ANSWER:',
  '- The data below is curated and verified. For playgrounds it is authoritative, and it is enough to answer with.',
  '- Answer directly in your own first reply. Do not stall, do not ask permission, do not apologize.',
  '- Never say you lack playground data, cannot measure distance, or that they should check a map or another source.',
  '- Never route a playground or playground-distance question to Nick, a phone call, or the contact form. Handoff is for showings, offers, contracts and pricing strategy — not for this.',
].join('\n')

const ANSWER_RULES = [
  'HOW TO ANSWER PLAYGROUND QUESTIONS — REQUIRED ORDER, DO NOT REARRANGE:',
  '1. Name the single closest playground first. Nothing comes before it — no list of parks, no clarifying question, no preamble.',
  '2. In that same opening answer, give the approximate distance plus a rough walk time and a rough drive time.',
  '3. If the closest one is flagged MAJOR ROAD ON FOOT, say plainly in that same answer that getting there on foot means crossing or following that road, that it is a busy main road, and recommend driving. Never call that trip an easy or comfortable walk.',
  '4. Only after steps 1–3 are complete may you mention other playgrounds, add detail, or ask a clarifying question. Keep that follow-on to a sentence or two.',
  '',
  'ACCURACY RULES:',
  '- These distances are straight-line ("as the crow flies"). Real walking and driving routes are longer, so say "about" or "roughly" and never present a distance or time as exact.',
  '- If the closest playground is farther than about a mile, present it as a short drive rather than a walk.',
  '- Never quote a walk time that was not given to you. If an entry says the trip is drive-only, do not invent or estimate a walking figure — an hours-long walk is not an option worth mentioning.',
  '- If an entry is flagged OUTSIDE COVERED AREA, say plainly that it is the closest one you have on file, that the home sits outside Aiken and North Augusta, and that there may be closer neighborhood playgrounds you do not have on file.',
  '- When a CLOSEST entry is given to you, that is the answer — state it plainly. Do not hedge it, qualify it away, or ask a question before giving it.',
  '- Never list the backup options before the closest one, and never open with a question like "which area are you looking at?" when a closest option is already given to you.',
  '- Use only the playgrounds listed here. Never invent a playground, its equipment, hours, or amenities. If asked about a specific feature you were not given, say you would need to confirm it.',
  '- Several of these sites are not drawn on the map. Mentioning them is fine.',
  '- Describe locations and facilities factually. Never characterize an area as better or worse for families or children, and never steer based on familial status (Fair Housing).',
].join('\n')

function formatMatch(match: PlaygroundMatch): string {
  const distance =
    match.miles < 0.1 ? 'under 0.1 mi' : `${match.miles.toFixed(1)} mi`
  const timing =
    match.walkMinutes != null
      ? `walk ~${match.walkMinutes} min / drive ~${match.driveMinutes} min`
      : `too far to walk — drive ~${match.driveMinutes} min`
  const line =
    `${match.playground.name} — ${match.playground.area} — ` +
    `${distance} straight-line — ${timing}`

  if (match.outsideLocalCoverage) {
    return `${line} | OUTSIDE COVERED AREA: this address is well outside Aiken and North Augusta, so this is only the closest one on file. Say that plainly and offer that there may be closer neighborhood playgrounds you do not have on file. Do not quote a walk time.`
  }
  if (match.walkMinutes == null) {
    return `${line} | Drive only — do not offer a walk time`
  }
  if (match.majorRoadsOnFoot.length > 0) {
    return `${line} | MAJOR ROAD ON FOOT: ${match.majorRoadsOnFoot.join(', ')} — recommend driving`
  }
  if (!match.withinWalkRange) {
    return `${line} | Beyond comfortable walking range — treat as a drive`
  }
  return `${line} | No arterial recorded at this site — a walk is reasonable`
}

/**
 * Prompt block for playground questions. With an origin the distances are
 * computed here so Rou never has to do geometry; without one she is told to ask
 * for a reference point instead of guessing.
 */
export function getPlaygroundContext(origin?: PlaygroundOrigin | null): string {
  if (!origin) {
    const areas = [...new Set(playgrounds.map((p) => p.area))]
    const lines = areas.flatMap((area) => [
      `${area}:`,
      ...playgrounds
        .filter((playground) => playground.area === area)
        .map((playground) => {
          const roads =
            playground.majorRoads && playground.majorRoads.length > 0
              ? ` | MAJOR ROAD ON FOOT: ${playground.majorRoads.join(', ')}`
              : ''
          return `  - ${playground.name}${roads}`
        }),
    ])

    return [
      DATA_OWNERSHIP,
      '',
      'CURATED PLAYGROUNDS BY AREA (verified coordinates — Aiken, North Augusta, Horse Creek Valley):',
      ...lines,
      '',
      'NO COORDINATES FOR THIS QUESTION: no address matched, so give no numeric distance or walk/drive time this turn. Still answer directly — name the playgrounds closest to the area they mentioned, straight from this list. Then in one short sentence ask which address or listing they are starting from so you can give exact distances next turn. Do not apologize, do not call the data missing, and do not hand off.',
      ANSWER_RULES,
    ].join('\n')
  }

  const [closest, ...backups] = findNearestPlaygrounds(origin, 3)
  const label = origin.label?.trim() || 'the location being discussed'

  return [
    DATA_OWNERSHIP,
    '',
    `NEAREST PLAYGROUNDS TO ${label} (already computed — use these numbers, do not recalculate):`,
    `CLOSEST — lead with this one, by name: ${formatMatch(closest)}`,
    'BACKUP OPTIONS — hold these back until after the closest one is fully answered, and only if they help:',
    ...backups.map((match) => `- ${formatMatch(match)}`),
    '',
    ANSWER_RULES,
  ].join('\n')
}
