import { supabase } from './supabase'
import {
  emptyListingPublicFacts,
  extractListingPhotos,
  extractPublicListingFacts,
  formatCountyRecordsBlock,
  isAikenCountyAddress,
  isListingId,
  mergePublicFacts,
  PUBLIC_RESO_SELECT,
  PUBLIC_RESO_SELECT_MIN,
  type ListingPublicFacts,
} from './listing-facts'
import {
  parsePriceSnapshots,
  type PriceSnapshot,
} from './price-history'

export { formatPriceSeenBlock } from './price-history'

export type ListingSummary = {
  id: string
  mls_id?: string | null
  address?: string | null
  price?: number | null
  beds?: number | null
  baths?: number | null
  lng?: number | null
  lat?: number | null
  sqft?: number | null
  year_built?: number | null
  lot_size_acres?: number | null
  property_subtype?: string | null
  remarks?: string | null
  stories?: number | null
  garage_spaces?: number | null
  subdivision?: string | null
  hoa_fee?: number | null
  pool?: string | null
  heating?: string | null
  cooling?: string | null
  list_office_name?: string | null
}

/** Raw listing rows, for callers that need coordinates rather than prose. */
export async function getListingRows(): Promise<ListingSummary[]> {
  const { data, error } = await supabase.rpc('get_listings_with_coords')

  if (error) {
    throw new Error(`get_listings_with_coords failed: ${error.message}`)
  }

  return (data as ListingSummary[] | null) ?? []
}

/** Format already-loaded rows into a short context block for Rou. */
export function formatListingsContext(
  listings: ListingSummary[],
  limit = 25
): string {
  if (listings.length === 0) {
    return 'LISTING DATA: no active listings currently loaded.'
  }

  const rows = listings.slice(0, limit)

  const lines = rows.map((l, i) => {
    const price =
      l.price != null ? `$${Number(l.price).toLocaleString()}` : 'Price on request'
    const beds = l.beds != null ? `${l.beds} bed` : 'beds n/a'
    const baths = l.baths != null ? `${l.baths} bath` : 'baths n/a'
    const addr = l.address || 'Address n/a'
    const mls = l.mls_id ? `MLS ${l.mls_id}` : 'MLS n/a'
    const extras = [
      l.sqft != null ? `${l.sqft.toLocaleString()} sqft` : null,
      l.year_built != null ? `built ${l.year_built}` : null,
    ]
      .filter(Boolean)
      .join(', ')
    return extras
      ? `${i + 1}. ${addr} — ${price} — ${beds} / ${baths} — ${extras} — ${mls}`
      : `${i + 1}. ${addr} — ${price} — ${beds} / ${baths} — ${mls}`
  })

  return [
    'CURRENT LOCAL LISTINGS (from our live inventory — use only these facts; do not invent prices or addresses):',
    ...lines,
    `Total shown: ${rows.length} of ${listings.length} loaded.`,
  ].join('\n')
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Facts for the home the visitor tapped — no photos, no extra PII. */
export function parseSelectedListing(
  origin?: {
    listingId?: string
    label?: string
    price?: number | null
    beds?: number | null
    baths?: number | null
  } | null
): ListingSummary | null {
  if (!origin) return null
  const id =
    typeof origin.listingId === 'string' && origin.listingId.trim()
      ? origin.listingId.trim()
      : ''
  const address =
    typeof origin.label === 'string' && origin.label.trim()
      ? origin.label.trim().slice(0, 160)
      : null
  const price = finiteOrNull(origin.price)
  const beds = finiteOrNull(origin.beds)
  const baths = finiteOrNull(origin.baths)
  if (!id && !address && price == null && beds == null && baths == null) {
    return null
  }
  return { id, address, price, beds, baths }
}

export function preferServerListing(
  selected: ListingSummary,
  inventory: ListingSummary[] | null
): ListingSummary {
  if (!selected.id || !inventory?.length) return selected
  const match = inventory.find((row) => row.id === selected.id)
  return match ?? selected
}

export function formatSelectedListingBlock(listing: ListingSummary): string {
  const price =
    listing.price != null
      ? `$${Number(listing.price).toLocaleString()}`
      : 'Price on request'
  const beds = listing.beds != null ? `${listing.beds} bed` : 'beds n/a'
  const baths = listing.baths != null ? `${listing.baths} bath` : 'baths n/a'
  const addr = listing.address || 'Address n/a'
  const parts = [`${addr} — ${price} — ${beds} / ${baths}`]
  if (listing.sqft != null) parts.push(`${listing.sqft.toLocaleString()} sqft`)
  if (listing.year_built != null) parts.push(`built ${listing.year_built}`)
  if (listing.lot_size_acres != null) {
    parts.push(`${listing.lot_size_acres} acres`)
  }
  if (listing.property_subtype) parts.push(listing.property_subtype)
  if (listing.stories != null) parts.push(`${listing.stories} stories`)
  if (listing.garage_spaces != null) {
    parts.push(`${listing.garage_spaces} garage`)
  }
  if (listing.subdivision) parts.push(listing.subdivision)
  if (listing.hoa_fee != null) {
    parts.push(`HOA $${Number(listing.hoa_fee).toLocaleString()}`)
  }
  if (listing.pool) parts.push(listing.pool)
  if (listing.heating) parts.push(`heat: ${listing.heating}`)
  if (listing.cooling) parts.push(`cool: ${listing.cooling}`)
  if (listing.list_office_name) {
    parts.push(`listed by ${listing.list_office_name}`)
  }

  const lines = [
    'SELECTED HOME (the listing they tapped — answer “this home” / details from these facts only):',
    parts.join(' — '),
  ]
  if (listing.mls_id) lines.push(`MLS ${listing.mls_id}`)
  if (listing.remarks) {
    lines.push(`Remarks: ${listing.remarks}`)
  }
  const missing = missingSelectedFacts(listing)
  if (missing.length > 0) {
    lines.push(
      `Missing from this packet (do not invent): ${missing.join(', ')}.`
    )
  }
  lines.push(
    'Do not invent square footage, year built, taxes, HOA, lot size, or features that are not listed here. If they want more homes, use CURRENT LOCAL LISTINGS when that block is present. If a fact is still missing, use the COUNTY RECORDS block (link only) or offer Nick.'
  )
  return lines.join('\n')
}

function missingSelectedFacts(listing: ListingSummary): string[] {
  const missing: string[] = []
  if (listing.sqft == null) missing.push('living area')
  if (listing.year_built == null) missing.push('year built')
  if (listing.lot_size_acres == null) missing.push('lot size')
  if (!listing.property_subtype) missing.push('property type')
  if (listing.stories == null) missing.push('stories')
  if (listing.garage_spaces == null) missing.push('garage')
  if (!listing.subdivision) missing.push('subdivision')
  if (listing.hoa_fee == null) missing.push('HOA')
  if (!listing.pool) missing.push('pool')
  if (!listing.heating) missing.push('heating')
  if (!listing.cooling) missing.push('cooling')
  if (!listing.list_office_name) missing.push('listing office')
  return missing
}

export async function loadListingPriceHistory(
  listingId: string
): Promise<PriceSnapshot[]> {
  const id = listingId.trim()
  if (!id) return []
  try {
    const { data, error } = await supabase.rpc('get_listing_price_history', {
      p_listing_id: id,
    })
    if (error) return []
    return parsePriceSnapshots(data)
  } catch {
    return []
  }
}

export async function loadListingPublicFacts(
  listingId: string
): Promise<ListingPublicFacts> {
  const empty = emptyListingPublicFacts()
  if (!listingId.trim()) return empty

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('mls_id, mls_data')
      .eq('id', listingId)
      .maybeSingle()
    if (error || !data) return empty

    const row = data as { mls_id?: string | null; mls_data?: unknown }
    const fromStore = extractPublicListingFacts(row.mls_data)
    if (
      fromStore.sqft != null &&
      fromStore.year_built != null &&
      fromStore.list_office_name
    ) {
      return fromStore
    }

    const fromSpark = await fetchSparkListingFacts(row.mls_id)
    return mergePublicFacts(fromStore, fromSpark)
  } catch {
    return empty
  }
}

async function fetchSparkListingFacts(
  mlsId?: string | null
): Promise<ListingPublicFacts> {
  const empty = emptyListingPublicFacts()
  const key = typeof mlsId === 'string' ? mlsId.trim() : ''
  const token = process.env['SPARK_ACCESS_TOKEN']
  if (!key || !token) return empty

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }

  try {
    const urls = [
      `https://replication.sparkapi.com/Version/3/Reso/OData/Property('${encodeURIComponent(key)}')?$select=${PUBLIC_RESO_SELECT}`,
      `https://replication.sparkapi.com/Version/3/Reso/OData/Property('${encodeURIComponent(key)}')?$select=${PUBLIC_RESO_SELECT_MIN}`,
      `https://replication.sparkapi.com/Version/3/Reso/OData/Property?$top=1&$filter=ListingKey eq '${key}'&$select=${PUBLIC_RESO_SELECT_MIN}`,
    ]
    for (const url of urls) {
      const res = await fetch(url, { headers })
      if (!res.ok) continue
      const payload = (await res.json()) as { value?: unknown[] } & Record<
        string,
        unknown
      >
      const entity = Array.isArray(payload.value) ? payload.value[0] : payload
      const facts = extractPublicListingFacts(entity)
      if (
        facts.sqft != null ||
        facts.year_built != null ||
        facts.list_office_name
      ) {
        return facts
      }
    }
    return empty
  } catch {
    return empty
  }
}

export function mergeListingFacts(
  listing: ListingSummary,
  facts: ListingPublicFacts
): ListingSummary {
  return {
    ...listing,
    sqft: listing.sqft ?? facts.sqft,
    year_built: listing.year_built ?? facts.year_built,
    lot_size_acres: listing.lot_size_acres ?? facts.lot_size_acres,
    property_subtype: listing.property_subtype ?? facts.property_subtype,
    remarks: listing.remarks ?? facts.remarks,
    stories: listing.stories ?? facts.stories,
    garage_spaces: listing.garage_spaces ?? facts.garage_spaces,
    subdivision: listing.subdivision ?? facts.subdivision,
    hoa_fee: listing.hoa_fee ?? facts.hoa_fee,
    pool: listing.pool ?? facts.pool,
    heating: listing.heating ?? facts.heating,
    cooling: listing.cooling ?? facts.cooling,
    list_office_name: listing.list_office_name ?? facts.list_office_name,
  }
}

export function countyRecordsForListing(listing: ListingSummary): string {
  return formatCountyRecordsBlock({
    address: listing.address,
    inAikenCounty: isAikenCountyAddress(listing.address),
  })
}

export type ListingDetail = {
  id: string
  mls_id: string | null
  address: string | null
  price: number | null
  beds: number | null
  baths: number | null
  lng: number | null
  lat: number | null
  photos: string[]
  facts: ListingPublicFacts
  inAikenCounty: boolean
  priceHistory: PriceSnapshot[]
}

type ListingTableRow = {
  id: string
  mls_id?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  price?: number | null
  beds?: number | null
  baths?: number | null
  mls_data?: unknown
}

function formatDetailAddress(row: ListingTableRow): string | null {
  const street = typeof row.address === 'string' ? row.address.trim() : ''
  const city = typeof row.city === 'string' ? row.city.trim() : ''
  if (street && city && street.toLowerCase().includes(city.toLowerCase())) {
    return street
  }
  const tail = [row.city, row.state, row.zip_code]
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .map((part) => part.trim())
    .join(', ')
  if (street && tail) return `${street}, ${tail}`
  return street || tail || null
}

/** One public listing for the detail page — facts, photos, coords. No owner PII. */
export async function loadListingDetail(
  listingId: string
): Promise<ListingDetail | null> {
  const id = listingId.trim()
  if (!isListingId(id)) return null

  try {
    const { data, error } = await supabase
      .from('listings')
      .select(
        'id, mls_id, address, city, state, zip_code, price, beds, baths, mls_data'
      )
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return null

    const row = data as ListingTableRow
    const fromStore = extractPublicListingFacts(row.mls_data)
    const needSpark =
      fromStore.sqft == null ||
      fromStore.year_built == null ||
      !fromStore.list_office_name

    const [fromSpark, rpcResult, historyResult] = await Promise.all([
      needSpark
        ? fetchSparkListingFacts(row.mls_id)
        : Promise.resolve(emptyListingPublicFacts()),
      supabase.rpc('get_listings_with_coords', {
        p_property_type: 'Residential',
      }),
      supabase.rpc('get_listing_price_history', { p_listing_id: id }),
    ])

    const facts = mergePublicFacts(fromStore, fromSpark)

    const rpcRows = Array.isArray(rpcResult.data) ? rpcResult.data : []
    const mapRow = rpcRows.find(
      (item): item is {
        id: string
        lng?: number | null
        lat?: number | null
        primary_photo_url?: string | null
      } =>
        Boolean(item) &&
        typeof item === 'object' &&
        (item as { id?: unknown }).id === id
    )

    const address = formatDetailAddress(row)
    return {
      id,
      mls_id: typeof row.mls_id === 'string' ? row.mls_id : null,
      address,
      price: finiteOrNull(row.price),
      beds: finiteOrNull(row.beds),
      baths: finiteOrNull(row.baths),
      lng: finiteOrNull(mapRow?.lng),
      lat: finiteOrNull(mapRow?.lat),
      photos: extractListingPhotos(row.mls_data, mapRow?.primary_photo_url),
      facts,
      inAikenCounty: isAikenCountyAddress(address, row.city, row.zip_code),
      priceHistory: historyResult.error
        ? []
        : parsePriceSnapshots(historyResult.data),
    }
  } catch {
    return null
  }
}