import { lookupAllStores } from './fetch-stores.mjs'
import { allProducts, getPrice, isFresh, ready, savePrice } from './store.mjs'

const queue = []
const pending = new Set()
let draining = false
const MAX_PER_RUN = 40

export function isPending(barcode) {
  return pending.has(barcode)
}

export function pendingList() {
  return [...pending]
}

export function enqueue(product, { force = false } = {}) {
  if (!product?.barcode || !product.name) return
  const cached = getPrice(product.barcode)
  if (!force && isFresh(cached)) return
  if (pending.has(product.barcode)) return
  pending.add(product.barcode)
  queue.push(product)
  void drain()
}

async function drain() {
  if (draining) return
  draining = true
  let handled = 0
  while (queue.length && handled < MAX_PER_RUN) {
    const product = queue.shift()
    handled += 1
    try {
      const stores = await lookupAllStores(product)
      savePrice({
        barcode: product.barcode,
        name: product.name,
        checkedAt: new Date().toISOString(),
        stores,
      })
      console.log(`priced ${product.barcode} ${stores.map((store) => `${store.store}:${store.status}`).join(' ')}`)
    } catch (error) {
      console.error('price job', error instanceof Error ? error.message : error)
      savePrice({
        barcode: product.barcode,
        name: product.name,
        checkedAt: new Date().toISOString(),
        stores: [],
        error: 'Price check failed before any store returned.',
      })
    } finally {
      pending.delete(product.barcode)
    }
  }
  draining = false
  if (queue.length) setTimeout(() => void drain(), 60_000)
}

export async function refreshStale() {
  await ready()
  const products = allProducts().filter((product) => product.name && !isFresh(getPrice(product.barcode)))
  for (const product of products.slice(0, MAX_PER_RUN)) enqueue(product)
  console.log(`daily refresh queued ${Math.min(products.length, MAX_PER_RUN)} of ${products.length} stale products`)
}

function msUntilSydney(hour, minute) {
  const now = Date.now()
  for (let ahead = 0; ahead < 60 * 48; ahead += 1) {
    const instant = new Date(now + ahead * 60 * 1000)
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant)
    const bag = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const h = Number(bag.hour)
    const m = Number(bag.minute)
    if (ahead > 0 && h === hour && m === minute) return ahead * 60 * 1000
  }
  return 24 * 60 * 60 * 1000
}

export function startScheduler() {
  const arm = () => {
    const delay = msUntilSydney(6, 30)
    console.log(`next price refresh in ${Math.round(delay / 60000)} minutes (06:30 Australia/Sydney)`)
    setTimeout(async () => {
      await refreshStale()
      arm()
    }, delay)
  }
  arm()
  setTimeout(() => void refreshStale(), 20_000)
}
