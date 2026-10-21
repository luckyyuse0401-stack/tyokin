const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await (async () => { const c = await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true }); await require('./fontroute.js')(c); return c; })()).newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/');
  await p.evaluate(() => localStorage.setItem('nokori:hideInstallTip', 'true'));
  await p.fill('[data-name]', '自分'); await p.fill('[data-bal]', '332732'); await p.click('[data-start]'); await p.click('[data-ob-next]'); await p.click('[data-ob-next]'); await p.waitForTimeout(400); await p.click('.sheet [data-later]');
  await p.waitForTimeout(2600);
  await p.screenshot({ path: process.argv[2] + '/x0.png' });
  await p.click('[data-act="pad-key"][data-k="2"]'); await p.click('[data-act="pad-key"][data-k="5"]'); await p.click('[data-act="pad-key"][data-k="00"]');
  await p.screenshot({ path: process.argv[2] + '/x1.png' });
  await p.click('[data-act="pad-cat"][data-cat="food"]');
  // 600 only
  await p.click('[data-act="pad-key"][data-k="6"]'); await p.click('[data-act="pad-key"][data-k="00"]'); await p.click('[data-act="pad-plain"]');
  // big: 25,000
  await p.click('[data-act="pad-key"][data-k="2"]'); await p.click('[data-act="pad-key"][data-k="5"]'); await p.click('[data-act="pad-key"][data-k="00"]'); await p.click('[data-act="pad-key"][data-k="0"]');
  await p.screenshot({ path: process.argv[2] + '/x2.png' });
  await p.click('[data-act="pad-cat"][data-cat="shop"]');
  // memo path 3,800
  await p.click('[data-act="pad-key"][data-k="3"]'); await p.click('[data-act="pad-key"][data-k="8"]'); await p.click('[data-act="pad-key"][data-k="00"]'); await p.click('[data-act="pad-memo"]');
  await p.fill('.sheet [data-memo]', '美容院'); await p.click('.sheet [data-cat="beauty"]');
  console.log(await p.evaluate(() => D.tx.map(x => `${x.amount} ${x.cat||'-'} ${x.memo||''}`).join(' | ')), await p.evaluate(() => balance()));
  await p.waitForTimeout(5200);
  await p.screenshot({ path: process.argv[2] + '/x3.png', fullPage: true });
  await b.close();
})();
