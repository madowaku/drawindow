import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const batch = ['b', 'c', 'd', 'e'].includes(process.argv[2]) ? `-${process.argv[2]}` : '';
const folder = `artifacts/qa/doodle-expansion-20261022${batch}`;
await mkdir(folder, { recursive: true });
const additions = JSON.parse(await readFile(`src/data/shizuku-doodles/expansion-20261022${batch}.json`, 'utf8')).doodles;
await writeFile(`${folder}/index.html`, `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>しずくの新しい絵 13枚</title>
<style>body{margin:0;padding:28px;background:#f5f1e8;color:#283d36;font:16px system-ui}main{max-width:1000px;margin:auto}h1{font-size:25px}button{padding:12px;margin:0 8px 18px 0;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:14px}article{background:#fffdf8;border-radius:18px;padding:12px;text-align:center}canvas{width:100%;aspect-ratio:1;display:block}p{margin:6px}small{display:block;color:#67746e}body.hide .answer{visibility:hidden}body.night{background:#172938;color:#e4ebe5}body.night article{background:#283f4c}body.night small{color:#b2c6c9}</style>
<main><h1>しずくの新しい絵 — 13枚</h1><p>名前を隠して、何に見えるか眺めてみてください。</p><button id="names">名前を隠す / 表示</button><button id="mode">昼 / 夜</button><button id="replay">もう一度描く</button><section class="grid"></section></main>
<script type="module">
import { adoptedShizukuSketches } from '/src/data/shizuku-doodles/adopted.ts';
import { drawStrokes } from '/src/lib/strokes.ts';
const additions = ${JSON.stringify(additions.map(d => ({key:d.key,labelJa:d.labelJa,labelEn:d.labelEn})))};
const items = additions.map(d => {const s=adoptedShizukuSketches.find(s=>s.id==='shizuku-style-v01-'+d.key); const a=document.createElement('article');a.innerHTML='<canvas width="240" height="240" aria-label="'+d.labelJa+'"></canvas><p class="answer">'+d.labelJa+'<small>'+d.labelEn+'</small></p>';document.querySelector('.grid').append(a);return {s,c:a.querySelector('canvas')};});
function paint(t=1200){for(const {s,c} of items){const ctx=c.getContext('2d');ctx.clearRect(0,0,240,240);drawStrokes(ctx,s.strokes.map(s=>({...s,points:s.points.filter(p=>p.t<=t)})),240,240,{color:document.body.classList.contains('night')?'#edf4ee':'#273a34'});}}
document.querySelector('#names').onclick=()=>{document.body.classList.toggle('hide');for(const {c} of items)c.setAttribute('aria-label',document.body.classList.contains('hide')?'しずくの絵':c.closest('article').querySelector('p').firstChild.textContent);};
document.querySelector('#mode').onclick=()=>{document.body.classList.toggle('night');paint();};
let animation;document.querySelector('#replay').onclick=()=>{cancelAnimationFrame(animation);const start=performance.now();function tick(now){paint(Math.min(1200,now-start));if(now-start<1200)animation=requestAnimationFrame(tick);}animation=requestAnimationFrame(tick);};paint();window.ready=true;
</script></html>`);
const { chromium } = await import(pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({headless:true,executablePath:process.env.DRAWINDOW_BROWSER_EXECUTABLE});
try {
  const page = await browser.newPage({viewport:{width:1080,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:5195/${folder}/index.html`);
  await page.waitForFunction(()=>window.ready);
  assert.equal(await page.locator('canvas').count(),13);
  const ink = await page.locator('canvas').evaluateAll(cs=>cs.map(c=>{const a=c.getContext('2d').getImageData(0,0,240,240).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n;}));
  assert(ink.every(n=>n>200));
  await page.screenshot({path:`${folder}/day.png`,fullPage:true});
  await page.locator('#mode').click();
  await page.screenshot({path:`${folder}/night.png`,fullPage:true});
  await page.locator('#names').click();
  assert.equal(await page.locator('canvas[aria-label="しずくの絵"]').count(),13);
  await page.setViewportSize({width:360,height:800});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#replay').click();
  await page.waitForTimeout(1400);
  assert.deepEqual(errors,[]);
  await writeFile(`${folder}/receipt.json`,JSON.stringify({count:13,inkPixels:ink,errors,mobileOverflow:false,scope:'Real canvas rendering of local assets; no human or LIVE recognition validation.'},null,2));
  console.log('13 real canvas drawings, DAY/NIGHT, mobile layout and replay: PASS');
} finally {await browser.close();}
