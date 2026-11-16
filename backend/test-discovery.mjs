import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../www/js/content.js',import.meta.url),'utf8');
const context={S:{activityFeedback:{}},save(){}};
vm.createContext(context);
vm.runInContext(source+'\nglobalThis.__discovery={inferEmotionalSpace,recommend,C};',context);
const {inferEmotionalSpace,recommend,C}=context.__discovery;
const cases=[
 ['I keep cancelling plans and stopped replying to people','alone'],
 ['I feel empty and do not enjoy anything','low'],
 ['My mind will not stop and I keep worrying','anxious'],
 ['I keep snapping at everyone over small things','irritable'],
 ['Since the breakup I replay everything','changed'],
 ['I feel off and cannot explain it','blank'],
 ['I wake up tired and cannot switch off','drained']
];
for(const [text,expected] of cases){
 const actual=inferEmotionalSpace(text).key;
 assert.equal(actual,expected,`${text} => expected ${expected}, got ${actual}`);
}
assert.equal(recommend('I feel lonely')[0].id,'ln1');
context.S.activityFeedback.ln1='not-helpful';
context.S.activityFeedback.lon2='helpful';
assert.equal(recommend('I feel lonely')[0].id,'lon2','positive user feedback should influence future suggestions');
assert.ok(C.length>=25);

// Exercise the three-step UI state machine with a lightweight dialog stub.
const dialog={innerHTML:'',open:false,showModal(){this.open=true},close(){this.open=false}};
const textInput={value:''};
const chatContext={C,DISCOVERY:undefined,globalThis:null};
chatContext.globalThis=chatContext;
chatContext.$=(selector)=>selector==='#dlg'?dialog:selector==='#discovery-text'?textInput:null;
chatContext.esc=(value)=>String(value??'').replace(/[&<>"']/g,'');
chatContext.inferEmotionalSpace=inferEmotionalSpace;
chatContext.hasCrisisSignal=(text)=>/want to die|suicid|self[- ]?harm|can't go on/i.test(text);
chatContext.crisis=()=>{chatContext.crisisOpened=true};
vm.createContext(chatContext);
vm.runInContext(fs.readFileSync(new URL('../www/js/chat.js',import.meta.url),'utf8'),chatContext);
chatContext.startDiscovery();
chatContext.chooseDiscovery('alone');
chatContext.chooseDiscovery('d2');
chatContext.chooseDiscovery('months');
assert.match(dialog.innerHTML,/Connection and belonging/);
assert.match(dialog.innerHTML,/few months or longer/);
assert.match(dialog.innerHTML,/One small connection/);
chatContext.startDiscovery();
textInput.value='I keep cancelling plans and stopped replying to people';
chatContext.discoveryFreeText();
chatContext.chooseDiscovery('weeks');
assert.match(dialog.innerHTML,/Connection and belonging/);
assert.match(dialog.innerHTML,/for a few weeks/);
const total=cases.length+3+5;
console.log(`passed=${total} failed=0`);

