import { ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ProductView } from '../components/ProductView.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { Button } from '../components/ui/button.tsx'
import { lookupProduct } from '../lib/lookup.ts'
import { preferredPlace, usePrices } from '../lib/prices.ts'
import { rememberProduct } from '../lib/researched.ts'
import { addProductToList, useShoppingList } from '../lib/shopping.ts'
import type { ProductView as Product } from '../lib/types.ts'

export function ProductPage() {
  const params = useParams()
  const code = decodeURIComponent(params.code || '')
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { prices, pending } = usePrices()
  const list = useShoppingList()
  const onList = list.some((item) => item.barcode === code)
  const [wiggle, setWiggle] = useState(false)

  useEffect(() => {
    document.title = 'BeepBeep'
    let cancelled = false
    setProduct(null)
    setError(null)
    lookupProduct(code)
      .then((found) => {
        if (cancelled) return
        setProduct(found)
        rememberProduct(found)
        document.title = found.name ? `${found.name.value} · BeepBeep` : 'BeepBeep'
      })
      .catch(() => {
        if (!cancelled) setError('The catalogues didn’t answer. Check your connection and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div>
      <TopBar back title="BeepBeep" />
      {!product && !error ? (
        <div className="space-y-4 px-4">
          <div className="h-72 animate-pulse rounded-[32px] bg-white" />
          <div className="h-28 animate-pulse rounded-[28px] bg-white" />
          <p className="font-black text-gold-ink">Rummaging through the open catalogues…</p>
        </div>
      ) : null}
      {error ? <p className="mx-4 rounded-[24px] bg-white p-5 font-bold text-sale">{error}</p> : null}
      {product ? <ProductView product={product} prices={prices[product.code]} pending={pending.includes(product.code)} /> : null}
      {product ? (
        <div className="fixed inset-x-0 z-30 mx-auto max-w-[480px] px-4 bottom-[calc(4.6rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="lg"
            className={`w-full ${wiggle ? 'wiggle' : ''}`}
            onClick={() => {
              addProductToList(product, preferredPlace(prices[product.code]))
              setWiggle(true)
              window.setTimeout(() => setWiggle(false), 500)
            }}
          >
            <ShoppingBag />
            {onList ? 'One more in the trolley' : 'Pop it on the list'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
