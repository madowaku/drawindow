# 132 bilingual doodles: commit verification

Based on origin/integration/drawindow-v07-20261018 at 5b2ffa5b1ceba16e6f415721287c00b6e19ead61. The prior 67-doodle adoption and mobile-scroll fix are preserved. This change adds 65 drawings and includes the requested parrot/grasshopper revisions, provenance, exported SVGs, review images and catalogue tests.

Verified in a separate checkout containing only this change:
- npm test -- --pool=threads --maxWorkers=2 --no-file-parallelism: 37 files, 231 tests pass.
- npm run build: TypeScript and Vite pass; JS 471.37 kB, gzip 154.07 kB.
- git diff --cached --check: pass.
- Diagnostic --no-isolate mode encountered cross-file mock interference in EndingScene and SouvenirSave; both pass when isolated (8 tests). No production changes were made for that diagnostic mode.

The source workspace's 241-test result includes separate uncommitted drawing-history and UX changes. Those changes, LIVE packaging configuration, and unrelated working files are excluded here and retained in that workspace. Browser canvas evidence is saved in artifacts/qa/doodle-expansion-20261022* and artifacts/qa/parrot-grasshopper-revision. Human readability and real LIVE recognition remain unverified.
