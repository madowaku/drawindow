import type { DoodleCandidate, DoodleReadability } from '../core/types';
import { legacyGirlSketches } from './legacySketches';
import { originalDoodles } from './originalDoodles';
import { owlCandidate } from './owlReview';

export const DOODLE_LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
export const PRIORITY_LETTERS = ['O', 'Q', 'X', 'Y', 'U', 'V', 'G', 'K', 'N', 'P', 'W'];
const legacyReviews: Record<string, readonly [DoodleReadability, string]> = {
  owl: ['spicy', '現行の丸い顔と空の両目だけでは体・足が読めない。既知の読み違いがあり、保持するが自動選択から外す。'],
  queen: ['soft', '冠は読めるが queen / princess / king の区別が曖昧。QにSAFEがない場合の補欠。'],
  xylophone: ['reject', '旧案は箱・柵に見え、音板の長さや丸頭のばちが読み取れない。履歴用に保持しゲームでは使わない。'],
  yarn: ['spicy', '渦と丸い外周だけで ball / shell と混同しやすい。制作レビュー専用。'],
  nose: ['spicy', '鼻孔まわりの重なりが抽象的。新しいN候補と比較し採用を保留。'],
  dog: ['soft', '縦長の耳に依存し、目・鼻が小さい。制作レビューの重点対象。'],
  guitar: ['soft', '細い弦やネックの手掛かりが小さい。大きな房・箱のG候補を優先。'],
};

const legacy: DoodleCandidate[] = legacyGirlSketches.map(sketch => {
  const [readability, reviewNote] = legacyReviews[sketch.word] ?? ['safe', '既存の形を保持。SAFEは制作側の暫定評価で、初見正答率の実測値ではない。'];
  return { ...sketch, letter: sketch.word[0].toUpperCase(), readability, reviewNote,
    source: { kind: sketch.id.startsWith('qd-') ? 'quick-draw' : 'original',
      attribution: sketch.id.startsWith('qd-') ? 'The Quick, Draw! Dataset / Google Creative Lab / CC BY 4.0' : 'Original DRAWINDOW v0.2 vectors',
      reference: 'src/data/sketch-provenance.json' } };
});
const owlReview: DoodleCandidate = { ...owlCandidate, letter: 'O', readability: 'soft',
  source: { kind: 'original', attribution: 'Original DRAWINDOW v0.4 owl review candidate', reference: 'assets/readability-v04-manifest.json' },
  reviewNote: '胴・足・止まり木を加えた既存の改善案。初見の3〜5人による比較は未完了。SAFEへの昇格・現行絵の削除は保留。' };

/** Canonical letter -> candidate[] library, including non-playable review items. */
export const doodleLibrary: Readonly<Record<string, readonly DoodleCandidate[]>> = Object.freeze(
  Object.fromEntries(DOODLE_LETTERS.map(letter => [letter, Object.freeze(
    [...legacy, owlReview, ...originalDoodles].filter(candidate => candidate.letter === letter).map(candidate => Object.freeze(candidate)),
  )])),
);
/** Apple stays first; all selection policy lives in selectGirlSketch. */
export const doodleCandidates: readonly DoodleCandidate[] = Object.freeze(Object.values(doodleLibrary).flat());
