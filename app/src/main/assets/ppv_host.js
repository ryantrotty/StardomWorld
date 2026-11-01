// Runs only on Stagecrowd pages (PPV shows), instead of the Stardom World scripts.
// Gives the page a visible D-pad focus ring and room under the app's top bar, and keeps a test report on screen
// (never fades) so it can be photographed: page, player, video state, DRM and codec support, errors.
(function () {
  if (window.__tvPpvHost) return;
  window.__tvPpvHost = true;

  var st = document.createElement('style');
  st.textContent = 'body{padding-top:52px !important}' +
    'a:focus,button:focus,input:focus,select:focus,textarea:focus,[tabindex]:focus,video:focus{outline:4px solid #F4C242 !important;outline-offset:2px !important}';
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
  function go() {
    var els = document.querySelectorAll('button,a,[role=button],div,span');
    for (var i = 0; i < els.length; i++) {
      var e = els[i], c = ((e.className && e.className.baseVal === undefined ? e.className : '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.title || '')).toLowerCase();
      var tx = e.children.length < 3 ? (e.textContent || '').trim().toLowerCase() : '';
      if (e !== b && (/theat|theater|cinema/.test(c) || (tx.length < 30 && /theat(er|re)\s*mode/.test(tx)))) { try { e.click(); } catch (x) {} break; }
    }
    try {
      var ev = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true });
      document.dispatchEvent(ev);
    } catch (x) {}
    window.scrollTo(0, 0);
    document.body.classList.remove('theater', 'theatre', 'theater-mode', 'theatre-mode');
  }
  b.addEventListener('click', go);
  b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); go(); } });
  setInterval(function () { b.style.display = document.querySelector('video') ? 'block' : 'none'; }, 1000);
})();
