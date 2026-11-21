import { useSyncExternalStore } from 'react'
import type { ProductView, ResearchedItem } from './types.ts'

const KEY = 'shopmate.researched.v1'
const listeners = new Set<() => void>()
let raw = ''
let snapshot: ResearchedItem[] = []

function read() {
  try {
    return localStorage.getItem(KEY) || '[]'
  } catch {
    return '[]'
  }
}

export function loadResearched() {
  const next = read()
  if (next !== raw) {
    raw = next
    try {
      const parsed = JSON.parse(next) as ResearchedItem[]
      snapshot = Array.isArray(parsed) ? parsed : []
    } catch {
      snapshot = []
    }
  }
  return snapshot
}

function write(items: ResearchedItem[]) {
  const next = JSON.stringify(items.slice(0, 80))
  raw = next
  snapshot = items.slice(0, 80)
  localStorage.setItem(KEY, next)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useResearched() {
  return useSyncExternalStore(subscribe, loadResearched, loadResearched)
}

export function rememberProduct(product: ProductView) {
  const items = loadResearched().filter((item) => item.code !== product.code)
  write([
    {
      code: product.code,
      name: product.name?.value || null,
      brand: product.brand?.value || null,
      image: product.image?.value || null,
      quantity: product.quantity?.value || null,
      found: product.found,
      scannedAt: Date.now(),
    },
    ...items,
  ])
}

export function removeResearched(code: string) {
  write(loadResearched().filter((item) => item.code !== code))
}

export function clearResearched() {
  write([])
}
