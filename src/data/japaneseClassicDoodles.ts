import type { GirlSketch } from '../core/types';
import { createTimedStrokes } from '../lib/playback';

type Point = readonly [number, number];
type Path = readonly Point[];
const line = (...points: Point[]): Path => points;
const ellipse = (x: number, y: number, rx: number, ry: number): Path =>
  Array.from({ length: 17 }, (_, index): Point => {
    const angle = index * Math.PI / 8;
    // Same gentle off-center line wobble as Shizuku's pencil sketches.
    const wobble = 1 + .023 * Math.sin(angle * 3 + x * 7);
    return [x + Math.cos(angle) * rx * wobble, y + Math.sin(angle) * ry * wobble];
  });
const dot = (x: number, y: number, r = .019): Path => ellipse(x, y, r, r);
const rectangle = (x1: number, y1: number, x2: number, y2: number): Path =>
  line([x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]);

/**
 * DRAWINDOW v0.6: common picture-shiritori nouns.
 * Original, hand-authored monochrome vector strokes. No letters, numbers, or
 * written hints inside the drawings. Approx. 1.2s of Shizuku finger movement.
 * SAFE/SOFT are **maker assumptions**, never measured recognition accuracy.
 */
function doodle(id: string, word: string, readability: 'safe' | 'soft', paths: readonly Path[]): GirlSketch {
  const fullId = `shizuku-ja-classic-${id}-v01`;
  return { id: fullId, word, readability, durationMs: 1200, strokes: createTimedStrokes(fullId, paths, 1200) };
}

/** Pre-polish version, retained for honest side-by-side visual review only.
 * It is NEVER included in the Japanese gameplay catalogue.
 */
export const japaneseClassicBefore: readonly GirlSketch[] = [
  // ご → ごりら : distinctive huge arms, round ears, broad muzzle.
  // A generic monkey remains a possible reading, so review as SOFT.
  doodle('gorilla', 'ごりら', 'soft', [
    ellipse(.50,.34,.22,.24), ellipse(.31,.28,.065,.10), ellipse(.69,.28,.065,.10),
    ellipse(.50,.46,.14,.10), dot(.41,.34), dot(.60,.34),
    ellipse(.50,.44,.027,.018), line([.44,.51],[.50,.53],[.57,.51]),
    line([.36,.54],[.27,.57],[.20,.77],[.17,.88]), line([.64,.54],[.75,.56],[.82,.77],[.83,.88]),
    ellipse(.50,.73,.21,.22),
    line([.37,.89],[.32,.92],[.43,.91]), line([.63,.89],[.68,.92],[.57,.91]),
  ]),
  // ぱ → ぱいなっぷる : patterned oval and pointed leaf crown.
  doodle('pineapple', 'ぱいなっぷる', 'safe', [
    line([.34,.28],[.24,.38],[.24,.73],[.34,.86],[.54,.90],[.72,.77],[.75,.48],[.64,.28],[.34,.28]),
    line([.47,.31],[.32,.14],[.47,.24],[.46,.07],[.54,.24],[.67,.11],[.59,.29]),
    line([.30,.40],[.67,.77]), line([.26,.57],[.56,.85]),
    line([.41,.28],[.74,.60]), line([.69,.38],[.30,.77]), line([.57,.30],[.25,.61]),
    line([.73,.52],[.44,.86]),
  ]),
  // か → かめ : recognizable shell pattern, four feet and short tail.
  doodle('turtle', 'かめ', 'safe', [
    line([.27,.67],[.25,.52],[.32,.34],[.46,.28],[.62,.34],[.72,.52],[.72,.68],[.27,.67]),
    ellipse(.82,.56,.105,.095), dot(.86,.53),
    line([.32,.69],[.23,.83],[.32,.86],[.42,.69]), line([.59,.68],[.66,.86],[.77,.84],[.69,.67]),
    line([.26,.64],[.13,.68],[.23,.72]),
    line([.37,.43],[.49,.35],[.61,.43],[.64,.56],[.52,.66],[.38,.58],[.37,.43]),
    line([.38,.58],[.27,.64]), line([.64,.56],[.72,.63]), line([.49,.35],[.50,.27]),
  ]),
  // う → うちわ : solid paddle (not a folding fan), slim handle.
  doodle('uchiwa', 'うちわ', 'safe', [
    line([.48,.21],[.28,.24],[.18,.38],[.19,.54],[.28,.65],[.49,.70],[.71,.64],[.80,.52],[.80,.37],[.71,.24],[.48,.21]),
    line([.50,.69],[.49,.91],[.55,.92],[.55,.69]), line([.26,.45],[.74,.46]),
    line([.49,.26],[.51,.69]), line([.33,.32],[.50,.69]), line([.68,.32],[.50,.69]),
  ]),
  // と → とんぼ : four long wings and segmented straight body.
  doodle('dragonfly', 'とんぼ', 'safe', [
    ellipse(.50,.20,.062,.085), ellipse(.50,.43,.045,.12),
    line([.49,.52],[.49,.85]), line([.53,.54],[.53,.85]),
    line([.48,.59],[.54,.59]), line([.48,.68],[.54,.68]), line([.48,.77],[.54,.77]),
    line([.47,.35],[.25,.25],[.13,.30],[.18,.41],[.47,.46]),
    line([.54,.35],[.77,.24],[.87,.30],[.82,.41],[.55,.46]),
    line([.47,.45],[.24,.48],[.13,.63],[.24,.67],[.47,.51]),
    line([.55,.45],[.76,.48],[.87,.63],[.76,.67],[.55,.51]),
    dot(.48,.18,.013), dot(.53,.18,.013),
  ]),
  // こ → こうもり : scalloped membrane wings, ears, sleepy grin.
  doodle('bat', 'こうもり', 'safe', [
    line([.43,.39],[.30,.25],[.22,.31],[.11,.24],[.08,.38],[.12,.55],[.20,.48],
      [.29,.61],[.34,.55],[.43,.62]),
    line([.57,.39],[.70,.25],[.78,.31],[.89,.24],[.92,.38],[.88,.55],[.80,.48],
      [.71,.61],[.66,.55],[.57,.62]),
    line([.42,.40],[.40,.24],[.47,.34],[.53,.34],[.60,.24],[.58,.40]),
    ellipse(.50,.50,.115,.19), dot(.46,.45,.015), dot(.54,.45,.015),
    line([.46,.55],[.50,.58],[.54,.55]),
    line([.45,.66],[.41,.77]), line([.55,.66],[.60,.77]),
  ]),
  // ち → ちくわ : visible hollow tube and irregular lightly burnt markings.
  // Still confusable with a roll or hollow bread, so SOFT.
  doodle('chikuwa', 'ちくわ', 'soft', [
    ellipse(.29,.66,.14,.15),
    ellipse(.29,.66,.052,.060),
    line([.22,.54],[.58,.21],[.75,.23],[.39,.77]),
    line([.39,.77],[.36,.78]), ellipse(.67,.21,.105,.10),
    ellipse(.67,.21,.042,.043),
    line([.48,.34],[.51,.44],[.56,.47]), line([.55,.29],[.61,.38]),
    line([.39,.45],[.43,.52]),
  ]),
  // せ → せみ : chunky body, eye dots, strong veined wings, six short legs.
  doodle('cicada', 'せみ', 'soft', [
    ellipse(.50,.31,.16,.13), ellipse(.50,.58,.135,.24),
    ellipse(.28,.58,.17,.25), ellipse(.73,.58,.17,.25),
    line([.40,.42],[.15,.76]), line([.60,.42],[.86,.77]),
    line([.29,.40],[.44,.76]), line([.71,.40],[.56,.76]),
    dot(.42,.29,.017), dot(.58,.29,.017),
    line([.41,.26],[.31,.16]), line([.59,.26],[.69,.16]),
    line([.41,.67],[.32,.78]), line([.45,.72],[.40,.88]), line([.55,.72],[.61,.88]), line([.59,.67],[.70,.78]),
  ]),
  // か → かまきり : triangular face and unmistakable hooked forelegs.
  doodle('mantis', 'かまきり', 'safe', [
    line([.34,.22],[.66,.22],[.50,.43],[.34,.22]),
    dot(.41,.27), dot(.60,.27),
    line([.42,.22],[.31,.12]), line([.58,.22],[.69,.12]),
    line([.49,.42],[.52,.67],[.47,.86]), ellipse(.50,.72,.11,.18),
    line([.46,.47],[.28,.42],[.21,.28],[.32,.33],[.34,.40],[.30,.47]),
    line([.55,.47],[.73,.42],[.80,.28],[.69,.33],[.67,.40],[.71,.47]),
    line([.46,.67],[.29,.70],[.17,.82]), line([.55,.67],[.73,.70],[.83,.82]),
    line([.47,.77],[.37,.89]), line([.54,.77],[.63,.89]),
  ]),
  // く → くわがた : two oversized forked mandibles on a squat beetle.
  doodle('stag-beetle', 'くわがた', 'safe', [
    ellipse(.50,.60,.21,.24), ellipse(.50,.37,.16,.12),
    line([.38,.29],[.28,.23],[.23,.10],[.36,.18],[.42,.34]),
    line([.62,.29],[.72,.23],[.77,.10],[.64,.18],[.58,.34]),
    line([.50,.47],[.50,.82]), line([.31,.48],[.18,.43],[.13,.32]),
    line([.30,.57],[.15,.60],[.12,.70]), line([.33,.68],[.20,.79],[.20,.88]),
    line([.69,.48],[.82,.43],[.87,.32]), line([.70,.57],[.85,.60],[.88,.70]),
    line([.67,.68],[.80,.79],[.80,.88]), dot(.44,.37,.017), dot(.56,.37,.017),
  ]),
  // さ → さそり : two pincers, curved upstretched tail and sting.
  doodle('scorpion', 'さそり', 'safe', [
    ellipse(.50,.56,.20,.15), ellipse(.48,.78,.13,.11),
    line([.40,.53],[.23,.39],[.17,.22]), line([.23,.39],[.13,.40],[.10,.31]),
    line([.60,.53],[.77,.39],[.83,.22]), line([.77,.39],[.87,.40],[.90,.31]),
    line([.40,.62],[.24,.72],[.19,.83]), line([.48,.65],[.36,.75],[.34,.88]),
    line([.60,.62],[.75,.72],[.81,.83]), line([.52,.65],[.65,.75],[.67,.88]),
    line([.59,.75],[.70,.71],[.80,.58],[.84,.42],[.81,.30],[.73,.25],[.68,.29]),
    line([.68,.29],[.78,.20],[.83,.27],[.80,.32]),
    dot(.44,.52,.016), dot(.55,.52,.016),
  ]),
  // な → ながぐつ : tall boot and sole clearly differentiated.
  doodle('rainboot', 'ながぐつ', 'safe', [
    line([.34,.17],[.57,.17],[.57,.61],[.72,.65],[.79,.75],[.78,.84],
      [.17,.84],[.17,.75],[.30,.68],[.32,.59],[.34,.17]),
    line([.18,.76],[.78,.76]), line([.34,.23],[.55,.23]),
    line([.27,.69],[.29,.77]), line([.58,.63],[.58,.76]),
  ]),
  // ね → ねぎ : split leafy shoots and a long white scallion stalk.
  // Similar to other scallion/onion greens, so SOFT.
  doodle('negi', 'ねぎ', 'soft', [
    line([.47,.85],[.44,.47],[.26,.20]), line([.53,.85],[.56,.45],[.72,.16]),
    line([.51,.57],[.53,.18]), line([.47,.59],[.34,.31]),
    line([.55,.55],[.67,.33]),
    line([.46,.59],[.44,.83],[.48,.89],[.55,.90],[.57,.83],[.55,.57]),
    line([.48,.89],[.43,.95]), line([.51,.90],[.51,.96]), line([.55,.88],[.61,.95]),
  ]),
  // す → すずめ : round bird, cheek patch, wings; confusable with generic bird.
  doodle('sparrow', 'すずめ', 'soft', [
    ellipse(.49,.56,.25,.23), ellipse(.62,.37,.145,.145),
    line([.72,.34],[.83,.38],[.72,.43]), dot(.66,.32,.018),
    ellipse(.41,.54,.15,.105), line([.37,.48],[.45,.62],[.53,.54]),
    line([.27,.61],[.13,.57],[.18,.71],[.33,.69]),
    line([.47,.77],[.46,.88],[.37,.90]), line([.59,.76],[.60,.88],[.69,.90]),
    line([.51,.29],[.59,.23],[.68,.25]), line([.58,.45],[.67,.49]),
  ]),
  // ま → まつぼっくり : layered diamond scales with a tiny twig.
  doodle('pinecone', 'まつぼっくり', 'soft', [
    line([.50,.14],[.43,.20],[.32,.36],[.27,.53],[.32,.70],[.49,.88],
      [.67,.72],[.73,.53],[.67,.36],[.56,.20],[.50,.14]),
    line([.49,.88],[.49,.94]), line([.44,.24],[.55,.24]),
    line([.38,.35],[.49,.43],[.63,.35]),
    line([.30,.52],[.43,.60],[.55,.52],[.68,.60]),
    line([.35,.68],[.50,.76],[.64,.68]),
    line([.50,.23],[.39,.38],[.51,.52],[.38,.65],[.50,.77]),
    line([.50,.23],[.61,.39],[.49,.52],[.63,.65],[.50,.77]),
  ]),
  // あ → あさがお : trumpet-shaped corolla and curling vine/heart leaf.
  doodle('morning-glory', 'あさがお', 'soft', [
    line([.50,.26],[.38,.15],[.22,.22],[.20,.40],[.30,.55],[.49,.62],
      [.69,.55],[.80,.40],[.77,.22],[.62,.15],[.50,.26]),
    line([.50,.26],[.51,.52]), line([.38,.17],[.44,.43],[.50,.52]),
    line([.22,.37],[.42,.48],[.50,.52]), line([.78,.37],[.60,.49],[.50,.52]),
    line([.62,.17],[.56,.43],[.50,.52]),
    line([.50,.62],[.54,.88]), line([.54,.74],[.69,.65],[.78,.72],[.68,.85],[.55,.80]),
    line([.52,.82],[.43,.88],[.33,.81],[.37,.72],[.49,.76]),
    line([.54,.88],[.65,.91],[.69,.85]),
  ]),
];


/** A small, deterministic human-hand wobble. No randomness, colors or glyphs.
 * Each source path keeps its endpoints and topology, but long ruler-straight
 * edges get a little bow and small irregularity at 200px playback scale.
 * This is NOT recognition validation, only a proposed drawing variant.
 */
function shizukuLineFeel(paths: readonly Path[], seed: number): Path[] {
  const clamp = (value: number) => Math.min(.97, Math.max(.03, value));
  return paths.map((path, strokeIndex) => {
    const phase = seed * .173 + strokeIndex * 1.27;
    const affect = (x: number, y: number): Point => [
      clamp(x + .009 * Math.sin(5.5 * y + phase) + .003 * Math.sin(11 * x - phase)),
      clamp(y + .009 * Math.sin(5 * x - phase) + .003 * Math.cos(12 * y + phase)),
    ];
    if (path.length === 1) return [affect(path[0][0], path[0][1])];
    const out: Point[] = [affect(path[0][0], path[0][1])];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const distance = Math.hypot(dx, dy);
      const segments = Math.max(1, Math.ceil(distance / .074));
      for (let j = 1; j <= segments; j++) {
        const fraction = j / segments;
        const bow = j === segments ? 0 : .012 * Math.sin(Math.PI * fraction) *
          Math.sin(phase * 1.4 + i * 1.87);
        const x = a[0] + fraction * dx - (distance ? dy / distance * bow : 0);
        const y = a[1] + fraction * dy + (distance ? dx / distance * bow : 0);
        out.push(affect(x, y));
      }
    }
    return out;
  });
}

/** Tiny object-specific gestures: off-center tufts, tilted cheeks and imperfect
 * details, never universal smiley faces on foods or manufactured objects.
 */
const shyDetails: Readonly<Record<string, readonly Path[]>> = {
  gorilla: [
    line([.43,.14],[.45,.105],[.49,.14],[.52,.10],[.56,.145]),
    line([.45,.49],[.49,.515],[.54,.497]),
  ],
  turtle: [line([.85,.62],[.88,.63],[.895,.60])],
  bat: [line([.47,.555],[.505,.58],[.539,.55])],
  chikuwa: [
    line([.43,.40],[.455,.425]), line([.60,.30],[.625,.32]),
  ],
  cicada: [line([.44,.46],[.40,.58]), line([.56,.46],[.60,.575])],
  sparrow: [
    line([.56,.445],[.59,.468]), line([.65,.445],[.685,.461]),
    line([.42,.54],[.46,.585],[.49,.573]),
  ],
  'morning-glory': [
    line([.375,.164],[.40,.19],[.422,.195]),
    line([.693,.17],[.67,.19],[.643,.202]),
  ],
  pineapple: [line([.56,.31],[.58,.29],[.61,.305])],
  'stag-beetle': [line([.50,.47],[.48,.53],[.50,.59])],
};

function polishedClassic(original: GirlSketch, index: number): GirlSketch {
  const id = original.id.replace(/-v01$/, '-v02');
  const name = id.match(/^shizuku-ja-classic-(.+)-v02$/)?.[1] ?? '';
  const raw: Path[] = original.strokes.map(stroke =>
    stroke.points.map(point => [point.x, point.y] as Point));
  const strokes = createTimedStrokes(id,
    shizukuLineFeel([...raw, ...(shyDetails[name] ?? [])], index + 1), 1200);
  return { ...original, id, strokes };
}

/** v0.6.1: candidate Shizuku hand-drawn variant of the 16 classics.
 * Approved legacy pictures and 41 original Japanese doodles remain unchanged.
 */
export const japaneseClassicV02: readonly GirlSketch[] =
  japaneseClassicBefore.map(polishedClassic);

/** Shape corrections, not extra decoration. Keep v02 intact for blind review.
 * Authored vector candidates; SOFT stays SOFT until human review. */
const revisedShapes: Readonly<Record<string, readonly Path[]>> = {
  'ごりら': [
    // Low crown, small ears, heavy shoulders and knuckles; no monkey tail.
    line([.34,.38],[.32,.25],[.39,.15],[.53,.13],[.64,.21],[.67,.38]),
    line([.33,.28],[.28,.27],[.27,.34],[.33,.36]),
    line([.66,.28],[.71,.29],[.70,.36],[.66,.36]),
    line([.35,.29],[.43,.27],[.49,.30],[.56,.27],[.63,.30]),
    dot(.41,.33,.013), dot(.58,.33,.013),
    ellipse(.50,.43,.135,.09), line([.47,.405],[.50,.39],[.54,.41]),
    line([.45,.47],[.51,.48],[.56,.465]),
    line([.33,.39],[.23,.43],[.16,.59],[.13,.79],[.20,.84],[.29,.82],[.33,.61]),
    line([.66,.39],[.77,.45],[.85,.64],[.87,.80],[.80,.85],[.71,.82],[.67,.61]),
    line([.35,.53],[.39,.67],[.58,.69],[.65,.54]),
    line([.33,.68],[.34,.87],[.28,.90],[.44,.91],[.47,.77]),
    line([.55,.77],[.58,.90],[.72,.89],[.66,.85],[.67,.69]),
    line([.18,.78],[.19,.83]), line([.80,.79],[.79,.84]),
  ],
  'ちくわ': [
    // One open cut end, parallel tube edges and a ragged grilled middle band.
    ellipse(.34,.73,.135,.10), ellipse(.34,.73,.054,.041),
    line([.22,.69],[.48,.23],[.54,.19],[.65,.20],[.72,.27],[.46,.77]),
    line([.35,.46],[.39,.48],[.40,.52],[.45,.52],[.49,.57],[.57,.57]),
    line([.43,.32],[.47,.35],[.51,.34],[.54,.39],[.60,.38],[.64,.43]),
    line([.43,.40],[.46,.44]), line([.50,.43],[.53,.47]),
    line([.50,.27],[.53,.24],[.61,.25]),
  ],
  'せみ': [
    // Broad head, eyes at the sides, roof-folded wings instead of butterfly wings.
    line([.34,.28],[.37,.22],[.61,.23],[.66,.30],[.61,.39],[.39,.38],[.34,.28]),
    ellipse(.34,.28,.035,.04), ellipse(.66,.29,.034,.041),
    line([.40,.40],[.38,.52],[.48,.58],[.61,.51],[.60,.40],[.40,.40]),
    line([.39,.43],[.29,.63],[.30,.85],[.38,.88],[.49,.58]),
    line([.61,.43],[.72,.64],[.69,.87],[.61,.89],[.50,.58]),
    line([.43,.67],[.44,.79],[.50,.85],[.57,.79],[.57,.68]),
    line([.44,.73],[.57,.73]), line([.46,.78],[.55,.78]),
    line([.38,.51],[.34,.74],[.38,.70],[.43,.61]),
    line([.62,.52],[.66,.76],[.61,.71],[.57,.62]),
    line([.38,.43],[.26,.39],[.22,.32]), line([.62,.44],[.75,.40],[.79,.34]),
    line([.34,.55],[.23,.56],[.18,.65]), line([.66,.56],[.78,.57],[.82,.65]),
    line([.32,.68],[.24,.74],[.22,.82]), line([.70,.69],[.77,.75],[.79,.82]),
  ],
  'ねぎ': [
    // Long narrow white shaft, hollow pointed leaves, tiny roots; no bulb.
    line([.42,.84],[.44,.51],[.34,.18],[.39,.13],[.49,.44],[.51,.10],[.56,.12],
      [.55,.47],[.69,.17],[.74,.20],[.57,.55],[.54,.85],[.42,.84]),
    line([.45,.56],[.50,.61],[.56,.55]),
    line([.44,.85],[.40,.91]), line([.48,.85],[.48,.94]),
    line([.52,.85],[.57,.92]),
  ],
  'すずめ': [
    // Compact body, short conical beak, cap boundary and one cheek patch.
    line([.24,.60],[.27,.43],[.43,.38],[.47,.26],[.59,.21],[.70,.25],
      [.75,.36],[.71,.49],[.72,.60],[.64,.73],[.47,.78],[.32,.73],[.24,.60]),
    line([.74,.35],[.83,.39],[.74,.43]), dot(.67,.33,.014),
    line([.48,.29],[.55,.32],[.64,.29],[.71,.30]),
    ellipse(.63,.43,.028,.033), line([.60,.48],[.65,.53],[.71,.49]),
    line([.43,.43],[.56,.51],[.53,.65],[.34,.63],[.43,.43]),
    line([.38,.53],[.48,.57]),
    line([.27,.61],[.12,.59],[.16,.71],[.33,.72]),
    line([.44,.77],[.43,.87],[.36,.88]), line([.59,.76],[.61,.86],[.68,.85]),
  ],
  'あさがお': [
    // Side-facing flared trumpet, small throat, winding stem and heart leaf.
    line([.27,.22],[.35,.16],[.54,.17],[.64,.25],[.62,.37],[.52,.44],
      [.34,.42],[.24,.33],[.27,.22]),
    line([.25,.34],[.33,.53],[.47,.63],[.56,.53],[.64,.27]),
    ellipse(.44,.30,.045,.035),
    line([.28,.23],[.40,.28]), line([.55,.19],[.47,.28]),
    line([.59,.37],[.48,.32]), line([.35,.40],[.41,.33]),
    line([.47,.63],[.48,.76],[.45,.87],[.52,.92],[.61,.88],[.60,.82],[.55,.83]),
    line([.48,.75],[.60,.67],[.63,.60],[.72,.62],[.78,.73],[.65,.81],[.60,.67]),
    line([.61,.69],[.73,.73]),
  ],
};

export const japaneseClassicDoodles: readonly GirlSketch[] = japaneseClassicV02.map((sketch, index) => {
  const paths = revisedShapes[sketch.word];
  if (!paths) return sketch;
  const id = sketch.id.replace(/-v02$/, '-v03');
  return { ...sketch, id, strokes: createTimedStrokes(id, shizukuLineFeel(paths, index + 1), 1200) };
});
