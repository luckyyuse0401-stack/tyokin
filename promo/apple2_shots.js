// アップル風 第2弾（新機能：今月のまとめ・毎月かかるお金）の画面素材を撮る → cm2/
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { setup } = require('./common.js');
const STAGE = `<!doctype html><html><head><style>*{margin:0}html,body{width:390px;height:844px;overflow:hidden}iframe{width:390px;height:844px;border:0;display:block}</style></head><body><iframe id="f" src="/"></iframe></body></html>`;
const OUT = __dirname + '/cm2';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const { p } = await setup(b, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }, STAGE);
  await p.evaluate(() => { const ps = JSON.parse(localStorage.getItem('nokori:profiles')); ps[0].name = 'わたし';
    // 10月を今日まで埋めて、コンビニが先月より多めになるようにしておく
    const k = 'nokori:data:demo', d = JSON.parse(localStorage.getItem(k));
    [[13, 'conv', 680], [13, 'food', 1200], [14, 'conv', 540], [15, 'cafe', 650], [15, 'conv', 720], [16, 'conv', 460], [16, 'drink', 3800], [17, 'conv', 890], [17, 'shop', 2400], [18, 'conv', 610], [18, 'date', 4200], [19, 'conv', 530], [19, 'food', 980]].forEach(([dd, cat, amount], i) => d.tx.push({ id: 'o' + i, date: '2026-10-' + dd, kind: 'expense', amount, cat }));
    localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem('nokori:profiles', JSON.stringify(ps)); localStorage.setItem('nokori:hideInstallTip', 'true'); document.getElementById('f').contentWindow.location.reload(); });
  await p.waitForTimeout(1500);
  const fr = () => p.frames().find(x => x !== p.mainFrame());
  await fr().evaluate(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); showBal = true; render(false); });
  await fr().addStyleTag({ content: '#app{padding-top:54px!important}' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const pos = {};
  const box = async (k, s) => { pos[k] = await fr().$eval(s, e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); };
  const c = async (s, w = 500) => { await fr().$eval(s, e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(w); };
  const shot = k => p.screenshot({ path: `${OUT}/${k}.png` });
  // a: カレンダー（赤丸つき）
  await c('#tabbar [data-view="calendar"]', 600); await shot('a');
  // b: 今月のまとめ
  await box('s', '[data-act="cal-mode"][data-m="sum"]');
  await c('[data-act="cal-mode"][data-m="sum"]', 600); await shot('b');
  // c: いちばん上のカテゴリを開く
  await box('k', '.cr.top');
  await c('.cr.top', 600); await shot('c');
  // d: 毎月かかるお金（家賃は登録済み → 電気・スマホにチェック）
  await fr().evaluate(() => { calMode = 'cal'; sumOpen = null; go('settings'); openFixed(); }).catch(async () => { await c('#tabbar [data-view="settings"]'); await c('[data-act="fixed-set"]'); });
  await p.waitForTimeout(700);
  await fr().evaluate(() => document.activeElement?.blur());
  await shot('d');
  await box('e1', '.sheet .fr[data-f="1"] [data-tg]');
  await c('.sheet .fr[data-f="1"] [data-tg]', 300);
  await fr().evaluate(() => { document.activeElement?.blur(); const r = document.querySelector('.sheet .fr[data-f="1"]'); r.querySelector('[data-d]').value = '26'; });
  await box('e2', '.sheet .fr[data-f="4"] [data-tg]');
  await c('.sheet .fr[data-f="4"] [data-tg]', 300);
  await fr().evaluate(() => { document.activeElement?.blur(); const r = document.querySelector('.sheet .fr[data-f="4"]'); r.querySelector('[data-a]').value = '3,280'; r.querySelector('[data-d]').value = '26'; });
  await p.waitForTimeout(400); await shot('e');
  require('fs').writeFileSync(OUT + '/pos.json', JSON.stringify(pos));
  await b.close();
})();
