const CACHE_NAME='darasty-shell-v9';
const APP_FILES=['./','./index.html','./style.css','./app.js','./supabase-config.js','./manifest.json','./darasty-192.png','./darasty-512.png','./study-scene-1.svg','./study-scene-2.svg','./study-scene-3.svg','./study-scene-4.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    const open=windows.find(client=>new URL(client.url).origin===self.location.origin);
    return open?open.focus():self.clients.openWindow('./');
  }));
});





