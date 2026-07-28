const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=play&level=4', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1200));

  // Test death by skull + respawn
  const r1 = await page.evaluate(() => {
    // place player next to a skull in open space
    const W2 = 40;
    for (let i = 0; i < grid.length; i++) grid[i] = 4;
    for (let y = 2; y < 8; y++) for (let x = 2; x < 12; x++) grid[y * W2 + x] = 0;
    grid[5 * W2 + 6] = 14;  // skull at (6,5)
    px = 5; py = 5; grid[5 * W2 + 5] = 7;
    startX = 3; startY = 3; lives = 3; dead = false; deathTimer = 0;
    const moved = tryMove(1, 0);   // walk right onto skull
    return { moved, dead };
  });
  console.log('walk into skull:', JSON.stringify(r1));

  // wait for respawn (death anim ~700ms + ticks)
  await new Promise(r => setTimeout(r, 1500));
  const r2 = await page.evaluate(() => ({ lives, dead, px, py, sx: startX, sy: startY }));
  console.log('after death+respawn:', JSON.stringify(r2));

  // Test game over
  await page.evaluate(() => { lives = 1; dead = true; deathTimer = 800; });
  await new Promise(r => setTimeout(r, 800));
  const r3 = await page.evaluate(() => ({ screen, lives }));
  console.log('game over state:', JSON.stringify(r3));
  await page.screenshot({ path: '/tmp/e2e_gameover.png' });

  // Test level completion -> next level
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=play&level=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1000));
  const r4 = await page.evaluate(() => {
    diamondsGot = diamondsTotal; eggsLeft = 0; levelDone = false;
    physicsStep();  // should set levelDone
    return { levelDone, level };
  });
  console.log('level done:', JSON.stringify(r4));
  await new Promise(r => setTimeout(r, 1500));
  const r5 = await page.evaluate(() => ({ level, screen }));
  console.log('advanced to level:', JSON.stringify(r5));

  console.log('JS errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
