import gholiPortrait from '@/assets/gholi-avatar.jpg'

type RouThreadMessage = {
  role: 'user' | 'assistant'
  content: string
}

type RouOrbProps = {
  speaking: boolean
  caption: string | null
  muted: boolean
  askEnabled?: boolean
  chips?: string[]
  messages?: RouThreadMessage[]
  panelsOpen?: boolean
  onClosePanels?: () => void
  onOpenPanels?: () => void
  onToggleMute?: () => void
  onChip?: (label: string) => void
  onAsk?: (text: string) => void
}

/**
 * Public Rou visual: orb + EQ while speaking, captions on a cream scrim.
 * TEMP workbench: Gholi portrait inside the circle so Nick can see her while building.
 * Revert to abstract navy/gold before any public ship.
 */
export function RouOrb({
  speaking,
  caption,
  muted,
  askEnabled = false,
  chips = [],
  messages = [],
  panelsOpen = true,
  onClosePanels,
  onOpenPanels,
  onToggleMute,
  onChip,
  onAsk,
}: RouOrbProps) {
  const thread = messages
    .filter((row) => row.content.trim())
    .slice(-8)
  const showThread = panelsOpen && thread.length > 0
  const showCaption =
    panelsOpen &&
    !showThread &&
    Boolean(caption?.trim()) &&
    (muted || speaking)
  const showAsk = panelsOpen && Boolean(askEnabled && onAsk)
  const showChips = panelsOpen && chips.length > 0
  const showClose = panelsOpen && Boolean(onClosePanels)

  return (
    <div className="pointer-events-none fixed top-16 right-4 z-40 flex max-w-[min(20rem,calc(100vw-2rem))] flex-col items-end gap-2 md:top-20 md:right-6">
      <button
        type="button"
        onClick={() => {
          if (!panelsOpen) onOpenPanels?.()
        }}
        aria-label={panelsOpen ? 'Rou' : 'Open Rou'}
        aria-expanded={panelsOpen}
        className="pointer-events-auto relative h-20 w-20 overflow-hidden rounded-full bg-brand-navy shadow-lg ring-2 ring-brand-gold/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold md:h-24 md:w-24"
      >
        <img
          src={gholiPortrait}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
        />
        <span
          className={`pointer-events-none absolute inset-1 rounded-full border border-brand-gold/40 ${
            speaking ? 'animate-pulse' : ''
          }`}
        />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-7 items-end justify-center gap-0.5 bg-gradient-to-t from-brand-navy/80 to-transparent pb-1.5 md:h-8"
          aria-hidden
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-brand-gold md:w-1.5"
              style={{
                height: speaking ? undefined : '28%',
                animation: speaking
                  ? `rou-eq 0.9s ease-in-out ${i * 0.12}s infinite`
                  : undefined,
              }}
            />
          ))}
        </span>
      </button>
      {(onToggleMute || showClose) && (
        <div className="pointer-events-auto flex items-center gap-1.5">
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute Rou' : 'Mute Rou'}
              aria-pressed={muted}
              className={`rounded-md border px-2 py-1 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                muted
                  ? 'border-brand-navy bg-brand-navy text-brand-gold'
                  : 'border-brand-navy/20 bg-brand-cream text-brand-navy'
              }`}
            >
              <RouSpeakerIcon muted={muted} />
            </button>
          )}
          {showClose && (
            <button
              type="button"
              onClick={onClosePanels}
              aria-label="Close Rou"
              className="rounded-md border border-brand-navy/20 bg-brand-cream px-2.5 py-1 text-xs font-semibold text-brand-navy shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Close
            </button>
          )}
        </div>
      )}
      {showThread && (
        <div
          className="pointer-events-auto max-h-48 w-full overflow-y-auto rounded-lg border border-brand-navy/20 bg-brand-cream px-3 py-2 shadow-lg"
          role="log"
          aria-label="Conversation with Rou"
          aria-live="polite"
        >
          <ol className="space-y-2">
            {thread.map((row, index) => (
              <li key={`${row.role}-${index}-${row.content.slice(0, 24)}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-navy/70">
                  {row.role === 'user' ? 'You' : 'Rou'}
                </p>
                <p className="text-xs leading-snug text-brand-navy">
                  {row.content}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {showCaption && (
        <div
          className="pointer-events-auto max-h-20 w-full overflow-y-auto rounded-lg border border-brand-navy/20 bg-brand-cream px-3 py-2 text-xs leading-snug text-brand-navy shadow-lg"
          role="status"
          aria-live="polite"
        >
          {caption}
        </div>
      )}
      {(showAsk || showChips) && (
        <div className="pointer-events-auto w-full rounded-lg border border-brand-navy/20 bg-brand-cream px-3 py-2 shadow-lg">
          {showChips && onChip && (
            <div
              className="mb-2 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Suggested questions for Rou"
            >
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChip(chip)}
                  className="rounded-md border border-brand-navy/20 bg-white px-2 py-1 text-xs font-medium text-brand-navy transition hover:bg-brand-navy hover:text-white"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          {showAsk && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const field = form.elements.namedItem(
                  'rou-ask'
                ) as HTMLInputElement
                const value = field.value.trim()
                if (!value) return
                onAsk?.(value)
                field.value = ''
              }}
            >
              <label htmlFor="rou-ask" className="sr-only">
                Ask Rou
              </label>
              <input
                id="rou-ask"
                name="rou-ask"
                type="text"
                placeholder="Ask Rou…"
                className="w-full rounded-md border border-brand-navy/20 bg-white px-2.5 py-1.5 text-xs text-brand-navy placeholder:text-brand-navy/50"
              />
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function RouSpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 9h3l5-4v14l-5-4H5z" />
      {muted ? (
        <path d="M4 4l16 16" />
      ) : (
        <path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" />
      )}
    </svg>
  )
}
