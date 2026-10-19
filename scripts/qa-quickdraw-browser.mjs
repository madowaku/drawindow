import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

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
  page.on('console',msg=>{if(['warning','error'].includes(msg.type()))failures.push(msg.type()+': '+msg.text());});
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
  console.log(JSON.stringify({predictions:prediction,pageErrors:failures,networkRequests:requests.filter(x=>!x.startsWith(origin))},null,2));
  if(failures.length)throw Error('Browser errors: '+failures.join(' / '));
  if(prediction.some(p=>p.source!=='ml'||!p.guess))throw Error('Trained local ML did not infer: '+JSON.stringify(prediction));
  if(requests.some(x=>/api\/recognize|generativelanguage|huggingface|jsdelivr/i.test(x)))throw Error('Unexpected runtime network request');
} finally {
  await browser?.close();
  server.kill();
}
