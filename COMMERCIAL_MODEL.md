# SoulSpace commercial model

**Status: planning guidance only. No payment provider, subscription checkout or paid entitlement is active in this build.**

## Product principle

Charge for additional convenience, depth and content production, not for access to safety, crisis resources, account deletion, data export or basic human-support guidance. Do not target users based on inferred mental-health conditions or emotional vulnerability.

## Suggested tiers for market testing

| Tier | Indicative India price | Potential inclusions |
|---|---:|---|
| Free | ₹0 | Mood check-ins, journal, core self-guided activities, locally generated sleep sounds, urgent-support information and a modest AI companion allowance |
| Plus | ₹99–149/month | Larger companion allowance, structured multi-week journeys, additional reflection tools and expanded sleep routines |
| Premium | ₹199–299/month | Full reviewed content library, richer personal progress summaries, additional language experiences and licensed audio programmes |

These are hypotheses for willingness-to-pay testing, not validated prices or active offers. Test monthly and annual options with transparent cancellation and refund terms.

## Potential revenue streams

1. Consumer subscriptions for premium journeys and content.
2. One-time purchases for optional, clearly described content packs, if the app-store and consumer rules permit.
3. Employer wellbeing licences only after a separate privacy design; employers must not receive identifiable mood, journal or conversation data.
4. Carefully selected partnerships for non-clinical wellbeing content, with clear sponsorship disclosure and no influence over safety guidance.

## Do not monetise

- Crisis detection or crisis contact information.
- Access to emergency-support links.
- User journal entries, conversation text, mood history or inferred emotional profiles.
- Sensitive distress signals for advertising, targeting or conversion optimisation.
- Fabricated professional listings or unverified clinical claims.

## Payment launch requirements

Before enabling checkout:
- choose and integrate a supported payment provider;
- validate payment status and subscription entitlements server-side;
- implement webhook signature verification, idempotency and replay protection;
- support cancellation, refunds, failed renewals, tax invoices and customer support;
- verify app-store billing requirements for native apps;
- test purchase, restore, cancellation, refund and entitlement revocation end-to-end.

Until then, the app must not display a working purchase button or imply that a payment has been taken.
