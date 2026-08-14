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
    expect(ROU_SYSTEM_PROMPT).toContain('SELECTED HOME')
    expect(ROU_SYSTEM_PROMPT).toContain('COUNTY RECORDS')
    expect(ROU_SYSTEM_PROMPT).toContain('listing office')
    expect(ROU_SYSTEM_PROMPT).toContain('Do not say Nick Williams or Coldwell Banker Best Life Realty listed it')
    expect(ROU_SYSTEM_PROMPT).toContain('Nick will submit the showing request')
    expect(ROU_SYSTEM_PROMPT).toContain('Do not ask if they want to speak to Nick')
    expect(ROU_SYSTEM_PROMPT).toContain('If they compare homes')
    expect(ROU_SYSTEM_PROMPT).toContain('If an AREA NOTES block is in context')
    expect(ROU_SYSTEM_PROMPT).not.toContain('hand off to Nick Williams')
    expect(ROU_SYSTEM_PROMPT).not.toContain('offer to connect them with Nick')
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
