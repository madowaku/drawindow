import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const origin='http://127.0.0.1:5392';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5392','--strictPort'],{
  env:{...process.env,VITE_ENABLE_LOCAL_ML:'true',VITE_RECOGNITION_URL:'',VITE_ENABLE_LIVE_API:'false'},stdio:['ignore','pipe','pipe'],
});
let tail='';
server.stdout.on('data',c=>{tail+=String(c).slice(-500);});
server.stderr.on('data',c=>{tail+=String(c).slice(-1000);});
let browser;
try {
  let ready=false;
  for(let t=0;t<100;t++) {
    if(server.exitCode!==null)throw Error('Vite exited: '+tail);
    try {const result=await fetch(origin+'/');if(result.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!ready)throw Error('Vite did not start: '+tail);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:720,height:1280},reducedMotion:'reduce'});
  const failures=[],requests=[];
  page.on('pageerror',e=>failures.push(e.message));
  // LiteRT emits INFO/WARNING messages through console.error even on a
  // successful CPU/WASM run with no GPU in headless CI. Only our own explicit
  // inference failures are actionable console diagnostics.
  page.on('console',msg=>{if(msg.text().includes('QuickDraw local inference failed'))failures.push(msg.type()+': '+msg.text());});
  page.on('request',r=>requests.push(r.url()));
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  const prediction=await page.evaluate(async()=>{
    const {createQuickDrawRecognizer,preloadQuickDrawModel}=await import('/src/services/quickDrawRecognizer.ts');
    await preloadQuickDrawModel();
    const recognizer=createQuickDrawRecognizer({minScore:0});
    const examples=[
      [{id:'b1',points:[{x:.2,y:.3,t:0},{x:.8,y:.3,t:10},{x:.6,y:.7,t:20},{x:.2,y:.3,t:30}]}],
      [{id:'b2',points:[{x:.3,y:.3,t:0},{x:.6,y:.5,t:10},{x:.3,y:.7,t:20},{x:.3,y:.3,t:30}]}],
    ];
    return Promise.all(examples.map((strokes,i)=>recognizer.recognize({requestId:'1:'+i+':1',strokes})));
  });
  // Controlled A/B using only existing Shizuku-labelled art, not human
  // benchmark data. Never use these numbers as player recognition accuracy.
  const comparison=await page.evaluate(async()=>{
    const {girlSketches}=await import('/src/data/sketches.ts');
    const {createQuickDrawRecognizer}=await import('/src/services/quickDrawRecognizer.ts');
    const labels = new Set((await (await fetch('/local-ml/labels.txt')).text()).trim().split(/\r?\n/));
    const seen = new Set();
    const sketches = girlSketches.filter(item => {
      if (item.readability === 'reject' || item.readability === 'spicy' ||
          !labels.has(item.word) || seen.has(item.word)) return false;
      seen.add(item.word);
      return true;
    }).slice(0,32);
    if(sketches.length<12)throw Error('Insufficient distinct eligible Shizuku reference sketches');
    const original = createQuickDrawRecognizer({minScore:0,preprocess:{polarity:'legacy',strokeRadiusHiRes:4}});
    const corrected = createQuickDrawRecognizer({minScore:0});
    const rows=[];
    for (const [index, item] of sketches.entries()) {
      const input={requestId:'qa:'+index,strokes:item.strokes,language:'en'};
      const before=await original.recognize(input);
      const after=await corrected.recognize(input);
      if(!before.guess||!after.guess)throw Error('Model inference did not return both predictions for '+item.word);
      const top3 = result => [result.guess,...(result.alternatives??[]).slice(0,2)];
      rows.push({
        expected:item.word,
        before:before.guess,after:after.guess,
        beforeTop3:top3(before).includes(item.word),
        afterTop3:top3(after).includes(item.word),
      });
    }
    const count = (key) => rows.filter(row=>row[key]).length;
    return {
      note:'Illustrator-authored sketches, not independent human-play accuracy. Polarity/line width differ; no training performed.',
      cases:rows.length,
      originalTop1:rows.filter(r=>r.before===r.expected).length,
      correctedTop1:rows.filter(r=>r.after===r.expected).length,
      originalTop3:count('beforeTop3'),
      correctedTop3:count('afterTop3'),
      rows,
    };
  });
  await mkdir('artifacts/release',{recursive:true});
  await writeFile('artifacts/release/quickdraw-preprocess-ab.json', JSON.stringify(comparison,null,2));
  console.log('QuickDraw preprocessing A/B (Shizuku art only):',JSON.stringify({
    cases:comparison.cases,
    legacyTop1:comparison.originalTop1,
    correctedTop1:comparison.correctedTop1,
    legacyTop3:comparison.originalTop3,
    correctedTop3:comparison.correctedTop3,
  }));
  console.log(JSON.stringify({predictions:prediction,pageErrors:failures,networkRequests:requests.filter(x=>!x.startsWith(origin))},null,2));
  if(failures.length)throw Error('Browser errors: '+failures.join(' / '));
  if(prediction.some(p=>p.source!=='ml'||!p.guess))throw Error('Trained local ML did not infer: '+JSON.stringify(prediction));
  if(requests.some(x=>/api\/recognize|generativelanguage|huggingface|jsdelivr/i.test(x)))throw Error('Unexpected runtime network request');
} finally {
  await browser?.close();
  server.kill();
}
