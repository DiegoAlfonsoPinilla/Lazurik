// Cambia VERSION en cada release para limpiar cachés viejas.
const VERSION='0.2.0',C='lazurik-'+VERSION;
const F=['index.html','manifest.json','assets/logo.svg','src/css/style.css','src/css/icons.css','src/js/icons.js','src/js/app.js','src/js/memory.js','src/js/storage.js','src/js/pwa.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
// Red primero (siempre la versión nueva); sin internet usa la caché.
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request)))});
