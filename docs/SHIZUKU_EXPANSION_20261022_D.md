# 英日共通イラスト追加・第4便

13種類をproduct-v07へ追加し、共通セット106→119種類。ローカル反映、未コミット・未公開。

らっこ / otter、かんがるー / kangaroo、さい / rhinoceros、かば / hippo、いせえび / lobster、かぼちゃ / pumpkin、とうもろこし / corn、とまと / tomato、たまねぎ / onion、くつした / sock、すこっぷ / shovel、ばけつ / bucket、くし / comb。

原画: `src/data/shizuku-doodles/expansion-20261022-d.json`。手作業のM/L/Q線画。外部素材・画像生成サービス・追加依存なし。既存106枚を構成する4原画ファイルは作業前後SHA256一致（`artifacts/local/doodle-expansion-20261022-d/preserved-hashes.json`）。従来の変換を使い、英日同一ストロークと1200ms再生を維持。

英語Kにkangarooが加わるため、5往復テストの期待出題順を更新。ゲームの選択ルールは変更しない。同語の旧日本語フォールバックより新画を優先するが、旧データは残す。共通セット枚数と全カタログの語彙純増数は異なる。

検証: 全37ファイル・241テスト成功（16.50秒）。座標・ペン上げ・時間・英日形状一致・追加52枚の両言語接続候補・重複を確認。ビルド成功（JS466.11kB / gzip151.76kB）。`git diff --check`成功。実Canvas描画13枚、昼夜、名前非表示、再生、360px幅の横はみ出しなしをPlaywrightで確認、ブラウザ例外0。昼夜の一覧を目視確認。

初見の人による判読、実際のLIVE認識、実機操作は未検証。SAFEは暫定的な制作側評価。特にラッコと一般的なotter、イセエビとlobsterの呼び名の幅は人の回答でも確認したい。

一覧: http://localhost:5195/artifacts/qa/doodle-expansion-20261022-d/index.html

画面証跡: `artifacts/qa/doodle-expansion-20261022-d/`。SVGと出所ハッシュは `assets/shizuku-doodles-v01-manifest.json`。再生成は `node scripts/export-shizuku-doodles.mjs`、前便と同じPlaywright環境変数で `node scripts/qa-doodle-expansion.mjs d`。
