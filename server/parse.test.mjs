import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAldiHtml, parseColesHtml, parseIgaSearch } from './parse.mjs'

test('parses a Coles search payload', () => {
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      pageProps: {
        searchResults: {
          results: [
            {
              _type: 'PRODUCT',
              id: 6690772,
              name: 'Hazelnut Chocolate Spread',
              brand: 'Nutella',
              size: '750g',
              pricing: { now: 10, was: 12.5, promotionType: 'SPECIAL', saveStatement: 'save $2.50', comparable: '$1.33/ 100g' },
            },
            {
              _type: 'PRODUCT',
              id: 9032651,
              name: 'Hazelnut Chocolate Spread',
              brand: 'Nutella',
              size: '400g',
              gtin: '9300698000216',
              pricing: { now: 6.7, was: 0, promotionType: 'EVERYDAY', comparable: '$1.68/ 100g' },
            },
          ],
        },
      },
    },
  })}</script>`
  const parsed = parseColesHtml(html)
  assert.equal(parsed.products.length, 2)
  assert.equal(parsed.products[0].onSpecial, true)
  assert.equal(parsed.products[0].wasPrice, 12.5)
  assert.equal(parsed.products[1].onSpecial, false)
  assert.equal(parsed.products[1].gtin, '9300698000216')
})

test('parses Aldi tiles and keeps a future sale off the special flag', () => {
  const html = `
    <div data-test="product-tile" title="Nutella 900g">
      <a href="/product/ferrero-nutella-900g-000000000000365544"></a>
      <div data-test="product-tile__brandname"><p>FERRERO</p></div>
      <div data-test="product-tile__name"><p>Nutella 900g</p></div>
      <div data-test="product-tile__unit-of-measurement"><p>900 g</p></div>
      <div data-test="product-tile__comparison-price"><p>($1.33 per 100 g)</p></div>
      <div class="product-tile__on-sale-label"> On Sale Wed 25 Nov</div>
      <span class="base-price__regular"><span>$11.99</span></span>
    </div>`
  const parsed = parseAldiHtml(html, new Date('2026-11-21T12:00:00+11:00'))
  assert.equal(parsed.products.length, 1)
  assert.equal(parsed.products[0].price, 11.99)
  assert.equal(parsed.products[0].onSpecial, false)
  assert.match(parsed.products[0].note, /has not started/)
})

test('parses an IGA temporary price reduction', () => {
  const products = parseIgaSearch({
    items: [
      {
        name: 'Nutella Hazelnut Spread',
        brand: 'Nutella',
        sku: '406662',
        price: '$6.70',
        priceNumeric: 6.7,
        priceSource: 'regular',
        pricePerUnit: '$1.68/100g',
        unitOfSize: { size: 400, abbreviation: 'g' },
        tprPrice: [],
      },
      {
        name: 'Sparkling',
        brand: 'Example',
        sku: '1',
        priceNumeric: 15,
        wasPriceNumeric: 19,
        priceSource: 'tpr',
        priceLabel: '20% Off',
        unitOfSize: { size: 750, abbreviation: 'ml' },
      },
    ],
  })
  assert.equal(products[0].onSpecial, false)
  assert.equal(products[0].size, '400 g')
  assert.equal(products[1].onSpecial, true)
  assert.equal(products[1].wasPrice, 19)
  assert.equal(products[1].specialLabel, '20% Off')
})
