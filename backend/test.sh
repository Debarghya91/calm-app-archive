#!/bin/bash
# Portable backend integration tests; run from project root with `bash backend/test.sh`.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$(mktemp -d)"
export DB_FILE="$TMP_DIR/test.db" PORT=18801
node "$HERE/server.js" >"$TMP_DIR/server.log" 2>&1 &
P=$!
cleanup(){ kill "$P" 2>/dev/null || true; wait "$P" 2>/dev/null || true; rm -rf "$TMP_DIR"; }
trap cleanup EXIT
for i in {1..40}; do curl -sf "http://127.0.0.1:$PORT/health" >/dev/null && break; sleep .25; done
U="http://127.0.0.1:$PORT"; J='content-type: application/json'; pass=0; fail=0
chk(){ local name="$1" body="$2" expected="$3"; if [[ "$body" == *"$expected"* ]]; then pass=$((pass+1)); printf 'PASS %s\n' "$name"; else fail=$((fail+1)); printf 'FAIL %s -> %s\n' "$name" "$body"; fi; }
R=$(curl -s "$U/"); chk "serves app shell" "$R" "<title>SoulSpace"
R=$(curl -s "$U/js/chat.js"); chk "serves companion client" "$R" "async function ask"
R=$(curl -s "$U/privacy.html"); chk "serves privacy notice" "$R" "Information the app handles"
R=$(curl -s "$U/terms.html"); chk "serves terms page" "$R" "No diagnosis or treatment"
R=$(curl -s "$U/support.html"); chk "serves support page" "$R" "Tele-MANAS 14416"
R=$(curl -s "$U/sw.js"); chk "serves offline service worker" "$R" "url.pathname.startsWith('/api/')"
R=$(curl -s "$U/health"); chk "health endpoint reports AI configuration honestly" "$R" '"ai_configured":false'
R=$(curl -s -o /dev/null -w "%{http_code}" --path-as-is "$U/../../backend/server.js"); chk "blocks static path traversal" "$R" "404"
R=$(curl -s -i -XOPTIONS "$U/api/chat" -H "Origin: capacitor://localhost" -H "Access-Control-Request-Method: POST"); chk "Capacitor CORS preflight allowed" "$R" "access-control-allow-origin: capacitor://localhost"
R=$(curl -s -o /dev/null -w "%{http_code}" -XOPTIONS "$U/api/chat" -H "Origin: https://untrusted.example" -H "Access-Control-Request-Method: POST"); chk "untrusted CORS origin denied" "$R" "403"
R=$(curl -s -XPOST "$U/api/auth/register" -H "$J" -d '{"email":"a@b.com","password":"short"}'); chk "weak password rejected" "$R" "8+"
R=$(curl -s -XPOST "$U/api/auth/register" -H "$J" -d '{"email":"a@b.com","password":"longenough1","name":"Asha"}'); chk "register" "$R" '"token"'
T=$(echo "$R" | sed 's/.*"token":"\([a-f0-9]*\)".*/\1/'); A="authorization: Bearer $T"
R=$(curl -s -XPOST "$U/api/auth/register" -H "$J" -d '{"email":"a@b.com","password":"longenough1"}'); chk "duplicate email" "$R" "already"
R=$(curl -s -XPOST "$U/api/auth/login" -H "$J" -d '{"email":"a@b.com","password":"wrongpass1"}'); chk "bad login" "$R" "wrong"
R=$(curl -s -XPOST "$U/api/auth/login" -H "$J" -d '{"email":"a@b.com","password":"longenough1"}'); chk "login" "$R" '"token"'
R=$(curl -s "$U/api/me"); chk "unauthenticated blocked" "$R" "login required"
curl -s -XPOST "$U/api/mood" -H "$J" -H "$A" -d '{"v":4}' >/dev/null
R=$(curl -s -XPOST "$U/api/mood" -H "$J" -H "$A" -d '{"v":9}'); chk "mood validation" "$R" "1-5"
curl -s -XPOST "$U/api/journal" -H "$J" -H "$A" -d '{"body":"hello"}' >/dev/null
R=$(curl -s -XPOST "$U/api/sleep" -H "$J" -H "$A" -d '{"hours":7.5,"quality":4,"note":"Rested"}'); chk "sleep diary save" "$R" '"ok":true'
R=$(curl -s -XPOST "$U/api/sleep" -H "$J" -H "$A" -d '{"hours":20,"quality":8}'); chk "sleep diary validation" "$R" "hours must be 0-16"
R=$(curl -s -XPOST "$U/api/favorite" -H "$J" -H "$A" -d '{"content_id":"sl1"}'); chk "favorite on" "$R" "true"
R=$(curl -s "$U/api/sync" -H "$A"); chk "sync favourites and journal" "$R" '"favorites":["sl1"]'; chk "sync mood" "$R" '"v":4'; chk "sync sleep diary" "$R" '"hours":7.5'
BATCH='{"moods":[{"v":5,"t":1700000000000,"key":"m-local-1"}],"journal":[{"body":"local reflection","t":1700000000001,"key":"j-local-1"}],"sleep":[{"hours":6,"quality":3,"note":"local","t":1700000000002,"key":"s-local-1"}],"favorites":["an1"],"progress":{"an1":2}}'
curl -s -XPOST "$U/api/sync" -H "$J" -H "$A" -d "$BATCH" >/dev/null
curl -s -XPOST "$U/api/sync" -H "$J" -H "$A" -d "$BATCH" >/dev/null
R=$(curl -s "$U/api/sync" -H "$A"); chk "first-login sync merges local records" "$R" "local reflection"; chk "first-login sync merges progress" "$R" '"count":2'
CNT=$(node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.DB_FILE);console.log(d.prepare('select count(*) n from moods where source_key=\\'m-local-1\\'').get().n)")
chk "local sync keys prevent duplicate records" "$CNT" "1"
R=$(curl -s -XPOST "$U/api/admin/content" -H "$J" -H "$A" -d '{"title":"x","kind":"audio","url":"https://e.com/a.mp3","license":"CC0"}'); chk "non-admin cannot add content" "$R" "forbidden"
R=$(curl -s "$U/api/admin/stats" -H "$A"); chk "non-admin no stats" "$R" "forbidden"
node -e "const{DatabaseSync}=require('node:sqlite');new DatabaseSync(process.env.DB_FILE).exec(\"update users set role='admin'\")"
R=$(curl -s -XPOST "$U/api/admin/content" -H "$J" -H "$A" -d '{"title":"x","kind":"audio","url":"http://e.com/a.mp3","license":"CC0"}'); chk "http url rejected" "$R" "https"
R=$(curl -s -XPOST "$U/api/admin/content" -H "$J" -H "$A" -d '{"title":"Rain","kind":"audio","url":"https://e.com/a.mp3","license":"CC0","published":true}'); chk "admin adds content" "$R" '"id"'
ID=$(echo "$R" | sed 's/.*"id":\([0-9]*\).*/\1/')
R=$(curl -s "$U/api/admin/content" -H "$A"); chk "admin catalogue list" "$R" "Rain"
R=$(curl -s -XPUT "$U/api/admin/content" -H "$J" -H "$A" -d "{\"id\":$ID,\"title\":\"Rain updated\",\"kind\":\"audio\",\"url\":\"https://e.com/a.mp3\",\"license\":\"CC0\",\"published\":true}"); chk "admin updates content" "$R" '"ok":true'
R=$(curl -s "$U/api/content"); chk "public content list" "$R" "Rain"
R=$(curl -s -XDELETE "$U/api/admin/content?id=$ID" -H "$A"); chk "admin deletes content" "$R" '"ok":true'
node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.DB_FILE);d.prepare('INSERT INTO ai_usage(user_id,day,count) VALUES(?,?,20)').run(1,new Date().toISOString().slice(0,10))"
R=$(curl -s -XPOST "$U/api/chat" -H "$J" -H "$A" -d '{"messages":[{"role":"user","content":"Can you help me relax?"}]}'); chk "AI quota enforced without memory consent" "$R" "daily companion limit"
PAYLOAD=$(node -e "console.log(JSON.stringify({messages:[{role:'user',content:'x'.repeat(3001)}]}))")
R=$(curl -s -XPOST "$U/api/chat" -H "$J" -H "$A" -d "$PAYLOAD"); chk "oversized chat message rejected" "$R" "maximum 3000 characters"
R=$(curl -s -XPOST "$U/api/chat" -H "$J" -H "$A" -d '{"messages":[{"role":"user","content":"I want to die"}]}'); chk "crisis bypasses quota and AI key" "$R" '"crisis":true'
R=$(curl -s -XPOST "$U/api/chat" -H "$J" -H "$A" -d '{"messages":[{"role":"user","content":"I do not want to die"}]}'); chk "negated risk phrase avoids keyword false positive" "$R" "daily companion limit"
R=$(curl -s "$U/api/admin/stats" -H "$A"); chk "safety event logged" "$R" '"safety_events":1'
R=$(curl -s -XPOST "$U/api/billing/checkout" -H "$J" -H "$A" -d '{}'); chk "payments honest 501" "$R" "not configured"
R=$(curl -s "$U/api/account/export" -H "$A"); chk "export" "$R" "a@b.com"
R=$(curl -s -XDELETE "$U/api/chat/history" -H "$A"); chk "clear chat history" "$R" '"ok":true'
R=$(curl -s -XDELETE "$U/api/account" -H "$A"); chk "delete account" "$R" '"ok":true'
R=$(curl -s "$U/api/me" -H "$A"); chk "deleted user session dead" "$R" "login required"
CNT=$(node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.DB_FILE);console.log(d.prepare('select (select count(*) from moods)+(select count(*) from journal)+(select count(*) from favorites)+(select count(*) from ai_usage) n').get().n)")
chk "user data cascaded" "$CNT" "0"
R=$(node "$HERE/test-discovery.mjs" 2>&1); chk "indirect emotional signal mapping unit tests" "$R" "passed=15 failed=0"
R=$(node "$HERE/test-clinical.mjs" 2>&1); chk "psychology-informed content and clinical boundary tests" "$R" "passed=16 failed=0"
R=$(grep -F "People may describe emotional difficulty indirectly" "$HERE/server.js"); chk "AI companion is instructed to notice indirect emotional signals" "$R" "sleep changes"
R=$(grep -F "const CRISIS_INDIRECT=" "$HERE/../www/js/crisis.js"); chk "discovery free text also catches indirect crisis phrases" "$R" "no way out"
R=$(grep -F "I can’t quite explain how I feel" "$HERE/../www/js/views.js"); chk "emotional discovery is reachable from Home" "$R" "startDiscovery()"
R=$(node "$HERE/test-conversation-patterns.mjs" 2>&1); chk "multi-turn conversation pattern reflection" "$R" "passed=8 failed=0"
R=$(node "$HERE/test-language.mjs" 2>&1); chk "multilingual companion and crisis copy tests" "$R" "passed=15 failed=0"
R=$(node "$HERE/test-providers.mjs" 2>&1); chk "free AI provider selection and Groq chat path (stub upstream)" "$R" "failed=0"
echo "passed=$pass failed=$fail"
[[ "$fail" -eq 0 ]]
