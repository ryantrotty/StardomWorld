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

// Video page: one column of our own buttons down the right (Full screen first, then the commentary choice),
// styled like the app's own buttons. Their right-hand column (info tabs, ads), the theater toggle, the light/dark
// switch and the clickable logo are hidden, so the D-pad only ever lands on the player or on this column.
(function () {
  var PAGE = /\/(live_player_test|plan_player|live_player)/;
  var css = document.createElement('style');
  css.textContent =
    '#tv-ppv-rail{position:fixed;left:50%;transform:translateX(-50%);top:66px;z-index:2147483646;display:none;flex-direction:row;align-items:center;gap:12px;font-family:Arial,Helvetica,sans-serif}' +
    '#tv-ppv-rail .tv-ppv-lb{display:none;font-size:13px;letter-spacing:1px;font-weight:700;color:#9aa6b4;margin:6px 2px 0}' +
    '#tv-ppv-rail .tv-ppv-comm{display:flex;gap:12px}' +
    '#tv-ppv-rail .tv-ppv-row{display:flex;gap:12px}' +
    '.tv-ppv-c{margin-left:auto !important;margin-right:auto !important;justify-content:center !important}' +
    'header,.Header{display:none !important}' + +
    '#tv-ppv-rail .tv-ppv-rb{display:flex;align-items:center;justify-content:center;gap:10px;flex:0 0 auto;box-sizing:border-box;min-width:170px;padding:13px 24px;border-radius:8px;border:2px solid #2a323c !important;background:#161f2a !important;color:#fff !important;font:700 18px/1.2 Arial,Helvetica,sans-serif !important;text-decoration:none !important;cursor:pointer;outline:none !important;box-shadow:none !important}' +
    '#tv-ppv-rail .tv-ppv-rb.tv-ppv-main{background:#D62839 !important;border-color:#D62839 !important;font-size:20px !important}' +
    '#tv-ppv-rail .tv-ppv-rb.tv-ppv-on{background:#F4C242 !important;border-color:#F4C242 !important;color:#111 !important}' +
    '#tv-ppv-rail .tv-ppv-rb:focus{border-color:#F4C242 !important;outline:none !important;box-shadow:none !important}' +
    '#tv-ppv-rail .tv-ppv-rb.tv-ppv-main:focus{background:#E8374A !important}' +
    '#tv-ppv-rail .tv-ppv-rb:not(.tv-ppv-main):not(.tv-ppv-on):focus{background:#172029 !important}' +
    '.tv-ppv-gone{display:none !important}';
  (document.head || document.documentElement).appendChild(css);

  var rail = document.createElement('div');
  rail.id = 'tv-ppv-rail';
  document.documentElement.appendChild(rail);

  var fsb = document.createElement('a');
  fsb.id = 'tv-ppv-fs'; fsb.className = 'tv-ppv-rb tv-ppv-main'; fsb.tabIndex = 0;
  fsb.textContent = '⛶  Full screen';
  rail.appendChild(fsb);

  function target() {
    var v = document.querySelector('video');
    if (!v) return null;
    return v.closest('.video-js') || v.closest('[class*="player"]') || v.parentElement || v;
  }
  function goFull() {
    var t = target();
    if (!t) return;
    var f = t.requestFullscreen || t.webkitRequestFullscreen;
    try { if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } else if (f) f.call(t); } catch (e) {}
  }
  function press(el, fn) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); fn(); } });
  }
  press(fsb, goFull);

  function fire(e) {
    try { e.click(); } catch (x) {}
    try { e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (x) {}
  }
  function inRail(e) { return rail.contains(e) || e.id === 'tv-ppv-dbg'; }
  function txt(e) { return (e.textContent || '').trim(); }
  // innermost visible-or-not element whose own short text matches
  function finds(re, max) {
    var els = document.querySelectorAll('button,a,[role=button],[role=tab],label,li,div,span,p'), hits = [];
    for (var i = 0; i < els.length; i++) {
      var e = els[i], t = txt(e);
      if (inRail(e) || !t || t.length > max || !re.test(t)) continue;
      hits.push(e);
    }
    return hits.filter(function (e) { return !hits.some(function (o) { return o !== e && e.contains(o); }); });
  }

  // commentary choice: one English and one 日本語 button, created once and kept (their page re-renders its own
  // controls often; rebuilding ours would drop the D-pad focus). Each click looks the real control up fresh.
  var comm = {}, commWrap = null;
  function isOn(e) {
    var n = e, k = 0;
    while (n && k++ < 3) {
      var c = (typeof n.className === 'string' ? n.className : '') + ' ' + (n.getAttribute('aria-selected') || '') + ' ' + (n.getAttribute('aria-pressed') || '');
      if (/\b(active|selected|current|is-on|checked|true)\b/i.test(c)) return true;
      n = n.parentElement;
    }
    return false;
  }
  function langOf(h) { var t = txt(h); return /japanese/i.test(t) ? 'ja' : /english/i.test(t) ? 'en' : ''; }
  function commSrc(l) {
    var hs = finds(/commentary/i, 40);
    for (var i = 0; i < hs.length; i++) if (langOf(hs[i]) === l) return hs[i];
    return null;
  }
  function hideUp(e) {
    var v = document.querySelector('video'), p = e;
    while (p.parentElement && p.parentElement !== document.body && !p.parentElement.contains(v) && txt(p.parentElement) === txt(p)) p = p.parentElement;
    p.classList.add('tv-ppv-gone');
  }
  function syncComm() {
    var found = { en: commSrc('en'), ja: commSrc('ja') };
    if (!found.en && !found.ja) return;
    if (!commWrap) {
      commWrap = document.createElement('div'); commWrap.className = 'tv-ppv-comm';
      var lb = document.createElement('div'); lb.className = 'tv-ppv-lb'; lb.textContent = 'COMMENTARY';
      var row = document.createElement('div'); row.className = 'tv-ppv-row';
      commWrap.appendChild(lb); commWrap.appendChild(row); rail.appendChild(commWrap);
      [['en', 'English'], ['ja', '日本語']].forEach(function (p) {
        var bt = document.createElement('a'); bt.className = 'tv-ppv-rb'; bt.tabIndex = 0; bt.textContent = p[1];
        row.appendChild(bt);
        press(bt, function () { var s = commSrc(p[0]); if (s) fire(s); });
        comm[p[0]] = bt;
      });
    }
    ['en', 'ja'].forEach(function (l) {
      var s = found[l];
      if (s) { hideUp(s); comm[l].classList.toggle('tv-ppv-on', isOn(s)); }
    });
  }

  function hideBits() {
    // their right-hand column: climb from "STREAMING INFORMATION" up to just below the common ancestor with the player
    var v = document.querySelector('video'), si = finds(/^(streaming|distribution) information$/i, 40)[0];
    if (v && si) {
      var p = si;
      while (p.parentElement && p.parentElement !== document.body && !p.parentElement.contains(v)) p = p.parentElement;
      if (p && !p.contains(v) && p !== document.body) p.classList.add('tv-ppv-gone');
    }
    if (v) {
      var cp = v.closest('.video-js') || v, n = 0;
      while (cp && cp !== document.body && n++ < 12) { cp.classList.add('tv-ppv-c'); cp = cp.parentElement; }
      var mn = document.querySelector('main'); if (mn) mn.style.paddingTop = '70px';
    }
    finds(/^theat(er|re)\s*mode$/i, 30).forEach(hideUp);
    var tg = document.querySelectorAll('[class*="theme" i],[class*="darkmode" i],[class*="dark-mode" i],[aria-label*="dark" i],[aria-label*="light" i],[aria-label*="theme" i],[id*="theme" i]');
    for (var i = 0; i < tg.length; i++) if (!inRail(tg[i]) && !tg[i].contains(v)) tg[i].classList.add('tv-ppv-gone');
    var sw = document.querySelectorAll('.MuiFormControlLabel-root,.MuiSwitch-root,input.MuiSwitch-input');
    for (var q = 0; q < sw.length; q++) sw[q].classList.add('tv-ppv-gone');
    finds(/^(dark|light)(\s*mode)?$/i, 20).forEach(function (e) { e.classList.add('tv-ppv-gone'); });
    // nothing else should take focus: the logo and any other leftover control become inert
    var all = document.querySelectorAll('a,button,input,select,textarea,[tabindex]');
    for (var j = 0; j < all.length; j++) {
      var e = all[j];
      if (inRail(e) || e.closest('.video-js') || e.contains(v)) continue;
      if (e.getAttribute('tabindex') !== '-1') e.setAttribute('tabindex', '-1');
      e.style.pointerEvents = 'none';
    }
  }

  var shown = false;
  setInterval(function () {
    var has = !!document.querySelector('video') && PAGE.test(location.pathname) && !document.querySelector('.CpSimpleLayout__main');
    rail.style.display = has ? 'flex' : 'none';
    if (!has) return;
    syncComm(); hideBits();
    var d = document.getElementById('tv-ppv-dbg');
    if (d && PAGE.test(location.pathname) && !/live_player_test/.test(location.pathname)) d.style.display = 'none';
    if (!shown) { shown = true; try { fsb.focus(); } catch (e) {} }
    else if (!keyed && Date.now() - t0 < 8000 && !rail.contains(document.activeElement)) { try { fsb.focus(); } catch (e) {} }
  }, 800);
  var keyed = false, t0 = Date.now();
  window.addEventListener('keydown', function () { keyed = true; }, true);
  function back() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    [60, 350, 900].forEach(function (ms) { setTimeout(function () { try { fsb.focus(); } catch (e) {} }, ms); });
  }
  document.addEventListener('fullscreenchange', back);
  document.addEventListener('webkitfullscreenchange', back);
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
    window.__tvStatusJson = JSON.stringify({ paused: v.paused, t: v.currentTime || 0, d: d, vol: v.muted ? 0 : v.volume, rate: v.playbackRate, cc: cc, ncc: t.length, q: '', nq: 0 });
  };
})();

// The three buttons sit in one row above the player. Left/Right walk the row, Down goes to the player. Up from the
// player or its control bar comes back to the row (to the button last used).
(function () {
  var last = null;
  function items() {
    var r = document.getElementById('tv-ppv-rail');
    return r ? Array.prototype.slice.call(r.querySelectorAll('.tv-ppv-rb')) : [];
  }
  function player() { var v = document.querySelector('.video-js,video'); if (v) { try { v.setAttribute('tabindex', '0'); v.focus(); } catch (x) {} } return v; }
  window.addEventListener('keydown', function (e) {
    var rail = document.getElementById('tv-ppv-rail');
    if (!rail || rail.style.display === 'none') return;
    var a = document.activeElement, k = e.keyCode, its = items(), i = its.indexOf(a);
    function eat() { e.preventDefault(); e.stopPropagation(); }
    if (i >= 0) {
      last = a;
      if (k === 39) { eat(); if (its[i + 1]) its[i + 1].focus(); }
      else if (k === 37) { eat(); if (its[i - 1]) its[i - 1].focus(); }
      else if (k === 40) { eat(); player(); }
      else if (k === 38) { eat(); }
    } else if (its.length && a) {
      var inBar = a.closest && a.closest('.vjs-control-bar') && !a.closest('.vjs-menu');
      var onPlayer = (a.classList && a.classList.contains('video-js')) || a.tagName === 'VIDEO';
      if (k === 38 && (inBar || onPlayer)) { eat(); (last && its.indexOf(last) >= 0 ? last : its[0]).focus(); }
    }
  }, true);
})();
