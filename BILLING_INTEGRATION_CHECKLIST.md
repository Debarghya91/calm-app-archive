# SoulSpace billing integration checklist

**Status: NOT CONFIGURED.** No payment provider is connected, the
`/api/billing/checkout` endpoint honestly returns HTTP 501, and the app
shows no purchase button. The tier prices in `COMMERCIAL_MODEL.md`
(Free ₹0, Plus ₹99–149/month, Premium ₹199–299/month) are market-testing
hypotheses, not active offers. Crisis support must always remain free and
must never sit behind a paywall.

Do not expose any purchase UI until every item below is done and tested
end to end.

## 1. Google Play Console setup (owner)

- [ ] Create the app in Play Console with application ID
      `com.soulspace.wellbeing` and complete the store listing, age rating,
      privacy declaration and review notes.
- [ ] Create subscription products (one per tier, monthly, plus annual if
      offered) with final prices and benefits text. Record the exact
      product IDs; they must match the app and server configuration.
- [ ] Configure subscription settings: grace period, account hold,
      resubscribe, and cancellation behaviour.
- [ ] Set up a Google Cloud service account with the Android Publisher API
      and grant it access to the Play Console app (needed for server-side
      verification). Store its credentials server-side only.
- [ ] Configure Real-time Developer Notifications (RTDN) via Pub/Sub so
      renewals, cancellations, holds and refunds reach the server promptly.

## 2. Android app (Google Play Billing Library)

- [ ] Add the Play Billing Library dependency and a billing client that
      queries the configured product IDs (never hardcode prices; display
      Play-returned pricing).
- [ ] Implement the purchase flow, acknowledgement (within 3 days, or the
      purchase is refunded), and pending-purchase handling.
- [ ] Implement restore: query existing purchases on launch and on demand,
      and reconcile with server entitlements.
- [ ] Handle failed payments, cancellations, account holds and grace
      periods in UI copy that never implies access the user does not have.
- [ ] Keep every purchase entry point out of crisis flows. Crisis screens
      show no upsell, ever.

## 3. Server-side verification and entitlements

- [ ] Add a purchases table (user, product ID, purchase token, order ID,
      expiry, status) and verify every purchase token against the Android
      Publisher API before granting anything. Never trust the client alone.
- [ ] Verify RTDN messages (signature/authentication), apply idempotency
      (same notification twice must not double-grant), and guard against
      replayed purchase tokens.
- [ ] Implement entitlement enforcement: the `plan` field already exists
      on users and gates the AI daily limit and premium content locking;
      wire plan changes to verified purchase state and expiry.
- [ ] Handle renewal, cancellation (access until period end), refund
      (revoke promptly), failed renewal/hold (downgrade per policy), and
      subscription upgrade/downgrade with proration.
- [ ] Replace the 501 billing endpoint with real, authenticated endpoints
      only when the above is live and tested.

## 4. Testing before charging anyone

- [ ] Test with Play Console license testers in a closed track: purchase,
      restore, cancel, refund, expired card/hold, and upgrade/downgrade.
- [ ] Test the full free-to-paid and cancellation journey on a real device.
- [ ] Test entitlement revocation after refund and after expiry.
- [ ] Confirm tax invoices/receipts and customer-support contact paths.
- [ ] Confirm no purchase UI appears and no charge is possible while any
      item above is incomplete.

## 5. Compliance and copy

- [ ] Legal review of subscription terms, cancellation and refund terms for
      India and every target market, plus app-store subscription rules.
- [ ] Privacy review: purchase data is sensitive; keep it server-side, do
      not use mood, journal or conversation data for targeting or upsell.
- [ ] Update `www/privacy.html` and `www/terms.html` with the real payment
      terms, publisher identity and support contact before launch.
