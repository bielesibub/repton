const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  // game over at lives=0
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=play&level=1', { waitUntil: 'load' });
  await new Promise(r=>setTimeout(r,1000));
  await page.evaluate(()=>{ lives=0; dead=true; deathTimer=800; });
  await new Promise(r=>setTimeout(r,600));
  console.log('gameover at 0 lives:', JSON.stringify(await page.evaluate(()=>({screen,lives}))));
  await page.screenshot({path:'/tmp/e2e_gameover.png'});
  // win path: complete level 4 (index 3) -> empty 5-8 auto-skip -> win
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=play&level=4', { waitUntil: 'load' });
  await new Promise(r=>setTimeout(r,1000));
  await page.evaluate(()=>{ diamondsGot=diamondsTotal; eggsLeft=0; levelDone=false; physicsStep(); });
  // let it advance through levels 5-8 (empty, auto-complete ~900ms each)
  for (let i=0;i<14;i++){ await new Promise(r=>setTimeout(r,400)); const s=await page.evaluate(()=>({level,screen,done:levelDone,d:diamondsTotal,e:eggsLeft})); if(s.screen==='win'){console.log('WIN reached:',JSON.stringify(s));break;} if(i===13)console.log('end state:',JSON.stringify(s)); }
  await page.screenshot({path:'/tmp/e2e_win.png'});
  console.log('JS errors:', errors.length?errors:'none');
  await browser.close();
})().catch(e=>{console.error('TEST FAILED:',e);process.exit(1);});
