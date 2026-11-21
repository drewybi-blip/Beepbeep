import { createSign } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const APPLE_KEYS = ['APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID', 'APPLE_PASS_CERT_PEM', 'APPLE_PASS_KEY_PEM', 'APPLE_WWDR_CERT_PEM']
const GOOGLE_KEYS = ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON']

function filled(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim())
}

export function walletStatus() {
  return {
    apple: APPLE_KEYS.every(filled),
    google: GOOGLE_KEYS.every(filled),
  }
}

export function inStoreUrl(origin, listId) {
  return `${origin.replace(/\/$/, '')}/store/${listId}`
}

export function summarise(list, origin) {
  const items = Array.isArray(list.items) ? list.items : []
  const open = items.filter((item) => !item.checked)
  const names = open.slice(0, 4).map((item) => `${item.quantity > 1 ? `${item.quantity} × ` : ''}${item.name}`)
  const estimate = typeof list.estimate === 'number' ? list.estimate : null
  return {
    id: list.id,
    count: open.length,
    ticked: items.length - open.length,
    names,
    estimate,
    currency: 'AUD',
    url: inStoreUrl(origin, list.id),
  }
}

async function materialise(value, filePath) {
  const text = String(value)
  if (text.includes('BEGIN')) {
    await writeFile(filePath, text.endsWith('\n') ? text : `${text}\n`)
    return filePath
  }
  return text
}

export async function buildApplePass(list, origin) {
  if (!walletStatus().apple) {
    const error = new Error('Apple Wallet is not configured')
    error.code = 'UNCONFIGURED'
    throw error
  }
  const summary = summarise(list, origin)
  const dir = await mkdtemp(path.join(tmpdir(), 'beepbeep-pass-'))
  try {
    const cert = await materialise(process.env.APPLE_PASS_CERT_PEM, path.join(dir, 'cert.pem'))
    const key = await materialise(process.env.APPLE_PASS_KEY_PEM, path.join(dir, 'key.pem'))
    const wwdr = await materialise(process.env.APPLE_WWDR_CERT_PEM, path.join(dir, 'wwdr.pem'))
    const icon = path.join(root, 'public', 'pwa-192.png')
    await copyFile(icon, path.join(dir, 'icon.png'))
    await copyFile(icon, path.join(dir, 'logo.png'))
    const pass = {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
      teamIdentifier: process.env.APPLE_TEAM_ID,
      organizationName: 'BeepBeep',
      description: 'BeepBeep shopping list',
      serialNumber: summary.id,
      foregroundColor: 'rgb(255, 194, 14)',
      backgroundColor: 'rgb(14, 59, 46)',
      labelColor: 'rgb(255, 248, 238)',
      barcodes: [{ message: summary.url, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1' }],
      generic: {
        primaryFields: [{ key: 'count', label: 'Still to get', value: String(summary.count) }],
        secondaryFields: summary.estimate == null ? [] : [{ key: 'estimate', label: 'From', value: `$${summary.estimate.toFixed(2)}`, currencyCode: 'AUD' }],
        auxiliaryFields: [{ key: 'items', label: 'On the list', value: summary.names.join(', ') || 'List is clear' }],
        backFields: [{ key: 'link', label: 'Tick it off in BeepBeep', value: summary.url }],
      },
    }
    await writeFile(path.join(dir, 'pass.json'), JSON.stringify(pass))
    const names = ['pass.json', 'icon.png', 'logo.png']
    const manifest = {}
    for (const name of names) {
      const bytes = await readFile(path.join(dir, name))
      manifest[name] = createHash('sha1').update(bytes).digest('hex')
    }
    await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest))
    const passphrase = process.env.APPLE_PASS_KEY_PASSPHRASE || ''
    await execFileAsync('openssl', [
      'smime', '-binary', '-sign',
      '-certfile', wwdr,
      '-signer', cert,
      '-inkey', key,
      '-passin', `pass:${passphrase}`,
      '-in', path.join(dir, 'manifest.json'),
      '-out', path.join(dir, 'signature'),
      '-outform', 'DER',
    ])
    const zipPath = path.join(dir, 'pass.pkpass')
    await execFileAsync('zip', ['-q', '-j', zipPath, ...names.map((name) => path.join(dir, name)), path.join(dir, 'signature')])
    return await readFile(zipPath)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function b64url(value) {
  return Buffer.from(value).toString('base64url')
}

export function googleSaveUrl(list, origin) {
  if (!walletStatus().google) {
    const error = new Error('Google Wallet is not configured')
    error.code = 'UNCONFIGURED'
    throw error
  }
  const account = JSON.parse(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON)
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID
  const classId = process.env.GOOGLE_WALLET_CLASS_ID || `${issuer}.beepbeep_list`
  const summary = summarise(list, origin)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: account.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: now,
    origins: [origin.replace(/\/$/, '')],
    payload: {
      genericObjects: [
        {
          id: `${issuer}.beepbeep_${summary.id.replace(/-/g, '')}`,
          classId,
          genericType: 'GENERIC_TYPE_UNSPECIFIED',
          hexBackgroundColor: '#0E3B2E',
          cardTitle: { defaultValue: { language: 'en-AU', value: 'BeepBeep' } },
          header: { defaultValue: { language: 'en-AU', value: `${summary.count} to get` } },
          subheader: { defaultValue: { language: 'en-AU', value: summary.names.join(' · ') || 'Shopping list' } },
          textModulesData: summary.estimate == null ? [] : [{ id: 'estimate', header: 'From', body: `A$${summary.estimate.toFixed(2)}` }],
          barcode: { type: 'QR_CODE', value: summary.url, alternateText: 'Open in-store mode' },
        },
      ],
    },
  }
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${body}`)
  signer.end()
  const signature = signer.sign(account.private_key).toString('base64url')
  return `https://pay.google.com/gp/v/save/${header}.${body}.${signature}`
}
