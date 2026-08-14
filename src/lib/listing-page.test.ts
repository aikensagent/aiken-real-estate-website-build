import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const page = readFileSync(
  join(here, '../routes/listing.$listingId.tsx'),
  'utf8'
)
const cards = readFileSync(join(here, '../routes/index.tsx'), 'utf8')
const server = readFileSync(
  join(here, '../routes/api/-listing-detail.ts'),
  'utf8'
)

describe('listing detail page', () => {
  it('registers /listing/$listingId and loads through the server fn', () => {
    expect(page).toContain("createFileRoute('/listing/$listingId')")
    expect(page).toContain('getListingDetail')
    expect(page).toContain('throw notFound()')
    expect(page).toContain('origin={rouOrigin}')
    expect(page).toContain('listingId: listing.id')
    expect(server).toContain('loadListingDetail')
    expect(server).toContain("createServerFn({ method: 'GET' })")
  })

  it('keeps the listing pin map off the inventory Map and off Node A', () => {
    const pin = readFileSync(
      join(here, '../components/ListingPinMap.tsx'),
      'utf8'
    )
    expect(pin).toContain('satellite-streets-v12')
    expect(pin).toContain('Streets')
    expect(pin).toContain('Satellite')
    expect(pin).not.toMatch(/from ['"][^'"]*Map['"]/)
    expect(pin).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(pin).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
    expect(pin).not.toMatch(/#[0-9A-Fa-f]{3,8}/)
  })

  it('uses brand tokens, Nick handoff, and no invented-fact placeholders', () => {
    expect(page).toContain('bg-brand-cream')
    expect(page).toContain('text-brand-navy')
    expect(page).toContain('border-brand-gold')
    expect(page).toContain('Schedule a showing')
    expect(page).toContain('Request a showing')
    expect(page).toContain('requestBuyerShowing')
    expect(page).toContain('schedule-showing')
    expect(page).toContain('onShowingIntent')
    expect(page).toContain('RouThumbs')
    expect(page).toContain('ListingPinMap')
    expect(page).toContain('Price we’ve seen')
    expect(page).toContain('search={{ listingId: listing.id }}')
    expect(page).not.toContain('Tell Gholi')
    expect(page).toContain('SiteAccountLink')
    expect(page).toContain('tel:')
    expect(page).toContain('803-292-2921')
    expect(page).toContain('Call Nick')
    expect(page).toContain('border-brand-navy bg-white')
    expect(page).toContain('text-brand-cream')
    expect(page).toContain('AIKEN_COUNTY_PROPERTY_SEARCH_URL')
    expect(page).toContain('formatListingCourtesy')
    expect(page).toContain('list_office_name')
    expect(page).toContain('formatListingFactRows')
    expect(page).toContain('Add to compare')
    expect(page).toContain('SiteFooter')
    expect(cards).toContain('get_listing_living_areas')
    expect(page).not.toContain('Listing courtesy of Nick Williams')
    expect(page).toContain('aria-labelledby="listing-heading"')
    expect(page).not.toMatch(/#[0-9A-Fa-f]{3,8}/)
    expect(page).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(page).not.toMatch(/from ['"][^'"]*listings-context['"]/)
    expect(page).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
    expect(page).not.toContain('TODO')
    expect(page).not.toContain('lorem')
  })

  it('credits ListOfficeName from ingest and never a hardcoded Nick shop', () => {
    const ingest = readFileSync(
      join(here, '../../supabase/functions/mls-ingest/index.ts'),
      'utf8'
    )
    expect(ingest).toContain('ListOfficeName')
    expect(ingest).toContain('PoolFeatures')
    expect(ingest).toContain('FireplaceYN')
    expect(ingest).not.toContain('ListAgentFullName')
    expect(ingest).not.toContain('OwnerName')
    expect(page).toContain('formatListingCourtesy')
    expect(page).not.toContain('Coldwell Banker Best Life Realty listed')
  })

  it('sends homepage cards to the listing URL', () => {
    expect(cards).toContain('to="/listing/$listingId"')
    expect(cards).toContain('params={{ listingId: listing.id }}')
    expect(cards).toContain('Ask Rou')
    expect(cards).toContain('formatListingCourtesy')
    expect(cards).toContain('list_office_name')
    expect(cards).toContain('get_listing_office_names')
    expect(cards).toContain('get_listing_living_areas')
    expect(cards).toContain('mt-1 truncate text-sm text-brand-navy')
    expect(cards).toContain('RouThumbs')
    expect(cards).toContain('variant="card"')
    expect(cards).toContain('ListingCompareTray')
    expect(cards).toContain('handleToggleCompare')
    const map = readFileSync(join(here, '../components/Map.tsx'), 'utf8')
    expect(map).toContain('formatListingCourtesy')
    expect(map).toContain('courtesy')
    expect(map).toContain('font-size: 14px; line-height: 1.35; color: ${BRAND_NAVY}')
    expect(page).toContain('text-sm text-brand-navy')
    expect(cards).toContain('SiteAccountLink')
    expect(cards).toContain('Save this search')
    expect(cards).toContain('savedSearchId')
    const hero = readFileSync(join(here, '../components/Hero.tsx'), 'utf8')
    expect(hero).toContain('SiteAccountLink')
    expect(cards).toContain('validateSearch')
    expect(cards).toContain('returnListingId')
    expect(cards).toContain('boundsAroundPoint')
    expect(cards).toContain('setCameraFocus')
    expect(cards).toContain('grid-cols-1')
    expect(cards).not.toContain('sm:grid-cols-2')
    expect(cards).toContain('md:w-[420px]')
    expect(cards).toContain('lg:w-[480px]')
  })
})
