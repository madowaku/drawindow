# しずく原画の品質審査

## 現在の採用状態

291枚（従来132枚＋追加159枚）。洗濯ばさみ・懐中電灯・プレッツェルを削除。
とんかち・レンチ・自転車・電車・トラック・ヘリコプターの6枚は、比較案の修正後をユーザーが承認し、原画JSON・ゲーム・SVG・一覧へ反映した。
比較前後と承認記録は artifacts/qa/shizuku-quality/style-proposals.json に保存。

## 初見審査と画風

artifacts/qa/shizuku-quality/index.html で名前を伏せて回答し、回答後に正解・かわいさ・画風を記録する。SOFT8枚を優先。回答は端末内保存とJSON出力のみ。
SOFTは tapir, armadillo, anteater, sparrow, xylophone, lime, blueberry, lettuce。
制作側の全原画比較は実施したが、人間の名前を伏せた初見テストは未完了。自動UI検証の回答を人間の審査結果に数えない。
6枚の画風承認も、291枚全体の初見識別合格を意味しない。

## Draft #17 / #22との比較

23候補のうち19件は現在の語彙と重なる。絵や挙動が同じという意味ではなく、丸ごとの統合はしていない。
固有4件は、たんぽぽ・ほね・はこ・るびー。Draft内で保全し、採用保留。
比較元SHAと個別結果は inventory.json に記録。
「たこ」は octopus / kite の異物同名。「いす」は chair / stool の上位語と種類。IDを分け、ユーザー指定名称を維持する。
現在の意味辞書にはこの区別がなく、意味判定はunknownになる。読みの連鎖判定と意味の一致を混同しない。

## 検証と残る課題

291枚のゲーム描画、159枚の追加原画一覧、7分類のDAY/NIGHT、360px表示、再生、外部通信なしをブラウザ検証。
審査UIは名前の非表示・回答後のロック・再開・JSON出力を合成入力で検証。人間の結果とは別。
TypeScript・製品ビルド・DEMO配布ZIP生成が成功。今回のZIPは artifacts/qa/shizuku-quality に保存し、販売用releaseファイルを置き換えない。
JSの500kB警告は継続。カタログ分割や読み込み時期の改善は、開始時の遅延を測定したうえで別途検討する。

GitHub Actions https://github.com/madowaku/drawindow/actions/runs/39969343621 は成功。
対象は44ba6ad95bc15e85f8ba3419bff1f0aed98439c5（294枚時点）で271テスト成功。今回のローカル291枚と6枚差し替えに紐づくCIではない。
本番デプロイ・mainへの統合は行っていない。

採用後のローカル全自動テスト：39ファイル・271テスト成功。
