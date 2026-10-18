import type { DrawingEntry, Language, Mode, ScoreResult, SessionKind } from '../core/types';
import { drawStrokes } from './strokes';
import { closingLine, interpretation, linkLabel } from './ending';

export interface SouvenirOptions {
  entries: readonly DrawingEntry[];
  score: ScoreResult;
  language: Language;
  mode: Mode;
  sessionKind: SessionKind;
  includeWords: boolean;
}

/** Local pixels only. Never serializes game state, recognition metadata or URLs from a provider. */
export async function createSouvenir({ entries, score, language, mode, sessionKind, includeWords }: SouvenirOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 3000;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const t = (en: string, ja: string) => language === 'ja' ? ja : en;
  const night = mode === 'night', ink = night ? '#f0e6ce' : '#223d43';
  ctx.fillStyle = night ? '#18262f' : '#edf2ef'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink;
  const text = (value: string, x: number, y: number, size = 24, width = 1080) => {
    ctx.font = `${size}px sans-serif`;
    let line = '', row = 0;
    for (const char of value) {
      if (ctx.measureText(line + char).width > width) { ctx.fillText(line, x, y + row * (size + 8)); line = ''; row++; }
      line += char;
    }
    ctx.fillText(line, x, y + row * (size + 8));
  };
  text('DRAWINDOW · TEN LITTLE THOUGHTS', 60, 70, 36);
  text(`${mode.toUpperCase()} · ${t('Five exchanges. One window.', '５往復、ひとつの窓。')}`, 60, 118);
  text(sessionKind === 'demo' ? t('DEMO · simulated interpretations · not score-comparable', 'デモ・解釈はシミュレーション・成績の比較はできません') : !score.comparable || score.knownPairCount < 9 ? t('INCOMPLETE · no official score', '参考記録・公式スコアではありません') : t('Word-chain links; not a measure of shared understanding.', '言葉のつながりは、理解し合えたかの採点ではありません。'), 60, 160, 22);
  entries.slice(0, 10).forEach((entry, i) => {
    const x = 60 + (i % 2) * 560, y = 240 + Math.floor(i / 2) * 460;
    ctx.fillStyle = ink;
    if (i > 0) text(`${String(i).padStart(2, '0')} → ${String(i + 1).padStart(2, '0')} · ${linkLabel(score.links[i - 1], language)}`, x, y - 22, 20, 520);
    ctx.fillStyle = '#f7f8f2'; ctx.fillRect(x, y, 520, 400);
    ctx.fillStyle = '#223d43';
    text(`${String(i + 1).padStart(2, '0')} · ${entry.actor === 'girl' ? t('SHIZUKU', 'しずく') : t('YOU', 'あなた')} · ${entry.round}`, x + 20, y + 32, 20, 480);
    ctx.save(); ctx.translate(x + 145, y + 48); drawStrokes(ctx, entry.strokes, 230, 230); ctx.restore();
    if (includeWords) {
      text(`${entry.actor === 'girl' ? t('She drew', 'しずくの意図') : t('You meant', 'あなたの意図')}: ${entry.intendedWord || t('Unknown', '不明')}`, x + 20, y + 312, 24, 480);
      if (entry.actor === 'player') text(interpretation(entry, language), x + 20, y + 364, 18, 480);
    } else if (entry.actor === 'player' && entry.round === 5) text(interpretation(entry, language), x + 20, y + 330, 18, 480);
  });
  ctx.fillStyle = ink;
  const notes = entries.flatMap((e, i) => e.chainRestart ? [`${String(i + 1).padStart(2, '0')}: ${t('restart after ん', '「ん」で途切れて再開')}`] : e.nonComparableReason === 'uncovered_letter' ? [`${String(i + 1).padStart(2, '0')}: ${t('catalogue unavailable; not a recognition mistake', '次の音の絵がなく再開・認識の誤りではありません')}`] : []);
  if (notes.length) text(notes.join(' / '), 60, 2530, 18);
  // Without words the copy must not disclose anything about the hidden interpretations either.
  text(includeWords ? closingLine(entries, score, language) : t('Ten drawings. A little time together.', '10枚の絵。ふたりで描いた時間。'), 60, 2670, 26);
  text(t('Last picture: not sent for recognition. Unknown links remain unknown.', '最後の絵は認識していません。不明のつながりは不明のままです。'), 60, 2790, 20);
  text('Doodles: Google Quick, Draw! · CC BY 4.0 · DRAWINDOW originals & your drawings.', 60, 2860, 18);
  text('Source: github.com/googlecreativelab/quickdraw-dataset · Layout/scale adapted.', 60, 2900, 18);
  text('License: creativecommons.org/licenses/by/4.0/ · DRAWINDOW / madowaku', 60, 2940, 18);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}
