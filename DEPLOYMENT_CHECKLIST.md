# SoulSpace public-launch checklist

This is a product and engineering checklist, not a certification that the current build is ready for public launch.

## Operator setup
- [ ] Choose and register the publisher/legal entity and final app name.
- [ ] Complete `www/privacy.html`, `www/terms.html` and `www/support.html` with legal identity, address, privacy/support contact and governing-law details.
- [ ] Have India and target-market privacy, consumer, subscription and app-store requirements reviewed by qualified counsel.
- [ ] Configure `ANTHROPIC_API_KEY` and an Anthropic model ID that is currently available to your account. Keep both only on the server.
- [ ] Deploy behind HTTPS. Never expose the Node process directly to the public internet without a reverse proxy, TLS, request limits and monitoring.
- [ ] Replace the evaluation SQLite deployment with a managed database for a multi-instance or high-availability service.
- [ ] Configure automated encrypted backups and prove restoration and account-deletion/backup-retention procedures.
- [ ] Configure trusted proxy handling only when the reverse proxy is under your control.
- [ ] Create the first administrator using `node backend/promote-admin.js account@example.com` against the correct database.
- [ ] Add only audio/video for which distribution rights are documented. The licence field is an operator reference, not automated legal verification.

## Safety and clinical quality
- [ ] Commission an independent clinical safety review of the companion prompt, crisis copy, escalation paths and user journeys.
- [ ] Test false positives, false negatives, indirect language, multilingual messages and context changes in crisis scenarios.
- [ ] Keep emergency and crisis support accessible without an account or paid subscription.
- [ ] Never market the AI as a psychiatrist, therapist, diagnostic service or replacement for human care.
- [ ] Establish a clear process for user feedback, incident reporting and safeguarding concerns.

## Security and privacy
- [ ] Perform an independent security review and penetration test.
- [ ] Review session token storage, expiry, revocation, brute-force controls, rate limits, CORS and content security policy.
- [ ] Decide and document retention periods for account data, safety events, logs and backups.
- [ ] Review third-party AI processing and user disclosures.
- [ ] Test export and deletion end-to-end, including backups and third-party systems.
- [ ] Add monitoring, alerting, abuse controls and an incident response process.

## Mobile and commercial launch
- [ ] Set the final Android application ID and iOS bundle identifier.
- [ ] Build and test on supported real Android and iOS devices, including offline, background audio, keyboard, screen reader and small-screen behaviour.
- [ ] Configure native API origin and production CORS allowlist.
- [ ] Complete store listing, age rating, screenshots, privacy declarations and review notes.
- [ ] If subscriptions are introduced, implement provider checkout, server-side receipt/webhook validation, cancellation, refunds, taxes, renewal notices and entitlement enforcement before exposing purchase buttons.
- [ ] Test the complete free-to-paid and cancellation journey before charging anyone.
