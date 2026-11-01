// Runs only on Stagecrowd pages (PPV shows), instead of the Stardom World scripts.
// Gives the page a visible D-pad focus ring and room under the app's top bar, and keeps a test report on screen
// (never fades) so it can be photographed: page, player, video state, DRM and codec support, errors.
(function () {
  if (window.__tvPpvHost) return;
  window.__tvPpvHost = true;

  var st = document.createElement('style');
  st.textContent = 'body{padding-top:52px !important}' +
    'a:focus,button:focus,input:focus,select:focus,textarea:focus,[tabindex]:focus,video:focus,' +
    'a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,.tv-ppv-f{outline:4px solid #F4C242 !important;outline-offset:2px !important;box-shadow:none !important}';
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

// Theatre mode on their player only widens the page; it never asks for full screen. This adds our own
// "Full screen" button (reachable with the D-pad, plain OK) that asks the player area for real full screen,
// which the app then shows edge to edge. Also shrinks the test report once a video is on the page so the
// player controls are not covered.
(function () {
  var fsb = document.createElement('a');
  fsb.id = 'tv-ppv-fs';
  fsb.tabIndex = 0;
  fsb.textContent = '⛶ Full screen';
  fsb.style.cssText = 'position:fixed;right:16px;top:60px;z-index:2147483646;display:none;padding:10px 18px;border-radius:10px;' +
    'background:rgba(20,16,36,.92);color:#F4C242;font:600 20px/1.2 sans-serif;border:2px solid #F4C242;cursor:pointer';
  document.documentElement.appendChild(fsb);
  function target() {
    var v = document.querySelector('video');
    if (!v) return null;
    return v.closest('.video-js') || v.closest('[class*="player"]') || v.parentElement || v;
  }
  function go() {
    var t = target();
    if (!t) return;
    var f = t.requestFullscreen || t.webkitRequestFullscreen;
    try { if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } else if (f) f.call(t); } catch (e) {}
  }
  fsb.addEventListener('click', go);
  fsb.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); go(); } });
  setInterval(function () {
    var has = !!document.querySelector('video');
    fsb.style.display = has ? 'block' : 'none';
    var d = document.getElementById('tv-ppv-dbg');
    if (d) {
      if (has) { d.style.left = 'auto'; d.style.right = '8px'; d.style.bottom = 'auto'; d.style.top = '110px'; d.style.maxWidth = '34vw'; d.style.fontSize = '10px'; d.style.opacity = '.7'; }
    }
  }, 1000);
})();

// Theatre mode hides their header behind the app bar, so it can't be reached with the D-pad. This adds an
// "Exit theatre" button beside Full screen: it clicks their theatre toggle if it can find it, else sends Escape,
// and scrolls the page back to the top so their header shows again.
(function () {
  var b = document.createElement('a');
  b.id = 'tv-ppv-th';
  b.tabIndex = 0;
  b.textContent = '✕ Exit theatre';
  b.style.cssText = 'position:fixed;right:200px;top:60px;z-index:2147483646;display:none;padding:10px 18px;border-radius:10px;' +
    'background:rgba(20,16,36,.92);color:#F4C242;font:600 20px/1.2 sans-serif;border:2px solid #F4C242;cursor:pointer';
  document.documentElement.appendChild(b);
  // Their own "THEATER MODE" label sits under the player. Find the innermost element showing that text (the one
  // that really holds the click handler or sits inside it), and make it reachable with the D-pad too.
  function findTheater() {
    var els = document.querySelectorAll('button,a,[role=button],div,span,label,li,p'), hit = null;
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e === b || e.id === 'tv-ppv-fs' || e.id === 'tv-ppv-dbg') continue;
      var tx = (e.textContent || '').trim().toLowerCase();
      if (tx.length < 30 && /theat(er|re)\s*mode/.test(tx)) hit = e;
    }
    return hit;
  }
  function theaterClick(e) {
    try { e.click(); } catch (x) {}
    try { e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (x) {}
  }
  setInterval(function () {
    var t = findTheater();
    if (t && !t.__tvTh) {
      t.__tvTh = 1; t.tabIndex = 0;
      t.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.keyCode === 13) { ev.preventDefault(); theaterClick(t); } });
    }
  }, 1500);
  function go() {
    var t = findTheater();
    if (t) theaterClick(t);
    window.scrollTo(0, 0);
    document.body.classList.remove('theater', 'theatre', 'theater-mode', 'theatre-mode');
  }
  b.addEventListener('click', go);
  b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); go(); } });
  setInterval(function () { b.style.display = document.querySelector('video') ? 'block' : 'none'; }, 1000);
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
    var forms = /\/(login|member|password|form)\b/.test(location.pathname);
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
  if (!/^\/s\/[^/]+\/(login|member|password)\b/.test(location.pathname)) return;

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
    'button.CpBaseBtn[type=submit],button.tv-ppv-main,input[type=submit].tv-ppv-main{background:#F4C242 !important;color:#111 !important;border-color:#F4C242 !important}' +
    '.CpFormTableRow__header__label,.CpPageTitle{color:#fff !important}' +
    '.CpPageTitle{font-size:30px !important}' +
    '.CpClickableText{text-decoration:underline !important}' +
    '[class*="error"],[class*="err"]{color:#ff8a8a !important}' +
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
        var kk = h.replace(/[?#].*$/, '');
        if (seen[kk]) continue;
        seen[kk] = 1;
      }
      if (e.tagName === 'BUTTON' && !/submit|^$/.test(t) && !(e.textContent || '').trim()) continue;
      if (e.tagName === 'BUTTON' && /^(close|cookies settings|allow all|back button|filter icon|clear|apply|cancel|reject all|confirm my choices)$/i.test((e.textContent || '').trim())) continue;
      if (!vis(e)) continue;
      out.push(e);
    }
    return out;
  }
  function mainButton() {
    var l = list(), pick = null;
    for (var i = 0; i < l.length; i++) if (/(submit)/.test(l[i].type || '') || (l[i].tagName === 'BUTTON' && !pick)) pick = l[i];
    if (pick) pick.classList.add('tv-ppv-main');
  }
  setInterval(mainButton, 1500);

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
