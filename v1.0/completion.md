# v1.0 - Repton BBC bitecode to javascript - Kimi K3

An attempt to build a Javascript Repton from bitecode using Kimi K3

## Initial Prompt

using only the files at https://github.com/ajgbarnes/bbc-micro-repton build a single page html version of this bbc classic, include maps, graphics - with animation, sound and music. create as faithfully as you can.

## Completion Output

Done! repton.html (79 KB, fully self-contained single page) is now open in your browser. It was built entirely from the disassembly data in this repo.
What was built
Data decoded straight from the original 6502 sources:
- All 12 maps (A–L) — decoded from the 5-bit-per-object bitstream in repton-maps.asm using the exact algorithm from fn_get_next_map_object (verified: "TIM TYLER" on D, the skull on E, spiral on H, "REPTON" on L)
- All graphics — every tile decoded from repton-sprites.asm with authentic BBC MODE 5 2bpp interleaving (pixel-perfect match against repton-sprites.png), plus per-screen palettes (A=red, B=blue, C=magenta … L=cyan)
- Music — the full 3-channel in-game tune (256 steps at the original 160 ms timer rate) and the start-screen intro, from repton-main-music.asm / repton-music-intro-notes.asm
Faithful game logic (from repton2-commented.asm):
- Rocks/eggs fall one cell per loop, roll off rocks/diamonds/eggs (with the original's asymmetric left/right roll), crush Repton via the $FF map-marker trick, and eggs crack → hatch → chase you through dug tunnels only (original random-direction AI, including the STY/LDY bug quirk in the crush check)
- Rock pushing, earth/diamond/key pickups (50/1 points), key converts all safes to diamonds, 6000-unit timer with white screen-flash + beeps when low, "Out of time.", 4 lives, explosion death sequence, dissolve transitions, idle animation, walking/standing sprite cycles
- Loading splash, status screen (Enter), M for the mini-map (screens A–H only, "mean!"), level passwords (P — try Chameleon), game-over and "REPTON HAS BEEN FINISHED" screens
- Sound effects: diamond ding, rock drop (volume by row), death crunch, monster crush — square-wave Web Audio with BBC channel cut-through
Controls: Arrows (or Z/X/:/​/) to move · Enter = status · Esc = give up · M = map · S/Q sound · D/W music · R restart · Space = play
build.py + repton-template.html are included so you can regenerate repton.html after any tweak. Enjoy the game!

## Other..

Single page HTML BBC Repton remake
Context
310,428 tokens
30% used
$12.58 spent