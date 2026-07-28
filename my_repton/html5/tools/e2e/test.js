const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=980,760'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 980, height: 760 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=play&level=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1500));

  const state = async () => page.evaluate(() => ({
    screen, lives, diamondsGot, diamondsTotal, eggsLeft, px, py, level, dead,
    cells: (() => { let n = 0; for (let i = 0; i < grid.length; i++) if (grid[i] === 7) n++; return n; })(),
  }));

  console.log('initial:', JSON.stringify(await state()));
  await page.screenshot({ path: '/tmp/e2e_start.png' });

  // move right (x key) a few times
  for (let i = 0; i < 5; i++) { await page.keyboard.down('x'); await new Promise(r => setTimeout(r, 140)); await page.keyboard.up('x'); await new Promise(r => setTimeout(r, 60)); }
  console.log('after right x5:', JSON.stringify(await state()));

  // move down (m) a few times
  for (let i = 0; i < 4; i++) { await page.keyboard.down('m'); await new Promise(r => setTimeout(r, 140)); await page.keyboard.up('m'); await new Promise(r => setTimeout(r, 60)); }
  console.log('after down x4:', JSON.stringify(await state()));

  // let physics run
  await new Promise(r => setTimeout(r, 2000));
  console.log('after physics:', JSON.stringify(await state()));
  await page.screenshot({ path: '/tmp/e2e_moves.png' });

  // zoomout
  await page.keyboard.press(' ');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: '/tmp/e2e_zoomout.png' });
  console.log('zoomout screen:', (await state()).screen);
  await page.keyboard.press(' ');
  await new Promise(r => setTimeout(r, 300));

  console.log('JS errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('TEST FAILED:', e.message); process.exit(1); });
