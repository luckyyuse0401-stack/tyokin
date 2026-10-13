const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { setup, cap } = require('./common.js');
(async () => {
  const b = await chromium.launch();
  const { p } = await setup(b);
  const fr = () => p.frames().find(x => x !== p.mainFrame());
  const click = sel => fr().$eval(sel, e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const shot = async (n, html, prep) => {
    if (prep) await prep();
    await p.evaluate(h => { const c = document.getElementById('cap'); c.innerHTML = h; c.classList.remove('hide'); document.getElementById('end').classList.remove('on'); }, html);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(700);
    await p.screenshot({ path: `${__dirname}/still-${n}.png` });
  };
  await shot(1, `<div class="kick">ズボラ専用</div><div class="h">家計簿が続かない<br>人のための<em>お金アプリ</em></div><div class="sub">ログインなし・タップだけ</div>`,
    null);
  await shot(2, `<div class="kick">ここが推し①</div><div class="h">金額は<em>2タップ</em></div><div class="sub">2,500円なら「2千」→「500」。<br>キーボードは使いません。</div>`,
    async () => { await click('[data-act="pad-hi"][data-n="2"]'); await click('[data-act="pad-lo"][data-n="5"]'); });
  await shot(3, `<div class="kick">ここが推し②</div><div class="h">何に使ったかは<br><em>絵をタップ</em>するだけ</div>`,
    async () => { await fr().evaluate(() => document.querySelector('.pad-cats').scrollIntoView({ block: 'center' })); });
  await shot(4, `<div class="kick">クレカ派にも</div><div class="h">引き落とし日と<br>金額が<em>ひと目で</em></div><div class="sub">当日になったら自動で残高から引かれます</div>`,
    async () => { await click('[data-act="pad-clear"]').catch(() => {}); await fr().evaluate(() => scrollTo(0, 0)); await click('#tabbar [data-view="calendar"]'); await click('[data-act="day"][data-date="2026-10-27"]'); await fr().evaluate(() => scrollTo(0, 230)); });
  await shot(5, `<div class="kick">貯金目標</div><div class="h">いつ<em>いくら</em>貯まるか<br>勝手に計算</div><div class="sub">節約のヒントも1つだけ教えてくれる</div>`,
    async () => { await click('#tabbar [data-view="future"]'); await click('rect[data-act="fut-month"][data-ym="2027-04"]'); await fr().evaluate(() => scrollTo(0, 0)); });
  // 6: エンド（質問）
  await p.evaluate(() => { const e = document.getElementById('end'); e.innerHTML = '<div class="w">ZUBO<i></i></div><p>ズボラのための、お金の手帳</p><div class="cta">これ、使ってみたい？<br>欲しい機能をコメントで</div>'; e.classList.add('on'); });
  await p.waitForTimeout(700); await p.screenshot({ path: `${__dirname}/still-6.png` });
  await b.close();
})();
