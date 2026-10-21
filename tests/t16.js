// シートを × と下スワイプで閉じられるか
const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'NG  ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); await require('./fontroute.js')(c);
  await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  const p = await c.newPage(); const E = (f, a) => p.evaluate(f, a);
  p.on('pageerror', e => ok(false, 'pageerror ' + e.message));
  await p.goto('http://localhost:8765/');
  await p.fill('[data-name]', '自分'); await p.click('[data-start]'); await p.click('[data-ob-next]'); await p.click('[data-ob-next]'); await p.waitForTimeout(400);
  ok(!!(await p.$('.sheet .sheet-x')), 'シートに×がある');
  await p.click('.sheet .sheet-x'); await p.waitForTimeout(200);
  ok(!(await p.$('.sheet')), '×で閉じる');
  const swipe = (dy, ms = 300) => E(async ({ dy, ms }) => {
    const s = document.querySelector('.sheet'); const t = (y) => new Touch({ identifier: 1, target: s, clientX: 200, clientY: y });
    s.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], bubbles: true, cancelable: true }));
    for (let i = 1; i <= 5; i++) s.dispatchEvent(new TouchEvent('touchmove', { touches: [t(300 + dy * i / 5)], bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, ms));
    s.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 300));
  }, { dy, ms });
  await E(() => openBudget());
  await swipe(40); ok(!!(await p.$('.sheet')), '少しだけ下げても閉じない（戻る）');
  ok(await E(() => document.querySelector('.sheet').style.transform) === '', '元の位置に戻る');
  await swipe(200); ok(!(await p.$('.sheet')), '下にスワイプすると閉じる');
  await E(() => openBudget()); await E(() => { document.querySelector('.sheet').scrollTop = 200; });
  await swipe(200); ok(!!(await p.$('.sheet')), '途中までスクロールしているときは閉じない（ふつうにスクロール）');
  await b.close();
})();
