# Valio Aimo mock environment — what's actually there

Read 13 Nov 2026 from the resource portal (junction26.valioaimo.fi): landing page, OpenAPI spec, product schema, and the three data files. The live price and availability endpoints were **not called** (they need the API key from the challenge page).

## API (base `https://junction26.valioaimo.fi`, header `X-API-Key`)

| Endpoint | Purpose |
|---|---|
| `GET /api/ping` | Auth check |
| `POST /api/price` | Price per product for a delivery date |
| `POST /api/availability` | Whether and when a product can be delivered, and how much |
| `GET /api/products/download` | Redirect to the product JSON |
| `GET /api/delivery-reliability/download` | Redirect to the reliability CSV |
| `GET /api/carbon-footprint/download` | Redirect to the carbon CSV |

Docs: `/docs` (Swagger), `/redoc`, `/openapi.json`.

**Request body for both price and availability:**
```json
{"customer": "123", "requestedDate": "2026-11-16", "products": ["460013", "460063"]}
```
- 1–1,000 product codes per request; more returns HTTP 422.
- `customer` is ignored in the mock (real prices are customer-specific).
- **Undisclosed rate limits.** The spec says not to sweep all products: narrow down from the static file first, then query.

**Price response, per product:** `catalogPrice` (value, valueWithTax, validFrom, validTo, currency) · `priceWithTax` · `comparisonPrice` + `comparisonUnit` (KG or L only) · `tax` (rate, value) · `listPrice` · `netPriceFound` · `error` (true = no price). Quantity is always 1 sales unit.

**Availability response, per product:** `closingTime` (order cut-off to receive on availableDate) · `salesBlock` · `logisticModel` · `scheduleLines` (one entry if available, empty = cannot be delivered on any date) with `availableAmount`, `availableDate` (may differ from the requested date), `salesUnit`, `salesBlock`.
- **Stock** products: real available quantity.
- **Terminal** products: shipped from the supplier's warehouse; quantity is always `999999` because it's unknown.

## What the mock does NOT have
- No **search** endpoint — product discovery is entirely on the static file.
- No **order** endpoint — placing an order, order state and confirmation are yours to build.
- No approvals, customers, order history, or recipes.
- No category names (349 numeric codes only) and no translations for unit codes (KI, ST, PAK…).
- Webshop test accounts: "shared separately once available".

## Product file (86 MB JSON, 17,546 products, 648 vendors)
- Top level: `id`, `category`, `vendorName`, `salesUnit`, `baseUnit`, `allowedLotSize` (order quantity step), `units` (packaging hierarchy with `sizeInBaseUnits` and GTINs), `deposits`, `substitutions`, `temperatureCondition`, `countryOfOrigin`, `synkkaData`.
- `synkkaData` (manufacturer data via GS1 Synkka): names (en and fi for nearly all, sv for 16,100), brand, marketing texts, ingredients, key ingredients, nutritional content, classifications, storage/usage/preparation instructions, producers, fishing reports, unit conversions (weights, dimensions), VAT code.
- **Classifications** (present on ~17,500 products):
  - `allergen`: GS1 codes with `CONTAINS` / `MAY_CONTAIN` (e.g. AM milk 3,160; AW gluten cereals 2,794; AE egg 1,317; AY soy 1,104).
  - `nonAllergen`: `FREE_FROM` declarations (~4,500 per common allergen).
  - `nutritionalClaim`: FREE_FROM_LACTOSE 4,178 · FREE_FROM_GLUTEN 3,047 · VEGAN 2,959 · VEGETARIAN 2,358 · LOW_LACTOSE 321 …
  - `packagingMarkedLabel`: Finnish-origin marks ~2,000 each · EU organic 456 · Nordic Swan 362 · Rainforest Alliance 234 · MSC 104 · Fairtrade 92 · ASC 51.
- Coverage gaps: structured ingredients on 3,746 products; nutrition on 12,251; fruit and vegetables often lack allergen/nutrition data (the portal says so).
- **Predefined substitutions exist for only 189 products** (e.g. Dutch/Spanish tomato ↔ Finnish tomato).
- 69 products match "lactose free" + "milk" in the English name, e.g. `463038` Valio Eila semi-skimmed milk drink 10 L, `462775` Arla Milkdrink 1 L UHT.

## Other files
- **Delivery reliability** (CSV, 4,425 products): 0–1, share of ordered quantity historically delivered. Median 1.0; 10th percentile 0.936; minimum 0.
- **Carbon footprint** (CSV, 11,033 products): average kg CO2-eq per kg for the product *group*, not the individual product.

## What this means for the gateway design
1. **The design holds.** The mock is read-only price + availability, so search, offers, ordering, approvals and audit are exactly the missing layer.
2. **Signed offers get a real expiry:** `min(price.validTo, availability.closingTime)`.
3. **Search is your job:** load the product file into PostgreSQL (full-text on en/fi names + filters on claims, allergens, labels, category), then price/availability only for the shortlist.
4. **Substitution ranking is mostly yours:** use the 189 predefined pairs as the top tier, then same category + matching claims/allergens + comparison price + reliability + carbon.
5. **Quantity maths is a precision trap:** "1,000 litres" must become a count of sales units. `catalogPrice ÷ comparisonPrice` gives litres (or kg) per sales unit; round up to `allowedLotSize`.
6. **A data-grounded guardrail:** Stock products have confirmed quantity; Terminal products don't. Combine `logisticModel` with delivery reliability into a confidence level, and send low-confidence critical orders to a human.
7. **Allergen safety must handle missing data:** absence of an allergen code is not "free from". Only `FREE_FROM` declarations count as safe.
8. **Recipes are not provided.** Their recipe scenarios need your own small recipe set.
