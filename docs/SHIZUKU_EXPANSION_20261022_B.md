# 英日共通イラスト追加・第2便

13種類を追加し、共通手描きセットを80→93種類に拡充。product-v07のローカルゲームへ組み込み。未公開・未コミット。

たつのおとしご / seahorse、ひとで / starfish、えい / stingray、あさり / clam、せいうち / walrus、わに / crocodile、こあら / koala、らくだ / camel、かぶ / turnip、どーなつ / donut、ながぐつ / boot、じょうろ / watering can、ゆのみ / teacup。

原画は `src/data/shizuku-doodles/expansion-20261022-b.json`。SVGのM/L/Qを手作業で記述し、従来の変換で同じストロークを英日共通利用、再生は1200ms。外部素材・画像生成サービス・追加依存なし。既存80枚の原画2ファイルは作業前後のSHA256一致を確認。記録は `artifacts/local/doodle-expansion-20261022-b/preserved-hashes.json`。

追加した26枚（前便含む）の両言語で、別の絵への接続候補・重複抑制・ペン上げ・座標と時刻・言語間形状一致を検証。Kの選択順にkoalaが追加され、「ら」の通常候補が終端のらいおんよりらくだを優先することを既存テストへ反映。選択ルール自体は変更なし。既存日本語フォールバックの同語は新画が優先されるため、ゲーム全体の語彙純増数とは区別する。

全37ファイル・241テスト成功（15.79秒）、`git diff --check`成功。ブラウザで13枚の実Canvas描画、昼夜色、名前非表示、描画再生、360px幅で横はみ出しなしを確認。ブラウザ例外0。昼夜の一覧を目視確認。ビルド成功（JS 450.90kB / gzip 147.23kB）。

初見の人による判読、実際のLIVE認識、実機の操作感は未検証。SAFEは制作側の暫定評価。特に貝の種類や英語のteacupなどの呼び名の揺れは、人の回答で今後確認する。

一覧: http://localhost:5195/artifacts/qa/doodle-expansion-20261022-b/index.html

画面証跡: `artifacts/qa/doodle-expansion-20261022-b/`。再生成は `node scripts/export-shizuku-doodles.mjs`、画面チェックは前便と同じPlaywright環境変数で `node scripts/qa-doodle-expansion.mjs b`。
