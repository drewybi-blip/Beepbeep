import { aud, checkedLabel, STORE_LABELS } from '../lib/format.ts'
import type { PriceRecord, StoreQuote } from '../lib/types.ts'

export function quoteBadge(quote: StoreQuote) {
  if (quote.halfPrice) return 'Half price'
  if (quote.onSpecial) return quote.specialLabel || 'Special'
  return null
}

export function PriceStack({ record, pending, compact = false }: { record?: PriceRecord; pending?: boolean; compact?: boolean }) {
  if (pending && !record?.checkedAt) {
    return <p className="text-sm font-bold text-gold-ink">Checking Coles, Woolworths, Aldi and IGA…</p>
  }
  if (!record?.stores?.length) {
    if (!record?.name) {
      return <p className="text-sm font-semibold text-muted">No product name on file, so the supermarkets were not searched.</p>
    }
    return <p className="text-sm font-semibold text-muted">Prices appear after the daily check.</p>
  }
  return (
    <div className="space-y-2">
      {record.stores.map((quote) => (
        <PriceLine key={quote.store} quote={quote} compact={compact} />
      ))}
      {record.checkedAt ? <p className="text-xs font-bold text-muted">{checkedLabel(record.checkedAt)}</p> : null}
    </div>
  )
}

function PriceLine({ quote, compact }: { quote: StoreQuote; compact: boolean }) {
  const badge = quoteBadge(quote)
  return (
    <div className="rounded-2xl bg-paper px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-extrabold text-pine">{STORE_LABELS[quote.store] || quote.store}</span>
        {quote.status === 'found' && quote.price != null ? (
          <span className="text-right">
            {quote.wasPrice != null && quote.wasPrice > quote.price ? (
              <span className="mr-2 text-sm font-bold text-muted line-through">{aud(quote.wasPrice)}</span>
            ) : null}
            <span className="font-extrabold">{aud(quote.price)}</span>
          </span>
        ) : (
          <span className="text-sm font-bold text-muted">{quote.status === 'unavailable' ? 'Unavailable' : 'No match'}</span>
        )}
      </div>
      {badge ? (
        <span className="sticker mt-1 bg-leaf px-2 py-0.5 text-[11px] font-black text-white">{badge}</span>
      ) : null}
      {quote.unitPrice && !compact ? <p className="mt-1 text-xs font-semibold text-muted">{quote.unitPrice}</p> : null}
      {compact && quote.match ? (
        <p className="mt-1 text-xs font-semibold text-muted">{quote.match === 'barcode' ? 'Barcode match' : 'Name and size match'}</p>
      ) : null}
      {!compact && quote.note ? <p className="mt-1 text-xs font-semibold leading-snug text-muted">{quote.note}</p> : null}
      {!compact && quote.url && quote.status === 'found' ? (
        <a className="mt-1 inline-block text-xs font-extrabold text-leaf underline" href={quote.url} target="_blank" rel="noreferrer">
          View on {STORE_LABELS[quote.store]}
        </a>
      ) : null}
    </div>
  )
}
