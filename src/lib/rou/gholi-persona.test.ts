import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contextMatrix } from '../context-matrix'
import {
  GHOLI_DISPLAY_NAME,
  GHOLI_FIRM,
  GHOLI_SYSTEM_PROMPT,
  GHOLI_TITLE,
} from './gholi-persona'

const here = dirname(fileURLToPath(import.meta.url))

describe('Gholi persona profile', () => {
  it('introduces herself as Gholi, the Best Life Realty personal advisor', () => {
    expect(GHOLI_DISPLAY_NAME).toBe('Gholi')
    expect(GHOLI_TITLE.toLowerCase()).toContain('personal advisor')
    expect(GHOLI_FIRM).toContain('Best Life Realty')
    expect(GHOLI_SYSTEM_PROMPT).toContain('You are Gholi')
    expect(GHOLI_SYSTEM_PROMPT).toContain('Do not introduce yourself as Rou')
    expect(GHOLI_SYSTEM_PROMPT).toContain('Best Life Realty personal advisor')
  })

  it('keeps Fair Housing and no-invented-memory rules in the spoken profile', () => {
    expect(GHOLI_SYSTEM_PROMPT).toContain('Fair Housing')
    expect(GHOLI_SYSTEM_PROMPT).toContain('protected classes')
    expect(GHOLI_SYSTEM_PROMPT).toContain('Never invent')
  })

  it('is locked on the context matrix as Node B', () => {
    expect(contextMatrix.persona_nodes.utility.display_name).toBe('Rou')
    expect(contextMatrix.persona_nodes.relationship.id).toBe('gholi')
    expect(contextMatrix.persona_nodes.relationship.display_name).toBe('Gholi')
    expect(contextMatrix.persona_nodes.relationship.prompt_module).toBe(
      'src/lib/rou/gholi-persona.ts'
    )
  })

  it('is injected into -chat.ts and the memory extractors', () => {
    const chat = readFileSync(join(here, '../../routes/api/-chat.ts'), 'utf8')
    const memory = readFileSync(join(here, '../lead-memory.ts'), 'utf8')
    const nodeB = readFileSync(join(here, './node-b.ts'), 'utf8')
    expect(chat).toMatch(/GHOLI_SYSTEM_PROMPT/)
    expect(chat).toMatch(/from ['"][^'"]*gholi-persona['"]/)
    expect(chat).toMatch(/rouPersonaRouter/)
    expect(memory).toMatch(/Gholi/)
    expect(memory).not.toMatch(/named Rou/)
    expect(nodeB).toMatch(/export function createCompanionRou/)
    expect(nodeB).toMatch(/id: 'gholi'/)
  })
})
