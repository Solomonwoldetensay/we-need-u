const CACHE='wnu-v3';
const ASSETS=['./app.html','./icon.png','./manifest.json'];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(ASSETS.map(function(url){
        return c.add(url).catch(function(){});
      }));
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){return k!==CACHE;})
            .map(function(k){return caches.delete(k);})
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch',function(e){
  // Only handle GET requests
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  if(url.origin!==self.location.origin||url.pathname.endsWith('/env.js'))return;
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r||fetch(e.request).catch(function(){
        return caches.match('./app.html');
      });
    })
  );
});
