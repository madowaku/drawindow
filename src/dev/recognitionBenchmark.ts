import type { DrawingRecognizer, RecognitionResult, RecognitionErrorCode, RecognitionSource, Stroke } from '../core/types';
import { lastLetter, normalizeWord, selectGirlSketch } from '../core/words';
import { girlSketches } from '../data/sketches';
import { renderDrawingDataUrl } from '../lib/strokes';
import { createQuickDrawRecognizer, type QuickDrawDiagnostic } from '../services/quickDrawRecognizer';

export const BENCHMARK_PROMPTS = [
  { intent: 'apple', ja: 'りんご', category: 'simple', ambiguity: 'low' },
  { intent: 'cat', ja: 'ねこ', category: 'simple', ambiguity: 'low' },
  { intent: 'tree', ja: '木', category: 'simple', ambiguity: 'low' },
  { intent: 'house', ja: '家', category: 'simple', ambiguity: 'low' },
  { intent: 'fish', ja: '魚', category: 'simple', ambiguity: 'low' },
  { intent: 'clock', ja: '時計', category: 'simple', ambiguity: 'low' },
  { intent: 'elephant', ja: 'ぞう', category: 'detail', ambiguity: 'medium' },
  { intent: 'guitar', ja: 'ギター', category: 'ambiguous', ambiguity: 'guitar/shovel' },
  { intent: 'umbrella', ja: 'かさ', category: 'ambiguous', ambiguity: 'umbrella/mushroom' },
  { intent: 'tissue box', ja: 'ティッシュ箱', category: 'ambiguous', ambiguity: 'tissue/box' },
  { intent: 'mouse (animal)', ja: 'ねずみ（動物）', category: 'ambiguous', ambiguity: 'animal/computer device' },
  { intent: 'human-drawn unrecognizable scribble', ja: '何にも見えない、でたらめな線', category: 'hard/negative', ambiguity: 'expected abstain/error' },
].map((prompt, index) => ({ ...prompt, sampleId: String(index + 1).padStart(2, '0'), recognizable: index < 11 }));

export type Judgement = 'exact' | 'plausible_alternative' | 'unrelated' | 'abstain_or_error';
export type InputType = 'mouse' | 'touch' | 'pen' | 'keyboard';
export interface DrawerIdentity {
  drawerId: string;
  device: 'desktop' | 'phone' | 'tablet' | 'other';
  inputTypes: readonly InputType[];
}
export interface BenchmarkAttempt extends DrawerIdentity {
  sampleId: string;
  intent: string;
  category: string;
  ambiguity: string;
  attempt: number;
  requestId: string;
  rawPointCount: number;
  imageWidth: 512;
  imageHeight: 512;
  imageBytes: number;
  guess: string | null;
  top3: { label: string; score: number }[] | null;
  failureReason: RecognitionResult['failureReason'] | null;
  modelOutcome: QuickDrawDiagnostic['outcome'] | null;
  top3MatchesIntent: boolean | null;
  chainContinued: boolean | null;
  errorCode: RecognitionErrorCode | null;
  source: RecognitionSource;
  httpStatus: number | null;
  elapsedMs: number;
  timestamp: string;
  judgement: Judgement | null;
  rationale: string;
  nextInitial: string | null;
  nextTemplateCovered: boolean | null;
  nextTemplateId: string | null;
}
interface SessionOptions {
  recognizer?: DrawingRecognizer;
  imageRenderer?: (strokes: readonly Stroke[]) => string;
  now?: () => number;
}
const errorCodes = new Set<RecognitionErrorCode>(['unavailable', 'timeout', 'rate_limit', 'invalid_response', 'invalid_input', 'network', 'uncovered_letter']);
const judgements: readonly Judgement[] = ['exact', 'plausible_alternative', 'unrelated', 'abstain_or_error'];
const inputTypes: readonly InputType[] = ['mouse', 'touch', 'pen', 'keyboard'];

export function validDrawing(strokes: readonly Stroke[]): boolean {
  const points = strokes.flatMap(stroke => stroke.points);
  return points.length > 0 && points.length <= 16000 && points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 && Number.isFinite(p.t) && p.t >= 0);
}

/** Memory only. Drawing intentions never cross the DrawingRecognizer boundary. */
export class BenchmarkSession {
  readonly sessionId = `${Date.now()}${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  readonly attempts: BenchmarkAttempt[] = [];
  feedback = { completedGame: null as boolean | null, fun: null as number | null, replay: null as boolean | null, confusion: '' };
  sending = false;
  cooldownUntil = 0;
  validationError: 'invalid_input' | null = null;
  zeroStrokeCheck: { timestamp: string; result: 'invalid_input'; apiCalls: 0 } | null = null;
  private readonly now: () => number;
  constructor(private readonly options: SessionOptions = {}) { this.now = options.now ?? Date.now; }
  get remainingMs() { return Math.max(0, this.cooldownUntil - this.now()); }

  checkZeroStrokes() {
    if (!validDrawing([])) this.zeroStrokeCheck = { timestamp: new Date().toISOString(), result: 'invalid_input', apiCalls: 0 };
    return this.zeroStrokeCheck;
  }

  async send(sampleIndex: number, strokes: readonly Stroke[], identity: DrawerIdentity, manualRetry = false): Promise<BenchmarkAttempt | null> {
    if (this.sending || this.remainingMs > 0) return null;
    const prompt = BENCHMARK_PROMPTS[sampleIndex];
    const previous = this.attempts.filter(item => item.sampleId === prompt?.sampleId);
    if (!prompt || (previous.length > 0 && !manualRetry) || (previous.length === 0 && manualRetry)) return null;
    this.validationError = null;
    if (!validDrawing(strokes) || !/^[a-zA-Z0-9_-]{1,24}$/.test(identity.drawerId) || !identity.inputTypes.length || identity.inputTypes.some(type => !inputTypes.includes(type))) {
      this.validationError = 'invalid_input'; return null;
    }
    let imageDataUrl: string;
    try { imageDataUrl = (this.options.imageRenderer ?? (value => renderDrawingDataUrl(value, 512)))(strokes); }
    catch { this.validationError = 'invalid_input'; return null; }
    if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(imageDataUrl) || imageDataUrl.length > 400000) { this.validationError = 'invalid_input'; return null; }
    this.sending = true;
    const requestId = `${this.sessionId}:${sampleIndex + 1}:${previous.length + 1}`;
    let httpStatus: number | null = null;
    let retryAfterMs: number | null = null;
    let diagnostic: QuickDrawDiagnostic | null = null;
    const recognizer = this.options.recognizer ?? createQuickDrawRecognizer({ onDiagnostic: value => { diagnostic = value; } });
    const timestamp = new Date().toISOString();
    const started = performance.now();
    // One explicit invocation, no runner, retry loop, effects or DEMO adapter.
    let result;
    try { result = await recognizer.recognize({ requestId, strokes, imageDataUrl }); }
    catch { result = { guess: null, source: 'api' as const, errorCode: 'network' as const, failureReason: undefined }; }
    const elapsedMs = Math.max(0, Math.round(performance.now() - started));
    const validGuess = (result.source === 'api' || result.source === 'ml') && !result.error && !result.errorCode && typeof result.guess === 'string' && result.guess === normalizeWord(result.guess);
    const guess = validGuess ? result.guess : null;
    const errorCode = validGuess ? null : result.source === 'mock' ? 'invalid_response' : result.errorCode && errorCodes.has(result.errorCode) ? result.errorCode : 'invalid_response';
    const nextInitial = lastLetter(guess);
    const nextTemplate = nextInitial ? selectGirlSketch(girlSketches, nextInitial) : null;
    const base64 = imageDataUrl.slice(imageDataUrl.indexOf(',') + 1);
    const record: BenchmarkAttempt = {
      sampleId: prompt.sampleId, intent: prompt.intent, category: prompt.category, ambiguity: prompt.ambiguity,
      drawerId: identity.drawerId, device: identity.device, inputTypes: [...new Set(identity.inputTypes)],
      attempt: previous.length + 1, requestId, rawPointCount: strokes.reduce((count, stroke) => count + stroke.points.length, 0),
      imageWidth: 512, imageHeight: 512, imageBytes: Math.floor(base64.length * 3 / 4) - (base64.match(/=+$/)?.[0].length ?? 0),
      failureReason: result.failureReason ?? null, guess, top3: diagnostic ? (diagnostic as QuickDrawDiagnostic).top3 : null, modelOutcome: diagnostic ? (diagnostic as QuickDrawDiagnostic).outcome : null, top3MatchesIntent: null, chainContinued: null, errorCode, source: result.source === 'mock' ? 'mock' : result.source === 'ml' ? 'ml' : 'api', httpStatus, elapsedMs, timestamp,
      judgement: null, rationale: '', nextInitial, nextTemplateCovered: nextInitial ? !!nextTemplate : null, nextTemplateId: nextTemplate?.id ?? null,
    };
    this.attempts.push(record);
    this.cooldownUntil = this.now() + Math.max(6000, errorCode === 'rate_limit' ? Math.max(60000, retryAfterMs ?? 0) : 0);
    this.sending = false;
    return record;
  }

  observe(requestId: string, key: 'top3MatchesIntent' | 'chainContinued', value: boolean | null) {
    const record = this.attempts.find(item => item.requestId === requestId);
    if (record) record[key] = value;
  }

  judge(requestId: string, judgement: Judgement, rationale: string) {
    const record = this.attempts.find(item => item.requestId === requestId);
    if (!record || !judgements.includes(judgement)) return;
    if (record.errorCode && judgement !== 'abstain_or_error') return;
    if (!record.errorCode && judgement === 'abstain_or_error') return;
    record.judgement = judgement;
    record.rationale = cleanText(rationale);
  }
}

export function summarize(attempts: readonly BenchmarkAttempt[]) {
  const first = attempts.filter(item => item.attempt === 1);
  const recognizable = first.filter(item => item.sampleId !== '12');
  const latencies = first.map(item => item.elapsedMs).sort((a, b) => a - b);
  const count = latencies.length;
  const nextInitials = [...new Set(first.flatMap(item => item.nextInitial ? [item.nextInitial] : []))].sort();
  return {
    firstAttempts: first.length, retries: attempts.length - first.length,
    judged: first.filter(item => item.judgement && item.rationale.trim()).length,
    denominator: 11,
    top3Reviewed: recognizable.filter(item => item.top3MatchesIntent !== null).length,
    top3Matches: recognizable.filter(item => item.top3MatchesIntent === true).length,
    chainObserved: first.filter(item => item.chainContinued !== null).length,
    chainContinued: first.filter(item => item.chainContinued === true).length,
    unknown: first.filter(item => item.guess === null).length,
    unmapped: first.filter(item => item.modelOutcome === 'unmapped').length,
    exact: recognizable.filter(item => item.judgement === 'exact').length,
    plausibleOrExact: recognizable.filter(item => item.judgement === 'exact' || item.judgement === 'plausible_alternative').length,
    errorCount: first.filter(item => item.errorCode || item.source === 'mock').length,
    latency: count ? { min: latencies[0], median: count % 2 ? latencies[Math.floor(count / 2)] : (latencies[count / 2 - 1] + latencies[count / 2]) / 2, p90: latencies[Math.ceil(count * .9) - 1], max: latencies[count - 1] } : null,
    nextInitials, coveredNextInitials: [...new Set(first.filter(item => item.nextTemplateCovered).map(item => item.nextInitial!))].sort(),
    complete: first.length === 12 && first.every(item => item.judgement && item.rationale.trim()),
    confusionExamples: first.filter(item => (item.judgement === 'plausible_alternative' || item.judgement === 'unrelated') && item.rationale.trim()).map(item => ({ sampleId: item.sampleId, intent: item.intent, guess: item.guess, judgement: item.judgement, rationale: cleanText(item.rationale) })),
  };
}

function cleanText(value: string): string {
  return value.slice(0, 240).replace(/(?:AQ\.[\w.-]+|AIza[\w-]+|(?:GEMINI_API_KEY|Authorization|Bearer)\s*[:=]?\s*\S+)/gi, '[redacted]').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

// Explicit fields ensure later debug additions cannot silently enter exports.
function safeAttempt(item: BenchmarkAttempt): BenchmarkAttempt {
  return {
    sampleId: item.sampleId, intent: item.intent, category: item.category, ambiguity: item.ambiguity,
    drawerId: cleanText(item.drawerId), device: item.device, inputTypes: [...item.inputTypes], attempt: item.attempt,
    requestId: item.requestId, rawPointCount: item.rawPointCount, imageWidth: item.imageWidth, imageHeight: item.imageHeight, imageBytes: item.imageBytes,
    failureReason: item.failureReason, guess: item.guess, top3: item.top3?.map(({label, score}) => ({label: cleanText(label), score})) ?? null, modelOutcome: item.modelOutcome, top3MatchesIntent: item.top3MatchesIntent, chainContinued: item.chainContinued, errorCode: item.errorCode, source: item.source, httpStatus: item.httpStatus, elapsedMs: item.elapsedMs, timestamp: item.timestamp,
    judgement: item.judgement, rationale: cleanText(item.rationale), nextInitial: item.nextInitial, nextTemplateCovered: item.nextTemplateCovered, nextTemplateId: item.nextTemplateId,
  };
}
export function exportJson(session: BenchmarkSession): string {
  return JSON.stringify({ schema: 'DRAWINDOW-freehand-v0.9', scope: 'Exploratory human pilot; not population accuracy, LIVE or device acceptance.', sessionId: session.sessionId, exportedAt: new Date().toISOString(), model: session.attempts.some(item => item.source === 'ml') ? 'quickdraw-345-tflite@b02fde8d8732aed32bc9d8176c3dc4efda0333fb' : null, feedback: { completedGame: session.feedback.completedGame, fun: session.feedback.fun, replay: session.feedback.replay, confusion: cleanText(session.feedback.confusion) }, zeroStrokeCheck: session.zeroStrokeCheck, summary: summarize(session.attempts), attempts: session.attempts.map(safeAttempt) }, null, 2);
}
export function exportCsv(session: BenchmarkSession): string {
  const rows = session.attempts.map(safeAttempt);
  const columns: (keyof BenchmarkAttempt)[] = ['sampleId', 'drawerId', 'device', 'inputTypes', 'intent', 'category', 'ambiguity', 'attempt', 'rawPointCount', 'requestId', 'guess', 'failureReason', 'top3', 'modelOutcome', 'top3MatchesIntent', 'chainContinued', 'errorCode', 'source', 'httpStatus', 'elapsedMs', 'timestamp', 'judgement', 'rationale', 'imageWidth', 'imageHeight', 'imageBytes', 'nextInitial', 'nextTemplateCovered', 'nextTemplateId'];
  const cell = (value: unknown) => {
    const text = Array.isArray(value) ? value.map(entry => typeof entry === 'object' ? JSON.stringify(entry) : entry).join('|') : value == null ? '' : String(value);
    const safe = /^\s*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\ufeff' + [columns.join(','), ...rows.map(row => columns.map(key => cell(row[key])).join(','))].join('\r\n');
}
