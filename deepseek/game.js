/* ============================================================================
   REPTON — faithful HTML5 remake of the 1985 Superior Software BBC Micro game
   by Tim Tyler. Built exclusively from the data in ajgbarnes/bbc-micro-repton
   (disassembly, maps, sprites, music). Game logic ported from the commented
   6502 disassembly (repton2-commented.asm).
   ============================================================================ */
'use strict';

/* ------------------------------------------------------------------ *
 *  Constants from the disassembly
 * ------------------------------------------------------------------ */
const OBJ = {
  TL_RND_BRICK:0x00, TR_RND_BRICK:0x01, BL_RND_BRICK:0x02, BR_RND_BRICK:0x03,
  BRICK_L:0x04, BRICK_R:0x05, BRICK_T:0x06, BRICK_B:0x07, BRICK:0x08,
  TL_RND_SOLID:0x09, TR_RND_SOLID:0x0A, BL_RND_SOLID:0x0B, BR_RND_SOLID:0x0C,
  SOLID_L:0x0D, SOLID_R:0x0E, SOLID_T:0x0F, SOLID_B:0x10, SOLID:0x11,
  YEL_BRICK_RED:0x12, CIRCLES:0x13, OVALS_V:0x14, OVALS_H:0x15,
  BRICK_WALL:0x16, SAFE:0x17, EARTH1:0x18, EARTH2:0x19, MESH_EARTH:0x1A,
  KEY:0x1B, EGG:0x1C, ROCK:0x1D, DIAMOND:0x1E, EMPTY:0x1F
};
const OFFMAP_OBJECT = 0x15;           // object shown off the edge of the map
const REPTON_MARKER = 0xFF;           // map marker for Repton's cells

// Object -> 16 tiles (4x4), from repton-map-objects-to-tile-defs.asm
const OBJECT_TILES = [
  [0x48,0x49,0x42,0x43, 0x44,0x41,0x40,0x41, 0x44,0x41,0x40,0x41, 0x44,0x41,0x40,0x41],
  [0x42,0x43,0x4A,0x4B, 0x40,0x41,0x40,0x45, 0x40,0x41,0x40,0x45, 0x40,0x41,0x40,0x45],
  [0x44,0x41,0x40,0x41, 0x44,0x41,0x40,0x41, 0x44,0x41,0x40,0x41, 0x4C,0x4D,0x46,0x47],
  [0x40,0x41,0x40,0x45, 0x40,0x41,0x40,0x45, 0x40,0x41,0x40,0x45, 0x46,0x47,0x4E,0x4F],
  [0x44,0x41,0x40,0x41, 0x44,0x41,0x40,0x41, 0x44,0x41,0x40,0x41, 0x44,0x41,0x40,0x41],
  [0x40,0x41,0x40,0x45, 0x40,0x41,0x40,0x45, 0x40,0x41,0x40,0x45, 0x40,0x41,0x40,0x45],
  [0x42,0x43,0x42,0x43, 0x40,0x41,0x40,0x41, 0x40,0x41,0x40,0x41, 0x40,0x41,0x40,0x41],
  [0x40,0x41,0x40,0x41, 0x40,0x41,0x40,0x41, 0x40,0x41,0x40,0x41, 0x46,0x47,0x46,0x47],
  [0x40,0x41,0x40,0x41, 0x40,0x41,0x40,0x41, 0x40,0x41,0x40,0x41, 0x40,0x41,0x40,0x41],
  [0x11,0x10,0x10,0x10, 0x0D,0x0C,0x0C,0x0C, 0x0D,0x0C,0x0C,0x0C, 0x0D,0x0C,0x0C,0x0C],
  [0x10,0x10,0x10,0x12, 0x0C,0x0C,0x0C,0x0F, 0x0C,0x0C,0x0C,0x0F, 0x0C,0x0C,0x0C,0x0F],
  [0x0D,0x0C,0x0C,0x0C, 0x0D,0x0C,0x0C,0x0C, 0x0D,0x0C,0x0C,0x0C, 0x13,0x0E,0x0E,0x0E],
  [0x0C,0x0C,0x0C,0x0F, 0x0C,0x0C,0x0C,0x0F, 0x0C,0x0C,0x0C,0x0F, 0x0E,0x0E,0x0E,0x14],
  [0x0D,0x0C,0x0C,0x0C, 0x0D,0x0C,0x0C,0x0C, 0x0D,0x0C,0x0C,0x0C, 0x0D,0x0C,0x0C,0x0C],
  [0x0C,0x0C,0x0C,0x0F, 0x0C,0x0C,0x0C,0x0F, 0x0C,0x0C,0x0C,0x0F, 0x0C,0x0C,0x0C,0x0F],
  [0x10,0x10,0x10,0x10, 0x0C,0x0C,0x0C,0x0C, 0x0C,0x0C,0x0C,0x0C, 0x0C,0x0C,0x0C,0x0C],
  [0x0C,0x0C,0x0C,0x0C, 0x0C,0x0C,0x0C,0x0C, 0x0C,0x0C,0x0C,0x0C, 0x0E,0x0E,0x0E,0x0E],
  [0x0C,0x0C,0x0C,0x0C, 0x0C,0x0C,0x0C,0x0C, 0x0C,0x0C,0x0C,0x0C, 0x0C,0x0C,0x0C,0x0C],
  [0x34,0x35,0x35,0x36, 0x35,0x36,0x34,0x35, 0x34,0x35,0x35,0x36, 0x35,0x36,0x34,0x35],
  [0x1A,0x1B,0x1A,0x1B, 0x18,0x19,0x18,0x19, 0x1A,0x1B,0x1A,0x1B, 0x18,0x19,0x18,0x19],
  [0x1A,0x1B,0x1A,0x1B, 0x16,0x17,0x16,0x17, 0x16,0x17,0x16,0x17, 0x18,0x19,0x18,0x19],
  [0x11,0x10,0x10,0x12, 0x13,0x0E,0x0E,0x14, 0x11,0x10,0x10,0x12, 0x13,0x0E,0x0E,0x14],
  [0x15,0x15,0x15,0x15, 0x15,0x15,0x15,0x15, 0x15,0x15,0x15,0x15, 0x15,0x15,0x15,0x15],
  [0x37,0x38,0x38,0x39, 0x3A,0x3B,0x3B,0x3C, 0x3A,0x3B,0x3B,0x3C, 0x3D,0x3E,0x3E,0x3F],
  [0x22,0x23,0x24,0x25, 0x26,0x27,0x23,0x26, 0x22,0x24,0x23,0x27, 0x25,0x22,0x24,0x26],
  [0x27,0x22,0x24,0x27, 0x23,0x25,0x23,0x22, 0x27,0x24,0x22,0x27, 0x22,0x23,0x26,0x25],
  [0x68,0x68,0x68,0x68, 0x68,0x68,0x68,0x68, 0x68,0x68,0x68,0x68, 0x68,0x68,0x68,0x68],
  [0x08,0x09,0x0A,0x0B, 0x30,0x31,0x32,0x33, 0x58,0x59,0x5A,0x5B, 0x80,0x81,0x82,0x83],
  [0x04,0x05,0x06,0x07, 0x2C,0x2D,0x2E,0x2F, 0x54,0x55,0x56,0x57, 0x7C,0x7D,0x7E,0x7F],
  [0x00,0x01,0x02,0x03, 0x28,0x29,0x2A,0x2B, 0x50,0x51,0x52,0x53, 0x78,0x79,0x7A,0x7B],
  [0x73,0x1C,0x1D,0x73, 0x1C,0x20,0x21,0x1D, 0x1E,0x21,0x20,0x1F, 0x73,0x1E,0x1F,0x73],
  [0x73,0x73,0x73,0x73, 0x73,0x73,0x73,0x73, 0x73,0x73,0x73,0x73, 0x73,0x73,0x73,0x73]
];

// ASCII $20-$7F -> tile, from data_screen_character_lookup_table ($0E60)
const CHAR_LOOKUP = [
  0x73,0xBC,0xBD,0x69,0xBF,0xBE,0x75,0x73, 0x62,0x63,0xC7,0x73,0xC3,0x6C,0xC2,0x71,
  0x5C,0x5D,0x5E,0x5F,0x60,0x61,0x84,0x85, 0x86,0x87,0xC1,0x6B,0x66,0xC6,0x67,0x74,
  0x73,0x88,0x89,0x8A,0x8B,0x8C,0x8D,0x8E, 0x8F,0x90,0x91,0x92,0x93,0x94,0x95,0x96,
  0x97,0x98,0x99,0x9A,0x9B,0x9C,0x9D,0x9E, 0x9F,0xA0,0xA1,0xC4,0x72,0xC5,0x70,0x6C,
  0x76,0xA2,0xA3,0xA4,0xA5,0xA6,0xA7,0xA8, 0xA9,0xAA,0xAB,0xAC,0xAD,0xAE,0xAF,0xB0,
  0xB1,0xB2,0xB3,0xB4,0xB5,0xB6,0xB7,0xB8, 0xB9,0xBA,0xBB,0x64,0x6E,0x65,0x6D
];

// Object id -> mini-map character, data_mini_map_characters ($0EBF)
const MINIMAP_CHARS = [
  0x64,0x65,0x66,0x67,0x6A,0x6B,0x6D,0x6E,
  0x6F,0x11,0x12,0x13,0x14,0x0D,0x0F,0x10,
  0x0E,0x0C,0x70,0x72,0x75,0x76,0x77,0xBD,
  0x24,0x25,0x69,0xBE,0xBF,0xC0,0xC3,0x73
];

// Repton pose -> sprite location in the sprite region ($2FC0 base).
// Walk frames 0-9 at $3600+frame*$20 (rows $140 apart),
// block 2 at $3B00+col*$20 (rows $140 apart).
const POSES = [];
for (let f = 0; f < 10; f++) POSES.push({base: 0x3600 + f * 0x20});       // 0-9 walk
for (let c = 0; c < 3; c++) POSES.push({base: 0x3B00 + c * 0x20});       // 10-12 standing
for (let c = 5; c < 8; c++) POSES.push({base: 0x3B00 + c * 0x20});       // 13-15 explosions
const MONSTER_POSES = { LHU:{base:0x3B00+3*0x20}, RHU:{base:0x3B00+4*0x20}, STAND:{base:0x3B00+9*0x20} };
const CRACKED_EGG_POSE = {base:0x3B00+8*0x20};
const SPRITE_BASE = 0x2FC0, ROW_STRIDE = 0x140;

const MOVE_LEFT_LOOKUP  = [0x06,0x06,0x07,0x08,0x09,0x09,0x08,0x07];
const MOVE_RIGHT_LOOKUP = [0x02,0x02,0x03,0x04,0x05,0x05,0x04,0x03];
const IDLE_LOOKUP       = [0x0A,0x0B,0x0A,0x0C];

// BBC physical colours
const BBC = ['#000000','#FF0000','#00FF00','#FFFF00','#0000FF','#FF00FF','#00FFFF','#FFFFFF'];

const LEVEL_PASSWORDS = REPTON_DATA.passwords;
const LEVEL_COLOURS   = REPTON_DATA.levelColours;   // physical colour for logical 1 per level

/* ------------------------------------------------------------------ *
 *  Graphics
 * ------------------------------------------------------------------ */
const SCALE_X = 2, SCALE_Y = 2;               // MODE 5 px -> canvas px
const SCR_W = 128 * SCALE_X, SCR_H = 256 * SCALE_Y;   // 256 x 512
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = SCR_W; canvas.height = SCR_H;
ctx.imageSmoothingEnabled = false;

// palette: logical 0..3 -> css colour. [black, level, yellow, green]
let palette = [BBC[0], BBC[1], BBC[3], BBC[2]];
function setLevelColour(phys) { palette = [BBC[0], BBC[phys], BBC[3], BBC[2]]; clearTileCache(); }
function setDefaultColours()  { palette = [BBC[0], BBC[1], BBC[3], BBC[2]]; clearTileCache(); }

// decode one tile (8 bytes, 4x8 px, 2bpp MODE 5 packing) -> 32 colour indices
function decodeTile(n) {
  const px = new Uint8Array(32);
  const off = n * 8;
  for (let y = 0; y < 8; y++) {
    const b = REPTON_DATA.spriteRegion[off + y];
    for (let p = 0; p < 4; p++)
      px[y * 4 + p] = ((b >> (7 - p)) & 1) * 2 + ((b >> (3 - p)) & 1);
  }
  return px;
}
const TILE_PIXELS = [];
for (let i = 0; i < 200; i++) TILE_PIXELS.push(decodeTile(i));

// tile canvases (8x16), rebuilt when palette changes
let tileCanvases = null;
function buildTileCache() {
  tileCanvases = TILE_PIXELS.map(px => {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 16;
    const g = c.getContext('2d');
    const img = g.createImageData(8, 16);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const col = palette[px[y * 4 + x]];
      const rgb = [parseInt(col.slice(1,3),16), parseInt(col.slice(3,5),16), parseInt(col.slice(5,7),16)];
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = ((y*2+dy) * 8 + (x*2+dx)) * 4;
        img.data[i] = rgb[0]; img.data[i+1] = rgb[1]; img.data[i+2] = rgb[2]; img.data[i+3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}
function clearTileCache() { tileCanvases = null; spriteCache = {}; }
function drawTile(n, sx, sy) {                     // sx,sy in tile units (0..31)
  if (!tileCanvases) buildTileCache();
  ctx.drawImage(tileCanvases[n], sx * 8, sy * 16);
}
// draw tile with colour mask (for text): m: 0x0F->keep col bit0, 0xF0->bit1, 0xFF->all
function drawTileMasked(n, sx, sy, m) {
  if (m === 0xFF) { drawTile(n, sx, sy); return; }
  const key = n + '_' + m;
  if (!drawTileMasked.cache) drawTileMasked.cache = {};
  if (!drawTileMasked.cache[key] || drawTileMasked.cachePal !== palette) {
    drawTileMasked.cachePal = palette;
    const px = TILE_PIXELS[n];
    const c = document.createElement('canvas');
    c.width = 8; c.height = 16;
    const g = c.getContext('2d');
    const img = g.createImageData(8, 16);
    const keep = (m === 0x0F) ? 1 : (m === 0xF0 ? 2 : 0);
    for (let i = 0; i < 32; i++) {
      const col = palette[px[i] & keep];
      const rgb = [parseInt(col.slice(1,3),16), parseInt(col.slice(3,5),16), parseInt(col.slice(5,7),16)];
      const x = i % 4, y = (i / 4) | 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const j = ((y*2+dy) * 8 + (x*2+dx)) * 4;
        img.data[j] = rgb[0]; img.data[j+1] = rgb[1]; img.data[j+2] = rgb[2]; img.data[j+3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    drawTileMasked.cache[key] = c;
  }
  ctx.drawImage(drawTileMasked.cache[key], sx * 8, sy * 16);
}

// Assemble a 4x4-tile sprite (repton/monster/explosion/egg) into a canvas 32x64
let spriteCache = {};
function spriteCanvas(pose) {
  const key = pose.base;
  if (spriteCache[key]) return spriteCache[key];
  const c = document.createElement('canvas');
  c.width = 32; c.height = 64;
  const g = c.getContext('2d');
  for (let row = 0; row < 4; row++) {
    const rowOff = (pose.base - SPRITE_BASE) + row * ROW_STRIDE;
    for (let col = 0; col < 4; col++) {
      // each tile is 8 bytes within the 32-byte row group
      const px = new Uint8Array(32);
      for (let y = 0; y < 8; y++) {
        const b = REPTON_DATA.spriteRegion[rowOff + col * 8 + y];
        for (let p = 0; p < 4; p++)
          px[y * 4 + p] = ((b >> (7 - p)) & 1) * 2 + ((b >> (3 - p)) & 1);
      }
      const img = g.createImageData(8, 16);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
        const col = palette[px[y * 4 + x]];
        const rgb = [parseInt(col.slice(1,3),16), parseInt(col.slice(3,5),16), parseInt(col.slice(5,7),16)];
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const i = ((y*2+dy) * 8 + (x*2+dx)) * 4;
          img.data[i] = rgb[0]; img.data[i+1] = rgb[1]; img.data[i+2] = rgb[2]; img.data[i+3] = 255;
        }
      }
      g.putImageData(img, col * 8, row * 16);
    }
  }
  spriteCache[key] = c;
  return c;
}
function drawSprite(pose, sx, sy) { ctx.drawImage(spriteCanvas(pose), sx * 8, sy * 16); }

/* ------------------------------------------------------------- *
 *  Text (BBC character grid 32x32, chars are 4x8 MODE5 px = 1 tile)
 * ------------------------------------------------------------- */
let curX = 0, curY = 0, curMask = 0xFF;
function printChar(ch) {
  const code = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
  if (code === 0x0D) { curX = 0; curY = (curY + 1) & 31; return; }
  if (code >= 0x80 && code <= 0x83) { curMask = [0x00,0x0F,0xF0,0xFF][code & 3]; return; }
  if (code < 0x20 || code > 0x7A) return;
  const tile = CHAR_LOOKUP[code - 0x20];
  if (curMask === 0xFF) drawTile(tile, curX, curY);
  else drawTileMasked(tile, curX, curY, curMask);
  curX++;
  if (curX === 32) { curX = 0; curY = (curY + 1) & 31; }
}
function printString(s, x, y) { curX = x; curY = y; for (const ch of s) printChar(ch); }
function printNumber6(v, x, y) { printString(String(v), x, y); }   // leading zeros suppressed in original

/* ------------------------------------------------------------------ *
 *  Audio - SN76489-ish: 3 tone channels + noise
 * ------------------------------------------------------------------ */
let AC = null, masterGain = null;
function audioInit() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = AC.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(AC.destination);
}
// BBC pitch byte -> frequency: f = 440 * 2^((P-137)/48)
function pitchToFreq(p) { return 440 * Math.pow(2, (p - 137) / 48); }
// Envelope 1: ENVELOPE 1,2,0,0,0,1,2,3,100,1,255,254,126,126 (fast attack, decaying tail)
function playTone(pitch, dur50 = 1, vol = 0.22) {
  if (!AC || pitch === 0) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'square';
  o.frequency.value = pitchToFreq(pitch);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);          // attack
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04 + dur50 * 0.05 + 0.35); // release tail
  o.connect(g); g.connect(masterGain);
  o.start(t); o.stop(t + 0.04 + dur50 * 0.05 + 0.4);
}
let noiseBuffer = null;
function playNoise(pitch, dur50 = 2, vol = 0.30) {
  if (!AC) return;
  if (!noiseBuffer) {
    noiseBuffer = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = AC.currentTime;
  const src = AC.createBufferSource();
  src.buffer = noiseBuffer; src.loop = true;
  const filt = AC.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = [3000, 2200, 1600, 1100, 800, 600, 450, 350, 250, 200, 150][pitch] || 500;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur50 * 0.04 + 0.18);
  src.connect(filt); filt.connect(g); g.connect(masterGain);
  src.start(t); src.stop(t + dur50 * 0.04 + 0.25);
}

/* Music: in-game tune = 256 steps over 3 channels, one step every 160ms.
   Intro tune = 52 steps, one every 80ms. Both use envelope 1, duration 1. */
let musicStep = 0, musicTimer = 0, introPlaying = false, introStart = 0;
const MUSIC_STEP_MS = 160;
function updateMusic(dt, now) {
  if (!soundOn || !musicOn || !AC) return;   // faithful: both must be on
  if (introPlaying) return;                  // original: intro finishes before the game (and its tune) starts
  musicTimer += dt;
  while (musicTimer >= MUSIC_STEP_MS) {
    musicTimer -= MUSIC_STEP_MS;
    musicStep = (musicStep + 1) & 0xFF;
    for (let ch = 0; ch < 3; ch++) {
      const n = REPTON_DATA.musicMain[ch][musicStep];
      if (n) playTone(n, 1, ch === 2 ? 0.14 : 0.16);
    }
  }
}
function playIntroMusic(now) {
  introPlaying = true; introStart = now;
  for (let i = 0; i < 52; i++) {
    for (let ch = 0; ch < 3; ch++) {
      const n = REPTON_DATA.musicIntro[ch][i];
      if (n) setTimeout(((ch2, nn) => () => { if (soundOn && musicOn) playTone(nn, 1, 0.2); })(ch, n), i * 80);
    }
  }
  setTimeout(() => { introPlaying = false; }, 52 * 80);
}

/* SFX from the disassembly */
const sfx = {
  diamond() { playTone(200, 1, 0.25); },                    // SOUND &13,1,200,1
  rockDrop(yObj) { playNoise(4, 2, 0.10 + (yObj / 31) * 0.25); }, // SOUND &10,Amp,4,2
  crunch() { playNoise(6, 2, 0.5); },                       // SOUND &10,-15,6,2
  timeBeep() { playNoise(10, 1, 0.5); },                    // SOUND &10,-15,10,1
  monsterCrush() { playTone(1, 1, 0.4); playNoise(2, 1, 0.3); } // SOUND &60/&92,1,1,1
};

/* ------------------------------------------------------------------ *
 *  Game state
 * ------------------------------------------------------------------ */
const ST = { LOADING:0, STATUS:1, PASSWORD:2, PLAY:3, DEAD:4, COMPLETE:5, HIGHSCORE:6, NAME_ENTRY:7, MAP:8 };
let state = ST.LOADING;
let mapReturnState = ST.STATUS;          // where M was pressed (map toggles back here)

let map = new Uint8Array(1024);          // current level, object per cell
let vx = 2, vy = 2;                      // viewport top-left (tile coords, 8-bit wrap)
let vdir = 0, hdir = 0;                  // movement directions
let animState = 0x0A, idleCounter = 0, mainLoopCounter = 0;
let diamondsLeft = 0;
let score = 0, hiScore = 8000;
let lives = 3;                           // zero-based in original (3 = 4 lives)
let timeLeft = 6000;                     // BCD "6000"
let screenNum = 0, startedOnScreen = 0;
let soundOn = true, musicOn = true;
let restartPressedFlag = false;
let flashWhite = false;
let passwordBuffer = '';
let nameBuffer = '';
let messageLine = null, messageUntil = 0;

// monsters: 5 slots (original supports 5, maps max 3)
const monsters = [];
for (let i = 0; i < 5; i++) monsters.push({ x:0, y:0, jx:0, jy:0, wait:0, active:false });

// high score table (BCD scores as numbers)
let hiTable = [
  {score:8000, name:'* Superior Software *'}, {score:7000, name:'* Superior Software *'},
  {score:6000, name:'* Superior Software *'}, {score:5000, name:'* Superior Software *'},
  {score:4000, name:'* Superior Software *'}, {score:3000, name:'* Superior Software *'},
  {score:2000, name:'* Superior Software *'}, {score:1000, name:'* Superior Software *'}
];

/* ------------------------------------------------------------------ *
 *  Map access helpers (fn_lookup_screen_object_for_x_y etc.)
 * ------------------------------------------------------------------ */
function objAt(ox, oy) {                  // object coords 0..31, else off-map object
  if (ox < 0 || ox >= 32 || oy < 0 || oy >= 32) return OFFMAP_OBJECT;
  return map[oy * 32 + ox];
}
function objAtTile(tx, ty) {              // tile coords 0..127, else off-map object
  tx &= 0xFF; ty &= 0xFF;                 // 6502 8-bit wrap
  if (tx > 127 || ty > 127) return OFFMAP_OBJECT;
  return map[(ty >> 2) * 32 + (tx >> 2)];
}
function mapSet(ox, oy, v) { if (ox >= 0 && ox < 32 && oy >= 0 && oy < 32) map[oy * 32 + ox] = v; }

// Repton's object position (top-left of his 4x4 at tile (vx+14, vy+14))
function reptonOX() { return ((vx + 14) & 0xFF) >> 2; }
function reptonOY() { return ((vy + 14) & 0xFF) >> 2; }

/* fn_reset_game: decode current level into map cache, count diamonds+safes */
function resetGame() {
  if (screenNum < 0) screenNum = 0;
  const src = REPTON_DATA.maps[screenNum];
  diamondsLeft = 0;
  for (let i = 0; i < 1024; i++) {
    map[i] = src[i];
    if (src[i] === OBJ.DIAMOND || src[i] === OBJ.SAFE) diamondsLeft++;
  }
  for (const m of monsters) { m.active = false; m.wait = 0; m.jx = 0; m.jy = 0; }
}

/* fn_reset_and_show_start_screen */
function resetAndShowStartScreen() {
  animState = 0x0A;
  mainLoopCounter = 0; idleCounter = 0;
  timeLeft = 6000;
  vx = 2; vy = 2;
  vdir = 0; hdir = 0;
  enterStatusScreen();
}

/* ------------------------------------------------------------------ *
 *  Movement  (fn_check_repton_movement / fn_move_repton_*)
 * ------------------------------------------------------------------ */
const keys = {};
function checkReptonMovement() {
  vdir = 0; hdir = 0;
  // up: object at ((vx+14)>>2, (vy+13)>>2); key ":" (we also allow ArrowUp)
  let o = objAtTile(vx + 14, vy + 13);
  if (o >= 0x18 && o !== OBJ.EGG && o !== OBJ.ROCK && (keys['up'])) vdir = 1;
  // down: ((vx+14)>>2, (vy+18)>>2); key "/"
  o = objAtTile(vx + 14, vy + 18);
  if (o >= 0x18 && o !== OBJ.EGG && o !== OBJ.ROCK && (keys['down'])) vdir = -1;
  // left: Z ; right: X (no pre-check; move fn checks)
  if (keys['left']) hdir = -1;
  if (keys['right']) hdir = 1;
  // vertical cancels horizontal
  if (vdir !== 0) hdir = 0;
}

function moveReptonLeft() {
  const oy = ((vy + 14) & 0xFF) >> 2;
  const p1x = ((vx + 13) & 0xFF) >> 2;
  const p1 = objAt(p1x, oy);
  if (p1 < 0x18) return;                          // solid wall
  if (p1 === OBJ.ROCK || p1 === OBJ.EGG) {        // try to push
    const p2x = ((vx + 9) & 0xFF) >> 2;
    if (objAt(p2x, oy) !== OBJ.EMPTY) return;
    mapSet(p2x, oy, p1);
    mapSet(p1x, oy, OBJ.EMPTY);
  }
  vx = (vx - 1) & 0xFF;
}
function moveReptonRight() {
  const oy = ((vy + 14) & 0xFF) >> 2;
  const p1x = ((vx + 18) & 0xFF) >> 2;
  const p1 = objAt(p1x, oy);
  if (p1 < 0x18) return;
  if (p1 === OBJ.ROCK || p1 === OBJ.EGG) {
    const p2x = ((vx + 22) & 0xFF) >> 2;
    if (objAt(p2x, oy) !== OBJ.EMPTY) return;
    mapSet(p2x, oy, p1);
    mapSet(p1x, oy, OBJ.EMPTY);
  }
  vx = (vx + 1) & 0xFF;
}
function moveReptonUp()   { vy = (vy - 1) & 0xFF; }
function moveReptonDown() { vy = (vy + 1) & 0xFF; }

/* ------------------------------------------------------------------ *
 *  Collection (fn_check_if_score_update_or_key / fn_update_score...)
 *  Three corners of Repton's 4x4 box: TL, BL, TR. Writes `fill` into cells.
 * ------------------------------------------------------------------ */
function collectAndFill(fill) {
  const corners = [
    [vx + 14, vy + 14],   // top-left
    [vx + 14, vy + 17],   // bottom-left
    [vx + 17, vy + 14]    // top-right
  ];
  for (const [tx, ty] of corners) {
    const wx = tx & 0xFF, wy = ty & 0xFF;
    if (wx > 127 || wy > 127) continue;
    const ox = wx >> 2, oy = wy >> 2;
    const idx = oy * 32 + ox;
    const o = map[idx];
    if (o === OBJ.DIAMOND) {
      diamondsLeft--;
      score += 50;
      if (soundOn) sfx.diamond();
    } else if (o >= OBJ.EARTH1 && o <= OBJ.MESH_EARTH) {
      score += 1;
    } else if (o === OBJ.KEY) {
      changeSafesToDiamonds();
    }
    map[idx] = fill;
  }
  if (score > hiScore) hiScore = score;
}

function changeSafesToDiamonds() {
  for (let i = 0; i < 1024; i++) if (map[i] === OBJ.SAFE) map[i] = OBJ.DIAMOND;
}

/* ------------------------------------------------------------------ *
 *  Gravity (fn_check_if_rock_egg_falling_and_move_it / fn_drop_rock_or_egg)
 *  Scan bottom-up: y=30..0, x=31..0
 * ------------------------------------------------------------------ */
function gravityStep() {
  for (let y = 30; y >= 0; y--) {
    for (let x = 31; x >= 0; x--) {
      const o = map[y * 32 + x];
      if (o !== OBJ.ROCK && o !== OBJ.EGG) continue;
      dropRockOrEgg(x, y, o);
      if (state !== ST.PLAY) return;   // repton died mid-scan
    }
  }
}

function dropRockOrEgg(x, y, o) {
  const below = map[(y + 1) * 32 + x];
  if (below === OBJ.EMPTY) {
    // fall one cell
    map[y * 32 + x] = OBJ.EMPTY;
    map[(y + 1) * 32 + x] = o;
    if (soundOn) sfx.rockDrop(y + 1);
    // repton two rows below original position?
    if (y + 2 <= 31 && map[(y + 2) * 32 + x] === REPTON_MARKER) { killRepton(); return; }
    // egg crack check: landed (cell below new pos not empty) or bottom row
    if (y + 2 > 31 || map[(y + 2) * 32 + x] !== OBJ.EMPTY) {
      if (o === OBJ.EGG) crackEgg(x, y);
    }
    return;
  }
  // landed on something: roll checks
  if (below === OBJ.DIAMOND || below === OBJ.ROCK || below === OBJ.EGG || below === OBJ.OVALS_H) {
    rollRockLeft(x, y);
    rollRockRight(x, y);
  } else if (below === OBJ.TL_RND_BRICK || below === OBJ.TL_RND_SOLID) {
    rollRockLeft(x, y);
  } else if (below === OBJ.TR_RND_BRICK || below === OBJ.TR_RND_SOLID) {
    rollRockRight(x, y);
  }
}

// roll left: rock moves to (x-1, y). Needs (x-1,y) and (x-1,y+1) empty.
function rollRockLeft(x, y) {
  if (x === 0) return;
  if (map[y * 32 + x - 1] !== OBJ.EMPTY) return;
  if (map[(y + 1) * 32 + x - 1] !== OBJ.EMPTY) return;
  const o = map[y * 32 + x];
  if (o !== OBJ.ROCK && o !== OBJ.EGG) return;    // already rolled away
  map[y * 32 + x] = OBJ.EMPTY;
  map[y * 32 + x - 1] = o;
}

// roll right: rock moves to (x+1, y+1). Needs (x+1,y) and (x+1,y+1) empty.
// Kills repton if he is at (x+1, y+2).
function rollRockRight(x, y) {
  if (x === 31) return;
  if (map[y * 32 + x + 1] !== OBJ.EMPTY) return;
  if (map[(y + 1) * 32 + x + 1] !== OBJ.EMPTY) return;
  const o = map[y * 32 + x];
  if (o !== OBJ.ROCK && o !== OBJ.EGG) return;
  map[y * 32 + x] = OBJ.EMPTY;
  map[(y + 1) * 32 + x + 1] = o;
  // Pos3 kill check
  if (y < 30 && map[(y + 2) * 32 + x + 1] === REPTON_MARKER) killRepton();
}

/* fn_crack_egg: spawn monster where the egg landed (x, y+1) */
function crackEgg(x, y) {
  const slot = monsters.find(m => !m.active);
  if (!slot) return;
  slot.x = x * 4;
  slot.y = (y + 1) * 4;
  slot.wait = 0; slot.jx = 0; slot.jy = 0;
  slot.active = true;
  map[(y + 1) * 32 + x] = OBJ.EMPTY;
}

/* ------------------------------------------------------------------ *
 *  Monsters (fn_update_all_monsters / fn_move_monster / fn_check_monster_movement)
 * ------------------------------------------------------------------ */
function updateMonsters() {
  for (const m of monsters) {
    if (!m.active) continue;
    checkMonsterCollision(m);
    if (state !== ST.PLAY) return;
    if (m.wait < 0x80) {
      m.wait += 3;
      continue;                       // cracked egg (<0x40) then standing (<0x80)
    }
    // move: re-decide direction at object boundary
    if ((m.x & 3) === 0 && (m.y & 3) === 0) monsterChooseDirection(m);
    m.x = (m.x + m.jx) & 0xFF;
    m.y = (m.y + m.jy) & 0xFF;
    checkIfMonsterDead(m);
  }
}

function monsterChooseDirection(m) {
  m.jx = 0; m.jy = 0;
  const rTX = (vx + 14) & 0xFF, rTY = (vy + 14) & 0xFF;   // repton top-left tile
  if (Math.random() < 0.5) {
    // horizontal preference
    if (m.x === rTX) { monsterVertical(m, rTY); return; }
    if (m.x > rTX) { // monster right of repton -> move left
      if (objAtTile(m.x - 1, m.y) === OBJ.EMPTY) m.jx = -1;
    } else {         // move right
      if (objAtTile(m.x + 4, m.y) === OBJ.EMPTY) m.jx = 1;
    }
  } else {
    monsterVertical(m, rTY);
  }
}
function monsterVertical(m, rTY) {
  if (m.y > rTY) {       // monster below repton -> move up
    if (objAtTile(m.x, m.y - 1) === OBJ.EMPTY) m.jy = -1;
  } else {               // above or same row -> move down
    if (objAtTile(m.x, m.y + 4) === OBJ.EMPTY) m.jy = 1;
  }
}

/* repton hitbox: (vx+15, vy+15) 2x2 tiles ; monster 4x4 */
function checkMonsterCollision(m) {
  const rx = (vx + 15) & 0xFF, ry = (vy + 15) & 0xFF;
  if (m.x + 4 < rx) return;
  if (m.y + 4 < ry) return;
  if (rx + 2 < m.x) return;
  if (ry + 2 < m.y) return;
  killRepton();
}

/* rock in monster's cell(s) -> squash (fn_check_if_monster_dead) */
function checkIfMonsterDead(m) {
  const checks = [
    [m.x >> 2, m.y >> 2],
    [(m.x) >> 2, (m.y + 3) >> 2],
    [(m.x + 3) >> 2, m.y >> 2]
  ];
  for (const [ox, oy] of checks) {
    if (objAt(ox, oy) === OBJ.ROCK) { killMonster(m); return; }
  }
}
function killMonster(m) {
  m.active = false;
  if (soundOn) sfx.monsterCrush();
}

/* ------------------------------------------------------------------ *
 *  Death (fn_kill_repton)
 * ------------------------------------------------------------------ */
let deadTimer = 0, deadPhase = 0;
function killRepton() {
  if (state !== ST.PLAY) return;
  if (soundOn) sfx.crunch();
  state = ST.DEAD;
  deadTimer = 0; deadPhase = 0;
  vdir = 0; hdir = 0;
}

function updateDeath(dt) {
  deadTimer += dt;
  // crunch, then small->medium->big->medium->small explosion every 120ms, then 480ms pause
  const seq = [0x0F, 0x0E, 0x0D, 0x0E, 0x0F, -1];
  const idx = Math.min(Math.floor(deadTimer / 120), 5);
  if (idx < 5) animState = seq[idx];
  else animState = -1;
  if (deadTimer >= 120 * 5 + 480) {
    lives--;
    if (lives < 0) {
      if (score > hiScore) hiScore = score;
      enterNameEntryOrScores();
    } else {
      // faithful: death does NOT reset the map — collected items stay collected
      resetAndShowStartScreen();
    }
  }
}

/* out of time: show " Out of time. " 1.6s then kill repton */
let outOfTimeTimer = -1;
function startOutOfTime() { outOfTimeTimer = 0; vdir = 0; hdir = 0; }

/* ------------------------------------------------------------------ *
 *  Main game tick (main_game_loop) — fixed 20ms per iteration
 * ------------------------------------------------------------------ */
const TICK_MS = 20;

function gameTick() {
  const alignedX = (((vx + 2) & 0xFF) & 3) === 0;
  const alignedY = (((vy + 2) & 0xFF) & 3) === 0;
  const aligned = alignedX && alignedY;

  if (aligned) checkReptonMovement();

  if (vdir < 0) moveReptonDown(); else if (vdir > 0) moveReptonUp();
  if (hdir < 0) moveReptonLeft(); else if (hdir > 0) moveReptonRight();

  // animation state
  if (vdir !== 0) {
    animState = (((vy >> 2) & 1));
  } else if (hdir !== 0) {
    const i = (vx >> 1) & 7;
    animState = hdir < 0 ? MOVE_LEFT_LOOKUP[i] : MOVE_RIGHT_LOOKUP[i];
    idleCounter = 0;
  }
  if (vdir !== 0 || hdir !== 0) idleCounter = 0;
  else {
    if (idleCounter < 127) idleCounter++;
    else animState = IDLE_LOOKUP[(mainLoopCounter >> 4) & 3];
  }

  // collect pass 1 ($FF marker), gravity, collect pass 2 ($1F empty)
  collectAndFill(REPTON_MARKER);
  gravityStep();
  if (state !== ST.PLAY) return;
  collectAndFill(OBJ.EMPTY);

  // level complete?
  if (diamondsLeft === 0 && aligned) {
    screenNum++;
    if (screenNum >= 12) {
      screenNum = 0;
      enterCompleteScreen();
      return;
    }
    resetGame();
    resetAndShowStartScreen();
    return;
  }

  updateMonsters();
  if (state !== ST.PLAY) return;

  // time
  timeLeft--;
  if (timeLeft < 0) { timeLeft = 0; startOutOfTime(); }
  mainLoopCounter = (mainLoopCounter + 1) & 0xFF;
}

/* ------------------------------------------------------------------ *
 *  Screens
 * ------------------------------------------------------------------ */
function clearScreen() { ctx.fillStyle = palette[0]; ctx.fillRect(0, 0, SCR_W, SCR_H); }

/* --- status / start screen (fn_display_repton_start_screen) --- */
function enterStatusScreen() { state = ST.STATUS; drawStatusScreen(); }
function gameStarted() { return score > 0 || lives < 3 || (timeLeft % 100) !== 0; }   // original checks score OR time LSB

function drawStatusScreen() {
  clearScreen();
  setDefaultColours();
  // Repton logo: 192 tile bytes from data_repton_logo at y=1, wrapped 32 wide, mask $0F (red)
  curX = 0; curY = 1; curMask = 0x0F;
  for (let i = 0; i < 192; i++) {
    drawTileMasked(REPTON_DATA.logo[i], curX, curY, 0x0F);
    curX++; if (curX === 32) { curX = 0; curY++; }
  }
  curMask = 0xFF;
  printString('By' + String.fromCharCode(0x82) + ' Superior Software', 5, 8);
  printString(String.fromCharCode(0x83) + 'Score :', 11, 10);
  printString('Hi-score :', 8, 12);
  printString('Time :', 12, 14);
  printString('Lives :', 11, 16);
  printString('Diamonds :', 8, 18);
  printString('Screen :       ' + String.fromCharCode(0x83) + '(M-Map)', 10, 20);
  printString('Sound :       ' + String.fromCharCode(0x83) + '(S/Q)', 11, 22);
  printNumber6(score, 19, 10);
  printNumber6(hiScore, 19, 12);
  printNumber6(timeLeft, 19, 14);
  printNumber6(lives + 1, 19, 16);
  if (diamondsLeft >= 10) printString('Plenty!', 19, 18);
  else printString(String(diamondsLeft), 19, 18);
  printString(String.fromCharCode(65 + screenNum), 19, 20);
  printString(soundOn ? 'On ' : 'Off', 19, 22);
  // music + password lines (fn_write_sound_music_password_to_screen)
  printString('Music :       (D/W)', 11, 24);
  printString(musicOn ? 'On ' : 'Off', 19, 24);
  printString('Password :', 8, 26);
  printString(LEVEL_PASSWORDS[screenNum], 19, 26);
  // P or R option at (2,31)
  if (!gameStarted()) printString(String.fromCharCode(0x81) + 'Press ' + String.fromCharCode(0x82) + 'P ' + String.fromCharCode(0x81) + 'to enter password', 2, 31);
  else printString(String.fromCharCode(0x81) + 'Press ' + String.fromCharCode(0x82) + 'R ' + String.fromCharCode(0x81) + 'to restart    ', 2, 31);
  printString(String.fromCharCode(0x81) + 'Press' + String.fromCharCode(0x82) + ' ESCAPE' + String.fromCharCode(0x81) + ' to kill yourself', 2, 28);
  printString(String.fromCharCode(0x81) + 'Press' + String.fromCharCode(0x82) + ' RETURN' + String.fromCharCode(0x81) + ' to get back here', 2, 29);
  printString(String.fromCharCode(0x81) + 'Press' + String.fromCharCode(0x82) + ' SPACE ' + String.fromCharCode(0x81) + ' to play game', 2, 30);
  if (messageLine) printString(messageLine.text, messageLine.x, messageLine.y);
}

/* --- play --- */
function enterPlay(withIntro) {
  setLevelColour(LEVEL_COLOURS[screenNum]);
  state = ST.PLAY;
  musicStep = 0xFF; musicTimer = 0;
  if (withIntro && soundOn && musicOn) playIntroMusic(performance.now());
}

// nearly-out-of-time flash: redefine logical colour 0 (all black -> white)
function setFlash(on) {
  if (flashWhite === on) return;
  flashWhite = on;
  palette[0] = on ? BBC[7] : BBC[0];
  clearTileCache();
}

function drawPlay() {
  clearScreen();
  // viewport: 32x32 tiles from (vx,vy)
  for (let sy = 0; sy < 32; sy++) {
    const ty = (vy + sy) & 0xFF;
    for (let sx = 0; sx < 32; sx++) {
      const tx = (vx + sx) & 0xFF;
      let tile;
      if (tx > 127 || ty > 127) tile = OBJECT_TILES[OFFMAP_OBJECT][(ty & 3) * 4 + (tx & 3)];
      else {
        const o = map[(ty >> 2) * 32 + (tx >> 2)];
        if (o === OBJ.EMPTY) continue;
        tile = OBJECT_TILES[o & 0x1F][(ty & 3) * 4 + (tx & 3)];
      }
      drawTile(tile, sx, sy);
    }
  }
  // monsters
  for (const m of monsters) {
    if (!m.active) continue;
    const sx = (m.x - vx) & 0xFF, sy = (m.y - vy) & 0xFF;
    if (sx > 28 && sx < 256 - 4) continue;
    if (m.wait < 0x40) drawSprite(CRACKED_EGG_POSE, sx, sy);
    else if (m.wait < 0x80) drawSprite(MONSTER_POSES.STAND, sx, sy);
    else drawSprite((mainLoopCounter & 8) ? MONSTER_POSES.RHU : MONSTER_POSES.LHU, sx, sy);
  }
  // repton at (14,14)
  if (animState >= 0) drawSprite(POSES[animState], 14, 14);
  // out of time message (yellow)
  if (outOfTimeTimer >= 0) printString(String.fromCharCode(0x82) + ' Out of time. ', 9, 19);
}

/* --- mini map (fn_check_for_map_key_press) --- */
function drawMiniMap() {
  // mini-map palette: colour 1 = level colour, colour 3 = cyan
  palette = [BBC[0], BBC[LEVEL_COLOURS[screenNum]], BBC[3], BBC[6]];
  clearTileCache();
  clearScreen();
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++)
      drawTile(MINIMAP_CHARS[map[y * 32 + x] & 0x1F], x, y);
}

/* --- password screen --- */
function enterPasswordScreen() { state = ST.PASSWORD; passwordBuffer = ''; drawPasswordScreen(); }
function drawPasswordScreen() {
  clearScreen(); setDefaultColours();
  printString('Enter password:', 7, 4);
  printString('&', 3, 6);
  printString('&', 26, 6);
  printString(passwordBuffer, 4, 6);
  if (messageLine) printString(messageLine.text, messageLine.x, messageLine.y);
}
function submitPassword() {
  const entered = passwordBuffer.trim().toUpperCase();
  let found = -1;
  for (let i = 0; i < 12; i++)
    if (LEVEL_PASSWORDS[i].toUpperCase() === entered) { found = i; break; }
  if (found >= 0) {
    screenNum = found; startedOnScreen = found;
    resetGame();
    messageLine = { text: 'Screen ' + String.fromCharCode(65 + found), x: 4, y: 8 };
    drawPasswordScreen();
    setTimeout(() => { messageLine = null; resetAndShowStartScreen(); }, 900);
  } else {
    messageLine = { text: 'Password not recognised', x: 4, y: 12 };
    drawPasswordScreen();
    setTimeout(() => { messageLine = null; screenNum = 0; startedOnScreen = 0; resetGame(); resetAndShowStartScreen(); }, 1200);
  }
}

/* --- high scores --- */
function enterNameEntryOrScores() {
  if (score > hiTable[7].score) { state = ST.NAME_ENTRY; nameBuffer = ''; drawNameEntry(); }
  else enterHighScoreTable();
}
function drawNameEntry() {
  clearScreen(); setDefaultColours();
  // logo at (0,3), red/black mask (fn_display_repton_logo_for_high_score_entry)
  curX = 0; curY = 3;
  for (let i = 0; i < 192; i++) {
    drawTileMasked(REPTON_DATA.logo[i], curX, curY, 0x0F);
    curX++; if (curX === 32) { curX = 0; curY++; }
  }
  // single 32-char line at (0,15): "Congratulations. " (red mask) + "Enter your name" (full colour)
  printString(String.fromCharCode(0x81) + 'Congratulations. ' + String.fromCharCode(0x83) + 'Enter your name', 0, 15);
  // entry field brackets at (2,22) and (25,22), name typed from (3,22)
  printString('&', 2, 22); printString('&', 25, 22);
  printString(nameBuffer + '_', 3, 22);
}
function submitName() {
  hiTable.push({ score, name: nameBuffer.trim() || 'Player' });
  hiTable.sort((a, b) => b.score - a.score);
  hiTable = hiTable.slice(0, 8);
  enterHighScoreTable();
}
function enterHighScoreTable() { state = ST.HIGHSCORE; drawHighScores(); }
function drawHighScores() {
  clearScreen(); setDefaultColours();
  drawLogoSmall();
  for (let i = 0; i < 8; i++) {
    const e = hiTable[i];
    printString((i + 1) + '.', 0, 10 + i * 2);
    printString(e.name, 4, 10 + i * 2);
    printNumber6(e.score, 24, 10 + i * 2);
  }
  printString('Last Score : ' + String(score), 4, 27);
  printString('(C) Timothy Tyler 1985', 6, 29);
  printString(String.fromCharCode(0x81) + 'Press ' + String.fromCharCode(0x82) + 'SPACE BAR ' + String.fromCharCode(0x81) + 'to play', 4, 31);
}
function drawLogoSmall() {
  curX = 0; curY = 1;
  for (let i = 0; i < 192; i++) {
    drawTileMasked(REPTON_DATA.logo[i], curX, curY, 0x0F);
    curX++; if (curX === 32) { curX = 0; curY++; }
  }
}

/* --- completed screen (fn_display_completed_screen) --- */
function enterCompleteScreen() { state = ST.COMPLETE; drawCompleteScreen(); }
function drawCompleteScreen() {
  clearScreen(); setDefaultColours();
  // "REPTON has been FINISHED" bitmap: 768 bytes blitted at char row 5
  const data = REPTON_DATA.finished;
  for (let row = 0; row < 3; row++)
    for (let cx = 0; cx < 32; cx++)
      for (let py = 0; py < 8; py++) {
        const b = data[row * 256 + cx * 8 + py];
        for (let p = 0; p < 4; p++) {
          const c = ((b >> (7 - p)) & 1) * 2 + ((b >> (3 - p)) & 1);
          if (!c) continue;
          ctx.fillStyle = palette[c];
          ctx.fillRect((cx * 4 + p) * SCALE_X, ((5 + row) * 8 + py) * SCALE_Y, SCALE_X, SCALE_Y);
        }
      }
  if (startedOnScreen === 0) printString(String.fromCharCode(0x81) + 'Amazing!  Now try again.', 0, 16);
  else printString(String.fromCharCode(0x81) + 'Well done.  Now do that from the', 0, 16),
       printString('very start of screen one.', 0, 17);
  printString(String.fromCharCode(0x81) + 'Press ' + String.fromCharCode(0x82) + 'SPACE', 10, 30);
}

/* --- loading screen --- */
let loadingImg = null;
function drawLoadingScreen() {
  clearScreen();
  if (loadingImg && loadingImg.complete && loadingImg.naturalWidth) {
    // loading art is MODE5-like; draw to fill 256x512 canvas area (letterboxed)
    const w = SCR_W, h = SCR_W * (loadingImg.naturalHeight / loadingImg.naturalWidth);
    ctx.drawImage(loadingImg, 0, ((SCR_H - h) / 2) | 0, w, h);
  }
  printString(String.fromCharCode(0x81) + 'Press ' + String.fromCharCode(0x82) + 'SPACE BAR.', 7, 28);
}

/* ------------------------------------------------------------------ *
 *  Game flow
 * ------------------------------------------------------------------ */
function fullReset() {
  lives = 3; score = 0;
  restartPressedFlag = true;
}
function restartGame() {          // R key: restart from screen A
  screenNum = 0; startedOnScreen = 0;
  fullReset();
  resetGame();
  resetAndShowStartScreen();
}

/* ------------------------------------------------------------------ *
 *  Input
 * ------------------------------------------------------------------ */
const KEYMAP = {
  'KeyZ': 'left', 'ArrowLeft': 'left',
  'KeyX': 'right', 'ArrowRight': 'right',
  'Semicolon': 'up', 'Quote': 'up', 'ArrowUp': 'up',       // ':' key on BBC (shift+;)
  'Slash': 'down', 'ArrowDown': 'down',                    // '/' key
};
window.addEventListener('keydown', e => {
  audioInit();
  if (AC && AC.state === 'suspended') AC.resume();
  const k = KEYMAP[e.code];
  if (k) { keys[k] = true; e.preventDefault(); }

  if (state === ST.LOADING && e.code === 'Space') { startGameFromLoading(); e.preventDefault(); }
  else if (state === ST.STATUS) statusKey(e);
  else if (state === ST.PASSWORD) passwordKey(e);
  else if (state === ST.PLAY) playKey(e);
  else if (state === ST.MAP && (e.code === 'Space' || e.code === 'KeyM')) {
    // return to wherever the map was opened from (play or status)
    if (mapReturnState === ST.PLAY) setLevelColour(LEVEL_COLOURS[screenNum]), state = ST.PLAY;
    else enterStatusScreen();
    e.preventDefault();
  }
  else if (state === ST.HIGHSCORE && e.code === 'Space') { newGameAfterScores(); e.preventDefault(); }
  else if (state === ST.NAME_ENTRY) nameKey(e);
  else if (state === ST.COMPLETE && e.code === 'Space') {
    resetGame(); resetAndShowStartScreen(); e.preventDefault();
  }
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k) keys[k] = false;
});

function startGameFromLoading() {
  lives = 3; score = 0; screenNum = 0; startedOnScreen = 0;
  hiScore = 8000;
  resetGame();
  resetAndShowStartScreen();
}
function newGameAfterScores() {
  lives = 3; score = 0;
  resetGame();
  resetAndShowStartScreen();
}

function statusKey(e) {
  if (e.code === 'Space') {
    // intro music only on a brand-new game (full lives, zero score, full time)
    const isNew = lives === 3 && score === 0 && timeLeft === 6000;
    enterPlay(isNew);
    e.preventDefault();
  } else if (e.code === 'KeyP' && !gameStarted()) enterPasswordScreen();
  else if (e.code === 'KeyR' && gameStarted()) restartGame();
  else if (e.code === 'KeyM' && screenNum < 8) { mapReturnState = ST.STATUS; state = ST.MAP; drawMiniMap(); }
  else if (e.code === 'KeyS') { soundOn = true; drawStatusScreen(); }
  else if (e.code === 'KeyQ') { soundOn = false; drawStatusScreen(); }
  else if (e.code === 'KeyD') { musicOn = true; drawStatusScreen(); }
  else if (e.code === 'KeyW') { musicOn = false; drawStatusScreen(); }
  else if (e.code === 'Escape') { enterPlay(false); killRepton(); }
}
function passwordKey(e) {
  if (e.code === 'Enter') submitPassword();
  else if (e.code === 'Backspace') { passwordBuffer = passwordBuffer.slice(0, -1); drawPasswordScreen(); e.preventDefault(); }
  else if (e.key.length === 1 && passwordBuffer.length < 21 && /[ -z]/.test(e.key)) {
    passwordBuffer += e.key;
    drawPasswordScreen();
  }
}
function nameKey(e) {
  if (e.code === 'Enter') submitName();
  else if (e.code === 'Backspace') { nameBuffer = nameBuffer.slice(0, -1); drawNameEntry(); e.preventDefault(); }
  else if (e.key.length === 1 && nameBuffer.length < 21 && /[ -z]/.test(e.key)) {
    nameBuffer += e.key;
    drawNameEntry();
  }
}
function playKey(e) {
  if (e.code === 'Enter') { enterStatusScreen(); }        // RETURN: status screen (game pauses)
  else if (e.code === 'Escape') killRepton();
  else if (e.code === 'KeyR') restartGame();
  else if (e.code === 'KeyS') soundOn = true;
  else if (e.code === 'KeyQ') soundOn = false;
  else if (e.code === 'KeyD') musicOn = true;
  else if (e.code === 'KeyW') musicOn = false;
  else if (e.code === 'KeyM' && screenNum < 8) { mapReturnState = ST.PLAY; state = ST.MAP; drawMiniMap(); }
}

/* ------------------------------------------------------------------ *
 *  Frame loop
 * ------------------------------------------------------------------ */
let lastTime = 0, tickAccum = 0;
function frame(now) {
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  if (state === ST.PLAY) {
    if (outOfTimeTimer >= 0) {
      outOfTimeTimer += dt;
      if (outOfTimeTimer >= 1600) { outOfTimeTimer = -1; killRepton(); }
    } else {
      tickAccum += dt;
      while (tickAccum >= TICK_MS && state === ST.PLAY) {
        tickAccum -= TICK_MS;
        gameTick();
      }
      if (state !== ST.PLAY) { requestAnimationFrame(frame); return; }
      // nearly out of time: flash + beep on every 4th music beat
      if (timeLeft < 300 && timeLeft > 0) {
        const beat = Math.floor(now / (MUSIC_STEP_MS * 4));
        if (beat !== frame.lastBeat) {
          frame.lastBeat = beat;
          setFlash(true);
          if (soundOn) sfx.timeBeep();
          setTimeout(() => setFlash(false), MUSIC_STEP_MS * 2);
        }
      } else setFlash(false);
    }
    updateMusic(dt, now);
    drawPlay();
  } else if (state === ST.DEAD) {
    updateDeath(dt);
    if (state === ST.DEAD) drawPlay();   // updateDeath may switch to status/scores
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ *
 *  Boot
 * ------------------------------------------------------------------ */
loadingImg = new Image();
loadingImg.onload = () => { if (state === ST.LOADING) drawLoadingScreen(); };
loadingImg.src = 'data:image/png;base64,' + REPTON_DATA.loadingScreenPNG;
drawLoadingScreen();
requestAnimationFrame(frame);

// debug/test hook (not part of the game)
window.__repton = {
  get state() { return state; }, get map() { return map; }, get vx() { return vx; }, get vy() { return vy; },
  get lives() { return lives; }, get score() { return score; }, get timeLeft() { return timeLeft; },
  get diamondsLeft() { return diamondsLeft; }, get monsters() { return monsters; },
  get screenNum() { return screenNum; },
  killRepton, crackEgg, setTime(t) { timeLeft = t; }, get animState() { return animState; },
  setScore(s) { score = s; }, setDiamonds(n) { diamondsLeft = n; }, get flashWhite() { return flashWhite; },
  get introPlaying() { return introPlaying; }, get musicStep() { return musicStep; }
};
