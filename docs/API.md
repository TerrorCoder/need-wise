# API reference

All endpoints are same-origin and return JSON. Errors use `{ "error": "safe message" }`.

## `GET /api/status`

Reports whether Workers AI, Channel3, and PayPal are configured without returning secrets. `catalogue` is `channel3` when the key exists and `demo` otherwise. This is a configuration check, not a live provider health check.

## `GET /api/products`

Returns the static sample catalogue with `source: "demo"` and a notice that its prices and availability are not live.

## `POST /api/recommendations`

```json
{
  "budgetCents": 7500,
  "requirements": "study essentials for a university student",
  "priorities": ["affordability", "portability"],
  "mode": "live"
}
```

- `budgetCents`: safe integer from 100 to 1,000,000
- `requirements`: trimmed string from 3 to 500 characters
- `priorities`: `affordability`, `durability`, or `portability`
- `mode`: `live` or `demo`; defaults to `demo`

The response contains selected items, totals, explanation source, notice, intent, alternatives, and mode. A non-empty live result also contains a signed `checkoutToken` and millisecond `checkoutExpiresAt`, valid for 15 minutes.

The top-level `source` is the explanation path (`workers-ai` or `deterministic-fallback`). Each product's `source` is `channel3` or `demo`.

## `POST /api/checkout/orders`

Demo request:

```json
{ "productIds": ["demo-product-id"] }
```

Live request:

```json
{
  "productIds": ["channel3-product-id"],
  "checkoutToken": "signed-live-snapshot"
}
```

The endpoint accepts 1 to 20 unique IDs. Without a token, IDs must exist in the server demo catalogue. With a token, the Worker verifies the live snapshot, expiry, IDs, prices, and budget.

A successful `201` response contains the PayPal order ID, Sandbox approval URL, server total, USD currency, and retailer allocation. The allocation is informational and does not describe disbursements or payouts.

## `POST /api/checkout/orders/:orderId/capture`

Captures an approved Sandbox order. A completed response contains `orderId`, `status`, `captured`, `amountCents`, and `currency`. A repeated callback can return the already completed result with `duplicate: true`.
