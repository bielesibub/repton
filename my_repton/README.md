# REPTON (1994 DOS) — Original Binaries & HTML5 Revival

This folder **my own very old 1994 MS-DOS game REPTON**, written in Turbo C++
(BGI graphics) on a 386 PC, preserved **as binaries only — the source code is lost**.
In July 2026 the game was reverse-engineered from `REPTON.EXE` (which fortunately
retains its full symbol table) and rebuilt as a single self-contained HTML5 file.

> *"I've lost the code for my old version of repton that I made on an old 386 pc.
> it never had any clock checks, so it runs far too fast, is there anyway you can
> fix it?"* — the prompt that started it (`opencode_k3_fix_prompt.md`)

This is a separate project from the BBC Micro Repton remake at the repo root:
that one reconstructs Tim Tyler's 1985 original from a 6502 disassembly; this one
resurrects the author's own 1994 DOS homage from its surviving binaries.

## The deliverable

**`html5/repton.html`** — the game. A single ~130 KB self-contained file: every
sprite and both map sets are inlined as base64/JS, so it works offline in any
modern browser. Just double-click it — no server, build step or dependencies.

### Controls

| Key | Action |
| --- | --- |
| `Z` / `X` / `K` / `M` (or arrow keys) | Move |
| `SPACE` | Whole-map zoom view (press again to return) |
| `ESC` | Quit to menu |
| `[` / `]` | Game speed down / up |
| `S` / `T` | Sound effects / music toggle |

**Goal per level:** collect **all** diamonds (the key turns every safe into a
diamond) **and** destroy **all** monsters and eggs (crush them with boulders).
You start with 3 lives. Boulders and eggs fall when unsupported and roll off
rounded surfaces (diamonds, boulders, skulls, eggs) — they crush the player
*and* monsters. Eggs hatch into monsters when they land. Skulls and monsters
are deadly on touch.

Maps 1–4 are real levels; maps 5–8 are empty test doodles from 1994 and
auto-complete instantly.

## Directory layout

```
my_repton/
├── REPTON.EXE            # The 1994 game (96 KB, MS-DOS MZ, Turbo C++ 1990, BGI)
├── MAPEDIT.EXE           # The author's original map editor
├── REPMAP.DAT            # Level data: 8 maps × 40×24 ASCII tile-chars (default set)
├── REPMAMP.DAT           # Alternate level set, same format
├── REPTON.PCX            # 32×32 object sprites, 10 per row (cell N = grid cell N)
├── REPMAN.PCX            # Player walk/death frames (32×32)
├── REP8PIX.PCX           # 8×8 tiles for the whole-map zoom view + editor
├── REP16PIX.PCX          # 16×16 tile sheet (splats/variants)
├── REPTIT.PCX            # Title/menu screen (PLAY GAME / LOAD MAP / PASSWORD / QUIT)
├── PBLOG3.PCX            # Author logo splash
├── AGENTS.md             # Project memory for AI coding assistants
├── opencode_k3_fix_prompt.md
└── html5/                # Everything new lives here
    ├── repton.html       # ★ THE DELIVERABLE (generated — do not edit directly)
    ├── game.js           # Readable game source: engine, renderer, audio, UI
    ├── assets.js         # Generated: base64 PNGs + both map sets
    ├── REVERSE_ENGINEERING.md  # Full technical findings — read before touching gameplay
    ├── extract/          # Decoded PNGs of every PCX (with grid overlays), map renders
    └── tools/
        ├── gen_assets.py # PCX/DAT → assets.js
        ├── build.py      # assets.js + game.js → repton.html
        ├── disasm.py, dis2.py–dis4.py, rdis.py, xref.py, show.py
        │                 # Capstone disassembly helpers (venv in tools/venv)
        ├── dosbox.conf   # DOSBox-X config for running the original
        └── e2e/          # Puppeteer tests: test.js, physics.js, flow.js,
                          # screens.js, visual.js, final.js
```

## ⚠️ Original files — DO NOT MODIFY

The EXE/PCX/DAT files in the root of this folder are the only surviving copies
of the 1994 originals. Treat them as read-only. All new work goes in `html5/`.

## Building

After editing `html5/game.js`:

```
python3 html5/tools/build.py
```

After changing art or maps (rare — that means editing the originals):

```
python3 html5/tools/gen_assets.py   # then build.py
```

Note: `gen_assets.py` has a hardcoded `SRC` path near the top — adjust it if the
folder has moved. It needs Pillow (`pip install Pillow`; a venv with it lives in
`html5/tools/venv`).

## Testing

```
cd html5/tools/e2e
npm install            # first time only (puppeteer-core)
node test.js && node physics.js && node flow.js && node screens.js
```

The tests drive the game in system Chrome via puppeteer-core and assert the
physics rules (boulder fall/roll/crush, egg hatching), diamond/key/safe logic,
monster chase, death & respawn, level completion & progression, game over at
lives < 0, and the menu screens. `visual.js` captures screenshots.

## Why the original "ran too fast"

The 1994 code has **no clock check anywhere**: it runs one physics step per
main-loop iteration, as fast as the CPU can execute it. On a 386 that was
roughly right; on any modern machine it's thousands of steps per second. The
remake uses a fixed timestep (~10 physics steps/sec, adjustable with `[` `]`)
with the original's 8-frame smooth pixel scroll per move, and monsters move
every 11th step exactly as the original's `monster_speed = 9` dictates.

## Reverse engineering

`html5/REVERSE_ENGINEERING.md` is the ground truth, recovered from the EXE with
a capstone-based disassembler plus decoding of the PCX graphics and DAT maps:

- **File formats** — the 8×(40×24) ASCII map layout, char→cell mapping
  (`'0'..'9','a'..'j'` → cells 0–19), and the PCX sprite-sheet cell tables.
- **Memory map** — DGROUP variable addresses (lives, map, monster speed,
  diamond/monster counters, player state, the working 40×24 word grid).
- **Key routines** — file offsets for `_update_map` (two-pass physics),
  `_check_map` (movement rules), `_move_baddie` (monster AI), the main loop,
  the keyboard ISR, and the PCX/sprite library.
- **Cell behaviour table** — all 23 cell types and their rules.
- **Intentional deviations** in the remake (all for playability): falling
  boulders crush monsters, touching a monster decrements the counter (both fix
  soft-locks), PASSWORD became a level select (the original menu item was never
  finished), sound/music was added (the original is silent), plus a slim status
  bar, banners, speed control and arrow-key aliases.

## Credits

- Original game © 1994 me (Turbo C++ / BGI, MS-DOS).
- Reverse engineering and HTML5 port: [Kimi K3](https://platform.kimi.ai/) with
  [opencode CLI](https://opencode.ai/), July 2026.
