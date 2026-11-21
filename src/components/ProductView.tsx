import type { ReactNode } from 'react'
import { PriceStack } from './Prices.tsx'
import type { PriceRecord, ProductView as Product } from '../lib/types.ts'

const NUTRI: Record<string, string> = { A: '#038141', B: '#85bb2f', C: '#c9a000', D: '#ee8100', E: '#e63e11' }
const NOVA: Record<number, string> = {
  1: 'Unprocessed',
  2: 'Culinary ingredient',
  3: 'Processed',
  4: 'Ultra-processed',
}

function Section({ title, source, children }: { title: string; source?: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_30px_rgba(20,48,40,0.06)]">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {source ? <p className="text-right text-[11px] font-extrabold text-gold-ink">{source}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Pills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-gold-soft px-3 py-1 text-sm font-extrabold text-pine">
          {item}
        </span>
      ))}
    </div>
  )
}

export function ProductView({ product, prices, pending }: { product: Product; prices?: PriceRecord; pending?: boolean }) {
  const webSearch = `https://www.google.com/search?q=${encodeURIComponent(product.code)}`
  const addLink = `https://world.openfoodfacts.org/cgi/product.pl?type=edit&code=${encodeURIComponent(product.code)}`
  const hasServe = product.nutriments?.value.some((row) => row.perServe)

  return (
    <div className="space-y-4 px-4 pb-28">
      <article className="overflow-hidden rounded-[32px] bg-white shadow-[0_16px_40px_rgba(20,48,40,0.08)]">
        <div className="aspect-square bg-[#fff6df]">
          {product.image ? (
            <img
              src={product.image.value}
              alt={product.name?.value || 'Product photo'}
              className="h-full w-full object-contain p-6"
              referrerPolicy="no-referrer"
            />
          ) : (
            <p className="flex h-full items-center justify-center text-center text-lg font-extrabold text-gold-ink">No photo on file</p>
          )}
        </div>
        <div className="p-5">
          {product.brand ? <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-gold-ink">{product.brand.value}</p> : null}
          <h2 className="mt-1 text-[2.1rem] font-extrabold leading-[0.95] tracking-tight text-pine">
            {product.name?.value || 'No public record'}
          </h2>
          {product.genericName && product.genericName.value.toLowerCase() !== product.name?.value.toLowerCase() ? (
            <p className="mt-2 font-semibold text-muted">{product.genericName.value}</p>
          ) : null}
          <p className="mt-2 font-bold text-ink">
            {[product.quantity?.value, product.categories?.value[0]].filter(Boolean).join(' · ') || product.code}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.nutriscore ? (
              <span className="rounded-full px-3 py-1 text-sm font-extrabold text-white" style={{ background: NUTRI[product.nutriscore.value] || '#143028' }}>
                Nutri-Score {product.nutriscore.value}
              </span>
            ) : null}
            {product.nova ? (
              <span className="rounded-full bg-pine px-3 py-1 text-sm font-extrabold text-gold">
                NOVA {product.nova.value}
              </span>
            ) : null}
            {product.ecoscore ? (
              <span className="rounded-full bg-leaf px-3 py-1 text-sm font-extrabold text-white">Eco-Score {product.ecoscore.value}</span>
            ) : null}
          </div>
          {product.nova ? <p className="mt-2 text-sm font-semibold text-muted">{NOVA[product.nova.value]}</p> : null}
          {product.name ? <p className="mt-3 text-xs font-extrabold text-gold-ink">Name from {product.name.source}</p> : null}
        </div>
      </article>

      {!product.found ? (
        <Section title="Nothing public yet">
          <p className="font-semibold leading-relaxed text-ink">
            Open Food Facts, Open Beauty Facts, Open Pet Food Facts, Open Products Facts and UPCitemdb had no record for {product.code}.
          </p>
          {product.checkDigit === 'bad' ? (
            <p className="mt-2 font-bold text-sale">This barcode’s check digit doesn’t match. We searched anyway.</p>
          ) : null}
          <p className="mt-3 text-sm font-semibold text-muted">Australian groceries are usually listed on Open Food Facts. This one isn’t there yet.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="rounded-full bg-gold px-4 py-2 text-sm font-extrabold text-pine" href={webSearch} target="_blank" rel="noreferrer">Search the web</a>
            <a className="rounded-full bg-paper px-4 py-2 text-sm font-extrabold text-pine" href={addLink} target="_blank" rel="noreferrer">Add it on Open Food Facts</a>
          </div>
        </Section>
      ) : null}

      <Section title="Supermarket prices" source="Checked once a day">
        <PriceStack record={prices} pending={pending} />
        <p className="mt-3 text-xs font-semibold leading-relaxed text-muted">
          Online prices from the public catalogues, not a promise about your local shelf. A name match is labelled when the pack barcode differs.
        </p>
      </Section>

      {product.ingredients ? (
        <Section title="Ingredients" source={product.ingredients.source}>
          <p className="font-semibold leading-relaxed">{product.ingredients.value}</p>
          {product.ingredientsNote ? <p className="mt-2 text-sm font-semibold text-muted">{product.ingredientsNote}</p> : null}
        </Section>
      ) : null}

      {product.allergens ? (
        <Section title="Allergens" source={product.allergens.source}>
          <Pills items={product.allergens.value} />
          {product.traces ? <p className="mt-3 text-sm font-semibold text-muted">May contain {product.traces.value.join(', ')}.</p> : null}
        </Section>
      ) : null}

      {product.nutriments ? (
        <Section title="Nutrition" source={product.nutriments.source}>
          <p className="mb-3 text-sm font-bold text-muted">
            Per 100 g{product.servingSize ? ` and per serve (${product.servingSize})` : ''}. Figures use metric units.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-xs font-extrabold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-extrabold">Nutrient</th>
                  <th className="px-3 py-2 font-extrabold">Per 100 g</th>
                  <th className="px-3 py-2 font-extrabold">Per serve</th>
                </tr>
              </thead>
              <tbody>
                {product.nutriments.value.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <td className={`px-3 py-2 font-extrabold ${row.indent ? 'pl-6 text-muted' : ''}`}>
                      {row.label}
                      {row.level ? <span className="ml-2 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] uppercase text-pine">{row.level}</span> : null}
                    </td>
                    <td className="px-3 py-2 font-semibold">{row.per100 || '—'}</td>
                    <td className="px-3 py-2 font-semibold">{row.perServe || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hasServe ? <p className="mt-2 text-xs font-semibold text-muted">Per serve isn’t published for this product.</p> : null}
        </Section>
      ) : null}

      {product.labels ? (
        <Section title="Labels" source={product.labels.source}>
          <Pills items={product.labels.value} />
        </Section>
      ) : null}

      {product.origins || product.manufacturing || product.countries ? (
        <Section title="Origin">
          <dl className="space-y-2 text-sm">
            {product.countries ? <div><dt className="font-extrabold">Sold in</dt><dd className="font-semibold">{product.countries.value}</dd><dd className="text-xs font-extrabold text-gold-ink">{product.countries.source}</dd></div> : null}
            {product.origins ? <div><dt className="font-extrabold">Origin of ingredients</dt><dd className="font-semibold">{product.origins.value}</dd><dd className="text-xs font-extrabold text-gold-ink">{product.origins.source}</dd></div> : null}
            {product.manufacturing ? <div><dt className="font-extrabold">Manufactured in</dt><dd className="font-semibold">{product.manufacturing.value}</dd><dd className="text-xs font-extrabold text-gold-ink">{product.manufacturing.source}</dd></div> : null}
          </dl>
        </Section>
      ) : null}

      {product.packaging || product.stores || product.additives || product.conservation ? (
        <Section title="Also on file">
          <div className="space-y-3 text-sm font-semibold">
            {product.packaging ? <p><span className="font-extrabold">Packaging. </span>{product.packaging.value}</p> : null}
            {product.stores ? <p><span className="font-extrabold">Stores. </span>{product.stores.value}</p> : null}
            {product.additives ? <p><span className="font-extrabold">Additives. </span>{product.additives.value.join(', ')}</p> : null}
            {product.conservation ? <p><span className="font-extrabold">Storage. </span>{product.conservation.value}</p> : null}
          </div>
        </Section>
      ) : null}

      {product.offers.length ? (
        <Section title="Other listings" source="UPCitemdb">
          <p className="mb-2 text-xs font-semibold text-muted">Catalogue listings, not Australian shelf prices.</p>
          <ul className="space-y-2">
            {product.offers.map((offer) => (
              <li key={`${offer.merchant}-${offer.price}`} className="flex items-center justify-between gap-3 font-bold">
                <span>{offer.merchant}</span>
                {offer.link ? <a className="text-leaf underline" href={offer.link} target="_blank" rel="noreferrer">{offer.price || 'View'}</a> : <span>{offer.price}</span>}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Sources">
        <ul className="space-y-2">
          {product.sources.map((source) => (
            <li key={source.id} className="flex items-center justify-between gap-3 text-sm font-bold">
              <span>{source.name}</span>
              <span className={source.state === 'found' ? 'text-leaf' : 'text-muted'}>
                {source.state === 'found' ? 'Record found' : source.state === 'error' ? 'Unreachable' : 'No record'}
              </span>
            </li>
          ))}
        </ul>
        {product.link ? (
          <a className="mt-3 inline-block text-sm font-extrabold text-leaf underline" href={product.link.value} target="_blank" rel="noreferrer">
            Open the {product.link.source} page
          </a>
        ) : null}
        <a className="mt-2 block text-sm font-extrabold text-pine underline" href={webSearch} target="_blank" rel="noreferrer">
          Search {product.code} on the web
        </a>
      </Section>
    </div>
  )
}
