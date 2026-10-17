import sharp from 'sharp';
const reference = await sharp('assets/source/supplied-day-reference.png').resize(400,800,{fit:'contain',background:'#edf2ef'}).png().toBuffer();
const character = await sharp('public/art/day-neutral.webp').resize(341,800,{fit:'contain',background:'#edf2ef'}).png().toBuffer();
const game = await sharp('artifacts/qa/360-day-holding-final.jpg').resize(360,800).png().toBuffer();
await sharp({create:{width:1101,height:800,channels:3,background:'#edf2ef'}}).composite([{input:reference,left:0,top:0},{input:character,left:400,top:0},{input:game,left:741,top:0}]).png().toFile('artifacts/qa/reference-character-game.png');
const before = await sharp('artifacts/qa/360-day-holding.jpg').resize(360,800).png().toBuffer();
await sharp({create:{width:720,height:800,channels:3,background:'#edf2ef'}}).composite([{input:before,left:0,top:0},{input:game,left:360,top:0}]).png().toFile('artifacts/qa/stroke-before-after.png');
console.log('Saved reference/character/game comparison and before/after glass comparison.');
