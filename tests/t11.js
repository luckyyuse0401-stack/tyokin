const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'NG  ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); await require('./fontroute.js')(c);
  const p = await c.newPage(); await p.goto('http://localhost:8765/');
  ok(!(await p.$eval('[data-pin]', e => e.classList.contains('on'))), '最初はパスコードがオフ');
  await p.fill('[data-name]', 'A'); await p.fill('[data-bal]', '1000'); await p.click('[data-start]'); await p.waitForTimeout(400); await p.waitForTimeout(400); await p.click('.sheet [data-later]');
  ok(!!(await p.$('.pad')), 'パスコードなしでそのままホーム');
  await p.reload(); await p.waitForTimeout(800);
  ok(!!(await p.$('.pad')) && !(await p.$('.pinpad')), '開き直してもロック画面が出ない');
  await p.screenshot({ path: process.argv[2] + '/w.png' });
  await b.close();
})();
