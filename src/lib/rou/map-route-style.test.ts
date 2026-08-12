import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const map = readFileSync(join(here, '../../components/Map.tsx'), 'utf8')

describe('amenity route overlay style', () => {
  it('draws separate red walk beads and a solid drive line', () => {
    expect(map).toContain("const ROUTE_LINE = '#D92D20'")
    expect(map).toContain("'line-dasharray': [0, 2]")
    expect(map).toContain("'line-cap': 'round'")
    expect(map).toContain('ROUTE_WALK_LAYER')
    expect(map).toContain('ROUTE_DRIVE_LAYER')
  })

  it('marks origin white and destination red', () => {
    expect(map).toContain("'origin'")
    expect(map).toContain('ROUTE_LINE')
    expect(map).toMatch(/circle-color[\s\S]*origin[\s\S]*#FFFFFF/)
  })

  it('attaches walk and drive icons to the paths', () => {
    expect(map).toContain('placeRouteLabelMarker')
    expect(map).toContain("placeRouteLabelMarker(m, 'walking'")
    expect(map).toContain("placeRouteLabelMarker(m, 'driving'")
    expect(map).toContain('ROUTE_LABEL_WALK_SVG')
    expect(map).toContain('ROUTE_LABEL_DRIVE_SVG')
    expect(map).toContain('pointAlongLine')
    expect(map).toContain('isWalkDisplayable')
    expect(map).toContain('onViewportBounds')
    expect(map).toContain('reportViewportBounds')
    expect(map).not.toContain('Route to ')
    expect(map).not.toContain('onClearRoute')
    expect(map).not.toContain("from 'lucide-react'")
  })
})
