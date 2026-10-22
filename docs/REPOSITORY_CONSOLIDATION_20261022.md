# Repository consolidation — 2026-10-22

## Canonical source and scope

Starting GitHub main: `cfad709cb0dfba25b63aadf39823b110949aaac5` (PR #24). The two named folders shared one Git common directory, with eight original worktrees. All were inventoried. No stash existed. The old expression branch had 11 commits absent from remote ancestry, but its entire tree equals the squash result `5fbcf90`; it is not missing product work.

## Recovery before cleanup

External recovery location: `C:\Dev\AssetsShared\drawindow-recovery-20261022\20261022-233522`.

- 11,730 files / 6,508,164,630 bytes copied and SHA-256 compared with original files, including ignored local evidence, original artwork, release archives and experiment materials.
- `all-refs.bundle` verified, cloned into a separate restore-check repository, and checked with `git fsck --full` (no missing/corrupt objects). Raw `.git` metadata additionally preserves reflogs, indexes and worktree metadata.
- Each worktree has binary staged/unstaged patches, status and ignored inventories, a complete file manifest and source HEAD. Restore to a separate checkout at the recorded HEAD, overlay the files and reproduce deletions from status. Do not double-apply overlay and patches.
- Reinstallable `node_modules` excluded. Secret `.env*` / `.dev.vars*` files stay in their original locations and must not be deleted; their values were not read, committed or copied.
- No standalone `.tflite`, `.onnx` or `.wasm` files were present in the inventoried source trees outside dependencies. The ML branch retains its pinned reconstruction script: Hugging Face revision `b02fde8d8732aed32bc9d8176c3dc4efda0333fb`, model SHA-256 `22bb3d3c131aeeee551a1880930910e2ebff8efad8d5cd0c942c97c2dee0993c`. Models were not silently substituted or executed.

Local-only preservation commits, also saved in `preserved-local-work.bundle`:

| Branch | Commit | Purpose |
| --- | --- | --- |
| `codex/preserve-root-20261022` | `6e148f806ea8b49bd46a278a5cb2ee96ce9e547a` | 400 paths: old review code, authored art, original images, evidence and archives |
| `codex/preserve-product-v07-20261022` | `85e6b06551767f3cb3771fde6248741b319d770f` | 253 paths: exact local product improvements, art, release configuration and evidence |
| `codex/preserve-shizuku-line-v02-20261022` | `383a2cfb2ff4a7a8f2e9768ef84131bedb4da30d` | one file: nine unpublished line-style revisions |
| `codex/preserve-vocab-v08-20261022` | `7af90a76a87c22cd2e9c8587b8bb99c12332ebc7` | Draft #22 including #17 |
| `codex/preserve-quickdraw-v081-20261022` | `55489c3873fef2a589272aec3bad295aec90bcae` | Draft #21 including #18 and #20 |

## Product integration

- Adopted 132-doodle commit `b2bd650` replayed onto latest main. The 67 originals and the parrot/grasshopper corrections match the preserved product content after Git newline normalization.
- Recovered drawing-only 32-step undo/redo, reversible CLEAR, held-pointer synchronization, naming exit confirmation and raw-draft/focus restoration, keyboard cursor and Japanese narrow-screen guidance.
- Three-way integration preserves PR #24 naming records and dictionary. Score calculation, recognition payload, Worker code, adopted A sprite bytes and adoption manifest are unchanged from starting main.
- Recovered optional LIVE packaging and production-only gallery exclusion; default static package remains explicit DEMO. Deployment-specific CORS changes remain only in the recovery branch. No Worker deployment or sales/upload operation is included.

## Experiments and duplicates

| Work | Decision and evidence |
| --- | --- |
| Old Japanese branch | Four patch-equivalent commits already in main; classic/everyday/pack data and developer review implementation match. No duplicate merge. |
| Old Shizuku expression branch | Complete tree equals squash result `5fbcf90`; A sprites already adopted. B/review variants stay historical. |
| Draft #17 → #22 | Preserve both PRs and refs. 23 candidate doodles, weighting and starters have outstanding human/style acceptance; overlapping words are not evidence of identical artwork. Do not replace the adopted 132 set. |
| Nine local v0.8 line revisions | Unique; preserved in a dedicated commit. No automatic adoption. |
| Draft #18 → #20 → #21 | Preserve full chain; template baseline, pretrained model integration and preprocessing A/B are experiments. Human freehand, physical-device performance and offline acceptance remain incomplete. No production-default switch. |
| Root uncommitted art/review | Adopted data is represented in product; unused candidates, prompts, original raster art and historical evidence remain in recovery commit and external copy. |

## Verification

- 39 test files, **269 tests passed**; credential harness **6 passed**.
- TypeScript and Vite build passed; explicit DEMO ZIP byte-parity validation passed.
- Exact extracted ZIP: six full browser journeys covering EN/JA × DAY/NIGHT, 320/360/1280 widths and reduced/normal motion. Each produced 10 drawings and 9 links.
- CLEAR/UNDO/REDO reproduce exact canvas PNGs; keyboard cursor moves; held-pointer edits cannot resurrect removed strokes; round history resets; exit cancellation preserves raw naming text and input focus.
- Six actual downloaded PNGs validate as 1200×3000. Souvenir creation/download generated zero HTTP requests. Browser page errors, missing images, horizontal overflow, external HTTP and DEMO recognition calls were zero.
- Local intercepted API 503 then success: distinct request IDs, exact restored inference image, editable recovery and LIVE status retained.
- Evidence: `artifacts/qa/consolidation-20261022/after.json`, screenshots, downloaded PNGs and release receipt. This is automated browser evidence, not human play, Android/Safari comfort, real LIVE recognition or public itch acceptance.

## Remaining acceptance

Human freehand/live quality, physical-phone save/audio/comfort and the vocabulary/ML Draft gates remain open. Existing drawing point/stroke limits and reload persistence are separate future design work. Historical release documents record their dates and are not current deployment claims.
