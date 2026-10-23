> Historical source-worktree report. Current integration and verification: [repository consolidation](REPOSITORY_CONSOLIDATION_20261022.md). Deployment statements below describe that earlier task only.

# DRAWINDOW v0.7 LIVE — 2026-10-18

Upload `artifacts/release/DRAWINDOW-v0.7-live-itch.zip` as the itch.io HTML/browser game. Root index.html, relative asset URLs, credits and licenses are included. Use a portrait/responsive embed (360×800 minimum layout target), enable mobile support and fullscreen. The game page is https://madowaku.itch.io/drawindow; no itch upload or publication was performed in this task.

Integrated Japanese/English, DAY/NIGHT, approved seven A character sprites, 67 adopted original doodles, three-act ending and local 1200×3000 souvenir PNG. Production excludes all development galleries and unused candidate art. LIVE is selected by default; an explicit DEMO option remains. API failures never silently substitute simulated recognition.

## Public API

- Endpoint: https://drawindow-api.cacao-ixora-coccinea.workers.dev/api/recognize
- Worker: drawindow-api; model: gemini-3.5-flash-lite.
- Saved Gemini key registered as a Worker secret with owner permission; never embedded in the ZIP.
- Allowed origins: https://html-classic.itch.zone, https://html.itch.zone, https://madowaku.itch.io. CDN hosts follow the [itch administrator announcement](https://itch.io/t/3099694/notice-for-html-game-devs-upcoming-change-to-cdn-domain), not observation of this game's iframe. Confirm the actual iframe after upload.
- Existing limit: 12 requests/minute/IP. This is not a global spending cap. Provider account quota/billing settings apply; no billing plan or budget was changed.

## Evidence

- Baseline suite: 229 tests / 37 files passed. After release changes, Page/App/Worker affected suite: 44 tests passed. TypeScript and production build passed.
- Public API: two actual provider calls with a synthetic catalogue house drawing: English `house` (2258 ms), Japanese `いえ` (1763 ms), both HTTP 200 / source api.
- Both itch CDN preflights: HTTP 204; untrusted origin: HTTP 403. Evidence: artifacts/qa/release-v07/live-api.json.
- ZIP: 33 files; 13,078,090 bytes; root index and extracted-byte parity checked; saved-key scan passed; development review markers absent.
- SHA-256: 172ced0100b90d0a6b312163f93b464ef2cc21ab8704c055d55353aff3264471

Actual itch iframe, real-player Japanese LIVE acceptance, integrated physical-device saving/audio/comfort remain separate unverified gates. The game page showed Page not found to a signed-out browser at packaging time. Automated catalogue requests are not human playtesting.

## Rebuild

Set VITE_RECOGNITION_URL to the public endpoint above, then run `npm run package:itch:live`. Run `node scripts/verify-archive.mjs` to preview the exact extracted ZIP. `npm run package:itch` produces a separately named DEMO package.
