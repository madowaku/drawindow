# DRAWINDOW NIGHT v0.9.1 — 窓越しのしずく

## 採用判断

B案「やさしい窓の縁」を採用。本編の曇り75%、タイトル22%、パジャマ7ポーズは維持。
描いた部分から見える肌・髪・部屋の暖色が、茶色い太い筆跡の主な正体だった。
水滴の縁だけを消しても、この暖色は残る（下記reveal画像）。人物の色を変えたり霧を弱めたりせず、外周の白い輪郭と暗い縁の存在感だけを下げた。

| NIGHT表示パラメータ | A / 02c56c0 | 採用B |
|---|---:|---:|
| 基底の霧アルファ | 0.75 | 0.75 |
| タイトルの霧アルファ | 0.22 | 0.22 |
| 透明中心の幅係数 | 2.1 | 2.1 |
| 外側の拭き取り幅・不透明度 | 3.0/0.18、2.55/0.42 | 同一 |
| 暗い水滴の縁の幅係数 | 2.72 | 2.55 |
| 暗い縁のアルファ | 0.26 | 0.19 |
| 白いハイライトの幅係数 | 2.50 | 2.40 |
| ハイライトのアルファ | 0.64 | 0.48 |

暗い縁のアルファは約27%、白い縁は25%低減。細くした効果も含む水滴レイヤー全体のアルファ総量は、今回の筆跡で約37〜43%低減した。この総量は人間の知覚的な強さの割合ではない。
拡大比較では目の上下の白い輪郭が控えめになり、三日月の下端の白い縁も人物を遮りにくい。390pxでも拭き取った輪郭は追えるため、このBを採用した。透明領域から見える人物の鮮明さ自体は同一。

## 比較画像と方法

- [顔に一筆・拡大A/B](../artifacts/qa/night-v091/eyes-AB.png)
- [1280px：未描画／一筆／三日月／複数線A/B](../artifacts/qa/night-v091/1280-AB.png)
- [390px：同じ4状態A/B](../artifacts/qa/night-v091/390-AB.png)
- [1280px：A／B／縁なしreveal](../artifacts/qa/night-v091/1280-layers.png)
- [390px：A／B／縁なしreveal](../artifacts/qa/night-v091/390-layers.png)
- [夜タイトル](../artifacts/qa/night-v091/390-B-title.png)
- [水滴だけ・A](../artifacts/qa/night-v091/1280-A-wet-layer.png) / [B](../artifacts/qa/night-v091/1280-B-wet-layer.png)（透明PNG）
- [画素検証レポート](../artifacts/qa/night-v091/visual-report.json)

`qa-night-visual.mjs` はローカルの実ゲームに合成ポインターを入力し、実際に保存された筆跡を使う。
Aの関数は `git show 02c56c0:src/lib/glass.ts` から読み込む。同一の立ち絵・霧・筆跡の上で、水滴キャンバスだけをA/B/空へ描き替えて撮影する。
衣装や背景を別画像に置き換えた合成モックではない。比較時は動きの軽減を有効にして姿勢を固定した。

8ケースで、DAYの水滴レイヤーがA/B画素一致、NIGHTの拭き取り領域が画素一致、認識用PNGが不変、A/Bの霧が不変、CLEAR→UNDO→REDOの霧が画素一致。
タイトルと未描画のA/Bスクリーンショットも一致した。

## 回帰・配布確認

- 最新main `5dd44f3`（PR #34のマージ）を、履歴を書き換えず `c93a52c` で取り込み。競合・製品コードの差はなし。
- Vitest：66ファイル415テスト成功。
- `node --test scripts/offline-integrity.test.mjs`：14件成功。
- `npm run build`：型検査・本番ビルド成功。既存の500kB超チャンク警告は残る。
- [DEMO通し検証](../artifacts/qa/night-v091/journeys/after.json)：日英×昼夜、1280×800／390×844、通常／動き軽減、各5往復、10枚・9リンク、1200×3000 PNGのダウンロード成功。描画を保存してページを再読み込みし、再開後も5往復を完了。ページエラー・外部通信なし。
- [配布版オフライン検証](../artifacts/qa/night-v091/offline-browser-cold-start.json)：ネットワーク無効で再起動、55資源をキャッシュ、8,851,924バイトの実モデルと345ラベル、音声4曲デコード。実ローカル推論で日英×昼夜各5往復、10枚・9リンク・1200×3000 PNG成功。外部通信・POSTなし。
- [保存再開検証](../artifacts/qa/night-v091/offline-session-resume.json)：ブラウザプロセス終了→オフライン再開で、NIGHTの描画・CLEAR履歴・UNDO/REDO・命名途中入力を復元。中断した推論を勝手に再実行せず、未知の保存形式も安全に拒否。
- 既定の4173番ポートは別プロセスが使用中だった。QAにポート指定と配布フィンガープリントの確認を加え、4273で成功。製品コードの問題ではない。

再実行例（ローカルNode 24＋既存Playwright環境）：

```powershell
$env:DRAWINDOW_QA_OUTPUT='artifacts/qa/night-v091'
node scripts/qa-night-visual.mjs
$env:DRAWINDOW_QA_OUTPUT='artifacts/qa/night-v091/journeys'
node scripts/qa-night-presence.mjs
node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=2
node --test scripts/offline-integrity.test.mjs
npm run package:offline
$env:DRAWINDOW_OFFLINE_QA_PORT='4273'
node scripts/qa-offline-cold-start.mjs
node scripts/qa-session-resume.mjs
```

`DRAWINDOW_QA_URL` はローカル開発URLを指定可能。視覚比較には02c56c0を含むGit履歴が必要。
認識・推論入力・座標・履歴・保存・記念PNG生成の実装は変更していない。バージョン表記のみ0.9.1へ更新。

## itch.io手動更新

配布物は `artifacts/release/DRAWINDOW-v0.9.1-offline-itch.zip`。
モデル・CPU WASM・ローカルフォント・音声・夜7ポーズを同梱し、56項目の展開バイト一致と配布スキャンを検証。API宛先は含めない。
マージ後の最終ZIPのSHA256・Gitコミットは同フォルダの `NIGHT-v0.9.1-release.json` に記録する。

1. 既存itch.ioページの編集画面を開く。
2. HTMLゲーム用アップロードに上記ZIPを追加し、「ブラウザでプレイするファイル」に指定。
3. 旧アップロードの保存・置換、埋め込みサイズなどは現在のページ設定に合わせる。ZIP内のルートにindex.htmlがある。
4. 下書きプレビューでNIGHT、手描き、CLEAR/UNDO/REDO、音声、日英、5往復とPNG保存を確認してページを保存する。

既存itch.ioページは自動更新しない。itch.ioのiframe内でのService Worker・オフライン再起動はローカルlocalhostの検証とは別。初回キャッシュ完了前の通信断・file://起動を保証するものではない。

## 人間の手描きで残る確認

自動DEMO・合成円を使った実モデル検証と、人間の評価は別。
スマホ実機で、顔を横切る短い線の喜び、三日月の手描き判読性、複数線の重なり、指で目元が隠れる感覚、暗い画面・明るい画面での縁の見え方、itch.io埋め込みでの保存・音声を確認する。
本人の手描きの楽しさや認識精度が検証済みとはしない。

旧ドキュメント `NIGHT_PAJAMAS_20261026.md` の不透明霧の説明、`NIGHT_PRESENCE_20261027.md` の水滴パラメータは各導入時の記録。本件はユーザーの最終視覚調整依頼を採用し、現状は本書のBを参照する。
