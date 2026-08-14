/**
 * Shared listing-thumb notebook.
 * Rou asks Yes/No on the public listing page and the opened map card.
 * Gholi reads the same notes
 * on /account. ChatWidget must not import this into the map chat path.
 * Max 5 questions per home, no free-text, no Fair Housing probes.
 */

export const GHOLI_THUMBS_PER_LISTING = 5

export type ThumbVote = 'up' | 'down'

export type ThumbQuestion = {
  id: string
  prompt: string
}

/** Geographic / home-fit only. Never schools, families, or who “belongs.” */
export const GHOLI_THUMB_QUESTION_POOL: ThumbQuestion[] = [
  { id: 'see_in_person', prompt: 'Would you want to see this home in person?' },
  { id: 'price_range', prompt: 'Is the asking price in your range?' },
  { id: 'lot_works', prompt: 'Does the lot or yard work for you?' },
  { id: 'right_area', prompt: 'Is this the right part of Aiken for you?' },
  { id: 'keep_favorite', prompt: 'Should I keep this one as a favorite?' },
  { id: 'layout', prompt: 'Do the beds and baths fit what you need?' },
  { id: 'condition', prompt: 'Does this home feel like the right condition?' },
  { id: 'nick_followup', prompt: 'Is the commute from here workable for you?' },
]

export function isThumbQuestionId(value: string): boolean {
  return GHOLI_THUMB_QUESTION_POOL.some((q) => q.id === value)
}

export function isThumbVote(value: string): value is ThumbVote {
  return value === 'up' || value === 'down'
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Stable set of 5 questions for a listing — order varies by home, not by visit. */
export function questionsForListing(listingId: string): ThumbQuestion[] {
  const pool = [...GHOLI_THUMB_QUESTION_POOL]
  const start = hashString(listingId.trim()) % pool.length
  const rotated = [...pool.slice(start), ...pool.slice(0, start)]
  return rotated.slice(0, GHOLI_THUMBS_PER_LISTING)
}

export function thumbNoteKey(listingId: string, questionId: string): string {
  return `thumb:${listingId.trim()}:${questionId}`
}

export function trashNoteKey(listingId: string): string {
  return `trash:${listingId.trim()}`
}

export function formatThumbExcerpt(
  vote: ThumbVote,
  prompt: string
): string {
  return `${vote} | ${prompt}`.slice(0, 300)
}

export function parseThumbVote(excerpt: string): ThumbVote | null {
  if (excerpt.startsWith('up |')) return 'up'
  if (excerpt.startsWith('down |')) return 'down'
  return null
}

export function votesFromNotes(
  notes: Array<{ note_key: string; excerpt: string; is_active?: boolean }>,
  listingId: string
): Record<string, ThumbVote> {
  const prefix = `thumb:${listingId.trim()}:`
  const votes: Record<string, ThumbVote> = {}
  for (const note of notes) {
    if (note.is_active === false) continue
    if (!note.note_key.startsWith(prefix)) continue
    const questionId = note.note_key.slice(prefix.length)
    const vote = parseThumbVote(note.excerpt)
    if (questionId && vote) votes[questionId] = vote
  }
  return votes
}

export function formatTrashExcerpt(trashed: boolean): string {
  return trashed
    ? formatThumbExcerpt('down', 'Trashed this listing')
    : formatThumbExcerpt('up', 'Restored this listing')
}

export function isActiveTrashExcerpt(excerpt: string | undefined): boolean {
  if (excerpt == null || excerpt.trim() === '') return true
  return excerpt.startsWith('down |')
}

export type GholiNotebook = {
  ratedListingIds: string[]
  trashedListingIds: string[]
  upVotes: number
  downVotes: number
}

export const NOTEBOOK_FIT_MIN_ANSWERS = 8

export type NotebookFit = {
  answered: number
  upVotes: number
  downVotes: number
  percent: number | null
  label: string
}

export function notebookFit(book: GholiNotebook): NotebookFit {
  const answered = book.upVotes + book.downVotes
  if (answered < NOTEBOOK_FIT_MIN_ANSWERS) {
    return {
      answered,
      upVotes: book.upVotes,
      downVotes: book.downVotes,
      percent: null,
      label: `Not enough yes/no yet (${answered} of ${NOTEBOOK_FIT_MIN_ANSWERS}). This is home-fit, not a score of people or neighborhoods.`,
    }
  }
  const percent = Math.round((100 * book.upVotes) / answered)
  return {
    answered,
    upVotes: book.upVotes,
    downVotes: book.downVotes,
    percent,
    label: `${percent}% yes on ${answered} home-fit answers. This is not a ranking of neighborhoods or who belongs.`,
  }
}

const LISTING_IN_KEY =
  /^thumb:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):/i
const TRASH_IN_KEY =
  /^trash:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export function notebookFromNotes(
  notes: Array<{ note_key: string; excerpt?: string; is_active?: boolean }>
): GholiNotebook {
  const rated = new Set<string>()
  const trashed = new Set<string>()
  for (const note of notes) {
    if (note.is_active === false) continue
    const thumb = note.note_key.match(LISTING_IN_KEY)
    if (thumb?.[1]) rated.add(thumb[1])
    const dump = note.note_key.match(TRASH_IN_KEY)
    if (dump?.[1] && isActiveTrashExcerpt(note.excerpt)) trashed.add(dump[1])
  }
  const trashedListingIds = [...trashed]
  let upVotes = 0
  let downVotes = 0
  for (const note of notes) {
    if (note.is_active === false) continue
    const vote = parseThumbVote(note.excerpt ?? '')
    if (!vote) continue
    if (note.note_key.startsWith('trash:')) {
      if (vote === 'down') downVotes += 1
      continue
    }
    if (!note.note_key.startsWith('thumb:')) continue
    if (vote === 'up') upVotes += 1
    else downVotes += 1
  }
  return {
    ratedListingIds: [...rated].filter((id) => !trashed.has(id)),
    trashedListingIds,
    upVotes,
    downVotes,
  }
}

