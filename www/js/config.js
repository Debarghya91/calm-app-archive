// API origin for the SoulSpace backend.
//
// Web deployments use the same origin: leave this empty and the app talks
// to the server that served it.
//
// Capacitor (Android/iOS) builds have no same-origin backend. Before a
// production native build, set this to the deployed HTTPS backend origin,
// for example:
//   window.SOULSPACE_API='https://api.example.com';
// Never use http://localhost here: on a real device localhost is the
// phone itself, not your server. Never put API keys in this file; the
// Anthropic key lives only on the server (see .env.example).
//
// Empty (the shipped default) means "backend not configured": account
// sign-in/sync are unavailable and the companion honestly reports the
// offline fallback. That is the correct state until a backend is deployed.
// See ANDROID_BUILD_REPORT.md and backend/DEPLOYMENT.md for the steps.
window.SOULSPACE_API=window.SOULSPACE_API||'';
window.SOULSPACE_BRAND='SoulSpace';
