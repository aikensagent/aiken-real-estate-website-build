import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contextMatrix } from '../context-matrix'
import {
  NODE_A_ALLOWED_RPCS,
  NODE_B_ALLOWED_RPCS,
  assertNodeARpc,
  assertNodeATableAccess,
  assertNodeBRpc,
  createInterfaceRou,
  createRouPersonaRouter,
  hydrateTransientMapState,
  persistTransientMapState,
  safeDefaultTransientMapState,
  applyTransientFilters,
  applyTransientViewport,
} from './index'
import type { LeadMemory } from '../lead-memory'
import type { CompanionDeps } from './node-b'
import type { RpcCaller } from './node-a'

const here = dirname(fileURLToPath(import.meta.url))

function installSessionStorage() {
  const store = new Map<string, string>()
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: () => null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: { sessionStorage },
    configurable: true,
  })
  return sessionStorage
}

const silentRpc: RpcCaller = async () => ({ data: [], error: null })

const emptyMemory = (sessionKey: string): LeadMemory => ({
  session_key: sessionKey,
  lead_id: null,
  notes: [],
  summaries: [],
  retrieved_at: new Date().toISOString(),
})

const healthyCompanion: CompanionDeps = {
  getLeadMemory: async (sessionKey) => emptyMemory(sessionKey),
  saveConversationSummary: async () => undefined,
  upsertPersonalNote: async () => 'note-1',
}

describe('Aegis perimeter', () => {
  it('allows Node A public PostGIS RPCs and blocks memory RPCs', () => {
    expect(() => assertNodeARpc('get_listings_with_coords')).not.toThrow()
    expect(() => assertNodeARpc('public.get_nearby_listings')).not.toThrow()
    expect(() => assertNodeARpc('get_lead_memory')).toThrow(/blocked from memory RPC/)
    expect(() => assertNodeARpc('upsert_personal_note')).toThrow(/blocked from memory RPC/)
    expect(() => assertNodeARpc('save_conversation_summary')).toThrow(/blocked from memory RPC/)
    expect(() => assertNodeARpc('record_chat_lead_event')).toThrow(/cannot call/)
  })

  it('allows Node B SECURITY DEFINER memory RPCs and blocks listing RPCs', () => {
    expect(() => assertNodeBRpc('get_lead_memory')).not.toThrow()
    expect(() => assertNodeBRpc('upsert_personal_note')).not.toThrow()
    expect(() => assertNodeBRpc('get_listings_with_coords')).toThrow(/cannot call Interface Rou RPC/)
    expect(() => assertNodeBRpc('record_chat_lead_event')).toThrow(/cannot call/)
  })

  it('blocks Node A from isolated memory tables', () => {
    expect(() => assertNodeATableAccess('personal_notes')).toThrow(/blocked from table/)
    expect(() => assertNodeATableAccess('conversation_summaries')).toThrow(/blocked from table/)
  })

  it('keeps Node A and Node B RPC allowlists disjoint', () => {
    const overlap = NODE_A_ALLOWED_RPCS.filter((rpc) =>
      (NODE_B_ALLOWED_RPCS as readonly string[]).includes(rpc)
    )
    expect(overlap).toEqual([])
  })

  it('Node A source never imports memory or supabase', () => {
    const src = readFileSync(join(here, 'node-a.ts'), 'utf8')
    expect(src).not.toMatch(/from ['"][^'"]*lead-memory['"]/)
    expect(src).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(src).not.toMatch(/get_lead_memory/)
    expect(src).not.toMatch(/personal_notes/)
  })
})

describe('Node A transient map state', () => {
  it('hydrates the locked Aiken safe default when storage is empty', () => {
    installSessionStorage()
    const state = hydrateTransientMapState()
    expect(state.version).toBe(1)
    expect(state.center).toEqual(
      contextMatrix.spatial.transient_map_state.safe_default.center
    )
    expect(state.zoom).toBe(11)
    expect(state.filters.status).toBe('Active')
  })

  it('round-trips a valid payload through sessionStorage', () => {
    installSessionStorage()
    const next = {
      ...safeDefaultTransientMapState(),
      zoom: 13,
      searchQuery: 'whiskey road',
    }
    expect(persistTransientMapState(next)).toBe(true)
    expect(hydrateTransientMapState().zoom).toBe(13)
    expect(hydrateTransientMapState().searchQuery).toBe('whiskey road')
  })

  it('falls back to the safe default on a malformed payload without throwing', () => {
    const store = installSessionStorage()
    store.setItem(
      contextMatrix.spatial.transient_map_state.storage_key,
      '{not-json'
    )
    expect(() => hydrateTransientMapState()).not.toThrow()
    expect(hydrateTransientMapState().zoom).toBe(11)
  })
})

describe('two-tier isolation and degradation', () => {
  it('loads public listings through get_listings_with_coords only', async () => {
    const calls: string[] = []
    const rpc: RpcCaller = async (name) => {
      calls.push(name)
      if (name === 'get_lead_memory') {
        throw new Error('memory rpc must not be reachable')
      }
      return {
        data: [{ id: '1', address: '215 Barnard Avenue SE', lng: -81.72, lat: 33.55 }],
        error: null,
      }
    }
    const nodeA = createInterfaceRou(rpc)
    const listings = await nodeA.loadPublicListings()
    expect(calls).toEqual(['get_listings_with_coords'])
    expect(listings[0]?.address).toContain('Barnard')
  })

  it('rejects a Node A caller that tries to hit a memory RPC', async () => {
    const rpc: RpcCaller = async (name) => {
      assertNodeARpc(name)
      return { data: [], error: null }
    }
    const nodeA = createInterfaceRou(rpc)
    await expect(
      nodeA.loadPublicListings().then(() => rpc('get_lead_memory'))
    ).rejects.toThrow(/blocked from memory RPC/)
  })

  it('degrades Companion Rou on mutation failure while Node A stays interactive', async () => {
    installSessionStorage()
    const failing: CompanionDeps = {
      ...healthyCompanion,
      saveConversationSummary: async () => {
        throw new Error('supabase connection lost')
      },
    }
    const router = createRouPersonaRouter({
      interfaceRpc: silentRpc,
      companionDeps: failing,
    })

    const write = await router.companion.writeSummary({
      sessionKey: 'sess-1',
      summary: 'Looking near downtown Aiken',
    })
    expect(write.ok).toBe(false)
    expect(write.degraded).toBe(true)
    expect(router.companion.available).toBe(false)

    const map = router.interface.hydrateMapState()
    expect(map.center[0]).toBeCloseTo(-81.7198, 3)
    expect(router.interface.persistMapState({ ...map, zoom: 12 })).toBe(true)
    expect(router.interface.hydrateMapState().zoom).toBe(12)

    const listings = await router.interface.loadPublicListings()
    expect(Array.isArray(listings)).toBe(true)
  })

  it('isolateCompanion returns the fallback and leaves map state intact', async () => {
    installSessionStorage()
    const router = createRouPersonaRouter({
      interfaceRpc: silentRpc,
      companionDeps: healthyCompanion,
    })
    const result = await router.isolateCompanion(async () => {
      throw new Error('data mutation anomaly')
    }, 'fallback')
    expect(result).toBe('fallback')
    expect(router.companion.available).toBe(false)
    expect(router.interface.hydrateMapState().version).toBe(1)
  })
})

describe('UI wiring: Map session state and ChatWidget isolation', () => {
  it('keeps the last camera after a listing RPC drop mid-pan', async () => {
    installSessionStorage()
    persistTransientMapState(
      applyTransientViewport(safeDefaultTransientMapState(), {
        center: [-81.72, 33.56],
        zoom: 14,
        bearing: 12,
        pitch: 0,
      })
    )

    const droppingRpc: RpcCaller = async () => {
      throw new Error('high-latency network drop')
    }
    const nodeA = createInterfaceRou(droppingRpc)
    const listings = await nodeA.loadPublicListings()
    expect(listings).toEqual([])

    const camera = hydrateTransientMapState()
    expect(camera.center).toEqual([-81.72, 33.56])
    expect(camera.zoom).toBe(14)
    expect(camera.bearing).toBe(12)
  })

  it('applies price filters from sessionStorage, not from a parallel in-memory copy', () => {
    installSessionStorage()
    persistTransientMapState(
      applyTransientFilters(safeDefaultTransientMapState(), {
        minPrice: 400000,
        beds: 3,
        propertyType: 'Residential',
        searchQuery: 'Whiskey Road',
      })
    )
    const state = hydrateTransientMapState()
    expect(state.filters.minPrice).toBe(400000)
    expect(state.filters.beds).toBe(3)
    expect(state.filters.propertyType).toBe('Residential')
    expect(state.searchQuery).toBe('Whiskey Road')
  })

  it('Map.tsx consumes Node A session state and never calls memory RPCs', () => {
    const src = readFileSync(join(here, '../../components/Map.tsx'), 'utf8')
    expect(src).toMatch(/hydrateTransientMapState/)
    expect(src).toMatch(/loadPublicListings/)
    expect(src).toMatch(/moveend/)
    expect(src).not.toMatch(/get_lead_memory/)
    expect(src).not.toMatch(/from ['"][^'"]*lead-memory['"]/)
  })

  it('ChatWidget routes conversation through companion-chat, not supabase or Node A', () => {
    const src = readFileSync(
      join(here, '../../components/ChatWidget.tsx'),
      'utf8'
    )
    expect(src).toMatch(/streamCompanionChat/)
    expect(src).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(src).not.toMatch(/get_listings_with_coords/)
    expect(src).not.toMatch(/from ['"][^'"]*rou\/live['"]/)
    expect(src).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
  })
})
