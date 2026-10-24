# v0.10 context recognition synthetic regression

Run `node scripts/report-context-recognition.mjs` from repository root.

These 20 cases use fabricated complete 345-class score vectors. No human drawings or historical images/strokes are available in this report. Scores and bonus values are uncalibrated model values, never probabilities. Counts describe only these constructed cases and cannot estimate human accuracy, enjoyment or replay intent.

A uses the shared unchanged production decoder. B prioritizes the first context match in Top-10 at or above .05. C defaults to gap mode, Top-3, maximum gap .08 and strength .04; bonus cases are labelled. Configurable C settings have hard ceilings of rank 5, gap .08 and strength .08. Unknown A, invalid full-frame output, invalid context and terminal Japanese ん are preserved. Gap strength is the allowed score gap within the independent maximum-gap guard. Bonus strength is added only within that guard and must beat the original leader; adjusted ties retain the leader.

Exact semantic evaluation compares only a valid explicit intended model class. Out-of-vocabulary intent stays unscored for class accuracy and separately records abstention versus false-known output. Reading agreement is separate; 花/鼻 can have equal readings and different classes. A missing or invalid intended class stays unevaluated. Perceived previous-word agreement is reading agreement only.

Lexical continuation checks the previous formal word's ending against the selected word's beginning. Template existence checks the selected word's ending against the supplied safe/soft catalogue, excluding Japanese terminal-ん replies as production does. Neither is observed play continuation; these fixtures contain no actual observation. Benefits and harms relative to A are counted separately in JSON.

| Case | A | B | C | B vs A | C vs A |
|---|---|---|---|---|---|
| en-help | cat | tree | tree | benefit | benefit |
| en-previous-misread | grapes | tree | tree | harm | harm |
| en-chain-mistake | cat | tree | tree | harm | harm |
| en-outside-vocabulary | cat | tree | tree | unevaluated | unevaluated |
| en-destroy-clear-correct | cat | tree | cat | harm | unchanged |
| ja-help | くま | いぬ | いぬ | benefit | benefit |
| ja-previous-misread | うさぎ | いぬ | いぬ | harm | harm |
| ja-chain-mistake | ねこ | いぬ | いぬ | harm | harm |
| ja-outside-vocabulary | ねこ | いぬ | いぬ | unevaluated | unevaluated |
| ja-destroy-clear-correct | ねこ | いぬ | ねこ | harm | unchanged |
| ja-unmapped | unknown | unknown | unknown | unevaluated | unevaluated |
| ja-terminal | ねこ | ねこ | ねこ | unchanged | unchanged |
| en-tie | cat | tree | tree | unevaluated | unevaluated |
| en-bonus-tie | cat | tree | cat | unevaluated | unevaluated |
| en-bonus-close | cat | tree | tree | unevaluated | unevaluated |
| en-low-score | unknown | unknown | unknown | unevaluated | unevaluated |
| en-outside-vocabulary-abstain | unknown | unknown | unknown | unevaluated | unevaluated |
| en-nonfinite | unknown | unknown | unknown | unevaluated | unevaluated |
| en-label-mismatch | unknown | unknown | unknown | unevaluated | unevaluated |
| ja-homophone | はな | はな | はな | unchanged | unchanged |

The JSON contains complete sanitized rankings, words, scores, context matches, selected original ranks, reasons, settings and separate evaluation fields. Runtime JSON/CSV exports project an explicit field allowlist and contain no image/stroke data. Correction timings are zeroed only in this deterministic report; runtime timings are recorded separately from inference. Model label snapshot SHA-256: `2ed0dac4ba018854a3e3166f9862e5529bc5f58a80d157d57eee22ca731895d5`.

## Same-vector C preset grid

Every preset below uses the identical 20 input vectors and post-result annotations, overriding per-fixture C settings. All use maxRank 3 and maxGap .08. Strength zero disables C correction in both variants, including score ties, so it is an image-only control. Each count is a property of these deliberately biased constructed fixtures, not a human accuracy estimate. Exact class denominators exclude OOV and unspecified classes; OOV abstention/false-known counts remain separate in JSON. No raw ranking is repeated per grid preset.

| Variant | Strength | Benefit | Harm | Unchanged | Unevaluated | Unknown | Lexical links | Exact evaluated |
|---|---|---|---|---|---|---|---|---|
| gap | 0 | 0 | 0 | 10 | 10 | 5 | 1 | 10 |
| gap | 0.02 | 2 | 4 | 4 | 10 | 5 | 11 | 10 |
| gap | 0.04 | 2 | 4 | 4 | 10 | 5 | 11 | 10 |
| gap | 0.08 | 2 | 4 | 4 | 10 | 5 | 12 | 10 |
| bonus | 0 | 0 | 0 | 10 | 10 | 5 | 1 | 10 |
| bonus | 0.02 | 0 | 0 | 10 | 10 | 5 | 2 | 10 |
| bonus | 0.04 | 2 | 4 | 4 | 10 | 5 | 11 | 10 |
| bonus | 0.08 | 2 | 4 | 4 | 10 | 5 | 12 | 10 |
