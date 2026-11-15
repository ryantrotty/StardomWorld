(function(){
  // One gate for every request the app's own scripts make to stardom-world.com (2.69.0). Before, each page type kept
  // its own spacing and only three of them honoured the "site asked for a pause" flag. Now they all share:
  //   - one request at a time, in the order asked
  //   - at least GAP ms between two requests, also across page changes (the time of the last one is kept)
  //   - the shared pause flag (tvFacBlockUntilV1): set for 10 minutes when the site answers 403, 429 or 503, and no
  //     request is sent while it is set
  // Use: window.__tvFetch(url, options) in place of fetch(url, options). It resolves with the same Response; while the
  // pause is on it rejects with the string 'blocked'. Callers keep their own status checks and saved copies.
  if (window.__tvSiteGate) return;
  var BLOCK_KEY = 'tvFacBlockUntilV1', LAST_KEY = 'tvSiteLastReqV1', GAP = 1200, PAUSE_MS = 10 * 60000;
  var queue = [], busy = false;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function num(k) { return parseInt(lsGet(k) || '0', 10) || 0; }
  function blockedMs() { var u = num(BLOCK_KEY); return u > Date.now() ? u - Date.now() : 0; }
  function next() {
    if (busy || !queue.length) return;
    busy = true;
    var wait = num(LAST_KEY) + GAP - Date.now();
    if (wait > 0) setTimeout(run, Math.min(wait, GAP)); else run();
  }
  function run() {
    var job = queue.shift();
    if (!job) { busy = false; return; }
    if (blockedMs() > 0) { busy = false; job.no('blocked'); next(); return; }
    lsSet(LAST_KEY, String(Date.now()));
    var p;
    try { p = fetch(job.url, job.opts); } catch (e) { busy = false; job.no(e); next(); return; }
    p.then(function(res) {
      if (res && (res.status === 429 || res.status === 403 || res.status === 503)) lsSet(BLOCK_KEY, String(Date.now() + PAUSE_MS));
      busy = false; job.ok(res); next();
    }, function(err) { busy = false; job.no(err); next(); });
  }
  window.__tvSiteGate = {
    fetch: function(url, opts) { return new Promise(function(ok, no) { queue.push({ url: url, opts: opts, ok: ok, no: no }); next(); }); },
    // minutes left of the pause the site asked for (0 = none)
    blockedFor: function() { var ms = blockedMs(); return ms > 0 ? Math.ceil(ms / 60000) : 0; },
    waiting: function() { return queue.length + (busy ? 1 : 0); }
  };
  window.__tvFetch = function(url, opts) { return window.__tvSiteGate.fetch(url, opts); };

  // The site's own favorites call ($.apiCall) lives in the site's scripts on its video list pages. My page doesn't
  // have it (which is why adding a favorite from a tag team page failed up to 2.71.0), and an app page shell has no
  // site scripts at all. So, when it is missing, a small site search page (one that finds nothing) is opened once in
  // a hidden frame and its copy is used: the call is the site's real one, sign-in and all. If that page doesn't have
  // it either, the home page is tried. The frame is kept for two minutes in case of another, then removed.
  // cb(the site's $, or null when it can't be had).
  var API_PAGES = ['/contents/search?q%5Bkeyword%5D=tvapiprobe&activetab=contents', '/'];
  window.__tvSiteApi = function(cb) {
    var jq = window.jQuery || window.$;
    if (jq && jq.apiCall) { cb(jq); return; }
    if (!document.body) { cb(null); return; }
    function frameApi(fr) { try { var w = fr.contentWindow, q = w && (w.jQuery || w.$); return q && q.apiCall ? q : null; } catch (e) { return null; } }
    function keep(fr) {
      clearTimeout(window.__tvApiFrameT);
      window.__tvApiFrameT = setTimeout(function() { try { fr.parentNode.removeChild(fr); } catch (e) {} window.__tvApiFrame = null; }, 120000);
    }
    var old = window.__tvApiFrame;
    if (old && old.isConnected) { var q0 = frameApi(old); if (q0) { keep(old); cb(q0); return; } }
    function tryPage(i) {
      if (i >= API_PAGES.length) { cb(null); return; }
      if (window.__tvApiFrame) { try { window.__tvApiFrame.parentNode.removeChild(window.__tvApiFrame); } catch (e) {} }
      var fr = document.createElement('iframe');
      fr.src = API_PAGES[i];
      fr.setAttribute('aria-hidden', 'true');
      fr.tabIndex = -1;
      fr.style.cssText = 'position:absolute;left:-9999px;top:0;width:1280px;height:900px;border:0;visibility:hidden;';
      document.body.appendChild(fr);
      window.__tvApiFrame = fr;
      keep(fr);
      var loaded = false, n = 0;
      fr.addEventListener('load', function() { loaded = true; });
      var tm = setInterval(function() {
        n++;
        var q = frameApi(fr);
        if (q) { clearInterval(tm); cb(q); }
        // the page has loaded and had 1.5 s to set itself up, or 10 s have gone by: try the next page
        else if ((loaded && n > 6) || n > 40) { clearInterval(tm); tryPage(i + 1); }
      }, 250);
    }
    tryPage(0);
  };
})();
