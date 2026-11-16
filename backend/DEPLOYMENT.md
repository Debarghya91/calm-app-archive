# SoulSpace backend deployment

How to deploy the Node.js backend so the Android app gets live AI, accounts
and sync. No credentials are invented here: every secret below must come
from an account you control.

## 1. Get a free Groq API key (no credit card)

1. Open https://console.groq.com and create a free account.
2. Create an API key in the console and copy it once. It starts with `gsk_`.
3. Treat it as a server secret. Never paste it into the app, a chat log, or
   a source file that ships in the APK.

Published free-tier limits for the default model `openai/gpt-oss-120b`
(Nov 2026, re-check at https://console.groq.com/docs/rate-limits before
launch): 30 requests/minute, 1,000 requests/day, 200,000 tokens/day, shared
across all users of the key. The server enforces its own per-user daily
limits underneath (20 AI messages/day on the free plan). If the primary
model is rate-limited, the server retries once with `openai/gpt-oss-20b`
(`GROQ_FALLBACK_MODEL`); only if both fail does the app report the
companion as busy, and crisis support plus all self-guided activities
keep working.

Alternatives: set `AI_PROVIDER=anthropic` with `ANTHROPIC_API_KEY` and
`ANTHROPIC_MODEL` (paid), or `AI_PROVIDER=openrouter` with
`OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (free models exist but with
much lower limits and a roster that changes often).

## 2. Environment variables

Copy `.env.example` to `.env` on the server (or set the same variables in
your hosting provider's dashboard). Only the key line is required for live
AI; everything else has a safe default.

| Variable | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | Yes, for live AI | Free Groq key. Server only. |
| `GROQ_MODEL` | No | Defaults to `openai/gpt-oss-120b`. |
| `AI_PROVIDER` | No | `groq` (default when a Groq key is set), `anthropic`, or `openrouter`. |
| `PORT` | No | Defaults to `8787`. |
| `DB_FILE` | No | Absolute path for the SQLite file, e.g. `/data/soulspace.db`. |
| `CORS_ORIGINS` | No | Defaults allow the Capacitor origins (`capacitor://localhost`, `https://localhost`, `http://localhost`, `ionic://localhost`). Add exact trusted web origins only, never `*`. |
| `TRUST_PROXY` | No | `true` only behind a reverse proxy you control and trust. |

## 3. Deploy options

Any host that runs Node.js 22+ works. Two straightforward paths:

**Docker (any VPS or container host):**

```bash
docker compose up --build -d
```

The SQLite file lives in the `soulspace_data` volume. Put the service
behind an HTTPS reverse proxy (nginx/Caddy/Traefik) with TLS before
exposing it publicly. Never expose the Node process directly.

**Platform (Render, Railway, Fly.io, or similar):**

Use the `Dockerfile`, or run `node backend/server.js` with Node 22+ and a
persistent disk mounted for `DB_FILE`. Set the environment variables in the
provider dashboard, not in the repository.

SQLite suits a single-instance evaluation or small pilot. For a
multi-instance or high-availability service, replace it with a managed
database before launch (see `DEPLOYMENT_CHECKLIST.md`).

## 4. Point the Android app at the deployed backend

1. In `www/js/config.js`, set the deployed HTTPS origin:
   `window.SOULSPACE_API='https://your-deployed-backend.example';`
   Use your real origin. Never use `http://localhost`: on a real device
   localhost is the phone itself.
2. Re-sync and rebuild:
   ```bash
   npx cap sync android
   cd android && ./gradlew assembleDebug   # or bundleRelease
   ```
3. Until this is done, the shipped app stays in its honest offline state:
   accounts and sync are unavailable and the companion labels itself as
   the offline fallback.

## 5. Verify the deployment

```bash
curl https://your-deployed-backend.example/health
# Expect: {"ok":true,"ai_configured":true,"provider":"groq",...}

# Register a test account, then send one chat message and confirm a live
# reply (not the offline fallback) comes back.
```

Also run the backend suite before every deploy: `bash backend/test.sh`
from the project root (53 checks, including the Groq stub-upstream test).

## 6. Operations reminders

- Back up the SQLite volume regularly and prove a restore works.
- Rotate a leaked key immediately in the Groq console and update the
  server environment; no app rebuild is needed.
- Watch Groq usage in the console: the shared daily cap binds before any
  single user's limit when the user base grows.
- Account deletion removes cloud data from the live database; confirm
  backup-retention handling before public launch.
