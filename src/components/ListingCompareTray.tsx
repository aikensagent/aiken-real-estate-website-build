import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  buildCompareMatrix,
  COMPARE_MAX,
  type CompareHome,
} from '../lib/listing-compare'
import { getListingCompare } from '../routes/api/-listing-compare'

type ListingCompareTrayProps = {
  listingIds: string[]
  labels: Record<string, string>
  onRemove: (listingId: string) => void
  onMove: (fromIndex: number, toIndex: number) => void
  onClear: () => void
}

export function ListingCompareTray({
  listingIds,
  labels,
  onRemove,
  onMove,
  onClear,
}: ListingCompareTrayProps) {
  const [open, setOpen] = useState(false)
  const [homes, setHomes] = useState<CompareHome[]>([])
  const [loading, setLoading] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  useEffect(() => {
    if (!open || listingIds.length < 2) {
      if (!open) setHomes([])
      return
    }
    let cancelled = false
    setLoading(true)
    void getListingCompare({ data: { listingIds } }).then((rows) => {
      if (cancelled) return
      setHomes(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, listingIds])

  if (listingIds.length === 0) return null

  const matrix = buildCompareMatrix(homes)
  const canCompare = listingIds.length >= 2

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 md:pr-40">
        <div
          className="pointer-events-auto w-full max-w-3xl rounded-xl border border-brand-navy/15 bg-brand-cream p-3 shadow-lg"
          role="region"
          aria-label="Homes to compare"
        >
          <div className="flex flex-wrap items-center gap-2">
            {listingIds.map((id, index) => (
              <div
                key={id}
                draggable
                onDragStart={() => setDragFrom(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragFrom == null) return
                  onMove(dragFrom, index)
                  setDragFrom(null)
                }}
                className="flex max-w-[12rem] items-center gap-1 rounded-md border border-brand-navy/20 bg-white px-2 py-1 text-xs text-brand-navy"
              >
                <span className="truncate">
                  {labels[id] || `Home ${index + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  aria-label={`Remove ${labels[id] || 'this home'} from compare`}
                  className="shrink-0 rounded px-1 font-semibold text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  ×
                </button>
              </div>
            ))}
            <p className="text-xs text-brand-slate">
              {listingIds.length}/{COMPARE_MAX} · drag to reorder
            </p>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClear}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-navy underline decoration-brand-gold underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={!canCompare}
                aria-label={
                  canCompare
                    ? `Compare ${listingIds.length} homes`
                    : 'Add another home to compare'
                }
                className="rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60"
              >
                Compare {listingIds.length}
              </button>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[55] flex items-end justify-center bg-brand-slate/50 p-3 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-compare-title"
            className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-brand-navy/15 bg-brand-cream p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="listing-compare-title"
                className="text-lg font-semibold text-brand-navy"
              >
                Compare homes
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close compare"
                className="rounded-md px-2 py-1 text-sm font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-sm text-brand-slate">
              Side-by-side listing facts only. This is not a ranking of
              neighborhoods or schools.
            </p>
            {loading ? (
              <p className="mt-4 text-sm text-brand-slate">Loading facts…</p>
            ) : homes.length === 0 ? (
              <p className="mt-4 text-sm text-brand-navy">
                Could not load those homes.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-brand-cream px-2 py-2 text-left font-semibold text-brand-navy">
                        Fact
                      </th>
                      {homes.map((home) => (
                        <th
                          key={home.id}
                          className="min-w-[10rem] px-2 py-2 text-left font-semibold text-brand-navy"
                        >
                          {home.photo && (
                            <img
                              src={home.photo}
                              alt=""
                              className="mb-2 h-20 w-full rounded-md object-cover"
                            />
                          )}
                          <Link
                            to="/listing/$listingId"
                            params={{ listingId: home.id }}
                            className="underline decoration-brand-gold underline-offset-2"
                          >
                            {home.address || 'Aiken listing'}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row) => (
                      <tr key={row.key} className="border-t border-brand-navy/10">
                        <th className="sticky left-0 bg-brand-cream px-2 py-2 text-left font-medium text-brand-slate">
                          {row.label}
                        </th>
                        {row.values.map((value, index) => (
                          <td
                            key={`${row.key}-${homes[index]?.id ?? index}`}
                            className="px-2 py-2 text-brand-navy"
                          >
                            {value || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
