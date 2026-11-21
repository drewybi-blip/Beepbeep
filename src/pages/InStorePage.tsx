import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { arrangeForStore } from '../lib/store-mode.ts'
import { listId, listSnapshot, toggleItem, useShoppingList } from '../lib/shopping.ts'
import type { ListItem } from '../lib/types.ts'

type SharedList = { id: string; items: ListItem[] }

export function InStorePage() {
  const params = useParams()
  const ownId = listId()
  const requested = params.listId || ownId
  const local = useShoppingList()
  const mine = requested === ownId
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
    setShared((current) => {
      const next = (current || []).map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
      const payload = { ...listSnapshot(next), id: requested }
      void fetch('/api/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => undefined)
      return next
    })
  }

  return (
    <div className="min-h-dvh bg-paper px-4 pt-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="sticker bg-lime px-3 py-1 text-xs font-black uppercase tracking-wide text-pine">In-store mode</p>
          <h1 className="mt-3 text-3xl font-black leading-none text-pine">Tick it off</h1>
        </div>
        <Link to="/list" className="rounded-full bg-white px-4 py-2 text-sm font-black text-pine ring-1 ring-line">
          Done
        </Link>
      </div>
      <p className="mt-3 text-sm font-semibold text-muted">
        {awake === 'on' ? 'Screen stays awake while you shop.' : awake === 'off' ? 'Couldn’t keep the screen awake. The list still works.' : 'This browser can’t keep the screen awake. The list still works.'}
      </p>
      {offlineNote ? <p className="mt-2 text-sm font-bold text-gold-ink">{offlineNote}</p> : null}

      {!items.length ? (
        <p className="mt-8 rounded-[28px] bg-white p-6 text-center text-lg font-black">Nothing on this list yet.</p>
      ) : (
        <div className="mt-5 space-y-5">
          {groups.map((group) => (
            <section key={group.store}>
              <h2 className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-gold-ink">{group.store}</h2>
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
  )
}

function StoreRow({ item, onTick }: { item: ListItem; onTick: () => void }) {
  return (
    <li className={`transition duration-300 ${item.checked ? 'translate-y-1 opacity-60' : ''}`}>
      <button
        type="button"
        onClick={onTick}
        aria-pressed={item.checked}
        className="flex min-h-20 w-full items-center gap-4 rounded-[28px] bg-white px-3 py-3 text-left shadow-[0_8px_24px_rgba(20,48,40,0.06)]"
      >
        <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 text-2xl font-black ${item.checked ? 'border-pine bg-gold text-pine' : 'border-line bg-paper text-transparent'}`}>
          ✓
        </span>
        <span className="min-w-0">
          <span className={`block text-xl font-black leading-tight ${item.checked ? 'line-through' : ''}`}>
            {item.quantity > 1 ? `${item.quantity} × ` : ''}
            {item.name}
          </span>
          <span className="mt-1 block text-sm font-bold text-muted">
            {[item.aisle ? `Aisle ${item.aisle}` : null, item.brand].filter(Boolean).join(' · ') || 'No aisle on file'}
          </span>
        </span>
      </button>
    </li>
  )
}
