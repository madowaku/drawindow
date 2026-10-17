# DRAWINDOW v0.2 verification — 2026-10-17 JST

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
- Breath-origin coverage: 69 tests passed. Final post-visual-fix run: **69/69 in
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

`npm run package:itch` produced a 745,728-byte ZIP with 24 entries, root
`index.html`, relative asset paths, credits and licences. SHA-256:
`39a9ff4e0b38d5cd851965d31a17b690564b9bf25b1be8c0c4614333ae330511`.
Every unzipped byte matches the built input; no environment file/secret is in
the archive. Full receipt: `artifacts/release/package-receipt.json`.

The ZIP was extracted to a task-owned folder and served on a plain local static
HTTP server. An initial loopback-only server could not be reached by the browser;
binding the test helper to the same interface as Vite resolved it. On
`http://localhost:5175/`, the actual archive loaded character/font assets, accepted
a drawing and advanced to GIRL-2 in default DEMO with no returned browser errors
or overflow. This is a package smoke test, not an actual itch.io iframe test.

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

There is no outstanding known blocker for the labelled local DEMO. The public
live-recognition acceptance gate is open. The working local preview is kept on
port 5173; no external repository destination was configured or pushed.
