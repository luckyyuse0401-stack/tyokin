const { chromium } = require('/opt/node-tools/node_modules/playwright');
const W = 1080, H = 1920;
const R = s => s.replace(/(‼️|⁉️|!!|⁉︎|!\?)/g, m => `<i>${m}</i>`);
const css = `*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#FBEAF0;font-family:'M PLUS Rounded 1c','Noto Color Emoji',sans-serif;color:#141414;font-weight:900}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px}
.s{font-size:54px;margin-bottom:34px;letter-spacing:.02em}
.b{font-size:96px;line-height:1.3;letter-spacing:.01em;white-space:nowrap}
.m{font-size:66px;line-height:1.45}
.n{font-size:46px;line-height:1.55}
.g{color:#555;font-weight:800;font-size:44px;line-height:1.6;margin-top:40px}
i{font-style:normal;color:#E5302B;letter-spacing:-.06em}
.top{position:absolute;left:0;right:0;top:230px;text-align:center;font-size:56px;line-height:1.45;padding:0 60px}
.shot{position:absolute;left:50%;transform:translateX(-50%);border-radius:44px;overflow:hidden;box-shadow:0 12px 40px rgba(150,60,90,.18)}
.shot img{display:block;width:100%}
.card{background:#fff;border-radius:36px;box-shadow:0 10px 34px rgba(150,60,90,.12);display:flex;align-items:center;gap:40px;padding:40px 48px;width:880px;text-align:left;margin-bottom:70px}
.card img{width:200px;height:200px;border-radius:46px;box-shadow:0 0 0 2px #eee}
.card .t{font-size:52px}.card .d{font-size:30px;color:#888;font-weight:500;margin-top:8px}
.pill{display:inline-block;margin-top:26px;background:#2D7BF6;color:#fff;font-size:34px;font-weight:700;border-radius:999px;padding:10px 40px}`;
const shot = (f, top, w, crop) => `<div class="shot" style="top:${top}px;width:${w}px;height:${crop[1] * w / 390}px"><img src="lv/${f}" style="margin-top:${-crop[0] * w / 390}px"></div>`;
const S = [
  `<div class="c"><div class="s">＼ズボラ女子のみなさん／</div><div class="b">家計簿<br>続く${R('⁉︎')}続かない${R('⁉︎')}</div></div>`,
  `<div class="c"><div class="m" style="font-size:72px">私は<br>家計簿 秒で消す派です${R('‼️‼️')}</div><div class="g">家計簿アプリ、今まで5個消しました🫠<br>レシートはお財布でくしゃくしゃ…</div></div>`,
  `<div class="c"><div class="b" style="font-size:84px">そんな私を見て<br>彼氏が動きました${R('‼️')}💡</div></div>`,
  `<div class="c"><div class="m" style="font-size:74px;white-space:nowrap">「ボタン押すだけの家計簿」</div><div class="m" style="margin-top:20px">あったら良くない${R('⁉︎⁉︎⁉︎')}</div></div>`,
  `<div class="c"><div class="m" style="font-size:58px">ってことで、</div><div class="b" style="font-size:82px;margin-top:10px">作ってもらいました${R('‼️‼️')}</div><div style="font-size:90px;margin-top:10px">➡️</div></div>`,
  `<div class="top">金額とカテゴリを<br>ポチポチするだけで記録おわり👆</div>${shot('home.png', 480, 640, [0, 760])}`,
  `<div class="top">いつまでにいくら貯まるかも出る💰<br><span style="font-size:42px">（来年の春には107万らしい…${R('!!')}）</span></div>${shot('fut.png', 480, 640, [0, 760])}`,
  `<div class="c"><div class="card"><img src="lv/icon.png"><div><div class="t">ZUBO（ズボ）</div><div class="d">私の彼氏が作ってる途中</div><div class="pill">開発中🔧</div></div></div>
   <div class="n">私専用だったけど<br>まだリリース前だから<br>みんなと一緒に育てたい${R('‼️')}<br><br>ほしい機能・ここ使いにくそう<br>コメントで教えてね💕<br>ぜんぶ彼氏に伝えます✍️</div></div>`,
];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await require('./fontroute.js')(ctx);
  const pg = await ctx.newPage();
  for (let i = 0; i < S.length; i++) {
    require('fs').writeFileSync(__dirname + '/_lv.html', `<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&display=block"><style>${css}</style></head><body>${S[i]}</body></html>`);
    await pg.goto('file://' + __dirname + '/_lv.html');
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400);
    await pg.screenshot({ path: __dirname + `/lv/s${i + 1}.png` });
  }
  await b.close();
})();
