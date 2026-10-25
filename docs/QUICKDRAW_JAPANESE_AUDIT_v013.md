# QuickDraw Japanese audit v0.13

Baseline: main 3dad268; 345 classes, 177 mapped and 168 unmapped. 32 conservative additions → 209 mapped, 136 remaining.

A direct noun: 143; B ambiguity: 17; C unsuitable ordinary shiritori noun: 6; D existing meaning collision: 2. Candidate spellings are proposals, not adopted translations unless explicitly marked. This is a semantic and reducer audit, not human drawing accuracy.

All candidates pass kana normalization; adopted candidates pass the actual reducer in DAY and NIGHT. A tail of ん restarts honestly. Dots/voicing and prolonged sounds use the unchanged production firstLetter/lastLetter rules. Homophones remain different concepts (flower/nose, cloud/spider); no synonym dictionary was broadened.

| Model category | Group | Candidate | First | Last | Adopted | DAY/NIGHT reply | Reason |
|---|---|---|---|---|---|---|---|
| The Eiffel Tower | A | えっふぇるとう | え | う | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| The Great Wall of China | A | ばんりのちょうじょう | ば | う | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| The Mona Lisa | C | もなりざ | も | ざ | pending | available | Action, abstract mark or named work; weak ordinary picture-shiritori noun. |
| aircraft carrier | A | こうくうぼかん | こ | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| animal migration | C | どうぶつのいどう | ど | う | pending | available | Action, abstract mark or named work; weak ordinary picture-shiritori noun. |
| anvil | A | かなとこ | か | こ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| asparagus | A | あすぱらがす | あ | す | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| bandage | B | ばんそうこう | ば | う | pending | available | Adhesive dressing versus wrapped bandage; ばんそうこう would narrow the class without evidence. |
| baseball | B | やきゅう | や | う | pending | available | Sport versus baseball ball; やきゅう is an activity, ぼーる loses sport specificity. |
| baseball bat | A | やきゅうばっと | や | と | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| basketball | B | ばすけっとぼーる | ば | る | pending | available | Sport versus ball; preserve which object the category represents. |
| beach | A | はまべ | は | べ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| beard | A | あごひげ | あ | げ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| bench | A | べんち | べ | ち | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| binoculars | A | そうがんきょう | そ | う | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| birthday cake | A | ばーすでーけーき | ば | き | pending | available | Distinct subtype noun retained in candidate wording; do not collapse it into the existing broader category. |
| blackberry | A | ぶらっくべりー | ぶ | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| blueberry | A | ぶるーべりー | ぶ | い | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| boomerang | A | ぶーめらん | ぶ | ん (restart) | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| bulldozer | A | ぶるどーざー | ぶ | あ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| calculator | A | でんたく | で | く | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| camouflage | B | めいさい | め | い | pending | available | Pattern, clothing or concealment action; めいさい alone is not a concrete object. |
| campfire | A | たきび | た | び | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| cannon | A | たいほう | た | う | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| castle | A | しろ | し | ろ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| ceiling fan | A | てんじょうせんぷうき | て | き | pending | available | Distinct subtype noun retained in candidate wording; do not collapse it into the existing broader category. |
| cell phone | A | けいたいでんわ | け | わ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| cello | A | ちぇろ | ち | ろ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| chandelier | A | しゃんでりあ | し | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| church | A | きょうかい | き | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| clarinet | A | くらりねっと | く | と | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| compass | B | こんぱす | こ | す | pending | available | Drawing compass versus magnetic direction finder; Japanese nouns differ. |
| cooler | B | くーらーぼっくす | く | す | pending | available | Cool box versus cooling appliance; くーらー alone changes the object. |
| crayon | A | くれよん | く | ん (restart) | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| cruise ship | A | くるーずせん | く | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| dishwasher | A | しょっきあらいき | し | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| diving board | A | とびこみだい | と | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| dresser | B | たんす | た | す | pending | available | Chest of drawers versus dressing table; Japanese nouns differ. |
| drill | A | どりる | ど | る | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| drums | B | どらむ | ど | む | pending | available | Drum kit versus individual drum; no silent narrowing to a specific drum. |
| dumbbell | A | だんべる | だ | る | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| elbow | A | ひじ | ひ | じ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| eyeglasses | A | めがね | め | ね | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| fence | A | ふぇんす | ふ | す | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| fire hydrant | A | しょうかせん | し | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| fireplace | A | だんろ | だ | ろ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| firetruck | A | しょうぼうしゃ | し | や | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| flamingo | A | ふらみんご | ふ | ご | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| flashlight | A | かいちゅうでんとう | か | う | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| flip flops | A | びーちさんだる | び | る | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| floor lamp | A | ふろあらんぷ | ふ | ぷ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| flying saucer | A | そらとぶえんばん | そ | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| frying pan | A | ふらいぱん | ふ | ん (restart) | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| garden | A | にわ | に | わ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| garden hose | A | みずまきほーす | み | す | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| goatee | A | やぎひげ | や | げ | pending | available | Distinct subtype noun retained in candidate wording; do not collapse it into the existing broader category. |
| golf club | A | ごるふくらぶ | ご | ぶ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| harp | A | はーぷ | は | ぷ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| headphones | A | へっどほん | へ | ん (restart) | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| helmet | A | へるめっと | へ | と | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| hexagon | A | ろっかくけい | ろ | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| hockey puck | A | ほっけーぱっく | ほ | く | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| hockey stick | A | ほっけーすてぃっく | ほ | く | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| hospital | A | びょういん | び | ん (restart) | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| hot air balloon | A | ねつききゅう | ね | う | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| hot dog | A | ほっとどっぐ | ほ | ぐ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| hot tub | D | おふろ | お | ろ | pending | available | おふろ collides with mapped bathtub; preserve the category distinction before adoption. |
| hourglass | A | すなどけい | す | い | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| house plant | A | かんようしょくぶつ | か | つ | pending | available | Distinct subtype noun retained in candidate wording; do not collapse it into the existing broader category. |
| hurricane | B | はりけーん | は | ん (restart) | pending | available | Storm type and geographic naming; avoid translating as an arbitrary cyclone drawing. |
| jail | A | ろうや | ろ | や | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| keyboard | B | きーぼーど | き | ど | pending | available | Computer versus musical keyboard; preserve instrument distinction. |
| knee | A | ひざ | ひ | ざ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| lantern | A | らんたん | ら | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| leg | D | あし | あ | し | pending | available | あし collides with mapped foot and dictionary body-part meanings; do not treat leg and foot as equivalent. |
| lighter | A | らいたー | ら | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| lighthouse | A | とうだい | と | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| lightning | A | かみなり | か | り | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| line | C | せん | せ | ん (restart) | pending | available | Action, abstract mark or named work; weak ordinary picture-shiritori noun. |
| lipstick | A | くちべに | く | に | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| lobster | A | ろぶすたー | ろ | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| mailbox | A | ゆうびんうけ | ゆ | け | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| marker | B | まーかー | ま | あ | pending | available | Felt-tip pen versus a position marker; inspect category conventions. |
| matches | A | まっち | ま | ち | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| megaphone | A | めがほん | め | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| mermaid | A | にんぎょ | に | よ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| microphone | A | まいく | ま | く | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| microwave | A | でんしれんじ | で | じ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| mosquito | A | か | か | か | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| motorbike | A | おーとばい | お | い | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| moustache | A | くちひげ | く | げ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| nail | B | くぎ | く | ぎ | pending | available | Metal nail versus fingernail; くぎ requires category evidence. |
| ocean | A | うみ | う | み | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| octagon | A | はっかくけい | は | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| oven | A | おーぶん | お | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| paint can | A | ぺんきかん | ぺ | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| paintbrush | A | えふで | え | で | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| palm tree | A | やしのき | や | き | pending | available | Distinct subtype noun retained in candidate wording; do not collapse it into the existing broader category. |
| paper clip | A | くりっぷ | く | ぷ | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| parachute | A | ぱらしゅーと | ぱ | と | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| passport | A | ぱすぽーと | ぱ | と | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| peanut | A | ぴーなっつ | ぴ | つ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| peas | A | えんどうまめ | え | め | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| pickup truck | A | ぴっくあっぷとらっく | ぴ | く | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| picture frame | A | がくぶち | が | ち | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| pliers | A | ぺんち | ぺ | ち | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| police car | A | ぱとかー | ぱ | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| pond | A | いけ | い | け | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| pool | B | ぷーる | ぷ | る | pending | available | Swimming pool versus other senses; inspect category drawings. |
| popsicle | A | あいすきゃんでぃー | あ | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| postcard | A | はがき | は | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| power outlet | A | こんせんと | こ | と | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| purse | B | はんどばっぐ | は | ぐ | pending | available | Handbag versus coin purse; はんどばっぐ can narrow the category. |
| radio | A | らじお | ら | お | yes | available | Direct category noun; candidate pending continuity and naming checks. |
| rake | A | くまで | く | で | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| remote control | A | りもこん | り | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| rifle | A | らいふる | ら | る | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| roller coaster | A | じぇっとこーすたー | じ | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| rollerskates | A | ろーらーすけーと | ろ | と | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| sandwich | A | さんどいっち | さ | ち | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| saw | A | のこぎり | の | り | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| saxophone | A | さっくす | さ | す | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| school bus | A | すくーるばす | す | す | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| scorpion | A | さそり | さ | り | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| screwdriver | A | どらいばー | ど | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| sea turtle | A | うみがめ | う | め | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| see saw | A | しーそー | し | お | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| shorts | A | はんずぼん | は | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| shovel | A | しゃべる | し | る | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| sink | A | ながしだい | な | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| skateboard | A | すけーとぼーど | す | ど | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| skyscraper | A | まてんろう | ま | う | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| sleeping bag | A | ねぶくろ | ね | ろ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| smiley face | B | えがお | え | お | pending | available | Symbol versus a smiling face; えがお may change category specificity. |
| snorkel | A | しゅのーける | し | る | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| soccer ball | A | さっかーぼーる | さ | る | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| speedboat | A | すぴーどぼーと | す | と | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| spreadsheet | C | ひょうけいさんしーと | ひ | と | pending | available | Action, abstract mark or named work; weak ordinary picture-shiritori noun. |
| square | A | しかく | し | く | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| squiggle | C | ぐにゃぐにゃのせん | ぐ | ん (restart) | pending | available | Action, abstract mark or named work; weak ordinary picture-shiritori noun. |
| steak | A | すてーき | す | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| stereo | A | すてれお | す | お | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| stethoscope | A | ちょうしんき | ち | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| stitches | B | ぬいめ | ぬ | め | pending | available | Sewing stitches versus sutures; keep interpretation open. |
| stop sign | A | いちじていしひょうしき | い | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| stove | B | こんろ | こ | ろ | pending | available | Cooking stove versus heating stove; こんろ and すとーぶ differ. |
| streetlight | A | がいとう | が | う | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| string bean | A | いんげんまめ | い | め | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| submarine | A | せんすいかん | せ | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| suitcase | A | すーつけーす | す | す | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| swing set | A | ぶらんこ | ぶ | こ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| syringe | A | ちゅうしゃき | ち | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| teddy-bear | A | てでぃべあ | て | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| tennis racquet | A | てにすらけっと | て | と | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| toe | A | あしのゆび | あ | び | pending | available | Distinct subtype noun retained in candidate wording; do not collapse it into the existing broader category. |
| toothpaste | A | はみがきこ | は | こ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| tornado | A | たつまき | た | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| tractor | A | とらくたー | と | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| traffic light | A | しんごうき | し | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| trombone | A | とろんぼーん | と | ん (restart) | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| trumpet | A | とらんぺっと | と | と | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| underwear | A | したぎ | し | ぎ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| washing machine | A | せんたくき | せ | き | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| waterslide | A | うぉーたーすらいだー | う | あ | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| wine bottle | A | わいんぼとる | わ | る | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| wine glass | A | わいんぐらす | わ | す | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| wristwatch | A | うでどけい | う | い | pending | available | Direct category noun; candidate pending continuity and naming checks. |
| zigzag | C | じぐざぐ | じ | ぐ | pending | available | Action, abstract mark or named work; weak ordinary picture-shiritori noun. |
