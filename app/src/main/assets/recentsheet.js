(function(){
  // Recently Watched from the private sheet (2.72.0). The private build already logs every video page it opens in the
  // sheet's "videos" tab (assets/videoindex.js), with when it was last opened, so Recently Watched, the My Favorites
  // row and the home row read that list instead of downloading the site's My page. Public builds have no sheet and
  // keep reading My page.
  //   window.__tvRecent.on                 true in builds with the sheet
  //   window.__tvRecent.get(cb, maxAgeMs)  cb(list) with [{href, title, bg, bgUrl}], newest first; cb(null) when the
  //                                        sheet can't answer (no connection, or the sheet's script not updated yet)
  // The list is kept on the TV; a copy younger than maxAgeMs (default 60 s) is used without asking the sheet.
  if (window.__tvRecent) return;
  var H = window.AndroidHost;
  var on = false;
  try { on = !!(H && H.recentSync && H.videoIndexOn && H.videoIndexOn()); } catch (e) {}
  var KEY = 'tvRecentSheetV1', waiting = [], asked = false, seq = 0;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ja() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function saved() { try { return JSON.parse(lsGet(KEY) || 'null'); } catch (e) { return null; } }
  function toList(rows) {
    var base = location.origin.indexOf('stardom-world.com') >= 0 ? location.origin : 'https://www.stardom-world.com';
    var J = ja(), out = [];
    (rows || []).forEach(function(r) {
      if (!r || !/^\d{1,9}$/.test(String(r.id))) return;
      var t = J ? (r.tj || r.te) : (r.te || r.tj);
      out.push({ href: base + '/contents/' + r.id, title: String(t || 'Stardom World Video'), bg: r.th || '', bgUrl: r.th || '' });
    });
    return out;
  }
  function finish(list) { var w = waiting; waiting = []; asked = false; w.forEach(function(cb) { try { cb(list); } catch (e) {} }); }
  window.__tvRecentReply = function(id, text) {
    var r = null;
    try { r = JSON.parse(text); } catch (e) {}
    if (r && r.ok && Array.isArray(r.rows)) {
      lsSet(KEY, JSON.stringify({ t: Date.now(), rows: r.rows }));
      finish(toList(r.rows));
    } else {
      // keep showing what was there before, if anything
      var s = saved();
      finish(s && s.rows ? toList(s.rows) : null);
    }
  };
  window.__tvRecent = {
    on: on,
    get: function(cb, maxAgeMs) {
      if (!on) { cb(null); return; }
      var s = saved(), age = maxAgeMs == null ? 60000 : maxAgeMs;
      if (s && s.rows && Date.now() - s.t < age) { cb(toList(s.rows)); return; }
      waiting.push(cb);
      if (asked) return;
      asked = true;
      try { H.recentSync('r' + (++seq), JSON.stringify({ action: 'vi_recent', limit: 60 })); } catch (e) { finish(null); }
      // no answer within 15 s: give up for now
      setTimeout(function() { if (asked) window.__tvRecentReply('', ''); }, 15000);
    },
    // A shell page that can't get the list falls back to the site's real page (tvreal skips the shell).
    realPage: function() {
      if (!window.__tvShell) return false;
      var u = location.href + (location.search ? '&' : '?') + 'tvreal=1';
      location.replace(u);
      return true;
    }
  };
})();
