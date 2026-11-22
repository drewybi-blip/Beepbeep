import { useEffect, useSyncExternalStore } from 'react'
import type { ListItem, ProductView, ResearchedItem } from './types.ts'

const KEY = 'shopmate.list.v1'
const ID_KEY = 'shopmate.list-id.v1'
const listeners = new Set<() => void>()
let raw = ''
let snapshot: ListItem[] = []

function read() {
  try {
    return localStorage.getItem(KEY) || '[]'
  } catch {
    return '[]'
  }
}

export function loadList() {
  const next = read()
  if (next !== raw) {
    raw = next
    try {
      const parsed = JSON.parse(next) as ListItem[]
      snapshot = Array.isArray(parsed) ? parsed.map(normalise) : []
    } catch {
      snapshot = []
    }
  }
  return snapshot
}

function normalise(item: ListItem): ListItem {
  return {
    ...item,
    store: item.store ?? null,
    aisle: item.aisle ?? null,
    checkedBy: item.checkedBy ?? null,
    checkedAt: item.checkedAt ?? 0,
    addedBy: item.addedBy ?? null,
  }
}

const ADDS_KEY = 'shopmate.list-adds.v1'

export function allowsAdds() {
  try {
    return localStorage.getItem(ADDS_KEY) === '1'
  } catch {
    return false
  }
}

export function listId() {
  try {
    const existing = localStorage.getItem(ID_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    localStorage.setItem(ID_KEY, created)
    return created
  } catch {
    return 'local-list'
  }
}

export function listSnapshot(items: ListItem[], estimate: number | null = null) {
  return {
    id: listId(),
    updatedAt: new Date().toISOString(),
    currency: 'AUD',
    estimate,
    allowAdds: allowsAdds(),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      checked: item.checked,
      checkedBy: item.checkedBy,
      checkedAt: item.checkedAt,
      addedBy: item.addedBy,
      barcode: item.barcode,
      brand: item.brand,
      store: item.store,
      aisle: item.aisle,
    })),
  }
}

async function rememberOffline(payload: ReturnType<typeof listSnapshot>) {
  if (!('caches' in window)) return
  const cache = await caches.open('shopmate-lists')
  await cache.put(
    `/api/lists/${payload.id}`,
    new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } }),
  )
}

let syncTimer = 0
function queueSync(items: ListItem[]) {
  const payload = listSnapshot(items)
  void rememberOffline(payload)
  window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(() => {
    void fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  }, 400)
}

function write(items: ListItem[]) {
  const next = items.map(normalise)
  raw = JSON.stringify(next)
  snapshot = next
  localStorage.setItem(KEY, raw)
  listeners.forEach((listener) => listener())
  queueSync(next)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useShoppingList() {
  return useSyncExternalStore(subscribe, loadList, loadList)
}

export function addProductToList(product: ProductView | ResearchedItem, place?: { store?: string | null; aisle?: string | null }) {
  const name = 'scannedAt' in product ? product.name || product.code : product.name?.value || product.code
  const brand = 'scannedAt' in product ? product.brand : product.brand?.value || null
  const image = 'scannedAt' in product ? product.image : product.image?.value || null
  const barcode = product.code
  const store = place?.store ?? null
  const aisle = place?.aisle ?? null
  const items = loadList()
  const existing = items.find((item) => item.barcode === barcode)
  if (existing) {
    write(items.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1, checked: false, checkedBy: null, checkedAt: Date.now(), store: store || item.store, aisle: aisle || item.aisle } : item)))
    return
  }
  write([
    { id: crypto.randomUUID(), barcode, name, brand, image, quantity: 1, checked: false, checkedBy: null, checkedAt: 0, addedBy: 'owner', addedAt: Date.now(), store, aisle },
    ...items,
  ])
}

export function addFreeText(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  write([
    { id: crypto.randomUUID(), barcode: null, name: trimmed, brand: null, image: null, quantity: 1, checked: false, checkedBy: null, checkedAt: 0, addedBy: 'owner', addedAt: Date.now(), store: null, aisle: null },
    ...loadList(),
  ])
}

export function setQuantity(id: string, quantity: number) {
  const next = Math.min(99, Math.max(1, quantity))
  write(loadList().map((item) => (item.id === id ? { ...item, quantity: next } : item)))
}

export function toggleItem(id: string, by = 'You') {
  write(loadList().map((item) => {
    if (item.id !== id) return item
    const checked = !item.checked
    return { ...item, checked, checkedBy: checked ? by : null, checkedAt: Date.now() }
  }))
}

export function removeItem(id: string) {
  write(loadList().filter((item) => item.id !== id))
}

export function clearTicked() {
  write(loadList().filter((item) => !item.checked))
}

export function setAllowsAdds(on: boolean) {
  try {
    localStorage.setItem(ADDS_KEY, on ? '1' : '0')
  } catch {
    /* private mode */
  }
  queueSync(loadList())
}

export async function publishList() {
  const payload = listSnapshot(loadList())
  await rememberOffline(payload)
  const response = await fetch('/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error('The list could not be published.')
  return payload.id
}

type RemoteList = { allowAdds?: boolean; items?: ListItem[] }

export function applyRemoteList(remote: RemoteList) {
  if (typeof remote.allowAdds === 'boolean') {
    try {
      localStorage.setItem(ADDS_KEY, remote.allowAdds ? '1' : '0')
    } catch {
      /* ignore */
    }
  }
  const local = loadList()
  const remoteItems = (remote.items || []).map(normalise)
  const remoteById = new Map(remoteItems.map((item) => [item.id, item]))
  const localIds = new Set(local.map((item) => item.id))
  let changed = false
  const next = local.map((item) => {
    const other = remoteById.get(item.id)
    if (!other) return item
    if ((other.checkedAt || 0) > (item.checkedAt || 0) && (other.checked !== item.checked || other.checkedBy !== item.checkedBy)) {
      changed = true
      return { ...item, checked: other.checked, checkedBy: other.checkedBy, checkedAt: other.checkedAt }
    }
    return item
  })
  for (const other of remoteItems) {
    if (!localIds.has(other.id) && other.addedBy && other.addedBy !== 'owner') {
      changed = true
      next.push(other)
    }
  }
  if (changed) write(next)
}

export function useLiveListSync() {
  useEffect(() => {
    const id = listId()
    if (!id || id === 'local-list') return
    let source: EventSource | null = null
    const pull = () => {
      void fetch(`/api/lists/${id}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((body: RemoteList | null) => {
          if (body) applyRemoteList(body)
        })
        .catch(() => undefined)
    }
    try {
      source = new EventSource(`/api/lists/${id}/events`)
      source.onmessage = (event) => {
        try {
          applyRemoteList(JSON.parse(event.data) as RemoteList)
        } catch {
          /* ignore a bad event */
        }
      }
    } catch {
      /* polling covers it */
    }
    const timer = window.setInterval(pull, 3000)
    pull()
    return () => {
      source?.close()
      window.clearInterval(timer)
    }
  }, [])
}
