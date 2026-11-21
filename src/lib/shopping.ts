import { useSyncExternalStore } from 'react'
import type { ListItem, ProductView, ResearchedItem } from './types.ts'

const KEY = 'shopmate.list.v1'
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
      snapshot = Array.isArray(parsed) ? parsed : []
    } catch {
      snapshot = []
    }
  }
  return snapshot
}

function write(items: ListItem[]) {
  raw = JSON.stringify(items)
  snapshot = items
  localStorage.setItem(KEY, raw)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useShoppingList() {
  return useSyncExternalStore(subscribe, loadList, loadList)
}

export function addProductToList(product: ProductView | ResearchedItem) {
  const name = 'scannedAt' in product ? product.name || product.code : product.name?.value || product.code
  const brand = 'scannedAt' in product ? product.brand : product.brand?.value || null
  const image = 'scannedAt' in product ? product.image : product.image?.value || null
  const barcode = product.code
  const items = loadList()
  const existing = items.find((item) => item.barcode === barcode)
  if (existing) {
    write(items.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1, checked: false } : item)))
    return
  }
  write([
    { id: crypto.randomUUID(), barcode, name, brand, image, quantity: 1, checked: false, addedAt: Date.now() },
    ...items,
  ])
}

export function addFreeText(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  write([
    { id: crypto.randomUUID(), barcode: null, name: trimmed, brand: null, image: null, quantity: 1, checked: false, addedAt: Date.now() },
    ...loadList(),
  ])
}

export function setQuantity(id: string, quantity: number) {
  const next = Math.min(99, Math.max(1, quantity))
  write(loadList().map((item) => (item.id === id ? { ...item, quantity: next } : item)))
}

export function toggleItem(id: string) {
  write(loadList().map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)))
}

export function removeItem(id: string) {
  write(loadList().filter((item) => item.id !== id))
}

export function clearTicked() {
  write(loadList().filter((item) => !item.checked))
}
