# IDEAS PARKING LOT + Decision Capture

**Source:** Desktop export `info for aria in cursor.txt` + Nick/ARIA alignment 2026-08-12.  
**Not auto-work:** Nothing here is an instruction to implement until Nick moves it into an active Phase task.

## Labels
- **LOCK** — doctrine / will build (may be phased or dependency-ordered)
- **PARK** — still want it; waiting on a real dependency or better time (not a brush-off)
- **DROP** — do not build
- **REVISE** — prior UX exists; change direction before treating as done
- **OUT OF SCOPE** — not product / not this repo backlog

## Identity (LOCKED)
- **Rou** — public Node A utility / interface AI (map, listings, amenity Q&A, transient session)
- **Gholi** — Node B relationship companion, **account/client dashboard only** (stateful memory)
- Public Rou visual (**REVISE 2026-08-13**) — talking-head **video**: she talks and the head moves, like a person on camera. Not a still with a mouth layer. Not cream text boxes; captions are broadcast CC on the picture.
- `src/assets/gholi-avatar.jpg` is **TEMP workbench only**. Do not treat it as the ship plate, do not argue the lounge still as the brand, do not ship it as Rou.
- Voice is **Carina** (`ROU_TTS_VOICE_ID` in `-tts.ts`). Talking-head video is driven by that audio. Not a vendor avatar voice. Not browser `speechSynthesis`. Not filmed dialogue.
- Ship plate is still unchosen. `gholi-avatar.jpg` stays TEMP until a purpose-shot plate exists.
- Mute/silent speech UI = hybrid **D**: captions on the picture like television CC; tap-orb for ask. Text never naked on map/photos.
- Chatroom grey-hoodie thumbnail = Cursor chat only (Nick ↔ agent). **Not** site product.

---

## LOCKED

### Map / amenities
1. Lean visible map — no more always-on amenity clutter unless necessary.
2. Hybrid POI — invisible curated list for grocery/schools/playgrounds/retail; named-place geocode when user supplies a place (e.g. “Bridgestone”); no broad unsupervised web crawl for amenity answers. **Named-place slice shipped 2026-08-12** — curated name match first, then Mapbox Geocoding inside the Aiken bbox; draws the same walk/drive route overlay.
3. Walk + drive times + shortest route on the map; hazard note only if obvious (interstate / multi-lane). **Shipped 2026-08-12** — Mapbox overlay on the map *and* Mapbox times injected into Rou’s spoken amenity prompt (`formatRoutedTimesBlock` in `-chat.ts`). Straight-line remains fallback if Directions fails.
18b. School answers must label **public / private / charter**; prefer nearest **public** unless user asks otherwise; never imply private = zoning. **Implemented 2026-08-12** in `playgrounds.ts` (+ Rou public prompt).

### Rou public UX
4. **LOCK (shipped)** — First open of a property card → one-time **Introducing Rou** dialog (neighborhood-fit framing + example asks); dismissible; localStorage so it does not nag every card.
5. **LOCK (shipped)** — Tap card to open/focus (ring). **Ask Rou** appears only on the opened card (and stays while Rou is active). Idle cards stay clean. Activating sets listing origin + chips. Opened-card Yes/No thumbs shipped 2026-08-13 (same notebook as `/listing/:id`).
11. Visual walk/drive route lines (with #3). **Shipped** — both paths at once: red dotted walk + solid drive; walk/drive icon+time pills on the lines; no separate route box.
12. Public Rou visual — **REVISE 2026-08-13**: talking-head video + broadcast CC. Live slice is still `RouOrb` with TEMP `gholi-avatar.jpg` (workbench). Not the ship plate.
13. Clickable chips after activate (schools / grocery / park…). **Shipped** with activate greeting.
14. Dual presence — Rou public / Gholi dashboard (Gholi may be warm/visual in-dashboard only).
15. Orb-first UI over time; captions + transcript hybrid; contrast-safe text; visuals adjustable. **Partial** — cream caption scrim on orb when speaking or muted. Full transcript-drawer still later.

### Account / Gholi / preference
7. Thumbs up/down — max 5 varying questions per listing, no typing required; account/Gholi.
8. Trash/dislike bin — dashboard; strong negative signal (store in a shape #6 can read later).
21. Saved search + soft nurture — account/Gholi, opt-in, low pressure.

### Map chrome
24. **LOCK (shipped)** — Legend + boundaries start visible on all breakpoints; buttons read Hide… when shown, Show… when hidden.
25. **LOCK (shipped)** — Branded `__root__` `notFoundComponent` + real document title (no TanStack starter chrome).

---

## PARKED (dependency / later)

6. Dashboard confidence score — build after #7/#8 can feed it; UI may show `?%` / not enough data until honest. (Do build collection — score never earns itself otherwise.)
9. Multi-select + drag-to-compare — after single-house Rou activate feels solid.
16. Photo-browse / dwell like-dislike triggers — after #4/#5 activate flow is trusted.
17. Subdivision overlays.
18. Rou post-search prompts — only when the offered action is actually supported.
19. Comparison mode (side-by-side) — with #9.
20. “What should I know about this area?” — only with real curated area notes (don’t invent).
22. Hesitation / objection prompts — easy to feel pushy; after activate + mute-safe UI trusted.
28. **Listing-office credit (IDX / MLS)** — **partial 2026-08-13**. Detail page, search cards, and pin popups credit `ListOfficeName` in `text-sm` / 14px navy. Apply `20260813_listing_office_names.sql`. Redeploy `mls-ingest`.
---

## DROP

10. Buyer’s-agent “written agreement?” question — live agent handles representation.
23. Public avatar / face — **REVISE 2026-08-13**: talking-head video is back on the table. TEMP face is not the ship plate. Dashboard-only Gholi unchanged.

---

## OUT OF SCOPE (product)

26–27. Private Aria / grey-hoodie chat thumbnail / personal identity — Cursor conversation only; never site backlog.

---

## Signal-storage note (when building #7/#8)
Store preference events as: listing id, question/tag, up/down/trash, timestamp — so #6 confidence can consume them without a rewrite.
