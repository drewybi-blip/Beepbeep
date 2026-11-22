import { describe, expect, it } from 'vitest'
import { arrangeForStore } from './store-mode.ts'
import type { ListItem } from './types.ts'

function item(partial: Partial<ListItem> & Pick<ListItem, 'id' | 'name'>): ListItem {
  return {
    barcode: null,
    brand: null,
    image: null,
    quantity: 1,
    checked: false,
    checkedBy: null,
    checkedAt: 0,
    addedBy: null,
    addedAt: 0,
    store: null,
    aisle: null,
    ...partial,
  }
}

describe('arrangeForStore', () => {
  it('groups by store and slides ticked items out of the aisle groups', () => {
    const arranged = arrangeForStore([
      item({ id: '1', name: 'Bread', store: 'Coles', aisle: '12' }),
      item({ id: '2', name: 'Milk', store: 'Aldi', checked: true }),
      item({ id: '3', name: 'Nutella', store: 'Aldi', aisle: '4' }),
      item({ id: '4', name: 'Tape' }),
    ])
    expect(arranged.groups.map((group) => group.store)).toEqual(['Aldi', 'Coles', 'Anywhere'])
    expect(arranged.groups[0].items.map((entry) => entry.name)).toEqual(['Nutella'])
    expect(arranged.done.map((entry) => entry.name)).toEqual(['Milk'])
  })
})
