import { createServerFn } from '@tanstack/react-start'
import { isListingId } from '../../lib/listing-facts'
import { rouPersonaRouter } from '../../lib/rou/live'
import {
  formatThumbExcerpt,
  formatTrashExcerpt,
  GHOLI_THUMB_QUESTION_POOL,
  isThumbQuestionId,
  isThumbVote,
  thumbNoteKey,
  trashNoteKey,
  notebookFromNotes,
  votesFromNotes,
  type ThumbVote,
} from '../../lib/rou/gholi-thumbs'

type ThumbRequest = {
  sessionKey: string
  listingId: string
  questionId: string
  vote: ThumbVote
}

type ThumbListRequest = {
  sessionKey: string
  listingId: string
}

function questionPrompt(questionId: string): string {
  return (
    GHOLI_THUMB_QUESTION_POOL.find((q) => q.id === questionId)?.prompt ??
    questionId
  )
}

/**
 * Listing thumbs written by public Rou. Node B memory RPCs only.
 * ChatWidget must not call this — RouThumbs on the listing page and
 * the opened map card does.
 */
export const recordGholiThumb = createServerFn({ method: 'POST' })
  .validator((data: ThumbRequest) => data)
  .handler(async ({ data }) => {
    const sessionKey = data.sessionKey.trim()
    if (!sessionKey || !isListingId(data.listingId)) return { ok: false as const }
    if (!isThumbQuestionId(data.questionId) || !isThumbVote(data.vote)) {
      return { ok: false as const }
    }

    const excerpt = formatThumbExcerpt(
      data.vote,
      questionPrompt(data.questionId)
    )
    const written = await rouPersonaRouter.companion.writeNote({
      sessionKey,
      category: 'property_interest',
      noteKey: thumbNoteKey(data.listingId, data.questionId),
      excerpt,
      confidence: 0.95,
      source: 'user',
      updatedBy: 'account_holder',
    })
    if (!written.ok) return { ok: false as const }

    if (data.questionId === 'keep_favorite') {
      await rouPersonaRouter.companion.writeNote({
        sessionKey,
        category: 'property_interest',
        noteKey: trashNoteKey(data.listingId),
        excerpt: formatTrashExcerpt(data.vote === 'down'),
        confidence: 0.95,
        source: 'user',
        updatedBy: 'account_holder',
      })
    }

    return { ok: true as const, vote: data.vote }
  })

export const restoreGholiListing = createServerFn({ method: 'POST' })
  .validator((data: { sessionKey: string; listingId: string }) => data)
  .handler(async ({ data }) => {
    const sessionKey = data.sessionKey.trim()
    if (!sessionKey || !isListingId(data.listingId)) return { ok: false as const }
    const favorite = await rouPersonaRouter.companion.writeNote({
      sessionKey,
      category: 'property_interest',
      noteKey: thumbNoteKey(data.listingId, 'keep_favorite'),
      excerpt: formatThumbExcerpt(
        'up',
        questionPrompt('keep_favorite')
      ),
      confidence: 0.95,
      source: 'user',
      updatedBy: 'account_holder',
    })
    if (!favorite.ok) return { ok: false as const }
    await rouPersonaRouter.companion.writeNote({
      sessionKey,
      category: 'property_interest',
      noteKey: trashNoteKey(data.listingId),
      excerpt: formatTrashExcerpt(false),
      confidence: 0.95,
      source: 'user',
      updatedBy: 'account_holder',
    })
    return { ok: true as const }
  })

export const listGholiThumbs = createServerFn({ method: 'GET' })
  .validator((data: ThumbListRequest) => data)
  .handler(async ({ data }) => {
    const sessionKey = data.sessionKey.trim()
    if (!sessionKey || !isListingId(data.listingId)) return {}
    const memory = await rouPersonaRouter.companion.readMemory(sessionKey)
    if (!memory.ok) return {}
    return votesFromNotes(memory.data.notes, data.listingId)
  })

export const listGholiNotebook = createServerFn({ method: 'GET' })
  .validator((data: { sessionKey: string }) => data)
  .handler(async ({ data }) => {
    const sessionKey = data.sessionKey.trim()
    if (!sessionKey) {
      return { ratedListingIds: [], trashedListingIds: [] }
    }
    const memory = await rouPersonaRouter.companion.readMemory(sessionKey)
    if (!memory.ok) {
      return { ratedListingIds: [], trashedListingIds: [] }
    }
    return notebookFromNotes(memory.data.notes)
  })
