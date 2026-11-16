import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../www/js/content.js',import.meta.url),'utf8');
const chatSource=fs.readFileSync(new URL('../www/js/chat.js',import.meta.url),'utf8');
const context={};vm.createContext(context);
vm.runInContext(source+'\nglobalThis.__analyze=analyzeConversationPattern;',context);
const analyze=context.__analyze;
const turns=[
 {r:'me',x:'I keep waking up at night and cannot switch off'},
 {r:'bot',x:'That sounds tiring.'},
 {r:'me',x:'The sleep has been poor and I feel exhausted'},
 {r:'me',x:'I am still awake for hours most nights'}
];
const found=analyze(turns);
assert.equal(found.key,'sleep');
assert.equal(found.count,3);
assert.equal(analyze(turns.slice(0,2)),null,'needs at least three user turns');
assert.equal(analyze([{r:'me',x:'I am tired'},{r:'me',x:'I am tired'}]),null,'needs three user turns and a repeated signal');
assert.equal(analyze([{r:'me',x:'I am worried about work'},{r:'me',x:'I keep overthinking'},{r:'me',x:'The what-if thoughts keep coming'}]).key,'worry');
assert.equal(analyze([{r:'me',x:'I like green tea'},{r:'me',x:'I watched a film'},{r:'me',x:'It rained today'}]),null);
assert.match(chatSource,/const source=conversationMessages\(\)/,'AI should receive current-session context even when memory is off');
assert.match(chatSource,/if\(!last\|\|last\.role!==\'user\'\|\|last\.content!==x\)history\.push/,'current user turn must not be duplicated in the AI context');
console.log('passed=8 failed=0');
