# Cloudflare deployment

The repository targets the `needwise-hackathon` Worker at:

https://needwise-hackathon.rwodzi1to3.workers.dev/

Deployment is manual and replaces the code and static assets at that origin.

## Prerequisites

- Node.js 20.19 or later and npm
- Access to the intended Cloudflare account
- Channel3 API key
- PayPal Sandbox REST app client ID and secret
- Random basket-signing secret of at least 32 characters

## Configure secrets

```bash
npx wrangler whoami
npx wrangler deployments list
npx wrangler secret put CHANNEL3_API_KEY
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put BASKET_SIGNING_SECRET
```

Enter values only through Wrangler's hidden prompts. Do not put them in `wrangler.jsonc`, `.env.example`, frontend variables, screenshots, or commits.

`PAYPAL_ENVIRONMENT` is fixed to `sandbox`. Update `APP_URL` before deployment if the public origin changes.

## Validate

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx wrangler deploy --dry-run
```

## Deploy

```bash
npm run deploy
```

CI does not deploy.

## Post-deployment checks

1. Open the public origin.
2. Check `/api/status`; its flags should match configured bindings and secrets.
3. Run a live search and inspect a retailer link.
4. Confirm the basket total is within budget.
5. Approve one order with a PayPal Sandbox personal account.
6. Confirm that NeedWise shows the test order and amount after return.
7. Confirm `COMPLETED` in the PayPal Sandbox dashboard.

This verifies one Sandbox payment to the configured test merchant. It does not verify retailer fulfillment, split payments, marketplace payouts, or real-money processing.
