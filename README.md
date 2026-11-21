# ShopMate

ShopMate is a mobile-first barcode reader for the trolley. Point the camera at a product, take or upload a photo, or type the code. It looks the barcode up in the open product catalogues, saves it on the phone, and checks Australian supermarket prices once a day.

It is an installable PWA. It works in iPhone Safari and Android Chrome, including the photo fallback for when the live camera is unavailable.

## Run it locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

That starts two processes:

- Vite on port **43123** (the app)
- the price API on port **43124**, proxied at `/api`

`npm test` runs the unit tests. `npm run build` typechecks and builds the static app into `dist/`.

```bash
npm start
```

serves the built app and the API together on `0.0.0.0:$PORT` (43123 if `PORT` is unset). Use this for a production-style preview.

## What you can do

- **Scan** with the live camera. Android Chrome uses the Barcode Detector when the browser has it. Every browser, including iPhone Safari, falls back to ZXing. Supported codes: EAN-13, EAN-8, UPC-A, UPC-E, Code 128 and QR.
- **Take a photo or upload one** if the camera is blocked. There is a Nutella sample photo on the scan screen.
- **Type a code.** `3017620422003` is Nutella. `9300633603423` is an example of a code with no public record (its check digit does not match).
- **Researched** keeps every scan on this device. Open it again, add it to the shopping list, remove one, or clear them all.
- **Shopping list** accepts products and anything you type. Set a quantity, tick items off, remove them, or clear the ticked ones.

Australian English, metric units, and prices in AUD. Product data prefers kilojoules and sodium in milligrams.

## Where product details come from

The browser calls these keyless catalogues directly. They send `Access-Control-Allow-Origin: *`.

| Source | What it covers |
| --- | --- |
| Open Food Facts | Food, including a strong Australian range |
| Open Beauty Facts | Cosmetics |
| Open Pet Food Facts | Pet food |
| Open Products Facts | Everything else |
| UPCitemdb trial | A general catalogue. The app calls it through the API because that site only allows its own origin |

Each field on the product page names the catalogue it came from. If nothing matches, ShopMate links to a web search and to the Open Food Facts add-a-product form. It does not invent a product.

UPCitemdb’s free trial is about 100 requests a day. Results are cached for 24 hours. Many Australian EANs are not in that catalogue; an empty result is shown as “No record”.

## Supermarket prices

There is no official public API for Coles, Woolworths, Aldi or IGA. ShopMate reads the same public search pages the websites use, slowly, and caches each barcode for 24 hours.

| Store | Status |
| --- | --- |
| Coles | Live. The public search page embeds current price, was price and specials. The product page is opened only for the chosen match, to read the pack barcode when Coles publishes one. |
| Aldi | Live. The public search results page includes the price and any “on sale” label. Aldi does not publish barcodes, so a hit is labelled as a name and size match. A future “On Sale Wed …” date is not treated as a current special. |
| IGA | Live, for the IGA Shop website’s default store (the store id returned by `/api/storefront/stores/mine`, usually 32600). Prices differ by IGA store, and the search does not return barcodes, so matches are labelled. |
| Woolworths | Not reliable. `woolworths.com.au` returns 403 to this server (Akamai). The row says **Unavailable**. No price is shown and none is invented. If the block lifts, the same job will read the public search JSON. |

A price is only shown when the store’s name and pack size are a close match, or the pack barcode is the same. A different size is not substituted.

The phone syncs its researched barcodes to the API with an anonymous device id (`POST /api/prices/sync`). The API does not ask for an account.

### Schedule

The API process queues a refresh at **06:30 Australia/Sydney**, and again shortly after it starts, for any researched product whose cached price is older than 24 hours. Store requests are spaced about a second apart. One run handles up to 40 products; the rest wait for the next run.

The cache is a JSON file in `server/data/` (or `SHOPMATE_DATA_DIR`). On a host with an ephemeral disk, the cache is rebuilt after a restart. Nothing is fetched again until the daily job, or until a researched product is missing from the cache.

## Deploy

The Node server is the straightforward deploy: it serves `dist/` and the API, and it owns the daily job.

```bash
npm install
npm run build
NODE_ENV=production npm start
```

Bind the server to `0.0.0.0` and the platform’s `PORT`. `render.yaml` is a Render web service that does this. A sleeping free instance will run the catch-up refresh when it wakes, then wait for the next 06:30 Sydney.

A static host can serve `dist/` on its own (`public/_redirects` sends unknown paths to `index.html`). Product lookup against Open Food Facts still works. Prices and UPCitemdb need the API, so set the app to call it by building with the API on the same origin, or host both with `npm start`.

## Tests

```bash
npm test
```

Covers barcode check digits, catalogue merging, and the Coles, Aldi and IGA parsers. Live store pages are not required for the tests.
