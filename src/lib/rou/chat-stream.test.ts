import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('Rou chat streaming path', () => {
  it('exposes chatStream beside the non-streaming chat server fn', () => {
    const chat = readFileSync(join(here, '../../routes/api/-chat.ts'), 'utf8')
    expect(chat).toMatch(/export const chatStream/)
    expect(chat).toMatch(/stream:\s*true/)
    expect(chat).toMatch(/redactPII/)
    expect(chat).toMatch(/checkFairHousing/)
    expect(chat).toMatch(/ROU_SYSTEM_PROMPT/)
    expect(chat).toMatch(/formatRoutedTimesBlock/)
    expect(chat).toMatch(/buildAmenityRouteOverlay/)
    expect(chat).toMatch(/resolveNamedPlace/)
    expect(chat).toMatch(/formatNamedPlaceBlock/)
    expect(chat).toMatch(/formatSelectedListingBlock/)
    expect(chat).toMatch(/parseSelectedListing/)
    expect(chat).toMatch(/loadListingPublicFacts/)
    expect(chat).toMatch(/loadListingPriceHistory/)
    expect(chat).toMatch(/formatPriceSeenBlock/)
    expect(chat).toMatch(/countyRecordsForListing/)
    expect(chat).toMatch(/price history/)
    expect(chat).toMatch(/recordChatLeadEvent/)
    expect(chat).not.toMatch(/from ['"][^'"]*rou\/node-b['"]/)
    expect(chat).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
  })

  it('routes ChatWidget through streamCompanionChat without Node A imports', () => {
    const widget = readFileSync(
      join(here, '../../components/ChatWidget.tsx'),
      'utf8'
    )
    const companion = readFileSync(join(here, 'companion-chat.ts'), 'utf8')
    expect(widget).toMatch(/streamCompanionChat/)
    expect(widget).toMatch(/hydrateTransientChat/)
    expect(widget).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(widget).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
    expect(widget).not.toMatch(/from ['"][^'"]*chat-lead-score['"]/)
    expect(companion).toMatch(/streamChatMessage/)
    expect(companion).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(companion).not.toMatch(/from ['"][^'"]*lead-memory['"]/)
  })
})
