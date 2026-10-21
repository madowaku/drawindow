# DRAWINDOW v0.5: Japanese/English language layer

Implementation branch: `feat/japanese-shiritori-v05`. The v0.4 DAY/NIGHT
presentation and five-exchange structure are unchanged. Language is a separate
choice, stored in `drawindow-language` when local storage permits.

## Word boundaries

- English continues to use lowercase Latin letters and the v0.4 rules.
- Japanese game labels use phonetic hiragana (katakana and half-width katakana
  are normalized). The end-of-session input explicitly asks for a kana reading.
- Small terminal ゃ/ゅ/ょ/っ are treated as や/ゆ/よ/つ.
- Voiced/unvoiced and semi-voiced kana can be interchanged for links: ご→こ, ぎ→き, ぱ→は. The displayed letters remain the true phonetic readings. English remains strict.
- Girl drawings prioritize exact-kana SAFE templates, then relaxed SAFE templates, then exact/relaxed SOFT alternatives. Thus a readable きのこ can beat the ambiguous ぎたー for a ぎ link.
- Final ー uses the preceding kana's vowel: コーヒー → い. This is a deliberate
  house rule and should be explained to players.
- A Japanese AI interpretation ending with ん breaks that link. Shizuku begins
  a **different, easy-to-continue** SAFE picture, marked `chainRestart`, instead of falsely connecting it.
- Ambiguous kanji readings are not guessed: player inputs with kanji become
  unknown. No full Japanese dictionary or kanji reading service is installed.

## Drawing vocabulary

Existing 64 drawing candidates, attribution, stroke geometry and SAFE/SOFT
review labels are preserved. Two Japanese-only vector sketches, こま and こっぷ,
cover the previously missing こ start. They are provisionally SOFT until blind
human recognition review and do not alter the English A–Z catalogue. The spoken names for Japanese are provided by
`src/data/japaneseSketches.ts` (61 distinct English word types). Language
is selected at session start and cannot change mid-session.

Japanese sessions rotate among curated easy opening drawings. DAY begins with
すいか → かさ → つき → ほし → ねこ → はな, NIGHT with
つき → ほし → とけい → かさ → ねこ → すいか. The index is saved locally
so reloading the page does not always reset to the same starting drawing.
English still starts with apple, unchanged.

### Drawable-word expansion (v0.5.1)

The original 64 sketches are unchanged. In addition to the first two Japanese
templates (こま and こっぷ), `src/data/japaneseDoodlePack.ts` supplies **41
hand-authored stroke illustrations**, for **107 total Japanese candidates**.

Examples by exit utility:

| Purpose | New playable Japanese words |
| --- | --- |
| Complete missing basic start kana | えんぴつ, せんす, そり, ちょうちょ, てぶくろ, ぬいぐるみ, ひこうき, まくら, みつばち, むしめがね, めがね, るーれっと, わに |
| Recover common chains after voiced kana | こあら, きつね, かえる, くつ, さる, しんごう |
| High-connectivity picture objects | たいこ, つくえ, とり, ねずみ, はさみ, ふね, ほうき, やま, ゆきだるま, らっぱ, りす, ろうそく |
| More household / food silhouettes | おにぎり, けーき, すず, なべ, のこぎり, もも, ゆびわ, てがみ, れいぞうこ, ひまわり |

`src/data/japaneseDoodlePack.test.ts` audits all **44 ordinary unvoiced
hiragana starting sounds** as playable, and tests valid stroke bounds, unique
IDs, both language contracts and five full exchanges. This is a **structural
coverage metric**, not a claim that all pictures are identifiable by people.

Selection in Japanese now prefers an equally eligible picture with at least
one playable successor instead of one ending with ん, while retaining the
SAFE-before-SOFT review tier. English selection remains unaffected.

Developer-only review: run `npm run dev` and open
`/?japanese-doodle-preview`. It initially hides word answers, allows
revealing names, DAY/NIGHT visual checks, and can show the existing catalogue.
Blind human trials are required before using maker SAFE judgements as reliable
recognition scores.

Some Japanese starting sounds outside the ordinary 44-kana set remain unrepresented in the current drawing
library. If a recognized word ends in an uncovered sound (other than ん), the
existing explicit error/retry/redraw/demo fallback remains. Do not secretly
replace the genuine AI guess or pass an intended answer as a prompt hint.


### v0.6: Common picture-shiritori word pack (16)

`src/data/japaneseClassicDoodles.ts` adds **16 original, monochrome,
hand-authored vector doodles**, separate from the original English art:

| Word | Visual clue | Review tier |
| --- | --- | --- |
| ごりら | big forearms, broad muzzle | SOFT: may look like a monkey |
| ぱいなっぷる | spiky crown and diamond fruit pattern | SAFE (provisional) |
| かめ | turtle shell, head and four feet | SAFE (provisional) |
| うちわ | flat round paddle with handle | SAFE (provisional) |
| とんぼ | 4 wings and segmented long body | SAFE (provisional) |
| こうもり | scalloped wings and pointed ears | SAFE (provisional) |
| ちくわ | hollow diagonally drawn fish-paste tube | SOFT: bread/roll risk |
| せみ | rounded insect and veined wings | SOFT: other insects |
| かまきり | triangular head and hooked forelegs | SAFE (provisional) |
| くわがた | branched jaws and beetle silhouette | SAFE (provisional) |
| さそり | hooked raised tail and pincers | SAFE (provisional) |
| ながぐつ | tall boot and separate sole | SAFE (provisional) |
| ねぎ | tall split leaves and white stalk | SOFT: generic onion |
| すずめ | round body, short beak and cheek | SOFT: generic bird |
| まつぼっくり | scale pattern and pine-cone outline | SOFT |
| あさがお | five-lobed trumpet flower and curling vine | SOFT: generic flower |

These are candidate illustrations, not assertions that humans will recognize
them. Correct visual identity matters more than forced full-kana coverage.
No letters or written hints have been embedded in any sprite.

**123 Japanese playable template candidates** now exist (64 localized original
candidates + 2 Japanese-only initial drawings + 41 expanded drawings + 16
classic drawings). Some candidate words repeat; this count describes
illustrations, not unique nouns.

Developer visual test: `npm run dev` then
`http://localhost:5173/?japanese-doodle-preview`. The review gallery initially
shows the **16 classic pictures with hidden words**; buttons can reveal names,
switch DAY/NIGHT, filter by starting sound, or include the full catalogue.

#### Blind-read acceptance protocol

1. Show the new 16 illustrations one by one without labels. Ask 3–5 people
   independently what object the drawing resembles (no hints or menus).
2. Collect the raw first answer and plausible alternate names; do not reveal
   labels or coach while they are answering.
3. Record a per-word count, confusion pairs and the daylight/night window view.
   SAFE is **not** an empirical label until this study is complete.
4. Prioritize shape changes for low agreement, particularly ごりら vs さる,
   すずめ vs とり, あさがお vs はな, and ちくわ vs bread.
5. Check actual mouse/touch playback on 360×800 Android and validate four
   real-model Japanese image recognitions (not just DEMO) across five exchanges.
6. Keep the draft PR unmerged until the human playtest and visual sign-off.

English mode does not import the 16 extra drawings, does not translate
their labels, and retains the original opening/apple story.

### v0.6.1: Shizuku hand-drawn feel (comparison candidate)

Art direction approved for this project: **black/white, no color, deliberately
imperfect but affectionate**, not overly skilled or polished. Round shapes,
a little asymmetry, slight hand jitter, simple silhouettes and sparing details.
Do not add universal smiley faces to unrelated foods or objects.

The existing approved five core drawings are preserved as-is: りんご B3,
ばなな B2, ねこ B3, いぬ B1, ぞう B1 (the B1/B2/B3 labels refer to the
separately approved visual direction, not empirical recognition scores).
Also preserve the established Shizuku character-expression sprites.

- The source 16 classic drawings are kept in
  `japaneseClassicBefore` with `-v01` IDs.
- `japaneseClassicDoodles` is a **v02 candidate** of those exact 16
  objects, with subtle deterministic irregularity in long strokes and
  small object-specific character marks. The names and provisional
  SAFE/SOFT classifications remain the same.
- The original English sketches, first 2 Japanese extras and 41
  Japanese base-kana sketches are **not altered**.
- Development-only `/?japanese-doodle-preview` starts with the 16
  classic pairs side-by-side, both names hidden until intentionally
  revealed; DAY/NIGHT, new/old single display, and wider catalog filter
  remain available.
- Current Japanese gameplay uses only the v02 variants, not both, so
  the two versions never double the weighted chance of the same word.

#### Human review gate

View each pair at mobile scale (e.g. 360 × 800). First give an *unprompted*
object guess, then rate the version preferred for "looks like something
Shizuku drew" rather than professional rendering. Do this separately:
**recognizability and charm are not the same metric**.

Priority confusion pairs: ごりら/さる, せみ/昆虫全般,
すずめ/とり, ちくわ/パン, あさがお/花全般.
Revert a modified version if clarity decreases; do not "fix" it with a word
label, color fill, shiny finish or a generic eye/mouth.

No claim of human validation or camera-browser screenshot review is made by
these automated tests. Do not merge until real human visual feedback and
Android playback are inspected.

## Recognition / privacy

The browser sends `language: 'ja'` only for Japanese play. Omission is
backwards-compatible English. Worker validates the language, asks the
recognizer for a Japanese phonetic noun, and rejects responses that violate
the phonetic format. Neutral black-on-white player drawing only: no character,
frost, intended word or prior label in the request. DEMO supplies disclosed
fixed interpretations, not AI recognition.

## Follow-up quality gates

- Run `npm test` and `npm run build`; GitHub Actions checks the PR.
- Human-play five exchanges in both EN and JA, DAY and NIGHT.
- Check Japanese recognition of 12 actual freehand drawings, including
  long vowels, ん, ambiguous names and unfamiliar syllables.
- Confirm 360×800 Android readability, keyboard entry, hiding of
  all answer labels until review, and worker origin/rate-limit behavior.
- Add curated Japanese-first SAFE doodles to fill uncovered kana. DAY/NIGHT
  currently affect the opening pool only; the whole vocabulary still needs
  themed weighting after coverage and human readability review.
- Publish nothing automatically. The release requires human acceptance.

### v0.6.2: readable shapes, everyday words and review workflow

- Six classic candidates now use v03 shapes: ごりら, ちくわ, せみ, ねぎ,
  すずめ, あさがお. The review baseline is the actual previous v02, not v01.
  The other ten classics and the approved five core pictures are unchanged.
- Twelve original monochrome, authored vector nouns are added in
  `src/data/japaneseEverydayDoodles.ts`: いちご, ごぼう, きゅうり, なす,
  だるま, くし, すいとう, うでわ, けしごむ, むぎ, くつした, たけのこ.
  **135 Japanese picture candidates**, not 135 unique words. No external art
  or new dependency. ごぼう / すいとう / うでわ / けしごむ / むぎ are SOFT;
  the other seven are provisional maker SAFE. None has human recognition proof.
- Japanese selection keeps the existing exact/relaxed and SAFE/SOFT tiers,
  avoids terminal exits within a tier, prefers unseen words, then up to three
  distinct readable nonterminal successor words. DAY/NIGHT adds only a 0.25
  tie-break. Reused words retain least-recent order so one high-score noun does
  not monopolize the session. Starter pools and English selection are intact.
- The dev-only gallery adds version-keyed local 採用 / 保留 / 再修正 marks,
  one-at-a-time navigation, 360px width and an isolated 12-new-picture scope.
  One-at-a-time mode folds settings so the whole review card fits 360x800.
  Marks are personal notes, never gameplay approval or recognition labels.
  Blocked/corrupt storage falls back to in-memory marks with a visible message
  when saving fails. Initial word labels and image accessibility labels are blind.

Verification: 198 unit/component tests, production build, and browser checks at
360x800 and 1280x800 in DAY/NIGHT. Each browser journey checks all 16 before/after
pairs, all 12 additions, equal comparison scale, bounded paging, marks across
reload, explicit reveal and no horizontal overflow. Re-run with a dev server:

```powershell
npx --yes --package @playwright/cli playwright-cli -s=ja open 'http://localhost:5183/?japanese-doodle-preview'
npx --yes --package @playwright/cli playwright-cli -s=ja run-code --filename=scripts/qa-japanese-doodles.cjs
```

Human next pass: hide names; give a first guess before revealing; compare charm
and clarity separately. Prioritize ごりら/さる, ちくわ/パン, せみ/昆虫,
すずめ/とり, あさがお/花 and ねぎ/玉ねぎ. Also check ごぼう/にんじん,
うでわ/指輪, けしごむ/積み木 and むぎ/葉. No LIVE request or paid API was
used for this batch. Android touch/audio, real human recognition and comfort
remain separate acceptance tasks.

Product review entry point: PR #16 (integration). PR #7 is the active Japanese
source; already integrated quality/ending work from #8/#12 is historical.
Neither branch is a public release. No merge to main, deploy or public upload.
