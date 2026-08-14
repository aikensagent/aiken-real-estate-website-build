/** Official Aiken County assessor search — link out only. Do not scrape. */
export const AIKEN_COUNTY_PROPERTY_SEARCH_URL = 'https://www.qpublic.net/sc/aiken/'

export type ListingPublicFacts = {
  sqft: number | null
  year_built: number | null
  lot_size_acres: number | null
  property_subtype: string | null
  remarks: string | null
  stories: number | null
  garage_spaces: number | null
  subdivision: string | null
  hoa_fee: number | null
  pool: string | null
  heating: string | null
  cooling: string | null
  list_office_name: string | null
}

/** Spark $select for one listing — public IDX facts only. Keep in sync with ingest. */
export const PUBLIC_RESO_SELECT = [
  'BuildingAreaTotal',
  'YearBuilt',
  'LotSizeAcres',
  'PropertySubType',
  'PublicRemarks',
  'GarageSpaces',
  'SubdivisionName',
  'AssociationFee',
  'Heating',
  'Cooling',
  'ArchitecturalStyle',
  'ListingId',
  'ListOfficeName',
].join(',')

export const PUBLIC_RESO_SELECT_MIN = [
  'BuildingAreaTotal',
  'YearBuilt',
  'LotSizeAcres',
  'PropertySubType',
].join(',')

const LISTING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_LISTING_PHOTOS = 40

export function isListingId(value: string): boolean {
  return LISTING_ID_RE.test(value.trim())
}

function isHttpsPhotoUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

/** Public listing photos only — https MediaURL, ordered, no owner docs. */
export function extractListingPhotos(
  mlsData: unknown,
  fallbackUrl?: string | null
): string[] {
  const data = flattenMlsPayload(mlsData)
  const media = data.Media
  const ordered: { url: string; order: number }[] = []

  if (Array.isArray(media)) {
    for (const item of media) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const rec = item as Record<string, unknown>
      if (!isHttpsPhotoUrl(rec.MediaURL)) continue
      ordered.push({
        url: rec.MediaURL,
        order: finiteNumber(rec.Order) ?? 999,
      })
    }
  }

  ordered.sort((a, b) => a.order - b.order)
  const urls: string[] = []
  const seen = new Set<string>()
  for (const item of ordered) {
    if (seen.has(item.url)) continue
    seen.add(item.url)
    urls.push(item.url)
  }

  if (isHttpsPhotoUrl(fallbackUrl) && !seen.has(fallbackUrl)) {
    urls.unshift(fallbackUrl)
  }

  return urls.slice(0, MAX_LISTING_PHOTOS)
}

export function emptyListingPublicFacts(): ListingPublicFacts {
  return {
    sqft: null,
    year_built: null,
    lot_size_acres: null,
    property_subtype: null,
    remarks: null,
    stories: null,
    garage_spaces: null,
    subdivision: null,
    hoa_fee: null,
    pool: null,
    heating: null,
    cooling: null,
    list_office_name: null,
  }
}

export function mergePublicFacts(
  primary: ListingPublicFacts,
  fallback: ListingPublicFacts
): ListingPublicFacts {
  return {
    sqft: primary.sqft ?? fallback.sqft,
    year_built: primary.year_built ?? fallback.year_built,
    lot_size_acres: primary.lot_size_acres ?? fallback.lot_size_acres,
    property_subtype: primary.property_subtype ?? fallback.property_subtype,
    remarks: primary.remarks ?? fallback.remarks,
    stories: primary.stories ?? fallback.stories,
    garage_spaces: primary.garage_spaces ?? fallback.garage_spaces,
    subdivision: primary.subdivision ?? fallback.subdivision,
    hoa_fee: primary.hoa_fee ?? fallback.hoa_fee,
    pool: primary.pool ?? fallback.pool,
    heating: primary.heating ?? fallback.heating,
    cooling: primary.cooling ?? fallback.cooling,
    list_office_name: primary.list_office_name ?? fallback.list_office_name,
  }
}

/** IDX courtesy line. Empty office → nothing. Never default to Nick’s shop. */
export function formatListingCourtesy(
  officeName?: string | null
): string | null {
  const name = typeof officeName === 'string' ? officeName.trim() : ''
  if (!name) return null
  return `Listing courtesy of ${name}.`
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function firstNumber(
  data: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const n = finiteNumber(data[key])
    if (n != null) return n
  }
  return null
}

function firstString(
  data: Record<string, unknown>,
  keys: string[],
  max = 80
): string | null {
  for (const key of keys) {
    const v = data[key]
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, max)
    if (Array.isArray(v)) {
      const joined = v
        .filter((item) => typeof item === 'string' && item.trim())
        .join(', ')
      if (joined) return joined.slice(0, max)
    }
  }
  return null
}

function flattenMlsPayload(mlsData: unknown): Record<string, unknown> {
  if (!mlsData || typeof mlsData !== 'object' || Array.isArray(mlsData)) {
    return {}
  }
  const obj = mlsData as Record<string, unknown>
  const flat = { ...obj }
  const nested = obj.StandardFields
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    Object.assign(flat, nested)
  }
  return flat
}

/** Allowlisted RESO keys only — never owner name, never the raw MLS blob. */
export function extractPublicListingFacts(
  mlsData: unknown
): ListingPublicFacts {
  const data = flattenMlsPayload(mlsData)

  const sqftRaw = firstNumber(data, [
    'BuildingAreaTotal',
    'LivingArea',
    'AboveGradeFinishedArea',
  ])
  const yearRaw = firstNumber(data, ['YearBuilt', 'Year Built2'])
  const acresRaw = firstNumber(data, ['LotSizeAcres'])
  const poolYn = data.PoolPrivateYN
  const pool =
    poolYn === true || poolYn === 'true'
      ? 'private pool'
      : firstString(data, ['PoolFeatures'])

  return {
    sqft:
      sqftRaw != null && sqftRaw >= 100 && sqftRaw <= 100000
        ? Math.round(sqftRaw)
        : null,
    year_built:
      yearRaw != null && yearRaw >= 1800 && yearRaw <= 2030
        ? Math.round(yearRaw)
        : null,
    lot_size_acres:
      acresRaw != null && acresRaw > 0 && acresRaw <= 10000 ? acresRaw : null,
    property_subtype: firstString(data, ['PropertySubType']),
    remarks: firstString(data, ['PublicRemarks'], 800),
    stories: firstNumber(data, ['StoriesTotal']),
    garage_spaces: firstNumber(data, ['GarageSpaces']),
    subdivision: firstString(data, ['SubdivisionName'], 120),
    hoa_fee: firstNumber(data, ['AssociationFee']),
    pool,
    heating: firstString(data, ['Heating'], 120),
    cooling: firstString(data, ['Cooling'], 120),
    list_office_name: firstString(data, ['ListOfficeName'], 120),
  }
}

export function isAikenCountyAddress(
  address?: string | null,
  city?: string | null,
  zip?: string | null
): boolean {
  const hay = `${address ?? ''} ${city ?? ''} ${zip ?? ''}`.toLowerCase()
  if (hay.includes('edgefield')) return false
  return /\baiken\b/.test(hay) || /\b2980[135]\b/.test(hay)
}

export function formatCountyRecordsBlock(opts: {
  address?: string | null
  inAikenCounty: boolean
}): string {
  if (!opts.inAikenCounty) {
    return [
      'COUNTY RECORDS: this address is outside the Aiken County lookup we offer.',
      'Do not invent tax, assessed value, or year-built from a county site.',
      'Offer Nick if they need help with records.',
    ].join('\n')
  }

  const search = (opts.address || '').trim() || 'the listing address'
  return [
    'COUNTY RECORDS (official lookup only — do not scrape, do not invent assessed value or taxes):',
    `If a fact is missing from SELECTED HOME, invite them to search this address on the Aiken County property site: ${AIKEN_COUNTY_PROPERTY_SEARCH_URL}`,
    `Search for: ${search}`,
    'Say county assessment data can differ from the MLS listing. Offer Nick if they want help reading it.',
  ].join('\n')
}
