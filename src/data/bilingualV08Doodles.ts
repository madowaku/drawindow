import type { GirlSketch, Language } from '../core/types';
import { createTimedStrokes } from '../lib/playback';

type Point = readonly [number, number];
type Path = readonly Point[];
type Entry = { id: string; ja: string; en: string; readability: 'safe' | 'soft'; paths: readonly Path[] };
const line = (...points: Point[]): Path => points;
const oval = (x: number, y: number, rx: number, ry: number): Path =>
  Array.from({ length: 21 }, (_, i): Point => {
    const a = i * Math.PI / 10, wobble = 1 + .025 * Math.sin(a * 3 + x * 7);
    return [x + Math.cos(a) * rx * wobble, y + Math.sin(a) * ry * wobble];
  });

/** Hand-authored monochrome v0.8 review candidates. No written hints.
 * Readability is a provisional maker judgement, not measured recognition. */
const entries: readonly Entry[] = [
  { id: 'ladybug', ja: 'てんとうむし', en: 'ladybug', readability: 'safe', paths: [
    oval(.50,.54,.27,.30), oval(.50,.26,.13,.11),
    line([.50,.31],[.50,.84]), oval(.40,.47,.047,.049), oval(.63,.49,.048,.055),
    oval(.40,.66,.050,.049), oval(.63,.69,.047,.049),
    line([.36,.29],[.28,.19]), line([.64,.29],[.72,.19]),
    line([.25,.48],[.13,.40]), line([.25,.61],[.13,.65]),
    line([.75,.48],[.87,.40]), line([.75,.61],[.87,.66]),
  ] },
  { id: 'dandelion', ja: 'たんぽぽ', en: 'dandelion', readability: 'soft', paths: [
    oval(.50,.34,.15,.14),
    line([.48,.15],[.47,.10]), line([.61,.22],[.67,.17]), line([.65,.34],[.73,.34]),
    line([.61,.45],[.67,.52]), line([.49,.48],[.50,.55]), line([.37,.43],[.31,.49]),
    line([.35,.32],[.27,.31]), line([.40,.22],[.35,.16]),
    line([.50,.49],[.50,.89]),
    line([.49,.70],[.38,.61],[.28,.67],[.37,.76],[.49,.75]),
    line([.51,.71],[.65,.61],[.74,.67],[.63,.77],[.51,.77]),
  ] },
  { id: 'swing', ja: 'ぶらんこ', en: 'swing', readability: 'safe', paths: [
    line([.23,.86],[.38,.16],[.65,.16],[.79,.86]),
    line([.38,.16],[.65,.16]), line([.39,.20],[.40,.63]), line([.64,.20],[.64,.63]),
    line([.34,.64],[.69,.64],[.66,.71],[.37,.71],[.34,.64]),
    line([.18,.86],[.28,.86]), line([.74,.86],[.84,.86]),
  ] },
  { id: 'lamp', ja: 'らんぷ', en: 'lamp', readability: 'safe', paths: [
    line([.40,.20],[.65,.19],[.76,.43],[.28,.44],[.40,.20]),
    line([.51,.44],[.51,.75]), line([.37,.78],[.64,.77]),
    line([.35,.84],[.68,.84]), line([.34,.78],[.34,.84]),
    line([.66,.78],[.68,.84]), line([.48,.16],[.53,.16]),
  ] },
  { id: 'ghost', ja: 'おばけ', en: 'ghost', readability: 'safe', paths: [
    line([.25,.81],[.26,.43],[.32,.29],[.42,.20],[.56,.19],[.68,.26],
      [.75,.40],[.77,.80],[.67,.73],[.58,.83],[.49,.75],[.38,.85],[.25,.81]),
    oval(.42,.46,.020,.027), oval(.60,.46,.022,.025), oval(.51,.58,.042,.055),
  ] },
  { id: 'telescope', ja: 'ぼうえんきょう', en: 'telescope', readability: 'safe', paths: [
    line([.27,.40],[.72,.21],[.78,.36],[.34,.56],[.27,.40]),
    line([.27,.40],[.20,.44],[.27,.59],[.34,.56]), line([.67,.23],[.74,.39]),
    oval(.28,.49,.065,.10), line([.45,.52],[.51,.59]),
    line([.51,.59],[.29,.86]), line([.51,.59],[.72,.86]), line([.51,.59],[.51,.88]),
  ] },
  { id: 'bicycle', ja: 'じてんしゃ', en: 'bicycle', readability: 'safe', paths: [
    oval(.25,.71,.16,.16), oval(.77,.71,.16,.16),
    line([.25,.71],[.40,.45],[.56,.70],[.25,.71]),
    line([.40,.45],[.67,.45],[.77,.71],[.56,.70],[.67,.45]),
    line([.40,.45],[.37,.38],[.29,.38]), line([.66,.46],[.68,.34],[.76,.34]),
    line([.56,.70],[.55,.78],[.61,.79]),
  ] },
  { id: 'window', ja: 'まど', en: 'window', readability: 'safe', paths: [
    line([.22,.17],[.79,.17],[.79,.83],[.22,.83],[.22,.17]),
    line([.50,.18],[.50,.81]), line([.24,.50],[.77,.50]),
    line([.18,.85],[.83,.85]), line([.23,.14],[.77,.14]),
  ] },
  { id: 'snail', ja: 'かたつむり', en: 'snail', readability: 'safe', paths: [
    oval(.45,.53,.26,.24),
    line([.50,.57],[.56,.49],[.53,.41],[.43,.39],[.37,.47],
      [.39,.57],[.47,.61],[.53,.56]),
    line([.18,.66],[.16,.78],[.28,.83],[.69,.82],[.83,.77],[.85,.62]),
    line([.71,.67],[.72,.37],[.70,.28]), line([.82,.67],[.83,.37],[.85,.28]),
    oval(.70,.26,.030,.030), oval(.85,.26,.031,.030),
  ] },
];
export const bilingualV08Words = entries.map(({ ja, en }) => ({ ja, en }));
export function getBilingualV08Doodles(language: Language): GirlSketch[] {
  return entries.map(entry => {
    const id = `shizuku-bi-${entry.id}-v01`;
    return { id, word: entry[language], readability: entry.readability,
      durationMs: 1200, strokes: createTimedStrokes(id, entry.paths, 1200) };
  });
}
