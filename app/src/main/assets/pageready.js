(function(){
  // Tells the app when the top of this page is ready to be seen, so the transition screen between pages can lift then
  // instead of always after 5 seconds (2.70.0). The app still lifts it at 5 seconds if this never reports.
  // "Ready" means all of:
  //   - the page's own content has arrived and the app's styles are in
  //   - it is not a set page that is about to jump to its first match
  //   - the page translation (English mode) has been applied
  //   - the layout has stopped changing for 350 ms (page height and the number of cards and players)
  //   - the pictures in the first screenful have loaded, for which it waits at most 2.5 s from the start
  if (window.__tvPageReadyOn) return;
  window.__tvPageReadyOn = true;
  var H = window.AndroidHost;
  if (!H || !H.pageReady) return;
  var seq = window.__tvNavSeq || 0, t0 = Date.now(), lastSig = '', stableAt = 0, done = false, probes = {};
  var ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;

  function jumping() { return !!window.__tvRedirectingToMatch1 || document.documentElement.style.opacity === '0'; }
  function translated() {
    if (ja) return true;
    var sel = document.querySelector('select.goog-te-combo');
    return !(sel && sel.options && sel.options.length > 1) || sel.value === 'en';
  }
  function sig() {
    return document.documentElement.scrollHeight + ':' +
      document.querySelectorAll('a.tv-card, a.tv-thumbnail-link, .content-list-item, article, iframe').length;
  }
  function inFold(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  }
  // true once a picture address has loaded or failed; starts loading it the first time it is asked about
  function loaded(url) {
    if (!url || url.indexOf('data:') === 0) return true;
    var p = probes[url];
    if (!p) {
      p = probes[url] = { ok: false };
      var im = new Image();
      im.onload = im.onerror = function() { p.ok = true; };
      im.src = url;
      if (im.complete) p.ok = true;
    }
    return p.ok;
  }
  function foldPictures() {
    var ok = true, n = 0, i, list = document.images;
    for (i = 0; i < list.length && n < 40; i++) {
      if (!list[i].src || !inFold(list[i])) continue;
      n++;
      if (!list[i].complete) ok = false;
    }
    list = document.querySelectorAll('.content-thumbnail-box-inner, a.tv-card [style*="background-image"], a.tv-thumbnail-link [style*="background-image"]');
    for (i = 0; i < list.length && n < 40; i++) {
      if (!inFold(list[i])) continue;
      n++;
      var m = (list[i].style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/);
      if (m && m[1] && !loaded(m[1])) ok = false;
    }
    return ok;
  }
  // 3.1.0: how long this page took, for the usage stats (AndroidHost.pagePerf, Metrics.kt "page_ready"): milliseconds
  // from the start of the page to the app's page being on screen (drawn_ms, app pages) and to the first screenful being
  // ready (ready_ms), the StarScope list read (scopestore.js), and the page's memory in use.
  var drawnAt = 0;
  function perf(timedOut) {
    if (!H.pagePerf) return;
    var o = { ready_ms: Math.round(performance.now()) }, P = window.__tvScopePerf;
    if (timedOut) o.timed_out = true;
    if (drawnAt) o.drawn_ms = drawnAt;
    if (P) { o.scope_ms = P.ms; o.scope_kb = P.kb; o.scope_read = P.how; }
    try { var m = performance.memory; if (m && m.usedJSHeapSize) o.heap_mb = Math.round(m.usedJSHeapSize / 1048576); } catch (e) {}
    try { H.pagePerf(seq, JSON.stringify(o)); } catch (e) {}
  }
  function finish(timedOut) {
    if (done) return;
    done = true;
    clearInterval(tm);
    perf(timedOut);
    try { H.pageReady(seq); } catch (e) {}
  }
  function check() {
    var now = Date.now();
    if (now - t0 > 4800) { finish(true); return; }
    if (document.readyState === 'loading' || !document.body || !document.getElementById('tv-app-style') || jumping() || !translated()) { stableAt = 0; return; }
    var s = sig();
    if (s !== lastSig || !stableAt) { lastSig = s; stableAt = now; return; }
    if (now - stableAt < 350) return;
    if (!foldPictures() && now - t0 < 2500) return;
    finish();
  }
  var tm = setInterval(check, 120);

  // App-drawn pages (2.70.1): they sit on a site address, so the site's own page is underneath until the app's page is
  // drawn over it. The app holds a plain cover over that moment and takes it away when this reports that the app's page
  // is on screen: the middle of the screen belongs to an app element (an id starting "tv"). Gives up after 3 s (the app
  // lifts the cover by itself before then).
  if (H.appPageDrawn) {
    var d0 = Date.now(), dm = setInterval(function() {
      var el = null;
      try { el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2); } catch (e) {}
      var hit = el && el.closest ? el.closest('[id^="tv"]') : null;
      if (hit || Date.now() - d0 > 3000) {
        clearInterval(dm);
        if (hit) { drawnAt = Math.round(performance.now()); try { H.appPageDrawn(seq); } catch (e) {} }
      }
    }, 50);
  }
})();
