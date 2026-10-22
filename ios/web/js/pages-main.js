/* نُبل — main pages */
(function () {
'use strict';
const { S, setS, Store, Bus, Native, num, fmtN, fmtTime, fmtCountdown, fmtBytes, ic, esc, dp, $, $$, Q, ae, Routes, Nav, A, Layer, toast, haptic, copy, share,
  hijriStr, gregStr, hijri, HM, dayKey, dayIndex, ring, setRing, sw, rangeFill, MARK, moonSvg, Her, CONTENT, confirmDlg, Prayer, Player, DL, applyTheme, syncSchedule, ensureNotifPermission } = N;
const NB = CONTENT.nabila;

/* ---------- shared renderers ---------- */
function qText(q) {
  const arr = Array.isArray(q) ? q : [q];
  return arr.map(x => x.v.map((t, i) => esc(t) + ' <span class="ae">' + ae(x.a + i) + '</span>').join(' ')).join('<br>');
}
function qRef(q) {
  const arr = Array.isArray(q) ? q : [q];
  return arr.map(x => 'سورة ' + Q.name(x.s) + ' • ' + (x.a === x.b ? 'الآية ' + num(x.a) : 'الآيات ' + num(x.a) + '–' + num(x.b))).join('، ');
}
function qPlain(q) { const arr = Array.isArray(q) ? q : [q]; return arr.map(x => '﴿' + x.v.map((t, i) => t + ' (' + num(x.a + i) + ')').join(' ') + '﴾').join('\n'); }
N.qText = qText; N.qRef = qRef; N.qPlain = qPlain;

const SW = {};
N.SW = SW;
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.sw && SW[t.dataset.sw]) { haptic('light'); SW[t.dataset.sw](t.checked, t); }
});

/* ---------- sparkles for "دعوتُ لها" ---------- */
function sparkles(from) {
  const r = from.getBoundingClientRect();
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('i'); s.className = 'spark';
    s.style.left = (r.left + r.width / 2 + (Math.random() - .5) * r.width * .7) + 'px';
    s.style.top = (r.top + r.height * .3) + 'px';
    s.style.setProperty('--dx', ((Math.random() - .5) * 120) + 'px');
    s.style.animationDelay = (i * 0.07) + 's';
    const z = 8 + Math.random() * 10; s.style.width = s.style.height = z + 'px';
    document.body.appendChild(s); setTimeout(() => s.remove(), 2000);
  }
}
const PRAY_MSGS = ['تقبّل الله دعاءك، ورحم نبيلة', 'اللهم آمين، وجزاك الله برًّا', 'رحمها الله وجعل قبرها روضة', 'دعوةٌ صادقة تصلها بإذن الله'];
function prayed(btn) {
  const v = Her.addDua(1); haptic('success'); if (btn) sparkles(btn);
  $$('[data-her=duas]').forEach(e => e.textContent = fmtN(v));
  if (v === 1 || v % 10 === 0) toast(PRAY_MSGS[(v / 10 | 0) % PRAY_MSGS.length], 'heart');
}
A.pray = t => prayed(t);
A['pray-home'] = t => prayed(t);

/* ================= HOME ================= */
function greet(h) {
  if (h >= 4 && h < 12) return ['صباحُ الخير،', 'وقلبٌ مطمئنّ.', '«اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت»'];
  if (h >= 12 && h < 17) return ['يومٌ طيّب،', 'وذِكرٌ لا يغيب.', '«ألا بذكر الله تطمئن القلوب»'];
  if (h >= 17 && h < 22) return ['مساءُ الخير،', 'وسكينةٌ تغشاك.', '«أمسينا وأمسى الملك لله، والحمد لله»'];
  return ['ليلةٌ هانئة،', 'ونومٌ على ذِكر.', 'لا تنسَ أذكار النوم، ودعوةً لنبيلة.'];
}
function heroHTML(now = new Date()) {
  const st = Prayer.status(now); const l = Prayer.loc(); const ph = Prayer.phase(now);
  if (!st) return '';
  const nx = st.next; const nm = nx.sun ? 'الشروق' : Prayer.prName(nx.k, nx.t);
  return `<div class="hero ${ph}" data-a="go" data-r="prayers">
    <div class="photo"></div><div class="tint"></div><div class="stars"></div><div class="shade"></div>
    <div class="hero-in">
      <div class="hero-top"><span class="loc glass">${ic('map-pin', 15)}${esc(l.city || 'موقعي')}</span>${N.WEB ? `<span class="loc glass">${ic('compass', 15)}القبلة ${num(Math.round(Prayer.qibla()))}°</span>` : `<span class="loc glass">${ic(S.pnOn ? 'bell-ring' : 'bell-off', 15)}${S.pnOn ? 'تنبيه الأذان مفعّل' : 'التنبيه متوقف'}</span>`}</div>
      <div class="hero-main"><small>${nx.sun ? 'شروق الشمس' : 'الصلاة القادمة'}${nx.tomorrow ? ' (غدًا)' : ''}</small><h3>${nm} <span>${fmtTime(nx.t)}</span></h3><div class="cd" id="cd">${fmtCountdown(nx.t - now)}</div></div>
      <div class="ptimes">${st.list.map(p => `<div class="pt ${p.sun ? 'sun' : ''} ${p.k === nx.k ? 'next' : p.t <= now ? 'past' : ''}"><span>${p.k === 'dhuhr' && now.getDay() === 5 ? 'الجمعة' : p.n}</span><b>${fmtTime(p.t, false)}</b></div>`).join('')}</div>
    </div></div>`;
}
let homeT = 0, homeNext = 0;
Routes.home = {
  tab: 'home',
  render() {
    const now = new Date(); const g = greet(now.getHours());
    const lr = Store.get('lastRead', null);
    const vs = CONTENT.verses; const v = vs[dayIndex() % vs.length];
    const deeds = CONTENT.deeds; const d = deeds[(dayIndex() * 7) % deeds.length];
    const done = Store.get('deed:' + dayKey(), false);
    const s = Player.st.active ? Player.st.s : (Store.get('lastAudio', 0) || 18);
    return `
    <div class="home-top">
      <div class="brand"><div class="tile"><img src="${MARK}" alt=""></div><div class="grow"><div class="wm">نُبل</div><small>${hijriStr(now)} • ${gregStr(now, false)}</small></div></div>
      <button class="ibtn" data-a="go" data-r="settings" aria-label="الإعدادات">${ic('settings', 21)}</button>
    </div>
    <div class="hello rise"><h2>${g[0]} <em>${g[1]}</em></h2><p>${g[2]}</p></div>
    <div class="rise d1" id="hero-wrap">${heroHTML(now)}</div>
    <div class="mem-mini rise d2">
      ${moonSvg}
      <div class="eyebrow">${ic('sparkle', 14)} صدقةٌ جارية عن روح</div>
      <div class="mem-name">${NB.full}</div>
      <p class="mem-dua">اللهم اغفر لها وارحمها، واجعل قبرها روضةً من رياض الجنة</p>
      <div class="mem-stats"><span><b data-her="duas">${fmtN(Her.duas)}</b> دعوة</span><span><b>${num(Her.juzDone())}/${num(30)}</b> جزءًا من ختمتها</span></div>
      <div class="mem-acts"><button class="btn gold" data-a="pray-home">${ic('hand-heart', 20)} دعوتُ لها</button><button class="btn glassy" data-a="tab" data-r="nabila">لروحها ${ic('chevron-left', 18)}</button></div>
    </div>
    <div id="tiles">${tilesHTML()}</div>
    ${lr ? `<button class="card wide-card tap rise d5" data-a="go" data-r="reader" ${dp({ s: lr.s, a: lr.a })} style="width:calc(100% - 32px);text-align:start">
      <span class="art paper">${ic('book-open', 26)}</span>
      <span class="grow"><small class="muted">تابع القراءة</small><b style="display:block;font-size:16.5px">${Q.full(lr.s)}</b><small class="muted">الآية ${num(lr.a)} • ${Q.juzName(Q.juzOf(lr.s, lr.a))}</small></span>${ic('chevron-left', 20, 'faint')}</button>` : ''}
    <div class="card wide-card rise d5" id="home-listen">${listenHTML(s)}</div>
    <div class="verse rise d6">
      <div class="orn">آية اليوم</div>
      <div class="q">${qText(v)}</div>
      <div class="ref"><span>${qRef(v)}</span><span class="row" style="gap:2px"><button class="ibtn sm plain" data-a="v-copy" aria-label="نسخ">${ic('copy', 18)}</button><button class="ibtn sm plain" data-a="v-share" aria-label="مشاركة">${ic('share-2', 18)}</button></span></div>
    </div>
    <div class="card deed rise">
      <div class="eyebrow">${ic('sprout', 15)} أثر اليوم • ${esc(d.c)}</div>
      <h4>${esc(d.t)}</h4><p>${esc(d.d)}</p>
      <div class="row"><button class="btn sm ${done ? '' : 'pri'}" data-a="deed-done">${ic(done ? 'circle-check' : 'check', 18)} ${done ? 'أنجزته، تقبّل الله' : 'أنجزته'}</button><button class="btn sm ghost" data-a="go" data-r="deeds">أفكار أخرى</button></div>
    </div>
    <div class="dedic">صدقةٌ جارية عن روح<strong>${NB.full}</strong>اللهم اجعل كل حرفٍ يُقرأ هنا نورًا لها في قبرها</div>`;
  },
  mount(el) {
    const tick = () => {
      const cd = $('#cd'); if (!cd) return;
      const now = new Date(); const st = Prayer.status(now);
      if (!st) return;
      if (homeNext && st.next.t.getTime() !== homeNext) { $('#hero-wrap').innerHTML = heroHTML(now); }
      homeNext = st.next.t.getTime();
      const c = $('#cd'); if (c) c.textContent = fmtCountdown(st.next.t - now);
    };
    homeNext = 0; tick(); clearInterval(homeT); homeT = setInterval(tick, 1000);
    this._off = [Bus.on('audio', () => { const h = $('#home-listen'); if (h) h.innerHTML = listenHTML(Player.st.s); }),
      Bus.on('loc', () => { const h = $('#hero-wrap'); if (h) h.innerHTML = heroHTML(); })];
  },
  leave() { clearInterval(homeT); (this._off || []).forEach(f => f()); }
};
function listenHTML(s) {
  const p = Player.st; const on = p.active && p.s === s;
  return `<span class="art green"><img src="${MARK}" alt=""></span>
    <span class="grow"><small class="muted">استمع بصوت ${Player.RECITER}</small><b style="display:block;font-size:16.5px">${Q.full(s)}</b><small class="muted">${on ? (p.loading ? 'جارٍ التحميل…' : p.playing ? 'يُتلى الآن' : 'متوقف مؤقتًا') : 'المصحف المرتّل كاملًا'}</small></span>
    <button class="ibtn" style="background:var(--pri);color:#fff;border:0" data-a="home-play" ${dp({ s })} aria-label="تشغيل">${on ? N.playIcon(22) : ic('play', 22)}</button>`;
}
function tilesHTML() {
  const zk = N.Zk.suggest(); const zp = N.Zk.progress(zk.id); const kh = Her.juzDone(); const tt = N.Tsb.today(); const qb = Math.round(Prayer.qibla());
  return `<div class="tiles">
    <button class="tile-c tap rise d3" data-a="go" data-r="zikr" ${dp({ c: zk.id })}><span class="ico gold">${ic(zk.icon, 22)}</span><b>${zk.title}</b><small>${zp.done ? 'أتممتها اليوم، تقبّل الله' : num(zp.n) + ' من ' + N.dhikrs(zp.total)}</small><div class="pbar"><i style="width:${zp.pct * 100}%"></i></div></button>
    <button class="tile-c tap rise d3" data-a="go" data-r="tasbeeh"><span class="ico">${ic('circle-dot', 22)}</span><b>السبحة</b><small>${tt ? 'سبّحتَ اليوم ' + fmtN(tt) + ' مرة' : 'سبّح الله، واذكره كثيرًا'}</small></button>
    <button class="tile-c tap rise d4" data-a="go" data-r="khatma"><span class="ico terra">${ic('book-open-text', 22)}</span><b>ختمة لروحها</b><small>${num(kh)} من ${num(30)} جزءًا</small><div class="pbar"><i style="width:${kh / 30 * 100}%"></i></div></button>
    <button class="tile-c tap rise d4" data-a="go" data-r="qibla"><span class="ico blue">${ic('compass', 22)}</span><b>اتجاه القبلة</b><small>${num(qb)}° من الشمال</small></button>
  </div>`;
}
A['home-play'] = (t, p) => { const st = Player.st; if (st.active && st.s === p.s) Player.toggle(); else Player.play(p.s); };
A['v-copy'] = () => { const v = CONTENT.verses[dayIndex() % CONTENT.verses.length]; copy(qPlain(v) + '\n[' + qRef(v) + ']'); };
A['v-share'] = () => { const v = CONTENT.verses[dayIndex() % CONTENT.verses.length]; share(qPlain(v) + '\n[' + qRef(v) + ']'); };
A['deed-done'] = t => {
  const k = 'deed:' + dayKey(); const v = !Store.get(k, false); Store.set(k, v);
  if (v) { haptic('success'); toast('تقبّل الله منك، وجعله في ميزانك', 'sprout'); Store.set('deedCount', Store.get('deedCount', 0) + 1); }
  else Store.set('deedCount', Math.max(0, Store.get('deedCount', 0) - 1));
  t.className = 'btn sm ' + (v ? '' : 'pri'); t.innerHTML = ic(v ? 'circle-check' : 'check', 18) + ' ' + (v ? 'أنجزته، تقبّل الله' : 'أنجزته');
};

/* ================= NABILA HUB ================= */
function duaCard(d, i) {
  const body = d.q ? `<div class="qx">${qText(d.q)}</div>` : `<div class="tx">${esc(d.t)}</div>`;
  return `<div class="card dua rise">
    <div class="h">${ic(d.k === 'quran' ? 'book-open' : d.k === 'general' ? 'heart' : 'scroll-text', 15)} ${esc(d.h)}</div>
    ${body}
    <div class="ref">${esc(d.r)}</div>
    <div class="acts"><button data-a="dua-copy" ${dp({ i })}>${ic('copy', 17)} نسخ</button><button data-a="dua-share" ${dp({ i })}>${ic('share-2', 17)} مشاركة</button><button class="amen" data-a="pray">${ic('hand-heart', 18)} دعوتُ بها</button></div>
  </div>`;
}
function duaPlain(d) { return d.q ? qPlain(d.q) + '\n[' + d.r + ']' : d.t; }
A['dua-copy'] = (t, p) => copy(duaPlain(CONTENT.duas[p.i]));
A['dua-share'] = (t, p) => share(duaPlain(CONTENT.duas[p.i]));
A['share-invite'] = () => share('أحبّتي، أسألكم دعوةً صادقة لروح الوالدة ' + NB.full + ':\n«اللهم اغفر لها وارحمها، وعافها واعفُ عنها، وأكرم نُزُلها، ووسّع مُدخلها، واجعل قبرها روضةً من رياض الجنة».\nجزاكم الله خيرًا، وجعله في ميزان حسناتكم.');

function khatmaGrid(k) {
  return `<div class="kh-grid">${k.d.map((v, i) => `<button class="kj ${v ? 'on' : ''}" data-a="juz-sheet" ${dp({ j: i + 1 })} aria-label="${Q.juzName(i + 1)}">${num(i + 1)}</button>`).join('')}</div>`;
}
Routes.nabila = {
  tab: 'nabila',
  render() {
    const k = Her.khatma; const jd = k.d.filter(Boolean).length;
    return `<div class="mem-hero">
      <div class="sp-stars"></div>
      ${moonSvg}
      <div class="lbl">صدقةٌ جارية عن روح المرحومة بإذن الله</div>
      <div class="nm">${NB.full}</div>
      <div class="rh">رحمها الله رحمةً واسعة، وأسكنها فسيح جنّاته</div>
      <div class="stats">
        <div class="stat"><b data-her="duas">${fmtN(Her.duas)}</b><small>دعوةً لها</small></div>
        <div class="stat"><b>${fmtN(Her.tsb)}</b><small>تسبيحة وذِكرًا</small></div>
        <div class="stat"><b>${num(k.n)}</b><small>ختمةً مكتملة</small></div>
      </div>
      <div style="height:30px"></div>
    </div>
    <button class="pray" data-a="pray">${ic('hand-heart', 26)} دعوتُ لها</button>
    <div class="card hadith rise">
      <div class="orn" style="margin-bottom:8px">«أثرٌ لا ينقطع»</div>
      <div class="tx">${esc(CONTENT.jariya.t)}</div>
      <div class="ref">${esc(CONTENT.jariya.r)}</div>
    </div>
    <div class="sec-h" style="padding-inline:22px"><h2>ختمة لروحها</h2><button data-a="go" data-r="khatma">التفاصيل</button></div>
    <div class="card kh-card rise">
      <div class="row">${ring(64, 7, jd / 30, 'var(--gold2)')}<div class="grow"><b style="font-size:17px">${num(jd)} من ${num(30)} جزءًا</b><small class="muted" style="display:block">اقرأ جزءًا وأضفه، وشارك أحبابك</small></div></div>
      ${khatmaGrid(k)}
    </div>
    <div class="sec-h" style="padding-inline:22px"><h2>أدعيةٌ لها</h2><span>${num(CONTENT.duas.length)} دعاءً</span></div>
    ${CONTENT.duas.map(duaCard).join('')}
    <div class="sec" style="margin-top:14px"><button class="btn block gold" data-a="share-invite">${ic('share-2', 20)} ادعُ أحبّتك للدعاء لها</button></div>
    <div class="dedic">«وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا»</div>`;
  },
  darkTop: true,
  mount(el) {
    const view = $('#view'); const hero = $('.mem-hero', el); let dark = true;
    const onS = () => {
      const d = view.scrollTop < (hero ? hero.offsetHeight - 40 : 200);
      if (d === dark) return; dark = d; document.body.classList.toggle('top-dark', d);
      Native.call('setBars', d || N.isDark());
    };
    view.addEventListener('scroll', onS, { passive: true }); this._s = onS;
  },
  leave() { $('#view').removeEventListener('scroll', this._s); }
};

/* ================= KHATMA ================= */
function juzRange(j) { const [s, a] = N.META.J[j - 1]; const [es, ea] = Q.juzEnd(j); return { s, a, es, ea }; }
A['juz-sheet'] = (t, p) => {
  const j = p.j; const r = juzRange(j); const k = Her.khatma; const on = !!k.d[j - 1];
  const el = Layer.sheet(`<p class="muted" style="margin-bottom:14px">من ${Q.full(r.s)} (${num(r.a)}) إلى ${Q.full(r.es)} (${num(r.ea)})</p>
    <div class="stack"><button class="btn pri block" data-a="juz-read" ${dp({ j })}>${ic('book-open', 20)} اقرأ ${Q.juzName(j)}</button>
    <button class="btn block ${on ? 'ghost' : 'gold'}" data-a="juz-toggle" ${dp({ j })}>${ic(on ? 'undo-2' : 'circle-check', 20)} ${on ? 'إلغاء التحديد' : 'تمّت قراءته لروحها'}</button></div>`, { title: Q.juzName(j) });
  return el;
};
A['juz-read'] = (t, p) => { const r = juzRange(p.j); Layer.closeAll(); Nav.go('reader', { s: r.s, a: r.a }); };
A['juz-toggle'] = (t, p) => { Layer.close(); setJuz(p.j, !Her.khatma.d[p.j - 1]); };
function setJuz(j, on) {
  const k = Her.khatma; k.d[j - 1] = on ? Date.now() : 0; Her.setKhatma(k);
  haptic(on ? 'success' : 'light');
  $$('.kj').forEach((b, i) => b.classList.toggle('on', !!k.d[i]));
  $$('.jdone[data-j="' + j + '"]').forEach(b => { b.classList.toggle('on', on); b.innerHTML = jdoneLabel(j, on); });
  if (on) {
    const n = k.d.filter(Boolean).length;
    if (n === 30) khatmaComplete(); else toast('أُضيف ' + Q.juzName(j) + ' إلى ختمتها • ' + num(n) + '/' + num(30), 'circle-check');
  }
  if (Nav.cur().name === 'khatma' || Nav.cur().name === 'nabila') Nav.refresh();
}
function jdoneLabel(j, on) { return ic(on ? 'circle-check' : 'check', 16) + (on ? ' أُضيف ' + Q.juzName(j) + ' لختمتها' : ' أتممتُ ' + Q.juzName(j) + ' — أضفه لختمتها'); }
N.setJuz = setJuz; N.jdoneLabel = jdoneLabel;
async function khatmaComplete() {
  haptic('success');
  const el = Layer.dialog(`<div style="font-size:46px;line-height:1">🌿</div><h3 style="margin-top:8px">ما شاء الله، تمّت الختمة</h3>
    <p class="prose" style="font-family:var(--naskh);font-size:18px;color:var(--ink)">اللهم تقبّل منّا، واجعل ثواب هذه الختمة نورًا لنبيلة في قبرها، ورفعةً لها في جنّات النعيم، واجمعنا بها في الفردوس الأعلى.</p>
    <div class="acts"><button class="btn ghost" data-r="0">لاحقًا</button><button class="btn gold" data-r="1">ختمة جديدة</button></div>`);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === '1') { const k = Her.khatma; k.n = (k.n || 0) + 1; k.d = new Array(30).fill(0); Her.setKhatma(k); toast('بدأت ختمة جديدة لروحها، بارك الله فيك', 'sparkles'); }
    Layer.close(); if (Nav.cur().name === 'khatma' || Nav.cur().name === 'nabila') Nav.refresh();
  });
}
Routes.khatma = {
  tab: 'nabila',
  render() {
    const k = Her.khatma; const jd = k.d.filter(Boolean).length;
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>ختمة لروح نبيلة</b><small>${num(k.n)} ختمة مكتملة</small></div><div class="bar-act"><button class="ibtn plain" data-a="kh-share" aria-label="مشاركة">${ic('share-2', 21)}</button></div></div>
    <div class="card kh-card rise" style="margin-top:14px;text-align:center">
      <div style="position:relative;width:150px;margin:6px auto 4px">${ring(150, 12, jd / 30, 'var(--gold2)')}<div style="position:absolute;inset:0;display:grid;place-items:center"><div><b style="font-size:36px;display:block;line-height:1.1">${num(jd)}</b><small class="muted">من ${num(30)} جزءًا</small></div></div></div>
      <p class="muted" style="font-size:13.5px;margin-top:6px">اضغط على الجزء لقراءته أو لتحديده كمقروء. ويمكنك توزيع الأجزاء على العائلة والأحبّة.</p>
      ${khatmaGrid(k)}
    </div>
    <div class="sec"><div class="list">${k.d.map((v, i) => { const r = juzRange(i + 1); return `<button class="li" data-a="juz-sheet" ${dp({ j: i + 1 })}><span class="snum">${num(i + 1)}</span><span class="t"><b>${Q.juzName(i + 1)}</b><small>${Q.name(r.s)} ${num(r.a)} — ${Q.name(r.es)} ${num(r.ea)}</small></span>${v ? `<span class="badge gold">${ic('check', 14)} تمّ</span>` : ic('chevron-left', 18, 'chev')}</button>`; }).join('')}</div></div>
    <div class="sec"><button class="btn block ghost" data-a="kh-reset">${ic('rotate-ccw', 18)} إعادة ضبط الختمة الحالية</button></div>`;
  }
};
A['kh-share'] = () => {
  const k = Her.khatma; const left = k.d.map((v, i) => v ? 0 : i + 1).filter(Boolean);
  share('ختمة قرآن لروح الوالدة ' + NB.full + ' رحمها الله.\nأُنجز ' + num(30 - left.length) + ' من ' + num(30) + ' جزءًا.' + (left.length ? '\nالأجزاء المتبقية: ' + left.map(num).join('، ') + '\nمن يرغب بقراءة جزءٍ لروحها فليخبرني، جزاكم الله خيرًا.' : ''));
};
A['kh-reset'] = async () => { if (await confirmDlg({ title: 'إعادة ضبط الختمة؟', text: 'سيُلغى تحديد الأجزاء في الختمة الحالية، وتبقى الختمات المكتملة محفوظة.', ok: 'إعادة الضبط', danger: true })) { const k = Her.khatma; k.d = new Array(30).fill(0); Her.setKhatma(k); Nav.refresh(); } };

/* ================= DEEDS ================= */
Routes.deeds = {
  tab: 'more',
  render() {
    const all = CONTENT.deeds; const ti = (dayIndex() * 7) % all.length; const d = all[ti]; const done = Store.get('deed:' + dayKey(), false);
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>أثر اليوم</b><small>افعل خيرًا ولو كان صغيرًا</small></div><div class="bar-act"></div></div>
    <div class="now-card morning rise" style="background:linear-gradient(135deg,#1B6A50,#0B3D2E 60%,#062A20)">
      <div class="eyebrow" style="color:#F1D9A0">${ic('sprout', 15)} عمل اليوم • ${esc(d.c)}</div>
      <h3>${esc(d.t)}</h3><p>${esc(d.d)}</p>
      <button class="btn" data-a="deed-done" style="${done ? '' : ''}">${ic(done ? 'circle-check' : 'check', 18)} ${done ? 'أنجزته، تقبّل الله' : 'أنجزته'}</button>
    </div>
    <p class="center muted" style="margin:14px 20px 0;font-size:13.5px">أنجزتَ ${num(Store.get('deedCount', 0))} عملًا صالحًا حتى الآن، وكل أثرٍ طيب يُذكّر بها.</p>
    <div class="sec-h" style="padding-inline:22px"><h2>أفكار للخير</h2><span>${num(all.length)} فكرة</span></div>
    <div class="sec"><div class="list">${all.map((x, i) => `<div class="li"><span class="ico ${i % 3 === 0 ? 'gold' : i % 3 === 1 ? '' : 'terra'}">${ic(x.c.indexOf('صدقة') >= 0 ? 'gift' : x.c.indexOf('القرآن') >= 0 ? 'book-open' : x.c.indexOf('ذكر') >= 0 || x.c.indexOf('دعاء') >= 0 ? 'sparkles' : 'heart-handshake', 20)}</span><span class="t"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span></div>`).join('')}</div></div>`;
  }
};

/* ================= MORE ================= */
Routes.more = {
  tab: 'more',
  render() {
    const item = (r, icon, cls, t, s) => `<button class="li" data-a="go" data-r="${r}"><span class="ico ${cls}">${ic(icon, 21)}</span><span class="t"><b>${t}</b><small>${s}</small></span>${ic('chevron-left', 18, 'chev')}</button>`;
    const l = Prayer.loc();
    return `<header class="ph"><div><h1>المزيد</h1><p>أدوات تعينك على الطاعة</p></div></header>
    <div class="sec"><div class="list">
      ${item('prayers', 'clock', '', 'مواقيت الصلاة', esc(l.city) + ' • ' + Prayer.methodName())}
      ${item('qibla', 'compass', 'blue', 'اتجاه القبلة', 'بوصلة دقيقة نحو الكعبة المشرّفة')}
      ${item('tasbeeh', 'circle-dot', 'gold', 'السبحة', 'عدّاد للتسبيح والذِّكر')}
      ${item('deeds', 'sprout', 'terra', 'أثر اليوم', 'أفكار يومية لعملٍ صالح')}
      ${item('bookmarks', 'bookmark', 'violet', 'المحفوظات', 'الآيات التي حفظتها')}
    </div></div>
    <div class="sec"><div class="list">
      ${item('settings', 'settings', '', 'الإعدادات', 'المظهر، الخط، التنبيهات')}
      ${item('about', 'info', 'gold', 'عن نُبل', 'القصة، والمصادر، والخصوصية')}
      ${N.WEB && !N.STANDALONE ? `<button class="li" data-a="install-app"><span class="ico">${ic('square-plus', 21)}</span><span class="t"><b>ثبّت التطبيق على جوالك</b><small>ليفتح بأيقونة مثل باقي التطبيقات</small></span>${ic('chevron-left', 18, 'chev')}</button>` : ''}
      <button class="li" data-a="share-app"><span class="ico terra">${ic('share-2', 21)}</span><span class="t"><b>شارك التطبيق</b><small>انشر الخير، وليكن لك مثل أجره</small></span>${ic('chevron-left', 18, 'chev')}</button>
    </div></div>
    <div class="dedic">«مَن دلَّ على خيرٍ فله مثلُ أجرِ فاعله»<br><small>صحيح مسلم (١٨٩٣)</small></div>`;
  }
};
A['share-app'] = () => share((N.WEB ? 'رابط التطبيق (أندرويد وآيفون): ' + appUrl() + '\n\n' : '') + '«نُبل» — تطبيق للقرآن الكريم بصوت ياسر الدوسري، والأذكار، ومواقيت الصلاة، والقبلة، يعمل دون إنترنت ودون إعلانات.\nصدقةٌ جارية عن روح ' + NB.full + '، رحمها الله. لا تنسَوها من دعائكم.');

function appUrl() { return location.href.split('#')[0].split('?')[0].replace(/index\.html$/, ''); }
N.appUrl = appUrl;
N.webNoteHTML = () => `<div class="sg"><h4>التذكيرات</h4><div class="card pad" style="display:flex;gap:12px;align-items:flex-start"><span class="ico gold">${ic('bell-off', 20)}</span><p class="muted" style="font-size:13.5px;line-height:1.8">تنبيهات الأذان والتذكيرات متوفرة في نسخة أندرويد. على الآيفون لا يسمح النظام لتطبيقات الويب بجدولة التنبيهات دون خادم، أمّا المواقيت والعدّاد التنازلي فتعمل كاملة.</p></div></div>`;

/* ================= SETTINGS ================= */
function seg(key, opts) { return `<div class="seg" data-seg="${key}">${opts.map(o => `<button class="${String(S[key]) === String(o[0]) ? 'on' : ''}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`; }
document.addEventListener('click', e => {
  const b = e.target.closest('.seg[data-seg] button'); if (!b) return;
  const segEl = b.parentElement; const key = segEl.dataset.seg; let v = b.dataset.v;
  if (/^-?\d+(\.\d+)?$/.test(v)) v = +v;
  haptic('light'); setS(key, v); $$('button', segEl).forEach(x => x.classList.toggle('on', x === b));
  if (key === 'theme') applyTheme();
  if (key === 'digits' || key === 'clock' || key === 'hijriAdj') Nav.refresh();
});
const row = (icon, cls, t, s, right) => `<div class="li"><span class="ico ${cls}">${ic(icon, 20)}</span><span class="t"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</span>${right}</div>`;
Routes.settings = {
  tab: 'more',
  render() {
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>الإعدادات</b></div><div class="bar-act"></div></div>
    <div class="sg"><h4>المظهر</h4><div class="card pad stack">
      ${seg('theme', [['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']])}
      ${seg('digits', [['ar', '١٢٣ عربية'], ['en', '123 لاتينية']])}
      ${seg('clock', [['12', '١٢ ساعة'], ['24', '٢٤ ساعة']])}
    </div></div>
    <div class="sg"><h4>القراءة</h4><div class="card pad">
      <div class="row"><b class="grow">خط المصحف</b><span class="badge" id="qfs-v">${num(S.qfs)}</span></div>
      <input type="range" min="22" max="46" step="1" value="${S.qfs}" data-range="qfs" aria-label="حجم خط المصحف">
      <div class="font-prev">ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ ${ae(2)}</div>
      <div class="row" style="margin-top:16px"><b class="grow">خط الأذكار والأدعية</b><span class="badge" id="zfs-v">${num(S.zfs)}</span></div>
      <input type="range" min="16" max="30" step="1" value="${S.zfs}" data-range="zfs" aria-label="حجم خط الأذكار">
      <div style="font-family:var(--naskh);font-size:var(--zfs);text-align:center;line-height:1.9">سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ</div>
    </div>
    <div class="list" style="margin-top:12px">
      ${row('sun', 'gold', 'إبقاء الشاشة مضاءة', 'أثناء القراءة والأذكار والسبحة', sw('keepAwake', S.keepAwake))}
      ${row('vibrate', '', 'الاهتزاز عند اللمس', 'في العدّادات والأزرار', sw('haptics', S.haptics))}
      ${row('volume-2', 'blue', 'صوت السبحة', 'نقرة خفيفة مع كل تسبيحة', sw('sound', S.sound))}
    </div></div>
    ${N.WEB ? N.webNoteHTML() : `    <div class="sg"><h4>التذكيرات</h4><div class="list">
      <button class="li" data-a="go" data-r="prayers"><span class="ico">${ic('bell-ring', 20)}</span><span class="t"><b>تنبيهات الأذان</b><small>${S.pnOn ? 'مفعّلة — اضغط للتخصيص' : 'متوقفة — اضغط للتفعيل'}</small></span>${ic('chevron-left', 18, 'chev')}</button>
      ${row('sunrise', 'gold', 'أذكار الصباح', 'بعد الفجر بأربعين دقيقة', sw('rMorning', S.rMorning))}
      ${row('sunset', 'violet', 'أذكار المساء', 'بعد العصر بنصف ساعة', sw('rEvening', S.rEvening))}
      ${row('book-open', 'terra', 'سورة الكهف', 'كل جمعة الساعة ١٠ صباحًا', sw('rKahf', S.rKahf))}
      ${row('hand-heart', 'gold', 'دعاءٌ لنبيلة', 'تذكير يومي بالدعاء لها', sw('rNabila', S.rNabila))}
      <div class="li" ${S.rNabila ? '' : 'hidden'} id="nab-time"><span class="ico">${ic('clock', 20)}</span><span class="t"><b>وقت التذكير</b></span><input type="time" value="${esc(S.rNabilaTime)}" data-a="noop" id="nab-time-in" style="height:40px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px;font-size:15px"></div>
    </div>
    ${Native.has && Native.call('canExact') === 'false' ? `<p class="muted" style="font-size:12.5px;padding:8px 8px 0">لضبط التنبيهات في وقتها تمامًا، اسمح للتطبيق بـ«المنبّهات والتذكيرات» <button style="color:var(--pri);font-weight:600" data-a="open-exact">من هنا</button>.</p>` : ''}
    </div>
`}
    <div class="sg"><h4>التاريخ الهجري</h4><div class="card pad">
      <p class="muted" style="font-size:13px;margin-bottom:10px">اليوم: ${hijriStr()} — عدّله إن اختلف عن بلدك</p>
      ${seg('hijriAdj', [['-2', '−٢'], ['-1', '−١'], ['0', '٠'], ['1', '+١'], ['2', '+٢']])}
    </div></div>
    ${DL.ok ? `<div class="sg"><h4>التلاوات المحفوظة</h4><div class="list">
      ${row('headphones', '', 'المساحة المستخدمة', num(DL.count) + ' سورة • ' + fmtBytes(DL.bytes), '')}
      <button class="li" data-a="dl-delall"><span class="ico terra">${ic('trash-2', 20)}</span><span class="t"><b>حذف كل التلاوات المحفوظة</b></span></button>
    </div></div>` : ''}
    <div class="sg"><h4>البيانات</h4><div class="list">
      <button class="li" data-a="reset-all"><span class="ico terra">${ic('rotate-ccw', 20)}</span><span class="t"><b>تصفير العدّادات</b><small>الأذكار والسبحة والأعمال (تبقى الختمة والمحفوظات)</small></span></button>
      <button class="li" data-a="go" data-r="about"><span class="ico gold">${ic('info', 20)}</span><span class="t"><b>عن نُبل</b><small>الإصدار ${num(N.VERSION)}</small></span>${ic('chevron-left', 18, 'chev')}</button>
    </div></div>
    <p class="center faint" style="font-size:12px;margin-top:18px">لا يجمع التطبيق أي بيانات — كل شيء محفوظ على جهازك فقط.</p>`;
  },
  mount(el) {
    $$('[data-range]', el).forEach(r => {
      rangeFill(r);
      r.addEventListener('input', () => {
        rangeFill(r); const k = r.dataset.range; S[k] = +r.value;
        document.documentElement.style.setProperty('--' + k, r.value + 'px');
        const b = $('#' + k + '-v'); if (b) b.textContent = num(r.value);
      });
      r.addEventListener('change', () => setS(r.dataset.range, +r.value));
    });
    const ti = $('#nab-time-in', el);
    if (ti) ti.addEventListener('change', () => { setS('rNabilaTime', ti.value || '21:00'); toast('سيصلك التذكير يوميًا ' + fmtTime(new Date('2000-01-01T' + (ti.value || '21:00'))), 'bell'); });
  }
};
A.noop = () => { };
A['open-exact'] = () => Native.call('openSettings', 'exact');
A['dl-delall'] = async () => { await DL.delAll(); Nav.refresh(); };
A['reset-all'] = async () => {
  if (!await confirmDlg({ title: 'تصفير العدّادات؟', text: 'ستُصفَّر عدّادات الأذكار والسبحة والأعمال وعدد الدعوات.', ok: 'تصفير', danger: true })) return;
  ['tsbTotal', 'tsbCounts', 'tsbDay', 'duaCount', 'deedCount'].forEach(k => Store.del(k));
  N.Store.keys('zk:').forEach(k => Store.del(k)); N.Store.keys('deed:').forEach(k => Store.del(k));
  toast('تم التصفير', 'rotate-ccw'); Bus.emit('her');
};
SW.keepAwake = v => setS('keepAwake', v);
SW.haptics = v => setS('haptics', v);
SW.sound = v => setS('sound', v);
async function reminderSwitch(key, v, input) {
  if (v && !(await ensureNotifPermission())) { input.checked = false; toast('فعّل الإشعارات للتطبيق من إعدادات الجهاز', 'bell-off'); Native.call('openSettings', 'notif'); return; }
  setS(key, v);
  if (key === 'rNabila') { const r = $('#nab-time'); if (r) r.hidden = !v; }
  if (v) toast('تم تفعيل التذكير', 'bell-ring');
}
['rMorning', 'rEvening', 'rKahf', 'rNabila'].forEach(k => { SW[k] = (v, inp) => reminderSwitch(k, v, inp); });

/* ================= ABOUT ================= */
Routes.about = {
  tab: 'more',
  render() {
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>عن نُبل</b></div><div class="bar-act"></div></div>
    <div class="about-hero"><div class="tile"><img src="${MARK}" alt=""></div><h1>نُبل</h1><p class="muted">خيرٌ يبقى، وأثرٌ لا ينقطع • الإصدار ${num(N.VERSION)}</p></div>
    <div class="card pad prose" style="margin:16px">
      <p>«نُبل» من اسم <b>نبيلة</b>؛ صدقةٌ جارية عن روح الوالدة <b>${NB.full}</b>، رحمها الله وغفر لها وجعل قبرها روضةً من رياض الجنة.</p>
      <p>كل آيةٍ تُتلى، وكل ذِكرٍ يُقال، وكل دعوةٍ تُرفع من خلال هذا التطبيق، نرجو أن يكون نورًا لها في قبرها، وأجرًا لكل من نشره. فلا تنسَوها من صالح دعائكم.</p>
      <p style="font-family:var(--naskh);font-size:18px;color:var(--ink);text-align:center;margin-top:14px">اللهم اغفر لنبيلة وارحمها، وعافها واعفُ عنها، وأكرم نُزُلها، ووسّع مُدخلها.</p>
    </div>
    <div class="sg"><h4>المصادر</h4><div class="card pad credit">
      <p><b>نصّ القرآن الكريم:</b> مشروع تنزيل (Tanzil.net) — الرسم العثماني، برخصة المشاع الإبداعي، دون أي تعديل على النص.</p>
      <p><b>التلاوة:</b> الشيخ ياسر الدوسري — رواية حفص عن عاصم، عبر موقع MP3Quran.net.</p>
      <p><b>الأذكار:</b> من كتاب «حصن المسلم» للشيخ سعيد بن علي القحطاني، مع التخريج.</p>
      <p><b>مواقيت الصلاة:</b> تُحسب على جهازك دون إنترنت بمكتبة Adhan (رخصة MIT)، وبطريقة وزارة الأوقاف الأردنية في الأردن.</p>
      <p><b>الخطوط:</b> أميري وأميري قرآن، رقعة عارف، IBM Plex Sans Arabic، المسيري (رخصة SIL المفتوحة). <b>الأيقونات:</b> Lucide (ISC).</p>
    </div></div>
    <div class="sg"><h4>الخصوصية</h4><div class="card pad credit"><p>لا حسابات، ولا إعلانات، ولا جمع لأي بيانات. موقعك يُستخدم على جهازك فقط لحساب المواقيت والقبلة، وكل ما تسجّله من أذكار وختمات محفوظ عندك وحدك.</p></div></div>
    <div class="dedic">صُنع بمحبّة، صدقةً جارية<strong>${NB.full}</strong></div>`;
  }
};

N.duaCard = duaCard; N.sparkles = sparkles; N.prayed = prayed; N.seg = seg; N.row = row; N.tilesHTML = tilesHTML;
})();
