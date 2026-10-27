import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const stage = process.argv.includes('--before') ? 'before' : 'after';
const folder = 'artifacts/qa/night-presence';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const report = { scope: 'Synthetic DEMO browser input; no human play or device claim.', journeys: [], errors: [] };
try {
  for (const [mode, lang, width, height, motion] of stage === 'before' ? [['night','en',1280,800,'reduce']] : [
    ['night','en',1280,800,'reduce'], ['night','ja',390,844,'no-preference'],
    ['day','en',390,844,'reduce'], ['day','ja',1280,800,'reduce'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:5175/');
    await page.getByRole('button',{name:lang === 'ja'?'日本語':'English',exact:true}).click();
    await page.getByRole('button',{name:lang === 'ja'?(mode==='night'?'夜':'昼'):mode.toUpperCase(),exact:true}).click();
    const prefix = `${folder}/${stage}-${mode}-${lang}-${width}`;
    await page.locator('.title-art img').evaluateAll(imgs => Promise.all(imgs.map(i => i.decode())));
    await page.screenshot({path:prefix+'-title.png'});
    await page.getByRole('button',{name:lang==='ja'?'デモで遊ぶ':'PLAY DEMO',exact:true}).click();
    const turn=()=>page.getByRole('button',{name:lang==='ja'?'あなたの番':'YOUR TURN',exact:true});
    const done=()=>page.getByRole('button',{name:lang==='ja'?'できた':'DONE',exact:true});
    await turn().click();
    await page.waitForTimeout(700);
    const canvas=page.getByTestId('window-drawing-canvas');
    const fog=page.locator('.window-canvas__fog');
    const image=async()=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return fog.evaluate(c=>c.toDataURL()).then(value=>createHash('sha256').update(value).digest('hex'));};
    const draw=async()=>{
      await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();
      await page.mouse.move(b.x+b.width*.23,b.y+b.height*.43);await page.mouse.down();
      await page.mouse.move(b.x+b.width*.77,b.y+b.height*.43,{steps:24});await page.mouse.up();
      await page.mouse.move(5,5);
    };
    // First save inserts the existing session feedback above the play area.
    // Establish that layout before comparing fog pixels across edit history.
    await draw();await page.locator('.clear-tool').click();await page.waitForTimeout(400);
    await page.screenshot({path:prefix+'-blank.png'});
    const blank=await image();
    await draw();const drawn=await image();assert.notEqual(drawn,blank);
    await page.screenshot({path:prefix+'-drawn.png'});
    if(stage==='before'){await context.close();continue;}
    await page.locator('.clear-tool').click();assert.equal(await image(),blank);
    await page.getByRole('button',{name:lang==='ja'?'元に戻す':'Undo last edit',exact:true}).click();assert.equal(await image(),drawn);
    await page.getByRole('button',{name:lang==='ja'?'やり直す':'Redo last edit',exact:true}).click();assert.equal(await image(),blank);
    await page.getByRole('button',{name:lang==='ja'?'元に戻す':'Undo last edit',exact:true}).click();
    await done().click();
    for(let i=1;i<5;i++){await turn().click();await draw();await done().click();}
    const fields=page.locator('.review-field input');await fields.first().waitFor();assert.equal(await fields.count(),5);
    for(let i=0;i<5;i++)await fields.nth(i).fill(lang==='ja'?'ねこ':'cat');
    await page.getByRole('button',{name:lang==='ja'?'答えあわせ':'REVEAL OUR CHAIN',exact:true}).click();
    await page.getByRole('button',{name:lang==='ja'?'答え合わせをする':'See what we meant',exact:true}).click();
    const skip=page.getByRole('button',{name:lang==='ja'?'すぐ見る・答えを開く':'Skip animation · see results',exact:true});
    if(await skip.count())await skip.click();
    assert.equal(await page.locator('.result-drawing').count(),10);assert.equal(await page.locator('.chain-link').count(),9);
    await page.getByRole('button',{name:lang==='ja'?'今日の窓を残す':'SAVE TODAY’S WINDOW',exact:true}).click();
    const souvenir=page.locator('.souvenir img');await souvenir.waitFor();await souvenir.evaluate(i=>i.decode());
    assert.deepEqual(await souvenir.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[1200,3000]);
    await page.screenshot({path:prefix+'-results.png'});
    assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||!i.naturalWidth).length),0);
    report.journeys.push({mode,lang,width,height,motion,rounds:5,drawings:10,links:9,png:[1200,3000],fogClearUndoRedo:'pixel-identical'});
    await context.close();
  }
  assert.equal(report.errors.length,0);
} finally {await browser.close();await writeFile(`${folder}/${stage}.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));



