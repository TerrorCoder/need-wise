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

The budget must be an integer from 100 to 1,000,000 cents; requirements must contain 3–500 characters. `mode` is `live` or `demo` (default `demo`). Live mode uses Workers AI to turn the request into a search query, then Channel3 `/v1/search`; deterministic code filters and selects within budget. The response contains selected items, totals, source labels, retailer links, remaining budget, explanation source, and disclosure.

## `POST /api/checkout/orders`

```json
{ "productIds": ["demo-lamp-01", "demo-notebooks-01"] }
```

Accepts 1–20 unique demonstration IDs only. Channel3 IDs are rejected. The server recalculates the USD total and creates a PayPal Sandbox order.

## `POST /api/checkout/orders/:orderId/capture`

Captures an approved order. Repeated callbacks are reconciled against PayPal order status.
