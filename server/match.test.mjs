import assert from 'node:assert/strict'
import test from 'node:test'
import {
  chooseCandidate,
  gtinEqual,
  interpretAldiBadge,
  isHalfPrice,
  money,
  parseSize,
  scoreCandidate,
  searchQuery,
  sizesMatch,
} from './match.mjs'

test('parses metric pack sizes', () => {
  assert.deepEqual(parseSize('400 g'), { amount: 400, unit: 'g' })
  assert.deepEqual(parseSize('1kg'), { amount: 1000, unit: 'g' })
  assert.equal(sizesMatch('400g', '400 g'), true)
  assert.equal(sizesMatch('400 g', '750g'), false)
  assert.equal(sizesMatch('400 g', null), null)
})

test('compares gtins with leading zeros', () => {
  assert.equal(gtinEqual('049000028911', '0049000028911'), true)
  assert.equal(gtinEqual('3017620422003', '9300698000216'), false)
})

test('half price is a narrow band, not every saving', () => {
  assert.equal(isHalfPrice(5, 10), true)
  assert.equal(isHalfPrice(10, 12.5), false)
  assert.equal(isHalfPrice(6.7, null), false)
})

test('prefers the same size over a different Nutella product', () => {
  const query = { barcode: '3017620422003', name: 'Nutella', brand: 'Ferrero', quantity: '400 g' }
  const chosen = chooseCandidate(query, [
    { name: 'Hazelnut Chocolate Spread', brand: 'Nutella', size: '750g', price: 10, gtin: null },
    { name: 'Hazelnut Chocolate Spread', brand: 'Nutella', size: '400g', price: 6.7, gtin: '9300698000216' },
  ])
  assert.equal(chosen.candidate.size, '400g')
  assert.equal(chosen.gtin, false)
})

test('a matching barcode outranks the name', () => {
  const query = { barcode: '9300698000216', name: 'Nutella', brand: 'Nutella', quantity: '400 g' }
  const scored = scoreCandidate(query, { name: 'Other', brand: 'Other', size: '1kg', gtin: '9300698000216' })
  assert.equal(scored.gtin, true)
  assert.equal(scored.score, 1)
})

test('rejects a weak name match', () => {
  const chosen = chooseCandidate(
    { barcode: '1', name: 'Oat milk', brand: 'Oatly', quantity: '1 L' },
    [{ name: 'Paper towel', brand: 'Coles', size: '2 pack', gtin: null }],
  )
  assert.equal(chosen, null)
})

test('future Aldi sale dates are not current specials', () => {
  const future = interpretAldiBadge('On Sale Wed 25 Nov', new Date('2026-11-21T12:00:00+11:00'))
  assert.equal(future.onSpecial, false)
  assert.match(future.note, /has not started/)
  const current = interpretAldiBadge('On Sale Wed 18 Nov', new Date('2026-11-21T12:00:00+11:00'))
  assert.equal(current.onSpecial, true)
})

test('money and search query', () => {
  assert.equal(money('$6.70'), 6.7)
  assert.equal(money('0'), null)
  assert.equal(searchQuery({ brand: 'Ferrero, Nutella', name: 'Nutella' }), 'Nutella')
  assert.equal(searchQuery({ brand: 'Nutella', name: 'Nutella' }), 'Nutella')
  assert.equal(searchQuery({ brand: 'Vegemite', name: 'Yeast extract' }), 'Vegemite Yeast extract')
})
