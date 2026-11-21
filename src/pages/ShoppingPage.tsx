import { Icon } from '../components/icons.tsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { InstallHint } from '../components/InstallHint.tsx'
import { SpecialBanner } from '../components/SpecialBanner.tsx'
import { WalletButtons } from '../components/WalletButtons.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { aud } from '../lib/format.ts'
import { lowestPrice, usePrices } from '../lib/prices.ts'
import { ShareSheet } from '../components/ShareSheet.tsx'
import { addFreeText, clearTicked, removeItem, setQuantity, toggleItem, useLiveListSync, useShoppingList } from '../lib/shopping.ts'
import { Confetti } from '../components/Confetti.tsx'

export function ShoppingPage() {
  const items = useShoppingList()
  const { prices } = usePrices()
  const [draft, setDraft] = useState('')
  const [share, setShare] = useState(false)
  useLiveListSync()
  const open = items.filter((item) => !item.checked)
  const estimate = useMemo(() => {
    const values = open.map((item) => {
      if (!item.barcode) return null
      const price = lowestPrice(prices[item.barcode])
      return price == null ? null : price * item.quantity
    })
    if (!values.some((value) => value != null)) return null
    return values.reduce<number>((sum, value) => sum + (value || 0), 0)
  }, [open, prices])

  return (
    <div>
      <TopBar title="Shopping list" />
      <main className="space-y-4 px-4 pb-28">
        <p className="font-semibold text-muted">Tick them off as you wander the aisles. This list stays on your phone, even with no reception.</p>
        <Link to="/store" className="press flex h-14 items-center justify-center gap-2 rounded-full bg-leaf text-lg font-bold text-white shadow-[0_12px_28px_rgba(0,132,61,0.28)]">
          <Icon name="store" size={22} /> In-store mode
        </Link>
        <button type="button" className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gold text-lg font-extrabold text-pine shadow-[0_12px_28px_rgba(255,205,0,0.45)]" onClick={() => setShare(true)}>
          <Icon name="share" size={22} /> Share list
        </button>
        <InstallHint />
        <WalletButtons />
        <SpecialBanner records={Object.values(prices)} barcodes={new Set(items.map((item) => item.barcode).filter((code): code is string => Boolean(code)))} />
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addFreeText(draft)
            setDraft('')
          }}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add milk, bread, anything" aria-label="New item" />
          <Button type="submit" className="press shrink-0" aria-label="Add item">
            <Icon name="tick" size={20} />
          </Button>
        </form>

        {!items.length ? (
          <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-soft">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold text-pine"><Icon name="basket" size={32} /></span>
            <p className="font-display mt-4 text-2xl font-bold">The trolley’s empty</p>
            <p className="mt-2 text-sm text-muted">Add something from a product, or type it in.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const price = item.barcode ? lowestPrice(prices[item.barcode]) : null
              return (
                <li key={item.id} className={`overflow-hidden rounded-3xl bg-white shadow-soft transition ${item.checked ? 'opacity-60' : ''}`}>
                  {item.store ? <div className="tag-strip rounded-none bg-gold text-pine">{item.store}</div> : null}
                  <div className="flex items-start gap-3 p-4">
                    <button
                      type="button"
                      aria-pressed={item.checked}
                      aria-label={item.checked ? `Untick ${item.name}` : `Tick ${item.name}`}
                      onClick={() => toggleItem(item.id)}
                      className={`press grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 ${item.checked ? 'border-pine bg-gold text-pine' : 'border-line bg-paper text-transparent'}`}
                    >
                      <Icon name="tick" size={28} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-display text-lg leading-tight font-bold ${item.checked ? 'line-through' : ''}`}>{item.name}</p>
                      <p className="text-xs font-semibold text-muted">
                        {item.checked && item.checkedBy ? `Ticked by ${item.checkedBy}` : item.addedBy && item.addedBy !== 'owner' ? `Added by ${item.addedBy}` : item.brand || 'Typed in'}
                        {price != null ? ` · from ${aud(price)}` : ''}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-lg font-bold" onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-lg font-bold" onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">+</button>
                        <button type="button" className="ml-auto text-sm font-semibold text-muted" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>Remove</button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {items.length > 0 && open.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl bg-lime px-4 py-6 text-center">
            <Confetti />
            <p className="font-display relative text-2xl font-bold text-pine">Shopping done!</p>
          </div>
        ) : null}
        {items.some((item) => item.checked) ? (
          <Button type="button" variant="secondary" onClick={clearTicked}>Clear ticked</Button>
        ) : null}
      </main>
      <div className="fixed inset-x-0 z-30 mx-auto max-w-[480px] px-4 bottom-[calc(4.6rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between rounded-full bg-pine px-5 py-3 text-gold shadow-[0_12px_30px_rgba(14,59,46,0.25)]">
          <span className="font-extrabold">{open.length} to get{items.length - open.length ? ` · ${items.length - open.length} ticked` : ''}</span>
          <span className="font-extrabold">{estimate != null ? `from ${aud(estimate)}` : 'Add a scan for prices'}</span>
        </div>
      </div>
      <ShareSheet open={share} onOpenChange={setShare} />
    </div>
  )
}
