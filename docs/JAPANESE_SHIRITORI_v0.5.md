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
