/* نُبل — prayer times, location, qibla, reminders */
(function () {
'use strict';
const { S, setS, Store, Bus, Native, num, fmtTime, toast, Q } = N;
const adhan = window.adhan;

const CITIES = [
  ['عمّان', 'الأردن', 'JO', 31.9539, 35.9106], ['الزرقاء', 'الأردن', 'JO', 32.0728, 36.0880], ['إربد', 'الأردن', 'JO', 32.5556, 35.8500],
  ['السلط', 'الأردن', 'JO', 32.0392, 35.7272], ['مادبا', 'الأردن', 'JO', 31.7160, 35.7939], ['جرش', 'الأردن', 'JO', 32.2747, 35.8961],
  ['عجلون', 'الأردن', 'JO', 32.3326, 35.7517], ['المفرق', 'الأردن', 'JO', 32.3429, 36.2080], ['الرمثا', 'الأردن', 'JO', 32.5592, 36.0069],
  ['الكرك', 'الأردن', 'JO', 31.1853, 35.7048], ['الطفيلة', 'الأردن', 'JO', 30.8375, 35.6042], ['معان', 'الأردن', 'JO', 30.1962, 35.7341],
  ['العقبة', 'الأردن', 'JO', 29.5267, 35.0078], ['مكة المكرمة', 'السعودية', 'SA', 21.4225, 39.8262], ['المدينة المنورة', 'السعودية', 'SA', 24.4672, 39.6111],
  ['الرياض', 'السعودية', 'SA', 24.7136, 46.6753], ['جدة', 'السعودية', 'SA', 21.4858, 39.1925], ['الدمام', 'السعودية', 'SA', 26.4207, 50.0888],
  ['القدس', 'فلسطين', 'PS', 31.7683, 35.2137], ['غزة', 'فلسطين', 'PS', 31.5017, 34.4668], ['رام الله', 'فلسطين', 'PS', 31.9038, 35.2034],
  ['نابلس', 'فلسطين', 'PS', 32.2211, 35.2544], ['الخليل', 'فلسطين', 'PS', 31.5326, 35.0998], ['دمشق', 'سوريا', 'SY', 33.5138, 36.2765],
  ['حلب', 'سوريا', 'SY', 36.2021, 37.1343], ['بيروت', 'لبنان', 'LB', 33.8938, 35.5018], ['بغداد', 'العراق', 'IQ', 33.3152, 44.3661],
  ['القاهرة', 'مصر', 'EG', 30.0444, 31.2357], ['الإسكندرية', 'مصر', 'EG', 31.2001, 29.9187], ['دبي', 'الإمارات', 'AE', 25.2048, 55.2708],
  ['أبوظبي', 'الإمارات', 'AE', 24.4539, 54.3773], ['الدوحة', 'قطر', 'QA', 25.2854, 51.5310], ['الكويت', 'الكويت', 'KW', 29.3759, 47.9774],
  ['المنامة', 'البحرين', 'BH', 26.2285, 50.5860], ['مسقط', 'عُمان', 'OM', 23.5880, 58.3829], ['صنعاء', 'اليمن', 'YE', 15.3694, 44.1910],
  ['الخرطوم', 'السودان', 'SD', 15.5007, 32.5599], ['طرابلس', 'ليبيا', 'LY', 32.8872, 13.1913], ['تونس', 'تونس', 'TN', 36.8065, 10.1815],
  ['الجزائر', 'الجزائر', 'DZ', 36.7538, 3.0588], ['الرباط', 'المغرب', 'MA', 34.0209, -6.8416], ['الدار البيضاء', 'المغرب', 'MA', 33.5731, -7.5898],
  ['إسطنبول', 'تركيا', 'TR', 41.0082, 28.9784], ['لندن', 'بريطانيا', 'GB', 51.5074, -0.1278], ['برلين', 'ألمانيا', 'DE', 52.5200, 13.4050],
  ['باريس', 'فرنسا', 'FR', 48.8566, 2.3522], ['ستوكهولم', 'السويد', 'SE', 59.3293, 18.0686], ['نيويورك', 'الولايات المتحدة', 'US', 40.7128, -74.0060],
  ['شيكاغو', 'الولايات المتحدة', 'US', 41.8781, -87.6298], ['تورنتو', 'كندا', 'CA', 43.6532, -79.3832], ['سيدني', 'أستراليا', 'AU', -33.8688, 151.2093],
  ['كوالالمبور', 'ماليزيا', 'MY', 3.1390, 101.6869], ['جاكرتا', 'إندونيسيا', 'ID', -6.2088, 106.8456], ['كراتشي', 'باكستان', 'PK', 24.8607, 67.0011]
];
const DEFAULT_LOC = { lat: 31.9539, lng: 35.9106, city: 'عمّان', country: 'الأردن', cc: 'JO', src: 'default' };

const METHODS = {
  jordan: ['وزارة الأوقاف الأردنية', () => { const p = adhan.CalculationMethod.Other(); p.fajrAngle = 18; p.ishaAngle = 18; p.methodAdjustments.maghrib = 5; return p; }],
  ummalqura: ['أم القرى — مكة المكرمة', () => adhan.CalculationMethod.UmmAlQura()],
  mwl: ['رابطة العالم الإسلامي', () => adhan.CalculationMethod.MuslimWorldLeague()],
  egypt: ['الهيئة المصرية العامة للمساحة', () => adhan.CalculationMethod.Egyptian()],
  karachi: ['جامعة العلوم الإسلامية — كراتشي', () => adhan.CalculationMethod.Karachi()],
  dubai: ['الإمارات العربية المتحدة', () => adhan.CalculationMethod.Dubai()],
  qatar: ['قطر', () => adhan.CalculationMethod.Qatar()],
  kuwait: ['الكويت', () => adhan.CalculationMethod.Kuwait()],
  turkey: ['رئاسة الشؤون الدينية — تركيا', () => adhan.CalculationMethod.Turkey()],
  isna: ['أمريكا الشمالية (ISNA)', () => adhan.CalculationMethod.NorthAmerica()],
  moon: ['لجنة رؤية الهلال', () => adhan.CalculationMethod.MoonsightingCommittee()],
  singapore: ['سنغافورة وماليزيا وإندونيسيا', () => adhan.CalculationMethod.Singapore()]
};
const CC_METHOD = { JO: 'jordan', SA: 'ummalqura', YE: 'ummalqura', AE: 'dubai', QA: 'qatar', KW: 'kuwait', EG: 'egypt', SD: 'egypt', LY: 'egypt',
  TR: 'turkey', PK: 'karachi', IN: 'karachi', BD: 'karachi', AF: 'karachi', US: 'isna', CA: 'isna', MY: 'singapore', SG: 'singapore', ID: 'singapore', BN: 'singapore', GB: 'moon', IE: 'moon' };

const PR = [
  { k: 'fajr', n: 'الفجر', img: 'p-fajr' }, { k: 'sunrise', n: 'الشروق', img: 'p-morning', sun: true },
  { k: 'dhuhr', n: 'الظهر', img: 'p-dhuhr' }, { k: 'asr', n: 'العصر', img: 'p-asr' },
  { k: 'maghrib', n: 'المغرب', img: 'p-maghrib' }, { k: 'isha', n: 'العشاء', img: 'p-isha' }
];
const PRAYERS5 = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const prName = (k, date) => (k === 'dhuhr' && date && date.getDay() === 5) ? 'الجمعة' : (PR.find(p => p.k === k) || {}).n;

function haversine(a, b, c, d) {
  const R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function nearestCity(lat, lng) {
  let best = null, bd = 1e9;
  CITIES.forEach(c => { const d = haversine(lat, lng, c[3], c[4]); if (d < bd) { bd = d; best = c; } });
  return { c: best, d: bd };
}

const cache = new Map();
const Prayer = {
  CITIES, METHODS, PR, PRAYERS5, prName, nearestCity,
  loc() { return Store.get('loc', null) || DEFAULT_LOC; },
  setLoc(l) { Store.set('loc', l); cache.clear(); Bus.emit('loc', l); syncSchedule(); },
  methodKey() { if (S.method && S.method !== 'auto' && METHODS[S.method]) return S.method; return CC_METHOD[(this.loc().cc || '').toUpperCase()] || 'mwl'; },
  methodName() { return METHODS[this.methodKey()][0]; },
  params() {
    const p = METHODS[this.methodKey()][1]();
    p.madhab = S.madhab === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
    const l = this.loc(); const co = new adhan.Coordinates(l.lat, l.lng);
    try { p.highLatitudeRule = adhan.HighLatitudeRule.recommended(co); } catch (e) { }
    Object.keys(S.adj || {}).forEach(k => { p.adjustments[k] = +S.adj[k] || 0; });
    return p;
  },
  times(date = new Date()) {
    const l = this.loc();
    const key = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '|' + l.lat + ',' + l.lng + '|' + this.methodKey() + S.madhab + JSON.stringify(S.adj);
    if (cache.has(key)) return cache.get(key);
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    let out;
    try {
      const pt = new adhan.PrayerTimes(new adhan.Coordinates(l.lat, l.lng), d, this.params());
      out = { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
    } catch (e) { console.error(e); out = null; }
    if (cache.size > 60) cache.clear();
    cache.set(key, out); return out;
  },
  /* next (and current) prayer relative to now — sunrise counts as an event but not a prayer */
  status(now = new Date()) {
    const t = this.times(now); if (!t) return null;
    const list = PR.map(p => ({ ...p, t: t[p.k] }));
    let next = list.find(p => p.t > now);
    let prev = [...list].reverse().find(p => p.t <= now);
    if (!next) { const tm = new Date(now); tm.setDate(tm.getDate() + 1); const t2 = this.times(tm); next = { ...PR[0], t: t2.fajr, tomorrow: true }; }
    if (!prev) { const y = new Date(now); y.setDate(y.getDate() - 1); const t0 = this.times(y); prev = { ...PR[5], t: t0.isha }; }
    return { list, next, prev, t };
  },
  phase(now = new Date()) {
    const t = this.times(now); if (!t) return 'noon';
    const n = now.getTime();
    if (n < t.fajr || n >= t.isha) return 'night';
    if (n < t.sunrise) return 'fajr';
    if (n < t.dhuhr) return 'morning';
    if (n < t.asr) return 'noon';
    if (n < t.maghrib.getTime() - 25 * 60000) return 'asr';
    return 'sunset';
  },
  qibla() { const l = this.loc(); return adhan.Qibla(new adhan.Coordinates(l.lat, l.lng)); },
  kaabaKm() { const l = this.loc(); return haversine(l.lat, l.lng, 21.4225, 39.8262); },
  locate() {
    return new Promise(res => {
      const finish = (lat, lng, city, country, cc) => {
        const nc = nearestCity(lat, lng);
        const l = { lat, lng, city: city || (nc.d < 40 ? nc.c[0] : 'موقعي الحالي'), country: country || (nc.d < 300 ? nc.c[1] : ''), cc: (cc || (nc.d < 300 ? nc.c[2] : '')).toUpperCase(), src: 'gps', t: Date.now() };
        this.setLoc(l); res(l);
      };
      if (Native.has) {
        const off = Bus.on('onLocation', j => {
          off(); let r = j; if (typeof j === 'string') { try { r = JSON.parse(j); } catch (e) { r = { ok: false }; } }
          if (r && r.ok) finish(+r.lat, +r.lng, r.city, r.country, r.cc); else res({ error: (r && r.error) || 'fail' });
        });
        if (Native.call('requestLocation') === null) { off(); res({ error: 'fail' }); }
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(p => finish(p.coords.latitude, p.coords.longitude), () => res({ error: 'denied' }), { timeout: 15000, maximumAge: 600000 });
      } else res({ error: 'unsupported' });
    });
  }
};

/* -------- reminder & adhan notification schedule (handed to Android AlarmManager) -------- */
function at(date, hh, mm) { const d = new Date(date); d.setHours(hh, mm, 0, 0); return d.getTime(); }
function buildSchedule() {
  const ev = []; const now = Date.now(); const l = Prayer.loc();
  const push = (t, ch, title, body, r) => { if (t > now + 20000) ev.push({ t, ch, title, body, r }); };
  for (let i = 0; i < 14; i++) {
    const day = new Date(); day.setHours(12, 0, 0, 0); day.setDate(day.getDate() + i);
    const t = Prayer.times(day); if (!t) continue;
    if (S.pnOn) PRAYERS5.forEach(k => {
      if (!S.pn[k]) return; const nm = prName(k, day);
      push(t[k].getTime(), 'prayer', 'حان الآن وقت صلاة ' + nm, (l.city ? l.city + ' • ' : '') + fmtTime(t[k]) + ' — حيَّ على الصلاة', 'prayers');
      if (+S.pre > 0) push(t[k].getTime() - S.pre * 60000, 'remind', 'اقترب وقت صلاة ' + nm, 'بعد ' + num(S.pre) + ' دقيقة • ' + fmtTime(t[k]), 'prayers');
    });
    if (S.rMorning) push(t.fajr.getTime() + 40 * 60000, 'remind', 'أذكار الصباح', 'أصبحنا وأصبح الملك لله… دقائق تحفظ يومك بإذن الله', 'zikr:morning');
    if (S.rEvening) push(t.asr.getTime() + 30 * 60000, 'remind', 'أذكار المساء', 'أمسينا وأمسى الملك لله… لا تفوّت أذكار مسائك', 'zikr:evening');
    if (S.rKahf && day.getDay() === 5) push(at(day, 10, 0), 'remind', 'يوم الجمعة — سورة الكهف', 'من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين', 'reader:18');
    if (S.rNabila) { const [hh, mm] = String(S.rNabilaTime || '21:00').split(':').map(Number); push(at(day, hh || 21, mm || 0), 'remind', 'لا تنسَ نبيلة من دعائك 🤍', 'اللهم اغفر لها وارحمها، واجعل قبرها روضة من رياض الجنة', 'nabila'); }
  }
  ev.sort((a, b) => a.t - b.t);
  return ev.slice(0, 160).map((e, i) => Object.assign(e, { id: 7000 + (Math.floor(e.t / 60000) % 90000) + (e.ch === 'prayer' ? 0 : 1) }));
}
let syncT = 0;
function syncSchedule() {
  clearTimeout(syncT);
  syncT = setTimeout(() => { if (Native.has) Native.call('schedule', JSON.stringify(buildSchedule())); }, 300);
}
function anyReminders() { return S.pnOn || S.rMorning || S.rEvening || S.rKahf || S.rNabila; }
async function ensureNotifPermission() {
  if (!Native.has) return true;
  const st = Native.call('notifPermission');
  if (st === 'granted') return true;
  return new Promise(res => {
    const off = N.Bus.on('onPermission', (kind, ok) => { if (kind !== 'notif') return; off(); res(!!ok); });
    Native.call('requestNotifPermission');
    setTimeout(() => { off(); res(Native.call('notifPermission') === 'granted'); }, 30000);
  });
}
Bus.on('settings', k => { if (/^(pn|pnOn|pre|rMorning|rEvening|rKahf|rNabila|rNabilaTime|method|madhab|adj|clock|digits)$/.test(k)) { cache.clear(); syncSchedule(); } });

N.Prayer = Prayer; N.syncSchedule = syncSchedule; N.buildSchedule = buildSchedule; N.ensureNotifPermission = ensureNotifPermission; N.anyReminders = anyReminders;
N.haversine = haversine;
})();
