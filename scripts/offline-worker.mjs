/** The protocol is deliberately read-only: a page cannot activate a waiting update. */
export function offlineWorker(fingerprint, assets, hashes) {
  return `
const EDITION=${JSON.stringify(fingerprint)};
const CACHE='drawindow-offline-'+EDITION;
const FILES=${JSON.stringify(assets)};
const HASHES=${JSON.stringify(hashes)};
const urls=FILES.map(p=>new URL('./'+p,self.registration.scope).href);
let firstInstall=false;
async function verify(cache, hashContents=false) {
  for(let i=0;i<urls.length;i++) {
    const response=await cache.match(urls[i],{ignoreVary:true});
    if(!response || !response.ok) return false;
    if(!hashContents) continue;
    const digest=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
    const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(hex!==HASHES[i]) return false;
  }
  return true;
}
self.addEventListener('install',e=>e.waitUntil((async()=>{
  firstInstall=!self.registration.active;
  const existed=(await caches.keys()).includes(CACHE);
  try {
    const cache=await caches.open(CACHE);
    // addAll is atomic; no active edition is touched on network/quota failure.
    await cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})));
    if(!await verify(cache,true)) throw Error('Offline asset integrity failure');
  } catch(error) {
    if(!existed) await caches.delete(CACHE);
    throw error;
  }
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  // First installation controls its loading page. Updates activate naturally
  // only after all old clients close; no surprise takeover during a game.
  if(firstInstall) await self.clients.claim();
  // Retain previous editions: an older tab may still request its own assets.
})()));
self.addEventListener('message',e=>{
  if(e.data?.type!=='DRAWINDOW_OFFLINE_VERIFY' || !e.ports?.[0])return;
  e.waitUntil((async()=>{
    let complete=false;
    try { if((await caches.keys()).includes(CACHE)) complete=await verify(await caches.open(CACHE)); } catch {}
    e.ports[0].postMessage({edition:EDITION,complete});
  })());
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url),s=new URL(self.registration.scope);
  if(u.origin!==self.location.origin){e.respondWith(Response.error());return;}
  if(!u.pathname.startsWith(s.pathname))return;
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    return e.request.mode==='navigate'
      ?(await c.match(new URL('./index.html',s).href,{ignoreVary:true})||Response.error())
      :(await c.match(e.request,{ignoreSearch:true,ignoreVary:true})||Response.error());
  })());
});
`;
}
