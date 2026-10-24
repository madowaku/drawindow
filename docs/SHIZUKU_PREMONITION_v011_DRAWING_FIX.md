# PR #31追加修正：指で線を描く体験の復旧

## 発生範囲と原因

通常５往復のAppはWindowCanvasによるストローク再生を維持していた。日英×昼夜の実ML５往復で、ためらい中の空のCanvas、途中の線と移動する指先、描画完了時の線と消える指先を直接観測した。通常プレイ側の瞬間完成への退行は再現しなかった。

X/Y比較再生だけがSketchThumbnailの完成絵に置き換わっていた。また、イベント間隔を最大1000msへ圧縮し、STROKES_CHANGED等の表示フレームを削っていた。以前の「実モデル４認識・同一スコア」の検証だけでは、このMDEの欠落を検出できていなかった。

## 修正

- 比較再生も通常と同じWindowCanvas、CharacterScene、StrokeTipOverlayを使用。静止画のフェードではなく、strokesAtProgressで線の途中を補間し、getPlaybackTipで同じ位置へ指先を置く。長さはgetPlaybackDuration、ためらいは既存characterDrawingProgress/DRAWING_HESITATION。
- 時間の上限圧縮と再生側イベント省略を廃止。同一時計からX/Yへ同じprogressを渡す。描き間違いのnotice/flustered、短い台詞、falseStartの線の消去、息かけと描き直しも記録したphase順に再生。
- DEV限定の外部時計ではCanvasの独立RAF/完了コールバックを動かさない。停止・逆向きシーク・表示切替でもゲームイベントや認識は発生しない。Canvasは入力不可。
- reduced motionは従来どおり完成絵・指先非表示で、自動比較再生を止める。非表示タブは既存の共通時計を停止する。
- 通常版は外部時計を無視し、従来のRAF/描画時間/完了処理を維持。291絵、認識器、ゲームルール、スコア、PNG、BGMは変更しない。Dの表情時間・頻度も変更しない。

## 検証方法

`node scripts/qa-premonition-study.mjs` は実モデルで日英×昼夜の５往復を操作する。各往復のRAFでCanvasの可視ピクセル数、指先座標、表情/phaseを観測し、途中から線が増え、指先が移動し、最後に完成することを検査する。

同じ実記録のX/Yでは、ためらい・複数の描画途中・完成へシークし、両CanvasのRGBA全体のハッシュと指先座標が一致することを検査する。全５枚と日本語の描き直しを対象に、停止した線が進まないこと、自動再生で線が増えること、reduced motion切替、途中保存のUNDO/REDO/CLEAR復元、４認識のみ、10枚/9リンク/1200×3000 PNGも確認する。

実ML４条件の20回の描画では日本語の描き間違いが起きなかったため、その経路は別の合成reducer記録で確認した。採用辞書から描き間違いが起きる認識結果をテスト側で選び、最初の絵・描き間違い・正しい描き直しの３描画を実Canvasで比較する。`syntheticRedraw` と `ja-redraw-fixture` の証跡は実MLの20描画へ合算しない。390自動テストと4条件の実MLブラウザー検証は成功。

証跡は `artifacts/release/offline-premonition-*-drawing-{start,middle,complete}.png` と `*-drawing.json`、通常プレイは `offline-premonition-browser.json` のliveDrawings。これは機械操作による描画の復旧証明で、人間が「描いてくれている」と感じる最終受入の代替ではない。

旧記録には非表示/画面外で停止した区間が記録されていないため、その間の正確な再構築はできない。ストロークは通常の速度で再生し、余剰時間を保持する。認識結果・次絵・判定を補完したり変更したりはしない。
