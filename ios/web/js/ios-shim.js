/* نُبل — iOS app bridge: exposes the same window.NublNative API as Android,
   forwarding calls to the native Swift layer through WKScriptMessageHandler. */
(function () {
  var h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nubl;
  if (!h || window.NublNative) return;
  var st = { notif: 'denied', route: '', dark: false, version: '9.0' };
  var boot = window.__NUBL_IOS || {}; for (var k in boot) st[k] = boot[k];
  window.NublIOS = { set: function (o) { for (var k in o) st[k] = o[k]; } };
  function post(cmd, args) { try { h.postMessage({ cmd: cmd, args: args || [] }); } catch (e) { } }
  window.NublNative = {
    info: function () { return JSON.stringify({ version: st.version, platform: 'ios', dark: !!st.dark }); },
    haptic: function (k) { post('haptic', [String(k || 'tick')]); },
    toast: function () { },
    share: function (t, ti) { post('share', [String(t), String(ti || '')]); },
    copy: function (t) { post('copy', [String(t)]); return 'ok'; },
    openUrl: function (u) { post('openUrl', [String(u)]); },
    setTheme: function (d, bg) { post('setTheme', [!!d, String(bg || '')]); },
    setBars: function (l) { post('setBars', [!!l]); },
    keepScreenOn: function (o) { post('keepScreenOn', [!!o]); },
    requestLocation: function () { post('requestLocation'); },
    startCompass: function () { post('startCompass'); return 'ok'; },
    stopCompass: function () { post('stopCompass'); },
    notifPermission: function () { return st.notif; },
    requestNotifPermission: function () { post('requestNotif'); },
    schedule: function (j) { post('schedule', [String(j)]); },
    canExact: function () { return 'true'; },
    openSettings: function (k) { post('openSettings', [String(k || '')]); },
    exitApp: function () { },
    volumeKeys: function () { },
    getLaunchRoute: function () { var r = st.route || ''; st.route = ''; return r; }
  };
})();
