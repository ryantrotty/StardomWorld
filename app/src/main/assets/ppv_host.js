(function () {
if (window.__tvPpvAll) return;
window.__tvPpvAll = 1;
// Runs only on Stagecrowd pages (PPV shows), instead of the Stardom World scripts.
// Gives the page a visible D-pad focus ring and room under the app's top bar, and keeps a test report on screen
// (never fades) so it can be photographed: page, player, video state, DRM and codec support, errors.
(function () {
  if (window.__tvPpvHost) return;
  window.__tvPpvHost = true;

  var st = document.createElement('style');
  st.textContent = 'body{padding-top:52px !important}' +
    'a:focus,button:focus,input:focus,select:focus,textarea:focus,[tabindex]:focus,video:focus,' +
    'a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,.tv-ppv-f{outline:4px solid #F4C242 !important;outline-offset:0 !important;box-shadow:none !important}' +
    '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter,#wovn-translate-widget,[id^="wovn"],[class*="wovn-"],iframe[src*="wovn.io"],iframe[src*="onetrust"]{display:none !important}';
  (document.head || document.documentElement).appendChild(st);

  var errs = [];
  function addErr(s) { errs.push(String(s).slice(0, 140)); if (errs.length > 5) errs.shift(); }
  window.addEventListener('error', function (e) { addErr('error: ' + (e && e.message)); });
  window.addEventListener('unhandledrejection', function (e) { addErr('promise: ' + (e && e.reason && (e.reason.message || e.reason))); });

  var drm = {}, drmDone = false;
  function ks(robust) {
    var cfg = {
      initDataTypes: ['cenc'],
      audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"', robustness: robust }],
      videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"', robustness: robust }]
    };
    try {
      navigator.requestMediaKeySystemAccess('com.widevine.alpha', [cfg]).then(function () { drm[robust] = 'yes'; })
        .catch(function (e) { drm[robust] = 'no'; });
    } catch (e) { drm[robust] = 'n/a'; }
  }
  function probeDrm() {
    if (drmDone) return;
    drmDone = true;
    ['SW_SECURE_CRYPTO', 'SW_SECURE_DECODE', 'HW_SECURE_CRYPTO', 'HW_SECURE_DECODE', 'HW_SECURE_ALL'].forEach(ks);
  }

  function mse(t) { try { return window.MediaSource && MediaSource.isTypeSupported(t) ? 'yes' : 'no'; } catch (e) { return 'n/a'; } }

  var box = document.createElement('pre');
  box.id = 'tv-ppv-dbg';
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;margin:0;max-width:64vw;max-height:60vh;overflow:hidden;' +
    'background:rgba(0,0,0,.85);color:#7CFC9A;font:13px/1.35 monospace;padding:8px 10px;border-radius:6px;pointer-events:none;white-space:pre-wrap;word-break:break-all';
  document.documentElement.appendChild(box);

  function render() {
    probeDrm();
    var L = [];
    L.push('PPV TEST REPORT');
    L.push('page: ' + location.href.slice(0, 110));
    L.push('title: ' + (document.title || '').slice(0, 70));
    var ua = navigator.userAgent || '';
    var cm = ua.match(/Chrome\/[\d.]+/);
    L.push('browser: ' + (cm ? cm[0] : ua.slice(0, 60)) + (/Android/.test(ua) ? ' (Android in UA)' : ' (desktop UA)'));
    L.push('screen: ' + window.innerWidth + 'x' + window.innerHeight + ' @' + window.devicePixelRatio);
    var vs = document.querySelectorAll('video');
    L.push('video elements: ' + vs.length);
    for (var i = 0; i < vs.length && i < 2; i++) {
      var v = vs[i];
      var src = (v.currentSrc || v.src || '').slice(0, 60);
      L.push(' [' + i + '] ' + (src ? (src.indexOf('blob:') === 0 ? 'blob (MSE)' : src) : 'no src') +
        ' ready=' + v.readyState + ' paused=' + v.paused + ' t=' + Math.round(v.currentTime || 0) +
        ' ' + v.videoWidth + 'x' + v.videoHeight + (v.error ? ' ERR=' + v.error.code : '') +
        (v.mediaKeys ? ' DRM-keys' : ''));
    }
    var fr = document.querySelectorAll('iframe');
    var hs = [];
    for (var j = 0; j < fr.length && j < 4; j++) { try { hs.push(new URL(fr[j].src, location.href).host); } catch (e) { hs.push('?'); } }
    L.push('iframes: ' + fr.length + (hs.length ? ' ' + hs.join(', ') : ''));
    var libs = [];
    [['Hls', 'hls.js'], ['dashjs', 'dash.js'], ['shaka', 'shaka'], ['videojs', 'video.js'], ['jwplayer', 'jwplayer'], ['Vimeo', 'vimeo'], ['THEOplayer', 'THEO'], ['bitmovin', 'bitmovin']].forEach(function (p) { if (window[p[0]]) libs.push(p[1]); });
    L.push('player libs: ' + (libs.length ? libs.join(', ') : 'none seen'));
    L.push('MSE: ' + (window.MediaSource ? 'yes' : 'no') + '  H264: ' + mse('video/mp4; codecs="avc1.42E01E,mp4a.40.2"') +
      '  HEVC: ' + mse('video/mp4; codecs="hvc1.1.6.L93.B0"') + '  VP9: ' + mse('video/webm; codecs="vp9"'));
    var dk = Object.keys(drm).map(function (k) { return k.replace('_SECURE', '').replace('_CRYPTO', '-C').replace('_DECODE', '-D').replace('_ALL', '-ALL') + '=' + drm[k]; });
    L.push('Widevine: ' + (dk.length ? dk.join(' ') : 'checking...'));
    L.push('forms: ' + document.forms.length + '  inputs: ' + document.querySelectorAll('input').length);
    if (errs.length) { L.push('errors:'); errs.forEach(function (e) { L.push(' ' + e); }); }
    box.textContent = L.join('\n');
  }
  render();
  setInterval(render, 2000);
})();

// Video page: the same control bar as the app's other video pages, under the picture: time, progress and buttons
// (play, skip back/forward, mute, speed, language, full screen), built from the app's own labels and actions
// (AndroidHost.barIds / barLabels / barAction). Their own control bar, right-hand column, theater toggle, light/dark
// switch and clickable logo are hidden, and nothing else on the page can take focus, so the D-pad only ever lands here.
(function () {
  var PAGE = /\/(live_player_test|plan_player|live_player)/;
  var ACCENT = '#FFB347', DARK = '#1A1A1A', TOP = 64, BARH = 64;
  var css = document.createElement('style');
  // Sizes are written for the 1440 px wide layout the app's other video pages use, and scaled by --s to this page's
  // width (their page is laid out narrower, so the same pixel sizes would look bigger on the TV).
  function px(n) { return 'calc(' + n + 'px * var(--s,1))'; }
  css.textContent =
    '#tv-ppv-bar{position:fixed;display:none;align-items:center;gap:' + px(14) + ';box-sizing:border-box;height:' + px(BARH) + ';padding:0 ' + px(14) + ';background:rgba(0,0,0,0.8);border-radius:0 0 ' + px(6) + ' ' + px(6) + ';font-family:Arial,Helvetica,sans-serif;color:#ffffff;z-index:2147483646}' +
    '#tv-ppv-bar .tv-pb-time{flex:0 0 auto;font-size:' + px(14) + ';white-space:nowrap}' +
    '#tv-ppv-bar .tv-pb-track{flex:1 1 0;min-width:' + px(60) + ';height:' + px(8) + ';border-radius:' + px(4) + ';background:#3b4656;position:relative;overflow:hidden}' +
    '#tv-ppv-bar .tv-pb-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:' + ACCENT + '}' +
    '#tv-ppv-bar .tv-pb-btns{flex:0 0 auto;display:flex;gap:' + px(6) + ';align-items:center}' +
    '#tv-ppv-bar button.tv-pbtn{margin:0;padding:' + px(8) + ' ' + px(12) + ';border-radius:' + px(10) + ';background:rgba(0,0,0,0.4) !important;border:' + px(2) + ' solid rgba(255,255,255,0.53) !important;color:#ffffff !important;font:700 ' + px(15) + ' Arial,Helvetica,sans-serif !important;white-space:nowrap;cursor:pointer;outline:none !important;box-shadow:none !important}' +
    '#tv-ppv-bar button.tv-pbtn:focus{background:' + ACCENT + ' !important;border-color:' + ACCENT + ' !important;color:' + DARK + ' !important;outline:none !important}' +
    '#tv-pskip{position:fixed;z-index:2147483647;display:none;flex-direction:column;gap:' + px(4) + ';padding:' + px(10) + ';border-radius:' + px(12) + ';background:rgba(0,0,0,0.88);border:' + px(2) + ' solid rgba(255,255,255,0.25);font:700 ' + px(15) + ' Arial,Helvetica,sans-serif;color:#c9d2dc}' +
    '#tv-pskip div{padding:' + px(5) + ' ' + px(14) + ';border-radius:' + px(8) + ';white-space:nowrap;text-align:center}' +
    '#tv-pskip div.on{background:' + ACCENT + ';color:' + DARK + '}' +
    '.vjs-control-bar,.vjs-big-play-button,.vjs-loading-spinner{display:none !important}' +
    'header,.Header{display:none !important}' +
    '.tv-ppv-gone{display:none !important}';
  (document.head || document.documentElement).appendChild(css);

  var ids = [];
  try { ids = JSON.parse(window.AndroidHost.barIds()); } catch (e) {}
  // The player's quality list is not reachable here, and the language choice stands in for the captions button.
  ids = ids.filter(function (i) { return i !== 'quality'; });
  if (ids.indexOf('speed') >= 0) ids.splice(ids.indexOf('speed') + 1, 0, 'cc'); else ids.splice(ids.length - 1, 0, 'cc');
  if (ids.indexOf('full') < 0) ids.push('full');

  var bar = document.createElement('div');
  bar.id = 'tv-ppv-bar';
  var html = '<span class="tv-pb-time">0:00 / 0:00</span><span class="tv-pb-track"><span class="tv-pb-fill"></span></span><span class="tv-pb-btns">';
  ids.forEach(function (id) { html += '<button type="button" class="tv-pbtn notranslate" translate="no" data-id="' + id + '"></button>'; });
  bar.innerHTML = html + '</span>';
  document.documentElement.appendChild(bar);
  var timeEl = bar.querySelector('.tv-pb-time'), fillEl = bar.querySelector('.tv-pb-fill'), btns = {}, lastId = 'full';
  Array.prototype.forEach.call(bar.querySelectorAll('button.tv-pbtn'), function (b) {
    btns[b.getAttribute('data-id')] = b;
    b.addEventListener('focus', function () { lastId = b.getAttribute('data-id'); });
    b.addEventListener('click', function (e) { e.preventDefault(); act(b.getAttribute('data-id')); });
  });

  function inBar(e) { return bar.contains(e) || e.id === 'tv-ppv-dbg'; }
  function inFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function target() {
    var v = document.querySelector('video');
    if (!v) return null;
    return v.closest('.video-js') || v.closest('[class*="player"]') || v.parentElement || v;
  }
  function goFull() {
    var t = target();
    if (!t) return;
    var f = t.requestFullscreen || t.webkitRequestFullscreen;
    try { if (inFull()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } else if (f) f.call(t); } catch (e) {}
  }
  function fire(e) {
    try { e.click(); } catch (x) {}
    try { e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (x) {}
  }
  function txt(e) { return (e.textContent || '').trim(); }
  // innermost element whose own short text matches
  function finds(re, max) {
    var els = document.querySelectorAll('button,a,[role=button],[role=tab],label,li,div,span,p'), hits = [];
    for (var i = 0; i < els.length; i++) {
      var e = els[i], s = txt(e);
      if (inBar(e) || !s || s.length > max || !re.test(s)) continue;
      hits.push(e);
    }
    return hits.filter(function (e) { return !hits.some(function (o) { return o !== e && e.contains(o); }); });
  }

  // ---- Language (commentary): their own English / Japanese commentary controls, driven from the bar and the app's
  // full screen bar. Each press looks the real control up again, because their page redraws its controls often.
  var curLang = '', heurLang = '';
  function isOn(e) {
    var n = e, k = 0;
    while (n && k++ < 3) {
      var c = (typeof n.className === 'string' ? n.className : '') + ' ' + (n.getAttribute('aria-selected') || '') + ' ' + (n.getAttribute('aria-pressed') || '');
      if (/\b(active|selected|current|is-on|checked|true)\b/i.test(c)) return true;
      n = n.parentElement;
    }
    return false;
  }
  function langOf(h) { var s = txt(h); return /japanese|\u65e5\u672c\u8a9e/i.test(s) ? 'ja' : /english|\u82f1\u8a9e/i.test(s) ? 'en' : ''; }
  function commSrc(l) {
    var hs = finds(/commentary|\u5b9f\u6cc1/i, 40);
    for (var i = 0; i < hs.length; i++) if (langOf(hs[i]) === l) return hs[i];
    return null;
  }
  function hideUp(e) {
    var v = document.querySelector('video'), p = e;
    while (p.parentElement && p.parentElement !== document.body && !p.parentElement.contains(v) && txt(p.parentElement) === txt(p)) p = p.parentElement;
    p.classList.add('tv-ppv-gone');
  }
  // Their player starts on the Japanese commentary (that is the one their page highlights), until one is chosen here.
  window.__tvLang = function () { return curLang || heurLang || 'ja'; };
  window.__tvCommentary = function (l) {
    if (l === 'toggle') l = window.__tvLang() === 'ja' ? 'en' : 'ja';
    var s = commSrc(l);
    if (s) { fire(s); curLang = l; }
    return window.__tvLang();
  };
  function syncLang() {
    heurLang = '';
    ['en', 'ja'].forEach(function (l) { var s = commSrc(l); if (s) { hideUp(s); if (isOn(s)) heurLang = l; } });
  }

  // ---- Bar contents
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h > 0 ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (s < 10 ? '0' : '') + s;
  }
  function refresh() {
    try { if (window.__tvRefreshStatus) window.__tvRefreshStatus(); } catch (e) {}
    var json = window.__tvStatusJson || '', labels = {};
    try { labels = JSON.parse(window.AndroidHost.barLabels(json)); } catch (e) {}
    ids.forEach(function (id) { if (labels[id] && btns[id].textContent !== labels[id]) btns[id].textContent = labels[id]; });
    if (json) {
      try {
        var j = JSON.parse(json);
        timeEl.textContent = fmt(j.t) + ' / ' + fmt(j.d);
        fillEl.style.width = (j.d > 0 ? Math.min(100, j.t / j.d * 100) : 0) + '%';
      } catch (e) {}
    }
  }
  function act(id) {
    if (id === 'full') { goFull(); return; }
    if (id === 'cc') { window.__tvCommentary('toggle'); }
    else { try { window.AndroidHost.barAction(id); } catch (e) {} }
    setTimeout(refresh, 300);
  }
  var skipBox = null, skipTimer = 0;
  function showSkip(info, anchor) {
    if (!skipBox) { skipBox = document.createElement('div'); skipBox.id = 'tv-pskip'; document.body.appendChild(skipBox); }
    skipBox.innerHTML = '';
    for (var i = info.sizes.length - 1; i >= 0; i--) {
      var d = document.createElement('div');
      d.textContent = info.sizes[i];
      if (i === info.idx) d.className = 'on';
      skipBox.appendChild(d);
    }
    skipBox.style.display = 'flex';
    var r = anchor.getBoundingClientRect(), h = skipBox.offsetHeight, w = skipBox.offsetWidth;
    skipBox.style.left = Math.max(8, Math.round(r.left + r.width / 2 - w / 2)) + 'px';
    skipBox.style.top = Math.max(8, Math.round(r.top - h - 10)) + 'px';
    clearTimeout(skipTimer);
    skipTimer = setTimeout(function () { if (skipBox) skipBox.style.display = 'none'; }, 2500);
  }

  // ---- Layout: the picture is the same size as on the app's other video pages (about two thirds of the width,
  // centred, as large as fits above the bar); the bar sits right under it, as wide as the picture.
  function layout() {
    var v = document.querySelector('.video-js');
    if (!v || inFull()) return;
    var vw = window.innerWidth, vh = window.innerHeight, s = vw / 1440;
    bar.style.setProperty('--s', s);
    document.documentElement.style.setProperty('--s', s);
    var barH = Math.round(BARH * s), top = Math.max(56, Math.round(vh * 0.07));
    var W = Math.round(Math.min(vw * 0.6, (vh - top - barH - 16) * 16 / 9)), H = Math.round(W * 9 / 16), L = Math.round((vw - W) / 2);
    var set = function (k, val) { v.style.setProperty(k, val, 'important'); };
    set('position', 'fixed'); set('left', L + 'px'); set('top', top + 'px'); set('width', W + 'px'); set('height', H + 'px');
    set('margin', '0'); set('padding-top', '0'); set('max-width', 'none'); set('transform', 'none'); set('z-index', '2147483000');
    bar.style.left = L + 'px'; bar.style.top = (top + H) + 'px'; bar.style.width = W + 'px';
  }

  // ---- Hide their extras; make everything else on the page unreachable by the D-pad
  function hideBits() {
    var v = document.querySelector('video'), si = finds(/^(streaming|distribution) information$/i, 40)[0] || document.querySelector('.MuiAppBar-root');
    if (v && si) {
      var p = si;
      while (p.parentElement && p.parentElement !== document.body && !p.parentElement.contains(v)) p = p.parentElement;
      if (p && !p.contains(v) && p !== document.body) p.classList.add('tv-ppv-gone');
    }
    finds(/^(theat(er|re)\s*mode|\u30b7\u30a2\u30bf\u30fc\u30e2\u30fc\u30c9)$/i, 30).forEach(hideUp);
    var sw = document.querySelectorAll('.MuiFormControlLabel-root,.MuiSwitch-root,input.MuiSwitch-input');
    for (var q = 0; q < sw.length; q++) sw[q].classList.add('tv-ppv-gone');
    var tg = document.querySelectorAll('[class*="theme" i],[class*="darkmode" i],[class*="dark-mode" i],[aria-label*="dark" i],[aria-label*="light" i],[aria-label*="theme" i],[id*="theme" i]');
    for (var i = 0; i < tg.length; i++) if (!inBar(tg[i]) && !tg[i].contains(v)) tg[i].classList.add('tv-ppv-gone');
    finds(/^(dark|light)(\s*mode)?$|^(\u30c0\u30fc\u30af|\u30e9\u30a4\u30c8)\u30e2\u30fc\u30c9$/i, 20).forEach(function (e) { e.classList.add('tv-ppv-gone'); });
    var all = document.querySelectorAll('a,button,input,select,textarea,[tabindex]');
    for (var j = 0; j < all.length; j++) {
      var e = all[j];
      if (inBar(e) || e.contains(v)) continue;
      if (e.getAttribute('tabindex') !== '-1') e.setAttribute('tabindex', '-1');
      e.style.pointerEvents = 'none';
    }
  }

  // ---- Full screen after 8 seconds on the replay or live page, once. Browsers only allow it after a key press, so
  // if the direct request is refused the app sends an OK key press while the Full screen button has focus.
  var vSince = 0, autoDone = false;
  function autoFull() {
    if (autoDone || !/\/(plan_player|live_player)(?!_test)/.test(location.pathname)) return;
    if (!vSince) { vSince = Date.now(); return; }
    if (Date.now() - vSince < 8000) return;
    autoDone = true;
    if (inFull()) return;
    try { btns.full.focus(); } catch (e) {}
    goFull();
    setTimeout(function () {
      if (inFull()) return;
      try { btns.full.focus(); if (window.AndroidHost && AndroidHost.ppvPressOk) AndroidHost.ppvPressOk(); } catch (e) {}
    }, 700);
  }

  var shown = false, keyed = false, t0 = Date.now();
  window.addEventListener('keydown', function () { keyed = true; }, true);
  setInterval(function () {
    var has = !!document.querySelector('video') && PAGE.test(location.pathname) && !document.querySelector('.CpSimpleLayout__main');
    bar.style.display = has ? 'flex' : 'none';
    if (!has) return;
    syncLang(); hideBits(); layout(); autoFull();
    var d = document.getElementById('tv-ppv-dbg');
    if (d && !/live_player_test/.test(location.pathname)) d.style.display = 'none';
    if (!shown) { shown = true; refresh(); try { btns.full.focus(); } catch (e) {} }
    else if (!keyed && Date.now() - t0 < 8000 && !bar.contains(document.activeElement)) { try { btns.full.focus(); } catch (e) {} }
  }, 800);
  setInterval(function () { if (bar.style.display !== 'none' && !document.hidden) refresh(); }, 500);
  window.addEventListener('resize', layout);
  // Leaving full screen puts focus back on the bar (on Full screen), not on the player or the page.
  function back() {
    if (inFull()) return;
    layout();
    [60, 350, 900].forEach(function (ms) { setTimeout(function () { try { (btns[lastId] || btns.full).focus(); } catch (e) {} }, ms); });
  }
  document.addEventListener('fullscreenchange', back);
  document.addEventListener('webkitfullscreenchange', back);

  // ---- Keys: Left/Right walk the buttons; Up/Down on -/+ choose the skip size; OK presses. Nothing else moves focus.
  window.addEventListener('keydown', function (e) {
    if (bar.style.display === 'none') return;
    var k = e.keyCode, ae = document.activeElement;
    if (k < 37 || (k > 40 && k !== 13 && k !== 23)) return;
    function eat() { e.preventDefault(); e.stopPropagation(); }
    if (!ae || !ae.classList || !ae.classList.contains('tv-pbtn')) {
      if (k >= 37 && k <= 40) { eat(); try { (btns[lastId] || btns.full).focus(); } catch (x) {} }
      return;
    }
    var did = ae.getAttribute('data-id'), i = ids.indexOf(did);
    if ((k === 38 || k === 40) && (did === 'back' || did === 'fwd') && window.AndroidHost && AndroidHost.skipStep) {
      eat();
      var info = null;
      try { info = JSON.parse(AndroidHost.skipStep(k === 38 ? 1 : -1)); } catch (x) {}
      refresh();
      if (info) showSkip(info, ae);
    } else if (k === 39) { eat(); if (i < ids.length - 1) btns[ids[i + 1]].focus(); }
    else if (k === 37) { eat(); if (i > 0) btns[ids[i - 1]].focus(); }
    else if (k === 38 || k === 40) { eat(); }
    else if (k === 13 || k === 23) { eat(); act(did); }
  }, true);
})();

// Our buttons open their show page with #tv=buy or #tv=watch: press their "Purchase tickets" or "Viewing page" tab
// for the person, once, so the TV lands on the right part of the page.
(function () {
  var m = /[#&]tv=(buy|watch)/.exec(location.hash || '');
  if (!m) return;
  var want = m[1] === 'buy' ? /^purchase tickets$/i : /^viewing page$/i, tries = 0;
  var iv = setInterval(function () {
    tries++;
    var bs = document.querySelectorAll('button,a,[role=tab]');
    for (var i = 0; i < bs.length; i++) {
      if (want.test((bs[i].textContent || '').trim().replace(/\s+/g, ' '))) {
        try { bs[i].click(); bs[i].focus(); bs[i].scrollIntoView({ block: 'center' }); } catch (e) {}
        if (m[1] === 'buy') setTimeout(function () { var c = document.querySelector('input.agree_chkbox') || document.querySelector('label.check_box'); if (c) { try { c.focus(); c.scrollIntoView({ block: 'center' }); } catch (e) {} } }, 700);
        clearInterval(iv);
        return;
      }
    }
    if (tries > 20) clearInterval(iv);
  }, 500);
})();

// The test report is only useful on the test and viewing pages. On sign-in and registration it just covers the form
// and the cookie banner, so it stays out of the way there.
(function () {
  function sync() {
    var d = document.getElementById('tv-ppv-dbg');
    if (!d) return;
    var forms = !/\/live_player_test/.test(location.pathname) || !!document.querySelector('.CpSimpleLayout__main') || !/(^|\.)stagecrowd\.live$/.test(location.hostname);
    d.style.display = forms ? 'none' : '';
  }
  setInterval(sync, 700);
})();

// Their buttons and checkboxes are styled (and sometimes hidden behind a label), so the browser's own focus ring is
// not always drawn on the thing you see. Mark the visible element that holds the focus with the same single gold ring.
(function () {
  var cur = null;
  function visible(e) { var r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; }
  function mark() {
    var a = document.activeElement, t = null;
    if (a && a !== document.body && a !== document.documentElement) {
      t = a;
      if (!visible(t) || (a.tagName === 'INPUT' && /^(checkbox|radio)$/.test(a.type))) {
        var l = (a.id && document.querySelector('label[for="' + a.id + '"]')) || (a.closest && a.closest('label')) || a.parentElement;
        if (l && visible(l)) t = l;
      }
    }
    if (cur && cur !== t) cur.classList.remove('tv-ppv-f');
    if (t) t.classList.add('tv-ppv-f');
    cur = t;
  }
  document.addEventListener('focusin', mark, true);
  document.addEventListener('focusout', function () { setTimeout(mark, 0); }, true);
  document.addEventListener('keyup', mark, true);
})();

// ---- Sign-in, registration and password pages: a cleaner, dark look and a D-pad order that follows the form.
// Their markup can change, so everything here is light: CSS on top, and an explicit list of controls to step through.
(function () {
  if (!/^\/s\/[^/]+\/(login|member|password|cart|order)/.test(location.pathname) && !document.querySelector('.CpSimpleLayout__main')) return;

  var st = document.createElement('style');
  st.textContent =
    'html,body{background:#0e131a !important;color:#e8edf3 !important}' +
    'body *:not(img):not(svg):not(path):not(input):not(select):not(textarea):not(button){background-color:transparent !important;color:#e8edf3 !important;border-color:#2a323c !important}' +
    'a{color:#F4C242 !important}' +
    'input[type=text],input[type=email],input[type=password],input:not([type]),select,textarea{background:#1a212b !important;color:#fff !important;border:2px solid #2a323c !important;border-radius:8px !important;font-size:20px !important}' +
    'input[type=checkbox]{width:26px !important;height:26px !important}' +
    'button,input[type=submit]{background:#2a323c !important;color:#fff !important;border:2px solid #3a4452 !important;border-radius:8px !important;font-weight:700 !important}' +
    '.CpBaseBtn{display:block !important;background:#1a212b !important;color:#fff !important;border:2px solid #3a4452 !important;border-radius:10px !important;padding:12px 24px !important;text-align:center !important;font-size:20px !important;font-weight:700 !important;text-decoration:none !important;box-shadow:none !important}' +
    '.CpBaseBtn *{color:inherit !important}' +
    '.CpBaseBtn.tv-ppv-main,button.tv-ppv-main,input[type=submit].tv-ppv-main{background:#F4C242 !important;color:#111 !important;border-color:#F4C242 !important}' +
    '.CpFormTableRow__header__label,.CpPageTitle{color:#fff !important}' +
    '.CpPageTitle{font-size:30px !important}' +
    '.CpClickableText{text-decoration:underline !important}' +
    '[class*="error"],[class*="err"]{color:#ff8a8a !important}' +
    '[class*="rror"]:not(.vjs-error-display){position:static !important;display:block !important;margin:4px 0 8px !important;line-height:1.3 !important}' +
    '.CpFormTableRow__header__label{display:block !important;margin:14px 0 6px !important}' +
    '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter,#wovn-translate-widget,[id^="wovn"],[class*="wovn-"],iframe[src*="wovn.io"],iframe[src*="onetrust"]{display:none !important}';
  (document.head || document.documentElement).appendChild(st);

  // Their cookie banner would sit in the middle of the focus order: answer it once with Reject All (the choice
  // that keeps the least), then it stays hidden.
  var cookieTries = 0, cookieIv = setInterval(function () {
    var b = document.getElementById('onetrust-reject-all-handler');
    if (!b) {
      var bs = document.querySelectorAll('#onetrust-banner-sdk button');
      for (var i = 0; i < bs.length; i++) if (/^reject all$/i.test((bs[i].textContent || '').trim())) { b = bs[i]; break; }
    }
    if (b) { try { b.click(); } catch (e) {} clearInterval(cookieIv); }
    if (++cookieTries > 20) clearInterval(cookieIv);
  }, 500);

  function vis(e) {
    if (!e || e.disabled) return false;
    var r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && (r.width > 4 && r.height > 4 || e.type === 'checkbox');
  }
  function list() {
    var out = [], seen = {}, q = document.querySelectorAll('input,select,textarea,button,a');
    for (var i = 0; i < q.length; i++) {
      var e = q[i], t = (e.type || '').toLowerCase();
      if (e.closest('#onetrust-consent-sdk,#wovn-translate-widget,[id^="wovn"],header,footer,nav')) continue;
      if (e.tagName === 'INPUT' && (t === 'hidden')) continue;
      if (e.tagName === 'TEXTAREA' && e.readOnly) continue;
      if (e.tagName === 'A') {
        var h = e.getAttribute('href') || '', tx = (e.textContent || '').trim();
        if (!tx || !/(member\/add|login|password\/reminder)/.test(h)) continue;
      }
      if (e.tagName === 'BUTTON' && !/submit|^$/.test(t) && !(e.textContent || '').trim()) continue;
      if (e.tagName === 'BUTTON' && /^(close|cookies settings|allow all|back button|filter icon|clear|apply|cancel|reject all|confirm my choices)$/i.test((e.textContent || '').trim())) continue;
      if (!vis(e)) continue;
      if (e.tagName === 'A') { var kk = (e.getAttribute('href') || '').replace(/[?#].*$/, ''); if (seen[kk]) continue; seen[kk] = 1; }
      out.push(e);
    }
    return out;
  }
  function mainButton() {
    var l = list(), pick = null, act = /^(confirm your order|pay with this card|proceed to purchase procedure|add to cart|log in|login|send email address|return to the original page)$/i;
    for (var i = 0; i < l.length; i++) if (act.test((l[i].textContent || l[i].value || '').trim().replace(/\s+/g, ' '))) pick = l[i];
    if (!pick) for (var j = 0; j < l.length; j++) if (/(submit)/.test(l[j].type || '') || (l[j].tagName === 'BUTTON' && !pick)) pick = l[j];
    if (pick) pick.classList.add('tv-ppv-main');
  }
  setInterval(mainButton, 1500);
  // Their forgot-password link draws two layers of text once the background is gone: keep one.
  setInterval(function () {
    var l = document.querySelectorAll('a.CpClickableText[href*="password/reminder"]');
    for (var i = 0; i < l.length; i++) if (!l[i].__tvFix) { l[i].__tvFix = 1; l[i].textContent = 'Forgot your password?'; }
  }, 1000);

  function focusEl(e) {
    try { e.focus({ preventScroll: true }); } catch (x) { e.focus(); }
    try { e.scrollIntoView({ block: 'center' }); } catch (x) {}
  }
  window.addEventListener('keydown', function (ev) {
    var k = ev.keyCode;
    if (k !== 38 && k !== 40 && k !== 13 && k !== 23) return;
    var a = document.activeElement, l = list(), i = l.indexOf(a);
    if (k === 38 || k === 40) {
      if (a && a.tagName === 'SELECT' && a.size > 1) return;
      ev.preventDefault(); ev.stopPropagation();
      var n = i < 0 ? 0 : Math.max(0, Math.min(l.length - 1, i + (k === 40 ? 1 : -1)));
      if (l[n]) focusEl(l[n]);
      return;
    }
    // OK on a tick box ticks it (a plain Enter does nothing on a checkbox)
    if (a && a.tagName === 'INPUT' && a.type === 'checkbox') { ev.preventDefault(); ev.stopPropagation(); a.click(); }
  }, true);

  // Start on the first field, not on the page header.
  var t0 = 0, ivf = setInterval(function () {
    var l = list();
    if (l.length) { if (!document.activeElement || document.activeElement === document.body) focusEl(l[0]); clearInterval(ivf); }
    if (++t0 > 20) clearInterval(ivf);
  }, 400);
})();

// After registering, their only button says "Back to top" and goes to their home page. Make it go back to the show.
(function () {
  if (!/^\/s\/[^/]+\/member\/add\b/.test(location.pathname)) return;
  setInterval(function () {
    var l = document.querySelectorAll('a.CpBaseBtn');
    for (var i = 0; i < l.length; i++) {
      var a = l[i];
      if (a.__tvLeave || !/^back to top$/i.test((a.textContent || '').trim())) continue;
      a.__tvLeave = 1;
      a.textContent = 'Back to the show';
      a.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        try { if (window.AndroidHost && AndroidHost.ppvLeave) AndroidHost.ppvLeave(); } catch (x) {}
      }, true);
    }
  }, 700);
})();

// After signing in they show "Login is complete" with a "Return to the original page" button. Press it for the
// person, so signing in lands straight back on the show page.
(function () {
  if (!/\/login_fin\b/.test(location.pathname)) return;
  var n = 0, iv = setInterval(function () {
    var l = document.querySelectorAll('a,button');
    for (var i = 0; i < l.length; i++) {
      if (/return to the original page/i.test((l[i].textContent || '').trim().replace(/\s+/g, ' '))) {
        clearInterval(iv);
        try { l[i].click(); } catch (e) {}
        // If pressing it does nothing here, go where it would have gone.
        setTimeout(function () {
          if (!/\/login_fin\b/.test(location.pathname)) return;
          try {
            var f = l[i].form || document.querySelector('form'), g = function (n) { var x = f && f.querySelector('[name="' + n + '"]'); return x ? x.value : ''; };
            var u = g('my_prevurl'), dm = g('my_prevdom');
            if (u) { location.href = /^https?:/.test(u) ? u : ((dm && /^https?:/.test(dm) ? dm : location.origin) + u); }
            else if (f) f.submit();
          } catch (e2) {}
        }, 2500);
        return;
      }
    }
    if (++n > 16) clearInterval(iv);
  }, 400);
})();

// ---- Player bridge: the app's own full screen buttons (play, skip, mute, speed, captions) talk to the page through
// these two functions. Stardom World's scripts provide them for Vimeo; here they drive Stagecrowd's video element.
(function () {
  function vid() { return document.querySelector('video'); }
  function tracks(v) { var out = []; try { for (var i = 0; i < v.textTracks.length; i++) { var k = v.textTracks[i]; if (k.kind === 'captions' || k.kind === 'subtitles') out.push(k); } } catch (e) {} return out; }
  window.__tvPlayerCmd = function (cmd, val) {
    var v = vid();
    if (!v) return false;
    try {
      if (cmd === 'seek') {
        var end = isFinite(v.duration) ? v.duration - 1 : (v.seekable && v.seekable.length ? v.seekable.end(v.seekable.length - 1) : v.currentTime + val);
        v.currentTime = Math.min(Math.max(0, v.currentTime + val), Math.max(0, end));
      } else if (cmd === 'play') { v.play(); }
      else if (cmd === 'toggle') { if (v.paused) v.play(); else v.pause(); }
      else if (cmd === 'mute') { v.muted = !v.muted; }
      else if (cmd === 'speed') { var r = [0.75, 1, 1.25, 1.5, 2], i = r.indexOf(v.playbackRate); v.playbackRate = r[(i + 1) % r.length]; }
      else if (cmd === 'ccoff') { tracks(v).forEach(function (k) { k.mode = 'disabled'; }); }
      else if (cmd === 'ccnative' || cmd === 'captions') {
        var t = tracks(v), cur = -1;
        for (var j = 0; j < t.length; j++) if (t[j].mode === 'showing') cur = j;
        t.forEach(function (k) { k.mode = 'disabled'; });
        if (cmd === 'ccnative') { if (t[0]) t[0].mode = 'showing'; }
        else if (cur + 1 < t.length) t[cur + 1].mode = 'showing';
      }
    } catch (e) {}
    return true;
  };
  window.__tvRefreshStatus = function () {
    var v = vid();
    if (!v) return;
    var cc = 'Off', t = tracks(v);
    for (var i = 0; i < t.length; i++) if (t[i].mode === 'showing') cc = t[i].label || t[i].language || 'On';
    var d = isFinite(v.duration) ? v.duration : (v.seekable && v.seekable.length ? v.seekable.end(v.seekable.length - 1) : 0);
    window.__tvStatusJson = JSON.stringify({ ppv: true, lang: (window.__tvLang && window.__tvLang()) || '', paused: v.paused, t: v.currentTime || 0, d: d, vol: v.muted ? 0 : v.volume, rate: v.playbackRate, cc: cc, ncc: t.length, q: '', nq: 0 });
  };
})();
})();
