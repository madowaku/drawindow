import type { DrawingRecognizer, GirlSketch, Language, RecognitionResult, Stroke } from '../core/types';
import { normalizeWord } from '../core/words';

/**
 * Offline v0.8 LAB: a deterministic nearest-sketch baseline, NOT a trained AI
 * classifier or a substitute for human accuracy testing. Only coordinates,
 * local assets and arithmetic are used; no DOM, fetch or remote inference.
 */
const GRID = 28;
const PADDING = 3;
const MAX_POINTS = 16000;
const DIAGONAL = Math.SQRT2;

interface Signature {
  readonly occupied: readonly number[];
  readonly field: Float32Array;
}

interface Candidate extends Signature {
  readonly word: string;
}

export interface LocalRecognizerOptions {
  /** Symmetric average pixel distance, NOT a probability or confidence. */
  maxDistance?: number;
  /** Required separation from the best competing distinct word. */
  minMargin?: number;
  /** LAB ONLY: always return the nearest drawable word when the drawing is
   * structurally valid, even if the fit is weak or tied. Never use as a
   * quality claim or an official score. */
  exploreNearest?: boolean;
}

const failure = (errorCode: 'invalid_input' | 'invalid_response' | 'unavailable'): RecognitionResult => ({
  guess: null, source: 'local', errorCode,
  error: 'The local recognizer could not identify this drawing. Your strokes are safe.',
});

function signature(strokes: readonly Stroke[]): Signature | null {
  if (!Array.isArray(strokes) || strokes.length === 0 || strokes.length > 256) return null;
  let total = 0;
  const points: { x: number; y: number }[] = [];
  for (const stroke of strokes) {
    if (!stroke || !Array.isArray(stroke.points)) return null;
    for (const point of stroke.points) {
      if (++total > MAX_POINTS || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
          point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
      points.push(point);
    }
  }
  if (points.length === 0) return null;
  let left = points[0].x, right = points[0].x, top = points[0].y, bottom = points[0].y;
  for (const point of points) {
    left = Math.min(left, point.x); right = Math.max(right, point.x);
    top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
  }
  const scale = (GRID - 2 * PADDING - 1) / Math.max(right - left, bottom - top, 0.04);
  const xOffset = (GRID - (right - left) * scale) / 2;
  const yOffset = (GRID - (bottom - top) * scale) / 2;
  const pixels = new Uint8Array(GRID * GRID);
  const stamp = (x: number, y: number) => {
    const cx = Math.round(x), cy = Math.round(y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = cx + dx, yy = cy + dy;
      if (xx >= 0 && xx < GRID && yy >= 0 && yy < GRID && dx * dx + dy * dy <= 2)
        pixels[yy * GRID + xx] = 1;
    }
  };
  for (const stroke of strokes) {
    let previous: { x: number; y: number } | null = null;
    for (const point of stroke.points) {
      const current = { x: xOffset + (point.x - left) * scale, y: yOffset + (point.y - top) * scale };
      if (previous) {
        const n = Math.max(1, Math.ceil(Math.hypot(current.x - previous.x, current.y - previous.y) * 2));
        for (let step = 0; step <= n; step++)
          stamp(previous.x + (current.x - previous.x) * step / n, previous.y + (current.y - previous.y) * step / n);
      } else stamp(current.x, current.y);
      previous = current;
    }
  }
  const occupied: number[] = [];
  const field = new Float32Array(GRID * GRID);
  for (let i = 0; i < field.length; i++) {
    if (pixels[i]) occupied.push(i);
    field[i] = pixels[i] ? 0 : 1000;
  }
  if (!occupied.length) return null;
  // Eight-neighbour approximate Euclidean distance transform: O(GRID^2).
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = y * GRID + x;
    if (x) field[i] = Math.min(field[i], field[i - 1] + 1);
    if (y) field[i] = Math.min(field[i], field[i - GRID] + 1);
    if (x && y) field[i] = Math.min(field[i], field[i - GRID - 1] + DIAGONAL);
    if (x + 1 < GRID && y) field[i] = Math.min(field[i], field[i - GRID + 1] + DIAGONAL);
  }
  for (let y = GRID - 1; y >= 0; y--) for (let x = GRID - 1; x >= 0; x--) {
    const i = y * GRID + x;
    if (x + 1 < GRID) field[i] = Math.min(field[i], field[i + 1] + 1);
    if (y + 1 < GRID) field[i] = Math.min(field[i], field[i + GRID] + 1);
    if (x + 1 < GRID && y + 1 < GRID) field[i] = Math.min(field[i], field[i + GRID + 1] + DIAGONAL);
    if (x && y + 1 < GRID) field[i] = Math.min(field[i], field[i + GRID - 1] + DIAGONAL);
  }
  return { occupied, field };
}

function distance(a: Signature, b: Signature): number {
  let aToB = 0, bToA = 0;
  for (const index of a.occupied) aToB += b.field[index];
  for (const index of b.occupied) bToA += a.field[index];
  // A soft mass penalty discourages matching a single line against a detailed object.
  const sizePenalty = Math.abs(Math.log(a.occupied.length / b.occupied.length)) * 0.8;
  return (aToB / a.occupied.length + bToA / b.occupied.length) / 2 + sizePenalty;
}

export function createLocalRecognizer(
  getSketches: (language: Language) => readonly GirlSketch[],
  options: LocalRecognizerOptions = {},
): DrawingRecognizer {
  const cache = new Map<Language, Candidate[]>();
  const getCandidates = (language: Language) => {
    const cached = cache.get(language);
    if (cached) return cached;
    const candidates: Candidate[] = [];
    for (const sketch of getSketches(language)) {
      if (sketch.readability === 'spicy' || sketch.readability === 'reject') continue;
      const word = normalizeWord(sketch.word, language);
      const signatureData = signature(sketch.strokes);
      if (word && signatureData) candidates.push({ ...signatureData, word });
    }
    cache.set(language, candidates);
    return candidates;
  };
  return {
    async recognize(input, { signal } = {}) {
      if (signal?.aborted) return failure('unavailable');
      const query = signature(input.strokes);
      if (!query || query.occupied.length < 4) return failure('invalid_input');
      const lang = input.language === 'ja' ? 'ja' : 'en';
      const candidates = getCandidates(lang);
      if (!candidates.length) return failure('unavailable');
      const byWord = new Map<string, number>();
      for (const candidate of candidates) {
        const score = distance(query, candidate);
        byWord.set(candidate.word, Math.min(byWord.get(candidate.word) ?? Infinity, score));
      }
      const ranked = [...byWord].sort((a, b) => a[1] - b[1]);
      const [winner, runnerUp] = ranked;
      // Deliberate abstention. Distances are not neural confidence scores.
      if (!winner || (!options.exploreNearest &&
          (winner[1] > (options.maxDistance ?? 4.0) ||
           (runnerUp && runnerUp[1] - winner[1] < (options.minMargin ?? 0.20)))))
        return failure('invalid_response');
      if (signal?.aborted) return failure('unavailable');
      return { guess: winner[0], source: 'local' };
    },
  };
}
