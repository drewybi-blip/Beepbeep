import { chooseCandidate, emptyQuote, isHalfPrice, searchQuery } from './match.mjs'
import { parseAldiHtml, parseColesHtml, parseIgaSearch } from './parse.mjs'

const BROWSER = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-AU,en;q=0.9',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getText(url, headers = {}) {
  const response = await fetch(url, {
    headers: { ...BROWSER, Accept: 'text/html,application/xhtml+xml', ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  })
  const text = await response.text()
  return { status: response.status, text, url: response.url }
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: { ...BROWSER, Accept: 'application/json', ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: response.status, json, text }
}

function fromChoice(store, choice, extraNote) {
  const item = choice.candidate
  const match = choice.gtin ? 'barcode' : 'name'
  const noteParts = []
  if (match === 'barcode') noteParts.push('Barcode match.')
  else {
    noteParts.push(
      `Matched by name${choice.size ? ' and size' : ''}, not the barcode. ${store === 'coles' ? 'Coles' : store === 'aldi' ? 'Aldi' : 'IGA'} lists ${item.brand ? `${item.brand} ` : ''}${item.name}${item.size ? ` ${item.size}` : ''}${item.gtin ? ` (pack barcode ${item.gtin})` : ''}.`,
    )
  }
  if (extraNote) noteParts.push(extraNote)
  if (item.note) noteParts.push(item.note)
  return {
    store,
    status: 'found',
    match,
    productName: item.name,
    brand: item.brand || null,
    size: item.size || null,
    price: item.price,
    wasPrice: item.wasPrice,
    unitPrice: item.unitPrice,
    onSpecial: Boolean(item.onSpecial),
    halfPrice: Boolean(item.halfPrice),
    specialLabel: item.specialLabel,
    url: item.url,
    image: null,
    gtin: item.gtin || null,
    note: noteParts.filter(Boolean).join(' '),
  }
}

let igaStoreId = null

async function igaStore() {
  if (igaStoreId) return igaStoreId
  const found = await getJson('https://www.igashop.com.au/api/storefront/stores/mine', {
    Referer: 'https://www.igashop.com.au/',
  })
  const id = found.json?.retailerStoreId
  if (!id) throw new Error('IGA did not return its default store')
  igaStoreId = String(id)
  return igaStoreId
}

export async function lookupColes(product) {
  const query = searchQuery(product)
  if (!query) return emptyQuote('coles', 'not_found', 'No product name on file, so Coles was not searched.')
  try {
    const search = await getText(`https://www.coles.com.au/search/products?q=${encodeURIComponent(query)}`)
    if (search.status === 403) return emptyQuote('coles', 'unavailable', 'Coles blocked this lookup, so no price is shown.')
    const parsed = parseColesHtml(search.text)
    if (parsed.blocked) return emptyQuote('coles', 'unavailable', 'Coles did not return the public search page.')
    const choice = chooseCandidate(product, parsed.products)
    if (!choice) return emptyQuote('coles', 'not_found', 'No close Coles name and size match.')
    if (!choice.candidate.gtin && choice.candidate.id) {
      await sleep(800)
      try {
        const detail = await getText(`https://www.coles.com.au/product/item-${choice.candidate.id}`)
        const productPage = parseColesHtml(detail.text)
        const detailed = productPage.products.find((item) => item.id === choice.candidate.id) || productPage.products[0]
        if (detailed?.gtin) choice.candidate.gtin = detailed.gtin
        if (detailed?.price != null) {
          choice.candidate.price = detailed.price
          choice.candidate.wasPrice = detailed.wasPrice
          choice.candidate.onSpecial = detailed.onSpecial
          choice.candidate.halfPrice = detailed.halfPrice
          choice.candidate.specialLabel = detailed.specialLabel
          choice.candidate.unitPrice = detailed.unitPrice
        }
      } catch (error) {
        console.error('coles detail', error instanceof Error ? error.message : error)
      }
    }
    return fromChoice('coles', choice, 'Coles online price.')
  } catch (error) {
    console.error('coles', error instanceof Error ? error.message : error)
    return emptyQuote('coles', 'unavailable', 'Coles could not be reached, so no price is shown.')
  }
}

export async function lookupAldi(product) {
  const query = searchQuery(product)
  if (!query) return emptyQuote('aldi', 'not_found', 'No product name on file, so Aldi was not searched.')
  try {
    const search = await getText(`https://www.aldi.com.au/results?q=${encodeURIComponent(query)}`, {
      Referer: 'https://www.aldi.com.au/',
    })
    if (search.status === 403) return emptyQuote('aldi', 'unavailable', 'Aldi blocked this lookup, so no price is shown.')
    const parsed = parseAldiHtml(search.text)
    if (parsed.blocked || (search.status >= 400 && parsed.products.length === 0)) {
      return emptyQuote('aldi', 'unavailable', 'Aldi did not return the public search page.')
    }
    const choice = chooseCandidate(product, parsed.products)
    if (!choice) return emptyQuote('aldi', 'not_found', 'No close Aldi name and size match. Aldi does not publish barcodes.')
    return fromChoice('aldi', choice, 'Aldi online price. Aldi does not publish barcodes, so this is a name match.')
  } catch (error) {
    console.error('aldi', error instanceof Error ? error.message : error)
    return emptyQuote('aldi', 'unavailable', 'Aldi could not be reached, so no price is shown.')
  }
}

export async function lookupIga(product) {
  const query = searchQuery(product)
  if (!query) return emptyQuote('iga', 'not_found', 'No product name on file, so IGA was not searched.')
  try {
    const storeId = await igaStore()
    const search = await getJson(
      `https://www.igashop.com.au/api/storefront/stores/${encodeURIComponent(storeId)}/search?q=${encodeURIComponent(query)}&take=24&skip=0`,
      { Referer: 'https://www.igashop.com.au/search' },
    )
    if (search.status >= 400 || !search.json) {
      return emptyQuote('iga', 'unavailable', 'IGA Shop search did not answer, so no price is shown.')
    }
    const products = parseIgaSearch(search.json)
    const choice = chooseCandidate(product, products)
    if (!choice) {
      return emptyQuote('iga', 'not_found', `No close match at IGA Shop's default store (${storeId}).`)
    }
    return fromChoice(
      'iga',
      choice,
      `IGA online price at the website's default store (${storeId}). Other IGA stores set their own prices. IGA search does not return barcodes.`,
    )
  } catch (error) {
    console.error('iga', error instanceof Error ? error.message : error)
    return emptyQuote('iga', 'unavailable', 'IGA could not be reached, so no price is shown.')
  }
}

let woolworthsState = 'unknown'

export async function lookupWoolworths(product) {
  if (!searchQuery(product)) {
    return emptyQuote('woolworths', 'not_found', 'No product name on file, so Woolworths was not searched.')
  }
  if (woolworthsState === 'blocked') {
    return emptyQuote(
      'woolworths',
      'unavailable',
      'Woolworths blocks automated lookups from this server (the public site returns 403), so no price is shown.',
    )
  }
  try {
    const response = await fetch('https://www.woolworths.com.au/apis/ui/Search/products', {
      method: 'POST',
      headers: {
        ...BROWSER,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: 'https://www.woolworths.com.au',
        Referer: 'https://www.woolworths.com.au/shop/search/products',
      },
      body: JSON.stringify({
        Filters: [],
        IsSpecial: false,
        Location: `/shop/search/products?searchTerm=${encodeURIComponent(searchQuery(product))}`,
        PageNumber: 1,
        PageSize: 20,
        SearchTerm: searchQuery(product),
        SortType: 'TraderRelevance',
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 403 || response.status === 401) {
      woolworthsState = 'blocked'
      return emptyQuote(
        'woolworths',
        'unavailable',
        'Woolworths blocks automated lookups from this server (the public site returns 403), so no price is shown.',
      )
    }
    if (!response.ok) {
      return emptyQuote('woolworths', 'unavailable', `Woolworths returned ${response.status}, so no price is shown.`)
    }
    woolworthsState = 'open'
    const json = await response.json()
    const products = (json.Products || []).map((item) => ({
      id: String(item.Stockcode || ''),
      name: item.DisplayName || item.Name || '',
      brand: item.Brand || '',
      size: item.PackageSize || '',
      price: item.Price,
      wasPrice: item.WasPrice,
      unitPrice: item.CupPrice || null,
      onSpecial: Boolean(item.IsOnSpecial),
      halfPrice: false,
      specialLabel: item.IsOnSpecial ? item.PromotionDescription || 'Special' : null,
      gtin: item.Barcode || null,
      url: item.Stockcode ? `https://www.woolworths.com.au/shop/productdetails/${item.Stockcode}` : null,
    }))
    const choice = chooseCandidate(product, products)
    if (!choice) return emptyQuote('woolworths', 'not_found', 'No close Woolworths name and size match.')
    const quote = fromChoice('woolworths', choice, 'Woolworths online price.')
    if (isHalfPrice(quote.price, quote.wasPrice)) {
      quote.halfPrice = true
      quote.onSpecial = true
      quote.specialLabel = 'Half price'
    }
    return quote
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') woolworthsState = 'blocked'
    console.error('woolworths', error instanceof Error ? error.message : error)
    return emptyQuote(
      'woolworths',
      'unavailable',
      'Woolworths blocks or times out automated lookups from this server, so no price is shown.',
    )
  }
}

export async function lookupAllStores(product) {
  const stores = []
  stores.push(await lookupColes(product))
  await sleep(900)
  stores.push(await lookupAldi(product))
  await sleep(900)
  stores.push(await lookupIga(product))
  await sleep(400)
  stores.push(await lookupWoolworths(product))
  return stores
}
