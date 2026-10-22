/* نُبل — Quran: index, listen, search, bookmarks, reader */
(function () {
'use strict';
const { W, S, setS, Store, Bus, Native, num, fmtN, fmtBytes, ic, esc, dp, $, $$, Q, ae, norm, Routes, Nav, A, Layer, toast, haptic, copy, share, ring, sw, rangeFill, MARK, META, Player, DL, Her, applyTheme } = N;

const eq = '<span class="eq"><i></i><i></i><i></i></span>';
function playState(n) { const p = Player.st; if (!(p.active && p.s === n)) return ic('headphones', 19); if (p.loading) return ic('loader', 19, 'spin'); return p.playing ? `<span class="pri">${eq}</span>` : ic('pause', 19); }
function dlBtn(n) {
  if (!DL.ok) return '';
  const d = DL.state(n);
  if (!d) return `<button class="ibtn sm plain" data-a="dl-s" ${dp({ s: n })} aria-label="تنزيل">${ic('download', 18, 'faint')}</button>`;
  if (d.s === 'done') return `<button class="ibtn sm plain" data-a="dl-s" ${dp({ s: n })} aria-label="محفوظة">${ic('circle-check', 18, 'gold')}</button>`;
  if (d.s === 'fail') return `<button class="ibtn sm plain" data-a="dl-s" ${dp({ s: n })} aria-label="إعادة">${ic('rotate-ccw', 18, 'faint')}</button>`;
  return `<button class="ibtn sm plain dl-ring" data-a="dl-s" ${dp({ s: n })} aria-label="إلغاء">${ring(30, 3, (d.p || 0) / 100, 'var(--pri)', 'var(--line)', 'r')}${ic('x', 12)}</button>`;
}
A['dl-s'] = (t, p) => { const d = DL.state(p.s); if (!d || d.s === 'fail') DL.start(p.s); else if (d.s === 'done') DL.askDelete(p.s); else { DL.del(p.s); toast('أُلغي التنزيل', 'x'); } };
A['play-s'] = (t, p) => { if (Player.isOn(p.s)) Player.toggle(); else Player.play(p.s); };

/* ================= QURAN INDEX ================= */
function surahRow(n) {
  const sub = Q.type(n) + ' • ' + N.ayahs(Q.count(n)) + ' • الجزء ' + num(Q.juzOf(n, 1));
  return `<div class="li" data-a="go" data-r="reader" ${dp({ s: n })}><span class="snum">${num(n)}</span><span class="t"><b class="sname">${Q.name(n)}</b><small>${sub}</small></span>
    <span class="acts2">${DL.done(n) ? ic('circle-check', 15, 'gold') : ''}<button class="ibtn sm plain" data-a="play-s" ${dp({ s: n })} aria-label="استماع">${playState(n)}</button></span></div>`;
}
function listenRow(n) {
  const d = DL.state(n);
  const sub = d && d.s === 'done' ? 'محفوظة على جهازك' : d && (d.s === 'run' || d.s === 'wait') ? 'جارٍ التنزيل ' + num(d.p || 0) + '٪' : d && d.s === 'fail' ? 'تعذّر التنزيل — أعد المحاولة' : Q.type(n) + ' • ' + N.ayahs(Q.count(n));
  return `<div class="li" data-a="play-s" ${dp({ s: n })}><span class="snum">${num(n)}</span><span class="t"><b class="sname">${Q.name(n)}</b><small>${sub}</small></span>
    <span class="acts2">${dlBtn(n)}<span class="ibtn sm plain">${playState(n)}</span></span></div>`;
}
function juzRows() {
  const k = Her.khatma;
  return META.J.map(([s, a], i) => `<div class="li" data-a="go" data-r="reader" ${dp({ s, a })}><span class="snum">${num(i + 1)}</span><span class="t"><b>${Q.juzName(i + 1)}</b><small>يبدأ من ${Q.full(s)} • الآية ${num(a)}</small></span>${k.d[i] ? `<span class="badge gold">${ic('check', 13)} في ختمتها</span>` : ic('chevron-left', 18, 'chev')}</div>`).join('');
}
function listenHead() {
  const p = Player.st;
  return `<div class="reciter rise">
    <div class="row"><div class="avatar">ي</div><div class="grow"><h3>${Player.RECITER}</h3><p>المصحف المرتّل • رواية حفص عن عاصم</p></div></div>
    <div class="row" style="margin-top:16px;gap:10px">
      <button class="btn gold" style="flex:1" data-a="play-all">${p.active && p.playing ? ic('pause', 20) + ' إيقاف مؤقت' : ic('play', 20) + (p.active ? ' متابعة الاستماع' : ' استمع من البداية')}</button>
      ${DL.ok ? `<button class="btn" style="flex:1;background:rgba(255,255,255,.12);color:#F3EAD6" data-a="dl-all">${ic('cloud-download', 20)} تنزيل الكل</button>` : ''}
    </div>
    ${DL.ok ? `<p style="margin-top:12px;position:relative">${ic('headphones', 14)} ${DL.count ? 'محفوظ على جهازك: ' + num(DL.count) + ' سورة • ' + fmtBytes(DL.bytes) : 'نزّل السور لتستمع إليها دون إنترنت'}</p>` : `<p style="margin-top:12px;position:relative">تُبثّ التلاوة عبر الإنترنت</p>`}
  </div>`;
}
A['play-all'] = () => { const p = Player.st; if (p.active) Player.toggle(); else Player.play(1); };
A['dl-all'] = () => DL.startAll();
A.qtab = t => { const v = t.dataset.v; Store.set('qtab', v); $$('.seg button', t.parentElement).forEach(b => b.classList.toggle('on', b === t)); haptic('light'); fillQ(v); };
let QT = 'surahs';
function fillQ(tab) {
  const box = $('#qlist'); if (!box) return; QT = tab;
  if (tab === 'juz') box.innerHTML = `<div class="list">${juzRows()}</div>`;
  else if (tab === 'listen') box.innerHTML = listenHead() + `<div class="list" style="margin-top:14px">${Array.from({ length: 114 }, (_, i) => listenRow(i + 1)).join('')}</div>`;
  else box.innerHTML = `<div class="list">${Array.from({ length: 114 }, (_, i) => surahRow(i + 1)).join('')}</div>`;
}
Routes.quran = {
  tab: 'quran',
  render(p) {
    const t = p.t || Store.get('qtab', 'surahs'); const lr = Store.get('lastRead', null);
    return `<header class="ph"><div><h1>المصحف الشريف</h1><p>${num(114)} سورة • ${fmtN(6236)} آية</p></div><div class="ph-act"><button class="ibtn" data-a="go" data-r="search" aria-label="بحث">${ic('search', 21)}</button><button class="ibtn" data-a="go" data-r="bookmarks" aria-label="المحفوظات">${ic('bookmark', 21)}</button></div></header>
    ${lr ? `<button class="cont tap rise" data-a="go" data-r="reader" ${dp({ s: lr.s, a: lr.a })} style="width:calc(100% - 32px);text-align:start"><span class="grow"><small>تابع من حيث توقفت</small><b>${Q.full(lr.s)} • الآية ${num(lr.a)}</b></span><span class="ibtn">${ic('book-open', 20)}</span></button>` : ''}
    <div class="sec"><div class="seg" style="margin:6px 0 12px">
      <button class="${t === 'surahs' ? 'on' : ''}" data-a="qtab" data-v="surahs">السور</button>
      <button class="${t === 'juz' ? 'on' : ''}" data-a="qtab" data-v="juz">الأجزاء</button>
      <button class="${t === 'listen' ? 'on' : ''}" data-a="qtab" data-v="listen">الاستماع</button>
    </div><div id="qlist"></div></div>`;
  },
  mount(el, p) {
    const t = p.t || Store.get('qtab', 'surahs'); fillQ(t);
    const up = () => { if (QT !== 'juz') { const y = $('#view').scrollTop; fillQ(QT); $('#view').scrollTop = y; } };
    this._off = [Bus.on('audio', up), Bus.on('dl', () => { if (QT === 'listen') up(); })];
    if (t === 'listen') DL.refresh();
  },
  leave() { (this._off || []).forEach(f => f()); }
};

/* ================= SEARCH ================= */
let IDX = null;
function buildIdx() { if (IDX) return IDX; IDX = []; W.NUBL_QURAN.forEach((vs, i) => vs.forEach((t, j) => IDX.push({ s: i + 1, a: j + 1, n: norm(t) }))); return IDX; }
const NAMES = META.names.map((n, i) => ({ s: i + 1, n: norm(n) }));
function runSearch(q) {
  const box = $('#sres'); if (!box) return;
  q = q.trim();
  if (!q) { box.innerHTML = `<div class="empty">${ic('search', 34)}<p>ابحث باسم السورة أو رقمها، أو بكلمة من الآية<br><small>مثال: «الكهف» أو «٢:٢٥٥» أو «الصبر»</small></p></div>`; return; }
  const qd = q.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const m = qd.match(/^(\d{1,3})\s*[:：\/\-]\s*(\d{1,3})$/);
  let out = '';
  if (m) { const s = +m[1], a = +m[2]; if (s >= 1 && s <= 114 && a >= 1 && a <= Q.count(s)) out += resRow(s, a, true); }
  const nq = norm(q); const asNum = /^\d{1,3}$/.test(qd) ? +qd : 0;
  const sur = NAMES.filter(x => (asNum && x.s === asNum) || (nq && x.n.indexOf(nq) >= 0)).slice(0, 8);
  if (sur.length) out += `<div class="sec-h"><h2>السور</h2></div><div class="list">${sur.map(x => `<div class="li" data-a="go" data-r="reader" ${dp({ s: x.s })}><span class="snum">${num(x.s)}</span><span class="t"><b class="sname">${Q.name(x.s)}</b><small>${Q.type(x.s)} • ${N.ayahs(Q.count(x.s))}</small></span>${ic('chevron-left', 18, 'chev')}</div>`).join('')}</div>`;
  if (nq.length >= 2 && W.NUBL_QURAN) {
    const idx = buildIdx(); const res = []; let total = 0;
    for (let i = 0; i < idx.length; i++) { if (idx[i].n.indexOf(nq) >= 0) { total++; if (res.length < 60) res.push(idx[i]); } }
    if (total) out += `<div class="sec-h"><h2>الآيات</h2><span>${fmtN(total)} نتيجة${total > 60 ? ' • أول ٦٠' : ''}</span></div><div class="list">${res.map(r => resRow(r.s, r.a)).join('')}</div>`;
  }
  box.innerHTML = out || `<div class="empty">${ic('search', 34)}<p>لا نتائج لـ«${esc(q)}»</p></div>`;
}
function resRow(s, a) {
  return `<div class="li" data-a="go" data-r="reader" ${dp({ s, a, hl: 1 })} style="align-items:flex-start"><span class="t"><small class="gold" style="font-weight:600">${Q.full(s)} • ${num(a)}</small><span style="display:block;font-family:var(--quran);font-size:20px;line-height:2;color:var(--ink);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(Q.ayah(s, a))}</span></span></div>`;
}
Routes.search = {
  tab: 'quran',
  render() {
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="grow"><div class="search" style="margin:0">${ic('search', 20)}<input id="sq" type="search" placeholder="ابحث في القرآن الكريم" autocomplete="off" enterkeyhint="search" style="height:44px"></div></div></div>
    <div class="sec" id="sres"></div>`;
  },
  mount(el) {
    const inp = $('#sq', el); let t = 0;
    Q.load().then(() => runSearch(inp.value)).catch(() => toast('تعذّر تحميل المصحف'));
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => runSearch(inp.value), 220); });
    setTimeout(() => inp.focus(), 350); runSearch('');
  }
};

/* ================= BOOKMARKS ================= */
const BM = {
  all() { return Store.get('bookmarks', []); },
  has(s, a) { return this.all().some(b => b.s === s && b.a === a); },
  toggle(s, a) {
    let l = this.all(); const on = l.some(b => b.s === s && b.a === a);
    l = on ? l.filter(b => !(b.s === s && b.a === a)) : [{ s, a, t: Date.now() }, ...l];
    Store.set('bookmarks', l); return !on;
  }
};
Routes.bookmarks = {
  tab: 'quran',
  render() {
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>المحفوظات</b><small>الآيات التي علّمتها</small></div><div class="bar-act"></div></div><div class="sec" id="bml"></div>`;
  },
  mount() {
    const fill = () => {
      const l = BM.all(); const box = $('#bml'); if (!box) return;
      if (!l.length) { box.innerHTML = `<div class="empty">${ic('bookmark', 38)}<p>لا توجد آيات محفوظة بعد.<br><small>اضغط على أي آية أثناء القراءة واختر «حفظ».</small></p></div>`; return; }
      box.innerHTML = `<div class="list">${l.map(b => `<div class="li" data-a="go" data-r="reader" ${dp({ s: b.s, a: b.a, hl: 1 })} style="align-items:flex-start"><span class="t"><small class="gold" style="font-weight:600">${Q.full(b.s)} • الآية ${num(b.a)}</small><span style="display:block;font-family:var(--quran);font-size:20px;line-height:2;color:var(--ink);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(Q.ayah(b.s, b.a))}</span></span><button class="ibtn sm plain" data-a="bm-del" ${dp({ s: b.s, a: b.a })} aria-label="حذف">${ic('trash-2', 18, 'faint')}</button></div>`).join('')}</div>`;
    };
    Q.load().then(fill); this._fill = fill;
  }
};
A['bm-del'] = (t, p) => { BM.toggle(p.s, p.a); haptic('light'); if (Routes.bookmarks._fill) Routes.bookmarks._fill(); };

/* ================= READER ================= */
let R = { s: 1, obs: null, saveT: 0, cur: 1, sel: null };
const frame = `<svg class="fr" viewBox="0 0 360 90" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="356" height="86" rx="18" style="fill:var(--gold-soft);stroke:var(--gold2)" stroke-width="1.4" vector-effect="non-scaling-stroke"/><rect x="8" y="8" width="344" height="74" rx="13" style="fill:none;stroke:var(--gold2)" stroke-opacity=".7" stroke-dasharray="1 5" stroke-linecap="round" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
function juzStartsIn(s) { const m = {}; META.J.forEach(([js, ja], i) => { if (js === s) m[ja] = i + 1; }); return m; }
function hizbStartsIn(s) { const m = {}; META.H.forEach(([hs, ha]) => { if (hs === s) m[ha] = 1; }); return m; }
function endsJuz(s) { if (s === 114) return 30; const i = META.J.findIndex(([js, ja]) => js === s + 1 && ja === 1); return i > 0 ? i : 0; }
function jdoneBtn(j) { const on = !!Her.khatma.d[j - 1]; return `<button class="jdone ${on ? 'on' : ''}" data-a="jdone" data-j="${j}" ${dp({ j })}>${N.jdoneLabel(j, on)}</button>`; }
A.jdone = (t, p) => N.setJuz(p.j, !Her.khatma.d[p.j - 1]);
function surahBody(s) {
  const vs = W.NUBL_QURAN[s - 1]; const js = juzStartsIn(s); const hz = hizbStartsIn(s);
  let h = `<div class="shead">${frame}<h2>${Q.full(s)}</h2><p>${Q.type(s)} • ${N.ayahs(vs.length)}${js[1] ? ' • بداية ' + Q.juzName(js[1]) : ''}</p></div>`;
  if (s !== 1 && s !== 9) h += `<div class="basm">${esc(Q.ayah(1, 1))}</div>`;
  h += '<div class="mushaf">';
  for (let a = 1; a <= vs.length; a++) {
    if (a > 1 && js[a]) h += `</div><div class="jdiv">${jdoneBtn(js[a] - 1)}<div class="orn">${Q.juzName(js[a])}</div></div><div class="mushaf">`;
    const mark = (hz[a] && !js[a] && !(a === 1)) ? '<span class="hz">۞ </span>' : '';
    h += `<span class="ay" id="a${a}" data-a="ayah">${mark}${esc(vs[a - 1])} <span class="ae">${ae(a)}</span></span> `;
  }
  h += '</div>';
  const ej = endsJuz(s);
  if (ej) h += `<div class="jdiv">${jdoneBtn(ej)}</div>`;
  h += `<div class="rnav">${s > 1 ? `<button class="btn ghost" data-a="r-go" ${dp({ s: s - 1 })}>${ic('chevron-right', 18)} ${Q.name(s - 1)}</button>` : ''}${s < 114 ? `<button class="btn pri" data-a="r-go" ${dp({ s: s + 1 })}>${Q.name(s + 1)} ${ic('chevron-left', 18)}</button>` : ''}</div>`;
  return h;
}
function rListenIcon() { const p = Player.st; return p.active && p.s === R.s ? (p.loading ? ic('loader', 21, 'spin') : p.playing ? `<span class="pri">${eq}</span>` : ic('play', 21)) : ic('headphones', 21); }
Routes.reader = {
  tab: 'quran', noTabs: true, awake: true, cls: 'reader-page',
  render(p) {
    const s = Math.max(1, Math.min(114, +p.s || 1)); R.s = s; R.cur = +p.a || 1;
    return `<div class="bar" id="rbar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button>
      <div class="bar-t"><b>${Q.full(s)}</b><small id="r-sub">${Q.juzName(Q.juzOf(s, R.cur))} • الصفحة ${num(Q.pageOf(s, R.cur))}</small></div>
      <div class="bar-act"><button class="ibtn plain" id="r-ls" data-a="r-listen" aria-label="استماع">${rListenIcon()}</button><button class="ibtn plain" data-a="r-settings" aria-label="إعدادات القراءة">${ic('type', 21)}</button></div></div>
      <div id="rbody"><div class="empty">${ic('loader', 30, 'spin')}<p>جارٍ فتح المصحف…</p></div></div>`;
  },
  mount(el, p) {
    const s = R.s;
    Q.load().then(() => {
      const body = $('#rbody'); if (!body || R.s !== s) return;
      body.innerHTML = surahBody(s);
      const a = +p.a || 0;
      if (a > 1) { const t = $('#a' + a); if (t) { t.scrollIntoView({ block: 'center' }); if (p.hl) t.classList.add('flash'); } }
      else if (p.hl && a === 1) { const t = $('#a1'); if (t) t.classList.add('flash'); }
      this._observe(s);
    }).catch(() => { const b = $('#rbody'); if (b) b.innerHTML = `<div class="empty">${ic('info', 30)}<p>تعذّر فتح المصحف</p></div>`; });
    this._off = Bus.on('audio', () => { const b = $('#r-ls'); if (b) b.innerHTML = rListenIcon(); });
  },
  _observe(s) {
    const view = $('#view');
    if (R.obs) R.obs.disconnect();
    R.obs = new IntersectionObserver(ents => {
      let best = null;
      ents.forEach(e => { if (e.isIntersecting) { const n = +e.target.id.slice(1); if (best == null || n < best) best = n; } });
      if (best == null) return;
      R.cur = best; const sub = $('#r-sub'); if (sub) sub.textContent = Q.juzName(Q.juzOf(s, best)) + ' • الصفحة ' + num(Q.pageOf(s, best));
      clearTimeout(R.saveT); R.saveT = setTimeout(() => Store.set('lastRead', { s, a: best, t: Date.now() }), 800);
    }, { root: view, rootMargin: '-22% 0px -70% 0px', threshold: 0 });
    $$('.ay').forEach(x => R.obs.observe(x));
    Store.set('lastRead', { s, a: R.cur || 1, t: Date.now() });
  },
  leave() { if (R.obs) { R.obs.disconnect(); R.obs = null; } clearTimeout(R.saveT); if (this._off) this._off(); Store.set('lastRead', { s: R.s, a: R.cur || 1, t: Date.now() }); }
};
A['r-go'] = (t, p) => { haptic('light'); Nav.go('reader', { s: p.s }, { replace: true }); };
A['r-listen'] = () => { const p = Player.st; if (p.active && p.s === R.s) Player.toggle(); else { Player.play(R.s); toast('تلاوة ' + Q.full(R.s) + ' بصوت ' + Player.RECITER, 'headphones'); } };
A['r-settings'] = () => {
  const el = Layer.sheet(`<div class="row"><b class="grow">حجم الخط</b><span class="badge" id="rq-v">${num(S.qfs)}</span></div>
    <input type="range" min="22" max="46" step="1" value="${S.qfs}" id="rq" aria-label="حجم خط المصحف">
    <div class="font-prev" style="margin-top:6px">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ${ae(1)}</div>
    <div class="list" style="margin-top:14px">
      ${N.row('moon', 'violet', 'الوضع الليلي', 'قراءة مريحة في الظلام', sw('rdark', N.isDark()))}
      ${N.row('sun', 'gold', 'إبقاء الشاشة مضاءة', '', sw('keepAwake2', S.keepAwake))}
    </div>`, { title: 'إعدادات القراءة' });
  const r = $('#rq', el); rangeFill(r);
  r.addEventListener('input', () => { rangeFill(r); document.documentElement.style.setProperty('--qfs', r.value + 'px'); $('#rq-v', el).textContent = num(r.value); });
  r.addEventListener('change', () => setS('qfs', +r.value));
};
N.SW.rdark = v => { setS('theme', v ? 'dark' : 'light'); applyTheme(); };
N.SW.keepAwake2 = v => { setS('keepAwake', v); N.keepAwake(v); };
A.ayah = t => {
  const a = +t.id.slice(1); const s = R.s; haptic('light');
  $$('.ay.sel').forEach(x => x.classList.remove('sel')); t.classList.add('sel');
  const bm = BM.has(s, a);
  const el = Layer.sheet(`<div style="font-family:var(--quran);font-size:22px;line-height:2.1;text-align:center;padding:4px 4px 10px;max-height:34vh;overflow:auto">${esc(Q.ayah(s, a))} <span class="ae">${ae(a)}</span></div>
    <div class="acts-grid">
      <button class="act" data-a="ay-copy" ${dp({ s, a })}><span class="ico">${ic('copy', 21)}</span>نسخ</button>
      <button class="act" data-a="ay-share" ${dp({ s, a })}><span class="ico blue">${ic('share-2', 21)}</span>مشاركة</button>
      <button class="act" data-a="ay-bm" ${dp({ s, a })}><span class="ico gold">${ic(bm ? 'bookmark-check' : 'bookmark', 21)}</span>${bm ? 'محفوظة' : 'حفظ'}</button>
      <button class="act" data-a="ay-listen" ${dp({ s, a })}><span class="ico terra">${ic('headphones', 21)}</span>استماع</button>
    </div>`, { title: Q.full(s) + ' • الآية ' + num(a), onClose: () => t.classList.remove('sel') });
  return el;
};
const ayPlain = (s, a) => '﴿' + Q.ayah(s, a) + '﴾ [' + Q.full(s) + ': ' + num(a) + ']';
A['ay-copy'] = (t, p) => { copy(ayPlain(p.s, p.a)); Layer.close(); };
A['ay-share'] = (t, p) => { share(ayPlain(p.s, p.a)); Layer.close(); };
A['ay-bm'] = (t, p) => { const on = BM.toggle(p.s, p.a); haptic('success'); toast(on ? 'حُفظت الآية في المحفوظات' : 'أُزيلت من المحفوظات', on ? 'bookmark-check' : 'bookmark'); Layer.close(); };
A['ay-listen'] = (t, p) => { Layer.close(); if (!Player.isOn(p.s)) Player.play(p.s); else if (!Player.st.playing) Player.toggle(); };

N.BM = BM;
})();
