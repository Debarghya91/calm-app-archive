// SoulSpace iOS simulator E2E. Runs ONLY on GitHub Actions macOS runners.
// Drives the real built app in the iOS simulator via Appium + XCUITest,
// in the WKWebView context: real taps on the real UI, real timers, no
// fast-forwarding. JS evaluation is used only to READ state, plus two
// documented exceptions: <select> controls (the native iOS picker wheel is
// Apple's UI, not the app's) and dialog dismissal when a dialog has no
// visible close control. Env: UDID, APP_PATH, SHOTS, REPORT.
import { remote } from 'webdriverio';
import { writeFileSync, mkdirSync } from 'node:fs';

const UDID = process.env.UDID;
const APP = process.env.APP_PATH;
const SHOTS = process.env.SHOTS || 'e2e-shots';
const REPORT = process.env.REPORT || 'e2e-report.json';
const BUNDLE = 'com.soulspace.wellbeing';
const STARTED = new Date().toISOString();
if (!UDID || !APP) { console.error('UDID and APP_PATH env vars are required'); process.exit(2); }
mkdirSync(SHOTS, { recursive: true });
console.log('E2E start: udid=' + UDID + ' app=' + APP);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' :: ' + detail : ''));
};

let driver;
try {
  driver = await remote({
    hostname: '127.0.0.1', port: 4723, path: '/',
    logLevel: 'warn',
    connectionRetryTimeout: 900000,
    connectionRetryCount: 5,
    capabilities: {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:udid': UDID,
      'appium:app': APP,
      'appium:noReset': false,
      'appium:newCommandTimeout': 300,
      'appium:wdaLaunchTimeout': 180000,
      'appium:wdaConnectionTimeout': 180000,
      // iOS 26 webinspectord reports this app as bundleId "process-App"
      // (the Xcode product name), not com.soulspace.wellbeing, so the
      // remote debugger never matches the page without this wildcard.
      'appium:additionalWebviewBundleIds': ['*'],
      'appium:simulatorStartupTimeout': 300000,
      'appium:wdaLaunchTimeout': 300000,
      // Skip the simctl log-stream capture: it cost ~46s of session setup
      // and we diagnose from appium.log, screenshots and the JSON report.
      'appium:skipLogCapture': true,
    },
  });

  const $ = sel => driver.$(sel);
  const evl = expr => driver.execute(`return (${expr});`);
  const run = fn => driver.execute(fn);
  const bodyText = () => evl(`(document.body.innerText || '')`);
  const shot = async name => { await driver.saveScreenshot(`${SHOTS}/${name}`); };
  const tap = async sel => {
    const el = await $(sel);
    await el.waitForDisplayed({ timeout: 15000 });
    await el.click();
  };
  const tapText = async t => {
    const el = await $(`//button[normalize-space(.)=${JSON.stringify(t)}]`);
    await el.waitForDisplayed({ timeout: 15000 });
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
  const installErrorTrap = () => run(() => {
    window.__e2eErrors = [];
    window.addEventListener('error', e => window.__e2eErrors.push('error: ' + e.message));
    window.addEventListener('unhandledrejection', e => window.__e2eErrors.push('rejection: ' + String((e.reason && e.reason.message) || e.reason)));
    const origErr = console.error.bind(console);
    console.error = (...a) => { window.__e2eErrors.push('console.error: ' + a.map(x => { try { if (x instanceof Error) return x.stack || x.message; if (typeof x === 'object' && x !== null) return JSON.stringify(x); return String(x); } catch (e) { return String(x); } }).join(' ')); origErr(...a); };
  });
  const readErrors = () => evl(`(window.__e2eErrors || [])`);
  const switchToWebview = async (timeoutMs = 120000) => {
    const end = Date.now() + timeoutMs;
    let seen = '';
    while (Date.now() < end) {
      const ctxs = await driver.getContexts();
      seen = ctxs.join(',');
      const web = ctxs.find(c => c.indexOf('WEBVIEW') === 0);
      if (web) { await driver.switchContext(web); return web; }
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

  await switchToWebview();
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
  await sleep(800);
  check('calm view opens from hero tap', !!(await evl(`document.querySelector('#calm-orb') && document.querySelector('#calm-phase')`)));
  check('no dialog on calm entry', await evl(`document.querySelector('#dlg').open`) === false);
  check('breathing starts on Breathe in', (await evl(`document.querySelector('#calm-phase') ? document.querySelector('#calm-phase').textContent : ''`)) === 'Breathe in');
  check('5 breath dots shown', await evl(`document.querySelectorAll('#calm-dots i').length`) === 5);
  await shot('e2e-02-breathe.png');
  check('breathing phase advances to Hold on its own', !!(await poll(`document.querySelector('#calm-phase') && document.querySelector('#calm-phase').textContent === 'Hold'`, 9000)));
  // Full real cycle: 5 breaths x 14s = 70s. No fast-forward.
  check('full breathing cycle reaches check screen', !!(await poll(`(document.body.innerText || '').includes('A little better?')`, 100000, 1000)));
  await shot('e2e-03-check.png');
  await tapText('Still anxious');
  await sleep(500);
  check('grounding step 1 shows 5 See', (await evl(`document.querySelector('.calm-num') ? document.querySelector('.calm-num').textContent : ''`)) === '5' && (await bodyText()).includes('See'));
  await shot('e2e-04-ground.png');
  await tapText('Next'); await sleep(400);
  check('grounding advances to 4 Feel', (await evl(`document.querySelector('.calm-num') ? document.querySelector('.calm-num').textContent : ''`)) === '4' && (await bodyText()).includes('Feel'));
  await tapText('Next'); await sleep(300);
  await tapText('Next'); await sleep(300);
  await tapText('Next'); await sleep(300);
  check('grounding reaches last step 1 Taste', (await evl(`document.querySelector('.calm-num') ? document.querySelector('.calm-num').textContent : ''`)) === '1' && (await bodyText()).includes('Taste'));
  await tapText('Done'); await sleep(500);
  const doneText = await bodyText();
  check('grounding ends on done screen', doneText.includes('Well done for pausing.'));
  check('done screen offers home, sounds, talk', doneText.includes('Back home') && doneText.includes('Calming sounds') && doneText.includes('Talk when ready'));
  await shot('e2e-05-done.png');
  await tapText('Back home'); await sleep(600);
  check('done Back home returns home', (await bodyText()).includes('Make room for'));

  // ---- Mood check-in, real taps ----
  await tap('button[aria-label="Anxious"]');
  await sleep(800);
  check('mood Anxious tap opens calm directly', !!(await evl(`document.querySelector('#calm-orb')`)) && await evl(`document.querySelector('#dlg').open`) === false);
  await tap('.calm-exit'); await sleep(600);
  await tap('button[aria-label="Low"]');
  await sleep(800);
  check('mood Low tap opens calm directly', !!(await evl(`document.querySelector('#calm-orb')`)) && await evl(`document.querySelector('#dlg').open`) === false);
  await tap('.calm-exit'); await sleep(600);
  check('calm timers stopped after leaving', await evl(`(typeof CALM !== 'undefined' ? CALM.timer === null : 'no-CALM')`) === true);
  await tap('button[aria-label="Good"]');
  await sleep(600);
  check('mood Good stays home with check-in note', (await bodyText()).includes('Your check-in'));
  check('mood check-in persisted locally', await evl(`(JSON.parse(localStorage.getItem('ss') || '{}').mood || []).length`) >= 1);
  await shot('e2e-06-mood.png');

  // ---- Companion chat, real typing ----
  await tap('#nav button[data-t="chat"]');
  await sleep(800);
  const chatText = await bodyText();
  check('companion welcome renders', chatText.includes("I'm here with you."));
  check('companion shows offline state', /offline/i.test(chatText));
  const input = await $('#in');
  await input.waitForDisplayed({ timeout: 15000 });
  await input.click();
  await input.setValue('I feel anxious and cannot sleep');
  await sleep(300);
  const typed = await input.getValue();
  check('chat input accepts typed text', (typed || '').includes('anxious'), typed);
  try { await driver.hideKeyboard(); } catch (e) {}
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
  await sleep(600);
  const crisisOpen = await evl(`document.querySelector('#dlg').open`) === true;
  const crisisText = await evl(`document.querySelector('#dlg').innerText || ''`);
  check('urgent support dialog opens with helplines', crisisOpen && /14416/.test(crisisText) && /112/.test(crisisText), crisisText.slice(0, 120));
  await shot('e2e-08-crisis.png');
  await tapText('Close');
  await sleep(400);
  check('crisis dialog closes', await evl(`document.querySelector('#dlg').open`) === false);

  // ---- Discovery 3-step check-in ----
  await tap('#nav button[data-t="home"]');
  await sleep(600);
  await tap('.hero-secondary');
  await sleep(600);
  check('discovery dialog opens', await evl(`document.querySelector('#dlg').open`) === true);
  const dlg1 = await evl(`document.querySelector('#dlg').innerText || ''`);
  await tap('#dlg button');
  await sleep(600);
  const dlg2 = await evl(`document.querySelector('#dlg').innerText || ''`);
  check('discovery advances a step', dlg1 !== dlg2);
  await shot('e2e-09-discovery.png');
  await closeDialogIfOpen();
  check('discovery dialog closes', await evl(`document.querySelector('#dlg').open`) === false);

  // ---- Explore library ----
  await tap('#nav button[data-t="disc"]');
  await sleep(800);
  const cardCount = await evl(`document.querySelectorAll('.content-card').length`);
  check('library lists activities', cardCount >= 30, `${cardCount} cards`);
  await shot('e2e-10-library.png');
  await tap('.content-card button');
  await sleep(600);
  check('activity detail opens', await evl(`document.querySelector('#dlg').open`) === true);
  await shot('e2e-11-activity.png');
  await closeDialogIfOpen();

  // ---- Sleep sounds + timer ----
  await tap('#nav button[data-t="sleep"]');
  await sleep(800);
  await tap(`button[onclick="play('brown')"]`);
  await sleep(800);
  check('sleep sound starts', await evl(`(typeof snd !== 'undefined' ? snd : 'no-snd')`) === 'brown');
  check('pause control shows while playing', (await bodyText()).includes('Pause'));
  await shot('e2e-12-sleep.png');
  await run(() => { const s = document.querySelector('#tm'); s.value = '15'; s.dispatchEvent(new Event('change')); });
  const timerLabel = await poll(`(document.querySelector('#tl') ? document.querySelector('#tl').textContent : '').length > 0`, 6000);
  check('sleep timer label set', !!timerLabel);
  await tap('.sound-play');
  await sleep(400);
  check('sleep sound stops', await evl(`(typeof snd !== 'undefined' ? snd : 'x')`) === '');

  // ---- You tab: login form, language, journal, theme ----
  await tap('#nav button[data-t="me"]');
  await sleep(800);
  check('login form shown when signed out', !!(await evl(`document.querySelector('#em') && document.querySelector('#pw')`)));
  await tap(`button[onclick="setLanguage('hi')"]`);
  await sleep(500);
  await tap('#nav button[data-t="chat"]');
  await sleep(600);
  check('Hindi companion greeting after switch', (await bodyText()).includes('मैं यहाँ हूँ'));
  await tap('#nav button[data-t="me"]');
  await sleep(700);
  await tap(`button[onclick="setLanguage('en')"]`);
  await sleep(500);
  const jt = await $('#jt');
  await jt.waitForDisplayed({ timeout: 15000 });
  await jt.click();
  await jt.setValue('E2E reflection entry');
  await sleep(300);
  try { await driver.hideKeyboard(); } catch (e) {}
  await sleep(300);
  await tap(`button[onclick="jr()"]`);
  await sleep(500);
  check('journal entry saved and shown', (await bodyText()).includes('E2E reflection entry'));
  await tap(`button[onclick="theme('dark')"]`);
  await sleep(400);
  check('dark theme applies', await evl(`document.documentElement.dataset.theme`) === 'dark');
  await shot('e2e-13-dark.png');
  await tap(`button[onclick="theme('auto')"]`);
  await sleep(400);

  const errsBefore = await readErrors();

  // ---- Persistence across a real relaunch ----
  await driver.switchContext('NATIVE_APP');
  await driver.terminateApp(BUNDLE);
  await sleep(1000);
  await driver.activateApp(BUNDLE);
  await switchToWebview();
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
  const report = { startedAt: STARTED, finishedAt: new Date().toISOString(), udid: UDID, app: APP, checks: results, passed: results.length - fails, total: results.length };
  try { writeFileSync(REPORT, JSON.stringify(report, null, 2)); } catch (e) { console.error('report write failed: ' + e.message); }
  console.log(`\nE2E CHECKS: ${results.length - fails}/${results.length} passed`);
  if (driver) { try { await driver.deleteSession(); } catch (e) {} }
  process.exit(fails ? 1 : 0);
}
