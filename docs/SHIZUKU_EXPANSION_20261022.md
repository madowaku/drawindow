# しずくの英日共通イラスト追加 — 2026-10-22

product-v07 に13種類を追加。既存の67種類の原画JSONは変更せず、合計80種類の共通手描きセットとしてローカルのゲームに組み込んだ。未コミット・未公開。

追加: もぐら / mole、あざらし / seal、はりねずみ / hedgehog、りす / squirrel、えび / shrimp、もも / peach、さくらんぼ / cherries、ぶろっこり / broccoli、かね / bell、はしご / ladder、てぶくろ / mitten、りゅっく / backpack、ろうそく / candle。

手作業でSVGのM/L/Qパスを記述。外部素材・生成画像サービス・追加依存なし。原画は `src/data/shizuku-doodles/expansion-20261022.json`。既存の変換処理で英日共通のストロークと1200ms再生にする。SAFEは制作者の暫定評価であり、実測認識率ではない。

最初の12種の接続テストで「もも」の次に自身が選ばれる問題を検出し、「もぐら」を追加。13種とも両言語の実ゲーム用カタログで別の絵への接続候補を確認。同じ日本語名の古いフォールバックは従来の採用処理により新画を優先するが、元データは保持する。これは全カタログの語彙数が両言語とも13増えるという意味ではない。

検証:
- 37ファイル・241テスト成功。座標、時刻、ペンの上げ下げ、英日同一形状、IDと追加語の重複、接続、既存UIを確認。
- TypeScript・Viteビルド成功。JS 443.91kB / gzip 145.04kB。
- Playwrightで実際の drawStrokes を使った13枚のCanvas描画、DAY/NIGHT色、名前の表示切替、1200ms再生、360px横はみ出しなし、ブラウザ例外0を確認。
- 昼夜の一覧画像を目視確認。人間の初見判読・実機タッチ・実際のLIVE認識は未検証。
- `git diff --check` 成功。既存のゲームルール、認識API、描画入力、キャラクター画像、音声は変更しない。

一覧: `http://localhost:5195/artifacts/qa/doodle-expansion-20261022/index.html`。ローカル開発サーバー専用で、公開ビルドには含めない。

証跡: `artifacts/qa/doodle-expansion-20261022/receipt.json`, `day.png`, `night.png`。書き出したSVGとハッシュ・出所は `assets/shizuku-doodles-v01-manifest.json`。再生成は `node scripts/export-shizuku-doodles.mjs`。画面検証は既存PlaywrightモジュールとChromiumを環境変数で指定し `node scripts/qa-doodle-expansion.mjs`。

次は名前を隠した状態で見比べ、特に「もぐら」「りす」「かね」の解釈と愛嬌を確認してから、必要な形だけ調整する。
