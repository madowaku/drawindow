# 夜のしずく：パジャマと強い曇り

> 2026-10-27追記：以下の不透明な曇り・タイトルの記述は導入時の記録。
> 現在はユーザーの再調整依頼に従い、[夜の気配の調整](NIGHT_PRESENCE_20261027.md)へ更新。

## 変更

- NIGHTの7ポーズを淡い青紫の長袖パジャマへ変更。生成画像の顔・髪・リボン・ヘアピン・各ポーズは元のしずくを参照。白いパイピング、小さな月の刺繍を衣装の共通要素とした。
- 元のDAYの採用画像7枚を保持。夜の画像エラーは夜の通常姿に一度だけフォールバックし、再失敗は非表示。昼夜切り替え時に画像エラー状態をリセットする。
- NIGHTの本編ガラスは不透明な曇り。指で描く筆跡の中心だけをdestination-outで消し、その部分から人物・部屋が見える。既存の柔らかい境界と水の縁を維持。
- CLEAR / UNDOでは現在の筆跡から描き直すので、消した部分に曇りが戻る。吐息中は夜の曇りを維持し、描画中は見えている線だけが開く。
- タイトルと衣装確認ページは既存のガラス表現を維持。本編に入ってから強い曇りになる。エンディングの別レイヤーによる曇り演出も維持。

## 画像と生成記録

- 元PNG：`assets/source/shizuku-night/{pose}.png`
- 本編WebP：`public/art/shizuku-night/{pose}.webp`（384×512、7枚合計約540KiB）
- 生成プロンプト・参照元：`assets/source/shizuku-night/generation.json`
- 寸法・SHA256・透明度・目線位置：`assets/shizuku-night-manifest.json`
- OpenAI built-in image_genで、通常ポーズを衣装変更。そのパジャマ画像を服の参照、各旧ポーズを編集対象として残り6枚を生成。実際の透明アルファを保持して均等縮小した。生成画像なので元画像と顔の完全な画素一致はしない。目線の中点を手動推定して既存の描画位置へ登録した。

## 検証

- Vitest：66ファイル・415テスト成功。DAY採用画像のハッシュ保持、夜7画像、切り替えと画像失敗処理を含む。
- `npm run build`：型検査とビルド成功。既存の500kB超チャンク警告あり。
- `node --test scripts/offline-integrity.test.mjs`：14件成功。
- 追加の既存認証テストは5件成功、Windows PowerShell設定テスト1件が失敗。このLinux環境には`powershell`がなく、テスト側がspawn失敗時の出力を文字列として扱って`TypeError: output.includes is not a function`になる。本変更で認証スクリプトは変更していない。
- `npm run package:offline`：成功。実モデルと夜の7画像を含む56項目のZIPを作成し、展開バイト一致・配布スキャンを通過。新画像7枚がSWのプリキャッシュへ入ることも確認。実際の機内モード受入ではない。
- `scripts/qa-night-pajamas.mjs`：製品のdrawFrost / wipeCondensationをネイティブCanvasで実行し、360/720px、両glassStyle、5フェーズの0/.5/1進捗で曇りの不透明度を確認。描画の中心が透明、外側は不透明、消去後に不透明へ戻ること、昼の透過・タイトルの例外も確認。
- 再実行：`DRAWINDOW_CANVAS_MODULE=/absolute/path/to/@napi-rs/canvas node scripts/qa-night-pajamas.mjs`（Viteは本リポジトリ依存を使用、ネイティブCanvasは実行環境から指定）。
- 画像検証結果：`artifacts/qa/night-pajamas/report.json`。
- `artifacts/qa/night-pajamas/outfit-fog-strokes.png` は同じ描画関数で作った合成例（衣装／曇り／筆跡）。ブラウザスクリーンショットではない。

ブラウザ起動用バイナリの取得に失敗し、代替ブラウザからもローカルサーバーに接続できなかったため、ブラウザ通し操作・Android実機検証は未実施。実機ではDAY→NIGHT、7ポーズの見た目、指描画、CLEAR/UNDO、5往復とお別れを確認する。
