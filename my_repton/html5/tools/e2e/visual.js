const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox','--disable-gpu','--window-size=980,760'] });
  const page = await browser.newPage();
  await page.setViewport({width:980,height:760});
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=play&level=2', { waitUntil: 'load' });
  await new Promise(r=>setTimeout(r,1000));
  // dig around for a bit to trigger physics/monsters
  const moves=['m','x','x','m','z','m','x','k','x','x','m','m','x'];
  for (const k of moves){ await page.keyboard.down(k); await new Promise(r=>setTimeout(r,150)); await page.keyboard.up(k); await new Promise(r=>setTimeout(r,80)); }
  await new Promise(r=>setTimeout(r,3000));
  await page.screenshot({path:'/tmp/e2e_level2.png'});
  console.log('state:', JSON.stringify(await page.evaluate(()=>({lives,d:diamondsGot,e:eggsLeft,dead}))));
  await browser.close();
})().catch(e=>{console.error('FAILED:',e);process.exit(1);});
