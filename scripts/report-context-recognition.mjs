import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// No network, image, strokes, credentials, model execution or participant data.
const server=await createServer({configFile:false,envDir:false,cacheDir:'.wrangler/context-report-vite',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
try{
  const [{CONTEXT_FIXTURES},{compareContextRecognition},{evaluateComparison,summarizeComparisons,exportComparisonsJson},{gameSketches}]=await Promise.all([
    server.ssrLoadModule('/src/dev/contextRecognition/fixtures.ts'),server.ssrLoadModule('/src/dev/contextRecognition/policies.ts'),server.ssrLoadModule('/src/dev/contextRecognition/evaluation.ts'),server.ssrLoadModule('/src/data/gameSketches.ts')]);
  const snapshot=JSON.parse(await readFile('docs/vocabulary-coverage-v09.json','utf8'));
  const labelsHash=createHash('sha256').update(snapshot.model.labelsText).digest('hex');
  assert.equal(labelsHash,'2ed0dac4ba018854a3e3166f9862e5529bc5f58a80d157d57eee22ca731895d5');
  const records=CONTEXT_FIXTURES.map(fixture=>{
    const comparison=compareContextRecognition(fixture.input,fixture.config);
    // Timings vary by machine and are not meaningful for fabricated vectors.
    for(const selection of Object.values(comparison.selections))selection.correctionMs=0;
    return evaluateComparison(comparison,fixture.evaluation,gameSketches(fixture.input.language).filter(sketch=>!sketch.readability||['safe','soft'].includes(sketch.readability)));
  });
  const presetGrid=['gap','bonus'].flatMap(variant=>[0,.02,.04,.08].map(strength=>{
    const config={variant,strength,maxRank:3,maxGap:.08};
    const evaluated=CONTEXT_FIXTURES.map(fixture=>{
      const comparison=compareContextRecognition(fixture.input,config);
      for(const selection of Object.values(comparison.selections))selection.correctionMs=0;
      return evaluateComparison(comparison,fixture.evaluation,gameSketches(fixture.input.language));
    });
    return {config,summary:summarizeComparisons(evaluated),cases:evaluated.map((record,index)=>({id:CONTEXT_FIXTURES[index].id,selectedLabel:record.comparison.selections.C.selectedLabel,selectedRank:record.comparison.selections.C.selectedRank,reason:record.comparison.selections.C.reason,correctionMs:0,relativeToA:record.policies.C.relativeToA}))};
  }));
  assert.equal(presetGrid.length,8);
  assert.ok(presetGrid.every(preset=>preset.summary.C.total===CONTEXT_FIXTURES.length));
  const report={...JSON.parse(exportComparisonsJson(records)),method:'Fabricated full-345 score vectors; deterministic policy regression only. No human drawings, model inference, accuracy estimate, fun or real play observation.',modelLabelsSha256:labelsHash,timing:'correctionMs fixed at zero for reproducibility; runtime logs measure actual local selection time',humanDrawingsAvailable:false,fixtures:CONTEXT_FIXTURES.map(({id,scenario})=>({id,scenario})),summary:summarizeComparisons(records),presetGrid};
  const json=JSON.stringify(report,null,2)+'\n';
  const lines=CONTEXT_FIXTURES.map((fixture,index)=>{
    const record=records[index];
    return `| ${fixture.id} | ${['A','B','C'].map(id=>record.comparison.selections[id].result.guess??'unknown').join(' | ')} | ${record.policies.B.relativeToA} | ${record.policies.C.relativeToA} |`;
  });
  const markdown=`# v0.10 context recognition synthetic regression\n\nRun \`node scripts/report-context-recognition.mjs\` from repository root.\n\nThese ${records.length} cases use fabricated complete 345-class score vectors. No human drawings or historical images/strokes are available in this report. Scores and bonus values are uncalibrated model values, never probabilities. Counts describe only these constructed cases and cannot estimate human accuracy, enjoyment or replay intent.\n\nA uses the shared unchanged production decoder. B prioritizes the first context match in Top-10 at or above .05. C defaults to gap mode, Top-3, maximum gap .08 and strength .04; bonus cases are labelled. Configurable C settings have hard ceilings of rank 5, gap .08 and strength .08. Unknown A, invalid full-frame output, invalid context and terminal Japanese ん are preserved. Gap strength is the allowed score gap within the independent maximum-gap guard. Bonus strength is added only within that guard and must beat the original leader; adjusted ties retain the leader.\n\nExact semantic evaluation compares only a valid explicit intended model class. Out-of-vocabulary intent stays unscored for class accuracy and separately records abstention versus false-known output. Reading agreement is separate; 花/鼻 can have equal readings and different classes. A missing or invalid intended class stays unevaluated. Perceived previous-word agreement is reading agreement only.\n\nLexical continuation checks the previous formal word's ending against the selected word's beginning. Template existence checks the selected word's ending against the supplied safe/soft catalogue, excluding Japanese terminal-ん replies as production does. Neither is observed play continuation; these fixtures contain no actual observation. Benefits and harms relative to A are counted separately in JSON.\n\n| Case | A | B | C | B vs A | C vs A |\n|---|---|---|---|---|---|\n${lines.join('\n')}\n\nThe JSON contains complete sanitized rankings, words, scores, context matches, selected original ranks, reasons, settings and separate evaluation fields. Runtime JSON/CSV exports project an explicit field allowlist and contain no image/stroke data. Correction timings are zeroed only in this deterministic report; runtime timings are recorded separately from inference. Model label snapshot SHA-256: \`${labelsHash}\`.\n`;
  const gridMarkdown='\n## Same-vector C preset grid\n\nEvery preset below uses the identical '+CONTEXT_FIXTURES.length+' input vectors and post-result annotations, overriding per-fixture C settings. All use maxRank 3 and maxGap .08. Strength zero disables C correction in both variants, including score ties, so it is an image-only control. Each count is a property of these deliberately biased constructed fixtures, not a human accuracy estimate. Exact class denominators exclude OOV and unspecified classes; OOV abstention/false-known counts remain separate in JSON. No raw ranking is repeated per grid preset.\n\n| Variant | Strength | Benefit | Harm | Unchanged | Unevaluated | Unknown | Lexical links | Exact evaluated |\n|---|---|---|---|---|---|---|---|---|\n'+presetGrid.map(({config,summary:{C:c}})=>`| ${config.variant} | ${config.strength} | ${c.benefit} | ${c.harm} | ${c.unchanged} | ${c.unevaluated} | ${c.unknown} | ${c.lexicalContinuation} | ${c.exactEvaluated} |`).join('\n')+'\n';
  const completeMarkdown=markdown+gridMarkdown;
  if(process.argv.includes('--check')){
    assert.equal(await readFile('docs/CONTEXT_RECOGNITION_v010_SYNTHETIC.json','utf8'),json);
    assert.equal(await readFile('docs/CONTEXT_RECOGNITION_v010_SYNTHETIC.md','utf8'),completeMarkdown);
  }else{
    await writeFile('docs/CONTEXT_RECOGNITION_v010_SYNTHETIC.json',json);
    await writeFile('docs/CONTEXT_RECOGNITION_v010_SYNTHETIC.md',completeMarkdown);
  }
  console.log(JSON.stringify({fixtures:records.length,summary:report.summary}));
}finally{await server.close();}
