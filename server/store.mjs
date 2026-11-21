import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.BEEPBEEP_DATA_DIR || process.env.SHOPMATE_DATA_DIR || path.join(root, 'data')
const filePath = path.join(dataDir, 'cache.json')

const EMPTY = { devices: {}, prices: {}, upc: {}, lists: {} }

let state = structuredClone(EMPTY)
let loaded = false
let writing = Promise.resolve()
const listListeners = new Map()

export function subscribeList(id, listener) {
  const key = String(id).toLowerCase()
  if (!listListeners.has(key)) listListeners.set(key, new Set())
  listListeners.get(key).add(listener)
  return () => listListeners.get(key)?.delete(listener)
}

function notifyList(list) {
  const set = listListeners.get(String(list.id).toLowerCase())
  if (!set) return
  for (const listener of set) {
    try {
      listener(list)
    } catch {
      /* a dropped stream should not stop the others */
    }
  }
}

async function load() {
  if (loaded) return
  await mkdir(dataDir, { recursive: true })
  try {
    state = { ...structuredClone(EMPTY), ...JSON.parse(await readFile(filePath, 'utf8')) }
  } catch {
    state = structuredClone(EMPTY)
  }
  loaded = true
}

function persist() {
  const snapshot = JSON.stringify(state)
  writing = writing.then(async () => {
    await mkdir(dataDir, { recursive: true })
    const temp = `${filePath}.tmp`
    await writeFile(temp, snapshot)
    await rename(temp, filePath)
  })
  return writing
}

export async function ready() {
  await load()
}

export function getDevice(deviceId) {
  return state.devices[deviceId] || null
}

export function saveDevice(deviceId, products) {
  state.devices[deviceId] = { products, updatedAt: new Date().toISOString() }
  void persist()
}

export function allProducts() {
  const map = new Map()
  for (const device of Object.values(state.devices)) {
    for (const product of device.products || []) {
      if (product?.barcode) map.set(product.barcode, product)
    }
  }
  return [...map.values()]
}

export function getPrice(barcode) {
  return state.prices[barcode] || null
}

export function savePrice(record) {
  state.prices[record.barcode] = record
  void persist()
}

export function getUpc(code) {
  return state.upc[code] || null
}

export function saveUpc(code, payload) {
  state.upc[code] = { savedAt: new Date().toISOString(), payload }
  void persist()
}

export function listSpecials() {
  const meta = new Map()
  for (const device of Object.values(state.devices || {})) {
    for (const product of device.products || []) {
      if (product?.barcode) meta.set(product.barcode, product)
    }
  }
  const specials = []
  for (const [barcode, record] of Object.entries(state.prices || {})) {
    const quotes = (record.stores || []).filter((store) => store.onSpecial && store.price != null)
    if (!quotes.length) continue
    quotes.sort((a, b) => a.price - b.price)
    const best = quotes[0]
    const product = meta.get(barcode)
    specials.push({
      barcode,
      name: product?.name || record.name || best.productName || barcode,
      image: product?.image || null,
      brand: product?.brand || best.brand || null,
      price: best.price,
      wasPrice: best.wasPrice ?? null,
      unitPrice: best.unitPrice || null,
      store: best.store,
      specialLabel: best.specialLabel || 'On special',
      savings: best.wasPrice && best.wasPrice > best.price ? Math.round((best.wasPrice - best.price) * 100) / 100 : null,
    })
  }
  return specials.slice(0, 12)
}

export function getList(id) {
  const key = String(id)
  return state.lists?.[key] || state.lists?.[key.toLowerCase()] || null
}

export function saveList(list) {
  if (!state.lists) state.lists = {}
  state.lists[list.id] = list
  notifyList(list)
  void persist()
}

export const DAY_MS = 24 * 60 * 60 * 1000

export function isFresh(record, maxAge = DAY_MS) {
  if (!record?.checkedAt) return false
  return Date.now() - Date.parse(record.checkedAt) < maxAge
}
