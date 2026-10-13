// TikTok 用（1080x1920）のステージ：上に見出し、中央にスマホ、その中に本物のアプリ（iframe）
const STAGE = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=block">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#F1F2F0;font-family:'Noto Sans JP',sans-serif;color:#16181C}
.bg{position:absolute;inset:0;background:radial-gradient(900px 700px at 85% 8%,rgba(184,242,58,.55),transparent 60%),radial-gradient(800px 700px at 0% 100%,rgba(184,242,58,.28),transparent 60%),#F1F2F0}
.cap{position:absolute;left:80px;right:150px;top:150px;transition:opacity .35s,transform .35s}
.cap.hide{opacity:0;transform:translateY(20px)}
.kick{display:inline-block;background:#16181C;color:#B8F23A;font-weight:900;font-size:34px;padding:8px 22px;border-radius:999px;margin-bottom:22px}
.h{font-weight:900;font-size:84px;line-height:1.18;letter-spacing:-.01em}
.h em{font-style:normal;background:linear-gradient(transparent 58%,#B8F23A 58%)}
.sub{font-weight:700;font-size:36px;color:#55595F;margin-top:18px;line-height:1.45}
.phone{position:absolute;left:50%;top:560px;width:390px;height:844px;transform:translateX(-50%) scale(1.62);transform-origin:top center;border-radius:54px;box-shadow:0 0 0 12px #16181C,0 30px 60px rgba(0,0,0,.25);overflow:hidden;background:#F1F2F0;transition:top .5s}
.phone iframe{width:390px;height:844px;border:0;display:block}
.tap{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(22,24,28,.28);border:3px solid rgba(255,255,255,.9);pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;z-index:9}
.tap.on{opacity:1;transform:scale(.8)}
.logo{position:absolute;left:80px;top:72px;font-weight:900;font-size:40px;letter-spacing:-.02em;display:flex;align-items:flex-end;gap:4px}
.logo i{width:12px;height:12px;border-radius:50%;background:#B8F23A;box-shadow:0 0 0 2px #16181C;margin-bottom:8px}
.end{position:absolute;inset:0;background:#16181C;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .5s;text-align:center}
.end.on{opacity:1}
.end .w{font-weight:900;font-size:150px;letter-spacing:-.03em;display:flex;align-items:flex-end}
.end .w i{width:40px;height:40px;border-radius:50%;background:#B8F23A;margin:0 0 30px 10px}
.end p{font-size:44px;font-weight:700;color:#C9CCD1;margin-top:20px}
.end .cta{margin-top:90px;background:#B8F23A;color:#16181C;font-weight:900;font-size:52px;padding:28px 56px;border-radius:999px;line-height:1.35}
</style></head><body><div class="bg"></div><div class="logo">ZUBO<i></i></div>
<div class="cap" id="cap"></div>
<div class="phone" id="phone"><iframe id="f" src="/"></iframe><div class="tap" id="tap"></div></div>
<div class="end" id="end"></div></body></html>`;

async function seed(p) {
  // ステージと同じオリジンなので、アプリのデータを直接入れておく
  await p.evaluate(() => {
    localStorage.clear();
    const id = 'demo', pad = n => String(n).padStart(2, '0');
    const tx = []; let seed = 11; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const cats = ['food', 'conv', 'cafe', 'drink', 'shop', 'date', 'daily'];
    for (let d = new Date(2026, 6, 1); d <= new Date(2026, 9, 12); d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (r() < .7) tx.push({ id: 'x' + tx.length, date: ds, kind: 'expense', amount: 400 + Math.round(r() * 20) * 100, cat: cats[Math.floor(r() * cats.length)] });
    }
    for (const [ym, a] of [['2026-07', 38000], ['2026-08', 41000], ['2026-09', 36000]]) tx.push({ id: 'c' + ym, date: ym + '-27', kind: 'expense', amount: a, rec: 'card', ym, name: '楽天カード' });
    for (const ym of ['2026-07', '2026-08', '2026-09']) tx.push({ id: 's' + ym, date: ym + '-25', kind: 'income', amount: 230000, rec: 'sal', ym, name: '給料' });
    for (const ym of ['2026-07', '2026-08', '2026-09']) tx.push({ id: 'h' + ym, date: ym + '-27', kind: 'expense', amount: 72000, rec: 'rent', ym, name: '家賃' });
    const data = { v: 1, base: 180000, created: '2026-07-01', tx, goal: { amount: 1000000, ym: '2027-06' },
      rec: [{ id: 'sal', name: '給料', kind: 'income', day: 25, amount: 230000, start: '2026-07-01', skip: [] },
            { id: 'card', name: '楽天カード', kind: 'expense', day: 27, amount: 0, start: '2026-07-01', skip: [] },
            { id: 'rent', name: '家賃', kind: 'expense', day: 27, amount: 72000, start: '2026-07-01', skip: [] }] };
    data.tx.push({ id: 'c10', date: '2026-10-27', kind: 'expense', amount: 42000, rec: 'card', ym: '2026-10', name: '楽天カード' });
    localStorage.setItem('nokori:profiles', JSON.stringify([{ id, name: 'ずぼら', pin: null }]));
    localStorage.setItem('nokori:last', JSON.stringify(id));
    localStorage.setItem(`nokori:data:${id}`, JSON.stringify(data));
  });
}

async function setup(b, opts = {}, stage = STAGE) {
  const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, ...opts });
  await require('./fontroute.js')(ctx);
  await ctx.route(/localhost:8765\/__stage$/, r => r.fulfill({ contentType: 'text/html', body: stage }));
  await ctx.route(/localhost:8765\/$/, async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;800;900&display=block"><style>body{font-family:"Noto Sans JP",sans-serif}</style></head>') }); });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8765/__stage');
  await seed(p);
  await p.evaluate(() => document.getElementById('f').contentWindow.location.reload());
  await p.waitForTimeout(1500);
  // 宣伝用なので残高は最初から表示しておく
  await p.frames().find(x => x !== p.mainFrame()).evaluate(() => { showBal = true; render(false); });
  const f = p.frameLocator('#f');
  const fr = p.frames().find(x => x !== p.mainFrame());
  return { ctx, p, f, fr: () => p.frames().find(x => x !== p.mainFrame()) };
}
const cap = (p, html) => p.evaluate(h => { const c = document.getElementById('cap'); c.classList.add('hide'); setTimeout(() => { c.innerHTML = h; c.classList.remove('hide'); }, 250); }, html);
// アプリ内の要素の位置に「タップ」の丸を出してからクリック
async function tap(p, sel, { wait = 450 } = {}) {
  const fr = p.frames().find(x => x !== p.mainFrame());
  const el = await fr.$(sel); await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox(); // ページ座標（拡大後）
  await p.evaluate(({ x, y }) => { const t = document.getElementById('tap'); const ph = document.getElementById('phone').getBoundingClientRect(); const s = ph.width / 390;
    t.style.left = (x - ph.left) / s + 'px'; t.style.top = (y - ph.top) / s + 'px'; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 260); },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await p.waitForTimeout(160);
  await el.evaluate(e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.waitForTimeout(wait);
}
module.exports = { setup, cap, tap };
module.exports.capNow = (p, html) => p.evaluate(h => { const c = document.getElementById('cap'); c.classList.remove('hide'); c.innerHTML = h; }, html);
