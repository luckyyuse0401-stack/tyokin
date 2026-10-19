// 彼女目線の投稿：普通の画面録画に、TikTokの文字を乗せただけに見える作り
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { setup } = require('./common.js');
const s_all = require('fs').readFileSync(__filename, 'utf8').replace(/[\x00-\x7f]/g, '');
const H = 1920, SC = H / 844, W = Math.round(390 * SC);
const STAGE = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&display=block">
<style>
*{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1920px;overflow:hidden;background:#000;font-family:'Noto Sans JP',sans-serif}
#rec{position:absolute;left:${(1080 - W) / 2}px;top:0;width:390px;height:844px;transform:scale(${SC});transform-origin:top left;overflow:hidden;background:#F1F2F0}
#rec iframe{width:390px;height:844px;border:0;display:block}
.sb{position:absolute;left:0;right:0;top:0;height:50px;display:flex;justify-content:space-between;align-items:center;padding:0 30px 0 34px;font:600 16px -apple-system,'Noto Sans JP',sans-serif;color:#000;z-index:5;background:#F1F2F0}
.sb .r{display:flex;gap:6px;align-items:center}.bat{width:25px;height:12px;border:1.5px solid #000;border-radius:4px;position:relative;opacity:.9}.bat:after{content:"";position:absolute;left:1.5px;top:1.5px;bottom:1.5px;width:62%;background:#000;border-radius:1.5px}
.t{position:absolute;left:50%;top:470px;z-index:10;transform:translateX(-50%);width:max-content;display:flex;flex-direction:column;align-items:center;background:#FFE4EE;border-radius:40px;padding:30px 40px 34px;box-shadow:0 12px 34px rgba(0,0,0,.13);pointer-events:none;opacity:0;transition:opacity .18s}
.t.on{opacity:1}
.t span{font-family:'Noto Sans JP','Noto Color Emoji',sans-serif;font-weight:900;color:#1A1A1A;font-size:52px;line-height:1.36;letter-spacing:.01em;white-space:nowrap;opacity:0;transform:translateY(8px);transition:opacity .18s,transform .22s}
.t span.on{opacity:1;transform:none}
.t span.sub{font-size:40px;font-weight:700;color:#6B5560;margin-top:14px}
</style></head><body>
<div id="rec"><iframe id="f" src="/"></iframe><div class="sb"><span>21:47</span><span class="r"><b style="font-size:13px">5G</b><span class="bat"></span></span></div></div>
<div class="t" id="t"></div><div id="cap" hidden></div><div id="end" hidden></div><div id="phone" hidden></div><div id="tap" hidden></div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const T0 = Date.now();
  const { ctx, p } = await setup(b, { recordVideo: { dir: __dirname + '/raw6', size: { width: 1080, height: 1920 } } }, STAGE);
  await p.evaluate(() => { const ps = JSON.parse(localStorage.getItem('nokori:profiles')); ps[0].name = 'わたし'; localStorage.setItem('nokori:profiles', JSON.stringify(ps)); document.getElementById('f').contentWindow.location.reload(); });
  await p.waitForTimeout(1500);
  const fr = () => p.frames().find(x => x !== p.mainFrame());
  await fr().evaluate(() => { showBal = true; render(false); });
  await fr().addStyleTag({ content: `#app{padding-top:54px!important}.mini-balance{padding-top:54px!important}
    .ztap{position:fixed;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;background:rgba(120,120,120,.35);border:1.5px solid rgba(255,255,255,.7);z-index:999;pointer-events:none;transition:opacity .25s}` });
  const tap = async (sel, wait = 400) => {
    await fr().$eval(sel, e => e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    await p.waitForTimeout(150);
    await fr().$eval(sel, e => { const r = e.getBoundingClientRect(); const t = document.createElement('div'); t.className = 'ztap'; t.style.left = r.left + r.width / 2 + 'px'; t.style.top = r.top + r.height / 2 + 'px'; document.body.appendChild(t); setTimeout(() => t.style.opacity = 0, 180); setTimeout(() => t.remove(), 450); });
    await p.waitForTimeout(120);
    await fr().$eval(sel, e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForTimeout(wait);
  };
  // TikTokの「背景つき文字」っぽく、1行ずつポンと出す
  const say = async (lines, { y = 1260, gap = 260 } = {}) => {
    await p.evaluate(({ lines, y }) => { const t = document.getElementById('t'); t.className = 't on'; t.style.top = y + 'px'; t.innerHTML = lines.map(l => l.startsWith('~') ? `<span class="sub">${l.slice(1)}</span>` : `<span>${l}</span>`).join(''); }, { lines, y });
    for (let i = 0; i < lines.length; i++) { await p.evaluate(i => document.querySelectorAll('#t span')[i].classList.add('on'), i); await p.waitForTimeout(gap); }
  };
  await p.evaluate(t => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:-9999px;font-family:Noto Sans JP'; d.textContent = t; document.body.appendChild(d); }, s_all);
  await p.evaluate(() => document.fonts.ready);
  await say(['ズボラすぎる私のために🫠', '彼氏が家計簿アプリ作ってきた📱'], { y: 1290, gap: 1 });
  await p.waitForTimeout(1200);
  const start = (Date.now() - T0) / 1000;
  await p.waitForTimeout(2000);
  await say(['家計簿アプリ', '今まで5個消した女です🙋‍♀️'], { y: 1290 });
  await p.waitForTimeout(1800);
  await say(['なのにこれ', 'ポチポチで終わる👆'], { y: 112 });
  await p.waitForTimeout(300);
  await tap('[data-act="pad-hi"][data-n="1"]', 350);
  await tap('[data-act="pad-lo"][data-n="2"]', 400);
  await tap('[data-act="pad-cat"][data-cat="conv"]', 900);
  await say(['ランチ1,200円🍙', '~「1千」「200」「コンビニ」で終わり'], { y: 640 });
  await p.waitForTimeout(1900);
  await say(['レシート溜めなくていいの', '天才では？🥹'], { y: 640 });
  await p.waitForTimeout(1700);
  await say(['カードの引き落とし日も📅', '勝手に出てくる（助かる）'], { y: 112 });
  await tap('#tabbar [data-view="calendar"]', 700);
  await tap('[data-act="day"][data-date="2026-10-27"]', 1900);
  await tap('#tabbar [data-view="future"]', 400);
  await tap('rect[data-act="fut-month"][data-ym="2027-04"]', 500);
  const val = await fr().evaluate(() => Math.round(Number(document.querySelector('.pick b').textContent.replace(/[^\d]/g, '')) / 10000));
  await say(['このままだと', `来年の春には${val}万貯まるらしい💰`], { y: 1270 });
  await p.waitForTimeout(2200);
  await say(['彼氏、', '私の将来考えすぎでは？🤭'], { y: 1270 });
  await p.waitForTimeout(2000);
  await tap('#tabbar [data-view="home"]', 300);
  await say(['使ってみたい人いる？🙌', '彼氏に伝えとく💌'], { y: 1290 });
  await p.waitForTimeout(2800);
  const end = (Date.now() - T0) / 1000;
  const v = p.video(); await ctx.close(); await b.close();
  require('fs').writeFileSync(__dirname + '/times6.json', JSON.stringify({ start, end, path: await v.path() }));
  console.log(start, end, val);
})();
