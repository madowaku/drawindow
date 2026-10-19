# DRAWINDOW v0.8: DAY & NIGHT vocabulary

**Development candidate only.** Stacked Draft on product PR #16. No merge, deploy or release without human approval.

## Intent
- DAY: garden, animals, movement and discoveries. NIGHT: gentle imagination, moonlight, warm lights, a quiet room.
- Not two separate dictionaries: the same word may be chosen in either mode. Readability, chain continuations, fresh words and fallback come before mood.
- English starts with apple by day and moon by night, rotating through actual SAFE art. Japanese continues its existing day/night opening rotation.
- Language selection changes phonetic labels, not the shape or recognition result. No labels or target words sent as recognition hints.

## First review batch: 9 original black-line pictures / 9 nouns in each language

| Lean | Japanese | English | Review |
| --- | --- | --- | --- |
| DAY | てんとうむし | ladybug | Spots, wing seam |
| DAY | たんぽぽ | dandelion | SOFT: generic flower ambiguity |
| DAY | ぶらんこ | swing | Rope and seat |
| NIGHT | らんぷ | lamp | Distinct lampshade |
| NIGHT | おばけ | ghost | Friendly sheet silhouette |
| NIGHT | ぼうえんきょう | telescope | Optical tube and tripod |
| COMMON | じてんしゃ | bicycle | Wheels and frame |
| COMMON | まど | window | Four panes |
| COMMON | かたつむり | snail | Spiral shell and feelers |

All SAFE/SOFT labels are *provisional maker ratings*, not measured human recognition. The development-only Japanese gallery opens on these nine for blind comparison; names and marks remain private to review UI.

## Remaining 21 target drawings (not yet implemented)

| Lean | Japanese | English |
| --- | --- | --- |
| DAY | すべりだい | slide |
| DAY | はち | bee |
| DAY | さくらんぼ | cherry |
| DAY | ちゅーりっぷ | tulip |
| DAY | かざぐるま | pinwheel |
| DAY | ひよこ | chick |
| DAY | いもむし | caterpillar |
| NIGHT | かぼちゃ | pumpkin |
| NIGHT | ぱじゃま | pajamas |
| NIGHT | べっど | bed |
| NIGHT | くものす | spiderweb |
| NIGHT | まじょ | witch |
| NIGHT | ほたる | firefly |
| NIGHT | しろ | castle |
| COMMON | ぼうし | hat |
| COMMON | いす | chair |
| COMMON | どあ | door |
| COMMON | かがみ | mirror |
| COMMON | くっきー | cookie |
| COMMON | かめら | camera |
| COMMON | たいよう | sun |

Audit before adding: existing word duplicates, hiragana first/last sounds, drawable exits, visual confusion and English single-noun phrasing. An additional candidate does not become human-approved artwork just by passing unit tests.

## QA and promotion gates
1. Run tests and TypeScript/Vite build, ensure new English starter selection does not break previous untargeted English callers.
2. Blindly identify each new illustration with 3–5 people before showing either label. Record wrong guesses separately from charm.
3. Real Android EN/JA × DAY/NIGHT full play, image save/open and audio/end scene.
4. Human LIVE recognition, uncovered-letter recovery, Worker security/cost budgets. DEMO is not real recognition.
5. Keep #16 Draft; no main merge, deployment or public upload without separate explicit sign-off.
