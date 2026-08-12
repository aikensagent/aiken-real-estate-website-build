# ARIA Project Status

**Last Updated:** 2026-08-12

## Phase 0 — Foundation & Design Tokens
- COMPLETE

## Phase 1 — Core Platform & Geospatial
- COMPLETE
- Map with branded markers, popups, viewport tracking, Mapbox Draw
- Parks & recreation + golf course markers
- `get_listings_with_coords()` RPC
- MLS ingest Edge Function + 15-min cron

## Phase 2 — Lead Capture & Behavioral Scoring
- COMPLETE
- `leads` and `lead_events` tables
- `recalculate_lead_score` function + automatic trigger
- Secure public capture path via `SECURITY DEFINER` RPC `capture_lead`
- Client helpers (`leadTracking.ts`) and homepage form

## Phase 3 — LLM Chat, Voice & AI Features (IN PROGRESS)

### Live product identity (locked 2026-08-12)
- **Rou** — Node A utility (map filters, PostGIS, POI / amenity lookups). Stateless `sessionStorage` only.
- **Gholi** — Node B spoken companion (Best Life Realty personal advisor). Stateful memory via SECURITY DEFINER RPCs.
- Live UI remains **ChatWidget** (not the floating-orb experiment).

### Completed through 2026-08-12 (on disk; not all committed)
- Grok chat via server-only `createServerFn` (`src/routes/api/-chat.ts`)
- PII redaction + Fair Housing middleware on chat in/out/history
- “Talk to Nick” human handoff (call hours + after-hours path)
- Listing card selection → Gholi proactive context (“Ask Gholi about this home”)
- Curated amenity answers (playgrounds, schools, grocery) with major-road honesty
- Blind engine contract: `src/lib/context-matrix.ts` + `context-matrix/real_estate_core.json`
- Aegis two-tier routing: Node A / Node B isolation (`src/lib/rou/*`)
- Map + ChatWidget wired through the persona router
- Gholi system prompt module (`src/lib/rou/gholi-persona.ts`)
- Floating-orb experiment sandboxed + kill-switch **off** (`experiments.floating_orb.enabled: false`)
- Specialist ledger receipts in `dev/agent_ledger.json` (83/83 vitest at last gate)

### Still Remaining in Phase 3
- Stronger multi-turn conversation history UX
- Voice / TTS foundation
- Richer live MLS listing context injection
- Chat session persistence ↔ lead scoring hook
- Notion Phase 3 exit checklist
- Visual design polish (parked for specialized visual agents)
- Floating-orb private conversion testing (kill-switch stays off until then)

### Completed 2026-08-12 (continued)
- Streaming Grok replies on ChatWidget via `chatStream` (PII + Fair Housing intact; artificial typing delay removed)

## Architectural Rules Established
- Public write operations must use SECURITY DEFINER RPCs
- Node A must never call memory RPCs; Node B must never call listing RPCs
- Transient map state: `sessionStorage` key `searchaikenhomes:rou:transient:map:v1` only
- AI inputs/outputs pass through PII + Fair Housing middleware
- Design tokens only (no raw hex in components)
- Engine binds to `aria.context-matrix.v1`, not to real-estate vocabulary
- Human handoff path for every AI failure mode
