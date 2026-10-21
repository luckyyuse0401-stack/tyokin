// 口座を複数にする のテスト
const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'NG  ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); await require('./fontroute.js')(c);
  await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  const p = await c.newPage(); const E = (f, a) => p.evaluate(f, a);
  p.on('pageerror', e => ok(false, 'pageerror ' + e.message));
  await p.goto('http://localhost:8765/');
  await p.fill('[data-name]', '自分'); await p.fill('[data-bal]', '100000'); await p.click('[data-start]'); await p.click('[data-ob-next]'); await p.click('[data-ob-next]'); await p.waitForTimeout(400);
  await p.click('.sheet [data-later]'); await p.waitForTimeout(200);
  await p.evaluate(() => { D.mode = 'pro'; save(); render(); });
  await E(() => { showBal = true; render(); });
  ok(!(await p.$('.acc-toggle')), '口座が1つなら▼は出ない');
  // 口座を追加
  await p.click('#tabbar [data-view="settings"]');
  await p.click('[data-act="acc-add"]'); await p.fill('.sheet [data-name]', '楽天銀行'); await p.fill('.sheet [data-bal]', '50000'); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  await p.click('[data-act="acc-edit"][data-id="main"]'); await p.fill('.sheet [data-name]', '三菱UFJ'); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  const rk = await E(() => D.acc[0].id);
  ok(await E(() => balance()) === 150000, '合計は15万');
  ok(await E(rk => [accBalance('main'), accBalance(rk)].join(), rk) === '100000,50000', '口座ごとの残高');
  // 給料は三菱UFJ、カードは楽天銀行から
  await p.click('[data-act="rec-add"]'); await p.click('.sheet [data-k="income"]');
  ok(await p.$$eval('.sheet [data-acc]', e => e.length) === 2, '予定の登録で口座を選べる');
  await p.fill('.sheet [data-name]', '給料'); await p.fill('.sheet [data-day]', '1'); await p.fill('.sheet [data-amt]', '200000');
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  await p.click('[data-act="pm-add"]'); await p.fill('.sheet [data-name]', '楽天カード');
  await p.click(`.sheet [data-acc="${rk}"]`);
  await p.screenshot({ path: process.argv[2] + '/pm.png' });
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  await p.click('[data-act="pm-add"]'); await p.fill('.sheet [data-name]', 'PayPay'); await p.click('.sheet [data-t="instant"]'); await p.click(`.sheet [data-acc="${rk}"]`); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  await p.screenshot({ path: process.argv[2] + '/set.png', fullPage: true });
  // 支出
  await p.click('#tabbar [data-view="home"]');
  const pay = async (pmName, ks) => { const id = await E(n => n === '現金' ? 'cash' : D.pm.find(x => x.name === n).id, pmName); await p.click(`[data-act="pad-pm"][data-pm="${id}"]`); for (const k of ks) await p.click(`[data-act="pad-key"][data-k="${k}"]`); await p.click('[data-act="pad-cat"][data-cat="food"]'); await p.waitForTimeout(100); };
  await pay('現金', ['1', '0', '00']); await pay('PayPay', ['5', '00']); await pay('楽天カード', ['3', '0', '00']);
  const bals = await E(rk => [accBalance('main'), accBalance(rk), balance(), usable()].join(), rk);
  ok(bals === '99000,49500,148500,145500', '現金→メイン、PayPay→楽天銀行、カードは使えるお金だけ ' + bals);
  // カードの引き落としは楽天銀行から
  await E(() => { const r = D.rec.find(r => r.pm); const c = D.pm.find(x => x.type === 'card'); D.tx.push({ id: 'w', date: today(), kind: 'expense', amount: 3000, rec: r.id, ym: payYmOf(c, today()), name: r.name }); render(); });
  ok(await E(rk => accBalance(rk), rk) === 46500 && await E(() => accBalance('main')) === 99000, 'カードの引き落としは楽天銀行から');
  await E(() => { D.tx = D.tx.filter(x => x.id !== 'w'); render(); });
  // ホームの▼
  ok((await p.textContent('.acc-toggle')).includes('口座ごと'), 'ホームに▼');
  await p.click('[data-act="acc-open"]');
  ok(await p.$$eval('.acc-list .r', e => e.map(x => x.textContent.replace(/\s/g, '')).join('|')) === '三菱UFJ¥99,000|楽天銀行¥49,500', '開くと口座ごと');
  await p.screenshot({ path: process.argv[2] + '/home.png' });
  // 給料は三菱UFJに入る
  ok(await E(() => { const r = D.rec.find(r => r.name === '給料'); return !r.acc; }), '給料はメイン（三菱UFJ）');
  // 残高を合わせる（口座を選ぶ）
  await p.click('#tabbar [data-view="settings"]'); await p.click('.menu [data-act="adjust"]');
  await p.click(`.sheet [data-acc="${rk}"]`);
  ok((await p.textContent('.sheet [data-now]')).includes('49,500'), '口座を選ぶとその口座の残高');
  await p.fill('.sheet [data-v]', '49000'); await p.waitForTimeout(100); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  ok(await E(rk => accBalance(rk), rk) === 49000 && await E(() => accBalance('main')) === 99000, '選んだ口座だけ合わせる');
  // 収入を口座に
  await p.click('#tabbar [data-view="home"]'); await p.click('[data-act="add"][data-kind="income"]'); await p.waitForTimeout(300);
  await p.fill('.sheet [data-amount]', '5000'); await p.click(`.sheet [data-acc="${rk}"]`); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  ok(await E(rk => accBalance(rk), rk) === 54000, '収入を楽天銀行に入れられる');
  // 引き継ぎ（短くしても口座ごとの残高が保たれる）
  const ex = await E(rk => { const o = exportObject(1); const d = o.d; return [d.acc.length, d.mainName].join(); }, rk);
  ok(ex === '1,三菱UFJ', '引き継ぎに口座が入る');
  // 口座を削除するとメインにまとまる
  const total = await E(() => balance());
  await E(rk => { const a = D.acc.find(x => x.id === rk); D.base += a.base; for (const x of D.tx) if (x.acc === a.id) delete x.acc; for (const r of D.rec) if (r.acc === a.id) delete r.acc; for (const q of D.pm) if (q.acc === a.id) delete q.acc; D.acc = []; render(); }, rk);
  ok(await E(() => balance()) === total && await E(() => accBalance('main')) === total, '削除してもメインにまとまり合計は同じ');
  await b.close();
})();
