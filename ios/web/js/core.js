/* نُبل — core runtime */
(function () {
'use strict';
const W = window, D = document;
const ICONS = W.NUBL_ICONS || {}, META = W.NUBL_META, CONTENT = W.NUBL_CONTENT;

/* ---------------- DOM ---------------- */
const $ = (s, r = D) => r.querySelector(s);
const $$ = (s, r = D) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, s = 22, cls = '') => `<svg class="ic ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const dp = o => `data-p="${esc(JSON.stringify(o))}"`;

/* ---------------- storage ---------------- */
const PFX = 'nubl9:';
let LS = null;
try { LS = W.localStorage; LS.setItem(PFX + 'probe', '1'); LS.removeItem(PFX + 'probe'); } catch (e) { LS = null; }
const MEM = {};
const Store = {
  get(k, d) { try { const v = LS ? LS.getItem(PFX + k) : MEM[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { const s = JSON.stringify(v); try { if (LS) LS.setItem(PFX + k, s); else MEM[k] = s; } catch (e) { /* quota */ } },
  del(k) { try { if (LS) LS.removeItem(PFX + k); else delete MEM[k]; } catch (e) { } },
  keys(prefix) {
    const out = [];
    if (LS) { for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k && k.indexOf(PFX + prefix) === 0) out.push(k.slice(PFX.length)); } }
    else Object.keys(MEM).forEach(k => { if (k.indexOf(prefix) === 0) out.push(k); });
    return out;
  }
};

/* ---------------- settings ---------------- */
const DEF = {
  theme: 'auto', digits: 'ar', clock: 12, qfs: 30, zfs: 21, haptics: true, sound: true, hijriAdj: 0,
  method: 'auto', madhab: 'shafi', adj: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  pnOn: false, pn: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }, pre: 0,
  rMorning: false, rEvening: false, rKahf: false, rNabila: false, rNabilaTime: '21:00',
  keepAwake: true, repeat: 2, speed: 1, tsbTarget: 33, tsbId: 'subhan'
};
const saved = Store.get('settings', {});
const S = Object.assign({}, DEF, saved);
S.adj = Object.assign({}, DEF.adj, saved.adj || {});
S.pn = Object.assign({}, DEF.pn, saved.pn || {});
const Bus = {
  h: {},
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); return () => this.off(e, f); },
  off(e, f) { this.h[e] = (this.h[e] || []).filter(x => x !== f); },
  emit(e, ...a) { (this.h[e] || []).slice().forEach(f => { try { f(...a); } catch (err) { console.error(e, err); } }); }
};
function setS(k, v) { S[k] = v; Store.set('settings', S); Bus.emit('settings', k, v); }

/* ---------------- numbers & dates ---------------- */
const AD = '٠١٢٣٤٥٦٧٨٩';
const num = n => { const s = String(n); return S.digits === 'ar' ? s.replace(/(\d)\.(\d)/g, '$1٫$2').replace(/[0-9]/g, d => AD[d]) : s; };
const fmtN = n => num(Math.round(n).toLocaleString('en-US')).replace(/,/g, S.digits === 'ar' ? '٬' : ',');
const pad2 = n => String(n).padStart(2, '0');
function fmtTime(d, suffix = true) {
  let h = d.getHours(); const m = d.getMinutes();
  if (+S.clock === 24) return num(pad2(h) + ':' + pad2(m));
  const suf = h < 12 ? 'ص' : 'م'; h = h % 12 || 12;
  return num(h + ':' + pad2(m)) + (suffix ? ' ' + suf : '');
}
function fmtCountdown(ms) {
  let s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
  return num(pad2(h) + ':' + pad2(m) + ':' + pad2(s));
}
function fmtDur(ms) {
  let s = Math.max(0, Math.floor((ms || 0) / 1000)); const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
  return num((h ? h + ':' + pad2(m) : m) + ':' + pad2(s));
}
function fmtBytes(b) {
  if (!b) return num('0') + ' م.ب';
  if (b > 1e9) return num((b / 1e9).toFixed(2)) + ' ج.ب';
  return num(Math.max(1, Math.round(b / 1e6))) + ' م.ب';
}
function rel(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return 'بعد ' + plural(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  const h = Math.floor(m / 60), r = m % 60;
  return 'بعد ' + plural(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة') + (r ? ' و' + plural(r, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة') : '');
}
function plural(n, one, two, few, many) {
  if (n === 1) return one; if (n === 2) return two;
  if (n >= 3 && n <= 10) return num(n) + ' ' + few;
  return num(n) + ' ' + many;
}
const GM = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const HM = ['محرّم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوّال', 'ذو القعدة', 'ذو الحجة'];
function dayKey(d = new Date()) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function dayIndex(d = new Date()) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); }
function gToJD(y, m, d) { if (m < 3) { y--; m += 12; } const a = Math.floor(y / 100), b = 2 - a + Math.floor(a / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5; }
function iToJD(y, m, d) { return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948439.5 - 1; }
function hijriTab(dt) {
  const jd = Math.floor(gToJD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())) + 0.5;
  const y = Math.floor((30 * (jd - 1948439.5) + 10646) / 10631);
  const m = Math.min(12, Math.ceil((jd - (29 + iToJD(y, 1, 1))) / 29.5) + 1);
  return { y, m, d: jd - iToJD(y, m, 1) + 1 };
}
let HFMT = null;
try { HFMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }); } catch (e) { HFMT = null; }
function hijri(date = new Date()) {
  const dt = new Date(date.getTime() + (+S.hijriAdj || 0) * 864e5);
  if (HFMT) {
    try {
      const p = HFMT.formatToParts(dt); const g = t => parseInt((p.find(x => x.type === t) || {}).value, 10);
      const r = { d: g('day'), m: g('month'), y: g('year') };
      if (r.d && r.m && r.y) return r;
    } catch (e) { }
  }
  return hijriTab(dt);
}
const hijriStr = (d = new Date()) => { const h = hijri(d); return num(h.d) + ' ' + HM[h.m - 1] + ' ' + num(h.y) + ' هـ'; };
const gregStr = (d = new Date(), withDay = true) => (withDay ? DAYS[d.getDay()] + '، ' : '') + num(d.getDate()) + ' ' + GM[d.getMonth()] + ' ' + num(d.getFullYear());

/* ---------------- Arabic normalization (search) ---------------- */
function norm(s) {
  return String(s)
    .replace(/\u0648\u0670/g, '')
    .replace(/\u06E7/g, 'ي')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/ؤ/g, 'و').replace(/[ئى]/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[أإآٱا]/g, '').replace(/ء/g, '')
    .replace(/[^\u0621-\u064A0-9]/g, '');
}

/* ---------------- Quran helpers ---------------- */
const JUZ_ORD = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'];
const Q = {
  name: n => META.names[n - 1],
  full: n => 'سورة ' + META.names[n - 1],
  count: n => META.S[n - 1][0],
  meccan: n => !!META.S[n - 1][1],
  type: n => (META.S[n - 1][1] ? 'مكية' : 'مدنية'),
  juzOf(s, a) { let j = 1; for (let i = 0; i < 30; i++) { const [js, ja] = META.J[i]; if (js < s || (js === s && ja <= a)) j = i + 1; } return j; },
  pageOf(s, a) { let lo = 0, hi = META.P.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; const [ps, pa] = META.P[mid]; if (ps < s || (ps === s && pa <= a)) lo = mid; else hi = mid - 1; } return lo + 1; },
  juzName: j => 'الجزء ' + JUZ_ORD[j - 1],
  juzEnd(j) { if (j >= 30) return [114, 6]; const [s, a] = META.J[j]; return a > 1 ? [s, a - 1] : [s - 1, META.S[s - 2][0]]; },
  _p: null,
  load() {
    if (W.NUBL_QURAN) return Promise.resolve(W.NUBL_QURAN);
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const s = D.createElement('script'); s.src = 'data/quran.js';
      s.onload = () => res(W.NUBL_QURAN); s.onerror = () => { this._p = null; rej(new Error('quran')); };
      D.head.appendChild(s);
    });
    return this._p;
  },
  ayah: (s, a) => W.NUBL_QURAN ? W.NUBL_QURAN[s - 1][a - 1] : ''
};
const ae = n => '\u06DD' + num(n);
const ayahs = n => plural(n, 'آية واحدة', 'آيتان', 'آيات', 'آية');
const dhikrs = n => plural(n, 'ذكر واحد', 'ذكران', 'أذكار', 'ذكرًا');

/* ---------------- native bridge ---------------- */
const NN = W.NublNative || null;
const Native = {
  has: !!NN,
  call(m, ...args) { if (!NN || typeof NN[m] !== 'function') return null; try { const r = NN[m](...args); return r === undefined ? true : r; } catch (e) { console.warn('native', m, e); return null; } },
  json(m, ...args) { const r = this.call(m, ...args); if (r == null || r === true) return null; try { return JSON.parse(r); } catch (e) { return null; } }
};
const WEB = !NN;
const IOSAPP = !!(NN && W.NublIOS);
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = (W.matchMedia && W.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
if (WEB) D.documentElement.classList.add('pwa');
let wakeLock = null, wantWake = false;
async function keepAwake(on) {
  wantWake = !!on;
  if (!WEB) { Native.call('keepScreenOn', !!on); return; }
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    else if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { wakeLock = null; }
}
D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible' && wantWake) keepAwake(true); });
const Bridge = W.NublBridge = W.NublBridge || {};
['onAudio', 'onLocation', 'onHeading', 'onPermission', 'onVolumeKey', 'onRoute', 'onResume', 'onPause', 'onDownloads', 'onCompassAccuracy'].forEach(k => {
  Bridge[k] = (...a) => Bus.emit(k, ...a);
});
Bridge.onInsets = (t, b) => {
  const r = D.documentElement.style;
  r.setProperty('--st', Math.max(0, +t || 0) + 'px'); r.setProperty('--sb', Math.max(0, +b || 0) + 'px');
};
Bridge.onSystemTheme = dark => { SYS_DARK = !!dark; applyTheme(); };

function haptic(kind = 'tick') {
  if (!S.haptics) return;
  if (Native.has) Native.call('haptic', kind);
  else if (navigator.vibrate) { try { navigator.vibrate(kind === 'success' ? [16, 50, 26] : kind === 'heavy' ? 28 : kind === 'light' ? 6 : 10); } catch (e) { } }
}
let toastT = 0;
function toast(msg, icon) {
  const t = $('#toast'); if (!t) return;
  t.innerHTML = (icon ? ic(icon, 18) : '') + '<span>' + esc(msg) + '</span>';
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}
function copy(text) {
  if (Native.has) { const r = Native.call('copy', String(text)); if (r !== null) { if (r !== 'sys') toast('تم النسخ', 'check'); haptic('light'); return; } }
  const done = () => { toast('تم النسخ', 'check'); haptic('light'); };
  const fb = () => { const ta = D.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; D.body.appendChild(ta); ta.select(); try { D.execCommand('copy'); done(); } catch (e) { toast('تعذّر النسخ'); } ta.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb); else fb();
}
const SIGN = '\n\n— من تطبيق «نُبل»، صدقة جارية عن روح نبيلة مصباح محمد إسماعيل، رحمها الله.';
function share(text, title = 'نُبل') {
  const body = text + SIGN;
  if (Native.has) { Native.call('share', body, title); return; }
  if (navigator.share) navigator.share({ title, text: body }).catch(() => { }); else copy(body);
}

/* ---------------- theme ---------------- */
let SYS_DARK = false;
(function initSys() {
  const info = Native.json('info');
  if (info && typeof info.dark === 'boolean') SYS_DARK = info.dark;
  else if (W.matchMedia) {
    const mq = W.matchMedia('(prefers-color-scheme: dark)'); SYS_DARK = mq.matches;
    if (mq.addEventListener) mq.addEventListener('change', e => { SYS_DARK = e.matches; applyTheme(); });
  }
})();
let splashOn = true;
function isDark() { return S.theme === 'dark' || (S.theme === 'auto' && SYS_DARK); }
function applyTheme() {
  const dark = isDark();
  D.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const r = D.documentElement.style; r.setProperty('--qfs', S.qfs + 'px'); r.setProperty('--zfs', S.zfs + 'px');
  const bg = dark ? '#08110E' : '#F6F1E6';
  const m = $('meta[name=theme-color]'); if (m) m.content = bg;
  if (!splashOn) Native.call('setTheme', dark, Nav.cur() && Nav.cur().name === 'reader' ? (dark ? '#0D1914' : '#FFFAEE') : bg);
  if (!splashOn && D.body.classList.contains('top-dark')) Native.call('setBars', true);
}
function endSplash() { splashOn = false; applyTheme(); }

/* ---------------- layer: sheets & dialogs ---------------- */
const Layer = {
  stack: [],
  sheet(html, { title = '', cls = '', onClose = null, onOpen = null } = {}) {
    const root = $('#layer'); const scrim = D.createElement('div'); scrim.className = 'scrim';
    const el = D.createElement('div'); el.className = 'sheet ' + cls;
    el.innerHTML = '<div class="grip"></div>' + (title ? `<div class="sheet-h"><h3>${title}</h3><button class="ibtn sm plain" data-a="layer-close" aria-label="إغلاق">${ic('x', 20)}</button></div>` : '') + `<div class="sheet-b">${html}</div>`;
    root.append(scrim, el);
    const entry = { scrim, el, onClose }; this.stack.push(entry);
    scrim.addEventListener('click', () => this.close());
    this._drag(el);
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); el.classList.add('on'); }));
    if (onOpen) onOpen(el);
    return el;
  },
  dialog(html, { onClose = null } = {}) {
    const root = $('#layer'); const scrim = D.createElement('div'); scrim.className = 'scrim';
    const el = D.createElement('div'); el.className = 'dlg'; el.innerHTML = html;
    root.append(scrim, el);
    const entry = { scrim, el, onClose }; this.stack.push(entry);
    scrim.addEventListener('click', () => this.close());
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); el.classList.add('on'); }));
    return el;
  },
  close() {
    const e = this.stack.pop(); if (!e) return false;
    e.scrim.classList.remove('on'); e.el.classList.remove('on'); e.el.style.transform = '';
    setTimeout(() => { e.scrim.remove(); e.el.remove(); }, 400);
    if (e.onClose) { try { e.onClose(); } catch (err) { } }
    return true;
  },
  closeAll() { while (this.stack.length) this.close(); },
  top() { return this.stack[this.stack.length - 1]; },
  _drag(el) {
    let y0 = null, dy = 0;
    const body = () => el.querySelector('.sheet-b');
    el.addEventListener('touchstart', e => { const b = body(); if (b && b.scrollTop > 0 && !e.target.closest('.grip,.sheet-h')) return; y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; }, { passive: true });
    el.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 0) el.style.transform = `translateY(${dy}px)`; }, { passive: true });
    el.addEventListener('touchend', () => { if (y0 == null) return; el.style.transition = ''; if (dy > 110) this.close(); else el.style.transform = ''; y0 = null; });
  }
};
function confirmDlg({ title, text = '', ok = 'تأكيد', cancel = 'إلغاء', danger = false }) {
  return new Promise(res => {
    let done = false;
    const el = Layer.dialog(`<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}<div class="acts"><button class="btn ghost" data-r="0">${esc(cancel)}</button><button class="btn ${danger ? '' : 'pri'}" data-r="1" ${danger ? 'style="background:var(--danger);color:#fff"' : ''}>${esc(ok)}</button></div>`,
      { onClose: () => { if (!done) { done = true; res(false); } } });
    el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; const v = b.dataset.r === '1'; done = true; res(v); Layer.close(); });
  });
}

/* ---------------- router ---------------- */
const Routes = {};
const Nav = {
  stack: [], active: null,
  cur() { return this.stack[this.stack.length - 1]; },
  go(name, p = {}, opt = {}) { if (!Routes[name]) return; this._save(); if (opt.replace) this.stack.pop(); this.stack.push({ name, p, y: 0 }); this.render('push'); },
  tab(name, p = {}) { this._save(); this.stack = [{ name, p, y: 0 }]; this.render('fade'); },
  back() { if (Layer.close()) return true; if (this.stack.length > 1) { this.stack.pop(); this.render('back'); return true; } return false; },
  refresh() { this._save(); this.render('none'); },
  _save() { const c = this.cur(); if (c) c.y = $('#view').scrollTop; },
  render(mode) {
    const c = this.cur(); const R = Routes[c.name]; const view = $('#view');
    if (this.active && this.active.leave) { try { this.active.leave(); } catch (e) { console.error(e); } }
    Layer.closeAll();
    const cls = mode === 'back' ? 'back' : mode === 'fade' ? 'fade' : mode === 'none' ? '' : '';
    view.innerHTML = `<section class="page ${cls} ${R.cls || ''}">${R.render(c.p || {})}</section>`;
    if (mode === 'none') view.firstElementChild.style.animation = 'none';
    D.body.classList.toggle('no-tabs', !!R.noTabs);
    D.body.classList.toggle('reader', c.name === 'reader');
    D.body.classList.toggle('top-dark', !!R.darkTop);
    this.active = R;
    if (R.mount) { try { R.mount(view.firstElementChild, c.p || {}); } catch (e) { console.error(c.name, e); } }
    view.scrollTop = (mode === 'back' || mode === 'none') ? c.y : 0;
    keepAwake(!!(R.awake && S.keepAwake));
    applyTheme();
    Bus.emit('route', c.name, R.tab);
  }
};

/* ---------------- actions (event delegation) ---------------- */
const A = {};
D.addEventListener('click', e => {
  const t = e.target.closest('[data-a]'); if (!t) return;
  const f = A[t.dataset.a]; if (!f) return;
  e.preventDefault();
  let p = {}; if (t.dataset.p) { try { p = JSON.parse(t.dataset.p); } catch (err) { } }
  try { f(t, p, e); } catch (err) { console.error('action', t.dataset.a, err); }
});
A.back = () => Nav.back();
A['layer-close'] = () => Layer.close();
A.go = (t, p) => { haptic('light'); Nav.go(t.dataset.r, p); };
A.tab = (t, p) => { haptic('light'); Nav.tab(t.dataset.r, p); };

/* ---------------- small UI helpers ---------------- */
function ring(size, stroke, pct, color = 'var(--pri)', track = 'var(--line2)', cls = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct || 0));
  return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${track}" stroke-width="${stroke}"/><circle class="rg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - p)).toFixed(2)}"/></svg>`;
}
function setRing(svg, pct) { if (!svg) return; const c = svg.querySelector('.rg'); if (!c) return; const len = parseFloat(c.getAttribute('stroke-dasharray')); c.setAttribute('stroke-dashoffset', (len * (1 - Math.max(0, Math.min(1, pct)))).toFixed(2)); }
const sw = (id, on, attrs = '') => `<label class="sw"><input type="checkbox" ${on ? 'checked' : ''} data-sw="${id}" ${attrs}><i></i></label>`;
function rangeFill(inp) { const min = +inp.min || 0, max = +inp.max || 100; inp.style.setProperty('--p', ((inp.value - min) / (max - min) * 100) + '%'); }
const MARK = 'img/mark.svg';
const moonSvg = `<svg class="moon" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="mg" cx="40%" cy="35%"><stop offset="0" stop-color="#FFF6D8"/><stop offset="1" stop-color="#E2BA6A"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="#F1D9A0" opacity=".08"/><path d="M42 12a22 22 0 1 0 10 34A18 18 0 0 1 42 12z" fill="url(#mg)"/><circle cx="50" cy="16" r="1.6" fill="#FFF3D0"/><circle cx="14" cy="22" r="1.2" fill="#FFF3D0"/></svg>`;

/* ---------------- counters for her ---------------- */
const Her = {
  get duas() { return Store.get('duaCount', 0); },
  addDua(n = 1) { const v = this.duas + n; Store.set('duaCount', v); Bus.emit('her'); return v; },
  get tsb() { return Store.get('tsbTotal', 0); },
  get khatma() { const k = Store.get('khatma', null); return k && Array.isArray(k.d) ? k : { d: new Array(30).fill(0), n: 0 }; },
  setKhatma(k) { Store.set('khatma', k); Bus.emit('her'); },
  juzDone() { return this.khatma.d.filter(Boolean).length; }
};

W.N = {
  W, D, $, $$, esc, ic, dp, Store, S, DEF, setS, Bus, num, fmtN, pad2, fmtTime, fmtCountdown, fmtDur, fmtBytes, rel, plural,
  GM, DAYS, HM, dayKey, dayIndex, hijri, hijriStr, gregStr, norm, Q, ae, JUZ_ORD, Native, haptic, toast, copy, share, ayahs, dhikrs,
  applyTheme, endSplash, isDark, Layer, confirmDlg, Routes, Nav, A, ring, setRing, sw, rangeFill, MARK, moonSvg, Her,
  META, CONTENT, WEB, IOS, STANDALONE, keepAwake, IOSAPP
};
})();
