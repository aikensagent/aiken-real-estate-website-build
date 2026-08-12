import realEstateCore from '../../context-matrix/real_estate_core.json'
import { z } from 'zod'

/**
 * Domain-agnostic Context Matrix v1.
 *
 * The engine binds to this contract, not to real estate. A future industry
 * sheet (equities, clinical registries) must satisfy the same shape. This
 * repository additionally locks `industry_id` so a foreign sheet cannot
 * compile into the Aiken product by accident.
 */
export const EXPECTED_ENGINE_CONTRACT = 'aria.context-matrix.v1' as const
export const EXPECTED_INDUSTRY_ID = 'real_estate.aiken_sc' as const
export const EXPECTED_MATRIX_VERSION = 1 as const
export const EXPECTED_SPATIAL_SRID = 4326 as const

const indexSchema = z.object({
  method: z.enum(['GiST', 'BRIN']),
  purpose: z.string().min(1),
})

const contextMatrixSchema = z.object({
  engine_contract: z.literal(EXPECTED_ENGINE_CONTRACT),
  matrix_version: z.literal(EXPECTED_MATRIX_VERSION),
  industry_id: z.literal(EXPECTED_INDUSTRY_ID),
  industry_label: z.string().min(1),
  locale: z.object({
    market_name: z.string().min(1),
    default_city: z.string().min(1),
    default_region: z.string().min(1),
    country: z.string().min(2),
    coverage_note: z.string().min(1),
  }),
  spatial: z.object({
    crs: z.object({
      srid: z.literal(EXPECTED_SPATIAL_SRID),
      epsg: z.literal('EPSG:4326'),
      axis_order: z.tuple([z.literal('lng'), z.literal('lat')]),
    }),
    storage: z.object({
      canonical_type: z.literal('geography(Point,4326)'),
      coordinate_extraction_rpc: z.literal('public.get_listings_with_coords'),
      anonymous_map_pipeline: z.literal('public.get_listings_with_coords'),
    }),
    indexes: z.tuple([indexSchema, indexSchema]),
    lookups: z.object({
      proximity_rpc: z.literal('public.get_nearby_listings'),
      default_radius_meters: z.number().positive(),
      max_radius_meters: z.number().positive(),
      result_limit: z.number().int().positive(),
      cache: z.object({
        hot: z.literal('vercel_kv_redis_geo'),
        fallback: z.literal('postgis'),
      }),
    }),
    transient_map_state: z.object({
      version: z.literal(1),
      storage_key: z.string().min(1),
      storage_scope: z.literal('sessionStorage'),
      forbidden_stores: z.array(z.string()).min(1),
      safe_default: z.object({
        version: z.literal(1),
        center: z.tuple([z.number(), z.number()]),
        zoom: z.number(),
        bearing: z.number(),
        pitch: z.number(),
        filters: z.object({
          minPrice: z.number().nullable(),
          maxPrice: z.number().nullable(),
          beds: z.number().nullable(),
          baths: z.number().nullable(),
          propertyType: z.string().nullable(),
          status: z.enum(['Active', 'Pending']).nullable(),
        }),
        drawnPolygon: z.null(),
        searchQuery: z.string(),
        lastUpdated: z.number(),
      }),
    }),
  }),
  compliance: z.object({
    rls: z.object({
      enforcement_level: z.literal('STRICT'),
      anonymous_writes: z.literal('security_definer_rpc_only'),
      isolated_from_anonymous: z.array(z.string()).min(1),
    }),
    authorized_public_rpc_methods: z.array(z.string().startsWith('public.')).min(1),
    fair_housing: z.object({
      strict_enforcement: z.literal(true),
      protected_classes: z.array(z.string()).min(7),
      forbidden_tokens: z.array(z.string()).min(1),
      refusal_copy: z.string().min(1),
      middleware_route: z.literal('src/routes/api/-chat.ts'),
      guard_function: z.literal('checkFairHousing'),
    }),
    pii: z.object({
      middleware_route: z.literal('src/routes/api/-chat.ts'),
      redaction_function: z.literal('redactPII'),
      apply_to: z.array(z.enum(['chat_input', 'chat_history', 'chat_output'])),
      patterns: z.array(
        z.object({
          id: z.enum(['phone', 'email', 'ssn']),
          replacement: z.string().min(1),
        })
      ),
    }),
    secrets: z.object({
      policy: z.literal('vault_first'),
      stores: z.array(z.string()).min(1),
      hardcoded_keys: z.literal(false),
    }),
    human_handoff: z.object({
      required_on: z.array(z.string()).min(1),
      cta_label: z.string().min(1),
    }),
  }),
  ui_tokens: z.object({
    framework: z.literal('Tailwind v4'),
    theme_injection: z.literal('@theme'),
    forbid_raw_hex_in_components: z.literal(true),
    primary_brand_tokens: z.object({
      navy: z.string().regex(/^#/),
      gold: z.string().regex(/^#/),
      cream: z.string().regex(/^#/),
      slate: z.string().regex(/^#/),
      cb_navy: z.string().regex(/^#/),
    }),
    logo: z.string().min(1),
  }),
  persona_nodes: z.object({
    utility: z.object({
      id: z.string().min(1),
      display_name: z.literal('Rou'),
      state: z.literal('stateless_session'),
      cache: z.string().min(1),
    }),
    relationship: z.object({
      id: z.literal('gholi'),
      display_name: z.literal('Gholi'),
      state: z.literal('stateful'),
      store: z.literal('personal_notes'),
      access: z.literal('security_definer_rpc_only'),
      prompt_module: z.literal('src/lib/rou/gholi-persona.ts'),
    }),
  }),
  experiments: z.object({
    floating_orb: z.object({
      enabled: z.boolean(),
      kill_switch: z.literal(true),
      fallback_ui: z.literal('src/components/ChatWidget.tsx'),
      sandbox_module: z.literal(
        'src/lib/rou/sandbox/floating-orb-experiment.ts'
      ),
      forbidden_while_disabled: z
        .array(z.string().min(1))
        .min(1),
      notes: z.string().min(1),
    }),
  }),
  entity_catalog: z.object({
    primary_entity: z.string().min(1),
    coordinate_fields: z.tuple([z.literal('lng'), z.literal('lat')]),
    public_read_statuses: z.array(z.string()).min(1),
  }),
  schema_assertions: z.object({
    required_top_level_keys: z.array(z.string()).min(1),
    engine_contract_must_equal: z.literal(EXPECTED_ENGINE_CONTRACT),
    industry_id_must_equal: z.literal(EXPECTED_INDUSTRY_ID),
    matrix_version_must_equal: z.literal(EXPECTED_MATRIX_VERSION),
    spatial_srid_must_equal: z.literal(EXPECTED_SPATIAL_SRID),
    halt_compilation_on_mismatch: z.literal(true),
    halt_runtime_on_mismatch: z.literal(true),
  }),
})

export type ContextMatrixV1 = z.infer<typeof contextMatrixSchema>

export function assertContextMatrix(
  value: unknown = realEstateCore
): ContextMatrixV1 {
  const parsed = contextMatrixSchema.safeParse(value)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Context matrix failed schema assertion: ${detail}`)
  }
  return parsed.data
}

/** JSON modules widen literals to `string` / `number`. Shape-check that widened form at compile time. */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends null
        ? null
        : T extends readonly (infer U)[]
          ? Widen<U>[]
          : T extends object
            ? { [K in keyof T]: Widen<T[K]> }
            : T

/**
 * Compile-time lock on structure. A missing key, a string where a number
 * belongs, or a broken nesting fails `tsc` before the UI can boot.
 * Literal industry / contract tokens are then re-asserted at module load.
 */
const importedMatrix = realEstateCore satisfies Widen<ContextMatrixV1>

export const contextMatrix: ContextMatrixV1 = assertContextMatrix(importedMatrix)

/**
 * Master kill-switch for the floating-orb UI experiment.
 * Default from the industry sheet is `false` — production uses ChatWidget.
 */
export function isFloatingOrbExperimentEnabled(
  matrix: ContextMatrixV1 = contextMatrix
): boolean {
  return matrix.experiments.floating_orb.enabled === true
}
