# Architecture

NeedWise is a stateless Cloudflare application. Vite builds the React client into `dist`; the same Worker serves those assets and routes `/api/*` before static files.

## Trust boundaries

The browser sends a budget, requirements, priorities, and later a list of product IDs. It never sends an authoritative price. The Worker resolves IDs against its catalogue and calculates integer-cent totals. Unknown or duplicate IDs are rejected.

The recommendation engine scores catalogue records and greedily selects up to four items without crossing the limit. Workers AI receives only those selected records and may produce a summary and per-product reasoning. Its JSON is length-checked, keyed only by known IDs, and never changes selection or totals. Failure switches to deterministic explanations.

PayPal credentials exist only as Worker secrets. The Worker obtains an OAuth token, creates an Orders v2 Sandbox order from recalculated prices, and returns the payer approval URL. On return, the client asks the Worker to capture. A repeated capture checks the existing PayPal order and reports an already-completed order as success.

## Privacy and security

NeedWise has no database, accounts, analytics, or order-history storage. It applies restrictive browser headers, limits JSON request bodies, logs structured operational errors without credentials, and uses Sandbox endpoints exclusively.
