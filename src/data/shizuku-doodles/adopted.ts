import source from './doodles.json';
import type { GirlSketch, Stroke } from '../../core/types';

const hiragana = (word: string) => word.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const adoptedJapaneseLabels = Object.fromEntries(source.doodles.map(d => [d.labelEn, hiragana(d.labelJa)]));

/** Sample the authored M/L/Q paths without browser-only SVG APIs. Each M lifts the finger. */
function sample(path: string): number[][][] {
  const tokens = path.match(/[MLQ]|-?\d+(?:\.\d+)?/g) ?? [];
  if (path.replace(/[MLQ\s,\d.\-]/g, '')) throw new Error('Unsupported doodle path');
  const parts: number[][][] = [];
  let i = 0, x = 0, y = 0;
  while (i < tokens.length) {
    const command = tokens[i++];
    const a = Number(tokens[i++]), b = Number(tokens[i++]);
    if (command === 'M') { parts.push([[a, b]]); x = a; y = b; continue; }
    const endX = command === 'Q' ? Number(tokens[i++]) : a;
    const endY = command === 'Q' ? Number(tokens[i++]) : b;
    if (!['L', 'Q'].includes(command) || !parts.length || ![a,b,endX,endY].every(Number.isFinite)) throw new Error('Invalid doodle path');
    const length = command === 'Q' ? Math.hypot(a-x,b-y)+Math.hypot(endX-a,endY-b) : Math.hypot(endX-x,endY-y);
    const count = Math.max(1, Math.ceil(length));
    for (let j = 1; j <= count; j++) {
      const t = j / count, u = 1-t;
      parts.at(-1)!.push(command === 'Q' ? [u*u*x+2*u*t*a+t*t*endX,u*u*y+2*u*t*b+t*t*endY] : [x+(endX-x)*t,y+(endY-y)*t]);
    }
    x = endX; y = endY;
  }
  return parts;
}

/** Approved art, not an empirical recognition rating. Keep the game's existing 1.2s tempo. */
export const adoptedShizukuSketches: readonly GirlSketch[] = source.doodles.map(doodle => {
  let time = 0;
  const strokes: Stroke[] = [];
  for (const [index, stroke] of doodle.strokes.entries()) {
    const parts = sample(stroke.path);
    const lengths = parts.map(points => points.reduce((sum, p, i) => i ? sum + Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]) : 0, 0));
    const total = lengths.reduce((a,b) => a+b, 0);
    parts.forEach((points, part) => {
      let distance = 0;
      strokes.push({ id: `${doodle.key}-${index}-${part}`, points: points.map((p, i) => {
        if (i) distance += Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1]);
        return { x: p[0]/source.width, y: p[1]/source.height, t: time + stroke.durationMs * distance / total };
      }) });
      time += stroke.durationMs * lengths[part] / total;
    });
    time += 120;
  }
  const last = strokes.at(-1)!.points.at(-1)!.t;
  return { id: `shizuku-style-v01-${doodle.key}`, word: doodle.labelEn, readability: 'safe', durationMs: 1200,
    strokes: strokes.map(stroke => ({ ...stroke, points: stroke.points.map(p => ({ ...p, t: p.t / last * 1200 })) })) };
});

/** Replace all old variants of approved nouns; retain uncovered vocabulary as fallback. */
export function adoptShizukuSketches(existing: readonly GirlSketch[], language: 'en' | 'ja' = 'en'): GirlSketch[] {
  const approved = adoptedShizukuSketches.map(sketch => ({ ...sketch, word: language === 'ja' ? adoptedJapaneseLabels[sketch.word] : sketch.word }));
  const words = new Set(approved.map(sketch => sketch.word));
  return [...approved, ...existing.filter(sketch => !words.has(sketch.word) && !sketch.id.startsWith('shizuku-style-v01-'))];
}
