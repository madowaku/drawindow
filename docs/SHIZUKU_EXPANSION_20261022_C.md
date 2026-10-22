# 英日共通イラスト追加・第3便

13種類をローカルのproduct-v07へ追加し、共通手描きセットを93→106種類に拡充。未コミット・未公開。

はくちょう / swan、くじゃく / peacock、ふらみんご / flamingo、てんとうむし / ladybug、あり / ant、かぶとむし / beetle、こうもり / bat、はーもにか / harmonica、らっぱ / trumpet、たいこ / drum、なす / eggplant、ぱいなっぷる / pineapple、きゅうり / cucumber。

原画は `src/data/shizuku-doodles/expansion-20261022-c.json`。既存93枚の原画3ファイルは作業前後SHA256一致。SVGパスを手作業で記述し、従来の変換で英日共通のストロークと1200msの再生を使用。外部素材・画像生成サービス・追加依存なし。出所とSVGハッシュは `assets/shizuku-doodles-v01-manifest.json` に記録。

検証: 全37ファイル・241テスト成功（16.97秒）。その後、目視で気になったきゅうりの曲がりとカブトムシの角を修正し、影響する原画・両言語接続・重複・座標・再生時間の3テスト、全13枚のブラウザ確認、ビルドを再実施して成功。最終JS458.73kB / gzip149.57kB。`git diff --check`成功。

Playwrightで実描画処理による13枚のCanvas、昼夜色、名前非表示、再生、360px幅の横はみ出しなしを確認。ブラウザ例外0。最終昼夜画像を目視確認。人による初見判読・実際のLIVE認識・実機操作は未検証。SAFEは制作側の暫定評価。

ゲームルールと選択ロジックは変更なし。同語の旧日本語フォールバックは新画が優先され、元データは保持する。共通セットの枚数と全カタログの語彙純増数は異なる。

一覧: http://localhost:5195/artifacts/qa/doodle-expansion-20261022-c/index.html

証跡: `artifacts/qa/doodle-expansion-20261022-c/`。原画保全記録: `artifacts/local/doodle-expansion-20261022-c/preserved-hashes.json`。再生成は `node scripts/export-shizuku-doodles.mjs`、画面検証は前便と同じ環境変数で `node scripts/qa-doodle-expansion.mjs c`。
