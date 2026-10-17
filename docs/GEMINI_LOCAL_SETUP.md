# Geminiを安全にローカル接続する

APIキーをチャットへ貼らないでください。ブラウザ用の `VITE_` 変数にも入れません。
キーを持つのはローカルWorkerの `.dev.vars` だけです。

1. [Google AI StudioのAPIキーページ](https://aistudio.google.com/apikey)で、使用するプロジェクトのキーを用意します。
2. DRAWINDOWのフォルダーで次のコマンドを実行します。

   ```powershell
   npm run setup:gemini
   ```

3. ターミナルの非表示入力にキーを貼り、Enterを押します。Gitから除外済みの `.dev.vars` に保存します。
   ほかの既存設定は保持します。このコマンドではAPIの呼び出しや公開はしません。
   `AQ.` から始まるAuth Keyにも対応します。接頭辞・固定の文字数で有効性を判定しません。
   空欄、改行・空白・制御文字、保存時に安全に扱えない引用符・バックスラッシュのみ拒否します。
4. `npm run check:gemini` はキーの内容を出さず、保存・ヘッダー送信に安全な値かとGit除外を確認します。
   `authenticationVerified: false` は「このコマンドでは認証を確認していない」という意味です。
5. ローカルAPIを `npm run dev:api` で起動・再起動します。別ターミナルで次を実行します。

   ```powershell
   npm run verify:gemini
   ```

   既存のカタログ筆跡を白地・黒線の512×512 PNGにして、ローカルWorker経由でGeminiへ**1件**送ります。
   意図した単語は送りません。応答がHTTP 200・`source: api`・有効な認識語なら、
   `authenticationVerified: true` を表示します。キー、ヘッダー、認識語、APIの生エラーは表示しません。
   利用枠を消費する可能性があります。これは接続確認で、人の手描き品質の評価ではありません。
6. `npm run dev` のゲームから接続します。
   ローカルの公開設定は `VITE_ENABLE_LIVE_API=true`、同一オリジンの `/api/recognize` を使います。
   キーとは異なり、このフラグに秘密情報はありません。

既に `.dev.vars` を編集できる場合は `GEMINI_API_KEY="キー"` をそのファイルへ直接保存しても構いません。
キーの文字列をチャットへ送る必要はありません。保存済みのキーが使える場合、再入力は不要です。

Workerはキーを加工せず、GoogleのネイティブAPIの `x-goog-api-key` ヘッダーへ送ります。
URLのクエリーやブラウザ側には渡しません。認証を確かめるのは実際のAPI応答です。
タイムアウト・429・503だけでキーの形式が不正とは断定できません。
まずWorkerを通常のローカルターミナルで再起動し、通信・利用枠・プロジェクト権限を確認してください。

2026-10-17の確認では、保存済みAuth Keyで実画像リクエストが成功しました。
再起動後の通常ポート8787でHTTP 200・`source: api`、応答1506msです。
キーの内容は出力せず、[検証記録](VERIFICATION.md)に結果だけを残しています。

認識はGemini側の利用枠・料金設定に従います。ローカル検証は少数のリクエストに限定し、
12枚以上の人の手描きによる品質評価と、Android・実際のitch.io iframeでの確認を別々に記録します。
未設定・認識失敗時に、実認識を装ってDEMOへ切り替えることはありません。

公式資料: [Gemini APIキー](https://ai.google.dev/gemini-api/docs/api-key)、
[Cloudflareのローカルsecret](https://developers.cloudflare.com/workers/configuration/secrets/)。
