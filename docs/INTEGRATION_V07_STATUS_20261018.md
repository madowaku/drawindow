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

## Product polish follow-up (2026-10-18, functional head 4498207)

The latest Japanese source changes from #7 are now also on this integration
branch (cherry-picked; no PR merge or main update):
- Six corrected classic silhouettes, with the previous v02 comparison retained.
- Twelve everyday nouns, bringing Japanese artwork candidates to 135.
- Continuation-friendly Japanese weighting, small mood tie-breaks and preserved
  least-recent reuse. English selection and opening pools are unchanged.
- Mobile blind review, personal marks and one-at-a-time navigation.

### Current local evidence

- `npm test -- --maxWorkers=2`: **220 tests / 34 files passed**.
- `npm run test:auth`: **6/6 passed** (Windows credential safety harness).
- `npm run build`: passed. No Japanese development-gallery strings in built JS.
- `npm run package:itch`: **48 entries**, root index and extracted byte parity.
- ZIP SHA-256: `968d386072540771c3347b4418c8428ef725a8f0b3f4234e3121f433603e61ed`.
- Browser over the **extracted ZIP**, 360x800, reduced motion: EN/JA x DAY/NIGHT,
  five synthetic DEMO exchanges each, first-mark UNDO/CLEAR, 10 diary pictures,
  nine revealed links, three ending acts, 1200x3000 local PNG with names unchecked
  by default, zero HTTP during PNG creation, no recognition calls, no horizontal
  overflow, no page errors. `?japanese-doodle-preview` opens the normal product,
  not the development gallery.
- The source gallery was separately checked at 360x800 and 1280x800 x DAY/NIGHT,
  all 16 before/after pairs and all 12 additions, blind labels and persisted marks.
- Approved core geometry, original character artwork and starter pool file have
  no diff in this follow-up.

Reproduce the package browser check after extracting/serving with
`scripts/verify-archive.mjs` (set `DRAWINDOW_ARCHIVE_PORT` to a free local port):

```powershell
npx --yes --package @playwright/cli playwright-cli -s=product open http://localhost:5287/
npx --yes --package @playwright/cli playwright-cli -s=product run-code --filename=scripts/qa-product-demo.cjs
```

These results establish automated behavior on a desktop browser, not human
recognition, physical Android touch/save, audible BGM quality, or enjoyment.
The earlier human/real-LIVE acceptance tasks above remain pending. The ZIP keeps
its historical v0.4 filename and is a **local review artifact**, not a release.

### PR navigation after cleanup

- **#16: sole product-wide review candidate (Draft)**. Start here.
- **#7: active Japanese source/diff (Draft)**; this batch is included in #16.
- #8 and #12: closed as already included; heads were verified as ancestors of
  the integration branch. Branches and original descriptions remain available.
- No merge to main, deployment, public upload, or paid recognition request.

### Next human review

Candidate adoption: first compare the six revised classics, then the seven
provisionally clearer new nouns (いちご, きゅうり, なす, だるま, くし,
くつした, たけのこ). Rework priorities if confused: ごぼう/にんじん,
うでわ/指輪, けしごむ/積み木, むぎ/葉, plus the classic animal/flower pairs.
All decisions still require an unprompted first guess followed by a separate
charm judgement; review marks do not change production eligibility.
