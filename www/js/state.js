const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let S={mood:[],journal:[],fav:[],done:{},chat:[],consent:false,insightMode:true,language:'en',activityFeedback:{},theme:'auto',plan:'free',program:null};
try{Object.assign(S,JSON.parse(localStorage.getItem('ss')||'{}'))}catch(e){}
S.mood=Array.isArray(S.mood)?S.mood:[];S.journal=Array.isArray(S.journal)?S.journal:[];S.fav=Array.isArray(S.fav)?S.fav:[];S.chat=Array.isArray(S.chat)?S.chat:[];S.done=S.done&&typeof S.done==='object'?S.done:{};S.activityFeedback=S.activityFeedback&&typeof S.activityFeedback==='object'?S.activityFeedback:{};S.language=['en','hinglish','hi','bn'].includes(S.language)?S.language:'en';
const save=()=>{try{localStorage.setItem('ss',JSON.stringify(S))}catch(e){}};
if(S.theme!=='auto')document.documentElement.dataset.theme=S.theme;
const TABS=[['home','Home','⌂'],['chat','Companion','✦'],['disc','Explore','◎'],['sleep','Sleep','☾'],['me','You','☺']];
let tab='home';
function go(t){if(!V[t])return;tab=t;render();window.scrollTo({top:0,behavior:'smooth'})}
$('#nav').innerHTML=TABS.map(t=>`<button data-t="${t[0]}" onclick="go('${t[0]}')" aria-current="${t[0]==='home'?'page':'false'}"><span aria-hidden="true">${t[2]}</span>${t[1]}</button>`).join('');
