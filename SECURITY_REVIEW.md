# SoulSpace Android security review (v0.9.0 build)

Review date: 17 Nov 2026. Scope: the Capacitor Android app, the bundled
web app, and the Node.js backend as shipped in this source tree. This is
an engineering review, not an independent security audit or penetration
test (both remain launch blockers in `DEPLOYMENT_CHECKLIST.md`).

## Checked and satisfactory

- **WebView settings (Capacitor 6.2.3 defaults, verified in Bridge.java):**
  JavaScript and DOM storage are enabled because the app needs them. Mixed
  content stays blocked (`allowMixedContent` defaults to `false` and is
  not enabled). The app is served over the `https` Android scheme, not
  `file://`, and no `file://` URL is used anywhere in app code.
- **Cleartext traffic:** `network_security_config.xml` forbids cleartext
  for all hosts, and the manifest sets `usesCleartextTraffic=false`. No
  `http://` URL exists in app code; fonts and all API traffic use HTTPS.
- **Permissions:** the manifest requests `INTERNET` only. No microphone,
  camera, contacts, location, storage, or notification permission is
  requested. (Merged-manifest verification after the Gradle build is
  recorded in `ANDROID_BUILD_REPORT.md`.)
- **Secrets:** no API key or credential exists in `www/`, the Capacitor
  config, or any Android resource. The Groq/Anthropic/OpenRouter keys live
  only in server environment variables. A source scan for key patterns
  (`gsk_`, `sk-ant-`) finds none. The release signing configuration reads
  from a gitignored properties file that is never shipped.
- **Token handling:** the session token is sent only as an `Authorization:
  Bearer` header to the configured API origin, with a 15-second request
  timeout. A 401 response clears the token and signs the user out. Server
  sessions expire after 30 days and logout deletes all of the user's
  sessions.
- **External links:** in the native app, `www/js/native.js` opens
  `http(s)` links in the system browser instead of the app WebView.
  `tel:` links and the local privacy/terms/support pages are untouched.
- **Rendering of user and remote content:** render sites spot-checked
  (library cards, journal entries, discovery results, reflection prompts)
  pass user-influenced and server-provided strings through the `esc()`
  HTML escaper before insertion. No `eval()` or `document.write()` exists.
- **Backend:** static file serving blocks path traversal and dotfiles;
  CORS allows only exact configured origins; chat requests are size
  limited and per-IP throttled; AI usage quotas are enforced server-side
  independent of memory consent; crisis keyword handling runs before any
  model call and works with no provider key. The integration suite
  (53 checks) covers these behaviours.
- **Logs:** the web app writes nothing to the console. The server logs
  only error messages and startup lines, never message or journal content.
- **Backups:** `android:allowBackup` is `false`, so wellbeing data and
  the session token are not included in Android auto-backup.
- **Advertising:** no advertising SDK is included, and no emotional data
  is shared with any third party except the configured AI provider, which
  receives only the current chat messages and the system prompt.

## Residual risks and hardening for later releases

- **Local storage encryption:** wellbeing data and the session token are
  stored in WebView `localStorage`, which is app-private but not
  encrypted at rest beyond device encryption. A future release should
  move the token (and ideally journal/mood data) to encrypted storage.
  This is acceptable for supervised device testing, not a claim of
  at-rest encryption.
- **Geolocation flag:** Capacitor enables the WebView geolocation setting
  by default. No location permission is requested, so location cannot be
  obtained, but the flag itself is on. Revisit if the WebView layer is
  ever customised.
- **Session lifetime:** 30-day server sessions with no refresh rotation
  are generous. Consider shorter sessions with rotation before launch.
- **No certificate pinning:** the app trusts the system certificate
  store. Pinning the backend certificate is a possible later hardening
  step; it was deliberately not added because it can break legitimate
  deployments and needs an operational rotation plan.
- **Independent review outstanding:** security review, penetration test,
  privacy impact assessment, and clinical safety review are all still
  required before public launch (see `DEPLOYMENT_CHECKLIST.md` and
  `CLINICAL_GOVERNANCE.md`).
