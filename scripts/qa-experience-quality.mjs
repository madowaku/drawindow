import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
const folder = process.env.DRAWINDOW_QA_OUTPUT || 'artifacts/qa/consolidation-20261022';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DRAWINDOW_BROWSER_EXECUTABLE ? {executablePath: process.env.DRAWINDOW_BROWSER_EXECUTABLE} : {}) });
const base = process.env.DRAWINDOW_QA_URL || 'http://localhost:5195/';
const apiBase = process.env.DRAWINDOW_QA_API_URL || 'http://localhost:5196/';
for (const url of [base, apiBase]) assert(['localhost','127.0.0.1'].includes(new URL(url).hostname), 'This synthetic QA is local only');
const report = {scope: 'Synthetic browser QA only; no human play, device comfort or real LIVE acceptance. API responses intercepted locally.', journeys: [], apiRecovery: null, errors: [], externalRequests: [], failures: []};
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const image = async canvas => {await settle(canvas.page()); return canvas.evaluate(c => c.toDataURL());};
const hash = value => createHash('sha256').update(value).digest('hex');
async function draw(page) {
 const canvas = page.getByTestId('window-drawing-canvas'); await canvas.scrollIntoViewIfNeeded();
 const b = await canvas.boundingBox(); assert(b && b.width > 0);
 assert(await canvas.evaluate(c => {const r=c.getBoundingClientRect();return document.elementFromPoint(r.x+r.width*.5,r.y+r.height*.5)===c;}), 'Canvas is blocked');
 await page.mouse.move(b.x+b.width*.25,b.y+b.height*.7); await page.mouse.down();
 await page.mouse.move(b.x+b.width*.5,b.y+b.height*.3,{steps:8});
 await page.mouse.move(b.x+b.width*.75,b.y+b.height*.7,{steps:8}); await page.mouse.up();
}
async function prepare(config, url=base) {
 const context = await browser.newContext({viewport:config.viewport,reducedMotion:config.motion,locale:config.language==='ja'?'ja-JP':'en-US',hasTouch:config.viewport.width<700});
 const page = await context.newPage();const traffic={http:0};page.on('pageerror',e => report.errors.push(e.message));
 page.on('request',r => {if(/^https?:/.test(r.url())){traffic.http++;if(!['localhost','127.0.0.1'].includes(new URL(r.url()).hostname)) report.externalRequests.push(r.url());}});
 await page.goto(url);
 await page.getByRole('button',{name:config.language==='ja'?'日本語':'English',exact:true}).click();
 await page.getByRole('button',{name:config.language==='ja'?(config.mode==='day'?'昼':'夜'):(config.mode==='day'?'DAY':'NIGHT'),exact:true}).click();
 return {context,page,traffic};
}
async function noSpoilers(page) {
 assert.equal(await page.locator('.score-strip,.interpretation,.review-field input').count(),0);
 const accessible = await page.locator('main').evaluate(el=>el.textContent+' '+[...el.querySelectorAll('[aria-label],[title]')].map(n=>n.getAttribute('aria-label')+' '+n.getAttribute('title')).join(' '));
 for(const w of ['apple','dog','house','fish','cat','elephant','guitar']) assert(!new RegExp('\\b'+w+'\\b','i').test(accessible),'Premature answer: '+w);
}
try {
 const configs = [
  {language:'en',mode:'day',motion:'reduce',viewport:{width:360,height:800}},
  {language:'ja',mode:'night',motion:'reduce',viewport:{width:360,height:800}},
  {language:'en',mode:'night',motion:'no-preference',viewport:{width:1280,height:800}},
  {language:'ja',mode:'day',motion:'no-preference',viewport:{width:320,height:480}},
  {language:'en',mode:'night',motion:'reduce',viewport:{width:320,height:480}},
  {language:'ja',mode:'day',motion:'reduce',viewport:{width:1280,height:800}},
 ];
 for(const config of configs) {
  const {context,page,traffic}=await prepare(config);const ja=config.language==='ja';
  const label=ja?{start:'デモで遊ぶ',turn:'あなたの番',done:'できた',undo:'元に戻す',redo:'やり直す',home:'最初の画面へ',reveal:'答えあわせ',meaning:'答え合わせをする',keep:'Keep'}:{start:'PLAY DEMO',turn:'YOUR TURN',done:'DONE',undo:'Undo last edit',redo:'Redo last edit',home:'DRAWINDOW home',reveal:'REVEAL OUR CHAIN',meaning:'See what we meant',keep:'Keep'};
  let apiCalls=0;await page.route('**/api/recognize',async route=>{apiCalls++;await route.abort();});
  const prefix=config.viewport.width+'-'+config.language+'-'+config.mode+'-'+config.motion;
  await page.getByRole('button',{name:label.start,exact:true}).click();
  await page.getByRole('button',{name:label.turn,exact:true}).waitFor(); await noSpoilers(page);
  await page.getByRole('button',{name:label.turn,exact:true}).click();
  const canvas=page.getByTestId('window-drawing-canvas'),undo=page.getByRole('button',{name:label.undo,exact:true}),redo=page.getByRole('button',{name:label.redo,exact:true});
  await canvas.focus();const cursor=page.getByTestId('keyboard-cursor');assert(await cursor.isVisible());
  const beforeCursor=await cursor.boundingBox();await page.keyboard.press('ArrowRight');const afterCursor=await cursor.boundingBox();assert(afterCursor.x>beforeCursor.x);
  const area=await canvas.boundingBox();const controls=await page.locator('.action-row button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {label:b.getAttribute('aria-label')||b.textContent.trim(),width:r.width,height:r.height};}));
  for(const control of controls) assert(control.width>=44 && control.height>=44,JSON.stringify(control));
  const textFit = await page.evaluate(() => {
    const button=document.querySelector('.action-row > .primary');
    const round=document.querySelector('.round-label strong');
    const heading=document.querySelector('.play-heading h1');
    const range=document.createRange();range.selectNodeContents(round);
    const rects=[...range.getClientRects()];
    const roundSingleLine=Math.max(...rects.map(r=>r.top))<Math.min(...rects.map(r=>r.bottom));
    return {buttonFits:button.scrollWidth<=button.clientWidth,roundSingleLine,headingHeight:heading.getBoundingClientRect().height};
  });
  assert(textFit.buttonFits && textFit.roundSingleLine,'Button or round text overflows/wraps: '+JSON.stringify(textFit));
  const localizedHint=await page.getByTestId('window-drawing-hint').innerText();assert.equal(ja?/ここ/.test(localizedHint):/DRAW HERE/.test(localizedHint),true);
  await page.screenshot({path:folder+'/'+prefix+'-keyboard.png'});
  await draw(page);await canvas.focus();await page.keyboard.press('Enter');
  const original=await image(canvas);
  await page.locator('.clear-tool').click();assert(!await page.getByRole('button',{name:label.done,exact:true}).isEnabled());assert(await undo.isEnabled());
  const blank=await image(canvas);assert.notEqual(blank,original);
  await undo.click();assert.equal(await image(canvas),original,'CLEAR undo changed geometry');
  await redo.click();assert.equal(await image(canvas),blank,'CLEAR redo changed empty canvas');
  await undo.click();await undo.click();assert.notEqual(await image(canvas),original);await redo.click();assert.equal(await image(canvas),original);
  await canvas.focus();await page.keyboard.press('Control+z');await page.keyboard.press('Control+y');assert.equal(await image(canvas),original);
  await page.screenshot({path:folder+'/'+prefix+'-restored.png'});
  // Editing while a pointer is held must not let its later up resurrect the old stroke.
  await page.locator('.clear-tool').click();const b=await canvas.boundingBox();
  await page.mouse.move(b.x+b.width*.3,b.y+b.height*.4);await page.mouse.down();await page.mouse.move(b.x+b.width*.6,b.y+b.height*.5,{steps:3});
  await canvas.focus();await page.keyboard.press('Control+z');await page.mouse.up();
  assert(!await page.getByRole('button',{name:label.done,exact:true}).isEnabled(),'Held pointer resurrected undone marks');
  await canvas.focus();await page.keyboard.press('Enter');assert(!await redo.isEnabled(),'Fresh stroke retained old redo');
  await page.screenshot({path:folder+'/'+prefix+'-drawing.png'});
  await page.getByRole('button',{name:label.done,exact:true}).click();
  for(let round=2;round<=5;round++){
   await page.getByRole('button',{name:label.turn,exact:true}).click();await noSpoilers(page);
   assert(!await undo.isEnabled(),'History crossed round');
   await draw(page);await page.getByRole('button',{name:label.done,exact:true}).click();
  }
  const fields=page.locator('.review-field input');await fields.first().waitFor();assert.equal(await fields.count(),5);
  const raw=ja?'  いぬ  ':'  DOG!  ';await fields.first().fill(raw);
  const home=page.getByRole('button',{name:label.home,exact:true});await home.click();
  const dialog=page.getByRole('dialog');assert(await dialog.isVisible());
  await page.keyboard.press('Escape');assert.equal(await fields.first().inputValue(),raw);assert(await fields.first().evaluate(el=>document.activeElement===el));
  await fields.nth(1).fill(ja?'ねこ':'cat');await fields.nth(1).press('Control+z');assert.equal(await undo.count(),0,'Drawing shortcut affected review');
  const words=ja?['いぬ','ねこ','さかな','かさ','つき']:['dog','house','fish','cat','tree'];for(let i=0;i<5;i++)await fields.nth(i).fill(words[i]);
  await page.getByRole('button',{name:label.reveal,exact:true}).click();
  assert.equal(await page.locator('.interpretation,.score-strip').count(),0,'Ending disclosed before deliberate reveal');
  await page.getByRole('button',{name:label.meaning,exact:true}).click();
  await page.getByRole('button',{name:ja?'すぐ見る・答えを開く':'Skip animation · see results',exact:true}).click();
  assert.equal(await page.locator('.result-drawing').count(),10);assert.equal(await page.locator('.chain-link').count(),9);
  assert(await page.getByText(ja?'最後の絵は認識していません':'Final drawing · not sent for recognition',{exact:true}).count()>0);
  const save=page.getByRole('button',{name:ja?'今日の窓を残す':'SAVE TODAY’S WINDOW',exact:true});const beforeSaveRequests=traffic.http;await save.click();
  await page.getByRole('img',{name:ja?'10枚の絵をまとめた記念画像':'Your ten drawings together in one keepsake',exact:true}).waitFor();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', {name:ja?'画像をダウンロード':'Download image',exact:true}).click();
  const download = await downloadPromise;
  const pngPath = folder+'/'+prefix+'-souvenir.png'; await download.saveAs(pngPath);
  const png = await readFile(pngPath);
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1200); assert.equal(png.readUInt32BE(20),3000);
  const souvenirRequestCount=traffic.http-beforeSaveRequests;assert.equal(souvenirRequestCount,0,'Souvenir creation made HTTP requests');
  const resultMetrics=await page.locator('.app').evaluate(el=>{el.scrollTop=el.scrollHeight;return {scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,height:el.clientHeight,horizontalOverflow:el.scrollWidth>el.clientWidth};});
  assert(!resultMetrics.horizontalOverflow);
  await page.screenshot({path:folder+'/'+prefix+'-results-bottom.png'});
  assert.equal(apiCalls,0);
  const missing=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).length);assert.equal(missing,0);
  report.journeys.push({config,canvas:{width:area.width,height:area.height},controls,textFit,localizedHint,keyboardMoves:true,clearExactRestore:true,undoRedoExactRestore:true,heldPointerSafe:true,namingProtected:true,reviewNativeUndoUnaffected:true,drawings:10,links:9,souvenirPreview:true,souvenirRequestCount,apiCalls,originalCanvasSha256:hash(original),resultMetrics});
  console.log(JSON.stringify({passed:prefix}));await context.close();
 }
 // Genuine API adapter and failure UI, with every response intercepted before leaving localhost.
 const config={language:'en',mode:'day',motion:'reduce',viewport:{width:360,height:800}};
 const {context,page}=await prepare(config,apiBase);const requests=[];let fail=true;
 await page.route('**/api/recognize',async route=>{
  const body=route.request().postDataJSON();assert(!('intendedWord'in body));assert(body.imageDataUrl?.startsWith('data:image/png;base64,'));
  requests.push({requestId:body.requestId,imageSha256:hash(body.imageDataUrl)});
  if(fail){fail=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({guess:null,source:'api',errorCode:'unavailable'})});}
  else{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({guess:'dog',source:'api'})});}
 });
 await page.getByRole('button',{name:/Use live API/}).click();await page.getByRole('button',{name:'START GAME',exact:true}).click();
 await page.getByRole('button',{name:'YOUR TURN',exact:true}).click();await draw(page);await page.getByRole('button',{name:'DONE',exact:true}).click();
 await page.getByRole('button',{name:'BACK',exact:true}).click();const undo=page.getByRole('button',{name:'Undo last edit',exact:true});assert(await undo.isEnabled(),'Recovered drawing is not editable');
 await undo.click();assert(!await page.getByRole('button',{name:'DONE',exact:true}).isEnabled());await page.getByRole('button',{name:'Redo last edit',exact:true}).click();
 await page.getByRole('button',{name:'DONE',exact:true}).click();await page.getByRole('button',{name:'YOUR TURN',exact:true}).waitFor();
 assert.equal(requests.length,2);assert.notEqual(requests[0].requestId,requests[1].requestId);assert.equal(requests[0].imageSha256,requests[1].imageSha256,'API error editing changed restored inference');
 assert(await page.getByText('LIVE API',{exact:true}).count()>0);await noSpoilers(page);
 report.apiRecovery={interceptedCalls:2,retainedLiveMode:true,editableAfterError:true,exactInferenceRestored:true};await context.close();
 assert.equal(report.errors.length,0,report.errors.join('\n'));assert.equal(report.externalRequests.length,0,'Unexpected external traffic');
} catch(error) {report.failures.push(error.stack||String(error));throw error;}
finally{await browser.close();await writeFile(folder+'/after.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify({journeys:report.journeys.length,apiRecovery:report.apiRecovery,errors:report.errors,externalRequests:report.externalRequests,failures:report.failures}));
