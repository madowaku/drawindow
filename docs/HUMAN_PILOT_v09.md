# v0.9 human pilot — pending

No people have been tested by this change. Recruit at least **2 independent people**, each drawing all **12 new drawings** (24 first attempts total; 22 recognizable prompts + 2 scribbles). Never fill this report with automated or model-generated results.

1. Start local Vite with prepared bundled ML assets, open `http://localhost:5173/?recognition-benchmark`. A Worker/key is unnecessary. This supersedes the API setup instructions in the historical v0.1 benchmark document. This benchmark's noun/coverage measurement is English; Japanese mapping and actual Japanese five-exchange play need separate observation.
2. Explain: voluntary local test, no image upload, no name/email, closing clears unsaved records. Use P01/P02; do not maintain a real-name lookup. Choose actual device; pointer events record mouse/touch/pen/keyboard. Do not write identifying details in free text. The app cannot detect all personal information automatically.
3. Run ZERO-STROKE CHECK separately. Draw each shown prompt without example art, copying, text labels or import. Keep first result, including failure; no automatic correction. Manual retries are separate and excluded from first-pass metrics.
4. Record human Top1 judgement and reason. Inspect raw Top3 and mark whether the intended object is present. Do not call a merely related category exact; do not treat a homophone as the same meaning. Leave unreviewed as null. Scribble is excluded from noun-match denominator, but its abstention/error/latency is retained.
5. Observe normal game play separately through five exchanges. Mark per-attempt continuation only if actually observed for that attempt; otherwise leave null. Template existence alone is not continuation. Record game completion, fun (1=not enjoyable, 5=very enjoyable), replay yes/no, and a short confusion note in the independent optional fields. Do not infer fun from score or completion.
6. User explicitly clicks Export sanitized JSON and CSV. Save locally under anonymous filenames; no automatic sharing/upload. JSON contains session feedback/model version, CSV contains individual attempts. Exports exclude image, stroke coordinates, raw provider responses and credentials. Reload only after saving, use the next anonymous code.

Report separately: participant/device/input counts; first attempts/12 and human judged count; exact/11; plausible-or-exact/11; Top3 matches and reviewed denominator out of 11; unknown/errors/12; actual continuation successes/observed; game completion; fun responses; replay responses; confusion examples; first-call latency including cold model load versus later calls. Keep per-person results alongside pooled totals. Never turn missing entries into failures or successes, and never merge retries into first attempts.

Acceptance record (blank until humans act):

| Anonymous code | Device/input | First drawings | Top1 exact | Top3 reviewed/matches | Unknown | Actual continuation | Game complete | Fun | Replay | Confusion |
|---|---|---|---|---|---|---|---|---|---|---|
| P01 | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending |
| P02 | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending |

This is exploratory evidence. Decide release readiness after reviewing mistakes and device play, not by inventing a post-hoc numeric cutoff. If later tuning uses these drawings, retain them as development examples and collect a new untouched pilot set.
