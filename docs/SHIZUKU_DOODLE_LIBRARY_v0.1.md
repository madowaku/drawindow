# Shizuku Doodle Library v0.1

2026-10-18 JST。しずくの線画を固定A–Zから、文字ごとの複数候補へ拡張した。

## 開く

- 一覧：<http://localhost:5173/?doodle-catalog-preview>
- 単語表示ONで開く：<http://localhost:5173/?doodle-catalog-preview&review>
- 旧URL `/?catalogue-preview` も同じ一覧へつながる。
- 従来の自由回答観察：`/?readability-study`。制作担当用は `&review`。

すべて開発用。既存Viteサーバーを使用し、公開デプロイは行っていない。
一覧はword・readability・DAY/NIGHT・曇りガラス・SAFEのみを独立して切替可能。
文字別絞り込み、選んだ絵の拡大、線の再生、動きを減らす設定を用意した。
一覧のガラスは同じfrost/wipe/wet-edge処理を使い、拡大窓には本編のキャラクターも含める。
word OFFでも制作評価や文字が見えるため、初見のブラインド検証には旧観察ページを使う。

## 候補数・構造

**26 → 64候補、38候補増。新作オリジナル37件＋既存Owl改善案1件の取り込み。**
既存26件（Quick Draw 23件、旧オリジナル3件）のstroke geometryは保持した。
Owl改善案の筆跡もv0.4と同一。新しい第三者素材の追加や権利条件の変更はない。

| 文字 | 候補数 | 単語・バリエーション |
| --- | ---: | --- |
| O | 4 | owl現行 / owl改善案 / orange / octopus |
| Q | 3 | queen / quilt / quail |
| X | 3 | xylophone現行 / xylophone音板改善 / x-ray |
| Y | 3 | yarn現行 / yacht / yarnほどけた糸 |
| U | 3 | umbrella / ufo / unicorn |
| V | 3 | van / vase / volcano |
| G | 3 | guitar / grapes / gift |
| K | 3 | key / kite / kettle |
| N | 3 | nose / nest / notebook |
| P | 3 | pizza / pear / penguin |
| W | 3 | watermelon / whale / watch |
| その他15文字 | 各2 | 元の絵＋新しい単語の絵 |

正本は`src/data/doodleLibrary.ts`の大文字キー`letter -> candidate[]`。
各候補は`id / letter / word / source / readability / strokes`、再生時間、制作コメントを持つ。
`source`には種類・帰属・出典参照を記録する。`src/data/sketches.ts`は既存契約用の平坦な参照。
新作線画は`originalDoodles.ts`、旧26件は`legacySketches.ts`、Owl改善案は`owlReview.ts`。
輪郭を少し不揃いにし、短い線で特徴を残す。絵の中に文字や答えは書かない。
全64件の出典・制作評価・stroke/source SHA-256は
`assets/doodle-library-v01-manifest.json`に保存。`node scripts/audit-doodle-library.mjs`で再生成できる。

## 判読性レビュー

**SAFE 40 / SOFT 18 / SPICY 5 / REJECT 1。すべて制作側の暫定評価。新しい初見参加者は0人。**
全64候補をブラウザ描画した白地一覧で見比べた。
[重点11文字](../artifacts/qa/doodle-library-v01/contact-0.png) /
[その他15文字](../artifacts/qa/doodle-library-v01/contact-1.png)。
候補ごとの理由は一覧でwordをONにして選ぶと確認できる。

| リスク候補 | 評価・扱い | 理由と代替 |
| --- | --- | --- |
| 現行owl | SPICY・自動選択外 | 大きな丸顔と空の両目に依存。既知の誤読もある。Oはoctopusを優先。 |
| 改善owl | SOFT・保持 | 胴・足・止まり木を追加済みだが初見比較は未完了。 |
| orange | SOFT | 葉・皮の粒だけではappleやpeachにも見える。 |
| queen / quilt | SOFT・Qの補欠 | 称号・布の呼び分けが難しい。quailはSPICY、bird/chickの誤読を避け自動選択外。 |
| 旧xylophone | REJECT・保持のみ | 箱や柵に見え、音板・ばちの手掛かりが弱い。 |
| 改善xylophone | SOFT・Xの補欠 | 長さの違う音板と丸頭のばちを大きくした。楽器名の難しさは残る。 |
| x-ray | SPICY・自動選択外 | bone/skeletonや別の形に見え得る。X-rayという語の解釈も必要。 |
| 旧yarn | SPICY・自動選択外 | 渦巻きと外周だけでball/shellと混同しやすい。 |
| 改善yarn / yacht | SOFT・Yの補欠 | ほどけた糸、帆・船体を追加。wool/ball、boat/sailboatとの呼び分けは残る。 |
| ufo / unicorn | SOFT | spaceship/horseとも読める。Uは既存umbrellaを優先。 |
| guitar / kettle | SOFT | 細部依存やteapotとの呼び分け。Gはgrapes/gift、Kはkey/kiteを優先。 |
| nose | SPICY・自動選択外 | 細かい重なりが抽象的。nest/notebookはSOFTだが別名リスクが残る。 |
| P / W / V | SAFEを複数用意 | pear/penguin、whale/watch、vase/volcanoを追加。英語の別名がなくなる保証はしない。 |

N・Q・X・Yには現時点でSAFEがない。評価を引き上げずSOFTを使う。
特にXは遊べる単語がxylophoneの1つなので、同じ文字が続くと再使用する。
「候補がある」ことと、初見で確実に読めることは別の判定とする。

## ゲームでの選び方とOwlの提案

必要な頭文字のSAFEがあれば、その中だけで選ぶ。なければSOFT。
SPICY・REJECTは自動選択しない。候補IDだけでなく単語の出現履歴も数え、
未使用の単語、最も長く出ていない単語、未使用のバリエーションの順で選ぶ。
SAFEが1単語だけの場合は、繰り返し回避よりSAFE優先を守る。順序は決定的で再現できる。
最初のapple、5往復・4回の認識・5枚目の認識省略、秘密保持、9リンクのスコア定義は維持。
認識サービスやWorkerの送信内容は変更していない。

**Owlは両案を削除せず比較用に残し、当面のOはoctopusを使う提案。**
3〜5人の初見自由回答で、現行と改善案の見分け方・別名・ガラスの影響を比較してから
改善案のSAFE昇格を判断する。以前のOWL→OWN、NICEの意図、8/9という記録は変更していない。
追加のブラインド観察や実機プレイ、認識精度を、この制作レビューで代用しない。

## 保護・検証

- 開始時の最新ローカル版382ファイル、HEAD、ステージ済み/未ステージのbinary patch、
  SHA-256 manifestを`artifacts/local/doodle-library-20261018-start/`へ保護。
  ステージ済みの既存作業をリセット・コミットしない。
- 開始時点の実測は143テスト通過（依頼文の134件より新しい状態）。
  認証は制限環境のPowerShell起動で1件失敗し、通常権限で6/6通過を確認。
- 最終確認：`npm test -- --maxWorkers=2`は24ファイル・158テスト通過、
  `npm run test:auth`は6/6通過、`npm run build`とカタログ監査も成功。
  元のGit index、ゲーム進行・採点・認識サービス・Worker、既存v0.4 ZIPの
  SHA-256一致を確認。`git diff --check`の指摘もない。
- ライブラリの全文字カバレッジ・SAFE優先・危険候補排除・単語の再使用順・
  既存26件のgeometry保持、全文字のタイムスタンプ・正規化座標を検証。
- 製品カタログを使った5往復・K候補の循環・秘密のrequest形状・9リンク採点を検証。
- ブラウザで全26文字64件の描画、360×800 / 720×1280 / 1280×800、
  DAY/NIGHT×白地/曇りの12条件、横はみ出し、空のSAFE絞り込み、表示切替と再生を確認。
- 製品ビルドでは一覧・ブラインド観察とも通常ゲームへのルートを持たない。
  詳細な実行結果と画像は`artifacts/qa/doodle-library-v01/`。

これは自動テストとブラウザ・制作側の観察。初見の判読率、実機タッチの快適さ、
音の聴感、楽しさ、新しいLIVE認識の品質は今回測定していない。
