const CACHE_NAME='darasty-shell-v20';
const APP_FILES=['./','./index.html','./style.css','./mockup-style-v5.css','./redesign.css','./page-navigation.js','./mockup-pages.js','./app.js','./app.js?v=20261022-2','./app.js?v=20261022-3','./supabase-config.js','./manifest.json','./darasty-192.png','./darasty-512.png','./study-scene-1.svg','./study-scene-2.svg','./study-scene-3.svg','./study-scene-4.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>Promise.all(APP_FILES.map(file=>cache.add(file).catch(()=>null)))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>{
    if(cached)return cached;
    if(event.request.mode==='navigate')return caches.match('./index.html');
    return Response.error();
  })));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    const open=windows.find(client=>new URL(client.url).origin===self.location.origin);
    return open?open.focus():self.clients.openWindow('./');
  }));
});
