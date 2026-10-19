# DRAWINDOW v0.8: LOCAL LAB (offline recognition experiment)

Status: **experimental branch**. Not a production AI replacement, approved paid product, or public deployment. Preserve v0.7 integration PR #16 and main. This work belongs to `feat/local-recognition-v08-lab`.

## What works

- The existing `DrawingRecognizer` contract now accepts `source: 'local'` separately from `'api'` and `'mock'`.
- `src/services/localRecognizer.ts` compares **the actual player's normalized stroke geometry** against the already-shipped Shizuku illustration library. It centers/scales a 28×28 drawing raster; uses a fast distance transform and symmetric chamfer distance to find the nearest category, with explicit abstention for distant or ambiguous drawings.
- English labels come from the EN catalogue; Japanese labels come from the JA catalogue. Duplicate labels share the best score. Reject/Spicy artwork is excluded from reference candidates.
- Only an explicitly opt-in LOCAL LAB game calls this adapter. The input consists of local stroke coordinates; no screenshot, upload, `fetch`, paid API, keys, remote model or user data collection. The existing five-exchange gameplay and nine-link scoring are preserved, and DEMO is still clearly marked non-comparable.
- LOCAL LAB is not presented as Gemini/QuickDraw ML accuracy: it is a **deterministic nearest-template baseline** for proving the offline boundary. Its matches can be weak on new handwriting. Abstention is preferable to silently guessing the wrong word.

## Reproduce

On Windows PowerShell:

```powershell
npm ci
$env:VITE_ENABLE_LOCAL_RECOGNITION = 'true'
npm run dev
```

Open the development URL and select **Try offline recognition lab / 端末内で絵を認識する（実験版）**. Draw with mouse or finger. Network requests for assets/dev tools may occur, but **recognition never calls a network endpoint**. To verify, use DevTools Network and filter for `/api/recognize`: LOCAL LAB should produce zero calls.

For release candidates, `npm run package:itch` intentionally excludes the lab setting even when enabled in the developer's shell. To make a test-only lab ZIP, run `npm run package:local-lab` (not a public release). Test the resulting archive from a local HTTP server because `file://` ES modules and storage may not work consistently.

## What is NOT complete

- **No pretrained neural weights** included. The candidate `zarqankhn/quickdraw-345-tflite` published weights (Apache 2.0) and `@litertjs/core` (LiteRT.js) are research targets, not shipped. Before adopting them, compare operators/CPU Wasm compatibility on A401OP and Windows, validate the actual input shape/norm/class order, document attribution, and bundle *all* model/runtime/Wasm bytes locally (no runtime CDN).
- **Not an installed offline PWA or native app yet.** Offline *inference* requires zero connectivity, but initial page/assets loading currently requires normal static hosting. Add verified service-worker install/cache/update or a native package and a cold-start airplane-mode test before claiming fully offline distribution.
- Not human accuracy, latency, memory, battery or English/Japanese coverage acceptance. Template matching may disagree with recognizable human drawings. Do not market it as a validated 345-class AI.
- LOCAL LAB should not be merged into the v0.7 product branch without reviewing both game quality and security/asset licenses; do not publish a paid download based on these tests alone.

## Human acceptance grid

1. **No-network gate:** Record DevTools requests on both EN/JA x DAY/NIGHT. LOCAL LAB must make zero `/api/recognize` / provider calls. Retain a copy of requests for reproducibility.
2. **Image recognition:** 12 or more new freehand drawings by 2+ people, mixed shapes, one empty and one ambiguous case. Log after-reveal human word, local guess/abstention, plausible vs exact, and comparison with v0.7 LIVE. Never send intended words to the adapter.
3. **End-to-end:** At least one genuine hand-drawn EN five-exchange session and one JA session. Confirm four local recognitions, correct next-template selection, zero fifth-call, ten drawings/nine links. If a failure occurs, preserve drawing and offer redo or explicit DEMO fallback.
4. **Performance:** A401OP and Windows: first-run initialization, recognition p50/p95, long session memory, touch quality and heat; measure and report before setting product targets.
5. **Full offline packaging:** Bundle all application assets and engine files, install once over HTTPS, then cold-start and complete five exchanges in airplane mode. Confirm PNG export/BGM/EN+JA without connectivity.
6. **Licensing:** Audit original Quick Draw samples and music for redistribution plus model weight/runtime licenses before BOOTH/itch.io/Google Play commercialization.

## Intended phase 2: genuine local ML

Build an isolated `LiteRtQuickDrawRecognizer` behind the same contract. Use the actual 345-output labels, conservative abstention policy, stable EN→JA mappings and explicit unsupported-category handling. Compare it against this pure-JS baseline and a fixed set of human drawings *before* selecting a production default. Do not download weights at runtime or hide a server fallback.

A successful `npm run build` or deterministic fixture test proves only architecture and regression, never recognition accuracy.
