# NeedWise: Make Every Dollar Go Further

NeedWise is a budget-first shopping planner built for the PayPal AI Hackathon 2026. It helps students and other budget-conscious shoppers turn a plain-language need into a small, explainable basket without crossing a firm spending limit.

- Live app: https://needwise-hackathon.rwodzi1to3.workers.dev/
- Source: https://github.com/TerrorCoder/need-wise
- Devpost: https://devpost.com/software/needwise

## The problem

Online shops are usually designed to increase basket size. That works poorly for someone buying study supplies, household essentials, or work equipment with a fixed amount of money. NeedWise starts with the limit. Product discovery and explanation may use AI, but product IDs, prices, selection, and budget arithmetic are validated by deterministic server code.

## What the finished application does

- Accepts a maximum budget, a shopping need, and affordability, durability, or portability priorities.
- Uses Cloudflare Workers AI to interpret the request into focused product searches.
- Searches Channel3 for current in-stock USD listings, retailer links, images, descriptions, and prices.
- Selects up to four relevant products without exceeding the supplied budget.
- Shows grounded reasons, alternatives, retailer links, and the remaining budget.
- Provides a separate demonstration catalogue.
- Creates one PayPal Orders v2 Sandbox order for the selected basket.
- Redirects to PayPal Sandbox for approval, captures the order on return, and verifies the captured amount.

NeedWise demonstrates a single Sandbox payment. It does not process a live purchase, pay retailers, split funds, or provide marketplace payouts. The retailer allocation shown at checkout is an informational grouping.

## User journey

1. Enter a budget and describe what you need.
2. Choose live retailer products or the sample catalogue.
3. Review the products, explanations, prices, and retailer links.
4. Remove or replace items while the server-enforced budget remains visible.
5. Review the basket and retailer grouping.
6. Approve one order with a PayPal Sandbox personal account.
7. Return to NeedWise, where the Worker captures the order and displays the verified test amount.

## Integrations

### Cloudflare Workers AI

The Worker calls `@cf/meta/llama-3.1-8b-instruct-fast` twice when the binding is available. It first produces structured intent with categories, product types, exclusions, and at most three searches. It then explains only products already selected by deterministic code.

Malformed or unavailable output falls back to rules-based intent and explanations. AI cannot authorize a product ID, alter a price, or change the total.

### Channel3

Live mode sends up to three unique intent queries to Channel3's server-side search API. NeedWise accepts only in-stock offers with a valid HTTPS retailer URL and USD price, normalizes prices to integer cents, de-duplicates products, and briefly caches each query.

Channel3 provides product discovery, not payment fulfillment. Prices, taxes, delivery costs, and availability may change at the retailer.

### PayPal Orders v2

The Worker uses server-side OAuth and PayPal Orders v2 Sandbox endpoints to create and capture one `CAPTURE` order with product-level line items. The client secret never reaches the browser.

Both live Channel3 baskets and sample baskets can enter the Sandbox demonstration. Live results use a signed, 15-minute snapshot of approved products and prices, which prevents client-side substitution.

## Architecture

```text
React + TypeScript browser client
          |
          | same-origin JSON
          v
Cloudflare Worker
  |-- request validation and budget engine
  |-- Workers AI intent and explanations
  |-- Channel3 product discovery
  |-- signed live-basket snapshots
  |-- PayPal Orders v2 Sandbox create/capture
  `-- Vite static assets
```

The application is stateless. It has no accounts, database, analytics store, or order-history store. A checkout summary stays in browser `sessionStorage` only long enough to verify the PayPal return.

See [Architecture](docs/ARCHITECTURE.md) and [API reference](docs/API.md).

## Security and budget validation

- Budgets and prices use integer cents.
- The Worker validates request size, budget range, priorities, requirements, and product IDs.
- Demo checkout resolves IDs against the server-owned catalogue.
- Live checkout verifies an HMAC-SHA-256 snapshot, expiry, unique IDs, approved prices, and budget.
- The Worker recalculates the total before creating the PayPal order.
- Capture responses must contain a completed USD amount matching the saved checkout summary.
- PayPal, Channel3, and signing credentials are Worker secrets, never `VITE_` variables.
- Security headers restrict framing, browser capabilities, connections, and PayPal form actions.

## Local setup

Requirements are Node.js 20.19 or later, npm, and a Cloudflare account for Workers AI. Channel3 and PayPal Sandbox credentials are required only for their respective flows.

```bash
git clone https://github.com/TerrorCoder/need-wise.git
cd need-wise
npm ci
```

Create `.dev.vars`:

```powershell
Copy-Item .env.example .dev.vars
```

```bash
cp .env.example .dev.vars
```

Fill the values you plan to test, then run:

```bash
npm run dev
```

Sample recommendations work without Channel3. Explanations have a deterministic fallback when Workers AI is unavailable. Checkout requires valid PayPal Sandbox credentials.

## Environment variables

Store local values in `.dev.vars`. Use `wrangler secret put NAME` for deployed secrets.

| Variable | Required for | Placeholder |
| --- | --- | --- |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox checkout | `your_paypal_sandbox_client_id` |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox checkout | `your_paypal_sandbox_client_secret` |
| `CHANNEL3_API_KEY` | Live product discovery | `your_channel3_api_key` |
| `BASKET_SIGNING_SECRET` | Live-result checkout | `replace_with_at_least_32_random_characters` |

`wrangler.jsonc` supplies `PAYPAL_ENVIRONMENT=sandbox`, the deployed `APP_URL`, and the AI and asset bindings.

## Testing for judges

1. Open the [live application](https://needwise-hackathon.rwodzi1to3.workers.dev/).
2. Keep **Shop retailer products** selected, enter a budget and need, and choose **Find products**.
3. Inspect the Channel3 listings, retailer links, explanations, alternatives, and budget summary.
4. Choose **Review basket & checkout**, then **Continue with PayPal**.
5. Approve with a PayPal Sandbox personal buyer account.
6. Confirm that NeedWise displays the completed test order and amount after returning.

No real money is charged. Without Sandbox buyer credentials, the automated tests cover order creation, amount validation, capture, provider errors, and duplicate capture handling with mocked PayPal responses.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Vite and Worker development environment |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Type-check and build the production bundle |
| `npm run cf-typegen` | Regenerate Worker binding types |
| `npm run deploy` | Build and deploy the configured Worker |

See [deployment instructions](docs/DEPLOYMENT.md).

## Current limitations

- Every checkout is one PayPal Sandbox payment to the configured test merchant.
- NeedWise does not complete retailer orders, pay retailers, split payments, support marketplace payouts, or process real money.
- The retailer allocation is informational only.
- Channel3 listings can change; shipping and tax are not included.
- The app supports USD only.
- There are no accounts, saved baskets, order history, refunds, or persistent server state.
- The Channel3 cache is per Worker isolate and not durable.
- The public YouTube demonstration URL is not stored in this repository.

## Future improvements

- Add retailer fulfillment through authorized commerce partners.
- Add shipping and tax estimates before payment.
- Add more currencies and region-aware discovery.
- Add optional accounts, saved baskets, and consent-based preferences.
- Add durable payment records, refunds, and verified webhooks if the project moves beyond Sandbox.
- Test with students and households managing strict budgets.

## License

NeedWise is available under the [MIT License](LICENSE).
