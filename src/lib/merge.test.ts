import { describe, expect, it } from 'vitest'
import { mergeCatalogues, type CatalogueHit } from './merge.ts'

const nutella: CatalogueHit = {
  id: 'openfoodfacts',
  name: 'Open Food Facts',
  state: 'found',
  url: 'https://world.openfoodfacts.org/product/3017620422003',
  product: {
    product_name: 'Nutella',
    brands: 'Ferrero',
    quantity: '400 g',
    ingredients_text_en: 'sugar, palm oil',
    ingredients_text_fr: 'Sucre, huile de palme, noisettes 13%, cacao maigre 7,4%, lait écrémé en poudre.',
    allergens_tags: ['en:milk', 'en:nuts'],
    nutriscore_grade: 'e',
    nova_group: 4,
    ecoscore_grade: 'd',
    nutriments: { 'energy-kj_100g': 2252, 'energy-kcal_100g': 539, fat_100g: 30.9, sodium_100g: 0.0428, fiber_100g: 0 },
    nutrient_levels: { fat: 'high', salt: 'low' },
    image_front_url: 'https://images.openfoodfacts.org/nutella.jpg',
  },
}

describe('mergeCatalogues', () => {
  it('keeps the fuller ingredient list and converts sodium to milligrams', () => {
    const view = mergeCatalogues('3017620422003', [nutella], null)
    expect(view.name?.value).toBe('Nutella')
    expect(view.name?.source).toBe('Open Food Facts')
    expect(view.ingredients?.value).toContain('noisettes')
    expect(view.ingredientsNote).toMatch(/French/)
    expect(view.nutriments?.value.find((row) => row.label === 'Sodium')?.per100).toBe('43 mg')
    expect(view.nutriments?.value.find((row) => row.label === 'Fibre')?.per100).toBe('0 g')
    expect(view.nutriments?.value.find((row) => row.label === 'Fat')?.level).toBe('high')
    expect(view.found).toBe(true)
  })

  it('fills a missing name from UPCitemdb and records the source', () => {
    const view = mergeCatalogues(
      '049000028911',
      [{ id: 'openfoodfacts', name: 'Open Food Facts', state: 'missing', url: null, product: null }],
      { title: 'Diet Coke 12 pack', brand: 'Diet Coke', images: ['https://example.com/coke.jpg'] },
    )
    expect(view.name?.value).toBe('Diet Coke 12 pack')
    expect(view.name?.source).toBe('UPCitemdb')
    expect(view.image?.source).toBe('UPCitemdb')
  })
})
