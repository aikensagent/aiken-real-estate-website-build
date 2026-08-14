# ARIA Project Status

**Last Updated:** 2026-08-13

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
- Public Rou face: `gholi-avatar.jpg` is **TEMP workbench only**. Direction is talking-head video driven by **Carina** + broadcast CC. Do not treat the lounge still as the ship plate.
- **Runway (2026-08-13):** Nick submitted the site-tour request with host plate `artifacts/runway-stills/00-rou-host-anchor-navy-hint.png`. Waiting on their clip. Do not block site work on it.

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
- Stronger multi-turn conversation history UX ............... DONE 2026-08-13 (sessionStorage + visible You/Rou thread on the orb)
- Server / Twilio voice (beyond xAI TTS + browser mic) — still needs Twilio credentials
- Talking-head video pipeline — still waiting on an approved ship plate / Runway clip
- Visual design polish (parked for specialized visual agents)
- Floating-orb private conversion testing (kill-switch stays off)
- Admin / associate dashboards
- Saved-search email nurture (Resend)

### Completed 2026-08-12 (continued)
- Streaming Grok replies on ChatWidget via `chatStream` (PII + Fair Housing intact; artificial typing delay removed)
- Browser voice foundation: mute persists in sessionStorage, TTS only after stream completes, mic cancels speech so Gholi never talks over the visitor
- xAI TTS (Carina) for public Rou replies — browser `speechSynthesis` robot voice removed; captions stay if TTS fails
- Branded 404 (`notFoundComponent` on `__root__`) + document title “Find your place in Aiken | Nick Williams”
- Named-place geocode (LOCK #2): “how far to Bridgestone” matches curated amenities first, then Mapbox inside the Aiken bbox, and draws the walk/drive route
- Listing detail page (`/listing/:listingId`): photos, allowlisted MLS facts, schedule/talk to Nick, Rou already on that home. Cards link to the URL. Spark token stays server-only.
- Left-rail sort (featured, price, beds, baths, address) on homes in the current map view.
- Mobile “Where in Aiken?” chips + field (list stays on List; computed bbox). Desktop still pans the map.
- Noted for v2: Use my location — in-bbox flies the camera; out-of-bbox is relocating-from lead signal, never a listing filter.
- **I’m at a home** (mobile): in-bbox GPS matches a nearby card from loaded listings; out-of-bbox never filters inventory. Lot lines still wait on a licensed county / Regrid layer.
- Gholi **client dashboard** (`/account`): rated homes, trash, saved-search empty state. Gated by buyer Auth. Public Rou stays off this path.
- Rou **listing thumbs**: Yes/No on `/listing/:id` and on the **opened map card** (Rou active only) write the shared notebook. **Save this home** is one tap (`keep_favorite` up) — no form, no extra consent; it also restores a trashed home. Dashboard **Trash** has Restore. Exit from the listing page is Back to search (`/?listingId=`). Gholi only reads the notebook on `/account`. ChatWidget does not ask thumbs.
- Listing **price snapshots**: 15-min ingest writes `listing_price_snapshots` only when ask changes. Public read via `get_listing_price_history`. History starts now — not a full MLS log.
- Listing **pin map**: one Mapbox pin on `/listing/:id` with Streets / Satellite (`satellite-streets-v12`). Not the inventory map.
- Buyer **Auth** (first slice): magic-link at `/login`, callback at `/auth/callback`, `claim_buyer_account` attaches `auth.uid()` to a lead and keeps the first visitor notebook key. `/account` redirects if signed out. **Sign in** is on the hero and map header (`SiteAccountLink`). After the link, allowlisted `next` returns you to the map, a listing, a saved search, or the dashboard — not an open redirect. **Sign in to save** restores the search and saves it. Admin/associate dashboards still later.
- **Saved searches**: signed-in buyers save the current map filters + area from the navy bar. Stored via `save_buyer_search` (max 20). Dashboard lists them; tap opens `/?saved=`. No GPS in the payload.
- **Rou listing context**: a tapped home now gets allowlisted MLS facts, an explicit missing-fact list, county-records link-only, and PRICE WE HAVE SEEN (ingest snapshots only). Chat still does not invent prices or a full MLS change log.
- **Chat persist + score**: the public thread stays in sessionStorage for the tab. Each turn records `chat_open` / `chat_message` (and handoff on refusal) via `record_chat_lead_event`. No transcript in `lead_events`. Map + form + chat share `rou-session-key`. Score updates only after a lead is attached. **Apply** `20260813_chat_lead_score_hook.sql`.
- **Rou thread UX**: orb sits upper-right under the navy bar (map side, not over the list). Close hides the cream panels; tap the orb to open them again. A new listing id wipes the thread. Mute is a speaker icon next to Close.
- **Showing request**: signed-in buyers get one **Request a showing** button (no consent repeat) on the listing page and the **opened map card**. Guests still see the form (card sends them to the listing). Rou chip “Schedule a showing” fires that path. Rou **states** Nick will submit the request — she does not ask if they want to speak to him. `/account` lists the buyer’s showing requests (one row per home). **Apply** `20260813_showing_requests.sql`.
- **MLS public facts (2026-08-13):** ingest + Spark `$select` now pull pool features, fireplace, roof, flooring, basement, parking, patio/porch, interior/exterior, new construction, waterfront, HOA frequency, and on-market date (days on market is computed). Listing Facts and Rou’s SELECTED HOME use the same allowlist. Still never LivingArea / StoriesTotal / PoolPrivateYN in `$select` (this MLS rejects them). **Redeploy** `mls-ingest`.
- **Compare homes (2026-08-13):** map cards and the listing page can add up to 4 homes. Tab-scoped sessionStorage tray; drag to reorder. Side-by-side facts only — not a neighborhood or school ranking.
- **Public chrome (2026-08-13):** About, Privacy, Fair Housing, IDX/Equal Housing footer, skip-to-content, document description. Hero filters are labeled. Sqft filter uses `get_listing_living_areas` (unknown sqft stays visible). **Apply** `20260814_listing_living_areas.sql`.
- **Dashboard fit %:** honest `?%` until 8 yes/no answers; then percent of yes. Not a ranking of people or neighborhoods.
- **Area notes:** curated Downtown / City / Hitchcock Woods / North Augusta / Graniteville facts for “what should I know about this area.” No school quality, crime, or who belongs.
- **Listing-office credit (IDX)**: listing detail and search cards / pin popups show `Listing courtesy of {ListOfficeName}` when present, in `text-sm` navy (popup 14px navy) so type is not smaller than the card median. Never defaults to Nick’s shop. **Apply** `20260813_listing_office_names.sql` and **redeploy** `mls-ingest`.

## Architectural Rules Established
- Public write operations must use SECURITY DEFINER RPCs
- Node A must never call memory RPCs; Node B must never call listing RPCs
- Transient map state: `sessionStorage` key `searchaikenhomes:rou:transient:map:v1` only
- AI inputs/outputs pass through PII + Fair Housing middleware
- Design tokens only (no raw hex in components)
- Engine binds to `aria.context-matrix.v1`, not to real-estate vocabulary
- Human handoff path for every AI failure mode
