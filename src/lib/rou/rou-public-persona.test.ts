import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contextMatrix } from '../context-matrix'
import {
  ROU_DISPLAY_NAME,
  ROU_SYSTEM_PROMPT,
  ROU_TITLE,
} from './rou-public-persona'

const here = dirname(fileURLToPath(import.meta.url))

describe('Rou public persona profile', () => {
  it('introduces as Rou, the public neighborhood guide', () => {
    expect(ROU_DISPLAY_NAME).toBe('Rou')
    expect(ROU_TITLE.toLowerCase()).toContain('neighborhood')
    expect(ROU_SYSTEM_PROMPT).toContain('You are Rou')
    expect(ROU_SYSTEM_PROMPT).toContain('Do not introduce yourself as Gholi')
    expect(ROU_SYSTEM_PROMPT).toContain('public, private, or charter')
  })

  it('keeps Fair Housing rules in the spoken profile', () => {
    expect(ROU_SYSTEM_PROMPT).toContain('Fair Housing')
    expect(ROU_SYSTEM_PROMPT).toContain('protected classes')
    expect(ROU_SYSTEM_PROMPT).toContain('Never invent')
    expect(ROU_SYSTEM_PROMPT).toContain('Never say you do not have a saved route')
    expect(ROU_SYSTEM_PROMPT).toContain('general Aiken area')
  })

  it('matches the context matrix utility node', () => {
    expect(contextMatrix.persona_nodes.utility.display_name).toBe('Rou')
    expect(contextMatrix.persona_nodes.utility.id).toBe('rou_interface')
  })

  it('is injected into -chat.ts for the public ChatWidget path', () => {
    const chat = readFileSync(
      join(here, '../../routes/api/-chat.ts'),
      'utf8'
    )
    expect(chat).toMatch(/ROU_SYSTEM_PROMPT/)
    expect(chat).not.toMatch(/CORE_SYSTEM_PROMPT = GHOLI_SYSTEM_PROMPT/)
  })
})
