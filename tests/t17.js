// シンプル版：はじめる流れ・今月あと使えるお金・ざっくり/しっかり・PayPay・カードと予定をつなぐ・CSV取り込み
const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'NG  ') + m); if (!c) process.exitCode = 1; };
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); await require('./fontroute.js')(c);
  await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  const p = await c.newPage(); const E = (f, a) => p.evaluate(f, a);
  p.on('pageerror', e => ok(false, 'pageerror ' + e.message));
  await p.goto('http://localhost:8765/');
  await p.fill('[data-name]', '自分'); await p.fill('[data-bal]', '300000'); await p.click('[data-start]'); await p.waitForTimeout(300);
  // はじめる流れ
  ok((await p.textContent('.qh')).includes('どんなふうに使う'), '②使い方を選ぶ');
  await p.screenshot({ path: OUT + '/ob2.png' });
  await p.click('[data-ob-m="pro"]'); await p.click('[data-ob-next]');
  ok(await E(() => D.mode) === 'pro', 'しっかり管理を選ぶと保存される');
  ok((await p.textContent('.qh')).includes('前に使っていた'), '③前のデータ');
  await p.click('[data-ob-c="csv"]'); await p.click('[data-ob-next]'); await p.waitForTimeout(300);
  ok((await p.textContent('.sheet h3')).includes('取り込む'), 'CSVを選ぶとCSVの画面');
  await p.click('.sheet [data-skip]'); await p.waitForTimeout(300);
  ok((await p.textContent('.sheet h3')) === '毎月かかるお金は？', 'あとで → ④毎月かかるお金');
  await p.click('.sheet [data-later]'); await p.waitForTimeout(200);
  await E(() => { D.mode = 'easy'; save(); showBal = true; render(); });
  // 今月あと使えるお金（給料なし → 決めるボタン）
  ok(!!(await p.$('.lv-set')), '給料がないと「1か月に使っていいお金を決める」');
  await p.click('.lv-set'); await p.waitForTimeout(300);
  ok((await p.textContent('.sheet [data-note]')).includes('給料がまだ'), '自動のときは給料がないことを案内');
  await p.click('.sheet [data-m="fixed"]'); await p.fill('.sheet [data-amt]', '80,000');
  ok((await p.textContent('.sheet [data-calc]')).includes('¥80,000'), '計算がすぐ出る');
  await p.screenshot({ path: OUT + '/spend.png' });
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  await p.click('[data-act="pad-quick"][data-v="1000"]'); await p.click('[data-act="pad-cat"][data-cat="food"]'); await p.waitForTimeout(150);
  ok((await p.textContent('.lv .v span')) === '¥79,000', 'あと ¥79,000');
  const daysLeft = await E(() => dim(ymOf(today())) - Number(today().slice(8)) + 1);
  ok((await p.textContent('.lv .v small')).includes(`¥${Math.floor(79000 / daysLeft).toLocaleString()}`), '1日あたり');
  await p.screenshot({ path: OUT + '/home.png' });
  // その月だけ変える
  await p.click('[data-act="spend-set"] >> nth=0'); await p.waitForTimeout(300);
  await p.fill('.sheet [data-amt]', '100000'); await p.click('.sheet [data-sc="month"]'); await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  ok(await E(() => [D.spend.amount, D.spend.months[ymOf(today())], monthPlan().left].join()) === '80000,100000,99000', 'その月だけ10万にできる（毎月は8万のまま）');
  ok(await E(() => monthPlan(addMonths(ymOf(today()), 1)).budget) === 80000, '来月は8万');
  // 自動：給料・毎月の支払い・貯金目標
  await E(() => {
    const ym = ymOf(today()), d = n => `${ym}-${String(n).padStart(2, '0')}`;
    D.spend.mode = 'auto';
    D.rec.push({ id: 'sal', name: '給料', kind: 'income', day: 28, amount: 250000, start: d(1), skip: [] }, { id: 'rent', name: '家賃', kind: 'expense', day: 27, amount: 70000, start: d(1), skip: [] });
    D.goal = { amount: usable() + 300000, ym: addMonths(ym, 5) }; save(); render();
  });
  const pl = await E(() => monthPlan());
  ok(pl.inc === 250000 && pl.out === 70000 && pl.save === 50000 && pl.left === 250000 - 70000 - 50000 - 1000, `自動：給料−家賃−貯金(目標から)−使った（${pl.left}）`);
  // ざっくりでは、しっかり用のものは隠れる
  await p.click('#tabbar [data-view="settings"]');
  ok(!(await p.$('[data-act="pm-add"]')) && !(await p.$('[data-act="acc-add"]')) && !(await p.$('[data-act="quick-set"]')), 'ざっくり：支払い方法・口座・よく使う金額は出ない');
  await p.screenshot({ path: OUT + '/set_easy.png' });
  await p.click('[data-act="mode"][data-m="pro"]');
  ok(!!(await p.$('[data-act="pm-add"]')) && !!(await p.$('[data-act="acc-add"]')), 'しっかり：出てくる');
  // PayPay（すぐ減る）
  await p.click('[data-act="pm-add"]'); await p.fill('.sheet [data-name]', 'PayPay'); await p.click('.sheet [data-t="instant"]');
  ok(await p.$eval('.sheet [data-card]', e => e.hidden) && !(await p.$eval('.sheet [data-instant]', e => e.hidden)), 'PayPayは締め日を出さず、例を出す');
  await p.screenshot({ path: OUT + '/paypay.png' });
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  // カードを既存の予定とつなぐ（名前が違っても）
  await E(() => { const ym = ymOf(today()); D.rec.push({ id: 'smbc', name: '三井住友', kind: 'expense', day: 26, amount: 0, start: `${ym}-01`, skip: [] }); D.tx.push({ id: 'st', date: `${addMonths(ym, 1)}-26`, kind: 'expense', amount: 54741, rec: 'smbc', ym: addMonths(ym, 1), name: '三井住友' }); save(); render(); });
  await p.click('[data-act="pm-add"]'); await p.fill('.sheet [data-name]', '三井住友カード'); await p.waitForTimeout(100);
  ok(await p.$eval('.sheet [data-link="smbc"]', e => e.classList.contains('on')), '名前が似ている予定を自動で選ぶ');
  await p.screenshot({ path: OUT + '/link.png' });
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  ok(await E(() => D.rec.filter(r => r.name.includes('三井住友')).length === 1 && D.rec.find(r => r.id === 'smbc').pm), '新しい予定は作らず、既存の予定とつながる');
  ok(await E(() => cardOutstanding()) === 54741, '入れてあった引き落とし額がカードの引き落とし待ちになる（0にならない）');
  // CSV：マネーフォワード（Shift_JIS）
  const before = await E(() => [balance(), D.tx.length]);
  await p.click('[data-act="csv"]');
  await p.setInputFiles('.sheet [data-file]', __dirname + '/csv/mf.csv'); await p.waitForTimeout(500);
  ok((await p.textContent('.sheet .okbadge')).includes('マネーフォワード'), 'MFを自動で見分ける（Shift_JIS）');
  const sum = await p.textContent('.sheet .csv-sum');
  ok(sum.includes('支出6件') && sum.includes('¥11,830') && sum.includes('収入1件') && sum.includes('振替など 2件'), 'MF：件数・合計・振替と計算対象外を除く ' + sum.replace(/\s+/g, ' '));
  const map = await p.$$eval('.sheet .mr', e => e.map(x => x.querySelector('span').childNodes[0].textContent + '→' + x.querySelector('select').value).join(', '));
  ok(/衣服→shop/.test(map) && /食費 \/ コンビニ→conv/.test(map) && /食費 \/ 外食→food/.test(map) && /食費 \/ カフェ→cafe/.test(map) && /日用品 \/ ドラッグストア→daily/.test(map) && /交通費 \/ 電車→trans/.test(map), 'カテゴリを自動で当てはめ ' + map);
  await p.screenshot({ path: OUT + '/csv_mf.png' });
  await p.click('.sheet [data-go]'); await p.waitForTimeout(300);
  const after = await E(() => [balance(), D.tx.length, D.created]);
  ok(after[0] === before[0] && after[1] === before[1] + 7, `残高は変わらず、7件増える（${after.join()}）`);
  ok(after[2] <= '2026-09-03', '使い始めの日が過去にさかのぼる（予測がすぐ使える）');
  ok(await E(() => monthStats('2026-09').spent) >= 4840, '過去の月の集計に入る');
  // 同じファイルをもう一度 → 取り込み済み
  await p.click('[data-act="csv"]'); await p.setInputFiles('.sheet [data-file]', __dirname + '/csv/mf.csv'); await p.waitForTimeout(500);
  ok((await p.textContent('.sheet [data-go]')).startsWith('0件') && (await p.textContent('.sheet .csv-sum')).includes('もう取り込み済み7件'), '同じものは二重に取り込まない');
  await E(() => closeSheet());
  // Zaim（UTF-8・BOM）
  await p.click('[data-act="csv"]'); await p.setInputFiles('.sheet [data-file]', __dirname + '/csv/zaim.csv'); await p.waitForTimeout(500);
  const zs = await p.textContent('.sheet .csv-sum');
  ok((await p.textContent('.sheet .okbadge')).includes('Zaim') && zs.includes('支出3件') && zs.includes('¥4,980') && zs.includes('収入1件') && zs.includes('振替など 1件'), 'Zaim：自動で見分けて振替を除く ' + zs.replace(/\s+/g, ' '));
  await p.click('.sheet [data-go]'); await p.waitForTimeout(300);
  // 知らない形式 → 列を選ぶ
  await p.click('[data-act="csv"]'); await p.setInputFiles('.sheet [data-file]', __dirname + '/csv/other.csv'); await p.waitForTimeout(500);
  ok((await p.textContent('.sheet .lead')).includes('知らない形式'), '知らない形式は列を選ぶ画面');
  ok(await E(() => ['date', 'amount', 'memo', 'cat'].map(k => document.querySelector(`.sheet [data-c="${k}"]`).value).join()) === '0,2,1,3', '列名から自動で当たりをつける');
  await p.screenshot({ path: OUT + '/csv_map.png' });
  await p.click('.sheet [data-next]'); await p.waitForTimeout(300);
  const os = await p.textContent('.sheet .csv-sum');
  ok(os.includes('支出3件') && os.includes('¥3,290') && os.includes('収入1件'), 'マイナスが支出で読める ' + os.replace(/\s+/g, ' '));
  await p.click('.sheet [data-go]'); await p.waitForTimeout(300);
  ok(await E(() => !!Object.keys(D.csvFmt || {}).length), '形式を覚える');
  // 取り消し
  const n0 = await E(() => D.tx.length), b0 = await E(() => balance());
  await p.click('[data-act="csv"]'); await E(() => closeSheet());
  ok(await E(() => balance()) === b0, '何度取り込んでも残高は同じ');
  // カレンダーの言葉・貯金目標
  await E(() => { D.tx.push({ id: 'fut', date: addDays(today(), 1) > `${ymOf(today())}-${dim(ymOf(today()))}` ? today() : addDays(today(), 1), kind: 'expense', amount: 5000, plan: true }); save(); });
  await p.click('#tabbar [data-view="calendar"]');
  const cal = await p.textContent('.cal');
  ok(!/予/.test(cal.replace('入る・引落＝これからの予定', '')) && /引落|入る/.test(cal), 'カレンダーは「入る」「引落」');
  await p.click('#tabbar [data-view="future"]');
  ok(!!(await p.$('.gbig')) && !(await p.$('.chartcard')), '貯金目標はシンプル（グラフは閉じている）');
  await p.screenshot({ path: OUT + '/goal.png' });
  await p.click('[data-act="fut-open"]'); ok(!!(await p.$('.chartcard')), '▼でグラフが開く');
  await b.close();
})();
