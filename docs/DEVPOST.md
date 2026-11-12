# Devpost project copy and readiness

- Project: https://devpost.com/software/needwise
- Live demo: https://needwise-hackathon.rwodzi1to3.workers.dev/
- Repository: https://github.com/TerrorCoder/need-wise
- Public video: not recorded in this repository

## Project title

NeedWise: Make Every Dollar Go Further

## One-line summary

NeedWise turns a shopping need and fixed budget into an explainable basket using Workers AI and Channel3, then demonstrates approval through one PayPal Sandbox payment.

## Inspiration

Students and households with fixed budgets often use shopping experiences designed to increase spending. NeedWise starts with the limit, explains a focused basket, and leaves approval with the shopper.

## What it does

The shopper enters a budget, need, and priorities. Workers AI interprets the request. Channel3 supplies current listings and retailer offers. Deterministic TypeScript filters and ranks products, selects a basket within budget, and calculates every total in cents.

The shopper can inspect retailer links, remove or replace products, and review an informational retailer grouping. NeedWise creates one PayPal Orders v2 Sandbox order, redirects for approval, captures it on return, and checks the amount.

This is a Sandbox demonstration. NeedWise does not place retailer orders, pay retailers, split funds, support marketplace payouts, or process real money.

## How it was built

The frontend uses React, TypeScript, and Vite. A Cloudflare Worker serves the app and API. Workers AI runs `@cf/meta/llama-3.1-8b-instruct-fast` for request interpretation and explanations. Channel3 provides server-side product discovery. PayPal Orders v2 Sandbox provides order creation and capture.

AI cannot add product IDs or change prices. Live checkout uses a 15-minute HMAC-signed snapshot binding candidates, prices, budget, and expiry. Provider credentials remain Worker secrets.

## Challenges and accomplishments

The main challenge was using AI without making generated text authoritative. NeedWise separates interpretation and explanation from product validation, budget selection, and checkout arithmetic. The completed project includes live Channel3 discovery, Workers AI fallbacks, server-enforced budgets, signed live baskets, PayPal Sandbox create/approve/capture, duplicate capture handling, amount verification, automated tests, a public deployment, and an MIT license.

## What was learned

AI is most useful here when it narrows a request and explains validated choices. Channel3 discovery and PayPal approval solve different parts of the experience, and a test payment must not be presented as retailer fulfillment.

## What's next

Future work would add authorized fulfillment, shipping and tax estimates, more currencies, optional saved baskets, durable records, refunds, webhooks, and usability testing with students and budget-conscious households.

## Technologies

React, TypeScript, Vite, Cloudflare Workers, Cloudflare Workers AI, Channel3, PayPal Orders v2 Sandbox, Vitest, and ESLint.

## Submission readiness

| Requirement | Status | Evidence or action |
| --- | --- | --- |
| Public working repository | Ready | GitHub URL above |
| Open-source license | Ready | Root `LICENSE` is MIT |
| Reproducible README | Ready | Setup, variables, tests, and commands documented |
| PayPal explanation | Ready | One Sandbox order and capture are described |
| AI explanation | Ready | Workers AI's bounded role is described |
| Channel3 integration | Ready | Live discovery is documented |
| Working app or test build | Ready | Public URL and local build instructions provided |
| Public YouTube demo under three minutes | Outstanding | Add the final public YouTube URL to Devpost |

This file documents readiness. It does not update or submit the Devpost project.
