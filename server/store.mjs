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

export function getList(id) {
  return state.lists?.[id] || null
}

export function saveList(list) {
  if (!state.lists) state.lists = {}
  state.lists[list.id] = list
  void persist()
}

export const DAY_MS = 24 * 60 * 60 * 1000

export function isFresh(record, maxAge = DAY_MS) {
  if (!record?.checkedAt) return false
  return Date.now() - Date.parse(record.checkedAt) < maxAge
}
