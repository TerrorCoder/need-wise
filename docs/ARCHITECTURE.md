# Architecture

NeedWise is a stateless Cloudflare application. Vite builds the React client into `dist`; the same Worker serves those assets and routes `/api/*` before static files.

## Trust boundaries

The browser sends a budget, requirements, priorities, and later a list of product IDs. It never sends an authoritative price. The Worker resolves IDs against its catalogue and calculates integer-cent totals. Unknown or duplicate IDs are rejected.

Live recommendations use Workers AI first to produce a structured intent: objective, product categories, essential and optional types, exclusions, and up to three focused product queries. Channel3 requests are bounded to those three queries, cached, de-duplicated, and normalized to USD offers with retailer URLs. Deterministic scoring then requires evidence in the product record, rejects excluded terms, favors category diversity, and selects at most four products without crossing the limit or trying to spend it all. The response includes grounded replacement candidates from the same retrieved pool. Workers AI explains only selected records and may not change IDs, prices, or totals; malformed or unavailable AI output falls back to deterministic explanations.

PayPal credentials and `CHANNEL3_API_KEY` exist only as Worker secrets. Live Channel3 products never enter checkout; only the static demo catalogue can create a PayPal order. The Worker obtains an OAuth token, creates an Orders v2 Sandbox order from recalculated prices, and returns the payer approval URL. On return, the client asks the Worker to capture. A repeated capture checks the existing PayPal order and reports an already-completed order as success.

## Privacy and security

NeedWise has no database, accounts, analytics, or order-history storage. It applies restrictive browser headers, limits JSON request bodies, logs structured operational errors without credentials, and uses Sandbox endpoints exclusively.
