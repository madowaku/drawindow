import type { GirlSketch, Stroke } from '../core/types';
import quickDrawData from './quick-draw-sketches.json';
import { createTimedStrokes } from '../lib/playback';

interface QuickDrawSketchSource {
  id: string;
  word: string;
  keyId: string;
  paths: number[][][];
}

const quickDrawSources = quickDrawData as QuickDrawSketchSource[];

type Path = readonly (readonly [number, number])[];

function sketchFromPaths(id: string, word: string, paths: readonly Path[]): GirlSketch {
  const strokes: readonly Stroke[] = createTimedStrokes(id, paths, 900);
  return { id, word, strokes, durationMs: 900 };
}

function quickDrawSketch(source: QuickDrawSketchSource): GirlSketch {
  const paths = source.paths as unknown as Path[];
  return sketchFromPaths(source.id, source.word, paths);
}

// These three short drawings were authored for DRAWINDOW because the source
// collection has no useful Q or X category and no yarn category in its set.
const originalSketches: readonly GirlSketch[] = [
  sketchFromPaths('girl-queen-original', 'queen', [
    [[0.18, 0.34], [0.23, 0.13], [0.37, 0.28], [0.5, 0.08], [0.63, 0.28], [0.77, 0.13], [0.82, 0.34], [0.18, 0.34]],
    [[0.2, 0.35], [0.8, 0.35], [0.78, 0.43], [0.22, 0.43], [0.2, 0.35]],
    [[0.35, 0.49], [0.35, 0.45], [0.38, 0.43], [0.42, 0.43], [0.45, 0.46], [0.46, 0.52], [0.45, 0.59], [0.42, 0.64], [0.38, 0.64], [0.35, 0.6], [0.34, 0.54], [0.35, 0.49]],
    [[0.55, 0.46], [0.58, 0.43], [0.62, 0.44], [0.65, 0.49], [0.66, 0.55], [0.65, 0.6], [0.62, 0.64], [0.58, 0.64], [0.55, 0.6], [0.54, 0.54], [0.55, 0.46]],
    [[0.43, 0.52], [0.44, 0.52]],
    [[0.57, 0.52], [0.58, 0.52]],
    [[0.46, 0.58], [0.5, 0.6], [0.54, 0.58]],
    [[0.31, 0.77], [0.35, 0.7], [0.43, 0.66], [0.5, 0.66], [0.57, 0.66], [0.65, 0.7], [0.69, 0.77], [0.72, 0.89], [0.28, 0.89], [0.31, 0.77]],
  ]),
  sketchFromPaths('girl-xylophone-original', 'xylophone', [
    [[0.16, 0.3], [0.84, 0.3], [0.76, 0.68], [0.24, 0.68], [0.16, 0.3]],
    [[0.25, 0.68], [0.22, 0.81]],
    [[0.75, 0.68], [0.78, 0.81]],
    [[0.3, 0.35], [0.27, 0.6]],
    [[0.4, 0.35], [0.38, 0.6]],
    [[0.5, 0.35], [0.5, 0.6]],
    [[0.6, 0.35], [0.62, 0.6]],
    [[0.7, 0.35], [0.73, 0.6]],
    [[0.29, 0.19], [0.45, 0.1], [0.55, 0.08]],
    [[0.72, 0.15], [0.59, 0.23], [0.53, 0.26]],
  ]),
  sketchFromPaths('girl-yarn-original', 'yarn', [
    [[0.5, 0.12], [0.64, 0.15], [0.77, 0.24], [0.84, 0.38], [0.84, 0.55], [0.77, 0.7], [0.65, 0.82], [0.5, 0.87], [0.35, 0.82], [0.22, 0.72], [0.15, 0.57], [0.15, 0.4], [0.22, 0.25], [0.35, 0.15], [0.5, 0.12]],
    [[0.29, 0.3], [0.4, 0.23], [0.53, 0.24], [0.65, 0.31], [0.72, 0.42], [0.69, 0.54], [0.6, 0.63], [0.47, 0.66], [0.34, 0.61], [0.28, 0.51], [0.3, 0.4], [0.4, 0.34], [0.53, 0.35], [0.62, 0.43], [0.62, 0.53], [0.54, 0.58], [0.45, 0.55], [0.43, 0.48]],
    [[0.23, 0.57], [0.29, 0.68], [0.4, 0.73], [0.52, 0.72], [0.61, 0.67], [0.68, 0.58], [0.73, 0.49]],
    [[0.34, 0.18], [0.39, 0.1], [0.5, 0.08], [0.59, 0.12]],
  ]),
];

/** First template starts every session; the catalogue also covers A through Z. */
export const girlSketches: readonly GirlSketch[] = Object.freeze([
  ...quickDrawSources.map(quickDrawSketch),
  ...originalSketches,
]);
