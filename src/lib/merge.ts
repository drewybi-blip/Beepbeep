import { checkDigitStatus, formatAmount, prettyTag } from './format.ts'
import type { Field, NutrientRow, Offer, ProductView, SourceStatus } from './types.ts'

type Facts = Record<string, unknown>

export type CatalogueHit = {
  id: string
  name: string
  state: 'found' | 'missing' | 'error'
  url: string | null
  product: Facts | null
}

const LEVEL_FOR: Record<string, string> = {
  Fat: 'fat',
  Saturated: 'saturated-fat',
  Sugars: 'sugars',
  Salt: 'salt',
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function firstText(product: Facts, keys: string[]) {
  for (const key of keys) {
    const value = text(product[key])
    if (value) return value
  }
  return null
}

function tags(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => prettyTag(String(item))).filter(Boolean)
}

function field<T>(value: T | null | undefined, source: string): Field<T> | null {
  if (value == null) return null
  if (typeof value === 'string' && !value.trim()) return null
  if (Array.isArray(value) && value.length === 0) return null
  return { value, source }
}

function numberOf(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function bestIngredients(product: Facts) {
  const candidates: { text: string; lang: string }[] = []
  for (const [key, value] of Object.entries(product)) {
    if (!key.startsWith('ingredients_text') || typeof value !== 'string' || !value.trim()) continue
    const lang = key === 'ingredients_text' ? 'default' : key.slice('ingredients_text_'.length)
    candidates.push({ text: value.trim(), lang })
  }
  if (!candidates.length) return null
  const english = candidates.find((item) => item.lang === 'en')
  const longest = [...candidates].sort((a, b) => b.text.length - a.text.length)[0]
  if (english && english.text.length >= longest.text.length * 0.75) {
    return { text: english.text, note: null }
  }
  if (longest.lang !== 'en' && longest.lang !== 'default') {
    const language = new Intl.DisplayNames('en-AU', { type: 'language' }).of(longest.lang) || longest.lang
    const shortEnglish = english ? ` The shorter English list is: ${english.text}` : ''
    return { text: longest.text, note: `Listed in ${language}, because that list is the complete one on file.${shortEnglish}` }
  }
  return { text: longest.text, note: null }
}

function nutrition(product: Facts): NutrientRow[] | null {
  const raw = product.nutriments
  if (!raw || typeof raw !== 'object') return null
  const nutriments = raw as Record<string, unknown>
  const levels = (product.nutrient_levels || {}) as Record<string, unknown>
  const rows: { label: string; per100: number | null; perServe: number | null; unit: string; digits: number; indent?: boolean }[] = [
    { label: 'Energy', per100: numberOf(nutriments['energy-kj_100g']), perServe: numberOf(nutriments['energy-kj_serving']), unit: 'kJ', digits: 0 },
    { label: 'Energy (kcal)', per100: numberOf(nutriments['energy-kcal_100g']), perServe: numberOf(nutriments['energy-kcal_serving']), unit: 'kcal', digits: 0 },
    { label: 'Fat', per100: numberOf(nutriments.fat_100g), perServe: numberOf(nutriments.fat_serving), unit: 'g', digits: 1 },
    { label: 'Saturated', per100: numberOf(nutriments['saturated-fat_100g']), perServe: numberOf(nutriments['saturated-fat_serving']), unit: 'g', digits: 1, indent: true },
    { label: 'Carbohydrate', per100: numberOf(nutriments.carbohydrates_100g), perServe: numberOf(nutriments.carbohydrates_serving), unit: 'g', digits: 1 },
    { label: 'Sugars', per100: numberOf(nutriments.sugars_100g), perServe: numberOf(nutriments.sugars_serving), unit: 'g', digits: 1, indent: true },
    { label: 'Fibre', per100: numberOf(nutriments.fiber_100g), perServe: numberOf(nutriments.fiber_serving), unit: 'g', digits: 1 },
    { label: 'Protein', per100: numberOf(nutriments.proteins_100g), perServe: numberOf(nutriments.proteins_serving), unit: 'g', digits: 1 },
    {
      label: 'Sodium',
      per100: numberOf(nutriments.sodium_100g) == null ? null : (numberOf(nutriments.sodium_100g) as number) * 1000,
      perServe: numberOf(nutriments.sodium_serving) == null ? null : (numberOf(nutriments.sodium_serving) as number) * 1000,
      unit: 'mg',
      digits: 0,
    },
    { label: 'Salt', per100: numberOf(nutriments.salt_100g), perServe: numberOf(nutriments.salt_serving), unit: 'g', digits: 2 },
  ]
  const visible = rows.filter((row) => row.per100 != null || row.perServe != null)
  if (!visible.length) return null
  return visible.map((row) => ({
    label: row.label,
    per100: row.per100 == null ? null : `${formatAmount(row.per100, row.digits)} ${row.unit}`,
    perServe: row.perServe == null ? null : `${formatAmount(row.perServe, row.digits)} ${row.unit}`,
    level: typeof levels[LEVEL_FOR[row.label] || ''] === 'string' ? String(levels[LEVEL_FOR[row.label] || '']) : null,
    indent: row.indent,
  }))
}

function categoriesOf(product: Facts) {
  const written = text(product.categories)
  if (written) {
    return written.split(',').map((part) => part.trim()).filter(Boolean).slice(-4)
  }
  return tags(product.categories_tags).slice(-4)
}

function quantityOf(product: Facts) {
  const written = text(product.quantity)
  if (written) return written
  const amount = numberOf(product.product_quantity)
  const unit = text(product.product_quantity_unit)
  return amount != null ? `${formatAmount(amount, 2)} ${unit || ''}`.trim() : null
}

function fromFacts(product: Facts, source: string) {
  const ingredients = bestIngredients(product)
  const labels = [...new Set([...tags(product.labels_tags), ...tags(product.ingredients_analysis_tags)])]
  return {
    name: field(firstText(product, ['product_name_en', 'product_name']), source),
    genericName: field(firstText(product, ['generic_name_en', 'generic_name']), source),
    brand: field(text(product.brands), source),
    image: field(firstText(product, ['image_front_url', 'image_url']), source),
    quantity: field(quantityOf(product), source),
    categories: field(categoriesOf(product), source),
    ingredients: field(ingredients?.text, source),
    ingredientsNote: ingredients?.note || null,
    allergens: field(tags(product.allergens_tags).length ? tags(product.allergens_tags) : tags(text(product.allergens)?.split(',') || []), source),
    traces: field(tags(product.traces_tags), source),
    labels: field(labels, source),
    nutriments: field(nutrition(product), source),
    servingSize: text(product.serving_size),
    nutriscore: field(text(product.nutriscore_grade)?.toUpperCase() || null, source),
    nova: field(numberOf(product.nova_group), source),
    ecoscore: field(text(product.ecoscore_grade)?.toUpperCase() || null, source),
    origins: field(text(product.origins), source),
    manufacturing: field(text(product.manufacturing_places), source),
    countries: field(text(product.countries), source),
    packaging: field(text(product.packaging_text), source),
    stores: field(text(product.stores), source),
    additives: field(tags(product.additives_tags), source),
    conservation: field(text(product.conservation_conditions), source),
    link: field(text(product.url) || text(product.link), source),
  }
}

type FactsFields = ReturnType<typeof fromFacts>

function take<K extends keyof FactsFields>(hits: FactsFields[], key: K): FactsFields[K] | null {
  for (const hit of hits) {
    const value = hit[key]
    if (value) return value
  }
  return null
}

function upcFields(item: Facts, source: string): FactsFields {
  const images = Array.isArray(item.images) ? item.images.map(String).filter((image) => image.startsWith('http')) : []
  return {
    name: field(text(item.title), source),
    genericName: field(text(item.description), source),
    brand: field(text(item.brand), source),
    image: field(images[0] || null, source),
    quantity: field(text(item.size) || text(item.weight) || null, source),
    categories: field(text(item.category) ? [text(item.category) as string] : null, source),
    ingredients: null,
    ingredientsNote: null,
    allergens: null,
    traces: null,
    labels: null,
    nutriments: null,
    servingSize: null,
    nutriscore: null,
    nova: null,
    ecoscore: null,
    origins: null,
    manufacturing: null,
    countries: null,
    packaging: null,
    stores: null,
    additives: null,
    conservation: null,
    link: null,
  }
}

export function mergeCatalogues(
  code: string,
  catalogues: CatalogueHit[],
  upcItem: Facts | null,
  upcState: 'found' | 'missing' | 'error' = upcItem ? 'found' : 'missing',
): ProductView {
  const foundHits = catalogues.filter((hit) => hit.state === 'found' && hit.product)
  const factSets = foundHits.map((hit) => fromFacts(hit.product as Facts, hit.name))
  if (upcItem) factSets.push(upcFields(upcItem, 'UPCitemdb'))
  const ingredientsHit = factSets.find((hit) => hit.ingredients)
  const offers: Offer[] = Array.isArray(upcItem?.offers)
    ? (upcItem.offers as Facts[]).slice(0, 4).map((offer) => ({
        merchant: text(offer.merchant) || 'Listing',
        price: offer.price == null || offer.price === '' ? null : `$${offer.price}`,
        link: text(offer.link),
      }))
    : []
  const sources: SourceStatus[] = catalogues.map((hit) => ({
    id: hit.id,
    name: hit.name,
    state: hit.state,
    url: hit.url,
  }))
  sources.push({
    id: 'upcitemdb',
    name: 'UPCitemdb',
    state: upcItem ? 'found' : upcState,
    url: upcItem ? 'https://www.upcitemdb.com/' : null,
  })

  const found = factSets.some((hit) => hit.name || hit.brand || hit.ingredients || hit.nutriments)
  return {
    code,
    found,
    name: take(factSets, 'name'),
    genericName: take(factSets, 'genericName'),
    brand: take(factSets, 'brand'),
    image: take(factSets, 'image'),
    quantity: take(factSets, 'quantity'),
    categories: take(factSets, 'categories'),
    ingredients: take(factSets, 'ingredients'),
    ingredientsNote: ingredientsHit?.ingredientsNote || null,
    allergens: take(factSets, 'allergens'),
    traces: take(factSets, 'traces'),
    labels: take(factSets, 'labels'),
    nutriments: take(factSets, 'nutriments'),
    servingSize: factSets.find((hit) => hit.servingSize)?.servingSize || null,
    nutriscore: take(factSets, 'nutriscore'),
    nova: take(factSets, 'nova'),
    ecoscore: take(factSets, 'ecoscore'),
    origins: take(factSets, 'origins'),
    manufacturing: take(factSets, 'manufacturing'),
    countries: take(factSets, 'countries'),
    packaging: take(factSets, 'packaging'),
    stores: take(factSets, 'stores'),
    additives: take(factSets, 'additives'),
    conservation: take(factSets, 'conservation'),
    link: take(factSets, 'link'),
    offers,
    sources,
    checkDigit: checkDigitStatus(code),
  }
}
