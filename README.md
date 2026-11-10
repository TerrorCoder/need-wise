# NeedWise

**Make every dollar go further.**

NeedWise is an AI-assisted, budget-conscious shopping planner built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/). It helps households, students, first-time online shoppers, and anyone working with a firm spending limit compare a small basket, understand trade-offs, and explicitly approve a PayPal Sandbox payment.

> **Current status:** The application and Sandbox API workflow are implemented. The included catalogue is demonstration data. A credentialled end-to-end PayPal transaction and production Cloudflare deployment have not yet been verified.

## Why NeedWise

Most shopping experiences optimise for conversion and basket growth. NeedWise starts with a maximum budget, enforces it in deterministic server code, explains each recommendation, and keeps the user in control. It never presents demonstration prices as live merchant information.

## Features

- Natural-language needs and affordability, durability, or portability priorities
- Deterministic basket selection that cannot exceed the stated maximum
- Optional Cloudflare Workers AI explanations with a rules-based fallback
- Clearly labelled demonstration product catalogue
- Editable basket and live remaining-budget indicator
- Real PayPal Orders v2 Sandbox create, redirect, and capture workflow
- Duplicate-callback-safe capture handling
- Responsive, keyboard-friendly interface with status announcements and visible focus
- Server-side validation, recalculated totals, request-size limits, security headers, and no credential persistence

## Architecture

```text
Browser (React + Vite)
        │ same-origin JSON
Cloudflare Worker
  ├── deterministic catalogue + budget engine
  ├── Workers AI binding (optional explanation)
  ├── PayPal Sandbox Orders API (server-side OAuth)
  └── static asset binding
```

AI never controls product IDs, prices, or the budget. The Worker selects a valid basket first and only asks the model to explain those pre-validated products. See [Architecture](docs/ARCHITECTURE.md) and [API reference](docs/API.md).

## Technology

React, TypeScript, Vite, Cloudflare Workers, Cloudflare Workers AI, PayPal Checkout REST API (Sandbox), Vitest, ESLint, and GitHub Actions.

## Local setup

Requirements: Node.js 20.19+ (Node 22 recommended), npm, and a Cloudflare account for Workers AI.

```bash
git clone https://github.com/TerrorCoder/need-wise.git
cd need-wise
npm ci
copy .env.example .dev.vars   # Windows
# cp .env.example .dev.vars   # macOS/Linux
npm run dev
```

The app works without PayPal credentials for recommendation testing; checkout reports that PayPal is not configured. Workers AI may require remote bindings during development. If AI is unavailable, the UI and API clearly identify the deterministic fallback.

## Environment configuration

Secrets belong in `.dev.vars` locally and in Cloudflare Worker secrets when deployed:

| Name | Required | Purpose |
| --- | --- | --- |
| `PAYPAL_CLIENT_ID` | For checkout | Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | For checkout | Sandbox REST app secret |
| `CHANNEL3_API_KEY` | No | Reserved for the optional product provider; not yet implemented |

Non-secret configuration is in `wrangler.jsonc`: `PAYPAL_ENVIRONMENT` is fixed to `sandbox`, `APP_URL` controls PayPal return/cancel URLs, and the `AI` and `ASSETS` bindings connect Cloudflare services.

## Commands

```bash
npm run dev          # local Vite + Worker development
npm run lint         # ESLint
npm run typecheck    # strict TypeScript checks
npm test             # unit tests
npm run build        # production build
npm run deploy       # deploy to the configured Worker (changes remote state)
```

## PayPal Sandbox setup

1. Sign in at [PayPal Developer](https://developer.paypal.com/) and create a **Sandbox REST app**.
2. Copy its client ID and secret to `.dev.vars` for local testing.
3. Use the PayPal Developer dashboard's sandbox personal account to approve checkout.
4. For Cloudflare, run `npx wrangler secret put PAYPAL_CLIENT_ID` and `npx wrangler secret put PAYPAL_CLIENT_SECRET`; paste each value only into Wrangler's hidden prompt.
5. Run one full create → approve → return → capture flow and confirm `COMPLETED` in the PayPal Sandbox dashboard before describing the integration as verified.

Never put the secret in source, `wrangler.jsonc`, a `VITE_` variable, GitHub Actions, screenshots, or chat.

## Deployment

The config targets the existing `needwise-hackathon` Worker. **Do not deploy until the existing version has been backed up or intentionally replaced.** Follow [Deployment](docs/DEPLOYMENT.md). A local dry run is safe:

```bash
npm run build
npx wrangler deploy --dry-run
```

## Tests

Tests cover budget limits, invalid and empty inputs, relevant product selection, AI failure and response validation, server-side payment totals, PayPal failures, and duplicate capture callbacks. CI runs lint, type checking, tests, and a production build for every pull request.

## Screenshots

Add final desktop and mobile captures to `docs/images/` after the credentialled demo is deployed. Do not add PayPal account details or tokens to screenshots.

## Known limitations

- Product information is a static demonstration catalogue, not live inventory.
- Channel3 support is represented by a provider boundary but is not implemented.
- The stateless Worker relies on PayPal's order status and request idempotency; it stores no order history.
- Taxes, shipping, refunds, localization, and multiple currencies are outside this prototype.
- A credentialled PayPal Sandbox transaction and remote Workers AI run still require owner verification.

## Hackathon

The official deadline is November 12, 2026 at 12:00 PM Pacific. The submission also needs a public repository, functional demo or reproducible setup, and a public YouTube demo under three minutes. See the [Devpost draft](docs/DEVPOST.md) and [demo script](docs/DEMO.md).

## License

[MIT](LICENSE) © 2026 NeedWise contributors.
