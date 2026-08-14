import { describe, expect, it } from 'vitest'
import {
  formatAreaNotesBlock,
  mentionsAreaNotes,
  resolveAreaNotes,
} from './area-notes'

describe('curated Aiken area notes', () => {
  it('returns Hitchcock Woods facts and refuses Fair Housing probes', () => {
    expect(mentionsAreaNotes('What should I know about this area?')).toBe(true)
    const woods = resolveAreaNotes('Tell me about Hitchcock Woods')
    expect(woods?.id).toBe('hitchcock')
    expect(woods?.facts.some((fact) => fact.includes('2,100'))).toBe(true)
    const block = formatAreaNotesBlock(woods!)
    expect(block).toContain('AREA NOTES')
    expect(block.toLowerCase()).not.toContain('safe neighborhood')
    expect(block.toLowerCase()).not.toContain('good schools')
    expect(resolveAreaNotes('safe neighborhood for families')).toBeNull()
    expect(mentionsAreaNotes('safe neighborhood for families')).toBe(false)
  })
})
