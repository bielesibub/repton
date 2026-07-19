# Repton — BBC Micro HTML5 Remake

A faithful single-page HTML5 remake of **Repton**, the BBC Micro classic written by
**Tim Tyler** and published by **Superior Software** in 1985.

Everything — maps, graphics, animation, sound and music — is decoded directly from
the original 6502 game data published in the
[ajgbarnes/bbc-micro-repton](https://github.com/ajgbarnes/bbc-micro-repton)
disassembly, so what you see and hear is the real game data, not redrawn approximations. 

Big thanks to [Andy Barnes](https://github.com/ajgbarnes), for doing the clever  stuff.

Created purely by [Kimi K3](https://platform.kimi.ai/) and [opencode CLI](https://opencode.ai/) 

## Playing the game

Open `repton.html` (at the repo root) in any modern browser — just double-click it,
no server, build step or dependencies needed. It's the latest build; the `v1.0`,
`v1.1` and `v1.2` folders record the development history (each has a `completion.md`
describing that step).

Click / press any key once to get past the Superior Software loading screen, then:

| Key | Action |
| --- | --- |
| Arrow keys (or `Z` `X` `:` `/`) | Move Repton |
| `RETURN` / `Enter` | Status screen (pause) |
| `ESCAPE` | Give up (kill Repton) |
| `SPACE` | Play / continue |
| `M` | Show map (screens A–H only) |
| `S` / `Q` | Sound on / off |
| `D` / `W` | Music on / off |
| `R` | Restart game |
| `P` | Enter password (on the start screen) |

**Goal:** collect every diamond on each of the 12 screens (A–L) before time runs out.
Rocks and eggs fall when unsupported and roll off rounded surfaces — they crush Repton
*and* monsters. Eggs hatch into monsters; monsters can be squashed with falling rocks.
A key turns all safes into diamonds.

### Screen passwords

| Screen | Password | Screen | Password |
| --- | --- | --- | --- |
| A | Screen one | G | Salamander |
| B | Chameleon | H | Iguana |
| C | Terrapin | I | Cuttlefish |
| D | Sidewinder | J | Octopus |
| E | Gecko | K | Giant clam |
| F | Python | L | The kraken |

## What's inside

- **All 12 original maps** — decoded from the original 5-bit-per-object map bitstream
  (`repton-maps.asm`), 32×32 objects per screen.
- **Original graphics** — all tiles/sprites decoded from the original MODE 5 (2 bpp)
  graphics data (`repton-sprites.asm`), including the brick-letter REPTON logo
  (`repton-logo.asm`), the loading screen and the "Repton has been finished" graphic.
- **Animation** — Repton's walk/idle cycles, hatching eggs, monsters, falling/rolling
  rocks and Repton's death sequence, modelled on the original routines.
- **Sound & music** — intro tune and the in-game 3-channel tune rebuilt note-for-note
  from the original note data (`repton-music-intro-notes.asm`,
  `repton-main-music.asm`) using WebAudio square-wave channels; effects for diamonds,
  falling rocks, crunches and the low-time warning flash/beep.
- **Faithful game logic** — rock/egg physics, monster AI and crush rules, key/safe
  mechanic, scoring, timer, lives, hi-score, passwords, mini-map and the completion
  sequence, all ported from `repton2-commented.asm`.

## Technical notes

- Single self-contained HTML file: all game data is embedded as base64 JSON; the
  256×256 canvas renders the original 32×32 tile viewport (each 4×8 BBC tile drawn at
  8×8 px, reproducing the MODE 5 wide-pixel look at integer scale).
- Per-screen palette matches the original (`LEVELCOL`), with cyan substituted on the
  map view and the white flash when nearly out of time.
- Text is drawn with the original character set and the BBC colour-mask trick
  (`$0F`/`$F0`/`$FF` nibble masks select red / yellow / green), including the exact
  status-screen layout (logo written sequentially over 6 rows of 32 chars, `Music :`
  on row 24, `Password :` on row 26, etc.).
- Game loop runs at the original 25 ms iteration rate.

## Version history

Progress snapshots live in the `v1.x` folders, each with its own `completion.md`.

- **v1.0** — first working single-page build from the disassembly data.
- **v1.1** — fixed the palette (logical colour 3 is green, not white), score
  leading-zero suppression, and investigated monster "invisibility" (confirmed to be
  faithful rock-crush behaviour, not a bug).
- **v1.2** — home screen made pixel-faithful to the original: REPTON logo drawn
  sequentially as 6 rows of 32 tiles (was incorrectly 24×8, garbling the letters),
  `Music :`/`Password :` moved to rows 24/26, `By` comma removed, press-line spacing
  matched to the original strings, and the non-original HTML hint line removed.

## Credits

- Original game © 1985 **Tim Tyler / Superior Software**.
- 6502 disassembly and annotations: [ajgbarnes/bbc-micro-repton](https://github.com/ajgbarnes/bbc-micro-repton).
- HTML5 remake built with OpenCode (Kimi K3).

This is a fan/educational project — no original code or assets are distributed beyond
what the disassembly repository itself contains.
