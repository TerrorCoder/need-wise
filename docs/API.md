# API

All endpoints are same-origin and return JSON. Error responses use `{ "error": "safe message" }`.

## `GET /api/status`

Reports whether the Workers AI binding and PayPal secrets are available. It never returns secret values.

## `GET /api/products`

Returns the labelled demonstration catalogue and a non-live-data notice.

## `POST /api/recommendations`

```json
{ "budgetCents": 7500, "requirements": "study essentials", "priorities": ["affordability"] }
```

The budget must be an integer from 100 to 1,000,000 cents; requirements must contain 3–500 characters. The response contains selected items, totals, remaining budget, explanation source, and disclosure.

## `POST /api/checkout/orders`

```json
{ "productIds": ["demo-lamp-01", "demo-notebooks-01"] }
```

Accepts 1–20 unique, known IDs. The server recalculates the USD total and creates a PayPal Sandbox order.

## `POST /api/checkout/orders/:orderId/capture`

Captures an approved order. Repeated callbacks are reconciled against PayPal order status.
