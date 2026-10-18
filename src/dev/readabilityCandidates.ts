import type { GirlSketch } from '../core/types';
import { createTimedStrokes } from '../lib/playback';

// Original review candidate, not a production replacement. Uneven oval, two eye
// discs, triangular beak, wings and perch; no letters or written target hints.
const paths: readonly (readonly (readonly [number, number])[])[] = [
  [[.28,.28],[.24,.17],[.38,.23],[.49,.20],[.62,.24],[.75,.16],[.72,.31],[.77,.43],[.75,.62],[.68,.75],[.56,.80],[.43,.79],[.30,.73],[.23,.61],[.22,.44],[.28,.28]],
  [[.47,.36],[.44,.29],[.35,.28],[.29,.33],[.28,.41],[.32,.47],[.39,.49],[.45,.45],[.47,.36]],
  [[.53,.36],[.57,.29],[.65,.29],[.71,.35],[.72,.42],[.67,.48],[.60,.49],[.54,.44],[.53,.36]],
  [[.37,.36],[.38,.40]], [[.63,.36],[.62,.40]],
  [[.47,.49],[.54,.49],[.50,.56],[.47,.49]],
  [[.28,.49],[.33,.61],[.42,.69]], [[.71,.50],[.67,.62],[.59,.70]],
  [[.39,.79],[.36,.87],[.40,.84],[.44,.87]], [[.57,.80],[.55,.87],[.59,.84],[.63,.87]],
  [[.21,.89],[.46,.88],[.77,.89]],
];
export const owlCandidate: GirlSketch = {
  id: 'girl-owl-review-v04-original', word: 'owl',
  strokes: createTimedStrokes('girl-owl-review-v04-original', paths, 1400), durationMs: 1400,
};
