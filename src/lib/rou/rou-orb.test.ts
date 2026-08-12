import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('RouOrb public visual', () => {
  it('uses brand tokens and EQ animation, not a face photo', () => {
    const orb = readFileSync(join(here, '../../components/RouOrb.tsx'), 'utf8')
    expect(orb).toContain('bg-brand-navy')
    expect(orb).toContain('bg-brand-gold')
    expect(orb).toContain('bg-brand-cream')
    expect(orb).toContain('rou-eq')
    expect(orb).not.toMatch(/rou-avatar/)
    expect(orb).not.toMatch(/<img/)
  })

  it('ChatWidget closed state uses RouOrb and does not import the sandbox experiment', () => {
    const widget = readFileSync(
      join(here, '../../components/ChatWidget.tsx'),
      'utf8'
    )
    expect(widget).toMatch(/from ['"]\.\/RouOrb['"]/)
    expect(widget).toMatch(/<RouOrb/)
    expect(widget).not.toMatch(/rou-avatar/)
    expect(widget).not.toMatch(/floating-orb-experiment/)
    expect(widget).not.toMatch(/isFloatingOrbExperimentEnabled/)
  })
})
