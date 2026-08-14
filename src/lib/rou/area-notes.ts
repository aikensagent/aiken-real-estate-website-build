/**
 * Curated Aiken area facts for Rou. Places and process only.
 * Never school quality, crime, or who “belongs.”
 */

import { AIKEN_AREA_CHIPS, matchAikenAreaChip } from './aiken-areas'
import { FAIR_HOUSING_PLACE_BLOCK } from './named-place'

export type AreaNote = {
  id: string
  label: string
  facts: string[]
}

const AREA_NOTES: AreaNote[] = [
  {
    id: 'downtown',
    label: 'Downtown',
    facts: [
      'Downtown Aiken is a walkable commercial grid around Laurens Street and The Alley.',
      'Hitchcock Woods sits just west of downtown, with public trails.',
      'City and county offices are in this core. Ask for a specific shop or park by name for a route.',
    ],
  },
  {
    id: 'city-of-aiken',
    label: 'City of Aiken',
    facts: [
      'The City of Aiken municipal area includes downtown and adjoining neighborhoods inside the city limits.',
      'I-20 runs north of town. US 1 and US 78 are the main in-town corridors.',
      'For a named place, ask Rou how far it is from a home you have open.',
    ],
  },
  {
    id: 'hitchcock',
    label: 'Hitchcock Woods',
    facts: [
      'Hitchcock Woods is an urban forest of about 2,100 acres with public trails.',
      'Horses use designated trails. It is immediately west of downtown Aiken.',
      'This is a place fact, not a ranking of nearby homes or schools.',
    ],
  },
  {
    id: 'north-augusta',
    label: 'North Augusta',
    facts: [
      'North Augusta sits on the Savannah River, west of Aiken along the I-20 / US 1 corridor.',
      'The Greeneway is a paved riverfront trail. Named shops and parks can get a walk or drive time from an open home.',
      'Inventory here is still this MLS coverage area — not a separate market score.',
    ],
  },
  {
    id: 'graniteville',
    label: 'Graniteville',
    facts: [
      'Graniteville is in the Horse Creek valley west of Aiken along US 1.',
      'I-20 access is north of this area. Ask for a named place if you need minutes from a listing.',
      'Do not treat mill history or any group of people as a reason to pick or avoid homes here.',
    ],
  },
]

export function mentionsAreaNotes(text: string): boolean {
  const lower = text.toLowerCase()
  if (FAIR_HOUSING_PLACE_BLOCK.some((term) => lower.includes(term))) return false
  return (
    lower.includes('what should i know about') ||
    lower.includes('tell me about this area') ||
    lower.includes('this part of aiken') ||
    lower.includes('about this area') ||
    lower.includes('about downtown') ||
    lower.includes('about hitchcock') ||
    lower.includes('about north augusta') ||
    lower.includes('about graniteville')
  )
}

export function resolveAreaNotes(
  query: string,
  areaId?: string | null
): AreaNote | null {
  const lower = query.toLowerCase()
  if (FAIR_HOUSING_PLACE_BLOCK.some((term) => lower.includes(term))) return null
  if (areaId) {
    const byId = AREA_NOTES.find((note) => note.id === areaId)
    if (byId) return byId
  }
  const chip = matchAikenAreaChip(query)
  if (chip) {
    return AREA_NOTES.find((note) => note.id === chip.id) ?? null
  }
  return AREA_NOTES.find((note) =>
    lower.includes(note.label.toLowerCase())
  ) ?? (mentionsAreaNotes(query) ? AREA_NOTES.find((note) => note.id === 'city-of-aiken') ?? null : null)
}

export function formatAreaNotesBlock(note: AreaNote): string {
  return [
    'AREA NOTES (curated place facts only — do not invent demographics, school quality, crime, or who belongs):',
    `${note.label}:`,
    ...note.facts.map((fact) => `- ${fact}`),
    'If they want a route, use a named place or amenity lookup. Never rank this area against another for people.',
  ].join('\n')
}

export function areaChipLabels(): string[] {
  return AIKEN_AREA_CHIPS.map((chip) => chip.label)
}
