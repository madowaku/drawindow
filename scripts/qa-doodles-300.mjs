import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.DRAWINDOW_BROWSER_EXECUTABLE});
const folder='artifacts/qa/shizuku-300';
try{
 const page=await browser.newPage({viewport:{width:1080,height:900}});const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!new URL(r.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/))external.push(r.url());});
 await page.goto('http://127.0.0.1:5300/'+folder+'/index.html');await page.waitForFunction(()=>window.ready);
 assert.equal(await page.locator('svg[aria-label="しずくの絵"]').count(),24);
 await page.locator('#names').click();
 for(let i=0;i<7;i++){await page.locator('#category').selectOption(String(i));assert.equal(await page.locator('article').count(),[24,22,24,23,24,21,24][i]);await page.screenshot({path:folder+'/group-'+i+'-day.png',fullPage:true});await page.locator('#mode').click();await page.screenshot({path:folder+'/group-'+i+'-night.png',fullPage:true});await page.locator('#mode').click();}
 await page.setViewportSize({width:360,height:800});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:folder+'/mobile.png',fullPage:true});
 await page.locator('#single').click();assert.equal(await page.locator('svg').count(),1);await page.locator('#next').click();assert.equal(await page.locator('#position').innerText(),'2 / 24');await page.locator('#prev').click();assert.equal(await page.locator('#position').innerText(),'1 / 24');await page.locator('#names').click();assert.equal(await page.locator('svg[aria-label="しずくの絵"]').count(),1);await page.locator('#replay').click();await page.waitForTimeout(1400);
 // Validate the actual game canvas renderer independently of the SVG review sheet.
 const runtime=await page.evaluate(async()=>{const {adoptedShizukuSketches}=await import('/src/data/shizuku-doodles/adopted.ts');const {drawStrokes}=await import('/src/lib/strokes.ts');const canvas=document.createElement('canvas');canvas.width=240;canvas.height=240;const ctx=canvas.getContext('2d');return adoptedShizukuSketches.map(s=>{const frames=[300,1200].map(time=>{ctx.clearRect(0,0,240,240);drawStrokes(ctx,s.strokes.map(stroke=>({...stroke,points:stroke.points.filter(p=>p.t<=time)})),240,240);const data=ctx.getImageData(0,0,240,240).data;let ink=0;for(let i=3;i<data.length;i+=4)if(data[i])ink++;return ink;});return {id:s.id,frames};});});
 assert.equal(runtime.length,294);assert(runtime.every(s=>s.frames[0]>0&&s.frames[1]>200&&s.frames[1]>=s.frames[0]));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await writeFile(folder+'/receipt.json',JSON.stringify({count:294,newDrawings:162,runtime,errors,externalRequests:external,mobileOverflow:false,scope:'Actual game canvas for all 294 drawings, review gallery DAY/NIGHT, replay and 360px. No human readability or LIVE recognition claim.'},null,2)+'\n');console.log('PASS: 294 game canvases, 162 review drawings, 7 DAY/NIGHT sheets, mobile, replay, no external requests');
}finally{await browser.close();}
