# Drawindow v0.7 integration status (2026-10-18)

**Integration target:** `integration/drawindow-v07-20261018` / Draft PR #16.  
**Main currently includes only Shizuku v0.6 among these features:** PR #10 was explicitly approved and squash-merged as `5fbcf90`. **No public deploy, release, Worker deploy, or additional main merge performed.**

## Integrated composition

- PR #13: staged latest Japanese shiritori from original Draft #7 on Shizuku v0.6 base.
- PR #14: staged quality and safety gates from original PR #8.
- PR #15: staged three-act ending, `優花 — のる` BGM and local-only souvenir PNG from original Draft #12.
- Cross-feature fix: in `src/components/EndingScene.tsx`, removed fixed `frameOverride="smile"` from the goodbye portrait. Shizuku's existing results selector chooses **DAY SMILE / NIGHT SHY**. Added regression test ensuring the ending does not force a pose override.
- Seven A production sprites remain authoritative for both modes; archived B candidates stay review-only.

## Fresh integrated verification

At integration head `d0dbc46d` before this documentation update:
- [Quality CI](https://github.com/madowaku/drawindow/actions/runs/39121440947): Ubuntu **208/208 tests in 32 files**, TypeScript/Vite build success, `npm run package:itch` success, 48 ZIP entries. Windows credential safety harness **6/6 passing**.
- [Japanese + English CI](https://github.com/madowaku/drawindow/actions/runs/39121440974): success.
- [Review CI](https://github.com/madowaku/drawindow/actions/runs/39121441005): success.
- No compiled bundle was deployed, and a successful package build is not an itch.io publish.
- The local ZIP script still uses the historical `DRAWINDOW-v0.4-itch.zip` filename. Treat as a **test artifact**, not a version-labelled release.

## Human evidence already received

Project owner reported PASS on five **Shizuku v0.6-only** smartphone checks: DAY and NIGHT five exchanges; first-ink, CLEAR and UNDO; THINKING→DRAWING transition; ending with audio. This establishes v0.6 acting acceptance but does **not** establish that this integrated branch's new three-act ending, Japanese language flow, or souvenir PNG has been tested on a phone.

## Remaining acceptance before promotion

1. Real Android integrated EN/JA × DAY/NIGHT five-exchange runs, watching the diary → reveal → goodbye transition and BGM.
2. Smartphone souvenir PNG generation, actual save/open, default-hidden words, opt-in labels, no outward upload, and graceful failure handling.
3. 3–5 blind first-time readers for the revised Japanese classic doodles; record guesses separate from visual-charm preferences. Do not silently upgrade ambiguous SOFT entries.
4. A real human-drawn Japanese LIVE session validating recognition results and `ん` / uncovered kana recovery, without labeling simulated recognition as LIVE.
5. Worker/security/cost budgets, licenses, production iframe, performance and release/marketing proof; separate explicit publish approval.

**GO/NO-GO:** This branch is a code-integrated, CI-green **review candidate**, not an approved public build. Keep PR #16 Draft until full human/integration checks, and do not merge to main or deploy without explicit user approval.
