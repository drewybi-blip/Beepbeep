import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Confetti } from '../components/Confetti.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { Icon } from '../components/icons.tsx'
import { arrangeForStore } from '../lib/store-mode.ts'
import type { ListItem } from '../lib/types.ts'

type RemoteList = { id: string; allowAdds?: boolean; items: ListItem[] }
type Op =
  | { kind: 'tick'; itemId: string; checked: boolean; by: string }
  | { kind: 'add'; name: string; by: string; tempId: string }

const NAME_KEY = 'beepbeep.shopper'

function queueKey(id: string) {
  return `beepbeep.share-out.${id}`
}

function readQueue(id: string): Op[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(queueKey(id)) || '[]') as Op[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(id: string, ops: Op[]) {
  localStorage.setItem(queueKey(id), JSON.stringify(ops))
}

function withQueue(items: ListItem[], ops: Op[]) {
  let next = items
  for (const op of ops) {
    if (op.kind === 'tick') {
      next = next.map((item) => (item.id === op.itemId ? { ...item, checked: op.checked, checkedBy: op.checked ? op.by : null, checkedAt: Date.now() } : item))
    } else if (!next.some((item) => item.id === op.tempId || item.name === op.name)) {
      next = [
        { id: op.tempId, barcode: null, name: op.name, brand: null, image: null, quantity: 1, checked: false, checkedBy: null, checkedAt: 0, addedBy: op.by, addedAt: Date.now(), store: null, aisle: null },
        ...next,
      ]
    }
  }
  return next
}

async function remember(id: string, list: RemoteList) {
  if (!('caches' in window)) return
  const cache = await caches.open('shopmate-lists')
  await cache.put(`/api/lists/${id}`, new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } }))
}

export function SharedListPage() {
  const { listId = '' } = useParams()
  const [items, setItems] = useState<ListItem[] | null>(null)
  const [allowAdds, setAllowAdds] = useState(false)
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    document.title = 'Shared list · BeepBeep'
    let lock: WakeLockSentinel | null = null
    const claim = async () => {
      if (!('wakeLock' in navigator)) return
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        /* the list still works */
      }
    }
    void claim()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void claim()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])

  useEffect(() => {
    if (!listId) return
    let cancelled = false
    const apply = (list: RemoteList, offline = false) => {
      if (cancelled) return
      loaded.current = true
      setAllowAdds(Boolean(list.allowAdds))
      setItems(withQueue(list.items || [], readQueue(listId)))
      setMissing(false)
      setNote(offline ? 'Showing the saved copy. Ticks will send when you’re back online.' : null)
      if (!offline) void remember(listId, list)
    }
    const pull = async () => {
      try {
        const response = await fetch(`/api/lists/${listId}`)
        if (response.status === 404) {
          if (!cancelled) setMissing(true)
          return
        }
        if (!response.ok) throw new Error('offline')
        apply((await response.json()) as RemoteList)
        await flush(listId, apply)
      } catch {
        try {
          const cache = await caches.open('shopmate-lists')
          const cached = await cache.match(`/api/lists/${listId}`)
          if (cached) {
            apply((await cached.json()) as RemoteList, true)
            return
          }
        } catch {
          /* no cache */
        }
        if (!cancelled && !loaded.current) setNote('This list needs a connection the first time you open it.')
      }
    }
    void pull()
    let source: EventSource | null = null
    try {
      source = new EventSource(`/api/lists/${listId}/events`)
      source.onmessage = (event) => {
        try {
          apply(JSON.parse(event.data) as RemoteList)
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* poll covers it */
    }
    const timer = window.setInterval(() => void pull(), 2500)
    return () => {
      cancelled = true
      source?.close()
      window.clearInterval(timer)
    }
  }, [listId])

  function saveName(value: string) {
    const trimmed = value.slice(0, 40)
    setName(trimmed)
    localStorage.setItem(NAME_KEY, trimmed.trim())
  }

  async function tick(item: ListItem) {
    const who = name.trim()
    if (!who) {
      setNote('Pop your name in so they can see who ticked it.')
      return
    }
    const checked = !item.checked
    setItems((current) => (current || []).map((entry) => (entry.id === item.id ? { ...entry, checked, checkedBy: checked ? who : null, checkedAt: Date.now() } : entry)))
    const op: Op = { kind: 'tick', itemId: item.id, checked, by: who }
    try {
      const response = await fetch(`/api/lists/${listId}/tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, checked, by: who }),
      })
      if (!response.ok) throw new Error('failed')
      const list = (await response.json()) as RemoteList
      setItems(withQueue(list.items, readQueue(listId).filter((queued) => queued.kind !== 'tick' || queued.itemId !== item.id)))
      void remember(listId, list)
    } catch {
      writeQueue(listId, [...readQueue(listId).filter((queued) => !(queued.kind === 'tick' && queued.itemId === item.id)), op])
      setNote('Saved on this phone. It’ll sync when you’re back online.')
    }
  }

  async function addItem(event: FormEvent) {
    event.preventDefault()
    const who = name.trim()
    const trimmed = draft.trim()
    if (!who) {
      setNote('Pop your name in first.')
      return
    }
    if (!trimmed) return
    setDraft('')
    const tempId = crypto.randomUUID()
    setItems((current) => [
      { id: tempId, barcode: null, name: trimmed, brand: null, image: null, quantity: 1, checked: false, checkedBy: null, checkedAt: 0, addedBy: who, addedAt: Date.now(), store: null, aisle: null },
      ...(current || []),
    ])
    try {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, by: who }),
      })
      if (!response.ok) throw new Error('failed')
      const list = (await response.json()) as RemoteList
      setItems(list.items)
      void remember(listId, list)
    } catch {
      writeQueue(listId, [...readQueue(listId), { kind: 'add', name: trimmed, by: who, tempId }])
      setNote('Saved on this phone. It’ll sync when you’re back online.')
    }
  }

  const list = items || []
  const { groups, done } = arrangeForStore(list)
  const finished = list.length > 0 && done.length === list.length

  return (
    <div className="min-h-dvh bg-paper pb-10">
      <TopBar />
      <div className="px-4 pt-4">
      <p className="tag-strip bg-gold text-pine">Shared list</p>
      <h1 className="font-display mt-4 text-[40px] leading-none font-extrabold text-pine">Tick it off</h1>
      <p className="mt-3 max-w-[28ch] text-base text-muted">You’re shopping from someone else’s BeepBeep list. Big ticks, no sign-up.</p>
      <label className="mt-5 block text-sm font-extrabold text-pine">
        Your name
        <input
          value={name}
          onChange={(event) => saveName(event.target.value)}
          placeholder="Sam"
          className="mt-2 h-12 w-full rounded-full bg-white px-4 text-base font-semibold text-ink shadow-soft outline-none"
          autoComplete="given-name"
        />
      </label>
      {note ? <p className="mt-3 text-sm font-bold text-leaf">{note}</p> : null}
      {missing ? (
        <div className="mt-8 rounded-3xl bg-white px-6 py-10 text-center shadow-soft">
          <p className="font-display text-2xl font-extrabold">That link’s gone quiet</p>
          <p className="mt-2 text-sm text-muted">Ask them to share it again from their list.</p>
        </div>
      ) : items === null ? (
        <div className="mt-6 space-y-3">
          <div className="h-20 animate-pulse rounded-3xl bg-white" />
          <div className="h-20 animate-pulse rounded-3xl bg-white" />
        </div>
      ) : null}
      {finished ? (
        <div className="relative mt-6 overflow-hidden rounded-3xl bg-gold px-4 py-8 text-center">
          <Confetti />
          <p className="font-display relative text-3xl font-extrabold text-pine">Shopping done!</p>
          <p className="relative mt-2 text-sm font-bold text-pine/80">They’ll see it on their phone.</p>
        </div>
      ) : null}
      {list.length ? (
        <div className="mt-6 space-y-5">
          {groups.map((group) => (
            <section key={group.store}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold tracking-wide text-leaf uppercase">
                <Icon name="store" size={16} /> {group.store}
              </h2>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <Row key={item.id} item={item} onTick={() => void tick(item)} />
                ))}
              </ul>
            </section>
          ))}
          {done.length ? (
            <section>
              <h2 className="mb-2 text-sm font-extrabold tracking-wide text-muted uppercase">In the trolley</h2>
              <ul className="space-y-3">
                {done.map((item) => (
                  <Row key={item.id} item={item} onTick={() => void tick(item)} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
      {!missing && items && !items.length ? (
        <p className="mt-8 text-center font-semibold text-muted">Nothing on the list yet.</p>
      ) : null}
      {allowAdds && !missing ? (
        <form className="mt-6 flex gap-2" onSubmit={(event) => void addItem(event)}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add something they forgot"
            aria-label="Add an item"
            className="h-12 min-w-0 flex-1 rounded-full bg-white px-4 font-semibold shadow-soft outline-none"
          />
          <button type="submit" className="press h-12 rounded-full bg-leaf px-4 font-extrabold text-white">Add</button>
        </form>
      ) : null}
      </div>
    </div>
  )
}

function Row({ item, onTick }: { item: ListItem; onTick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onTick} aria-pressed={item.checked} className="press flex min-h-20 w-full items-center gap-4 rounded-3xl bg-white px-3 py-3 text-left shadow-soft">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 ${item.checked ? 'border-leaf bg-gold text-pine' : 'border-line bg-paper text-transparent'}`}>
          <Icon name="tick" size={28} />
        </span>
        <span className="min-w-0">
          <span className={`font-display block text-xl font-extrabold leading-tight ${item.checked ? 'line-through' : ''}`}>
            {item.quantity > 1 ? `${item.quantity} × ` : ''}
            {item.name}
          </span>
          <span className="mt-1 block text-sm font-bold text-muted">
            {item.checked && item.checkedBy ? `Ticked by ${item.checkedBy}` : item.addedBy && item.addedBy !== 'owner' ? `Added by ${item.addedBy}` : 'Tap to tick'}
          </span>
        </span>
      </button>
    </li>
  )
}

async function flush(id: string, apply: (list: RemoteList) => void) {
  const ops = readQueue(id)
  if (!ops.length) return
  const left: Op[] = []
  let latest: RemoteList | null = null
  for (const op of ops) {
    try {
      const response = await fetch(op.kind === 'tick' ? `/api/lists/${id}/tick` : `/api/lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op.kind === 'tick' ? { itemId: op.itemId, checked: op.checked, by: op.by } : { name: op.name, by: op.by }),
      })
      if (!response.ok) throw new Error('failed')
      latest = (await response.json()) as RemoteList
    } catch {
      left.push(op)
    }
  }
  writeQueue(id, left)
  if (latest) apply(latest)
}
