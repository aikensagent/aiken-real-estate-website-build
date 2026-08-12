type RouCardIntroDialogProps = {
  open: boolean
  onDismiss: () => void
}

const ROU_CAN_HELP_WITH = [
  'Nearest playground',
  'Schools nearby',
  'Grocery & daily needs',
  'How far things are from this home',
] as const

/**
 * First-open property-card intro: neighborhood-fit framing + example asks.
 * One-time; not an account / lead popup.
 */
export function RouCardIntroDialog({ open, onDismiss }: RouCardIntroDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-slate/50 p-4 sm:items-center"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rou-card-intro-title"
        aria-describedby="rou-card-intro-body"
        className="w-full max-w-md rounded-xl border border-brand-navy/15 bg-brand-cream p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="rou-card-intro-title"
          className="text-lg font-semibold text-brand-navy"
        >
          Introducing Rou
        </h2>
        <div
          id="rou-card-intro-body"
          className="mt-2 space-y-3 text-sm leading-relaxed text-brand-slate"
        >
          <p>
            While you check whether this home fits your needs, Rou can help you
            see whether the neighborhood fits too — just ask.
          </p>
          <p className="rounded-md border border-brand-navy/10 bg-white px-3 py-2 font-medium text-brand-navy">
            “Rou, show me the nearest playground”
          </p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/70">
              You can also ask about
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {ROU_CAN_HELP_WITH.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-brand-slate/80">
            Tap <span className="font-medium text-brand-navy">Ask Rou</span> on
            a card to pick that home. Rou is the navy orb in the corner — answers
            show next to it. The page stays usable while you talk.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-navy/90"
          aria-label="Dismiss Rou introduction"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
