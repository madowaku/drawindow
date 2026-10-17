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
4. `npm run check:gemini` はキーの内容を出さず、設定の有無だけを確認します。
5. ローカルAPIを `npm run dev:api` で起動・再起動し、`npm run dev` のゲームから接続します。
   ローカルの公開設定は `VITE_ENABLE_LIVE_API=true`、同一オリジンの `/api/recognize` を使います。
   キーとは異なり、このフラグに秘密情報はありません。

既に `.dev.vars` を編集できる場合は `GEMINI_API_KEY="キー"` をそのファイルへ直接保存しても構いません。
保存後はチャットで「設定済み」とだけ伝えてください。キーの文字列を送る必要はありません。

認識はGemini側の利用枠・料金設定に従います。ローカル検証は少数のリクエストに限定し、
12枚以上の人の手描きによる品質評価と、Android・実際のitch.io iframeでの確認を別々に記録します。
未設定・認識失敗時に、実認識を装ってDEMOへ切り替えることはありません。

公式資料: [Gemini APIキー](https://ai.google.dev/gemini-api/docs/api-key)、
[Cloudflareのローカルsecret](https://developers.cloudflare.com/workers/configuration/secrets/)。
