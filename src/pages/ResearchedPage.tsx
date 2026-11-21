import { Icon } from '../components/icons.tsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PriceStack, quoteBadge } from '../components/Prices.tsx'
import { SpecialBanner } from '../components/SpecialBanner.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { Button } from '../components/ui/button.tsx'
import { Sheet } from '../components/ui/dialog.tsx'
import { aud, scannedOn, STORE_LABELS } from '../lib/format.ts'
import { usePrices } from '../lib/prices.ts'
import { clearResearched, removeResearched, useResearched } from '../lib/researched.ts'
import { preferredPlace } from '../lib/prices.ts'
import { addProductToList } from '../lib/shopping.ts'
import type { StoreQuote } from '../lib/types.ts'

function bestSpecial(quotes: StoreQuote[]) {
  return quotes.find((quote) => quote.onSpecial && quote.price != null) || null
}

export function ResearchedPage() {
  const items = useResearched()
  const { prices, pending, offline } = usePrices()
  const [onlySpecial, setOnlySpecial] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const records = useMemo(() => Object.values(prices), [prices])
  const specials = items.filter((item) => bestSpecial(prices[item.code]?.stores || []))
  const visible = onlySpecial ? specials : items

  return (
    <div>
      <TopBar title="Researched" />
      <main className="space-y-4 px-4 pb-8">
        <p className="font-semibold text-muted">Your little pantry of discoveries, saved on this phone.</p>
        <SpecialBanner records={records} />
        {offline ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-sale">Price check is offline. Your researched products are still here.</p> : null}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOnlySpecial((value) => !value)}
            className={`rounded-full px-4 py-2 text-sm font-extrabold ${onlySpecial ? 'bg-sale text-white' : 'bg-white text-pine ring-1 ring-line'}`}
          >
            On special{specials.length ? ` · ${specials.length}` : ''}
          </button>
          {items.length ? (
            <button type="button" className="text-sm font-extrabold text-muted" onClick={() => setConfirm(true)}>
              Clear all
            </button>
          ) : null}
        </div>

        {specials.length && !onlySpecial ? (
          <section>
            <h2 className="sticker mb-3 bg-lime px-3 py-1 text-lg font-black tracking-tight text-pine">On sale now</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {specials.map((item) => {
                const quote = bestSpecial(prices[item.code]?.stores || [])
                return (
                  <Link key={item.code} to={`/product/${encodeURIComponent(item.code)}`} className="w-44 shrink-0 overflow-hidden rounded-[24px] bg-white shadow-[0_10px_28px_rgba(20,48,40,0.06)]">
                    <div className="flex h-28 items-center justify-center bg-[#fff6df]">
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" /> : null}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 font-extrabold leading-tight">{item.name || item.code}</p>
                      {quote ? (
                        <p className="mt-2 text-sm font-extrabold text-sale">
                          {STORE_LABELS[quote.store]} {quote.price != null ? aud(quote.price) : ''}
                          {quote.wasPrice ? <span className="ml-1 text-muted line-through">{aud(quote.wasPrice)}</span> : null}
                        </p>
                      ) : null}
                      <span className="mt-2 inline-flex rounded-full bg-sale px-2 py-0.5 text-[11px] font-extrabold text-white">{quote ? quoteBadge(quote) : 'Special'}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        {!visible.length ? (
          <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-soft">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold text-pine"><Icon name={onlySpecial ? 'fire' : 'basket'} size={32} /></span>
            <p className="font-display mt-4 text-2xl font-bold">{onlySpecial ? 'No bargains right now' : 'The pantry is quiet'}</p>
            <p className="mt-2 text-sm text-muted">{onlySpecial ? 'We’ll flag it here when a checked price drops.' : 'Scan a packet and it shows up here, loud and proud.'}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li key={item.code} className="rounded-[28px] bg-white p-3 shadow-[0_10px_28px_rgba(20,48,40,0.06)]">
                <Link to={`/product/${encodeURIComponent(item.code)}`} className="flex gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff6df]">
                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" /> : <span className="text-xs font-extrabold text-gold-ink">No photo</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold leading-tight">{item.name || 'Unknown product'}</p>
                    <p className="truncate text-sm font-bold text-muted">{item.brand || item.code}</p>
                    <p className="text-xs font-bold text-gold-ink">{scannedOn(item.scannedAt)}</p>
                  </div>
                </Link>
                <div className="mt-3">
                  <PriceStack record={prices[item.code]} pending={pending.includes(item.code)} compact />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" className="press flex-1 bg-pine text-gold" onClick={() => addProductToList(item, preferredPlace(prices[item.code]))}>
                    <Icon name="basket" size={16} /> Add to list
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeResearched(item.code)} aria-label={`Remove ${item.name || item.code}`}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs font-semibold leading-relaxed text-muted">
          Prices refresh once a day. Coles, Aldi and IGA are read from their public catalogues. Woolworths often blocks server lookups, and when it does the row says unavailable rather than guessing.
        </p>
      </main>
      <Sheet open={confirm} onOpenChange={setConfirm} title="Clear researched products?" description="This only removes them from this phone.">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>Keep them</Button>
          <Button
            type="button"
            variant="sale"
            className="flex-1"
            onClick={() => {
              clearResearched()
              setConfirm(false)
            }}
          >
            Clear all
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
