# Architecture

NeedWise is a stateless Cloudflare application. Vite builds the React client into `dist`; the same Worker serves those assets and routes `/api/*` before static files.

## Trust boundaries

The browser sends a budget, requirements, priorities, and later a list of product IDs. It never sends an authoritative price. Demo IDs are resolved against the static catalogue. Live recommendations include a 15-minute HMAC-authenticated snapshot containing the approved Channel3 candidate IDs, names, merchants, integer-cent prices, source, budget, and expiry. At checkout the Worker verifies the signature and expiry, resolves only selected IDs from that snapshot, rejects unknown or duplicate IDs, and recalculates the total and retailer allocation.

Live recommendations use Workers AI first to produce a structured intent: objective, product categories, essential and optional types, exclusions, and up to three focused product queries. Channel3 requests are bounded to those three queries, cached, de-duplicated, and normalized to USD offers with retailer URLs. Deterministic scoring then requires evidence in the product record, rejects excluded terms, favors category diversity, and selects at most four products without crossing the limit or trying to spend it all. The response includes grounded replacement candidates from the same retrieved pool. Workers AI explains only selected records and may not change IDs, prices, or totals; malformed or unavailable AI output falls back to deterministic explanations.

PayPal credentials, `CHANNEL3_API_KEY`, and `BASKET_SIGNING_SECRET` exist only as Worker secrets. Both validated live snapshots and the static demo catalogue can create one PayPal Sandbox order with exact product-level line items. The allocation shown by retailer is a proposed future marketplace distribution; the current Sandbox order does not pay retailers. On return, the client asks the Worker to capture, compares PayPal's verified captured amount with the server-created checkout summary retained in browser session storage, and displays the allocation. A repeated capture checks the existing PayPal order and reports an already-completed order as success.

## Privacy and security

NeedWise has no database, accounts, analytics, or order-history storage. It applies restrictive browser headers, limits JSON request bodies, logs structured operational errors without credentials, and uses Sandbox endpoints exclusively.
