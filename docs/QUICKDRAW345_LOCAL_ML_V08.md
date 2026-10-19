# DRAWINDOW v0.8 trained offline QuickDraw prototype

**Draft PR #20 only.** Built on LOCAL LAB PR #18, not merged to v0.7 product PR #16, main, itch, BOOTH or paid release.

## What is integrated

- Real pretrained 345-class QuickDraw **SE-ResNet TFLite float16** model from [zarqankhn/quickdraw-345-tflite](https://huggingface.co/zarqankhn/quickdraw-345-tflite), pinned revision `b02fde8d8732aed32bc9d8176c3dc4efda0333fb`. SHA256 `22bb3d3c131aeeee551a1880930910e2ebff8efad8d5cd0c942c97c2dee0993c` is verified during model preparation. The model author reports 76.19% top-1 *on QuickDraw benchmark data*, not DRAWINDOW player sketches.
- `@litertjs/core@2.5.3` CPU/WASM, no cloud API during inference. All model files, 345 labels, WASM runtime JS/binaries are packaged locally. Initial `npm run prepare:local-ml` **requires Internet during development**; no model download to third parties when playing a prepared build.
- Pure JS drawing preprocessing to `Float32Array(28*28)`, white=1 black=0, aspect preserved and strokes antialiased.
- `src/services/quickDrawRecognizer.ts` implements existing `DrawingRecognizer`, `source: 'ml'`, returns genuine ML top-one label only. Japanese uses a handwritten dictionary; unsupported label = explicit failure, not a fabricated Japanese word or a lower-scored replacement. No intentional-word or target letter input.
- With local assets prepared: 5 exchanges, 4 recognitions. The fifth drawing is not recognized (the existing rule). Scores for all experimental `local` or `ml` sessions remain non-comparable/non-official.
- The old `LOCAL LAB` nearest-template, real Gemini LIVE API and deterministic DEMO remain available on their respective explicitly selected modes; public DEMO builds exclude the model assets even when locally prepared.
- The UI starts loading the model as soon as the player selects the research model. Browser makes same-origin asset downloads only; **no drawing images are uploaded**.

## Windows development

Open a fresh sibling worktree so the jam build and v0.7 files are not touched:

```powershell
cd C:\Dev\Projects\drawindow
git fetch origin
git worktree add --detach ..\drawindow-ml-lab origin/feat/quickdraw345-local-ml-v08
cd ..\drawindow-ml-lab
npm ci
npm run dev:local-ml
```

The first run downloads and verifies the model (~8.85 MB) and copies LiteRT runtime locally. Open the URL Vite prints, choose Japanese/English and click **学習済みローカルAIを試す（研究版）** then **はじめる**.

To create an entirely self-contained **static research ZIP**, run:

```powershell
npm run package:local-ml
```

The ZIP is `artifacts/release/DRAWINDOW-v0.8-quickdraw345-ml-lab.zip`. Serve its extracted content over HTTP(S), not as `file://`. An **installed offline PWA/native app remains future work**, so do not claim airplane-mode cold start works yet.

## Critical limitations

1. The pretrained model's **345 labels do not include gorilla/chicken/roulette**. `bat`, `fish`, `bird`, `t-shirt` are included. `bird` is deliberately mapped to `とり` and *not* to `にわとり`; `monkey` is `さる`, *not* `ごりら`. Additional dedicated training or a wider open-vocabulary model is needed for those exact words.
2. QuickDraw benchmark accuracy is not human-player accuracy. More than one drawn object can be plausible, and top softmax scores are not calibrated human-certainty. No word is forced to match intended meaning.
3. Potentially incompatible TFLite operators, mobile RAM/latency and model initialization must be tested in an actual Chromium browser and A401OP. Packaging/build success alone does **not** prove model inference works.
4. This is static on-device inference once downloaded, not full offline app install. Proper cache/service-worker/native bundling is still necessary.
5. Model weight distribution stated as Apache 2.0 and underlying QuickDraw drawings CC BY 4.0. Preserve license notices, provenance and verify redistribution for each final asset, including third-party music.
6. Initial ML model loads could exceed 15 seconds on low-powered devices. CPU/WASM is used first to avoid GPU-specific failures; investigate workers and GPU only after repeatable correctness.

## Human evaluation

Run the same anonymous, original player drawings through local ML and the existing Gemini pilot when allowed. Report top-1 exact, plausible, unsupported, abstentions, model inference latency and next-letter coverage separately. Aim for >=12 drawings from >=2 people, then EN/JA five-exchange runs, all network requests captured. Never silently modify a recognition label to keep the game moving.

The GitHub CI workflow downloads/verifies the pinned binary, runs TypeScript/unit tests and archives the isolated model/wasm ZIP. Browser and human tests must be documented independently.

Related: [Issue #19](https://github.com/madowaku/drawindow/issues/19), [PR #18](https://github.com/madowaku/drawindow/pull/18).
