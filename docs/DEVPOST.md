# Devpost submission draft

> Replace bracketed placeholders and remove any unverified claims before submission.

## Inspiration

People shopping under real financial constraints are often served by interfaces designed to increase spending. We wanted to reverse that incentive: begin with a hard limit, make trade-offs visible, and leave every purchase decision with the person.

## What it does

NeedWise turns a natural-language shopping need and maximum budget into a small, explainable basket. Users can prioritise affordability, durability, or portability, compare why each demonstration product was selected, remove items, see the remaining budget, and explicitly approve a PayPal Sandbox checkout. Product data and model-generated explanations are clearly distinguished.

## How we built it

The frontend uses React, TypeScript, and Vite. A Cloudflare Worker serves the application and API. Deterministic TypeScript code validates catalogue IDs, scores products, and enforces integer-cent limits. Cloudflare Workers AI explains only the already-validated basket and falls back safely if unavailable. The Worker uses server-side OAuth with PayPal Orders v2 Sandbox APIs to create and capture orders without exposing the client secret.

## Challenges

The most important design challenge was keeping AI useful without letting it invent products, prices, or budget arithmetic. We separated selection from explanation and validate model output against known IDs. A second challenge was making a stateless payment callback safe; repeated captures are reconciled against PayPal's authoritative order status.

## Accomplishments

- A coherent, accessible shopping-planner experience
- Server-enforced budgets and server-calculated checkout totals
- Graceful AI failure behaviour and transparent demo-data labelling
- A complete PayPal Sandbox create/approve/capture implementation
- Automated tests for budget, AI, and payment failure paths

Before submission, add only after verification: `[Completed a full PayPal Sandbox transaction and deployed the tested build at URL.]`

## What we learned

AI is most trustworthy here when it communicates decisions rather than controls financial facts. PayPal's approval step also reinforces our product principle: the user sees the exact amount and makes the final decision.

## What's next

We would add an authorised live product provider, delivery and tax estimates, localized currencies, saved preference profiles with explicit consent, and broader usability testing with budget-conscious households and students.

## Technologies used

React, TypeScript, Vite, Cloudflare Workers, Cloudflare Workers AI, PayPal Checkout REST API (Sandbox), Vitest, ESLint, and GitHub Actions.
