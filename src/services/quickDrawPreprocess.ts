import type { Stroke } from '../core/types';

/**
 * Browser-independent QuickDraw bitmap preprocessing.
 * QuickDraw uses white=1, black=0, 28×28×1, not RGB. Fit the drawing
 * without stretching its aspect ratio, center it and antialias strokes.
 */
const SIDE = 28, HI = 4, LARGE = SIDE * HI;
const MAX_POINTS = 16000;

export function preprocessQuickDraw(strokes: readonly Stroke[]): Float32Array | null {
  if (!Array.isArray(strokes) || !strokes.length || strokes.length > 256) return null;
  let count = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const stroke of strokes) {
    if (!Array.isArray(stroke?.points)) return null;
    for (const point of stroke.points) {
      if (++count > MAX_POINTS || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
          point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    }
  }
  if (count < 2) return null;
  const span = Math.max(maxX - minX, maxY - minY);
  if (span < .015) return null; // Dot and near-empty/accidental input.
  const scale = (SIDE - 5) * HI / span;
  const originX = (LARGE - (maxX - minX) * scale) / 2;
  const originY = (LARGE - (maxY - minY) * scale) / 2;
  const bits = new Uint8Array(LARGE * LARGE);
  const mark = (x: number,y: number) => {
    const cx = Math.round(x), cy = Math.round(y);
    for (let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++) {
      if(dx*dx+dy*dy>16)continue;
      const xx=cx+dx, yy=cy+dy;
      if(xx>=0&&xx<LARGE&&yy>=0&&yy<LARGE) bits[yy*LARGE+xx]=1;
    }
  };
  for (const stroke of strokes) {
    let previous: {x:number;y:number}|null=null;
    for (const point of stroke.points) {
      const current={x:originX+(point.x-minX)*scale,y:originY+(point.y-minY)*scale};
      if(previous) {
        const distance = Math.hypot(current.x-previous.x,current.y-previous.y);
        const steps = Math.max(1,Math.ceil(distance/1.5));
        for(let k=0;k<=steps;k++)mark(previous.x+(current.x-previous.x)*k/steps,previous.y+(current.y-previous.y)*k/steps);
      } else mark(current.x,current.y);
      previous=current;
    }
  }
  const output=new Float32Array(SIDE*SIDE);
  for(let y=0;y<SIDE;y++)for(let x=0;x<SIDE;x++) {
    let black=0;
    for(let yy=0;yy<HI;yy++)for(let xx=0;xx<HI;xx++)black+=bits[(y*HI+yy)*LARGE+(x*HI+xx)];
    output[y*SIDE+x]=1-black/(HI*HI);
  }
  return output;
}
