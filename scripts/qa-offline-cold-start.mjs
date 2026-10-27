import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const port=Number(process.env.DRAWINDOW_OFFLINE_QA_PORT || 4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local QA port');
const localhost=`http://127.0.0.1:${port}/`;
const receipt=JSON.parse(await readFile('artifacts/release/offline-assets-receipt.json','utf8'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let logs='';
server.stderr.on('data', data=>logs+=String(data).slice(-3000));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readyServer(){
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error('Preview stopped: '+logs);
    try{const r=await fetch(localhost);if(r.ok&&(await r.text()).includes(receipt.fingerprint))return;}catch{}
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
  const requestFailures=[];
  context.on('requestfailed', r => requestFailures.push(r.url() + ' ' + r.failure()?.errorText));
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
  result.runtimeDiagnostics=[];
  page.on('pageerror',err=>errors.push(String(err)));
  page.on('console',msg=>{
    if(msg.type()!=='error')return;
    const text=msg.text();
    // LiteRT writes informational CPU initialization to stderr. Keep evidence,
    // but don't confuse the optional, unused NPU warning with CPU failure.
    if(/^INFO: (\[(environment|accelerator_registry|gpu_registry|cpu_registry|compiled_model)\.cc:\d+\]|Created TensorFlow Lite XNNPACK delegate for CPU\.)/.test(text) ||
       /^WARNING: \[npu_registry\.cc:\d+\] NPU accelerator could not be loaded and registered: kLiteRtStatusErrorInvalidArgument\.$/.test(text)) {
      result.runtimeDiagnostics.push(text);
    } else errors.push('console: '+text);
  });
  await page.goto(localhost,{waitUntil:'load',timeout:30000});
  try {
    await page.locator('.start-button').waitFor({timeout:20000});
  } catch (waitError) {
    const cacheDiagnostics=await page.evaluate(async()=>{
      const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('drawindow-offline-')));
      const script=document.scripts[0]?.src;
      const cached=await cache.match(script);
      return {script,headers:cached?Object.fromEntries(cached.headers):null,keys:(await cache.keys()).map(r=>r.url)};
    });
    const dom=await page.evaluate(()=>({title:document.title,body:document.body?.innerText.slice(0,1000),html:document.body?.innerHTML.slice(0,1400),controlled:Boolean(navigator.serviceWorker.controller),scripts:[...document.scripts].map(s=>s.src)}));
    throw Error('Offline DOM failed: '+JSON.stringify({dom,cacheDiagnostics,requestFailures,errors,waitError:String(waitError)}));
  }
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
  // Exercise actual bundled inference, never a stub or demo fallback.
  result.journeys=[];
  result.audioDecoded=await page.evaluate(async paths=>{
    const audio=new AudioContext();
    try {
      for(const path of paths) {
        const response=await fetch('./'+path);
        if(!response.ok)throw Error('Offline music unavailable');
        const packed=new Uint8Array(await response.arrayBuffer());
        if(new TextDecoder().decode(packed.slice(0,8))!=='DRAWBGM1')throw Error('Invalid BGM container');
        const decoded=packed.slice(8).map(byte=>byte^0xa7);
        const buffer=await audio.decodeAudioData(decoded.buffer);
        if(buffer.duration<=0)throw Error('Empty music');
      }
      return paths.length;
    } finally { await audio.close(); }
  },receipt.assets.filter(path=>path.endsWith('.bin')));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  for(const language of ['en','ja']) for(const mode of ['day','night']) {
    await page.evaluate(({language,mode})=>{
      localStorage.setItem('drawindow-language',language);
      localStorage.setItem('drawindow-mode',mode);
    },{language,mode});
    await page.reload({waitUntil:'load'});
    await page.locator('.offline-status[data-status="ready"]').waitFor();
    const ja=language==='ja';
    await page.locator('.start-button').click();
    for(let round=0;round<5;round++) {
      await page.getByRole('button',{name:ja?'あなたの番':'YOUR TURN',exact:true}).click({timeout:60000});
      const canvas=page.getByTestId('window-drawing-canvas');
      await canvas.scrollIntoViewIfNeeded();
      const box=await canvas.boundingBox();
      // A synthetic circle checks the pipeline, not human recognition quality.
      for(let i=0;i<=48;i++) {
        const angle=i/48*Math.PI*2;
        await page.mouse.move(box.x+box.width*(.5+.25*Math.cos(angle)),box.y+box.height*(.5+.25*Math.sin(angle)));
        if(i===0)await page.mouse.down();
      }
      await page.mouse.up();
      await page.getByRole('button',{name:ja?'できた':'DONE',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-phase')!=='recognizing',null,{timeout:60000});
      if(await page.locator('.error-actions').count())throw Error('Local recognition failed: '+await page.locator('.error-actions').innerText());
      if(round<4 && await page.locator('.demo-badge').innerText()!=='LOCAL AI')throw Error('Unexpected demo fallback');
    }
    const inputs=page.getByRole('textbox');
    await inputs.first().waitFor();
    for(let i=0;i<5;i++)await inputs.nth(i).fill(ja?'まる':'circle');
    await page.getByRole('button',{name:ja?'答えあわせ':'REVEAL OUR CHAIN',exact:true}).click();
    if(await page.locator('.ending-diary > li').count()!==10)throw Error('Missing drawings');
    await page.getByRole('button',{name:ja?'答え合わせをする':'See what we meant',exact:true}).click();
    if(await page.locator('.chain-link').count()!==9)throw Error('Missing links');
    const interpretations=await page.locator('.interpretation').allTextContents();
    await page.getByRole('button',{name:ja?'今日の窓を残す':'SAVE TODAY’S WINDOW',exact:true}).click();
    await page.locator('.souvenir img').waitFor();
    await page.locator('.souvenir img').evaluate(img=>img.decode());
    const dimensions=await page.locator('.souvenir img').evaluate(img=>[img.naturalWidth,img.naturalHeight]);
    if(dimensions.join(',')!=='1200,3000')throw Error('Invalid souvenir PNG');
    await page.screenshot({path:`artifacts/release/offline-${language}-${mode}.png`,fullPage:true});
    result.journeys.push({language,mode,rounds:5,pictures:10,links:9,interpretations,png:dimensions});
  }
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
