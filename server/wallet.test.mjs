import assert from 'node:assert/strict'
import test from 'node:test'
import { googleSaveUrl, summarise, walletStatus } from './wallet.mjs'

const KEYS = [
  'APPLE_PASS_TYPE_ID',
  'APPLE_TEAM_ID',
  'APPLE_PASS_CERT_PEM',
  'APPLE_PASS_KEY_PEM',
  'APPLE_WWDR_CERT_PEM',
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON',
]

test('wallet buttons stay unconfigured without credentials', () => {
  const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]))
  for (const key of KEYS) delete process.env[key]
  try {
    assert.deepEqual(walletStatus(), { apple: false, google: false })
    assert.throws(() => googleSaveUrl({ id: 'x', items: [] }, 'https://example.com'), /not configured/)
  } finally {
    for (const key of KEYS) {
      if (previous[key] == null) delete process.env[key]
      else process.env[key] = previous[key]
    }
  }
})

test('list summary counts unticked items and links to in-store mode', () => {
  const summary = summarise(
    {
      id: '11111111-1111-4111-8111-111111111111',
      estimate: 6.69,
      items: [
        { name: 'Nutella', quantity: 1, checked: false },
        { name: 'Bread', quantity: 2, checked: true },
      ],
    },
    'https://beepbeep.example',
  )
  assert.equal(summary.count, 1)
  assert.equal(summary.ticked, 1)
  assert.deepEqual(summary.names, ['Nutella'])
  assert.equal(summary.url, 'https://beepbeep.example/store/11111111-1111-4111-8111-111111111111')
})
