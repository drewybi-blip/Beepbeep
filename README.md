# BeepBeep

BeepBeep is a mobile-first barcode reader for the trolley. Point the camera at a product, take or upload a photo, or type the code. It looks the barcode up in the open product catalogues, saves it on the phone, and checks Australian supermarket prices once a day.

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

- **Scan** with the live camera. A successful read plays a double checkout beep, beep-beep (two short tones, and two quick vibrations on Android). The speaker button turns the beep off and that choice stays on the phone. The first tap unlocks audio for iPhone Safari. Android Chrome uses the Barcode Detector when the browser has it. Every browser, including iPhone Safari, falls back to ZXing. Supported codes: EAN-13, EAN-8, UPC-A, UPC-E, Code 128 and QR.
- **Take a photo or upload one** if the camera is blocked. There is a Nutella sample photo on the scan screen.
- **Type a code.** `3017620422003` is Nutella. `9300633603423` is an example of a code with no public record (its check digit does not match).
- **Researched** keeps every scan on this device. Open it again, add it to the shopping list, remove one, or clear them all.
- **Shopping list** accepts products and anything you type. Set a quantity, tick items off, remove them, or clear the ticked ones. **In-store mode** makes the ticks big, groups items by store and aisle when we know them, and keeps the screen awake when the phone allows it. Add BeepBeep to the home screen so the list still opens with no reception.
- **Wallet** can carry a summary of the list (count, first items, estimated total) plus a QR link back to in-store mode. The buttons stay on “coming soon” until the Apple and Google credentials below are set. BeepBeep does not invent a pass.

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

Each field on the product page names the catalogue it came from. If nothing matches, BeepBeep links to a web search and to the Open Food Facts add-a-product form. It does not invent a product.

UPCitemdb’s free trial is about 100 requests a day. Results are cached for 24 hours. Many Australian EANs are not in that catalogue; an empty result is shown as “No record”.

## Supermarket prices

There is no official public API for Coles, Woolworths, Aldi or IGA. BeepBeep reads the same public search pages the websites use, slowly, and caches each barcode for 24 hours.

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

The cache is a JSON file in `server/data/` (or `BEEPBEEP_DATA_DIR`). On a host with an ephemeral disk, the cache is rebuilt after a restart. Nothing is fetched again until the daily job, or until a researched product is missing from the cache.

## Deploy

The Node server is the straightforward deploy: it serves `dist/` and the API, and it owns the daily job.

```bash
npm install
npm run build
NODE_ENV=production npm start
```

Bind the server to `0.0.0.0` and the platform’s `PORT`. `render.yaml` is a Render web service that does this. A sleeping free instance will run the catch-up refresh when it wakes, then wait for the next 06:30 Sydney.

A static host can serve `dist/` on its own (`public/_redirects` sends unknown paths to `index.html`). Product lookup against Open Food Facts still works. Prices and UPCitemdb need the API, so set the app to call it by building with the API on the same origin, or host both with `npm start`.

## Home screen and offline

The production build is a PWA. The service worker precaches the app shell and, after a list has been saved, keeps a copy of `GET /api/lists/:id` so in-store mode can open that list without reception. The list on this phone also lives in local storage, so ticking items does not need the network.

iPhone Safari does not offer an install prompt. BeepBeep tells you to tap Share, then Add to Home Screen. Android Chrome can use the Install button when the browser fires `beforeinstallprompt`.

## Wallet passes

`GET /api/wallet/status` reports whether each wallet is configured. Until it is, the shopping list shows **coming soon** and the pass endpoints answer 503. No sample pass is generated.

A configured pass shows how many items are still to get, up to four names, the estimated total when prices are known, and a QR code that opens `/store/:listId`. The phone syncs the list with `POST /api/lists`. Set `PUBLIC_BASE_URL` to the public https origin so the QR points at the deployed app.

### Apple Wallet

You need an Apple Developer account and a Pass Type ID certificate.

| Variable | What to put in it |
| --- | --- |
| `APPLE_PASS_TYPE_ID` | Pass Type ID, such as `pass.au.example.beepbeep` |
| `APPLE_TEAM_ID` | 10-character Apple Team ID |
| `APPLE_PASS_CERT_PEM` | Pass Type ID certificate, PEM text or a path to the PEM file |
| `APPLE_PASS_KEY_PEM` | Matching private key, PEM text or a path |
| `APPLE_PASS_KEY_PASSPHRASE` | Passphrase for the key, if it has one |
| `APPLE_WWDR_CERT_PEM` | Apple Worldwide Developer Relations intermediate certificate, PEM text or a path |

The server signs the pass with `openssl smime` and zips it. Both `openssl` and `zip` need to be on the host. Download is `GET /api/wallet/apple/:listId`.

### Google Wallet

You need a Google Wallet issuer account and a service account that can save passes.

| Variable | What to put in it |
| --- | --- |
| `GOOGLE_WALLET_ISSUER_ID` | Issuer id from the Google Wallet console |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | Service account JSON, as the raw JSON string |
| `GOOGLE_WALLET_CLASS_ID` | Optional. Defaults to `{issuer id}.beepbeep_list`. Create that Generic class in the Wallet console before shoppers tap save. |

`GET /api/wallet/google/:listId` returns `{ "url": "https://pay.google.com/gp/v/save/..." }`. BeepBeep only builds that link when the variables above are set.

## Tests

```bash
npm test
```

Covers barcode check digits, catalogue merging, and the Coles, Aldi and IGA parsers. Live store pages are not required for the tests.
