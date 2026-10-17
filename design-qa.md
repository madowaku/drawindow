# DRAWINDOW v0.2 visual QA

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
