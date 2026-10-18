import {pathToFileURL} from 'node:url';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.DRAWINDOW_PLAYWRIGHT_MODULE?pathToFileURL(process.env.DRAWINDOW_PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.DRAWINDOW_BROWSER_EXECUTABLE?{executablePath:process.env.DRAWINDOW_BROWSER_EXECUTABLE}:{})});
const folder='artifacts/qa/v04';await mkdir(folder,{recursive:true});
const report={scope:'Developer visual inspection, automated playback only. Zero blind human participants; no production catalogue replacement.',samples:[]};
try{
  for(const reduced of [false,true]){
    const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:2,reducedMotion:reduced?'reduce':'no-preference'});const page=await context.newPage();
    await page.goto('http://localhost:5173/?catalogue-preview&review');
    for(const mode of ['day','night'])for(const sample of ['qd-owl-5322965052817408','girl-owl-review-v04-original']){
      await page.getByRole('button',{name:mode.toUpperCase(),exact:true}).click();
      await page.getByRole('combobox',{name:'制作サンプル'}).selectOption(sample);
      await page.locator('.v04-window').scrollIntoViewIfNeeded();
      if(!reduced){await page.getByTestId('stroke-tip-overlay').waitFor({state:'attached'});await page.locator('.v04-window').screenshot({path:`${folder}/${mode}-${sample}-playback.png`});}
      await page.getByTestId('stroke-tip-overlay').waitFor({state:'detached'});
      await page.waitForFunction(()=>document.querySelector('.character-scene')?.dataset.motion==='hold');
      for(const surface of ['fog','clear']){
        if(surface==='clear')await page.getByRole('button',{name:'曇りガラス',exact:true}).click();
        await page.locator('.v04-window').screenshot({path:`${folder}/${mode}-${sample}-${surface}-${reduced?'reduced':'normal'}.png`});
        report.samples.push({mode,sample,surface,reduced});
        if(surface==='clear')await page.getByRole('button',{name:'白地',exact:true}).click();
      }
      if(!reduced){await page.getByRole('button',{name:'元の再生速度',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.character-scene')?.dataset.motion==='hold');await page.locator('.v04-window').screenshot({path:`${folder}/${mode}-${sample}-1500ms.png`});await page.getByRole('button',{name:'ゆっくり 1500ms',exact:true}).click();}
    }
    await context.close();
  }
}finally{
  await browser.close();
  report.candidateSourceSha256=createHash('sha256').update(await readFile('src/dev/readabilityCandidates.ts')).digest('hex');
  await writeFile(`${folder}/readability-checks.json`,JSON.stringify(report,null,2));
}
console.log(JSON.stringify({readabilitySamples:report.samples.length}));
