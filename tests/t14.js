// 支払い方法（カード・PayPay）と「使えるお金」のテスト
const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'NG  ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); await require('./fontroute.js')(c);
  await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  const p = await c.newPage(); const E = (f, a) => p.evaluate(f, a);
  p.on('pageerror', e => ok(false, 'pageerror ' + e.message));
  await p.goto('http://localhost:8765/');
  await p.fill('[data-name]', '自分'); await p.fill('[data-bal]', '100000'); await p.click('[data-start]'); await p.waitForTimeout(400);
  await p.click('.sheet [data-later]'); await p.waitForTimeout(200);
  await E(() => { showBal = true; render(); });
  ok(!(await p.$('.pad-pm')), '支払い方法がなければボタンは出ない');
  ok((await p.textContent('.balance .lbl')).includes('の残高'), '今まで通り「残高」');
  // カードとPayPayを登録
  await p.click('#tabbar [data-view="settings"]'); await p.click('[data-act="pm-add"]');
  await p.fill('.sheet [data-name]', '楽天カード'); await p.click('.sheet [data-pre="0"]');
  await p.screenshot({ path: process.argv[2] + '/pm.png' });
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  await p.click('[data-act="pm-add"]'); await p.fill('.sheet [data-name]', 'PayPay'); await p.click('.sheet [data-t="instant"]'); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  ok(await E(() => D.pm.map(x => x.name + ':' + x.type).join()) === '楽天カード:card,PayPay:instant', '2つ登録');
  ok(await E(() => { const r = D.rec.find(r => r.pm); return r && r.name === '楽天カード' && r.day === 27 && r.amount === 0; }), 'カードの引き落とし予定が自動でできる');
  // ホームで払い方を選ぶ
  await p.click('#tabbar [data-view="home"]');
  ok(await p.$$eval('.pad-pm button', e => e.map(x => x.textContent + (x.classList.contains('on') ? '*' : '')).join()) === '現金*,楽天カード,PayPay', '現金・楽天カード・PayPay（最初は現金）');
  const before = await E(() => [balance(), usable()]);
  await p.click('[data-act="pad-pm"][data-pm="' + await E(() => D.pm[0].id) + '"]');
  for (const k of ['1', '2', '8', '0']) await p.click(`[data-act="pad-key"][data-k="${k}"]`);
  await p.click('[data-act="pad-cat"][data-cat="food"]'); await p.waitForTimeout(200);
  const after = await E(() => [balance(), usable(), cardOutstanding()]);
  ok(after[0] === before[0], 'カードで払っても口座の残高はそのまま');
  ok(after[1] === before[1] - 1280 && after[2] === 1280, '使えるお金はすぐ1,280減る');
  ok((await p.textContent('#toast-root')).includes('楽天カードで'), 'トーストに引き落とし日');
  ok((await p.textContent('.balance .lbl')).includes('使えるお金') && (await p.textContent('.bal-sub')).includes('−¥1,280'), 'トップが「使えるお金」＋内訳');
  await p.screenshot({ path: process.argv[2] + '/home.png' });
  ok(await p.$eval('.pad-pm button.on', e => e.textContent) === '楽天カード', '次も前回の払い方が選ばれている');
  // カテゴリが隠れない
  const last = await p.$eval('.pad-cats button:last-child', e => e.getBoundingClientRect().bottom), tab = await p.$eval('#tabbar', e => e.getBoundingClientRect().top);
  ok(last < tab, `カテゴリはスクロールなしで見える（${Math.round(last)} < ${Math.round(tab)}）`);
  // PayPayはその場で減る
  await p.click('[data-act="pad-pm"][data-pm="' + await E(() => D.pm[1].id) + '"]');
  await p.click('[data-act="pad-quick"][data-v="500"]'); await p.click('[data-act="pad-cat"][data-cat="conv"]');
  ok(await E(() => balance()) === before[0] - 500, 'PayPayは口座からすぐ減る');
  // 締め日の計算
  ok(await E(() => [payYmOf({ close: 0, off: 1, pay: 27 }, '2026-10-20'), payYmOf({ close: 15, off: 1, pay: 10 }, '2026-10-20'), payYmOf({ close: 15, off: 1, pay: 10 }, '2026-10-15'), payYmOf({ close: 0, off: 2, pay: 4 }, '2026-10-31')].join()) === '2026-11,2026-12,2026-11,2026-12', '締め日→引き落とし月の計算');
  // 月の集計は二重にならない
  const st = await E(() => monthStats(ymOf(today())));
  ok(st.spent === 1780 && st.fixed === 0, `今月の「使った」に1回だけ入る（${st.spent}/${st.fixed}）`);
  const card = await E(() => { const r = D.rec.find(r => r.pm); const ym = addMonths(ymOf(today()), 1); return virtuals(ym).filter(v => v.rec === r.id).map(v => v.amount).join(); });
  ok(card === '1280', '来月の引き落とし予定に1,280');
  // 予測：カードの分は1回だけ引かれる
  const fc1 = await E(() => forecast(3).map(x => x.v));
  // 明細の金額で合わせる
  await p.click('#tabbar [data-view="calendar"]'); await p.click('[data-act="cal-mode"][data-m="sum"]');
  ok((await p.textContent('.ccard')).includes('¥1,280'), 'まとめにカードの次の引き落とし');
  await p.screenshot({ path: process.argv[2] + '/sum.png' });
  await p.click('[data-act="card-fix"]'); await p.waitForTimeout(300);
  ok(await p.$eval('.sheet [data-amount]', e => e.value) === '1280', '合わせる画面は記録の合計が入っている');
  await p.fill('.sheet [data-amount]', '2000'); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  ok(await E(() => cardOutstanding()) === 2000 && await E(() => usable()) === before[1] - 500 - 2000, '明細の金額に合わせると使えるお金も合う');
  const fc2 = await E(() => forecast(3).map(x => x.v));
  ok(fc2[fc2.length - 1] - fc1[fc1.length - 1] === -720 && fc2.slice(-2)[1] - fc2.slice(-2)[0] === fc1.slice(-2)[1] - fc1.slice(-2)[0], '予測は差の720だけ下がり、二重には引かない');
  // 引き落とし日が来たら口座から引かれる
  const t2 = await E(() => { const r = D.rec.find(r => r.pm); const tx = D.tx.find(x => x.rec === r.id); tx.date = today(); processedOn = ''; render(); return [balance(), usable(), cardOutstanding()]; });
  ok(t2[0] === before[0] - 500 - 2000 && t2[2] === 0 && t2[1] === t2[0], '引き落とされたら口座が減り、引き落とし待ちは0');
  const nst = await E(() => monthStats(ymOf(today())));
  ok(nst.fixed === 720 && nst.spent === 1780, `引き落としは記録との差（720）だけ「引き落とし」に入る（${nst.fixed}）`);
  // 自動で引き落としが作られる（明細で合わせなかった場合）
  const auto = await E(() => {
    const c = D.pm[0], r = D.rec.find(r => r.pm); r.start = addMonths(ymOf(today()), -3) + '-01';
    const d = addMonths(ymOf(today()), -2) + '-10';
    D.tx.push({ id: 'old', date: d, kind: 'expense', amount: 3000, cat: 'shop', pm: c.id });
    processedOn = ''; processRecurring();
    return D.tx.filter(x => x.rec === r.id).map(x => x.ym + ':' + x.amount).sort().join();
  });
  ok(auto.includes(':3000'), '過去の分は引き落とし日に自動で記録になる ' + auto);
  // 過去の入力でも払い方を選べる
  await p.click('#tabbar [data-view="home"]'); await p.click('[data-act="add"][data-kind="expense"]'); await p.waitForTimeout(300);
  ok(await p.$$eval('.sheet .pad-pm button', e => e.length) === 3, '昨日以前の支出でも払い方を選べる');
  await E(() => closeSheet());
  // 削除すると現金扱いに戻る
  await E(() => { const id = D.pm[0].id; for (const x of D.tx) if (x.pm === id) delete x.pm; D.pm = D.pm.filter(x => x.id !== id); save(); render(); });
  ok(await E(() => !hasCards() && cardOutstanding() === 0), 'カードを消すと「使えるお金」表示も消える');
  // 引き継ぎにも入る
  ok(await E(() => exportObject().d.pm.length) === 1, '引き継ぎデータに支払い方法が入る');
  await b.close();
})();
