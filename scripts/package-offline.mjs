import { spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile, rm, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import sharp from 'sharp';
import { offlineWorker } from './offline-worker.mjs';
import { scanOfflineDistribution } from './scan-offline-dist.mjs';

function run(file,args=[],env=process.env) {
  const proc=spawnSync(process.execPath,[file,...args],{stdio:'inherit',env});
  if(proc.error)throw proc.error;
  if(proc.status!==0)process.exit(proc.status??1);
}
// The network is allowed while PREPARING the pinned model, never at runtime.
run('scripts/prepare-quickdraw-model.mjs');
run('node_modules/typescript/bin/tsc',['--noEmit']);
run('node_modules/vite/bin/vite.js',['build'],{
  ...process.env,VITE_OFFLINE_EDITION:'true',VITE_ENABLE_LIVE_API:'false',
  VITE_DEFAULT_LIVE:'false',VITE_RECOGNITION_URL:''
});
await rm('dist/local-ml/quickdraw_model.tflite',{force:true});
const model=await readFile('dist/local-ml/quickdraw_model_static.tflite');
const labels=(await readFile('dist/local-ml/labels.txt','utf8')).trim().split(/\r?\n/);
if(!model.length||labels.length!==345)throw Error('Missing validated trained model or labels');
for(const size of [192,512]) {
  await sharp('public/favicon.svg').resize(size,size).png().toFile('dist/offline-icon-'+size+'.png');
}
await writeFile('dist/manifest.webmanifest',JSON.stringify({
  name:'DRAWINDOW Local',short_name:'DRAWINDOW',
  description:'A quiet picture word chain with on-device recognition.',
  start_url:'./',scope:'./',display:'standalone',
  theme_color:'#edf2ef',background_color:'#edf2ef',
  icons:[192,512].map(size=>({src:'./offline-icon-'+size+'.png',sizes:size+'x'+size,
    type:'image/png',purpose:'any maskable'}))
}));
const html=await readFile('dist/index.html','utf8');
if(!html.includes('</head>'))throw Error('index.html has no head');
await writeFile('dist/index.html',html.replace('</head>',
  '<link rel="manifest" href="./manifest.webmanifest" /></head>'));

const assetFiles=[];
async function collect(dir) {
  for(const e of await readdir(dir,{withFileTypes:true})) {
    const full=join(dir,e.name);
    if(e.isDirectory())await collect(full);
    else {
      const p=relative('dist',full).replaceAll('\\','/');
      // Keep in sync with scripts/package-itch.mjs exclusions.
      if(/^art\/(?:doodles|shizuku-v04|shizuku-expression-review)(?:\/|$)/.test(p)||
         /^art\/(?:day|night)-(?:neutral|smiling|thinking)\.webp$/.test(p))continue;
      if(p!=='sw.js')assetFiles.push(p);
    }
  }
}
await collect('dist');
assetFiles.sort();
for(const required of ['index.html','manifest.webmanifest','local-ml/labels.txt',
                       'local-ml/quickdraw_model_static.tflite']) {
  if(!assetFiles.includes(required))throw Error('Missing offline asset: '+required);
}
if(!assetFiles.some(p=>p.startsWith('local-ml/wasm/')&&p.endsWith('.wasm')))
  throw Error('Bundled CPU runtime WASM missing');
const hashes=await Promise.all(assetFiles.map(async p=>
  createHash('sha256').update(await readFile(join('dist',p))).digest('hex')));
const fingerprint=createHash('sha256').update('static-cache-v3\n').update(assetFiles.map((p,i)=>p+':'+hashes[i]).join('\n')).digest('hex').slice(0,16);
// Fingerprint the pre-injection HTML, then include the final HTML in integrity hashes.
const finalHtml=(await readFile('dist/index.html','utf8')).replace('</head>',
  '<meta name="drawindow-offline-edition" content="'+fingerprint+'" /></head>');
await writeFile('dist/index.html',finalHtml);
hashes[assetFiles.indexOf('index.html')]=createHash('sha256').update(finalHtml).digest('hex');
await writeFile('dist/sw.js',offlineWorker(fingerprint,assetFiles,hashes));
await scanOfflineDistribution('dist', [...assetFiles,'sw.js']);
await mkdir('artifacts/release', {recursive:true});
await writeFile('artifacts/release/offline-assets-receipt.json',JSON.stringify({
  fingerprint,assets:assetFiles,hashes,modelBytes:model.length,
  modelSha256:createHash('sha256').update(model).digest('hex'),
  caveat:'Runtime offline acceptance on real Android/browser pending'
},null,2));
process.env.DRAWINDOW_PACKAGE_MODE='offline';
await import('./package-itch.mjs');
