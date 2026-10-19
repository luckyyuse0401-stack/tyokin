const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { setup } = require('./common.js');
const STAGE = `<!doctype html><html><head><style>*{margin:0}html,body{width:390px;height:844px;overflow:hidden}iframe{width:390px;height:844px;border:0;display:block}</style></head><body><iframe id="f" src="/"></iframe></body></html>`;
(async () => {
  const b = await chromium.launch();
  const { p } = await setup(b, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 }, STAGE);
  await p.evaluate(() => { const ps = JSON.parse(localStorage.getItem('nokori:profiles')); ps[0].name = 'わたし'; localStorage.setItem('nokori:profiles', JSON.stringify(ps)); localStorage.setItem('nokori:hideInstallTip', 'true'); document.getElementById('f').contentWindow.location.reload(); });
  await p.waitForTimeout(1500);
  const fr = () => p.frames().find(x => x !== p.mainFrame());
  await fr().evaluate(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); showBal = true; render(false); });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const c = async (s, w = 500) => { await fr().$eval(s, e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(w); };
  await c('[data-act="pad-quick"][data-v="1500"]');
  await p.screenshot({ path: __dirname + '/lv/home.png' });
  await c('[data-act="pad-cat"][data-cat="food"]', 3500);
  await c('#tabbar [data-view="future"]'); await c('rect[data-act="fut-month"][data-ym="2027-04"]', 700);
  await fr().evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/lv/fut.png' });
  await b.close();
})();
