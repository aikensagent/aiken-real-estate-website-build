import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('RouOrb public visual', () => {
  it('uses brand tokens and EQ animation; TEMP workbench portrait is Gholi only', () => {
    const orb = readFileSync(join(here, '../../components/RouOrb.tsx'), 'utf8')
    expect(orb).toContain('bg-brand-navy')
    expect(orb).toContain('bg-brand-gold')
    expect(orb).toContain('bg-brand-cream')
    expect(orb).toContain('rou-eq')
    expect(orb).toContain('gholi-avatar')
    expect(orb).toContain('TEMP workbench')
    expect(orb).not.toMatch(/rou-avatar/)
    expect(orb).toContain('max-h-20')
    expect(orb).toContain('askEnabled')
  })

  it('ChatWidget uses RouOrb as the public surface and does not import the sandbox experiment', () => {
    const widget = readFileSync(
      join(here, '../../components/ChatWidget.tsx'),
      'utf8'
    )
    expect(widget).toMatch(/from ['"]\.\/RouOrb['"]/)
    expect(widget).toMatch(/<RouOrb/)
    expect(widget).not.toMatch(/rou-avatar/)
    expect(widget).not.toMatch(/floating-orb-experiment/)
    expect(widget).not.toMatch(/isFloatingOrbExperimentEnabled/)
    expect(widget).not.toMatch(/onOpenChat/)
  })
})
