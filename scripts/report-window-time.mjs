import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=await createServer({configFile:false,envDir:false,cacheDir:'.wrangler/window-time-report',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
try{
  const [{adoptedShizukuSketches},{planTempo,TEMPOS}]=await Promise.all([server.ssrLoadModule('/src/data/shizuku-doodles/adopted.ts'),server.ssrLoadModule('/src/dev/windowTime/tempo.ts')]);
  assert.equal(adoptedShizukuSketches.length,291);
  const geometry=strokes=>JSON.stringify(strokes.map(s=>({id:s.id,points:s.points.map(({t,...p})=>p)})));
  const modes={};
  for(const mode of ['day','night']){modes[mode]={};for(const tempo of TEMPOS){
    const plans=adoptedShizukuSketches.map(sketch=>{const plan=planTempo(sketch.strokes,mode,tempo);assert.equal(geometry(plan.strokes),geometry(sketch.strokes));return plan;});
    const durations=plans.map(p=>p.drawingMs).sort((a,b)=>a-b),mean=Math.round(durations.reduce((a,b)=>a+b,0)/durations.length);
    modes[mode][tempo]={drawings:plans.length,breathMs:plans[0].breathMs,minDrawingMs:durations[0],medianDrawingMs:durations[Math.floor(durations.length/2)],maxDrawingMs:durations.at(-1),meanDrawingMs:mean,leadMs:tempo==='A'?'14% of drawing':plans[0].leadMs,meanFiveGirlBeatsMs:5*(mean+plans[0].breathMs),geometryUnchanged:true};
  }}
  const report={method:'Deterministic presentation timing of 291 adopted drawings; not inference, human ratings or observed play duration. Five-beat budgets exclude player time, recognition, correction, ending and visibility pauses.',presets:{A:'Original timestamps, 500–1500ms, 14% hold and original easing',B:'DAY1800–3000ms including lead; NIGHT adds 80ms lead and up to 220ms pen-up allowance',C:'DAY2500–4000ms including lead; NIGHT adds 80ms lead and up to 220ms pen-up allowance; no forced post-drawing wait'},modes,ending:{A:{pairMs:1000,linkMs:650,goodbyeMs:4000},B:{pairMs:1250,linkMs:850,goodbyeMs:5000},C:{pairMs:1500,linkMs:1000,goodbyeMs:6000}},human:{developerSelfPlay:null,pilots:0,recommendation:'B is a provisional first human-test candidate, not an adopted product default'}};
  const text=JSON.stringify(report,null,2)+'\n',file='docs/WINDOW_TIME_v012_PARAMETERS.json';
  if(process.argv.includes('--check'))assert.equal(await readFile(file,'utf8'),text,'Window-time report differs; regenerate and review it');else await writeFile(file,text);
  console.log(JSON.stringify(report));
}finally{await server.close();}
