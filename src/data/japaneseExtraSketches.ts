import type { GirlSketch } from '../core/types';
import { createTimedStrokes } from '../lib/playback';

type Point = readonly [number, number];
type Path = readonly Point[];
const line = (...points: Point[]): Path => points;
const oval = (x: number, y: number, rx: number, ry: number): Path =>
  Array.from({ length: 17 }, (_, index): Point => {
    const rad = index * Math.PI * 2 / 16;
    return [x + Math.cos(rad) * rx, y + Math.sin(rad) * ry];
  });

/** Japanese-only, hand-authored vector doodles. SOFT until blind human review. */
function sketch(id: string, word: string, paths: readonly Path[]): GirlSketch {
  return { id, word, readability: 'soft', durationMs: 1100,
    strokes: createTimedStrokes(id, paths, 1100) };
}

export const japaneseExtraSketches: readonly GirlSketch[] = [
  sketch('shizuku-ja-koma-v01', 'こま', [
    // Vertical axis, spindle, oval face and tapered spinning tip.
    line([.50,.19],[.50,.39]), oval(.50,.38,.052,.04),
    oval(.50,.47,.28,.12),
    line([.23,.46],[.34,.63],[.48,.83],[.50,.90],[.53,.83],[.66,.63],[.77,.46]),
    line([.34,.54],[.49,.59],[.66,.54]),
    line([.18,.65],[.12,.72],[.20,.78]), line([.77,.69],[.85,.74],[.79,.80]),
  ]),
  sketch('shizuku-ja-koppu-v01', 'こっぷ', [
    // Open rim, tapered sides, sturdy foot and a clearly separate handle.
    oval(.46,.30,.23,.075),
    line([.23,.30],[.27,.76],[.35,.83],[.59,.83],[.66,.76],[.69,.30]),
    line([.34,.82],[.62,.82]),
    line([.68,.39],[.78,.37],[.87,.44],[.89,.56],[.83,.65],[.68,.66]),
    line([.68,.47],[.77,.46],[.80,.53],[.77,.58],[.69,.57]),
  ]),
];
