import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { questionsForListing, type ThumbVote } from '../lib/rou/gholi-thumbs'
import { getRouVisitorKey } from '../lib/rou/rou-session'
import { listGholiThumbs, recordGholiThumb } from '../routes/api/-gholi-thumbs'

type RouThumbsProps = {
  listingId: string
  address: string
}

export function RouThumbs({ listingId, address }: RouThumbsProps) {
  const [sessionKey, setSessionKey] = useState('')
  const [votes, setVotes] = useState<Record<string, ThumbVote>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setSessionKey(getRouVisitorKey())
  }, [])

  useEffect(() => {
    if (!sessionKey) return
    let cancelled = false
    void listGholiThumbs({ data: { sessionKey, listingId } }).then((next) => {
      if (!cancelled) setVotes(next)
    })
    return () => {
      cancelled = true
    }
  }, [sessionKey, listingId])

  async function vote(questionId: string, next: ThumbVote) {
    if (!sessionKey || savingId) return
    setSavingId(questionId)
    setVotes((prev) => ({ ...prev, [questionId]: next }))
    const result = await recordGholiThumb({
      data: { sessionKey, listingId, questionId, vote: next },
    })
    if (!result.ok) {
      setVotes((prev) => {
        const copy = { ...prev }
        delete copy[questionId]
        return copy
      })
    }
    setSavingId(null)
  }

  const questions = questionsForListing(listingId)

  return (
    <section
      className="rounded-lg border border-brand-navy/10 bg-white p-5"
      aria-labelledby="rou-thumbs-heading"
    >
      <h2
        id="rou-thumbs-heading"
        className="text-lg font-semibold text-brand-navy"
      >
        Tell Rou what you think
      </h2>
      <p className="mt-1 text-sm text-brand-slate">
        Yes or no on {address}. I’ll keep this with your search.
      </p>
      <ol className="mt-4 space-y-4">
        {questions.map((question) => {
          const current = votes[question.id]
          return (
            <li key={question.id}>
              <p className="text-sm font-medium text-brand-navy">
                {question.prompt}
              </p>
              <div
                className="mt-2 flex gap-2"
                role="group"
                aria-label={question.prompt}
              >
                <button
                  type="button"
                  aria-pressed={current === 'up'}
                  aria-label={`Yes: ${question.prompt}`}
                  disabled={savingId === question.id}
                  onClick={() => void vote(question.id, 'up')}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                    current === 'up'
                      ? 'bg-brand-navy text-brand-cream'
                      : 'border border-brand-navy/20 bg-brand-cream text-brand-navy'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  aria-pressed={current === 'down'}
                  aria-label={`No: ${question.prompt}`}
                  disabled={savingId === question.id}
                  onClick={() => void vote(question.id, 'down')}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                    current === 'down'
                      ? 'bg-brand-navy text-brand-cream'
                      : 'border border-brand-navy/20 bg-brand-cream text-brand-navy'
                  }`}
                >
                  No
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <Link
        to="/"
        search={{ listingId }}
        aria-label="Back to search"
        className="mt-5 inline-flex text-sm font-semibold text-brand-navy underline decoration-brand-gold underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
      >
        Back to search
      </Link>
    </section>
  )
}
