const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { setup } = require('./common.js');
const L = '#B8F23A';
const s_all = require('fs').readFileSync(__filename, 'utf8').replace(/[\x00-\x7f]/g, '');

// ---------- 背景（ぼかして写真っぽく見せるイラスト） ----------
const prod = (x, y, w, h, c, kind) => kind === 0
  ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${c}"/><rect x="${x}" y="${y + h * .35}" width="${w}" height="${h * .25}" fill="#fff" opacity=".55"/>`
  : `<rect x="${x + w * .3}" y="${y}" width="${w * .4}" height="${h * .18}" rx="6" fill="${c}"/><rect x="${x}" y="${y + h * .15}" width="${w}" height="${h * .85}" rx="${w * .3}" fill="${c}" opacity=".9"/><rect x="${x}" y="${y + h * .45}" width="${w}" height="${h * .2}" fill="#fff" opacity=".5"/>`;
const COLORS = ['#F25F5C', '#FFE066', '#247BA0', '#70C1B3', '#FF9F1C', '#9B5DE5', '#00BBF9', '#F15BB5', '#B8F23A', '#E0E0E0'];
let rnd = 3; const R = () => (rnd = (rnd * 9301 + 49297) % 233280) / 233280;
const SCENES = {
  conv: `<svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCE6EE"/></linearGradient></defs>
    <rect width="1080" height="1920" fill="url(#cw)"/>
    ${[0, 1, 2, 3].map(i => `<rect x="${60 + i * 260}" y="80" width="200" height="26" rx="13" fill="#fff" opacity=".95"/>`).join('')}
    ${[0, 1, 2, 3, 4, 5].map(r => { const y = 420 + r * 250; let out = `<rect x="-20" y="${y + 170}" width="1120" height="26" fill="#B9C6D2"/><rect x="-20" y="${y + 196}" width="1120" height="10" fill="#8FA0B0"/>`; let x = -10; while (x < 1080) { const w = 60 + R() * 80, h = 90 + R() * 70; out += prod(x, y + 170 - h, w, h, COLORS[Math.floor(R() * COLORS.length)], R() < .5 ? 0 : 1); x += w + 12; } return out; }).join('')}
  </svg>`,
  cafe: `<svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="fw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4E2"/><stop offset="1" stop-color="#E8D5BE"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9875E"/><stop offset="1" stop-color="#7E5636"/></linearGradient></defs>
    <rect width="1080" height="1920" fill="url(#fw)"/>
    <rect x="80" y="160" width="520" height="760" rx="18" fill="#FFFDF7"/><rect x="330" y="160" width="16" height="760" fill="#E3D2BC"/><rect x="80" y="520" width="520" height="16" fill="#E3D2BC"/>
    <g fill="#7FA36A"><ellipse cx="820" cy="760" rx="120" ry="160"/><ellipse cx="720" cy="820" rx="90" ry="120"/></g><rect x="740" y="880" width="150" height="160" rx="18" fill="#C9744E"/>
    <rect y="1380" width="1080" height="540" fill="url(#wood)"/><rect y="1370" width="1080" height="20" fill="#5E3E25" opacity=".6"/>
    <g transform="translate(120,1250)"><ellipse cx="90" cy="150" rx="120" ry="22" fill="#000" opacity=".15"/><rect width="180" height="150" rx="28" fill="#fff"/><path d="M180 40h26a38 38 0 0 1 0 76h-26" fill="none" stroke="#fff" stroke-width="22"/><ellipse cx="90" cy="6" rx="86" ry="14" fill="#6F4E37"/></g>
    <g transform="translate(820,1280)"><ellipse cx="60" cy="110" rx="90" ry="18" fill="#000" opacity=".15"/><rect width="120" height="110" rx="14" fill="#F5E6CC"/></g>
  </svg>`,
  room: `<svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="lamp" cx=".8" cy=".25" r=".6"><stop offset="0" stop-color="#FFE7B8"/><stop offset="1" stop-color="#E6E1DA"/></radialGradient></defs>
    <rect width="1080" height="1920" fill="url(#lamp)"/>
    <rect x="-40" y="1100" width="1160" height="500" rx="80" fill="#8FA3AD"/><rect x="-40" y="980" width="1160" height="220" rx="80" fill="#9FB3BD"/>
    <rect x="100" y="1020" width="240" height="190" rx="40" fill="#E9C46A"/><rect x="760" y="1030" width="220" height="180" rx="40" fill="#F4A261"/>
    <rect x="820" y="220" width="18" height="700" fill="#4A4A4A"/><path d="M730 220h200l-40-140h-120z" fill="#F7E3B5"/>
    <rect y="1560" width="1080" height="360" fill="#C8B8A6"/>
  </svg>`,
};

// ---------- 手（陰影つき）と袖 ----------
const SK1 = '#F4CDAE', SK2 = '#E2A985', SK3 = '#C98B67';
const DEFS = `<defs>
  <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${SK2}"/><stop offset=".45" stop-color="${SK1}"/><stop offset="1" stop-color="${SK2}"/></linearGradient>
  <radialGradient id="tip" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#F9DDC6"/><stop offset=".7" stop-color="${SK1}"/><stop offset="1" stop-color="${SK2}"/></radialGradient>
  <linearGradient id="nail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1E8"/><stop offset="1" stop-color="#F1C7B3"/></linearGradient>
  <linearGradient id="sleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3F47"/><stop offset="1" stop-color="#22262C"/></linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
const BACK = `<svg viewBox="0 0 390 844" overflow="visible">${DEFS}
  <ellipse cx="195" cy="860" rx="230" ry="60" fill="#000" opacity=".18" filter="url(#soft)"/>
  <path d="M-30 1250 C -50 1040 -30 900 20 820 C 50 780 100 770 160 772 L 300 772 C 360 780 410 820 430 900 C 450 990 440 1100 430 1250 Z" fill="url(#skin)"/>
  <path d="M20 820 C 60 850 120 858 170 852" fill="none" stroke="${SK3}" stroke-width="4" stroke-linecap="round" opacity=".35"/>
  <path d="M-60 1080 C 60 1050 330 1050 470 1080 L 480 1400 L -70 1400 Z" fill="url(#sleeve)"/>
  <path d="M-60 1080 C 60 1050 330 1050 470 1080" fill="none" stroke="#4B515A" stroke-width="10"/>
  ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<path d="M${-40 + i * 58} 1100 L ${-36 + i * 58} 1400" stroke="#2C3036" stroke-width="5" opacity=".6"/>`).join('')}
</svg>`;
const finger = (y, w) => `<g>
  <ellipse cx="${-8 + w / 2}" cy="${y + 34}" rx="${w / 2 + 6}" ry="30" fill="#000" opacity=".16" filter="url(#soft)"/>
  <path d="M-40 ${y} L ${w - 30} ${y} A 28 28 0 0 1 ${w - 30} ${y + 56} L -40 ${y + 56} Z" fill="url(#tip)"/>
  <path d="M${w - 44} ${y + 12} a 18 18 0 0 1 0 32" fill="none" stroke="${SK3}" stroke-width="2.5" opacity=".4"/>
  <ellipse cx="${w - 22}" cy="${y + 28}" rx="7" ry="16" fill="url(#nail)" opacity=".9"/></g>`;
const FRONT = `<svg viewBox="0 0 390 844" overflow="visible">${DEFS}
  ${finger(512, 54)}${finger(582, 58)}${finger(652, 56)}${finger(722, 46)}
  <ellipse cx="350" cy="760" rx="60" ry="80" fill="#000" opacity=".16" filter="url(#soft)" transform="rotate(-25 350 760)"/>
  <path d="M450 900 C 460 810 436 742 392 708 C 360 684 322 682 302 704 C 284 726 296 754 330 770 C 364 786 378 830 376 900 Z" fill="url(#skin)"/>
  <ellipse cx="320" cy="712" rx="18" ry="13" fill="url(#nail)" transform="rotate(-32 320 712)"/>
  <path d="M332 772 C 362 788 376 830 374 900" fill="none" stroke="${SK3}" stroke-width="3" opacity=".35"/>
</svg>`;

const STAGE = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=block">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#EDEDEA;font-family:'Noto Sans JP',sans-serif;color:#16181C}
.scene{position:absolute;inset:-60px;opacity:0;transform:scale(1.12);filter:blur(16px) saturate(1.05);transition:opacity 1.1s ease,transform 6s ease-out}
.scene.on{opacity:1;transform:scale(1.04)}
.scene svg{width:100%;height:100%;display:block}
.bokeh{position:absolute;inset:0;pointer-events:none;background:
 radial-gradient(70px 70px at 12% 30%,rgba(255,255,255,.45),transparent 70%),radial-gradient(110px 110px at 88% 44%,rgba(255,255,255,.35),transparent 70%),
 radial-gradient(60px 60px at 70% 18%,rgba(255,255,255,.4),transparent 70%),radial-gradient(90px 90px at 20% 78%,rgba(255,255,255,.25),transparent 70%)}
.vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 45%,transparent 55%,rgba(0,0,0,.18))}
.toplight{position:absolute;left:0;right:0;top:0;height:560px;background:linear-gradient(rgba(255,255,255,.92),rgba(255,255,255,.75) 70%,rgba(255,255,255,0));pointer-events:none}
.logo{position:absolute;left:80px;top:72px;font-weight:900;font-size:40px;letter-spacing:-.02em;display:flex;align-items:flex-end;gap:4px;z-index:10}
.logo i{width:12px;height:12px;border-radius:50%;background:${L};box-shadow:0 0 0 2px #16181C;margin-bottom:8px}
.cap{position:absolute;left:80px;right:150px;top:150px;z-index:10;transition:opacity .5s ease,transform .5s ease,filter .5s ease}
.cap.hide{opacity:0;transform:translateY(14px);filter:blur(6px)}
.kick{display:inline-block;background:#16181C;color:${L};font-weight:900;font-size:34px;padding:8px 22px;border-radius:999px;margin-bottom:20px}
.h{font-weight:900;font-size:84px;line-height:1.18}.h.big{font-size:112px;line-height:1.1}
.h em{font-style:normal;background:linear-gradient(transparent 58%,${L} 58%)}
.sub{font-weight:700;font-size:36px;color:#3F4349;margin-top:16px}
#device{position:absolute;left:50%;top:640px;width:390px;height:844px;transform:translateX(-50%) rotate(-4deg) scale(1.46);transform-origin:top center;transition:transform 1.1s cubic-bezier(.22,.8,.2,1),top 1.1s cubic-bezier(.22,.8,.2,1);z-index:5}
#device.zoom{transform:translateX(-50%) rotate(0deg) scale(1.72);top:540px}
#sway{position:absolute;inset:0;animation:sway 7s ease-in-out infinite}
@keyframes sway{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(5px,-7px) rotate(.7deg)}}
.rig{position:absolute;inset:0;pointer-events:none}.rig svg{width:390px;height:844px;overflow:visible}
.rig.back{z-index:1}.rig.front{z-index:3}
.phone{position:absolute;inset:0;z-index:2;border-radius:56px;overflow:hidden;background:#F1F2F0;
 box-shadow:0 0 0 9px #111316,0 0 0 11px #7C8088,0 0 0 13px #2A2D33,0 30px 60px rgba(0,0,0,.35)}
.phone iframe{width:390px;height:844px;border:0;display:block}
.glare{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 28%,rgba(255,255,255,0) 70%,rgba(255,255,255,.08) 100%);z-index:2}
.island{position:absolute;left:50%;top:12px;width:110px;height:32px;margin-left:-55px;border-radius:20px;background:#0B0C0E;z-index:3}
.tag{position:absolute;z-index:10;left:80px;top:470px;background:#fff;border-radius:22px;padding:16px 24px;box-shadow:0 14px 34px rgba(0,0,0,.14);font-weight:900;font-size:40px;display:flex;align-items:center;gap:14px;opacity:0;transform:translateY(16px) scale(.96);transition:.5s cubic-bezier(.22,.8,.2,1)}
.tag.on{opacity:1;transform:none}.tag small{font-size:28px;color:#6E7277;font-weight:700}.tag b{background:${L};padding:4px 14px;border-radius:12px}
.count{position:absolute;left:60px;right:60px;top:500px;z-index:12;background:#16181C;color:#fff;border-radius:36px;padding:30px 40px;box-shadow:0 20px 50px rgba(0,0,0,.3);opacity:0;transform:translateY(30px) scale(.96);transition:.6s cubic-bezier(.22,.8,.2,1)}
.count.on{opacity:1;transform:none}.count small{display:block;font-size:34px;font-weight:700;color:#B8F23A}.count b{display:block;font-size:120px;font-weight:900;letter-spacing:-.02em;line-height:1.1;font-feature-settings:'tnum'}
.h.hook{font-size:92px;line-height:1.16}.cap{right:90px!important}.h .l2{display:inline-block;opacity:0;transform:translateY(16px);transition:.45s cubic-bezier(.22,.8,.2,1)}.h .l2.on{opacity:1;transform:none}
.end small{display:block;font-size:34px;color:#9BA0A6;font-weight:700;margin-top:40px}
.end{position:absolute;inset:0;background:#16181C;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .9s ease;text-align:center;z-index:20}
.end.on{opacity:1}.end .w{font-weight:900;font-size:150px;letter-spacing:-.03em;display:flex;align-items:flex-end}
.end .w i{width:40px;height:40px;border-radius:50%;background:${L};margin:0 0 30px 10px}
.end p{font-size:44px;font-weight:700;color:#C9CCD1;margin-top:20px}
.end .cta{margin-top:90px;background:${L};color:#16181C;font-weight:900;font-size:52px;padding:28px 56px;border-radius:999px;line-height:1.35}
</style></head><body>
${Object.entries(SCENES).map(([k, v]) => `<div class="scene" id="sc-${k}">${v}</div>`).join('')}
<div class="bokeh"></div><div class="vignette"></div><div class="toplight"></div>
<div class="logo">ZUBO<i></i></div><div class="cap" id="cap"></div><div class="tag" id="tag"></div>
<div id="device"><div id="sway"><div class="rig back">${BACK}</div>
  <div class="phone" id="phone"><iframe id="f" src="/"></iframe><div class="glare"></div><div class="island"></div></div>
  <div class="rig front">${FRONT}</div></div></div>
<div class="count" id="count"></div><div class="end" id="end"></div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const T0 = Date.now();
  const { ctx, p } = await setup(b, { recordVideo: { dir: __dirname + '/raw5', size: { width: 1080, height: 1920 } } }, STAGE);
  const fr = () => p.frames().find(x => x !== p.mainFrame());
  await fr().evaluate(() => { showBal = true; render(false); });
  await fr().addStyleTag({ content: `.ztap{position:fixed;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.95),rgba(184,242,58,.6) 60%,rgba(184,242,58,0) 72%);z-index:999;pointer-events:none;animation:zt .55s ease-out forwards}@keyframes zt{from{transform:scale(.5);opacity:1}to{transform:scale(1.5);opacity:0}}` });
  const tap = async (sel, wait = 450) => {
    await fr().$eval(sel, e => { e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    await p.waitForTimeout(120);
    await fr().$eval(sel, e => { const r = e.getBoundingClientRect(); const t = document.createElement('div'); t.className = 'ztap'; t.style.left = r.left + r.width / 2 + 'px'; t.style.top = r.top + r.height / 2 + 'px'; document.body.appendChild(t); setTimeout(() => t.remove(), 700); e.style.transition = 'transform .12s'; e.style.transform = 'scale(.93)'; setTimeout(() => e.style.transform = '', 140); });
    await p.waitForTimeout(160);
    await fr().$eval(sel, e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForTimeout(wait);
  };
  const scene = k => p.evaluate(k => document.querySelectorAll('.scene').forEach(s => s.classList.toggle('on', s.id === 'sc-' + k)), k);
  const cap = (h, instant) => p.evaluate(({ h, instant }) => { const c = document.getElementById('cap'); if (instant) { c.innerHTML = h; c.classList.remove('hide'); return; } c.classList.add('hide'); setTimeout(() => { c.innerHTML = h; c.classList.remove('hide'); }, 450); }, { h, instant });
  const tag = h => p.evaluate(h => { const t = document.getElementById('tag'); if (!h) { t.classList.remove('on'); return; } t.innerHTML = h; t.classList.add('on'); }, h);
  const zoom = on => p.evaluate(on => document.getElementById('device').classList.toggle('zoom', on), on);

  await p.evaluate(t => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:-9999px;font-weight:900'; d.textContent = t; document.body.appendChild(d); }, s_all);
  const sfx = []; const mark = k => sfx.push([k, (Date.now() - T0) / 1000]);
  const tap2 = async (sel, wait) => { mark('pop'); await tap(sel, wait); };
  await scene('room');
  await cap(`<div class="h hook">ズボラすぎて<br>家計簿続かないから<br><span class="l2" id="l2"><em>自分で作った。</em></span></div>`, true);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1800);
  const start = (Date.now() - T0) / 1000;
  await p.waitForTimeout(700);
  await p.evaluate(() => document.getElementById('l2').classList.add('on')); mark('whoosh');
  await p.waitForTimeout(1700);
  // 2タップ入力
  await scene('conv');
  await cap(`<div class="kick">入力はこれだけ</div><div class="h">ランチ<em>1,200円</em>なら</div><div class="sub">「1千」→「200」→「コンビニ」</div>`);
  await p.waitForTimeout(900);
  await tap2('[data-act="pad-hi"][data-n="1"]', 380);
  await tap2('[data-act="pad-lo"][data-n="2"]', 420);
  await tap2('[data-act="pad-cat"][data-cat="conv"]', 150); mark('ding');
  await tag(`<small>記録</small><b>¥1,200</b><small>3タップ</small>`);
  await p.waitForTimeout(1300);
  await tag(null);
  // 残高
  await scene('room'); await zoom(true);
  await cap(`<div class="kick">しかも</div><div class="h">残高が<em>その場で</em>減る</div>`);
  await p.waitForTimeout(2000);
  // 貯金予測
  await cap(`<div class="h">このまま生活したら<br><em>いつ</em>いくら貯まる？</div>`);
  await p.waitForTimeout(500);
  await tap2('#tabbar [data-view="future"]', 700);
  await tap2('rect[data-act="fut-month"][data-ym="2027-04"]', 300);
  mark('count');
  await p.evaluate(() => {
    const c = document.getElementById('count'); c.innerHTML = '<small>2027年4月には</small><b id="cn">¥0</b>'; c.classList.add('on');
    const to = Number(document.getElementById('f').contentDocument.querySelector('.pick b').textContent.replace(/[^\d]/g, '')), t0 = performance.now(), d = 1400;
    const f = now => { const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3); document.getElementById('cn').textContent = '¥' + Math.round(to * e).toLocaleString('ja-JP'); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await p.waitForTimeout(1500); mark('ding');
  await cap(`<div class="h">貯まる額まで<br><em>勝手に予測</em></div>`);
  await p.waitForTimeout(2200);
  // エンド
  await p.evaluate(() => { document.getElementById('count').classList.remove('on'); const e = document.getElementById('end'); e.innerHTML = '<div class="w">ZUBO<i></i></div><div class="cta">家計簿続かない人、<br>これ使いたい？</div><p>使いたい人は「ほしい」ってコメントして</p><small>作ってる過程も載せていきます</small>'; e.classList.add('on'); });
  await p.waitForTimeout(3600);
  const end = (Date.now() - T0) / 1000;
  const v = p.video(); await ctx.close(); await b.close();
  require('fs').writeFileSync(__dirname + '/times5.json', JSON.stringify({ start, end, sfx, path: await v.path() }));
  console.log(start, end);
})();
