# DRAWINDOW LIVE 5-Exchange Acceptance v0.1

検証日: 2026-10-18 JST。根拠: [GitHub Issue #2](https://github.com/madowaku/drawindow/issues/2) とユーザー提供の同名指示書。

## 現時点の判定

**基本LIVEゲート: PASS。本人が新しく描いた5枚でDAYの5往復を完走し、Geminiの本物の4認識、4回の次絵選択、第5手の認識省略、10枚9リンクの独立照合を確認した。ゲーム成績は8/9リンク、最長8リンク。** 全リンク接続を受入合格と混同しない。自動検証を人間の自由描画の代用にはしていない。

| ゲート | 判定 | 根拠と限界 |
| --- | --- | --- |
| 最新ローカル・GitHub照合、開始時変更の保護 | PASS | fetch後に対象ブランチのHEAD一致、開始時コピーとSHA-256を保存 |
| 保存済みキーとローカルWorker、Origin | PASS | check:geminiの存在・Git除外、許可OriginのOPTIONS 204。認証の再課金試験は未実施 |
| 人間の新しい手描き5枚・本物の4認識 | PASS | 本人の完了メッセージと手描きチェック。4回全てHTTP200/source:api、リトライ0、第5手呼出し0 |
| 模擬HTTPによる5往復、4選択、5枚目呼出しなし | PASS | 3サイズ×DAY/NIGHT。実APIの証拠ではない |
| 途中の語・スコア・aria/title漏れなし | PASS (automated) | Appテストとブラウザー検証。人間の画面観察は別記予定 |
| 結果10枚・9リンク独立計算一致 | PASS (human + independent) | 別実装の記録に加え、ゲームの採点コードをimportしない外部Node計算と下の9リンク表で一致 |
| HTTP異常・壊れたJSON・空guess・mock混入 | PASS (mocked) | 403/429/502/503/504、invalid JSON、null、source:mock。絵保持、BACK復元、無断DEMOなし |
| 古い応答・上限2回の手動リトライ・未対応文字 | PASS (unit) | 既存reducer/runnerテストを維持。実Workerを止める試験は人間セッション中は行わない |
| 昼夜の吐息/再曇り、保持、指先、reduced motion | PASS (automated) | 通常モーション6経路、reduced motion別検証。実機の感触は含まない |
| 人間によるNIGHT・通常モーション・音の評価 | NOT TESTED | 今回の人間試遊はDAY、reduced motion=true、音はミュートのまま |
| 指示書B6の非比較可能リンクUNKNOWN表示との一致 | FAIL (既存仕様差) | 既存DEMOは意図上のconnected/brokenを表示し、セッションcomparable=falseとする。根本採点変更は実施せず末尾に明記 |
| Android実機の指描き・音・操作感 | NOT TESTED | PCブラウザーの疑似タッチは実機証拠にしない |
| 別の初見プレイヤー・楽しさ・再挑戦意欲 | NOT TESTED | 初回の個人の観察と普遍的評価を分ける |
| 本番Worker/itch iframeのCORS・公開 | NOT TESTED | 本番デプロイ・公開・mainマージを行っていない |

## ブランチ・保全

- 作業先: `C:\Dev\Projects\drawindow`、`codex/shizuku-v03`。
- 開始時HEAD: `38147bb321fc03cc1ecced3505d2083e117815d0`。`git fetch origin`後の `origin/codex/shizuku-v03` と一致、ahead/behind `0/0`。
- 指示書の基準 `c64022671a1c72b8ebd87ed8bdf2845c23291109` の後にBGM追加コミットがある。`origin/main` は `5a5430cd9ac91cd1c87c2adebf3b49a538fdc099`。mainとの151ファイルの既存差分を取り込んだり破棄したりしていない。
- 開始時にはIssue #1関連の21ファイルの変更/未追跡ファイルがあった。`artifacts/local/live-acceptance-start-20261018/` に各ファイル、binary patch、HEAD/status、96ファイルのSHA-256、既存v0.3 ZIPとreceiptを保存。ここはGit除外。
- しずくのPNG/WEBP、素材manifest、BGM、既存v0.2 ZIPはバイト一致。開始時変更のうち17ファイルはバイト一致。追加対象だった `Page.tsx` / `Page.test.tsx` / `recognizer.test.ts` / `README.md` には既存作業を残して今回の変更を加えた。
- コミット・push・mainマージ・本番Workerデプロイ・itch公開なし。v0.3 ZIPは指定のpackage検証で再生成し、元のZIPは開始時保管場所に残した。

## 接続・既存パイロットの根拠

- ブラウザー: `http://localhost:5173/?live-acceptance`。既存の `/api` Vite proxy → `http://127.0.0.1:8787/api/recognize` → Gemini。既存Workerを再利用。
- 開発サーバーのプロセス内だけで `VITE_ENABLE_LIVE_API=true`。秘密はVITE環境へ入れていない。試遊中の自動リロードを防ぐためHMR/WebSocketを停止。通常ゲームの経路・ルールを変更していない。
- Worker設定上のモデル: **`gemini-3.5-flash-lite`** (`wrangler.toml`)。`.dev.vars` にモデル/Originの上書きはない。providerの応答modelIdを直接確認したという意味ではない。
- `.dev.vars` のキーは存在・Git除外・ヘッダー送信可能を `npm run check:gemini` で確認。値の表示・再入力なし。認証を再確認する `verify:gemini` は不要な消費を避けるため実行していない。
- 許可Originは `http://localhost:5173` と `http://127.0.0.1:5173`。Workerとproxy双方の許可OriginへのOPTIONSは204。
- 既存の12題パイロットは**ユーザー提供の指示書/Issueの集計**に基づく。元JSON/CSVを今回再集計したものではない。認識可能11題中初回exact 9/11、plausible含む10/11。Tissue box→Toasterを意図に合わせて補正しない。Cat停止時の通信失敗は誤認と分離。落書き502/invalid_responseを判断不能成功へ変更しない。
- 1435msは失敗を含む初回12件の中央値。成功した初回10件の中央値は約1438ms。1名のdesktop/mouseの記録であり、別人・Androidへ一般化しない。

## 今回の局所変更

1. ゲーム中にも `LIVE API` バッジを表示。DEMOへ明示移行した場合はDEMO表示へ変わる。
2. 429を「limit or quota」「少なくとも1分待つ」「絵は安全」と明示。自動リトライや無断DEMOを追加していない。
3. 最終プレイヤー絵の結果文を `Final drawing · not sent for recognition` と明示。
4. 開発時だけの `?live-acceptance` を追加。本物のApp、既存のAPI adapter/runner/neutral imageを使用し、観測だけを加える。結果公開前には記録のUIを一切出さない。結果後に通信status/latency/source/guess、選択したカタログ、意図、9リンク独立再計算、フェーズ別時間のJSONを保存できる。
5. 記録はメモリーのみ。手描き画像・strokes・headers・生provider responseを保存しない。次セッションで消去。人間の手描き確認は自動で付けず、本人のチェックを別に記録。
6. 再戦の描画前に前セッションの開発用記録を消去する。ブラウザー試験で再戦直後の古い記録の残存を検出し、観測通知をlayout effectへ移して描画前に消去するよう修正した。試遊中のタブの再読込は行っていない。

5往復、4認識、採点定義、Geminiプロンプト、モデル、昼夜の再曇り、しずくの反応原則は変更していない。

## 人間LIVEセッション

匿名参加者P01。本人が5枚をその場で描き、結果公開後の手描きチェックとチャットで完了を確認。PCのIAB、結果採取時のviewport 463×855。入力機器の種類は記録していない。`data-reduced-motion=true` をDOMから確認し、設定は変更していない。ゲーム中の語をユーザーへ伝えたり、代わりに絵を描いたり、ベンチマーク絵を再送したりしていない。

開始 `2026-10-18 10:48:14.287 JST`、結果公開 `10:52:35.596 JST`。本物のセッションは1回、実API呼出し4回、全成功、通信失敗0、手動再試行0、DEMO移行0。自動試験は別ブラウザーでHTTPを全てinterceptしたためprovider呼出し0。

| round | human intent (公開後) | API guess (公開後) | HTTP / source / latency | 次カタログ / 末尾→先頭 |
| --- | --- | --- | --- | --- |
| 1 | egg | egg | 200 / api / 1907ms | `qd-guitar-4660123291090944` / g→g (guitar) |
| 2 | rabbit | rabbit | 200 / api / 2253ms | `qd-tree-4896539229028352` / t→t (tree) |
| 3 | ear | ear | 200 / api / 1793ms | `qd-rabbit-5034139143110656` / r→r (rabbit) |
| 4 | tomato | tomato | 200 / api / 1659ms | `qd-owl-5322965052817408` / o→o (owl) |
| 5 | nice（本人が意図どおりと確認） | recognition: null | 呼出し0 | 次の絵なし |

4つのID/wordの組を既存 `quick-draw-sketches.json` と直接照合した。ブラウザーの値は認識開始からパース完了までの経過時間。既存Worker stdoutの対応する最後の4成功行も200で、1882/2238/1777/1639ms。差はproxy・ブラウザー処理等を含む測定点の差であり、providerだけの推論時間ではない。生provider responseやHARは保存していない。

4回のブラウザー待ち時間の合計7612ms、中央値1850ms、範囲1659–2253ms。この1セッションの4例を、一般的な認識精度や安定したレイテンシーの推定値へ一般化しない。

経過時間の内訳（フェーズ単位、純粋なペン接触時間ではない）:

| 区間 | 時間 |
| --- | --- |
| START→第5手DONE / 命名画面 | 235906ms (3分55.906秒) |
| START→結果公開 | 261309ms (4分21.309秒) |
| player_drawing 5回合計 | 112851ms。考える/操作待ち時間を含む描画フェーズ |
| recognizing 4回合計 | 7623ms。画面遷移反映を含む認識待機フェーズ |
| girl_holding 合計 | 115343ms。うち第5絵は99797ms。全てを絵の理解に要した時間とは断定しない |
| 最終命名 | 25403ms |
| girl_breath / girl_drawing 合計 | 43 / 46ms。reduced motionにより短縮されたため、通常演出の体験時間ではない |

### 9リンクの独立照合

順序は `apple → egg → guitar → rabbit → tree → ear → rabbit → tomato → owl → nice`。

| link | 前の意図→次の意図 | 末尾→先頭 | 独立判定 | ゲーム |
| --- | --- | --- | --- | --- |
| 1 | apple→egg | e→e | connected | 一致 |
| 2 | egg→guitar | g→g | connected | 一致 |
| 3 | guitar→rabbit | r→r | connected | 一致 |
| 4 | rabbit→tree | t→t | connected | 一致 |
| 5 | tree→ear | e→e | connected | 一致 |
| 6 | ear→rabbit | r→r | connected | 一致 |
| 7 | rabbit→tomato | t→t | connected | 一致 |
| 8 | tomato→owl | o→o | connected | 一致 |
| 9 | owl→nice | l→n | broken | 一致 |

`connectedCount=8 / knownPairCount=9 / possiblePairCount=9 / bestChain=8 / linkScore=8÷9 / comparable=true / perfect=false`。unknown=0、全9リンクcomparable=true。最終プレイヤー絵は認識nullであり、「AIがniceと理解した」とは表示・記録していない。記録内の独立計算と、`score.ts` / `words.ts` / recorderを一切importしない別Node計算も一致した。

### 人間の観察

本人から「niceで意図通りです」、続いて「Owlが何の絵かわからなくて、Ownかと解釈してNiceにしたよ」と報告があった。第5しずく絵のカタログ語は **owl**、人間が受け取った語は **own**、返した意図は **nice** である。これは誤入力ではなく、絵の解釈差が最後の `l→n` の切れとして明かされた事例。`own` や `nice` を別の名詞へ勝手に書き換えていない。

第1〜4手のAI語は今回の本人の意図と一致したが、最後の切れはAIの誤認によるものではない。プレイヤーがしずくの絵をどう見たかは別の認識問題である。この観察は本作の「伝わらなさ」の具体例になる。楽しさ、再挑戦意欲、描画の快適さ、音の聴感については明示的な感想を得ていないため、合格にしない。

人間の保存記録と画面（Git除外）:

- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\human\session-1.json`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\human\independent-check.json`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\human\worker-http-summary.json`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\human\display-conditions.json`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\human\observations.json`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\human\results-full.png`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\human\results-viewport.png`

## 自動検証と証跡

| コマンド/検証 | 結果 |
| --- | --- |
| 開始時 `npm test` | 125 tests / 19 files PASS |
| 最終コードでの `npm test` | 134 tests / 20 files PASS (10:58 JST)。再戦直後の記録消去修正後に全件再確認 |
| `npm run test:auth` | 6/6 PASS。通常sandbox内ではPowerShell AuthorizationManagerの既存環境制限で1件失敗し、承認済みの制限外実行で同じ6件を完走。provider呼出しなし |
| `npm run build` | TypeScript + Vite PASS |
| `npm run package:itch` | 40 entries、root index、extracted byte parity PASS、10,871,812 bytes |
| 再生成v0.3 ZIP SHA-256 | `3642cfb785b22e103798fee99dbf83f9e8769e713d5ee6ba1d349895af0cf30e` |
| `node scripts/qa-live-acceptance.mjs` | 模擬HTTP・合成入力。3サイズ×DAY/NIGHT、4呼出し、5th省略、10枚9リンク、独立計算、ネタバレなし、再戦。HTTP異常8種を別検証 |
| `node scripts/qa-v03.mjs` | 元のDEMO通常モーション回帰6経路、5吐息/再曇り、指先の入力非遮断、保持、UNDO/CLEAR、reduced motion PASS |
| 秘密とproduction bundle検査 | 実キーの存在はbooleanのみで検査。ソース/非除外ファイル/ZIPへの混入なし。受入記録・benchmark moduleは本番ZIPから除外 |
| `git diff --check` | PASS |

Playwright同梱ライブラリーが要求するChromium revisionは未導入だったため、既存のChromium 1217の実行パスを指定して実行した。ブラウザーの追加インストールなし。両スクリプトの自動操作は人間用IABとは別のheadless contextを使い、providerへの要求は全て模擬応答で遮断した。

横長画面のエラーではフッターが増えて表示canvasの寸法が変わるため、画面PNGのバイト一致は保持の適切な指標ではなかった。表示に線が残ることと、BACK復元後に送る固定512×512推論画像のSHA-256一致で検証する方式に修正した。通常描画UIの縮尺変化はルールや保存された線を変えない。

証跡ルート（全てGit除外、絶対パス）:

- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\automated\browser-report.json`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\normal-motion\browser-journeys.json`
- `C:\Dev\Projects\drawindow\artifacts\local\live-acceptance\preservation-security.json`
- 画面: `...\automated\{360,720,1280}-{day,night}-{holding,player,review,results,error-503}.png`。
- HTTPエラーの画面: `...\automated\360-day-error-{403,429,502,503,504}.png`。
- 通常モーション: `...\normal-motion\{360,720,1280}-{day,night}-{breath,drawing,holding,player,results}.png`。

追加回帰は既存の97+6基準を削除・減数せず、前の作業で増えた125件を起点に9件追加したもの。四つの異なるAPI応答、4選択、命名前のUI/aria漏れなし、5th認識null、古いセッションの記録排除、sanitized exportを検証。追加モデル分担は実行せず、メインエージェントで作業した。過去のmodel receiptを今回の実行証跡として流用していない。

## 試遊手順

1. 上記URLでDAY、LIVE APIを選びSTART GAME。
2. しずくの絵の英語名を心の中で考え、その末尾から始まる別の物を新しく手描きする。YOUR TURN→DONEを5回。途中で意図を入力する必要はない。
3. 第5手後にだけ、自分の意図に忠実な英語名を5欄へ入力。空欄も可能。
4. REVEAL OUR CHAIN。結果下部の手描き確認は本人がチェック。感想をPlay notesへ記入してSAVE ACCEPTANCE JSON。
5. 結果画面を残してこのチャットへ完了を伝える。再読込/再戦は記録採取後に行う。
6. 失敗時は絵を保持。BACKで編集へ戻るか、明示TRY AGAIN。429では少なくとも1分待つ。DEMO MODEを明示選択した場合はセッション全体を比較対象外として記録する。

## 次の改善候補（未実装）

- baselineの502/invalid_responseを、視覚的に判断不能な場合と通信・JSON構造エラーに分けて扱う別Issue案。今回の意味・計測値は変更しない。
- 人間の感想を受けて、しずくを見ながら描く際の重なり、命名UI、結果の意外性、再挑戦動機を評価する。Tissue→Toasterのような納得できる解釈差を安易に消さない。
- 今回の **owl→own→nice** を初見の別人でも観察し、owlテンプレートの判読性と、解釈差を楽しめる余地の境界を確認する。今回1例だけでテンプレート/認識語を補正・変更しない。
- Android実機と別の初見プレイヤーで手描き・音・操作感を検証する。
- 指示書B6の「非比較可能リンクはUNKNOWN」と、既存score.tsの「DEMOでも意図上のconnected/brokenを表示し、comparable=falseにする」には差がある。既存テストも後者を明示している。根本の採点表示を無断変更せず、DEMOリンク表示の方針を別途判断する。正常なLIVE全比較可能セッションの9リンク判定には影響しない。
