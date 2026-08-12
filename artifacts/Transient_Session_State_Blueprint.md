# TRANSIENT SESSION STATE BLUEPRINT
**Status:** Mapped, Defined, Locked via Grok-Enhanced ARIA Protocol
**Handshake ID:** b7e2f9a1-4c3d-4e8f-9a2b-1d5e6f7a8b9c

## 1. TransientMapState Interface (TypeScript/React 19)
```ts
export interface TransientMapState {
  version: 1;
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing?: number;
  pitch?: number;
  filters: {
    minPrice: number | null;
    maxPrice: number | null;
    beds: number | null;
    baths: number | null;
    propertyType: string | null;
    status: "Active" | "Pending" | null;
  };
  drawnPolygon: GeoJSON.Polygon | null;
  searchQuery: string;
  lastUpdated: number;
}
```

## 2. Storage Mechanism Matrix (Dr. Marcus Hale)
- **Hot Path:** In-memory local state via React 19 `useReducer` or route-scoped state manager. Guarantees zero latency during heavy map movement or camera sampling.
- **Soft Persistence:** Namespaced browser cache `sessionStorage` under the key `searchaikenhomes:rou:transient:map:v1`. Tab-scoped only; completely purged upon closing browser session.
- **Security Rejections:** Hard ban on `localStorage`, database logs, Vercel KV, or client-side direct table mutations.

## 3. Failure Mode & Fallback Assertion (Theo Brooks)
If an inbound payload is malformed, missing required tokens, or encounters parsing anomalies at the hydration boundary, the application catches the error and falls back to this configuration immediately with no console exceptions:
```ts
export const SAFE_DEFAULT_TRANSIENT_STATE: TransientMapState = {
  version: 1,
  center: [-81.7198, 33.5604], // Center of Aiken, SC
  zoom: 11,
  bearing: 0,
  pitch: 0,
  filters: {
    minPrice: null,
    maxPrice: null,
    beds: null,
    baths: null,
    propertyType: null,
    status: "Active"
  },
  drawnPolygon: null,
  searchQuery: "",
  lastUpdated: Date.now()
};
```

## 4. Isolation Proof Verification (Nadia Sokolov)
The anonymous public map interface relies solely on the immutable `public.get_listings_with_coords()` RPC pipeline. It contains absolute zero system hooks into `personal_notes` or `conversation_summaries`. This architecture ensures that anonymous visitors cannot access user-specific profiles, satisfying our active RLS constraints.
