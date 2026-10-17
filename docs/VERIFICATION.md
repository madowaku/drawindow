# DRAWINDOW v0.3 verification — 2026-10-17 JST

## Current v0.3 result

P0 DEMO integration passed. **96 tests / 14 files**, TypeScript/Vite production
build, static packaging and extracted-byte parity passed. Exactly five girl and
five player entries, nine links, five DAY breaths and five NIGHT refog phases
were observed. The previous77-test/seven-pose version was first re-run and
protected at commit `9ec815b9d0dd9f7f28098ec754c14e0717210001` on branch
`codex/shizuku-v03`, with a separate patch/file/hash backup. GitHub main was
independently checked at `5a5430cd9ac91cd1c87c2adebf3b49a538fdc099`; no older
remote file was used to overwrite local work.

Requested model routing was verified from execution metadata: Sol6.1/XHigh
integration/design, Luna6/Max reactions/playback tip, Astra6/Low short screenshot
review. See `model-receipt-v03.json`. Astra found no P0/P1 issue in five actual
mobile/tablet screenshots; that is not human playtest or motion-quality proof.

### Actual automated browser checks

Playwright-core1.59.1 from the existing local cache drove installed headless
Chromium. This did not add a dependency or change OS motion settings.

| CSS viewport | DAY and NIGHT evidence |
| --- | --- |
| 360×800, DPR2 | Both normal-motion five-exchange journeys passed; contact cursor, mouse/touch-event input, undo/clear, retained ink, five labels,10cards/9links. |
| 720×1280 | Both normal-motion journeys passed the same checks. |
| 1280×720 | Both normal-motion journeys passed, including no vertical/horizontal play scrolling and reachable actions. |

The contact marker uses the exact same interpolated/eased point as visible ink,
with the same drawing-square left/top/size transform. Focused tests cover
begin/middle/end, pen lifts, resize and HiDPI-independent CSS coordinates. It
does not move the portrait across the stroke path and does not alter stroke
coordinates. The fixed-art hand is not an articulated rig; that remains deferred.
An inline no-hit guard hardens the overlay even before stylesheet readiness.
Held ink was pixel-compared after1050ms in each journey. No missing images,
early labels/interpretation/score elements or browser errors were found.

A360px reduced-motion browser check passed with no moving contact cursor and
no character motion. Tests additionally cover normal650ms DAY/280ms NIGHT
timelines, tab hide/resume, motion changes, resize and unmount; completion fires
once and static phases do not create an endless animation-frame loop.

Structured evidence: `artifacts/qa/v03/browser-journeys.json`. Screenshots include
`360-day-drawing.png`, `360-night-drawing.png`, `720-day-player.png`,
`1280-night-holding.png` and the matching breath/holding/player/results states.
The source browser script is `scripts/qa-v03.mjs`; it uses simulated mouse/touch
inputs, not physical Android or human hand-drawn quality evidence.

### Package and recognition status

`npm run package:itch` rebuilt a standalone DEMO with local live flags disabled,
then wrote `DRAWINDOW-v0.3-itch.zip`: **1,509,746bytes,36entries**. SHA-256:
`3331436253d6eee1920bcf2301a07a681d9dfd08896e17ab0c88d35f227e00ff`.
Root index, relative assets and extracted-byte parity pass. The old v0.2 ZIP
remains intact. The actual extracted archive was served at localhost5176 and
completed normal-motion DAY/NIGHT five-exchange checks at360×800; evidence is
under `artifacts/qa/v03/archive/`. This is not the real itch.io iframe.

P1 preparation: the existing genuine Gemini adapter and Worker remain in place;
official model/image support was rechecked. A masked `npm run setup:gemini`
command stores a key only in ignored `.dev.vars`; `npm run check:gemini` prints
booleans only. Actual local Worker checks returned204 for trusted preflight and
403 without an allow-origin header for an untrusted origin. No provider call
was made by those checks. See `recognition-preflight.json` and
`docs/GEMINI_LOCAL_SETUP.md`.

The existing local value did not look like a configured Google API key; private
replacement was requested. Genuine LIVE five-exchange recognition,12human
freehand samples, actual iframe CORS, Android touch comfort and the3–5minute
unassisted naive-player study are **pending**. No live-ready, recognition-quality,
human-comfort or fun claim is made by the DEMO checks.

## Historical v0.2 evidence

## Current character update: Shizuku v0.2

The character update passes **77 tests in 12 files**, TypeScript/Vite build,
source/output SHA-256 verification and ZIP extracted-byte parity. Commands:
`npm test`, `npm run build`, `npm run package:itch`, `git diff --check`.
Tests added for conversational acting, monotonic replay with a short hesitation,
shared DAY/NIGHT textures, no player-visible name, pose timers, reduced-motion
cancellation and hidden-document motion lifecycle. The mouth/fog mapping now
uses the same shared portrait rectangle as the character's CSS.

Actual browser checks of this update:

- 360×800 DAY: five exchanges with keyboard dots, five naming fields, ten cards
  and nine links. Curious expression during each player's turn; smile after her
  drawing. No overflow or missing images.
- 1280×900 NIGHT: title and holding screenshots, five exchanges, ten cards and
  nine links. Empty intentions remain unknown. No missing images or console
  warnings/errors returned.
- Separate `/?character-preview`: all six expressions and DRAWING selected
  successfully, with no missing images; DAY/NIGHT controls preserve one portrait
  set. 390×844 portrait layout checked for overflow and readable artwork.
- The host browser reports reduced motion, so ordinary game play respected it.
  The explicit production-preview motion toggle enabled actual browser motion:
  BREATH native transform reached scale 1.018 / y -3px / rotation 0.2deg; two
  consecutive breathing transform samples differed. Stopping preview motion
  returned both transforms to `none`. Normal-speed whole-game timing has helper
  and lifecycle tests; a physical device animation test is not claimed.

Screenshots: `artifacts/qa/shizuku-*`. Structured journey/motion evidence:
`artifacts/qa/shizuku-browser-journeys.json`. Alpha was inspected by compositing
the atlas over blue (`shizuku-atlas-on-blue.png`). The pins, neck ribbon, sleeves
and fingertips are consistent at game scale; no fog/background is baked into
the portrait textures. Sprite poses do not constitute a skeletal/Live2D rig,
and the pointing fingertip does not track every replay coordinate.

Updated ZIP: **1,508,310 bytes / 36 entries**, SHA-256
`d4d79f6a9952c487668720c3746f08b7ac2bb89cd19f947edbd3bba48e86d9a4`.
Root index, relative assets and exact extracted-byte parity pass. The ZIP was
rebuilt; the old archive's browser journey below is historical and is not
claimed as a second archive browser run for these new bytes. No deployment,
genuine recognition call, physical touch test or audio listening was part of
this character update.

## Initial game evidence (before the character update)

## Result and scope

The default explicitly labelled DEMO completes five exchanges (ten archived
drawings), asks for five player intentions only at the end, and reveals nine
intended-word links. The optional genuine API boundary is implemented. There
was no configured provider key, real recognition benchmark, paid API call,
public deployment, push or jam submission during this work.

## Automated and build evidence

- Contract/core stage: 14 focused core tests passed.
- Core/service stage: 25 focused tests passed.
- Worker stage: 45 tests passed; UI modules were still being written, so the
  initial whole build was correctly not reported as successful.
- Integration: 59 → 65 → 67 tests passed as canvas/component/UI tests landed.
- API 503 retry regression: initially reproduced, then 68 tests passed.
- Breath-origin coverage: 69 tests passed. User-confirmed DEMO-first gate adds two
  UI tests: unconfigured release exposes DEMO only; configured endpoint preserves
  the optional recognizer integration. Final run: **71/71 in
  10 files** with `npm test`; **TypeScript + Vite production build passed**.
- `wrangler types worker/bindings.d.ts` and `wrangler deploy --dry-run` passed.
  No files were uploaded by dry run. Local Wrangler log/registry paths were
  moved under `.wrangler` after profile-directory EPERM errors.

Tests cover 9/9, 0/9, unknown/streak/normalization semantics; exactly five rounds,
double DONE/stale response/restart protection; 3 total API attempts; API timeout,
429, invalid output, missing secret/origin/rate binding; fake-clock frost/playback
pause and cleanup; coalesced pointer samples/taps/keyboard; A–Z template coverage;
full UI journey with controlled canvas callbacks and non-spoiler DOM assertions.

## Actual browser evidence

Browser: Codex in-app browser, Chromium-backed desktop runtime. These are CSS
viewport tests on the host, not tests on physical phones.

| CSS viewport | Actual flow and result |
| --- | --- |
| 360×800 | DAY five exchanges to five naming fields and 10-card/9-link results; repeated after visual fixes. 4 labels + one skip yields 3/8 known-link score, 1 unknown, BEST CHAIN 1 link. DAY/NIGHT holding views checked. No play overflow; readiness/DONE controls reachable. |
| 720×1280 | NIGHT five exchanges, mouse drag, UNDO/CLEAR disable DONE when empty, labels and results 6/9, BEST CHAIN 3; retained NIGHT. No play overflow. |
| 1280×720 | DAY actual mouse stroke and local API failures; recovered explicitly to DEMO and finished remaining exchanges, five labels, 10 cards/9 links, 6/9 and chain 3. No play overflow or hidden action. |

The first girl drawing was deliberately held while other tools ran, and player
ink remained through resize, actual failed requests, retry cap and BACK. DAY
breath phases were observed before each subsequent girl turn; helper/component
tests establish the normal 650ms timing and reduced-motion transition. This does
not establish physical breath animation perception or real device comfort.

The local Worker at 8787 returned genuine missing-secret failure (no provider
call). Browser exercised initial request + two retries, no fourth retry button,
BACK restoring drawable ink, and DEMO MODE explicitly switching the session.
No guessed word was shown during this flow. Failure screenshots retain the line.
429/timeout/invalid JSON have automated HTTP-fixture evidence, not induced live
provider failures.

Title mode persistence, restart/title return, sound enable/mute (no autoplay
error), help dialog and Escape were checked. Sound quality/balance was not
listened to. Final browser console inspection returned no warnings/errors.
DOM journey observations are retained in `artifacts/qa/browser-journeys.json`;
screenshots are under `artifacts/qa/`, with the visual comparison in
`design-qa.md`. Test dot inputs make some player thumbnails intentionally tiny.

## Package evidence

`npm run package:itch` produced a 745,674-byte ZIP with 24 entries, root
`index.html`, relative asset paths, credits and licences. SHA-256:
`4d96f8ecc63e09cc587334f335edc475032db365fc7e0a2a68527e50d4dd5979`.
Every unzipped byte matches the built input; no environment file/secret is in
the archive. Full receipt: `artifacts/release/package-receipt.json`.

The ZIP was extracted to a task-owned folder and served on a plain local static
HTTP server. An initial loopback-only server could not be reached by the browser;
binding the test helper to the same interface as Vite resolved it. On
`http://localhost:5175/`, the final actual archive completed all five exchanges
without an API, showed five naming fields only at the end, then revealed ten
cards and nine links (6/9, BEST CHAIN 3) with explicit simulation disclosure.
Final browser console returned no warnings/errors. Evidence:
`artifacts/qa/archive-full-journey.json`, `archive-full-results.jpg`. This is a
local static-package test, not an actual itch.io iframe test.

## Models actually used

Local Codex `turn_context` model/effort metadata independently confirmed:

- Astra 6 / Low: initial brief and final actual-screenshot advisory reviews.
- Sol 6.1 / XHigh: core/recognition design and implementation, integration,
  security review, bug triage and final verification.
- Luna 6 / Max: drawing, fog, day/night breath, replay, catalogue and tests.

All requested profiles ran; no fallback. Minimal evidence is in
`docs/model-receipt.json`. Superdesign CLI preflight ran, but authentication
expired; no Superdesign draft or generation was performed. No 3D/Tripo job was
needed for the Canvas2D specification.

## Remaining release gates

1. Configure an actual provider key and allowed public/iframe origins, with quota.
2. Run the documented benchmark on at least 12 genuinely hand-drawn images;
   assess plausible interpretation, latency and failure recovery.
3. Verify the real itch.io iframe origin/CORS, mobile touch device and audio
   comfort. Do not advertise validated live AI recognition until these pass.
4. After API connection, complete a genuine live-mode five-exchange session
   using freehand drawings, real private interpretations and all nine final
   intended-word links. The user explicitly deferred this gate until after the
   DEMO; fixed mock results cannot satisfy it. `DrawingRecognizer` remains the
   stable integration boundary. Gemini is implemented; a future Jev adapter can
   implement that interface once its actual API contract is selected/verified.

There is no outstanding known blocker for the labelled local DEMO. The public
live-recognition acceptance gate is open. The working local preview is kept on
port 5173; no external repository destination was configured or pushed.
