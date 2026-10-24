# Context Recognition Implementation Plan

**Goal:** One-inference A/B/C local experiment without changing production A.
**Architecture:** Shared pure v0.9 score interpretation; DEV-only policy/evaluation/UI. Runtime and gold are separate contracts.
**Tech Stack:** Existing TypeScript/React/Vite/Vitest/LiteRT/WindowCanvas, no new runtime dependency.
**Spec:** ../../CONTEXT_RECOGNITION_v010_DESIGN.md

- [x] Extract production image-only decoding and expose optional full-rank diagnostic; verify frozen old behavior, same 345 outputs and no extra inference.
- [x] Implement pure context policies, strict validation, Japanese normalization, explicit reasons and independent evaluation/export; test benefit and harm/unknown/abnormal cases.
- [x] Implement DEV-only drawing/comparison/evaluation UI and independent subtle expression experiment; test no gold sent to inference, one call and no premature result disclosure.
- [x] Generate reproducible synthetic report with benefit/harm separated and document human pilot, data availability and adoption gates.
- [x] Verify all inherited 5-round/9-link/save/offline tests, production research exclusion, browser desktop/mobile and actual local model. Commit, push and create Draft PR against #29; verify latest-head CI. No main merge/publication.
