import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

describe('public site chrome', () => {
  it('puts About, Privacy, and Fair Housing on the footer without hex', () => {
    const footer = readFileSync(
      join(here, '../components/SiteFooter.tsx'),
      'utf8'
    )
    const about = readFileSync(join(here, '../routes/about.tsx'), 'utf8')
    const privacy = readFileSync(join(here, '../routes/privacy.tsx'), 'utf8')
    const fair = readFileSync(join(here, '../routes/fair-housing.tsx'), 'utf8')
    const root = readFileSync(join(here, '../routes/__root.tsx'), 'utf8')
    const home = readFileSync(join(here, '../routes/index.tsx'), 'utf8')
    const hero = readFileSync(join(here, '../components/Hero.tsx'), 'utf8')
    expect(footer).toContain("to=\"/about\"")
    expect(footer).toContain("to=\"/privacy\"")
    expect(footer).toContain("to=\"/fair-housing\"")
    expect(footer).toContain('Equal Housing Opportunity')
    expect(footer).not.toMatch(/#[0-9A-Fa-f]{3,8}/)
    expect(about).toContain('SITE_AGENT')
    expect(privacy).toContain('We do not sell')
    expect(fair).toContain('Fair Housing Act')
    expect(root).toContain('Skip to content')
    expect(root).toContain('SiteFooter')
    expect(home).toContain('SiteFooter')
    expect(home).toContain('get_listing_living_areas')
    expect(home).toContain('Tap Ask Rou on a home')
    expect(hero).toContain('hero-beds')
    expect(hero).toContain('aria-label="Minimum bedrooms"')
  })
})
