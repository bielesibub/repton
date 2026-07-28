const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=play&level=2', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1200));

  const results = await page.evaluate(() => {
    const out = {};
    const W2 = 40;
    function clear() { for (let i = 0; i < grid.length; i++) grid[i] = 4; }
    function box(x1, y1, x2, y2) { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) grid[y * W2 + x] = 0; }

    // --- Test 1: boulder falls straight down into space
    clear(); box(2, 2, 10, 10);
    grid[3 * W2 + 5] = 3;           // boulder at (5,3)
    physicsStep();
    out.fall_straight = grid[4 * W2 + 5];       // should be falling(9)->boulder2(8) next... check below
    out.fall_origin = grid[3 * W2 + 5];         // should be 0

    // --- Test 2: boulder rolls off a diamond
    clear(); box(2, 2, 12, 10);
    grid[5 * W2 + 5] = 2;           // diamond at (5,5)
    grid[4 * W2 + 5] = 3;           // boulder on top of diamond
    grid[5 * W2 + 4] = 0; grid[5 * W2 + 6] = 0; // space beside
    physicsStep();
    out.roll_below_diamond = grid[5 * W2 + 5];  // diamond stays
    out.roll_result = [grid[5 * W2 + 4], grid[5 * W2 + 5], grid[5 * W2 + 6], grid[6 * W2 + 4], grid[6 * W2 + 6]];

    // --- Test 3: falling boulder crushes monster
    clear(); box(2, 2, 10, 10);
    grid[3 * W2 + 5] = 9;           // falling boulder
    grid[4 * W2 + 5] = 20;          // monster below
    const eggsBefore = eggsLeft = 5;
    physicsStep();
    out.crush_eggs = eggsLeft;      // should be 4
    out.crush_cell = grid[4 * W2 + 5]; // monster replaced by boulder2(8)

    // --- Test 4: egg hatches into monster on landing
    clear(); box(2, 2, 10, 10);
    grid[3 * W2 + 5] = 21;          // falling egg
    grid[4 * W2 + 5] = 4;           // wall below (lands)
    physicsStep();
    out.hatch = grid[3 * W2 + 5];   // should be 20 (monster)

    // --- Test 5: boulder falls on player -> death
    clear(); box(2, 2, 10, 10);
    grid[3 * W2 + 5] = 9;
    grid[4 * W2 + 5] = 7;           // player below
    dead = false;
    physicsStep();
    out.player_crushed = dead;      // should be true

    // --- Test 6: monster chases player horizontally
    clear(); box(2, 2, 20, 10);
    grid[5 * W2 + 10] = 20;         // monster at (10,5)
    px = 15; py = 5; grid[5 * W2 + 15] = 7;  // player at (15,5)
    moveMonster(10, 5);
    out.monster_moved_to = (() => { for (let x = 8; x <= 14; x++) if (grid[5 * W2 + x] === 20) return x; return -1; })();

    // --- Test 7: key opens safes
    clear(); box(2, 2, 20, 10);
    grid[5 * W2 + 5] = 16; grid[5 * W2 + 8] = 16;  // two safes
    grid[5 * W2 + 3] = 15;                           // key
    px = 4; py = 5; grid[5 * W2 + 4] = 7;
    tryMove(-1, 0);   // walk left onto the key
    out.safe1 = grid[5 * W2 + 5]; out.safe2 = grid[5 * W2 + 8]; // should be 2 (diamond)
    out.key_gone = grid[5 * W2 + 3];

    // --- Test 8: player pushes boulder horizontally
    clear(); box(2, 2, 20, 10);
    grid[5 * W2 + 5] = 3;           // boulder
    grid[5 * W2 + 6] = 0;           // space beyond
    px = 4; py = 5; grid[5 * W2 + 4] = 7;
    const pushed = tryMove(1, 0);
    out.push_ok = pushed; out.boulder_new = grid[5 * W2 + 6]; out.player_at = px;

    // --- Test 9: player cannot push boulder vertically
    clear(); box(2, 2, 20, 10);
    grid[5 * W2 + 5] = 3;
    px = 5; py = 4; grid[4 * W2 + 5] = 7;
    out.push_vert = tryMove(0, 1);  // should be false

    // --- Test 10: level completion detection
    clear(); box(2, 2, 20, 10);
    diamondsGot = 5; diamondsTotal = 5; eggsLeft = 0; levelDone = false;
    physicsStep();
    out.level_done = levelDone;

    return out;
  });
  console.log(JSON.stringify(results, null, 1));
  console.log('JS errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
