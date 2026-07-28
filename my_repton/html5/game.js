/* ============================================================================
   REPTON — faithful HTML5 port of the 1994 DOS (Turbo C) original.
   Reverse engineered from REPTON.EXE:
     - 8 maps of 40x24 cells, 32x32px tiles, 10x6 cell scrolling viewport
     - Boulder/egg gravity (two-pass), rolling off round surfaces (random L/R)
     - Eggs hatch into monsters on landing; monsters chase the player
     - Collect all diamonds (safes opened by the key) and destroy all monsters
   Controls (original): Z left, X right, K up, M down, SPACE full map, ESC quit
   ============================================================================ */
'use strict';

/* ------------------------------- constants ------------------------------- */
const W = 40, H = 24, CELL = 32;
const VIEW_W = 10, VIEW_H = 6;         // viewport cells
const OX = 16, OY = 16;                // viewport pixel offset on the 320x200 screen
const SW = 320, SH = 200;              // emulated screen size

// cell types (map chars '0'..'9','a'..'j' -> 0..19)
const T = {
  SPACE: 0, EARTH: 1, DIAMOND: 2, BOULDER: 3,
  WALL4: 4, WALL5: 5, WALL6: 6, PLAYER: 7,
  BOULDER2: 8, FALLING: 9,
  WALLA: 10, WALLB: 11, WALLC: 12, WALLD: 13,
  SKULL: 14, KEY: 15, SAFE: 16,
  WALLH: 17, WALLI: 18, EGG: 19,
  MONSTER: 20, FALLING_EGG: 21,
};
const MAPCHARS = '0123456789abcdefghij';

// surfaces a boulder will roll off (round tops)
const ROUND = new Set([T.DIAMOND, T.BOULDER, T.BOULDER2, T.SKULL, T.EGG]);
// objects that fall
const FALLERS = new Set([T.BOULDER, T.BOULDER2, T.EGG]);
// solids a falling boulder lands on and stays
const LAND_SOLID = new Set([T.DIAMOND, T.BOULDER, T.BOULDER2, T.FALLING, T.WALL5, T.WALL6, T.SKULL]);

const MONSTER_PERIOD = 11;   // monsters move every 11th physics step (from [0xd8]=9)
const START_LIVES = 3;

/* ------------------------------- game state ------------------------------ */
let grid = new Int16Array(W * H);
let level = 0;                 // current map index (0..7)
let mapData = REPMAP;          // active map set
let px = 0, py = 0;            // player cell
let startX = 0, startY = 0;    // level start (respawn point)
let lives = START_LIVES;
let diamondsGot = 0, diamondsTotal = 0;
let eggsLeft = 0;              // eggs+monsters remaining
let dead = false;
let levelDone = false;
let monsterTimer = 0;
let introTimer = 0;          // "LEVEL N" banner at level start
let viewLeft = 0, viewTop = 0; // viewport cell origin (target)
let viewX = 0, viewY = 0;      // smooth viewport pixel origin
let ppx = 0, ppy = 0;          // smooth player pixel pos
let playerDir = 0;             // 0 down, 1 up, 2 right, 3 left
let walkFrame = 0, walkTick = 0;
let deathTimer = 0;
let winTimer = 0;
let flashCells = [];           // cells that changed this step (for fx)

/* ------------------------------- map setup ------------------------------- */
function loadLevel(n) {
  level = ((n % 8) + 8) % 8;
  const base = level * (W * H);
  diamondsGot = 0; diamondsTotal = 0; eggsLeft = 0;
  dead = false; levelDone = false; monsterTimer = 0;
  startX = 4; startY = 4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = mapData[base + y * W + x];
      let v = MAPCHARS.indexOf(ch);
      if (v < 0) v = 0;
      grid[y * W + x] = v;
      if (v === T.DIAMOND || v === T.SAFE) diamondsTotal++;
      else if (v === T.EGG) eggsLeft++;
      else if (v === T.PLAYER) { startX = x; startY = y; }
    }
  }
  px = startX; py = startY;
  grid[py * W + px] = T.PLAYER;
  playerDir = 0; walkFrame = 0;
  introTimer = 1200;
  // viewport: player at screen cell (4,2), clamped
  viewLeft = clamp(px - 4, 0, W - VIEW_W);
  viewTop  = clamp(py - 2, 0, H - VIEW_H);
  viewX = viewLeft * CELL; viewY = viewTop * CELL;
  ppx = px * CELL; ppy = py * CELL;
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

function countInGrid(v) {
  let n = 0;
  for (let i = 0; i < W * H; i++) if (grid[i] === v) n++;
  return n;
}

/* ------------------------------ movement --------------------------------- */
function tryMove(dx, dy) {
  const nx = px + dx, ny = py + dy;
  if (nx < 1 || nx >= W || ny < 1 || ny >= H) return false;
  const t = grid[ny * W + nx];
  switch (t) {
    case T.SPACE:
    case T.EARTH:
      if (t === T.EARTH) sfx('dig');
      commitMove(nx, ny);
      return true;

    case T.DIAMOND:
      diamondsGot++;
      sfx('diamond');
      commitMove(nx, ny);
      return true;

    case T.BOULDER:
    case T.BOULDER2:
    case T.FALLING:
      if (dy === 0) {           // horizontal push only
        const bx = nx + dx, by = ny + dy;
        const b = grid[by * W + bx];
        if (b === T.SPACE) {
          grid[by * W + bx] = T.BOULDER;
          grid[ny * W + nx] = T.SPACE;
          sfx('push');
          commitMove(nx, ny);
          return true;
        }
        if (b === T.MONSTER) {  // crush monster with pushed boulder
          grid[by * W + bx] = T.BOULDER;
          grid[ny * W + nx] = T.SPACE;
          eggsLeft--; sfx('crush');
          commitMove(nx, ny);
          return true;
        }
      }
      return false;

    case T.EGG:                 // eggs push like boulders
      if (dy === 0) {
        const bx = nx + dx, by = ny + dy;
        const b = grid[by * W + bx];
        if (b === T.SPACE) {
          grid[by * W + bx] = T.EGG;
          grid[ny * W + nx] = T.SPACE;
          sfx('push');
          commitMove(nx, ny);
          return true;
        }
        if (b === T.MONSTER) {
          grid[by * W + bx] = T.EGG;
          grid[ny * W + nx] = T.SPACE;
          eggsLeft--; sfx('crush');
          commitMove(nx, ny);
          return true;
        }
      }
      return false;

    case T.KEY:                 // collect key -> all safes become diamonds
      for (let i = 0; i < W * H; i++) if (grid[i] === T.SAFE) grid[i] = T.DIAMOND;
      sfx('key');
      commitMove(nx, ny);
      return true;

    case T.SKULL:               // deadly
      commitMove(nx, ny);
      killPlayer();
      return true;

    case T.MONSTER:             // deadly
      commitMove(nx, ny);
      eggsLeft = Math.max(0, eggsLeft - 1); // monster is consumed
      killPlayer();
      return true;

    default:
      return false;             // walls of every flavour block
  }
}

function commitMove(nx, ny) {
  grid[py * W + px] = T.SPACE;
  px = nx; py = ny;
  grid[py * W + px] = T.PLAYER;
  viewLeft = clamp(px - 4, 0, W - VIEW_W);
  viewTop  = clamp(py - 2, 0, H - VIEW_H);
}

function killPlayer() {
  if (dead) return;
  dead = true;
  deathTimer = 0;
  sfx('death');
}

function respawn() {
  // find a free cell, spiralling out from the start position
  grid[py * W + px] = T.SPACE;
  let fx = startX, fy = startY;
  if (grid[fy * W + fx] !== T.SPACE) {
    let found = false;
    for (let r = 1; r < 20 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++)
        for (let dx = -r; dx <= r && !found; dx++) {
          const nx = startX + dx, ny = startY + dy;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          if (grid[ny * W + nx] === T.SPACE) { fx = nx; fy = ny; found = true; }
        }
    }
  }
  px = fx; py = fy;
  grid[py * W + px] = T.PLAYER;
  viewLeft = clamp(px - 4, 0, W - VIEW_W);
  viewTop  = clamp(py - 2, 0, H - VIEW_H);
  dead = false;
}

/* ------------------------------- physics --------------------------------- */
function physicsStep() {
  // Pass 1: resting boulders & eggs fall / roll
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = grid[y * W + x];
      if (o !== T.BOULDER && o !== T.BOULDER2 && o !== T.EGG) continue;
      const below = (y + 1 < H) ? grid[(y + 1) * W + x] : T.WALL4;
      if (below === T.SPACE) {
        grid[(y + 1) * W + x] = (o === T.EGG) ? T.FALLING_EGG : T.FALLING;
        grid[y * W + x] = T.SPACE;
      } else if (ROUND.has(below)) {
        const canL = x > 0 && grid[y * W + x - 1] === T.SPACE && grid[(y + 1) * W + x - 1] === T.SPACE;
        const canR = x < W - 1 && grid[y * W + x + 1] === T.SPACE && grid[(y + 1) * W + x + 1] === T.SPACE;
        let dir = 0;
        if (canL && canR) dir = (Math.random() < 0.5) ? -1 : 1;
        else if (canL) dir = -1;
        else if (canR) dir = 1;
        if (dir) {
          const tx = x + dir, ty = y + 1;
          const t = grid[ty * W + tx];
          const falling = (o === T.EGG) ? T.FALLING_EGG : T.FALLING;
          if (t === T.PLAYER) {
            grid[ty * W + tx] = falling; grid[y * W + x] = T.SPACE;
            killPlayer();
          } else if (t === T.MONSTER) {
            grid[ty * W + tx] = falling; grid[y * W + x] = T.SPACE;
            eggsLeft--; sfx('crush');
          } else if (t === T.SPACE) {
            grid[ty * W + tx] = falling; grid[y * W + x] = T.SPACE;
          }
        }
      }
    }
  }
  // Pass 2: falling boulders & eggs
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = grid[y * W + x];
      if (o === T.FALLING) {
        const below = (y + 1 < H) ? grid[(y + 1) * W + x] : T.WALL4;
        if (below === T.SPACE) {
          grid[y * W + x] = T.BOULDER2;          // still falling next step
        } else if (below === T.PLAYER) {
          grid[y * W + x] = T.BOULDER2;
          killPlayer();
        } else if (below === T.MONSTER) {
          grid[(y + 1) * W + x] = T.BOULDER2;
          grid[y * W + x] = T.SPACE;
          eggsLeft--; sfx('crush');
        } else if (LAND_SOLID.has(below)) {
          // settle: on round tops keep as rolling boulder, on flat come to rest
          grid[y * W + x] = (below === T.WALL5 || below === T.WALL6 || below === T.FALLING)
            ? T.BOULDER : T.BOULDER2;
          if (Math.random() < 0.3) sfx('land');
        } else {
          grid[y * W + x] = T.BOULDER;           // rest on anything else
          if (Math.random() < 0.3) sfx('land');
        }
      } else if (o === T.FALLING_EGG) {
        const below = (y + 1 < H) ? grid[(y + 1) * W + x] : T.WALL4;
        if (below === T.SPACE) {
          grid[y * W + x] = T.EGG;               // keep falling
        } else if (below === T.PLAYER) {
          grid[(y + 1) * W + x] = T.MONSTER;
          grid[y * W + x] = T.SPACE;
          sfx('hatch');
          killPlayer();
        } else {
          grid[y * W + x] = T.MONSTER;           // egg hatches on landing
          sfx('hatch');
        }
      }
    }
  }
  // Monsters hunt the player
  monsterTimer++;
  if (monsterTimer >= MONSTER_PERIOD) {
    monsterTimer = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (grid[y * W + x] === T.MONSTER) moveMonster(x, y);
  }
  // level complete?
  if (!levelDone && diamondsGot >= diamondsTotal && eggsLeft <= 0) {
    levelDone = true;
    winTimer = 0;
    sfx('win');
  }
}

function moveMonster(x, y) {
  let dx = 0, dy = 0;
  // horizontal first, then vertical (matches _move_baddie)
  if (px > x && (grid[y * W + x + 1] === T.SPACE || grid[y * W + x + 1] === T.PLAYER)) dx = 1;
  else if (px < x && (grid[y * W + x - 1] === T.SPACE || grid[y * W + x - 1] === T.PLAYER)) dx = -1;
  if (!dx && py > y && (grid[(y + 1) * W + x] === T.SPACE || grid[(y + 1) * W + x] === T.PLAYER)) dy = 1;
  else if (!dx && py < y && (grid[(y - 1) * W + x] === T.SPACE || grid[(y - 1) * W + x] === T.PLAYER)) dy = -1;
  if (!dx && !dy) return;
  const nx = x + dx, ny = y + dy;
  if (grid[ny * W + nx] === T.PLAYER) killPlayer();
  grid[ny * W + nx] = T.MONSTER;
  grid[y * W + x] = T.SPACE;
}

/* ------------------------------- sprites --------------------------------- */
const sheet = { repton: null, repman: null, rep8: null, title: null, logo: null };
let tiles32 = [];            // cell sprite canvases (from repton.pcx grid)
let manFrames = [];          // player frames (from repman.pcx grid)
let manFramesMirror = [];
let tiles8 = [];             // 8x8 tiles for the zoomed-out map

function loadImage(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return c;
}

function slice(img, sx, sy, w, h, transparent) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  if (transparent) {
    const id = ctx.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4)
      if (d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0) d[i + 3] = 0;
    ctx.putImageData(id, 0, 0);
  }
  return c;
}

function mirror(c) {
  const m = makeCanvas(c.width, c.height), ctx = m.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.translate(c.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0);
  return m;
}

async function loadSprites() {
  for (const k of Object.keys(sheet)) sheet[k] = await loadImage(ASSETS[k]);
  // 32x32 object tiles: cell N sits at grid N in repton.pcx (10 per row)
  for (let n = 0; n < 21; n++)
    tiles32[n] = slice(sheet.repton, (n % 10) * 32, ((n / 10) | 0) * 32, 32, 32, false);
  // player frames: repman.pcx grid cells 0..11
  for (let n = 0; n < 12; n++)
    manFrames[n] = slice(sheet.repman, (n % 10) * 32, ((n / 10) | 0) * 32, 32, 32, true);
  manFramesMirror = manFrames.map(mirror);
  // 8x8 tiles for zoomed-out map (rep8pix top row, cells 0..16)
  for (let n = 0; n < 17; n++)
    tiles8[n] = slice(sheet.rep8, n * 8, 0, 8, 8, false);
  tiles8[T.EGG] = tiles8[16];               // egg
  tiles8[T.WALLH] = tiles8[10];             // h/i share green wall art
  tiles8[T.WALLI] = tiles8[10];
  tiles8[T.MONSTER] = tiles8[8];            // monster ~ grey ghost
}

// animation frame tables (dir x walk)
const ANIM = {
  down:  [0, 1, 0, 4],
  up:    [7, 6, 7, 8],
  left:  [11, 9, 11, 10],
  right: [11, 9, 11, 10],   // mirrored
};
function playerFrame() {
  const d = ['down', 'up', 'right', 'left'][playerDir];
  const idx = ANIM[d][walkFrame & 3];
  return playerDir === 3 ? manFramesMirror[idx] : manFrames[idx];
}

/* ------------------------------- audio ----------------------------------- */
let AC = null, musicOn = true, sfxOn = true, musicTimer = null, musicStep = 0;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, dur, type = 'square', vol = 0.06, when = 0, slide = 0) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t0); o.stop(t0 + dur);
}
function noise(dur, vol = 0.05, when = 0, hp = 1000) {
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + when;
  const len = Math.max(1, (ac.sampleRate * dur) | 0);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ac.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t0);
}
function sfx(name) {
  if (!sfxOn) return;
  switch (name) {
    case 'dig':     noise(0.05, 0.05, 0, 700); break;
    case 'diamond': tone(1320, 0.06, 'square', 0.05); tone(1760, 0.09, 'square', 0.05, 0.05); break;
    case 'push':    noise(0.08, 0.06, 0, 300); tone(90, 0.08, 'triangle', 0.07); break;
    case 'land':    tone(70, 0.05, 'triangle', 0.05); break;
    case 'crush':   noise(0.12, 0.08, 0, 500); tone(160, 0.1, 'sawtooth', 0.05, 0, -120); break;
    case 'hatch':   noise(0.09, 0.06, 0, 1200); tone(500, 0.1, 'square', 0.04, 0, 300); break;
    case 'key':     tone(880, 0.07, 'square', 0.05); tone(1174, 0.1, 'square', 0.05, 0.07); tone(1568, 0.13, 'square', 0.05, 0.14); break;
    case 'death':   tone(400, 0.5, 'sawtooth', 0.08, 0, -350); noise(0.3, 0.06, 0, 400); break;
    case 'win':     [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.05, i * 0.09)); break;
    case 'click':   tone(700, 0.04, 'square', 0.04); break;
  }
}
// background tune — a jaunty little loop
const TUNE = [262, 330, 392, 523, 392, 330, 262, 330, 294, 349, 440, 587, 440, 349, 294, 349];
const BASS = [131, 131, 98, 98, 110, 110, 98, 98];
function startMusic() {
  if (musicTimer || !musicOn) return;
  musicTimer = setInterval(() => {
    if (!musicOn) return;
    const i = musicStep % 16, b = (musicStep >> 1) % 8;
    tone(TUNE[i], 0.14, 'square', 0.022);
    if ((musicStep & 1) === 0) tone(BASS[b], 0.2, 'triangle', 0.03);
    musicStep++;
  }, 160);
}
function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

/* ------------------------------- rendering ------------------------------- */
const view = document.getElementById('screen');
const vctx = view.getContext('2d');
vctx.imageSmoothingEnabled = false;
const gameCanvas = makeCanvas(SW, SH);
const gctx = gameCanvas.getContext('2d');
gctx.imageSmoothingEnabled = false;

function cellSprite(v) {
  if (v === T.FALLING) return tiles32[T.FALLING];    // falling boulder has its own art
  if (v === T.FALLING_EGG) return tiles32[T.EGG];
  if (v === T.PLAYER) return tiles32[0];             // player cell drawn as space
  if (v > 20) return tiles32[0];
  return tiles32[v];
}

function drawGame(dt) {
  // smooth viewport + player pixel positions
  const k = Math.min(1, dt / 95);
  viewX += (viewLeft * CELL - viewX) * k;
  viewY += (viewTop * CELL - viewY) * k;
  ppx += (px * CELL - ppx) * Math.min(1, dt / 90);
  ppy += (py * CELL - ppy) * Math.min(1, dt / 90);

  gctx.fillStyle = '#000';
  gctx.fillRect(0, 0, SW, SH);
  // draw cells around the viewport (with pixel offset)
  const ox = -Math.round(viewX) + OX, oy = -Math.round(viewY) + OY;
  const x0 = Math.max(0, (( -ox) / CELL) | 0), y0 = Math.max(0, ((-oy) / CELL) | 0);
  const x1 = Math.min(W - 1, x0 + VIEW_W + 1), y1 = Math.min(H - 1, y0 + VIEW_H + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      gctx.drawImage(cellSprite(grid[y * W + x]), ox + x * CELL, oy + y * CELL);
  // player
  const psx = Math.round(ppx) + ox, psy = Math.round(ppy) + oy;
  if (dead && (deathTimer % 10 < 5)) {
    // death flash: skip drawing player on alternate frames
  } else {
    gctx.drawImage(playerFrame(), psx, psy);
  }
  // banners
  gctx.textAlign = 'center';
  if (levelDone) {
    banner('LEVEL ' + (level + 1) + ' COMPLETE!', '#ff0');
  } else if (introTimer > 0) {
    introTimer -= dt;
    banner('LEVEL ' + (level + 1), '#0f0');
  } else if (dead) {
    banner('OUCH!', '#f44');
  }
  gctx.textAlign = 'left';
  return gameCanvas;
}

function banner(txt, color) {
  gctx.font = 'bold 20px monospace';
  gctx.fillStyle = 'rgba(0,0,0,0.55)';
  gctx.fillRect(SW / 2 - 130, SH / 2 - 18, 260, 32);
  gctx.fillStyle = color;
  gctx.fillText(txt, SW / 2, SH / 2 + 5);
}

function drawFullMap() {
  // whole 40x24 map at 8x8 per cell (320x192) + top stat bar
  gctx.fillStyle = '#000';
  gctx.fillRect(0, 0, SW, SH);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      gctx.drawImage(tiles8[Math.min(16, grid[y * W + x])] || tiles8[0], x * 8, y * 8 + 8);
  // top HUD bar with icons + counts
  gctx.fillStyle = '#000'; gctx.fillRect(0, 0, SW, 8);
  gctx.drawImage(tiles8[7], 32, 0);   // repton
  gctx.drawImage(tiles8[2], 96, 0);   // diamond
  gctx.drawImage(tiles8[8], 160, 0);  // monster
  gctx.fillStyle = '#fff';
  gctx.font = '8px monospace';
  gctx.fillText('x ' + lives, 42, 7);
  gctx.fillText('x ' + (diamondsTotal - diamondsGot), 106, 7);
  gctx.fillText('x ' + eggsLeft, 170, 7);
  gctx.fillText('LEVEL ' + (level + 1), 230, 7);
  return gameCanvas;
}

function present(srcCanvas) {
  vctx.imageSmoothingEnabled = false;
  vctx.fillStyle = '#000';
  vctx.fillRect(0, 0, view.width, view.height);
  // integer-ish scale centered
  const scale = Math.min(view.width / SW, (view.height - 28) / SH);
  const dw = (SW * scale) | 0, dh = (SH * scale) | 0;
  const dx = ((view.width - dw) / 2) | 0, dy = 28 + (((view.height - 28 - dh) / 2) | 0);
  vctx.drawImage(srcCanvas, dx, dy, dw, dh);
  // slim status bar above the playfield (outside emulated screen)
  const inGame = (screen === 'play' || screen === 'zoomout');
  vctx.font = 'bold 13px monospace';
  vctx.textBaseline = 'middle';
  vctx.fillStyle = inGame ? '#0f0' : '#234';
  vctx.fillText('REPTON', 8, 14);
  if (inGame) {
    vctx.fillStyle = '#ff0';
    const status = `LIVES ${lives}   DIAMONDS ${diamondsGot}/${diamondsTotal}   MONSTERS ${eggsLeft}   LEVEL ${level + 1}/8   ${speedLabel()}`;
    vctx.fillText(status, 70, 14);
    vctx.textAlign = 'right';
    vctx.fillStyle = '#888';
    vctx.fillText('Z/X/K/M move · SPACE map · ESC menu', view.width - 8, 14);
    vctx.textAlign = 'left';
  }
}

/* ------------------------------- input ----------------------------------- */
const held = new Set();
let screen = 'boot';   // boot|logo|title|loadmap|password|play|zoomout|gameover|win
let menuSel = 0;
let tickMs = 100;      // physics step period (speed control)
let lastTick = 0, acc = 0, lastTime = 0;

const MENU = ['PLAY GAME', 'LOAD MAP', 'PASSWORD', 'QUIT'];
const menuBoxes = [     // click regions on the 320x200 title (from the EXE)
  { x: 103, y: 83,  w: 109, h: 12 },
  { x: 103, y: 100, w: 94,  h: 12 },
  { x: 103, y: 117, w: 106, h: 12 },
  { x: 103, y: 134, w: 45,  h: 12 },
];

function speedLabel() { return 'SPEED ' + Math.round(1000 / tickMs); }

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  audio(); // unlock audio on first input
  const dir = keyDir(k);
  if (dir) held.add(dir);
  onKey(k);
});
window.addEventListener('keyup', e => {
  const dir = keyDir(e.key.toLowerCase());
  if (dir) held.delete(dir);
});
const DIRS = {
  left:  { dx: -1, dy: 0, d: 3 },
  right: { dx: 1,  dy: 0, d: 2 },
  up:    { dx: 0,  dy: -1, d: 1 },
  down:  { dx: 0,  dy: 1, d: 0 },
};
function keyDir(k) {
  if (k === 'z' || k === 'arrowleft')  return 'left';
  if (k === 'x' || k === 'arrowright') return 'right';
  if (k === 'k' || k === 'arrowup')    return 'up';
  if (k === 'm' || k === 'arrowdown')  return 'down';
  return null;
}

function onKey(k) {
  switch (screen) {
    case 'logo':
      screen = 'title'; sfx('click'); break;
    case 'title':
      if (k === 'arrowup' || k === 'k')   { menuSel = (menuSel + 3) % 4; sfx('click'); }
      if (k === 'arrowdown' || k === 'm') { menuSel = (menuSel + 1) % 4; sfx('click'); }
      if (k === 'enter' || k === ' ') activateMenu(menuSel);
      if (k >= '1' && k <= '4') activateMenu(+k - 1);
      break;
    case 'loadmap':
      if (k === '1') { mapData = REPMAP;  startGame(); }
      if (k === '2') { mapData = REPMAMP; startGame(); }
      if (k === 'escape') screen = 'title';
      break;
    case 'password':
      if (k >= '1' && k <= '8') { level = +k - 1; startGame(level); }
      if (k === 'escape') screen = 'title';
      break;
    case 'play':
      if (k === ' ') { screen = 'zoomout'; }
      else if (k === 'escape') { screen = 'title'; stopMusic(); }
      else if (k === '[') { tickMs = Math.min(400, tickMs + 20); }
      else if (k === ']') { tickMs = Math.max(40, tickMs - 20); }
      else if (k === 's') { sfxOn = !sfxOn; }
      else if (k === 't') { musicOn = !musicOn; musicOn ? startMusic() : stopMusic(); }
      break;
    case 'zoomout':
      screen = 'play'; break;
    case 'gameover':
    case 'win':
      screen = 'title'; break;
  }
}

function activateMenu(i) {
  sfx('click');
  if (i === 0) startGame(0);
  else if (i === 1) screen = 'loadmap';
  else if (i === 2) screen = 'password';
  else screen = 'logo';
}

// mouse / touch on the title screen
view.addEventListener('pointerdown', e => {
  audio();
  if (screen === 'title') {
    const r = titleToScreen(e);
    for (let i = 0; i < 4; i++)
      if (r.x >= menuBoxes[i].x && r.x < menuBoxes[i].x + menuBoxes[i].w &&
          r.y >= menuBoxes[i].y && r.y < menuBoxes[i].y + menuBoxes[i].h) {
        activateMenu(i); return;
      }
  } else if (screen === 'logo') { screen = 'title'; sfx('click'); }
  else if (screen === 'zoomout') screen = 'play';
  else if (screen === 'gameover' || screen === 'win') screen = 'title';
});
view.addEventListener('pointermove', e => {
  if (screen !== 'title') return;
  const r = titleToScreen(e);
  for (let i = 0; i < 4; i++)
    if (r.x >= menuBoxes[i].x && r.x < menuBoxes[i].x + menuBoxes[i].w &&
        r.y >= menuBoxes[i].y && r.y < menuBoxes[i].y + menuBoxes[i].h) {
      if (menuSel !== i) { menuSel = i; sfx('click'); }
    }
});
function titleToScreen(e) {
  const rect = view.getBoundingClientRect();
  const scale = Math.min(view.width / SW, (view.height - 28) / SH);
  const dw = SW * scale, dh = SH * scale;
  const dx = (view.width - dw) / 2, dy = 28 + (view.height - 28 - dh) / 2;
  return {
    x: (e.clientX - rect.left - dx) / scale,
    y: (e.clientY - rect.top - dy) / scale,
  };
}

/* ------------------------------- screens --------------------------------- */
function startGame(lv) {
  lives = START_LIVES;
  held.clear();
  loadLevel(lv || 0);
  screen = 'play';
  if (musicOn) startMusic();
}

function drawImageScreen(img, lines, panel) {
  gctx.imageSmoothingEnabled = false;
  gctx.drawImage(img, 0, 0, SW, SH);
  if (panel) {
    gctx.fillStyle = 'rgba(0,0,0,0.82)';
    gctx.fillRect(30, panel[1] - 12, SW - 60, panel[2] - panel[1] + 20);
    gctx.strokeStyle = '#0f0'; gctx.lineWidth = 1;
    gctx.strokeRect(30, panel[1] - 12, SW - 60, panel[2] - panel[1] + 20);
  }
  if (lines) {
    gctx.textAlign = 'center';
    lines.forEach(([txt, y, color, size]) => {
      gctx.font = `bold ${size || 10}px monospace`;
      gctx.fillStyle = color || '#fff';
      gctx.fillText(txt, SW / 2, y);
    });
    gctx.textAlign = 'left';
  }
  return gameCanvas;
}

function drawTitle() {
  drawImageScreen(sheet.title);
  // highlight selected menu item
  const b = menuBoxes[menuSel];
  gctx.strokeStyle = '#ff0';
  gctx.lineWidth = 1;
  gctx.strokeRect(b.x - 3, b.y - 2, b.w + 6, b.h + 4);
  gctx.font = 'bold 8px monospace';
  gctx.fillStyle = '#ff0';
  gctx.fillText('▶', b.x - 12, b.y + 9);
  return gameCanvas;
}

/* ------------------------------- main loop ------------------------------- */
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, t - lastTime); lastTime = t;
  let out = gameCanvas;

  if (screen === 'logo') {
    out = drawImageScreen(sheet.logo, [['', 0]]);
  } else if (screen === 'title') {
    out = drawTitle();
  } else if (screen === 'loadmap') {
    out = drawImageScreen(sheet.title, [
      ['LOAD MAP', 60, '#ff0', 14],
      ['1 - REPMAP.DAT  (original)', 110, '#fff', 10],
      ['2 - REPMAMP.DAT (alternate)', 130, '#fff', 10],
      ['ESC - back', 170, '#888', 9],
    ], [0, 45, 185]);
  } else if (screen === 'password') {
    out = drawImageScreen(sheet.title, [
      ['SELECT LEVEL', 55, '#ff0', 14],
      ['Press  1 - 8', 100, '#fff', 12],
      ['(empty test maps 5-8 auto-complete)', 128, '#888', 8],
      ['ESC - back', 170, '#888', 9],
    ], [0, 40, 185]);
  } else if (screen === 'play' || screen === 'zoomout') {
    // fixed-timestep simulation
    acc += dt;
    while (acc >= tickMs) {
      acc -= tickMs;
      simTick();
      if (screen !== 'play' && screen !== 'zoomout') break;
    }
    out = (screen === 'zoomout') ? drawFullMap() : drawGame(dt);
  } else if (screen === 'gameover') {
    out = drawImageScreen(sheet.title, [
      ['G A M E   O V E R', 90, '#f44', 16],
      ['press any key', 130, '#fff', 10],
    ], [0, 65, 150]);
  } else if (screen === 'win') {
    out = drawImageScreen(sheet.title, [
      ['C O N G R A T U L A T I O N S !', 70, '#ff0', 13],
      ['YOU COMPLETED REPTON', 100, '#fff', 11],
      ['press any key', 140, '#888', 9],
    ], [0, 45, 160]);
  }
  present(out);
}

function simTick() {
  if (screen !== 'play') return;
  if (dead) {
    deathTimer += tickMs;
    if (deathTimer > 700) {
      lives--;
      if (lives < 0) { screen = 'gameover'; stopMusic(); return; }
      respawn();
    }
    return;
  }
  if (levelDone) {
    winTimer += tickMs;
    if (winTimer > 900) {
      const next = level + 1;
      if (next >= 8) { screen = 'win'; stopMusic(); return; }
      loadLevel(next);
      if (diamondsTotal === 0 && eggsLeft === 0) {
        // empty/test map: the original would auto-complete it; skip quietly
        levelDone = true; winTimer = 800;
      }
    }
    return;
  }
  // movement
  for (const s of held) {
    const d = DIRS[s];
    if (tryMove(d.dx, d.dy)) {
      playerDir = d.d;
      walkTick++;
      if (walkTick % 2 === 0) walkFrame = (walkFrame + 1) & 3;
      break;               // one move per tick
    }
  }
  physicsStep();
}

/* --------------------------------- boot ---------------------------------- */
(async function () {
  const el = document.getElementById('msg');
  try {
    await loadSprites();
    document.getElementById('msg').style.display = 'none';
    mapData = REPMAP;
    loadLevel(0);
    screen = 'logo';
    const dbg = new URLSearchParams(location.search).get('screen');
    if (dbg === 'title') screen = 'title';
    if (dbg === 'play') { screen = 'play'; }
    if (dbg === 'zoomout') { screen = 'zoomout'; }
    const dbl = new URLSearchParams(location.search).get('level');
    if (dbl) { loadLevel(+dbl - 1); screen = 'play'; }
    requestAnimationFrame(frame);
  } catch (err) {
    el.textContent = 'Failed to load: ' + err.message;
  }
})();
