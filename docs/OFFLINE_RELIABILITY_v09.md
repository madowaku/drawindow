# Offline reliability for v0.9 local lab

This is an experimental browser install. A successful check says that the current edition's complete cache exists now; it cannot promise that the browser will retain it. Browser settings, quota pressure, private browsing, eviction and uninstall can remove it.

## Readiness and edition identity

`package-offline.mjs` stamps `index.html` with a build fingerprint and generates a worker containing the exact asset list and SHA-256 hashes. The fingerprint uses the pre-stamp HTML to avoid a circular hash; the final stamped HTML is included in the installation integrity check.

Installation uses Cache.addAll's atomic batch and then hashes every response, including model, runtime, art and music. Failed download, hash mismatch or quota rejection removes the newly created edition cache and leaves prior edition caches alone. The active worker must answer a read-only MessageChannel request with the expected edition and report every required response present and successful before this page displays saved status. The check reads response metadata, not model/music bytes. Hashing occurs at install, not on each title render. This detects missing/evicted entries and caches, not arbitrary byte corruption after installation.

The title checks after registration, control changes, return to the foreground, network recovery and once per visible minute. A missing marker, old worker without the protocol, edition mismatch, timeout or incomplete cache never reports Ready. A failed installing update stays failed even if an older worker can still answer. Retry registers again without unregistering the active worker or clearing saved data. If storage was evicted from an otherwise unchanged edition, a complete repair may require reconnecting and clearing this site's storage/reinstalling; retry does not claim to reconstruct missing assets automatically.

## Updates and ongoing games

There is no skipWaiting command. First installation may claim its loading page after all assets verify. An update waits for all clients using the previous worker to close. The UI asks the player to finish, close every game tab and reopen; a page does not activate it on their behalf. Update activation does not claim already open clients.

Prior edition caches are deliberately retained. This protects requests from an old session and preserves the previous installation after a failed update. The tradeoff is additional storage for each edition, which can increase quota pressure. There is no automatic eviction policy yet: site-storage removal clears every edition, requiring a connected reinstall. Users should not clear storage during a game. Normal updates in browsers with lifecycle behavior different from Chromium remain a device acceptance gate.

The worker returns only its own bundled same-origin resources and returns a network error for an unknown or external resource. It never forwards an API request. Distribution inspection additionally rejects known credential formats, private configuration filenames, embedded recognition/API endpoints, literal external runtime calls/imports, remote HTML/CSS resources and remote runtime configuration in emitted JS/CSS/HTML/manifest files. It examines distribution files, not source-code conditionals or arbitrary size thresholds. License and provenance documents are excluded to avoid treating attribution URLs as requests. This is a deterministic regression guard, not a proof that arbitrary encoded or dynamically constructed secrets/URLs can be discovered; the real offline browser test also asserts no external requests or POSTs.

## Automated evidence

- `node --test scripts/offline-integrity.test.mjs`: generated worker installation integrity, failed install and corrupt response cleanup, preservation of previous caches, initial claim vs update behavior, missing entries/full eviction, fail-closed resources; scanner canaries for credentials, API endpoints and external dependencies, and attribution exclusions.
- `npm test -- --maxWorkers=2`: OfflineStatus tests cover control alone, old edition, incomplete contents, foreground recheck, failed update and retry, waiting update, registration rejection, missing edition marker and verification timeout.
- `node scripts/qa-offline-lifecycle.mjs`: real Chromium with small deterministic fixture resources tests first install, failed update, two tabs keeping the old worker, natural activation after both close and missing-entry detection. This proves lifecycle behavior, not recognition quality or model performance.
- `npm run package:offline`: typecheck, build, complete content receipt and runtime distribution scan before ZIP creation. Output stays in ignored `artifacts/release/`; it is not a publication step.
- `node scripts/scan-offline-dist.mjs dist`: independent CI inspection of generated runtime.
- `node scripts/qa-offline-cold-start.mjs`: full bundled edition, page close/reopen within one browser context with network disabled, model inference, music decoding, English/Japanese DAY/NIGHT paths and local PNG output. Synthetic drawings prove pipeline execution only.

CI runs the node regressions, builds/scans the lab ZIP, installs Chromium, runs lifecycle and full distribution browser checks, then uploads ignored lab artifacts. Existing sale packages and approved image/music sources are not edited.

## Manual acceptance still required

1. First connected installation on target Android/browser: keep the title open until saved, then enable airplane mode and reopen from the installed launcher. Verify model, music and PNG save in that environment.
2. Fully stop the browser process, then relaunch offline; repeat after a device restart. Automated page reopen in one context does not cover either case.
3. Exercise browser-specific low quota, quota rejection, site-data eviction and partial asset removal; verify the status after returning to the title, then a connected reinstall. VM-injected errors prove code branches, not actual OS/browser quota policy.
4. During a real five-exchange game install an update with another tab open. Finish without assets changing, close all tabs, reopen and verify the new edition. Chromium fixture checks do not replace this on Android or Safari.
5. Check private browsing, storage-clear behavior and operating-system app cleanup. Explain that cleared data needs a connected reinstall.
6. Human drawing recognition quality, comfort, repeatability and enjoyment require human play. No synthetic/offline automation substitutes for that acceptance.
