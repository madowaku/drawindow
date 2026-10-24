import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Pure catalogue/selection audit. No model inference, browser, network, or credentials.
const output = 'docs/vocabulary-coverage-v09.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const argument = process.argv.indexOf('--labels');
let labelBytes, labelSource;
try {
  labelSource = argument >= 0 ? process.argv[argument + 1] : 'public/local-ml/labels.txt';
  labelBytes = await readFile(labelSource);
} catch (error) {
  if (argument >= 0) throw error;
  const saved = JSON.parse(await readFile(output, 'utf8'));
  labelBytes = Buffer.from(saved.model.labelsText);
  labelSource = 'checked-in audit snapshot (public/local-ml/labels.txt absent)';
}
const labels = labelBytes.toString('utf8').trim().split(/\r?\n/);
assert.equal(labels.length, 345);
assert.equal(new Set(labels).size, 345);
assert.equal(hash(labelBytes), '2ed0dac4ba018854a3e3166f9862e5529bc5f58a80d157d57eee22ca731895d5', 'Labels differ from prepared pinned-revision receipt; review provenance before changing the baseline');
const server = await createServer({configFile:false, envDir:false, cacheDir:'.wrangler/vocabulary-audit-vite', optimizeDeps:{noDiscovery:true,include:[]}, server:{middlewareMode:true},appType:'custom'});
try {
  const load = path => server.ssrLoadModule('/src/' + path + '.ts');
  const [{quickDrawJapanese}, words, {gameSketches}, ja, machine, names] = await Promise.all([
    load('services/quickDrawJapanese'), load('core/words'), load('data/gameSketches'), load('data/japaneseSketches'), load('core/gameMachine'), load('data/namingDictionary'),
  ]);
  const {normalizeWord,firstLetter,lastLetter,chainLettersMatch,selectGirlSketch,selectJapaneseFreshSketch,selectJapaneseSlip} = words;
  const app = await readFile('src/App.tsx','utf8');
  // Fail visibly if App.start stops using this assembly; do not silently audit an old pool.
  for (const fragment of ['gameSketches(state.language)', 'withJapaneseStarter(sketches, state.mode, startIndex)']) assert.ok(app.includes(fragment), 'Review audit assembly against App.start: ' + fragment);
  const pools = {en:gameSketches('en'), ja:gameSketches('ja')};
  const unique = values => [...new Set(values)].sort();
  const groups = (items, key) => Object.fromEntries(unique(items.map(key).filter(Boolean)).map(k=>[k,items.filter(item=>key(item)===k)]));
  const distribution = (values, language, end) => Object.fromEntries(Object.entries(groups(values,word=>(end?lastLetter:firstLetter)(word,language))).map(([key,list])=>[key,list.length]));
  const playable = pool => pool.filter(s=>!s.readability||['safe','soft'].includes(s.readability));
  const selectionPool = (pool,language) => language==='ja'?pool.filter(s=>lastLetter(s.word,'ja')!=='ん'):pool;
  const reply = (pool,guess,language,mode='day',used=[]) => language==='ja'&&lastLetter(guess,'ja')==='ん'?selectJapaneseFreshSketch(pool,used):selectGirlSketch(selectionPool(pool,language),lastLetter(guess,language),used,language,mode);
  function stats(raw, language) {
    const values=unique(raw.map(word=>normalizeWord(word,language)).filter(Boolean));
    return {rawCount:raw.length,distinctNormalizedWords:values.length,first:distribution(values,language,false),last:distribution(values,language,true),words:values};
  }
  function seeded(seed) {let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
  const report={schemaVersion:1,method:'Static vocabulary and deterministic real-selector/reducer audit; no recognition accuracy or human play evidence.',model:{classes:labels.length,labelsSha256:hash(labelBytes),labelsText:labelBytes.toString('utf8'),labelSource:'prepared local-ml labels; exact snapshot embedded for offline audit',sourceRevision:'b02fde8d8732aed32bc9d8176c3dc4efda0333fb'},languages:{}};
  for(const language of ['en','ja']) {
    const mapping=labels.map(label=>({label,word:normalizeWord(language==='ja'?quickDrawJapanese[label]:label,language)}));
    const recognizer=stats(mapping.map(x=>x.word).filter(Boolean),language);
    const pool=pools[language];
    const drawable=stats(playable(pool).map(s=>s.word),language);
    const alphabet=language==='en'?[...'abcdefghijklmnopqrstuvwxyz']:[...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'];
    const startCoverage=alphabet.map(letter=>({letter,distinctWords:unique(playable(pool).filter(s=>chainLettersMatch(letter,firstLetter(s.word,language),language)).map(s=>normalizeWord(s.word,language))).length,selected:selectGirlSketch(selectionPool(pool,language),letter,[],language)?.word??null}));
    const unsupported=mapping.filter(x=>x.word&&!reply(pool,x.word,language));
    const terminals=mapping.filter(x=>x.word&&language==='ja'&&lastLetter(x.word,'ja')==='ん');
    const collisions=Object.entries(groups(mapping.filter(x=>x.word),x=>x.word)).filter(([,v])=>v.length>1).map(([word,v])=>({word,labels:v.map(x=>x.label)}));
    const simulation={seedRange:[1,256],modes:{}};
    for(const mode of ['day','night']) {
      const totals={sessions:256,complete:0,noModelReply:0,uncoveredLetter:0,restarts:0,slips:0,examples:[]};
      for(let seed=1;seed<=256;seed++) {
        const random=seeded(seed),ordered=language==='ja'?ja.withJapaneseStarter(pool,mode,seed-1):pool;
        let current=ordered[0],used=[current.id],slipUsed=false,status='complete';const trace=[];
        // Four model responses: DONE on the fifth player drawing skips inference in the reducer.
        for(let round=2;round<=5;round++) {
          const candidates=recognizer.words.filter(word=>chainLettersMatch(lastLetter(current.word,language),firstLetter(word,language),language));
          if(!candidates.length){status='noModelReply';break;}
          const guess=candidates[Math.floor(random()*candidates.length)],restart=language==='ja'&&lastLetter(guess,language)==='ん';
          const selected=reply(ordered,guess,language,mode,used);
          if(!selected){status='uncoveredLetter';trace.push({guess,error:'uncovered_letter'});break;}
          const slip=language==='ja'&&!slipUsed&&!restart&&(seed+round)%3===0&&lastLetter(selected.word,'ja')!=='ん'&&(!selected.readability||selected.readability==='safe')?selectJapaneseSlip(ordered,lastLetter(guess,language),used):null;
          if(restart)totals.restarts++;if(slip){totals.slips++;slipUsed=true;}
          trace.push({from:current.word,guess,reply:selected.word,restart,slip:slip?.word??null});
          current=selected;used.push(selected.id); // Oops correction completes before player's next turn.
        }
        totals[status]++;if(seed<=3||status!=='complete'&&totals.examples.length<8)totals.examples.push({seed,status,trace});
      }
      simulation.modes[mode]=totals;
    }
    // Drive the real reducer for each model label, including ordinary, terminal and uncovered outputs.
    function reducerCase(guess, casePool=pool) {
      let state=machine.gameReducer(machine.createInitialState('day',language),{type:'START',mode:'day',sessionKind:'ml',sketches:casePool});
      for(const type of ['BREATH_DONE','PLAYBACK_DONE','YOUR_TURN'])state=machine.gameReducer(state,{type});
      state=machine.gameReducer(state,{type:'STROKES_CHANGED',strokes:[{id:'audit',points:[{x:.2,y:.2,t:0},{x:.4,y:.4,t:20}]}]});
      state=machine.gameReducer(state,{type:'DONE'});
      state=machine.gameReducer(state,{type:'RECOGNITION_RESOLVED',requestId:state.recognitionRequest.requestId,result:{guess,source:'ml'}});
      if(state.error?.code==='uncovered_letter') {assert.equal(state.activeStrokes[0]?.id,'audit');assert.equal(state.entries.at(-1)?.nonComparableReason,'uncovered_letter');}
      return {guess,phase:state.phase,error:state.error?.code??null,chainRestart:state.entries.at(-1)?.chainRestart??false};
    }
    const exhaustive=mapping.filter(x=>x.word).map(x=>reducerCase(x.word));
    // Valid normalized API vocabulary outside the finite model remains possible.
    const probe=language==='en'?'iraq':'ゐ';
    const reproduction={...reducerCase(probe, language === 'en' ? pool.filter(s=>firstLetter(s.word,'en')!=='q') : pool), fixture:language === 'en' ? 'EN production pool with q templates removed to exercise otherwise unreachable guard' : 'full production pool'};
    assert.equal(reproduction.error,'uncovered_letter');
    assert.equal(exhaustive.filter(x=>x.error==='uncovered_letter').length,unsupported.length);
    report.languages[language]={mappedModelClasses:mapping.filter(x=>x.word).length,unmappedModelClasses:mapping.filter(x=>!x.word).map(x=>x.label),mapping,recognizer,drawable:{...drawable,templates:pool.length,readability:Object.fromEntries(Object.entries(groups(pool,s=>s.readability??'unrated')).map(([k,v])=>[k,v.length])),adoptedTemplates:pool.filter(s=>s.id.startsWith('shizuku-style-v01-')).length,normalizedCollisions:Object.entries(groups(pool,s=>normalizeWord(s.word,language))).filter(([,v])=>v.length>1).map(([word,v])=>({word,ids:v.map(s=>s.id)}))},startCoverage,missingLetters:startCoverage.filter(x=>!x.selected),sparseLetters:startCoverage.filter(x=>x.selected&&x.distinctWords<=2),recognizerWordsWithoutSameNamedDrawing:recognizer.words.filter(word=>!drawable.words.includes(word)),drawableWordsOutsideRecognizer:drawable.words.filter(word=>!recognizer.words.includes(word)),unsupportedModelReplies:unsupported,terminalModelClasses:terminals,normalizedModelCollisions:collisions,exhaustiveReducer:{cases:exhaustive.length,uncovered:exhaustive.filter(x=>x.error),terminalRestarts:exhaustive.filter(x=>x.chainRestart).length},uncoveredReproduction:reproduction,simulation};
  }
  report.namingDictionary=names.namingTerms;
  // Fingerprint all source inputs (includes transitive geometry/catalogue and naming imports).
  async function files(dir){const found=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())found.push(...await files(path));else if(/\.(ts|tsx|json)$/.test(path)&&!path.endsWith('.test.ts'))found.push(path);}return found;}
  const inputs=unique(['scripts/audit-vocabulary.mjs','src/App.tsx','src/services/quickDrawRecognizer.ts','src/services/quickDrawJapanese.ts',...await files('src/core'),...await files('src/data')]);
  // Git checks out text with LF on CI; canonicalize local Windows line endings.
  report.sourceSha256=Object.fromEntries(await Promise.all(inputs.map(async file=>[file,hash((await readFile(file,'utf8')).replace(/\r\n/g,'\n'))])));
  await mkdir('docs',{recursive:true});
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  const table=(heading,en,ja)=>`\n${heading}\n\n| Sound | EN | JA |\n| --- | ---: | ---: |\n`+unique([...Object.keys(en),...Object.keys(ja)]).map(k=>`| ${k} | ${en[k]??0} | ${ja[k]??0} |`).join('\n')+'\n';
  const en=report.languages.en,jp=report.languages.ja;
  let md=`# Vocabulary coverage v0.9\n\nGenerated by \`node scripts/audit-vocabulary.mjs\`. Optional first-run input: \`--labels path/to/public/local-ml/labels.txt\`. A checkout without prepared model assets reuses the exact labels text in the checked-in JSON; it does not download or substitute a different class list. Labels SHA-256: \`${report.model.labelsSha256}\`. Complete words, mappings, distributions, collisions, seed specification, example traces and source fingerprints: [vocabulary-coverage-v09.json](vocabulary-coverage-v09.json).\n\n## Counts and boundaries\n\n| Layer | EN | JA |\n| --- | ---: | ---: |\n| Trained model classes | 345 | 345 |\n| Mapped and normalized classes | ${en.mappedModelClasses} | ${jp.mappedModelClasses} |\n| Distinct recognizer words | ${en.recognizer.distinctNormalizedWords} | ${jp.recognizer.distinctNormalizedWords} |\n| App.start templates | ${en.drawable.templates} | ${jp.drawable.templates} |\n| Adopted templates in App.start | ${en.drawable.adoptedTemplates} | ${jp.drawable.adoptedTemplates} |\n| Distinct playable drawing words | ${en.drawable.distinctNormalizedWords} | ${jp.drawable.distinctNormalizedWords} |\n| Recognizer words without same named drawing | ${en.recognizerWordsWithoutSameNamedDrawing.length} | ${jp.recognizerWordsWithoutSameNamedDrawing.length} |\n| Drawing words outside finite recognizer | ${en.drawableWordsOutsideRecognizer.length} | ${jp.drawableWordsOutsideRecognizer.length} |\n| Model classes without drawable reply | ${en.unsupportedModelReplies.length} | ${jp.unsupportedModelReplies.length} |\n\nApp.start and this audit import the same gameSketches(language) helper. EN localizes girlSketches, which already adopts authored art over the original library. JA additionally merges the extra, pack, classic and everyday pools and reapplies adoption; App.start then moves one of six mode-specific starters to the front. Thus the 345 classifier classes are neither the Japanese map nor Shizuku's drawing pool. SAFE/SOFT are maker readability labels, not measured human or model accuracy.\n\n## Normalization and names\n\nThe audit invokes words.ts directly. EN lowercases and trims, strips edge punctuation, folds whitespace, then accepts Latin words with spaces, apostrophes or hyphens. Both languages reject digits, angle/curly/square brackets, slash/backslash, inputs over 80 characters and normalized words over 64 characters. JA first resolves an unambiguous naming-dictionary form, otherwise NFKC-normalizes, trims allowed edge punctuation and converts katakana to hiragana; only kana and ー remain valid. Small kana expand only for first/last chain units, and terminal ー resolves to the preceding vowel. The visible word is retained. Chain comparison additionally folds voiced/semi-voiced kana.\n\nJA maps only ${jp.mappedModelClasses} model categories; ${jp.unmappedModelClasses.length} abstain. Top-1 remains authoritative: no lower-ranked category is selected to repair a chain. Alternatives can retain unmapped English strings and do not expand the accepted top-1 vocabulary. Equal normalized readings do not prove equal meanings. Model collisions: ${jp.normalizedModelCollisions.map(x=>x.word+' = '+x.labels.join(' / ')).join('; ')}. Naming aliases such as 犬/いぬ share a reading; わんこ keeps its own reading. 梨/洋梨/ラ・フランス remain なし/ようなし/らふらんす. とり/すずめ and はな/ひまわり remain distinct. The dictionary's 花 and 鼻 are ambiguous はな readings, not a semantic synonym claim. Full dictionary and IDs of templates sharing normalized names are enumerated in JSON.\n\n## Missing and sparse starting sounds\n\nMissing means no selectable nonterminal reply (JA excludes drawings ending ん as gameReducer does). Sparse means one or two distinct playable words with matching starting sound, including voiced relaxation. EN checks a-z; JA checks the modern unvoiced kana plus を and ん. Observed voiced forms remain separately visible in the distributions.\n\nEN missing: ${en.missingLetters.map(x=>x.letter).join(', ')||'none'}. Sparse: ${en.sparseLetters.map(x=>x.letter+' ('+x.distinctWords+')').join(', ')||'none'}.\n\nJA missing: ${jp.missingLetters.map(x=>x.letter).join(', ')||'none'}. Sparse: ${jp.sparseLetters.map(x=>x.letter+' ('+x.distinctWords+')').join(', ')||'none'}.\n\n## Deterministic chains and uncovered_letter\n\nSeeds 1-256 use a fixed LCG (1664525, 1013904223, unsigned 32-bit). Each synthetic player chooses uniformly among distinct normalized model words whose first sound matches Shizuku's current ending. Selectors are the imported production functions, with four recognition transitions and the fifth player turn unrecognized, matching DONE. JA uses real starter rotation, terminal-ん restart, nonterminal reply filtering, used IDs, mode heuristic and rotating slip slot; a slip is corrected before the next player turn. Seed is the sessionId, starter index is seed-1. This is a finite-vocabulary stress sample, not a player behavior model.\n\n`;
  md+='| Language/mode | Complete | No model word for next sound | uncovered_letter | Restart transitions | Slip transitions |\n| --- | ---: | ---: | ---: | ---: | ---: |\n';
  for(const [lang,data]of Object.entries(report.languages))for(const [mode,s]of Object.entries(data.simulation.modes))md+=`| ${lang}/${mode} | ${s.complete} | ${s.noModelReply} | ${s.uncoveredLetter} | ${s.restarts} | ${s.slips} |\n`;
  md+=`\nAn exhaustive real-gameReducer transition for every mapped model class reports EN ${en.exhaustiveReducer.uncovered.length}/${en.exhaustiveReducer.cases}, JA ${jp.exhaustiveReducer.uncovered.length}/${jp.exhaustiveReducer.cases} uncovered errors; JA ${jp.exhaustiveReducer.terminalRestarts} terminal restarts. Exact uncovered model labels: EN ${en.unsupportedModelReplies.map(x=>x.label).join(', ')||'none'}; JA ${jp.unsupportedModelReplies.map(x=>x.label+' → '+x.word).join(', ')||'none'}.\n\nThe real reducer reproduces uncovered_letter with JA ゐ → ゐ in the full production pool. EN covers every a-z starting letter, so a valid normalized EN word cannot reproduce that guard with the full pool; EN iraq → q reproduces it only in a deliberately reduced fixture with q templates removed. These are synthetic fault probes, not claims the local model emits them. The result remains recognition_error, with the drawing retained by the existing reducer. An arbitrary API word can exceed this model vocabulary. Coverage alone does not justify replacing the guess, adding hints, declaring recognition correct or marking a broken restart connected.\n\n## Distributions\n\nCounts below are distinct normalized words, not template variants. Zero entries are absent unless present in the other language. Complete per-language arrays are in JSON.\n`;
  md+=table('### Recognizer first units',en.recognizer.first,jp.recognizer.first)+table('### Recognizer last units',en.recognizer.last,jp.recognizer.last)+table('### Drawable first units',en.drawable.first,jp.drawable.first)+table('### Drawable last units',en.drawable.last,jp.drawable.last);
  md+='\n## Limits\n\nNo model weights were executed and no drawn strokes were recognized. The 0.05 default model score cutoff, actual top-1 distribution, recognition latency, human naming, blind readability, real-device comfort and fun are unmeasured. Uniform word sampling is intentionally unlike real model outputs. Catalogue name equality cannot establish that art depicts a model class, and homonyms can overstate semantic overlap. Source hashes make changes reviewable; rerun after catalogue/selection changes. No production words, art, model, selection policy or game rules are modified by this audit.\n';
  await writeFile('docs/VOCABULARY_COVERAGE_v09.md',md);
  console.log(JSON.stringify({labelsSha256:report.model.labelsSha256,languages:Object.fromEntries(Object.entries(report.languages).map(([lang,d])=>[lang,{mapped:d.mappedModelClasses,recognizer:d.recognizer.distinctNormalizedWords,templates:d.drawable.templates,drawable:d.drawable.distinctNormalizedWords,unsupported:d.unsupportedModelReplies,missing:d.missingLetters,sparse:d.sparseLetters,simulation:Object.fromEntries(Object.entries(d.simulation.modes).map(([mode,{examples,...counts}])=>[mode,counts]))}]))},null,2));
} finally {await server.close();}



