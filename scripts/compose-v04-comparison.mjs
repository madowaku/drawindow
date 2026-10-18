import sharp from 'sharp';
const folder='artifacts/qa/v04',width=480,height=520,bar=34;
const beforeFolder=process.env.DRAWINDOW_COMPARISON_BEFORE;
const inputs=[];
for(const [row,mode]of['day','night'].entries())for(const[col,style]of['legacy','tactile'].entries()){
  const input=beforeFolder&&col===0?`${beforeFolder}/${mode}-tactile-glass.png`:`${folder}/${mode}-${style}-glass.png`;
  const image=await sharp(input).resize(width,height,{fit:'contain',background:'#eaf0ed'}).png().toBuffer();
  const caption=beforeFolder?(col===0?'B - BEFORE':'B - CLEARER WET EDGE'):(style==='legacy'?'A - CURRENT INK':'B - FINGER-WIPED FOG');
  const label=Buffer.from(`<svg width="480" height="34"><rect width="480" height="34" fill="${mode==='day'?'#edf3f0':'#192e40'}"/><text x="16" y="23" fill="${mode==='day'?'#25454e':'#e9edf2'}" font-size="16" font-family="sans-serif">${mode.toUpperCase()} / ${caption}</text></svg>`);
  inputs.push({input:label,left:col*width,top:row*(height+bar)},{input:image,left:col*width,top:row*(height+bar)+bar});
}
await sharp({create:{width:width*2,height:(height+bar)*2,channels:4,background:'#eaf0ed'}}).composite(inputs).png().toFile(process.env.DRAWINDOW_COMPARISON_OUTPUT??`${folder}/glass-before-after.png`);
