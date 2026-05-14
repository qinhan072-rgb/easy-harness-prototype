# Marketplace Protected Payment Handoff

This path is for customers who want the trust layer of an established
marketplace before paying for a custom Easy Harness order.

## Product Choice

MVP recommendation:

- Primary path: Alibaba.com Trade Assurance or an equivalent protected trade
  marketplace order.
- Avoid a generic Amazon SKU for custom harness work unless a real Amazon
  custom listing model is confirmed later.

The marketplace order should match the confirmed Easy Harness quote and order
summary. It should not be an unrelated placeholder SKU.

## Platform Flow

1. Customer confirms the Easy Harness quote and opens the order.
2. Customer adds delivery details and shipping option.
3. Customer selects **Marketplace protected payment**.
4. Easy Harness staff creates a matching protected marketplace order.
5. Staff pastes the protected checkout/order link into the staff order console.
6. Customer opens the link from the Easy Harness order page.
7. After the marketplace shows payment received, staff marks the Easy Harness
   order as paid and production can move forward.

## Current Boundary

This is not a marketplace API integration yet. It is a controlled handoff that
keeps Easy Harness as the source of quote, order basis, production status, and
support thread while letting the customer use an external protected checkout.

Later automation can replace step 4-6 with marketplace API calls if the chosen
marketplace supports custom order creation and status callbacks.
