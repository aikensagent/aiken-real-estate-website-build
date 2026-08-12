type RouOrbProps = {
  speaking: boolean
  caption: string | null
  muted: boolean
  chips?: string[]
  onChip?: (label: string) => void
  onAsk?: (text: string) => void
}

/**
 * Public Rou visual: abstract orb, EQ while speaking, captions on a cream scrim.
 * No portrait — grey-hoodie image is Cursor chat only, not the public site.
 */
export function RouOrb({
  speaking,
  caption,
  muted,
  chips = [],
  onChip,
  onAsk,
}: RouOrbProps) {
  const showCaption =
    Boolean(caption?.trim()) && (muted || speaking || chips.length > 0)

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex max-w-[min(22rem,calc(100vw-2rem))] flex-col items-start gap-2 md:bottom-6 md:left-6">
      {showCaption && (
        <div
          className="pointer-events-auto w-full rounded-lg border border-brand-navy/20 bg-brand-cream px-3 py-2 text-sm leading-snug text-brand-navy shadow-lg"
          role="status"
          aria-live="polite"
        >
          {caption}
          {chips.length > 0 && onChip && (
            <div
              className="mt-2 flex flex-wrap gap-1.5"
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
          {onAsk && (
            <form
              className="mt-2"
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const field = form.elements.namedItem(
                  'rou-ask'
                ) as HTMLInputElement
                const value = field.value.trim()
                if (!value) return
                onAsk(value)
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
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy shadow-lg ring-2 ring-brand-gold/70 md:h-20 md:w-20"
        role="img"
        aria-label="Rou"
      >
        <span
          className={`absolute inset-1 rounded-full border border-brand-gold/40 ${
            speaking ? 'animate-pulse' : ''
          }`}
        />
        <span className="flex h-7 items-end gap-0.5 md:h-8" aria-hidden>
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
