// 製作者アカウント用：アップル風 約15秒
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const FPS = 30, DUR = 15.5, ONLY = process.argv[2];
const pos = JSON.parse(fs.readFileSync(__dirname + '/cm/pos.json'));
const SW = 400, SH = Math.round(SW * 844 / 390), K = SW / 390;
// 上の文字（時間・大・小）
const BEATS = [
  [0.0, 2.3, '家計簿、<br><em>続いた</em>ことある？', ''],
  [2.5, 4.9, 'よく使う金額は、<br><em>ワンタップ。</em>', '端数はテンキーで。'],
  [4.9, 7.3, '押したら、<br><em>記録おわり。</em>', 'レシートも、電卓も、いらない。'],
  [7.3, 9.9, '家賃もカードも、<br><em>勝手に</em>引かれる。', '引き落とし日は、カレンダーに赤丸。'],
  [9.9, 12.4, 'いつ、いくら<br><em>貯まるか。</em>', 'このままなら、来年の春に<em>108万</em>。'],
];
const HTML = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=block">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#000;font-family:'Noto Sans JP',sans-serif;color:#fff}
#glow{position:absolute;left:540px;top:1022px;width:1500px;height:1500px;margin:-750px 0 0 -750px;border-radius:50%;background:radial-gradient(closest-side,rgba(184,242,58,.20),rgba(184,242,58,.05) 45%,transparent 70%)}
#scene{position:absolute;inset:0;perspective:2800px}
#phone{position:absolute;left:540px;top:1022px;width:${SW + 30}px;height:${SH + 30}px;margin:${-(SH + 30) / 2}px 0 0 ${-(SW + 30) / 2}px;transform-style:preserve-3d}
.body{position:absolute;inset:0;border-radius:80px;background:linear-gradient(140deg,#d8d9de 0%,#55565c 10%,#1c1d20 30%,#2b2c30 60%,#6a6b71 88%,#e6e7ec 100%);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35),inset 0 0 0 4px rgba(0,0,0,.6),0 70px 140px rgba(0,0,0,.75)}
.bezel{position:absolute;inset:7px;border-radius:73px;background:#030303}
.screen{position:absolute;left:15px;top:15px;width:${SW}px;height:${SH}px;border-radius:65px;overflow:hidden;background:#F1F2F0}
.screen img{position:absolute;inset:0;width:100%;height:100%;opacity:0}
.island{position:absolute;left:50%;top:${14 * K}px;width:${124 * K}px;height:${36 * K}px;margin-left:${-62 * K}px;border-radius:99px;background:#000;z-index:3}
.sb{position:absolute;left:0;right:0;top:${17 * K}px;display:flex;justify-content:space-between;padding:0 ${34 * K}px 0 ${44 * K}px;font:600 ${17 * K}px -apple-system,'Noto Sans JP',sans-serif;color:#000;z-index:2}
.sb i{display:inline-block;width:${27 * K}px;height:${13 * K}px;border:${1.5 * K}px solid #000;border-radius:${4 * K}px;position:relative;opacity:.85;vertical-align:middle}
.sb i:after{content:"";position:absolute;inset:${1.5 * K}px;right:${5 * K}px;background:#000;border-radius:${1.5 * K}px}
#sheen{position:absolute;inset:0;border-radius:65px;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.22) 47%,transparent 58%);background-size:300% 100%;z-index:4;pointer-events:none}
.tap{position:absolute;width:${56 * K}px;height:${56 * K}px;margin:${-28 * K}px 0 0 ${-28 * K}px;border-radius:50%;border:${2.5 * K}px solid rgba(255,255,255,.95);box-shadow:0 0 0 1px rgba(0,0,0,.08),0 0 18px rgba(255,255,255,.6);z-index:5;opacity:0}
.beat{position:absolute;left:40px;right:40px;top:255px;text-align:center;opacity:0}
.beat h1{font-weight:700;font-size:74px;line-height:1.28;letter-spacing:.02em}
.beat p{font-weight:500;font-size:36px;color:#9a9ca1;margin-top:20px;letter-spacing:.04em}
.beat.hook h1{font-size:92px;font-weight:900}
em{font-style:normal;color:#B8F23A}
#end{position:absolute;left:40px;right:40px;top:250px;height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;padding-bottom:0}
#end h1{font-weight:700;font-size:80px;line-height:1.35;letter-spacing:.02em}
#end span{display:inline-block}
#vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,transparent 55%,rgba(0,0,0,.6));pointer-events:none}
</style></head><body>
<div id="glow"></div>
<div id="scene"><div id="phone"><div class="body"></div><div class="bezel"></div>
  <div class="screen">${['a', 'b', 'c', 'd', 'e'].map(k => `<img id="${k}" src="cm/${k}.png">`).join('')}
  <div class="sb"><span>9:41</span><span><i></i></span></div><div class="island"></div>
  <div class="tap" id="tq" style="left:${pos.q[0] * K}px;top:${pos.q[1] * K}px"></div><div class="tap" id="tf" style="left:${pos.f[0] * K}px;top:${pos.f[1] * K}px"></div>
  <div id="sheen"></div></div></div></div>
${BEATS.map((b, i) => `<div class="beat ${i === 0 ? 'hook' : ''}" id="b${i}"><h1>${b[2]}</h1>${b[3] ? `<p>${b[3]}</p>` : ''}</div>`).join('')}
<div id="end"><h1>${[...'こんなアプリ、'].map(c => `<span>${c}</span>`).join('')}<br>${[...'あったら'].map(c => `<span>${c}</span>`).join('')}${[...'欲しい'].map(c => `<span><em>${c}</em></span>`).join('')}${[...'ですか？'].map(c => `<span>${c}</span>`).join('')}</h1></div>
<div id="vig"></div>
<script>
const BEATS = ${JSON.stringify(BEATS.map(b => [b[0], b[1]]))};
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const out = x => 1 - Math.pow(1 - cl(x), 3);
const seg = (t, a, b) => cl((t - a) / (b - a));
const $ = id => document.getElementById(id);
window.R = t => {
  // 文字：ぼかしから出て、ぼかして消える（最初の1枚は0秒から見えている）
  BEATS.forEach(([a, b], i) => {
    const inK = i === 0 ? 1 : out(seg(t, a, a + 0.45)), outK = ease(seg(t, b - 0.35, b));
    const k = inK * (1 - outK), e = $('b' + i);
    e.style.opacity = k; e.style.filter = 'blur(' + (12 * (1 - inK) + 10 * outK) + 'px)';
    e.style.transform = 'translateY(' + (20 * (1 - inK) - 14 * outK) + 'px) scale(' + (i === 0 ? 1.06 - 0.06 * out(seg(t, 0, 2.3)) : 1) + ')';
  });
  // iPhone：0.5秒から下から回り込み → 正面 → ゆっくり揺れ → 最後は奥へ
  const inP = out(seg(t, 0.5, 2.4)), front = ease(seg(t, 1.8, 3.0)), away = ease(seg(t, 12.2, 13.2));
  const drift = Math.sin(t * 0.55) * 4 * front, beat3 = Math.sin(seg(t, 7.3, 9.9) * Math.PI) * 9;
  const ry = -40 * (1 - inP) - 16 * (1 - front) + drift + beat3 + 25 * away;
  const rx = 16 * (1 - inP) + 4 * (1 - front) + 6 * away;
  const ty = 900 * (1 - inP) + 60 * away;
  const sc = (0.9 + 0.1 * inP) * (1 - 0.25 * away);
  $('phone').style.transform = 'translateY(' + ty + 'px) scale(' + sc + ') rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) rotateZ(' + (-7 * (1 - inP)) + 'deg)';
  $('phone').style.opacity = 1 - away;
  $('glow').style.opacity = (0.35 + 0.65 * inP) * (1 - away);
  // 画面切り替え
  const show = (id, at, d = 0.12) => $(id).style.opacity = cl((t - at) / d);
  $('a').style.opacity = 1; show('b', 3.35); show('c', 5.75); show('d', 7.75, 0.3); show('e', 10.3, 0.3);
  const tap = (id, at) => { const e = $(id), k = (t - at) / 0.45; e.style.opacity = k < 0 || k > 1 ? 0 : (k < .25 ? k / .25 : 1 - (k - .25) / .75); e.style.transform = 'scale(' + (0.7 + 0.5 * out(k)) + ')'; };
  tap('tq', 3.2); tap('tf', 5.6);
  $('sheen').style.backgroundPosition = (125 - 150 * ease(seg(t, 0.8, 2.8))) + '% 0';
  $('sheen').style.opacity = 1 - 0.8 * seg(t, 2.8, 3.2);
  // 最後：文字だけ
  const sp = [...document.querySelectorAll('#end span')];
  $('end').style.opacity = t > 13.0 ? 1 : 0;
  sp.forEach((s, i) => { const k = out(seg(t, 13.1 + i * 0.05, 13.65 + i * 0.05)); s.style.opacity = k; s.style.filter = 'blur(' + (12 * (1 - k)) + 'px)'; s.style.transform = 'translateY(' + (18 * (1 - k)) + 'px)'; });
};
</script></body></html>`;
(async () => {
  fs.writeFileSync(__dirname + '/_apple.html', HTML);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 } });
  await require('./fontroute.js')(ctx);
  const p = await ctx.newPage();
  await p.goto('file://' + __dirname + '/_apple.html');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const dir = __dirname + '/cm/f2'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const times = ONLY ? ONLY.split(',').map(Number) : [...Array(Math.round(DUR * FPS)).keys()].map(i => i / FPS);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate(t => R(t), times[i]);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
