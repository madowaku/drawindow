# DRAWINDOW v0.2

A quiet five-exchange picture shiritori game through a misted window.
**Current deliverable: a complete, explicitly labelled local DEMO, plus an
implemented optional recognition Worker. Real API quality has not been validated.**

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

The ZIP is written to `artifacts/release/DRAWINDOW-v0.2-itch.zip`, with root
`index.html`, relative asset paths, credits and licenses. Its receipt records
SHA-256 and round-trip extracted-byte parity. The source atlas is excluded.

For itch.io choose an HTML game, upload the ZIP, enable play in browser and
mobile friendly sizing. Use a responsive portrait container; 360×800 and
720×1280 are primary targets. Result/review screens intentionally scroll.
Live recognition requires a separately configured API endpoint; a ZIP alone
does not deploy a server. No jam submission or public deployment was performed.

## Optional real recognition

See [docs/RECOGNITION.md](docs/RECOGNITION.md) for secret binding, exact allowed
origins, rate limits, iframe/CORS verification and the 12-real-drawing benchmark
required before calling this validated live recognition.

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
