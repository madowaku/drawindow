import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const audit = JSON.parse(await readFile('docs/quickdraw-unmapped-v013.json', 'utf8'));
assert.equal(audit.classes.length, 168);
assert.equal(new Set(audit.classes.map(c => c.label)).size, 168);
const server = await createServer({ configFile: false, envDir: false, cacheDir: '.vite/audit-v013', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const load = file => server.ssrLoadModule('/src/' + file + '.ts');
  const [words, { quickDrawJapanese }, { gameSketches }, { createInitialState, gameReducer }] = await Promise.all([load('core/words'), load('services/quickDrawJapanese'), load('data/gameSketches'), load('core/gameMachine')]);
  const counts = Object.fromEntries(['A','B','C','D'].map(c => [c, audit.classes.filter(r => r.category === c).length]));
  const ink = [{ id: 'synthetic-audit', points: [{ x: .1, y: .2, t: 0 }, { x: .7, y: .8, t: 20 }] }];
  const records = [];
  for (const row of audit.classes) {
    const word = words.normalizeWord(row.candidate, 'ja'); assert.ok(word);
    const head = words.firstLetter(word, 'ja'), tail = words.lastLetter(word, 'ja');
    const modes = {};
    for (const mode of ['day','night']) {
      let state = gameReducer(createInitialState(mode, 'ja'), { type:'START', mode, sessionKind:'ml', sketches:gameSketches('ja') });
      state = gameReducer(state,{type:'BREATH_DONE'}); state = gameReducer(state,{type:'PLAYBACK_DONE'}); state = gameReducer(state,{type:'YOUR_TURN'});
      state = gameReducer(state,{type:'STROKES_CHANGED',strokes:ink}); state = gameReducer(state,{type:'DONE'});
      state = gameReducer(state,{type:'RECOGNITION_RESOLVED',requestId:state.recognitionRequest.requestId,result:{source:'ml',guess:word}});
      modes[mode] = state.round === 2 && state.phase === 'girl_breath';
    }
    if (row.adopted) { assert.equal(row.category,'A'); assert.equal(quickDrawJapanese[row.label],word); assert.ok(modes.day && modes.night, row.label); }
    records.push({...row,head,tail,terminalRestart:tail==='ん',continuity:modes});
  }
  const adopted = records.filter(r=>r.adopted).length;
  const text = `# QuickDraw Japanese audit v0.13\n\nBaseline: main 3dad268; 345 classes, 177 mapped and 168 unmapped. ${adopted} conservative additions → ${177+adopted} mapped, ${168-adopted} remaining.\n\nA direct noun: ${counts.A}; B ambiguity: ${counts.B}; C unsuitable ordinary shiritori noun: ${counts.C}; D existing meaning collision: ${counts.D}. Candidate spellings are proposals, not adopted translations unless explicitly marked. This is a semantic and reducer audit, not human drawing accuracy.\n\nAll candidates pass kana normalization; adopted candidates pass the actual reducer in DAY and NIGHT. A tail of ん restarts honestly. Dots/voicing and prolonged sounds use the unchanged production firstLetter/lastLetter rules. Homophones remain different concepts (flower/nose, cloud/spider); no synonym dictionary was broadened.\n\n| Model category | Group | Candidate | First | Last | Adopted | DAY/NIGHT reply | Reason |\n|---|---|---|---|---|---|---|---|\n` + records.map(r=>`| ${r.label} | ${r.category} | ${r.candidate} | ${r.head} | ${r.tail}${r.terminalRestart?' (restart)':''} | ${r.adopted?'yes':'pending'} | ${r.continuity.day&&r.continuity.night?'available':'uncovered'} | ${r.reason} |`).join('\n')+'\n';
  await writeFile('docs/QUICKDRAW_JAPANESE_AUDIT_v013.md',text);
  console.log(JSON.stringify({baseline:177,unmapped:168,adopted,counts,continuity:'actual reducer both themes; no human recognition evidence'}));
} finally { await server.close(); }
