> Historical source-worktree report. Current integration and verification: [repository consolidation](REPOSITORY_CONSOLIDATION_20261022.md). Deployment statements below describe that earlier task only.

# Mobile iframe scrolling — v0.7.1 / 2026-10-19 JST

The published game iframe was observed with `scrolling="no"` at https://madowaku.itch.io/drawindow (upload 19848789). The previous build relied on document scrolling. A mobile title or long naming/results page could extend beyond the iframe without a reachable navigation control.

The game now owns a viewport-height `.app` scroll container. Page/iframe scrolling options do not disable this inner container. Important screen transitions reset its scroll position. The drawing surface keeps its own `touch-action:none` so drawing does not move the page; swipe outside the drawing square to scroll. A minimum drawing height prevents the footer from overlapping it in short viewports. Mobile footer clearance and side safe areas protect controls. Android browsers that support `interactive-widget=resizes-content` resize for the keyboard; other browsers retain their native focused-input behavior.

## itch.io settings

Replace the browser-playable upload with **DRAWINDOW-v0.7.1-live-itch.zip** (keep the browser-play checkbox enabled). Save the edit page and reload the game fully.

| Setting | Value |
| --- | --- |
| Launch mode | Embed in page / ページに埋め込み |
| Sizing | Manually set size |
| Width × height | 640 × 900 px |
| Mobile friendly / モバイル対応 | ON |
| Orientation | Portrait / 縦向き preferred; Default also supported |
| Automatically start on page load | OFF |
| Fullscreen button / 全画面ボタン | ON |
| Enable scrollbars / スクロールバー有効化 | ON |
| SharedArrayBuffer support | OFF |

The [official itch HTML5 guide](https://itch.io/docs/creators/html5) says mobile-friendly games launch fullscreen on phones regardless of desktop embed sizing. Increasing 640×900 alone will not solve phone scrolling. Scrollbars permit iframe document scrolling; the new build also has its independent inner scroller. No fullscreen or orientation lock is required to play.

## Verification

- TypeScript / Vite production build and ZIP round-trip byte equality passed. Earlier affected App/Page run: 21 tests passed; after adding the scroll-transition regression, all 8 App tests passed.
- A local sandboxed iframe with `scrolling="no"` reproduced the published embedding constraint. At 360×640, the new game scrolled internally to the title action. At 320×480, a synthetic keyboard-dot DEMO completed five Japanese DAY exchanges, UNDO/CLEAR, naming and reveal. Results scrolled to 2821 / 3301 px, showing 10 drawings and nine links.
- Naming input remained visible in a 320×280 resized viewport (keyboard-size simulation; no real OS keyboard). All six layout sizes 320×568, 360×640, 390×844, 640×900, 844×390 and 1280×800 showed 10 result drawings, no horizontal overflow and no missing images. Souvenir PNG preview creation also passed.
- Exact extracted LIVE ZIP: default LIVE title shown and inner scrolling worked in a no-scroll iframe. An explicitly selected English NIGHT DEMO completed five exchanges through naming/reveal, then reached results bottom at scroll 2643 in a 640px-high viewport, 10 drawings and nine links. Production API configuration is retained. No provider requests were needed for this layout QA.
- Receipt and measurements: `artifacts/qa/mobile-scroll-v071/report.json`. SHA-256: `960035db6fcf3dda6a6bf465eb42f4d3558be0b2faa1404257d194f10c81b455`.

This task does not upload to itch.io. The live page still needs its upload replaced. Real phone swipes, OS keyboard, Safari and on-device image saving remain physical-device checks; browser automation is not human playtesting.

The public description still says scripted DEMO / recognition in development, while the currently uploaded title defaults to LIVE. Update that copy when replacing the upload so it describes the actual build.
