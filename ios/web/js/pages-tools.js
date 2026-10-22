/* نُبل — adhkar, tasbeeh, qibla, prayer times */
(function () {
'use strict';
const { S, setS, Store, Bus, Native, num, fmtN, fmtTime, ic, esc, dp, $, $$, Q, Routes, Nav, A, Layer, toast, haptic, copy, share, ring, setRing, sw,
  dayKey, hijriStr, gregStr, CONTENT, Prayer, Her, confirmDlg, syncSchedule, ensureNotifPermission, qText, qRef } = N;
const CATS = CONTENT.adhkar;
const cat = id => CATS.find(c => c.id === id) || CATS[0];

/* ================= ADHKAR STATE ================= */
const Zk = {
  key: id => 'zk:' + dayKey() + ':' + id,
  counts(id) { const c = cat(id); const v = Store.get(this.key(id), null); return v && v.length === c.items.length ? v : c.items.map(() => 0); },
  save(id, a) { Store.set(this.key(id), a); },
  progress(id) { const c = cat(id), k = this.counts(id); const n = c.items.reduce((s, it, i) => s + (k[i] >= it.c ? 1 : 0), 0); return { n, total: c.items.length, pct: n / c.items.length, done: n === c.items.length }; },
  suggest(now = new Date()) {
    const t = Prayer.times(now);
    if (t) {
      if (now >= t.fajr && now < t.dhuhr) return cat('morning');
      if (now >= t.dhuhr && now < t.asr) return cat('prayer');
      if (now >= t.asr && now.getTime() < t.isha.getTime() + 90 * 60000) return cat('evening');
      return cat('sleep');
    }
    const h = now.getHours(); return cat(h < 12 ? 'morning' : h < 21 ? 'evening' : 'sleep');
  },
  cleanup() { const keep = new Set(); for (let i = 0; i < 3; i++) { const d = new Date(); d.setDate(d.getDate() - i); keep.add(dayKey(d)); } Store.keys('zk:').forEach(k => { if (!keep.has(k.split(':')[1])) Store.del(k); }); Store.keys('deed:').forEach(k => { const d = k.split(':')[1]; if (!keep.has(d) && d < dayKey(new Date(Date.now() - 40 * 864e5))) Store.del(k); }); }
};
N.Zk = Zk;
const CAT_STYLE = { morning: ['gold', 'background:linear-gradient(135deg,#F1B464 -20%,#C9733F 40%,#6A3A2A 100%)'], evening: ['violet', 'background:linear-gradient(135deg,#3E4C8A -10%,#25305C 50%,#14183A 100%)'], prayer: ['', 'background:linear-gradient(135deg,#1B6A50,#0B3D2E 60%,#062A20)'], sleep: ['blue', 'background:linear-gradient(135deg,#2B3566,#151A3A 60%,#0B0E22)'], waking: ['terra', 'background:linear-gradient(135deg,#E9A46A,#B5653F 50%,#5A2F22)'] };

Routes.adhkar = {
  tab: 'adhkar',
  render() {
    const sg = Zk.suggest(); const sp = Zk.progress(sg.id);
    return `<header class="ph"><div><h1>الأذكار</h1><p>من «حصن المسلم» مع تخريج الأحاديث</p></div></header>
    <div class="now-card rise" style="${CAT_STYLE[sg.id][1]}">
      <div class="ring-wrap" style="position:absolute;left:18px;top:18px">${ring(62, 6, sp.pct, '#F7E3B3', 'rgba(255,255,255,.18)')}<b style="position:absolute;inset:0;display:grid;place-items:center;font-size:14px">${num(Math.round(sp.pct * 100))}٪</b></div>
      <div class="eyebrow" style="color:#FBE7B5">${ic('sparkles', 14)} وقتها الآن</div>
      <h3>${sg.title}</h3><p>${sp.done ? 'أتممتها اليوم، تقبّل الله منك' : num(sp.n) + ' من ' + N.dhikrs(sp.total) + ' • ' + sg.sub}</p>
      <button class="btn" data-a="go" data-r="zikr" ${dp({ c: sg.id })}>${ic(sp.n ? 'play' : 'sparkle', 18)} ${sp.done ? 'راجعها' : sp.n ? 'تابع' : 'ابدأ الآن'}</button>
    </div>
    <div class="sec"><div class="list">${CATS.map(c => { const p = Zk.progress(c.id); return `<div class="li" data-a="go" data-r="zikr" ${dp({ c: c.id })}><span class="ico ${CAT_STYLE[c.id][0]}">${ic(c.icon, 21)}</span><span class="t"><b>${c.title}</b><small>${c.sub} • ${N.dhikrs(c.items.length)}</small></span>${p.done ? `<span class="badge">${ic('check', 13)} تمّت</span>` : p.n ? `<span class="badge gold">${num(p.n)}/${num(p.total)}</span>` : ic('chevron-left', 18, 'chev')}</div>`; }).join('')}</div></div>
    <div class="sec"><button class="card wide-card tap" style="margin:0;width:100%;text-align:start" data-a="go" data-r="tasbeeh"><span class="art paper">${ic('circle-dot', 26)}</span><span class="grow"><b style="display:block;font-size:16px">السبحة الإلكترونية</b><small class="muted">${N.WEB || N.IOSAPP ? 'سبّح واستغفر، واذكر الله كثيرًا' : 'سبّح واستغفر، وعدّ بأزرار الصوت'}</small></span>${ic('chevron-left', 20, 'faint')}</button></div>
    <div class="dedic">«أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ»</div>`;
  }
};

/* ================= ZIKR SESSION ================= */
let Z = { id: 'morning', k: [] };
function zkCard(it, i, cnt) {
  const left = Math.max(0, it.c - cnt); const done = left === 0;
  const body = it.q ? `<div class="qx">${qText(it.q)}<span class="sn">${qRef(it.q)}</span></div>` : `<div class="tx">${esc(it.t)}</div>`;
  return `<div class="card zk ${done ? 'done' : ''}" id="z${i}" data-a="zk-tap" ${dp({ i })}>
    ${it.p ? `<div class="pre">${esc(it.p)}</div>` : ''}${body}
    ${it.n ? `<div class="note">${ic('info', 14)} ${esc(it.n)}</div>` : ''}
    ${it.f ? `<div class="fadl">${esc(it.f)}</div>` : ''}
    <div class="ft"><span class="ref">${esc(it.r)}${it.c > 1 ? ' • التكرار: ' + num(it.c) : ''}</span><span class="cnt" id="zc${i}">${done ? ic('check', 22) : num(left)}</span></div>
  </div>`;
}
function zkProg() { const c = cat(Z.id); const n = c.items.reduce((s, it, i) => s + (Z.k[i] >= it.c ? 1 : 0), 0); return { n, total: c.items.length }; }
Routes.zikr = {
  tab: 'adhkar', noTabs: true, awake: true,
  render(p) {
    const c = cat(p.c); Z.id = c.id; Z.k = Zk.counts(c.id); const pr = zkProg();
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>${c.title}</b><small id="zk-sub">${num(pr.n)} من ${num(pr.total)}</small></div><div class="bar-act"><button class="ibtn plain" data-a="zk-reset" aria-label="إعادة">${ic('rotate-ccw', 20)}</button></div></div>
    <div class="zk-prog"><div class="pbar"><i id="zk-bar" style="width:${pr.n / pr.total * 100}%"></i></div></div>
    ${c.items.map((it, i) => zkCard(it, i, Z.k[i])).join('')}
    <div class="celebrate" id="zk-done" ${pr.n === pr.total ? '' : 'hidden'}><div class="big">🌿</div><h3 style="font-size:21px;margin-top:10px">تقبّل الله منك</h3><p class="muted" style="margin-top:4px">أتممت ${c.title}. لا تنسَ والدتك نبيلة من دعائك.</p><div class="row" style="justify-content:center;margin-top:14px;gap:10px"><button class="btn gold" data-a="pray">${ic('hand-heart', 20)} دعوتُ لها</button><button class="btn ghost" data-a="back">رجوع</button></div></div>`;
  },
  mount(el, p) {
    const first = cat(Z.id).items.findIndex((it, i) => Z.k[i] < it.c);
    if (first > 0) setTimeout(() => { const t = $('#z' + first); if (t) t.scrollIntoView({ block: 'center' }); }, 60);
  }
};
A['zk-tap'] = (t, p) => {
  const i = p.i; const it = cat(Z.id).items[i]; if (Z.k[i] >= it.c) return;
  Z.k[i]++; Zk.save(Z.id, Z.k); Store.set('tsbTotal', Store.get('tsbTotal', 0) + 1);
  const left = it.c - Z.k[i]; const cnt = $('#zc' + i);
  if (left > 0) { haptic('tick'); if (cnt) { cnt.textContent = num(left); cnt.animate && cnt.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 160 }); } return; }
  haptic('success');
  const card = $('#z' + i); if (card) card.classList.add('done'); if (cnt) cnt.innerHTML = ic('check', 22);
  const pr = zkProg(); $('#zk-sub').textContent = num(pr.n) + ' من ' + num(pr.total); $('#zk-bar').style.width = (pr.n / pr.total * 100) + '%';
  if (pr.n === pr.total) { const d = $('#zk-done'); d.hidden = false; setTimeout(() => d.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250); return; }
  const items = cat(Z.id).items; let nx = -1;
  for (let j = 1; j <= items.length; j++) { const k = (i + j) % items.length; if (Z.k[k] < items[k].c) { nx = k; break; } }
  if (nx >= 0) setTimeout(() => { const t2 = $('#z' + nx); if (t2) t2.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 280);
};
A['zk-reset'] = async () => { if (await confirmDlg({ title: 'البدء من جديد؟', text: 'سيُعاد عدّاد هذه الأذكار لليوم.', ok: 'إعادة' })) { Zk.save(Z.id, cat(Z.id).items.map(() => 0)); Nav.refresh(); $('#view').scrollTop = 0; } };

/* ================= TASBEEH ================= */
const Tsb = {
  list() { return CONTENT.tasbeeh.concat(Store.get('tsbCustom', [])); },
  cur() { const l = this.list(); return l.find(x => x.id === S.tsbId) || l[0]; },
  today() { const d = Store.get('tsbDay', null); return d && d.k === dayKey() ? d.n : 0; },
  per(id) { return (Store.get('tsbCounts', {})[id]) || 0; },
  add() {
    const id = this.cur().id; const c = Store.get('tsbCounts', {}); c[id] = (c[id] || 0) + 1; Store.set('tsbCounts', c);
    const d = Store.get('tsbDay', null); Store.set('tsbDay', { k: dayKey(), n: (d && d.k === dayKey() ? d.n : 0) + 1 });
    Store.set('tsbTotal', Store.get('tsbTotal', 0) + 1);
  }
};
N.Tsb = Tsb;
let TB = { n: 0, ac: null };
function tick(big) {
  if (!S.sound) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    TB.ac = TB.ac || new AC(); const ac = TB.ac; if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime; const tones = big ? [[880, 0], [1320, .09]] : [[1650, 0]];
    tones.forEach(([f, dl]) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dl); g.gain.exponentialRampToValueAtTime(big ? 0.22 : 0.09, t + dl + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dl + (big ? 0.9 : 0.06));
      o.connect(g); g.connect(ac.destination); o.start(t + dl); o.stop(t + dl + (big ? 1 : 0.08));
    });
  } catch (e) { }
}
function tbRender() {
  const tgt = +S.tsbTarget || 0; const n = TB.n;
  const inRound = tgt ? (n % tgt === 0 && n > 0 ? tgt : n % tgt) : n;
  $('#tb-n').textContent = fmtN(tgt ? inRound : n);
  $('#tb-sub').textContent = tgt ? 'من ' + fmtN(tgt) + (n >= tgt ? ' • الجولة ' + num(Math.ceil(n / tgt)) : '') : 'بلا حدّ';
  setRing($('#tb-ring'), tgt ? inRound / tgt : (n % 100) / 100);
  $('#tb-today').textContent = fmtN(Tsb.today()); $('#tb-per').textContent = fmtN(Tsb.per(Tsb.cur().id)); $('#tb-all').textContent = fmtN(Store.get('tsbTotal', 0));
}
function tbCount() {
  TB.n++; Tsb.add(); const tgt = +S.tsbTarget || 0;
  if (tgt && TB.n % tgt === 0) { haptic('success'); tick(true); const b = $('.tb-btn'); if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); } toast('أتممت ' + fmtN(tgt) + ' — بارك الله فيك', 'sparkles'); }
  else { haptic('tick'); tick(false); }
  tbRender();
}
Routes.tasbeeh = {
  tab: 'more', noTabs: true, awake: true,
  render() {
    const cur = Tsb.cur(); TB.n = 0;
    return `<div class="tb-page"><div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>السبحة</b><small>${N.WEB || N.IOSAPP ? 'اضغط على الدائرة للتسبيح' : 'عُدّ بأزرار الصوت أيضًا'}</small></div><div class="bar-act"><button class="ibtn plain" data-a="tb-reset" aria-label="تصفير">${ic('rotate-ccw', 20)}</button></div></div>
      <div class="chips" style="padding:8px 16px 4px">${Tsb.list().map(x => `<button class="chip ${x.id === cur.id ? 'on' : ''}" data-a="tb-pick" ${dp({ id: x.id })} style="font-family:var(--naskh);font-size:15px">${esc(x.t.length > 26 ? x.t.slice(0, 24) + '…' : x.t)}</button>`).join('')}<button class="chip" data-a="tb-add">${ic('plus', 16)} ذكر خاص</button></div>
      <div class="tb-dhikr" id="tb-text">${esc(cur.t)}</div>
      <div class="tb-zone"><div class="tb-btn" id="tb-btn" role="button" aria-label="اضغط للتسبيح">${ring(300, 10, 0, 'var(--gold2)', 'var(--line2)', 'r').replace('class="ring r"', 'class="ring r" id="tb-ring" viewBox="0 0 300 300"')}<div class="tb-c"><b id="tb-n">٠</b><small id="tb-sub"></small></div></div></div>
      <div class="chips" style="justify-content:center;padding:4px 16px 12px">${[[33, '٣٣'], [100, '١٠٠'], [1000, '١٠٠٠'], [0, '∞']].map(o => `<button class="chip ${+S.tsbTarget === o[0] ? 'on' : ''}" data-a="tb-target" ${dp({ v: o[0] })}>${S.digits === 'ar' ? o[1] : (o[0] || '∞')}</button>`).join('')}</div>
      <div class="tb-stats"><div><b id="tb-today">٠</b><small>اليوم</small></div><div><b id="tb-per">٠</b><small>لهذا الذِّكر</small></div><div><b id="tb-all">٠</b><small>المجموع</small></div></div>
      <p class="center faint" style="font-size:12px;margin:12px 20px 0">كل تسبيحة تُضاف إلى أثرك… واذكر نبيلة بدعوة.</p></div>`;
  },
  mount(el) {
    const b = $('#tb-btn', el); let lastT = 0;
    b.addEventListener('pointerdown', e => { e.preventDefault(); const now = Date.now(); if (now - lastT < 60) return; lastT = now; tbCount(); });
    b.style.touchAction = 'manipulation';
    tbRender(); Native.call('volumeKeys', true);
    this._off = Bus.on('onVolumeKey', () => tbCount());
  },
  leave() { Native.call('volumeKeys', false); if (this._off) this._off(); }
};
A['tb-pick'] = (t, p) => { setS('tsbId', p.id); TB.n = 0; $$('.chips .chip[data-a=tb-pick]').forEach(c => c.classList.toggle('on', c === t)); $('#tb-text').textContent = Tsb.cur().t; haptic('light'); tbRender(); };
A['tb-target'] = (t, p) => { setS('tsbTarget', p.v); $$('.chip[data-a=tb-target]').forEach(c => c.classList.toggle('on', c === t)); haptic('light'); tbRender(); };
A['tb-reset'] = () => { TB.n = 0; haptic('light'); tbRender(); toast('بدأت جولة جديدة', 'rotate-ccw'); };
A['tb-add'] = () => {
  const el = Layer.sheet(`<div class="field"><label>اكتب الذِّكر</label><input type="text" id="tb-new" maxlength="80" placeholder="مثال: اللهم اغفر لوالديّ"></div><button class="btn pri block" data-a="tb-save">${ic('plus', 18)} إضافة</button>`, { title: 'ذِكر خاص' });
  setTimeout(() => { const i = $('#tb-new', el); if (i) i.focus(); }, 300);
};
A['tb-save'] = () => {
  const v = ($('#tb-new') || {}).value; if (!v || !v.trim()) { toast('اكتب الذِّكر أولًا'); return; }
  const l = Store.get('tsbCustom', []); const id = 'c' + Date.now(); l.push({ id, t: v.trim() }); Store.set('tsbCustom', l); setS('tsbId', id);
  Layer.close(); Nav.refresh();
};

/* ================= QIBLA ================= */
let QB = { h: null, target: null, raf: 0, ok: false, got: false, acc: 3, buzz: 0 };
function compassSVG(q) {
  let ticks = '';
  for (let d = 0; d < 360; d += 5) { const big = d % 30 === 0; ticks += `<line x1="150" y1="${big ? 18 : 22}" x2="150" y2="${big ? 32 : 28}" transform="rotate(${d} 150 150)" style="stroke:${big ? 'var(--ink2)' : 'var(--faint)'}" stroke-width="${big ? 2 : 1}" stroke-linecap="round"/>`; }
  const lbl = [['ش', 0], ['ق', 90], ['ج', 180], ['غ', 270]].map(([t, d]) => `<text x="150" y="52" text-anchor="middle" transform="rotate(${d} 150 150)" style="fill:${d === 0 ? 'var(--terra)' : 'var(--muted)'};font:600 17px Plex,sans-serif">${t}</text>`).join('');
  return `<svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="146" style="fill:var(--card);stroke:var(--line)" stroke-width="2"/><circle cx="150" cy="150" r="104" style="fill:none;stroke:var(--line2)" stroke-width="1.5"/>
    <g class="dial" id="dial">${ticks}${lbl}
      <g transform="rotate(${q} 150 150)"><line x1="150" y1="150" x2="150" y2="62" style="stroke:var(--gold2)" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 6"/><g transform="translate(150 60)"><circle r="21" style="fill:var(--gold-soft);stroke:var(--gold2)" stroke-width="2"/><rect x="-10" y="-10" width="20" height="20" rx="2.5" fill="#1d1d1d"/><rect x="-10" y="-4.5" width="20" height="3.5" fill="#D9B15E"/></g></g>
    </g>
    <path d="M150 6 l9 16 h-18 z" style="fill:var(--pri)"/><circle cx="150" cy="150" r="7" style="fill:var(--pri)"/><circle cx="150" cy="150" r="3" fill="#fff"/></svg>`;
}
function qbLoop() {
  QB.raf = requestAnimationFrame(qbLoop);
  if (QB.target == null || QB.static) return;
  if (QB.h == null) QB.h = QB.target;
  const d = ((QB.target - QB.h + 540) % 360) - 180; QB.h = (QB.h + d * 0.22 + 360) % 360;
  const dial = $('#dial'); if (dial) dial.setAttribute('transform', `rotate(${-QB.h} 150 150)`);
  const q = Prayer.qibla(); const diff = ((q - QB.h + 540) % 360) - 180; const ad = Math.abs(diff);
  const ok = ad < 4; const cmp = $('#cmp'); if (cmp) cmp.classList.toggle('ok', ok);
  const deg = $('#qdeg'), hint = $('#qhint');
  if (deg) deg.textContent = num(Math.round(ad)) + '°';
  if (hint) hint.textContent = ok ? 'أنت الآن باتجاه القبلة ✓' : (diff > 0 ? 'استدر نحو اليمين' : 'استدر نحو اليسار') + (QB.acc < 2 ? ' • حرّك الهاتف على شكل ∞ للمعايرة' : '');
  if (ok && !QB.ok) { haptic('success'); } QB.ok = ok;
}
Routes.qibla = {
  tab: 'more', noTabs: true, awake: true,
  render() {
    const q = Prayer.qibla(); const l = Prayer.loc();
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>اتجاه القبلة</b><small>${esc(l.city)}</small></div><div class="bar-act"><button class="ibtn plain" data-a="go" data-r="prayers" aria-label="الموقع">${ic('map-pin', 20)}</button></div></div>
    <div class="qb"><div class="compass" id="cmp"><div class="glow"></div>${compassSVG(q)}</div>
      <div class="q-deg num" id="qdeg">${num(Math.round(q))}°</div>
      <div class="q-hint" id="qhint">ضع الهاتف مسطّحًا على يدك، بعيدًا عن المعادن والمغناطيس</div></div>
    <div class="sec"><div class="list">
      ${N.row('compass', 'blue', 'زاوية القبلة', num(q.toFixed(1)) + '° من الشمال الجغرافي باتجاه عقارب الساعة', '')}
      ${N.row('map-pin', 'gold', 'المسافة إلى الكعبة المشرّفة', fmtN(Prayer.kaabaKm()) + ' كم', '')}
    </div></div>`;
  },
  mount() {
    QB = { h: null, target: null, raf: 0, ok: false, got: false, acc: 3, static: false, needPerm: false };
    const l = Prayer.loc();
    this._off = [Bus.on('onHeading', (h, acc) => { QB.target = +h; QB.got = true; if (acc != null) QB.acc = +acc; }), Bus.on('onCompassAccuracy', a => { QB.acc = +a; })];
    let started = Native.call('startCompass', l.lat, l.lng);
    if (started === 'nosensor' || started === null) {
      const onOri = e => { const h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null); if (h != null) { QB.target = h; QB.got = true; QB.static = false; } };
      this._ori = onOri;
      const listen = () => { window.addEventListener('deviceorientationabsolute', onOri); window.addEventListener('deviceorientation', onOri); };
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        QB.needPerm = true;
        const h = $('#qhint'); if (h) h.innerHTML = `<button class="btn pri" data-a="qb-perm">${ic('compass', 20)} تفعيل البوصلة</button>`;
        A['qb-perm'] = () => DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') { QB.needPerm = false; listen(); const h2 = $('#qhint'); if (h2) h2.textContent = 'حرّك الهاتف ببطء…'; } else toast('لم يُسمح باستخدام البوصلة', 'compass'); }).catch(() => toast('تعذّر تفعيل البوصلة', 'compass'));
      } else listen();
    }
    qbLoop();
    this._t = setTimeout(() => { if (!QB.got && !QB.needPerm) { QB.static = true; const h = $('#qhint'); if (h) h.textContent = 'البوصلة غير متاحة على هذا الجهاز. وجّه أعلى الدائرة نحو الشمال، فتكون القبلة عند رمز الكعبة.'; const d = $('#qdeg'); if (d) d.textContent = num(Math.round(Prayer.qibla())) + '°'; } }, 2500);
  },
  leave() { clearTimeout(this._t); cancelAnimationFrame(QB.raf); Native.call('stopCompass'); (this._off || []).forEach(f => f()); if (this._ori) { window.removeEventListener('deviceorientationabsolute', this._ori); window.removeEventListener('deviceorientation', this._ori); } }
};

/* ================= PRAYER TIMES ================= */
Routes.prayers = {
  tab: 'more',
  render(p) {
    const off = +p.d || 0; const day = new Date(); day.setDate(day.getDate() + off);
    const t = Prayer.times(day); const l = Prayer.loc(); const now = new Date(); const st = off === 0 ? Prayer.status(now) : null;
    const methods = Object.keys(Prayer.METHODS);
    return `<div class="bar"><button class="ibtn plain" data-a="back" aria-label="رجوع">${ic('chevron-right', 24)}</button><div class="bar-t"><b>مواقيت الصلاة</b><small>${esc(Prayer.methodName())}</small></div><div class="bar-act"></div></div>
    <div class="sec"><div class="card pad">
      <div class="row"><span class="ico">${ic('map-pin', 21)}</span><div class="grow"><b style="font-size:17px">${esc(l.city)}${l.country ? '، ' + esc(l.country) : ''}</b><small class="muted" style="display:block">${l.src === 'gps' ? 'من موقعك الحالي' : l.src === 'city' ? 'مدينة مختارة' : 'الموقع الافتراضي'} • ${num(l.lat.toFixed(2))}، ${num(l.lng.toFixed(2))}</small></div></div>
      <div class="row" style="margin-top:14px;gap:10px"><button class="btn pri sm" style="flex:1" data-a="pt-locate">${ic('locate-fixed', 18)} تحديد موقعي</button><button class="btn sm" style="flex:1" data-a="pt-city">${ic('search', 18)} اختيار مدينة</button></div>
    </div></div>
    <div class="sec"><div class="daynav"><button class="ibtn sm" data-a="pt-day" ${dp({ d: off - 1 })} aria-label="اليوم السابق">${ic('chevron-right', 20)}</button><div class="center"><b>${off === 0 ? 'اليوم' : off === 1 ? 'غدًا' : off === -1 ? 'أمس' : N.DAYS[day.getDay()]}</b><small class="muted" style="display:block">${gregStr(day, off !== 0 && Math.abs(off) > 1 ? false : true)} • ${hijriStr(day)}</small></div><button class="ibtn sm" data-a="pt-day" ${dp({ d: off + 1 })} aria-label="اليوم التالي">${ic('chevron-left', 20)}</button></div>
    <div class="list ptl">${t ? Prayer.PR.map(pr => {
      const isNext = st && st.next.k === pr.k && !st.next.tomorrow; const bell = !pr.sun;
      return `<div class="li ${isNext ? 'next' : ''}"><img src="img/${pr.img}.svg" alt=""><span class="t"><b>${Prayer.prName(pr.k, day)}</b>${isNext ? `<small>${N.rel(t[pr.k] - now)}</small>` : ''}</span><span class="tm">${fmtTime(t[pr.k])}</span>
        ${bell && !N.WEB ? `<button class="ibtn sm plain" data-a="pt-bell" ${dp({ k: pr.k })} aria-label="تنبيه">${ic(S.pnOn && S.pn[pr.k] ? 'bell-ring' : 'bell-off', 19, S.pnOn && S.pn[pr.k] ? 'pri' : 'faint')}</button>` : '<span style="width:36px"></span>'}</div>`;
    }).join('') : '<div class="empty">تعذّر الحساب لهذا الموقع</div>'}</div></div>
    ${N.WEB ? N.webNoteHTML() : `    <div class="sg"><h4>التنبيهات</h4><div class="list">
      ${N.row('bell-ring', '', 'تنبيه عند الأذان', 'إشعار بصوت لطيف في وقت كل صلاة', sw('pnOn', S.pnOn))}
      <div class="li" style="flex-wrap:wrap"><span class="ico gold">${ic('alarm-clock', 20)}</span><span class="t"><b>تذكير قبل الصلاة</b><small>إشعار إضافي قبل الأذان</small></span><div style="width:100%;margin-top:10px">${N.seg('pre', [['0', 'بدون'], ['10', '١٠ د'], ['15', '١٥ د'], ['30', '٣٠ د']])}</div></div>
    </div></div>
`}
    <div class="sg"><h4>طريقة الحساب</h4><div class="card pad">
      <div class="field"><label>الجهة المعتمدة</label><select data-sel="method"><option value="auto" ${S.method === 'auto' ? 'selected' : ''}>تلقائي حسب البلد</option>${methods.map(k => `<option value="${k}" ${S.method === k ? 'selected' : ''}>${Prayer.METHODS[k][0]}</option>`).join('')}</select></div>
      <div class="field"><label>حساب العصر</label>${N.seg('madhab', [['shafi', 'الجمهور (الشافعي)'], ['hanafi', 'الحنفي']])}</div>
      <div class="field" style="margin-bottom:0"><label>تعديل يدوي بالدقائق</label><div class="adj">${['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(k => `<div><span>${Prayer.PR.find(x => x.k === k).n}</span><div class="row"><button class="ibtn sm" data-a="pt-adj" ${dp({ k, v: 1 })}>${ic('plus', 16)}</button><b>${num(S.adj[k] || 0)}</b><button class="ibtn sm" data-a="pt-adj" ${dp({ k, v: -1 })}>${ic('minus', 16)}</button></div></div>`).join('')}</div></div>
    </div></div>
    <p class="center faint" style="font-size:12px;margin:14px 24px 0">تُحسب المواقيت على جهازك دون إنترنت. للاحتياط، راجع تقويم مسجدك المحلي.</p>`;
  },
  mount(el) {
    const sel = $('[data-sel=method]', el);
    if (sel) sel.addEventListener('change', () => { setS('method', sel.value); toast('تم تحديث طريقة الحساب', 'check'); Nav.refresh(); });
    this._off = Bus.on('settings', k => { if (k === 'madhab') Nav.refresh(); });
  },
  leave() { if (this._off) this._off(); }
};
A['pt-day'] = (t, p) => { Nav.cur().p = { d: p.d }; Nav.refresh(); };
A['pt-adj'] = (t, p) => { const a = Object.assign({}, S.adj); a[p.k] = Math.max(-30, Math.min(30, (a[p.k] || 0) + p.v)); setS('adj', a); Nav.refresh(); };
A['pt-bell'] = async (t, p) => {
  if (!S.pnOn) { if (!(await ensureNotifPermission())) { toast('فعّل الإشعارات للتطبيق من إعدادات الجهاز', 'bell-off'); Native.call('openSettings', 'notif'); return; } setS('pnOn', true); const pn = {}; Prayer.PRAYERS5.forEach(k => pn[k] = k === p.k); setS('pn', pn); }
  else { const pn = Object.assign({}, S.pn); pn[p.k] = !pn[p.k]; setS('pn', pn); }
  haptic('light'); Nav.refresh();
};
N.SW.pnOn = async (v, inp) => {
  if (v && !(await ensureNotifPermission())) { inp.checked = false; toast('فعّل الإشعارات للتطبيق من إعدادات الجهاز', 'bell-off'); Native.call('openSettings', 'notif'); return; }
  setS('pnOn', v); if (v) toast('سيصلك تنبيه عند كل أذان بإذن الله', 'bell-ring'); Nav.refresh();
};
A['pt-locate'] = async t => {
  t.disabled = true; t.innerHTML = ic('loader', 18, 'spin') + ' جارٍ التحديد…';
  const r = await Prayer.locate();
  if (r && !r.error) { toast('تم تحديد موقعك: ' + r.city, 'map-pin'); haptic('success'); }
  else {
    const e = r && r.error;
    if (e === 'disabled') { toast('خدمة الموقع متوقفة في جهازك', 'map-pin'); Native.call('openSettings', 'location'); }
    else if (e === 'denied') toast('لم يُسمح بالوصول إلى الموقع — اختر مدينتك يدويًا', 'map-pin');
    else toast('تعذّر تحديد الموقع، حاول مرة أخرى في مكان مفتوح', 'map-pin');
  }
  if (Nav.cur().name === 'prayers') Nav.refresh();
};
A['pt-city'] = () => {
  const el = Layer.sheet(`<div class="search" style="margin-top:0">${ic('search', 20)}<input id="cq" placeholder="ابحث عن مدينة" autocomplete="off"></div><div class="list" id="cl"></div>`, { title: 'اختيار المدينة' });
  const fill = q => { const nq = N.norm(q || ''); $('#cl', el).innerHTML = Prayer.CITIES.filter(c => !nq || N.norm(c[0] + c[1]).indexOf(nq) >= 0).map((c, i) => `<button class="li" data-a="pt-setcity" ${dp({ i: Prayer.CITIES.indexOf(c) })}><span class="ico">${ic('map-pin', 18)}</span><span class="t"><b>${c[0]}</b><small>${c[1]}</small></span></button>`).join('') || '<div class="empty">لا نتائج</div>'; };
  fill(''); $('#cq', el).addEventListener('input', e => fill(e.target.value));
};
A['pt-setcity'] = (t, p) => { const c = Prayer.CITIES[p.i]; Prayer.setLoc({ lat: c[3], lng: c[4], city: c[0], country: c[1], cc: c[2], src: 'city', t: Date.now() }); Layer.close(); toast('تم اختيار ' + c[0], 'map-pin'); haptic('success'); if (Nav.cur().name === 'prayers') Nav.refresh(); };
})();
