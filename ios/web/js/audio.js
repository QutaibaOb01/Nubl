/* نُبل — Quran audio (Yasser Al-Dosari) */
(function () {
'use strict';
const { S, setS, Store, Bus, Native, num, fmtDur, fmtBytes, toast, haptic, ic, esc, Q, Layer, $, MARK, A, Nav, confirmDlg } = N;
const CDN = 'https://server11.mp3quran.net/yasser/';
const RECITER = 'ياسر الدوسري';
const url = n => CDN + String(n).padStart(3, '0') + '.mp3';
const NATIVE = Native.has && Native.call('audioState') !== null;

const st = { s: Store.get('lastAudio', 0) | 0 || (new Date().getDay() === 5 ? 18 : 1), playing: false, loading: false, pos: 0, dur: 0, buf: 0, repeat: +S.repeat, speed: +S.speed || 1, sleepAt: 0, sleepEnd: false, active: false, err: '', local: false };

/* ---------- HTML5 fallback (browser preview) ---------- */
let el = null, sleepT = 0;
function h5() {
  if (el) return el;
  el = new Audio(); el.preload = 'none';
  el.addEventListener('playing', () => { st.playing = true; st.loading = false; emit(); });
  el.addEventListener('pause', () => { st.playing = false; emit(); });
  el.addEventListener('waiting', () => { st.loading = true; emit(); });
  el.addEventListener('loadedmetadata', () => { st.dur = (el.duration || 0) * 1000; emit(); });
  el.addEventListener('timeupdate', () => { st.pos = el.currentTime * 1000; tick(); });
  el.addEventListener('ended', () => {
    if (st.sleepEnd) { st.sleepEnd = false; st.playing = false; emit(); return; }
    if (st.repeat === 1) { el.currentTime = 0; el.play().catch(() => { }); }
    else if (st.repeat === 2 && st.s < 114) Player.play(st.s + 1);
    else { st.playing = false; emit(); }
  });
  el.addEventListener('error', () => { if (!st.active) return; st.loading = false; st.playing = false; st.err = 'net'; emit(); toast('تعذّر تشغيل التلاوة، تحقّق من اتصال الإنترنت', 'wifi-off'); });
  return el;
}

const Player = {
  st, url, RECITER, NATIVE,
  play(n, ms = 0) {
    n = Math.max(1, Math.min(114, n | 0));
    if (!NATIVE && !navigator.onLine) { toast('لا يوجد اتصال بالإنترنت', 'wifi-off'); }
    Object.assign(st, { s: n, active: true, err: '', loading: true, playing: false, pos: ms, dur: 0, buf: 0 });
    Store.set('lastAudio', n);
    if (NATIVE) {
      if (!DL.done(n) && navigator.onLine === false) toast('لا يوجد اتصال — نزّل السورة للاستماع دون إنترنت', 'wifi-off');
      Native.call('audioPlay', n, Q.name(n), Math.floor(ms));
    } else { const a = h5(); a.src = url(n); try { a.currentTime = ms / 1000; } catch (e) { } a.playbackRate = st.speed; a.play().catch(() => { }); }
    haptic('light'); emit();
  },
  toggle() {
    if (!st.active) { this.play(st.s || 1); return; }
    haptic('light');
    if (NATIVE) Native.call('audioToggle');
    else { const a = h5(); if (a.paused) a.play().catch(() => { }); else a.pause(); }
  },
  pause() { if (NATIVE) Native.call('audioPause'); else if (el) el.pause(); },
  seek(ms) { st.pos = ms; if (NATIVE) Native.call('audioSeek', Math.floor(ms)); else if (el) el.currentTime = ms / 1000; tick(); },
  next() { if (st.s < 114) this.play(st.s + 1); },
  prev() { if (st.pos > 5000) this.seek(0); else if (st.s > 1) this.play(st.s - 1); },
  stop() {
    if (NATIVE) Native.call('audioStop'); else if (el) { el.pause(); el.removeAttribute('src'); try { el.load(); } catch (e) { } }
    Object.assign(st, { active: false, playing: false, loading: false, sleepAt: 0, sleepEnd: false }); emit();
  },
  setRepeat(m) { st.repeat = m; setS('repeat', m); if (NATIVE) Native.call('audioSetRepeat', m); emit(); },
  setSpeed(v) { st.speed = v; setS('speed', v); if (NATIVE) Native.call('audioSetSpeed', v); else if (el) el.playbackRate = v; emit(); },
  setSleep(min) {
    st.sleepAt = min > 0 ? Date.now() + min * 60000 : 0; st.sleepEnd = min === -1;
    if (NATIVE) Native.call('audioSetSleep', min);
    else { clearTimeout(sleepT); if (min > 0) sleepT = setTimeout(() => { Player.pause(); st.sleepAt = 0; emit(); }, min * 60000); }
    emit();
  },
  isOn(n) { return st.active && st.s === n; }
};

/* lock-screen / control-center controls for the web version */
function mediaSession() {
  if (NATIVE || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: Q.full(st.s), artist: RECITER, album: 'نُبل — صدقة جارية عن روح نبيلة',
      artwork: [{ src: 'img/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'img/icon-192.png', sizes: '192x192', type: 'image/png' }] });
    navigator.mediaSession.playbackState = st.playing ? 'playing' : (st.active ? 'paused' : 'none');
  } catch (e) { }
}
let posT = 0;
function mediaPosition() {
  if (NATIVE || !('mediaSession' in navigator) || !st.dur) return;
  const now = Date.now(); if (now - posT < 4000) return; posT = now;
  try { navigator.mediaSession.setPositionState({ duration: st.dur / 1000, playbackRate: st.speed || 1, position: Math.min(st.pos, st.dur) / 1000 }); } catch (e) { }
}
if (!NATIVE && 'mediaSession' in navigator) {
  const set = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) { } };
  set('play', () => Player.toggle()); set('pause', () => Player.pause());
  set('previoustrack', () => Player.prev()); set('nexttrack', () => Player.next());
  set('seekto', d => { if (d && d.seekTime != null) Player.seek(d.seekTime * 1000); });
  set('seekbackward', () => Player.seek(Math.max(0, st.pos - 10000))); set('seekforward', () => Player.seek(Math.min(st.dur || 1e12, st.pos + 10000)));
}

/* native → JS */
Bus.on('onAudio', j => {
  let o = j; if (typeof j === 'string') { try { o = JSON.parse(j); } catch (e) { return; } }
  if (!o) return;
  const wasErr = st.err;
  Object.assign(st, o);
  if (st.err && st.err !== wasErr) toast(st.err === 'net' ? 'تعذّر تشغيل التلاوة، تحقّق من اتصال الإنترنت' : 'تعذّر تشغيل التلاوة', 'wifi-off');
  emit();
});
Bus.on('onResume', () => { if (NATIVE) { const o = Native.json('audioState'); if (o) { Object.assign(st, o); emit(); } } DL.refresh(); });

/* ---------- rendering ---------- */
let pollT = 0, playerEl = null, lastKey = '';
function pct() { return st.dur ? Math.min(100, st.pos / st.dur * 100) : 0; }
function emit() {
  mediaSession();
  renderMini();
  if (playerEl) renderPlayer();
  Bus.emit('audio', st);
  const key = st.active + '|' + st.playing + '|' + st.s;
  if (key !== lastKey) { lastKey = key; }
  if (NATIVE) {
    if (st.active && !pollT) pollT = setInterval(() => { const o = Native.json('audioState'); if (o) { const ch = o.playing !== st.playing || o.loading !== st.loading || o.s !== st.s || o.active !== st.active; Object.assign(st, o); if (ch) emit(); else tick(); } }, 600);
    if (!st.active && pollT) { clearInterval(pollT); pollT = 0; }
  }
}
function tick() {
  const m = $('#mini .prog i'); if (m) m.style.width = pct() + '%';
  if (playerEl) {
    const r = playerEl.querySelector('#pl-seek');
    if (r && !r._drag) { r.max = Math.max(1, st.dur); r.value = st.pos; N.rangeFill(r); }
    const p = playerEl.querySelector('#pl-pos'), d = playerEl.querySelector('#pl-dur');
    if (p) p.textContent = fmtDur(st.pos); if (d) d.textContent = st.dur ? fmtDur(st.dur) : '--:--';
    const sl = playerEl.querySelector('#pl-sleep'); if (sl && st.sleepAt) sl.textContent = fmtDur(st.sleepAt - Date.now());
  }
  Bus.emit('audiotick', st);
  mediaPosition();
}
function playIcon(sz = 22) { return st.loading && !st.err ? ic('loader', sz, 'spin') : st.playing ? ic('pause', sz) : ic('play', sz); }
function renderMini() {
  const m = $('#mini'); if (!m) return;
  const show = st.active;
  m.hidden = !show; N.D.body.classList.toggle('mini-on', show);
  if (!show) return;
  m.innerHTML = `<button class="art" data-a="player-open" aria-label="المشغّل"><img src="${MARK}" alt=""></button>
    <button class="t" data-a="player-open" style="text-align:start"><b>${esc(Q.full(st.s))}</b><small>${st.err ? 'تعذّر التشغيل — اضغط للمحاولة' : st.loading ? 'جارٍ التحميل…' : RECITER + (st.local ? ' • محفوظة' : '')}</small></button>
    <button class="ibtn big" data-a="player-toggle" aria-label="تشغيل أو إيقاف">${playIcon(22)}</button>
    <button class="ibtn x" data-a="player-stop" aria-label="إغلاق">${ic('x', 20)}</button>
    <div class="prog"><i style="width:${pct()}%"></i></div>`;
}
const REP = [['circle-pause', 'سورة واحدة'], ['repeat-1', 'تكرار السورة'], ['list-music', 'متتابع']];
function renderPlayer() {
  const b = playerEl && playerEl.querySelector('.sheet-b'); if (!b) return;
  const dl = DL.state(st.s);
  const dlLbl = !DL.ok ? '' : dl && dl.s === 'done' ? 'محفوظة' : dl && (dl.s === 'run' || dl.s === 'wait') ? num(dl.p || 0) + '٪' : 'تنزيل';
  const scroll = b.scrollTop;
  b.innerHTML = `<div class="player">
    <div class="cover"><img src="${MARK}" alt=""></div>
    <h3>${esc(Q.full(st.s))}</h3>
    <p>${RECITER} • ${Q.type(st.s)} • ${N.ayahs(Q.count(st.s))}</p>
    <div class="seek"><input class="ltr" type="range" id="pl-seek" min="0" max="${Math.max(1, st.dur)}" value="${st.pos}" step="1000" aria-label="موضع التلاوة"></div>
    <div class="times"><span id="pl-pos">${fmtDur(st.pos)}</span><span id="pl-dur">${st.dur ? fmtDur(st.dur) : '--:--'}</span></div>
    <div class="ctrls">
      <button class="ibtn" data-a="player-prev" aria-label="السورة السابقة" ${st.s <= 1 ? 'disabled style="opacity:.4"' : ''}>${ic('skip-back', 24)}</button>
      <button class="play" data-a="player-toggle" aria-label="تشغيل أو إيقاف">${playIcon(32)}</button>
      <button class="ibtn" data-a="player-next" aria-label="السورة التالية" ${st.s >= 114 ? 'disabled style="opacity:.4"' : ''}>${ic('skip-forward', 24)}</button>
    </div>
    <div class="p-opts">
      <button data-a="player-repeat" class="${st.repeat !== 0 ? 'on' : ''}">${ic(REP[st.repeat][0], 22)}<span>${REP[st.repeat][1]}</span></button>
      <button data-a="player-sleep" class="${st.sleepAt || st.sleepEnd ? 'on' : ''}">${ic('timer', 22)}<span id="pl-sleep">${st.sleepEnd ? 'نهاية السورة' : st.sleepAt ? fmtDur(st.sleepAt - Date.now()) : 'مؤقّت النوم'}</span></button>
      <button data-a="player-speed" class="${st.speed !== 1 ? 'on' : ''}">${ic('gauge', 22)}<span>السرعة ${num(st.speed)}×</span></button>
      ${DL.ok ? `<button data-a="player-dl" class="${dl && dl.s === 'done' ? 'on' : ''}">${ic(dl && dl.s === 'done' ? 'circle-check' : 'download', 22)}<span>${dlLbl}</span></button>`
        : `<button data-a="player-read">${ic('book-open', 22)}<span>اقرأ السورة</span></button>`}
    </div>
    ${DL.ok ? `<button class="btn ghost block" style="margin-top:14px" data-a="player-read">${ic('book-open', 20)} اقرأ السورة أثناء الاستماع</button>` : ''}
  </div>`;
  b.scrollTop = scroll;
  const r = b.querySelector('#pl-seek'); N.rangeFill(r);
  r.addEventListener('input', () => { r._drag = true; N.rangeFill(r); b.querySelector('#pl-pos').textContent = fmtDur(+r.value); });
  r.addEventListener('change', () => { r._drag = false; Player.seek(+r.value); });
}
function openPlayer() {
  if (!st.active) { Player.play(st.s || 1); }
  playerEl = Layer.sheet('', { onClose: () => { playerEl = null; } });
  renderPlayer();
}

A['player-open'] = () => { if (st.err) { Player.play(st.s, st.pos); return; } openPlayer(); };
A['player-toggle'] = () => { if (st.err) { Player.play(st.s, st.pos); return; } Player.toggle(); };
A['player-stop'] = () => Player.stop();
A['player-next'] = () => Player.next();
A['player-prev'] = () => Player.prev();
A['player-repeat'] = () => { Player.setRepeat((st.repeat + 1) % 3); toast(REP[st.repeat][1], REP[st.repeat][0]); };
A['player-speed'] = () => { const v = [0.75, 1, 1.25, 1.5]; const i = v.indexOf(st.speed); Player.setSpeed(v[(i + 1) % v.length]); };
A['player-read'] = () => { const s = st.s; Layer.closeAll(); Nav.go('reader', { s }); };
A['player-sleep'] = () => {
  const opts = [[15, '١٥ دقيقة'], [30, '٣٠ دقيقة'], [45, '٤٥ دقيقة'], [60, 'ساعة'], [-1, 'عند نهاية السورة']];
  const el = Layer.sheet(`<div class="list">${opts.map(o => `<button class="li" data-sl="${o[0]}"><span class="ico">${ic(o[0] === -1 ? 'book-open' : 'timer', 20)}</span><span class="t"><b>${S.digits === 'ar' ? o[1] : o[1].replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))}</b></span></button>`).join('')}
    ${st.sleepAt || st.sleepEnd ? `<button class="li" data-sl="0"><span class="ico terra">${ic('x', 20)}</span><span class="t"><b>إلغاء المؤقّت</b></span></button>` : ''}</div>`, { title: 'إيقاف التلاوة بعد' });
  el.addEventListener('click', e => { const b = e.target.closest('[data-sl]'); if (!b) return; const v = +b.dataset.sl; Player.setSleep(v); Layer.close(); toast(v === 0 ? 'أُلغي المؤقّت' : 'سيتوقف التشغيل ' + (v === -1 ? 'عند نهاية السورة' : 'بعد ' + num(v) + ' دقيقة'), 'timer'); });
};
A['player-dl'] = () => { const n = st.s; const d = DL.state(n); if (d && d.s === 'done') DL.askDelete(n); else if (d) DL.del(n); else DL.start(n); };

/* ---------- downloads (Android DownloadManager) ---------- */
const DL = {
  map: {}, bytes: 0, count: 0, timer: 0,
  ok: NATIVE && Native.call('dlStatus') !== null,
  refresh() {
    if (!this.ok) return this.map;
    const j = Native.json('dlStatus');
    if (j) { this.map = j.items || {}; this.bytes = j.bytes || 0; this.count = j.count || 0; }
    Bus.emit('dl'); if (playerEl) renderPlayer();
    return this.map;
  },
  state(n) { return this.map[n] || null; },
  done(n) { const x = this.map[n]; return !!(x && x.s === 'done'); },
  active() { return Object.values(this.map).some(x => x.s === 'run' || x.s === 'wait'); },
  start(n) {
    if (!this.ok) return;
    if (navigator.onLine === false) { toast('لا يوجد اتصال بالإنترنت', 'wifi-off'); return; }
    const r = Native.call('dlStart', n, Q.name(n));
    if (r === 'nospace') { toast('لا توجد مساحة تخزين كافية', 'info'); return; }
    if (r === 'nostorage' || r === 'fail') { toast('تعذّر بدء التنزيل، حاول مرة أخرى', 'info'); return; }
    this.map[n] = { s: 'wait', p: 0 }; haptic('light'); toast('بدأ تنزيل ' + Q.full(n), 'download');
    Bus.emit('dl'); this.poll();
  },
  async startAll() {
    if (!this.ok) return;
    const left = []; for (let n = 1; n <= 114; n++) if (!this.map[n]) left.push(n);
    if (!left.length) { toast('المصحف كاملًا محفوظ على جهازك', 'circle-check'); return; }
    const ok = await confirmDlg({ title: 'تنزيل المصحف كاملًا؟', text: 'سيتم تنزيل ' + num(left.length) + ' سورة بصوت ' + RECITER + '. قد يتجاوز الحجم ١ جيجابايت، فيُفضّل استخدام شبكة Wi-Fi.', ok: 'تنزيل الكل' });
    if (!ok) return;
    left.forEach(n => { Native.call('dlStart', n, Q.name(n)); this.map[n] = { s: 'wait', p: 0 }; });
    toast('بدأ التنزيل… يمكنك متابعة استخدام التطبيق', 'download'); Bus.emit('dl'); this.poll();
  },
  del(n) { Native.call('dlDelete', n); delete this.map[n]; Bus.emit('dl'); setTimeout(() => this.refresh(), 400); },
  async askDelete(n) { if (await confirmDlg({ title: 'حذف ' + Q.full(n) + '؟', text: 'ستُحذف التلاوة المحفوظة من جهازك، ويمكنك تنزيلها مجددًا.', ok: 'حذف', danger: true })) { this.del(n); toast('تم الحذف', 'trash-2'); } },
  async delAll() {
    if (!await confirmDlg({ title: 'حذف كل التلاوات المحفوظة؟', text: 'سيُحرَّر ' + fmtBytes(this.bytes) + ' من مساحة جهازك.', ok: 'حذف الكل', danger: true })) return;
    Native.call('dlDeleteAll'); this.map = {}; this.bytes = 0; this.count = 0; Bus.emit('dl'); toast('تم حذف التلاوات المحفوظة', 'trash-2');
  },
  poll() {
    if (this.timer || !this.ok) return;
    this.timer = setInterval(() => { this.refresh(); if (!this.active()) { clearInterval(this.timer); this.timer = 0; } }, 1500);
  }
};
Bus.on('onDownloads', () => DL.refresh());
if (DL.ok) { DL.refresh(); if (DL.active()) DL.poll(); }
if (NATIVE) { const o = Native.json('audioState'); if (o) Object.assign(st, o); }
Native.call('audioSetRepeat', st.repeat); Native.call('audioSetSpeed', st.speed);
setTimeout(emit, 0);

N.Player = Player; N.DL = DL; N.openPlayer = openPlayer; N.playIcon = playIcon;
})();
