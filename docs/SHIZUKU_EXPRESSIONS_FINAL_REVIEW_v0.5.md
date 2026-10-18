# DRAWINDOW | Shizuku expressions finalization v0.5 (review only)

2026-10-18. This document is an implementation and art-review plan, **not an adoption or deployment receipt**.

## Source of truth: seven poses, not ten

The 2026-10-18 comparison sheet has ten **columns**: seven CURRENT poses (NEUTRAL / THINKING / SMILE / SHY / BREATH / CURIOUS / DRAWING) followed by three REVIEW variants (THINKING / SHY v0.1 / CURIOUS). The three review variants **replace** three existing poses when approved; they are not extra pose IDs. BLINK is an auxiliary title animation source, not an eighth acting expression.

- Live seven-pose artwork: `public/art/shizuku/*.webp` and `assets/shizuku-manifest.json` (v0.2 provenance).
- Separate high-resolution candidates for NEUTRAL / BREATH / DRAWING / SMILE: `public/art/shizuku-v04/` with `assets/shizuku-v04-manifest.json`. They remain review-only.
- Existing selector: `src/lib/character.ts`; preview: `/?character-preview`. **Do not assume artwork shown in the user comparison has been committed**; the three review sprite files and hashes must be verified separately.

## Visual decisions from side-by-side DAY/NIGHT review

| Pose | Status | Visual gate |
| --- | --- | --- |
| SHY v0.1 | Preferred for adoption after source/provenance check | Downward/averted gaze, shy hesitant mouth, gentle sleeve grip; should not become sad or distressed |
| THINKING | Rework before adoption | Different hand silhouette from BREATH: index finger resting on chin rather than at lips; eyes look obliquely upward; brows subtly gather |
| CURIOUS | Rework before adoption | Interested / leaning to inspect, not merely surprised; slight head tilt, attentive eyes, relaxed small closed or softly parted mouth |

**SHY v0.1**: keep the reviewed version. Do not retroactively label it production until its image file and alpha are present and approved.

### Image editing brief (THINKING)

Use the same approved Shizuku identity and approved current neutral face as strict references; use current THINKING and BREATH side-by-side as gesture negatives/positives.

Keep the crossed silver pins, blue-gray eyes, ash-brown short bob with distinctive flyaway, dusty blue hair/neck ribbons, ivory cardigan, long sleeves and delicately painted matte watercolor/pencil edges. Preserve the same half-body scale and alignment. Change the THINKING hand to **an index finger resting along the chin below the lower lip** (not placed against the lips), with a subtle tilt of head, gaze thoughtfully to one upper side, soft concentrating brow and closed relaxed lips. No blowing, kissing mouth, breath cloud, text, glass, room, or invented accessories. Native detailed transparent-alpha PNG source, no upscaled low-res source.

### Image editing brief (CURIOUS)

Same identity and geometry. Slight inquisitive head tilt, small forward lean and eyes directed toward an object at the glass; **attentive curiosity rather than round-mouth shock**. Gentle eyebrows, mildly widened or focused eyes, relaxed small mouth; hands stay near the cardigan/sleeves. Avoid theatrical surprise, exaggerated blush, text, room, fog, over-polished highlights or a new hairstyle. Native detailed transparent-alpha PNG.

### Files, provenance and promotion

1. Store original candidate PNGs in a **new** `assets/source/shizuku-expression-review/` folder, one file per expression; do not overwrite existing masters.
2. Export with preserved soft alpha to a **new** `public/art/shizuku-expression-review/` folder at a shared 768×1024 review resolution, using high-quality WebP; use the **same measured eye-anchor and scale policy** for all three or document precise deviations.
3. Record source and processed SHA-256, dimensions and transparency checks in a dedicated review manifest. Confirm that both old asset manifests still match unchanged bytes.
4. Build a comparison for DAY/NIGHT, current versus review, plus THINKING versus BREATH at 360×800 and 720×1280; test for skin and fingers merging with the background, eye jumping, clipping and faded alpha edges.
5. Obtain human visual approval for all three, **then** choose which review sprite to use in the game. A candidate that fails should revert to the current pose. The v0.4 four-portrait high-res set is a separate adoption decision.
6. Keep all edits in a review branch. No main merge, prod art overwrite, itch ZIP replacement, or public deployment without approval.

## Expression behavior experiment on review branch

While the player has not drawn any mark, Shizuku stays NEUTRAL in `player_drawing`. As soon as a genuine point appears in the active strokes, she becomes CURIOUS. This is a *presentation-only* observation. It never consults recognition guesses, correct answer, score, hidden word or user intent. DAY uses a 2px approach; NIGHT uses 1px. Reduced Motion still permits the static curious illustration but suppresses gesture timing. Old round-parity alternation is retained for the other conversational phases.

Keep the existing gestures: THINKING before her first stroke and during recognition; SHY for selected end-of-session moments, not as an answer correctness cue. Avoid any idle timers until a separate review proves they enrich rather than distract.

## Acceptance checklist

- [ ] Both revised high-detail THINKING and CURIOUS sprites have usable native transparent-alpha source images
- [ ] SHY v0.1 original exists and is clearly more shy than sad in day and night
- [ ] At 360px, THINKING can be distinguished from BREATH even with the mouth cropped/visually minimized
- [ ] At 360px, CURIOUS feels engaged rather than surprised
- [ ] Hairpins, ribbon, sleeves, eye line and face proportions pass identity consistency review
- [ ] No blink-layer mixing or hard jumps during 180ms crossfades
- [ ] First player mark triggers CURIOUS on any round; CLEAR/UNDO returns to NEUTRAL when strokes empty
- [ ] `npm test` passes; `npm run build` succeeds (not independently run by this GitHub-only update)
- [ ] On-device DAY/NIGHT at 360×800 and 720×1280 passes human QA
- [ ] User explicitly approves art promotion and release separately

Current scope of implementation: selector/scene/canvas wiring and matching automated assertions are staged for review. **Art replacement and official pose promotion remain pending.**
