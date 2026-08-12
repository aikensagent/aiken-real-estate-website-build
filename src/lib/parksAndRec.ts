export type ParkType =
  | 'park'
  | 'playground'
  | 'tennis'
  | 'pickleball'
  | 'basketball'
  | 'soccer'
  | 'baseball'
  | 'disc-golf'
  | 'sports-complex'

export interface ParkFacility {
  id: string
  name: string
  type: ParkType
  lng: number
  lat: number
  note?: string
}

/**
 * Curated public parks, playgrounds & sports facilities
 * Aiken + North Augusta — keep density intentional.
 *
 * Coordinates and listed amenities are taken from OpenStreetMap
 * (leisure=park/playground/pitch/nature_reserve, queried by name and
 * cross-referenced against sport-tagged pitches within 350m of each site).
 * Do not add a site without a verified coordinate.
 */
export const parksAndRec: ParkFacility[] = [
  // ——— Aiken ———
  {
    id: 'hitchcock-woods',
    name: 'Hitchcock Woods',
    type: 'park',
    lng: -81.7523,
    lat: 33.5444,
    note: 'Urban forest preserve with miles of sand trails for walking and riding',
  },
  {
    id: 'virginia-acres',
    name: 'Virginia Acres Park / Odell Weeks',
    type: 'sports-complex',
    lng: -81.7209,
    lat: 33.5275,
    note: 'Tennis and pickleball courts, soccer, playground, activities center',
  },
  {
    id: 'citizens-park',
    name: 'Citizens Park',
    type: 'baseball',
    lng: -81.6911,
    lat: 33.5384,
    note: 'Nine ball fields plus soccer fields',
  },
  {
    id: 'hopelands-gardens',
    name: 'Hopelands Gardens',
    type: 'park',
    lng: -81.7229,
    lat: 33.548,
    note: 'Historic public gardens and quiet walking paths',
  },
  {
    id: 'eustis-park',
    name: 'Eustis Park',
    type: 'pickleball',
    lng: -81.7306,
    lat: 33.5679,
    note: 'Pickleball and tennis courts, basketball, playground',
  },
  {
    id: 'kalmia-hill',
    name: 'Kalmia Hill Park',
    type: 'playground',
    lng: -81.7579,
    lat: 33.5599,
    note: 'Playground with tennis and basketball courts',
  },
  {
    id: 'smith-hazel',
    name: 'Smith-Hazel Recreation Center',
    type: 'tennis',
    lng: -81.7101,
    lat: 33.5652,
    note: 'Recreation center with public tennis courts',
  },
  {
    id: 'carolina-bay-preserve',
    name: 'Carolina Bay Nature Preserve',
    type: 'park',
    lng: -81.7206,
    lat: 33.5321,
    note: 'Wetland preserve with boardwalk trails and wildlife viewing',
  },
  {
    id: 'generations-park',
    name: 'Generations Park',
    type: 'playground',
    lng: -81.6941,
    lat: 33.6006,
    note: 'Neighborhood playground and open green space',
  },

  // ——— Aiken County / Horse Creek Valley ———
  {
    id: 'boyd-pond-park',
    name: 'Boyd Pond Park',
    type: 'park',
    lng: -81.7933,
    lat: 33.4541,
    note: 'County park with a pond, playground, basketball and sand volleyball',
  },
  {
    id: 'langley-pond-park',
    name: 'Langley Pond Park',
    type: 'park',
    lng: -81.8374,
    lat: 33.5293,
    note: 'Lakeside county park and regional rowing venue',
  },
  {
    id: 'gregg-park',
    name: 'Gregg Park',
    type: 'sports-complex',
    lng: -81.7973,
    lat: 33.577,
    note: 'Tennis courts, ball fields and playground in Graniteville',
  },

  // ——— North Augusta ———
  {
    id: 'riverview-park',
    name: 'Riverview Park',
    type: 'sports-complex',
    lng: -81.9846,
    lat: 33.5004,
    note: 'Ball fields, tennis center, playground and Greeneway access',
  },
  {
    id: 'na-greeneway',
    name: 'North Augusta Greeneway Park',
    type: 'park',
    lng: -81.9699,
    lat: 33.4891,
    note: 'Access point for the paved Greeneway trail',
  },
  {
    id: 'brick-pond-park',
    name: 'Brick Pond Park',
    type: 'park',
    lng: -81.9762,
    lat: 33.4876,
    note: 'Wetland ponds, boardwalks and wildlife viewing',
  },
  {
    id: 'na-soccer-park',
    name: 'North Augusta Soccer Park',
    type: 'soccer',
    lng: -81.9868,
    lat: 33.4939,
    note: 'Four soccer fields plus sand volleyball',
  },
  {
    id: 'leroy-hammond-park',
    name: 'Col. LeRoy Hammond Park',
    type: 'sports-complex',
    lng: -81.9729,
    lat: 33.5331,
    note: 'Softball, multi-use fields, walking track and playground',
  },
  {
    id: 'hammonds-ferry-playground',
    name: "Hammond's Ferry Playground",
    type: 'playground',
    lng: -81.9812,
    lat: 33.49,
    note: 'Riverfront neighborhood playground',
  },
]

export const parkIconMap: Record<ParkType, string> = {
  park: '🌳',
  playground: '🛝',
  tennis: '🎾',
  pickleball: '🏓',
  basketball: '🏀',
  soccer: '⚽',
  baseball: '⚾',
  'disc-golf': '🥏',
  'sports-complex': '🏟️',
}

export const parkTypeLabels: Record<ParkType, string> = {
  park: 'Park / green space',
  playground: 'Playground',
  tennis: 'Tennis',
  pickleball: 'Pickleball',
  basketball: 'Basketball',
  soccer: 'Soccer',
  baseball: 'Ball fields',
  'disc-golf': 'Disc golf',
  'sports-complex': 'Sports complex',
}

const PARK_TYPE_ORDER: ParkType[] = [
  'park',
  'playground',
  'sports-complex',
  'tennis',
  'pickleball',
  'basketball',
  'soccer',
  'baseball',
  'disc-golf',
]

/** Only the types actually present in the data, so the legend can't drift from the map. */
export const PARK_LEGEND: Array<{ type: ParkType; icon: string; label: string }> =
  PARK_TYPE_ORDER.filter((type) => parksAndRec.some((p) => p.type === type)).map((type) => ({
    type,
    icon: parkIconMap[type],
    label: parkTypeLabels[type],
  }))
