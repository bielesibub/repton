# Repton — faithful single-file HTML port - v1.1

A single-page HTML5 recreation of **Repton** (Superior Software, 1985 — Tim Tyler's
BBC Micro classic), built **entirely from the data in the
[ajgbarnes/bbc-micro-repton](https://github.com/ajgbarnes/bbc-micro-repton)
commented disassembly**: maps, sprites, font, logo, completion banner, loading
screen, both music tracks and all sound effects are decoded from the original
bytes. No asset was redrawn or substituted.

## Play

Open **`repton.html`** in any modern browser and press SPACE.
No server, no dependencies — the file is fully self-contained (~140 KB).

**[▶ Play](https://html-preview.github.io/?url=https://github.com/bielesibub/repton/main/deepseek/repton.html)**

### Controls (original BBC keys)

| Key | Action |
|---|---|
| `Z` / `X` | Move left / right |
| `:` / `/` | Move up / down (arrow keys also work) |
| `RETURN` | Status screen (pauses) |
| `ESCAPE` | Kill Repton |
| `R` | Restart game (status screen, once a game has started) |
| `P` | Enter password (status screen, before starting) |
| `S` / `Q` | Sound on / off |
| `D` / `W` | Music on / off |
| `M` | Mini-map (screens A–H only, like the original); works in play and on the status screen, `M`/`SPACE` returns |

### Level passwords

`Screen one`, `Chameleon`, `Terrapin`, `Sidewinder`, `Gecko`, `Python`,
`Salamander`, `Iguana`, `Cuttlefish`, `Octopus`, `Giant clam`, `The kraken`
(case-insensitive).

## Files

| File | Purpose |
|---|---|
| `repton.html` | **The game.** Built artifact — open this. |
| `template.html` | HTML shell (canvas, CSS, placeholders) |
| `repton-data.js` | Generated `REPTON_DATA` blob: sprite region, maps, logo, finished banner, both music tracks, passwords, level colours, loading-screen PNG |
| `game.js` | The engine (~1,080 lines): renderer, game loop, monsters, audio |
| `init_prompt.md` | The original one-line brief |

Rebuild after editing `game.js` or `repton-data.js`:

```bash
python3 -c "
t = open('template.html').read()
t = t.replace('/*__REPTON_DATA__*/', open('repton-data.js').read())
t = t.replace('/*__REPTON_GAME__*/', open('game.js').read())
open('repton.html','w').write(t)
"
```

`repton-data.js` was produced by a one-off extractor (`/tmp/extract_repton.py`)
that parses the EQUB tables out of the disassembly `.asm` files.

## How the original data is decoded

### Graphics (MODE 5, 2 bpp, 4 colours)

Each tile is 8 bytes = 4×8 pixels, 2 bits per pixel packed across the byte:

```
colour(p) = ((byte >> (7-p)) & 1) * 2 + ((byte >> (3-p)) & 1)      p = 0..3
```

The sprite region `$2FC0–$3FFF` (4,160 bytes) holds tiles `$00–$C7` (walls,
earth, key, egg, rock, diamond, safe, the 96-glyph font, the mini-map chars),
then animation frames: 10 Repton walk frames at `$3600 + frame*$20`, and a
second block at `$3B00` (3 standing poses, monster left/right-hand-up,
big/medium/small explosions, cracked egg, monster standing). A full sprite is a
4×4-tile block displayed at 32×64 canvas pixels. MODE 5 pixels are twice as
wide as tall, so the 256×512 canvas is displayed square.

### Maps (5-bit packed bitstream)

All 12 screens live in one 7,680-byte stream: 32×32 objects per screen at
**5 bits per object, LSB-first**, continuous across the whole stream
(640 bytes per screen). Object IDs: `$00–$15` wall variants, `$16` brick,
`$17` safe, `$18–$1A` earths, `$1B` key, `$1C` egg, `$1D` rock, `$1E` diamond,
`$1F` empty. Objects `< $18` are solid; egg/rock are pushable.

### Sound

BBC pitch byte → frequency: `f = 440 × 2^((P−137)/48)`, square-wave oscillators
with the original ENVELOPE 1 shape (fast attack, decaying tail), plus a noise
buffer for the percussion/noise channel. In-game music is the original
256-step × 3-channel score stepped every 160 ms; the intro is the original
52-step score at 80 ms, played to completion before the main tune starts (in
the original the intro is a blocking sequence before the game loop begins). SFX pitches/volumes match the disassembly calls
(diamond tone, rock-drop noise scaled by fall height, crunch, time-up beep,
monster crush).

### Game loop (faithful to the disassembly)

- 20 ms main iteration; the full 1,024-cell map is scanned for gravity every
  iteration, bottom-up, exactly like the original.
- Repton stays fixed at screen tile (14,14); the world scrolls past him,
  1 tile per iteration (4 iterations per map cell). Keys are only read at
  object boundaries; vertical movement cancels horizontal.
- Collection happens at three corners per tick, in two passes around the
  gravity scan (pass 1 writes the `$FF` Repton marker so falling rocks can
  kill him, pass 2 writes `$1F` empty).
- Diamond +50 points and a sound; earth +1; a key turns every safe into a
  diamond. Diamonds left = diamonds + safes, counted at map decode.
- Rocks/eggs fall into empty cells; a rock landing on the Repton marker kills.
  Eggs crack on landing and hatch monsters. Roll rules depend on the support
  object (diamond/rock/egg/`$15` roll either way; `$00/$09` left only;
  `$01/$0A` right only), including the asymmetric kill quirk: rolling right
  onto the cell below-right kills Repton, rolling left does not.
- Up to 5 monsters: cracked egg → standing → chase phases driven by the
  original `wait += 3` per tick and its thresholds; direction re-chosen at
  object boundaries with a random horizontal/vertical preference toward
  Repton; killed when a falling rock overlaps the 3 sample cells.
- Death: crunch noise, explosion small→medium→big→medium→small (120 ms each),
  480 ms pause, lose a life. **The map is not reset on death** — collected
  items stay collected, as in the original.
- Timer is BCD 6000, −1 per tick (≈120 s). Under 300 the screen flashes white
  on every 4th music beat with a noise beep; at 0, "Out of time." shows for
  1.6 s, then death.
- High-score table (8 entries, default "* Superior Software *" 8000–1000) with
  name entry when the score beats the lowest entry.
- Completing screen L shows the "REPTON has been FINISHED" banner and resets
  to screen A with score and lives intact — exactly what the original does
  (`fn_display_completed_screen` stores 0 into `var_screen_number`).

### Preserved quirks

- Music plays only when **both** sound and music are on (original gating bug).
- The status screen's "game started" test (P vs R option) ORs the score with
  the time LSB, reproduced as `score > 0 || lives < 3 || (time % 100) !== 0`.
- Number fields suppress leading zeros.
- Lives display is one more than the stored value (`fn_add_one_to_lives_left_for_display`).
- Mini-map uses the cyan-for-white palette variant.
- Intro music only on a brand-new game (full lives, zero score, full time).

## Testing

Verified headlessly with Playwright (`/tmp/test_repton*.js` against the built
file): map/sprite decode against the disassembly's own documented examples,
palette per level (incl. via password entry), walk animation, egg→monster
hatch and chase, death sequence and life accounting, high-score name entry
layout, level completion advancing screen/password, finishing screen L
(banner + wrap to screen A), the nearly-out-of-time flash, mini-map toggling
from both play and the status screen, and intro→main-tune music sequencing.
`game.js` exposes a small debug hook `window.__repton` (state, map, score,
`setDiamonds`, `killRepton`, `introPlaying`, `musicStep`, …) used by those tests.

## Version history

- **v1.1** — playtest fixes: main tune no longer overlaps the intro (the
  "garbled first 5 seconds"); `M` shows the mini-map during play and toggles
  back to the game; name-entry screen matches the original layout (logo at
  (0,3), single 32-char congratulations line at (0,15), entry field at
  (2,22)/(25,22)); canvas CSS no longer clips edge characters on narrow
  windows.
- **v1.0** — initial release.

## Credits

- Original game: **Tim Tyler / Superior Software, 1985**
- Disassembly and commentary: **[ajgbarnes/bbc-micro-repton](https://github.com/ajgbarnes/bbc-micro-repton)**
- This port decodes and replays that data; no original assets were modified.
- created using deepseek/deepseek-v4-pro
