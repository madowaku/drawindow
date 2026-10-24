# Window Time v0.12 browser evidence

## Reproduction

`node scripts/qa-window-time.mjs` owns Vite on127.0.0.1:4242 and closes Chromium and the server in `finally`. User preview4241 is untouched. The inherited offline CI workflow now runs `node scripts/report-window-time.mjs --check` and the browser script. Hosted CI runs after the new Draft PR is opened; consult its latest commit checks for current status.

`WINDOW_TIME_PROOF_ONLY=1` runs lab, synthetic redraw, sound, recovery and skip checks without repeating the six recognition trials. `WINDOW_TIME_FINAL_ONE=1` additionally runs C Japanese NIGHT. These modes retain separate receipts.

## Observed in real Chromium

- Lab EN/JA x DAY/NIGHT, all A/B/C: blank breath/lead, multiple moving fingertips, progressively increasing ink, complete geometry, seek backwards, frozen pixel hashes after stopping, and real autoplay. Normalized tip coordinates match `getPlaybackTip(planTempo(...), characterDrawingProgress(canvasProgress(...)))`. Each sampled tactile raster matches a separately rendered `drawWetEdges(strokesAtProgress(...))` byte for byte, including expected ink counts. All completed A/B/C pixel hashes match. Selecting another drawing resets the clock.
- Reduced motion: comparison replay disabled, complete static drawings, no fingertip. Real B/C play still reaches the player turn and accepts pointer drawing.
- Ordinary mouse wheel reaches the final evaluation save control at360x800 and1440x900; no document horizontal overflow. Screenshots are retained.
- Six actual five-exchange runs: A/B/C each with EN DAY and JA NIGHT. Synthetic pointer circles passed through the actual App and local ML recognizer. Every run has exactly four recognition results, all `source: ml`, no fifth result; ten ending pictures/nine links; recorded A/B/C final replay round5, ten entries and equal score; local souvenir1200x3000. Live RAF samples show blank drawing lead, changing finger positions and increasing ink. A uses THINKING during lead; B/C use DRAWING. Player input and enabled undo are checked after every pointer drawing.
- Actual ending entry keeps its heading in the viewport. Five diary pairs appear; complete observed pair intervals follow A1000/B1250/C1500ms and sampled link intervals follow A650/B850/C1000ms, with180ms scheduling tolerance. The initial partly observed diary interval is excluded from timing assertions. Reveal and skip are deliberate clicks. Changing result comparison preset retains the actual `runCondition`. B/C computed goodbye durations remain5s/6s; A retains4s. No recognition is repeated by record comparison.
- Evaluation ratings remain null; export excludes strokes/guesses. Raw synthetic drawings require the explicit checkbox and separate export button. Final-version export asserts `drawindow-window-time-local-replay-v1` plus run and comparison conditions.
- B/C reduced-motion mid-draw reload: saved condition survives conflicting A UI settings; original strokes and undo/redo history survive. Redo clears the restored stroke, undo restores it, and clear works. Resume goes directly to player drawing without new recognition. Normal `drawindow-session` and D `drawindow-premonition-study-v011` sentinels remain unchanged.
- Explicit C breath and drawing skip reaches the player turn in under2.5s.
- Separate synthetic Japanese reducer trace exercises notice/fluster and the initial, false-start and corrected drawings in all A/B/C. Each drawing grows progressively with moving fingertip; false-start/corrected geometry hashes differ. This uses canned recognition through the actual reducer and is not an actual ML or human slip observation.
- Sound explicitly enabled in fresh B/C contexts: nonempty title/day BGM media have readyState4, are not paused and retain playbackRate1. Final full-run script also enables sound and rejects an empty ending-media list. This is playback-state evidence, not listening evidence.

## Evidence and limits

`artifacts/release/offline-window-time-browser.json` records six successful full runs plus recovery/skip and the initial four lab conditions. Those full runs preceded the final player-phase CPU/export-provenance hardening; source timing/geometry was unchanged. `offline-window-time-browser-supplement.json` records final-source four exact-raster labs,15 synthetic redraw phase/drawing records, explicit B/C audio, repeated recovery and skip. `offline-window-time-browser-final.json` records a successful final-source C Japanese NIGHT full run with sound enabled and the new raw provenance assertions, plus all four exact-raster labs and repeated redraw/audio/recovery/skip checks.

Artifacts also include `offline-window-time-lab-360.png`, `offline-window-time-lab-1440.png`, and opted-in synthetic raw replay JSONs per actual trial. Earlier failure screenshots are debugging artifacts, not passing evidence.

Headless freeze/activate leaves `document.hidden` false; true hidden-tab timing is not browser-asserted here. A simultaneous participant/human trial, listening quality, recognition accuracy, comfort, repeatability and enjoyment remain untested. No developer self-play scores or pilot ratings were generated. This browser task does not establish production adoption or release readiness.

Final PM hardening: the shared comparison clock now pauses when all panes leave the viewport. Real scroll-out/return proof froze at170ms and resumed at200ms without catch-up; a unit regression also covers it. Fresh verification ZIP receipt is stored separately as offline-window-time-package-receipt.json and hash/byte parity was checked. The tracked baseline package receipt remains historical.
