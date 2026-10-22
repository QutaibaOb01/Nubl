/* نُبل — bootstrap */
(function () {
'use strict';
const { W, D, S, Store, Bus, Native, ic, $, $$, Nav, A, Layer, toast, haptic, endSplash, applyTheme, Prayer, Zk, syncSchedule, anyReminders, ensureNotifPermission, setS, MARK } = N;
N.VERSION = '9.0';
const T0 = Date.now();

/* insets known before first paint */
const info = Native.json('info');
if (info && info.insets) W.NublBridge.onInsets(info.insets[0], info.insets[1]);
else if (!Native.has && /[?&]demo/.test(location.search)) W.NublBridge.onInsets(30, 18);
Native.call('setTheme', true, '#0B3D2E');

/* tab bar */
const TABS = [['home', 'house', 'الرئيسية'], ['quran', 'book-open', 'المصحف'], ['nabila', null, 'لروحها'], ['adhkar', 'sun-moon', 'الأذكار'], ['more', 'layout-grid', 'المزيد']];
$('#tabbar').innerHTML = TABS.map(([r, i, l]) => r === 'nabila'
  ? `<button class="tb mid" data-a="tab" data-r="nabila" aria-label="${l}"><span class="em"><img src="${MARK}" alt=""></span><span>${l}</span></button>`
  : `<button class="tb" data-a="tab" data-r="${r}" aria-label="${l}"><span class="pill">${ic(i, 22)}</span><span>${l}</span></button>`).join('');
Bus.on('route', (name, tab) => $$('.tb').forEach(b => b.classList.toggle('on', b.dataset.r === tab)));
A.tab = t => {
  const r = t.dataset.r; const c = Nav.cur();
  if (Nav.stack.length === 1 && c && c.name === r) { $('#view').scrollTo({ top: 0, behavior: 'smooth' }); return; }
  haptic('light'); Nav.tab(r);
};

/* sticky bar shadow */
let rafS = 0;
$('#view').addEventListener('scroll', () => {
  if (rafS) return; rafS = requestAnimationFrame(() => { rafS = 0; const b = $('.bar'); if (b) b.classList.toggle('scrolled', $('#view').scrollTop > 6); });
}, { passive: true });

/* deep links: shortcuts & notifications */
function openRoute(r) {
  if (!r) return false;
  const [name, arg] = String(r).replace(/^nubl:\/\/(open\/)?/, '').split(':');
  const under = (root, page, p) => { Nav.stack = [{ name: root, p: {}, y: 0 }]; Nav.go(page, p || {}); };
  switch (name) {
    case 'zikr': under('adhkar', 'zikr', { c: arg || 'morning' }); return true;
    case 'reader': under('quran', 'reader', { s: +arg || 1 }); return true;
    case 'khatma': under('nabila', 'khatma'); return true;
    case 'tasbeeh': case 'qibla': case 'prayers': case 'settings': under('more', name); return true;
    case 'listen': Nav.tab('quran', { t: 'listen' }); return true;
    case 'player': if (!Nav.cur()) Nav.tab('home'); setTimeout(() => N.openPlayer(), 350); return true;
    case 'home': case 'quran': case 'nabila': case 'adhkar': case 'more': Nav.tab(name); return true;
  }
  return false;
}
W.NublBridge.onRoute = r => { if (!splashDone) { pendingRoute = r; return; } Layer.closeAll(); openRoute(r); };

/* Android back */
let splashDone = false, pendingRoute = null;
W.NublBridge.onBack = () => {
  if (!splashDone) return true;
  if (Layer.close()) return true;
  if (Nav.stack.length > 1) { Nav.back(); return true; }
  if (Nav.cur().name !== 'home') { Nav.tab('home'); return true; }
  return false;
};

/* resume: refresh date-sensitive screens */
let lastDay = N.dayKey();
Bus.on('onResume', () => {
  const d = N.dayKey();
  if (d !== lastDay) { lastDay = d; Zk.cleanup(); syncSchedule(); }
  const c = Nav.cur(); if (c && (c.name === 'home' || c.name === 'adhkar' || c.name === 'nabila')) Nav.refresh();
});

/* first paint */
const launch = Native.call('getLaunchRoute');
if (!(launch && typeof launch === 'string' && openRoute(launch))) Nav.tab('home');
applyTheme();

/* splash */
const firstToday = Store.get('splashDay', '') !== N.dayKey();
const minMs = firstToday ? 2100 : 1150;
function hideSplash() {
  if (splashDone) return; splashDone = true;
  const sp = $('#splash'); sp.classList.add('out'); setTimeout(() => sp.remove(), 700);
  Store.set('splashDay', N.dayKey());
  endSplash();
  if (pendingRoute) { openRoute(pendingRoute); pendingRoute = null; }
  setTimeout(welcome, 500);
}
$('#splash').addEventListener('click', hideSplash);
setTimeout(hideSplash, Math.max(300, minMs - (Date.now() - T0)));

/* first-run welcome */
function welcome() {
  if (Store.get('welcomed', false)) { if (N.WEB && N.IOS && !N.STANDALONE && Store.get('installHint', '') !== N.dayKey()) { Store.set('installHint', N.dayKey()); installSheet(); } return; }
  Store.set('welcomed', true);
  const el = Layer.sheet(`<div class="center" style="padding:4px 4px 0">
      <div class="about-hero" style="padding:0"><div class="tile" style="width:76px;height:76px;border-radius:24px"><img src="${MARK}" alt="" style="width:52px"></div></div>
      <h3 style="font-size:22px;font-weight:700;margin-top:12px">أهلًا بك في نُبل</h3>
      <p class="muted" style="margin-top:6px;line-height:1.9">صدقةٌ جارية عن روح <b style="color:var(--gold)">نبيلة مصباح محمد إسماعيل</b>، رحمها الله.<br>لنضبط التطبيق في ثوانٍ:</p>
    </div>
    <div class="stack" style="margin-top:16px">
      <button class="btn block pri" data-a="w-loc">${ic('locate-fixed', 20)} تحديد موقعي لمواقيت دقيقة</button>
      ${N.WEB ? (N.STANDALONE ? '' : `<button class="btn block" data-a="install-app">${ic('square-plus', 20)} ثبّت التطبيق على الشاشة الرئيسية</button>`) : `<button class="btn block" data-a="w-notif">${ic('bell-ring', 20)} تفعيل تنبيه الأذان والأذكار</button>`}
      <button class="btn block ghost" data-a="layer-close">لاحقًا</button>
    </div>`);
  return el;
}
A['w-loc'] = async t => {
  t.disabled = true; t.innerHTML = ic('loader', 20, 'spin') + ' جارٍ التحديد…';
  const r = await Prayer.locate();
  t.disabled = false;
  if (r && !r.error) { t.innerHTML = ic('circle-check', 20) + ' ' + r.city; t.classList.remove('pri'); haptic('success'); }
  else { t.innerHTML = ic('map-pin', 20) + ' اختر مدينتك من صفحة المواقيت'; if (r && r.error === 'disabled') Native.call('openSettings', 'location'); }
  if (Nav.cur().name === 'home') Nav.refresh();
};
A['w-notif'] = async t => {
  if (await ensureNotifPermission()) { setS('pnOn', true); setS('rMorning', true); setS('rEvening', true); t.innerHTML = ic('circle-check', 20) + ' تم تفعيل التنبيهات'; haptic('success'); }
  else { toast('يمكنك تفعيلها لاحقًا من الإعدادات', 'bell-off'); }
  if (Nav.cur().name === 'home') Nav.refresh();
};

/* ---------- web / PWA (iPhone & browsers) ---------- */
if (N.WEB) {
  D.addEventListener('touchstart', () => { }, { passive: true });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    W.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }
  /* hardware back (Android browsers) and in-app back buttons share one history guard */
  try {
    history.replaceState({ nubl: 0 }, ''); history.pushState({ nubl: 1 }, '');
    W.addEventListener('popstate', () => { if (W.NublBridge.onBack()) history.pushState({ nubl: 1 }, ''); else history.back(); });
    A.back = () => history.back();
  } catch (e) { }
}
let installEvt = null;
W.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
function installSheet() {
  if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; }); return; }
  const share = `<span class="ios-share">${ic('share', 16)}</span>`;
  Layer.sheet(N.IOS ? `<div class="center" style="padding:0 6px">
      <div class="about-hero" style="padding:0"><div class="tile" style="width:72px;height:72px;border-radius:22px"><img src="${MARK}" alt="" style="width:48px"></div></div>
      <h3 style="font-size:21px;font-weight:700;margin-top:10px">ثبّت «نُبل» على الآيفون</h3>
      <p class="muted" style="margin:4px 0 14px">ليفتح بأيقونة مثل أي تطبيق، وبشاشة كاملة، ويعمل دون إنترنت.</p></div>
    <div class="list">
      <div class="li"><span class="ico step-n">١</span><span class="t"><b>اضغط زر المشاركة ${share}</b><small>في شريط Safari أسفل الشاشة (أو أعلاها في الآيباد)</small></span></div>
      <div class="li"><span class="ico step-n">٢</span><span class="t"><b>اختر «إضافة إلى الشاشة الرئيسية» ${`<span class="ios-share">${ic('square-plus', 16)}</span>`}</b><small>مرّر القائمة للأسفل إن لم تظهر مباشرة</small></span></div>
      <div class="li"><span class="ico step-n">٣</span><span class="t"><b>اضغط «إضافة»</b><small>ستظهر أيقونة نُبل بين تطبيقاتك، افتحه منها</small></span></div>
    </div>
    <p class="muted center" style="font-size:12.5px;margin-top:12px">إذا فتحتَ الرابط من واتساب أو إنستغرام، افتحه أولًا في Safari من زر ⋯ أو 🧭.</p>`
    : `<p class="muted" style="line-height:1.9">من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». ولأجهزة أندرويد تتوفر أيضًا نسخة APK كاملة بالتنبيهات.</p>`, { title: N.IOS ? '' : 'تثبيت التطبيق' });
}
A['install-app'] = () => installSheet();
N.installSheet = installSheet;

/* housekeeping */
setTimeout(() => { Zk.cleanup(); if (anyReminders()) syncSchedule(); }, 1500);
W.addEventListener('online', () => Bus.emit('net', true));
W.addEventListener('offline', () => Bus.emit('net', false));
})();
