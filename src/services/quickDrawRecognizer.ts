import type { DrawingRecognizer, Language, RecognitionResult } from '../core/types';
import { normalizeWord } from '../core/words';
import { preprocessQuickDraw } from './quickDrawPreprocess';
import { quickDrawJapanese } from './quickDrawJapanese';

type LiteRuntime = typeof import('@litertjs/core');
type LiteModel = Awaited<ReturnType<LiteRuntime['loadAndCompile']>>;
interface Ready { lite: LiteRuntime; model: LiteModel; labels: string[]; }
let sharedReady: Promise<Ready> | undefined;

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
  const lite = await import('@litertjs/core');
  await lite.loadLiteRt(bundled('wasm/')); // CPU/WASM works without GPU or JSPI.
  const [model, labelResponse] = await Promise.all([
    lite.loadAndCompile(bundled('quickdraw_model_static.tflite'), {accelerator:'wasm'}),
    fetch(bundled('labels.txt'), {cache:'force-cache'}),
  ]);
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
    guess:null, source:'ml', errorCode,
    error:'The on-device sketch model could not recognize this drawing. No image was uploaded.',
  };
}

export interface QuickDrawOptions {
  /** Pretrained model scores, not a calibrated probability of human correctness. */
  minScore?: number;
}

export function createQuickDrawRecognizer(options: QuickDrawOptions = {}): DrawingRecognizer {
  return {
    async recognize(input, {signal}={}) {
      if(signal?.aborted)return fail('unavailable');
      const pixels=preprocessQuickDraw(input.strokes);
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
        const best=ordered[0];
        if(!best || best.score<(options.minScore??0.05))return fail('invalid_response');
        const language: Language=input.language==='ja'?'ja':'en';
        // The best semantic label is authoritative. Never silently replace it
        // with a lower-ranked playable noun to make the chain look successful.
        const mapped=language==='ja'?quickDrawJapanese[best.label]:best.label;
        const guess=normalizeWord(mapped,language);
        if(!guess)return fail('invalid_response');
        return {
          guess,source:'ml',
          alternatives:ordered.slice(1,4).map(({label})=>language==='ja'?quickDrawJapanese[label]??label:label),
        };
      } catch(error) {
        // Developer-only diagnostic; never logs strokes, tensors or images.
        if (import.meta.env.DEV) console.warn('QuickDraw local inference failed:', String(error));
        return fail('unavailable');
      }
    },
  };
}
