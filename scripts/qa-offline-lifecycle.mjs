// Real browser lifecycle with tiny deterministic assets. The full distribution's
// inference/audio/PNG path is covered separately by qa-offline-cold-start.mjs.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { offlineWorker } from './offline-worker.mjs';

let edition='first', broken=false;
const assets=['index.html','asset.bin'];
const data=['<!doctype html><title>Lifecycle fixture</title>','fixture asset'];
const hashes=data.map(s=>createHash('sha256').update(s).digest('hex'));
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/sw.js') { res.setHeader('Content-Type','text/javascript');res.end(offlineWorker(edition,assets,hashes));return; }
  const i=assets.indexOf(req.url==='/'?'index.html':req.url.slice(1));
  if(i<0 || (broken && i===1)){res.statusCode=503;res.end('unavailable');return;}
  res.setHeader('Content-Type',i===0?'text/html':'application/octet-stream');res.end(data[i]);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/';
let browser;
async function verification(page) {
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const timer=setTimeout(()=>reject(Error('Worker handshake timed out')),10000);
    channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};
    navigator.serviceWorker.controller.postMessage({type:'DRAWINDOW_OFFLINE_VERIFY'},[channel.port2]);
  }));
}
function expect(condition,message){if(!condition)throw Error(message);}
try {
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'allow'});
  const page=await context.newPage();await page.goto(url);
  await page.evaluate(()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  expect((await verification(page)).complete,'First installation incomplete');
  const second=await context.newPage();await second.goto(url);
  edition='broken';broken=true;
  await page.evaluate(async()=>{window.failedUpdate=false;const reg=await navigator.serviceWorker.getRegistration();reg.addEventListener('updatefound',()=>reg.installing.addEventListener('statechange',e=>{if(e.target.state==='redundant')window.failedUpdate=true;}));await reg.update();});
  await page.waitForFunction(()=>window.failedUpdate);
  expect((await verification(page)).edition==='first','Failed update replaced old edition');
  expect(await page.evaluate(async()=>!(await caches.keys()).includes('drawindow-offline-broken')),'Failed partial cache retained');
  broken=false;edition='second';
  await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
  expect((await verification(page)).edition==='first','Waiting update interrupted first tab');
  expect((await verification(second)).edition==='first','Waiting update interrupted second tab');
  await page.close();expect((await verification(second)).edition==='first','Closing one tab activated update');
  const activation=context.serviceWorkers().at(-1).evaluate(()=>new Promise(resolve=>{
    if(!self.registration.waiting)resolve(null);
    else self.addEventListener('activate',()=>resolve(null),{once:true});
  }));
  await second.close();await activation;
  const reopened=await context.newPage();await reopened.goto(url);
  await reopened.waitForFunction(async()=>{
    const reg=await navigator.serviceWorker.getRegistration();
    return reg?.active?.state==='activated' && !reg.waiting && Boolean(navigator.serviceWorker.controller);
  });
  expect((await verification(reopened)).edition==='second','New edition did not activate after all clients closed');
  expect(await reopened.evaluate(()=>caches.has('drawindow-offline-first')),'Previous edition deleted during activation');
  await reopened.evaluate(async()=>{const cache=await caches.open('drawindow-offline-second');await cache.delete(new URL('./asset.bin',location.href));});
  expect(!(await verification(reopened)).complete,'Evicted entry still reported complete');
  await context.close();
  console.log('Browser lifecycle passed: first install, failed update, multi-tab wait, natural activation, cache eviction.');
} finally { await browser?.close();await new Promise(resolve=>server.close(resolve)); }
