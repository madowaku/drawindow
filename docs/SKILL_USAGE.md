# Skill scope and execution

## Character v0.2 update (2026-10-17)

The user's explicit request to find and use a 2D character-animation plugin or
skill was handled with Plugin Management search (Live2D / Spine / 2D character
animation) and the installed Sprite Pipeline skill. Search returned Runway,
Higgsfield and Figma; none was added for this work. Live2D's official runtime
documentation requires exported model data (moc3/model3.json), which the supplied
PNG artwork does not contain. The current solution is a pose-based animated
illustration, with no claim of a Live2D or skeletal rig.

Sprite Pipeline principles were applied to a single approved identity, one
whole-atlas edit, shared size/anchor, alpha preservation and browser inspection.
ImageGen used the built-in tool for that atlas and the separate background.
Game Playtest and Hiro Frontend QA guide state, responsive and visual checks.
The native Web Animations API pattern was consulted from Hyperframes Animation's
adapter reference; this remains an interactive game, not a HyperFrames movie,
and no HyperFrames runtime was installed. Native animations are cancelled on
cleanup and disabled for reduced motion.

Research: [Live2D embedded data](https://docs.live2d.com/en/cubism-editor-manual/export-moc3-motion3-files/).

## Initial game implementation

The user requested a production game from the supplied implementation task. That request controls stack, game rules and completion scope. The attached files were inspected as specification/reference material; their executable agent configuration was not installed or merged into protected `.codex` paths. Runtime collaboration tools successfully selected all three requested model/effort profiles directly.

- Game Studio, Web Game Foundations and Game UI Frontend: applied to simulation/render separation, DOM controls, Canvas input and mobile-first layout. The specification explicitly selects React/Vite/Canvas2D.
- ImageGen: built-in tool used for one six-panel character atlas. No API-key fallback used. Exact source retained, equal-grid extraction recorded. Sprite Pipeline principles applied to one-sheet identity continuity; no frame-by-frame generation.
- Product Design Image to Code: supplied illustrations ground image choice/crop/color; these are illustration references, not UI screenshots. The task explicitly requests full production behavior and a specific game stack, so the game remains a standard Vite game rather than a phone-device prototype shell. Saved-context preflight ran; no saved context exists. Browser QA and `design-qa.md` are the handoff gate.
- Designly Visual QA: applied to the actual generated art and browser captures, including anatomy/identity, game readability, hierarchy and AI-slop checks.
- Superdesign: CLI preflight ran and reported not authenticated; its login flow was opened. No canvas draft or paid generation is claimed. Game implementation continues independently from the supplied game specification and illustration references.
- Game Asset Production/Vendoring: local `game-dev` executable was not available. No canonical reusable package or vendor admission is claimed. Native ImageGen assets are project-bound, with source bytes, hashes and provenance retained. No paid provider was invoked.
- Game Visual Debugging: no project adapter existed and none was installed. Deterministic module tests and browser screenshots are retained; no sealed GPU/telemetry run is claimed.
- Three WebGL Game / Tripo Game Asset: reviewed as requested, but the implementation task explicitly requires Canvas2D and no unnecessary 3D. No 3D dependency or paid Tripo job was added.
- Novelist Visual Asset: consistency/provenance practices inform character assets; this is a game with no manuscript/EPUB, so no novel project files or cover registration were created.
