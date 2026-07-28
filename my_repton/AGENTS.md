# REPTON (1994 DOS) — Project Memory

## What this folder is
The author's original 1994 DOS/386 game **REPTON** (Turbo C++ / BGI), preserved as
binaries only (source code is lost). In July 2026 it was reverse-engineered from
`REPTON.EXE` (which retains a full symbol table) and rebuilt as a single-file
HTML5 game.

## Original files (DO NOT MODIFY)
| File | What it is |
|---|---|
| `REPTON.EXE` | The game (96 KB, MS-DOS MZ, Turbo C++ 1990, BGI graphics) |
| `MAPEDIT.EXE` | The author's map editor (symbols: `_edit_map`, `_Show_Entire_Map`, …) |
| `REPMAP.DAT` | Level data: 7680 bytes = 8 maps × 40×24 ASCII tile-chars (default set) |
| `REPMAMP.DAT` | Alternate level set, same format |
| `REPTON.PCX` | 32×32 object sprites, 10 per row; cell N = grid cell N |
| `REPMAN.PCX` | Player walk/death frames (32×32) |
| `REP8PIX.PCX` | 8×8 tiles (whole-map zoom view + editor), cell order 0-16 |
| `REP16PIX.PCX` | 16×16 tile sheet (splats/variants) |
| `REPTIT.PCX` | Title screen (PLAY GAME / LOAD MAP / PASSWORD / QUIT) |
| `PBLOG3.PCX` | Author logo splash |

## The remake (all new work lives in `html5/`)
- **`html5/repton.html`** — THE DELIVERABLE. Single self-contained file
  (~130 KB, all assets inlined as base64, works offline).
- **`html5/game.js`** — readable game source (engine + renderer + audio + UI).
- **`html5/assets.js`** — generated: base64 PNGs + both map sets.
- **`html5/tools/`** — everything used to build/analyse:
  - `gen_assets.py` — extracts PNGs from PCX + embeds maps → `assets.js`
  - `build.py` — inlines `assets.js` + `game.js` → `repton.html`
  - `disasm.py`, `dis2.py`–`dis4.py`, `xref.py`, `show.py`, `rdis.py` — capstone
    disassembly helpers (venv in `tools/venv`, has `capstone`)
  - `dosbox.conf` — DOSBox-X config used to run the original
  - `e2e/` — puppeteer-core tests (`test.js`, `physics.js`, `flow.js`, `screens.js`)
- **`html5/extract/`** — decoded PNGs of every PCX (with grid overlays) and test
  renders of the maps.
- **`html5/REVERSE_ENGINEERING.md`** — full technical findings (read this first
  before changing gameplay).

## How to rebuild the HTML after editing `game.js`
```
python3 html5/tools/build.py
```
(After changing art/maps: `python3 html5/tools/gen_assets.py` first.)

## How to test
```
cd html5/tools/e2e && node test.js && node physics.js && node flow.js && node screens.js
```
(Uses system Chrome via puppeteer-core; asserts physics rules, death/respawn,
level flow, menu screens, and captures screenshots.)

## Key facts to remember
- Controls: `Z/X/K/M` move (also arrows), `SPACE` whole-map, `ESC` menu,
  `[`/`]` speed, `S` sfx, `T` music.
- Goal per level: collect ALL diamonds (safes open with the key) AND destroy ALL
  monsters/eggs (crush with boulders). 3 lives.
- Maps 5–8 are empty test doodles (no diamonds/eggs/start) and auto-complete.
- The original ran "too fast" because it has **no clock check**: one physics step
  per main-loop iteration, unthrottled. The remake uses a fixed ~10 steps/sec
  timestep with the same 8-frame smooth scroll.
- Monsters move only every 11th physics step (original `monster_speed` var = 9).
- See `html5/REVERSE_ENGINEERING.md` for memory addresses, cell tables, physics
  pseudocode, and the list of intentional deviations.
