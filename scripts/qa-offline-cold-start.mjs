import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const localhost='http://127.0.0.1:4173/';
const receipt=JSON.parse(await readFile('artifacts/release/offline-assets-receipt.json','utf8'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe'});
let logs='';
server.stderr.on('data', data=>logs+=String(data).slice(-3000));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readyServer(){
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error('Preview stopped: '+logs);
    try{const r=await fetch(localhost);if(r.ok)return;}catch{}
    await sleep(200);
  }
  throw Error('Preview never became ready');
}
const result={status:'started',offline:false,assetsCached:0,modelBytes:0,externalRequests:[],postCount:0};
let browser;
try {
  await readyServer();
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'allow',locale:'ja-JP'});
  const external=[];
  context.on('request',request=>{
    const u=new URL(request.url());
    if(u.origin!==new URL(localhost).origin)external.push(request.url());
    if(request.method()==='POST')result.postCount++;
  });
  let page=await context.newPage();
  await page.goto(localhost,{waitUntil:'load'});
  await page.locator('.start-button').waitFor({timeout:20000});
  result.assetsCached=await page.evaluate(async count=>{
    const reg=await navigator.serviceWorker.ready;
    if(!reg.active)throw Error('No active service worker');
    const key=(await caches.keys()).find(name=>name.startsWith('drawindow-offline-'));
    if(!key)throw Error('Offline cache missing');
    const keys=await(await caches.open(key)).keys();
    if(keys.length!==count)throw Error('Cache incomplete: '+keys.length+'/'+count);
    return keys.length;
  },receipt.assets.length);
  await page.close();
  await context.setOffline(true);
  page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto(localhost,{waitUntil:'load',timeout:30000});
  await page.locator('.start-button').waitFor({timeout:20000});
  if(await page.evaluate(()=>navigator.onLine)!==false)throw Error('Network is not disabled');
  const inferenceAssets=await page.evaluate(async()=>{
    if(!navigator.serviceWorker.controller)throw Error('Offline SW is not controlling document');
    const model=await fetch('./local-ml/quickdraw_model_static.tflite');
    if(!model.ok)throw Error('Model not available offline');
    const label=await fetch('./local-ml/labels.txt');
    if(!label.ok)throw Error('Labels not available offline');
    return {bytes:(await model.arrayBuffer()).byteLength,labels:(await label.text()).trim().split(/\r?\n/).length};
  });
  if(inferenceAssets.bytes<1000000||inferenceAssets.labels!==345)throw Error('Corrupted/absent offline model assets');
  if(external.length)throw Error('External network requests: '+external.join(' | '));
  if(result.postCount)throw Error('Network POST detected');
  if(errors.length)throw Error('Runtime page errors: '+errors.join(' | '));
  result.status='success';result.offline=true;result.modelBytes=inferenceAssets.bytes;
  await context.close();
} catch(error){
  result.status='failure';result.error=String(error);throw error;
} finally {
  if(browser)await browser.close().catch(()=>{});
  server.kill();
  await writeFile('artifacts/release/offline-browser-cold-start.json',JSON.stringify(result,null,2));
  console.log('Offline cold-start test:',JSON.stringify(result));
}
