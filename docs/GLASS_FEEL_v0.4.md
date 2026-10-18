# DRAWINDOW v0.4 — 曇りガラスの描き味

2026-10-18 JST / ローカルレビュー。Issue #3。公開・push・mainマージなし。

上記はローカルレビュー完了時点の記録。後続の本人の依頼に基づくmainへの
ソース統合は別途行う。Owl・しずく候補の本編採用と公開デプロイは含まない。

## 実装

Canvas2Dの曇りと `destination-out` を継続使用。通常ゲームの既定を
`tactile` に変更し、透明な拭き筋、柔らかな消去の縁、細い水分の反射を重ねた。
描画Canvasの筋中央も完全に透明で、黒いペン線は描かない。
DAYの白い袖には細い青灰色の縁、NIGHTの髪には淡い反射の縁を残す。
指を離すまで小さな接触点を入力位置に表示し、離す／capture喪失で即座に消す。
2本目のpointerが最初の指のcaptureを奪わないようにした。

旧 `legacy` は従来の曇り濃度、消去幅、暗い線＋明るい縁の描画を維持。
`/?glass-preview` は同じ正規化筆跡を両方へ表示し、どちらからも描ける。
DAY/NIGHT、再生、動きを減らす、CLEAR/UNDOを比較できる。開発ビルド専用。

Strokeの座標・時刻・圧力・認識用画像は変更していない。
`src/lib/strokes.ts` の512×512白地黒線exportは従来どおり。
女の子の再生と接触点は同じ補間位置を使い、人物全体を線に追従させない。
5往復、認識4回、第5手の認識省略、10枚9リンク、結果までの秘密は従来どおり。

## 比較画面

- [DAY 新旧](../artifacts/qa/v04/1280-day-comparison.png)
- [NIGHT 新旧](../artifacts/qa/v04/1280-night-comparison.png)
- [360幅 DAY](../artifacts/qa/v04/360-day-comparison.png)
- [360幅 NIGHT](../artifacts/qa/v04/360-night-comparison.png)
- 通常ゲーム：[DAY](../artifacts/qa/v04/360-day-holding.png) /
  [NIGHT](../artifacts/qa/v04/360-night-holding.png)

制作側の画面観察：新方式では筋を横切る髪・肌・服・窓の色がそのまま見える。
旧方式は均一な暗い線に見える。NIGHTの暗い髪では薄い反射の縁が形を支え、
DAYの明るい袖・顔上は筋そのもののコントラストが弱くなるため下側の水分の縁を補った。
これは画面上の可視性の観察であり、初見の人が絵を正しく読める証拠ではない。
本人から「Bが好みだが線をもう少し見やすくしたい」と回答あり。
Androidでの遅延・手触り・長時間の快適さと、以下の縁調整後の主観評価は未確認。

### 本人の回答後の視認性調整

拭き筋の中央の透明幅（1.8）と曇りの消去は変更せず、周囲の水分の縁だけ調整。
外側の薄い青灰色の縁を少し広げ、DAYでは白い袖・肌に対する濃さを上げた。
反対側の細い明るい反射も強め、NIGHTの髪上で輪郭を追いやすくした。
中央へ暗い線を塗り戻してはいない。認識画像・筆跡・ゲームルールは変更なし。
[Bの調整前／調整後](../artifacts/qa/v04/glass-contrast-refinement.png)。
143テスト、build、packageと6画面の入力・透明度チェックを再実行してPASS。
更新したZIPでも360幅のDAY/NIGHTで各5往復を完走した。
追加調整後の本編画面は [DAY](../artifacts/qa/v04/package/360-day-holding.png) /
[NIGHT](../artifacts/qa/v04/package/360-night-holding.png)。

## 検証

- 開始時：既存ゲーム **134/134** PASS。認証はsandboxでPowerShellの
  `AuthorizationManager / UnauthorizedAccess` が1件発生したため、同じテストを
  制限外で再実行して **6/6** PASS。テストの内容・認証コードは変更していない。
- 完了時：ゲーム **143/143**、認証 **6/6**、型検査・build・packageがPASS。
- 360×800（DPR2）、720×1280、1280×720 × DAY/NIGHT：通常モーションで
  DEMO 5往復を6経路完走。毎回10枚9リンク、途中の語やscore漏れなし、5回再曇り。
- `qa-v04.mjs`：A/B6画面、中央fog alpha=0／wet edge canvas alpha=0、
  外側fog alpha=255、neutral exportのバイト一致。鼠・疑似touch・tap dot・keyboard、
  CLEAR/UNDO、保持、接触点の出現と解除、横はみ出しを検査。
- reduced motionとhidden tabの停止／再開は既存テストを維持。
- ブラウザー証拠：[通常ゲーム](../artifacts/qa/v04/browser-journeys.json) /
  [ガラス・画素](../artifacts/qa/v04/v04-checks.json)。
- v0.4 ZIPは別名で作成、全44エントリーの展開バイト一致。展開版の360幅でも
  DAY/NIGHTの5往復を完走：[ZIPブラウザー](../artifacts/qa/v04/package/browser-journeys.json)。
- バックアップ231ファイル全てのハッシュ一致と認識export不変を
  [保全検査](../artifacts/qa/v04/preservation-checks.json) に記録。
- Vite設定の再起動中に1回ブラウザー検証がタイムアウトした。再起動後に該当する
  720/1280幅を再実行し、最終6経路全てPASS。未解決の失敗としては残っていない。
- 再実行：`npm test`、`npm run test:auth`、`npm run build`、
  `npm run package:itch`。ブラウザー用3スクリプトは既存と同じ
  `DRAWINDOW_PLAYWRIGHT_MODULE` / `DRAWINDOW_BROWSER_EXECUTABLE` を使用する。

今回の新規Gemini呼出しは0回。過去の本人によるDAY LIVE、4回の実認識と
8/9の記録は [既存報告](LIVE_5_EXCHANGE_ACCEPTANCE_v0.1.md) を変更せず保持した。
DEMO・模擬入力・自動テストを新たな実認識の証拠には数えない。

## 保全とAndroid確認

開始時HEADは `38147bb321fc03cc1ecced3505d2083e117815d0`、ブランチは
`codex/shizuku-v03`。開始時の追跡＋未追跡231ファイルを
`artifacts/local/pre-v04-2026-10-18T03-27-59-376Z/` に保管した。
`working-tree.zip`、全ファイルのSHA-256一覧、binary patch、status、
全refを含む `repository.bundle` がある。保管場所はGit除外。
ZIP SHA-256: `b3c7a5b0efc04cb9789582d1e50fae36fa69c0cabdfebfe22e734e302a6bd45a`。
元のv0.3 ZIP、キャラクターとBGMは保持し、新パッケージはv0.4別名。

同じWi-FiのAndroidで `http://192.168.0.9:5173/?glass-preview` を開く。
ゲームは `http://192.168.0.9:5173/`。PCのViteを起動したままにする。
IPは再接続で変わるため、再起動時は `npm run dev` のNetwork URLを確認。
ローカルLAN用であり公開デプロイではない。秘密ファイルと保全フォルダーは
Vite側でHTTP配信を拒否する。ファイアウォール設定は変更していない。
LANのゲームURLはHTTP200、`.dev.vars` と保全ZIPへのHTTPアクセスは403を確認。

A401OPで確認する内容：DAY/NIGHTで髪・頬・白い袖を横切る線、指の接触位置、
画面端までの連続線、指を離した後の保持、UNDO/CLEAR、縦横回転、5往復の疲労感。
実機結果は未取得。縁調整後の好み、しずくの採用承認、3〜5人のOwl判読性も別ゲート。
