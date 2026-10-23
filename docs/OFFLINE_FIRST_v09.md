# DRAWINDOW v0.9 LOCAL LAB

**Status: Draft, not merged, released, sold, or deployed.**

Base: codex/shizuku-300-doodles, with 291 authored drawings (132 existing unchanged, 159 candidate additions). This candidate art still requires blind human visual acceptance.

## Product target
The player draws, she interprets it on device, and the game reaches the existing five exchanges, ten-drawing/nine-link ending and 1200×3000 souvenir. No stroke, name, result or PNG is sent to an API. Day/night, JA/EN, character acting, reversible CLEAR, UNDO/REDO and input protection remain in place. DEMO can be manually chosen as a disclosed simulation; never silently substitute it for failed recognition.

## Technical foundation
- Ported QuickDraw classifier/preprocessor from research Drafts #18 → #20 → #21, using actual train.py polarity (background 0, strokes 1). A previous report measured Top-1 30/32 on Shizuku artwork. **This is not performance on independent human drawings.**
- Pin model revision b02fde8d8732aed32bc9d8176c3dc4efda0333fb and SHA-256; batch-1 shape signature conversion does not change model weights.
- Bundle LiteRT.js WASM, model, 345 labels, fonts, audio and artwork. Asset downloads occur during npm packaging, NOT in the running game.
- Standalone web app registers a versioned atomic precache service worker; after first connected installation it is designed to cold-launch offline. Requires HTTPS or localhost. A file:// ZIP and embedded itch iframe are **not** validated offline-installation methods.
- Retain research-only/noncomparable score. Unsupported Japanese nouns may remain unavailable.

## Build & local preview
\`\`\`powershell
git fetch origin
git switch codex/offline-first-v09
npm ci
npm test
npm run test:auth
npm run package:offline
npm run preview
\`\`\`

Packaging produces a research ZIP and receipts. The build may download the pinned model and its package-time dependencies. Check the generated ZIP has no external runtime CDN and no credentials.

## Mandatory acceptance gates
1. CI: tests, typecheck, build, model checksum, ZIP extraction byte parity.
2. Browser: complete JA/EN, DAY/NIGHT with **real model** in a controlled HTTP-denied session, verify no POST, all 10 drawings and 9 links, audio and PNG.
3. Install from standalone HTTPS origin; wait for service-worker activation; disable connection, close and cold-start app; verify assets/model/music and saved PNG are available without HTTP.
4. A401OP Android: repeat airplane-mode cold launch, measure cold-load, RAM, latency and errors; no hidden network fallback.
5. Human blind drawing test with at least two people and 12 drawings; record Top-1, Top-3, explicit unknowns and chain continuation separately; unsupported Japanese vocabulary is not a false accuracy claim.
6. License and attribution audit for bundled model (upstream describes Apache-2.0) and Quick Draw dataset (CC BY 4.0), plus product BGM and illustration rights before commercial use.

Do not merge to main, upload itch/BOOTH or call this an accepted paid product before these gates pass. Product main and preserved recognition research PRs stay intact.
