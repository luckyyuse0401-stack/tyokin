// スタンプ・アプリの色・予算・毎年の支払い のテスト
const { chromium, devices } = require('/opt/node-tools/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'OK  ' : 'NG  ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); await require('./fontroute.js')(c);
  await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  const p = await c.newPage(); const E = (f, a) => p.evaluate(f, a);
  p.on('pageerror', e => ok(false, 'pageerror ' + e.message));
  await p.goto('http://localhost:8765/');
  await p.fill('[data-name]', '自分'); await p.fill('[data-bal]', '200000'); await p.click('[data-start]'); await p.click('[data-ob-next]'); await p.click('[data-ob-next]'); await p.waitForTimeout(400);
  await p.click('.sheet [data-later]'); await p.waitForTimeout(200);
  await p.evaluate(() => { D.mode = 'pro'; save(); render(); });
  // 使い始めを10日前にして、何日か支出を入れる
  await E(() => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    D.created = d(10); D.tx.push({ id: 'a', date: d(3), kind: 'expense', amount: 500, cat: 'conv' }, { id: 'b', date: d(5), kind: 'expense', amount: 800, cat: 'cafe' }); save(); render();
  });
  ok(await E(() => D.theme) === 'lime' && await E(() => D.stamp) === 'zero', '最初はライム・0円スタンプ');
  await p.click('#tabbar [data-view="calendar"]');
  const stamps = () => p.$$eval('.cal .d .stamp', e => e.map(x => x.closest('.d').dataset.date));
  const st = await stamps();
  const exp = await E(() => { const t = today(), out = []; for (const el of document.querySelectorAll('.cal .d[data-date]')) { const d = el.dataset.date; if (d < t && d >= D.created && !D.tx.some(x => x.date === d)) out.push(d); } return out; });
  ok(st.join() === exp.join() && st.length > 0, `使わなかった日だけにスタンプ（${st.length}日）`);
  ok(!(await p.$('.nm-card')), '上に「お金を使わなかった日」は出ない');
  // 設定で色とスタンプを変える
  await p.click('#tabbar [data-view="settings"]'); await p.click('[data-act="look-set"]');
  await p.click('.sheet [data-th="sakura"]');
  ok(await E(() => getComputedStyle(document.documentElement).getPropertyValue('--lime').trim()) === '#FF9EBB', '色を選ぶとすぐ変わる');
  await p.click('.sheet [data-st="heart"]');
  await p.screenshot({ path: process.argv[2] + '/look.png' });
  await p.click('.sheet [data-ok]');
  await p.reload(); await p.waitForTimeout(800);
  ok(await E(() => D.theme + ',' + D.stamp) === 'sakura,heart', '開き直しても残る');
  ok(await E(() => getComputedStyle(document.documentElement).getPropertyValue('--lime').trim()) === '#FF9EBB', '開き直しても色が当たっている');
  ok(await E(() => document.querySelector('.pad-cats .ill path[style]')?.getAttribute('style')) === 'fill:var(--lime)', 'カテゴリの絵も色に合わせて変わる');
  await p.click('#tabbar [data-view="calendar"]');
  ok((await p.$$eval('.cal .d .stamp path', e => e.length)) > 0, 'ハートのスタンプ');
  await p.screenshot({ path: process.argv[2] + '/cal.png' });
  await E(() => { D.stamp = 'none'; render(); });
  ok((await stamps()).length === 0, '「なし」でスタンプが消える');
  await E(() => { D.stamp = 'heart'; save(); render(); });
  // 予算
  await p.click('[data-act="cal-mode"][data-m="sum"]');
  await p.click('[data-act="budget-set"]');
  await p.fill('.sheet [data-b="cafe"]', '1,000'); await p.fill('.sheet [data-b="food"]', '20000');
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  ok(await E(() => D.budget.cafe === 1000 && D.budget.food === 20000 && Object.keys(D.budget).length === 2), '予算を保存');
  const bud = await p.$$eval('.cr', e => e.map(x => x.dataset.k + ':' + (x.querySelector('.bud')?.textContent || '')));
  ok(bud.some(t => t.startsWith('cafe:予算 ¥1,000') && t.includes('あと ¥200')), 'カフェ あと¥200 ' + bud.join(' | '));
  ok(bud.some(t => t.startsWith('food:予算 ¥20,000')), '0円でも予算のあるカテゴリは出る');
  ok(await p.$eval('.cr[data-k="cafe"] .bar', e => e.className.includes('near')), '8割超えでオレンジ');
  await p.screenshot({ path: process.argv[2] + '/budget.png' });
  await p.click('#tabbar [data-view="home"]');
  await p.click('[data-act="pad-quick"][data-v="500"]'); await p.click('[data-act="pad-cat"][data-cat="cafe"]');
  ok((await p.$eval('#toast-root', e => e.textContent)).includes('予算を¥300オーバー'), '登録時にオーバーをお知らせ');
  await p.click('#tabbar [data-view="calendar"]');
  ok(await p.$eval('.cr[data-k="cafe"] .bud', e => e.textContent.includes('¥300 オーバー')), 'まとめでも赤でオーバー');
  // 毎年の支払い
  const nextYm = await E(() => addMonths(ymOf(today()), 2));
  await p.click('#tabbar [data-view="settings"]'); await p.click('[data-act="rec-add"]');
  ok(await p.$eval('.sheet [data-mon-wrap]', e => getComputedStyle(e).display === 'none'), '毎月のときは「月」が出ない');
  await p.click('.sheet [data-f="year"]');
  await p.fill('.sheet [data-name]', '自動車税'); await p.fill('.sheet [data-mon]', String(Number(nextYm.slice(5)))); await p.fill('.sheet [data-day]', '20'); await p.fill('.sheet [data-amt]', '30500');
  await p.screenshot({ path: process.argv[2] + '/yearly.png' });
  await p.click('.sheet [data-save]'); await p.waitForTimeout(200);
  const r = await E(() => D.rec.find(x => x.name === '自動車税'));
  ok(r && r.freq === 'year' && r.month === Number(nextYm.slice(5)) && r.day === 20, '毎年の予定を保存');
  ok((await p.textContent('.menu')).length > 0 && (await p.$$eval('.menu .l small', e => e.map(x => x.textContent))).some(t => t === `毎年${Number(nextYm.slice(5))}月20日`), '設定に「毎年◯月◯日」');
  const months = await E(ym => [0, 1, 2, 3, 4].map(i => addMonths(ymOf(today()), i)).map(m => m + ':' + virtuals(m).filter(v => v.name === '自動車税').length + ':' + Object.keys(ringsOf(m)).length), nextYm);
  ok(months.join() === months.map(m => { const [ym, n] = m.split(':'); return m; }).join() && months.filter(m => m.split(':')[1] === '1').map(m => m.split(':')[0]).join() === nextYm, '指定した月だけに予定が出る ' + months.join(' '));
  const st2 = await E(ym => monthStats(ym), nextYm);
  ok(st2.spent === 0, '月の「使ったお金」には入らない');
  const fc = await E(ym => { const f = forecast(6); const a = f.find(x => x.ym === addMonths(ym, -1)), z = f.find(x => x.ym === ym); return a && z ? a.v - z.v : null; }, nextYm);
  ok(fc !== null && fc >= 30500, '貯金目標の予測にも入る（その月 −' + fc + '）');
  // 当日になったら記録になる（1年後には再び）
  await E(ym => { const r = D.rec.find(x => x.name === '自動車税'); r.start = addMonths(ym, -13) + '-01'; processedOn = ''; processRecurring(); }, nextYm);
  const made = await E(() => D.tx.filter(x => x.rec && x.name === '自動車税').map(x => x.date));
  ok(made.length === 1 && made[0].endsWith('-20'), '過去の該当月だけ記録になる ' + made.join());
  await b.close();
})();
