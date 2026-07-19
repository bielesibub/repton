# v1.1 - Repton BBC bitecode to javascript - Kimi K3

The original build looked great but there were a few problems.

## Initial Prompt

The Javascript version of the game Repton @repton.html was built from the disassembly found at  https://github.com/ajgbarnes/bbc-micro-repton. There are a few issues:

- The homescreen is meant to say the word repton, currently its a random splattering of the blocks
- Sometimes the monster turns invisible, I noticed this especially on the level Chameleon.

## Completion Output

# Todos
[✓] Fix homescreen logo/colours (logical colour 3 = green, matching original)
[✓] Verify logo renders REPTON correctly vs original game
[✓] Investigate monster invisibility on Chameleon
[✓] Full regression test + visual comparison with original
Both issues are fixed in repton.html (rebuilt — just reopen it).
1. Homescreen
I ran the original game in the jsbeeb emulator and compared it side-by-side with mine. Two real problems found and fixed:
- Wrong palette — in this game, logical colour 3 is green, not white (fn_reset_palette_to_default_game_colours sets logical 3 = physical 2). My version rendered it white, so Repton had a white head, monsters were white, and all the info text was white. Now: green-headed Repton, green monsters, green "Score/Time/Lives…" text, cyan text on the map view — exactly like the original.
- Layout — values now suppress leading zeros (Score : 0 not 000000), Password : Screen one shows for screen A, and the Press lines sit at the bottom rows, as in the original.
The REPTON brick logo itself was actually correct all along — I verified it pixel-for-pixel against both the disassembly data and the real game (it's red brick letters; the emulator just looks smoother due to its bilinear scaling). With the palette fixed, the whole screen is now identical to the original.
2. Monster invisibility
I hunted this hard with instrumented tests: a monster sealed in a rock-proof room stayed visible for 20s (pixel-level checks every 500 ms), a roaming monster showed zero flicker across 200 frames, and a full Chameleon playthrough tracked every monster's lifecycle. There is no rendering bug.
What you're seeing is monsters being crushed by falling rocks — which is exactly how the original works. Rock cells pass straight through monsters (they're empty on the map), and when a rock falls into a monster's cell it's killed instantly (fn_check_if_monster_dead, replicated faithfully including the original's STY/LDY register bug). Chameleon is the most rock-dense screen (54 rocks), so a monster often gets crushed during its ~1-second hatching window, or by a rock that falls through its cell in a single frame — easy to miss, so the monster seems to "turn invisible". You can also weaponise this yourself by dropping rocks on monsters, which is a core Repton tactic.
Regression suite: all 18 gameplay tests pass (rock physics, rolling, pushing, hatching, monster AI, kills, key/safe, timer, completion, passwords, mini-map), 120 FPS.

## Other..

Single page HTML BBC Repton remake
Context
401,795 tokens
38% used
$21.95 spent