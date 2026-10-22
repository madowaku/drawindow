# 英日共通イラスト追加・第5便

## 追補: オウム・バッタの修正

ユーザーの指摘を受け、オウムは扇状の冠羽・鉤形のくちばし・止まり木をつかむ足へ変更。バッタは短めの触角と大きい目、太い後脚を描き、脚の後ろに隠れる胴の線を省いて交差を削減。ID・英日ラベル・132枚の件数・1200ms再生は維持。同ファイルの他11枚はJSON比較で不変。旧原画は `artifacts/local/parrot-grasshopper-revision/before.json` に保管。

修正後は原画変換・座標・ペン上げ・時間・英日同一形状・接続を検証する3テスト、ビルド（JS474.88kB / gzip154.45kB）、13枚のブラウザ昼夜表示・再生・360px幅確認が成功。全241テストは追加時の結果で、今回の形状変更後は対象テストのみ再実施。比較画像は `artifacts/qa/parrot-grasshopper-revision/comparison.png`。初見判読とLIVE認識は未検証。

13種類をproduct-v07へ追加し、共通セット119→132種類。ローカル反映、未コミット・未公開。

あらいぐま / raccoon、なまけもの / sloth、ごりら / gorilla、おおかみ / wolf、だちょう / ostrich、おうむ / parrot、ばった / grasshopper、かまきり / mantis、りゅう / dragon、ろぼっと / robot、かめら / camera、ぼうえんきょう / telescope、ぶらんこ / swing。

原画は `src/data/shizuku-doodles/expansion-20261022-e.json`。M/L/Qパスを手作業で記述し、従来の変換で英日同一ストロークと1200ms再生を維持。外部素材・画像生成サービス・追加依存なし。既存119枚の原画5ファイルはSHA256一致を確認（`artifacts/local/doodle-expansion-20261022-e/preserved-hashes.json`）。

ごりらの追加で、日本語「ご」の選択が代用「こ」から完全一致へ変わる。古い語彙前提のテストを更新し、ご候補がない場合の代用を別途維持確認。新しいごりらが旧同語フォールバックを置き換え、未収録語ごぼうは残ることも検証。選択ロジックは変更なし。元のフォールバック原画も保持。

全37ファイル・241テスト成功（16.33秒）、`git diff --check`成功。ビルド成功、最終JS474.46kB / gzip154.24kB。Playwrightで実Canvas13枚、昼夜色、名前非表示、再生、360px幅で横はみ出しなし、例外0を確認。昼夜の一覧を目視確認。共通セットとゲーム全体の語彙純増数は区別する。

初見の人による判読、実際のLIVE認識、実機操作は未検証。SAFEは暫定的な制作側評価。動物の種や、りゅう／dragonの解釈は人の回答でも確認する余地がある。

一覧: http://localhost:5195/artifacts/qa/doodle-expansion-20261022-e/index.html

証跡: `artifacts/qa/doodle-expansion-20261022-e/`。SVG出所ハッシュ: `assets/shizuku-doodles-v01-manifest.json`。再生成は `node scripts/export-shizuku-doodles.mjs`、画面検証は前便のPlaywright環境変数で `node scripts/qa-doodle-expansion.mjs e`。
