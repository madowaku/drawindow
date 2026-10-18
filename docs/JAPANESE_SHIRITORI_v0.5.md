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
