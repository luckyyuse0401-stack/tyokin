'use strict';

/* =========================================================
   のこり — シンプル残高管理
   データはこの端末の localStorage にだけ保存する。
   機種変更は「引き継ぎリンク」かバックアップファイルで移す。
   ========================================================= */

/* ---------- 小物 ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ds(new Date());
const ymOf = s => s.slice(0, 7);
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dim = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ds(d); };
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const fmtMD = s => { const d = parseD(s); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`; };
const fmtMDW = s => { const d = parseD(s); return `${d.getMonth() + 1}月${d.getDate()}日(${WD[d.getDay()]})`; };
const fmtYMD = s => { const d = parseD(s); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };
const ymLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${y}年${m}月`; };
const monthNum = ym => Number(ym.slice(5, 7));
const yen = n => '¥' + Math.round(Math.abs(n)).toLocaleString('ja-JP');
const sYen = n => (n < 0 ? '−' : n > 0 ? '+' : '') + yen(n);
const compact = n => {
  n = Math.abs(n);
  if (n >= 10000) { const v = n / 10000; return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + '万'; }
  return n.toLocaleString('ja-JP');
};
const halfWidth = v => String(v ?? '').replace(/[０-９－ー]/g, c => c === '－' || c === 'ー' ? '-' : String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
const toInt = v => { const n = parseInt(halfWidth(v).replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : 0; };
const toSignedInt = v => { const s = halfWidth(v).trim(); const n = toInt(s); return s.startsWith('-') ? -n : n; };
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

/* ---------- 保存 ---------- */
const KEY = 'nokori';
const store = {
  get(k, d) { try { const v = localStorage.getItem(`${KEY}:${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) {
    try { localStorage.setItem(`${KEY}:${k}`, JSON.stringify(v)); return true; }
    catch { toast('保存できませんでした（端末の空き容量を確認してください）'); return false; }
  },
  del(k) { try { localStorage.removeItem(`${KEY}:${k}`); } catch { /* noop */ } },
};
const getProfiles = () => store.get('profiles', []);
const setProfiles = list => store.set('profiles', list);

/* ---------- カテゴリ ---------- */
const CATS = {
  expense: [
    { id: 'food', label: 'ごはん', icon: '🍙' },
    { id: 'conv', label: 'コンビニ', icon: '🏪' },
    { id: 'cafe', label: 'カフェ', icon: '☕' },
    { id: 'drink', label: '飲み会', icon: '🍻' },
    { id: 'daily', label: '日用品', icon: '🧴' },
    { id: 'trans', label: '交通', icon: '🚃' },
    { id: 'shop', label: '買い物', icon: '🛍️' },
    { id: 'date', label: 'デート', icon: '💑' },
    { id: 'beauty', label: '美容', icon: '💄' },
    { id: 'fun', label: '趣味', icon: '🎮' },
    { id: 'health', label: '病院・薬', icon: '💊' },
    { id: 'other', label: 'その他', icon: '📦' },
  ],
  income: [
    { id: 'salary', label: '給料', icon: '💰' },
    { id: 'bonus', label: '臨時収入', icon: '🎁' },
    { id: 'refund', label: '返金', icon: '↩️' },
    { id: 'other', label: 'その他', icon: '📦' },
  ],
};
const catOf = (kind, id) => (CATS[kind] || []).find(c => c.id === id);


/* ---------- アイコン ---------- */
const ICON = {
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z"/><path d="M6 6V5a2 2 0 0 1 2-2h8"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" stroke="none"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.7 3.6M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
};
const logo = (cls = '') => `<div class="logo ${cls}">${ICON.wallet}</div>`;

/* =========================================================
   状態
   ========================================================= */
let P = null;          // 開いているプロフィール {id, name, pin:{salt,hash}|null}
let D = null;          // そのデータ
let view = 'home';
let calYM = ymOf(today());
let selDay = today();
// 金額パッド（上の段＝千の位、下の段＝百の位。「1万〜」で万＋千に切り替え）
let padHi = 0, padLo = 0, padBig = false;
const padAmount = () => padBig ? padHi * 10000 + padLo * 1000 : padHi * 1000 + padLo * 100;
const padReset = () => { padHi = 0; padLo = 0; padBig = false; };
let processedOn = '';
let hiddenAt = 0;
let showBal = false;   // 残高は開くたびに隠した状態から

// 残高の表示（隠しているときは ••••••）
const balText = n => showBal ? `${n < 0 ? '−' : ''}${yen(n)}` : '¥••••••';
const eyeBtn = (cls = '') => `<button class="eye ${cls}" data-act="toggle-bal" aria-label="${showBal ? '残高を隠す' : '残高を表示'}" aria-pressed="${showBal}">${showBal ? ICON.eye : ICON.eyeOff}<span>${showBal ? '隠す' : '表示'}</span></button>`;

const app = $('#app');
const tabbar = $('#tabbar');

function newData(base) { return { v: 1, base, tx: [], rec: [], created: today() }; }
function normalize(d) {
  d = d && typeof d === 'object' ? d : newData(0);
  d.base = Number(d.base) || 0;
  d.tx = Array.isArray(d.tx) ? d.tx.filter(x => x && x.date && x.kind) : [];
  d.rec = Array.isArray(d.rec) ? d.rec.filter(r => r && r.id) : [];
  for (const x of d.tx) { if (!x.id) x.id = uid(); x.amount = Number(x.amount) || 0; }
  for (const r of d.rec) { r.skip = Array.isArray(r.skip) ? r.skip : []; r.amount = Number(r.amount) || 0; r.day = Math.min(31, Math.max(1, Number(r.day) || 1)); }
  return d;
}
function save() { if (P && D) store.set(`data:${P.id}`, D); }

/* ---------- 計算 ---------- */
const sv = x => x.kind === 'income' ? x.amount : x.kind === 'expense' ? -x.amount : x.amount; // adjust は符号つき
const occDate = (r, ym) => `${ym}-${pad(Math.min(r.day, dim(ym)))}`;

function balance(upTo = today()) {
  let b = D.base;
  for (const x of D.tx) if (x.date <= upTo) b += sv(x);
  return b;
}

// 毎月の予定（金額が決まっているもの）を、当日になったら記録にする
function processRecurring() {
  const t = today();
  let changed = false;
  for (const r of D.rec) {
    if (!r.amount) continue;
    for (let ym = ymOf(r.start); ym <= ymOf(t); ym = addMonths(ym, 1)) {
      const date = occDate(r, ym);
      if (date < r.start || date > t || r.skip.includes(ym)) continue;
      if (D.tx.some(x => x.rec === r.id && x.ym === ym)) continue;
      D.tx.push({ id: uid(), date, kind: r.kind, amount: r.amount, rec: r.id, ym, name: r.name });
      changed = true;
    }
  }
  if (changed) save();
  processedOn = t;
}

// まだ記録になっていない「毎月の予定」（未来の分・金額未入力の分）
function virtuals(ym) {
  const t = today();
  const out = [];
  for (const r of D.rec) {
    if (ym < ymOf(r.start)) continue;
    const date = occDate(r, ym);
    if (date < r.start || r.skip.includes(ym)) continue;
    if (D.tx.some(x => x.rec === r.id && x.ym === ym)) continue;
    if (date <= t && r.amount) continue;
    out.push({ virtual: true, rec: r.id, ym, date, kind: r.kind, amount: r.amount, name: r.name });
  }
  return out;
}

function ringsOf(ym) {
  const rings = {};
  for (const r of D.rec) {
    if (ym < ymOf(r.start)) continue;
    const date = occDate(r, ym);
    if (date < r.start || r.skip.includes(ym)) continue;
    if (r.kind === 'expense') rings[date] = 'exp';
    else if (!rings[date]) rings[date] = 'inc';
  }
  return rings;
}

function monthStats(ym) {
  const t = today();
  let inc = 0, fixed = 0, spent = 0, sched = 0;
  for (const x of D.tx) {
    if (ymOf(x.date) !== ym) continue;
    if (x.date > t) { if (x.kind === 'expense') sched += x.amount; continue; }
    if (x.kind === 'income') inc += x.amount;
    else if (x.kind === 'expense') { if (x.rec || x.plan) fixed += x.amount; else spent += x.amount; }
  }
  for (const v of virtuals(ym)) if (v.kind === 'expense' && v.date > t) sched += v.amount;
  return { inc, fixed, spent, net: inc - fixed - spent, sched };
}

function sortTx(list, dir = -1) {
  const idx = new Map(D.tx.map((x, i) => [x, i]));
  return list.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -dir : dir;
    return ((idx.get(a) ?? 1e9) - (idx.get(b) ?? 1e9)) * -dir;
  });
}

function upcoming() {
  const t = today(), end = addDays(t, 31), from = addDays(t, -31), ym = ymOf(t);
  const items = D.tx.filter(x => x.date > t && x.date <= end);
  for (const m of [addMonths(ym, -1), ym, addMonths(ym, 1)]) {
    for (const v of virtuals(m)) {
      if (v.date > end) continue;
      if (v.date > t || (!v.amount && v.date >= from)) items.push(v);
    }
  }
  return sortTx(items, 1);
}

function recentMemos(kind) {
  const seen = new Set();
  const out = [];
  for (let i = D.tx.length - 1; i >= 0 && out.length < 6; i--) {
    const x = D.tx[i];
    if (x.kind !== kind || !x.memo || seen.has(x.memo)) continue;
    seen.add(x.memo); out.push(x.memo);
  }
  return out;
}

/* ---------- 表示用 ---------- */
function txTitle(x) {
  if (x.kind === 'adjust') return '残高の修正';
  const c = catOf(x.kind, x.cat);
  return x.name || c?.label || x.memo || (x.kind === 'income' ? '収入' : '支出');
}
function txIcon(x) {
  if (x.kind === 'adjust') return '✏️';
  if (x.rec || x.name) return x.kind === 'income' ? '💰' : '🏦';
  const c = catOf(x.kind, x.cat);
  if (c) return c.icon;
  return x.kind === 'income' ? '+' : '−';
}
function txRow(x, { showDate = true } = {}) {
  const t = today();
  const future = x.date > t;
  const todo = x.virtual && !x.amount;
  const title = txTitle(x);
  const memo = x.memo && x.memo !== title ? x.memo : '';
  const subs = [];
  if (showDate) subs.push(fmtMD(x.date));
  if (memo) subs.push(esc(memo));
  if (todo) subs.push('タップして金額を入れる');
  else if (future && x.kind === 'expense' && (x.rec || x.plan || x.virtual)) subs.push('この日に自動で引かれます');
  const tag = todo ? '<span class="tag todo">金額未入力</span>' : future ? '<span class="tag plan">予定</span>' : '';
  const icoCls = x.kind === 'income' ? 'inc' : future || todo ? 'plan' : '';
  const amt = todo ? '<div class="a todo">未入力</div>'
    : `<div class="a num ${x.kind === 'income' ? 'inc' : ''}">${sYen(sv(x))}</div>`;
  const act = x.virtual ? `data-act="occ" data-rec="${x.rec}" data-ym="${x.ym}"` : `data-act="tx" data-id="${x.id}"`;
  return `<button class="item" ${act}>
    <div class="ico ${icoCls}">${txIcon(x)}</div>
    <div class="mid"><div class="t">${esc(title)}${tag}</div><div class="s">${subs.join(' · ') || '&nbsp;'}</div></div>
    ${amt}
  </button>`;
}

/* =========================================================
   画面：ホーム
   ========================================================= */
function topBar() {
  return `<header class="top">
    ${logo()}
    <div><h1>のこり</h1><div class="sub">${esc(P.name)}の残高</div></div>
    <div class="date">${fmtYMD(today())}</div>
  </header>`;
}

function viewHome() {
  const t = today(), ym = ymOf(t), st = monthStats(ym), bal = balance();
  const up = upcoming();
  const recent = sortTx(D.tx.filter(x => x.date <= t)).slice(0, 5);
  const upOut = up.filter(x => x.kind === 'expense').reduce((s, x) => s + x.amount, 0);

  const installTip = isIOS() && !isStandalone() && !store.get('hideInstallTip', false)
    ? `<div class="tip" style="display:flex;gap:10px;align-items:flex-start">
        <div style="flex:1">📲 Safariの共有ボタン →「ホーム画面に追加」で、アプリのように使えます。<b>データも消えにくくなる</b>のでおすすめです。<br><small>※ホーム画面のアプリとSafariは別々に保存されます。先に追加してから使い始めてください。</small></div>
        <button data-act="hide-tip" aria-label="閉じる" style="font-size:18px;color:var(--muted)">✕</button>
      </div>` : '';

  return `${installTip}
  <section class="balance slim">
    <div class="row"><span class="lbl">${esc(P.name)}の残高 · ${fmtMD(t)}</span><span class="hint">${monthNum(ym)}月の収支 <b class="num ${st.net < 0 ? 'neg' : ''}">${sYen(st.net)}</b></span></div>
    <div class="row mid"><div class="big num ${showBal ? '' : 'masked'}"><small>¥</small>${showBal ? `${bal < 0 ? '−' : ''}${Math.abs(bal).toLocaleString('ja-JP')}` : '••••••'}</div>${eyeBtn()}</div>
  </section>

  ${padHTML()}

  <div class="two">
    <button class="btn btn-income" data-act="add" data-kind="income">＋ 収入を追加</button>
    <button class="btn btn-ghost" data-act="add" data-kind="expense">📅 日付を変えて入力</button>
  </div>

  ${up.length ? `<section class="callout">
    <div class="h">これからの引き落とし・予定${upOut ? `<span class="num">−${yen(upOut)}</span>` : ''}</div>
    ${up.slice(0, 5).map(x => txRow(x)).join('')}
    ${upOut ? `<div class="foot"><span>引き落とし後の残高</span><b class="num">${balText(bal - upOut)}</b></div>` : ''}
  </section>` : ''}

  <div class="stats">
    <div><div class="k">今月の収入</div><div class="v num pos">+${yen(st.inc)}</div></div>
    <div><div class="k">引き落とし</div><div class="v num">−${yen(st.fixed)}</div></div>
    <div><div class="k">今月使った金額</div><div class="v num">−${yen(st.spent)}</div></div>
  </div>

  <div class="sec-head"><h3>最近の履歴</h3><button class="aside" data-act="go" data-view="calendar">カレンダーで見る</button></div>
  <div class="list">${recent.length ? recent.map(x => txRow(x)).join('') : '<div class="empty">まだ記録がありません。<br>上のボタンで金額を選んで、なにに使ったかをタップすると登録できます。</div>'}</div>`;
}

// 2タップ入力：上の段（千の位）＋下の段（百の位）→ カテゴリをタップで登録
function padHTML() {
  const amt = padAmount();
  const hiUnit = padBig ? '万' : '千', loLabel = n => padBig ? `${n}千` : `${n}00`;
  const parts = [padHi ? `${padHi}${hiUnit}` : '', padLo ? loLabel(padLo) : ''].filter(Boolean).join(' ＋ ');
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return `<section class="pad">
    <div class="pad-top">
      <div>
        <div class="pad-q">いくら使った？</div>
        <div class="pad-amt num ${amt ? '' : 'empty'}">${amt ? `¥${amt.toLocaleString('ja-JP')}` : '¥0'}</div>
        <div class="pad-sub">${parts || (padBig ? '1万円以上モード' : '2つの段から1つずつ選んでね')}</div>
      </div>
      ${amt ? '<button class="pad-clear" data-act="pad-clear" aria-label="クリア">✕</button>' : ''}
    </div>
    <div class="pad-label">${padBig ? '万円' : '千円'}</div>
    <div class="pad-row">${nums.map(n => `<button class="pk hi ${padHi === n ? 'on' : ''}" data-act="pad-hi" data-n="${n}">${n}<small>${hiUnit}</small></button>`).join('')}
      <button class="pk mode" data-act="pad-big">${padBig ? '〜9,900' : '1万〜'}</button></div>
    <div class="pad-label">${padBig ? '千円' : '百円'}</div>
    <div class="pad-row">${nums.map(n => `<button class="pk lo ${padLo === n ? 'on' : ''}" data-act="pad-lo" data-n="${n}">${padBig ? `${n}<small>千</small>` : `${n}00`}</button>`).join('')}
      <button class="pk mode" data-act="pad-exact">🪙<small>ぴったり</small></button></div>
    <div class="pad-label">なにに使った？ <em>${amt ? 'タップで登録' : ''}</em></div>
    <div class="pad-cats ${amt ? '' : 'off'}">${CATS.expense.map(c => `<button data-act="pad-cat" data-cat="${c.id}" ${amt ? '' : 'disabled'}><span>${c.icon}</span>${c.label}</button>`).join('')}</div>
    <div class="pad-foot ${amt ? '' : 'off'}">
      <button data-act="pad-memo" ${amt ? '' : 'disabled'}>✏️ メモを付けて登録</button>
      <button data-act="pad-plain" ${amt ? '' : 'disabled'}>そのまま登録</button>
    </div>
  </section>`;
}

function padCommit(cat) {
  const amt = padAmount();
  if (!amt) return;
  const tx = { id: uid(), date: today(), kind: 'expense', amount: amt };
  if (cat) tx.cat = cat;
  D.tx.push(tx);
  padReset();
  save(); render();
  const what = catOf('expense', cat)?.label;
  toast(`${yen(amt)} を登録しました${what ? `（${what}）` : ''}`, () => { D.tx = D.tx.filter(x => x !== tx); save(); render(); });
}

/* =========================================================
   画面：カレンダー
   ========================================================= */
function viewCalendar() {
  const t = today(), ym = calYM, st = monthStats(ym), bal = balance();
  const n = dim(ym), first = parseD(`${ym}-01`).getDay();
  const rings = ringsOf(ym);
  const vs = virtuals(ym);
  const day = {};
  const cell = d => (day[d] ||= { out: 0, inc: 0, plan: 0, planInc: 0, todo: 0 });
  for (const x of D.tx) {
    if (ymOf(x.date) !== ym || x.kind === 'adjust') continue;
    const c = cell(x.date);
    if (x.date > t) { if (x.kind === 'expense') c.plan += x.amount; else c.planInc += x.amount; }
    else if (x.kind === 'expense') c.out += x.amount; else c.inc += x.amount;
  }
  for (const v of vs) {
    const c = cell(v.date);
    if (!v.amount) c.todo++;
    else if (v.kind === 'expense') c.plan += v.amount; else c.planInc += v.amount;
  }

  let cells = '<div class="d blank"></div>'.repeat(first);
  for (let i = 1; i <= n; i++) {
    const date = `${ym}-${pad(i)}`;
    const wd = (first + i - 1) % 7;
    const c = day[date] || {};
    const cls = ['d', wd === 0 ? 'sun' : '', wd === 6 ? 'sat' : '', date === t ? 'today' : '', date === selDay ? 'sel' : '',
      rings[date] === 'exp' ? 'ring-exp' : rings[date] === 'inc' ? 'ring-inc' : ''].filter(Boolean).join(' ');
    const lines = [];
    if (c.out) lines.push(`<div class="m out num">-${compact(c.out)}</div>`);
    if (c.inc) lines.push(`<div class="m in num">+${compact(c.inc)}</div>`);
    if (c.plan) lines.push(`<div class="m plan num">予${compact(c.plan)}</div>`);
    if (c.planInc) lines.push(`<div class="m in num">予+${compact(c.planInc)}</div>`);
    if (c.todo) lines.push('<div class="m todo">未入力</div>');
    cells += `<button class="${cls}" data-act="day" data-date="${date}"><div class="n">${i}</div>${lines.slice(0, 2).join('')}</button>`;
  }

  const items = sortTx([...D.tx.filter(x => x.date === selDay), ...vs.filter(v => v.date === selDay)], 1);
  const dayTotal = items.reduce((s, x) => s + (x.virtual && !x.amount ? 0 : sv(x)), 0);
  const future = selDay > t;
  const monthTx = sortTx(D.tx.filter(x => ymOf(x.date) === ym));
  let monthList = '', lastDate = '';
  for (const x of monthTx) {
    if (x.date !== lastDate) { monthList += `<div class="day-head">${fmtMDW(x.date)}</div>`; lastDate = x.date; }
    monthList += txRow(x, { showDate: false });
  }

  return `<div class="mini-balance"><div class="in"><span>現在残高 ${eyeBtn('sm')}</span><b class="num">${balText(bal)}</b></div></div>
  <div class="month-nav">
    <button class="icon-btn" data-act="month" data-d="-1" aria-label="前の月">‹</button>
    <h2 data-act="month" data-d="0">${ymLabel(ym)}</h2>
    <button class="icon-btn" data-act="month" data-d="1" aria-label="次の月">›</button>
  </div>
  <div class="sum-card">
    <div class="k">この月の収支</div>
    <div class="v num ${st.net < 0 ? 'neg' : ''}">${sYen(st.net)}</div>
    <div class="row">
      <span>収入 <b class="num">${yen(st.inc)}</b></span>
      <span>引き落とし <b class="num">${yen(st.fixed)}</b></span>
      <span>使った <b class="num">${yen(st.spent)}</b></span>
      ${st.sched ? `<span>これから <b class="num red">${yen(st.sched)}</b></span>` : ''}
    </div>
  </div>
  <div class="cal">
    <div class="wk">${WD.map(w => `<div>${w}</div>`).join('')}</div>
    <div class="days">${cells}</div>
    <div class="legend"><span><i style="border-color:var(--red)"></i>引き落とし日</span><span><i style="border-color:var(--teal)"></i>給料日など</span><span style="color:var(--red)">予＝予定</span></div>
  </div>
  ${D.rec.length ? '' : `<div class="tip">💡 設定の「毎月の給料・引き落とし」にカードや家賃を登録すると、カレンダーに<b style="color:var(--red)">赤丸</b>がつきます。<button class="aside" data-act="go" data-view="settings" style="color:var(--teal);font-weight:700;margin-left:4px">登録する</button></div>`}

  <section class="day-panel">
    <div class="h"><b>${fmtMDW(selDay)}${selDay === t ? '（今日）' : ''}</b><span class="num">${items.length ? (future ? '予定 ' : '') + sYen(dayTotal) : ''}</span></div>
    <div class="list">${items.length ? items.map(x => txRow(x, { showDate: false })).join('') : `<div class="empty">${future ? 'この日の予定はありません' : 'この日の記録はありません'}</div>`}</div>
    <div class="two">
      <button class="btn btn-white" data-act="add" data-kind="expense" data-date="${selDay}">＋ 支出${future ? 'の予定' : ''}</button>
      <button class="btn btn-income" data-act="add" data-kind="income" data-date="${selDay}">＋ 収入${future ? 'の予定' : ''}</button>
    </div>
  </section>

  <div class="sec-head"><h3>${monthNum(ym)}月の記録</h3><span class="aside">タップで修正・削除</span></div>
  <div class="list">${monthList || '<div class="empty">この月の記録はありません</div>'}</div>`;
}

/* =========================================================
   画面：設定
   ========================================================= */
function viewSettings() {
  const bal = balance();
  const recs = D.rec.slice().sort((a, b) => a.day - b.day);
  return `<div class="page-head" style="margin-top:6px"><h2>設定</h2></div>
  <section class="set-balance">
    <div class="k" style="display:flex;justify-content:space-between;align-items:center">現在残高 ${eyeBtn()}</div>
    <div class="v num">${balText(bal)}</div>
    <button data-act="adjust">残高を直接修正</button>
  </section>

  <div class="sec-head"><h3>毎月の給料・引き落とし</h3></div>
  <div class="menu">
    ${recs.map(r => `<button data-act="rec" data-id="${r.id}">
      <div class="ico ${r.kind === 'income' ? 'inc' : 'plan'}" style="width:38px;height:38px;font-size:18px">${r.kind === 'income' ? '💰' : '🏦'}</div>
      <div class="l"><b>${esc(r.name)}</b><small>毎月${r.day}日${r.day >= 29 ? '（ない月は月末）' : ''}</small></div>
      <div class="r num">${r.amount ? (r.kind === 'income' ? '+' : '−') + yen(r.amount) : '毎月入力'}</div><span class="chev">›</span>
    </button>`).join('')}
    <button class="add" data-act="rec-add">＋ 追加する</button>
  </div>
  <p class="note">カードみたいに毎月金額が変わるものは、金額を空欄にしておくと、カレンダーの<b style="color:var(--red)">赤丸</b>の日をタップしてその月の金額を入れられます。金額が入った予定は、その日になると自動で残高から引かれます。</p>

  <div class="sec-head"><h3>アカウント</h3></div>
  <div class="menu">
    <button data-act="rename"><div class="l">名前<small>画面上の表示に使います</small></div><div class="r">${esc(P.name)}</div><span class="chev">›</span></button>
    <button data-act="pin"><div class="l">パスコード<small>アプリを開くときの4桁の数字</small></div><div class="r">${P.pin ? 'オン' : 'オフ'}</div><span class="chev">›</span></button>
    ${P.pin ? '<button data-act="lock"><div class="l">いますぐロックする</div><span class="chev">›</span></button>' : ''}
    <button data-act="switch"><div class="l">アカウントを切り替え・追加</div><span class="chev">›</span></button>
  </div>

  <div class="sec-head"><h3>機種変更・バックアップ</h3></div>
  <div class="menu">
    <button data-act="transfer"><div class="l"><b>引き継ぎリンクを作る</b><small>新しいスマホでリンクを開くだけで続きから使えます</small></div><span class="chev">›</span></button>
    <button data-act="export"><div class="l">バックアップをファイルに保存</div><span class="chev">›</span></button>
    <button data-act="import"><div class="l">ファイルから読み込む</div><span class="chev">›</span></button>
  </div>

  <div class="storage-note">
    <div style="font-size:24px">📱</div>
    <div><b>このスマホだけに保存</b><p>ログイン不要で、データはこの端末の中だけにあります。ブラウザのデータ削除や機種変更では消えてしまうので、機種変更の前に「引き継ぎリンク」を作ってください。${isIOS() ? 'ホーム画面に追加したアプリとSafariは別々に保存されます。' : ''}</p></div>
  </div>

  <div class="menu" style="margin-top:26px">
    <button class="danger" data-act="delete-account"><div class="l">このアカウントのデータを削除</div></button>
  </div>
  <p class="note" style="text-align:center;margin-top:20px">のこり v1</p>`;
}

/* =========================================================
   描画
   ========================================================= */
function render(keepScroll = true) {
  if (!P) return;
  if (processedOn !== today()) processRecurring();
  const y = window.scrollY;
  app.className = '';
  app.innerHTML = view === 'calendar' ? viewCalendar() : view === 'settings' ? viewSettings() : viewHome();
  renderTabbar();
  if (keepScroll) window.scrollTo(0, y);
}

function renderTabbar() {
  tabbar.hidden = false;
  const tabs = [['home', 'ホーム', ICON.home], ['calendar', 'カレンダー', ICON.cal], ['settings', '設定', ICON.gear]];
  tabbar.innerHTML = `<div class="in">${tabs.map(([k, l, i]) => `<button class="${view === k ? 'on' : ''}" data-view="${k}"><span class="i">${i}</span>${l}</button>`).join('')}</div>`;
}

function go(v) {
  view = v;
  render(false);
  window.scrollTo(0, 0);
}

tabbar.addEventListener('click', e => {
  const b = e.target.closest('button[data-view]');
  if (!b) return;
  if (b.dataset.view === 'calendar' && view !== 'calendar') { calYM = ymOf(today()); selDay = today(); }
  go(b.dataset.view);
});

app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !P) return;
  const a = el.dataset.act;
  const ds_ = el.dataset;
  switch (a) {
    case 'pad-hi': { const n = Number(ds_.n); padHi = padHi === n ? 0 : n; render(); break; }
    case 'pad-lo': { const n = Number(ds_.n); padLo = padLo === n ? 0 : n; render(); break; }
    case 'pad-big': padBig = !padBig; padHi = 0; padLo = 0; render(); break;
    case 'pad-clear': padReset(); render(); break;
    case 'pad-cat': padCommit(ds_.cat); break;
    case 'pad-plain': padCommit(null); break;
    case 'pad-memo': { const amount = padAmount(); padReset(); render(); openEntry({ kind: 'expense', amount, quick: true }); break; }
    case 'pad-exact': openEntry({ kind: 'expense' }); break;
    case 'add': openEntry({ kind: ds_.kind, date: ds_.date }); break;
    case 'tx': openEntry({ id: ds_.id }); break;
    case 'occ': openOccurrence(ds_.rec, ds_.ym); break;
    case 'go': go(ds_.view); break;
    case 'toggle-bal': showBal = !showBal; render(); break;
    case 'hide-tip': store.set('hideInstallTip', true); render(); break;
    case 'month': {
      const d = Number(ds_.d);
      calYM = d === 0 ? ymOf(today()) : addMonths(calYM, d);
      selDay = calYM === ymOf(today()) ? today() : `${calYM}-01`;
      render(false);
      break;
    }
    case 'day': selDay = ds_.date; render(); $('.day-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); break;
    case 'adjust': openAdjust(); break;
    case 'rec-add': openRec(); break;
    case 'rec': openRec(ds_.id); break;
    case 'rename': openRename(); break;
    case 'pin': openPinSettings(); break;
    case 'lock': showLock(P); break;
    case 'switch': showPicker(); break;
    case 'transfer': openTransfer(); break;
    case 'export': exportFile(); break;
    case 'import': pickImportFile(); break;
    case 'delete-account': confirmDeleteAccount(P); break;
  }
});

/* =========================================================
   シート（下から出る画面）
   ========================================================= */
function openSheet(html, mount) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  const bd = root.firstElementChild;
  bd.addEventListener('click', e => { if (e.target === bd) closeSheet(); });
  document.body.style.overflow = 'hidden';
  const sheet = $('.sheet', root);
  mount?.(sheet);
  return sheet;
}
function closeSheet() { $('#sheet-root').innerHTML = ''; document.body.style.overflow = ''; }

function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

let toastTimer;
function toast(msg, undo) {
  const r = $('#toast-root');
  r.innerHTML = `<div class="toast"><span>${esc(msg)}</span>${undo ? '<button>取り消す</button>' : ''}</div>`;
  if (undo) $('button', r).onclick = () => { undo(); r.innerHTML = ''; };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { r.innerHTML = ''; }, undo ? 5000 : 2400);
}

function confirmSheet({ title, body = '', ok = 'OK', danger = false, onOk }) {
  openSheet(`<h3>${title}</h3><p class="lead">${body}</p>
    <div class="stack"><button class="btn ${danger ? 'btn-danger' : 'btn-navy'}" data-ok>${ok}</button><button class="btn btn-text" data-cancel>キャンセル</button></div>`,
  s => {
    $('[data-ok]', s).onclick = () => { closeSheet(); onOk(); };
    $('[data-cancel]', s).onclick = closeSheet;
  });
}

/* ---------- 支出・収入の登録／修正 ---------- */
function openEntry(o) {
  const edit = o.id ? D.tx.find(x => x.id === o.id) : null;
  if (o.id && !edit) return;
  if (edit?.kind === 'adjust') return openAdjustDelete(edit);
  const kind = edit ? edit.kind : o.kind;
  const recId = edit ? edit.rec : o.rec;
  const rec = recId ? D.rec.find(r => r.id === recId) : null;
  const name = edit ? edit.name : (o.name || rec?.name);
  const isRec = !!recId;
  const quick = !edit && !isRec && o.quick && o.amount > 0;
  let date = edit ? edit.date : (o.date || today());
  let cat = edit?.cat || null;
  const amount = edit ? edit.amount : (o.amount || '');
  const memo = edit?.memo || '';
  const cats = CATS[kind] || [];
  const isFuture = () => date > today();

  const titleText = () => {
    if (isRec) return `${name}${kind === 'expense' ? 'の引き落とし' : ''}`;
    if (edit) return '記録を修正';
    return `${kind === 'income' ? '収入' : '支出'}${isFuture() ? 'の予定' : ''}を登録`;
  };
  const dateLabel = () => `${fmtMD(date)}${date === today() ? ' 今日' : ''}`;
  const suggestions = recentMemos(kind);

  openSheet(`
    <div class="entry-head">
      <h3 data-title>${esc(titleText())}</h3>
      ${isRec ? `<span class="date-chip">${fmtMD(date)}</span>`
        : `<label class="date-chip"><span data-date-label>${dateLabel()}</span> ▾<input type="date" value="${date}" data-date></label>`}
    </div>
    ${isRec ? `<p class="lead" style="margin-top:6px">${date > today() ? 'この日になったら自動で残高から引かれます。' : ''}${rec && !rec.amount ? '毎月金額が変わる予定です。今月の金額を入れてください。' : ''}</p>` : ''}
    <div class="amount-field"><span>¥</span><input class="num" inputmode="numeric" pattern="[0-9]*" placeholder="0" value="${amount}" data-amount aria-label="金額"></div>
    ${isRec ? '' : `
      <div class="label">${kind === 'income' ? 'どんな収入？' : 'なにに使った？'}${quick ? '<em>タップでそのまま登録</em>' : ''}</div>
      <div class="cats">${cats.map(c => `<button class="cat ${c.id === cat ? 'on' : ''}" data-cat="${c.id}"><span>${c.icon}</span>${c.label}</button>`).join('')}</div>`}
    <div class="label">メモ（なくてもOK）</div>
    <input class="field" maxlength="40" placeholder="${kind === 'income' ? '例：お祝い、メルカリ' : '例：ランチ、Amazon'}" value="${esc(memo)}" data-memo enterkeyhint="done">
    ${suggestions.length && !isRec ? `<div class="suggest">${suggestions.map(m => `<button data-sug="${esc(m)}">${esc(m)}</button>`).join('')}</div>` : ''}
    <div class="stack">
      <button class="btn btn-primary" data-save></button>
      ${edit ? '<button class="btn btn-danger" data-del>この記録を削除</button>'
        : isRec ? '<button class="btn btn-text" data-skip>今月はこの予定なし</button>' : ''}
    </div>`,
  s => {
    const amtIn = $('[data-amount]', s), memoIn = $('[data-memo]', s), saveBtn = $('[data-save]', s), dateIn = $('[data-date]', s);
    const updBtn = () => {
      saveBtn.textContent = edit || isRec ? '保存' : (quick && !memoIn.value.trim() && !cat ? 'メモなしで登録' : '登録');
    };
    updBtn();
    if (!amount) setTimeout(() => amtIn.focus(), 250);

    dateIn?.addEventListener('change', () => {
      if (!dateIn.value) { dateIn.value = date; return; }
      date = dateIn.value;
      $('[data-date-label]', s).textContent = dateLabel();
      $('[data-title]', s).textContent = titleText();
    });
    memoIn.addEventListener('input', updBtn);
    memoIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    $$('[data-sug]', s).forEach(b => b.onclick = () => { memoIn.value = b.dataset.sug; updBtn(); });
    $$('[data-cat]', s).forEach(b => b.onclick = () => {
      const id = b.dataset.cat;
      if (quick) { cat = id; commit(); return; }
      cat = cat === id ? null : id;
      $$('[data-cat]', s).forEach(x => x.classList.toggle('on', x.dataset.cat === cat));
      updBtn();
    });
    saveBtn.onclick = commit;
    $('[data-del]', s)?.addEventListener('click', () => { closeSheet(); deleteTx(edit); });
    $('[data-skip]', s)?.addEventListener('click', () => {
      if (!rec) return;
      rec.skip.push(o.ym); save(); closeSheet(); render();
      toast(`${ymLabel(o.ym)}の${rec.name}はなしにしました`, () => { rec.skip = rec.skip.filter(y => y !== o.ym); save(); render(); });
    });

    function commit() {
      const amt = toInt(amtIn.value);
      if (!amt) { shake(amtIn.parentElement); amtIn.focus(); return; }
      const m = memoIn.value.trim().slice(0, 40);
      if (edit) {
        edit.amount = amt; edit.date = date;
        if (m) edit.memo = m; else delete edit.memo;
        if (cat) edit.cat = cat; else delete edit.cat;
        if (!edit.rec && date > today()) edit.plan = true;
        save(); closeSheet(); render(); toast('保存しました');
        return;
      }
      const tx = { id: uid(), date, kind, amount: amt };
      if (cat) tx.cat = cat;
      if (m) tx.memo = m;
      if (isRec) { tx.rec = recId; tx.ym = o.ym; tx.name = name; }
      else if (date > today()) tx.plan = true;
      D.tx.push(tx);
      save(); closeSheet(); render();
      const what = [catOf(kind, cat)?.label, m].filter(Boolean).join('・');
      const verb = date > today() ? '予定に入れました' : '登録しました';
      toast(`${yen(amt)} を${verb}${what ? `（${what}）` : ''}`, () => { D.tx = D.tx.filter(x => x !== tx); save(); render(); });
    }
  });
}

function openOccurrence(recId, ym) {
  const rec = D.rec.find(r => r.id === recId);
  if (!rec) return;
  openEntry({ kind: rec.kind, rec: rec.id, ym, date: occDate(rec, ym), name: rec.name, amount: rec.amount || '' });
}

function deleteTx(tx) {
  const i = D.tx.indexOf(tx);
  if (i < 0) return;
  D.tx.splice(i, 1);
  const rec = tx.rec ? D.rec.find(r => r.id === tx.rec) : null;
  const addedSkip = rec && rec.amount && !rec.skip.includes(tx.ym);
  if (addedSkip) rec.skip.push(tx.ym); // 自動で作り直されないように
  save(); render();
  toast('削除しました', () => {
    D.tx.splice(Math.min(i, D.tx.length), 0, tx);
    if (addedSkip) rec.skip = rec.skip.filter(y => y !== tx.ym);
    save(); render();
  });
}

function openAdjustDelete(tx) {
  confirmSheet({
    title: '残高の修正', ok: 'この修正を取り消す', danger: true,
    body: `${fmtYMD(tx.date)}に残高を ${sYen(tx.amount)} 修正しました。取り消すと残高が元に戻ります。`,
    onOk: () => deleteTx(tx),
  });
}

/* ---------- 残高の直接修正 ---------- */
function openAdjust() {
  const bal = balance();
  openSheet(`<h3>残高を直接修正</h3>
    <p class="lead">通帳やアプリの残高と合わせたいときに。差額が「残高の修正」として記録されます。</p>
    <div class="amount-field"><span>¥</span><input class="num" inputmode="numeric" value="${bal}" data-v aria-label="正しい残高"></div>
    <p class="note" data-diff>&nbsp;</p>
    <div class="stack"><button class="btn btn-navy" data-save>この残高にする</button></div>`,
  s => {
    const inp = $('[data-v]', s), diffEl = $('[data-diff]', s);
    const upd = () => { const d = toSignedInt(inp.value) - bal; diffEl.textContent = d ? `今より ${sYen(d)}` : ' '; };
    inp.addEventListener('input', upd);
    setTimeout(() => inp.select(), 250);
    $('[data-save]', s).onclick = () => {
      if (!/\d/.test(inp.value)) { shake(inp.parentElement); return; }
      const diff = toSignedInt(inp.value) - bal;
      closeSheet();
      if (!diff) return;
      const tx = { id: uid(), date: today(), kind: 'adjust', amount: diff };
      D.tx.push(tx); save(); render();
      toast('残高を修正しました', () => { D.tx = D.tx.filter(x => x !== tx); save(); render(); });
    };
  });
}

/* ---------- 毎月の予定 ---------- */
function openRec(id) {
  const r = id ? D.rec.find(x => x.id === id) : null;
  let kind = r?.kind || 'expense';
  openSheet(`<h3>${r ? '毎月の予定を編集' : '毎月の予定を追加'}</h3>
    <p class="lead">給料・カードの引き落とし・家賃・スマホ代など</p>
    <div class="seg kind-seg"><button data-k="expense">引き落とし（支出）</button><button data-k="income">給料（収入）</button></div>
    <div class="label">名前</div>
    <input class="field" maxlength="20" placeholder="例：楽天カード" value="${esc(r?.name || '')}" data-name>
    <div class="inline-fields">
      <div><div class="label">毎月何日？</div><div class="with-unit"><input class="field num" inputmode="numeric" placeholder="27" value="${r?.day || ''}" data-day><span>日</span></div></div>
      <div><div class="label">金額</div><div class="with-unit"><input class="field num" inputmode="numeric" placeholder="毎月変わる" value="${r?.amount || ''}" data-amt><span>円</span></div></div>
    </div>
    <p class="note">カードみたいに毎月変わるなら、金額は<b>空欄</b>でOK。カレンダーの赤丸から、その月の金額を先に入れておけます。29〜31日がない月は月末になります。</p>
    <div class="stack">
      <button class="btn btn-primary" data-save>保存</button>
      ${r ? '<button class="btn btn-danger" data-del>この予定を削除</button>' : ''}
    </div>`,
  s => {
    const segBtns = $$('[data-k]', s);
    const upd = () => {
      segBtns.forEach(b => b.classList.toggle('on', b.dataset.k === kind));
      $('[data-name]', s).placeholder = kind === 'income' ? '例：給料' : '例：楽天カード';
    };
    segBtns.forEach(b => b.onclick = () => { kind = b.dataset.k; upd(); });
    upd();
    if (!r) setTimeout(() => $('[data-name]', s).focus(), 250);
    $('[data-save]', s).onclick = () => {
      const name = $('[data-name]', s).value.trim();
      const day = toInt($('[data-day]', s).value);
      const amt = toInt($('[data-amt]', s).value);
      if (!name) { shake($('[data-name]', s)); return; }
      if (day < 1 || day > 31) { shake($('[data-day]', s)); return; }
      if (r) Object.assign(r, { name: name.slice(0, 20), kind, day, amount: amt });
      else D.rec.push({ id: uid(), name: name.slice(0, 20), kind, day, amount: amt, start: today(), skip: [] });
      save(); closeSheet(); processRecurring(); render(); toast('保存しました');
    };
    $('[data-del]', s)?.addEventListener('click', () => confirmSheet({
      title: `「${esc(r.name)}」を削除しますか？`, ok: '削除する', danger: true,
      body: 'これまでに記録された分はそのまま残ります。これからの予定は消えます。',
      onOk: () => { D.rec = D.rec.filter(x => x !== r); D.tx = D.tx.filter(x => !(x.rec === r.id && x.date > today())); save(); render(); toast('削除しました'); },
    }));
  });
}

/* ---------- アカウント ---------- */
function openRename() {
  openSheet(`<h3>名前</h3>
    <input class="field" maxlength="12" value="${esc(P.name)}" data-v style="margin-top:12px">
    <div class="stack"><button class="btn btn-primary" data-save>保存</button></div>`,
  s => {
    $('[data-save]', s).onclick = () => {
      const v = $('[data-v]', s).value.trim();
      if (!v) { shake($('[data-v]', s)); return; }
      P.name = v.slice(0, 12);
      setProfiles(getProfiles().map(p => p.id === P.id ? { ...p, name: P.name } : p));
      closeSheet(); render();
    };
  });
}

function saveProfile() { setProfiles(getProfiles().map(p => p.id === P.id ? P : p)); }

function openPinSettings() {
  if (!P.pin) {
    setPinFlow(pin => { P.pin = pin; saveProfile(); render(); toast('パスコードを設定しました'); });
    return;
  }
  openSheet(`<h3>パスコード</h3><p class="lead">アプリを開くときに4桁の数字を聞きます。</p>
    <div class="stack"><button class="btn btn-navy" data-change>パスコードを変更</button><button class="btn btn-danger" data-off>パスコードをオフにする</button></div>`,
  s => {
    $('[data-change]', s).onclick = () => verifyPinSheet('今のパスコード', () => setPinFlow(pin => { P.pin = pin; saveProfile(); render(); toast('パスコードを変更しました'); }));
    $('[data-off]', s).onclick = () => verifyPinSheet('今のパスコード', () => { P.pin = null; saveProfile(); render(); toast('パスコードをオフにしました'); });
  });
}

/* ---------- パスコード入力パッド ---------- */
function pinPadHTML(title, sub = '', left = '') {
  return `<div class="pin-title" data-pin-title>${title}</div><div class="pin-sub" data-pin-sub>${sub}</div>
    <div class="pin-dots">${'<i></i>'.repeat(4)}</div>
    <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}
      <button class="ghost" data-k="l">${left}</button><button data-k="0">0</button><button class="ghost" data-k="b" aria-label="消す">⌫</button></div>`;
}
function bindPinPad(el, onDone, onLeft) {
  let v = '', busy = false;
  const dots = $$('.pin-dots i', el), dotsWrap = $('.pin-dots', el);
  const upd = () => dots.forEach((d, i) => d.classList.toggle('f', i < v.length));
  const press = async k => {
    if (busy) return;
    if (k === 'l') { onLeft?.(); return; }
    if (k === 'b') v = v.slice(0, -1);
    else if (v.length < 4) v += k;
    upd();
    if (v.length === 4) {
      busy = true;
      const ok = await onDone(v);
      busy = false;
      if (ok === false) { shake(dotsWrap); setTimeout(() => { v = ''; upd(); }, 280); }
      else { v = ''; upd(); }
    }
  };
  $('.pinpad', el).addEventListener('click', e => { const b = e.target.closest('button'); if (b) press(b.dataset.k); });
  const onKey = e => {
    if (!document.body.contains(el)) { document.removeEventListener('keydown', onKey); return; }
    if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('b');
  };
  document.addEventListener('keydown', onKey);
}

const enc = new TextEncoder(), dec = new TextDecoder();
const randBytes = n => crypto.getRandomValues(new Uint8Array(n));
const toHex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha256hex(s) { return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))); }
async function makePin(pin) { const salt = toHex(randBytes(16)); return { salt, hash: await sha256hex(`${salt}:${pin}`) }; }
async function checkPin(profile, pin) { return !!profile.pin && await sha256hex(`${profile.pin.salt}:${pin}`) === profile.pin.hash; }

function setPinFlow(done) {
  let first = '';
  openSheet(pinPadHTML('新しいパスコード', '4桁の数字を決めてください', 'やめる'), s => {
    bindPinPad(s, async v => {
      if (!first) {
        first = v;
        $('[data-pin-title]', s).textContent = 'もう一度入力';
        $('[data-pin-sub]', s).textContent = '確認のため同じ数字を入れてください';
        return true;
      }
      if (v !== first) {
        first = '';
        $('[data-pin-title]', s).textContent = '新しいパスコード';
        $('[data-pin-sub]', s).textContent = '一致しませんでした。もう一度どうぞ';
        return false;
      }
      closeSheet();
      done(await makePin(v), v);
      return true;
    }, closeSheet);
  });
}

function verifyPinSheet(title, done) {
  openSheet(pinPadHTML(title, '', 'やめる'), s => {
    bindPinPad(s, async v => {
      if (!(await checkPin(P, v))) { $('[data-pin-sub]', s).textContent = 'ちがうみたいです'; return false; }
      closeSheet(); done(v); return true;
    }, closeSheet);
  });
}

/* =========================================================
   全画面：はじめて／ロック／アカウント選択／引き継ぎ
   ========================================================= */
function fullScreen(html) {
  P = null; D = null;
  closeSheet();
  tabbar.hidden = true;
  app.className = 'full';
  app.innerHTML = html;
  window.scrollTo(0, 0);
}

function openProfile(p) {
  P = p;
  D = normalize(store.get(`data:${p.id}`, null));
  store.set('last', p.id);
  view = 'home';
  showBal = false;
  padReset();
  calYM = ymOf(today());
  selDay = today();
  processedOn = '';
  render(false);
}

function showWelcome() {
  const hasOthers = getProfiles().length > 0;
  fullScreen(`<div class="screen">
    <div class="hero">${logo()}<h1>のこり</h1><p>ズボラでも続く、シンプル残高管理</p></div>
    <div class="card">
      <div class="label" style="margin-top:0">あなたの名前</div>
      <input class="field" maxlength="12" placeholder="例：まい" data-name>
      <div class="label">今の残高（だいたいでOK）</div>
      <div class="with-unit"><input class="field num" inputmode="numeric" placeholder="例：300000" data-bal><span>円</span></div>
      <div class="switch"><div><b>パスコードをかける</b><div class="note" style="margin:0">開くときに4桁の数字を聞きます</div></div><button class="toggle on" data-pin aria-label="パスコード"></button></div>
      <div class="stack"><button class="btn btn-primary" data-start>はじめる</button></div>
    </div>
    <div style="text-align:center;margin-top:16px">
      <button class="btn-text" data-file>機種変更：バックアップファイルから始める</button>
      ${hasOthers ? '<br><button class="btn-text" data-back>戻る</button>' : ''}
    </div>
    <p class="note" style="text-align:center">前のスマホで作った「引き継ぎリンク」を開いた場合は、そのまま読み込まれます。</p>
  </div>`);
  const pinBtn = $('[data-pin]', app);
  pinBtn.onclick = () => pinBtn.classList.toggle('on');
  $('[data-file]', app).onclick = pickImportFile;
  $('[data-back]', app)?.addEventListener('click', showPicker);
  $('[data-start]', app).onclick = () => {
    const name = $('[data-name]', app).value.trim();
    if (!name) { shake($('[data-name]', app)); $('[data-name]', app).focus(); return; }
    const base = toSignedInt($('[data-bal]', app).value);
    const create = pin => {
      const p = { id: uid(), name: name.slice(0, 12), pin: pin || null };
      setProfiles([...getProfiles(), p]);
      store.set(`data:${p.id}`, newData(base));
      openProfile(p);
      toast('ようこそ！金額をタップすると支出を登録できます');
    };
    if (pinBtn.classList.contains('on')) setPinFlow(pin => create(pin));
    else create(null);
  };
}

function showPicker() {
  const list = getProfiles();
  if (!list.length) return showWelcome();
  fullScreen(`<div class="screen">
    <div class="hero">${logo()}<h1>のこり</h1><p>だれが使いますか？</p></div>
    <div class="profiles">
      ${list.map(p => `<button class="profile-btn" data-id="${p.id}"><span class="avatar">${esc([...p.name][0] || '?')}</span>${esc(p.name)}<span class="lock">${p.pin ? '🔒' : ''}</span></button>`).join('')}
    </div>
    <div style="text-align:center;margin-top:18px"><button class="btn-text" data-new>＋ 新しいアカウントを作る</button></div>
  </div>`);
  $$('[data-id]', app).forEach(b => b.onclick = () => {
    const p = list.find(x => x.id === b.dataset.id);
    if (p.pin) showLock(p); else openProfile(p);
  });
  $('[data-new]', app).onclick = showWelcome;
}

function showLock(p) {
  const many = getProfiles().length > 1;
  fullScreen(`<div class="screen">
    <div class="hero"><div class="avatar" style="width:68px;height:68px;font-size:28px;margin:0 auto 12px">${esc([...p.name][0] || '?')}</div><h1 style="font-size:24px">${esc(p.name)}</h1></div>
    ${pinPadHTML('パスコードを入力')}
    <div style="text-align:center;margin-top:20px">
      ${many ? '<button class="btn-text" data-switch>アカウントを切り替え</button>' : ''}
      <button class="btn-text" data-forgot>パスコードを忘れた</button>
    </div>
  </div>`);
  bindPinPad(app, async v => {
    if (await checkPin(p, v)) { openProfile(p); return true; }
    $('[data-pin-sub]', app).textContent = 'ちがうみたいです';
    return false;
  });
  $('[data-switch]', app)?.addEventListener('click', showPicker);
  $('[data-forgot]', app).onclick = () => openSheet(`<h3>パスコードを忘れたとき</h3>
    <p class="lead">データはこのスマホの中だけにあるので、パスコードを元に戻す方法はありません。<br>どうしても思い出せないときは、データを消して最初からやり直せます。</p>
    <div class="stack"><button class="btn btn-danger" data-reset>${esc(p.name)}のデータを消してやり直す</button><button class="btn btn-text" data-cancel>もう少し思い出してみる</button></div>`,
  s => {
    $('[data-cancel]', s).onclick = closeSheet;
    $('[data-reset]', s).onclick = () => { closeSheet(); confirmDeleteAccount(p); };
  });
}

function confirmDeleteAccount(p) {
  confirmSheet({
    title: `${esc(p.name)}のデータを削除しますか？`, ok: '完全に削除する', danger: true,
    body: '残高・履歴・設定がすべて消えて、元に戻せません。',
    onOk: () => {
      store.del(`data:${p.id}`);
      setProfiles(getProfiles().filter(x => x.id !== p.id));
      if (store.get('last', null) === p.id) store.del('last');
      boot();
    },
  });
}

/* =========================================================
   引き継ぎ（リンク／ファイル）
   ========================================================= */
const b64u = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64u = str => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
async function pipeBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function aesKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function exportObject(trimMonths = 0) {
  const d = JSON.parse(JSON.stringify(D));
  if (trimMonths) {
    // 古い履歴を残高に畳み込んで、リンクを短くする
    const cutoff = `${addMonths(ymOf(today()), -(trimMonths - 1))}-01`;
    for (const x of d.tx) if (x.date < cutoff) d.base += sv(x);
    d.tx = d.tx.filter(x => x.date >= cutoff);
    for (const r of d.rec) if (r.start < cutoff) r.start = cutoff;
  }
  d.tx = d.tx.map(({ id, ...rest }) => rest);
  return { app: 'nokori', v: 1, p: { id: P.id, name: P.name, pin: P.pin || null }, d };
}

async function encodeTransfer(obj, pin) {
  let body = enc.encode(JSON.stringify(obj)), flags = 0;
  if ('CompressionStream' in window) { body = await pipeBytes(body, new CompressionStream('deflate-raw')); flags |= 1; }
  if (pin) {
    const salt = randBytes(16), iv = randBytes(12);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(pin, salt), body));
    body = concat(salt, iv, ct); flags |= 2;
  }
  return b64u(concat(new Uint8Array([flags]), body));
}

async function decodeTransfer(str, pin) {
  const all = unb64u(str);
  const flags = all[0];
  let body = all.subarray(1);
  if (flags & 2) {
    const key = await aesKey(pin, body.subarray(0, 16));
    body = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: body.subarray(16, 28) }, key, body.subarray(28)));
  }
  if (flags & 1) {
    if (!('DecompressionStream' in window)) throw new Error('unsupported');
    body = await pipeBytes(body, new DecompressionStream('deflate-raw'));
  }
  return JSON.parse(dec.decode(body));
}
const isEncrypted = str => { try { return (unb64u(str.slice(0, 4))[0] & 2) === 2; } catch { return false; } };
const validImport = o => o && o.app === 'nokori' && o.d && Array.isArray(o.d.tx) && o.p && o.p.name;

function openTransfer() {
  const make = async (pin, trim = 0) => {
    const obj = exportObject(trim);
    const code = await encodeTransfer(obj, pin);
    const url = `${location.origin}${location.pathname}#import=${code}`;
    showLink(url, pin, trim, obj.d.tx.length);
  };
  const showLink = (url, pin, trim, count) => {
    const long = url.length > 9000;
    openSheet(`<h3>引き継ぎリンク</h3>
      <p class="lead">新しいスマホでこのリンクを開くと、今のデータのまま使い始められます。${pin ? '開くときに<b>今のパスコード</b>を聞かれます。' : ''}</p>
      <div class="linkbox">${esc(url.slice(0, 200))}…</div>
      <p class="note">記録 ${count}件${trim ? `（直近${trim}か月分。それより前は残高にまとめています）` : ''}・${url.length.toLocaleString()}文字</p>
      ${long ? `<div class="warn">リンクが長いので、LINEだと送れないことがあります。メール・AirDrop・メモアプリで送るか、短いリンクを作ってください。</div>` : ''}
      ${pin ? '' : '<div class="warn">パスコードがオフなので、リンクを知っている人は中身を見られます。自分にだけ送ってください。</div>'}
      <div class="stack">
        ${navigator.share ? '<button class="btn btn-primary" data-share>リンクを送る</button>' : ''}
        <button class="btn ${navigator.share ? 'btn-white' : 'btn-primary'}" data-copy>リンクをコピー</button>
        ${long && !trim ? '<button class="btn btn-white" data-short>直近3か月だけの短いリンクにする</button>' : ''}
      </div>
      <p class="note">新しいスマホでは、先に「ホーム画面に追加」してからそのアプリでリンクを開くのが確実です。うまくいかないときは「バックアップをファイルに保存」も使えます。</p>`,
    s => {
      $('[data-share]', s)?.addEventListener('click', () => navigator.share({ title: 'のこり 引き継ぎリンク', url }).catch(() => {}));
      $('[data-copy]', s).onclick = async () => {
        try { await navigator.clipboard.writeText(url); toast('コピーしました'); }
        catch { prompt('このリンクをコピーしてください', url); }
      };
      $('[data-short]', s)?.addEventListener('click', () => make(pin, 3));
    });
  };
  if (P.pin) verifyPinSheet('今のパスコードを入力', pin => make(pin).catch(() => toast('リンクを作れませんでした')));
  else make(null).catch(() => toast('リンクを作れませんでした'));
}

async function exportFile() {
  const obj = exportObject();
  const name = `nokori-${P.name}-${today()}.json`;
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('バックアップを保存しました');
}

function pickImportFile() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const f = inp.files?.[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (!validImport(obj)) throw new Error('invalid');
      confirmImport(obj);
    } catch { toast('のこりのバックアップファイルではないようです'); }
  };
  inp.click();
}

function confirmImport(obj, { fromLink = false } = {}) {
  const d = normalize(obj.d);
  const exists = getProfiles().find(p => p.id === obj.p.id);
  const bal = (() => { let b = d.base; for (const x of d.tx) if (x.date <= today()) b += sv(x); return b; })();
  const body = `<div class="card" style="margin-top:12px">
      <div style="display:flex;gap:12px;align-items:center"><span class="avatar">${esc([...obj.p.name][0] || '?')}</span><b style="font-size:18px">${esc(obj.p.name)}</b></div>
      <p class="note">残高 <b class="num" style="color:var(--ink)">${bal < 0 ? '−' : ''}${yen(bal)}</b> ・ 記録 ${d.tx.length}件 ・ 毎月の予定 ${d.rec.length}件</p>
    </div>
    ${exists ? `<div class="warn">このスマホにある「${esc(exists.name)}」のデータは、この内容で上書きされます。</div>` : ''}`;
  const apply = () => {
    const p = { id: obj.p.id || uid(), name: String(obj.p.name).slice(0, 12), pin: obj.p.pin || null };
    store.set(`data:${p.id}`, d);
    const list = getProfiles().filter(x => x.id !== p.id);
    setProfiles([...list, p]);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    openProfile(p);
    toast('引き継ぎが完了しました');
  };
  if (fromLink) {
    fullScreen(`<div class="screen"><div class="hero">${logo()}<h1>データの引き継ぎ</h1><p>この内容をこのスマホで使います</p></div>
      ${body}
      <div class="stack"><button class="btn btn-primary" data-ok>このスマホで使いはじめる</button><button class="btn btn-text" data-cancel>やめる</button></div></div>`);
    $('[data-ok]', app).onclick = apply;
    $('[data-cancel]', app).onclick = () => { history.replaceState(null, '', location.pathname + location.search); boot(); };
  } else {
    openSheet(`<h3>このデータを読み込みますか？</h3>${body}
      <div class="stack"><button class="btn btn-primary" data-ok>読み込む</button><button class="btn btn-text" data-cancel>やめる</button></div>`,
    s => { $('[data-ok]', s).onclick = () => { closeSheet(); apply(); }; $('[data-cancel]', s).onclick = closeSheet; });
  }
}

function handleImportLink(code) {
  const cancel = () => { history.replaceState(null, '', location.pathname + location.search); boot(); };
  const fail = msg => {
    fullScreen(`<div class="screen"><div class="hero">${logo()}<h1>読み込めませんでした</h1><p>${msg}</p></div>
      <div class="stack"><button class="btn btn-navy" data-back>戻る</button></div></div>`);
    $('[data-back]', app).onclick = cancel;
  };
  if (!isEncrypted(code)) {
    decodeTransfer(code).then(o => validImport(o) ? confirmImport(o, { fromLink: true }) : fail('リンクが途中で切れているかもしれません。'))
      .catch(e => fail(e?.message === 'unsupported' ? 'このブラウザは対応していません。iPhoneならiOSを最新にしてSafariで開いてください。' : 'リンクが途中で切れているかもしれません。'));
    return;
  }
  fullScreen(`<div class="screen"><div class="hero">${logo()}<h1 style="font-size:24px">データの引き継ぎ</h1><p>前のスマホで使っていたパスコードを入れてください</p></div>
    ${pinPadHTML('パスコード', '', 'やめる')}</div>`);
  bindPinPad(app, async v => {
    try {
      const o = await decodeTransfer(code, v);
      if (!validImport(o)) { fail('リンクが途中で切れているかもしれません。'); return true; }
      confirmImport(o, { fromLink: true });
      return true;
    } catch (e) {
      if (e?.message === 'unsupported') { fail('このブラウザは対応していません。iOSを最新にしてください。'); return true; }
      $('[data-pin-sub]', app).textContent = 'ちがうみたいです';
      return false;
    }
  }, cancel);
}

/* =========================================================
   起動
   ========================================================= */
function boot() {
  const m = location.hash.match(/^#import=([A-Za-z0-9_-]+)/);
  if (m) return handleImportLink(m[1]);
  const list = getProfiles();
  if (!list.length) return showWelcome();
  const last = list.find(p => p.id === store.get('last', null));
  if (!last) return list.length === 1 ? (list[0].pin ? showLock(list[0]) : openProfile(list[0])) : showPicker();
  if (last.pin) showLock(last); else openProfile(last);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); if (P && showBal) { showBal = false; if (!$('#sheet-root').innerHTML) render(); } return; }
  if (!P) return;
  if (P.pin && hiddenAt && Date.now() - hiddenAt > 3 * 60 * 1000) { showLock(P); return; }
  if (processedOn !== today() && !$('#sheet-root').innerHTML) render();
});
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#import=')) boot(); });

navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
}
boot();
