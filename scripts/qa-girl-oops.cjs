async (page) => {
  const base=new URL(page.url()).origin, report=[];
  const assert=(v,m)=>{if(!v)throw new Error(m);};
  await page.setViewportSize({width:360,height:800});
  for(const mode of ['day','night']) for(const reduced of [false,true]) {
    await page.goto(base);
    await page.evaluate(mode=>{localStorage.setItem('drawindow-language','ja');localStorage.setItem('drawindow-mode',mode);},mode);
    await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
    await page.reload();
    await page.getByRole('button',{name:'デモで遊ぶ',exact:true}).waitFor();
    await page.evaluate(()=>{
      window.oopsPhases=[];
      const root=document.querySelector('main');
      new MutationObserver(()=>{const p=root.dataset.phase;if(window.oopsPhases.at(-1)!==p)window.oopsPhases.push(p);})
        .observe(root,{attributes:true,attributeFilter:['data-phase']});
    });
    await page.getByRole('button',{name:'デモで遊ぶ',exact:true}).click();
    await page.getByRole('button',{name:'あなたの番',exact:true}).click();
    const canvas=page.getByTestId('window-drawing-canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width*.3,box.y+box.height*.3);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:6});await page.mouse.up();
    await page.getByRole('button',{name:'できた',exact:true}).click();
    await page.locator('main[data-phase=girl_notice]').waitFor();
    assert(await page.getByRole('status').innerText()==='あっ。','No realization');
    assert(await page.getByRole('button',{name:'あなたの番',exact:true}).count()===0,'Player enters before correction');
    assert(!(await page.locator('main').innerText()).includes('らいおん'),'Answer leaked');
    if(!reduced)await page.screenshot({path:`output/playwright/oops-${mode}-notice.png`});
    await page.locator('main[data-phase=girl_flustered]').waitFor();
    assert(await page.getByTestId('character-scene').getAttribute('data-pose')==='shy','No shy pose');
    if(!reduced)await page.screenshot({path:`output/playwright/oops-${mode}-shy.png`});
    if(!reduced){
      await page.locator('main[data-phase=girl_breath]').waitFor();
      assert(await page.getByTestId('character-scene').getAttribute('data-pose')==='breath','No corrective breath');
      await page.screenshot({path:`output/playwright/oops-${mode}-breath.png`});
    }
    await page.getByRole('button',{name:'あなたの番',exact:true}).waitFor();
    const phases=await page.evaluate(()=>window.oopsPhases);
    assert(phases.join(',').includes('girl_notice,girl_flustered,girl_breath,girl_drawing,girl_holding'),'Wrong correction order '+phases);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow');
    report.push({mode,reduced,phases,answerHidden:true});
  }
  return {scope:'Synthetic DEMO and browser presentation only',report};
}
