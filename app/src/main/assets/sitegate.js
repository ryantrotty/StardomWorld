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
})();
