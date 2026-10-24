import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4200/';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4200','--strictPort'],{stdio:'pipe'});
let browser;
const receipt={scope:'Synthetic circle and actual local model; developer UI/export/regression only, no human accuracy or enjoyment evidence',status:'started',external:[],posts:0,pageErrors:[],checks:[]};
try {
  await mkdir('artifacts/release',{recursive:true});
  for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{} if(server.exitCode!==null)throw Error('Dev server stopped'); await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  page.on('request',r=>{if(!r.url().startsWith(origin))receipt.external.push(r.url());if(r.method()==='POST')receipt.posts++;});
  page.on('pageerror',error=>receipt.pageErrors.push(String(error)));
  await page.goto(origin+'?context-recognition');
  await page.getByRole('heading',{name:'線と、ひとつ前のことば。'}).waitFor();
  assert.equal(await page.getByTestId('policy-A').count(),0);
  assert.equal(await page.getByLabel('意図したことば',{exact:true}).count(),0);
  await page.getByLabel('直前のしずくの正式名',{exact:true}).fill('とけい');
  await page.getByRole('checkbox',{name:'描き手に正式名を隠す'}).check();
  assert.equal(await page.getByLabel('直前のしずくの正式名',{exact:true}).count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const canvas=page.getByTestId('window-drawing-canvas');await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox();
  for(let i=0;i<=48;i++){const angle=i/48*Math.PI*2;await page.mouse.move(box.x+box.width*(.5+.25*Math.cos(angle)),box.y+box.height*(.5+.25*Math.sin(angle)));if(i===0)await page.mouse.down();}
  await page.mouse.up();
  const pixels=await canvas.evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let dark=0;for(let i=0;i<data.length;i+=4)if(data[i]<100&&data[i+1]<100&&data[i+2]<100&&data[i+3]>0)dark++;return dark;});
  assert(pixels>20,'Drawing canvas is blank');
  await page.screenshot({path:'artifacts/release/offline-context-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'一度だけ認識する',exact:true}).click();
  await page.getByTestId('policy-A').waitFor({timeout:60000});
  assert((await page.getByTestId('policy-A').innerText()).includes('まる'));
  await page.getByRole('button',{name:'この設定・評価を記録する'}).click();
  await page.getByLabel('C 方式',{exact:true}).selectOption('bonus');
  await page.getByLabel('C 補正の強さ',{exact:true}).fill('0.08');
  await page.getByLabel('表情だけを比較',{exact:true}).selectOption('thinking');
  await page.locator('.context-lab-expression img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.context().setOffline(true);
  await page.getByRole('button',{name:'この設定・評価を記録する'}).click();
  const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'JSONを書き出す',exact:true}).click();
  const data=JSON.parse(await readFile(await(await jsonDownload).path(),'utf8'));
  assert.equal(data.records.length,2);assert.equal(data.records[0].contextWasHidden,true);assert.equal(data.records[0].sampleId,data.records[1].sampleId);assert.equal(data.records[0].drawingId,data.records[1].drawingId);
  const first=data.records[0].result.records[0], second=data.records[1].result.records[0];
  assert.deepEqual(first.comparison.candidates,second.comparison.candidates);assert.equal(first.comparison.candidates.length,345);
  assert.equal(first.comparison.selections.A.selectedLabel,'circle');assert.equal(first.comparison.expectedFirst,'い');
  assert.equal(first.policies.A.exactClassMatch,null);assert.equal(first.policies.C.observedContinuation,null);
  assert.equal(data.records[0].model.engine,'@litertjs/core@2.5.3');
  assert(!/"strokes"|"points"|imageDataUrl/.test(JSON.stringify(data)));
  const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'CSVを書き出す',exact:true}).click();
  const csv=await readFile(await(await csvDownload).path(),'utf8');assert(csv.includes('drawingId')&&csv.includes('circle'));
  await page.setViewportSize({width:1440,height:900});await page.getByRole('heading',{name:'ひとつの絵、3つの解釈'}).scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'artifacts/release/offline-context-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'消して新しく描く',exact:true}).click();
  assert.equal(await page.getByTestId('policy-A').count(),0);assert.equal(await page.getByLabel('意図したことば',{exact:true}).count(),0);
  await page.getByRole('checkbox',{name:'描き手に正式名を隠す'}).uncheck();
  await page.getByLabel('言語',{exact:true}).selectOption('en');
  await page.getByLabel('直前のしずくの正式名',{exact:true}).fill('tree');
  await canvas.scrollIntoViewIfNeeded(); const secondBox=await canvas.boundingBox();
  for(let i=0;i<=48;i++){const angle=i/48*Math.PI*2;await page.mouse.move(secondBox.x+secondBox.width*(.5+.25*Math.cos(angle)),secondBox.y+secondBox.height*(.5+.25*Math.sin(angle)));if(i===0)await page.mouse.down();}
  await page.mouse.up();await page.getByRole('button',{name:'一度だけ認識する',exact:true}).click();
  await page.getByTestId('policy-A').waitFor({timeout:60000});assert((await page.getByTestId('policy-A').innerText()).includes('circle'));
  assert.deepEqual(receipt.external,[]);assert.equal(receipt.posts,0);assert.deepEqual(receipt.pageErrors,[]);
  receipt.checks=['no result/gold before inference','canonical context can be hidden','nonblank real pointer canvas','actual local model 345 ranks and Japanese baseline','same sample/ranking across two C settings','expression independent','explicit metadata-only JSON and CSV','unreviewed gold/observations remain unreviewed','new drawing conceals previous result','settings/export and warmed English model inference with HTTP disabled','390x844 and1440x900 no horizontal overflow'];
  receipt.status='success';receipt.darkDrawingPixels=pixels;receipt.ranks=345;receipt.settings=2;
} catch(error){receipt.status='failure';receipt.error=String(error);throw error;}
finally {await browser?.close();server.kill();await writeFile('artifacts/release/offline-context-research.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));}
