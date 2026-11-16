// Provider tests: Groq/OpenRouter selection and the OpenAI-compatible chat
// path, exercised against a local stub upstream (no real provider call, no
// real key). Run via backend/test.sh. Prints "passed=N failed=0" on success.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

let passed = 0, failed = 0;
const check = (name, fn) => { try { fn(); passed++; } catch (e) { failed++; console.log('FAIL', name, '-', e.message); } };

// 1. Static checks: endpoints, default model, no hardcoded secrets.
const server = fs.readFileSync(new URL('./server.js', import.meta.url), 'utf8');
check('groq endpoint present', () => assert.match(server, /api\.groq\.com\/openai\/v1\/chat\/completions/));
check('openrouter endpoint present', () => assert.match(server, /openrouter\.ai\/api\/v1\/chat\/completions/));
check('groq default model', () => assert.match(server, /openai\/gpt-oss-120b/));
check('no hardcoded api key', () => assert.doesNotMatch(server, /gsk_[A-Za-z0-9]|sk-ant-[A-Za-z0-9]/));

// 2. Stub upstream mimicking Groq's OpenAI-compatible chat completions.
// failModel, when set, makes the stub answer 429 for that model only.
const seen = [];
let failModel = '';
const stub = http.createServer((req, res) => {
  let d = '';
  req.on('data', c => { d += c; });
  req.on('end', () => {
    const b = JSON.parse(d || '{}');
    seen.push({auth: req.headers.authorization, model: b.model, messages: b.messages});
    if (failModel && b.model === failModel) {
      res.writeHead(429, {'content-type': 'application/json'});
      res.end(JSON.stringify({error: {message: 'rate limited'}}));
      return;
    }
    const last = (b.messages || []).at(-1)?.content || '';
    const isRisk = /Classify whether/.test((b.messages || [])[0]?.content || '');
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify({choices: [{message: {content: isRisk ? 'SAFE' : 'Stub reply to: ' + last.slice(0, 40)}}]}));
  });
});
await new Promise(r => stub.listen(0, '127.0.0.1', r));
const stubPort = stub.address().port;

async function startServer(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-prov-'));
  const port = 18900 + Math.floor(Math.random() * 90);
  const child = spawn('node', ['server.js'], {
    cwd: new URL('.', import.meta.url).pathname,
    env: {...process.env, PORT: String(port), DB_FILE: path.join(dir, 't.db'), ...env},
    stdio: 'ignore',
  });
  const base = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(base + '/health'); if (r.ok) break; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  return {child, base, dir};
}
async function stopServer(s) { s.child.kill(); fs.rmSync(s.dir, {recursive: true, force: true}); }

// 3. Groq selected by key presence; /health is honest.
const groq = await startServer({GROQ_API_KEY: 'gsk_test_dummy', AI_BASE_URL: `http://127.0.0.1:${stubPort}/chat`});
try {
  const h = await (await fetch(groq.base + '/health')).json();
  check('health reports groq provider', () => { assert.equal(h.ai_configured, true); assert.equal(h.provider, 'groq'); });
  const reg = await (await fetch(groq.base + '/api/auth/register', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({email: 'g@test.com', password: 'longenough1'})})).json();
  const chat = await (await fetch(groq.base + '/api/chat', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + reg.token}, body: JSON.stringify({messages: [{role: 'user', content: 'I feel a bit low today'}]})})).json();
  check('groq chat round trip via stub', () => { assert.equal(chat.crisis, false); assert.match(chat.reply, /Stub reply to: I feel a bit low today/); });
  check('stub received bearer key and default model', () => {
    const call = seen.find(s => s.model === 'openai/gpt-oss-120b');
    assert.ok(call, 'expected a call with the default Groq model');
    assert.equal(call.auth, 'Bearer gsk_test_dummy');
    assert.equal(call.messages[0].role, 'system');
  });
} finally { await stopServer(groq); }

// 4. Explicit provider selection wins over key presence.
const forced = await startServer({AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'or_test_dummy', OPENROUTER_MODEL: 'some/model:free', GROQ_API_KEY: 'gsk_test_dummy', AI_BASE_URL: `http://127.0.0.1:${stubPort}/chat`});
try {
  const h = await (await fetch(forced.base + '/health')).json();
  check('explicit AI_PROVIDER=openrouter wins', () => { assert.equal(h.provider, 'openrouter'); assert.equal(h.ai_configured, true); });
} finally { await stopServer(forced); }

// 5. No keys at all: honest unconfigured state.
const bare = await startServer({GROQ_API_KEY: '', OPENROUTER_API_KEY: '', ANTHROPIC_API_KEY: '', AI_PROVIDER: ''});
try {
  const h = await (await fetch(bare.base + '/health')).json();
  check('no keys means unconfigured', () => assert.equal(h.ai_configured, false));
} finally { await stopServer(bare); }

// 6. Rate-limited primary falls back to the second free model.
failModel = 'openai/gpt-oss-120b';
seen.length = 0;
const fb = await startServer({GROQ_API_KEY: 'gsk_test_dummy', AI_BASE_URL: `http://127.0.0.1:${stubPort}/chat`});
try {
  const reg = await (await fetch(fb.base + '/api/auth/register', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({email: 'f@test.com', password: 'longenough1'})})).json();
  const chat = await (await fetch(fb.base + '/api/chat', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + reg.token}, body: JSON.stringify({messages: [{role: 'user', content: 'Fallback check please'}]})})).json();
  check('groq fallback reply succeeds after 429', () => { assert.equal(chat.crisis, false); assert.match(chat.reply, /Stub reply to: Fallback check please/); });
  check('fallback model was called', () => assert.ok(seen.some(s => s.model === 'openai/gpt-oss-20b'), 'expected a call to openai/gpt-oss-20b'));
} finally { await stopServer(fb); }

stub.close();
console.log(`passed=${passed} failed=${failed}`);
process.exit(failed ? 1 : 0);
