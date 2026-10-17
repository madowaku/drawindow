# DRAWINDOW v0.2 visual QA

## v0.3 current game integration

P0 visual review passed. The newest local77-test/seven-pose base was preserved
before integration; no source illustration was regenerated or overwritten.
Reactions now derive only from phase/mode/round/motion preference. During play
they cannot see score, intended noun, model guess or correctness. Front-facing
eye anchors share one registered target. Title blink is cosmetic only.

Actual mobile/tablet screenshots in `artifacts/qa/v03/` show crisp held/player
ink above the character and fog, readable actions and distinct day/night mood.
Astra6/Low inspected five screenshots and found no P0/P1 blocker. The small
girl-side contact cursor identifies the current line endpoint; its underlying
normal-motion interpolation and lift/end hiding also have automated browser
and unit evidence. Accurate articulated hand/finger motion is deferred.

All six combinations of360×800/720×1280/1280×720 and DAY/NIGHT completed five
exchanges without play scrolling, missing images or browser errors. Review and
results intentionally scroll and include a small decorative neutral/closing
portrait. No result words or correctness cue appear during the five exchanges.
Device comfort, unassisted comprehension and fun remain human playtest gates.

The sections below describe the earlier v0.2 implementation and are historical.

## Current Shizuku Character Sheet v0.2 update

Passed local visual/interaction review for the new character presentation.
The initial scene-only character described below is retained as historical
evidence. The current game uses transparent shared portraits, a separate room
plate and separate fog/drawing layers. The user's written v0.2 character rules
override conflicting details on the older reference sheet.

Actual images inspected: `shizuku-atlas-on-blue.png`,
`shizuku-360-day-holding.png`, `shizuku-360-day-curious.png`,
`shizuku-desktop-night-title.png`, `shizuku-desktop-night-holding.png`,
`shizuku-preview-day-breath.png`, `shizuku-preview-night-drawing.png` and
`shizuku-preview-mobile.png` in `artifacts/qa/`.

The first mobile crop left too much space above her head; the shared portrait
rectangle was enlarged and its mouth/fog origin updated together. The resulting
crop retains crossed pins, soft eyes, crooked ribbon and sleeve/fingertip cues.
DAY/NIGHT use identical sprite files with light/color changes. Drawings remain
in front of the character as marks on the same glass. Keyboard focus retains
the accessible drawing square; pointer ink retires the empty-state boundary.

All six expressions and drawing pose are selectable in the separate production
review page; her name is absent from play. Actual CSS breathing and native
forward lean were checked through that page's explicit motion toggle. Reduced
motion remains respected in the game. Seven poses/360px play/390px review/
1280px desktop had no missing assets or horizontal overflow. No skeletal rig,
physical-device comfort, audio or recognition-quality acceptance is claimed.

## Initial visual QA (historical)

final result: passed

Scope: the explicitly labelled local DEMO and its responsive interface. This is
not acceptance of real recognition quality or the public jam deployment.
The user's final DEMO-first instruction is applied: no live-mode switch appears
until an endpoint (or explicit local integration flag) is configured. The final
title was recaptured, and the final ZIP completed five exchanges in the browser.

## Visual truth and comparison evidence

- Source: `assets/source/supplied-day-reference.png`, 1122×1402. This is an
  illustration reference, not a supplied UI mockup. Layout, typography and
  controls come from the implementation specification and the concise UX brief.
- Generated source: `assets/source/character-atlas.png`, 1024×1536; equal-grid
  DAY/NIGHT neutral/thinking/smiling scene tiles, 341/342×768.
- Final browser truth: `artifacts/qa/360-day-title-final.jpg`,
  `360-day-holding-final.jpg`, `360-day-results-final.jpg`,
  `360-day-draw-guide-final.jpg`, `360-day-player-final.jpg`.
- Additional browser views: `720-night-holding.jpg`, `720-night-results.jpg`,
  `desktop-day-holding.jpg`, `desktop-day-results.jpg`, `360-api-error.jpg`,
  `archive-browser-smoke.jpg`, `archive-full-results.jpg`.
- Actual combined comparison opened and inspected:
  `artifacts/qa/reference-character-game.png`, 1101×800. Left: full reference
  contained into 400×800; middle: generated day character contained into 341×800;
  right: 360×800 game. Containment padding is explicit; no claim of 1:1 UI cloning.
- Focused same-state comparison opened and inspected:
  `artifacts/qa/stroke-before-after.png`, 720×800, two 360×800 DAY holding views.
  This makes the stroke edge/clearance revision visible at matching scale.
- Browser CSS targets: 360×800, 720×1280, 1280×720, DPR 1 as observed on the first
  360 run. Screenshots are JPEG. Captures immediately after viewport/state
  changes could be stale; final captures were taken after a subsequent state
  observation. Full-page capture was unavailable, so results use viewport crops.

## Fidelity surfaces

- Typography: intentional Cormorant Garamond display/italic voice and DM Sans
  controls, self-hosted Latin subsets. Title/slogan and English controls checked.
  Last-letter rule and result link labels enlarged to 12px on mobile; decorative
  eyebrows remain smaller. Essential text does not truncate.
- Spacing/layout: single dominant window, primary action below it, 44–52px play
  touch targets. No horizontal overflow or hidden play control at the three
  requested sizes. Review/results intentionally scroll and begin at the top.
- Color/tokens: DAY pale cyan/ivory; NIGHT blue with amber scene/button contrast.
  Same UI hierarchy and rules. Frost is a separate Canvas mask; ink stays legible.
- Image fidelity: consistent face, bob, cardigan/ribbon, camera and room across
  expressions and lighting. Crop avoids prominent hands. Actual raster assets
  are used; interactive frost/strokes are the specified Canvas2D game layers.
- Copy/content: no answers, template words or guesses in visible/accessibility
  content during play. Five intended labels appear only after drawing ten.
  Demo disclosure, known-link denominator and unknown links are explicit.

## Comparison history and fixes

1. Initial Astra screenshot review: 83/100, minor AI-slop severity. P1 thick white
   edge/amber clearing halo read as a sticker; P1 small instruction/link labels;
   P2 `1 links`. Final ink/edge/clearance narrowed, text enlarged/strengthened,
   singular fixed. `stroke-before-after.png` shows the drawing treatment change.
2. Runtime review: result page inherited the review's scroll position. A phase
   layout effect resets it. Final 360 and 720 results observations report
   `scrollY: 0`; final result screenshots start with heading/disclosure.
3. Real mouse QA: square drawing area needed an affordance. Added empty-state
   boundary and DRAW HERE; no coordinates or inference changed.
4. Astra final actual-image review: 87/100, minor AI-slop severity, earlier P1/P2
   resolved. Its last P2 concerned the retained square boundary crossing the face.
   Boundary/hint now retire after the first pointer stroke, with keyboard focus
   styling preserved. Astra opened both final guide/player screenshots and
   explicitly passed this fix. No remaining actionable P0/P1/P2 visual issue.

## Hard gates and limits

Required copy, subject identity, anatomy in the selected crop, interaction
hierarchy and asset provenance pass the visual gate. No critical or major
AI-slop finding remains. The small amount of smooth anime rendering is a minor
style observation consistent with the supplied reference, not a claim of
human-drawn art. Static images cannot establish enjoyment or physical feel.

Browser checks covered actual five-exchange DAY/NIGHT journeys, pointer drag,
undo/clear, keyboard dot input, naming/skip/reveal, mode persistence, restart,
sound toggle, dialog Escape and real missing-secret API failure/recovery.
No browser console warnings/errors were returned during final checks; expected
HTTP 503 failures were tested deliberately. Reduced-motion/pause details have
automated component/helper evidence. Real device touch and listening balance
remain untested. Genuine recognition and the real itch iframe remain blocked
by missing API configuration/deployment and the required benchmark.
