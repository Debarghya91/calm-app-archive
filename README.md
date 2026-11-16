# SoulSpace

**Version 0.9.0 · Pre-launch candidate**

SoulSpace is an AI-first wellbeing companion and self-guided wellbeing app. It is designed for emotional support, reflection, everyday stress, sleep routines and mindful pauses. It is not a medical service.

## What this version includes

- Refreshed responsive mobile-first interface and five-tab navigation.
- Daily mood check-in and simple progress overview.
- Emotional Discovery: a three-step, one-question-at-a-time reflection that helps users who cannot name their feelings. It accepts plain-language descriptions, notices tentative patterns such as withdrawal, sleep changes, irritability, worry or low energy, asks about duration, and suggests relevant self-guided activities. It is not a diagnostic test and does not assign a mental-health condition.
- Companion guidance to notice indirect emotional signals across conversation, reflect them tentatively, ask one gentle follow-up and let the user correct the interpretation. With opt-in conversation memory enabled, recent saved chat can provide continuity across sessions.
- AI companion UI wired to the backend `/api/chat` endpoint.
- Offline companion fallback when the live AI service is unavailable. The UI labels offline mode honestly.
- Explicit conversation-memory consent. When enabled and signed in, chat history can sync to the account. When disabled, the server does not save chat text. The companion language preference is stored locally and supports English, Hinglish, Hindi and Bengali replies; the app's surrounding interface remains English.
- Original self-guided content for heartbreak, loneliness, anxiety, sleep, mindfulness, movement, grief, self-compassion and work stress.
- Four guided journeys with completion tracking and 33 original self-guided activities.
- Search and category filters for the wellbeing library. Users can mark activities helpful or not for them; these local preferences influence later suggestions and can be reset.
- Locally generated ambient noise with a sleep timer (not licensed recordings).
- Sleep diary with optional notes and cloud sync, private journal, saved activities, account sign-in, cloud sync, export and account deletion.
- Persistent free crisis support links for India: 112 and Tele-MANAS 14416.
- Backend daily AI usage accounting independent of conversation-memory consent, basic per-IP request throttling, message length validation and safer static file path checks.
- Admin/editor Content Studio with catalogue, create, edit, publish/unpublish and delete controls. Media URLs must use HTTPS and include a rights/licence reference. No media is bundled or represented as licensed.
- First-run offline app shell via a service worker; API responses and personal data are never cached by the service worker.
- Live AI connection status indicator; policy pages for privacy, terms and support (publisher contact/legal details remain launch blockers).

## Run locally

Requires Node.js 22 or later because the backend uses `node:sqlite`.

```bash
cd backend
cp ../.env.example .env
# Edit .env and set GROQ_API_KEY for live AI (free tier, no credit card;
# see backend/DEPLOYMENT.md). Anthropic remains an alternative.
node --env-file=.env server.js
```

Open `http://localhost:8787`.

If no AI credentials are configured, crisis keyword detection still works and the companion falls back to clearly labelled offline support. Live AI replies are not available until a provider key is configured on the server (free Groq key, or an Anthropic key and model ID).

## Backend tests

```bash
cd backend
bash test.sh
```

The integration suite currently covers 53 checks: registration, login, auth enforcement, static file serving and path traversal protection, mood and sleep-diary validation, journal, favourites, first-login local-data merge without duplicates, indirect emotional-signal mapping, sync, role restrictions, admin content create/list/update/delete, CORS allowlisting, oversized chat rejection, daily AI quota enforcement, crisis response without an AI key, safety event logging, honest unconfigured payments, export, chat-history deletion, account deletion and cascading data deletion, plus free-AI provider selection and the Groq/OpenAI-compatible chat path exercised against a local stub upstream, including the 429 fallback to the second free model. A live Groq reply through the backend was also verified on 17 Nov 2026 with a user-supplied key (key value never recorded).

## Mobile builds

The project uses Capacitor 6. Change `appId` in `capacitor.config.json` to your final bundle identifier before store submission.

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

For iOS, run on macOS with Xcode:

```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```

For a native build, set `window.SOULSPACE_API` in `www/js/config.js` to the deployed HTTPS backend origin before building. A native build has not been produced or device-tested as part of this source update.

## Important product and safety boundaries

- The AI is an emotional-wellbeing companion, not a psychiatrist, therapist, doctor or emergency service. It must not diagnose, prescribe or claim to treat mental-health conditions.
- Do not market the app as a replacement for professional mental-health care.
- Crisis resources and emergency access must remain free and accessible.
- No psychiatrist marketplace, provider registration, appointment booking or fabricated clinician profiles are included in this product direction.
- No external music/video is included. Add only media for which SoulSpace has documented distribution rights. The current sleep sounds are generated locally by Web Audio.
- No payment provider is connected. The billing endpoint honestly returns HTTP 501 until a payment provider is configured and tested. Do not show a working purchase flow until then.
- Do not store Anthropic credentials in frontend code or ship them in an iOS/Android package.
- Before public launch, obtain a clinical safety review of crisis handling, privacy/legal review for India and target markets, security review, and real-device testing.

## Known limitations in this build

- A live provider call HAS been verified: on 17 Nov 2026 the backend, running with a user-supplied Groq key, returned a live reply from openai/gpt-oss-120b through the /api/chat path, and /health reported ai_configured true with provider groq. The key value was never recorded or stored; set GROQ_API_KEY on the deployed server to repeat this in production.
- The contextual safety classifier depends on the configured AI provider and is not a clinically validated risk assessment. Keyword checks are only a fallback, not a guarantee of detection.
- This is not a crisis-monitoring service and cannot dispatch emergency help.
- No subscription checkout, push notification, voice conversation, licensed media catalogue, public community, or professional marketplace is implemented. Multilingual support applies to companion replies and urgent-support copy only; it is not a full app translation. Keyword-based crisis phrase coverage in Hindi, Hinglish and Bengali is limited and not a guarantee. Capacitor requests are allowed only from the configured native localhost origins in `CORS_ORIGINS`; add other exact trusted origins explicitly.
- SQLite is suitable for local/single-instance evaluation, not a fully scaled production deployment. Use a managed database, HTTPS, backups, secrets management, monitoring, and hardened session controls before launch.
- Android/iOS projects, store listings and screenshots have not been generated or verified.

## Clinical governance and commercial model

See `CLINICAL_GOVERNANCE.md` for the review framework and `COMMERCIAL_MODEL.md` for indicative India pricing hypotheses and payment launch requirements. Neither represents independent clinical approval or an active paid service.

## Privacy notes

The app stores wellbeing data in browser storage. Signed-in accounts sync mood, journal, sleep diary, favourites and progress. Conversation text is saved to the server only when the user enables conversation memory and is signed in. AI usage counts are stored separately from conversation text to enforce daily limits. Draft privacy, terms and support pages are included, but the publisher's legal identity, privacy/support contacts, retention schedule, hosting and backup practices must be completed and reviewed before public release.

## Admin Content Studio

1. Create a normal SoulSpace account in the app.
2. From the project directory, run `node backend/promote-admin.js your-account-email@example.com` against the same database configured for the server.
3. Sign out and sign back in. The Profile page will show **Content Studio**.
4. Add audio/video only when you have explicit distribution rights. Supply an HTTPS URL and a meaningful licence reference. Publish/unpublish, edit and delete are available from the Studio.

Do not promote an account on a public production database without appropriate access controls and operational approval. The admin promotion script is a local operator tool, not a public endpoint.

## Container deployment (evaluation / small pilot)

Copy `.env.example` to `.env`, configure the server-side AI key and model if live AI is wanted, then run:

```bash
docker compose up --build -d
```

The SQLite file is stored in the named `soulspace_data` volume. Put the service behind a properly configured HTTPS reverse proxy before exposing it publicly. Back up the volume and test restore procedures. This single-instance SQLite setup is for evaluation or a small pilot, not a high-availability production architecture.

See `DEPLOYMENT_CHECKLIST.md` for the remaining legal, clinical, security, infrastructure and app-store launch work.


## v0.7 psychology-informed content

The wellbeing library now includes original, self-guided exercises informed by CBT, behavioural activation, structured problem-solving, acceptance and values-based skills, worry management and DBT-informed distress-tolerance skills. Each new exercise explains its purpose, gives step-by-step instructions, identifies when to pause, and names the general source approach. An in-app Evidence and Safety Standards panel links to WHO and NICE guidance and clearly states that SoulSpace's brief adaptations are not complete clinical protocols or clinically validated treatment.

The companion's safety instructions now distinguish supportive listening from clinical care, avoid diagnosis and medication advice, and encourage qualified assessment for persistent, worsening or functionally impairing difficulties and prompt human assessment for potentially serious changes in perception, energy, sleep or self-care. India crisis routes remain 112 and Tele-MANAS 14416.

These additions are evidence-informed product content, not a clinical service. Independent review by qualified Indian clinical psychologists and psychiatrists is still required before any clinical claims or treatment positioning.


## v0.8 conversation reflections and visual refinement
- The companion can notice a repeated theme across multiple user turns in the current conversation (for example, recurring sleep disruption or worry).
- Reflections are explicitly tentative, user-correctable and dismissible. They do not label conditions or claim to infer a diagnosis.
- Reflections work within the current session without enabling chat history. Conversation memory remains a separate opt-in.
- Users can disable conversation reflections in Profile > Preferences.
- Refreshed the visual system with clearer hierarchy, improved card surfaces, calmer contrast, responsive spacing and a more legible chat experience.
