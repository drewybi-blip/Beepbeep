import { interpretAldiBadge, isHalfPrice, money } from './match.mjs'

function clean(value) {
  return String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function grab(html, pattern) {
  const match = html.match(pattern)
  return match ? clean(match[1]) : ''
}

export function parseColesHtml(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) return { blocked: /access denied|captcha/i.test(html), products: [] }
  let data
  try {
    data = JSON.parse(match[1])
  } catch {
    return { blocked: false, products: [] }
  }
  const page = data?.props?.pageProps || {}
  const list = page.searchResults?.results || (page.product ? [page.product] : [])
  const products = list
    .filter((item) => item && (item._type === 'PRODUCT' || item.pricing || item.name))
    .map((item) => {
      const pricing = item.pricing || {}
      const now = money(pricing.now)
      const was = money(pricing.was)
      const special = pricing.promotionType === 'SPECIAL' || (was != null && now != null && was > now)
      return {
        id: String(item.id || ''),
        name: item.name || item.description || '',
        brand: item.brand || '',
        size: item.size || '',
        price: now,
        wasPrice: was,
        unitPrice: pricing.comparable || null,
        onSpecial: Boolean(special),
        halfPrice: isHalfPrice(now, was),
        specialLabel: special ? pricing.saveStatement || (isHalfPrice(now, was) ? 'Half price' : 'Special') : null,
        gtin: item.gtin || null,
        url: item.id ? `https://www.coles.com.au/product/item-${item.id}` : null,
      }
    })
    .filter((item) => item.name && item.price != null)
  return { blocked: false, products }
}

export function parseAldiHtml(html, now = new Date()) {
  if (/access denied|captcha/i.test(html) && !html.includes('product-tile')) {
    return { blocked: true, products: [] }
  }
  const chunks = html.split('data-test="product-tile"').slice(1)
  const products = chunks
    .map((chunk) => {
      const name = grab(chunk, /data-test="product-tile__name"><p[^>]*>([\s\S]*?)<\/p>/)
      const brand = grab(chunk, /data-test="product-tile__brandname"><p[^>]*>([\s\S]*?)<\/p>/)
      const price = money(grab(chunk, /base-price__regular"><span>([\s\S]*?)<\/span>/))
      const wasPrice = money(grab(chunk, /<s>\s*([^<]+)<\/s>/) || grab(chunk, /base-price__comparison[^"]*"[^>]*>[\s\S]{0,120}?<span>([\s\S]*?)<\/span>/))
      const size = grab(chunk, /product-tile__unit-of-measurement"><p>([\s\S]*?)<\/p>/)
      const unitPrice = grab(chunk, /product-tile__comparison-price"><p>([\s\S]*?)<\/p>/).replace(/^\(|\)$/g, '')
      const badge = grab(chunk, /product-tile__on-sale-label">([\s\S]*?)<\/div>/)
      const href = chunk.match(/href="(\/product\/[^"]+)"/)?.[1] || null
      const sale = interpretAldiBadge(badge, now)
      const reduced = wasPrice != null && price != null && wasPrice > price
      return {
        id: href,
        name,
        brand,
        size,
        price,
        wasPrice,
        unitPrice: unitPrice || null,
        onSpecial: reduced || sale.onSpecial,
        halfPrice: isHalfPrice(price, wasPrice),
        specialLabel: reduced ? (isHalfPrice(price, wasPrice) ? 'Half price' : 'Special') : sale.label,
        gtin: null,
        url: href ? `https://www.aldi.com.au${href}` : null,
        note: sale.note,
      }
    })
    .filter((item) => item.name && item.price != null)
  return { blocked: false, products }
}

export function parseIgaSearch(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : []
  return items
    .map((item) => {
      const price = money(item.priceNumeric ?? item.price)
      const wasPrice = money(item.wasPriceNumeric ?? item.wasPrice)
      const label = item.priceLabel || item.tprPrice?.[0]?.label || ''
      const reduced = item.priceSource === 'tpr' || (wasPrice != null && price != null && wasPrice > price)
      const size = item.unitOfSize?.size
        ? `${item.unitOfSize.size}${item.unitOfSize.abbreviation ? ` ${item.unitOfSize.abbreviation}` : ''}`
        : ''
      return {
        id: String(item.sku || item.productId || ''),
        name: item.name || '',
        brand: item.brand || '',
        size,
        price,
        wasPrice,
        unitPrice: item.pricePerUnit || null,
        onSpecial: Boolean(reduced),
        halfPrice: isHalfPrice(price, wasPrice) || /half price|50%/i.test(label),
        specialLabel: reduced ? label || (isHalfPrice(price, wasPrice) ? 'Half price' : 'Special') : null,
        gtin: null,
        url: item.sku ? `https://www.igashop.com.au/product/${item.sku}` : null,
      }
    })
    .filter((item) => item.name && item.price != null)
}
