import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/icons.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { arrangeForStore } from '../lib/store-mode.ts'
import { listId, toggleItem, useLiveListSync, useShoppingList } from '../lib/shopping.ts'
import type { ListItem } from '../lib/types.ts'

type SharedList = { id: string; items: ListItem[] }

export function InStorePage() {
  const params = useParams()
  const ownId = listId()
  const requested = params.listId || ownId
  const local = useShoppingList()
  const mine = requested === ownId
  useLiveListSync()
  const [shared, setShared] = useState<ListItem[] | null>(null)
  const [offlineNote, setOfflineNote] = useState<string | null>(null)
  const [awake, setAwake] = useState<'on' | 'off' | 'unsupported'>('unsupported')

  useEffect(() => {
    document.title = 'In-store · BeepBeep'
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const claim = async () => {
      if (!('wakeLock' in navigator)) {
        setAwake('unsupported')
        return
      }
      try {
        lock = await navigator.wakeLock.request('screen')
        if (!cancelled) setAwake('on')
      } catch {
        if (!cancelled) setAwake('off')
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void claim()
    }
    void claim()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])

  useEffect(() => {
    if (mine) return
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`/api/lists/${requested}`)
        if (!response.ok) throw new Error('missing')
        const body = (await response.json()) as SharedList
        if (!cancelled) setShared(body.items || [])
      } catch {
        try {
          const cache = await caches.open('shopmate-lists')
          const cached = await cache.match(`/api/lists/${requested}`)
          if (cached) {
            const body = (await cached.json()) as SharedList
            if (!cancelled) {
              setShared(body.items || [])
              setOfflineNote('Showing the saved copy. You’re offline.')
            }
            return
          }
        } catch {
          /* cache unavailable */
        }
        if (!cancelled) setOfflineNote('This shared list isn’t on the phone yet.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [mine, requested])

  const items = mine ? local : shared || []
  const { groups, done } = arrangeForStore(items)

  function tick(id: string) {
    if (mine) {
      toggleItem(id)
      return
    }
    const who = localStorage.getItem('beepbeep.shopper') || 'Shopper'
    setShared((current) => {
      const target = (current || []).find((item) => item.id === id)
      const checked = !target?.checked
      const next = (current || []).map((item) => (item.id === id ? { ...item, checked, checkedBy: checked ? who : null, checkedAt: Date.now() } : item))
      void fetch(`/api/lists/${requested}/tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, checked, by: who }),
      }).catch(() => undefined)
      return next
    })
  }

  return (
    <div className="min-h-dvh bg-paper pb-8">
      <TopBar
        extra={
          <Link to="/list" className="press rounded-full bg-white px-4 py-2 text-sm font-semibold text-pine shadow-soft">
            Done
          </Link>
        }
      />
      <div className="px-4 pt-4">
      <p className="tag-strip bg-lime text-pine">In-store mode</p>
      <h1 className="font-display mt-4 text-[32px] leading-none font-extrabold text-pine">Tick it off</h1>
      <p className="mt-3 text-sm font-semibold text-muted">
        {awake === 'on' ? 'Screen stays awake while you shop.' : awake === 'off' ? 'Couldn’t keep the screen awake. The list still works.' : 'This browser can’t keep the screen awake. The list still works.'}
      </p>
      {offlineNote ? <p className="mt-2 text-sm font-bold text-gold-ink">{offlineNote}</p> : null}

      {!items.length ? (
        <div className="mt-8 rounded-3xl bg-white px-6 py-10 text-center shadow-soft">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gold text-pine"><Icon name="basket" size={32} /></span>
          <p className="font-display mt-4 text-2xl font-bold">Nothing to tick</p>
          <p className="mt-2 text-sm text-muted">Add a few things, then come back and beep through the aisle.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <section key={group.store}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wide text-gold-ink uppercase"><Icon name="store" size={16} /> {group.store}</h2>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <StoreRow key={item.id} item={item} onTick={() => tick(item.id)} />
                ))}
              </ul>
            </section>
          ))}
          {done.length ? (
            <section>
              <h2 className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-muted">In the trolley</h2>
              <ul className="space-y-3">
                {done.map((item) => (
                  <StoreRow key={item.id} item={item} onTick={() => tick(item.id)} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
      </div>
    </div>
  )
}

function StoreRow({ item, onTick }: { item: ListItem; onTick: () => void }) {
  return (
    <li className={`transition duration-300 ${item.checked ? 'translate-y-1 opacity-60' : ''}`}>
      <button
        type="button"
        onClick={onTick}
        aria-pressed={item.checked}
        className="press flex min-h-20 w-full items-center gap-4 rounded-3xl bg-white px-3 py-3 text-left shadow-soft"
      >
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 ${item.checked ? 'border-pine bg-gold text-pine' : 'border-line bg-paper text-transparent'}`}>
          <Icon name="tick" size={28} />
        </span>
        <span className="min-w-0">
          <span className={`font-display block text-xl font-bold leading-tight ${item.checked ? 'line-through' : ''}`}>
            {item.quantity > 1 ? `${item.quantity} × ` : ''}
            {item.name}
          </span>
          <span className="mt-1 block text-sm font-bold text-muted">
            {item.checked && item.checkedBy ? `Ticked by ${item.checkedBy}` : [item.aisle ? `Aisle ${item.aisle}` : null, item.brand].filter(Boolean).join(' · ') || 'No aisle on file'}
          </span>
        </span>
      </button>
    </li>
  )
}
