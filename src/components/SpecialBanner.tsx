import { useState } from 'react'
import { Confetti } from './Confetti.tsx'
import { aud, STORE_LABELS } from '../lib/format.ts'
import { markSpecialsSeen, specialKey, unseenSpecials } from '../lib/prices.ts'
import type { PriceRecord } from '../lib/types.ts'

export function SpecialBanner({ records, barcodes }: { records: PriceRecord[]; barcodes?: Set<string> }) {
  const [hidden, setHidden] = useState(false)
  const relevant = barcodes ? records.filter((record) => barcodes.has(record.barcode)) : records
  const fresh = unseenSpecials(relevant)
  if (hidden || !fresh.length) return null
  const first = fresh[0]
  const name = first.record.name || first.store.productName || first.record.barcode
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gold px-4 py-4 text-pine shadow-[0_12px_32px_rgba(255,194,14,0.35)]">
      <Confetti />
      <p className="sticker bg-leaf px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-white">On special</p>
      <p className="mt-1 text-lg font-extrabold leading-tight">
        {name} is {first.store.price != null ? aud(first.store.price) : 'on special'} at {STORE_LABELS[first.store.store]}
        {first.store.wasPrice ? `, down from ${aud(first.store.wasPrice)}` : ''}.
      </p>
      {fresh.length > 1 ? <p className="mt-1 text-sm font-bold">{fresh.length - 1} more special{fresh.length > 2 ? 's' : ''} today.</p> : null}
      <button
        type="button"
        className="mt-3 rounded-full bg-pine px-4 py-2 text-sm font-extrabold text-gold"
        onClick={() => {
          markSpecialsSeen(fresh.map((item) => specialKey(item.record.barcode, item.store.store, item.store.price as number)))
          setHidden(true)
        }}
      >
        Got it
      </button>
    </div>
  )
}
