
// Emotional Discovery: gentle, non-diagnostic pattern finding before recommending a space.
const DISCOVERY={
 low:{label:'feeling low or heavy',space:'Low mood and self-kindness',tags:['sadness','self love','self criticism','mindfulness'],ids:['self1','self2','sp1'],follow:['It is harder to get started','Things I usually enjoy feel less interesting','I am being hard on myself','I feel close to tears']},
 anxious:{label:'feeling on edge or mentally overloaded',space:'Calming an overactive mind',tags:['anxiety','overthinking','stress','sleep'],ids:['an1','an2','focus1'],follow:['My thoughts keep racing','My body feels tense or restless','I keep expecting something to go wrong','It is affecting my sleep']},
 alone:{label:'feeling disconnected or alone',space:'Connection and belonging',tags:['lonely','loneliness','relationship'],ids:['ln1','lon2','bound1'],follow:['I have pulled away from people','I miss someone or a previous connection','I feel misunderstood','I can be around people and still feel alone']},
 irritable:{label:'feeling tense or easily irritated',space:'Emotional balance and boundaries',tags:['anger','irritation','boundaries','stress'],ids:['ang1','bound1','work1'],follow:['Small things are getting under my skin','I am holding in things I want to say','There is tension with someone','I feel overwhelmed by demands']},
 drained:{label:'feeling drained or unable to switch off',space:'Rest and recovery',tags:['sleep','racing thoughts','burnout','low energy'],ids:['sleep3','sl2','mot1'],follow:['I wake up tired','I cannot switch my mind off','I have too much on my plate','Even small tasks feel difficult']},
 changed:{label:'responding to something that changed or hurt',space:'Making sense of change or loss',tags:['grief','breakup','change','relationship'],ids:['br1','br2','gr1','change1'],follow:['I keep replaying what happened','I miss someone or something','I feel uncertain about what comes next','My routine or sense of self has changed']},
 blank:{label:'finding it hard to name what is happening',space:'Gentle emotional awareness',tags:['mindfulness','self compassion','awareness'],ids:['grat2','self1','sp1'],follow:['I feel numb or on autopilot','I cannot tell what I need','I do not feel much of anything','I feel something, but cannot put it into words']}
};
let discoveryState=null;
function startDiscovery(){
 discoveryState={step:0,primary:null,detail:null,detailFree:false,duration:null};
 renderDiscoveryQuestion();
}
function discoveryClose(){discoveryState=null;$('#dlg').close()}
function renderDiscoveryQuestion(){
 if(!discoveryState)return;
 const d=$('#dlg'),s=discoveryState;
 const progress=['A GENTLE CHECK-IN','GETTING A LITTLE CLOSER','UNDERSTANDING THE PATTERN'];
 let title='',copy='',options=[];
 if(s.step===0){
  title='You don’t have to know the name for it.';
  copy='Sometimes feelings show up as changes in sleep, energy, patience or the way we see ourselves. Which of these feels closest, even a little?';
  options=[['low','Heavy, flat or low'],['anxious','On edge, worried or overthinking'],['alone','Disconnected or alone'],['irritable','Irritated or overwhelmed'],['drained','Drained, tired or unable to switch off'],['changed','Something happened or changed'],['blank','I feel blank. I can’t explain it']];
 }else if(s.step===1){
  const p=DISCOVERY[s.primary];
  title='What have you been noticing most?';
  copy='There is no right answer. Choose the one that sounds most familiar, or skip it.';
  options=p.follow.map((x,i)=>['d'+i,x]);
 }else{
  title='How long has this been around?';
  copy='This helps us choose a gentle next step. It does not tell us what condition you may or may not have.';
  options=[['recent','It is quite recent'],['weeks','A few weeks'],['months','A few months or longer'],['waves','It comes and goes'],['unsure','I’m not sure']];
 }
 d.innerHTML=`<div class="discovery-dialog"><div class="discovery-top"><span class="eyebrow">${progress[s.step]}</span><button class="discovery-close" type="button" onclick="discoveryClose()" aria-label="Close">×</button></div><div class="discovery-progress"><i style="width:${(s.step+1)*33.333}%"></i></div><p class="discovery-step">A few gentle questions · ${s.step+1} of 3</p><h2>${title}</h2><p class="discovery-copy">${copy}</p><div class="discovery-options">${options.map(([value,label])=>`<button type="button" class="discovery-option" onclick="chooseDiscovery('${value}')">${label}<span>›</span></button>`).join('')}</div>${s.step===0?`<div class="discovery-own-words"><label for="discovery-text">Or tell us in your own words</label><textarea id="discovery-text" rows="2" maxlength="600" placeholder="For example: I keep cancelling plans and I don't know why…"></textarea><button type="button" class="alt" onclick="discoveryFreeText()">Continue with my words</button></div>`:''}<button type="button" class="discovery-skip" onclick="skipDiscovery()">Skip this question</button><p class="discovery-privacy">This is a reflection guide, not a psychological test or diagnosis. Your answers are not saved unless you choose to share the summary in chat.</p></div>`;
 if(!d.open)d.showModal();
}
function chooseDiscovery(value){
 if(!discoveryState)return;
 const s=discoveryState;
 if(s.step===0){s.primary=value;s.step=1;renderDiscoveryQuestion();return}
 if(s.step===1){s.detail=value;s.detailFree=false;s.step=2;renderDiscoveryQuestion();return}
 s.duration=value;finishDiscovery();
}
function discoveryFreeText(){
 const field=$('#discovery-text'),text=field?.value.trim();if(!text)return;
 if(hasCrisisSignal(text)){discoveryClose();crisis();return}
 const found=inferEmotionalSpace(text);discoveryState.primary=found.key||'blank';discoveryState.detail=text.slice(0,300);discoveryState.detailFree=true;discoveryState.step=2;renderDiscoveryQuestion();
}
function skipDiscovery(){
 if(!discoveryState)return;
 if(discoveryState.step===0){discoveryState.primary='blank';discoveryState.step=2}
 else if(discoveryState.step===1){discoveryState.detail=null;discoveryState.step=2}
 else{discoveryState.duration='unsure';finishDiscovery();return}
 renderDiscoveryQuestion();
}
function finishDiscovery(){
 const s=discoveryState,p=DISCOVERY[s.primary]||DISCOVERY.blank;
 const picked=(p.ids||[]).map(id=>C.find(x=>x.id===id)).filter(Boolean).slice(0,3);
 const detail=s.detail?(s.detailFree?s.detail:p.follow[Number(s.detail.slice(1))]):null;
 const detailText=detail?` You also mentioned: ${detail.toLowerCase()}.`:'';
 const durationLabels={recent:'This feels recent.',weeks:'You said it has been around for a few weeks.',months:'You said it has been around for a few months or longer.',waves:'You said it comes and goes.',unsure:'You are not sure how long it has been there.'};
 const summary=`From what you shared, it may be helpful to explore ${p.label}.${detailText} ${durationLabels[s.duration]||''} This is only a starting point, not a label or diagnosis.`;
 const supportNote=s.duration==='months'||s.duration==='weeks'?'Because this has been around for a while, consider speaking with a qualified mental-health professional if it is affecting daily life, getting worse or difficult to manage.': 'If this is affecting daily life, getting worse or feels difficult to manage, a qualified mental-health professional can help you explore it.';
 const d=$('#dlg');
 d.innerHTML=`<div class="discovery-result"><span class="eyebrow">A POSSIBLE PLACE TO START</span><div class="discovery-result-mark">✧</div><h2>${esc(p.space)}</h2><p>${esc(summary)}</p><div class="discovery-result-note"><b>Does this feel close?</b><p>It is okay if it only partly fits. You know your experience best. We can explore another direction instead.</p></div><h3>Gentle next steps</h3><div class="discovery-recommendations">${picked.map(c=>`<button type="button" class="discovery-resource" onclick="$('#dlg').close();openContent('${c.id}')"><span><b>${esc(c.t)}</b><small>${esc(c.d)} · ${esc(c.k)}</small></span><span>↗</span></button>`).join('')}</div><div class="discovery-result-actions"><button type="button" onclick="shareDiscovery()">Talk this through with my companion</button><button type="button" class="alt" onclick="startDiscovery()">Explore a different feeling</button><button type="button" class="discovery-skip" onclick="discoveryClose()">Maybe later</button></div><p class="discovery-privacy">${esc(supportNote)} SoulSpace cannot assess or diagnose a condition.</p></div>`;
 d.showModal();
}
function shareDiscovery(){
 if(!discoveryState)return;
 const s=discoveryState,p=DISCOVERY[s.primary]||DISCOVERY.blank;
 const text=`I used the SoulSpace reflection questions. I may be experiencing ${p.label}. ${s.detail?'What I noticed: '+(s.detailFree?s.detail:p.follow[Number(s.detail.slice(1))])+'. ':''}${s.duration&&s.duration!=='unsure'?'This has been going on: '+({recent:'recently',weeks:'for a few weeks',months:'for a few months or longer',waves:'in waves'}[s.duration])+'. ':''}I would like help exploring this gently, without assuming a diagnosis.`;
 discoveryState=null;$('#dlg').close();go('chat');setTimeout(()=>{const input=$('#in');if(input){input.value=text;input.focus()}},80);
}

// Current-session messages support gentle pattern reflection even when chat memory is off.
let SESSION_TURNS=[];
let LAST_REFLECTION_KEY=null;
function conversationMessages(){return S.consent?S.chat:SESSION_TURNS;}
function showConversationReflection(){
 if(S.insightMode===false||!$('#log'))return;
 const insight=analyzeConversationPattern(conversationMessages());
 if(!insight||insight.key===LAST_REFLECTION_KEY||document.querySelector('.conversation-insight'))return;
 LAST_REFLECTION_KEY=insight.key;
 const card=document.createElement('section');card.className='conversation-insight';
 card.innerHTML=`<div class="insight-kicker"><span>✧</span> A pattern I may be noticing</div><p>You’ve mentioned <b>${esc(insight.label)}</b> in a few parts of our conversation. I might be connecting things that don’t belong together, so please correct me if this doesn’t fit.</p><div class="insight-actions"><button type="button" class="insight-yes">That feels close</button><button type="button" class="alt insight-no">Not quite</button></div><button type="button" class="insight-off">Don’t show these reflections</button><small>This is a reflection of words in this chat, not an assessment. ${S.consent?'Chat memory is enabled.':'Nothing is saved from this chat unless you turn memory on.'}</small>`;
 card.querySelector('.insight-yes').onclick=()=>{const q=`You noticed I mentioned ${insight.label} more than once. That does feel relevant. Can you help me explore what is behind it, without assuming a diagnosis?`;card.remove();quickPrompt(q)};
 card.querySelector('.insight-no').onclick=()=>{card.remove();quickPrompt(`That reflection about ${insight.label} doesn't quite fit. Please don't assume it. Help me find a better way to describe what is happening.`)};
 card.querySelector('.insight-off').onclick=()=>{S.insightMode=false;save();card.remove()};
 $('#log').append(card);card.scrollIntoView({block:'nearest',behavior:'smooth'});
}

// AI companion: local crisis pattern check precedes any network call.
function offlineReply(t){
 const lang=S.language||'en';
 if(lang==='hi')return 'मैं आपकी बात सुन रहा/रही हूँ। मैं AI wellbeing companion हूँ, डॉक्टर या therapist नहीं। अभी आपके लिए सबसे मुश्किल क्या लग रहा है?';
 if(lang==='bn')return 'আমি আপনার কথা শুনছি। আমি একটি AI wellbeing companion, চিকিৎসক বা থেরাপিস্ট নই। এই মুহূর্তে আপনার কাছে সবচেয়ে কঠিন কী লাগছে?';
 if(lang==='hinglish')return 'Main aapki baat sun raha/rahi hoon. Main AI wellbeing companion hoon, doctor ya therapist nahi. Abhi sabse mushkil kya lag raha hai?';
 if(/(lonely|alone|no one)/i.test(t))return 'That sounds painful. Would it help to think of one safe, low-pressure connection you could make today? You do not have to solve everything at once.';
 if(/(breakup|broke up|heartbreak|my ex)/i.test(t))return 'Heartbreak can take up a lot of emotional space. We can take this slowly. What feels hardest right now: missing them, the change in routine, or what the breakup has made you think about yourself?';
 if(/(sleep|insomnia|awake)/i.test(t))return 'A difficult night can make everything feel heavier. Would you like a gentle wind-down idea, or would you rather talk about what is keeping you awake?';
 if(/(anxious|anxiety|stress|overthink|panic)/i.test(t))return 'That sounds exhausting. If it feels comfortable, let’s pause and notice your feet on the floor. What is the main thing your mind keeps returning to?';
 const signal=inferEmotionalSpace(t);
 if(signal.score>0){const label=(DISCOVERY[signal.key]||DISCOVERY.blank).label;return `I may be hearing that you are ${label}. I could be wrong, and you do not need to use that wording. What has changed most for you lately?`;}
 return 'Thank you for telling me. I’m here to listen without judgement. What has felt most difficult about this today?';
}
async function ask(x){
 const source=conversationMessages();
 const history=source.slice(-16).map(m=>({role:m.r==='me'?'user':'assistant',content:m.x}));
 const last=history[history.length-1];
 if(!last||last.role!=='user'||last.content!==x)history.push({role:'user',content:x});
 const r=await fetch((window.SOULSPACE_API||'')+'/api/chat',{method:'POST',headers:{'content-type':'application/json',...(TOKEN?{authorization:'Bearer '+TOKEN}:{})},body:JSON.stringify({messages:history,language:S.language||'en'}),signal:AbortSignal.timeout(25000)});
 const j=await r.json().catch(()=>({}));
 if(r.status===429)return{crisis:false,reply:j.error||'You have reached today’s AI limit. Crisis support remains free.'};
 if(!r.ok)throw new Error(j.error||'AI service unavailable');return j;
}
function addMessage(role,text){
 const el=document.createElement('div');el.className='msg '+(role==='me'?'me':'bot');el.textContent=text;$('#log').append(el);el.scrollIntoView({block:'nearest'});
 const entry={r:role,x:text,t:Date.now()};
 if(S.consent){S.chat.push(entry);save()}else SESSION_TURNS.push(entry);
}
async function send(e){
 e.preventDefault();const input=$('#in'),x=input.value.trim();if(!x)return;input.value='';addMessage('me',x);
 if(hasCrisisSignal(x)){addMessage('bot','I’m glad you told me. Your safety matters. Please reach a person now using the support options on screen.');crisis();return}
 const typing=document.createElement('div');typing.className='msg bot';typing.id='typing';typing.textContent='Thinking…';$('#log').append(typing);
 try{
  const j=await ask(x);typing.remove();addMessage('bot',j.reply||'I’m here with you.');
  if(j.crisis){crisis();return}
  showConversationReflection();
  const rec=recommend(x);if(rec.length){const wrap=document.createElement('div');wrap.className='suggestion-bubble';wrap.textContent='A gentle next step you could explore:';rec.forEach(c=>{const b=document.createElement('button');b.className='alt';b.textContent=c.t;b.onclick=()=>openContent(c.id);wrap.append(b)});$('#log').append(wrap)}
 }catch(err){typing.remove();addMessage('bot',offlineReply(x)+' (Offline support mode: the live AI service is unavailable right now.)');showConversationReflection()}
}
