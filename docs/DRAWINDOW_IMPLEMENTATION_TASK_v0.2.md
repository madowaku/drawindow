# DRAWINDOW — Micro Jam 067 Implementation Task v0.2

Date: 2026-10-17 (JST)
Status: Implementation-ready task; not a claim that the game has been built.

## 0. North star
DRAWINDOW is a five-exchange picture shiritori game played by a human and a girl through a foggy window. Each side **silently interprets** the other's drawing and draws the next word using the **last alphabetic letter** of their interpretation. **Absolutely no answer checking or naming in the middle of the game.** At the end, the human names their own drawings and sees which links connected and where the interpretations diverged.

The jam theme is WINDOWS; the prerequisite is DAY OR NIGHT. Implement both DAY and NIGHT as selectable visual modes. Keep gameplay parity between them. English UI and English word-chain rules; no story mode or online multiplayer.

## 1. Model orchestration (requested fixed profiles)

- **Astra 6 / Low (`gpt-6-astra`, `low`) — experience director, advisory-only.** One brief pass up front for UX hierarchy, scene mood, tone and scope; one brief pass after screenshots for visual clarity and 'would I replay?' feedback. Do not ask Astra to rewrite the codebase. If feedback entails changing the core concept, ask the user first.
- **Sol 6.1 / XHigh (`gpt-6.1-sol`, `xhigh`) — lead integrator and owner of core design.** Own state machine, recognition boundary, edge cases, score formulas, the integration plan, security/production fallback, bug triage and acceptance signoff. Merge changes and resolve conflicts; do not offload ambiguous architectural decisions unboundedly.
- **Luna 6 / Max (`gpt-6-luna`, `max`) — bounded implementation and test worker.** Implement clearly specified modules with narrow file ownership, run focused tests, report changed files, evidence, remaining issues. Multiple workers only on **disjoint** files and agreed interfaces. Don't use Max on trivial clerical work just for the sake of it: bundle related changes.

Subagents if available: place the included `.codex/agents/*.toml` and merge `.codex/config.toml` into existing configuration. Check model availability and reasoning effort before spawning; report any fallback explicitly. If subagents aren't supported in the client's mode, keep the same assignments as consecutive manual sessions. **Never claim a model ran unless it actually did.**

### Delegation / ownership matrix

| Stage | Owner | Files / deliverable | Gate |
|---|---|---|---|
| A. Experience brief | Astra (read-only) | `docs/UX_DIRECTION.md` recommendation via lead | daytime breathing, night contrast, 360x800 layout approved |
| B. Contract & architecture | Sol | `src/core/types.ts`, `src/core/gameMachine.ts`, `src/core/score.ts`, `src/core/words.ts`, test contracts | deterministic game loop and scoring tests |
| C. Draw/input/fog | Luna worker #1 | `src/components/WindowCanvas*`, `src/lib/strokes*`, `src/lib/fog*` | mouse/touch, responsive, no input loss |
| D. Title/day-night/character/UI | Luna worker #2 | `src/components/Title*`, `src/components/Girl*`, `src/styles/*` | daytime and nighttime visual differentiation |
| E. Word sketches/playback | Luna worker #3 | `src/data/sketches*`, `src/lib/playback*` | reproducible stroke animation and asset attribution |
| F. Vision backend, orchestration & QA | Sol | `functions/` or `worker/`, `src/services/recognizer*`, integration tests | no secrets leaked, no false score, end-to-end works |
| G. Last look | Astra advisory + Sol owner | screenshots and high-impact defects only | ship only when acceptance checklist passes |

Two workers on disjoint directories may run concurrently **only after Sol freezes data contracts**. Parent/Sol integrates serially. Do not allow multiple workers to edit package.json or shared state machine simultaneously. Commit working phases with clear messages. Do not push/deploy without permission if repository destination/access is not established.

## 2. Day / Night (priority change in v0.2)

### DAY
- Day is brighter: soft blue-grey daylight beyond glass, comfortable high-contrast UI, soft shadows.
- Blank frost visually fades comparatively quickly **between turns**. The girl's warm breath visibly renews a patch of condensation just before **each of her drawings** (and as needed to refresh the player drawing surface).
- Breath effect: girl leans forward slightly, a light breath cloud expands radially over 400–750ms, frost opacity ramps up, then she draws. Add subtle sound if audio is enabled; never autoplay loud audio.
- Crucial: **never erase or fade an in-progress drawing**. A finished drawing also remains visible until the other person deliberately proceeds. The daytime dissipation is visual ambience, not a hidden timer or failure condition.
- To move to the player's turn, present `YOUR TURN` once the girl finishes. On press, archive visible strokes, prepare a fresh frost surface and start touch input. This button confirms readiness only; it is **not an answer-check button**.

### NIGHT
- Dark blue exterior, soft warm room lighting on the girl's face, more persistent frost. Girl may breathe on the window at the start; thereafter use a short reset/refog transition without requiring a full repeated breath animation.
- Same drawing capability, prompts, round count, score and lack of time pressure as DAY. Do not secretly increase difficulty.

### Shared glass implementation
- Render girl/background behind the glass. Frost/mask and strokes are distinct visual layers. Use canvas compositing (`destination-out` or equivalent) to make a touched stroke clear the frost and reveal the girl. Keep a **separate neutral high-contrast stroke rendering** for AI inference so the girl's face/background are excluded.
- Store strokes as normalized coordinates (0–1) with pointer-up separation, timestamp, optional pressure. Render at any DPR and size; avoid accidental page scrolling with `touch-action: none` scoped to canvas.
- When the other player's turn begins, the previous drawing is archived and the glass visually refreshes. All strokes remain reviewable in results.
- Settings persistence: mode chosen on TITLE, persists through play and optionally in localStorage. A mode switch must not alter score/word selection.

## 3. Round-by-round contract

- Exactly **five exchanges**, ten drawings total: GIRL-1, PLAYER-1, ... GIRL-5, PLAYER-5; nine adjacency links.
- Start: game has a first predetermined valid girl word, she draws it as strokes. Player sees only drawing, **not intended word**.
- Player views girl's completed drawing as long as needed, taps `YOUR TURN`, draws freely, uses `CLEAR` or `UNDO` if implemented, then taps `DONE`.
- Server recognizer guesses what player's drawing represents. The guess remains secret. The girl chooses a word beginning with the last letter of that genuine guess; animates strokes on the newly fogged window. No 'right/wrong' or guess text during play.
- After the fifth PLAYER drawing, go straight to final review. A fifth recognition is optional **for the reveal** but cannot hold result hostage if API unavailable; flag any unrecognized guess clearly as unknown, not fabricated.
- No midgame hints that name the image. Silent expression changes (pondering/smile) are fine. Don't speak guessed word, show subtitles, or leak answer through accessibility labels while game is active.
- Five exchanges should be playable without a timer or precision input punishment. Goal 3–5min, adjustable based on actual testing.

### State machine
`title -> girl_breath_or_refog -> girl_drawing -> girl_holding -> player_drawing -> recognizing (if more girl rounds) -> ... -> review_intents -> results -> title/again`

If recognition takes time, show the girl thinking and preserve input. A timeout/retry must be bounded; no infinite spinner. In an API failure, show a clear non-spoiler error and offer `TRY AGAIN`, `DEMO MODE` (explicitly marked as not score-comparable), and `BACK`. No false official score in demo mode.

## 4. Image recognition contract

`DrawingRecognizer.recognize(strokesOrImage): Promise<{guess: string | null; alternatives?: string[]; source: 'api'|'mock'; error?: string}>`.

- Backend adapter (prefer Cloudflare Worker due to intended Pages deployment) holds provider key in secret environment variables. Never ship API tokens to client. Rate-limit, check request size and MIME, accept only supported trusted origin, bound calls/timeouts, avoid storing raw user drawings by default.
- Adapter selection via env (`GEMINI` or `JEV`, whichever benchmark works). Do not make the entire game dependent on one vendor or assert Jev image support quality without testing. At least 12 real hand-drawn images as benchmark. Review **plausible interpretation** and latency, not just classification top-1 accuracy.
- Return a simple singular English common-noun guess, normalized to lowercase and last alphabetic character. Validate against bad/empty output. Avoid false numeric confidence unless the model truly supplies a calibrated score.
- AI can misinterpret sincerely; never supply intended word to AI as part of the prompt. Do not silently replace the guess with a word needed to make the chain score higher.
- Word-to-girl drawing selection uses a controlled dictionary with **first-letter coverage** for expected guess endings (including rare letter fallbacks where possible). Log any no-match exception; don't counterfeit correct connections. If uncovered, use an explicit graceful recovery (`can't think of one`, redraw / skip), with score marked non-comparable for affected link, rather than fabricating a guess. Test coverage early.
- Ship only a genuine working recognizer if public scoring is advertised. Otherwise ship a clearly labeled local demo with transparent limits.

## 5. Drawings and lexicon

- Start with about 20–40 polished recognizable drawing templates, expand only if alphabet coverage/flow requires it. Prefer manually selected/reduced Quick, Draw! stroke data over generating pictures on every turn.
- Quick, Draw! Dataset is CC BY 4.0; preserve attribution for included data and document sources. Source raw files may contain timing; preserve useful timing or replay with synthetic per-segment cadence.
- Girl's sketch should look imperfect but legible. Use 0.5–1.5s for most drawings, longer only if helpful. Avoid inconsistent handedness and sudden teleporting brush pointer.
- Don't imply 'perfect recognition' or equate model guess with player's intended meaning.

## 6. Results and scoring: precise semantics

Once all ten drawings exist, the player is invited to label **only their five intended objects** (English noun, free text with optional suggestions) and can skip any label. Do not ask about a girl's intended words during play. Display the girl's intended words only after review starts.

For each adjacent pair `(i, i+1)` from the 10 drawings:
- `connected[i] = lastLetter(intendedWord[i]) === firstLetter(intendedWord[i+1])` **if both intended words are known**.
- Otherwise mark `unknown` and exclude from both numerator and denominator. Never treat unknown as broken or as success.
- `LINK SCORE = connected count / known pair count`, plus display known pair count vs possible nine to be transparent. For a complete play, denominator is 9.
- `BEST CHAIN = maximum number of consecutive connected adjacency links` (not number of images). Unknown breaks the run.
- `PERFECT` requires all 9 known and connected, no demo/fallback or non-comparable links.
- Display an optional separate AI guess on PLAYER drawings, e.g. `you intended FOX / she thought DOG`, but **do not confuse recognition agreement with link score**. A string that happens to start/end with a matching letter does not imply the player understood the drawing correctly.
- For each mismatch, reveal the previous intended word, next intended word and (when known) girl's interpretation; visually show the break. Ensure reveal never leaks prematurely.
- No leaderboard, login, or persistent cloud record for jam MVP. Local `BEST LINK SCORE` may be added if straightforward, only for full comparable sessions.

## 7. User experience and art direction

- Title: `DRAWINDOW`, slogan `Draw your own conclusions.`; shared 'W' motif in `DRAW` + `WINDOW`.
- Girl: one consistent character, 3 expressions `neutral / thinking / smiling`, with breath animation. Character assets may use approved existing assets or newly created images; do not assume any generated art exists until available.
- Art colors: DAY pale cool cyan / ivory; NIGHT deep blue / warm amber; frosted glass milky. Mobile portrait first: 360x800, then 720x1280, desktop adaptive. Game area visible without vertical scrolling; controls must not overlap drawing or browser bottom gestures.
- Main buttons: `YOUR TURN`, `CLEAR`, `DONE`; accessible touch targets, keyboard/mouse fallback, clear focus states, animation reduced-motion support.
- English UI for jam; title and art may retain English. Audio muted by default or controlled via obvious toggle; no autoplay-policy errors.
- One-screen-first. Avoid explanatory text walls. At title, short rules: `Look. Guess. Draw the next word. Never ask what it was.` Add `Start with the last letter of what you THINK you saw.`

## 8. Preferred implementation

- `React + Vite + TypeScript`, browser Canvas2D first; no unnecessary Unity/Godot/WebGL.
- Use `perfect-freehand` **only if it improves feel without disrupting the raw stroke record**; basic Canvas paths are sufficient for jam MVP. Implement frosting with simple canvas mask instead of integrating a large scratchcard library.
- `src/core/*` pure, deterministic and tested. `src/components/*` presentation; `src/lib/*` canvas helpers. Worker backend owns secrets. Build static frontend for itch.io HTML5 upload; if separate API deployed, explicitly test cross-origin requests on the actual jam origin, including iframe embed restrictions and failure paths.
- Avoid WebMCP on the critical gameplay path. It can be a later tooling integration for AI agent testing.
- For multi-agent separation, freeze shared types/interfaces before parallel implementation. Worker agents only edit assigned files. No destructive resetting of other workers' modifications.

## 9. Verification: must pass before marking complete

Functional:
- [ ] DAY selected -> title/play/results retain day lighting; returning/title still works.
- [ ] NIGHT selected -> distinct appearance and identical gameplay.
- [ ] DAY girl performs clear visible breath/refog each of five turns.
- [ ] DAY ambient frost may fade, but neither active nor held drawing vanishes before human advances.
- [ ] NIGHT maintains fog, player can clear strokes to see background.
- [ ] All 10 images are produced, no answers checked or words revealed during play.
- [ ] Every AI response chooses next girl word by guessed final letter OR explicitly records an uncovered-letter exception; never silently falsifies the connection.
- [ ] Final user entry accepts five intended nouns/optional skip, computes 9 possible links and BEST CHAIN correctly.
- [ ] Broken and unknown links differentiated; score never overstated.
- [ ] API timeout, 429, invalid JSON and missing key never create endless spinner or fake success.
- [ ] Mobile touch and mouse work; no scroll interception outside drawing area.
- [ ] 360x800 and 720x1280 layouts, desktop (e.g. 1280x720) pass screenshot and click-through checks.
- [ ] Theme, audio, reduced-motion, error and restart paths work.
- [ ] Tests, build, license/attribution, README deployment notes pass.

Minimum automated tests:
- pure score tests: 9/9, 0/9, disjoint streaks, unknown links, case/whitespace/punctuation normalization and invalid input;
- game machine tests: exactly 5 girl/5 player entries, one `DONE` per player turn, no skipped round, no double API call due to double tap;
- day/night fog timer tests with fake clock: no in-drawing fade; day refog reset; pause/offscreen cleanup;
- recognition adapter tests: valid response, timeout, unexpected output, rate limit, missing API secret;
- browser click-through tests (Playwright if installed): day/night, pointer drawing, result input and resizes. If browser unavailable, explicitly say so instead of reporting it tested.

## 10. Execution gates and delivery

**Gate 0 (Sol):** Inspect repo, report current state; read repo instructions and existing assets. Confirm user-specified models are accessible and agents truly configurable in this runtime. No speculative dependencies.

**Gate 1 (Sol + Astra advice):** Freeze state model/types and concise UI hierarchy. Score examples verified with tests. If no repo, initialize with Vite + React + TS.

**Gate 2 (Luna owned modules):** Draw/fog, day-night visuals, stroke playback and tests in isolated scopes. Sol may implement AI adapter in parallel only if contracts frozen.

**Gate 3 (Sol integration):** End-to-end mock loop first, then real recognizer. Treat mock as development only, never a hidden public substitute. Verify backend and current hosting setup.

**Gate 4 (Astra quick art/UX review; Sol final pass):** Follow up on high-severity feedback only. Record known limits rather than adding features late.

**Submission gate:** Provide `npm run build`, test output, screenshots, instructions for itch.io HTML5 upload, public API configuration (no secrets), attribution/licenses, and clear statement on what was and was not actually tested. Do not claim jam submission unless submitted.

### Priority under 48h limit
P0: complete five exchanges, honest recognition, true non-spoiler result, functioning draw and glass, both day/night modes and daytime breath, acceptable mobile UI.
P1: subtle audio and fluid breathing, better selected doodles, nice transitions.
P2: WebMCP, extra characters, hundreds of words, fancy water droplets, matchmaking, leaderboards, monetization. Cut P2 first.

### Stop / escalation conditions
- If provider unavailable, unknown license, no reasonable image model, or public API needs paid quota: report concrete blocker and options, do not invent access or switch to a covert fake AI.
- If a fix requires changing "no answer checking until results", "five exchanges", or "DAY girl breathes/re-fogs", ask user before changing direction.

## 11. Expected final report format

1. Implemented functions (with file paths)
2. Tests/build evidence, screenshots and tested environments
3. Model assignment actually used (not merely requested)
4. Open defects and mitigations
5. Run/deploy instructions
6. Commit hashes / PR links, if created (never invent)
