import { useState } from 'react';
import type { DrawingEntry, GirlSketch, Language, Mode } from '../core/types';
import { calculateScore } from '../core/score';
import { girlSketches } from '../data/sketches';
import { EndingScene } from '../components/EndingScene';
import { useGameAudio } from '../lib/useGameAudio';
import { localizeGirlSketches } from '../data/japaneseSketches';
import { japaneseExtraSketches } from '../data/japaneseExtraSketches';
import { firstLetter, lastLetter, chainLettersMatch } from '../core/words';

/** Synthetic presentation fixtures, never human play or recognition evidence. Dev-only. */
export function EndingPreview() {
  const query = new URLSearchParams(location.search);
  const language: Language = query.get('lang') === 'ja' ? 'ja' : 'en';
  const mode: Mode = query.get('mode') === 'night' ? 'night' : 'day';
  const scenario = query.get('case') || 'mixed';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [session, setSession] = useState(0);
  const { sound, toggleSound } = useGameAudio('ending');
  const catalogue = [...localizeGirlSketches(girlSketches, language), ...(language === 'ja' ? japaneseExtraSketches : [])];
  const buildPath = (path: GirlSketch[]): GirlSketch[] | null => {
    if (path.length === 10) return path;
    for (const next of catalogue) {
      if (!chainLettersMatch(lastLetter(path.at(-1)!.word, language), firstLetter(next.word, language), language)) continue;
      const complete = buildPath([...path, next]);
      if (complete) return complete;
    }
    return null;
  };
  const pictures = buildPath([catalogue.find(s => s.word === (language === 'ja' ? 'ねこ' : 'apple'))!])!;
  if (scenario === 'restart' && language === 'ja') pictures[1] = catalogue.find(s => s.word === 'らいおん')!;
  const entries: DrawingEntry[] = pictures.map((picture, i) => ({ id: `fixture-${i}`, actor: i % 2 ? 'player' : 'girl', round: Math.floor(i / 2) + 1, intendedWord: scenario === 'unknown' && i % 2 ? null : picture.word, strokes: picture.strokes, recognition: i % 2 && i < 9 ? { guess: scenario === 'mixed' && i === 1 ? language === 'ja' ? 'いぬ' : 'dog' : picture.word, source: scenario === 'demo' ? 'mock' : 'api' } : null, comparable: scenario !== 'demo', ...(scenario === 'restart' && i === 2 ? { chainRestart: true } : {}) }));
  const sessionKind = scenario === 'demo' ? 'demo' : 'api';
  return <main className="app" data-mode={mode} lang={language}>
    <p style={{ paddingTop: 20, margin: 0 }}>SYNTHETIC ENDING PREVIEW · {scenario} · no human/recognition evidence</p>
    <button className="secondary" aria-pressed={sound} onClick={toggleSound}>{language === 'ja' ? sound ? '音を消す' : '音を出す' : sound ? 'Mute sound' : 'Enable sound'}</button>
    <EndingScene key={session} entries={entries} score={calculateScore(entries, sessionKind, language)} mode={mode} language={language} sessionKind={sessionKind} reducedMotion={reducedMotion} onRestart={() => setSession(n => n + 1)} onTitle={() => { location.href = '/'; }} />
  </main>;
}
