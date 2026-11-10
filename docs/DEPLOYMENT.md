# Cloudflare deployment

The target Worker is `needwise-hackathon`, configured in `wrangler.jsonc`. Deploying replaces the Worker code and static assets, so first preserve the current deployment or confirm it may be replaced.

## 1. Authenticate and verify the target

```bash
npx wrangler whoami
npx wrangler deployments list
```

Confirm the Cloudflare account contains `needwise-hackathon`. Do not paste an API token into source or chat.

## 2. Configure secrets

```bash
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put CHANNEL3_API_KEY
```

Enter values in the hidden prompts. The AI binding requires no model API key. Channel3 live discovery requires the developer key; keep it out of `wrangler.jsonc`, source, and frontend variables.

If the deployed URL differs, update `APP_URL` in `wrangler.jsonc` before deploying so PayPal returns to the right origin.

## 3. Verify locally and package

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx wrangler deploy --dry-run
```

## 4. Deploy intentionally

```bash
npx wrangler deploy
```

Deployment is deliberately not part of CI. Afterwards, open the app, check `/api/status`, run a live catalogue search and inspect a retailer link, switch to demo mode, complete one Sandbox payment, and verify the order is `COMPLETED` in PayPal Developer Dashboard. A live retailer product must never be sent to the Sandbox checkout endpoint. Review Cloudflare Workers logs for errors without recording secrets or payer details.
