# Source hardening before final QA

Read-only PM review while T003 browser Worker ran identified:

1. Switching lab → play remounts App, but the recorder was retained. A new App title could disagree with an old recorder results state (notably language events). Start a fresh recorder on entering a new play surface, while the independent game DB remains resumable and marks resumed recordings partial. Preserve ratings/logs; instruct export before new trial.
2. useStudyClock uses the latest completion callback. Protect every RAF with the current render epoch so an obsolete callback cannot complete a newer phase before effect cleanup.
3. Expanding the study header at results can put the diary below the fold. Keep research header compact through review/results, expose post-result comparison settings next to the replay, and keep playback transport reachable. Do not change product layout or A timings.

These are narrow DEV lifecycle/presentation fixes. No recognition/scoring/dictionary/asset changes are authorized. T003 will resume after a bounded PM repair and targeted tests.
