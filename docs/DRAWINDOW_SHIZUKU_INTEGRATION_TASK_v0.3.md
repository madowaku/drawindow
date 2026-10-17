DRAWINDOW v0.3 — Shizuku in the Game
Codex Implementation Task / 2026-10-17
Purpose: Move beyond the stand-alone Shizuku character preview into a credible, expressive five-exchange game. Preserve the central rule: each side silently interprets the previous picture; no checking or revealing target nouns, guesses or correctness until the result. Do not secretly fake AI recognition.
0. Start by reconciling local and GitHub states
Important: As of this audit, GitHub main for madowaku/drawindow remains 5a5430cd9ac91cd1c87c2adebf3b49a538fdc099, whose src/App.tsx has a three-expression implementation (neutral, thinking, smiling). The user has separately demonstrated a newer local implementation with 77 tests, seven expressions/poses (neutral, thinking, smile, shy, breath, curious, drawing), day/night preview, and 2D character motion; this local version has not been verified on GitHub.
1. Check git status --short, git log -5 --oneline, branch/upstream, and compare with origin/main. Preserve all newer local uncommitted work.
2. Build on the newest local tested version, not the older remote snapshot. Do not git reset --hard, overwrite fresh sprite assets, or pull destructively.
3. Commit local stable work before integration if appropriate and push it after a successful QA gate, provided this is already the user's established repository workflow. Never force-push.
4. Verify all 7 sprite files really exist, are referenced by correct paths, have valid alpha transparency or intentional scene backgrounds, and are licensed/provenanced. Missing alpha must not be represented as transparent: inspect actual PNG/WebP pixel alpha and make it a task to correct assets without damaging fine hair edges.
5. Confirm latest local test count and browser behavior independently. Don't treat the reported 77-test count as the result of tests you did not run.
1. Non-negotiable game principles
- Exactly 5 rounds of girl -> player, 10 drawings and 9 adjacent links.
- Each participant interprets the other's drawing silently; never show words, guesses, interpretation confidence, labels, error 'correct/incorrect' or score before the final result. Girl's facial reactions cannot indicate whether the player's intent matches her guess: she does not know the user's intent.
- Day and night are atmospheric choices, not separate difficulties. Day girl breathes to re-fog before each of her turns; no active or held drawing fades before the user advances.
- The final score reflects intended adjacent words, not the model's confidence. DEMO is explicitly non-comparable and recognizer mock results are identified as simulated.
- If recognition fails, keep the drawing and present retry/redraw/explicit DEMO choice, never silent fallback.
2. P0 Character reaction integration
Behavior specification / game-phase binding
Phase/event	Shizuku pose/expression	Movement	Important caveat
title	neutral or shy	slight idle breathing and rare blink	don't distract from START
girl_breath / Day	breath	lean forward 8–14px visually, exhale in 0.5–0.9s	fog grows on glass layer, not baked into sprite; every girl turn
girl_breath / Night	neutral/breath optional	quick refog, subdued motion	same duration/game behavior
girl_drawing	drawing	finger follows visible stroke tip or hand overlay tracks it	must not change actual stroke coordinates
girl_holding	neutral, sometimes smile	glance from drawing to player, idle blink	do not signal if drawing is correctly interpreted
player_drawing	neutral/curious	watch finger, mild head tilt at most	don't obscure user's drawing
recognizing	thinking	brief hesitation, eyebrow/eye movement	think pose is NOT correctness feedback
recognition_error	concerned neutral	restrained reaction	actionable error belongs to UI
review_intents	neutral	gentle idle, no eager revealing	user labels five drawings
results	smile/shy based on general atmosphere or review completion	restrained conclusion beat	only after final reveal may score-conditioned reward apply


Use a deterministic getShizukuReaction({phase, mode, round, reducedMotion, ...}) pure selector or equivalent, not a second uncoordinated timing state machine. Expressive random micro-variations (blink/look) are cosmetic only; avoid rerolling on every render. Match existing phase reducer; do not rewrite reducer just to trigger animation.
Sprite registration and consistency
- Keep 7 poses in a typed manifest including id, src, anchor (face or eyes), handTipAnchor only for drawing, fallback, and optional render width. Use existing local preview assets and names; do not hard-code old file assumptions.
- Normalize pose alignment by measuring a stable feature such as eye midpoint/shoulder placement; align within ~4px on a 360px viewport for front-facing expressions, so switching expressions does not jump.
- Different head orientations (breath, drawing) can use a deliberate 0.15–0.30s transition or short pose cut rather than pretending they share an identical eye anchor.
- Fix broken img references (the earlier play screenshot showed a broken her side image): use production relative paths and verified fallback instead of blank/broken icons.
- Do not add narration/dialogue during the five exchanges.
3. P0 Sync visible drawing with Shizuku's fingertip
Current remote architecture: src/App.tsx renders the girl art behind <WindowCanvas>; src/components/WindowCanvas.tsx uses src/lib/playback.ts strokesAtProgress(...) to reveal the registered strokes on a separate canvas and src/lib/fog.ts to update frost. The local version may differ; inspect first.
- Provide a pure helper to obtain the current visible brush tip from (strokes, progress) based on the exact same playback interpolation used for the stroke reveal. For lifts between stroke groups, hide or lift the finger rather than drawing a connecting line.
- Render a lightweight foreground hand/fingertip overlay using the pose/hand layer if it exists. If only a full-body drawing sprite exists, keep Shizuku mostly stationary and animate a small separate cursor/glow near the stroke tip, instead of moving her entire face/body all over the drawing area. The finger/pointing hand should clearly appear as belonging to the girl, not the player's pointer.
- Convert normalized drawing coordinates to the visible square's CSS pixels using the same layout.left/top/size transform as the drawing canvas. Resize/HiDPI/mode switches must not desynchronize tip and line.
- Update overlay position with requestAnimationFrame or CSS transforms and avoid rerendering the entire application at every point/time step.
- Avoid clipping/finger covering more than necessary; keep line visibility and input responsive on narrow mobile screens.
- If accurate hand registration is too costly for the jam, prefer honest simple stroke cursor + body micro-movement to fake or misaligned limb animation. Mark precise skeletal motion as deferred.
4. P0 Game screen clarity and feel
- Preserve the existing DAY/NIGHT lighting theme, fog compositing and non-fading strokes. Girl's base image must remain behind the frost, strokes visible as clear paths with enough contrast, and interface controls above but outside drawing hit-area.
- Test 360x800, 720x1280, 1280x720, and both DAY/NIGHT. Results/review may scroll; primary drawing screen should not require vertical page scrolling.
- User's drawn stroke must stay sharp over girl art. AI inference image remains neutral black-on-white (never capture girl or glass background).
- No accidental pointer interception by girl's sprite layer (CSS pointer-events: none) and avoid touch scrolling on the canvas only (touch-action: none).
- Reduced-motion means near-instant transitions while still making every game state clear, no forced animations. Pause/cancel motion cleanly when document becomes hidden.
- Optional short sound on breath/draw only when audio is enabled, never misleading hit/miss sounds.
5. P1 Genuine image recognition gate
Only after P0 behavior stabilizes:
- Inspect worker/ and docs/RECOGNITION.md; do not need a new API provider abstraction if existing DrawingRecognizer is sufficient.
- Ask user only for the API key to be entered privately in local .dev.vars / deployed Worker secret, NEVER in this chat, screenshot, VITE_ env, or repo. Do not ask user to paste it in conversational text.
- Choose existing Gemini adapter first, compare Jev only if time/keys allow. Benchmark >=12 genuine freehand doodles by multiple drawing styles, including ambiguity/empty input. Record expected human interpretation separately and latency; AI may sincerely misinterpret, which is part of the game.
- Run one complete LIVE 5-exchange session (4 actual intermediate recognitions; 5th recognition optional and must not block results) with no midgame leaked answers; confirm lastLetter(AI guess) matches firstLetter(next girl target) and 9 intended-word links are scored honestly. Distinguish demo and live clearly in UI.
- Confirm Worker secrets, CORS on actual iframe origin, bounded budgets/rates and graceful 429 / timeout / bad JSON behavior.
6. Playtest gate and hypothesis
After the visual integration, have one naive player try one uninterrupted 3–5 minute DEMO play without explaining the UI. Record:
- Did they understand the last-letter rule?
- Did they notice Shizuku silently interpreting their drawing (not correcting it)?
- Was the drawing space clear enough despite her portrait?
- Did her gesture feel synchronized with strokes or mechanically disconnected?
- Did 6/9-type final summary feel meaningful and invite replay?
- When it wasn't obvious, classify the issue as rule / perception / control / motivation; fix one cause at a time.
7. Tests and acceptance
Add/regress tests for:
1. all 7 expressions map to accessible assets or deliberate documented fallbacks (no broken icon);
2. all phases get a valid reaction, without correctness leak;
3. day girl breathes 5 times in a complete 5-round session; never erases currently viewed strokes;
4. brush tip position agrees with stroke playback at begin/middle/end and across stroke lifts;
5. no duplicate turn/animation callback; no stuck spinner or timer leaks on resize, tab hide, reduced motion;
6. DEMO and LIVE never silently interchange; no non-comparable session labeled as comparable;
7. mobile pointer input still works and girl overlay doesn't steal input;
8. screenshot compare phase changes on mobile/desktop with real backgrounds and no missing image assets.
Do npm test, npm run build, npm run package:itch. Run Playwright browser smoke checks if available; explicitly report if unavailable. Update docs/VERIFICATION.md, docs/ASSETS.md as needed, and make an accurate report of changes/tests + the open API/live-device gaps.
8. Model routing requested by user
- Sol 6.1 / XHigh: lead. Inspect local/remote state, lock interface, decide brush-tip implementation, own reducer correctness, recognition gate, integration and signoff.
- Luna 6 / Max: implement bounded typed manifest/reaction selection, brush-tip helper and minimal overlay/animation, and focused tests in assigned disjoint files. May use narrower effort for trivial asset path edits rather than wasting Max effort.
- Astra 6 / Low: brief visual/game-feel review on screenshots after P0 implementation: readability, atmosphere, character feel. Read-only; no broad feature creep.
- Confirm actual model profiles are available; if subagent mode unavailable, run the roles sequentially and report fallback honestly. Do not report that a model was used unless execution records establish it.
9. Stop conditions / no scope creep
- Do not add dialogue, scoring gameplay rewards, romance routes, voice acting or additional characters this jam.
- If fixed art cannot produce exact articulated finger motion, use cursor overlay and report the limitation rather than undertaking costly character rigging.
- Do not change core game rules, 5 exchanges, no-check-until-results or Day breath without asking first.
- Do not call the v0.3 build live-ready before genuine AI and Android touch acceptance is completed.
10. Expected final report
1. Current branch+commit, local vs GitHub diff reconciled.
2. File changes, features implemented, screenshot paths.
3. Actual model delegation, test/build/package outputs.
4. Game 5-exchange smoke test DAY and NIGHT.
5. Explicit status: DEMO ready? LIVE tested? Android device tested? itch.io iframe tested?
6. Known blockers, next smallest action.