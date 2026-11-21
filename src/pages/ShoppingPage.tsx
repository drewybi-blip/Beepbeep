import { Minus, Plus, Trash2 } from 'lucide-react'
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
import { addFreeText, clearTicked, removeItem, setQuantity, toggleItem, useShoppingList } from '../lib/shopping.ts'

export function ShoppingPage() {
  const items = useShoppingList()
  const { prices } = usePrices()
  const [draft, setDraft] = useState('')
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
        <Link to="/store" className="flex h-14 items-center justify-center rounded-full bg-lime text-lg font-black text-pine shadow-[4px_4px_0_#0e3b2e]">
          In-store mode
        </Link>
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
          <Button type="submit" className="shrink-0" aria-label="Add item">
            <Plus />
          </Button>
        </form>

        {!items.length ? (
          <div className="rounded-[28px] bg-white p-6 text-center">
            <p className="text-xl font-black">The trolley’s empty</p>
            <p className="mt-2 font-semibold text-muted">Add something from a product, or type it in.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const price = item.barcode ? lowestPrice(prices[item.barcode]) : null
              return (
                <li key={item.id} className={`rounded-[24px] bg-white p-3 shadow-sm ${item.checked ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-pressed={item.checked}
                      aria-label={item.checked ? `Untick ${item.name}` : `Tick ${item.name}`}
                      onClick={() => toggleItem(item.id)}
                      className={`h-8 w-8 shrink-0 rounded-full border-2 ${item.checked ? 'border-pine bg-gold' : 'border-line bg-white'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-extrabold ${item.checked ? 'line-through' : ''}`}>{item.name}</p>
                      <p className="text-xs font-bold text-muted">
                        {item.brand || 'Typed in'}
                        {price != null ? ` · from ${aud(price)} online` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-paper" onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center font-extrabold">{item.quantity}</span>
                      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-paper" onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
                        <Plus size={16} />
                      </button>
                    </div>
                    <button type="button" className="text-muted" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
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
    </div>
  )
}
