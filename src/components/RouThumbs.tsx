import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { questionsForListing, type ThumbVote } from '../lib/rou/gholi-thumbs'
import { getRouVisitorKey } from '../lib/rou/rou-session'
import { listGholiThumbs, recordGholiThumb } from '../routes/api/-gholi-thumbs'

type RouThumbsProps = {
  listingId: string
  address: string
  variant?: 'page' | 'card'
}

export function RouThumbs({
  listingId,
  address,
  variant = 'page',
}: RouThumbsProps) {
  const [sessionKey, setSessionKey] = useState('')
  const [votes, setVotes] = useState<Record<string, ThumbVote>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSessionKey(getRouVisitorKey())
  }, [])

  useEffect(() => {
    if (!sessionKey) return
    let cancelled = false
    setReady(false)
    void listGholiThumbs({ data: { sessionKey, listingId } }).then((next) => {
      if (!cancelled) {
        setVotes(next)
        setReady(true)
      }
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
  const saved = votes.keep_favorite === 'up'
  const saveBusy = savingId === 'keep_favorite'

  if (variant === 'card') {
    const nextQuestion = questions.find((q) => !votes[q.id])
    const answeredCount = questions.filter((q) => votes[q.id]).length
    const headingId = `rou-thumbs-card-${listingId}`

    return (
      <section
        className="border-t border-brand-navy/10 px-3 py-2.5"
        aria-labelledby={headingId}
        aria-busy={!ready}
      >
        <h2 id={headingId} className="text-sm font-semibold text-brand-navy">
          Tell Rou what you think
        </h2>
        <SaveHomeButton
          address={address}
          saved={saved}
          busy={!ready || saveBusy}
          onSave={() => void vote('keep_favorite', 'up')}
        />
        {!ready ? (
          <p className="mt-1 text-sm text-brand-slate">
            Yes or no on {address}.
          </p>
        ) : nextQuestion ? (
          <>
            <p className="mt-1 text-sm text-brand-slate">
              {answeredCount + 1} of {questions.length} — {nextQuestion.prompt}
            </p>
            <VotePair
              prompt={nextQuestion.prompt}
              current={votes[nextQuestion.id]}
              disabled={savingId === nextQuestion.id}
              onVote={(next) => void vote(nextQuestion.id, next)}
            />
          </>
        ) : (
          <p className="mt-1 text-sm text-brand-slate">
            Saved with your search.
          </p>
        )}
      </section>
    )
  }

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
      <SaveHomeButton
        address={address}
        saved={saved}
        busy={!sessionKey || saveBusy}
        onSave={() => void vote('keep_favorite', 'up')}
      />
      <ol className="mt-4 space-y-4">
        {questions.map((question) => {
          const current = votes[question.id]
          return (
            <li key={question.id}>
              <p className="text-sm font-medium text-brand-navy">
                {question.prompt}
              </p>
              <VotePair
                prompt={question.prompt}
                current={current}
                disabled={savingId === question.id}
                onVote={(next) => void vote(question.id, next)}
              />
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

function SaveHomeButton({
  address,
  saved,
  busy,
  onSave,
}: {
  address: string
  saved: boolean
  busy: boolean
  onSave: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={
        saved
          ? `${address} is saved with your search`
          : `Save ${address} with your search`
      }
      disabled={busy || saved}
      onClick={onSave}
      className={`mt-3 w-full rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60 ${
        saved
          ? 'bg-brand-navy text-brand-cream'
          : 'border border-brand-navy/20 bg-brand-cream text-brand-navy'
      }`}
    >
      {saved ? 'Saved with your search' : 'Save this home'}
    </button>
  )
}

function VotePair({
  prompt,
  current,
  disabled,
  onVote,
}: {
  prompt: string
  current?: ThumbVote
  disabled: boolean
  onVote: (vote: ThumbVote) => void
}) {
  return (
    <div className="mt-2 flex gap-2" role="group" aria-label={prompt}>
      <button
        type="button"
        aria-pressed={current === 'up'}
        aria-label={`Yes: ${prompt}`}
        disabled={disabled}
        onClick={() => onVote('up')}
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
        aria-label={`No: ${prompt}`}
        disabled={disabled}
        onClick={() => onVote('down')}
        className={`rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
          current === 'down'
            ? 'bg-brand-navy text-brand-cream'
            : 'border border-brand-navy/20 bg-brand-cream text-brand-navy'
        }`}
      >
        No
      </button>
    </div>
  )
}
