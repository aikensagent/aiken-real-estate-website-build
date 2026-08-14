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
    expect(orb).toContain('max-h-48')
    expect(orb).toContain('Conversation with Rou')
    expect(orb).toContain('You')
    expect(orb).toContain("'Rou'")
    expect(orb).not.toContain("role === 'user' ? 'You' : 'Gholi'")
    expect(orb).toContain('askEnabled')
    expect(orb).toContain('messages')
    expect(orb).toContain('Close Rou')
    expect(orb).toContain('Open Rou')
    expect(orb).toContain('Mute Rou')
    expect(orb).toContain('Unmute Rou')
    expect(orb).toContain('RouSpeakerIcon')
    expect(orb).toContain('text-brand-gold')
    expect(orb).toContain('aria-expanded')
    expect(orb).toContain('top-16')
    expect(orb).toContain('right-4')
    expect(orb).toContain('h-20 w-20')
    expect(orb).toContain('md:h-28 md:w-28')
    expect(orb).toContain('items-end')
    expect(orb).not.toContain('bottom-4')
    expect(orb).not.toContain('left-4')
  })

  it('ChatWidget uses RouOrb as the public surface and does not import the sandbox experiment', () => {
    const widget = readFileSync(
      join(here, '../../components/ChatWidget.tsx'),
      'utf8'
    )
    expect(widget).toMatch(/from ['"]\.\/RouOrb['"]/)
    expect(widget).toMatch(/<RouOrb/)
    expect(widget).toMatch(/messages=\{messages\}/)
    expect(widget).toMatch(/listingThreadKey/)
    expect(widget).toMatch(/setMessages\(\[\{ role: 'assistant'/)
    expect(widget).toMatch(/onClosePanels/)
    expect(widget).toMatch(/onOpenPanels/)
    expect(widget).not.toMatch(/rou-avatar/)
    expect(widget).not.toMatch(/floating-orb-experiment/)
    expect(widget).not.toMatch(/isFloatingOrbExperimentEnabled/)
    expect(widget).not.toMatch(/onOpenChat/)
  })
})
