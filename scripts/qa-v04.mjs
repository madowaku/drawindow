import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href : 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
const folder = 'artifacts/qa/v04';
await mkdir(folder,{recursive:true});
const browser = await chromium.launch({headless:true,executablePath:process.env.DRAWINDOW_BROWSER_EXECUTABLE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const report = {scope:'Automated Chromium simulation and raster checks. No human judgement, hardware touch or recognition quality claim.', comparisons:[], catalogue:[]};
const assert = (v,m) => {if(!v) throw new Error(m);};
try {
  for (const [width,height] of [[360,800],[720,1280],[1280,720]]) for(const mode of ['day','night']) {
    const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:width===360?2:1,reducedMotion:'reduce',hasTouch:true});
    const page = await context.newPage(); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:5173/?glass-preview');
    await page.getByRole('button',{name:mode.toUpperCase(),exact:true}).click();
    await page.screenshot({path:`${folder}/${width}-${mode}-comparison.png`,fullPage:true});
    if(width===1280) for(const style of ['legacy','tactile'])await page.locator(`[data-comparison=${style}]`).screenshot({path:`${folder}/${mode}-${style}-glass.png`});
    const pixels = await page.evaluate(async () => {
      const {renderDrawingDataUrl} = await import('/src/lib/strokes.ts');
      const {girlSketches} = await import('/src/data/sketches.ts');
      const {wipeCondensation,drawWetEdges} = await import('/src/lib/glass.ts');
      const strokes = [{id:'probe',points:[{x:.15,y:.5,t:0},{x:.85,y:.5,t:400}]}];
      const before = renderDrawingDataUrl(strokes);
      const fog=document.createElement('canvas'),wet=document.createElement('canvas'); fog.width=wet.width=256; fog.height=wet.height=256;
      const f=fog.getContext('2d'),w=wet.getContext('2d');f.fillStyle='#bed8df';f.fillRect(0,0,256,256);
      wipeCondensation(f,strokes,256);drawWetEdges(w,strokes,256,document.querySelector('main').dataset.mode);
      return {fogCenter:f.getImageData(128,128,1,1).data[3],fogOutside:f.getImageData(128,100,1,1).data[3],wetCenter:w.getImageData(128,128,1,1).data[3],sameExport:before===renderDrawingDataUrl(strokes),dimensions:[512,512],catalogueCount:girlSketches.length};
    });
    assert(pixels.fogCenter===0&&pixels.wetCenter===0&&pixels.fogOutside===255,'Path center must show the scene without opaque ink');
    assert(pixels.sameExport,'Presentation changed neutral export');
    const surfaces=page.getByTestId('window-drawing-canvas');
    await page.getByRole('button',{name:'CLEAR',exact:true}).click();
    const canvas=surfaces.nth(1);await canvas.scrollIntoViewIfNeeded(); const box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width*.2,box.y+box.height*.4);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.8,box.y+box.height*.7,{steps:15});
    assert(await page.locator('.window-canvas__finger').count()===1,'Fingertip contact missing');
    await page.mouse.up();
    assert(await page.locator('.window-canvas__finger').count()===0,'Fingertip remains after release');
    assert(await surfaces.nth(0).getAttribute('data-has-strokes')==='true','A/B geometry not shared');
    const retained=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(1050);
    assert(retained===await canvas.evaluate(c=>c.toDataURL()),'User mark faded');
    await page.getByRole('button',{name:'UNDO',exact:true}).click();
    assert(await canvas.getAttribute('data-has-strokes')==='false','Undo did not restore fog');
    await canvas.scrollIntoViewIfNeeded();const tap=await canvas.boundingBox();await page.touchscreen.tap(tap.x+tap.width*.5,tap.y+tap.height*.5);
    assert(await canvas.getAttribute('data-has-strokes')==='true','Touch tap-dot failed');
    await page.getByRole('button',{name:'CLEAR',exact:true}).click();
    await canvas.focus(); await page.keyboard.down('Space');await page.keyboard.press('ArrowRight');await page.keyboard.up('Space');
    assert(await canvas.getAttribute('data-has-strokes')==='true','Keyboard stroke failed');
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Horizontal overflow');
    assert(errors.length===0,errors.join(';'));
    report.comparisons.push({viewport:[width,height],mode,pixels,errors});await context.close();
  }
  const context=await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto('http://localhost:5173/?catalogue-preview');
  const before = await page.locator('body').innerText();
  assert(!/\bowl\b|qd-owl|girl-owl/.test(before),'Blind page disclosed target');
  for (const mode of ['day','night']) {
    await page.getByRole('button',{name:mode.toUpperCase(),exact:true}).click();
    const metrics=await page.evaluate(async () => {
      const {girlSketches}=await import('/src/data/sketches.ts');
      return girlSketches.map(s=>{const pts=s.strokes.flatMap(p=>p.points), n=pts.length;return {id:s.id,word:s.word,strokes:s.strokes.length,points:n,shortSegments:s.strokes.reduce((sum,st)=>sum+st.points.slice(1).filter((p,i)=>Math.hypot(p.x-st.points[i].x,p.y-st.points[i].y)<.012).length,0),width:Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)),height:Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))};});
    });
    report.catalogue=metrics;
    // A labelled developer contact sheet is distinct from the blind participant page.
    await page.evaluate(async (mode) => {
      const {girlSketches}=await import('/src/data/sketches.ts');const {owlCandidate}=await import('/src/dev/readabilityCandidates.ts');
      const {drawStrokes}=await import('/src/lib/strokes.ts');
      const main=document.querySelector('main');main.replaceChildren();main.style.cssText='padding:16px;max-width:1120px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;height:auto;';
      for(const s of [...girlSketches,owlCandidate]){const a=document.createElement('article'),label=document.createElement('p'),c=document.createElement('canvas');c.width=c.height=256;c.style.width='100%';label.textContent=s.id.includes('review')?'owl · REVIEW CANDIDATE':s.word;const ctx=c.getContext('2d');ctx.fillStyle=mode==='day'?'#eef3f0':'#192e40';ctx.fillRect(0,0,256,256);drawStrokes(ctx,s.strokes,256,256,{color:mode==='day'?'#15303b':'#edf7fa',widthScale:1});a.append(label,c);main.append(a);}
    },mode);
    await page.setViewportSize({width:1120,height:900});await page.screenshot({path:`${folder}/catalogue-${mode}-contact-sheet.png`,fullPage:true});
    await page.goto('http://localhost:5173/?catalogue-preview');
  }
  await context.close();
} finally { await browser.close();await writeFile(`${folder}/v04-checks.json`,JSON.stringify(report,null,2)); }
console.log(JSON.stringify({comparisons:report.comparisons.length,catalogue:report.catalogue.length}));
