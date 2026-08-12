export type LatLng = { lng: number; lat: number }

/** A reference point for a question — usually the listing currently on screen. */
export type PlaygroundOrigin = LatLng & { label?: string }

export interface Amenity {
  id: string
  name: string
  lng: number
  lat: number
  /** Geographic label used in replies — location only, never a description of who lives there. */
  area: string
  /** parksAndRec id when the site already carries a permanent marker on the map. */
  mapFacilityId?: string
  /**
   * Named arterials running within 220 m of the site. Reaching it on foot
   * generally means crossing or following one of these.
   */
  majorRoads?: string[]
}

/** Retained name for the playground list, which is just an amenity record. */
export type Playground = Amenity

export interface School extends Amenity {
  level: 'elementary' | 'middle' | 'high' | 'other'
}

/**
 * Curated playgrounds Rou can search — Aiken, North Augusta and Horse Creek Valley.
 *
 * Coordinates come from OpenStreetMap `leisure=playground` geometry inside Aiken
 * County (ODbL), resolved to the enclosing named park. School playgrounds are
 * excluded because they are not public amenities, and unnamed subdivision
 * playgrounds are excluded because a site with no verifiable name is not worth
 * quoting. `majorRoads` lists the named OSM `highway=trunk|primary|secondary`
 * ways within 220 m of each site.
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
    id: 'eustis-park',
    name: 'Eustis Park',
    lng: -81.73161,
    lat: 33.56802,
    area: 'Aiken (west of downtown)',
  },
  {
    id: 'generations-park',
    name: 'Generations Park',
    lng: -81.69292,
    lat: 33.60026,
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
  {
    id: 'calhoun-park',
    name: 'Calhoun Park',
    lng: -81.96967,
    lat: 33.49542,
    area: 'North Augusta (Georgia Avenue)',
    majorRoads: ['Georgia Avenue (US 25 Business)'],
  },
]

/**
 * Curated schools — location reference only.
 *
 * Coordinates come from OpenStreetMap `amenity=school` inside Aiken County
 * (ODbL), limited to campuses that are currently operating. The historical
 * GNIS-imported community school sites scattered across the county are left
 * out, as are entries whose current name or location could not be pinned down.
 *
 * This list answers "how far" and nothing else. It carries no ratings, no test
 * scores and no attendance zones — zoning is set by the district, and a school
 * being closest does not mean an address is assigned to it.
 */
export const schools: School[] = [
  // ——— Aiken ———
  {
    id: 'aiken-high-school',
    name: 'Aiken High School',
    level: 'high',
    lng: -81.71289,
    lat: 33.57792,
    area: 'Aiken (north)',
    majorRoads: ['Rutland Drive (SC 118)'],
  },
  {
    id: 'south-aiken-high-school',
    name: 'South Aiken High School',
    level: 'high',
    lng: -81.71358,
    lat: 33.52184,
    area: 'Aiken (south)',
  },
  {
    id: 'kennedy-middle-school',
    name: 'Kennedy Middle School',
    level: 'middle',
    lng: -81.71305,
    lat: 33.52431,
    area: 'Aiken (south)',
    majorRoads: ['East Pine Log Road (SC 118 / SC 302)'],
  },
  {
    id: 'schofield-middle-school',
    name: 'Schofield Middle School',
    level: 'middle',
    lng: -81.7108,
    lat: 33.56113,
    area: 'Aiken (east of downtown)',
  },
  {
    id: 'millbrook-elementary-school',
    name: 'Millbrook Elementary School',
    level: 'elementary',
    lng: -81.71425,
    lat: 33.52663,
    area: 'Aiken (south)',
    majorRoads: ['East Pine Log Road (SC 118 / SC 302)'],
  },
  {
    id: 'chukker-creek-elementary-school',
    name: 'Chukker Creek Elementary School',
    level: 'elementary',
    lng: -81.71294,
    lat: 33.48466,
    area: 'Aiken (south, Chukker Creek)',
  },
  {
    id: 'east-aiken-school-of-the-arts',
    name: 'East Aiken School of the Arts',
    level: 'elementary',
    lng: -81.67454,
    lat: 33.55129,
    area: 'Aiken (east side)',
  },
  {
    id: 'aiken-scholars-academy',
    name: 'Aiken Scholars Academy',
    level: 'high',
    lng: -81.76883,
    lat: 33.57451,
    area: 'Aiken (USC Aiken campus)',
    majorRoads: ['Robert M. Bell Parkway (SC 118)'],
  },
  {
    id: 'st-mary-help-of-christians-school',
    name: 'St. Mary Help of Christians School',
    level: 'other',
    lng: -81.71769,
    lat: 33.55897,
    area: 'Aiken (downtown)',
    majorRoads: ['Richland Avenue East (US 1 / US 78)', 'Chesterfield Street South (SC 19)'],
  },
  {
    id: 'mead-hall-episcopal-school',
    name: 'Mead Hall Episcopal School (Aiken Prep campus)',
    level: 'other',
    lng: -81.7267,
    lat: 33.56478,
    area: 'Aiken (downtown)',
    majorRoads: ['Richland Avenue West (US 1 / US 78)'],
  },

  // ——— North Augusta / Belvedere ———
  {
    id: 'north-augusta-high-school',
    name: 'North Augusta High School',
    level: 'high',
    lng: -81.97449,
    lat: 33.5352,
    area: 'North Augusta',
  },
  {
    id: 'north-augusta-middle-school',
    name: 'North Augusta Middle School',
    level: 'middle',
    lng: -81.95046,
    lat: 33.49912,
    area: 'North Augusta',
  },
  {
    id: 'north-augusta-elementary-school',
    name: 'North Augusta Elementary School',
    level: 'elementary',
    lng: -81.96347,
    lat: 33.49276,
    area: 'North Augusta',
  },
  {
    id: 'paul-knox-middle-school',
    name: 'Paul Knox Middle School',
    level: 'middle',
    lng: -81.9703,
    lat: 33.52895,
    area: 'North Augusta',
  },
  {
    id: 'hammond-hill-elementary-school',
    name: 'Hammond Hill Elementary School',
    level: 'elementary',
    lng: -81.98194,
    lat: 33.51074,
    area: 'North Augusta',
  },
  {
    id: 'mossy-creek-elementary-school',
    name: 'Mossy Creek Elementary School',
    level: 'elementary',
    lng: -81.9596,
    lat: 33.54144,
    area: 'North Augusta (north)',
  },
  {
    id: 'highland-springs-middle-school',
    name: 'Highland Springs Middle School',
    level: 'middle',
    lng: -81.91399,
    lat: 33.52786,
    area: 'Belvedere',
  },
  {
    id: 'belvedere-elementary-school',
    name: 'Belvedere Elementary School',
    level: 'elementary',
    lng: -81.93662,
    lat: 33.52668,
    area: 'Belvedere',
  },

  // ——— Horse Creek Valley ———
  {
    id: 'midland-valley-high-school',
    name: 'Midland Valley High School',
    level: 'high',
    lng: -81.8651,
    lat: 33.52543,
    area: 'Langley / Graniteville',
  },
  {
    id: 'byrd-elementary-school',
    name: 'Byrd Elementary School',
    level: 'elementary',
    lng: -81.82921,
    lat: 33.58291,
    area: 'Graniteville',
  },
  {
    id: 'warrenville-elementary-school',
    name: 'Warrenville Elementary School',
    level: 'elementary',
    lng: -81.78569,
    lat: 33.52442,
    area: 'Warrenville',
  },
  {
    id: 'gloverville-elementary-school',
    name: 'Gloverville Elementary School',
    level: 'elementary',
    lng: -81.82474,
    lat: 33.52346,
    area: 'Gloverville',
  },
  {
    id: 'bath-elementary-school',
    name: 'Bath Elementary School',
    level: 'elementary',
    lng: -81.87122,
    lat: 33.50069,
    area: 'Bath',
  },
  {
    id: 'clearwater-elementary-school',
    name: 'Clearwater Elementary School',
    level: 'elementary',
    lng: -81.89622,
    lat: 33.49597,
    area: 'Clearwater',
    majorRoads: ['Augusta Road (SC 421)'],
  },
  {
    id: 'vaucluse-elementary-school',
    name: 'Vaucluse Elementary School',
    level: 'elementary',
    lng: -81.80616,
    lat: 33.60918,
    area: 'Vaucluse',
    majorRoads: ['Old Graniteville Highway (SC 191)'],
  },
  {
    id: 'aiken-county-career-technology-center',
    name: 'Aiken County Career & Technology Center',
    level: 'other',
    lng: -81.8434,
    lat: 33.52835,
    area: 'Warrenville',
    majorRoads: ['Jefferson Davis Highway (US 1 / US 78)'],
  },

  // ——— Wider Aiken County ———
  {
    id: 'silver-bluff-high-school',
    name: 'Silver Bluff High School',
    level: 'high',
    lng: -81.75956,
    lat: 33.41125,
    area: 'Aiken County (Silver Bluff, south of Aiken)',
  },
  {
    id: 'jackson-middle-school',
    name: 'Jackson Middle School',
    level: 'middle',
    lng: -81.7915,
    lat: 33.34153,
    area: 'Jackson',
    majorRoads: ['Atomic Road (SC 125)'],
  },
  {
    id: 'oakwood-windsor-elementary-school',
    name: 'Oakwood-Windsor Elementary School',
    level: 'elementary',
    lng: -81.57521,
    lat: 33.51612,
    area: 'Aiken County (Charleston Highway corridor)',
    majorRoads: ['Charleston Highway (US 78)'],
  },
  {
    id: 'windsor-elementary-school',
    name: 'Windsor Elementary School',
    level: 'elementary',
    lng: -81.51927,
    lat: 33.47764,
    area: 'Windsor',
  },
  {
    id: 'wagener-salley-high-school',
    name: 'Wagener-Salley High School',
    level: 'high',
    lng: -81.36582,
    lat: 33.6462,
    area: 'Wagener',
    majorRoads: ['Main Street South (SC 113)'],
  },
  {
    id: 'ridge-spring-monetta-high-school',
    name: 'Ridge Spring-Monetta High School',
    level: 'high',
    lng: -81.62566,
    lat: 33.82264,
    area: 'Ridge Spring / Monetta',
  },
]

/**
 * Curated grocery stores — full-line supermarkets and supercenters only.
 *
 * Coordinates come from OpenStreetMap `shop=supermarket` inside Aiken County
 * (ODbL), plus the two Targets/Walmarts that carry a full grocery department.
 * Convenience stores, dollar stores and wholesale suppliers are left out.
 * Several chains have more than one Aiken location, so each name carries its
 * road to keep them apart.
 */
export const groceryStores: Amenity[] = [
  // ——— Aiken ———
  {
    id: 'publix-eastgate',
    name: 'Publix (Eastgate Drive)',
    lng: -81.71639,
    lat: 33.5113,
    area: 'Aiken (Eastgate, off Whiskey Road)',
  },
  {
    id: 'publix-silver-bluff',
    name: 'Publix (Silver Bluff Road)',
    lng: -81.74786,
    lat: 33.49596,
    area: 'Aiken (Silver Bluff Road)',
    majorRoads: ['Silver Bluff Road (SC 302)'],
  },
  {
    id: 'kroger-whiskey-road',
    name: 'Kroger (Whiskey Road)',
    lng: -81.72208,
    lat: 33.52368,
    area: 'Aiken (Whiskey Road)',
    majorRoads: ['Pine Log Road (SC 118 / SC 302)', 'Whiskey Road (SC 19)'],
  },
  {
    id: 'fresh-market-whiskey-road',
    name: 'The Fresh Market (Whiskey Road)',
    lng: -81.72278,
    lat: 33.53397,
    area: 'Aiken (Whiskey Road)',
    majorRoads: ['Whiskey Road (SC 19)'],
  },
  {
    id: 'aldi-whiskey-road',
    name: 'ALDI (Whiskey Road)',
    lng: -81.70955,
    lat: 33.50792,
    area: 'Aiken (south Whiskey Road)',
    majorRoads: ['Whiskey Road (SC 19)'],
  },
  {
    id: 'lowes-foods-whiskey-road',
    name: 'Lowes Foods (Whiskey Road)',
    lng: -81.70169,
    lat: 33.49895,
    area: 'Aiken (south Whiskey Road)',
    majorRoads: ['Whiskey Road (SC 19)'],
  },
  {
    id: 'walmart-whiskey-road',
    name: 'Walmart Supercenter (Whiskey Road)',
    lng: -81.71962,
    lat: 33.51813,
    area: 'Aiken (Whiskey Road)',
  },
  {
    id: 'target-whiskey-road',
    name: 'Target (Whiskey Road)',
    lng: -81.71176,
    lat: 33.50401,
    area: 'Aiken (south Whiskey Road)',
  },
  {
    id: 'walmart-richland-avenue',
    name: 'Walmart Supercenter (Richland Avenue West)',
    lng: -81.76731,
    lat: 33.56129,
    area: 'Aiken (Richland Avenue West)',
  },
  {
    id: 'food-lion-richland-avenue',
    name: 'Food Lion (Richland Avenue West)',
    lng: -81.74034,
    lat: 33.56625,
    area: 'Aiken (Richland Avenue West)',
    majorRoads: ['Richland Avenue West (US 1 / US 78)'],
  },
  {
    id: 'food-lion-silver-bluff',
    name: 'Food Lion (Silver Bluff Road)',
    lng: -81.735,
    lat: 33.51474,
    area: 'Aiken (Silver Bluff Road)',
    majorRoads: ['Silver Bluff Road (SC 302)'],
  },
  {
    id: 'kjs-market-york-street',
    name: "KJ's Market (York Street Northeast)",
    lng: -81.70255,
    lat: 33.57552,
    area: 'Aiken (north, York Street)',
    majorRoads: ['Rudy Mason Parkway (SC 118)', 'York Street Northeast (US 1)'],
  },

  // ——— North Augusta / Belvedere ———
  {
    id: 'publix-martintown',
    name: 'Publix (East Martintown Road)',
    lng: -81.9624,
    lat: 33.49592,
    area: 'North Augusta (Martintown Road)',
  },
  {
    id: 'kroger-knox-avenue',
    name: 'Kroger (Knox Avenue)',
    lng: -81.96041,
    lat: 33.5063,
    area: 'North Augusta (Knox Avenue)',
    majorRoads: ['Knox Avenue (US 25 / SC 121)'],
  },
  {
    id: 'aldi-knox-avenue',
    name: 'ALDI (Knox Avenue)',
    lng: -81.95927,
    lat: 33.50854,
    area: 'North Augusta (Knox Avenue)',
    majorRoads: ['Knox Avenue (US 25 / SC 121)'],
  },
  {
    id: 'walmart-knox-avenue',
    name: 'Walmart Supercenter (Knox Avenue)',
    lng: -81.9567,
    lat: 33.50123,
    area: 'North Augusta (Knox Avenue)',
  },
  {
    id: 'walmart-edgefield-road',
    name: 'Walmart Supercenter (Edgefield Road)',
    lng: -81.93506,
    lat: 33.57249,
    area: 'Belvedere (Edgefield Road)',
  },
  {
    id: 'food-lion-market-plaza',
    name: 'Food Lion (Market Plaza Drive)',
    lng: -81.93985,
    lat: 33.57002,
    area: 'Belvedere (Edgefield Road)',
    majorRoads: ['Edgefield Road (US 25 / SC 121)'],
  },

  // ——— Horse Creek Valley and wider county ———
  {
    id: 'food-lion-jefferson-davis',
    name: 'Food Lion (Jefferson Davis Highway)',
    lng: -81.84664,
    lat: 33.52616,
    area: 'Warrenville',
    majorRoads: ['Jefferson Davis Highway (US 1 / US 78)'],
  },
  {
    id: 'kjs-market-clearwater',
    name: "KJ's Market IGA (Clearwater)",
    lng: -81.89939,
    lat: 33.50251,
    area: 'Clearwater',
    majorRoads: ['Jefferson Davis Highway (US 1 / US 78)', 'Belvedere Road (SC 126)'],
  },
  {
    id: 'kjs-market-new-ellenton',
    name: "KJ's Market IGA (New Ellenton)",
    lng: -81.68694,
    lat: 33.42672,
    area: 'New Ellenton',
    majorRoads: ['North Main Street (SC 19)'],
  },
  {
    id: 'piggly-wiggly-wagener',
    name: 'Piggly Wiggly (Wagener)',
    lng: -81.36094,
    lat: 33.64973,
    area: 'Wagener',
    majorRoads: ['Railroad Avenue East (SC 39)', 'Main Street South (SC 113 / SC 302)'],
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

export type AmenityMatch<T extends Amenity = Amenity> = {
  amenity: T
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

export function findNearestAmenities<T extends Amenity>(
  list: T[],
  origin: LatLng,
  count = 3
): AmenityMatch<T>[] {
  return list
    .map((amenity) => {
      const miles = straightLineMiles(origin, amenity)
      const majorRoadsOnFoot = amenity.majorRoads ?? []
      const withinWalkRange = miles <= COMFORTABLE_WALK_MILES
      return {
        amenity,
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
      } satisfies AmenityMatch<T>
    })
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count)
}

export const findNearestPlaygrounds = (origin: LatLng, count = 3) =>
  findNearestAmenities(playgrounds, origin, count)

export const findNearestSchools = (origin: LatLng, count = 3) =>
  findNearestAmenities(schools, origin, count)

export const findNearestGroceryStores = (origin: LatLng, count = 3) =>
  findNearestAmenities(groceryStores, origin, count)

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

/** School-location intent. "Old school" and "school of thought" are excluded. */
export function mentionsSchool(text: string): boolean {
  const lower = text.toLowerCase()
  if (/(old school|school of thought)/.test(lower)) return false
  return (
    /\bschools?\b/.test(lower) ||
    /\b(elementary|middle school|high school|kindergarten)\b/.test(lower)
  )
}

/** Grocery intent, including the chains that operate in the area by name. */
export function mentionsGrocery(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    /\b(grocer|groceries|grocery|supermarket|super market)\b/.test(lower) ||
    /\b(publix|kroger|food lion|aldi|piggly wiggly|lowes foods|fresh market|walmart|target)\b/.test(
      lower
    )
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

const SCHOOL_OWNERSHIP = [
  'SCHOOL LOCATION QUESTIONS ARE YOURS TO ANSWER:',
  '- The data below is curated and verified for location and distance. Answer the "how far" part directly in your own first reply.',
  '- Never say you lack school location data or that they should go look at a map.',
  '- Hand off to Nick only for what the data cannot cover — attendance zoning for a specific address, enrollment paperwork, or a tour.',
].join('\n')

const SCHOOL_RULES = [
  'HOW TO ANSWER SCHOOL QUESTIONS — REQUIRED ORDER, DO NOT REARRANGE:',
  '1. Name the single closest school first, with its level (elementary, middle or high), the approximate distance and a rough drive time.',
  '2. In that same answer, say that Aiken County Public Schools sets attendance zones and that the closest school is not automatically the assigned one, so the district or Nick can confirm the zoned school for a specific address.',
  '3. Only after steps 1–2 may you list other nearby schools or ask a clarifying question.',
  '',
  'FAIR HOUSING — NON-NEGOTIABLE, OVERRIDES EVERYTHING ABOVE:',
  '- Give names, levels, distances and travel times only. You have no ratings, rankings, test scores or report cards, and you must not supply, estimate or imply them.',
  '- Never call a school or the area around it good, bad, better, worse, top, desirable, safe, or family-friendly, and never compare two schools in quality terms.',
  '- If asked which schools are best, or which area has the best schools, do not answer it. Say plainly that you do not rate schools or steer buyers by school quality, give the factual distances instead, and point them to the district and the state report card so they can judge for themselves.',
  '- Never use a school as a stand-in for describing who lives in an area. Any question about the makeup of a school or neighborhood gets the standard Fair Housing refusal, not a hedged answer.',
  '',
  'ACCURACY RULES:',
  '- These distances are straight-line ("as the crow flies"), so say "about" or "roughly" and never present a distance or time as exact.',
  '- Use only the schools listed here. Never invent a school, a program, a grade range, or an attendance boundary.',
  '- The list covers currently operating campuses in Aiken County. If asked about one you were not given, say you would need to confirm it rather than guessing.',
].join('\n')

const GROCERY_OWNERSHIP = [
  'GROCERY QUESTIONS ARE YOURS TO ANSWER:',
  '- The data below is curated and verified. Answer directly in your own first reply.',
  '- Never say you lack grocery data, and never route a "how far is the grocery store" question to Nick.',
].join('\n')

const GROCERY_RULES = [
  'HOW TO ANSWER GROCERY QUESTIONS — REQUIRED ORDER, DO NOT REARRANGE:',
  '1. Name the single closest store first, with the approximate distance and a rough drive time.',
  '2. If the closest one is flagged MAJOR ROAD ON FOOT, say that walking there means crossing or following that road and recommend driving.',
  '3. Only after that may you mention the other stores nearby, which is worth doing when they asked about a particular chain.',
  '',
  'ACCURACY RULES:',
  '- These distances are straight-line ("as the crow flies"), so say "about" or "roughly" and never present a distance or time as exact.',
  '- Use only the stores listed here. Never invent a store, its hours, its departments or its prices.',
  '- Several chains have more than one location in the area, so name the road along with the store to keep them apart.',
  '- Describe locations factually. Never characterize an area as better or worse to live in based on its shopping (Fair Housing).',
].join('\n')

function formatMatch(match: AmenityMatch, noun: string, detail = ''): string {
  const distance =
    match.miles < 0.1 ? 'under 0.1 mi' : `${match.miles.toFixed(1)} mi`
  const timing =
    match.walkMinutes != null
      ? `walk ~${match.walkMinutes} min / drive ~${match.driveMinutes} min`
      : `too far to walk — drive ~${match.driveMinutes} min`
  const line =
    `${match.amenity.name}${detail} — ${match.amenity.area} — ` +
    `${distance} straight-line — ${timing}`

  if (match.outsideLocalCoverage) {
    return `${line} | OUTSIDE COVERED AREA: this address is well outside Aiken and North Augusta, so this is only the closest one on file. Say that plainly and offer that there may be closer ${noun}s you do not have on file. Do not quote a walk time.`
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

type ContextSpec = {
  list: Amenity[]
  /** Singular noun used inside generated sentences. */
  noun: string
  ownership: string
  rules: string
  listHeading: string
  noOriginNote: string
  nearestHeading: (label: string) => string
  /** Extra qualifier printed straight after the name, e.g. a school's level. */
  detail?: (item: Amenity) => string
}

/**
 * Shared shape for every amenity prompt block: the whole list grouped by area
 * when there is nothing to measure from, or one precomputed closest match plus
 * held-back backups when there is.
 */
function buildAmenityContext(
  spec: ContextSpec,
  origin?: PlaygroundOrigin | null
): string {
  if (!origin) {
    const areas = [...new Set(spec.list.map((item) => item.area))]
    const lines = areas.flatMap((area) => [
      `${area}:`,
      ...spec.list
        .filter((item) => item.area === area)
        .map((item) => {
          const roads =
            item.majorRoads && item.majorRoads.length > 0
              ? ` | MAJOR ROAD ON FOOT: ${item.majorRoads.join(', ')}`
              : ''
          return `  - ${item.name}${spec.detail?.(item) ?? ''}${roads}`
        }),
    ])

    return [
      spec.ownership,
      '',
      spec.listHeading,
      ...lines,
      '',
      spec.noOriginNote,
      spec.rules,
    ].join('\n')
  }

  const [closest, ...backups] = findNearestAmenities(spec.list, origin, 3)
  const label = origin.label?.trim() || 'the location being discussed'

  return [
    spec.ownership,
    '',
    spec.nearestHeading(label),
    `CLOSEST — lead with this one, by name: ${formatMatch(closest, spec.noun, spec.detail?.(closest.amenity))}`,
    'BACKUP OPTIONS — hold these back until after the closest one is fully answered, and only if they help:',
    ...backups.map(
      (match) => `- ${formatMatch(match, spec.noun, spec.detail?.(match.amenity))}`
    ),
    '',
    spec.rules,
  ].join('\n')
}

/**
 * Prompt block for playground questions. With an origin the distances are
 * computed here so Rou never has to do geometry; without one she is told to ask
 * for a reference point instead of guessing.
 */
export function getPlaygroundContext(origin?: PlaygroundOrigin | null): string {
  return buildAmenityContext(
    {
      list: playgrounds,
      noun: 'neighborhood playground',
      ownership: DATA_OWNERSHIP,
      rules: ANSWER_RULES,
      listHeading:
        'CURATED PLAYGROUNDS BY AREA (verified coordinates — Aiken, North Augusta, Horse Creek Valley):',
      noOriginNote:
        'NO COORDINATES FOR THIS QUESTION: no address matched, so give no numeric distance or walk/drive time this turn. Still answer directly — name the playgrounds closest to the area they mentioned, straight from this list. Then in one short sentence ask which address or listing they are starting from so you can give exact distances next turn. Do not apologize, do not call the data missing, and do not hand off.',
      nearestHeading: (label) =>
        `NEAREST PLAYGROUNDS TO ${label} (already computed — use these numbers, do not recalculate):`,
    },
    origin
  )
}

/** Prompt block for school-location questions. Distances only — see SCHOOL_RULES. */
export function getSchoolContext(origin?: PlaygroundOrigin | null): string {
  return buildAmenityContext(
    {
      list: schools,
      noun: 'school',
      ownership: SCHOOL_OWNERSHIP,
      rules: SCHOOL_RULES,
      detail: (item) => {
        const level = (item as School).level
        return level === 'other' ? '' : ` [${level}]`
      },
      listHeading:
        'CURATED SCHOOLS BY AREA (verified coordinates, currently operating Aiken County campuses):',
      noOriginNote:
        'NO COORDINATES FOR THIS QUESTION: no address matched, so give no numeric distance this turn. Still answer directly — name the schools serving the area they mentioned, straight from this list. Then in one short sentence ask which address or listing they are starting from. Do not apologize and do not call the data missing.',
      nearestHeading: (label) =>
        `NEAREST SCHOOLS TO ${label} (already computed — use these numbers, do not recalculate):`,
    },
    origin
  )
}

/** Prompt block for grocery questions. */
export function getGroceryContext(origin?: PlaygroundOrigin | null): string {
  return buildAmenityContext(
    {
      list: groceryStores,
      noun: 'grocery store',
      ownership: GROCERY_OWNERSHIP,
      rules: GROCERY_RULES,
      listHeading:
        'CURATED GROCERY STORES BY AREA (verified coordinates — full-line supermarkets and supercenters):',
      noOriginNote:
        'NO COORDINATES FOR THIS QUESTION: no address matched, so give no numeric distance this turn. Still answer directly — name the stores in the area they mentioned, straight from this list. Then in one short sentence ask which address or listing they are starting from. Do not apologize and do not call the data missing.',
      nearestHeading: (label) =>
        `NEAREST GROCERY STORES TO ${label} (already computed — use these numbers, do not recalculate):`,
    },
    origin
  )
}
