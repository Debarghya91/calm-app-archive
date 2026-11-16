// Same-origin web API. Native builds require an HTTPS backend origin in config.js.
const API_BASE=(window.SOULSPACE_API||'').replace(/\/$/,'');
let TOKEN=null;try{TOKEN=localStorage.getItem('ss_token')}catch(e){}
let ME=null;let AI_STATUS='Checking connection…';
async function call(path,method='GET',data){
 const headers={...(data?{'content-type':'application/json'}:{}),...(TOKEN?{authorization:'Bearer '+TOKEN}:{})};
 const r=await fetch(API_BASE+path,{method,headers,body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Request failed'),{status:r.status});return j;
}
function setToken(t){TOKEN=t;try{t?localStorage.setItem('ss_token',t):localStorage.removeItem('ss_token')}catch(e){}}
async function authSubmit(mode){
 const email=$('#em').value.trim(),password=$('#pw').value;$('#ae').textContent='';
 try{const j=await call('/api/auth/'+mode,'POST',{email,password,name:$('#nm')?.value||''});setToken(j.token);ME=j.user;await pull();render()}
 catch(e){$('#ae').textContent=e.status?e.message:'Cannot reach SoulSpace. Check your connection and try again.'}
}
async function pull(){
 try{
  // Idempotent first sync preserves entries created on this device before account sign-in.
  S.mood=S.mood.map(m=>({...m,key:m.key||`m-${m.t}-${m.v}`}));
  S.journal=S.journal.map(x=>({...x,key:x.key||`j-${x.t}`}));
  diaryL=diaryL.map(x=>({...x,key:x.key||`s-${x.t}`}));
  await call('/api/sync','POST',{
   moods:S.mood.slice(-1000).map(m=>({v:m.v,t:m.t,key:m.key})),
   journal:S.journal.slice(-1000).map(x=>({body:x.x,t:x.t,key:x.key})),
   sleep:diaryL.slice(-500).map(x=>({hours:x.h,quality:x.q,note:x.note||'',t:x.t,key:x.key})),
   favorites:S.fav,progress:S.done
  });
  const j=await call('/api/sync');ME=j.user;
  S.mood=(j.moods||[]).map(m=>({v:m.v,t:m.t,d:new Date(m.t).toDateString(),key:m.source_key||`m-${m.t}-${m.v}`}));
  S.journal=(j.journal||[]).map(x=>({x:x.body,t:x.t,key:x.source_key||`j-${x.t}`}));
  S.fav=(j.favorites||[]).map(String);S.done={};(j.progress||[]).forEach(p=>S.done[p.content_id]=p.count);
  S.consent=!!ME.memory_consent;S.chat=S.consent?(j.chat||[]).map(m=>({r:m.role==='user'?'me':'bot',x:m.content,t:m.t})):[];if(Array.isArray(j.sleep)){diaryL=j.sleep.map(x=>({h:x.hours,q:x.quality,t:x.t,note:x.note||'',key:x.source_key||`s-${x.t}`}));try{localStorage.setItem('ssd',JSON.stringify(diaryL))}catch(e){}}
  save();return true;
 }catch(e){if(e.status===401){setToken(null);ME=null}return false}
}
async function setConsent(v){
 S.consent=!!v;if(!v){S.chat=[];if(typeof SESSION_TURNS!=='undefined')SESSION_TURNS=[];}save();
 if(ME){try{await call('/api/me','PUT',{memory_consent:!!v})}catch(e){S.consent=!v;save();alert('Could not update your account preference. Please try again.');}}
 render();
}
async function logout(){try{await call('/api/auth/logout','POST')}catch(e){}setToken(null);ME=null;S.chat=[];S.consent=false;save();render()}
const push=(p,d)=>{if(TOKEN)call(p,'POST',d).catch(()=>{})};
async function clearCloudChat(){if(!ME||!S.consent)return;try{await call('/api/chat/history','DELETE')}catch(e){alert('Could not clear cloud conversation history. Please try again.')}}
async function delAccount(){if(!confirm('Permanently delete your account and all cloud data?'))return;try{await call('/api/account','DELETE');setToken(null);ME=null;localStorage.removeItem('ss');location.reload()}catch(e){alert('Could not delete account: '+e.message)}}
async function expCloud(){try{const j=await call('/api/account/export');const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify(j,null,2)],{type:'application/json'}));a.href=u;a.download='soulspace-account.json';a.click();URL.revokeObjectURL(u)}catch(e){alert('Export failed: '+e.message)}}
async function checkService(){
 try{const r=await fetch(API_BASE+'/health',{signal:AbortSignal.timeout(5000)});const j=await r.json();AI_STATUS=j.ai_configured?'AI companion connected':'Offline companion available';}
 catch(e){AI_STATUS='Offline companion available'}
 if(tab==='chat'){const s=$('#ai-status');if(s)s.textContent=AI_STATUS}
}
async function loadRemoteContent(){
 try{const r=await fetch(API_BASE+'/api/content',{signal:AbortSignal.timeout(10000)});if(!r.ok)return;const j=await r.json();REMOTE_CONTENT=Array.isArray(j.items)?j.items:[];if(tab==='disc')render()}
 catch(e){REMOTE_CONTENT=[]}
}
loadRemoteContent();checkService();
if(TOKEN)pull().then(ok=>{if(ok)render()});

let adminItems=[];
async function adminLoad(){
 if(!ME||!['admin','editor'].includes(ME.role))return;
 const list=$('#admincontent'),stats=$('#adminstats');if(list)list.innerHTML='<p class="mute">Loading…</p>';
 try{
  const co=await call('/api/admin/content');
  const st=ME.role==='admin'?await call('/api/admin/stats'):null;
  adminItems=co.items||[];
  if(stats)stats.innerHTML=st?[['Users',st.users],['Library resources',st.content],['Mood check-ins',st.moods],['Journal entries',st.journal],['Safety events',st.safety_events],['New users · 7 days',st.signups_7d]].map(x=>`<div class="stat-card"><b>${Number(x[1]||0).toLocaleString()}</b><small>${esc(x[0])}</small></div>`).join(''):'';
  if(list)list.innerHTML=adminItems.map(x=>`<article class="admin-resource"><div><b>${esc(x.title)}</b><p>${esc(x.kind)} · ${esc(x.category||'Uncategorised')} · ${esc(x.tier)} · ${x.published?'Published':'Draft'}</p><small>${esc(x.license||'Licence missing')}</small></div><div class="admin-actions"><button class="alt" onclick="adminEdit(${x.id})">Edit</button><button class="alt" onclick="adminToggle(${x.id})">${x.published?'Unpublish':'Publish'}</button><button class="danger-button" onclick="adminDelete(${x.id})">Delete</button></div></article>`).join('')||'<p class="empty">No media resources yet. Add only content with documented distribution rights.</p>';
 }catch(e){if(list)list.innerHTML=`<p class="error-text">${esc(e.message)}</p>`}
}
function adminReset(){
 ['content-id','content-title','content-category','content-url','content-thumb','content-duration','content-description','content-license'].forEach(id=>{const x=$('#'+id);if(x)x.value=id==='content-duration'?'5':''});
 $('#content-kind').value='audio';$('#content-lang').value='en';$('#content-tier').value='free';$('#content-published').checked=false;$('#content-form-title').textContent='Add a library resource';$('#content-submit').textContent='Save resource';$('#admin-error').textContent='';
}
function adminEdit(id){
 const x=adminItems.find(i=>i.id===id);if(!x)return;
 $('#content-id').value=x.id;$('#content-title').value=x.title;$('#content-kind').value=x.kind;$('#content-category').value=x.category||'';$('#content-url').value=x.url;$('#content-thumb').value=x.thumb||'';$('#content-lang').value=x.lang||'en';$('#content-duration').value=x.duration||0;$('#content-description').value=x.description||'';$('#content-license').value=x.license||'';$('#content-tier').value=x.tier||'free';$('#content-published').checked=!!x.published;$('#content-form-title').textContent='Edit library resource';$('#content-submit').textContent='Update resource';window.scrollTo({top:0,behavior:'smooth'});
}
async function adminSave(e){
 e.preventDefault();const id=$('#content-id').value;
 const data={title:$('#content-title').value.trim(),kind:$('#content-kind').value,category:$('#content-category').value.trim(),url:$('#content-url').value.trim(),thumb:$('#content-thumb').value.trim(),lang:$('#content-lang').value.trim(),duration:Number($('#content-duration').value),description:$('#content-description').value.trim(),license:$('#content-license').value.trim(),tier:$('#content-tier').value,published:$('#content-published').checked};
 try{await call('/api/admin/content',id?'PUT':'POST',id?{...data,id:Number(id)}:data);adminReset();await adminLoad();$('#admin-error').textContent='Saved.'}
 catch(err){$('#admin-error').textContent=err.message}
}
async function adminToggle(id){const x=adminItems.find(i=>i.id===id);if(!x)return;try{await call('/api/admin/content','PUT',{...x,published:!x.published});await adminLoad()}catch(e){alert(e.message)}}
async function adminDelete(id){if(!confirm('Permanently delete this library resource?'))return;try{await call('/api/admin/content?id='+id,'DELETE');await adminLoad()}catch(e){alert(e.message)}}

function setLanguage(value){
 if(!['en','hinglish','hi','bn'].includes(value))return;
 S.language=value;save();render();
}
