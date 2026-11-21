import { Icon } from '../components/icons.tsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PriceStack } from '../components/Prices.tsx'
import { SpecialBanner } from '../components/SpecialBanner.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { Button } from '../components/ui/button.tsx'
import { Sheet } from '../components/ui/dialog.tsx'
import { aud, scannedOn } from '../lib/format.ts'
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
        {offline ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-pine">Price check is offline. Your researched products are still here.</p> : null}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4">
          <FilterPill active={!onlySpecial} icon="star" label="All" onClick={() => setOnlySpecial(false)} />
          <FilterPill active={onlySpecial} icon="fire" label={`On special${specials.length ? ` · ${specials.length}` : ''}`} onClick={() => setOnlySpecial(true)} />
          {items.length ? (
            <button type="button" className="ml-auto shrink-0 text-sm font-semibold text-muted" onClick={() => setConfirm(true)}>
              Clear all
            </button>
          ) : null}
        </div>

        {specials.length && !onlySpecial ? (
          <section>
            <h2 className="font-display mb-4 text-2xl font-bold">On sale now</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {specials.map((item) => {
                const quote = bestSpecial(prices[item.code]?.stores || [])
                return (
                  <Link key={item.code} to={`/product/${encodeURIComponent(item.code)}`} className="w-44 shrink-0 overflow-hidden rounded-3xl bg-white shadow-soft">
                    <div className="blob-mask mx-3 mt-3 h-28 bg-gold-soft">
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" /> : <span className="grid h-full place-items-center text-pine"><Icon name="basket" /></span>}
                    </div>
                    <div className="p-3">
                      <span className="tag-strip bg-pop text-white">{quote?.wasPrice ? 'Price drop' : 'On special'}</span>
                      <p className="font-display mt-2 line-clamp-2 font-bold leading-tight">{item.name || item.code}</p>
                      {quote?.price != null ? <p className="font-display mt-2 text-lg font-extrabold">{aud(quote.price)}</p> : null}
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
              <li key={item.code} className="overflow-hidden rounded-3xl bg-white shadow-soft">
                <Link to={`/product/${encodeURIComponent(item.code)}`} className="grid grid-cols-[104px_1fr] gap-3 p-3">
                  <div className="blob-mask h-24 bg-gold-soft">
                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" /> : <span className="grid h-full place-items-center text-pine"><Icon name="basket" /></span>}
                  </div>
                  <div className="min-w-0 py-1">
                    <div className="flex flex-wrap gap-1">
                      {bestSpecial(prices[item.code]?.stores || []) ? <span className="tag-strip bg-pop text-white">On special</span> : <span className="tag-strip bg-gold text-pine">Researched</span>}
                      {Date.now() - item.scannedAt < 86_400_000 ? <span className="tag-strip bg-lime text-pine">New</span> : null}
                    </div>
                    <p className="font-display mt-2 truncate text-lg font-bold leading-tight">{item.name || 'Unknown product'}</p>
                    <p className="truncate text-sm text-muted">{item.brand || item.code} · {scannedOn(item.scannedAt)}</p>
                  </div>
                </Link>
                <div className="px-3 pb-3">
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

function FilterPill({ active, icon, label, onClick }: { active: boolean; icon: 'star' | 'fire'; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`press flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${active ? 'bg-pine text-gold' : 'bg-white text-pine shadow-soft'}`}>
      <Icon name={icon} size={16} />
      {label}
    </button>
  )
}
