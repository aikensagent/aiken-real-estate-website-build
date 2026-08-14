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
  hoa_fee_frequency: string | null
  pool: string | null
  heating: string | null
  cooling: string | null
  architectural_style: string | null
  roof: string | null
  flooring: string | null
  fireplace: string | null
  basement: string | null
  parking: string | null
  patio_porch: string | null
  interior_features: string | null
  exterior_features: string | null
  new_construction: boolean | null
  waterfront: boolean | null
  on_market_date: string | null
  days_on_market: number | null
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
  'AssociationFeeFrequency',
  'Heating',
  'Cooling',
  'ArchitecturalStyle',
  'ListingId',
  'ListOfficeName',
  'PoolFeatures',
  'FireplaceYN',
  'FireplacesTotal',
  'FireplaceFeatures',
  'Roof',
  'Flooring',
  'Basement',
  'ParkingFeatures',
  'PatioAndPorchFeatures',
  'InteriorFeatures',
  'ExteriorFeatures',
  'NewConstructionYN',
  'WaterFrontYN',
  'GarageYN',
  'ListingContractDate',
  'OnMarketDate',
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
    hoa_fee_frequency: null,
    pool: null,
    heating: null,
    cooling: null,
    architectural_style: null,
    roof: null,
    flooring: null,
    fireplace: null,
    basement: null,
    parking: null,
    patio_porch: null,
    interior_features: null,
    exterior_features: null,
    new_construction: null,
    waterfront: null,
    on_market_date: null,
    days_on_market: null,
    list_office_name: null,
  }
}

export function mergePublicFacts(
  primary: ListingPublicFacts,
  fallback: ListingPublicFacts
): ListingPublicFacts {
  const empty = emptyListingPublicFacts()
  const keys = Object.keys(empty) as (keyof ListingPublicFacts)[]
  const merged = { ...empty }
  for (const key of keys) {
    const value = primary[key] ?? fallback[key]
    merged[key] = value as never
  }
  return merged
}

/** IDX courtesy line. Empty office → nothing. Never default to Nick’s shop. */
export function formatListingCourtesy(
  officeName?: string | null
): string | null {
  const name = typeof officeName === 'string' ? officeName.trim() : ''
  if (!name) return null
  return `Listing courtesy of ${name}.`
}

export type ListingOfficeRow = {
  id: string
  list_office_name: string
}

export function parseListingOfficeRows(data: unknown): ListingOfficeRow[] {
  if (!Array.isArray(data)) return []
  const rows: ListingOfficeRow[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const rec = item as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id.trim() : ''
    const name =
      typeof rec.list_office_name === 'string' ? rec.list_office_name.trim() : ''
    if (!id || !name) continue
    rows.push({ id, list_office_name: name.slice(0, 120) })
  }
  return rows
}

export function mergeListingOfficeNames<
  T extends { id: string; list_office_name?: string | null },
>(listings: T[], offices: ListingOfficeRow[]): T[] {
  if (offices.length === 0) return listings
  const byId = new Map(offices.map((row) => [row.id, row.list_office_name]))
  return listings.map((listing) => {
    const name = byId.get(listing.id)
    if (!name) return listing
    return { ...listing, list_office_name: name }
  })
}

export type ListingLivingAreaRow = {
  id: string
  sqft: number
}

export function parseListingLivingAreaRows(data: unknown): ListingLivingAreaRow[] {
  if (!Array.isArray(data)) return []
  const rows: ListingLivingAreaRow[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const rec = item as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id.trim() : ''
    const sqft = Number(rec.sqft)
    if (!id || !Number.isFinite(sqft) || sqft < 100 || sqft > 100000) continue
    rows.push({ id, sqft: Math.round(sqft) })
  }
  return rows
}

export function mergeListingLivingAreas<
  T extends { id: string; sqft?: number | null },
>(listings: T[], areas: ListingLivingAreaRow[]): T[] {
  if (areas.length === 0) return listings
  const byId = new Map(areas.map((row) => [row.id, row.sqft]))
  return listings.map((listing) => {
    const sqft = byId.get(listing.id)
    if (sqft == null) return listing
    return { ...listing, sqft }
  })
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

function yn(value: unknown): boolean | null {
  if (value === true || value === 'true' || value === 'Yes' || value === 'Y') {
    return true
  }
  if (value === false || value === 'false' || value === 'No' || value === 'N') {
    return false
  }
  return null
}

function isoDateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const stamp = Date.parse(value)
  if (!Number.isFinite(stamp)) return null
  return new Date(stamp).toISOString().slice(0, 10)
}

export function daysOnMarketFromDate(
  isoDate: string | null,
  now = Date.now()
): number | null {
  if (!isoDate) return null
  const stamp = Date.parse(isoDate)
  if (!Number.isFinite(stamp)) return null
  const days = Math.floor((now - stamp) / 86_400_000)
  if (days < 0 || days > 5000) return null
  return days
}

function formatFireplace(data: Record<string, unknown>): string | null {
  const total = firstNumber(data, ['FireplacesTotal'])
  if (total != null && total > 0 && total <= 20) {
    return total === 1 ? '1 fireplace' : `${Math.round(total)} fireplaces`
  }
  const flag = yn(data.FireplaceYN)
  if (flag === true) return firstString(data, ['FireplaceFeatures'], 120) || 'Yes'
  if (flag === false) return 'No'
  return firstString(data, ['FireplaceFeatures'], 120)
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
  const poolYn = yn(data.PoolPrivateYN)
  const poolFeatures = firstString(data, ['PoolFeatures'], 120)
  const pool =
    poolYn === true
      ? poolFeatures || 'private pool'
      : poolFeatures
  const onMarket =
    isoDateOnly(data.OnMarketDate) || isoDateOnly(data.ListingContractDate)
  const garageSpaces = firstNumber(data, ['GarageSpaces'])
  const garageYn = yn(data.GarageYN)

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
    garage_spaces:
      garageSpaces != null && garageSpaces >= 0 && garageSpaces <= 20
        ? garageSpaces
        : garageYn === true
          ? 1
          : null,
    subdivision: firstString(data, ['SubdivisionName'], 120),
    hoa_fee: firstNumber(data, ['AssociationFee']),
    hoa_fee_frequency: firstString(data, ['AssociationFeeFrequency'], 40),
    pool,
    heating: firstString(data, ['Heating'], 120),
    cooling: firstString(data, ['Cooling'], 120),
    architectural_style: firstString(data, ['ArchitecturalStyle'], 120),
    roof: firstString(data, ['Roof'], 80),
    flooring: firstString(data, ['Flooring'], 120),
    fireplace: formatFireplace(data),
    basement: firstString(data, ['Basement'], 120),
    parking: firstString(data, ['ParkingFeatures'], 120),
    patio_porch: firstString(data, ['PatioAndPorchFeatures'], 120),
    interior_features: firstString(data, ['InteriorFeatures'], 200),
    exterior_features: firstString(data, ['ExteriorFeatures'], 200),
    new_construction: yn(data.NewConstructionYN),
    waterfront: yn(data.WaterFrontYN),
    on_market_date: onMarket,
    days_on_market: daysOnMarketFromDate(onMarket),
    list_office_name: firstString(data, ['ListOfficeName'], 120),
  }
}

export type ListingFactRow = {
  key: string
  label: string
  value: string
}

function yesNo(value: boolean | null): string | null {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return null
}

/** Property facts only. Never schools, crime, or who lives nearby. */
export function formatListingFactRows(
  facts: ListingPublicFacts,
  extras?: {
    mls_id?: string | null
    price?: number | null
    beds?: number | null
    baths?: number | null
  }
): ListingFactRow[] {
  const rows: ListingFactRow[] = []
  const push = (key: string, label: string, value: string | null | undefined) => {
    if (value == null || !String(value).trim()) return
    rows.push({ key, label, value: String(value).trim() })
  }

  if (extras?.price != null) {
    push('price', 'Price', `$${Number(extras.price).toLocaleString()}`)
  }
  if (extras?.beds != null) push('beds', 'Beds', String(extras.beds))
  if (extras?.baths != null) push('baths', 'Baths', String(extras.baths))
  if (facts.sqft != null) {
    push('sqft', 'Living area', `${facts.sqft.toLocaleString()} sqft`)
  }
  if (facts.year_built != null) {
    push('year_built', 'Year built', String(facts.year_built))
  }
  if (facts.lot_size_acres != null) {
    push('lot_size_acres', 'Lot', `${facts.lot_size_acres} acres`)
  }
  push('property_subtype', 'Type', facts.property_subtype)
  if (facts.stories != null) push('stories', 'Stories', String(facts.stories))
  if (facts.garage_spaces != null) {
    push('garage_spaces', 'Garage', String(facts.garage_spaces))
  }
  push('subdivision', 'Subdivision', facts.subdivision)
  if (facts.hoa_fee != null) {
    const fee = `$${Number(facts.hoa_fee).toLocaleString()}`
    push(
      'hoa_fee',
      'HOA',
      facts.hoa_fee_frequency ? `${fee} ${facts.hoa_fee_frequency}` : fee
    )
  }
  push('pool', 'Pool', facts.pool)
  push('heating', 'Heat', facts.heating)
  push('cooling', 'Cool', facts.cooling)
  push('architectural_style', 'Style', facts.architectural_style)
  push('roof', 'Roof', facts.roof)
  push('flooring', 'Flooring', facts.flooring)
  push('fireplace', 'Fireplace', facts.fireplace)
  push('basement', 'Basement', facts.basement)
  push('parking', 'Parking', facts.parking)
  push('patio_porch', 'Patio / porch', facts.patio_porch)
  push('interior_features', 'Interior', facts.interior_features)
  push('exterior_features', 'Exterior', facts.exterior_features)
  push('new_construction', 'New construction', yesNo(facts.new_construction))
  push('waterfront', 'Waterfront', yesNo(facts.waterfront))
  if (facts.days_on_market != null) {
    push(
      'days_on_market',
      'Days on market',
      facts.days_on_market === 1 ? '1 day' : `${facts.days_on_market} days`
    )
  }
  push('list_office_name', 'Listing office', facts.list_office_name)
  if (extras?.mls_id) push('mls_id', 'MLS', extras.mls_id)
  return rows
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

export function listingShareMeta(listing: {
  address?: string | null
  price?: number | null
  beds?: number | null
  baths?: number | null
  photos?: string[]
  facts?: { sqft?: number | null }
}): { title: string; description: string; image: string | null } {
  const address = listing.address?.trim() || 'Aiken listing'
  const title = `${address} | Nick Williams`
  const bits: string[] = []
  if (listing.price && listing.price > 0) {
    bits.push(
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(listing.price)
    )
  }
  if (listing.beds && listing.beds > 0) bits.push(`${listing.beds} bed`)
  if (listing.baths && listing.baths > 0) bits.push(`${listing.baths} bath`)
  const sqft = listing.facts?.sqft
  if (sqft && sqft > 0) bits.push(`${sqft.toLocaleString('en-US')} sq ft`)
  const description = bits.length
    ? `${bits.join(' · ')} in Aiken, South Carolina. Listed with Nick Williams, Coldwell Banker Best Life Realty. Equal Housing Opportunity.`
    : 'Aiken, South Carolina home listed with Nick Williams, Coldwell Banker Best Life Realty. Equal Housing Opportunity.'
  const image =
    listing.photos?.find((url) => url.startsWith('https://')) ?? null
  return { title, description, image }
}
