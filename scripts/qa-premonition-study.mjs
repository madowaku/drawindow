import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {observeLiveDrawing,replayDrawingProof,redrawReplayProof} from './premonition-drawing-proof.mjs';
const tempoC=process.env.PREMONITION_C_TEMPO==='1';
const route=tempoC?'?window-time-premonition':'?shizuku-premonition',heading=tempoC?'Cの時間で、しずくを見比べる。':'窓の向こうを、もう一度。';
const origin='http://127.0.0.1:4220/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4220','--strictPort'],{stdio:'pipe'});
const receipt={status:'started',scope:'Synthetic pointer circles with actual local ML; evaluations deliberately unanswered. Not human acceptance, accuracy, comfort or enjoyment evidence.',external:[],posts:0,pageErrors:[],plays:[],liveDrawings:[],checks:[]};
let browser,lastPage;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function store(page,name,value,write=false){return page.evaluate(({name,value,write})=>new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('sessions');request.onerror=()=>reject(String(request.error));request.onsuccess=()=>{const db=request.result,tx=db.transaction('sessions',write?'readwrite':'readonly'),s=tx.objectStore('sessions'),r=write?s.put(value,'current'):s.get('current');let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>reject(String(tx.error));};}),{name,value,write});}
async function draw(page){const canvas=page.getByTestId('window-drawing-canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;await page.mouse.move(box.x+box.width*(.5+.24*Math.cos(a)),box.y+box.height*(.5+.24*Math.sin(a)));if(!i)await page.mouse.down();}await page.mouse.up();}
async function bottom(page){const app=page.locator('.app');await app.evaluate(e=>e.scrollTop=0);const viewport=page.viewportSize();await page.mouse.move(viewport.width-12,viewport.height/2);for(let i=0;i<70;i++){await page.mouse.wheel(0,viewport.height*.85);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));if(await app.evaluate(e=>e.scrollTop+e.clientHeight>=e.scrollHeight-2))break;}const position=await app.evaluate(e=>({top:e.scrollTop,height:e.clientHeight,content:e.scrollHeight}));assert(position.top>0&&position.top+position.height>=position.content-2,JSON.stringify(position));const box=await page.getByRole('button',{name:'描画を含む再生JSONを保存',exact:true}).boundingBox();assert(box&&box.y>=0&&box.y+box.height<=viewport.height,'Raw export is unreachable by normal wheel');return position;}
async function download(page,name){const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile(await(await pending).path(),'utf8');}
function watch(page){page.on('pageerror',e=>receipt.pageErrors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))receipt.external.push(r.url());if(r.method()==='POST')receipt.posts++;});page.on('dialog',d=>d.accept());}
async function spoilerCheck(page){assert.equal(await page.locator('.review-list,.ending-meaning,.chain-link,.premonition-report').count(),0);const canvas=page.getByTestId('window-drawing-canvas');assert(!/circle|まる|next letter|次の文字/i.test(await canvas.getAttribute('aria-label')??''));assert.equal(await page.locator('.play-layout input').count(),0);}
try{
 await mkdir('artifacts/release',{recursive:true});
 for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}if(server.exitCode!==null)throw Error('Vite stopped');await delay(100);}
 browser=await chromium.launch({headless:true});
 for(const language of (process.env.PREMONITION_C_RESUME_ONLY==='1'?[]:['en','ja']))for(const mode of ['day','night']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'}),page=await context.newPage();lastPage=page;watch(page);console.log('Starting actual model play',language,mode);
  await page.goto(origin+route);await page.getByRole('heading',{name:heading}).waitFor();
  const sentinel={sentinel:'production-preservation',language,mode};await store(page,'drawindow-session',sentinel,true);if(tempoC)await store(page,'drawindow-premonition-study-v011',sentinel,true);
  await page.getByRole('button',{name:language==='en'?'English':'日本語',exact:true}).click();
  await page.getByRole('button',{name:language==='en'?(mode==='day'?'DAY':'NIGHT'):(mode==='day'?'昼':'夜'),exact:true}).click();
  assert.equal(await page.getByRole('button',{name:/PLAY DEMO|デモで遊ぶ/}).count(),0);
  await page.getByRole('button',{name:language==='en'?'START GAME':'はじめる',exact:true}).click();
  for(let round=1;round<=5;round++){
   const live=await observeLiveDrawing(page,tempoC);receipt.liveDrawings.push({language,mode,round,live});
   const turn=page.getByRole('button',{name:language==='en'?'YOUR TURN':'あなたの番',exact:true});await turn.waitFor({timeout:60000});console.log('Drawing',language,mode,round);await spoilerCheck(page);await turn.click();await draw(page);
   await spoilerCheck(page);await page.getByRole('button',{name:language==='en'?'DONE':'できた',exact:true}).click();
  }
  await page.locator('.review-list').waitFor({timeout:60000});assert.equal(await page.locator('.review-row').count(),5);
  for(const input of await page.locator('.review-field input').all())await input.fill(language==='en'?'circle':'まる');
  await page.getByRole('button',{name:language==='en'?'REVEAL OUR CHAIN':'答えあわせ',exact:true}).click();
  await page.getByRole('button',{name:language==='en'?'Skip animation · see results':'すぐ見る・答えを開く',exact:true}).click();
  assert.equal(await page.locator('.ending-diary>li').count(),10);assert.equal(await page.locator('.chain-link').count(),9);
  assert(await page.getByRole('button',{name:'描画を含む再生JSONを保存',exact:true}).isDisabled());
  await page.getByRole('checkbox',{name:'自分の絵・名前・認識結果を含むローカル再生JSONを書き出す'}).check();
  const raw=JSON.parse(await download(page,'描画を含む再生JSONを保存'));
  const recognitions=raw.recording.events.filter(e=>e.event.type==='RECOGNITION_RESOLVED');assert.equal(recognitions.length,4);assert(recognitions.every(e=>e.event.result.source==='ml'));assert.equal(new Set(recognitions.map(e=>e.event.requestId)).size,4);
  const meta=JSON.parse(await download(page,'評価JSONを書き出す'));if(tempoC){assert.equal(meta.condition.tempo,'C');assert.equal(meta.condition.expressionDayMs,240);assert.equal(meta.condition.expressionNightMs,160);assert.equal(raw.condition.tempo,'C');}assert(meta.finished);assert.equal(meta.mode,mode);assert.equal(meta.language,language);assert(!/"strokes"|"points"|"guess"|imageDataUrl/.test(JSON.stringify(meta)));for(const value of Object.values(meta.evaluation))for(const [key,answer] of Object.entries(value))assert.equal(answer,key==='freeText'?'':null);
  const csv=await download(page,'評価CSVを書き出す');assert(csv.includes('naturalness')&&csv.split('\r\n').length===3);
  await page.getByRole('checkbox',{name:'並べて比較する',exact:true}).check();await page.getByRole('button',{name:'次の認識直後',exact:true}).click();
  const panes=await page.locator('.premonition-replay-panes article').evaluateAll(es=>es.map(e=>['round','entryCount','connected'].map(k=>e.dataset[k])));assert.deepEqual(panes[0],panes[1]);
  const dLabel=meta.assignment.X==='D'?'X':'Y',d=page.getByTestId('replay-'+dLabel);await d.scrollIntoViewIfNeeded();
  const sprite=d.locator('.character-scene__sprite[data-active=true]');await sprite.evaluate(i=>i.decode());assert(await sprite.evaluate(i=>i.naturalWidth>0&&!i.hidden));
  const pose=await d.locator('.character-scene').getAttribute('data-pose');assert(['curious','thinking','smile'].includes(pose));await page.screenshot({path:`artifacts/release/offline-premonition-${language}-${mode}-mobile.png`,fullPage:true});
  await page.getByRole('button',{name:'最初へ',exact:true}).click();await page.getByRole('button',{name:'記録を再生',exact:true}).click();const clock=page.getByRole('slider',{name:'再生位置',exact:true});await page.waitForFunction(()=>Number(document.querySelector('input[aria-label="再生位置"]').value)>100);await page.getByRole('button',{name:'再生を止める',exact:true}).click();assert(Number(await clock.inputValue())>100);
  if(language==='en'&&mode==='day'){
   // Chromium's real lifecycle transition fires visibilitychange; no fake DOM event.
   await page.getByRole('button',{name:'記録を再生',exact:true}).click();const cdp=await context.newCDPSession(page);await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await cdp.send('Page.setWebLifecycleState',{state:'active'});
   const hidden=await page.evaluate(()=>document.hidden);receipt.hiddenLifecycle={documentHidden:hidden};
   if(hidden){await page.getByRole('button',{name:'記録を再生',exact:true}).waitFor();const stopped=await clock.inputValue();await delay(150);assert.equal(await clock.inputValue(),stopped);receipt.hiddenLifecycle.paused=true;}
   else {const stop=page.getByRole('button',{name:'再生を止める',exact:true});if(await stop.count())await stop.click();receipt.hiddenLifecycle.scope='Headless lifecycle did not hide document; true hidden-tab pause not asserted';}
   await cdp.detach();
  }
  await page.getByRole('button',{name:'表示 '+(dLabel==='X'?'Y':'X'),exact:true}).click();
  const again=JSON.parse(await download(page,'描画を含む再生JSONを保存'));assert.deepEqual(again.recording.events.filter(e=>e.event.type==='RECOGNITION_RESOLVED'),recognitions);
  const mobile=await bottom(page);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:1440,height:900});const desktop=await bottom(page);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/release/offline-premonition-${language}-${mode}-desktop.png`,fullPage:true});
  await page.locator('.premonition-replay-panes').scrollIntoViewIfNeeded();
  const replayDrawings=await replayDrawingProof(page,language,mode,raw.recording,5,true,tempoC);assert(replayDrawings>=5);
  await page.getByRole('button',{name:language==='en'?'SAVE TODAY’S WINDOW':'今日の窓を残す',exact:true}).click();const souvenir=page.locator('.souvenir>img');await souvenir.waitFor({timeout:30000});assert.deepEqual(await souvenir.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight})),{width:1200,height:3000});const imageDownload=page.waitForEvent('download');await page.getByRole('link',{name:language==='en'?'Download image':'画像をダウンロード',exact:true}).click();await(await imageDownload).saveAs(`artifacts/release/offline-premonition-${language}-${mode}-souvenir.png`);
  assert.deepEqual(await store(page,'drawindow-session'),sentinel);if(tempoC)assert.deepEqual(await store(page,'drawindow-premonition-study-v011'),sentinel);
  await writeFile(`artifacts/release/offline-premonition-${language}-${mode}-raw.json`,JSON.stringify(raw,null,2));await writeFile(`artifacts/release/offline-premonition-${language}-${mode}-metadata.json`,JSON.stringify(meta,null,2));
  receipt.plays.push({language,mode,source:'ml',recognitions:4,pictures:10,links:9,dLabel,replayPose:pose,mobile,desktop,souvenir:'1200x3000',evaluations:'unanswered'});await context.close();
 }
 // An isolated context tests the actual persisted edit history without altering completed evidence.
 {
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();lastPage=page;watch(page);await page.goto(origin+route);await page.getByRole('heading',{name:heading}).waitFor();
  receipt.syntheticRedraw={drawings:tempoC?'Covered by the separate Window Time C redraw proof':await redrawReplayProof(page),scope:'Canned recognition through actual reducer; separate from the four actual ML trials'};await context.close();
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();lastPage=page;watch(page);await page.goto(origin+route);await page.getByRole('heading',{name:heading}).waitFor();await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('button',{name:'START GAME',exact:true}).click();await page.getByRole('button',{name:'YOUR TURN',exact:true}).waitFor({timeout:60000});await page.getByRole('button',{name:'YOUR TURN',exact:true}).click();await draw(page);
  await page.getByRole('button',{name:'CLEAR',exact:true}).click();await page.getByRole('button',{name:'Undo last edit',exact:true}).click();
  const db=tempoC?'drawindow-window-time-premonition-v012':'drawindow-premonition-study-v011';await delay(650);const before=await store(page,db);assert.equal(before.state.phase,'player_drawing');assert.equal(before.state.activeStrokes.length,1);assert(before.state.drawingHistory.future.length>0);await page.reload();await page.getByRole('button',{name:'CONTINUE DRAWING',exact:true}).click();await page.locator('.phase-player_drawing').waitFor();await delay(650);const restored=await store(page,db);if(tempoC)assert.deepEqual(restored.cPremonition,before.cPremonition);assert.deepEqual(restored.state.activeStrokes,before.state.activeStrokes);assert.deepEqual(restored.state.drawingHistory,before.state.drawingHistory);assert.equal(restored.state.entries.filter(e=>e.recognition).length,0);
  await page.getByRole('button',{name:'Redo last edit',exact:true}).click();await delay(650);assert.equal((await store(page,db)).state.activeStrokes.length,0);await page.getByRole('button',{name:'Undo last edit',exact:true}).click();await delay(650);assert.equal((await store(page,db)).state.activeStrokes.length,1);await page.getByRole('button',{name:'CLEAR',exact:true}).click();await delay(650);assert.equal((await store(page,db)).state.activeStrokes.length,0);await page.screenshot({path:'artifacts/release/offline-premonition-resumed-edit.png',fullPage:true});receipt.resume={phase:'player_drawing',strokeRestored:true,historyRestored:true,redoClear:true,undo:true,clear:true,recognitions:0,scope:'Reduced motion; no restored recognition transition or D beat is synthesized'};await context.close();
 }
 assert.deepEqual(receipt.external,[]);assert.equal(receipt.posts,0);assert.deepEqual(receipt.pageErrors,[]);receipt.tempo=tempoC?'C':'A';receipt.status='success';receipt.checks=process.env.PREMONITION_C_RESUME_ONLY==='1'?['reduced-motion C saved session and edit history','saved X/Y assignment and selected label preserved','UNDO/REDO/CLEAR after resume','no restored recognition or D beat synthesized']:['four actual local model results, no fifth','EN/JA x DAY/NIGHT','no names/results/input before review','10 drawings and 9 result links','explicit raw opt-in and metadata/CSV export','paired replay has identical round, entry count, score','decoded adopted D sprite','replay clock advances and manual stop','changing display and replay leaves recognition trace unchanged','normal app wheel reaches footer at both viewports','1200x3000 local souvenir','production database sentinel preserved'];
}catch(error){receipt.status='failure';receipt.error=String(error);if(lastPage&&!lastPage.isClosed()){receipt.failureText=await lastPage.locator('body').innerText();await lastPage.screenshot({path:'artifacts/release/offline-premonition-failure.png',fullPage:true});}throw error;}
finally{await browser?.close();server.kill();await writeFile(tempoC?(process.env.PREMONITION_C_RESUME_ONLY==='1'?'artifacts/release/offline-premonition-c-resume.json':'artifacts/release/offline-premonition-c-browser.json'):'artifacts/release/offline-premonition-browser.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));}
