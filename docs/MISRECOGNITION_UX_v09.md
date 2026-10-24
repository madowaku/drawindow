# v0.9 misrecognition UX options — design only

No game rules, recognition correction or scores are changed here. Observe the human pilot before choosing a product direction.

| Option | Player experience | Benefit | Cost / measurement |
|---|---|---|---|
| Keep one honest guess + retry | Preserve the first interpretation; offer redraw/explicit retry on unknown | Smallest change; keeps misunderstanding visible | Measure confusion, abandonment and repeated failures |
| Let player confirm a displayed alternative | Show up to 3 guesses only after recognition; explicit player choice | May reduce friction | Changes the meaning of independent recognition; store original Top1 and chosen word separately; new score semantics need user approval |
| Let player state intended object after a turn | Record intention as a separate observation, never overwrite the guess | Supports reflection and readable mistakes | Does not improve recognition or justify a successful chain |
| Unknown acknowledgement and redraw | Say she could not tell, retain drawing, invite edit | Honest abstention | Measure whether users feel stuck and whether redraw helps |

Suggested first experiment: retain current rules, test honest unknown/redraw copy and compare human continuation and enjoyment independently. Never select a lower-ranked noun automatically to satisfy a chain; never turn DEMO into a silent fallback; never call a score confidence unless calibrated. Keep homophone meaning differences visible. Any UX experiment must label manual intervention in results and preserve the original first attempt.
