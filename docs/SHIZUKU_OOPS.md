# Shizuku's Japanese terminal-ん slip

Japanese only, at most once per five-exchange session. On an eligible reply
slot `(sessionId + nextRound) % 3 === 0`, she can select an unused SAFE drawing
ending in ん whose first sound actually matches the recognized word. A SAFE,
nonterminal replacement for that sound must already be available. No forced
opening mistakes, no slip during a restart caused by the player's terminal ん,
and no changes to recognition guesses, requests, English selection or scoring.

Sequence: finish the mistaken strokes → 700ms realization (curious, 「あっ。」)
→ 1150ms shy, small finite fluster (「……もう一回。」) → blow on the glass again
→ old strokes fade under the renewed fog → draw the replacement → player turn.
The corrective breath uses the BREATH pose in both DAY and NIGHT. It does not
cut straight to the new drawing. Reduced motion removes gestures and runs the
existing instant breath/playback policy, while keeping the two readable beats.
Hidden tabs pause the reaction timers; leaving cancels them. Events carry session,
round and phase guards. Breath/playback can run twice in one round.

The replacement stays in the same entry/round. The withdrawn drawing is retained
locally as `falseStart`; the final diary still has 10 drawings and 9 links. Since
she withdraws it before the player responds, it does not add a scoring penalty.
The actual words remain hidden during play. All nonterminal selections still use
the existing Japanese readability/continuation ranking; terminal pictures enter
through this bounded slip path, not as an unrecoverable player turn.

Tests cover the complete reducer sequence, frequency, stale events, no-replacement
fallback, unchanged recognition guess, timed visibility/unmount cleanup, DAY/NIGHT
poses, reduced motion, and replaying breath/drawing in the same round. Browser
check: `scripts/qa-girl-oops.cjs` via playwright-cli against the dev server; normal
Japanese DEMO first reply exercises the sequence without paid recognition calls.
Browser/synthetic evidence does not establish real-device comfort or cuteness.

This feature is developed on product review PR #16. No main merge or deployment.
