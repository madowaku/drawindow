import type { DrawingRecognizer, Language, RecognitionResult } from '../core/types';
import { preprocessQuickDraw } from './quickDrawPreprocess';
import type { QuickDrawPreprocessOptions } from './quickDrawPreprocess';
import { imageOnlyQuickDrawResult, type ScoredLabel } from './quickDrawScores';

type LiteRuntime = typeof import('@litertjs/core');
type LiteModel = Awaited<ReturnType<LiteRuntime['loadAndCompile']>>;
interface Ready { lite: LiteRuntime; model: LiteModel; labels: string[]; }
let sharedReady: Promise<Ready> | undefined;
let runtimeReady: Promise<LiteRuntime> | undefined;

/** Resolve with Vite's deployment base so itch.io subpaths never use an external CDN. */
function bundled(path: string): string {
  const base = new URL(import.meta.env.BASE_URL || './', document.baseURI);
  const destination = new URL('local-ml/' + path, base);
  if (destination.origin !== location.origin) throw new Error('Remote local model asset is forbidden');
  return destination.href;
}

export function preloadQuickDrawModel(): Promise<void> {
  if (!sharedReady) sharedReady = initialize().catch(error => {sharedReady=undefined;throw error;});
  return sharedReady.then(()=>undefined);
}

async function initialize(): Promise<Ready> {
  // Model/label retries reuse the already loaded runtime. LiteRT rejects a second
  // loadLiteRt call after an asset fetch failure.
  if(!runtimeReady)runtimeReady=(async()=>{const lite=await import('@litertjs/core');await lite.loadLiteRt(bundled('wasm/'));return lite;})().catch(error=>{runtimeReady=undefined;throw error;});
  const lite=await runtimeReady;
  const [modelResponse, labelResponse] = await Promise.all([
    // CacheStorage/SW owns offline persistence. Avoid competing browser HTTP
    // cache writes while the installer downloads this same large model.
    fetch(bundled('quickdraw_model_static.tflite'), {cache:'no-store'}),
    fetch(bundled('labels.txt'), {cache:'force-cache'}),
  ]);
  if(!modelResponse.ok)throw new Error('Local model asset is unavailable');
  const model=await lite.loadAndCompile(new Uint8Array(await modelResponse.arrayBuffer()),{accelerator:'wasm'});
  if (!labelResponse.ok) throw new Error('Local label asset is unavailable');
  const labels = (await labelResponse.text()).trim().split(/\r?\n/);
  if (labels.length !== 345 || !labels.includes('cat') || !labels.includes('bat')) throw new Error('345 labels mismatch');
  const input = model.getInputDetails()[0];
  const output = model.getOutputDetails()[0];
  if (!['1,28,28,1','-1,28,28,1'].includes(Array.from(input?.shape??[]).join(',')) ||
      !['1,345','-1,345'].includes(Array.from(output?.shape??[]).join(','))) {
    throw new Error('Model tensor shape mismatch: ' + JSON.stringify({input,output}));
  }
  return {lite,model,labels};
}

function fail(errorCode: 'invalid_input' | 'unavailable' | 'invalid_response'): RecognitionResult {
  return {
    guess:null, source:'ml', errorCode, failureReason: errorCode === 'invalid_input' ? 'invalid_input' : errorCode === 'invalid_response' ? 'invalid_output' : 'model_unavailable',
    error:'The on-device sketch model could not recognize this drawing. No image was uploaded.',
  };
}

export interface QuickDrawDiagnostic {
  top3: { label: string; score: number }[];
  outcome: 'accepted' | 'low_score' | 'unmapped';
}
export interface QuickDrawOptions {
  /** Full, uncalibrated model ranking for the DEV-only comparison. No context input. */
  onRanking?: (ranked: readonly ScoredLabel[]) => void;
  /** Developer evaluation only. Never changes ranking or production decisions. */
  onDiagnostic?: (value: QuickDrawDiagnostic) => void;
  /** Pretrained model scores, not a calibrated probability of human correctness. */
  minScore?: number;
  /** Research-only A/B configuration. Production defaults to training polarity. */
  preprocess?: QuickDrawPreprocessOptions;
}

export function createQuickDrawRecognizer(options: QuickDrawOptions = {}): DrawingRecognizer {
  return {
    async recognize(input, {signal}={}) {
      if(signal?.aborted)return fail('unavailable');
      const pixels=preprocessQuickDraw(input.strokes, options.preprocess);
      if(!pixels)return fail('invalid_input');
      try {
        if(!sharedReady) sharedReady=initialize().catch(error=>{sharedReady=undefined;throw error;});
        const {lite,model,labels}=await sharedReady;
        if(signal?.aborted)return fail('unavailable');
        // TypedArray's ArrayBufferLike generic is broader than LiteRT's host
        // ArrayBuffer constructor signature. Own a standard CPU backing buffer.
        const ownedPixels = new Float32Array(new ArrayBuffer(pixels.byteLength));
        ownedPixels.set(pixels);
        const tensor=new lite.Tensor(ownedPixels,[1,28,28,1]);
        let scores: number[];
        try {
          const outputs=await model.run([tensor]);
          try {
            const values=await outputs[0].data();
            scores=Array.from(values as Float32Array);
          } finally {for(const out of outputs)out.delete();}
        } finally {tensor.delete();}
        if(signal?.aborted)return fail('unavailable');
        if(scores.length!==345||scores.some(v=>!Number.isFinite(v)))return fail('invalid_response');
        const ordered=scores.map((score,index)=>({score,label:labels[index]})).sort((a,b)=>b.score-a.score);
        const language: Language=input.language==='ja'?'ja':'en';
        const result=imageOnlyQuickDrawResult(ordered,language,options.minScore);
        const outcome=ordered[0].score<(options.minScore??0.05)?'low_score':result.guess?'accepted':'unmapped';
        options.onDiagnostic?.({top3:ordered.slice(0,3),outcome});
        // Copy diagnostics so a research consumer cannot mutate the production result.
        if(import.meta.env.DEV) options.onRanking?.(ordered.map(candidate=>({...candidate})));
        return result;
      } catch(error) {
        // Developer-only diagnostic; never logs strokes, tensors or images.
        if (import.meta.env.DEV) console.warn('QuickDraw local inference failed:', String(error));
        return fail('unavailable');
      }
    },
  };
}
