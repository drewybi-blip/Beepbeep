import { mergeCatalogues, type CatalogueHit } from './merge.ts'
import type { ProductView } from './types.ts'

const CATALOGUES = [
  { id: 'openfoodfacts', name: 'Open Food Facts', host: 'world.openfoodfacts.org' },
  { id: 'openbeautyfacts', name: 'Open Beauty Facts', host: 'world.openbeautyfacts.org' },
  { id: 'openpetfoodfacts', name: 'Open Pet Food Facts', host: 'world.openpetfoodfacts.org' },
  { id: 'openproductsfacts', name: 'Open Products Facts', host: 'world.openproductsfacts.org' },
] as const

const FIELDS = [
  'product_name', 'product_name_en', 'generic_name', 'generic_name_en', 'brands', 'quantity',
  'product_quantity', 'product_quantity_unit', 'serving_size', 'categories', 'categories_tags',
  'labels_tags', 'ingredients_text', 'ingredients_text_en', 'ingredients_text_fr', 'allergens',
  'allergens_tags', 'traces_tags', 'nutriments', 'nutriscore_grade', 'nova_group', 'ecoscore_grade',
  'origins', 'manufacturing_places', 'countries', 'image_front_url', 'image_url', 'packaging_text',
  'stores', 'link', 'url', 'additives_tags', 'nutrient_levels', 'ingredients_analysis_tags',
  'conservation_conditions',
].join(',')

export function codeVariants(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const variants = new Set<string>()
  if (digits) variants.add(digits)
  if (digits.length === 12) variants.add(`0${digits}`)
  if (digits.length === 13 && digits.startsWith('0')) variants.add(digits.slice(1))
  if (digits.length === 14) variants.add(digits.replace(/^0+/, '').padStart(13, '0'))
  return [...variants]
}

function primaryCode(raw: string) {
  const variants = codeVariants(raw)
  return variants.find((code) => code.length === 13) || variants[0] || raw.trim()
}

async function readFacts(host: string, code: string): Promise<CatalogueHit> {
  const catalogue = CATALOGUES.find((item) => item.host === host)!
  const url = `https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
    const body = (await response.json()) as { status?: number; product?: Record<string, unknown> }
    if (body.status === 1 && body.product) {
      return { id: catalogue.id, name: catalogue.name, state: 'found', url: `https://${host}/product/${code}`, product: body.product }
    }
    return { id: catalogue.id, name: catalogue.name, state: 'missing', url: null, product: null }
  } catch {
    return { id: catalogue.id, name: catalogue.name, state: 'error', url: null, product: null }
  }
}

async function readUpc(code: string) {
  try {
    const response = await fetch(`/api/upc?upc=${encodeURIComponent(code)}`, { signal: AbortSignal.timeout(12000) })
    if (!response.ok) return { error: true, item: null }
    const body = (await response.json()) as { items?: Record<string, unknown>[] }
    return { error: false, item: body.items?.[0] || null }
  } catch {
    return { error: true, item: null }
  }
}

export async function lookupProduct(raw: string): Promise<ProductView> {
  const code = primaryCode(raw)
  const alternate = codeVariants(raw).find((item) => item !== code)
  let catalogues = await Promise.all(CATALOGUES.map((catalogue) => readFacts(catalogue.host, code)))
  if (alternate && catalogues.every((hit) => hit.state !== 'found')) {
    const retry = await Promise.all(CATALOGUES.map((catalogue) => readFacts(catalogue.host, alternate)))
    if (retry.some((hit) => hit.state === 'found')) catalogues = retry
  }
  const upcCode = code.replace(/\D/g, '')
  const upc = /^\d{8,14}$/.test(upcCode) ? await readUpc(upcCode) : { error: false, item: null }
  const upcState = upc.error ? 'error' : upc.item ? 'found' : 'missing'
  return mergeCatalogues(/^\d+$/.test(code) ? code : raw.trim(), catalogues, upc.item, upcState)
}
