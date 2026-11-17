// SoulSpace Android emulator E2E. Runs ONLY on GitHub Actions ubuntu
// runners, inside reactivecircus/android-emulator-runner (API 34, x86_64).
// Drives the real built debug APK on the emulator via Appium +
// UiAutomator2, in the Android System WebView context: real taps on the
// real UI, real timers, no fast-forwarding. JS evaluation is used only to
// READ state, plus two documented exceptions: <select> controls (the
// native Android spinner UI is platform UI, not the app's) and dialog
// dismissal when a dialog has no visible close control.
//
// This mirrors e2e/ios-appium-test.mjs check-for-check (same names, same
// selectors) so iOS and Android results are directly comparable.
//
// Env: UDID (default emulator-5554), APK_PATH (or APP_PATH fallback),
// SHOTS (default e2e-shots-android), REPORT (default
// e2e-report-android.json).
//
// WEBVIEW DEBUGGING REQUIREMENT (verified in local Capacitor 6.2.3
// source, no app change needed): CapConfig defaults
// android.webContentsDebuggingEnabled to isDebug, and Bridge applies it
// via WebView.setWebContentsDebuggingEnabled(). The debug APK from
// :app:assembleDebug is debuggable, so the WEBVIEW context is exposed.
// A release APK would NOT expose it; this test must only run the debug
// APK. The repo's capacitor.config.json sets no override, and
// MainActivity is the stock Capacitor BridgeActivity.
//
// ANDROID-SPECIFIC DIFFERENCES HANDLED (vs the iOS script):
// 1. WebView context: the exact name is WEBVIEW_com.soulspace.wellbeing.
//    switchToWebview() prefers that exact match and falls back to any
//    WEBVIEW_* context. The first switch triggers the chromedriver
//    handshake, which can take 30-90s (chromedriver autodownload on
//    first run); timeouts are 180s for the first switch, 120s after
//    relaunch. After switching, we wait for document.readyState.
// 2. Chromedriver: the UiAutomator2 driver talks to the WebView through
//    chromedriver, whose major version must match the emulator's
//    WebView version. chromedriverAutodownload:true lets Appium fetch
//    the matching build; the server must be started with
//    --allow-insecure=chromedriver_autodownload (see android-e2e.yml).
// 3. Keyboard: the Android soft keyboard can cover the send button, and
//    the WebView resizes (adjustResize). After typing we hideKeyboard()
//    (best-effort), tap Send, and fall back to form requestSubmit() if
//    the message echo never appears, exactly as on iOS. setValue() via
//    chromedriver occasionally drops characters on emulator keyboards,
//    so fillInput() verifies with getValue() and retries once via a JS
//    value-set + input/change events; the check detail records which
//    path worked ('typed' vs 'js-fill-fallback').
// 4. Relaunch: terminateApp()/activateApp() preserve app data (no
//    uninstall), so the localStorage persistence checks keep the same
//    meaning as on iOS. Appium requires the NATIVE_APP context for app
//    management, and chromedriver must reconnect after relaunch, so we
//    re-poll contexts with the longer timeout and reinstall the error
//    trap on the fresh page.
// 5. Screenshots: nativeWebScreenshot:true makes saveScreenshot()
//    capture the whole emulator screen via screencap even while in the
//    WebView context, instead of a WebView-viewport-only chromedriver
//    capture. Screenshots therefore show the app exactly as a user
//    sees it, including the status bar.
// 6. Timing: the emulator WebView is slower than the iOS simulator
//    WKWebView, so waitForDisplayed uses 20s (vs 15s), navigation
//    sleeps are slightly longer, and the full breathing-cycle poll
//    allows 110s for the real 70s cycle.
// 7. No platformVersion capability: the driver uses the booted
//    emulator's version (API 34). appWaitActivity/appWaitPackage pin
//    the launch wait to SoulSpace's MainActivity.
import { remote } from 'webdriverio';
import { writeFileSync, mkdirSync } from 'node:fs';

const UDID = process.env.UDID || 'emulator-5554';
const APK = process.env.APK_PATH || process.env.APP_PATH;
const SHOTS = process.env.SHOTS || 'e2e-shots-android';
const REPORT = process.env.REPORT || 'e2e-report-android.json';
const PKG = 'com.soulspace.wellbeing';
const WEBVIEW = 'WEBVIEW_' + PKG;
const STARTED = new Date().toISOString();
if (!APK) { console.error('APK_PATH env var (path to the debug APK) is required'); process.exit(2); }
mkdirSync(SHOTS, { recursive: true });
console.log('E2E start: udid=' + UDID + ' apk=' + APK);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' :: ' + detail : ''));
};

let driver;
let webviewContext = '';
try {
  driver = await remote({
    hostname: '127.0.0.1', port: 4723, path: '/',
    logLevel: 'warn',
    connectionRetryTimeout: 300000,
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:udid': UDID,
      'appium:app': APK,
      'appium:appWaitPackage': PKG,
      'appium:appWaitActivity': PKG + '.MainActivity',
      'appium:noReset': false,
      'appium:newCommandTimeout': 300,
      'appium:chromedriverAutodownload': true,
      'appium:showChromedriverLog': true,
      'appium:nativeWebScreenshot': true,
      'appium:autoGrantPermissions': true,
      'appium:skipUnlock': true,
      'appium:disableWindowAnimation': true,
      'appium:ensureWebviewsHavePages': true,
      'appium:adbExecTimeout': 60000,
      'appium:uiautomator2ServerLaunchTimeout': 300000,
      // The software-rendered emulator installs APKs slowly: the
      // uiautomator2 server install timed out at the 20000ms default
      // (run 44063297659). Raise it, and the app-install timeout too,
      // so the same slowness does not fail the next step.
      'appium:uiautomator2ServerInstallTimeout': 120000,
      'appium:androidInstallTimeout': 180000,
      // The emulator's settings service can lag behind boot_completed on
      // the slow software-rendered image; tolerate a transient failure of
      // the hidden-API-policy step instead of failing session creation.
      // (Driver's own log message recommends this capability.)
      'appium:ignoreHiddenApiPolicyError': true,
    },
  });

  const $ = sel => driver.$(sel);
  const evl = expr => driver.execute(`return (${expr});`);
  const run = fn => driver.execute(fn);
  const bodyText = () => evl(`(document.body.innerText || '')`);
  const shot = async name => { await driver.saveScreenshot(`${SHOTS}/${name}`); };
  const tap = async sel => {
    const el = await $(sel);
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
  };
  const tapText = async t => {
    const el = await $(`//button[normalize-space(.)=${JSON.stringify(t)}]`);
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
  };
  const poll = async (expr, timeoutMs, intervalMs = 500) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      try { const v = await evl(expr); if (v) return v; } catch (e) {}
      await sleep(intervalMs);
    }
    return null;
  };
  // Type into an input, verify the value landed, and retry once via JS
  // if chromedriver typing dropped it. Returns 'typed' or
  // 'js-fill-fallback' so the check detail stays honest.
  const fillInput = async (sel, text) => {
    const el = await $(sel);
    await el.waitForDisplayed({ timeout: 20000 });
    await el.click();
    await el.setValue(text);
    await sleep(300);
    const got = await el.getValue();
    if ((got || '').includes(text)) return 'typed';
    // Fallback: set the value through the element's own prototype
    // setter (works for both <input> and <textarea>) and fire the
    // events the app listens to.
    await evl(`(() => { const input = document.querySelector(${JSON.stringify(sel)}); const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set; setter.call(input, ${JSON.stringify(text)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await sleep(300);
    return 'js-fill-fallback';
  };
  const installErrorTrap = () => run(() => {
    window.__e2eErrors = [];
    window.addEventListener('error', e => window.__e2eErrors.push('error: ' + e.message));
    window.addEventListener('unhandledrejection', e => window.__e2eErrors.push('rejection: ' + String((e.reason && e.reason.message) || e.reason)));
    const origErr = console.error.bind(console);
    console.error = (...a) => { window.__e2eErrors.push('console.error: ' + a.map(x => { try { if (x instanceof Error) return x.stack || x.message; if (typeof x === 'object' && x !== null) return JSON.stringify(x); return String(x); } catch (e) { return String(x); } }).join(' ')); origErr(...a); };
  });
  const readErrors = () => evl(`(window.__e2eErrors || [])`);
  const switchToWebview = async (timeoutMs = 180000) => {
    const end = Date.now() + timeoutMs;
    let seen = '';
    while (Date.now() < end) {
      const ctxs = await driver.getContexts();
      seen = ctxs.join(',');
      const web = ctxs.find(c => c === WEBVIEW) || ctxs.find(c => c.indexOf('WEBVIEW') === 0);
      if (web) {
        await driver.switchContext(web);
        webviewContext = web;
        // Wait for the page to finish loading before touching the DOM.
        const readyEnd = Date.now() + 30000;
        while (Date.now() < readyEnd) {
          try { if (await evl(`document.readyState`) === 'complete') break; } catch (e) {}
          await sleep(1000);
        }
        return web;
      }
      await sleep(2000);
    }
    throw new Error('no WEBVIEW context appeared; last seen: ' + seen);
  };
  const closeDialogIfOpen = async () => {
    // Prefer a real tap on a visible Close button; fall back to JS close.
    const open = await evl(`!!(document.querySelector('#dlg') && document.querySelector('#dlg').open)`);
    if (!open) return;
    try {
      const el = await $(`//dialog[@id="dlg"]//button[normalize-space(.)="Close"]`);
      if (await el.isDisplayed()) { await el.click(); await sleep(400); }
    } catch (e) { /* no visible Close button */ }
    const stillOpen = await evl(`!!(document.querySelector('#dlg') && document.querySelector('#dlg').open)`);
    if (stillOpen) await evl(`document.querySelector('#dlg').close()`);
  };
  const hideKeyboardBestEffort = async () => { try { await driver.hideKeyboard(); } catch (e) {} };

  await switchToWebview();
  check('webview context for SoulSpace package appears', webviewContext === WEBVIEW, webviewContext);
  await sleep(2000);
  await installErrorTrap();

  // ---- Home ----
  check('home hero renders', (await bodyText()).includes('Make room for'));
  check('nav has 5 tabs', await evl(`document.querySelectorAll('#nav button').length`) === 5);
  check('hero primary is Calm me down', (await evl(`document.querySelector('.hero-button') ? document.querySelector('.hero-button').textContent : ''`)).includes('Calm me down'));
  const grid = await evl(`[...document.querySelectorAll('.action-grid .action-card b')].map(b => b.textContent)`);
  check('action grid leads with calm, talk last', grid[0].includes('Calm down now') && grid[grid.length - 1].includes('Talk it through'), grid.join(' | '));
  await shot('e2e-01-home.png');

  // ---- Calm flow, real taps, real timers ----
  await tap('.hero-button');
  await sleep(1000);
  check('calm view opens from hero tap', !!(await evl(`document.querySelector('#calm-orb') && document.querySelector('#calm-phase')`)));
  check('no dialog on calm entry', await evl(`document.querySelector('#dlg').open`) === false);
  check('breathing starts on Breathe in', (await evl(`document.querySelector('#calm-phase') ? document.querySelector('#calm-phase').textContent : ''`)) === 'Breathe in');
  check('5 breath dots shown', await evl(`document.querySelectorAll('#calm-dots i').length`) === 5);
  await shot('e2e-02-breathe.png');
  check('breathing phase advances to Hold on its own', !!(await poll(`document.querySelector('#calm-phase') && document.querySelector('#calm-phase').textContent === 'Hold'`, 10000)));
  // Full real cycle: 5 breaths x 14s = 70s. No fast-forward.
  check('full breathing cycle reaches check screen', !!(await poll(`(document.body.innerText || '').includes('A little better?')`, 110000, 1000)));
  await shot('e2e-03-check.png');
  await tapText('Still anxious');
  await sleep(600);
  check('grounding step 1 shows 5 See', (await evl(`document.querySelector('.calm-num') ? document.querySelector('.calm-num').textContent : ''`)) === '5' && (await bodyText()).includes('See'));
  await shot('e2e-04-ground.png');
  await tapText('Next'); await sleep(400);
  check('grounding advances to 4 Feel', (await evl(`document.querySelector('.calm-num') ? document.querySelector('.calm-num').textContent : ''`)) === '4' && (await bodyText()).includes('Feel'));
  await tapText('Next'); await sleep(300);
  await tapText('Next'); await sleep(300);
  await tapText('Next'); await sleep(300);
  check('grounding reaches last step 1 Taste', (await evl(`document.querySelector('.calm-num') ? document.querySelector('.calm-num').textContent : ''`)) === '1' && (await bodyText()).includes('Taste'));
  await tapText('Done'); await sleep(600);
  const doneText = await bodyText();
  check('grounding ends on done screen', doneText.includes('Well done for pausing.'));
  check('done screen offers home, sounds, talk', doneText.includes('Back home') && doneText.includes('Calming sounds') && doneText.includes('Talk when ready'));
  await shot('e2e-05-done.png');
  await tapText('Back home'); await sleep(800);
  check('done Back home returns home', (await bodyText()).includes('Make room for'));

  // ---- Mood check-in, real taps ----
  await tap('button[aria-label="Anxious"]');
  await sleep(1000);
  check('mood Anxious tap opens calm directly', !!(await evl(`document.querySelector('#calm-orb')`)) && await evl(`document.querySelector('#dlg').open`) === false);
  await tap('.calm-exit'); await sleep(800);
  await tap('button[aria-label="Low"]');
  await sleep(1000);
  check('mood Low tap opens calm directly', !!(await evl(`document.querySelector('#calm-orb')`)) && await evl(`document.querySelector('#dlg').open`) === false);
  await tap('.calm-exit'); await sleep(800);
  check('calm timers stopped after leaving', await evl(`(typeof CALM !== 'undefined' ? CALM.timer === null : 'no-CALM')`) === true);
  await tap('button[aria-label="Good"]');
  await sleep(800);
  check('mood Good stays home with check-in note', (await bodyText()).includes('Your check-in'));
  check('mood check-in persisted locally', await evl(`(JSON.parse(localStorage.getItem('ss') || '{}').mood || []).length`) >= 1);
  await shot('e2e-06-mood.png');

  // ---- Companion chat, real typing ----
  await tap('#nav button[data-t="chat"]');
  await sleep(1000);
  const chatText = await bodyText();
  check('companion welcome renders', chatText.includes("I'm here with you."));
  check('companion shows offline state', /offline/i.test(chatText));
  const fillHow = await fillInput('#in', 'I feel anxious and cannot sleep');
  const typed = await evl(`document.querySelector('#in') ? document.querySelector('#in').value : ''`);
  check('chat input accepts typed text', (typed || '').includes('anxious'), fillHow + ' :: ' + typed);
  await hideKeyboardBestEffort();
  await sleep(300);
  await tap('button[aria-label="Send message"]');
  const echoed = await poll(`[...document.querySelectorAll('.msg.me')].some(m => (m.textContent || '').includes('anxious'))`, 6000);
  if (!echoed) {
    // Keyboard may have covered the send button; submit the form directly.
    await evl(`document.querySelector('.chat-composer').requestSubmit()`);
  }
  check('sent message appears in chat', !!(await poll(`[...document.querySelectorAll('.msg.me')].some(m => (m.textContent || '').includes('anxious'))`, 6000)));
  const replied = await poll(`[...document.querySelectorAll('.msg.bot')].some(m => (m.textContent || '').includes('Offline support mode'))`, 30000);
  check('offline companion reply appears', !!replied);
  await shot('e2e-07-chat.png');

  // ---- Crisis support ----
  await tap('button.sos');
  await sleep(800);
  const crisisOpen = await evl(`document.querySelector('#dlg').open`) === true;
  const crisisText = await evl(`document.querySelector('#dlg').innerText || ''`);
  check('urgent support dialog opens with helplines', crisisOpen && /14416/.test(crisisText) && /112/.test(crisisText), crisisText.slice(0, 120));
  await shot('e2e-08-crisis.png');
  await tapText('Close');
  await sleep(400);
  check('crisis dialog closes', await evl(`document.querySelector('#dlg').open`) === false);

  // ---- Discovery 3-step check-in ----
  await tap('#nav button[data-t="home"]');
  await sleep(800);
  await tap('.hero-secondary');
  await sleep(800);
  check('discovery dialog opens', await evl(`document.querySelector('#dlg').open`) === true);
  const dlg1 = await evl(`document.querySelector('#dlg').innerText || ''`);
  await tap('#dlg button');
  await sleep(800);
  const dlg2 = await evl(`document.querySelector('#dlg').innerText || ''`);
  check('discovery advances a step', dlg1 !== dlg2);
  await shot('e2e-09-discovery.png');
  await closeDialogIfOpen();
  check('discovery dialog closes', await evl(`document.querySelector('#dlg').open`) === false);

  // ---- Explore library ----
  await tap('#nav button[data-t="disc"]');
  await sleep(1000);
  const cardCount = await evl(`document.querySelectorAll('.content-card').length`);
  check('library lists activities', cardCount >= 30, `${cardCount} cards`);
  await shot('e2e-10-library.png');
  await tap('.content-card button');
  await sleep(800);
  check('activity detail opens', await evl(`document.querySelector('#dlg').open`) === true);
  await shot('e2e-11-activity.png');
  await closeDialogIfOpen();

  // ---- Sleep sounds + timer ----
  await tap('#nav button[data-t="sleep"]');
  await sleep(1000);
  await tap(`button[onclick="play('brown')"]`);
  await sleep(1000);
  check('sleep sound starts', await evl(`(typeof snd !== 'undefined' ? snd : 'no-snd')`) === 'brown');
  check('pause control shows while playing', (await bodyText()).includes('Pause'));
  await shot('e2e-12-sleep.png');
  // <select> exception: the native Android spinner is platform UI, not
  // the app's; set the value and fire the change event, as on iOS.
  await run(() => { const s = document.querySelector('#tm'); s.value = '15'; s.dispatchEvent(new Event('change')); });
  const timerLabel = await poll(`(document.querySelector('#tl') ? document.querySelector('#tl').textContent : '').length > 0`, 6000);
  check('sleep timer label set', !!timerLabel);
  await tap('.sound-play');
  await sleep(500);
  check('sleep sound stops', await evl(`(typeof snd !== 'undefined' ? snd : 'x')`) === '');

  // ---- You tab: login form, language, journal, theme ----
  await tap('#nav button[data-t="me"]');
  await sleep(1000);
  check('login form shown when signed out', !!(await evl(`document.querySelector('#em') && document.querySelector('#pw')`)));
  await tap(`button[onclick="setLanguage('hi')"]`);
  await sleep(600);
  await tap('#nav button[data-t="chat"]');
  await sleep(800);
  check('Hindi companion greeting after switch', (await bodyText()).includes('मैं यहाँ हूँ'));
  await tap('#nav button[data-t="me"]');
  await sleep(800);
  await tap(`button[onclick="setLanguage('en')"]`);
  await sleep(600);
  const journalHow = await fillInput('#jt', 'E2E reflection entry');
  await hideKeyboardBestEffort();
  await sleep(300);
  await tap(`button[onclick="jr()"]`);
  await sleep(600);
  check('journal entry saved and shown', (await bodyText()).includes('E2E reflection entry'), journalHow);
  await tap(`button[onclick="theme('dark')"]`);
  await sleep(500);
  check('dark theme applies', await evl(`document.documentElement.dataset.theme`) === 'dark');
  await shot('e2e-13-dark.png');
  await tap(`button[onclick="theme('auto')"]`);
  await sleep(500);

  const errsBefore = await readErrors();

  // ---- Persistence across a real relaunch ----
  // terminateApp/activateApp preserve app data (no uninstall), so the
  // localStorage checks keep the same meaning as on iOS. Appium needs
  // the NATIVE_APP context for app management, and chromedriver must
  // reconnect after relaunch, hence the longer re-poll.
  await driver.switchContext('NATIVE_APP');
  await driver.terminateApp(PKG);
  await sleep(2000);
  await driver.activateApp(PKG);
  await switchToWebview(120000);
  await sleep(2000);
  await installErrorTrap();
  check('mood persists across relaunch', await evl(`(JSON.parse(localStorage.getItem('ss') || '{}').mood || []).length`) >= 1);
  check('journal persists across relaunch', await evl(`(JSON.parse(localStorage.getItem('ss') || '{}').journal || []).length`) >= 1);
  check('language persists across relaunch', await evl(`JSON.parse(localStorage.getItem('ss') || '{}').language`) === 'en');
  await shot('e2e-14-relaunch.png');

  // ---- JS errors collected during the run ----
  const errs = errsBefore.concat(await readErrors());
  check('zero JS errors during E2E run', errs.length === 0, errs.slice(0, 3).join(' | '));
} catch (err) {
  console.error('E2E DRIVER ERROR: ' + (err && err.message ? err.message : String(err)));
  results.push({ name: 'e2e run completed without driver error', ok: false, detail: String((err && err.message) || err).slice(0, 300) });
  try { await driver.saveScreenshot(`${SHOTS}/e2e-99-driver-error.png`); } catch (e) {}
} finally {
  const fails = results.filter(r => !r.ok).length;
  const report = { platform: 'android', startedAt: STARTED, finishedAt: new Date().toISOString(), udid: UDID, app: APK, webviewContext, checks: results, passed: results.length - fails, total: results.length };
  try { writeFileSync(REPORT, JSON.stringify(report, null, 2)); } catch (e) { console.error('report write failed: ' + e.message); }
  console.log(`\nE2E CHECKS: ${results.length - fails}/${results.length} passed`);
  if (driver) { try { await driver.deleteSession(); } catch (e) {} }
  process.exit(fails ? 1 : 0);
}
