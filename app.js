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
    { id: 'food', label: 'ごはん', icon: 'food' },
    { id: 'conv', label: 'コンビニ', icon: 'conv' },
    { id: 'cafe', label: 'カフェ', icon: 'cafe' },
    { id: 'drink', label: '飲み会', icon: 'drink' },
    { id: 'daily', label: '日用品', icon: 'daily' },
    { id: 'trans', label: '交通', icon: 'trans' },
    { id: 'shop', label: '買い物', icon: 'shop' },
    { id: 'date', label: 'デート', icon: 'date' },
    { id: 'beauty', label: '美容', icon: 'beauty' },
    { id: 'fun', label: '趣味', icon: 'fun' },
    { id: 'health', label: '病院・薬', icon: 'health' },
    { id: 'other', label: 'その他', icon: 'other' },
  ],
  income: [
    { id: 'salary', label: '給料', icon: 'salary' },
    { id: 'bonus', label: '臨時収入', icon: 'bonus' },
    { id: 'refund', label: '返金', icon: 'refund' },
    { id: 'other', label: 'その他', icon: 'other' },
  ],
};
/* ---------- アイコン（細い線） ---------- */
const GLYPH = {
  purse: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z"/><path d="M6 6V5a2 2 0 0 1 2-2h8"/>',
  house: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-2 4-2 5-1-1-2-2-2-4-2 2-4 5-4 9a6 6 0 0 0 6 6z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  wifi: '<path d="M3 9.5a13 13 0 0 1 18 0"/><path d="M6.5 13a8 8 0 0 1 11 0"/><path d="M10 16.5a3 3 0 0 1 4 0"/><circle cx="12" cy="19.5" r=".6"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5"/>',
  conv: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 11z"/><path d="M5 13v7h14v-7"/><path d="M10 20v-4h4v4"/>',
  cafe: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3.5c0 1.5-1 1.5-1 3M13 3.5c0 1.5-1 1.5-1 3"/>',
  drink: '<path d="M6 7h10v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M16 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M6 7a2.5 2.5 0 0 1 2.5-3 3 3 0 0 1 5 0A2.5 2.5 0 0 1 16 7"/><path d="M9.5 11v6M12.5 11v6"/>',
  daily: '<path d="M9 3h6v3H9z"/><path d="M8 6h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z"/><path d="M10 13h4"/>',
  trans: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14"/><circle cx="9" cy="13.5" r=".8"/><circle cx="15" cy="13.5" r=".8"/><path d="M8 21l2-4M16 21l-2-4"/>',
  shop: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  date: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  beauty: '<path d="M9 21h6v-9H9z"/><path d="M10 12V7l4-3v8"/>',
  fun: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M7.5 11v4M5.5 13h4"/><circle cx="15.5" cy="12" r=".8"/><circle cx="17.5" cy="14" r=".8"/>',
  health: '<rect x="3.5" y="9" width="17" height="7" rx="3.5" transform="rotate(-35 12 12.5)"/><path d="M9.4 9.2l4.2 6"/>',
  other: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  salary: '<circle cx="12" cy="12" r="8.5"/><path d="M9 8l3 4 3-4M12 12v5M9.5 13h5M9.5 15.5h5"/>',
  bonus: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1"/>',
  refund: '<path d="M9 7L5 11l4 4"/><path d="M5 11h9a5 5 0 0 1 0 10h-2"/>',
  bank: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  adj: '<path d="M4 7h16M4 12h10M4 17h6"/><circle cx="17" cy="15" r="3"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  face: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a3.5 3.5 0 0 0 5 0"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
};
const glyph = (k, sw = 1.5) => `<svg class="gl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[k] || GLYPH.other}</svg>`;
/* ---------- カテゴリのイラスト（太線＋ライム） ---------- */
const ILLUST = {
 "food": "<path d=\"M10 30h44c0 12-9 22-22 22S10 42 10 30z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M18 30c2-5 7-8 14-8s12 3 14 8\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M22 52h20\"  fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M40 8l-6 16M48 10l-8 15\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"28\" cy=\"26\" r=\"1.6\" fill=\"#1C1F24\"/><circle cx=\"35\" cy=\"25\" r=\"1.6\" fill=\"#1C1F24\"/>",
 "conv": "<path d=\"M12 26h40v26H12z\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M9 18l4-8h38l4 8v4a6 6 0 0 1-11.5 2 6 6 0 0 1-11.5 0 6 6 0 0 1-11.5 0A6 6 0 0 1 9 22z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M26 52V38h12v14\" fill=\"#E3E5E0\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M16 34h6M42 34h6\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
 "cafe": "<path d=\"M14 24h30v16c0 7-6 13-13 13h-4c-7 0-13-6-13-13z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M44 28h3a6 6 0 0 1 0 12h-3\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M10 56h40\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M24 8c-3 4 3 6 0 10M33 8c-3 4 3 6 0 10\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M14 30h30\" stroke=\"#FFFFFF\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
 "drink": "<path d=\"M14 20h28v32a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M42 26h6a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-6\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M12 20a6 6 0 0 1 6-8 7 7 0 0 1 12-2 7 7 0 0 1 12 4 5 5 0 0 1 2 6\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M22 30v16M30 30v16\" stroke=\"#FFFFFF\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
 "daily": "<path d=\"M24 8h16v8H24z\" fill=\"#E3E5E0\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M20 16h24l4 8v26a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V24z\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M17 30h30v14H17z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"46\" cy=\"10\" r=\"2\" fill=\"#1C1F24\"/><circle cx=\"51\" cy=\"15\" r=\"1.4\" fill=\"#1C1F24\"/>",
 "trans": "<rect x=\"14\" y=\"8\" width=\"36\" height=\"40\" rx=\"8\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M14 28h36\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><rect x=\"20\" y=\"14\" width=\"24\" height=\"10\" rx=\"3\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"23\" cy=\"37\" r=\"3\" fill=\"#1C1F24\"/><circle cx=\"41\" cy=\"37\" r=\"3\" fill=\"#1C1F24\"/><path d=\"M20 56l5-8M44 56l-5-8\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
 "shop": "<path d=\"M12 22h40l-3 32H15z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M23 22v-4a9 9 0 0 1 18 0v4\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M24 34c2 5 14 5 16 0\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
 "date": "<path d=\"M32 54S10 41 10 24a11 11 0 0 1 22-4 11 11 0 0 1 22 4c0 17-22 30-22 30z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M20 22a5 5 0 0 1 6-4\" stroke=\"#FFFFFF\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M50 8l2 4 4 1-4 1-2 4-2-4-4-1 4-1z\" fill=\"#1C1F24\"/>",
 "beauty": "<rect x=\"22\" y=\"34\" width=\"20\" height=\"22\" rx=\"3\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M24 34V20l12-10v24\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M22 42h20\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
 "fun": "<rect x=\"6\" y=\"20\" width=\"52\" height=\"28\" rx=\"14\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M18 29v10M13 34h10\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"42\" cy=\"31\" r=\"3\" fill=\"#1C1F24\"/><circle cx=\"48\" cy=\"37\" r=\"3\" fill=\"#1C1F24\"/>",
 "health": "<g transform=\"rotate(-40 32 32)\"><rect x=\"10\" y=\"22\" width=\"44\" height=\"20\" rx=\"10\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M32 22h12a10 10 0 0 1 0 20H32z\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></g>",
 "other": "<path d=\"M10 22l22-12 22 12v22L32 56 10 44z\" fill=\"#FFFFFF\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M10 22l22 12 22-12\" fill=\"#B8F23A\"  stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M32 34v22\" fill=\"none\" stroke=\"#1C1F24\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
};
const catArt = c => ILLUST[c.id] ? `<span class="ill"><svg viewBox="0 0 64 64" aria-hidden="true">${ILLUST[c.id].replaceAll('fill="#B8F23A"', 'style="fill:var(--lime)"')}</svg></span>` : glyph(c.icon);

// アプリの色（アクセント・その濃い色・背景）。最初は「ライム」
const THEMES = {
  lime: { name: 'ライム', a: '#B8F23A', d: '#86B81C', bg: '#F1F2F0' },
  sakura: { name: 'さくら', a: '#FF9EBB', d: '#E0708F', bg: '#F7F1F2' },
  lavender: { name: 'ラベンダー', a: '#BBA6FF', d: '#8F75E6', bg: '#F3F1F7' },
  mint: { name: 'ミント', a: '#86E3C8', d: '#4FB89A', bg: '#EFF4F2' },
  sky: { name: 'スカイ', a: '#9CCBFF', d: '#5B9BE0', bg: '#F0F3F7' },
  orange: { name: 'みかん', a: '#FFBE72', d: '#E0903C', bg: '#F7F3EE' },
};
function applyTheme(id = 'lime') {
  const t = THEMES[id] || THEMES.lime, st = document.documentElement.style;
  st.setProperty('--lime', t.a); st.setProperty('--mint', t.a); st.setProperty('--lime-dark', t.d); st.setProperty('--bg', t.bg);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
}

// お金を使わなかった日のスタンプ（40×40のSVG）
const STAMPS = {
  zero: { name: '0円', svg: '<circle cx="20" cy="20" r="17" style="fill:var(--lime)"/><text x="20" y="24.5" font-size="11" font-weight="900" text-anchor="middle" fill="#16181C" font-family="sans-serif">0円</text>' },
  heart: { name: 'ハート', svg: '<path d="M20 34s-13-7.8-13-17a7 7 0 0 1 13-3.6A7 7 0 0 1 33 17c0 9.2-13 17-13 17z" fill="#FF8FB1"/><path d="M13 14a4 4 0 0 1 4-2.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>' },
  star: { name: 'ほし', svg: '<path d="M20 4l4.6 9.6 10.4 1.4-7.6 7.3 1.9 10.4L20 27.8l-9.3 4.9 1.9-10.4L5 15l10.4-1.4z" fill="#FFD25A" stroke="#E8B53A" stroke-width="1.5" stroke-linejoin="round"/><circle cx="16.5" cy="19" r="1.3" fill="#7a5414"/><circle cx="23.5" cy="19" r="1.3" fill="#7a5414"/><path d="M17.5 22.5q2.5 2 5 0" stroke="#7a5414" stroke-width="1.3" fill="none" stroke-linecap="round"/>' },
  paw: { name: 'にくきゅう', svg: '<ellipse cx="20" cy="25" rx="8" ry="7" fill="#F4A6A0"/><circle cx="10.5" cy="16" r="3.6" fill="#F4A6A0"/><circle cx="16" cy="10.5" r="3.6" fill="#F4A6A0"/><circle cx="24" cy="10.5" r="3.6" fill="#F4A6A0"/><circle cx="29.5" cy="16" r="3.6" fill="#F4A6A0"/>' },
  flower: { name: 'おはな', svg: [0, 72, 144, 216, 288].map(a => `<ellipse cx="20" cy="10" rx="6" ry="8" fill="#FFB7CE" transform="rotate(${a} 20 20)"/>`).join('') + '<circle cx="20" cy="20" r="5" fill="#FFE07A"/>' },
  smile: { name: 'にこちゃん', svg: '<circle cx="20" cy="20" r="16" fill="#8EC5FF"/><circle cx="14.5" cy="17" r="2" fill="#16181C"/><circle cx="25.5" cy="17" r="2" fill="#16181C"/><path d="M13 23q7 7 14 0" stroke="#16181C" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="11" cy="22" r="2.2" fill="#FF8FB1" opacity=".6"/><circle cx="29" cy="22" r="2.2" fill="#FF8FB1" opacity=".6"/>' },
};
const stampSvg = (k, cls = '') => STAMPS[k] ? `<svg class="${cls}" viewBox="0 0 40 40" aria-hidden="true">${STAMPS[k].svg}</svg>` : '';
const catOf = (kind, id) => (CATS[kind] || []).find(c => c.id === id);


/* ---------- アイコン ---------- */
const ICON = {
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z"/><path d="M6 6V5a2 2 0 0 1 2-2h8"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" stroke="none"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.7 3.6M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>',
  grow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M4 16l5-5 4 3 7-8"/><path d="M15 6h5v5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
};
const logo = (cls = '') => `<div class="logo ${cls}"><i></i></div>`;

/* =========================================================
   状態
   ========================================================= */
let P = null;          // 開いているプロフィール {id, name, pin:{salt,hash}|null}
let D = null;          // そのデータ
let view = 'home';
let calYM = ymOf(today());
let selDay = null; // カレンダーでタップした日（タップするまで何も開かない）
// 金額パッド（よく使う金額のワンタップ＋テンキー）
// padFresh = よく使う金額を押した直後。次に数字を押すと打ち直し、⌫なら続きを直せる
const QUICK_DEFAULT = [500, 1000, 1500, 2000, 3000];
const PAD_MAX = 7;
let padStr = '', padFresh = false;
const padAmount = () => Number(padStr) || 0;
const padReset = () => { padStr = ''; padFresh = false; };
// 支払い方法：前回使ったものが最初から選ばれている
const padPmNow = () => D.pmLast && D.pm.some(p => p.id === D.pmLast) ? D.pmLast : 'cash';
function padKey(k) {
  if (padFresh) { padStr = ''; padFresh = false; }
  if (!padStr && k.startsWith('0')) return;
  if (padStr.length + k.length > PAD_MAX) return;
  padStr += k;
}
function padBack() { padFresh = false; padStr = padStr.slice(0, -1); }
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
  d.quick = Array.isArray(d.quick) && d.quick.length === QUICK_DEFAULT.length && d.quick.every(v => Number(v) > 0) ? d.quick.map(Number) : QUICK_DEFAULT.slice();
  for (const x of d.tx) { if (!x.id) x.id = uid(); x.amount = Number(x.amount) || 0; }
  for (const r of d.rec) {
    r.skip = Array.isArray(r.skip) ? r.skip : []; r.amount = Number(r.amount) || 0; r.day = Math.min(31, Math.max(1, Number(r.day) || 1));
    if (r.freq === 'year') r.month = Math.min(12, Math.max(1, Number(r.month) || 1)); else delete r.freq;
  }
  d.acc = Array.isArray(d.acc) ? d.acc.filter(a => a && a.id && a.id !== 'main' && a.name) : [];
  for (const a of d.acc) a.base = Number(a.base) || 0;
  d.mainName = typeof d.mainName === 'string' && d.mainName.trim() ? d.mainName.trim().slice(0, 16) : 'メイン口座';
  d.pm = Array.isArray(d.pm) ? d.pm.filter(p => p && p.id && p.name) : [];
  for (const p of d.pm) { p.type = p.type === 'card' ? 'card' : 'instant'; if (p.type === 'card') { p.close = Math.min(31, Math.max(0, Number(p.close) || 0)); p.pay = Math.min(31, Math.max(1, Number(p.pay) || 27)); p.off = p.off === 2 ? 2 : 1; } }
  if (!THEMES[d.theme]) d.theme = 'lime';
  // 使い方：ざっくり / しっかり管理（前からカード・口座・予算を使っている人は、しっかり）
  if (d.mode !== 'easy' && d.mode !== 'pro') d.mode = d.pm.length || d.acc.length || (d.budget && Object.keys(d.budget).length) ? 'pro' : 'easy';
  // 今月使えるお金の決め方：自動 / 自分で決める（amount＝毎月、months＝その月だけ）
  const sp = d.spend && typeof d.spend === 'object' ? d.spend : {};
  d.spend = { mode: sp.mode === 'fixed' ? 'fixed' : 'auto', amount: Math.max(0, Number(sp.amount) || 0), months: {} };
  for (const [k, v] of Object.entries(sp.months && typeof sp.months === 'object' ? sp.months : {})) if (/^\d{4}-\d{2}$/.test(k) && Number(v) > 0) d.spend.months[k] = Number(v);
  if (d.stamp !== 'none' && !STAMPS[d.stamp]) d.stamp = 'zero';
  const bud = {};
  for (const [k, v] of Object.entries(d.budget && typeof d.budget === 'object' ? d.budget : {})) if (Number(v) > 0 && catOf('expense', k)) bud[k] = Number(v);
  d.budget = bud;
  return d;
}
function save() { if (P && D) store.set(`data:${P.id}`, D); }

/* ---------- 計算 ---------- */
const sv = x => x.kind === 'income' ? x.amount : x.kind === 'expense' ? -x.amount : x.amount; // adjust は符号つき
const occDate = (r, ym) => `${ym}-${pad(Math.min(r.day, dim(ym)))}`;
// 毎年の予定は、その月だけ
const recIn = (r, ym) => r.freq !== 'year' || monthNum(ym) === r.month;

/* ---------- 支払い方法（カード・PayPayなど） ----------
   カードで払った支出は、口座の残高からはすぐ引かず、引き落とし日にまとめて引く。
   「使えるお金」＝口座の残高 − カードの引き落とし待ち。 */
const cardOf = id => D.pm.find(p => p.id === id && p.type === 'card');
const isCardBuy = x => x.kind === 'expense' && !x.rec && !!x.pm && !!cardOf(x.pm);
const cardRec = c => D.rec.find(r => r.pm === c.id);
const pmLabel = id => id === 'cash' ? '現金' : D.pm.find(p => p.id === id)?.name || '現金';
const closeText = c => `${c.close ? `${c.close}日` : '月末'}締め・${c.off === 2 ? '翌々月' : '翌月'}${c.pay}日`;
// その日の買い物が、何月の引き落としになるか
function payYmOf(c, date) {
  const ym = ymOf(date), d = Number(date.slice(8));
  const closeYm = !c.close || d <= Math.min(c.close, dim(ym)) ? ym : addMonths(ym, 1);
  return addMonths(closeYm, c.off);
}
// その引き落とし月に入る、記録したカードの買い物の合計
function cardBuys(c, payYm) { return D.tx.filter(x => isCardBuy(x) && x.pm === c.id && payYmOf(c, x.date) === payYm); }
const cardSum = (c, payYm) => cardBuys(c, payYm).reduce((a, x) => a + x.amount, 0);
// 引き落とし額（明細の金額で合わせてあればそれ、なければ記録の合計）
function cardDue(c, payYm) {
  const r = cardRec(c), tx = r && D.tx.find(x => x.rec === r.id && x.ym === payYm);
  return tx ? tx.amount : cardSum(c, payYm);
}
// まだ口座から引かれていないカードの分（引き落とし月ごと）
function cardPending(c) {
  const t = today(), r = cardRec(c), yms = new Set(D.tx.filter(x => isCardBuy(x) && x.pm === c.id).map(x => payYmOf(c, x.date)));
  if (r) for (const x of D.tx) if (x.rec === r.id && x.date > t) yms.add(x.ym);
  const out = [];
  for (const ym of [...yms].sort()) {
    const paid = r && D.tx.some(x => x.rec === r.id && x.ym === ym && x.date <= t);
    if (paid) continue;
    const amt = cardDue(c, ym);
    if (amt) out.push({ ym, amt, date: r ? occDate(r, ym) : `${ym}-${pad(Math.min(c.pay, dim(ym)))}` });
  }
  return out;
}
const cardOutstanding = () => D.pm.filter(p => p.type === 'card').reduce((a, c) => a + cardPending(c).reduce((s, x) => s + x.amt, 0), 0);
const hasCards = () => D.pm.some(p => p.type === 'card');
const usable = () => balance() - cardOutstanding();
const isPro = () => D.mode === 'pro';

/* ---------- 今月あと使えるお金 ----------
   自動：今月の収入 − 毎月の支払い − 貯金したい額（目標から） − 今月もう使ったお金
   自分で決める：1か月の予算（その月だけの金額があればそれ） − 今月もう使ったお金
   「使ったお金」はふだんの支出（予定・引き落としは入れない）。カードの引き落としは、記録した買い物との差だけを支払いに数える。 */
function monthPlan(ym = ymOf(today())) {
  const t = today();
  const spent = D.tx.filter(x => isVariable(x) && ymOf(x.date) === ym && x.date <= t).reduce((a, x) => a + x.amount, 0);
  if (D.spend.mode === 'fixed') {
    const budget = D.spend.months[ym] || D.spend.amount;
    return { mode: 'fixed', budget, spent, left: budget - spent, ready: budget > 0 };
  }
  const recOf = id => D.rec.find(r => r.id === id);
  const cardPart = (r, amt, y) => { const c = r?.pm && cardOf(r.pm); return c ? Math.max(0, amt - cardSum(c, y)) : amt; };
  let inc = 0, out = 0;
  for (const x of D.tx) {
    if (ymOf(x.date) !== ym || x.adj) continue;
    if (x.kind === 'income') inc += x.amount;
    else if (x.kind === 'expense' && (x.rec || x.plan)) out += x.rec ? cardPart(recOf(x.rec), x.amount, x.ym) : x.amount;
  }
  for (const v of virtuals(ym)) {
    const r = recOf(v.rec), amt = v.amount || (r ? recAmountFor(r, ym) : 0);
    if (v.kind === 'income') inc += amt; else out += cardPart(r, amt, ym);
  }
  let save = 0;
  const g = D.goal;
  if (g && g.ym >= ym) save = Math.max(0, Math.ceil((g.amount - usable()) / (monthsBetween(ym, g.ym) + 1) / 100) * 100);
  const budget = inc - out - save;
  return { mode: 'auto', inc, out, save, spent, budget, left: budget - spent, ready: inc > 0 };
}

/* ---------- 口座 ----------
   メイン口座（D.base が最初の残高）＋追加した口座（D.acc）。
   記録がどの口座のお金かは：予定→予定の口座、PayPayなど→その口座、カードの引き落とし→カードの口座、それ以外（現金・手入力）→記録の acc かメイン。 */
const accList = () => [{ id: 'main', name: D.mainName, base: D.base }, ...D.acc];
const multiAcc = () => D.acc.length > 0;
const accName = id => accList().find(a => a.id === id)?.name || D.mainName;
const validAcc = id => id === 'main' || D.acc.some(a => a.id === id) ? id : 'main';
function accOfTx(x) {
  if (x.rec) { const r = D.rec.find(r => r.id === x.rec); const c = r?.pm && cardOf(r.pm); return validAcc(c ? c.acc : r?.acc); }
  if (x.pm) { const p = D.pm.find(p => p.id === x.pm); if (p && p.type === 'instant') return validAcc(p.acc); }
  return validAcc(x.acc);
}
function accBalance(id, upTo = today()) {
  let b = id === 'main' ? D.base : (D.acc.find(a => a.id === id)?.base || 0);
  for (const x of D.tx) if (x.date <= upTo && !isCardBuy(x) && accOfTx(x) === id) b += sv(x);
  return b;
}

function balance(upTo = today()) {
  let b = D.base + D.acc.reduce((a, x) => a + x.base, 0);
  for (const x of D.tx) if (x.date <= upTo && !isCardBuy(x)) b += sv(x);
  return b;
}

// 毎月の予定（金額が決まっているもの）を、当日になったら記録にする
function processRecurring() {
  const t = today();
  let changed = false;
  for (const r of D.rec) {
    const card = r.pm && cardOf(r.pm);
    if (!r.amount && !card) continue;
    for (let ym = ymOf(r.start); ym <= ymOf(t); ym = addMonths(ym, 1)) {
      if (!recIn(r, ym)) continue;
      const date = occDate(r, ym);
      if (date < r.start || date > t || r.skip.includes(ym)) continue;
      if (D.tx.some(x => x.rec === r.id && x.ym === ym)) continue;
      const amount = card ? cardSum(card, ym) : r.amount;
      if (!amount) continue;
      D.tx.push({ id: uid(), date, kind: r.kind, amount, rec: r.id, ym, name: r.name });
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
    if (ym < ymOf(r.start) || !recIn(r, ym)) continue;
    const date = occDate(r, ym);
    if (date < r.start || r.skip.includes(ym)) continue;
    if (D.tx.some(x => x.rec === r.id && x.ym === ym)) continue;
    const card = r.pm && cardOf(r.pm);
    const amount = card ? cardSum(card, ym) : r.amount;
    if (card && !amount) continue; // カードで何も買っていない月は出さない
    if (date <= t && amount) continue;
    out.push({ virtual: true, rec: r.id, ym, date, kind: r.kind, amount, name: r.name });
  }
  return out;
}

function ringsOf(ym) {
  const rings = {};
  for (const r of D.rec) {
    if (ym < ymOf(r.start) || !recIn(r, ym)) continue;
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
    else if (x.kind === 'expense') {
      if (x.rec || x.plan) { const r = x.rec && D.rec.find(r => r.id === x.rec), c = r?.pm && cardOf(r.pm); fixed += c ? Math.max(0, x.amount - cardSum(c, x.ym)) : x.amount; }
      else spent += x.amount;
    }
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
  if (x.kind === 'adjust') return glyph('pen');
  if (x.adj) return glyph('adj');
  if (x.rec || x.name) return glyph(D.rec.find(r => r.id === x.rec)?.icon || (x.kind === 'income' ? 'salary' : 'bank'));
  const c = catOf(x.kind, x.cat);
  if (c) return glyph(c.icon);
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
  return `<button class="item ${x.kind === 'income' ? 'k-inc' : x.kind === 'expense' ? 'k-exp' : ''}" ${act}>
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
    <div><h1>ZUBO</h1><div class="sub">${esc(P.name)}の残高</div></div>
    <div class="date">${fmtYMD(today())}</div>
  </header>`;
}

function viewHome() {
  const t = today(), ym = ymOf(t), plan = monthPlan(ym);
  const recent = sortTx(D.tx.filter(x => x.date <= t)).slice(0, 5);
  const daysLeft = dim(ym) - Number(t.slice(8)) + 1;
  const money = n => showBal ? `${n < 0 ? '−' : ''}${yen(n)}` : '¥••••••';
  const used = plan.budget > 0 ? Math.min(1, Math.max(0, plan.spent / plan.budget)) : 0;
  const installTip = isIOS() && !isStandalone()
    ? `<div class="notice n-warn"><div class="ni">${glyph('warn', 2)}</div>
        <div class="nt"><b>このままだとデータが消えることがあります</b>Safariで開いています。共有ボタン →「ホーム画面に追加」して、そこから使ってください。</div></div>` : '';
  const pro = isPro() && multiAcc();
  return `${installTip}
  <div class="zlogo"><b>ZUBO<i></i></b></div>
  <section class="balance slim lv">
    <div class="k"><button class="lv-t" data-act="spend-set">今月あと使えるお金 ›</button>${eyeBtn()}</div>
    ${plan.ready ? `<div class="v num ${plan.left < 0 ? 'over' : ''}"><span>${money(plan.left)}</span><small>${plan.left > 0 ? `1日あたり ${showBal ? yen(Math.floor(plan.left / daysLeft)) : '¥••••'}` : plan.left < 0 ? '使いすぎ' : ''}</small></div>
      <div class="lv-bar ${plan.left < 0 ? 'over' : ''}"><i style="width:${Math.round(used * 100)}%"></i></div>`
      : `<button class="lv-set" data-act="spend-set">1か月に使っていいお金を決める ›</button>`}
    <div class="lv-sub"><span>口座のお金 <b class="num">${money(balance())}</b></span>${pro ? `<button class="acc-toggle" data-act="acc-open">${accOpen ? '▲ 閉じる' : '▼ 口座ごと'}</button>` : ''}</div>
    ${pro && accOpen ? `<div class="acc-list">${accList().map(a => `<div class="r"><span>${esc(a.name)}</span><b class="num">${balText(accBalance(a.id))}</b></div>`).join('')}</div>` : ''}
  </section>

  ${padHTML()}

  <div class="two">
    <button class="btn btn-income" data-act="add" data-kind="income">収入を入れる</button>
    <button class="btn btn-ghost" data-act="add" data-kind="expense">前の日の分を入れる</button>
  </div>

  <div class="sec-head"><h3>最近の履歴 <small class="sh-note">タップで直せます</small></h3><button class="aside" data-act="go" data-view="calendar">カレンダーで見る</button></div>
  <div class="list">${recent.length ? recent.map(x => txRow(x)).join('') : '<div class="empty">まだ記録がありません。<br>上のボタンで金額を選んで、なにに使ったかをタップすると登録できます。</div>'}</div>`;
}

// 入力：よく使う金額をワンタップ or テンキー → カテゴリをタップで登録
function padHTML() {
  const amt = padAmount();
  const sub = !amt ? 'よく使う金額をタップ、または数字を入力' : padFresh ? '数字で打ち直し・⌫で直せます' : '';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'];
  return `<section class="pad">
    <div class="pad-top">
      <div>
        <div class="pad-q">いくら使った？</div>
        <div class="pad-amt num ${amt ? '' : 'empty'}">¥${amt.toLocaleString('ja-JP')}</div>
        <div class="pad-sub">${sub}</div>
      </div>
      ${amt ? `<button class="pad-clear" data-act="pad-clear" aria-label="クリア">${glyph('x')}</button>` : ''}
    </div>
    <div class="pad-quick">${D.quick.map(v => `<button class="${padFresh && amt === v ? 'on' : ''}" data-act="pad-quick" data-v="${v}">${v.toLocaleString('ja-JP')}</button>`).join('')}</div>
    <div class="pad-keys">${keys.map(k => `<button data-act="pad-key" data-k="${k}">${k}</button>`).join('')}<button class="fn" data-act="pad-back" aria-label="1文字消す">⌫</button></div>
    ${isPro() && D.pm.length ? `<div class="pad-pm">${['cash', ...D.pm.map(p => p.id)].map(id => `<button class="${padPmNow() === id ? 'on' : ''}" data-act="pad-pm" data-pm="${id}">${esc(pmLabel(id))}</button>`).join('')}</div>` : ''}
    <div class="pad-hint ${amt ? 'on' : ''}">↓ なにに使った？${amt ? ' タップで登録' : ''}</div>
    <div class="pad-cats ${amt ? '' : 'off'}">${CATS.expense.map(c => `<button data-act="pad-cat" data-cat="${c.id}" ${amt ? '' : 'disabled'}>${catArt(c)}${c.label}</button>`).join('')}</div>
    <div class="pad-mini ${amt ? '' : 'off'}">
      <button data-act="pad-memo" ${amt ? '' : 'disabled'}>メモを付けて登録</button>
      <button data-act="pad-plain" ${amt ? '' : 'disabled'}>カテゴリなしで登録</button>
    </div>
  </section>`;
}

function padCommit(cat) {
  const amt = padAmount();
  if (!amt) return;
  const tx = { id: uid(), date: today(), kind: 'expense', amount: amt };
  if (cat) tx.cat = cat;
  const pm = isPro() && D.pm.length ? padPmNow() : 'cash';
  if (pm !== 'cash') tx.pm = pm;
  D.tx.push(tx);
  padReset();
  save(); render();
  const what = catOf('expense', cat)?.label;
  // 予算を決めたカテゴリは、残りが少なくなったらひとこと
  let left = '';
  const lim = D.budget[cat];
  if (lim) {
    const used = D.tx.filter(x => x.kind === 'expense' && !x.rec && !x.plan && x.cat === cat && ymOf(x.date) === ymOf(today())).reduce((a, x) => a + x.amount, 0);
    if (used > lim) left = ` · 予算を${yen(used - lim)}オーバー`;
    else if (used >= lim * 0.8) left = ` · 予算まであと${yen(lim - used)}`;
  }
  const card = tx.pm && cardOf(tx.pm);
  if (card) left = ` · ${card.name}で${fmtMD(occDate(cardRec(card) || { day: card.pay }, payYmOf(card, tx.date)))}に引き落とし` + left;
  toast(`${yen(amt)} を登録しました${what ? `（${what}）` : ''}${left}`, () => { D.tx = D.tx.filter(x => x !== tx); save(); render(); });
}

/* =========================================================
   画面：カレンダー
   ========================================================= */
function calHead(ym) {
  return `<div class="mini-balance"><div class="in"><span>${hasCards() ? '使えるお金' : '現在残高'} ${eyeBtn('sm')}</span><b class="num">${balText(hasCards() ? usable() : balance())}</b></div></div>
  <div class="month-nav">
    <button class="icon-btn" data-act="month" data-d="-1" aria-label="前の月">‹</button>
    <h2 data-act="month" data-d="0">${ymLabel(ym)}</h2>
    <button class="icon-btn" data-act="month" data-d="1" aria-label="次の月">›</button>
  </div>
  <div class="seg cal-seg"><button class="${calMode === 'cal' ? 'on' : ''}" data-act="cal-mode" data-m="cal">カレンダー</button><button class="${calMode === 'sum' ? 'on' : ''}" data-act="cal-mode" data-m="sum">今月のまとめ</button></div>`;
}

// 今月のまとめ：カテゴリ別にいくら使ったか（引き落とし・毎月の予定は別に出す）
function monthByCat(ym, upTo) {
  const o = {};
  for (const x of D.tx) {
    if (x.kind !== 'expense' || x.rec || x.plan || ymOf(x.date) !== ym || x.date > upTo) continue;
    const k = x.adj ? 'adj' : (x.cat || 'other');
    (o[k] ||= { total: 0, items: [] }).total += x.amount;
    o[k].items.push(x);
  }
  return o;
}
function viewMonthSum(ym) {
  const t = today(), st = monthStats(ym);
  if (ym > ymOf(t)) return `${calHead(ym)}<div class="empty" style="margin-top:20px">まだ先の月です</div>`;
  const cur = ymOf(t) === ym;
  const days = cur ? Number(t.slice(8)) : dim(ym);
  const by = monthByCat(ym, t);
  const [py, pm] = ym.split('-').map(Number), pd = new Date(py, pm - 2, 1);
  const pym = `${pd.getFullYear()}-${pad(pd.getMonth() + 1)}`;
  // 今月は「先月の同じ日まで」と比べる
  const prev = monthByCat(pym, cur ? `${pym}-${pad(Math.min(days, dim(pym)))}` : `${pym}-31`);
  const hasPrev = Object.keys(prev).length > 0;
  for (const k of Object.keys(D.budget)) by[k] ||= { total: 0, items: [] }; // 予算を決めたカテゴリは0円でも出す
  const rows = Object.entries(by).sort((a, b) => b[1].total - a[1].total);
  const max = rows[0]?.[1].total || 1;
  const label = k => k === 'adj' ? '入れ忘れ（残高合わせ）' : (catOf('expense', k)?.label || 'その他');
  const art = k => k === 'adj' ? `<div class="ill">${glyph('adj')}</div>` : catArt(catOf('expense', k) || catOf('expense', 'other'));
  const list = rows.map(([k, v], i) => {
    const p = prev[k]?.total || 0;
    const lim = D.budget[k];
    const trend = lim || !hasPrev || i > 2 ? '' : v.total > p * 1.1 ? '<em>↑ 先月より多め</em>' : v.total < p * 0.9 ? '<em class="dn">↓ 先月より少なめ</em>' : '';
    const open = sumOpen === k;
    const r = lim ? v.total / lim : 0;
    const bar = lim
      ? `<div class="bar b ${r > 1 ? 'over' : r >= 0.8 ? 'near' : ''}"><i style="width:${Math.min(100, Math.max(2, Math.round(r * 100)))}%"></i></div>
         <div class="bud ${r > 1 ? 'over' : ''}"><span>予算 ${yen(lim)}</span><b>${r > 1 ? `${yen(v.total - lim)} オーバー` : `あと ${yen(lim - v.total)}`}</b></div>`
      : `<div class="bar"><i style="width:${Math.max(4, Math.round(v.total / max * 100))}%"></i></div>`;
    return `<button class="cr ${i === 0 ? 'top' : ''} ${open ? 'open' : ''}" data-act="sum-cat" data-k="${k}">${art(k)}
      <div><div class="nm">${esc(label(k))}<small>${v.items.length}回</small></div>${bar}</div>
      <div class="am num">${yen(v.total)}${trend}</div></button>
      ${open ? `<div class="det">${sortTx(v.items).map(x => txRow(x)).join('')}</div>` : ''}`;
  }).join('');
  const fixedTx = sortTx([...D.tx.filter(x => ymOf(x.date) === ym && x.kind === 'expense' && (x.rec || x.plan)), ...virtuals(ym).filter(v => v.kind === 'expense')], 1);
  const cardBox = cur && isPro() ? D.pm.filter(p => p.type === 'card').map(c => {
    const next = cardPending(c)[0] || (() => { const ym2 = payYmOf(c, t); return { ym: ym2, amt: cardDue(c, ym2), date: occDate(cardRec(c) || { day: c.pay }, ym2) }; })();
    const n = cardBuys(c, next.ym).length, r = cardRec(c);
    return `<div class="ccard"><div class="h"><div class="ic">${glyph('bank')}</div><div><b>${esc(c.name)}</b><small>${fmtMD(next.date)}に引き落とし</small></div><div class="v num">${yen(next.amt)}<small>次の引き落とし</small></div></div>
      <div class="ft"><span>記録した買い物 ${n}件</span><span>${closeText(c)}</span></div>
      ${r ? `<button class="fix" data-act="card-fix" data-rec="${r.id}" data-ym="${next.ym}">明細が来たら、金額をここで合わせる</button>` : ''}</div>`;
  }).join('') : '';
  return `${calHead(ym)}
  <section class="mt">
    <div class="k">${monthNum(ym)}月に使ったお金（引き落としをのぞく）</div>
    <div class="v num">${yen(st.spent)}</div>
    <div class="sub"><span>引き落とし <b class="num">${yen(st.fixed)}</b></span><span>1日あたり <b class="num">${yen(Math.round(st.spent / Math.max(1, days)))}</b></span></div>
  </section>
  ${cardBox}
  ${rows.length ? `<div class="cb">${list}</div>` : '<div class="empty" style="margin-top:14px">この月はまだ記録がありません</div>'}
  ${isPro() || Object.keys(D.budget).length ? `<div style="text-align:center"><button class="setb" data-act="budget-set">${Object.keys(D.budget).length ? '予算を変える' : '＋ 予算を決める（入れたいカテゴリだけ）'}</button></div>` : ''}
  ${fixedTx.length ? `<div class="sec-head"><h3>毎月の支払い</h3></div><div class="list">${fixedTx.map(x => txRow(x)).join('')}</div>` : ''}`;
}

function viewCalendar() {
  if (calMode === 'sum') return viewMonthSum(calYM);
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

  // お金を使わなかった日（使い始めた日〜昨日で、ふだんの支出が0円の日）にスタンプ
  const spentDays = new Set(D.tx.filter(x => x.kind === 'expense' && !x.rec && !x.plan && ymOf(x.date) === ym).map(x => x.date));
  const noMoney = date => D.stamp !== 'none' && date < t && date >= startDate() && !spentDays.has(date);
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
    if (c.plan) lines.push(`<div class="m plan num">引落${compact(c.plan)}</div>`);
    if (c.planInc) lines.push(`<div class="m in num">入る${compact(c.planInc)}</div>`);
    if (c.todo) lines.push('<div class="m todo">未入力</div>');
    const stamp = noMoney(date) ? stampSvg(D.stamp, 'stamp') : '';
    cells += `<button class="${cls}" data-act="day" data-date="${date}"><div class="n">${i}</div>${stamp || lines.slice(0, 2).join('')}</button>`;
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

  return `${calHead(ym)}
  <div class="sum-card">
    <div class="k">この月の収支</div>
    <div class="v num">${sYen(st.net)}</div>
    <div class="row">
      <span>収入 <b class="num">${yen(st.inc)}</b></span>
      <span>引き落とし <b class="num">${yen(st.fixed)}</b></span>
      <span>使った <b class="num">${yen(st.spent)}</b></span>
      ${st.sched ? `<span>これから引き落とし <b class="num red">${yen(st.sched)}</b></span>` : ''}
    </div>
  </div>
  <div class="cal">
    <div class="wk">${WD.map(w => `<div>${w}</div>`).join('')}</div>
    <div class="days">${cells}</div>
    <div class="legend"><span><i style="border-color:var(--red)"></i>引き落とし日</span><span><i style="border-color:var(--teal)"></i>給料日など</span><span>入る・引落＝これからの予定</span></div>
  </div>
  ${D.rec.length ? '' : `<div class="tip">設定の「毎月の給料・引き落とし」にカードや家賃を登録すると、カレンダーに<b style="color:var(--red)">赤丸</b>がつきます。<button class="aside" data-act="go" data-view="settings" style="color:var(--teal);font-weight:700;margin-left:4px">登録する</button></div>`}

  ${selDay ? `<section class="day-panel">
    <div class="h"><b>${fmtMDW(selDay)}${selDay === t ? '（今日）' : ''}</b><span class="num">${items.length ? (future ? '予定 ' : '') + sYen(dayTotal) : ''}</span></div>
    <div class="list">${items.length ? items.map(x => txRow(x, { showDate: false })).join('') : `<div class="empty">${future ? 'この日の予定はありません' : 'この日の記録はありません'}</div>`}</div>
    ${future ? `<div class="two">
      <button class="btn btn-white" data-act="add" data-kind="expense" data-date="${selDay}">使う予定を入れる</button>
      <button class="btn btn-income" data-act="add" data-kind="income" data-date="${selDay}">入る予定を入れる</button>
    </div>` : ''}
  </section>` : ''}

  <div class="sec-head"><h3>${monthNum(ym)}月の記録</h3><span class="aside">タップで修正・削除</span></div>
  <div class="list">${monthList || '<div class="empty">この月の記録はありません</div>'}</div>`;
}

/* =========================================================
   画面：今後の貯金額（予測・目標・ヒント）
   AIは使わず、記録からルールで計算する
   ========================================================= */
let futSel = null;
let accOpen = false;
let futOpen = false; // 貯金目標のグラフを開いているか // ホームで口座ごとの残高を開いているか
let calMode = 'cal', sumOpen = null; // カレンダータブ：カレンダー / 今月のまとめ
const lastDay = ym => `${ym}-${pad(dim(ym))}`;
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const monthsBetween = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const HARD_TO_CUT = ['trans', 'health'];
const isVariable = x => x.kind === 'expense' && !x.rec && !x.plan;
const startDate = () => D.created || today();

// 毎月の予定の金額（未入力なら過去の平均で見積もる）
function recAmountFor(r, ym) {
  const tx = D.tx.find(x => x.rec === r.id && x.ym === ym);
  if (tx) return tx.amount;
  if (r.pm && cardOf(r.pm)) return cardSum(cardOf(r.pm), ym);
  if (r.amount) return r.amount;
  const past = D.tx.filter(x => x.rec === r.id).slice(-3);
  return past.length ? Math.round(past.reduce((s, x) => s + x.amount, 0) / past.length) : 0;
}

// ふだんの支出（固定費以外）の1日あたり。直近3か月＋今月から
function spendWindow(from, to) {
  const days = daysBetween(from, to) + 1;
  const list = D.tx.filter(x => isVariable(x) && x.date >= from && x.date <= to);
  return { days, list, total: list.reduce((s, x) => s + x.amount, 0) };
}
function varRate() {
  const t = today();
  const from = [startDate(), `${addMonths(ymOf(t), -3)}-01`].sort().pop();
  const w = spendWindow(from, t);
  // 使い始めて2週間未満は数日分を1か月に引き伸ばすと大きくズレるので、ふだんの支出は予測に入れない
  const learning = w.days < 14;
  return { ...w, from, learning, left: Math.max(1, 14 - w.days), daily: !learning && w.days > 0 ? w.total / w.days : 0 };
}

// その月の「これから起きる」予定の合計（今日より後のものだけ）
function eventsNet(ym) {
  const t = today();
  let n = 0;
  const isCardRec = id => { const r = D.rec.find(r => r.id === id); return !!(r?.pm && cardOf(r.pm)); };
  for (const x of D.tx) if (ymOf(x.date) === ym && x.date > t && !isCardBuy(x) && !(x.rec && isCardRec(x.rec))) n += sv(x);
  for (const v of virtuals(ym)) {
    if (v.date <= t || isCardRec(v.rec)) continue;
    const r = D.rec.find(r => r.id === v.rec);
    const amt = v.amount || (r ? recAmountFor(r, ym) : 0);
    n += v.kind === 'income' ? amt : -amt;
  }
  return n;
}

// 月末残高の並び（過去は実績、今月は見込み、未来は予測）
function forecast(monthsAhead = 6, extraMonthly = 0) {
  const t = today(), cur = ymOf(t), { daily } = varRate();
  const pts = [];
  for (let i = -3; i < 0; i++) {
    const ym = addMonths(cur, i);
    if (ym >= ymOf(startDate())) pts.push({ ym, v: balance(lastDay(ym)), kind: 'past' });
  }
  let bal = usable() + eventsNet(cur) - daily * (dim(cur) - parseD(t).getDate());
  pts.push({ ym: cur, v: Math.round(bal), kind: 'now' });
  for (let i = 1; i <= monthsAhead; i++) {
    const ym = addMonths(cur, i);
    bal += eventsNet(ym) - daily * dim(ym) + extraMonthly;
    pts.push({ ym, v: Math.round(bal), kind: 'future' });
  }
  return pts;
}

// 目標額に初めて届く月（10年先まで）
function reachMonth(amount, extraMonthly = 0) {
  if (usable() >= amount) return ymOf(today());
  const hit = forecast(120, extraMonthly).find(p => p.kind !== 'past' && p.v >= amount);
  return hit ? hit.ym : null;
}

function goalInfo() {
  const g = D.goal;
  if (!g) return null;
  const cur = ymOf(today());
  const months = Math.max(0, monthsBetween(cur, g.ym));
  const pts = forecast(Math.max(months, 1));
  const at = pts.find(p => p.ym === g.ym) || pts[pts.length - 1];
  const short = g.amount - at.v;
  return {
    ...g, months, projected: at.v, short, expired: g.ym < cur,
    progress: Math.max(0, Math.min(1, usable() / g.amount)),
    perMonth: short > 0 ? Math.ceil(short / Math.max(months, 1) / 100) * 100 : 0,
    reach: reachMonth(g.amount),
  };
}

// ヒント：ルールで「削れる金額」を出して、一番大きいものを1つ
function pickHint() {
  const t = today(), cur = ymOf(t), vr = varRate();
  if (vr.days < 14 || vr.list.length < 5) {
    return { wait: true, text: 'データ集め中', sub: `カテゴリを選んで記録していくと、2週間ほどでヒントが出ます（あと${Math.max(1, 14 - vr.days)}日）` };
  }
  const k = 30.4 / vr.days;
  const curFrom = [startDate(), `${cur}-01`].sort().pop();
  const elapsed = daysBetween(curFrom, t) + 1;
  const prevTo = addDays(`${cur}-01`, -1);
  const prev = vr.from <= prevTo ? spendWindow(vr.from, prevTo) : { days: 0, list: [] };
  const stats = {};
  for (const x of vr.list) {
    if (!x.cat || HARD_TO_CUT.includes(x.cat)) continue;
    const st = (stats[x.cat] ||= { total: 0, count: 0, cur: 0, prev: 0 });
    st.total += x.amount; st.count++;
    if (x.date >= curFrom) st.cur += x.amount;
  }
  for (const x of prev.list) if (stats[x.cat]) stats[x.cat].prev += x.amount;

  const day = Math.floor(Date.now() / 86400000);
  const say = arr => arr[day % arr.length];
  const cands = [];
  let biggest = null;
  for (const [id, st] of Object.entries(stats)) {
    const c = catOf('expense', id);
    const monthly = st.total * k;
    if (st.count < 3 || monthly < 3000) continue;
    const name = `「${c.label}」`;
    if (prev.days >= 14 && elapsed >= 7 && st.prev > 0) {
      const avg = st.prev / prev.days * 30.4, pace = st.cur / elapsed * dim(cur);
      if (pace - avg >= Math.max(2000, avg * 0.2)) cands.push({ save: pace - avg, text: say([`${name}が最近増えてます。いつもの月に戻すと`, `今月は${name}がいつもより多め。先月くらいに抑えると`, `${name}、今月はいつもより多めです。いつもくらいに抑えると`]) });
    }
    const perMonth = st.count * k, per = st.total / st.count;
    if (perMonth >= 8 && per <= 1000) cands.push({ save: per * 4, text: say([`${name}を週1回減らすと`, `${name}は月${Math.round(perMonth)}回くらい。週に1回がまんすると`, `${name}をお休みする日を週に1日つくると`]) });
    if (!biggest || monthly > biggest.monthly) biggest = { monthly, name };
  }
  if (biggest) cands.push({ save: biggest.monthly * 0.1, text: say([`いちばん使っているのは${biggest.name}。1割減らすと`, `${biggest.name}を1割だけ抑えると`, `${biggest.name}を10回に1回やめると`]) });
  const best = cands.filter(c => c.save >= 1000).sort((a, b) => b.save - a.save)[0];
  const g = D.goal;

  if (!best) {
    const r = g && reachMonth(g.amount);
    return { praise: true, text: 'いい調子です', sub: g && r ? `このペースなら目標に ${ymLabel(r)} に届きます` : '大きな使いすぎは見つかりませんでした' };
  }
  const save = Math.round(best.save / 100) * 100;
  let sub = 'ここ3か月の記録から計算しています';
  if (g) {
    const before = reachMonth(g.amount), after = reachMonth(g.amount, save);
    if (before && after && monthsBetween(after, before) > 0) sub = `→ 目標に${monthsBetween(after, before)}か月早く届きます`;
    else if (!before && after) sub = `→ 目標に ${ymLabel(after)} に届くようになります`;
    else sub = `→ 1年で ${yen(save * 12)} の差になります`;
  } else sub = `→ 1年で ${yen(save * 12)} の差になります`;
  return { text: `${best.text} <em>月 ${yen(save)}</em> 浮きます`, sub };
}

function futureChart(pts, sel, goal) {
  const W = 330, H = 150, L = 8, R = 8, T = 16, B = 26;
  const vals = pts.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  const showGoal = goal && goal <= max * 1.6 && goal >= min * 0.5;
  if (showGoal) { min = Math.min(min, goal); max = Math.max(max, goal); }
  if (max === min) { max += 1000; min -= 1000; }
  const span = max - min; min -= span * 0.08; max += span * 0.08;
  const n = pts.length, step = (W - L - R) / Math.max(1, n - 1);
  const x = i => L + i * step, y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
  const nowI = pts.findIndex(p => p.kind === 'now');
  const line = (a, b) => pts.slice(a, b + 1).map((p, j) => `${x(a + j).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line(0, n - 1)} ${x(n - 1).toFixed(1)},${H - B} ${x(0).toFixed(1)},${H - B}`;
  return `<svg class="fchart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="これからの残高のグラフ">
    <polygon points="${area}" fill="rgba(200,174,124,.10)"/>
    ${showGoal ? `<line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" stroke="#D98B7C" stroke-dasharray="4 4" stroke-width="1.4"/><text x="${W - 4}" y="${y(goal) - 5}" font-size="10" fill="#D98B7C" text-anchor="end">目標</text>` : ''}
    ${nowI > 0 ? `<polyline points="${line(0, nowI)}" fill="none" stroke="#C8AE7C" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    <polyline points="${line(nowI, n - 1)}" fill="none" stroke="#C8AE7C" stroke-width="1.8" stroke-dasharray="4 4" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${p.ym === sel ? 6.5 : 3.5}" fill="${p.ym === sel ? '#C8AE7C' : p.kind === 'future' ? '#0C0D0F' : '#C8AE7C'}" stroke="#C8AE7C" stroke-width="2"/>`).join('')}
    ${pts.map((p, i) => `<text x="${x(i)}" y="${H - 8}" font-size="10.5" text-anchor="middle" fill="${p.ym === sel ? '#ECE7DE' : '#8A857C'}" font-weight="${p.ym === sel ? 700 : 400}">${p.kind === 'now' ? '今月' : monthNum(p.ym) + '月'}</text>`).join('')}
    ${pts.map((p, i) => `<rect data-act="fut-month" data-ym="${p.ym}" x="${x(i) - step / 2}" y="0" width="${step}" height="${H}" fill="transparent"/>`).join('')}
  </svg>`;
}

function viewFuture() {
  const pts = forecast(6);
  if (!futSel || !pts.some(p => p.ym === futSel)) futSel = pts[pts.length - 1].ym;
  const sel = pts.find(p => p.ym === futSel);
  const gi = goalInfo();
  const hint = pickHint();
  const vr = varRate();
  const selLabel = sel.kind === 'past' ? `${ymLabel(sel.ym)}末（実績）` : sel.kind === 'now' ? '今月末の見込み' : `${ymLabel(sel.ym)}末の予測`;
  const diff = sel.v - usable();

  let goalCard;
  if (!gi) {
    goalCard = `<button class="goal empty" data-act="goal"><span class="gi">${glyph('target', 1.3)}</span><div><b>目標を決める</b><small>いつまでに・いくら貯めたい？</small></div><span class="chev">›</span></button>`;
  } else {
    const pct = Math.round(gi.progress * 100);
    let status;
    if (vr.learning) status = `記録が2週間たまると、届くかどうかを計算します<br>（あと${vr.left}日）`;
    else if (gi.expired) status = `期限を過ぎました。<b class="ok">目標を変えてみよう</b>`;
    else if (gi.short <= 0) status = `このペースなら届きます${gi.reach && gi.reach < gi.ym ? `（${ymLabel(gi.reach)}ごろ）` : ''}`;
    else status = `今のペースだと <b>${yen(gi.short)} 足りない</b><br>月 ${yen(gi.perMonth)} 減らせば届く`;
    goalCard = `<button class="gbig" data-act="goal">
      <div class="t">${ymLabel(gi.ym)}までに</div><div class="v num">${yen(gi.amount)}</div>
      <div class="bar"><i style="width:${pct}%"></i></div><div class="s"><span>今 ${yen(Math.max(0, usable()))}</span><span>${pct}%</span></div>
      <div class="st ${!vr.learning && !gi.expired && gi.short <= 0 ? 'ok' : ''}">${status}</div>
    </button>`;
  }

  return `<div class="page-head" style="margin-top:6px"><h2>今後の貯金額</h2>${gi ? '<button class="pill" data-act="goal">目標を変える</button>' : ''}</div>
  ${goalCard}
  <section class="hintc ${hint.wait ? 'wait' : ''}">
    <p>${hint.text}<small>${esc(hint.sub)}</small></p>
  </section>
  <button class="gmore" data-act="fut-open">${futOpen ? '▲ グラフを閉じる' : '▼ これからの残高のグラフを見る'}</button>
  ${!futOpen ? '' : vr.learning ? `<section class="chartcard">
    <div class="h"><b>これからの残高</b></div>
    <div class="learn"><b>あと${vr.left}日で予測が出ます</b>使い始めの数日分だけで1か月を計算すると大きくズレるので、記録が2週間たまってから予測します。</div>
  </section>` : `<section class="chartcard">
    <div class="h"><b>これからの残高</b><span>月をタップ</span></div>
    ${futureChart(pts, futSel, gi?.amount)}
    <div class="pick"><span>${selLabel}</span><b class="num">${sel.v < 0 ? '−' : ''}${yen(sel.v)}</b></div>
    <p class="note" style="margin:8px 2px 0">${sel.kind === 'past' ? '実際の記録の月末残高です' : `今より ${sYen(diff)}`}${sel.kind !== 'past' ? (vr.learning ? ` ・ ふだんの支出は、記録が2週間たまってから計算に入れます（あと${vr.left}日）` : ` ・ ふだんの支出は月 ${yen(vr.daily * 30.4)} として計算`) : ''}</p>
    <p class="note" style="margin:10px 2px 0">予測は、給料・引き落としなどの毎月の予定と、ここ3か月のふだんの支出（引き落とし・交通・病院などを除く）の平均から計算しています。</p>
  </section>`}`;
}

function openGoal() {
  const g = D.goal;
  const now = parseD(today());
  const defYM = g?.ym || addMonths(ymOf(today()), 12);
  const [dy, dm] = defYM.split('-').map(Number);
  const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() + i);
  openSheet(`<h3>目標</h3><p class="lead">いつまでに、いくら貯めたい？</p>
    <div class="label">金額</div>
    <div class="with-unit"><input class="field num" inputmode="numeric" placeholder="例：500000" value="${g?.amount || ''}" data-amt><span>円</span></div>
    <div class="label">いつまでに</div>
    <div class="inline-fields">
      <select class="field" data-y>${years.map(y => `<option value="${y}" ${y === dy ? 'selected' : ''}>${y}年</option>`).join('')}</select>
      <select class="field" data-m>${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `<option value="${m}" ${m === dm ? 'selected' : ''}>${m}月</option>`).join('')}</select>
    </div>
    <div class="stack">
      <button class="btn btn-primary" data-save>保存</button>
      ${g ? '<button class="btn btn-text" data-del>目標を消す</button>' : ''}
    </div>`,
  s => {
    if (!g) setTimeout(() => $('[data-amt]', s).focus(), 250);
    $('[data-save]', s).onclick = () => {
      const amount = toInt($('[data-amt]', s).value);
      if (!amount) { shake($('[data-amt]', s)); return; }
      const ym = `${$('[data-y]', s).value}-${pad($('[data-m]', s).value)}`;
      if (ym < ymOf(today())) { shake($('[data-m]', s)); return; }
      D.goal = { amount, ym };
      futSel = ym <= addMonths(ymOf(today()), 6) ? ym : null;
      save(); closeSheet(); render(); toast('目標を保存しました');
    };
    $('[data-del]', s)?.addEventListener('click', () => { delete D.goal; save(); closeSheet(); render(); });
  });
}

/* =========================================================
   画面：設定
   ========================================================= */
function viewSettings() {
  const bal = balance();
  const recs = D.rec.slice().sort((a, b) => a.day - b.day);
  const pro = isPro();
  return `<div class="page-head" style="margin-top:6px"><h2>設定</h2></div>
  <div class="sec-head" style="margin-top:4px"><h3>使い方</h3></div>
  <div class="mode-pick">
    <button class="${pro ? '' : 'on'}" data-act="mode" data-m="easy"><b>ざっくり</b><small>入力して、今月あといくら使えるか見るだけ</small></button>
    <button class="${pro ? 'on' : ''}" data-act="mode" data-m="pro"><b>しっかり管理</b><small>カード・PayPay・口座・予算・毎年の支払いも使う</small></button>
  </div>
  <p class="note">いつでも切り替えられます。切り替えても記録は消えません。</p>

  <div class="menu" style="margin-top:14px">
    <button data-act="adjust"><div class="l"><b>残高を合わせる</b><small>入れ忘れでズレたら、本当の残高を入れるだけ</small></div><span class="chev">›</span></button>
    <button data-act="look-set"><div class="l"><b>アプリの色・スタンプ</b><small>${THEMES[D.theme].name} · お金を使わなかった日は「${D.stamp === 'none' ? 'なし' : STAMPS[D.stamp].name}」</small></div><span class="chev">›</span></button>
    <button data-act="spend-set"><div class="l"><b>今月使えるお金の決め方</b><small>${D.spend.mode === 'fixed' ? `自分で決める · 1か月 ${yen(D.spend.amount)}` : '自動で計算'}</small></div><span class="chev">›</span></button>
    ${pro ? `<button data-act="quick-set"><div class="l"><b>よく使う金額</b><small>${D.quick.map(v => v.toLocaleString('ja-JP')).join(' · ')}</small></div><span class="chev">›</span></button>` : ''}
    <button data-act="guide"><div class="l"><b>使い方ガイド</b><small>入れ方・カード・予測の見方など</small></div><span class="chev">›</span></button>
  </div>

  ${pro ? `<div class="sec-head"><h3>口座</h3>${multiAcc() ? `<span class="aside">合計 ${balText(balance())}</span>` : ''}</div>
  <div class="menu">
    ${accList().map(a => `<button data-act="acc-edit" data-id="${a.id}"><div class="ico" style="width:38px;height:38px">${glyph('bank')}</div>
      <div class="l"><b>${esc(a.name)}</b>${a.id === 'main' ? '<small>現金・ふだんの支出</small>' : ''}</div><div class="r num">${balText(accBalance(a.id))}</div><span class="chev">›</span></button>`).join('')}
    <button class="add" data-act="acc-add">＋ 口座を追加</button>
  </div>

  <div class="sec-head"><h3>支払い方法</h3></div>
  <div class="menu">
    ${D.pm.map(p => `<button data-act="pm-edit" data-id="${p.id}"><div class="ico plan" style="width:38px;height:38px">${glyph(p.type === 'card' ? 'bank' : 'purse')}</div>
      <div class="l"><b>${esc(p.name)}</b><small>${p.type === 'card' ? closeText(p) : 'その場で残高から引く'}${multiAcc() ? ` · ${esc(accName(validAcc(p.acc)))}` : ''}</small></div><span class="chev">›</span></button>`).join('')}
    <button class="add" data-act="pm-add">＋ カード・PayPayなどを追加</button>
  </div>
  <p class="note">登録すると、支出を入れるときに払い方を選べます。カードで払った分は、引き落とし日にまとめて引かれます。</p>` : ''}

  <div class="sec-head"><h3>毎月の給料・引き落とし</h3></div>
  <div class="menu">
    ${recs.map(r => `<button data-act="rec" data-id="${r.id}">
      <div class="ico ${r.kind === 'income' ? 'inc' : 'plan'}" style="width:38px;height:38px">${glyph(r.icon || (r.kind === 'income' ? 'salary' : 'bank'))}</div>
      <div class="l"><b>${esc(r.name)}</b><small>${r.freq === 'year' ? `毎年${r.month}月${r.day}日` : `毎月${r.day}日${r.day >= 29 ? '（ない月は月末）' : ''}`}${multiAcc() ? ` · ${esc(accName(validAcc(r.pm && cardOf(r.pm) ? cardOf(r.pm).acc : r.acc)))}` : ''}</small></div>
      <div class="r num">${r.amount ? (r.kind === 'income' ? '+' : '−') + yen(r.amount) : '毎月入力'}</div><span class="chev">›</span>
    </button>`).join('')}
    <button class="add" data-act="fixed-set">＋ 家賃・光熱費などをまとめて選ぶ</button>
    <button class="add" data-act="rec-add">＋ 追加する</button>
  </div>
  <p class="note">カードみたいに毎月金額が変わるものは、金額を空欄にしておくと、カレンダーの<b style="color:var(--red)">赤丸</b>の日をタップしてその月の金額を入れられます。金額が入った予定は、その日になると自動で残高から引かれます。</p>

  <div class="sec-head"><h3>アカウント</h3></div>
  <div class="menu">
    <button data-act="rename"><div class="l">名前<small>画面上の表示に使います</small></div><div class="r">${esc(P.name)}</div><span class="chev">›</span></button>
    <button data-act="pin"><div class="l">パスコード<small>アプリを開くときの4桁の数字</small></div><div class="r">${P.pin ? 'オン' : 'オフ'}</div><span class="chev">›</span></button>
    ${P.pin && bioSupported ? `<button data-act="faceid"><div class="l">Face ID<small>パスコードの代わりに顔で開く</small></div><div class="r">${P.fid ? 'オン' : 'オフ'}</div><span class="chev">›</span></button>` : ''}
    ${P.pin ? '<button data-act="lock"><div class="l">いますぐロックする</div><span class="chev">›</span></button>' : ''}
    <button data-act="switch"><div class="l">アカウントを切り替え・追加</div><span class="chev">›</span></button>
  </div>

  <div class="sec-head"><h3>機種変更・バックアップ</h3></div>
  <div class="menu">
    <button data-act="transfer-qr"><div class="l"><b>新しいスマホに引き継ぐ</b><small>QRを出して、新しいスマホで映すだけ</small></div><span class="chev">›</span></button>
    <button data-act="transfer-copy"><div class="l"><b>引き継ぎをコピー</b><small>同じスマホでアイコンを入れ直すときに</small></div><span class="chev">›</span></button>
    <button data-act="csv"><div class="l"><b>他の家計簿アプリから取り込む</b><small>マネーフォワード ME・Zaim などのCSV</small></div><span class="chev">›</span></button>
    <button data-act="import"><div class="l"><b>引き継ぎを読み込む</b><small>QR・貼り付け・ファイルから</small></div><span class="chev">›</span></button>
    <button data-act="export"><div class="l">バックアップをファイルに保存</div><span class="chev">›</span></button>
  </div>

  <div class="sec-head"><h3>自動の控え</h3><span class="aside">毎日1回・7日分</span></div>
  <div class="list snap">${snapRows()}</div>
  <p class="note">間違えて消したときなどに、その日の状態に戻せます。</p>

  <div class="storage-note">
    <div class="sn-ic">${glyph('phone', 1.3)}</div>
    <div><b>このスマホだけに保存</b><p>ログイン不要で、データはこの端末の中だけにあります。ブラウザのデータ削除や機種変更では消えてしまうので、機種変更の前に「新しいスマホに引き継ぐ」を使ってください。${isIOS() ? 'ホーム画面に追加したアプリとSafariは別々に保存されます。' : ''}</p></div>
  </div>

  <div class="menu" style="margin-top:26px">
    <button class="danger" data-act="delete-account"><div class="l">このアカウントのデータを削除</div></button>
  </div>
  <p class="note" style="text-align:center;margin-top:20px">ZUBO v1</p>`;
}

/* =========================================================
   描画
   ========================================================= */
function render(keepScroll = true) {
  if (!P) return;
  if (processedOn !== today()) processRecurring();
  applyTheme(D.theme);
  const y = window.scrollY;
  app.className = '';
  app.innerHTML = view === 'calendar' ? viewCalendar() : view === 'future' ? viewFuture() : view === 'settings' ? viewSettings() : viewHome();
  renderTabbar();
  if (keepScroll) window.scrollTo(0, y);
}

function renderTabbar() {
  tabbar.hidden = false;
  const tabs = [['home', 'ホーム', ICON.home], ['calendar', 'カレンダー', ICON.cal], ['future', '貯金目標', ICON.grow], ['settings', '設定', ICON.gear]];
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
  if (b.dataset.view === 'calendar' && view !== 'calendar') { calYM = ymOf(today()); selDay = null; }
  if (b.dataset.view === 'future' && view !== 'future') futSel = null;
  go(b.dataset.view);
});

app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !P) return;
  const a = el.dataset.act;
  const ds_ = el.dataset;
  switch (a) {
    case 'cal-mode': calMode = ds_.m; sumOpen = null; render(); break;
    case 'sum-cat': sumOpen = sumOpen === ds_.k ? null : ds_.k; render(); break;
    case 'pad-pm': D.pmLast = ds_.pm; save(); render(); break;
    case 'pad-quick': padStr = String(Number(ds_.v)); padFresh = true; render(); break;
    case 'pad-key': padKey(ds_.k); render(); break;
    case 'pad-back': padBack(); render(); break;
    case 'pad-clear': padReset(); render(); break;
    case 'pad-cat': padCommit(ds_.cat); break;
    case 'pad-plain': padCommit(null); break;
    case 'pad-memo': { const amount = padAmount(); padReset(); render(); openEntry({ kind: 'expense', amount, quick: true }); break; }
    case 'add': openEntry({ kind: ds_.kind, date: ds_.date }); break;
    case 'tx': openEntry({ id: ds_.id }); break;
    case 'occ': openOccurrence(ds_.rec, ds_.ym); break;
    case 'go': go(ds_.view); break;
    case 'toggle-bal': showBal = !showBal; render(); break;
    case 'hide-tip': store.set('hideInstallTip', true); render(); break;
    case 'month': {
      const d = Number(ds_.d);
      calYM = d === 0 ? ymOf(today()) : addMonths(calYM, d); sumOpen = null;
      selDay = null;
      render(false);
      break;
    }
    case 'day': selDay = selDay === ds_.date ? null : ds_.date; render(); $('.day-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); break;
    case 'fut-month': futSel = ds_.ym; render(); break;
    case 'goal': openGoal(); break;
    case 'adjust': openAdjust(); break;
    case 'quick-set': openQuickSet(); break;
    case 'pm-add': openPm(); break;
    case 'mode': D.mode = ds_.m; save(); render(); toast(D.mode === 'pro' ? 'しっかり管理にしました' : 'ざっくりにしました'); break;
    case 'spend-set': openSpend(); break;
    case 'csv': openCsv(); break;
    case 'fut-open': futOpen = !futOpen; render(); break;
    case 'acc-add': openAcc(); break;
    case 'acc-edit': openAcc(ds_.id); break;
    case 'acc-open': accOpen = !accOpen; render(); break;
    case 'pm-edit': openPm(ds_.id); break;
    case 'card-fix': openOccurrence(ds_.rec, ds_.ym); break;
    case 'look-set': openLook(); break;
    case 'budget-set': openBudget(); break;
    case 'guide': openGuide(); break;
    case 'rec-add': openRec(); break;
    case 'fixed-set': openFixed(); break;
    case 'rec': openRec(ds_.id); break;
    case 'rename': openRename(); break;
    case 'pin': openPinSettings(); break;
    case 'faceid': openFaceIdSettings(); break;
    case 'lock': showLock(P); break;
    case 'switch': showPicker(); break;
    case 'transfer': openTransfer(); break;
    case 'transfer-qr': openTransferQR(); break;
    case 'transfer-copy': copyTransfer(); break;
    case 'snap': restoreSnap(Number(ds_.i)); break;
    case 'export': exportFile(); break;
    case 'import': openImport(); break;
    case 'delete-account': confirmDeleteAccount(P); break;
  }
});

/* =========================================================
   シート（下から出る画面）
   ========================================================= */
function openSheet(html, mount) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="sheet-x" aria-label="閉じる">${glyph('x')}</button>${html}</div></div>`;
  const bd = root.firstElementChild;
  bd.addEventListener('click', e => { if (e.target === bd) closeSheet(); });
  document.body.style.overflow = 'hidden';
  const sheet = $('.sheet', root);
  $('.sheet-x', sheet).onclick = () => closeSheet();
  // 下にスワイプして閉じる（いちばん上までスクロールしているときだけ）
  let y0 = null, dy = 0, t0 = 0;
  sheet.addEventListener('touchstart', e => {
    if (sheet.scrollTop > 0 || e.target.closest('input, textarea, select')) { y0 = null; return; }
    y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0) { sheet.style.transform = ''; return; }
    e.preventDefault();
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: false });
  sheet.addEventListener('touchend', () => {
    if (y0 === null) return;
    y0 = null;
    sheet.style.transition = 'transform .2s ease';
    if (dy > 110 || (dy > 40 && dy / (Date.now() - t0) > 0.5)) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(() => { if ($('#sheet-root').contains(sheet)) closeSheet(); }, 180);
    } else sheet.style.transform = '';
  });
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
  let pm = edit ? (edit.pm || 'cash') : (isPro() && D.pm.length ? padPmNow() : 'cash');
  let acc = validAcc(edit?.acc);
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
      <div class="cats">${cats.map(c => `<button class="cat ${c.id === cat ? 'on' : ''}" data-cat="${c.id}">${kind === 'expense' ? catArt(c) : glyph(c.icon)}${c.label}</button>`).join('')}</div>`}
    ${kind === 'income' && !isRec ? accChips(acc, 'どの口座に入った？') : ''}
    ${kind === 'expense' && !isRec && isPro() && D.pm.length ? `<div class="label">払い方</div><div class="pad-pm">${['cash', ...D.pm.map(p => p.id)].map(id => `<button class="${pm === id ? 'on' : ''}" data-pm="${id}">${esc(pmLabel(id))}</button>`).join('')}</div>` : ''}
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
    bindAccChips(s, v => { acc = v; });
    $$('[data-pm]', s).forEach(b => b.onclick = () => { pm = b.dataset.pm; $$('[data-pm]', s).forEach(x => x.classList.toggle('on', x.dataset.pm === pm)); });
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
        if (kind === 'expense' && !edit.rec) { if (pm !== 'cash') edit.pm = pm; else delete edit.pm; }
        if (kind === 'income' && !edit.rec) { if (acc !== 'main') edit.acc = acc; else delete edit.acc; }
        if (!edit.rec && date > today()) edit.plan = true;
        save(); closeSheet(); render(); toast('保存しました');
        return;
      }
      const tx = { id: uid(), date, kind, amount: amt };
      if (cat) tx.cat = cat;
      if (m) tx.memo = m;
      if (isRec) { tx.rec = recId; tx.ym = o.ym; tx.name = name; }
      else if (date > today()) tx.plan = true;
      if (kind === 'expense' && !isRec && pm !== 'cash') { tx.pm = pm; D.pmLast = pm; }
      if (kind === 'income' && !isRec && acc !== 'main') tx.acc = acc;
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
  openEntry({ kind: rec.kind, rec: rec.id, ym, date: occDate(rec, ym), name: rec.name, amount: (rec.pm && cardOf(rec.pm) ? recAmountFor(rec, ym) : rec.amount) || '' });
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
  let acc = 'main';
  let bal = multiAcc() ? accBalance(acc) : balance();
  openSheet(`<h3>残高を合わせる</h3>
    <p class="lead">銀行アプリやお財布を見て、<b>本当の残高</b>を入れてください。入れ忘れがあっても、ここで合わせればOKです。</p>
    ${accChips(acc)}
    <div class="adj-now"><span>アプリの残高</span><b class="num" data-now>${bal < 0 ? '−' : ''}${yen(bal)}</b></div>
    <div class="label">本当の残高</div>
    <div class="amount-field" style="margin-top:0"><span>¥</span><input class="num" inputmode="numeric" placeholder="${Math.max(0, bal)}" data-v aria-label="本当の残高"></div>
    <div class="adj-diff" data-diff hidden></div>
    <div class="stack"><button class="btn btn-primary" data-save>この残高に合わせる</button></div>`,
  s => {
    const inp = $('[data-v]', s), diffEl = $('[data-diff]', s), btn = $('[data-save]', s);
    const upd = () => {
      const has = /\d/.test(inp.value), d = toSignedInt(inp.value) - bal;
      diffEl.hidden = !has;
      if (!has) return;
      diffEl.className = `adj-diff ${d < 0 ? 'out' : d > 0 ? 'in' : 'ok'}`;
      diffEl.innerHTML = !d ? 'ぴったり合っています'
        : d < 0 ? `<b>${yen(d)}</b> 入れ忘れた支出があるみたい<small>「入れ忘れ」として今日の支出に記録します</small>`
        : `<b>${yen(d)}</b> 多いみたい<small>「入れ忘れ」として今日の収入に記録します</small>`;
      btn.textContent = d ? 'この残高に合わせる' : '閉じる';
    };
    inp.addEventListener('input', upd);
    bindAccChips(s, v => { acc = v; bal = accBalance(acc); $('[data-now]', s).textContent = `${bal < 0 ? '−' : ''}${yen(bal)}`; inp.placeholder = Math.max(0, bal); upd(); });
    setTimeout(() => inp.focus(), 250);
    btn.onclick = () => {
      if (!/\d/.test(inp.value)) { shake(inp.parentElement); inp.focus(); return; }
      const diff = toSignedInt(inp.value) - bal;
      closeSheet();
      if (!diff) { toast('ぴったりでした'); return; }
      // 差額は「入れ忘れ」として記録（集計・予測にも入る）
      const tx = { id: uid(), date: today(), kind: diff < 0 ? 'expense' : 'income', amount: Math.abs(diff), name: '入れ忘れ（残高合わせ）', adj: true };
      if (acc !== 'main') tx.acc = acc;
      D.tx.push(tx); save(); render();
      toast('残高を合わせました', () => { D.tx = D.tx.filter(x => x !== tx); save(); render(); });
    };
  });
}

/* ---------- 他の家計簿アプリから取り込む（CSV） ----------
   マネーフォワード ME・Zaim は自動で読む。知らない形式は、どの列が日付・金額かを選んでもらう（形式は覚えておく）。
   取り込んでも今の残高は変えない（過去の記録だけ増やし、そのぶん最初の残高をずらす）。 */
function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.map(r => r.map(v => v.trim())).filter(r => r.some(v => v));
}
function csvDate(v) {
  const m = halfWidth(v || '').match(/(\d{4})\s*[\/\-年.]\s*(\d{1,2})\s*[\/\-月.]\s*(\d{1,2})/);
  if (!m) return null;
  const d = `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  return Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[3]) >= 1 && Number(m[3]) <= 31 ? d : null;
}
function csvAmt(v) {
  let t = halfWidth(v || '').replace(/[¥円,\s]/g, '').replace(/[−ー–]/g, '-');
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(neg ? -n : n) : NaN;
}
const CSV_CAT_RULES = [
  ['conv', /コンビニ/], ['cafe', /カフェ|喫茶|スタバ/], ['drink', /飲み会|居酒屋|飲酒|お酒|バー/],
  ['beauty', /美容|コスメ|化粧|ヘア|ネイル/], ['date', /デート|交際/],
  ['health', /医療|病院|薬|健康|クリニック/], ['trans', /交通|電車|バス|タクシー|ガソリン|駐車|高速|自動車/],
  ['daily', /日用品|ドラッグ|消耗品|雑貨/], ['fun', /趣味|娯楽|レジャー|旅行|書籍|映画|ゲーム|教養|本/],
  ['shop', /衣服|服|ファッション|買い物|ショッピング|家具|家電|Amazon/i], ['food', /外食|食費|食事|ランチ|ごはん|食料品|スーパー/],
];
// 細かい方の分類（「大項目 / 中項目」の中項目）から先に見る
const csvGuessCat = t => {
  for (const part of [...t.split(' / ').reverse(), t]) { const hit = CSV_CAT_RULES.find(([, re]) => re.test(part)); if (hit) return hit[0]; }
  return 'other';
};
function csvKnown(h) {
  const ix = n => h.indexOf(n);
  if (ix('日付') >= 0 && ix('金額（円）') >= 0 && ix('大項目') >= 0) return {
    name: 'マネーフォワード ME', date: ix('日付'), amount: ix('金額（円）'), inc: -1, sign: 'minus',
    memo: [ix('内容'), ix('メモ')].filter(i => i >= 0), cat: [ix('大項目'), ix('中項目')].filter(i => i >= 0),
    skip: [[ix('計算対象'), ['0']], [ix('振替'), ['1']]].filter(([i]) => i >= 0), pay: ix('保有金融機関'),
  };
  if (ix('日付') >= 0 && ix('支出') >= 0 && ix('収入') >= 0 && ix('カテゴリ') >= 0) return {
    name: 'Zaim', date: ix('日付'), amount: ix('支出'), inc: ix('収入'), sign: 'split',
    memo: [ix('品目'), ix('お店'), ix('メモ')].filter(i => i >= 0), cat: [ix('カテゴリ'), ix('カテゴリの内訳')].filter(i => i >= 0),
    skip: [[ix('方法'), ['transfer', 'balance', '振替', '残高調整']]].filter(([i]) => i >= 0), pay: ix('支払元'),
  };
  return null;
}
function csvBuild(rows, fmt) {
  const t = today(), out = []; let skipped = 0, bad = 0;
  for (const r of rows) {
    if (fmt.skip?.some(([i, vals]) => vals.includes(r[i]))) { skipped++; continue; }
    const date = csvDate(r[fmt.date]);
    let kind, amount;
    if (fmt.sign === 'split') {
      const e = Math.abs(csvAmt(r[fmt.amount]) || 0), n = fmt.inc >= 0 ? Math.abs(csvAmt(r[fmt.inc]) || 0) : 0;
      if (e) { kind = 'expense'; amount = e; } else if (n) { kind = 'income'; amount = n; }
    } else {
      const a = csvAmt(r[fmt.amount]);
      if (a) { kind = fmt.sign === 'all' || a < 0 ? 'expense' : 'income'; amount = Math.abs(a); }
    }
    if (!date || !kind || !amount || date > t) { bad++; continue; }
    const memo = (fmt.memo || []).map(i => r[i]).find(v => v) || '';
    const src = (fmt.cat || []).map(i => r[i]).filter(Boolean).join(' / ');
    out.push({ date, kind, amount, memo: memo.slice(0, 40), src });
  }
  return { list: out, skipped, bad };
}
function openCsv({ after } = {}) {
  const done = () => { closeSheet(); render(); after?.(); };
  openSheet(`<h3>他の家計簿アプリから取り込む</h3>
    <p class="lead">マネーフォワード ME・Zaim などで書き出したCSVファイルを選んでください。取り込む前に中身を確認できます。</p>
    <p class="note">取り込んでも、今の残高は変わりません（過去の記録だけ増えます）。過去の記録があると、貯金目標の予測がすぐ使えるようになります。</p>
    <div class="stack"><button class="btn btn-primary" data-pick>ファイルを選ぶ</button>${after ? '<button class="btn btn-ghost" data-skip>あとで</button>' : ''}</div>
    <input type="file" accept=".csv,text/csv,text/plain" hidden data-file>`,
  s => {
    const inp = $('[data-file]', s);
    $('[data-pick]', s).onclick = () => inp.click();
    $('[data-skip]', s)?.addEventListener('click', done);
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const buf = await file.arrayBuffer();
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { text = new TextDecoder('shift_jis').decode(buf); }
      const rows = parseCsv(text.replace(/^\uFEFF/, ''));
      if (rows.length < 2) { toast('読み込める行がありませんでした'); return; }
      csvStart(rows, after);
    };
  });
}
function csvStart(rows, after) {
  let head = rows[0];
  const hasHead = !head.some(v => csvDate(v));
  const data = hasHead ? rows.slice(1) : rows;
  if (!hasHead) head = head.map((_, i) => `${String.fromCharCode(65 + i)}列`);
  const sig = head.join('|');
  D.csvFmt ||= {};
  const fmt = csvKnown(head) || D.csvFmt[sig];
  if (fmt) return csvCats(data, fmt, head, sig, after);
  // 知らない形式：どの列が何かを選んでもらう
  const L = i => String.fromCharCode(65 + i);
  const cols = head.map((h, i) => `<option value="${i}">${L(i)}列${h && h !== `${L(i)}列` ? `（${esc(h.slice(0, 10))}）` : ''}</option>`).join('');
  const guess = re => head.findIndex(h => re.test(h));
  let sign = 'minus';
  openSheet(`<h3>CSVを取り込む</h3>
    <p class="lead">知らない形式だったので、どの列が何か教えてください。（次からは自動で読み込みます）</p>
    <div class="label">ファイルの最初の3行</div>
    <div class="pv-wrap"><table class="pv"><tr>${head.map((h, i) => `<th>${L(i)} ${esc(h.slice(0, 8))}</th>`).join('')}</tr>${data.slice(0, 3).map(r => `<tr>${head.map((_, i) => `<td>${esc((r[i] || '').slice(0, 14))}</td>`).join('')}</tr>`).join('')}</table></div>
    <div class="mp">
      <span>日付</span><select class="field" data-c="date">${cols}</select>
      <span data-amt-label>金額</span><select class="field" data-c="amount">${cols}</select>
      <span data-inc-label>収入の列</span><select class="field" data-c="inc">${cols}</select>
      <span>内容・メモ</span><select class="field" data-c="memo"><option value="-1">なし</option>${cols}</select>
      <span>カテゴリ</span><select class="field" data-c="cat"><option value="-1">なし</option>${cols}</select>
    </div>
    <div class="label">支出と収入の見分け方</div>
    <div class="chips"><button data-sg="minus">マイナスが支出</button><button data-sg="split">支出と収入で列が別</button><button data-sg="all">全部支出</button></div>
    <div class="stack"><button class="btn btn-primary" data-next>次へ（カテゴリの対応）</button></div>`,
  s => {
    const sel = k => $(`[data-c="${k}"]`, s);
    const pre = { date: guess(/日付|日時|date/i), amount: guess(/金額|支出|amount/i), inc: guess(/収入|入金/), memo: guess(/内容|品目|メモ|摘要|お店|店/), cat: guess(/カテゴリ|分類|項目|費目/) };
    for (const [k, v] of Object.entries(pre)) if (v >= 0) sel(k).value = String(v);
    if (pre.date < 0) sel('date').value = String(Math.max(0, head.findIndex((_, i) => data.slice(0, 5).some(r => csvDate(r[i])))));
    const upd = () => {
      $$('[data-sg]', s).forEach(b => b.classList.toggle('on', b.dataset.sg === sign));
      sel('inc').hidden = $('[data-inc-label]', s).hidden = sign !== 'split';
      $('[data-amt-label]', s).textContent = sign === 'split' ? '支出の列' : '金額';
    };
    $$('[data-sg]', s).forEach(b => b.onclick = () => { sign = b.dataset.sg; upd(); });
    upd();
    $('[data-next]', s).onclick = () => {
      const n = k => Number(sel(k).value);
      const f = { name: 'このファイルの形式', date: n('date'), amount: n('amount'), inc: sign === 'split' ? n('inc') : -1, sign, memo: n('memo') >= 0 ? [n('memo')] : [], cat: n('cat') >= 0 ? [n('cat')] : [], skip: [], pay: -1 };
      if (!csvBuild(data, f).list.length) { toast('この設定だと読める行がありません。日付と金額の列を確かめてください'); return; }
      csvCats(data, f, head, sig, after);
    };
  });
}
function csvCats(data, fmt, head, sig, after) {
  const { list, skipped, bad } = csvBuild(data, fmt);
  if (!list.length) { toast('読める行がありませんでした'); return; }
  D.csvCat ||= {};
  const cnt = {};
  for (const x of list) if (x.kind === 'expense') cnt[x.src || '（なし）'] = (cnt[x.src || '（なし）'] || 0) + 1;
  const srcs = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
  const map = {};
  for (const c of srcs) map[c] = D.csvCat[c] || (c === '（なし）' ? 'other' : csvGuessCat(c));
  const opts = c => CATS.expense.map(k => `<option value="${k.id}" ${map[c] === k.id ? 'selected' : ''}>${k.label}</option>`).join('');
  const exp = list.filter(x => x.kind === 'expense'), inc = list.filter(x => x.kind === 'income');
  const sum = a => a.reduce((t, x) => t + x.amount, 0);
  const dates = list.map(x => x.date).sort();
  const key = x => `${x.date}|${x.kind}|${x.amount}|${x.memo || ''}`;
  const have = new Set(D.tx.filter(x => x.imp).map(key));
  const fresh = list.filter(x => !have.has(key(x)));
  const offerPro = !isPro() && fmt.pay >= 0;
  let pro = false;
  openSheet(`<h3>CSVを取り込む</h3>
    <div class="okbadge">✓ ${esc(fmt.name)}で読み込みました</div>
    <div class="csv-sum">
      <div class="r"><span>期間</span>${fmtMD(dates[0])}〜${fmtMD(dates[dates.length - 1])}（${dates[0].slice(0, 4)}年〜）</div>
      <div class="r"><span>支出</span>${exp.length}件 ${yen(sum(exp))}</div>
      <div class="r"><span>収入</span>${inc.length}件 ${yen(sum(inc))}</div>
      ${skipped + bad ? `<div class="r"><span>取り込まないもの</span>${skipped ? `振替など ${skipped}件` : ''}${skipped && bad ? '・' : ''}${bad ? `読めない・先の日付 ${bad}件` : ''}</div>` : ''}
      ${list.length - fresh.length ? `<div class="r"><span>もう取り込み済み</span>${list.length - fresh.length}件</div>` : ''}
    </div>
    ${srcs.length ? `<div class="label">カテゴリの対応（変えられます）</div>
    <div class="map">${srcs.map((c, i) => `<div class="mr"><span>${esc(c)}<small>${cnt[c]}件</small></span><select class="field" data-m="${i}">${opts(c)}</select></div>`).join('')}</div>` : ''}
    ${offerPro ? `<label class="pro-offer"><input type="checkbox" data-pro><span><b>しっかり管理にする</b><small>このファイルにはカード・口座の情報があります。カードや口座ごとに管理したい人向けです（あとからでも変えられます）。</small></span></label>` : ''}
    <div class="stack"><button class="btn btn-primary" data-go ${fresh.length ? '' : 'disabled'}>${fresh.length}件を取り込む</button>${after ? '<button class="btn btn-ghost" data-skip>取り込まずに進む</button>' : ''}</div>`,
  s => {
    $$('[data-m]', s).forEach(e => e.onchange = () => { map[srcs[Number(e.dataset.m)]] = e.value; });
    $('[data-pro]', s)?.addEventListener('change', e => { pro = e.target.checked; });
    $('[data-skip]', s)?.addEventListener('click', () => { closeSheet(); render(); after?.(); });
    $('[data-go]', s).onclick = () => {
      const added = fresh.map(x => {
        const tx = { id: uid(), date: x.date, kind: x.kind, amount: x.amount, imp: 1 };
        if (x.kind === 'expense') tx.cat = map[x.src || '（なし）'] || 'other';
        else tx.cat = /給|賞与|ボーナス/.test(x.src + x.memo) ? 'salary' : 'other';
        if (x.memo) tx.memo = x.memo;
        return tx;
      });
      const shift = added.reduce((a, x) => a + sv(x), 0);
      D.tx.push(...added); D.base -= shift; // 今の残高は変えない
      const oldCreated = D.created;
      if (dates[0] < (D.created || today())) D.created = dates[0];
      if (fmt.name === 'このファイルの形式') D.csvFmt[sig] = fmt;
      for (const c of srcs) if (c !== '（なし）') D.csvCat[c] = map[c];
      if (pro) D.mode = 'pro';
      save(); closeSheet(); render();
      toast(`${added.length}件を取り込みました`, () => { const ids = new Set(added.map(x => x.id)); D.tx = D.tx.filter(x => !ids.has(x.id)); D.base += shift; D.created = oldCreated; save(); render(); });
      after?.();
    };
  });
}

// 今月使えるお金の決め方
function openSpend() {
  const ym = ymOf(today());
  let mode = D.spend.mode, scope = D.spend.months[ym] ? 'month' : 'all';
  openSheet(`<h3>今月使えるお金の決め方</h3>
    <div class="ty"><button data-m="auto"><b>自動で計算</b><small>給料・毎月の支払い・貯金目標から</small></button><button data-m="fixed"><b>自分で決める</b><small>1か月◯円まで、と決める</small></button></div>
    <div data-fixed>
      <div class="label">1か月に使っていいお金</div>
      <div class="with-unit"><input class="field num" inputmode="numeric" placeholder="例：80000" value="${(D.spend.months[ym] || D.spend.amount || '') && (D.spend.months[ym] || D.spend.amount).toLocaleString('ja-JP')}" data-amt><span>円</span></div>
      <div class="chips"><button data-sc="all">毎月この金額</button><button data-sc="month">${monthNum(ym)}月だけ変える</button></div>
    </div>
    <div class="calc" data-calc></div>
    <p class="note" data-note></p>
    <div class="stack"><button class="btn btn-primary" data-save>保存</button></div>`,
  s => {
    const amtIn = $('[data-amt]', s);
    const upd = () => {
      $$('[data-m]', s).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      $$('[data-sc]', s).forEach(b => b.classList.toggle('on', b.dataset.sc === scope));
      $('[data-fixed]', s).hidden = mode !== 'fixed';
      const old = D.spend;
      D.spend = mode === 'fixed' ? { ...old, mode, amount: toInt(amtIn.value) || old.amount } : { ...old, mode };
      const p = monthPlan(ym);
      D.spend = old;
      const row = (k, v, cls = '') => `<div class="${cls}">${k}<b class="num">${v}</b></div>`;
      $('[data-calc]', s).innerHTML = mode === 'fixed'
        ? row('1か月の予算', yen(toInt(amtIn.value))) + row('今月もう使った', '−' + yen(p.spent)) + row('あと使えるお金', `${p.left < 0 ? '−' : ''}${yen(toInt(amtIn.value) - p.spent)}`, 't')
        : row('今月の給料・収入', yen(p.inc)) + row('毎月の支払い（家賃・カードなど）', '−' + yen(p.out)) + row('貯金したい額（目標から）', '−' + yen(p.save)) + row('今月もう使った', '−' + yen(p.spent)) + row('あと使えるお金', `${p.left < 0 ? '−' : ''}${yen(p.left)}`, 't');
      $('[data-note]', s).innerHTML = mode === 'fixed'
        ? 'ふだんの支出だけで数えます。家賃やカードの引き落としなど「毎月の支払い」は入れません。'
        : p.inc ? '給料と毎月の支払いは「毎月の給料・引き落とし」から、貯金したい額は貯金目標から計算しています。'
        : '給料がまだ登録されていません。設定 →「毎月の給料・引き落とし」に給料を入れるか、「自分で決める」を選んでください。';
    };
    $$('[data-m]', s).forEach(b => b.onclick = () => { mode = b.dataset.m; upd(); if (mode === 'fixed' && !amtIn.value) amtIn.focus(); });
    $$('[data-sc]', s).forEach(b => b.onclick = () => { scope = b.dataset.sc; upd(); });
    amtIn.addEventListener('input', upd);
    upd();
    $('[data-save]', s).onclick = () => {
      if (mode === 'fixed') {
        const v = toInt(amtIn.value);
        if (!v) { shake(amtIn.parentElement); amtIn.focus(); return; }
        if (scope === 'month') { D.spend.months[ym] = v; if (!D.spend.amount) D.spend.amount = v; }
        else { D.spend.amount = v; delete D.spend.months[ym]; }
      }
      D.spend.mode = mode;
      save(); closeSheet(); render(); toast('保存しました');
    };
  });
}

// 口座を選ぶボタン（口座が2つ以上のときだけ出す）
const accChips = (sel, label = 'どの口座？') => isPro() && multiAcc() ? `<div class="label">${label}</div><div class="chips acc-chips">${accList().map(a => `<button class="${a.id === sel ? 'on' : ''}" data-acc="${a.id}">${esc(a.name)}</button>`).join('')}</div>` : '';
function bindAccChips(s, set) {
  $$('[data-acc]', s).forEach(b => b.onclick = () => { set(b.dataset.acc); $$('[data-acc]', s).forEach(x => x.classList.toggle('on', x === b)); });
}

// 口座の追加・編集
function openAcc(id) {
  const isMain = id === 'main', a = isMain ? null : D.acc.find(x => x.id === id);
  const edit = isMain || !!a;
  openSheet(`<h3>${edit ? '口座を編集' : '口座を追加'}</h3>
    <div class="label">名前</div><input class="field" maxlength="16" placeholder="例：楽天銀行、ゆうちょ" value="${esc(isMain ? D.mainName : a?.name || '')}" data-name>
    ${edit ? `<p class="note">残高がズレたときは、設定の「残高を合わせる」で口座を選んで直せます。</p>`
      : `<div class="label">今の残高</div><div class="with-unit"><input class="field num" inputmode="numeric" placeholder="例：50000" data-bal><span>円</span></div>
         <p class="note">現金とふだんの支出は「${esc(D.mainName)}」から引かれます。給料・カード・PayPayなどは、それぞれの登録画面でどの口座か選べます。</p>`}
    <div class="stack"><button class="btn btn-primary" data-save>保存</button>${a ? '<button class="btn btn-danger" data-del>この口座を削除</button>' : ''}</div>`,
  s => {
    if (!edit) setTimeout(() => $('[data-name]', s).focus(), 250);
    $('[data-save]', s).onclick = () => {
      const name = $('[data-name]', s).value.trim().slice(0, 16);
      if (!name) { shake($('[data-name]', s)); return; }
      if (isMain) D.mainName = name;
      else if (a) a.name = name;
      else D.acc.push({ id: uid(), name, base: toSignedInt($('[data-bal]', s).value) });
      save(); closeSheet(); render(); toast('保存しました');
    };
    $('[data-del]', s)?.addEventListener('click', () => confirmSheet({
      title: `「${esc(a.name)}」を削除しますか？`, ok: '削除する', danger: true,
      body: `この口座の残高と記録は「${esc(D.mainName)}」にまとめます。合計の残高は変わりません。`,
      onOk: () => {
        D.base += a.base;
        for (const x of D.tx) if (x.acc === a.id) delete x.acc;
        for (const r of D.rec) if (r.acc === a.id) delete r.acc;
        for (const p of D.pm) if (p.acc === a.id) delete p.acc;
        D.acc = D.acc.filter(x => x !== a);
        save(); render(); toast('削除しました');
      },
    }));
  });
}

// 支払い方法の追加・編集
const CLOSE_PRESETS = [{ close: 0, off: 1, pay: 27 }, { close: 15, off: 1, pay: 10 }, { close: 0, off: 1, pay: 26 }, { close: 0, off: 2, pay: 4 }];
function openPm(id) {
  const p = id ? D.pm.find(x => x.id === id) : null;
  let type = p?.type || 'card', acc = validAcc(p?.acc);
  const cur = p?.type === 'card' ? { close: p.close, off: p.off, pay: p.pay } : CLOSE_PRESETS[0];
  let preset = CLOSE_PRESETS.findIndex(c => c.close === cur.close && c.off === cur.off && c.pay === cur.pay);
  // つなげられる引き落とし予定（まだカードとつながっていない毎月の支出）
  const linkable = D.rec.filter(r => r.kind === 'expense' && r.freq !== 'year' && (!r.pm || (p && r.pm === p.id)));
  let link = (p && cardRec(p)?.id) || 'new';
  openSheet(`<h3>${p ? '支払い方法を編集' : '支払い方法を追加'}</h3>
    <div class="label">名前</div><input class="field" maxlength="16" placeholder="例：楽天カード、PayPay" value="${esc(p?.name || '')}" data-name>
    <div class="label">どんな払い方？</div>
    <div class="ty"><button data-t="card"><b>クレジットカード</b><small>あとでまとめて口座から引き落とし</small></button><button data-t="instant"><b>PayPay・デビット</b><small>払ったときにすぐ減る</small></button></div>
    <div data-card>
      <div class="label">締め日と引き落とし日</div>
      <div class="chips">${CLOSE_PRESETS.map((c, i) => `<button data-pre="${i}">${closeText(c)}</button>`).join('')}<button data-pre="-1">自分で入れる</button></div>
      <div class="inline-fields" data-custom>
        <div><div class="label">締め日</div><div class="with-unit"><input class="field num" inputmode="numeric" placeholder="末日なら0" value="${cur.close}" data-close><span>日</span></div></div>
        <div><div class="label">引き落とし</div><div class="when"><select class="field" data-off><option value="1">翌月</option><option value="2">翌々月</option></select><div class="with-unit"><input class="field num" inputmode="numeric" value="${cur.pay}" data-pay><span>日</span></div></div></div>
      </div>
      <p class="note">カードの明細や公式サイトに「◯日締め・翌月◯日払い」と書いてあります。締め日が月末なら0を入れてください。</p>
      ${linkable.length ? `<div class="label">もう登録してある引き落とし予定とつなぐ？</div>
      <div class="chips">${linkable.map(r => `<button data-link="${r.id}">${esc(r.name)}（毎月${r.day}日）</button>`).join('')}<button data-link="new">つながない（新しく作る）</button></div>
      <p class="note" style="margin-top:4px">つなぐと、このカードで払った分がその予定の金額に自動で入ります。二重には引かれません。</p>` : ''}
    </div>
    <div class="ex" data-instant><b>例：PayPayで1,000円払う</b><br>→ その場で、残高から1,000円減ります。<br>締め日や引き落とし日の設定はいりません。</div>
    ${accChips(acc, 'どの口座から引かれる？（PayPayはチャージ元）')}
    <div class="stack"><button class="btn btn-primary" data-save>保存</button>${p ? '<button class="btn btn-danger" data-del>この支払い方法を削除</button>' : ''}</div>`,
  s => {
    $('[data-off]', s).value = String(cur.off);
    bindAccChips(s, v => { acc = v; });
    const nameIn = $('[data-name]', s);
    const guessLink = () => {
      // 名前が似ている予定があれば、それを最初から選んでおく（例：三井住友カード → 三井住友）
      if (p || picked) return;
      const n = nameIn.value.trim().replace(/カード$/, '');
      const hit = n.length >= 2 && linkable.find(r => r.name.includes(n) || n.includes(r.name.replace(/カード$/, '')));
      link = hit ? hit.id : 'new';
    };
    let picked = false;
    $$('[data-link]', s).forEach(b => b.onclick = () => { link = b.dataset.link; picked = true; upd(); });
    nameIn.addEventListener('input', () => { guessLink(); upd(); });
    const upd = () => {
      $$('[data-t]', s).forEach(b => b.classList.toggle('on', b.dataset.t === type));
      $('[data-card]', s).hidden = type !== 'card'; $('[data-instant]', s).hidden = type === 'card';
      $$('[data-pre]', s).forEach(b => b.classList.toggle('on', Number(b.dataset.pre) === preset));
      $('[data-custom]', s).hidden = preset !== -1;
      $$('[data-link]', s).forEach(b => b.classList.toggle('on', b.dataset.link === link));
    };
    $$('[data-t]', s).forEach(b => b.onclick = () => { type = b.dataset.t; upd(); });
    $$('[data-pre]', s).forEach(b => b.onclick = () => {
      preset = Number(b.dataset.pre);
      if (preset >= 0) { const c = CLOSE_PRESETS[preset]; $('[data-close]', s).value = c.close; $('[data-off]', s).value = String(c.off); $('[data-pay]', s).value = c.pay; }
      upd();
    });
    upd();
    if (!p) setTimeout(() => $('[data-name]', s).focus(), 250);
    $('[data-save]', s).onclick = () => {
      const name = $('[data-name]', s).value.trim().slice(0, 16);
      if (!name) { shake($('[data-name]', s)); return; }
      guessLink();
      const v = { name, type };
      if (acc !== 'main') v.acc = acc;
      if (type === 'card') {
        v.close = toInt($('[data-close]', s).value); v.off = Number($('[data-off]', s).value) === 2 ? 2 : 1; v.pay = toInt($('[data-pay]', s).value);
        if (v.close > 31) { shake($('[data-close]', s)); return; }
        if (v.pay < 1 || v.pay > 31) { shake($('[data-pay]', s)); return; }
      }
      const it = p || { id: uid() };
      delete it.acc;
      Object.assign(it, v);
      if (!p) D.pm.push(it);
      if (type === 'card') {
        // 引き落としの予定とつなぐ（選んだ予定、なければ新しく作る）
        const old = cardRec(it);
        let r = link !== 'new' ? D.rec.find(x => x.id === link) : null;
        if (old && old !== r) delete old.pm;
        if (!r) { r = { id: uid(), name, kind: 'expense', day: v.pay, amount: 0, start: today(), skip: [], icon: 'bank' }; D.rec.push(r); }
        Object.assign(r, { pm: it.id, day: v.pay, amount: 0 }); delete r.freq; delete r.month;
      } else {
        const r = cardRec(it); if (r) delete r.pm;
      }
      save(); closeSheet(); processRecurring(); render(); toast('保存しました');
    };
    $('[data-del]', s)?.addEventListener('click', () => confirmSheet({
      title: `「${esc(p.name)}」を削除しますか？`, ok: '削除する', danger: true,
      body: 'これまでの記録は消えません。この払い方で記録した支出は「現金」として扱われます（引き落としの予定は残るので、いらなければ別に削除してください）。',
      onOk: () => {
        for (const x of D.tx) if (x.pm === p.id) delete x.pm;
        const r = cardRec(p); if (r) delete r.pm;
        D.pm = D.pm.filter(x => x !== p); if (D.pmLast === p.id) delete D.pmLast;
        save(); render(); toast('削除しました');
      },
    }));
  });
}

// アプリの色とスタンプ（その場で見た目が変わる。閉じても選んだまま）
function openLook() {
  const th = Object.entries(THEMES).map(([k, t]) => `<button data-th="${k}"><span class="sw"><i style="background:${t.a}"></i><i style="background:#16181C"></i></span>${t.name}${k === 'lime' ? '<small>いつもの</small>' : ''}</button>`).join('');
  const st = Object.keys(STAMPS).map(k => `<button data-st="${k}">${stampSvg(k)}${STAMPS[k].name}</button>`).join('') + '<button data-st="none"><span class="nost">なし</span>つけない</button>';
  openSheet(`<h3>アプリの色・スタンプ</h3>
    <div class="label">アプリの色</div><div class="pick-grid theme-grid">${th}</div>
    <div class="label">お金を使わなかった日のスタンプ</div><p class="note" style="margin-top:0">カレンダーで、ふだんの支出が0円だった日に押されます。</p>
    <div class="pick-grid stamp-grid">${st}</div>
    <div class="stack"><button class="btn btn-primary" data-ok>閉じる</button></div>`,
  s => {
    const upd = () => {
      $$('[data-th]', s).forEach(b => b.classList.toggle('on', b.dataset.th === D.theme));
      $$('[data-st]', s).forEach(b => b.classList.toggle('on', b.dataset.st === D.stamp));
    };
    $$('[data-th]', s).forEach(b => b.onclick = () => { D.theme = b.dataset.th; applyTheme(D.theme); save(); upd(); });
    $$('[data-st]', s).forEach(b => b.onclick = () => { D.stamp = b.dataset.st; save(); upd(); });
    $('[data-ok]', s).onclick = () => { closeSheet(); render(); };
    upd();
  });
}

// カテゴリごとの予算（入れたいカテゴリだけ。空欄＝なし）
function openBudget() {
  const row = c => `<label class="bg-row">${catArt(c)}<b>${c.label}</b><span class="with-unit"><input class="field num" inputmode="numeric" placeholder="なし" value="${D.budget[c.id] ? D.budget[c.id].toLocaleString('ja-JP') : ''}" data-b="${c.id}"><span>円</span></span></label>`;
  openSheet(`<h3>1か月の予算</h3>
    <p class="lead">決めたいカテゴリだけ入れればOK。「今月のまとめ」で、あといくら使えるかが出ます。</p>
    <div class="bg-list">${CATS.expense.map(row).join('')}</div>
    <div class="stack"><button class="btn btn-primary" data-save>保存する</button></div>`,
  s => {
    $('[data-save]', s).onclick = () => {
      const b = {};
      $$('[data-b]', s).forEach(i => { const v = toInt(i.value); if (v > 0) b[i.dataset.b] = v; });
      D.budget = b; save(); closeSheet(); render(); toast('予算を保存しました');
    };
  });
}

function openQuickSet() {
  const field = (v, i) => `<div class="amount-field qs-field"><span>¥</span><input class="num" inputmode="numeric" value="${v.toLocaleString('ja-JP')}" data-q="${i}" aria-label="よく使う金額${i + 1}"></div>`;
  openSheet(`<h3>よく使う金額</h3>
    <p class="lead">ホームでワンタップで入れられる金額です。よく払う金額にしておくと楽になります。</p>
    <div class="qs-list">${D.quick.map(field).join('')}</div>
    <div class="stack"><button class="btn btn-primary" data-save>保存する</button><button class="btn btn-ghost" data-reset>最初の金額に戻す</button></div>`,
  s => {
    const inputs = [...s.querySelectorAll('[data-q]')];
    $('[data-reset]', s).onclick = () => QUICK_DEFAULT.forEach((v, i) => { inputs[i].value = v; });
    $('[data-save]', s).onclick = () => {
      const vals = inputs.map(i => toInt(i.value));
      const bad = inputs.find((inp, i) => !(vals[i] > 0 && vals[i] < 10 ** PAD_MAX));
      if (bad) { shake(bad.parentElement); bad.focus(); return; }
      D.quick = vals.sort((a, b) => a - b);
      padReset(); save(); closeSheet(); render();
      toast('よく使う金額を変えました');
    };
  });
}

/* ---------- 使い方ガイド ---------- */
const GUIDE = [
  ['', 'ZUBOってどんなアプリ？', `<p>「いま使えるお金」がひと目でわかる、ズボラ向けの残高管理アプリです。細かい家計簿はつけなくてOK。<b>使ったらタップ</b>、それだけです。</p>`],
  ['', '今月あと使えるお金', `<p>ホームのいちばん上の数字です。タップすると決め方を選べます。</p><ul><li><b>自動で計算</b>：今月の給料 − 毎月の支払い（家賃・カードなど）− 貯金したい額（貯金目標から）− 今月もう使ったお金</li><li><b>自分で決める</b>：「1か月 8万円まで」のように決めて、使った分を引いていきます。その月だけ金額を変えることもできます</li></ul>`],
  ['', 'ざっくり・しっかり管理', `<p>設定のいちばん上で切り替えます。<b>ざっくり</b>は入力と「今月あと使えるお金」だけのシンプルな画面。<b>しっかり管理</b>にすると、カード・PayPay・口座ごとの残高・予算・毎年の支払いが使えます。切り替えても記録は消えません。</p>`],
  ['', '他の家計簿アプリから取り込む', `<p>設定 →「他の家計簿アプリから取り込む」で、マネーフォワード ME・Zaim などのCSVファイルを選びます。マネーフォワード ME と Zaim は自動で読み込み、それ以外は「どの列が日付・金額か」を選ぶだけ（次からは自動）。取り込んでも今の残高は変わらず、過去の記録だけ増えます。同じものは二重に取り込みません。</p>`],
  ['', '支出の入れ方（いちばん大事）', `<p>ホームの「いくら使った？」で金額を入れて、「なにに使った？」の「ごはん」「コンビニ」などをタップすると登録完了。選ぶのが面倒なら「カテゴリなしで登録」でOK。</p>
    <ul><li>1,000円 → よく使う金額の <b>1,000</b> をタップ</li><li>1,280円 → テンキーで <b>1・2・8・0</b></li><li>12,000円 → <b>1・2・00・0</b></li></ul>
    <p>押しまちがえたら <b>⌫</b> で1文字消せます（右上の×で全部消せます）。登録したあとでも、下に出る「取り消す」で戻せます。</p>`],
  ['', 'よく使う金額・だいたいでOK', `<ul><li>よく使う金額を押したあとに数字を押すと、<b>打ち直し</b>になります。1,500 を押してから ⌫⌫ → 8・0 で 1,580 のように直すこともできます</li><li>ボタンの金額は 設定 →「よく使う金額」で自分用に変えられます</li><li>だいたいでOK。1,320円を「1,500」で入れても、ズレは「残高を合わせる」でまとめて直せます</li></ul>`],
  ['', '何にいくら使ったか見る', `<p>カレンダーのタブで「今月のまとめ」に切り替えると、カテゴリごとにいくら使ったかが多い順に出ます。カテゴリをタップすると、いつ・いくら使ったかの一覧が開きます。</p>`],
  ['', '家賃・光熱費などを登録する', `<p>設定 →「家賃・光熱費などをまとめて選ぶ」で、チェックして金額と引き落とし日を入れるだけ。電気やガスのように毎月変わるものは、金額を空欄にしておくと、カレンダーの赤丸からその月の金額を入れられます。</p>`],
  ['', 'カード・PayPayで払ったとき', `<p>設定 →「支払い方法」にカードやPayPayを登録すると、支出を入れるときに払い方を選べます（前回の払い方が最初から選ばれています）。</p><ul><li><b>カード</b>：その場では口座の残高から引かず、締め日に合わせて引き落とし日にまとめて引きます。トップには「使えるお金」（口座の残高 − カードの引き落とし待ち）が出ます</li><li>明細が来たら「今月のまとめ」のカードの欄から、明細の金額に合わせられます</li><li><b>PayPay残高など</b>：その場で残高から引きます</li></ul><p>何も登録しなければ、今まで通りです。</p>`],
  ['', '口座が2つ以上あるとき', `<p>設定 →「口座」で口座を追加すると、トップは全部の口座の合計になり、「▼ 口座ごとに見る」で口座ごとの残高が開きます。</p><ul><li>現金・ふだんの支出は、一番上の口座から引かれます</li><li>給料・家賃などの予定、カード、PayPayは、それぞれの登録画面で口座を選べます</li><li>ズレたら「残高を合わせる」で口座を選んで直します</li></ul>`],
  ['', '予算を決める', `<p>カレンダー →「今月のまとめ」の下の「予算を決める」から、決めたいカテゴリだけ1か月の予算を入れます。まとめに「あと◯円」が出て、8割を超えるとオレンジ、超えると赤になります。登録したときにもお知らせします。</p>`],
  ['', '自動車税・更新料など毎年の支払い', `<p>設定 →「＋ 追加する」で「毎年」を選び、何月何日と金額を入れます。月の「使ったお金」には入れず、その日に残高から引かれます。貯金目標の予測にも入ります。</p>`],
  ['', 'アプリの色・スタンプ', `<p>設定 →「アプリの色・スタンプ」で、アプリの色（6色）と、お金を使わなかった日にカレンダーへ押されるスタンプ（6種類・つけないもOK）を選べます。</p>`],
  ['', '昨日の分・過去の分を入れる', `<p>ホームの「昨日以前の支出」か、カレンダーで日付をタップして「＋支出」から入れられます。</p>`],
  ['', 'クレジットカードの使い方', `<p>カードで買ったものは<b>その都度入れなくてOK</b>です。お金が減るのは引き落とし日なので、その日の金額だけ入れます。</p>
    <ol><li>設定 →「毎月の給料・引き落とし」でカードを追加（例：楽天カード・27日・金額は空欄）</li><li>カレンダーの<b style="color:var(--red)">赤丸</b>の日をタップして、明細の金額を入れる</li><li>その日になると自動で残高から引かれます</li></ol>
    <p>現金や電子マネーで使った分だけ、ふだんのボタンで入れてください。カードで買った物まで入れると二重に減ってしまいます。</p>`],
  ['', '給料・家賃など毎月のもの', `<p>設定 →「毎月の給料・引き落とし」に登録すると、毎月その日に自動で反映されます。金額が毎月同じなら金額も入れておきましょう。</p>`],
  ['', '残高がズレたら', `<p>入れ忘れは誰でもあります。設定 →「<b>残高を合わせる</b>」で、銀行アプリやお財布の本当の残高を入れれば、差額を「入れ忘れ」として記録してピタッと合わせます。<b>気づいたときにいつでも</b>どうぞ。</p>`],
  ['', '今後の貯金額の見方', `<ul><li><b>目標</b>：いつまでに・いくら、を決めると達成率と「月いくら減らせば届くか」が出ます</li><li><b>グラフ</b>：過去3か月は実際の残高、その先6か月は予測。月をタップすると金額が出ます</li><li><b>ヒント</b>：記録からいちばん効きそうな節約を1つだけ出します。カテゴリを選んで登録するほど正確になります</li></ul>
    <p>予測は「毎月の予定」と「ここ3か月のふだんの支出の平均」から計算しています。使い始めは数字がブレやすいです。</p>`],
  ['', '残高を隠す', `<p>残高は開くたびに隠れた状態になります。「表示」を押すと見えます。アプリを閉じるとまた隠れます。</p>`],
  ['', 'パスコード', `<p>設定 →「パスコード」でオン・オフ・変更ができます。パスコードをオンにすると「Face ID」も使えます。パスコードを忘れると元に戻せないので注意してください。</p>`],
  ['', '機種変更・バックアップ', `<p>データは<b>このスマホの中だけ</b>に保存されています。</p><ul><li>機種変更：前のスマホで 設定 →「新しいスマホに引き継ぐ」でQRを出し、新しいスマホの最初の画面で「QRで引き継ぐ」を押して映すだけ</li><li>アイコンを入れ直すとき：設定 →「引き継ぎをコピー」→ 入れ直したら最初の画面の「貼り付けで引き継ぐ」</li><li>間違えて消したときは、設定 →「自動の控え」から7日前まで戻せます</li><li>ときどき「バックアップをファイルに保存」しておくと安心</li><li>ホーム画面のアイコンを消すとデータも消えるので注意</li></ul>`],
];

function openGuide() {
  openSheet(`<h3>使い方ガイド</h3><p class="lead">知りたいところをタップしてください</p>
    <div class="guide">${GUIDE.map(([ic, t, body], i) => `<details ${i === 1 ? 'open' : ''}><summary><span class="gno num">${String(i + 1).padStart(2, '0')}</span>${t}</summary><div class="gbody">${body}</div></details>`).join('')}</div>
    <div class="stack"><button class="btn btn-white" data-close>閉じる</button></div>`,
  s => { $('[data-close]', s).onclick = closeSheet; });
}

/* ---------- 毎月の予定 ---------- */
function openRec(id) {
  const r = id ? D.rec.find(x => x.id === id) : null;
  let kind = r?.kind || 'expense', freq = r?.freq || 'month', acc = validAcc(r?.acc);
  const linkedCard = r?.pm && cardOf(r.pm);
  openSheet(`<h3>${r ? '予定を編集' : '予定を追加'}</h3>
    <p class="lead">給料・カードの引き落とし・家賃などの毎月の予定と、自動車税・更新料などの毎年の支払い</p>
    <div class="seg kind-seg"><button data-k="expense">引き落とし（支出）</button><button data-k="income">給料（収入）</button></div>
    <div class="seg freq-seg" ${isPro() || r?.freq === 'year' ? '' : 'hidden'}><button data-f="month">毎月</button><button data-f="year">毎年</button></div>
    <div class="label">名前</div>
    <input class="field" maxlength="20" placeholder="例：楽天カード" value="${esc(r?.name || '')}" data-name>
    <div class="inline-fields">
      <div><div class="label" data-when>毎月何日？</div><div class="when"><div class="with-unit" data-mon-wrap><input class="field num" inputmode="numeric" placeholder="5" value="${r?.month || ''}" data-mon><span>月</span></div><div class="with-unit"><input class="field num" inputmode="numeric" placeholder="27" value="${r?.day || ''}" data-day><span>日</span></div></div></div>
      <div><div class="label">金額</div><div class="with-unit"><input class="field num" inputmode="numeric" placeholder="毎月変わる" value="${r?.amount || ''}" data-amt><span>円</span></div></div>
    </div>
    <p class="note" data-note></p>
    ${linkedCard ? (multiAcc() ? `<p class="note">引き落とし口座は「${esc(linkedCard.name)}」の支払い方法の設定で変えられます（今は${esc(accName(validAcc(linkedCard.acc)))}）。</p>` : '') : accChips(acc)}
    <div class="stack">
      <button class="btn btn-primary" data-save>保存</button>
      ${r ? '<button class="btn btn-danger" data-del>この予定を削除</button>' : ''}
    </div>`,
  s => {
    const segBtns = $$('[data-k]', s), freqBtns = $$('[data-f]', s);
    const upd = () => {
      segBtns.forEach(b => b.classList.toggle('on', b.dataset.k === kind));
      freqBtns.forEach(b => b.classList.toggle('on', b.dataset.f === freq));
      $('[data-mon-wrap]', s).hidden = freq !== 'year';
      $('[data-when]', s).textContent = freq === 'year' ? '毎年いつ？' : '毎月何日？';
      $('[data-note]', s).innerHTML = freq === 'year'
        ? '毎年の支払いは、月の「使ったお金」には入れず、その日に残高から引かれます。貯金目標の予測にも入ります。'
        : 'カードみたいに毎月変わるなら、金額は<b>空欄</b>でOK。カレンダーの赤丸から、その月の金額を先に入れておけます。29〜31日がない月は月末になります。';
      $('[data-name]', s).placeholder = kind === 'income' ? '例：給料' : '例：楽天カード';
    };
    segBtns.forEach(b => b.onclick = () => { kind = b.dataset.k; upd(); });
    freqBtns.forEach(b => b.onclick = () => { freq = b.dataset.f; upd(); });
    bindAccChips(s, v => { acc = v; });
    upd();
    if (!r) setTimeout(() => $('[data-name]', s).focus(), 250);
    $('[data-save]', s).onclick = () => {
      const name = $('[data-name]', s).value.trim();
      const day = toInt($('[data-day]', s).value);
      const amt = toInt($('[data-amt]', s).value);
      if (!name) { shake($('[data-name]', s)); return; }
      const mon = toInt($('[data-mon]', s).value);
      if (day < 1 || day > 31) { shake($('[data-day]', s)); return; }
      if (freq === 'year' && (mon < 1 || mon > 12)) { shake($('[data-mon]', s)); return; }
      const f = freq === 'year' ? { freq, month: mon } : { freq: undefined, month: undefined };
      const a = acc !== 'main' && !linkedCard ? { acc } : {};
      if (r) { Object.assign(r, { name: name.slice(0, 20), kind, day, amount: amt }, f); if (!r.freq) { delete r.freq; delete r.month; } if (!linkedCard) { delete r.acc; Object.assign(r, a); } }
      else D.rec.push({ id: uid(), name: name.slice(0, 20), kind, day, amount: amt, start: today(), skip: [], ...(freq === 'year' ? f : {}), ...a });
      save(); closeSheet(); processRecurring(); render(); toast('保存しました');
    };
    $('[data-del]', s)?.addEventListener('click', () => confirmSheet({
      title: `「${esc(r.name)}」を削除しますか？`, ok: '削除する', danger: true,
      body: 'これまでに記録された分はそのまま残ります。これからの予定は消えます。',
      onOk: () => { D.rec = D.rec.filter(x => x !== r); D.tx = D.tx.filter(x => !(x.rec === r.id && x.date > today())); save(); render(); toast('削除しました'); },
    }));
  });
}

// 毎月かかるお金（一人暮らしの固定費）をチェックでまとめて登録
const FIXED = [
  { name: '家賃', icon: 'house' }, { name: '電気', icon: 'bolt' }, { name: 'ガス', icon: 'flame' }, { name: '水道', icon: 'drop' },
  { name: 'スマホ', icon: 'phone' }, { name: 'ネット', icon: 'wifi' }, { name: 'サブスク', icon: 'play' }, { name: '奨学金', icon: 'book' },
];
const WELCOME_MSG = 'ようこそ！金額をタップすると支出を登録できます';
function openFixed(first = false) {
  const find = n => D.rec.find(r => r.kind === 'expense' && r.name === n);
  const row = (f, i) => {
    const r = find(f.name);
    return `<div class="fr ${r ? 'on' : ''}" data-f="${i}">
      <button class="h" data-tg><span class="ck">✓</span>${glyph(f.icon)}${f.name}<small>${r ? '' : 'タップで追加'}</small></button>
      <div class="in">
        <label><span>金額</span><input class="num" inputmode="numeric" placeholder="毎月変わる" value="${r?.amount || ''}" data-a></label>
        <label><span>引き落とし日</span><input class="num" inputmode="numeric" placeholder="何日？" value="${r?.day || ''}" data-d></label>
      </div></div>`;
  };
  openSheet(`<h3>毎月かかるお金は？</h3>
    <p class="lead">チェックして、金額と引き落とし日を入れるだけ。電気やガスみたいに<b>毎月変わるものは金額を空欄</b>でOK。引き落とし日にカレンダーへ赤丸がつきます。</p>
    <div class="fx">${FIXED.map(row).join('')}</div>
    <button class="btn-text" data-other>＋ ほかのものを追加</button>
    <div class="stack"><button class="btn btn-primary" data-save>${first ? 'これではじめる' : '保存'}</button>${first ? '<button class="btn btn-ghost" data-later>あとで</button>' : ''}</div>`,
  s => {
    const rows = $$('.fr', s);
    rows.forEach(el => $('[data-tg]', el).onclick = () => {
      const on = el.classList.toggle('on');
      $('small', el).textContent = on ? '' : 'タップで追加';
      if (on && !$('[data-d]', el).value) $('[data-a]', el).focus();
    });
    const done = () => { closeSheet(); if (first) toast(WELCOME_MSG); };
    $('[data-later]', s)?.addEventListener('click', done);
    $('[data-other]', s).onclick = () => { closeSheet(); openRec(); };
    $('[data-save]', s).onclick = () => {
      for (const el of rows) {
        if (!el.classList.contains('on')) continue;
        const day = toInt($('[data-d]', el).value);
        if (day < 1 || day > 31) { shake($('[data-d]', el).parentElement); $('[data-d]', el).focus(); return; }
      }
      rows.forEach(el => {
        const f = FIXED[Number(el.dataset.f)], r = find(f.name);
        const on = el.classList.contains('on');
        const day = toInt($('[data-d]', el).value), amount = toInt($('[data-a]', el).value);
        if (on && r) Object.assign(r, { day, amount, icon: f.icon });
        else if (on) D.rec.push({ id: uid(), name: f.name, kind: 'expense', day, amount, start: today(), skip: [], icon: f.icon });
        else if (r) { D.rec = D.rec.filter(x => x !== r); D.tx = D.tx.filter(x => !(x.rec === r.id && x.date > today())); }
      });
      save(); processRecurring(); render(); done();
      if (!first) toast('保存しました');
    };
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
    $('[data-off]', s).onclick = () => verifyPinSheet('今のパスコード', () => { P.pin = null; delete P.fid; saveProfile(); render(); toast('パスコードをオフにしました'); });
  });
}

/* ---------- Face ID（パスキーを使った端末内の顔認証） ---------- */
const bioSupported = !!(window.PublicKeyCredential && navigator.credentials?.create);
async function bioRegister() {
  const cred = await navigator.credentials.create({ publicKey: {
    rp: { name: 'ZUBO', id: location.hostname },
    user: { id: randBytes(16), name: P.name, displayName: P.name },
    challenge: randBytes(32),
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    timeout: 60000,
  } });
  return b64u(new Uint8Array(cred.rawId));
}
let bioBusy = false;
async function bioVerify(p) {
  if (!p.fid || bioBusy) return false;
  bioBusy = true;
  try {
    const r = await navigator.credentials.get({ publicKey: {
      challenge: randBytes(32), rpId: location.hostname, userVerification: 'required', timeout: 60000,
      allowCredentials: [{ type: 'public-key', id: unb64u(p.fid), transports: ['internal'] }],
    } });
    return !!r;
  } catch { return false; } finally { bioBusy = false; }
}
function openFaceIdSettings() {
  if (P.fid) {
    confirmSheet({ title: 'Face IDをオフにしますか？', ok: 'オフにする', danger: true, body: '開くときはパスコードを使います。',
      onOk: () => { delete P.fid; saveProfile(); render(); toast('Face IDをオフにしました'); } });
    return;
  }
  openSheet(`<h3>Face IDで開く</h3><p class="lead">パスコードの代わりに、顔でアプリを開けるようにします。顔のデータはiPhoneの中だけで使われ、アプリには保存されません。</p>
    <div class="stack"><button class="btn btn-primary" data-on>Face IDをオンにする</button><button class="btn btn-text" data-cancel>やめる</button></div>`,
  s => {
    $('[data-cancel]', s).onclick = closeSheet;
    $('[data-on]', s).onclick = async () => {
      try { P.fid = await bioRegister(); saveProfile(); closeSheet(); render(); toast('Face IDをオンにしました'); }
      catch { toast('Face IDを設定できませんでした'); }
    };
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
  selDay = null;
  processedOn = '';
  takeSnapshot();
  render(false);
}

function showWelcome() {
  applyTheme();
  const hasOthers = getProfiles().length > 0;
  fullScreen(`<div class="screen">
    <div class="hero">${logo()}<h1 class="wordmark">ZUBO<i></i></h1><p>ズボラのための、お金の手帳</p></div>
    <div class="card">
      <div class="label" style="margin-top:0">あなたの名前</div>
      <input class="field" maxlength="12" placeholder="ニックネーム" data-name>
      <div class="label">今の残高</div>
      <div class="with-unit"><input class="field num" inputmode="numeric" placeholder="例：300000" data-bal><span>円</span></div>
      <div class="switch"><div><b>パスコードをかける</b><div class="note" style="margin:0">オンにすると、開くときに4桁の数字を聞きます。あとから設定でも変えられます</div></div><button class="toggle" data-pin aria-label="パスコード"></button></div>
      <div class="stack"><button class="btn btn-primary" data-start>はじめる</button></div>
    </div>
    <div class="pad-label" style="justify-content:center;margin-top:22px">前のスマホから引き継ぐ</div>
    <div class="two" style="margin-top:6px">
      <button class="btn btn-white tbtn" data-qr><b>QRで引き継ぐ</b><small>前のスマホが手元にある</small></button>
      <button class="btn btn-white tbtn" data-paste><b>貼り付けで引き継ぐ</b><small>コピーした引き継ぎから</small></button>
    </div>
    <div style="text-align:center;margin-top:8px">
      <button class="btn-text" data-file>バックアップファイルから</button>
      ${hasOthers ? '<br><button class="btn-text" data-back>戻る</button>' : ''}
    </div>
  </div>`);
  $('[data-qr]', app).onclick = scanQR;
  $('[data-paste]', app).onclick = pasteImport;
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
      showOnboard();
    };
    if (pinBtn.classList.contains('on')) setPinFlow(pin => create(pin));
    else create(null);
  };
}

// はじめる → ②使い方 → ③前のデータ → ④毎月かかるお金
function showOnboard() {
  let mode = 'easy', from = 'skip';
  const dots = n => `<div class="step">${n} / 4</div><div class="dots">${[1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
  const opt = (attr, v, cur, title, sub, tags = []) => `<button class="opt ${v === cur ? 'on' : ''}" ${attr}="${v}"><span class="ck"></span><div><b>${title}</b><small>${sub}</small>${tags.length ? `<div class="tags">${tags.map(t => `<span>${t}</span>`).join('')}</div>` : ''}</div></button>`;
  const step2 = () => {
    tabbar.hidden = true; closeSheet();
    app.innerHTML = `<div class="ob">${dots(2)}<h2 class="qh">どんなふうに使う？</h2><p class="qs">あとから設定でいつでも変えられます。</p>
      ${opt('data-ob-m', 'easy', mode, 'ざっくり', '使った金額を入れて、今月あといくら使えるかを見るだけ。', ['いちばんかんたん', 'ズボラ向け'])}
      ${opt('data-ob-m', 'pro', mode, 'しっかり管理', 'カードの引き落とし、PayPay、口座ごとの残高、予算まで管理したい人向け。', ['カード', 'PayPay', '口座', '予算'])}
      <div class="stack"><button class="btn btn-primary" data-ob-next>次へ</button></div></div>`;
    window.scrollTo(0, 0);
    $$('[data-ob-m]', app).forEach(b => b.onclick = () => { mode = b.dataset.obM; step2(); });
    $('[data-ob-next]', app).onclick = () => { D.mode = mode; save(); step3(); };
  };
  const step3 = () => {
    app.innerHTML = `<div class="ob">${dots(3)}<h2 class="qh">前に使っていた家計簿アプリはある？</h2><p class="qs">マネーフォワード ME・Zaim などから書き出したCSVファイルがあれば、今までの記録をそのまま持ってこれます。</p>
      ${opt('data-ob-c', 'csv', from, 'CSVを取り込む', 'ファイルを選ぶ → 中身を確認 → 取り込み。')}
      ${opt('data-ob-c', 'skip', from, 'なし・あとで', 'あとから設定 →「他の家計簿アプリから取り込む」でもできます。')}
      <div class="stack"><button class="btn btn-primary" data-ob-next>次へ</button></div></div>`;
    window.scrollTo(0, 0);
    $$('[data-ob-c]', app).forEach(b => b.onclick = () => { from = b.dataset.obC; step3(); });
    $('[data-ob-next]', app).onclick = () => {
      render();
      if (from === 'csv') openCsv({ after: () => openFixed(true) });
      else openFixed(true);
    };
  };
  step2();
}

function showPicker() {
  applyTheme();
  const list = getProfiles();
  if (!list.length) return showWelcome();
  fullScreen(`<div class="screen">
    <div class="hero">${logo()}<h1 class="wordmark">ZUBO<i></i></h1><p>だれが使いますか？</p></div>
    <div class="profiles">
      ${list.map(p => `<button class="profile-btn" data-id="${p.id}"><span class="avatar">${esc([...p.name][0] || '?')}</span>${esc(p.name)}<span class="lock">${p.pin ? glyph('lock', 1.4) : ''}</span></button>`).join('')}
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
  applyTheme();
  const many = getProfiles().length > 1;
  fullScreen(`<div class="screen">
    <div class="hero"><div class="avatar" style="width:68px;height:68px;font-size:28px;margin:0 auto 12px">${esc([...p.name][0] || '?')}</div><h1 style="font-size:24px">${esc(p.name)}</h1></div>
    ${p.fid && bioSupported ? `<div style="text-align:center;margin:-6px 0 14px"><button class="btn btn-primary bio-btn" data-bio>${glyph('face', 1.8)}Face IDで開く</button></div>` : ''}
    ${pinPadHTML(p.fid && bioSupported ? 'またはパスコード' : 'パスコードを入力')}
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
  const bioBtn = $('[data-bio]', app);
  if (bioBtn) {
    const tryBio = async () => { if (await bioVerify(p)) openProfile(p); };
    bioBtn.onclick = tryBio;
    tryBio();
  }
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
      store.del(`data:${p.id}`); store.del(`snap:${p.id}`);
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
    for (const x of d.tx) {
      if (x.date >= cutoff || isCardBuy(x)) continue; // カードの買い物は引き落としの方で引かれている
      const a = accOfTx(x);
      if (a === 'main') d.base += sv(x); else { const acc = d.acc.find(y => y.id === a); if (acc) acc.base += sv(x); }
    }
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
      $('[data-share]', s)?.addEventListener('click', () => navigator.share({ title: 'ZUBO 引き継ぎリンク', url }).catch(() => {}));
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
  const name = `zubo-${P.name}-${today()}.json`;
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
    } catch { toast('ZUBOのバックアップファイルではないようです'); }
  };
  inp.click();
}

function confirmImport(obj, { fromLink = false } = {}) {
  const d = normalize(obj.d);
  const exists = getProfiles().find(p => p.id === obj.p.id);
  const bal = (() => {
    const card = id => d.pm.some(p => p.id === id && p.type === 'card');
    let b = d.base + d.acc.reduce((a, x) => a + x.base, 0);
    for (const x of d.tx) if (x.date <= today() && !(x.kind === 'expense' && !x.rec && x.pm && card(x.pm))) b += sv(x);
    return b;
  })();
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
    $('[data-cancel]', app).onclick = () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); boot(); };
  } else {
    openSheet(`<h3>このデータを読み込みますか？</h3>${body}
      <div class="stack"><button class="btn btn-primary" data-ok>読み込む</button><button class="btn btn-text" data-cancel>やめる</button></div>`,
    s => { $('[data-ok]', s).onclick = () => { closeSheet(); apply(); }; $('[data-cancel]', s).onclick = closeSheet; });
  }
}

function handleImportLink(code, onCancel) {
  const cancel = onCancel || (() => { history.replaceState(null, '', location.pathname + location.search); boot(); });
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

/* ---------- QR・貼り付けで引き継ぐ ---------- */
const QR_MAX = 2300; // QR1枚に収まる文字数の目安
const loadScript = src => new Promise((res, rej) => {
  if ($(`script[src="${src}"]`)) return res();
  const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el);
});

// 引き継ぎ用の文字列を作る（大きすぎるときは古い履歴を残高にまとめる）
async function makeTransferCode(pin, limit = Infinity) {
  for (const trim of [0, 12, 6, 3, 1]) {
    const obj = exportObject(trim);
    const code = await encodeTransfer(obj, pin);
    if (code.length <= limit) return { code, trim, count: obj.d.tx.length };
  }
  return null;
}
const withPin = fn => { if (P.pin) verifyPinSheet('今のパスコードを入力', fn); else fn(null); };

function openTransferQR() {
  withPin(async pin => {
    try {
      const [made] = await Promise.all([makeTransferCode(pin, QR_MAX), loadScript('vendor/qrcode.js')]);
      if (!made) { toast('データが多すぎてQRにできません。「引き継ぎをコピー」を使ってください'); return; }
      const q = qrcode(0, 'L'); q.addData('ZUBO:' + made.code); q.make();
      const svg = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      openSheet(`<h3>新しいスマホで読み取る</h3>
        <p class="lead">新しいスマホでZUBOをホーム画面に追加して開き、「QRで引き継ぐ」を押して、このQRを映してください。</p>
        <div class="qrbox">${svg}</div>
        <p class="note" style="text-align:center">記録 ${made.count}件${made.trim ? `（直近${made.trim}か月分。それより前は残高にまとめています）` : ''}${pin ? ' ・ パスコードで保護' : ''}</p>
        ${pin ? '' : '<div class="warn">パスコードがオフなので、このQRを読み取った人は中身を見られます。</div>'}
        <div class="stack"><button class="btn btn-white" data-close>閉じる</button></div>`,
      s => { $('[data-close]', s).onclick = closeSheet; });
    } catch { toast('QRを作れませんでした'); }
  });
}

function copyTransfer() {
  withPin(async pin => {
    try {
      const made = await makeTransferCode(pin);
      const url = `${location.origin}${location.pathname}#import=${made.code}`;
      try { await navigator.clipboard.writeText(url); }
      catch { prompt('この文字をコピーしてください', url); return; }
      openSheet(`<h3>コピーしました</h3>
        <p class="lead">このあと、アイコンを入れ直したり新しいスマホで開いたりしたら、最初の画面の「<b>貼り付けで引き継ぐ</b>」を押すだけです。</p>
        <div class="tip">同じApple IDのiPhone同士なら、コピーした内容はそのまま別のiPhoneでも貼り付けられます。うまくいかないときは、LINEの自分用トークやメモに貼って送ってください。</div>
        ${pin ? '' : '<div class="warn">パスコードがオフなので、この内容を知っている人は中身を見られます。人には送らないでください。</div>'}
        <div class="stack"><button class="btn btn-primary" data-close>OK</button></div>`,
      s => { $('[data-close]', s).onclick = closeSheet; });
    } catch { toast('コピーできませんでした'); }
  });
}

// 貼り付けた文字やQRから引き継ぎコードを取り出す
const extractCode = text => {
  const t = String(text || '').trim();
  const m = t.match(/#import=([A-Za-z0-9_-]+)/) || t.match(/^ZUBO:([A-Za-z0-9_-]+)$/) || t.match(/^([A-Za-z0-9_-]{40,})$/);
  return m ? m[1] : null;
};
const backToStart = () => { closeSheet(); P ? render() : boot(); };
function importCode(code) {
  closeSheet();
  if (P) { const prev = P; handleImportLink(code, () => openProfile(prev)); } else handleImportLink(code, boot);
}

async function pasteImport() {
  let text = '';
  try { text = await navigator.clipboard.readText(); } catch { /* 手で貼ってもらう */ }
  const code = extractCode(text);
  if (code) { importCode(code); return; }
  openSheet(`<h3>貼り付けで引き継ぐ</h3>
    <p class="lead">コピーした引き継ぎを、下に貼り付けてください。</p>
    <textarea class="field" rows="4" data-v placeholder="長押し →「ペースト」"></textarea>
    <div class="stack"><button class="btn btn-primary" data-ok>読み込む</button><button class="btn btn-text" data-cancel>やめる</button></div>`,
  s => {
    $('[data-cancel]', s).onclick = closeSheet;
    $('[data-ok]', s).onclick = () => {
      const c = extractCode($('[data-v]', s).value);
      if (!c) { shake($('[data-v]', s)); toast('引き継ぎの文字が見つかりませんでした'); return; }
      importCode(c);
    };
  });
}

function openImport() {
  openSheet(`<h3>引き継ぎを読み込む</h3>
    <p class="lead">前のスマホの「新しいスマホに引き継ぐ」のQRを映すか、コピーした引き継ぎを貼り付けてください。</p>
    <div class="stack">
      <button class="btn btn-primary" data-qr>QRを読み取る</button>
      <button class="btn btn-white" data-paste>貼り付けて読み込む</button>
      <button class="btn btn-text" data-file>バックアップファイルから</button>
    </div>
    <p class="note">読み込むと、同じ人のデータはこのスマホで上書きされます。</p>`,
  s => {
    $('[data-qr]', s).onclick = () => { closeSheet(); scanQR(); };
    $('[data-paste]', s).onclick = () => { closeSheet(); pasteImport(); };
    $('[data-file]', s).onclick = () => { closeSheet(); pickImportFile(); };
  });
}

// カメラでQRを読み取る
async function scanQR() {
  if (!navigator.mediaDevices?.getUserMedia) { toast('このブラウザではカメラが使えません。「貼り付けで引き継ぐ」を使ってください'); return; }
  const root = document.createElement('div');
  root.className = 'scanner';
  root.innerHTML = `<video playsinline muted></video><div class="scan-frame"><i></i><i></i><i></i><i></i><b></b></div>
    <div class="scan-text"><b>前のスマホのQRを映してください</b><span>読み取れたら自動で次に進みます</span></div>
    <button class="scan-cancel">やめる</button>`;
  document.body.appendChild(root);
  let stream, stopped = false;
  const stop = () => { stopped = true; stream?.getTracks().forEach(t => t.stop()); root.remove(); };
  $('.scan-cancel', root).onclick = stop;
  try {
    const [st] = await Promise.all([navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }), loadScript('vendor/jsQR.js')]);
    stream = st;
    if (stopped) { stop(); return; }
    const video = $('video', root);
    video.srcObject = stream; await video.play();
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (stopped) return;
      if (video.readyState >= 2) {
        const w = video.videoWidth, h = video.videoHeight, k = Math.min(1, 720 / Math.max(w, h));
        cv.width = w * k; cv.height = h * k;
        ctx.drawImage(video, 0, 0, cv.width, cv.height);
        const hit = jsQR(ctx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
        const code = hit && extractCode(hit.data);
        if (code) { navigator.vibrate?.(30); stop(); importCode(code); return; }
      }
      requestAnimationFrame(tick);
    };
    tick();
  } catch {
    stop();
    toast('カメラを使えませんでした。設定でカメラを許可するか、「貼り付けで引き継ぐ」を使ってください');
  }
}

/* ---------- 自動の控え（毎日1回・7日分） ---------- */
const SNAP_DAYS = 7;
const getSnaps = () => P ? store.get(`snap:${P.id}`, []) : [];
function takeSnapshot() {
  if (!P || !D) return;
  const snaps = getSnaps();
  if (snaps[0]?.date === today()) return;
  snaps.unshift({ date: today(), data: JSON.parse(JSON.stringify(D)) });
  store.set(`snap:${P.id}`, snaps.slice(0, SNAP_DAYS));
}
function snapRows() {
  const snaps = getSnaps();
  if (!snaps.length) return '<div class="empty">明日から自動で控えが作られます</div>';
  const t = today(), y = addDays(t, -1);
  return snaps.map((sn, i) => {
    const label = sn.date === t ? `今日 ${fmtMD(sn.date)}` : sn.date === y ? `昨日 ${fmtMD(sn.date)}` : fmtMD(sn.date);
    return `<div class="item"><div class="mid"><div class="t">${label}${sn.before ? '（戻す前）' : 'の朝'}</div><div class="s">記録 ${sn.data.tx?.length || 0}件</div></div>
      <button class="r" data-act="snap" data-i="${i}">この日に戻す</button></div>`;
  }).join('');
}
function restoreSnap(i) {
  const sn = getSnaps()[i];
  if (!sn) return;
  confirmSheet({
    title: `${fmtMD(sn.date)}の朝の状態に戻しますか？`, ok: '戻す', danger: true,
    body: 'それ以降に入れた記録は消えます。（戻す前の状態も控えに残すので、やり直せます）',
    onOk: () => {
      const snaps = getSnaps();
      snaps.unshift({ date: today(), data: JSON.parse(JSON.stringify(D)), before: true });
      store.set(`snap:${P.id}`, snaps.slice(0, SNAP_DAYS + 1));
      D = normalize(JSON.parse(JSON.stringify(sn.data)));
      save(); processedOn = ''; render(); toast(`${fmtMD(sn.date)}の状態に戻しました`);
    },
  });
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
  if (processedOn !== today()) takeSnapshot();
  if (processedOn !== today() && !$('#sheet-root').innerHTML) render();
});
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#import=')) boot(); });

navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
}
boot();
