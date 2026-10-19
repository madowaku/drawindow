import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DrawingEntry, Language, Mode, ScoreResult, SessionKind } from '../core/types';
import { closingLine, entryNote, interpretation, linkLabel } from '../lib/ending';
import { SketchThumbnail } from './SketchThumbnail';
import { CharacterScene } from './CharacterScene';
import { SouvenirSave } from './SouvenirSave';
import './EndingScene.css';

export interface EndingSceneProps {
  entries: readonly DrawingEntry[];
  score: ScoreResult;
  language: Language;
  mode: Mode;
  sessionKind: SessionKind;
  reducedMotion: boolean;
  onRestart: () => void;
  onTitle: () => void;
}

/** Presentation only. No recognition, scoring mutation or game progression. */
export function EndingScene(props: EndingSceneProps) {
  const { entries, score, language, mode, sessionKind, reducedMotion, onRestart, onTitle } = props;
  const t = (en: string, ja: string) => language === 'ja' ? ja : en;
  const [act, setAct] = useState<'diary' | 'reveal' | 'goodbye'>('diary');
  const [pairs, setPairs] = useState(reducedMotion ? 5 : 1);
  const [links, setLinks] = useState(reducedMotion ? 9 : 1);
  const heading = useRef<HTMLHeadingElement>(null);
  const revealed = act !== 'diary';
  const pairCount = reducedMotion || revealed ? 5 : pairs;
  const linkCount = reducedMotion || act === 'goodbye' ? 9 : links;
  const complete = revealed && linkCount === 9;

  useLayoutEffect(() => { heading.current?.focus({ preventScroll: true }); }, [act]);
  useEffect(() => {
    if (reducedMotion) { setPairs(5); setLinks(9); return; }
    if (act === 'diary' && pairs < 5) {
      const timer = window.setTimeout(() => setPairs(n => n + 1), 1000);
      return () => window.clearTimeout(timer);
    }
    if (act === 'reveal' && links < 9) {
      const timer = window.setTimeout(() => setLinks(n => n + 1), 650);
      return () => window.clearTimeout(timer);
    }
  }, [act, pairs, links, reducedMotion]);

  const skip = () => { setPairs(5); setLinks(9); setAct('reveal'); heading.current?.focus({ preventScroll: true }); };
  const closing = closingLine(entries, score, language);
  return <section className="results-layout ending" data-act={act} data-reduced-motion={reducedMotion} aria-labelledby="ending-title">
    <div className="section-intro ending-intro">
      <p className="eyebrow">TEN LITTLE THOUGHTS · {t(mode === 'day' ? 'DAY' : 'NIGHT', mode === 'day' ? '昼' : '夜')}</p>
      <h1 id="ending-title" tabIndex={-1} ref={heading}>{act === 'diary' ? t('Our little picture diary.', 'ふたりの絵日記。') : act === 'reveal' ? t('Between the lines.', 'すれ違いの答え合わせ。') : t('Until another window.', '窓の向こうの、またね。')}</h1>
      {act !== 'goodbye' && <p>{act === 'diary' ? t('Five exchanges. Your side, her side. Take another look.', 'しずくの絵、あなたの絵。５往復の、ちいさな時間。') : t('A word chain is one thing. Seeing the same picture is another.', '言葉のつながりと、同じものが見えたかは、別のこと。')}</p>}
    </div>
    {sessionKind === 'ml' && <p className="result-disclosure">{t('LOCAL ML — trained on-device QuickDraw recognizer (345 classes). Research result, not an official score.', 'LOCAL ML — 学習済みQuickDrawの端末内認識（345種類）による実験記録です。公式スコアではありません。')}</p>}
    {sessionKind === 'local' && <p className="result-disclosure">{t('LOCAL LAB — real on-device stroke matching, experimental and not accuracy-validated.', 'LOCAL LAB — 端末内で絵の形を照合した実験記録です。認識精度は検証中です。')}</p>}
    {(!score.comparable || score.knownPairCount < 9) && <p className="result-disclosure">{sessionKind === 'demo' ? t('DEMO — simulated interpretations. This result is not score-comparable.', 'デモ — 解釈はシミュレーションです。成績として比較できません。') : t('INCOMPLETE — unknown or non-comparable links. No official best score.', '参考記録 — 不明、または比較できないつながりがあります。公式スコアではありません。')}</p>}
    <div className="ending-controls">
      {!revealed && <button className="primary" onClick={() => setAct('reveal')}>{t('See what we meant', '答え合わせをする')}</button>}
      {(!complete || act === 'reveal') && <button className="secondary" onClick={skip}>{t('Skip animation · see results', 'すぐ見る・答えを開く')}</button>}
      {complete && act !== 'goodbye' && <button className="secondary" onClick={() => setAct('goodbye')}>{t('A little goodbye', '窓の向こうへ、またね')}</button>}
      {act === 'goodbye' && <button className="secondary" onClick={() => setAct('reveal')}>{t('Look at our drawings again', 'もう一度、10枚を眺める')}</button>}
    </div>
    {act === 'goodbye' && <div className="ending-goodbye">
      <div className="ending-window" aria-hidden="true">
        <CharacterScene mode={mode} phase="results" round={5} reducedMotion={reducedMotion} />
        <div className="ending-window-pictures">{entries.map((e, i) => <SketchThumbnail key={e.id} strokes={e.strokes} label={String(i + 1)} />)}</div>
        <div className="ending-refog" />
      </div>
      <blockquote><p lang="en">{closingLine(entries, score, 'en', language)}</p><p lang="ja">{closingLine(entries, score, 'ja', language)}</p></blockquote>
    </div>}
    {revealed && <div className="score-strip"><div><span>{sessionKind === 'demo' ? t('DEMO LINKS', 'デモのつながり') : t('LINK SCORE', '言葉のつながり')}</span><strong>{score.connectedCount}<small> / {score.knownPairCount}</small></strong><p>{t(`${score.knownPairCount} of 9 possible links known`, `９本中${score.knownPairCount}本が判定できた`)}</p></div><div><span>{t('BEST CHAIN', '最長のつながり')}</span><strong>{score.bestChain}<small>{t(' links', ' 本')}</small></strong><p>{t('Consecutive connected links', '連続してつながった数')}</p></div></div>}
    <ol className="ending-diary" aria-label={t('Our drawings in the order we drew them', '描いた順番の10枚')}>
      {entries.slice(0, pairCount * 2).map((entry, index) => <li key={entry.id}>
        {revealed && (index === 0 || index > linkCount) && <div className="ending-link-space" aria-hidden="true" />}
        {revealed && index > 0 && index <= linkCount && <div className={`chain-link ${score.links[index - 1].status}`}>
          <span>{String(index).padStart(2, '0')} → {String(index + 1).padStart(2, '0')} · {linkLabel(score.links[index - 1], language)}</span>
          <span>{score.links[index - 1].status === 'unknown' ? t('An intention was left unnamed', '名前のない絵がある') : `${score.links[index - 1].fromLetter?.toUpperCase()} → ${score.links[index - 1].toLetter?.toUpperCase()}`}</span>
        </div>}
        <div className={`result-drawing actor-${entry.actor}`}>
          <p className="eyebrow">{String(index + 1).padStart(2, '0')} · {entry.actor === 'girl' ? t('SHIZUKU', 'しずく') : t('YOU', 'あなた')}</p>
          <SketchThumbnail strokes={entry.strokes} label={revealed ? `${entry.actor === 'girl' ? t('She drew', 'しずくの絵') : t('You meant', 'あなたの意図')}: ${entry.intendedWord || t('Unknown', '不明')}` : t(`Drawing ${index + 1}`, `${index + 1}枚目の絵`)} />
          {revealed && <div className="ending-meaning"><p>{entry.actor === 'girl' ? t('She drew', 'しずくの意図') : t('You meant', 'あなたの意図')}</p><h2>{entry.intendedWord || t('Unknown', 'わからない')}</h2>{entry.actor === 'player' && <p className="interpretation">{interpretation(entry, language)}</p>}{entryNote(entry, language) && <p className="ending-entry-note">{entryNote(entry, language)}</p>}</div>}
        </div>
      </li>)}
    </ol>
    {complete && <div className="result-end">
      {act !== 'goodbye' && <p className="tagline">{closing}</p>}
      <SouvenirSave {...props} />
      <button className="primary" onClick={onRestart}>{t('ANOTHER WINDOW', 'もう一度遊ぶ')}</button>
      <button className="text-button" onClick={onTitle}>{t('Back to the beginning', '最初に戻る')}</button>
    </div>}
  </section>;
}
