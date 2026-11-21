import type { ListItem } from './types.ts'

function place(value: string | null) {
  return value && value.trim() ? value.trim() : ''
}

export function compareForStore(a: ListItem, b: ListItem) {
  const aStore = place(a.store)
  const bStore = place(b.store)
  if (!aStore && bStore) return 1
  if (aStore && !bStore) return -1
  const store = aStore.localeCompare(bStore, 'en-AU')
  if (store) return store
  const aAisle = place(a.aisle)
  const bAisle = place(b.aisle)
  if (!aAisle && bAisle) return 1
  if (aAisle && !bAisle) return -1
  const aisle = aAisle.localeCompare(bAisle, 'en-AU', { numeric: true })
  if (aisle) return aisle
  return a.name.localeCompare(b.name, 'en-AU')
}

export function arrangeForStore(items: ListItem[]) {
  const open = items.filter((item) => !item.checked).slice().sort(compareForStore)
  const done = items.filter((item) => item.checked).slice().sort(compareForStore)
  const groups: { store: string; items: ListItem[] }[] = []
  for (const item of open) {
    const store = place(item.store) || 'Anywhere'
    const last = groups.at(-1)
    if (!last || last.store !== store) groups.push({ store, items: [item] })
    else last.items.push(item)
  }
  return { groups, done }
}
