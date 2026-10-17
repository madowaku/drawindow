import { useState } from 'react';
import type { GamePhase, Mode } from '../core/types';
import type { CharacterFrame } from '../lib/character';
import { CharacterScene } from './CharacterScene';
import './CharacterPreview.css';

const poses: { frame: CharacterFrame; label: string; phase: GamePhase; note: string }[] = [
  { frame:'neutral', label:'NEUTRAL · 通常', phase:'title', note:'こちらを静かに見ている。' },
  { frame:'thinking', label:'THINKING · 考え中', phase:'recognizing', note:'指先を口元へ。相手の絵に、自分なりの意味を探す。' },
  { frame:'smile', label:'SMILE · 微笑み', phase:'girl_holding', note:'描き終わり、控えめにこちらを見る。正解を知らせる笑顔ではない。' },
  { frame:'shy', label:'SHY · 照れ', phase:'girl_holding', note:'視線を下げて、長い袖を握る。' },
  { frame:'breath', label:'BREATH · 吐息', phase:'girl_breath', note:'少し近づいて、窓へ息を吹く。曇りはゲーム側の別レイヤー。' },
  { frame:'curious', label:'CURIOUS · 興味', phase:'player_drawing', note:'少し目を開いて、相手が描く絵に顔を近づける。' },
  { frame:'drawing', label:'DRAWING · 描く', phase:'girl_drawing', note:'指を伸ばし、少し前のめり。ゲームでは始筆の前に一瞬ためらう。' },
];

/** Separate production review surface; never part of the jam game's play UI. */
export function CharacterPreview() {
  const [mode, setMode] = useState<Mode>('day');
  const [selected, setSelected] = useState(0);
  const [motion, setMotion] = useState(false);
  const pose = poses[selected];
  return <main className="app character-preview" data-mode={mode} data-motion={motion}>
    <header className="topbar"><a className="text-button" href={import.meta.env.BASE_URL}>← DRAWINDOW</a><span className="eyebrow">CHARACTER STUDY · v0.2</span></header>
    <section className="character-preview__layout"><div className="character-preview__copy">
      <p className="eyebrow">PRODUCTION PREVIEW</p><h1>しずく / Shizuku</h1>
      <p className="character-preview__tagline">ことばより、絵のほうが少しだけ素直。</p>
      <p>交差する銀色のヘアピン。少し曲がったリボン。<br />長い袖からのぞく指先。</p>
      <div className="mode-picker" role="group" aria-label="Lighting preview">{(['day','night'] as Mode[]).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value.toUpperCase()}</button>)}</div>
      <div className="character-preview__poses" role="group" aria-label="Expression preview">{poses.map((item,index) => <button className="secondary" aria-pressed={selected===index} key={item.frame} onClick={() => setSelected(index)}>{item.label}</button>)}</div>
      <button className="primary" aria-pressed={motion} onClick={() => setMotion(!motion)}>{motion ? '動きを止める' : 'プレビューで動きを試す'}</button>
      <p className="character-preview__note">このページだけで動きを切り替えます。ゲームは端末の「動きを減らす」設定に従います。</p>
      <p className="character-preview__note">ゲーム中には名前を表示しません。表情は正解・不正解に連動しません。</p>
    </div><div><div className="character-preview__window">
      <CharacterScene key={`${pose.frame}-${motion}`} mode={mode} phase={pose.phase} reducedMotion={!motion} frameOverride={pose.frame} />
      <div className="title-art__glass" />
    </div><p className="character-preview__caption" aria-live="polite">{pose.note}</p></div></section>
  </main>;
}
