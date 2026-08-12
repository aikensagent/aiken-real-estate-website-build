import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  assertContextMatrix,
  contextMatrix,
  isFloatingOrbExperimentEnabled,
} from '../../context-matrix'
import {
  FLOATING_ORB_EXPERIMENT_ID,
  FLOATING_ORB_FORBIDDEN_LIVE_MODULES,
  SANDBOX_GHOLI_ORB_PERSONA_DRAFT,
  assertFloatingOrbSandboxIsolation,
  floatingOrbSandboxSurface,
} from './floating-orb-experiment'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../../../..')

describe('floating-orb experiment kill-switch + isolation', () => {
  it('defaults the master kill-switch to off and names ChatWidget as fallback', () => {
    const matrix = assertContextMatrix()
    expect(matrix.experiments.floating_orb.enabled).toBe(false)
    expect(matrix.experiments.floating_orb.kill_switch).toBe(true)
    expect(matrix.experiments.floating_orb.fallback_ui).toBe(
      'src/components/ChatWidget.tsx'
    )
    expect(matrix.experiments.floating_orb.sandbox_module).toBe(
      'src/lib/rou/sandbox/floating-orb-experiment.ts'
    )
    expect(isFloatingOrbExperimentEnabled()).toBe(false)
    expect(isFloatingOrbExperimentEnabled(contextMatrix)).toBe(false)
  })

  it('keeps the sandbox surface memory-unbound and ChatWidget-backed', () => {
    expect(floatingOrbSandboxSurface.experiment_id).toBe(
      FLOATING_ORB_EXPERIMENT_ID
    )
    expect(floatingOrbSandboxSurface.memory_binding).toBe('none_in_sandbox')
    expect(floatingOrbSandboxSurface.live_chat_fallback).toBe(
      'src/components/ChatWidget.tsx'
    )
    expect(SANDBOX_GHOLI_ORB_PERSONA_DRAFT).toContain('not live')
    expect(SANDBOX_GHOLI_ORB_PERSONA_DRAFT).toContain('personal_notes')
    expect(SANDBOX_GHOLI_ORB_PERSONA_DRAFT).toContain(
      'experiments.floating_orb.enabled'
    )
  })

  it('sandbox source never imports live chat, memory, or supabase paths', () => {
    const sandboxSrc = readFileSync(
      join(here, 'floating-orb-experiment.ts'),
      'utf8'
    )
    expect(() => assertFloatingOrbSandboxIsolation(sandboxSrc)).not.toThrow()
    expect(sandboxSrc).not.toMatch(/from ['"]/)
  })

  it('live production surfaces do not import the sandbox while disabled', () => {
    for (const relative of FLOATING_ORB_FORBIDDEN_LIVE_MODULES) {
      const abs = join(repoRoot, relative)
      const src = readFileSync(abs, 'utf8')
      expect(src).not.toMatch(/floating-orb-experiment/)
      expect(src).not.toMatch(/SANDBOX_GHOLI_ORB_PERSONA_DRAFT/)
      expect(src).not.toMatch(/isFloatingOrbExperimentEnabled/)
    }
  })

  it('halts when experiments.floating_orb.enabled is not a boolean kill-switch shape', () => {
    expect(() =>
      assertContextMatrix({
        ...contextMatrix,
        experiments: {
          floating_orb: {
            ...contextMatrix.experiments.floating_orb,
            kill_switch: false,
          },
        },
      })
    ).toThrow(/kill_switch/)
  })
})
