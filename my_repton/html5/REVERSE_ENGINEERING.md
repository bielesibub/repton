# REPTON (1994 DOS) — Reverse Engineering Report

Everything below was recovered from `REPTON.EXE` (MS-DOS MZ, Turbo C++ 1990, BGI,
full symbol table) using a capstone-based disassembler, plus decoding of the PCX
graphics and DAT level files. This document is the ground truth for the remake.

---

## 1. Files & formats

### REPMAP.DAT / REPMAMP.DAT — levels
7680 bytes of ASCII text = **8 maps × 960 bytes (40×24 cells)**, row-major.
Each character is one tile, mapped to a cell value by its position in
`"0123456789abcdefghij"` (i.e. `'0'..'9'` → 0-9, `'a'..'j'` → 10-19).
Maps 1-4 are real levels; maps 5-8 are empty test doodles (no diamonds, eggs or
player start) and auto-complete instantly in-game.

Object counts per map (default set, REPMAP.DAT):

| map | diamonds(2)+safes(g) | eggs(j) | keys(f) | skulls(e) | start(7) |
|-----|----------------------|---------|---------|-----------|----------|
| 1   | 133                  | 0       | 1       | 19        | 1        |
| 2   | 103                  | 3       | 1       | 0         | 1        |
| 3   | 130                  | 3       | 1       | 0         | 1        |
| 4   | 176                  | 1       | 1       | 4         | 1        |
| 5-8 | 0                    | 0       | 0       | 0         | 0        |

### PCX graphics (all 320×200, 8-bit paletted)
- `REPTON.PCX` — object sprites in a 32×32 grid, 10 per row. **Cell value N is
  drawn from grid cell N** (confirmed against the sprite-grab init code).
- `REPMAN.PCX` — player frames, 32×32 grid. Game uses frames 0-9 (row 0) and
  10-11 (row 1): 0-5 front-facing (down), 6-8 back (up), 9-11 side (left/right).
- `REP8PIX.PCX` — 8×8 tiles for the whole-map zoom view (cells 0-16), also used
  by MAPEDIT.
- `REPTIT.PCX` — title/menu screen. `PBLOG3.PCX` — author logo splash.

---

## 2. Memory map (from disassembly)

Load image base: code segment 0; DGROUP at paragraph `0xb16` (some routines,
e.g. keyboard ISR + HUD, use `0xb18`). Second code segment at `0x9a9`
(file offset `0x9a90`, the PCX/sprite library); a third at `0x70d` (title/menu).

Key data variables (offsets within DGROUP):

| Addr | Meaning | Initial |
|------|---------|---------|
| `[0xd0]` | lives | **3** |
| `[0xcc]` | current map (0-7) | 0 |
| `[0xca]` | quit/game-over flag | 0 |
| `[0xd2]` | monsters+eggs remaining (level-complete counter) | per level |
| `[0xd4]` | monsters crushed by pushing (stat only) | 0 |
| `[0xd8]` | **monster speed** | **9** |
| `[0xda]` | monster move counter (cycles 0..10) | — |
| `[0x1540]` | player-dead flag | 0 |
| `[0x1542]` | total diamonds (incl. safes) | per level |
| `[0x2280]` | diamonds collected | 0 |
| `[0x162a]`/`[0x162c]` | player cell x/y | — |
| `[0x153c]`/`[0x153e]` | player start (respawn) x/y | — |
| `[0x1538]`/`[0x153a]` | viewport origin cell = `player-4`, `player-2` | — |
| `[0xc4]` | player facing (0 down,1 up,2 right,3 left) | — |
| `[0xc6]` | walk anim frame (0-3) | — |
| `[0x92]` `[0x94]` `[0x96]` `[0x98]` `[0x9a]` | held-key flags: up(K), down(M), right(X), left(Z), space | — |
| `[0x219c]` | last key scancode (port 0x60) | — |
| `[0xdac]` | **working 40×24 word grid** (2 bytes/cell, row stride 0x50) | — |
| `[0x2606]` | pristine copy of all 8 loaded maps | — |

---

## 3. Key routines (file offsets in the EXE load image)

| Addr | Symbol / role |
|------|---------------|
| `0x744e` | `_Init_Game`: mode 13h, load world, grab sprites, show logo |
| `0x8890` | `_load_world` / map parser (reads file char-by-char; switch writes cell values 0..0x13 into `[0x2606]`) |
| `0x8957+` | parser case bodies (the 23 sequential `mov word [bx+0x2606], N` stores that proved char→cell = 0..19) |
| `0x8bf0` | `_Init_Cells` sprite-table setup (grabs sprites from PCX structs) |
| `0x95ac` | level init: resets counters, scans current map — cell 2 & 16 → `diamondsTotal++`, cell 19 → `monsters++`, cell 7 → start pos |
| `0x9661` | respawn: spiral-search for a free cell near the start, place player |
| `0x7a12` | **`_update_map`** — the two-pass physics (see §5) |
| `0x83c8` | `_check_map` — movement rules (see §6); case bodies at `0x843c..`, jump table right after the function at `0x8866` |
| `0x986c` | `_move_baddie` — monster AI (see §7) |
| `0x7740` | main game loop (see §8) |
| `0x92ea` | keyboard ISR (port 0x60 scancode handler) |
| `0x9412` | `_Show_Entire_Map` — SPACE zoom: 8×8 whole-map + HUD, waits for SPACE |
| `0x72b7` | title menu (segment `0x70d`) — mouse hit-testing, returns 1-4 |
| seg `0x9a9`: `0xc17` | grab 32×32 sprite from a PCX struct into a table entry |
| seg `0x9a9`: `0xb70` | blit a 32×32 cell sprite |
| seg `0x9a9`: `0xfbf` | blit an 8×8 cell sprite |
| seg `0x9a9`: `0x3d7` | PCX_Load (fopen + read header + RLE decode) |
| seg `0x9a9`: `0xfe` | present frame |

### Sprite-grab mapping (from `_Init_Cells`, `0x8c3e..0x8d9e`)
- Object table (struct `0x1548`): cells 0-9 ← `REPTON.PCX` grid `(0..9, 0)`;
  cells 10-19 ← grid `(0..9, 1)`; cell 20 ← grid `(0, 2)`; cells 21/22 ← grid
  `(9, 1)`. **Exception: cell 7 (player start) ← grid `(0,0)` = space tile**
  (the moving player is drawn separately from REPMAN frames).
- Player table (struct `0x21a2`): frames 0-9 ← `REPMAN.PCX` row 0, frames
  10-11 ← row 1. Frame shown = `animTable[dir*4 + walkFrame]`.

---

## 4. Cell types & behaviour

| # | char | sprite | Name | Behaviour |
|---|------|--------|------|-----------|
| 0 | `0` | black | Space | walk |
| 1 | `1` | dirt | Earth | walk = dig |
| 2 | `2` | gem | Diamond | collect (`diamondsGot++`) |
| 3 | `3` | rock | Boulder | push horizontally; falls; crushes player & monsters |
| 4,5,6 | `4,5,6` | bricks | Walls | blocked |
| 7 | `7` | (blank) | Player start | becomes the player |
| 8 | `8` | rock | Boulder (rolling) | same physics as 3 |
| 9 | `9` | rock | Falling boulder | transient state |
| 10-13 | `a-d` | bricks | Walls | blocked |
| 14 | `e` | skull | Skull | **deadly** on touch |
| 15 | `f` | key | Key | collect → **all safes (16) become diamonds** |
| 16 | `g` | safe | Safe | blocked; counts toward diamond total; opens via key |
| 17,18 | `h,i` | bricks | Walls | blocked |
| 19 | `j` | egg | Egg | pushable; falls; **hatches into monster (20) on landing**; counts toward monster total |
| 20 | — | blob | Monster | **deadly**; chases player every 11th step |
| 21 | — | egg | Falling egg | transient state |

Walls use several brick sprites (plain, green-edged, green-topped, grey, brown)
but are all simply impassable.

---

## 5. Physics (`_update_map`, two passes per step)

The grid is a 40×24 array of 16-bit cells. One physics step per main-loop
iteration.

**Pass 1 — resting objects fall/roll** (top-down scan):
for each cell holding a boulder (3, 8) or egg (19):
- If the cell below is empty (0): move it down one cell as a *falling* object
  (boulder → 9, egg → 21); clear the origin.
- Else if the cell below is "round" — diamond(2), boulder(3,8), skull(14),
  egg(19): try to roll off. If the side cell AND the diagonal-below cell are
  both empty on the left → can roll left; same on the right. If both, pick
  **randomly**. Move diagonally down (becomes falling 9/21). Rolling onto the
  player kills; rolling onto a monster crushes it (`monstersLeft--`).

**Pass 2 — falling objects** (scan for 9 and 21):
- Falling boulder (9): if below empty → stay falling (becomes 8, so pass 1 moves
  it next step). If below is the player → crush (death). If below is a monster →
  crush (`monstersLeft--`). If below is solid/round → settle: on round tops stay
  "rolling" (8), on flat ground rest (3).
- Falling egg (21): if below empty → keep falling (back to 19). If it lands →
  **hatches into a monster (20)**. If it lands on the player → hatches *and*
  kills the player.

This two-phase scheme (mark 9/21 in pass 1, settle/continue in pass 2) makes
every object move exactly one cell per step.

---

## 6. Movement (`_check_map`)

`_check_map(dx, dy)` returns 1 (allowed) / 0 (blocked) and applies side effects:
- bounds: target x∈1..39, y∈1..23
- space/earth → move (earth is dug)
- diamond → collect + move
- boulder/egg (3,8,9,19) → **horizontal push only**: if the cell beyond is empty,
  the object slides there; if beyond is a monster, it is crushed
- key (15) → collect; every safe (16) in the map becomes a diamond
- skull (14) / monster (20) → move + **die**
- everything else (walls) → blocked

On a successful move the caller replaces the target cell with the player (7)
and the old cell with space.

---

## 7. Monster AI (`_move_baddie`)

Every 11th physics step (`counter > monster_speed(9)`, counter wraps), each
monster (20) moves one cell toward the player, trying in order:
1. horizontally toward the player (if that cell is empty or the player)
2. vertically toward the player (same rule)

Moving into the player kills. Monsters are blocked by any non-empty cell, so
they stalk through open tunnels only.

---

## 8. Main loop, timing & why it ran too fast

```
loop:
  if ESC pressed: lives=-1, quit
  on held direction: _check_map -> if ok, move player 1 cell,
                     set facing + walk frame, do an 8-frame smooth pixel scroll
  _update_map (one physics step)          # skipped for 1 iteration after death
  if diamondsGot==total && monstersLeft==0: next map
  if dead: clear player cell, lives--, respawn or game over (lives<0)
  present
```

There is **no clock check anywhere**: one physics step per loop iteration as
fast as the CPU executes it, with only (at best) a partial vsync in the
present routine. On a modern PC that is thousands of steps per second —
hence "runs far too fast". The remake therefore uses a fixed timestep
(~10 steps/sec, matching the likely ~70 Hz/8 original cadence, adjustable with
`[` `]`) and the same 8-frame smooth scroll per move.

---

## 9. HUD, screens, controls

- **In-game HUD: none** (the viewport fills the screen).
- **SPACE** toggles `_Show_Entire_Map`: the whole 40×24 level in 8×8 tiles
  (320×192) plus a top bar with repton/diamond/monster icons and
  `" x %d"` × 3 = lives, diamonds left, monsters left. Press SPACE again to
  return.
- **Splash** (`PBLOG3.PCX`) on start, then the **title** (`REPTIT.PCX`) with a
  mouse-driven menu (keyboard also works):
  - PLAY GAME (hitbox x/2 0x67-0xd4, y 0x53-0x5f)
  - LOAD MAP (0x67-0xc5, 0x64-0x70) — prompts for a map filename
  - PASSWORD (0x67-0xd1, 0x75-0x81) — in the shipped game this just loops back
    to the menu (feature never finished); the remake makes it a level select
  - QUIT (0x67-0x94, 0x86-0x93)
- **Controls** (from the keyboard ISR): `Z`=left, `X`=right, `K`=up, `M`=down,
  `SPACE`=whole map, `ESC`=quit. (Remake adds arrows as aliases.)
- Death: instant respawn at the start (or nearest free cell), `lives--`;
  game over when `lives<0` (so you effectively get 4 attempts: 3,2,1,0).

---

## 10. The remake (`html5/`)

Single-file `repton.html` built from readable `game.js` + generated `assets.js`
by `tools/build.py`. Faithful to everything above, with these **deliberate
deviations** (all for playability/modern convenience):

1. **Falling boulders crush monsters** (in the original only *rolling* boulders
   clearly decrement the counter; a directly-falling boulder just rests on a
   monster, which could soft-lock a level). Unified: any boulder crush kills.
2. **Touching a monster** removes it *and* decrements the counter (the original
   removes it without decrementing — a potential soft-lock).
3. **PASSWORD** is a level select (the original menu item was unfinished).
4. **Added sound & music** (the original is silent — the only port-61 writes in
   the EXE are the keyboard-ISR acknowledge). WebAudio chiptune SFX + a loop,
   toggles `S`/`T`.
5. **Added** slim status bar, level intro/complete banners, speed control,
   arrow-key aliases, mouse click on the menu.
6. Empty test maps 5-8 auto-skip to the win screen (they'd auto-complete in the
   original too, then read out-of-bounds data).

### Verified by automated tests (`html5/tools/e2e/`)
Movement/digging, diamond & key & safe logic, boulder fall/roll/crush (player
and monster), egg hatching, monster chase, death & respawn, level completion &
progression, game over at lives<0, menu screens. All passing, no JS errors.
