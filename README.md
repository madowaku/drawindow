# DRAWINDOW v0.4 local review

v0.4 introduces transparent finger-wiped condensation in the game. The old ink
renderer remains in the development-only `/?glass-preview` comparison. DAY/NIGHT
use identical stroke geometry and the original neutral inference image export.
`/?catalogue-preview` records blind readability observations; add `&review` only
for labelled maker review. The original OWL remains in the production catalogue
until 3–5 blind participants have been observed. `/?character-preview` compares
four new 768×1024 candidates with the approved sprites; the game still uses the
approved artwork. The user-approved glass rendering is ready for source
integration; candidate artwork adoption remains a separate review. No public
deployment has been performed.

For Android on the same Wi-Fi, keep `npm run dev` running and open its **Network**
URL. On 2026-10-18 this is `http://192.168.0.9:5173/`; addresses may change.
Use `/?glass-preview`, `/?catalogue-preview` or `/?character-preview` at that host.
Worker credentials and local backups are denied by the dev server. The local
preview is not a public deployment. See [glass QA](docs/GLASS_FEEL_v0.4.md),
[readability review](docs/READABILITY_v0.4.md) and
[Shizuku candidates](docs/SHIZUKU_QUALITY_v0.4.md).

A quiet five-exchange picture shiritori game through a misted window.
The character now follows [Shizuku Character Sheet v0.2](docs/CHARACTER_SHIZUKU_v0.2.md):
six expressions, a drawing pose, subtle state-driven movement and separate glass.
The five-exchange game uses a deterministic phase/round reaction selector and a
small contact cursor that follows the exact visible stroke interpolation. This
is pose-based illustration, with articulated hand rigging deferred.
DAY/NIGHT share the same character textures. Her name is not shown during play.
The separate production review page is `/?character-preview`; it lets you inspect
all expressions, lighting and motion without playing a full session.
**Current deliverable: an explicitly labelled local DEMO and optional recognition
Worker. One human DAY LIVE session passed the five-exchange flow gate (four real
API responses, nine links independently checked); broader quality, Android and
public LIVE deployment remain unverified. See [the acceptance report](docs/LIVE_5_EXCHANGE_ACCEPTANCE_v0.1.md).**

## Run

```powershell
npm ci
npm run dev
```

Open `http://localhost:5173/`. Select DAY or NIGHT, then PLAY DEMO. The girl
draws first. Think of its English name, tap YOUR TURN, and draw a noun beginning
with the last letter of what you think you saw. DONE sends the picture. Repeat
five times. Only then name your five pictures and reveal all nine links.

Mouse/touch draw in the outlined square. CLEAR and UNDO are available. With the
drawing square focused, arrow keys move the pen, hold Space while using arrows
to draw, or press Enter for a dot. Controls also work with keyboard focus.
Sound starts muted. DAY/NIGHT changes presentation only; there is no timer.
Use the speaker button for BGM and quiet effects: title "物語の幕を" / のる,
DAY "Coral Ambience" / ハヤシユウ, NIGHT "おやすみの時間" / 蒲鉾さちこ.
Starting a game fades from the title track into the chosen mode's recording.
Music pauses while the tab is hidden and resumes when you return.
The chosen mode is stored locally when browser storage is available.

The unconfigured title offers only DEMO; it does not invite a broken live API.
DEMO interpretations are a fixed disclosed simulation, independent of the
picture. They are never labelled as real image recognition or a comparable
score. The fifth drawing goes directly to review without an API dependency.

## Verification and package

```powershell
npm test
npm run build
npm run package:itch
```

The ZIP is written to `artifacts/release/DRAWINDOW-v0.4-itch.zip`, with root
`index.html`, relative asset paths, credits and licenses. Its receipt records
SHA-256 and round-trip extracted-byte parity. The source atlas is excluded.
Packaging rebuilds the static frontend with live-integration flags disabled,
so an existing local API test setting cannot expose an unconfigured live option
in the standalone DEMO ZIP. The protected v0.2 ZIP is retained separately.

For itch.io choose an HTML game, upload the ZIP, enable play in browser and
mobile friendly sizing. Use a responsive portrait container; 360×800 and
720×1280 are primary targets. Result/review screens intentionally scroll.
Live recognition requires a separately configured API endpoint; a ZIP alone
does not deploy a server. No jam submission or public deployment was performed.

## Optional real recognition

For the developer-only human drawing pilot, open
`http://localhost:5173/?recognition-benchmark` while Vite and the local Worker
are running. It uses the saved Worker key without re-entry, sends each picture
once, and exports sanitized JSON/CSV with human judgements and first-pass latency
statistics. See [the 12-drawing procedure](docs/FREEHAND_RECOGNITION_BENCHMARK_v0.1.md).
This page is excluded from production builds. The user supplied the 12-drawing
pilot results; their provenance and limits are recorded in the acceptance report.
For a new local LIVE game with private post-reveal evidence export, open
`http://localhost:5173/?live-acceptance` with `VITE_ENABLE_LIVE_API=true` and the
Worker running. This development-only recorder preserves the normal game rules
and never substitutes automated drawings for a human session.

See [docs/RECOGNITION.md](docs/RECOGNITION.md) for secret binding, exact allowed
origins, rate limits, iframe/CORS verification and the 12-real-drawing benchmark
required before calling this validated live recognition.
For private local key entry, use `npm run setup:gemini`; it writes only the
Git-ignored `.dev.vars` file with masked terminal input. `npm run check:gemini`
reports configuration booleans without printing the key. See
[safe setup instructions](docs/GEMINI_LOCAL_SETUP.md).

For local API development put the provider key in ignored `.dev.vars`, then
run `npm run dev:api` alongside Vite. Never put secrets in `VITE_` variables.
The current default is `gemini-3.5-flash-lite`, configurable on the Worker.
`VITE_RECOGNITION_URL` optionally points to a separate Worker and reveals the
live-mode choice. `VITE_ENABLE_LIVE_API=true` enables the same-origin choice for
local integration testing. The `DrawingRecognizer` interface remains the
exchange point for a Gemini or future Jev adapter. A missing key
returns a real failure; it never becomes a mock without the user's DEMO choice.

After connecting an API, run a complete five-exchange session in live mode using
actual freehand player drawings. Verify genuine API interpretations privately
select each next girl sketch by their last letter, then name the player's five
intentions and inspect all nine links. This is a separate mandatory acceptance
gate; the completed DEMO does not substitute for it.

On restricted Windows profiles, Wrangler's local log/registry paths can be
placed under the project before starting local development:

```powershell
$env:WRANGLER_LOG_PATH = "$PWD\.wrangler\dev.log"
$env:WRANGLER_REGISTRY_PATH = "$PWD\.wrangler\registry"
New-Item -ItemType Directory -Force .wrangler\registry | Out-Null
npm run dev:api
```

## Implementation and evidence

- `src/core/`: deterministic reducer, normalized words and nine-link scoring.
- `src/components/WindowCanvas.tsx` and `src/lib/`: input, frost mask, breath,
  retained strokes, playback and separate neutral inference image.
- `src/data/`: A–Z catalogue, 23 selected Quick Draw samples and 3 original
  rare-letter templates with individual provenance.
- `src/services/` and `worker/`: bounded API/demo adapters, coalesced requests,
  secret-only provider calls, explicit failures and capped retries.
- `docs/ARCHITECTURE.md`: frozen contracts and module ownership.
- `docs/model-receipt.json`: requested model/effort profiles verified from
  this session's actual Codex execution metadata.
- `design-qa.md` and `docs/VERIFICATION.md`: visual comparison, browser checks,
  screenshot paths and remaining evidence gaps.
- `public/CREDITS.txt`, `public/licenses/`, `docs/ASSETS.md`: attribution,
  asset prompt and source/processed provenance. No code license is assigned
  by this implementation.

Automated/synthetic and browser checks establish game flow and regressions;
they do not establish real recognition quality, physical-device touch comfort,
audio listening balance, enjoyment or actual itch.io iframe compatibility.
