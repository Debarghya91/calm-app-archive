const CACHE='soulspace-shell-v09';
const SHELL=['/','/index.html','/css/app.css','/js/config.js','/js/state.js','/js/crisis.js','/js/content.js','/js/views.js','/js/api.js','/js/chat.js','/js/audio.js','/manifest.json','/assets/soulspace-icon.svg','/privacy.html','/terms.html','/support.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/index.html')));return;}
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
  if(res.ok&&['script','style','image','font'].includes(req.destination)){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
  return res;
 })));
});
