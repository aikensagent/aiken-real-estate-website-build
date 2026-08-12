import gholiPortrait from '@/assets/gholi-avatar.jpg'

type RouOrbProps = {
  speaking: boolean
  caption: string | null
  muted: boolean
  askEnabled?: boolean
  chips?: string[]
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
  onChip,
  onAsk,
}: RouOrbProps) {
  const showCaption = Boolean(caption?.trim()) && (muted || speaking)
  const showAsk = Boolean(askEnabled && onAsk)

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex max-w-[min(16rem,calc(100vw-2rem))] flex-col items-start gap-2 md:bottom-6 md:left-6">
      {showCaption && (
        <div
          className="pointer-events-auto max-h-20 w-full overflow-y-auto rounded-lg border border-brand-navy/20 bg-brand-cream px-3 py-2 text-xs leading-snug text-brand-navy shadow-lg"
          role="status"
          aria-live="polite"
        >
          {caption}
        </div>
      )}
      {(showAsk || chips.length > 0) && (
        <div className="pointer-events-auto w-full rounded-lg border border-brand-navy/20 bg-brand-cream px-3 py-2 shadow-lg">
          {chips.length > 0 && onChip && (
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
      <div
        className="relative h-20 w-20 overflow-hidden rounded-full bg-brand-navy shadow-lg ring-2 ring-brand-gold/70 md:h-24 md:w-24"
        role="img"
        aria-label="Rou"
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
      </div>
    </div>
  )
}
