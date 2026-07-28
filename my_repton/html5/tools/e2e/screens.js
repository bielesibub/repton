const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox','--disable-gpu','--window-size=980,760'] });
  const page = await browser.newPage();
  await page.setViewport({width:980,height:760});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=title', { waitUntil: 'load' });
  await new Promise(r=>setTimeout(r,800));
  // navigate down to LOAD MAP and select
  await page.keyboard.press('ArrowDown'); await new Promise(r=>setTimeout(r,150));
  await page.keyboard.press('Enter'); await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:'/tmp/e2e_loadmap.png'});
  console.log('screen after LOAD MAP:', await page.evaluate(()=>screen));
  // pick REPMAMP
  await page.keyboard.press('2'); await new Promise(r=>setTimeout(r,600));
  console.log('after map 2 select:', JSON.stringify(await page.evaluate(()=>({screen,map:mapData===REPMAMP?'REPMAMP':'REPMAP',level}))));
  // back to title, PASSWORD
  await page.goto('file:///Users/paulbieles/development/repton/my_repton/html5/repton.html?screen=title', { waitUntil: 'load' });
  await new Promise(r=>setTimeout(r,600));
  await page.keyboard.press('ArrowDown'); await new Promise(r=>setTimeout(r,120));
  await page.keyboard.press('ArrowDown'); await new Promise(r=>setTimeout(r,120));
  await page.keyboard.press('Enter'); await new Promise(r=>setTimeout(r,400));
  await page.screenshot({path:'/tmp/e2e_password.png'});
  console.log('screen after PASSWORD:', await page.evaluate(()=>screen));
  await page.keyboard.press('3'); await new Promise(r=>setTimeout(r,600));
  console.log('after level 3 select:', JSON.stringify(await page.evaluate(()=>({screen,level,d:diamondsTotal,e:eggsLeft}))));
  console.log('JS errors:', errors.length?errors:'none');
  await browser.close();
})().catch(e=>{console.error('TEST FAILED:',e);process.exit(1);});
