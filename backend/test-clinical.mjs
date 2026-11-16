import fs from 'node:fs';
import assert from 'node:assert/strict';
const content=fs.readFileSync(new URL('../www/js/content.js',import.meta.url),'utf8');
const views=fs.readFileSync(new URL('../www/js/views.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('./server.js',import.meta.url),'utf8');
const checks=[];
function check(name,fn){try{fn();checks.push([name,true])}catch(e){checks.push([name,false,e.message])}}
for(const id of ['cbt1','ba1','ps1','act1','worry1','stop1']) check(`activity ${id} exists`,()=>assert.match(content,new RegExp(`id:'${id}'`)));
check('activities explain method and purpose',()=>{for(const id of ['cbt1','ba1','ps1','act1','worry1','stop1']){const i=content.indexOf(`id:'${id}'`),chunk=content.slice(i,content.indexOf('},',i));assert.match(chunk,/method:/);assert.match(chunk,/purpose:/);assert.match(chunk,/caution:/);assert.match(chunk,/basis:/)}});
check('guided steps render in activity detail',()=>assert.match(content,/c\.steps\.map/));
check('evidence and safety disclosure is reachable',()=>assert.match(views,/function clinicalInfo\(\)/));
check('WHO and NICE source links included',()=>{assert.match(views,/who\.int\/publications\/i\/item\/9789240003927/);assert.match(views,/nice\.org\.uk\/guidance\/NG222/)});
check('app does not claim clinical validation',()=>assert.match(views,/have not been clinically validated/));
check('AI cannot diagnose or prescribe',()=>{assert.match(server,/Never claim professional credentials, diagnose/);assert.match(server,/never advise changing a dose/)});
check('AI offers optional practices rather than treatment claims',()=>assert.match(server,/a complete clinical protocol/));
check('persistent or impairing symptoms prompt professional support',()=>assert.match(server,/persistent, worsening, significantly impair/));
check('India urgent support remains explicit',()=>{assert.match(server,/Tele-MANAS 14416/);assert.match(server,/112 for emergencies/)});
check('new service worker cache version',()=>assert.match(fs.readFileSync(new URL('../www/sw.js',import.meta.url),'utf8'),/soulspace-shell-v09/));
const failed=checks.filter(x=>!x[1]);for(const [n,ok,e] of checks)console.log(`${ok?'PASS':'FAIL'} ${n}${e?' -> '+e:''}`);console.log(`passed=${checks.length-failed.length} failed=${failed.length}`);if(failed.length)process.exit(1);
