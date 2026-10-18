import { pathToFileURL } from 'node:url';
import { mkdir,writeFile } from 'node:fs/promises';
const {chromium}=await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.DRAWINDOW_BROWSER_EXECUTABLE?{executablePath:process.env.DRAWINDOW_BROWSER_EXECUTABLE}:{})});
const folder='artifacts/qa/v04';await mkdir(folder,{recursive:true});
const report={scope:'Browser and image integrity only; art approval, Android hardware touch and subjective acting quality pending.',journeys:[]};
const assert=(v,m)=>{if(!v)throw new Error(m);};
try {
  for(const [width,height] of [[360,800],[720,1280],[1280,720]]) for(const mode of ['day','night']) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===360?2:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:5173/?character-preview&archive-candidates');
    await page.getByRole('button',{name:mode.toUpperCase(),exact:true}).click();
    const samples=[];
    for(const pose of ['NEUTRAL','BREATH','DRAWING','SMILE','SHY','THINKING','CURIOUS']) {
      await page.getByRole('button',{name:new RegExp(`^${pose} ·`)}).click();
      await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
      const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,missing:[...document.images].filter(i=>!i.naturalWidth||i.hidden).length,active:[...document.querySelectorAll('.character-scene__sprite[data-active=true]')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,eyeX:i.style.getPropertyValue('--pose-eye-x'),eyeY:i.style.getPropertyValue('--pose-eye-y'),matrix:getComputedStyle(i).transform}))}));
      assert(!state.overflow&&state.missing===0,`Invalid layout/images ${width}-${mode}-${pose}`);
      samples.push({pose,...state});
      if(['NEUTRAL','BREATH','DRAWING','SMILE'].includes(pose))await page.screenshot({path:`${folder}/${width}-${mode}-character-${pose.toLowerCase()}.png`,fullPage:true});
    }
    await page.getByRole('button',{name:'プレビューで動きを試す'}).click();
    await page.locator('.character-preview__window').last().scrollIntoViewIfNeeded();
    await page.locator('.character-scene[data-running=true]').first().waitFor({state:'attached'});
    assert(await page.locator('.character-scene[data-running=true]').count()>=1,'Visible motion did not start');
    await page.getByRole('button',{name:'動きを止める'}).click();
    assert(await page.locator('.character-scene[data-running=false]').count()===2,'Motion did not stop');
    await page.getByRole('button',{name:'ガラス越し',exact:true}).click();
    assert(await page.locator('.title-art__glass').count()===0,'Glass toggle did not clear layer');
    await page.screenshot({path:`${folder}/${width}-${mode}-character-clear.png`,fullPage:true});
    assert(!errors.length,errors.join(';'));
    report.journeys.push({viewport:[width,height],mode,samples,errors});await context.close();
  }
}finally{await browser.close();await writeFile(`${folder}/character-checks.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify({characterJourneys:report.journeys.length}));
