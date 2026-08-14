import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  formatThumbExcerpt,
  GHOLI_THUMB_QUESTION_POOL,
  GHOLI_THUMBS_PER_LISTING,
  notebookFromNotes,
  questionsForListing,
  thumbNoteKey,
  votesFromNotes,
} from './gholi-thumbs'

const here = dirname(fileURLToPath(import.meta.url))
const listingId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('Gholi account thumbs', () => {
  it('asks five home-fit questions and never steers on protected classes', () => {
    const asked = questionsForListing(listingId)
    expect(asked).toHaveLength(GHOLI_THUMBS_PER_LISTING)
    expect(questionsForListing(listingId).map((q) => q.id)).toEqual(
      asked.map((q) => q.id)
    )
    const blob = GHOLI_THUMB_QUESTION_POOL.map((q) => q.prompt).join(' ')
    expect(blob.toLowerCase()).not.toContain('school')
    expect(blob.toLowerCase()).not.toContain('family')
    expect(blob.toLowerCase()).not.toContain('safe neighborhood')
    expect(blob.toLowerCase()).not.toContain('demographic')
  })

  it('stores an explicit up/down excerpt and reads it back', () => {
    const key = thumbNoteKey(listingId, 'see_in_person')
    expect(key).toContain(listingId)
    expect(formatThumbExcerpt('up', 'Would you want to see this home in person?')).toBe(
      'up | Would you want to see this home in person?'
    )
    const votes = votesFromNotes(
      [
        {
          note_key: key,
          excerpt: 'up | Would you want to see this home in person?',
          is_active: true,
        },
        {
          note_key: thumbNoteKey(listingId, 'price_range'),
          excerpt: 'down | Is the asking price in your range?',
          is_active: false,
        },
      ],
      listingId
    )
    expect(votes.see_in_person).toBe('up')
    expect(votes.price_range).toBeUndefined()
  })

  it('splits rated homes from the trash bin', () => {
    const keep = listingId
    const dump = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const book = notebookFromNotes([
      { note_key: `thumb:${keep}:see_in_person`, is_active: true },
      { note_key: `thumb:${dump}:keep_favorite`, is_active: true },
      { note_key: `trash:${dump}`, is_active: true },
    ])
    expect(book.ratedListingIds).toEqual([keep])
    expect(book.trashedListingIds).toEqual([dump])
  })
})

describe('Rou listing thumbs isolation', () => {
  it('puts Yes/No on the listing page as Rou, not on /account or ChatWidget', () => {
    const account = readFileSync(join(here, '../../routes/account.tsx'), 'utf8')
    const listing = readFileSync(
      join(here, '../../routes/listing.$listingId.tsx'),
      'utf8'
    )
    const thumbs = readFileSync(
      join(here, '../../components/RouThumbs.tsx'),
      'utf8'
    )
    const widget = readFileSync(
      join(here, '../../components/ChatWidget.tsx'),
      'utf8'
    )
    expect(account).toContain("createFileRoute('/account')")
    expect(account).toContain('Gholi')
    expect(account).toContain('Your dashboard')
    expect(account).toContain('Rated homes')
    expect(account).toContain('Trash')
    expect(account).toContain('Saved searches')
    expect(account).toContain('listGholiNotebook')
    expect(account).toContain('resolveBuyerAccount')
    expect(account).toContain("to: '/login'")
    expect(account).not.toContain('recordGholiThumb')
    expect(account).not.toMatch(/from ['"][^'"]*ChatWidget['"]/)
    expect(account).not.toMatch(/from ['"][^'"]*RouThumbs['"]/)
    expect(account).not.toMatch(/from ['"][^'"]*rou\/node-a['"]/)
    expect(account).not.toMatch(/from ['"][^'"]*supabase['"]/)
    expect(listing).toContain('RouThumbs')
    expect(listing).not.toContain('Tell Gholi')
    expect(thumbs).toContain('Tell Rou what you think')
    expect(thumbs).toContain('Back to search')
    expect(thumbs).toContain('search={{ listingId }}')
    expect(thumbs).toContain('recordGholiThumb')
    expect(thumbs).not.toContain('Submit')
    expect(thumbs).not.toContain('Tell Gholi')
    expect(thumbs).not.toContain('GHOLI_DISPLAY_NAME')
    expect(widget).not.toContain('recordGholiThumb')
    expect(widget).not.toContain('GHOLI_THUMB_QUESTION_POOL')
    expect(widget).not.toContain('RouThumbs')
  })
})
