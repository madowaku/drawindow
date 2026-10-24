# v0.9 recognition evaluation

2026-10-24. Developer inspection and automated fixtures only. Independent human pilot: **not performed**. Previous 30/32 Shizuku-art result is a curated artwork check, not independent accuracy or fun evidence. No threshold, class mapping, raster width or gameplay change was made for this evaluation.

## Input and training contract

Runtime `quickDrawPreprocess.ts` takes normalized pointer strokes, validates bounds/count, crops to a bounding square while preserving aspect ratio, centers, pads 2.5 output pixels and rasterizes at 4× before averaging to float32 28×28×1. Background is 0; strokes approach 1. Tiny drawings (span < .015), fewer than 2 points, >16000 points or >256 strokes are rejected. Pressure/timing do not enter inference.

The [upstream notebook](https://github.com/KashifKhn/quickdraw-345-classifier/blob/main/notebook.ipynb) was read directly on this date: it loads Google numpy bitmaps, reshapes, casts and divides by 255; augmentation fills with 0. A range read of the [first official cat numpy bitmap](https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap/cat.npy) found corner=0, min=0, max=255, 525/784 zero pixels. This supports training polarity. The [model card](https://huggingface.co/zarqankhn/quickdraw-345-tflite) describes opposite polarity; keep that discrepancy visible. The existing source mentions train.py, but today's upstream tree exposes notebook.ipynb instead. Centering, padding, antialiasing and stroke width are approximations, **not proven pixel-identical** to Google's bitmap conversion. Unit tests prove local contract properties only.

Model source revision: b02fde8d8732aed32bc9d8176c3dc4efda0333fb; original SHA-256 22bb3d3c131aeeee551a1880930910e2ebff8efad8d5cd0c942c97c2dee0993c. `asset-receipt.json` records static batch conversion and label hash. Learned weights are retained; batch signature is fixed to 1. Runtime checks 345 labels and input/output shapes.

## Ranking, unknown and Japanese mapping

The recognizer sorts all 345 scores and uses Top-1. Default score floor .05 is inherited, uncalibrated, and unchanged. A softmax score is not a measured probability of human correctness. Top3 diagnostics now preserve the raw English labels/scores including an unmapped Top-1; the benchmark never selects an alternative automatically. An absent result is unknown, not a wrong-but-valid word. Invalid input/unavailable/model response remain distinct error codes; diagnostic outcome distinguishes low_score from unmapped where inference produced ranks.

Local inventory: 345 unique labels; 177 have explicit Japanese mappings and 168 do not. Same Japanese reading exists for cloud/spider (くも), flower/nose (はな), car/van (くるま). These are homophones or broad labels, not proof of semantic identity. Top-1 is never silently replaced by a playable lower rank. English benchmark now accepts normalized multiword labels (e.g. alarm clock), avoiding the previous single-token rejection.

## Duplication and evaluation boundaries

QuickDraw-derived girl templates may overlap the training corpus; copied catalog art, transformed catalog art and synthetic strokes cannot establish independent human recognition. Current training sample IDs are unavailable, so exact overlap cannot be excluded. Fresh drawings by at least two people reduce copying risk, but 24 samples cannot estimate population accuracy. No leakage claim can be made from known labels alone.

Existing `?recognition-benchmark` is reused, defaults to on-device ML and has no upload runner. It records intent separately from model ranks, human Top1 judgement, human Top3 inclusion, unknown, mapping outcome, latency, anonymous device/input metadata and optional actual continuation. The benchmark's English template coverage is a static catalog lookup; it is not Japanese gameplay success. Fun/replay/game completion are optional independent observations, never part of accuracy. See HUMAN_PILOT_v09.md.

Automated verification: targeted benchmark UI/session/preprocess tests cover local metadata and sanitized explicit export, no automatic judgement/continuation, latency/negative-sample denominators and retry isolation. Browser/runtime/package verification is reported separately by the integrator. Fixtures are not human evidence.
