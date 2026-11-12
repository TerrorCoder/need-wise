# Architecture

NeedWise is a stateless React application and Cloudflare Worker. Vite builds the frontend into `dist`; the Worker handles `/api/*` before serving static assets through `ASSETS`.

## Recommendation pipeline

1. `worker/index.ts` validates the budget, requirements, priorities, and mode.
2. `recommendations.ts` asks Workers AI for structured intent. A deterministic intent is used if AI is absent or invalid.
3. Live mode sends at most three unique queries to Channel3. Demo mode uses `worker/data/catalog.ts`.
4. Channel3 normalization accepts the cheapest in-stock USD offer with an HTTPS retailer URL, adds an optional HTTPS image, removes malformed entries, and de-duplicates IDs.
5. `budget.ts` scores request evidence and priorities, prefers category diversity, and selects at most four products without crossing the budget.
6. Workers AI may explain only selected records. Unknown IDs and missing explanations are rejected or replaced with deterministic text.
7. Alternatives come from the same retrieved pool.

## Checkout trust boundary

The browser never supplies an authoritative price. Demo checkout resolves IDs against the static server catalogue. Live checkout uses a 15-minute HMAC-SHA-256 snapshot containing approved Channel3 IDs, names, merchants, prices, source, budget, and expiry.

At order creation, the Worker verifies the signature and expiry, rejects duplicate or unapproved IDs, reconstructs products from signed values, checks the signed budget, recalculates the total in cents, and sends one USD `CAPTURE` order with line items to PayPal Sandbox.

The retailer allocation is a review grouping. PayPal receives one purchase unit for the configured Sandbox merchant. No retailer receives funds and no marketplace payout occurs.

## Capture flow

Before redirect, the browser stores the PayPal order ID, server total, and retailer grouping in `sessionStorage`. PayPal returns the browser with an order token. The Worker captures the order and parses completed USD captures. The client accepts the result when the order ID and captured amount match its saved summary.

Capture uses a stable PayPal request ID. If PayPal reports an error after an earlier successful capture, the Worker retrieves the order and treats an already completed order as a duplicate success.

## Bindings and configuration

- `ASSETS`: Vite build
- `AI`: Cloudflare Workers AI
- `PAYPAL_ENVIRONMENT`: fixed to `sandbox`
- `APP_URL`: PayPal return and cancellation origin
- `CHANNEL3_API_KEY`: Worker secret
- `PAYPAL_CLIENT_ID`: Worker secret
- `PAYPAL_CLIENT_SECRET`: Worker secret
- `BASKET_SIGNING_SECRET`: Worker secret of at least 32 characters

## Privacy and operations

NeedWise has no database, login system, analytics store, or server-side order history. The Worker applies a 32 KiB request limit, safe provider errors, structured operational logs, and restrictive browser headers. Channel3 results are cached for 60 seconds in a bounded, per-isolate memory cache.

This is a Sandbox architecture. Live payments would require persistent records, webhook verification, refunds, compliance review, and a legitimate fulfillment or marketplace model.
