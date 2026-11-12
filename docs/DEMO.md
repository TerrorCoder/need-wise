# Demonstration guide

Target length: less than three minutes. Record at 1080p with a PayPal Sandbox personal buyer account. Do not show credentials or personal information.

## 0:00-0:20: Problem

Explain that NeedWise is for students and other shoppers with a fixed budget. It starts with the spending limit instead of trying to increase the basket.

## 0:20-1:10: Live discovery

1. Open https://needwise-hackathon.rwodzi1to3.workers.dev/.
2. Choose **Start shopping**.
3. Keep **Shop retailer products** selected.
4. Enter `$75` and `Study essentials for a university student`.
5. Select affordability and choose **Find products**.
6. Show a Channel3 image, price, seller, explanation, retailer link, and the budget summary.
7. Briefly show removal or replacement.

State that Workers AI interpreted the need and explained selected products, Channel3 supplied the listings, and deterministic code enforced the budget.

## 1:10-2:25: PayPal Sandbox

1. Choose **Review basket & checkout**.
2. Show the total and retailer grouping.
3. State that the grouping is informational and the demo creates one Sandbox order.
4. Choose **Continue with PayPal**.
5. Approve with the Sandbox buyer.
6. Return to NeedWise and show the confirmed test order and amount.

Say explicitly that no real money moved, no retailer was paid, and no external retailer order was placed.

## 2:25-2:50: Safeguards

- AI cannot change product IDs, prices, or totals.
- Live checkout uses a 15-minute signed basket snapshot.
- The Worker recalculates the total and holds PayPal credentials.
- The returned capture amount must match the saved checkout summary.

## 2:50-3:00: Close

"NeedWise makes every dollar go further while keeping the shopper in control."

## Before publishing

- Keep the final edit below three minutes.
- Publish to YouTube with public visibility if required.
- Check audio, browser zoom, and text readability.
- Remove credentials, tokens, payer details, and unrelated tabs.
- Test the URL in a signed-out browser.
- Add the public YouTube URL to Devpost and `docs/DEVPOST.md`.
