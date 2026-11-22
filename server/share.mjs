const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function cleanListItem(item) {
  const id = String(item?.id || '').slice(0, 80)
  const name = String(item?.name || '').slice(0, 160).trim()
  if (!id || !name) return null
  const checked = Boolean(item.checked)
  return {
    id,
    name,
    quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)),
    checked,
    checkedBy: checked && item.checkedBy ? String(item.checkedBy).slice(0, 40) : null,
    checkedAt: Number(item.checkedAt) || 0,
    barcode: item.barcode ? String(item.barcode).slice(0, 80) : null,
    brand: item.brand ? String(item.brand).slice(0, 120) : null,
    store: item.store ? String(item.store).slice(0, 40) : null,
    aisle: item.aisle ? String(item.aisle).slice(0, 40) : null,
    addedBy: item.addedBy ? String(item.addedBy).slice(0, 40) : null,
  }
}

export function isListId(value) {
  return UUID.test(String(value || ''))
}

/** Owner snapshot wins for names and membership. A newer tick on the server is kept. */
export function mergeOwnerList(existing, incoming) {
  const previous = new Map((existing?.items || []).map((item) => [item.id, item]))
  const seen = new Set()
  const items = []
  for (const raw of incoming.items || []) {
    const item = cleanListItem(raw)
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    const prev = previous.get(item.id)
    if (prev && (Number(prev.checkedAt) || 0) > item.checkedAt) {
      items.push({ ...item, checked: Boolean(prev.checked), checkedBy: prev.checkedBy || null, checkedAt: Number(prev.checkedAt) || 0 })
    } else {
      items.push(item)
    }
  }
  for (const prev of existing?.items || []) {
    if (!seen.has(prev.id) && prev.addedBy && prev.addedBy !== 'owner') items.push(prev)
  }
  return {
    id: incoming.id,
    updatedAt: new Date().toISOString(),
    version: (existing?.version || 0) + 1,
    allowAdds: Boolean(incoming.allowAdds),
    currency: 'AUD',
    estimate: typeof incoming.estimate === 'number' ? incoming.estimate : null,
    items: items.slice(0, 80),
  }
}

export function applyTick(list, { itemId, checked, by }) {
  const item = list.items.find((entry) => entry.id === itemId)
  if (!item) return null
  const on = Boolean(checked)
  item.checked = on
  item.checkedBy = on ? String(by || 'A shopper').slice(0, 40) : null
  item.checkedAt = Date.now()
  list.updatedAt = new Date().toISOString()
  list.version = (list.version || 0) + 1
  return list
}

export function applyAdd(list, { name, by }) {
  if (!list.allowAdds) return { error: 'adds-closed' }
  const trimmed = String(name || '').trim().slice(0, 160)
  if (!trimmed) return { error: 'name' }
  if (list.items.length >= 80) return { error: 'full' }
  const who = String(by || 'A shopper').slice(0, 40)
  list.items.unshift({
    id: crypto.randomUUID(),
    name: trimmed,
    quantity: 1,
    checked: false,
    checkedBy: null,
    checkedAt: 0,
    barcode: null,
    brand: null,
    store: null,
    aisle: null,
    addedBy: who,
  })
  list.updatedAt = new Date().toISOString()
  list.version = (list.version || 0) + 1
  return { list }
}
