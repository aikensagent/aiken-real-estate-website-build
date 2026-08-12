import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = readFileSync(join(here, '../routes/__root.tsx'), 'utf8')

describe('root not-found chrome', () => {
  it('registers a branded notFoundComponent and a real document title', () => {
    expect(root).toContain('notFoundComponent: NotFoundPage')
    expect(root).toContain("title: 'Find your place in Aiken | Nick Williams'")
    expect(root).not.toContain('TanStack Start Starter')
  })

  it('uses brand tokens, an accessible heading, and a home Link', () => {
    expect(root).toContain('bg-brand-cream')
    expect(root).toContain('text-brand-navy')
    expect(root).toContain('border-brand-gold')
    expect(root).toContain('aria-labelledby="not-found-heading"')
    expect(root).toContain('aria-label="Back to home search"')
    expect(root).toMatch(/to=["']\/["']/)
    expect(root).not.toMatch(/#[0-9A-Fa-f]{3,8}/)
  })
})
