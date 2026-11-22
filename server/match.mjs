const STOP = new Set(['and', 'with', 'the', 'of', 'for', 'a', 'an', 'in', 'to', 'from'])

export function tokens(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !STOP.has(word) && word.length > 1)
}

export function parseSize(value) {
  if (!value) return null
  const text = String(value).toLowerCase().replace(/,/g, '.')
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|liter|pack|pk|x)\b/)
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2]
  if (unit === 'kg') return { amount: amount * 1000, unit: 'g' }
  if (unit === 'g') return { amount, unit: 'g' }
  if (unit === 'l' || unit === 'litre' || unit === 'liter') return { amount: amount * 1000, unit: 'ml' }
  if (unit === 'ml') return { amount, unit: 'ml' }
  return { amount, unit: 'pack' }
}

export function sizesMatch(a, b) {
  const left = parseSize(a)
  const right = parseSize(b)
  if (!left || !right || left.unit !== right.unit) return null
  const diff = Math.abs(left.amount - right.amount) / Math.max(left.amount, right.amount)
  return diff <= 0.05
}

export function gtinEqual(a, b) {
  const left = String(a || '').replace(/\D/g, '')
  const right = String(b || '').replace(/\D/g, '')
  if (!left || !right) return false
  return left.padStart(14, '0') === right.padStart(14, '0')
}

export function isHalfPrice(now, was) {
  if (now == null || was == null || was <= 0 || now <= 0 || now >= was) return false
  const ratio = now / was
  return ratio >= 0.45 && ratio <= 0.52
}

export function money(value) {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value * 100) / 100
  const match = String(value).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const number = Number(match[1])
  return number > 0 ? Math.round(number * 100) / 100 : null
}

export function scoreCandidate(query, candidate) {
  if (candidate.gtin && gtinEqual(query.barcode, candidate.gtin)) {
    return { score: 1, gtin: true, size: sizesMatch(query.quantity, candidate.size) === true }
  }
  const queryTokens = tokens(`${query.brand || ''} ${query.name || ''}`)
  const candidateSet = new Set(tokens(`${candidate.brand || ''} ${candidate.name || ''}`))
  const hits = queryTokens.filter((token) => candidateSet.has(token)).length
  const coverage = queryTokens.length ? hits / queryTokens.length : 0
  const brandHit = tokens(query.brand).some((token) => candidateSet.has(token))
  const size = sizesMatch(query.quantity, candidate.size)
  let score = coverage * 0.62
  if (brandHit) score += 0.2
  if (size === true) score += 0.25
  if (size === false) score -= 0.5
  return { score, gtin: false, size: size === true }
}

export function chooseCandidate(query, candidates) {
  let best = null
  for (const candidate of candidates) {
    const scored = scoreCandidate(query, candidate)
    const rank = scored.score + (scored.size ? 0.05 : 0)
    if (!best || rank > best.rank) best = { candidate, ...scored, rank }
  }
  if (!best || best.score < 0.55) return null
  return best
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

export function sydneyDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const bag = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { year: Number(bag.year), month: Number(bag.month), day: Number(bag.day) }
}

export function interpretAldiBadge(badge, now = new Date()) {
  const cleaned = String(badge || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return { onSpecial: false, label: null, note: null }
  const match = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})/)
  if (!match) {
    const on = /on sale|special|super saver|low price|half/i.test(cleaned)
    return { onSpecial: on, label: on ? cleaned : null, note: on ? null : cleaned }
  }
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()]
  if (month == null) return { onSpecial: false, label: null, note: cleaned }
  const today = sydneyDateParts(now)
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day)
  let year = today.year
  let start = Date.UTC(year, month, Number(match[1]))
  if (todayUtc - start > 200 * 86400000) start = Date.UTC(year + 1, month, Number(match[1]))
  if (start - todayUtc > 60 * 86400000) start = Date.UTC(year - 1, month, Number(match[1]))
  if (start > todayUtc) {
    return { onSpecial: false, label: null, note: `Aldi lists “${cleaned}”, which has not started.` }
  }
  if (todayUtc - start <= 7 * 86400000) return { onSpecial: true, label: cleaned, note: null }
  return { onSpecial: false, label: null, note: null }
}

export function searchQuery(product) {
  const brands = String(product.brand || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const name = String(product.name || '').trim()
  const brandInName = brands.find((brand) => name.toLowerCase().includes(brand.toLowerCase()))
  if (brandInName) return brandInName.slice(0, 60)
  return [brands[0], name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

export function emptyQuote(store, status, note) {
  return {
    store,
    status,
    match: null,
    productName: null,
    brand: null,
    size: null,
    price: null,
    wasPrice: null,
    unitPrice: null,
    onSpecial: false,
    halfPrice: false,
    specialLabel: null,
    url: null,
    image: null,
    gtin: null,
    note,
  }
}
