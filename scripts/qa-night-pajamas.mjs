import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(process.env.DRAWINDOW_CANVAS_MODULE || '@napi-rs/canvas');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const folder = 'artifacts/qa/night-pajamas';
await mkdir(folder, { recursive: true });
try {
  const { drawFrost } = await server.ssrLoadModule('/src/components/WindowCanvas.tsx');
  const { wipeCondensation, drawWetEdges } = await server.ssrLoadModule('/src/lib/glass.ts');
  const { SHIZUKU_NIGHT_POSES } = await server.ssrLoadModule('/src/data/shizukuPoses.ts');
  const checks=[];
  const line = [{id:'test',points:[{x:.25,y:.5,t:0},{x:.75,y:.5,t:500}]}];
  for (const size of [360,720]) for (const tactile of [false,true]) {
    const c=createCanvas(size,size),ctx=c.getContext('2d');
    const alpha=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
    for (const phase of ['girl_breath','girl_drawing','girl_holding','player_drawing','recognizing']) {
      for(const progress of [0,.5,1]) {
        drawFrost(ctx,size,size,'night',phase,progress,tactile);
        assert.equal(alpha(size/2,size/2),255,`${phase} ${progress}: concealed`);
      }
    }
    drawFrost(ctx,size,size,'night','player_drawing',1,tactile);
    wipeCondensation(ctx,line,size);
    assert.equal(alpha(size/2,size/2),0,'stroke center reveals portrait');
    assert.equal(alpha(size/2,size*.25),255,'outside stroke stays concealed');
    drawFrost(ctx,size,size,'night','player_drawing',1,tactile);
    assert.equal(alpha(size/2,size/2),255,'CLEAR/UNDO repaint restores fog');
    drawFrost(ctx,size,size,'day','player_drawing',1,tactile);
    assert(alpha(size/2,size/2)<255,'DAY remains translucent');
    drawFrost(ctx,size,size,'night','title',1,tactile);
    assert.equal(alpha(size/2,size/2),0,'title shows outfit');
    checks.push({size,tactile,concealRevealClearDayTitle:'passed'});
  }
  // A reproducible native-canvas composition, NOT a browser screenshot.
  const width=384,height=512, sheet=createCanvas(width*3,height), out=sheet.getContext('2d');
  const portrait=await loadImage('public/art/shizuku-night/neutral.webp');
  const room=await loadImage('public/art/shizuku/room-night.webp');
  const example=[{id:'loop',points:Array.from({length:101},(_,i)=>({x:.5+.23*Math.cos(i/100*Math.PI*2),y:.48+.23*Math.sin(i/100*Math.PI*2),t:i*10}))},{id:'across-face',points:[{x:.2,y:.38,t:0},{x:.8,y:.38,t:600}]}];
  for(let i=0;i<3;i++) {
    out.drawImage(room,i*width,0,width,height);out.drawImage(portrait,i*width,0,width,height);
    if(i) {
      const fog=createCanvas(width,height),ctx=fog.getContext('2d');
      drawFrost(ctx,width,height,'night','player_drawing',1,true);
      if(i===2) {ctx.save();ctx.translate(0,height-width);wipeCondensation(ctx,example,width);ctx.restore();}
      out.drawImage(fog,i*width,0);
      if(i===2) {const wet=createCanvas(width,width),wetCtx=wet.getContext('2d');drawWetEdges(wetCtx,example,width,'night');out.drawImage(wet,i*width,height-width);}
    }
  }
  await writeFile(`${folder}/outfit-fog-strokes.png`,sheet.toBuffer('image/png'));
  const files=[];
  for(const [pose,config] of Object.entries(SHIZUKU_NIGHT_POSES)) {
    const filename=`public/art/shizuku-night/${pose}.webp`,bytes=await readFile(filename);
    const image=await loadImage(filename),c=createCanvas(384,512),ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,384,512).data;
    let transparent=0,soft=0;for(let i=3;i<pixels.length;i+=4) { if(!pixels[i])transparent++;else if(pixels[i]<255)soft++; }
    assert(transparent>1000&&soft>0,`${pose}: real soft transparency`);
    files.push({pose,filename,sha256:createHash('sha256').update(bytes).digest('hex'),width:image.width,height:image.height,bytes:bytes.length,transparent,soft,anchor:config.anchor});
  }
  await writeFile('assets/shizuku-night-manifest.json',JSON.stringify({version:1,provider:'OpenAI built-in image_gen',processing:'Native generated PNG retained; uniform resize to 384x512, WebP quality94 alphaQuality100. Eye midpoints estimated manually and registered by existing CharacterScene transform.',files},null,2)+'\n');
  await writeFile(`${folder}/report.json`,JSON.stringify({scope:'Native canvas production-function pixel tests and asset checks; composition is not browser or physical-device evidence.',checks,poses:files.length},null,2)+'\n');
  console.log(JSON.stringify({checks,poses:files.length}));
} finally { await server.close(); }
