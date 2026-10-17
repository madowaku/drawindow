import type { DrawingRecognizer, RecognitionErrorCode, RecognitionInput, RecognitionResult, Stroke } from '../core/types';
import { normalizeWord } from '../core/words';

export interface ApiRecognizerOptions {
  endpoint?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  imageRenderer?: (strokes: readonly Stroke[]) => string;
}

export interface RecognitionRunnerOptions {
  timeoutMs?: number;
  maxEntries?: number;
}

function failure(code: RecognitionErrorCode): RecognitionResult {
  return { guess: null, source: 'api', errorCode: code, error: 'Drawing recognition is unavailable. Your drawing is safe.' };
}

/** Render only raw input, never the presentation canvas or any character pixels. */
export function renderRecognitionImage(strokes: readonly Stroke[]): string {
  if (typeof document === 'undefined') throw new Error('Canvas unavailable');
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = '#fff'; context.fillRect(0, 0, 512, 512);
  context.strokeStyle = '#000'; context.fillStyle = '#000';
  context.lineWidth = 10; context.lineCap = 'round'; context.lineJoin = 'round';
  let points = 0;
  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    context.beginPath();
    for (let i = 0; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1 || ++points > 16000) throw new Error('Invalid drawing');
      if (i === 0) context.moveTo(16 + p.x * 480, 16 + p.y * 480);
      else context.lineTo(16 + p.x * 480, 16 + p.y * 480);
    }
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      context.arc(16 + p.x * 480, 16 + p.y * 480, 5, 0, Math.PI * 2); context.fill();
    } else context.stroke();
  }
  if (!points) throw new Error('Empty drawing');
  return canvas.toDataURL('image/png');
}

export function createApiRecognizer(options: ApiRecognizerOptions = {}): DrawingRecognizer {
  return {
    async recognize(input, signalOptions) {
      let imageDataUrl: string;
      try { imageDataUrl = input.imageDataUrl ?? (options.imageRenderer ?? renderRecognitionImage)(input.strokes); }
      catch { return failure('invalid_input'); }
      if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(imageDataUrl) || imageDataUrl.length > 400000) return failure('invalid_input');
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => controller.abort();
      signalOptions?.signal?.addEventListener('abort', onAbort, { once: true });
      if (signalOptions?.signal?.aborted) controller.abort();
      try {
        return await Promise.race([
          (async (): Promise<RecognitionResult> => {
            const response = await (options.fetch ?? globalThis.fetch)(options.endpoint ?? '/api/recognize', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
              body: JSON.stringify({ requestId: input.requestId, imageDataUrl }),
            });
            if (!response.ok) return failure(response.status === 429 ? 'rate_limit' : response.status === 504 ? 'timeout' : response.status === 400 || response.status === 413 || response.status === 415 ? 'invalid_input' : 'unavailable');
            const data: unknown = await response.json();
            if (!data || typeof data !== 'object') return failure('invalid_response');
            const result = data as Partial<RecognitionResult>;
            const guess = normalizeWord(result.guess);
            if (result.source !== 'api' || result.error || !guess || !/^[a-z]{1,32}$/.test(guess)) return failure(result.errorCode ?? 'invalid_response');
            return { guess, source: 'api' };
          })().catch(() => failure(controller.signal.aborted ? 'timeout' : 'invalid_response')),
          new Promise<RecognitionResult>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(failure('timeout')); }, Math.min(20000, Math.max(1, options.timeoutMs ?? 12000))); }),
        ]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        signalOptions?.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}

/** This is a disclosed simulation, not drawing recognition. */
export function createDemoRecognizer(): DrawingRecognizer {
  const guesses = ['cat', 'tree', 'egg', 'tiger'];
  return { async recognize(input) {
    const round = Number(input.requestId.split(':')[1]);
    return { guess: guesses[(Math.max(1, Number.isFinite(round) ? round : 1) - 1) % guesses.length], source: 'mock' };
  } };
}

/** Own one runner per app instance. Abort of an observer must not cancel a shared request. */
export function createRecognitionRunner(recognizer: DrawingRecognizer, options: RecognitionRunnerOptions = {}): DrawingRecognizer {
  const requests = new Map<string, Promise<RecognitionResult>>();
  const maxEntries = Math.max(10, Math.min(100, options.maxEntries ?? 50));
  return { recognize(input) {
    const cached = requests.get(input.requestId);
    if (cached) return cached;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const request = Promise.race([
      Promise.resolve().then(() => recognizer.recognize(input, { signal: controller.signal })).catch(() => failure('network')),
      new Promise<RecognitionResult>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(failure('timeout')); }, Math.min(25000, Math.max(1, options.timeoutMs ?? 15000))); }),
    ]).finally(() => clearTimeout(timer));
    requests.set(input.requestId, request);
    while (requests.size > maxEntries) requests.delete(requests.keys().next().value!);
    return request;
  } };
}
