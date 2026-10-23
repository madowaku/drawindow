import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const playwrightModule = process.env.DRAWINDOW_PLAYWRIGHT_MODULE;
const { chromium } = await import(playwrightModule ? pathToFileURL(playwrightModule).href : 'playwright');
const base = process.env.DRAWINDOW_QA_URL ?? 'http://localhost:5173/';
const folder = process.env.DRAWINDOW_QA_FOLDER ?? 'artifacts/qa/v03';
await mkdir(folder, { recursive:true });
const browser = await chromium.launch({ headless:true, ...(process.env.DRAWINDOW_BROWSER_EXECUTABLE ? { executablePath: process.env.DRAWINDOW_BROWSER_EXECUTABLE } : {}) });
const report = { scope:'Automated Chromium mouse/touch simulation and explicit DEMO. Not human playtest, Android hardware or genuine recognition.', base, journeys:[] };
const selectedWidths = process.env.DRAWINDOW_QA_WIDTHS?.split(',').map(Number);
if (selectedWidths) {
  try {
    const previous = JSON.parse(await readFile(`${folder}/browser-journeys.json`, 'utf8'));
    if (previous.base === base) report.journeys = previous.journeys.filter(journey => !selectedWidths.includes(journey.viewport[0]));
  } catch { /* A focused run can also start a fresh report. */ }
}
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function draw(page, round) {
  const canvas = page.getByTestId('window-drawing-canvas');
  const box = await canvas.boundingBox();
  assert(box && box.width > 0, 'Missing drawing square');
  const center = { x:box.x + box.width * .5, y:box.y + box.height * .5 };
  assert(await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.getAttribute('data-testid') === 'window-drawing-canvas', center), 'Character intercepts drawing input');
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.65);
  await page.mouse.down();
  for (let i=1;i<=18;i++) {
    const t=i/18;
    await page.mouse.move(box.x+box.width*(.25+t*.5),box.y+box.height*(.65-Math.sin(t*Math.PI)*(.27+round*.01)));
  }
  await page.mouse.up();
  return box;
}

try {
  for (const [width,height] of [[360,800],[720,1280],[1280,720]]) {
    if (selectedWidths && !selectedWidths.includes(width)) continue;
    for (const mode of ['day','night']) {
      const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:width===360?2:1, reducedMotion:'no-preference', hasTouch:width<1000 });
      const page = await context.newPage();
      const errors=[];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type()==='error') errors.push(message.text()); });
      await page.goto(base);
      await page.getByRole('button',{name:mode.toUpperCase(),exact:true}).click();
      await page.evaluate(() => {
        window.qaPhases=[];
        const main=document.querySelector('main');
        new MutationObserver(()=>{ const phase=main.dataset.phase; if(window.qaPhases.at(-1)!==phase) window.qaPhases.push(phase); }).observe(main,{attributes:true,attributeFilter:['data-phase']});
      });
      await page.getByRole('button',{name:'PLAY DEMO'}).click();
      const prefix=`${width}-${mode}`;
      await page.screenshot({path:`${folder}/${prefix}-breath.png`});
      await page.getByTestId('stroke-tip-overlay').waitFor({state:'attached',timeout:15000});
      await page.locator('.stroke-tip-overlay__contact').waitFor({state:'visible'});
      const cursor = await page.getByTestId('stroke-tip-overlay').evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top),pointerEvents:getComputedStyle(el).pointerEvents,inlineStyle:el.getAttribute('style'),connected:el.isConnected}));
      assert(cursor.pointerEvents==='none',`Cursor must not intercept input: ${JSON.stringify(cursor)}`);
      await page.screenshot({path:`${folder}/${prefix}-drawing.png`});
      for (let round=1;round<=5;round++) {
        await page.getByRole('button',{name:'YOUR TURN'}).waitFor({state:'visible',timeout:15000});
        const state = await page.evaluate(()=>({phase:document.querySelector('main').dataset.phase,overflow:document.documentElement.scrollWidth>innerWidth,scroll:document.documentElement.scrollHeight>innerHeight+1,pose:document.querySelector('[data-testid="character-scene"]').dataset.pose,missing:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length,spoilers:document.querySelectorAll('input,.score-strip,.interpretation').length}));
        assert(!state.overflow&&!state.scroll,`${prefix}: play requires scrolling`);
        assert(state.missing===0&&state.spoilers===0,`${prefix}: missing image or early disclosure`);
        assert(await page.getByTestId('stroke-tip-overlay').count()===0,'Cursor remains after pen lift/end');
        if(round===1) {
          await page.screenshot({path:`${folder}/${prefix}-holding.png`});
          const ink=await page.getByTestId('window-drawing-canvas').evaluate(c=>c.toDataURL());
          await page.waitForTimeout(1050);
          assert(ink===await page.getByTestId('window-drawing-canvas').evaluate(c=>c.toDataURL()),'Held ink faded');
        }
        await page.getByRole('button',{name:'YOUR TURN'}).click();
        await draw(page,round);
        assert(await page.getByRole('button',{name:'DONE',exact:true}).isEnabled(),'Pointer stroke was not retained');
        if(round===1) {
          await page.getByRole('button',{name:'Undo last edit'}).click();
          assert(!await page.getByRole('button',{name:'DONE',exact:true}).isEnabled(),'Undo did not clear the single stroke');
          const box=await page.getByTestId('window-drawing-canvas').boundingBox();
          if (width<1000) await page.touchscreen.tap(box.x+box.width*.4,box.y+box.height*.4);
          else await page.mouse.click(box.x+box.width*.4,box.y+box.height*.4);
          assert(await page.getByRole('button',{name:'DONE',exact:true}).isEnabled(),'Touch pointer tap did not draw');
          await page.getByRole('button',{name:'CLEAR',exact:true}).click();
          await draw(page,round);
          await page.screenshot({path:`${folder}/${prefix}-player.png`});
        }
        await page.getByRole('button',{name:'DONE',exact:true}).click();
      }
      await page.getByRole('heading',{name:'What did you mean?'}).waitFor();
      const labels=page.getByRole('textbox');
      assert(await labels.count()===5,'Expected exactly five intention fields');
      for(let i=0;i<5;i++) await labels.nth(i).fill(['tree','egg','goat','rain','nest'][i]);
      await page.getByRole('button',{name:'REVEAL OUR CHAIN'}).click();
      assert(await page.locator('.result-drawing').count()===10&&await page.locator('.chain-link').count()===9,'Wrong final entry/link count');
      assert(await page.getByText(/This result is not score-comparable/).count()===1,'Demo comparable disclosure missing');
      await page.screenshot({path:`${folder}/${prefix}-results.png`});
      const phases=await page.evaluate(()=>window.qaPhases);
      assert(phases.filter(p=>p==='girl_breath').length===5,'Expected five breath/refog phases');
      assert(errors.length===0,`Browser errors: ${errors.join('; ')}`);
      const journey={viewport:[width,height],mode,phases,breaths:5,entries:10,links:9,normalMotion:true,cursor,errors};
      report.journeys.push(journey);
      console.log(JSON.stringify({passed:prefix,breaths:5,entries:10,links:9}));
      await context.close();
    }
  }
  const context=await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce'});
  const page=await context.newPage(); await page.goto(base); await page.getByRole('button',{name:'PLAY DEMO'}).click(); await page.getByRole('button',{name:'YOUR TURN'}).waitFor();
  assert(await page.getByTestId('stroke-tip-overlay').count()===0,'Reduced motion cursor should be absent');
  assert(await page.getByTestId('character-scene').getAttribute('data-running')==='false','Reduced motion animation is running');
  report.reducedMotionPassed=true;
  await context.close();
} finally {
  await browser.close();
  await writeFile(`${folder}/browser-journeys.json`,JSON.stringify(report,null,2)+'\n');
}
