# QuickDraw local ML: 28×28 preprocessing correction and A/B (v0.8.1)

Status: **Research PR #21, not in v0.7 release or main**. Source model: KashifKhn QuickDraw345 trained TFLite (pinned in PR #20).

## Root cause

The author's README describes white background/black ink, but that conflicts with the model's actual training pipeline (`train.py` downloads original Google QuickDraw numpy bitmap, then computes `tf.cast(image, tf.float32) / 255.0` with NO inversion). Google's [original bitmap generator](https://github.com/googlecreativelab/quickdraw-dataset/issues/19#issuecomment-402247262) uses `bg_color=(0,0,0)` and `fg_color=(1,1,1)`. Our first model integration created **background=1, ink=0**, reversing the pixel inputs the weights learned from.

v0.8.1 generates **background=0, ink=1**, keeps the aspect ratio and centering, and narrows strokes to about 1.5px at 28×28 (original Google rasterizer target ≈1.5px). The previous inversion and stroke width can be selected **only for reproducible A/B** using `preprocess: { polarity: 'legacy', strokeRadiusHiRes: 4 }`.

## Verified CI experiment (2026-10-20)

- Runner: GitHub Actions Ubuntu + headless Chromium using bundled local model/LiteRT.js CPU/WASM. No remote inference, no changed weights.
- Input set: 32 distinct words from **existing Shizuku game illustration assets** with safe/soft readability, whose English labels are in the 345 model categories. The same stroke vectors were processed both ways.
- Previous white-bg/black-stroke preprocessing: **Top-1 0/32, Top-3 1/32**.
- Corrected training-polarity, thinner-stroke preprocessing: **Top-1 30/32, Top-3 32/32**.
- Report: GitHub Actions run [39419018247](https://github.com/madowaku/drawindow/actions/runs/39419018247), artifact `DRAWINDOW-v0.8.1-preprocess-comparison` contains `quickdraw-preprocess-ab.json` and an experimental ML ZIP. Retention 7 days.
- Automated suite: **240 tests passed**, type check and experimental local-ML archive generated successfully.

**Interpretation limit:** This is _not_ independent human recognition accuracy. Shizuku artwork includes existing QuickDraw-derived vectors that could overlap the model's distribution and data. Do not advertise 93.75% accuracy for real players or use this in paid marketing. Polarity and line width were corrected together, so the A/B is not a clean isolation of stroke-width effects. For that, add a factorial test on independent human drawings.

## Human validation next

1. Update local research branch and clear cache/reload. On **PC and A401OP**, enter LOCAL ML in JA and EN. Play naturally; do NOT copy Shizuku's sketches.
2. Draw at least 12 fresh inputs by at least two people. Include `さかな`, `こうもり`, `ねこ`, `りんご`, `しゃつ`, and shapes less like QuickDraw. After reveal, record **intended noun / ML Top-1 / whether intended noun appears among Top-3** and whether game continues.
3. For `ごりら`, `にわとり`, `るーれっと`: these are **not model categories**, so score them as unsupported, not model misses against imaginary exact labels. Future custom training or a wider model needed.
4. Record cold-load time, inference latency and errors on A401OP; offline inference is bundled, but app cold start in airplane mode is **not** yet certified.
5. Calculate exact-match, Top-3, abstention, and playable next-letter coverage separately. Do not let recognized label be rewritten to fit the next letter.
6. Use experiment results to decide whether to tune stroke-width/padding, use variant averaging, or train custom classes. No automatic promotion to paid product.

Refs:
- Training pipeline: https://github.com/KashifKhn/quickdraw-345-classifier/blob/main/train.py
- Google bitmap generation: https://github.com/googlecreativelab/quickdraw-dataset/issues/19#issuecomment-402247262
- PR #20: https://github.com/madowaku/drawindow/pull/20
- Research PR #21: https://github.com/madowaku/drawindow/pull/21
