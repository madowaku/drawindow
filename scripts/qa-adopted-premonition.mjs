import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {observeLiveDrawing} from './premonition-drawing-proof.mjs';
const origin='http://127.0.0.1:4243/';const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4243','--strictPort'],{stdio:'pipe'});
const result={status:'started',scope:'Compiled production C tempo + cosmetic D, synthetic circles and actual on-device ML; not human accuracy or enjoyment',plays:[],external:[],posts:0,errors:[]};let browser,last;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function snapshot(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('drawindow-session',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('sessions'),r=tx.objectStore('sessions').get('current');r.onsuccess=()=>{db.close();resolve(r.result);};};}));}
async function draw(page){const canvas=page.getByTestId('window-drawing-canvas');await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;await page.mouse.move(b.x+b.width*(.5+.24*Math.cos(a)),b.y+b.height*(.5+.24*Math.sin(a)));if(!i)await page.mouse.down();}await page.mouse.up();}
try{
 await mkdir('artifacts/release',{recursive:true});for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true});
 for(const language of (process.env.ADOPTED_ONE?['en']:['en','ja']))for(const mode of (process.env.ADOPTED_ONE?['day']:['day','night'])){
  console.log('production',language,mode);const context=await browser.newContext({viewport:{width:language==='en'?1440:360,height:900},reducedMotion:'no-preference'}),page=await context.newPage();last=page;page.on('dialog',d=>d.accept());page.on('pageerror',e=>result.errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))result.external.push(r.url());if(r.method()==='POST')result.posts++;});
  await page.goto(origin+'?window-time-premonition');assert.equal(await page.getByRole('region',{name:'匿名の比較設定'}).count(),0);
  await page.getByRole('button',{name:language==='en'?'English':'日本語',exact:true}).click();await page.getByRole('button',{name:language==='en'?mode.toUpperCase():mode==='day'?'昼':'夜',exact:true}).click();
  const titleScene=page.locator('.title-art .character-scene');await titleScene.scrollIntoViewIfNeeded();
  const title=await titleScene.evaluate(async scene=>{await Promise.all([...scene.querySelectorAll('img')].map(i=>i.decode()));const body=scene.querySelector('.character-scene__breathing'),active=scene.querySelector('.character-scene__sprite[data-active=true]'),animation=body.getAnimations()[0];if(!animation)throw Error('Missing quiet title breath');animation.pause();const samples=[];for(const time of [0,1000,4000,7250,7350,7400,7500,8500]){animation.currentTime=time;samples.push({time,transform:getComputedStyle(body).transform,source:active.src,visible:[...scene.querySelectorAll('.character-scene__sprite')].filter(i=>getComputedStyle(i).opacity==='1').length});}animation.play();return {name:getComputedStyle(body).animationName,duration:getComputedStyle(body).animationDuration,blink:scene.querySelectorAll('.character-scene__blink').length,samples};});
  assert.equal(title.name,'character-wait');assert.equal(title.duration,mode==='day'?'9s':'11s');assert.equal(title.blink,0);assert(title.samples.every(s=>s.source===title.samples[0].source&&s.visible===1));
  await page.evaluate(()=>{window.__poses=[];const note=()=>{const app=document.querySelector('.app'),scene=app?.querySelector('.play-layout .character-scene');if(scene)window.__poses.push({at:performance.now(),phase:app.dataset.phase,pose:scene.dataset.pose});};new MutationObserver(note).observe(document.querySelector('.app'),{subtree:true,attributes:true,attributeFilter:['data-pose','data-phase']});});
  await page.getByRole('button',{name:language==='en'?'START GAME':'はじめる',exact:true}).click();const drawings=[];
  for(let round=1;round<=5;round++){
   console.log('round',round);const started=Date.now();drawings.push(await observeLiveDrawing(page,true));assert(Date.now()-started>2000,'Production reverted to fast A playback');
   await page.getByRole('button',{name:language==='en'?'YOUR TURN':'あなたの番',exact:true}).click();assert.equal(await page.getByTestId('window-drawing-hint').count(),0);assert((await page.getByTestId('window-drawing-canvas').evaluate(e=>getComputedStyle(e).cursor)).includes('8 4'));
   await draw(page);await page.getByRole('button',{name:language==='en'?'DONE':'できた',exact:true}).click();
  }
  await page.locator('.review-list').waitFor({timeout:60000});for(const input of await page.locator('.review-field input').all())await input.fill(language==='en'?'circle':'まる');
  await page.getByRole('button',{name:language==='en'?'REVEAL OUR CHAIN':'答えあわせ',exact:true}).click();await page.getByRole('button',{name:language==='en'?'Skip animation · see results':'すぐ見る・答えを開く',exact:true}).click();
  assert.equal(await page.locator('.ending-diary>li').count(),10);assert.equal(await page.locator('.chain-link').count(),9);assert.equal(await page.locator('.ending').getAttribute('data-study-tempo'),'true');assert((await page.locator('.ending').getAttribute('style')).includes('6000ms'));
  await delay(700);const saved=await snapshot(page),recognitions=saved.state.entries.filter(e=>e.actor==='player'&&e.recognition);assert.equal(recognitions.length,4);assert(recognitions.every(e=>e.recognition.source==='ml'));
  const poses=await page.evaluate(()=>window.__poses.filter(p=>p.phase==='girl_breath'&&['smile','curious','thinking'].includes(p.pose)));assert(poses.length>0,'Production never showed D reaction');
  await page.getByRole('button',{name:language==='en'?'SAVE TODAY’S WINDOW':'今日の窓を残す',exact:true}).click();await page.locator('.souvenir>img').waitFor();assert.deepEqual(await page.locator('.souvenir>img').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1200,3000]);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));result.plays.push({language,mode,title,drawings:drawings.length,recognitions:4,pictures:10,links:9,poses,souvenir:[1200,3000]});await context.close();
 }
 assert.deepEqual(result.external,[]);assert.deepEqual(result.errors,[]);assert.equal(result.posts,0);result.status='success';
}catch(error){result.status='failure';result.error=String(error);if(last&&!last.isClosed()){result.failureText=await last.locator('body').innerText();try{result.failedSnapshot=await snapshot(last);}catch{}await last.screenshot({path:'artifacts/release/offline-adopted-D-C-failure.png'});}throw error;}finally{await browser?.close();server.kill();await writeFile('artifacts/release/offline-adopted-D-C-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,error:result.error,plays:result.plays.length}));}
