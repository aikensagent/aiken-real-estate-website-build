type RouOrbProps = {
  speaking: boolean
  caption: string | null
  muted: boolean
  onOpenChat: () => void
}

/**
 * Public Rou visual: abstract orb (brand navy/gold), EQ pulse while speaking,
 * captions on a cream scrim so text never sits naked on the map.
 * Conversation still lives in ChatWidget until the orb fully replaces it.
 */
export function RouOrb({ speaking, caption, muted, onOpenChat }: RouOrbProps) {
  const showCaption = Boolean(caption?.trim()) && (muted || speaking)

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex max-w-[min(22rem,calc(100vw-2rem))] flex-col items-start gap-2 md:bottom-6 md:left-6">
      {showCaption && (
        <div
          className="pointer-events-auto rounded-lg border border-brand-navy/20 bg-brand-cream px-3 py-2 text-sm leading-snug text-brand-navy shadow-lg"
          role="status"
          aria-live="polite"
        >
          {caption}
        </div>
      )}
      <button
        type="button"
        onClick={onOpenChat}
        className="pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy shadow-lg ring-2 ring-brand-gold/70 transition hover:scale-105 md:h-20 md:w-20"
        aria-label="Open Rou"
      >
        <span className="sr-only">Rou</span>
        <span
          className={`absolute inset-1 rounded-full border border-brand-gold/40 ${
            speaking ? 'animate-pulse' : ''
          }`}
          aria-hidden
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
      </button>
    </div>
  )
}
