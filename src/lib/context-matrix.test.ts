import { describe, expect, it } from 'vitest'
import {
  EXPECTED_ENGINE_CONTRACT,
  EXPECTED_INDUSTRY_ID,
  EXPECTED_SPATIAL_SRID,
  assertContextMatrix,
  contextMatrix,
} from './context-matrix'

describe('context matrix compile gate', () => {
  it('loads the Aiken real-estate sheet and passes every assertion', () => {
    const matrix = assertContextMatrix()
    expect(matrix.engine_contract).toBe(EXPECTED_ENGINE_CONTRACT)
    expect(matrix.industry_id).toBe(EXPECTED_INDUSTRY_ID)
    expect(matrix.spatial.crs.srid).toBe(EXPECTED_SPATIAL_SRID)
    expect(matrix.compliance.fair_housing.strict_enforcement).toBe(true)
    expect(matrix.compliance.pii.redaction_function).toBe('redactPII')
    expect(matrix.spatial.storage.coordinate_extraction_rpc).toBe(
      'public.get_listings_with_coords'
    )
  })

  it('round-trips the compiled matrix through the runtime assertion', () => {
    expect(assertContextMatrix(contextMatrix)).toEqual(contextMatrix)
  })

  it('halts when a foreign industry sheet is substituted', () => {
    const foreign = {
      ...contextMatrix,
      industry_id: 'healthcare.example',
    }
    expect(() => assertContextMatrix(foreign)).toThrow(/industry_id/)
  })

  it('halts when the engine contract or SRID is wrong', () => {
    expect(() =>
      assertContextMatrix({ ...contextMatrix, engine_contract: 'aria.context-matrix.v0' })
    ).toThrow(/engine_contract/)
    expect(() =>
      assertContextMatrix({
        ...contextMatrix,
        spatial: {
          ...contextMatrix.spatial,
          crs: { ...contextMatrix.spatial.crs, srid: 3857 },
        },
      })
    ).toThrow(/srid/)
  })

  it('requires every declared top-level key', () => {
    for (const key of contextMatrix.schema_assertions.required_top_level_keys) {
      expect(contextMatrix).toHaveProperty(key)
    }
  })

  it('keeps the floating-orb experiment kill-switch off by default', () => {
    expect(contextMatrix.experiments.floating_orb.enabled).toBe(false)
    expect(contextMatrix.experiments.floating_orb.fallback_ui).toBe(
      'src/components/ChatWidget.tsx'
    )
  })
})
