# DRAWINDOW Freehand Recognition Benchmark v0.1

## 現在の状態

GitHub Issue #1 の、ローカルで人間が12枚を描いて測定する道具です。
**12枚の人間による実測・評価の完了はまだ確認していません。** 自動テストの描画・応答fixtureは人間の実測に含めません。
Geminiの認識品質、LIVEの5往復、実Androidのタッチ、itch.io iframe/CORSの合格は主張しません。

作業ブランチは `codex/shizuku-v03`。開始時点の `38147bb` はIssueの基点 `c640226` より新しく、
背景音楽などの変更を含みます。開始時の作業ツリーはクリーンで、fetch後のリモートとの差分は0/0でした。
開始状態・差分・画像/ソースのSHA-256は、Git対象外の
`.wrangler/benchmark-backup/20261018-start/` に退避しました。
既存のキャラクター、画像、BGM、通常の5往復ルールは保持しています。
この実装でのモデル別サブエージェント委任は行っていません。

## 開き方

1. このフォルダーで `npm run dev:api` と `npm run dev` を別ターミナルで起動します。
   既にポート8787と5173で起動しているなら、そのまま利用できます。
2. **http://localhost:5173/?recognition-benchmark** を開きます。
3. 保存済みの `.dev.vars` のキーをWorkerだけが使用します。キーの再入力は不要です。
   `npm run check:gemini` はキーの値を出さずに存在・形式・Git除外を確認します。
4. 匿名の描き手ID（例 `P01`）と実際の端末種別を選びます。名前やメールアドレスは使いません。
   入力方法（mouse / touch / pen / keyboard）は筆跡を作った実際のイベントから記録します。

Workerの現在の設定は `wrangler.toml` の `gemini-3.5-flash-lite`、許可Originは
`http://localhost:5173` と `http://127.0.0.1:5173` です。
今回、`.dev.vars` にモデル・Originの上書きがないことも、キーの値を表示せず確認しました。
モデル名は応答から計測していないため、出力JSONの `model` は `null` です。
通常のフロントエンドの `VITE_RECOGNITION_URL` にかかわらず、この画面は同一Originの
`/api/recognize` を使用します。公開、デプロイ、プロダクションへのトラフィック変更は行いません。

## 12枚を実際に描く手順

1. `ZERO-STROKE CHECK` を押します。期待値は `invalid_input · API calls: 0`。
   これは12枚とは別のクライアント側検査です。
2. お題を見て、白い正方形にマウス・指・ペンで新しい絵を描きます。
   見本やカタログ絵、自動生成画像、以前の画像の取り込みは使いません。
   絵に単語・答え・指示を書かないでください。
3. `CLEAR` は全消去、`UNDO` は最後のストロークを戻します。
4. `SEND ONCE` を押します。初回はproviderへの1回のリクエストだけです。
   送信後は絵を固定し、返った認識語またはエラー、source、実HTTPステータス、経過msを表示します。
5. 下の定義に沿って納得度を選び、短い理由を書きます。正解を自動で決めません。
6. `NEXT` で次へ進みます。成功・失敗のどちらも評価後に次へ進めます。
   初回結果を確認する前に次の絵へ進めません。
7. 全12枚後、**Export sanitized JSON** と **Export sanitized CSV** を保存します。
   途中でも保存できます。**記録はメモリだけなので、終了・再読み込み前に書き出してください。**

| ID | 描く意図（モデルへ送信しない） | 分類 | 曖昧さ |
|---|---|---|---|
| 01 | apple / りんご | simple | low |
| 02 | cat / ねこ | simple | low |
| 03 | tree / 木 | simple | low |
| 04 | house / 家 | simple | low |
| 05 | fish / 魚 | simple | low |
| 06 | clock / 時計 | simple | low |
| 07 | elephant / ぞう | detail | medium |
| 08 | guitar / ギター | ambiguous | guitar / shovel |
| 09 | umbrella / かさ | ambiguous | umbrella / mushroom |
| 10 | tissue box / ティッシュ箱 | ambiguous | tissue / box。意図は句のまま評価する |
| 11 | mouse (animal) / ねずみ | ambiguous | 動物 / PCデバイス |
| 12 | 何にも見えない、でたらめな手描き線 | hard/negative | 期待値は認識不能またはエラー |

最低1人の12枚で探索的なpilotです。2人目は保存後に新しいセッションを開き、別の匿名IDで描きます。
2人目や再試行を最初の12枚へ混ぜません。

## 評価の定義と失敗時の扱い

- `exact`: 意図した物、または妥当な同義語。
- `plausible_alternative`: 違う名詞だが、線の見え方から納得できる別解。例: ギターがスコップに見える。
- `unrelated`: 返った名詞をその絵から合理的に説明できない。
- `abstain_or_error`: 有効な認識語がない、またはAPI失敗。成功語がある場合には選べません。

Workerのpromptや判定は変更しません。認識不能をWorkerが `502 invalid_response` とする挙動を保持し、
アダプターもそのコードを保持します。`source: api` 以外は有効な認識として採用しません。
DEMOへ自動で切り替えたり、認識語を別の名詞へ言い換えたりしません。
通常ゲームでは引き続き結果画面まで認識語を隠します。

各応答の完了後、次の送信まで最低6秒待ちます。429なら最低60秒、`Retry-After` が長ければそれ以上待ちます。
待ち時間が終わっても自動送信しません。失敗・評価済みの結果はそのまま残します。
必要な場合だけ `MANUAL RETRY` で同じ絵を最大2回再送できます。
初回も含め各試行の評価・理由を記録し、再試行には別のrequest IDを付けます。
再試行は初回集計の分子・分母・時間統計・次の頭文字の集計に含めません。

## 記録・書き出しと集計

各試行: sampleId、匿名ID、端末/実入力方法、意図、分類/曖昧さ、生のストローク点数、
数字3項のrequest ID、guess/errorCode、source、実HTTPステータス（応答未観測ならnull）、
経過ms、送信時刻、納得度、短い理由、PNG寸法/byte数、次の頭文字とテンプレートの有無/ID。
confidenceは生成しません。理由の既知のキー形式は除去し、CSVでは数式開始文字も無効化します。

JSONには初回の集計・混同例の理由・全試行、CSVには全試行を記録します。
画像・生の筆跡・キー・ヘッダー・provider生レスポンスは保存/書き出しません。
ブラウザのlocalStorage/IndexedDBにも記録しません。筆跡は描画中のメモリにのみ保持します。
保存先はユーザーが明示したローカルダウンロードです。リポジトリ内で保存する場合は、
Git除外済みの `artifacts/local/recognition-benchmark/` を使います。
手描き画像のコミットは別途ユーザーの許可が必要です。

- exact / 11、plausible-or-exact / 11（第12題を名詞一致の分母から除外）。
- 初回12件の認識不能・APIエラー件数。未実施件数と評価済み件数も別表示。
- 初回応答時間のmin / median / p90 / max。偶数件のmedianは中央2値の平均、p90はnearest rank。
- 各試行表、理由付きの混同例、画像サイズ/応答エラー、次の頭文字の重複除外とテンプレート対応数。

未評価や途中のセッションは計測途中として表示します。12枚を母集団の精度のように宣伝しません。

## 実装と確認

- `src/Page.tsx`: `import.meta.env.DEV` の条件で遅延ロード。
  productionでは画面とメモリセッション/集計処理をbundleから除外し、同じqueryは通常ゲームへ戻ります。
- `WindowCanvas` のneutral表示で本番のpointer/coalesced event/keyboard/ストローク保持を再利用。
  推論画像は `renderDrawingDataUrl(strokes, 512)` のみで作り、画面やキャラクターのスクリーンショットは使いません。
- `DrawingRecognizer` / `createApiRecognizer` と既存ローカルWorkerを使用。
  outbound JSONは `{requestId, imageDataUrl}` の2項だけです。
- `src/dev/` のテストfixtureはUI/境界確認専用です。人間の12枚の実績ではありません。
- `scripts/qa-recognition-benchmark.mjs`: モック通信でPC/モバイルの操作・出力・エラー・production除外を確認。
  `scripts/qa-v03.mjs`: 通常のDAY/NIGHTと5往復、reduced motionの回帰確認。

確認コマンド:

2026-10-18の最終確認:

- `npm test`: 19ファイル、125テスト通過。
- `npm run test:auth`: 6テスト通過。
- `npm run build`: TypeScriptとVite production build成功。
- 計測UI: 1440×900 / 390×844で描画・UNDO/CLEAR・手動再試行の分離・
  モック結果の拒否・75秒の429待機・JSON/CSV出力が通過。画面の横はみ出し・JS例外なし。
- production bundleに計測モジュールなし。previewで `/?recognition-benchmark` が通常ゲームを表示。
- DEMO: 360×800 / 1280×720、それぞれDAY/NIGHTの5往復、10描画・9リンクの結果表示まで通過。
  reduced motionも通過。ブラウザエラーなし。
- 既存画像・音声・素材manifest等31ファイルのSHA-256に開始時点からの変更なし。
- `git diff --check`: 通過。

```powershell
npm test
npm run test:auth
npm run build

# 環境にあるPlaywrightとChromiumを使う場合のみ指定
$env:DRAWINDOW_PLAYWRIGHT_MODULE = '<Playwright index.mjsの絶対パス>'
$env:DRAWINDOW_BROWSER_EXECUTABLE = '<Chromium実行ファイルの絶対パス>'
# production queryの検査用に別ターミナルで npm run preview -- --port 4173 --strictPort
node scripts/qa-recognition-benchmark.mjs
$env:DRAWINDOW_QA_FOLDER = 'artifacts/local/recognition-benchmark/demo-regression'
$env:DRAWINDOW_QA_WIDTHS = '360,1280'
node scripts/qa-v03.mjs
```

Windowsの隔離実行環境では、既存認証テストの子PowerShellやChromium起動が制限される場合があります。
今回の認証テストは偽キーのみを使う同じテストを通常権限で再実行し、6/6件通過しました。
実キーの変更・再保存はしていません。WorkerのローカルOPTIONSは204、許可Originはlocalhost:5173、
その確認でprovider呼び出しは0件です。開発エージェントから新規の実Gemini画像呼び出しは行っていません。

2026-10-18の引き渡し作業中、ユーザー向けタブには第01題の実API応答
`guess: apple` / `source: api` / HTTP 200 / 3766ms / 686 points が表示されていました。
これは別ブラウザのモックfixtureではありません。その観測時点では `exact` が選択され、
理由は未記入でした。タブのメモリ内記録を消さないよう再読み込みしていません。
この1件だけで12枚の手描き認識品質の検証完了とは扱いません。

画面操作の自動確認結果・スクリーンショットはGit除外済みの
`artifacts/local/recognition-benchmark/` に保存します。
実測後の最初の報告は、ユーザー自身が12枚を描き、この画面から出力したJSON/CSVを根拠に作ります。
