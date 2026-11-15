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
  function finish() {
    if (done) return;
    done = true;
    clearInterval(tm);
    try { H.pageReady(seq); } catch (e) {}
  }
  function check() {
    var now = Date.now();
    if (now - t0 > 4800) { finish(); return; }
    if (document.readyState === 'loading' || !document.body || !document.getElementById('tv-app-style') || jumping() || !translated()) { stableAt = 0; return; }
    var s = sig();
    if (s !== lastSig || !stableAt) { lastSig = s; stableAt = now; return; }
    if (now - stableAt < 350) return;
    if (!foldPictures() && now - t0 < 2500) return;
    finish();
  }
  var tm = setInterval(check, 120);
})();
