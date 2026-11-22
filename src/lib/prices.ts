import { useCallback, useEffect, useState } from 'react'
import { STORE_LABELS } from './format.ts'
import type { PriceRecord, ResearchedItem } from './types.ts'
import { loadResearched, useResearched } from './researched.ts'

const DEVICE_KEY = 'shopmate.device.v1'
const SEEN_KEY = 'shopmate.specials-seen.v1'

export function deviceId() {
  const existing = localStorage.getItem(DEVICE_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(DEVICE_KEY, created)
  return created
}

type PriceResponse = { prices: PriceRecord[]; pending: string[] }

function indexPrices(records: PriceRecord[]) {
  return Object.fromEntries(records.map((record) => [record.barcode, record]))
}

export async function syncPrices(items: ResearchedItem[]) {
  const response = await fetch('/api/prices/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: deviceId(),
      products: items.map((item) => ({
        barcode: item.code,
        name: item.name,
        brand: item.brand,
        quantity: item.quantity,
        image: item.image,
      })),
    }),
  })
  if (!response.ok) throw new Error('Price sync failed')
  return (await response.json()) as PriceResponse
}

async function fetchPrices() {
  const response = await fetch(`/api/prices?deviceId=${deviceId()}`)
  if (!response.ok) throw new Error('Price read failed')
  return (await response.json()) as PriceResponse
}

export function usePrices() {
  const [prices, setPrices] = useState<Record<string, PriceRecord>>({})
  const [pending, setPending] = useState<string[]>([])
  const [offline, setOffline] = useState(false)

  const researched = useResearched()

  const refresh = useCallback(async () => {
    try {
      const data = await syncPrices(loadResearched())
      setPrices(indexPrices(data.prices))
      setPending(data.pending)
      setOffline(false)
      return data.pending
    } catch {
      setOffline(true)
      return []
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer = 0
    const run = async () => {
      let waiting = await refresh()
      for (let attempt = 0; attempt < 24 && waiting.length && !cancelled; attempt += 1) {
        await new Promise((resolve) => {
          timer = window.setTimeout(resolve, 2500)
        })
        if (cancelled) return
        try {
          const data = await fetchPrices()
          if (cancelled) return
          setPrices(indexPrices(data.prices))
          setPending(data.pending)
          waiting = data.pending
        } catch {
          if (!cancelled) setOffline(true)
          return
        }
      }
    }
    void run()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [refresh, researched])

  return { prices, pending, offline, refresh }
}

export function specialKey(barcode: string, store: string, price: number) {
  return `${barcode}:${store}:${price}`
}

export function unseenSpecials(records: PriceRecord[]) {
  const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[])
  return records.flatMap((record) =>
    record.stores
      .filter((store) => store.onSpecial && store.price != null)
      .filter((store) => !seen.has(specialKey(record.barcode, store.store, store.price as number)))
      .map((store) => ({ record, store })),
  )
}

export function markSpecialsSeen(keys: string[]) {
  const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[])
  keys.forEach((key) => seen.add(key))
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)))
}

export function lowestPrice(record: PriceRecord | undefined) {
  const prices = (record?.stores || []).map((store) => store.price).filter((price): price is number => price != null)
  return prices.length ? Math.min(...prices) : null
}

export function preferredPlace(record: PriceRecord | undefined) {
  const found = (record?.stores || []).filter((store) => store.status === 'found' && store.price != null)
  if (!found.length) return { store: null, aisle: null }
  found.sort((a, b) => (a.price as number) - (b.price as number))
  return { store: STORE_LABELS[found[0].store] || found[0].store, aisle: null }
}
