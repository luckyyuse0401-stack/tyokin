const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
const S = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await (async () => { const c = await b.newContext({ ...devices['iPhone 13'], locale: 'ja-JP', ignoreHTTPSErrors: true, permissions: ['clipboard-read','clipboard-write'] }); await require('./fontroute.js')(c); return c; })();
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/');
  await p.fill('[data-name]', 'テスト');
  await p.fill('[data-bal]', '332732');
  await p.click('[data-pin]');
  await p.click('[data-start]');
  // set pin 1234 twice
  for (const k of '12341234') await p.click(`.sheet .pinpad [data-k="${k}"]`); await p.waitForTimeout(400); await p.click('.sheet [data-later]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: S + '/1-home.png', fullPage: false });
  // quick 500 → コンビニ
  await p.click('[data-act="pad-quick"][data-v="500"]');
  await p.click('[data-act="pad-cat"][data-cat="conv"]');
  await p.waitForTimeout(200);
  await p.click('[data-act="pad-quick"][data-v="1000"]');
  await p.click('[data-act="pad-memo"]');
  await p.fill('.sheet [data-memo]', 'ランチ');
  await p.click('.sheet [data-save]');
  // settings: add rec card blank amount day 27, salary 20 280000
  await p.click('#tabbar [data-view="settings"]');
  await p.click('[data-act="rec-add"]');
  await p.fill('.sheet [data-name]', '楽天カード'); await p.fill('.sheet [data-day]', '27');
  await p.click('.sheet [data-save]');
  await p.click('[data-act="rec-add"]');
  await p.click('.sheet [data-k="income"]');
  await p.fill('.sheet [data-name]', '給料'); await p.fill('.sheet [data-day]', '20'); await p.fill('.sheet [data-amt]', '280000');
  await p.click('.sheet [data-save]');
  await p.click('[data-act="rec-add"]');
  await p.fill('.sheet [data-name]', 'スマホ代'); await p.fill('.sheet [data-day]', '31'); await p.fill('.sheet [data-amt]', '6000');
  await p.click('.sheet [data-save]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: S + '/3-settings.png', fullPage: true });
  // calendar: tap 27 and enter amount
  await p.click('#tabbar [data-view="calendar"]');
  const ym = await p.evaluate(() => calYM);
  await p.click(`[data-act="day"][data-date="${ym}-27"]`);
  await p.click('.day-panel [data-act="occ"]');
  await p.fill('.sheet [data-amount]', '42000');
  await p.click('.sheet [data-save]');
  await p.waitForTimeout(300);
  await p.screenshot({ path: S + '/4-calendar.png', fullPage: true });
  await p.click('#tabbar [data-view="home"]');
  await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/5-home.png', fullPage: true });
  console.log('balance', await p.evaluate(() => balance()));
  // transfer link
  await p.click('#tabbar [data-view="settings"]');
  await p.click('[data-act="transfer-copy"]');
  for (const k of '1234') await p.click(`.sheet .pinpad [data-k="${k}"]`);
  await p.waitForSelector('.sheet [data-close]');
  await p.screenshot({ path: S + '/6-transfer.png' });
  const url = await p.evaluate(() => { const o = exportObject(); return encodeTransfer(o, '1234').then(c => location.origin + location.pathname + '#import=' + c); });
  console.log('url len', url.length);
  // new context import
  const ctx2 = await (async () => { const c = await b.newContext({ ...devices['iPhone 13'], locale: 'ja-JP', ignoreHTTPSErrors: true, permissions: ['clipboard-read','clipboard-write'] }); await require('./fontroute.js')(c); return c; })();
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push('P2 ' + e.message));
  await p2.goto(url);
  for (const k of '1111') await p2.click(`.pinpad [data-k="${k}"]`);
  await p2.waitForTimeout(700);
  const wrong = await p2.textContent('[data-pin-sub]');
  for (const k of '1234') await p2.click(`.pinpad [data-k="${k}"]`);
  await p2.waitForSelector('[data-ok]');
  await p2.screenshot({ path: S + '/7-import.png' });
  await p2.click('[data-ok]');
  await p2.waitForTimeout(300);
  console.log('wrong msg', wrong, 'imported balance', await p2.evaluate(() => balance()), 'hash', await p2.evaluate(() => location.hash));
  // reload → lock screen
  await p2.reload();
  await p2.screenshot({ path: S + '/8-lock.png' });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
