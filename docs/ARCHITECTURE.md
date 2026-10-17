# DRAWINDOW architecture and frozen interfaces

The React app owns presentation and effects. `src/core` is pure and deterministic. The canvas owns pointer input, frosting and playback; it never chooses words or makes recognition requests. The backend owns provider credentials. The v0.2 implementation task remains the gameplay authority.

## Shared data and ownership

`src/core/types.ts` is the shared contract. `Stroke` is one pointer gesture with normalized `x/y`, drawing-relative `t` in milliseconds and optional pressure. Girl templates use the same strokes. `GirlSketch` contains `id`, secret `word`, `strokes`, and optional `durationMs`. The sketch module exports `girlSketches: readonly GirlSketch[]`; the first template starts every session. A new session resets template usage and uses deterministic catalogue order.

- Lead: `src/core/*`, `src/services/*`, `worker/*`, their tests.
- Canvas worker: `WindowCanvas`, `src/lib/strokes*`, `fog*`, `playback*`, `src/data/sketches*`, focused tests.
- Integrator: React screens, styling, configuration, assets, package metadata and browser QA.

No concurrent package/configuration or core edits. Ask the lead before changing these interfaces.

## Reducer and presentation connection

`src/core/gameMachine.ts` exports `createInitialState(mode?: Mode)`, `initialState`, `gameReducer(state, event)`, `selectVisibleStrokes(state)`, `selectPlayerEntries(state)` and `selectCanFinishDrawing(state)`. React uses `useReducer(gameReducer, initialState)`.

`START { mode, sessionKind, sketches }` appends GIRL-1 and starts `girl_breath`. The loop is:

`girl_breath -> BREATH_DONE -> girl_drawing -> PLAYBACK_DONE -> girl_holding -> YOUR_TURN -> player_drawing -> DONE -> recognizing`.

`STROKES_CHANGED { strokes }`, `CLEAR`, and `UNDO` work only during `player_drawing`. `DONE` requires a nonempty valid drawing, seals the player entry once, and creates one request. A second `DONE` is ignored. GIRL-1, PLAYER-1, ... GIRL-5, PLAYER-5 is the only entry order. PLAYER-5 `DONE` goes straight to `review_intents`, with its AI interpretation left unknown.

On review, `SET_INTENT { entryId, word }` updates only player entries. Empty/invalid labels become unknown; `SHOW_RESULTS` computes the reveal. `RETURN_TO_TITLE` preserves mode and session counter. `SET_MODE` works on title only. A new `START` increments the session counter, so a previous session's result cannot match a new request.

Canvas props are exactly `WindowCanvasProps`: `{ mode, phase, strokes, onStrokesChange, onBreathDone, onPlaybackDone, reducedMotion, expression? }`. `selectVisibleStrokes` supplies the current girl template during playback/holding and the player's preserved drawing during input/recognition/error. Breath returns a blank surface. Every girl turn runs `girl_breath`: DAY uses a visible breath, NIGHT may implement a short refog. Animation callbacks must clean up on phase change/unmount and run once, including reduced-motion mode. Held and active drawings do not dissipate.

During active phases the app must not render intended words, guessed words, alternatives, template IDs, revealing image labels, or answer hints. Neutral canvas/accessibility copy such as “Drawing on the window” is safe. Word data is available only for orchestration and final review/reveal.

## Recognition boundary and failure recovery

`DrawingRecognizer.recognize({ requestId, strokes, imageDataUrl? }, { signal? })` returns `{ guess, source: 'api' | 'mock', alternatives?, error?, errorCode? }`. Failure always has `guess: null` and an explicit error; an API adapter never substitutes a mock. The inference image is neutral black-on-white PNG and excludes girl/background/frost. The adapter receives no intended label or desired next letter.

`RecognitionRequest` adds `round`, `attempt`, `playerEntryId`, and `sessionKind`. Request IDs are deterministic `session:round:sequence` values; the sequence never resets within one session, including when a sealed drawing is reopened. `attempt` separately counts the current drawing's original call and at most two retries. `src/services/recognizer.ts` exports `createApiRecognizer(options?)`, `createDemoRecognizer()`, and `createRecognitionRunner(recognizer, options?)`. The runner exposes `recognize(input)` and coalesces/cache-reuses identical request IDs, including React StrictMode effect re-entry. A retry gets a new request ID. Abort stops observing an obsolete request; stale/double completion is also rejected by the reducer.

App effect: observe `state.recognitionRequest`, choose the API/demo runner from `request.sessionKind`, call it, then dispatch `RECOGNITION_RESOLVED { requestId, result }`. Do not dispatch extra `DONE` or synthesize a result in the UI. Runner errors are converted into explicit failure results. The reducer accepts a response only while `recognizing` and only for the exact active ID. Adapter timeout and retry count are bounded.

On a genuine valid guess, `lastLetter(guess)` selects the first unused girl template with the matching first letter; reuse the first matching template after exhausting unused matches. No matching template creates an explicit `uncovered_letter` error, retaining the genuine interpretation. It does not select a falsely connected replacement.

`RETRY_RECOGNITION` retries the same sealed drawing with a new ID while retryable. `USE_DEMO` explicitly switches the whole session to demo and makes a new mock request. `BACK_TO_DRAWING` removes only the last sealed player entry and restores its strokes for editing; its obsolete request can never apply. Demo/mock participation makes the session non-comparable. Errors show non-spoiler copy, never raw provider text.

## Words and score

`src/core/words.ts` exports `normalizeWord(value)`, `firstLetter(value)`, `lastLetter(value)`, and `selectGirlSketch(sketches, requiredFirstLetter, usedTemplateIds?)`. Words are lowercase English nouns; surrounding whitespace and punctuation are stripped, alphabetic boundaries determine chain letters, and empty/non-word input is unknown. No numerical confidence is invented.

`src/core/score.ts` exports `calculateScore(entries, sessionKind?: SessionKind): ScoreResult`. It always describes nine possible adjacency slots. A slot is connected/broken only when both intended words are known; unknown is excluded from numerator and denominator and breaks a streak. `linkScore` is connected/known or `null` when no known pairs exist. `bestChain` counts connected links. A complete comparable session has ten alternating entries, all entries comparable, and API session kind. `perfect` additionally requires 9/9 known connected links. Guess agreement is separate reveal information and never changes intended-word link scoring.

## Backend and evidence limits

The frontend defaults to a visibly labeled local demo until a configured API passes a genuine image benchmark. The Worker checks trusted Origin, JSON/content type, body size, bounded normalized stroke/image input, rate limits, and a provider timeout. Secrets exist only in Worker bindings. Missing credentials, invalid provider responses, HTTP 429 and timeouts are explicit failures. No drawings are stored by default. Hosting/deployment and paid quota require established user authorization.

Pure core tests cover scoring, exactly five exchanges, double DONE, retries, stale responses, unknown labels and uncovered letters. Adapter tests cover success and explicit failures. Canvas tests cover input/playback/fog timing; browser checks cover DAY/NIGHT, draw/retry/review/restart, 360×800, 720×1280 and desktop. Synthetic tests do not establish genuine recognition quality, physical touch comfort or enjoyment.
