# API

All endpoints are same-origin and return JSON. Error responses use `{ "error": "safe message" }`.

## `GET /api/status`

Reports whether Workers AI, Channel3, and PayPal Sandbox are configured. It never returns secret values.

## `GET /api/products`

Returns the labelled demonstration catalogue and a non-live-data notice. This is the only catalogue accepted by checkout.

## `POST /api/recommendations`

```json
{ "budgetCents": 7500, "requirements": "study essentials", "priorities": ["affordability"], "mode": "live" }
```

The budget must be an integer from 100 to 1,000,000 cents; requirements must contain 3–500 characters. `mode` is `live` or `demo` (default `demo`). Live mode uses one Workers AI intent call to create at most three focused searches, then Channel3 `/v1/search`; deterministic code rejects unsupported/excluded candidates, favors useful category diversity, and selects within budget. The response contains selected items, grounded explanations, `intent`, and `alternatives` keyed by selected product ID. Alternatives are real candidates from the same search pool and never fabricated. A non-empty live result also includes `checkoutToken` and `checkoutExpiresAt`; the token authenticates the approved live candidate set and budget for 15 minutes.

## `POST /api/checkout/orders`

```json
{ "productIds": ["channel3-product-1"], "checkoutToken": "signed-live-snapshot" }
```

Accepts 1–20 unique IDs. Demo checkout omits `checkoutToken` and resolves IDs against the static catalogue. Live checkout requires the signed recommendation snapshot; the Worker verifies authenticity, expiry, approved IDs, prices, source, and confirmed budget before recalculating the USD total and retailer allocation. The response includes the PayPal approval URL, server total, and allocation.

## `POST /api/checkout/orders/:orderId/capture`

Captures an approved order and returns PayPal's verified captured USD amount. Repeated callbacks are reconciled against PayPal order status.
