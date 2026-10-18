import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = 'assets/source/shizuku-v04', output = 'public/art/shizuku-v04';
await mkdir(output,{recursive:true});
const files=[];
for(const pose of ['neutral','breath','drawing','smile']) {
  const input=`${source}/${pose==='neutral'?'canonical-neutral':pose}.png`;
  const meta=await sharp(input).metadata();
  if(!meta.hasAlpha || meta.width<768 || meta.height<1024) throw new Error(`Expected native high-resolution alpha source: ${input}`);
  const filename=`${output}/${pose}.webp`;
  await sharp(input).resize(768,1024,{fit:'contain',background:'#00000000',withoutEnlargement:true}).webp({quality:94,alphaQuality:100}).toFile(filename);
  const bytes=await readFile(filename);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let transparent=0,soft=0;for(let i=3;i<data.length;i+=info.channels){if(data[i]===0)transparent++;else if(data[i]<255)soft++;}
  if(transparent<info.width*info.height*.15||soft===0)throw new Error(`Missing cutout alpha: ${filename}`);
  files.push({pose,filename,width:768,height:1024,bytes:bytes.length,sha256:hash(bytes),source:input,sourceWidth:meta.width,sourceHeight:meta.height,transparentPixels:transparent,softAlphaPixels:soft});
  await sharp(bytes).flatten({background:'#214f73'}).resize(384,512).png().toFile(`artifacts/qa/v04/${pose}-candidate-on-blue.png`);
}
const sources=[];
for(const filename of ['docs/CHARACTER_SHIZUKU_v0.2.md','assets/source/shizuku-v02/approved-neutral.png','assets/source/shizuku-v02/expression-atlas.png',`${source}/canonical-neutral.png`,`${source}/matched-atlas-draft.png`,`${source}/breath.png`,`${source}/drawing.png`,`${source}/smile.png`])sources.push({filename,sha256:hash(await readFile(filename))});
await writeFile('assets/shizuku-v04-manifest.json',JSON.stringify({version:'0.4-review',status:'Candidate only; owner approval and physical Android review pending. Original production sprites retained.',provider:'OpenAI built-in ImageGen',provenance:'Derived from user-supplied original and authoritative character sheet; no new third-party art or license change.',processing:'One canonical native master, matched 2x2 pose study, then three full-native edits from same master. Atlas draft rejected for closed smile eyes and limited per-cell detail. Downsample only to 768x1024, WebP94, real alpha, common bottom-center framing; eye anchors in shizukuCandidates.ts. No fog/background baked in. Review scene uses one common 1.28 scale around measured eye anchors to match approved face size, never per-pose stretch.',sources,files},null,2)+'\n');
console.log(JSON.stringify(files.map(({pose,bytes,sourceWidth,sourceHeight})=>({pose,bytes,native:[sourceWidth,sourceHeight]}))));
