# Recognition setup and honest release status

## v0.3 local connection status

The actual game character integration passed its P0 DEMO gate (96 tests, build,
three viewport sizes × DAY/NIGHT). A configured genuine key is still required
for P1 provider tests. Private entry is available via `npm run setup:gemini`;
`npm run check:gemini` reports only booleans. See
[safe local setup](GEMINI_LOCAL_SETUP.md). The current local value failed the
Google-key format check; its content was neither printed nor committed.

Actual local Worker trusted OPTIONS returned204, and an untrusted-Origin POST
was rejected403 before any provider call. These do not establish provider
access or the actual itch iframe's CORS. Genuine LIVE/12human-doodle/Android/
naive-player gates remain open. There is no deployment or provider substitution.

The existing model `gemini-3.5-flash-lite` remains the configured choice; the
[official stable model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
was rechecked2026-10-17 for image input and structured output. No new provider
abstraction or model upgrade was necessary.

The shipped default is **DEMO**. Its mock returns predetermined words based on round number, independently of the drawing. It exists to demonstrate five exchanges and the final reveal; demo link counts are illustrative and never a comparable score. No provider credentials were available during implementation, no live recognition benchmark has been run, and the implementation must not be advertised as validated AI recognition yet.

## Configuring the optional live API

The browser sends `POST /api/recognize` by default. A separately hosted backend can be selected with `createApiRecognizer({ endpoint: 'https://your-worker.example/api/recognize' })`; the app's `VITE_RECOGNITION_URL` build setting supplies this URL. `VITE_` variables are public. Never put a provider key in them.

Until an endpoint is configured, the title offers DEMO alone. Setting a nonempty
`VITE_RECOGNITION_URL` reveals the optional live-mode choice; for a local
same-origin Worker, `VITE_ENABLE_LIVE_API=true` explicitly reveals it instead.
This does not change the `DrawingRecognizer` interface or simulate a provider.

The module entry point is `worker/index.ts`. Required Worker bindings:

| Binding | Value |
| --- | --- |
| `GEMINI_API_KEY` | Secret provider key, stored as a Worker secret only |
| `GEMINI_MODEL` | Optional model ID; defaults to `gemini-3.5-flash-lite` |
| `ALLOWED_ORIGINS` | Comma-separated exact origins, with no trailing slash; no wildcard |
| `RATE_LIMITER` | Native Cloudflare rate-limit binding, configured in Wrangler |

The default model is listed as Stable with image input and structured output in the [official model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), checked 2026-10-17. This establishes documented support, not drawing quality, account access or latency. The HTTP adapter follows [Gemini's generateContent image-understanding reference](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding). `GEMINI_MODEL` can change after evaluating a genuine benchmark. There is no Jev adapter or claim about Jev support.

The repository's Wrangler configuration should contain a [native rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), for example:

```toml
[[ratelimits]]
name = "RATE_LIMITER"
namespace_id = "10017" # Choose an account-unique positive integer string.
simple = { limit = 12, period = 60 }
```

For local testing, put `GEMINI_API_KEY` in an ignored `.dev.vars` file and set `ALLOWED_ORIGINS` to the exact development origin, normally `http://localhost:5173`. Start the Worker with the repository-local Wrangler, then Vite; Vite's `/api` proxy points to port 8787. For a separately hosted Worker, keep the model/key/rate-limit bindings on that Worker. Store a production key with `npx --no-install wrangler secret put GEMINI_API_KEY` only when deployment and provider spending are authorized. This implementation has not deployed a Worker or purchased quota.

For itch.io, inspect the actual game's iframe `Origin` in the browser network panel and allow that exact HTTPS origin. Do not guess the origin from the game's landing-page URL. Test the published iframe's preflight, POST, 429 and unavailable paths before advertising live play. Some itch upload origins are shared between unrelated games; an Origin allowlist is a browser boundary, not authentication of one particular game. Public API deployments need provider-side budget/quota limits appropriate to the owner's account.

## Request/response and failure limits

The request JSON contains only `requestId` (three colon-separated numeric fields) and `imageDataUrl` (base64 PNG). The backend rejects extra fields, so intended labels or desired next letters cannot be passed as API hints. The browser renderer draws raw strokes in black on a white 512×512 canvas; it never captures girl art, frost or the presentation canvas.

The Worker accepts exact allowed origins and JSON POST only; trusted OPTIONS requests receive CORS headers. It fails closed when key or native rate-limit binding is absent. It bounds request bodies to 400,000 bytes, decoded PNG to 262,144 bytes, and image dimensions to 1024×1024; PNG signature and IHDR dimensions are checked. Invalid PNG decoding is also rejected by the provider. It limits reading request/provider bodies, provider timeout (9 seconds by default), and response size. Per-IP native rate limiting means users on a shared network may share a limit. There is no raw drawing storage, debug image logging, credential echo, browser-side provider key or silent mock fallback. Provider retention/billing remains subject to the configured account's terms.

Success is `{ "guess": "cat", "source": "api" }`. The backend asks for a singular common English noun and validates one lowercase alphabetic word; semantic noun correctness still needs the benchmark. Failure always has `guess: null`, `source: 'api'`, an explicit error code and non-spoiler message. HTTP 400/413/415 are input errors, 429 is rate limit, 502 is invalid provider output, 503 is unavailable/network/configuration, and 504 is timeout.

The browser has its own bounded timeout (12 seconds), and the orchestration runner has a final 15-second guard. The runner coalesces concurrent/completed calls by request ID; create one API and one demo runner per mounted app instance. The reducer creates unique `session:round:sequence` IDs, accepts only the current response, and allows at most two deliberate retries for one sealed drawing. Editing or restarting creates a different ID. Fifth-player DONE goes directly to review with no recognition dependency.

The girl's next template begins with the genuine guess's final letter. Missing dictionary coverage is an explicit `uncovered_letter` error and makes the affected entry non-comparable; no guess is changed to improve the score. Retry, redraw and explicitly switching to demo remain available. Demo participation prevents a comparable score or PERFECT even when intended-word links happen to connect.

## Required genuine benchmark before a live-recognition release

Prepare at least 12 **real hand-drawn** neutral images, including recognizable simple objects, ambiguous objects and a deliberately hard/empty case. Use drawings from more than one person/device when practical. The existing girl templates, algorithmic fixtures and screenshots do not count as real player drawing samples.

1. Save each intended noun separately from the API request, after drawing; never send it to the recognizer.
2. Run each image through the actual deployed origin and chosen model. Record request time, end-to-end latency, returned genuine guess, failures and next-template coverage.
3. Review whether the guess is a plausible interpretation independently of exact intended-word agreement. Record both assessments; do not invent numeric confidence.
4. Exercise timeout, 429, missing secret, invalid JSON, no matching template and iframe CORS failures. Confirm retry, redraw and explicit demo work without losing the drawing or revealing a word during play.
5. Report sample count, per-sample results, latency range and unresolved failures. Keep the demo default until the owner accepts the actual results and configures quota.

6. Mandatory live-mode game gate after connection: play all five exchanges with
   actual freehand player drawings through the genuine configured recognizer.
   Verify exactly five girl/five player entries, four real interpretation-driven
   next-word selections, no midgame word/answer disclosure, final five intended
   labels and nine scored adjacency links. Exercise DAY and NIGHT parity and
   bounded failure recovery. A mock, random result, template fixture or partial
   session cannot pass this gate. This work has not passed it because no API was
   configured; the user explicitly chose completion of the local DEMO first.

Current evidence: automated core/adapter/Worker tests exercise simulated HTTP responses and deterministic state transitions. They do not establish provider access, real sketch quality, actual latency, itch iframe compatibility, physical touch comfort or enjoyment.
