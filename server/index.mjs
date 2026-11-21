import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { enqueue, isPending, pendingList, startScheduler } from './jobs.mjs'
import { getDevice, getList, getPrice, getUpc, isFresh, ready, saveDevice, saveList, saveUpc } from './store.mjs'
import { buildApplePass, googleSaveUrl, walletStatus } from './wallet.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || (isProd ? 43123 : 43124))
const host = '0.0.0.0'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 200_000) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function publicOrigin(req) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.BEEPBEEP_PUBLIC_URL
  if (configured) return String(configured).replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  return `${proto}://${hostHeader}`
}

function cleanProduct(input) {
  const barcode = String(input?.barcode || '').trim().slice(0, 80)
  if (!barcode) return null
  return {
    barcode,
    name: input?.name ? String(input.name).trim().slice(0, 160) : null,
    brand: input?.brand ? String(input.brand).trim().slice(0, 120) : null,
    quantity: input?.quantity ? String(input.quantity).trim().slice(0, 80) : null,
  }
}

function pricesFor(deviceProducts) {
  return deviceProducts.map((product) => {
    const cached = getPrice(product.barcode)
    return (
      cached || {
        barcode: product.barcode,
        name: product.name,
        checkedAt: null,
        stores: [],
      }
    )
  })
}

async function proxyUpc(code) {
  const cached = getUpc(code)
  if (cached && isFresh(cached, 24 * 60 * 60 * 1000)) return cached.payload
  const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  })
  const payload = await response.json()
  saveUpc(code, payload)
  return payload
}

async function serveStatic(res, url) {
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
  const filePath = path.normalize(path.join(dist, requested))
  if (!filePath.startsWith(dist)) {
    send(res, 403, { error: 'Forbidden' })
    return
  }
  try {
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('not a file')
    const type = TYPES[path.extname(filePath)] || 'application/octet-stream'
    const cache = path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=300'
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache })
    createReadStream(filePath).pipe(res)
  } catch {
    const fallback = path.join(dist, 'index.html')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    createReadStream(fallback).pipe(res)
  }
}

await ready()
startScheduler()

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    send(res, 204, '')
    return
  }
  try {
    if (url.pathname === '/api/health') {
      send(res, 200, { ok: true, name: 'BeepBeep', pending: pendingList().length })
      return
    }
    if (url.pathname === '/api/upc' && req.method === 'GET') {
      const upc = (url.searchParams.get('upc') || '').replace(/\s+/g, '')
      if (!/^\d{6,14}$/.test(upc)) {
        send(res, 400, { error: 'A 6 to 14 digit code is required.' })
        return
      }
      send(res, 200, await proxyUpc(upc))
      return
    }
    if (url.pathname === '/api/prices/sync' && req.method === 'POST') {
      const body = await readBody(req)
      if (!UUID.test(body.deviceId || '')) {
        send(res, 400, { error: 'deviceId must be a UUID.' })
        return
      }
      const products = (Array.isArray(body.products) ? body.products : []).map(cleanProduct).filter(Boolean).slice(0, 80)
      saveDevice(body.deviceId, products)
      for (const product of products) enqueue(product)
      const pending = products.filter((product) => product.name && (isPending(product.barcode) || !getPrice(product.barcode))).map((product) => product.barcode)
      send(res, 200, { prices: pricesFor(products), pending })
      return
    }
    if (url.pathname === '/api/prices' && req.method === 'GET') {
      const deviceId = url.searchParams.get('deviceId') || ''
      if (!UUID.test(deviceId)) {
        send(res, 400, { error: 'deviceId must be a UUID.' })
        return
      }
      const device = getDevice(deviceId)
      const products = device?.products || []
      const pending = products.filter((product) => isPending(product.barcode)).map((product) => product.barcode)
      send(res, 200, { prices: pricesFor(products), pending })
      return
    }
    if (url.pathname === '/api/wallet/status' && req.method === 'GET') {
      send(res, 200, walletStatus())
      return
    }
    if (url.pathname === '/api/lists' && req.method === 'POST') {
      const body = await readBody(req)
      if (!UUID.test(body.id || '')) {
        send(res, 400, { error: 'List id must be a UUID.' })
        return
      }
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 80).map((item) => ({
        id: String(item.id || '').slice(0, 80),
        name: String(item.name || '').slice(0, 160),
        quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)),
        checked: Boolean(item.checked),
        barcode: item.barcode ? String(item.barcode).slice(0, 80) : null,
        brand: item.brand ? String(item.brand).slice(0, 120) : null,
        store: item.store ? String(item.store).slice(0, 40) : null,
        aisle: item.aisle ? String(item.aisle).slice(0, 40) : null,
      })).filter((item) => item.id && item.name)
      const list = {
        id: body.id,
        updatedAt: new Date().toISOString(),
        currency: 'AUD',
        estimate: typeof body.estimate === 'number' ? body.estimate : null,
        items,
      }
      saveList(list)
      send(res, 200, list)
      return
    }
    const listMatch = url.pathname.match(/^\/api\/lists\/([0-9a-f-]{36})$/i)
    if (listMatch && req.method === 'GET') {
      const list = getList(listMatch[1])
      if (!list) {
        send(res, 404, { error: 'List not found' })
        return
      }
      send(res, 200, list)
      return
    }
    const appleMatch = url.pathname.match(/^\/api\/wallet\/apple\/([0-9a-f-]{36})$/i)
    if (appleMatch && req.method === 'GET') {
      if (!walletStatus().apple) {
        send(res, 503, { comingSoon: true, error: 'Apple Wallet is not configured.' })
        return
      }
      const list = getList(appleMatch[1])
      if (!list) {
        send(res, 404, { error: 'List not found' })
        return
      }
      const pass = await buildApplePass(list, publicOrigin(req))
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'attachment; filename="beepbeep.pkpass"',
        'Cache-Control': 'no-store',
      })
      res.end(pass)
      return
    }
    const googleMatch = url.pathname.match(/^\/api\/wallet\/google\/([0-9a-f-]{36})$/i)
    if (googleMatch && req.method === 'GET') {
      if (!walletStatus().google) {
        send(res, 503, { comingSoon: true, error: 'Google Wallet is not configured.' })
        return
      }
      const list = getList(googleMatch[1])
      if (!list) {
        send(res, 404, { error: 'List not found' })
        return
      }
      send(res, 200, { url: googleSaveUrl(list, publicOrigin(req)) })
      return
    }
    if (url.pathname.startsWith('/api/')) {
      send(res, 404, { error: 'Not found' })
      return
    }
    if (isProd) {
      await serveStatic(res, url)
      return
    }
    send(res, 404, { error: 'API only. Open the Vite dev server.' })
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    send(res, 500, { error: 'BeepBeep could not finish that request.' })
  }
})

server.listen(port, host, () => {
  console.log(`BeepBeep API on http://${host}:${port}`)
})
