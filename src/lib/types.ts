export type Field<T> = { value: T; source: string }

export type NutrientRow = {
  label: string
  per100: string | null
  perServe: string | null
  level: string | null
  indent?: boolean
}

export type SourceStatus = {
  id: string
  name: string
  state: 'found' | 'missing' | 'error'
  url: string | null
}

export type Offer = {
  merchant: string
  price: string | null
  link: string | null
}

export type ProductView = {
  code: string
  found: boolean
  name: Field<string> | null
  genericName: Field<string> | null
  brand: Field<string> | null
  image: Field<string> | null
  quantity: Field<string> | null
  categories: Field<string[]> | null
  ingredients: Field<string> | null
  ingredientsNote: string | null
  allergens: Field<string[]> | null
  traces: Field<string[]> | null
  labels: Field<string[]> | null
  nutriments: Field<NutrientRow[]> | null
  servingSize: string | null
  nutriscore: Field<string> | null
  nova: Field<number> | null
  ecoscore: Field<string> | null
  origins: Field<string> | null
  manufacturing: Field<string> | null
  countries: Field<string> | null
  packaging: Field<string> | null
  stores: Field<string> | null
  additives: Field<string[]> | null
  conservation: Field<string> | null
  link: Field<string> | null
  offers: Offer[]
  sources: SourceStatus[]
  checkDigit: 'ok' | 'bad' | 'unchecked'
}

export type StoreId = 'coles' | 'woolworths' | 'aldi' | 'iga'

export type StoreQuote = {
  store: StoreId
  status: 'found' | 'not_found' | 'unavailable'
  match: 'barcode' | 'name' | null
  productName: string | null
  brand: string | null
  size: string | null
  price: number | null
  wasPrice: number | null
  unitPrice: string | null
  onSpecial: boolean
  halfPrice: boolean
  specialLabel: string | null
  url: string | null
  gtin: string | null
  note: string | null
}

export type PriceRecord = {
  barcode: string
  name?: string | null
  checkedAt: string | null
  stores: StoreQuote[]
  error?: string
}

export type ResearchedItem = {
  code: string
  name: string | null
  brand: string | null
  image: string | null
  quantity: string | null
  found: boolean
  scannedAt: number
}

export type ListItem = {
  id: string
  barcode: string | null
  name: string
  brand: string | null
  image: string | null
  quantity: number
  checked: boolean
  addedAt: number
  store: string | null
  aisle: string | null
}
