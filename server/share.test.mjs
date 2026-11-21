import assert from 'node:assert/strict'
import test from 'node:test'
import { applyAdd, applyTick, mergeOwnerList } from './share.mjs'

const milk = {
  id: 'item-milk',
  name: 'Milk',
  quantity: 1,
  checked: false,
  checkedBy: null,
  checkedAt: 0,
  barcode: null,
  brand: null,
  store: null,
  aisle: null,
  addedBy: null,
}

test('a newer shopper tick survives the owner saving an older copy', () => {
  const existing = {
    id: '11111111-1111-4111-8111-111111111111',
    version: 2,
    allowAdds: false,
    items: [{ ...milk, checked: true, checkedBy: 'Sam', checkedAt: 200 }],
  }
  const merged = mergeOwnerList(existing, {
    id: existing.id,
    allowAdds: false,
    items: [{ ...milk, checked: false, checkedAt: 100 }],
  })
  assert.equal(merged.items[0].checked, true)
  assert.equal(merged.items[0].checkedBy, 'Sam')
  assert.equal(merged.items[0].checkedAt, 200)
})

test('the owner untick wins when it is newer', () => {
  const existing = {
    id: '11111111-1111-4111-8111-111111111111',
    version: 2,
    items: [{ ...milk, checked: true, checkedBy: 'Sam', checkedAt: 100 }],
  }
  const merged = mergeOwnerList(existing, {
    id: existing.id,
    items: [{ ...milk, checked: false, checkedBy: null, checkedAt: 300 }],
  })
  assert.equal(merged.items[0].checked, false)
  assert.equal(merged.items[0].checkedBy, null)
})

test('an item the shopper added is kept when the owner syncs', () => {
  const added = { ...milk, id: 'item-bread', name: 'Bread', addedBy: 'Sam' }
  const existing = { id: '11111111-1111-4111-8111-111111111111', version: 1, items: [milk, added] }
  const merged = mergeOwnerList(existing, { id: existing.id, items: [milk] })
  assert.deepEqual(merged.items.map((item) => item.id), ['item-milk', 'item-bread'])
})

test('the owner can still remove their own item', () => {
  const existing = { id: '11111111-1111-4111-8111-111111111111', version: 1, items: [milk] }
  const merged = mergeOwnerList(existing, { id: existing.id, items: [] })
  assert.equal(merged.items.length, 0)
})

test('tick records who did it', () => {
  const list = { version: 1, items: [{ ...milk }] }
  applyTick(list, { itemId: 'item-milk', checked: true, by: 'Alex' })
  assert.equal(list.items[0].checkedBy, 'Alex')
  assert.equal(list.items[0].checked, true)
  assert.ok(list.items[0].checkedAt > 0)
})

test('adds stay closed unless the sender allows them', () => {
  const closed = { allowAdds: false, version: 1, items: [] }
  assert.equal(applyAdd(closed, { name: 'Eggs', by: 'Sam' }).error, 'adds-closed')
  const open = { allowAdds: true, version: 1, items: [] }
  const result = applyAdd(open, { name: ' Eggs ', by: 'Sam' })
  assert.equal(result.list.items[0].name, 'Eggs')
  assert.equal(result.list.items[0].addedBy, 'Sam')
})
