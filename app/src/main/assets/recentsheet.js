(function(){
  // Recently Watched from the private sheet (2.72.0). The private build already logs every video page it opens in the
  // sheet's "videos" tab (assets/videoindex.js), with when it was last opened, so Recently Watched, the My Favorites
  // row and the home row read that list instead of downloading the site's My page. Public builds have no sheet and
  // keep reading My page.
  //   window.__tvRecent.on                 true in builds with the sheet
  //   window.__tvRecent.get(cb, maxAgeMs)  cb(list) with [{href, title, bg, bgUrl}], newest first; cb(null) when the
  //                                        sheet can't answer (no connection, or the sheet's script not updated yet)
  //   window.__tvRecent.cached()           the list as kept on the TV, right now, without asking the sheet (or null)
  //   window.__tvRecent.saw(rec)           a video page was just opened (assets/videoindex.js): put it first at once
  // The list is kept on the TV; a copy younger than maxAgeMs (default 60 s) is used without asking the sheet.
  // 2.78.1: videos opened since the sheet's copy was read are kept in a short list of their own (tvRecentLocalV1) and
  // put in front of the sheet's list, so the menu's Home shelf is up to date without waiting for the sheet.
  if (window.__tvRecent) return;
  var H = window.AndroidHost;
  var on = false;
  try { on = !!(H && H.recentSync && H.videoIndexOn && H.videoIndexOn()); } catch (e) {}
  var KEY = 'tvRecentSheetV1', LKEY = 'tvRecentLocalV1', waiting = [], asked = false, seq = 0;
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
  function atMs(x) { var t = Date.parse(x || ''); return isNaN(t) ? 0 : t; }
  // Videos opened on this TV, newest first, put in front of the sheet's rows unless the sheet already has them as late.
  function merged(rows) {
    var loc = [];
    try { loc = JSON.parse(lsGet(LKEY) || '[]') || []; } catch (e) { loc = []; }
    var seen = {};
    (rows || []).forEach(function(r) { if (r && r.id != null) seen[String(r.id)] = atMs(r.at); });
    var front = loc.filter(function(l) { return l && l.id && !(String(l.id) in seen && seen[String(l.id)] >= l.at - 60000); });
    if (!front.length) return rows || [];
    var ids = {};
    front.forEach(function(l) { ids[String(l.id)] = 1; });
    return front.map(function(l) { return { id: String(l.id), te: l.te || '', tj: l.tj || '', th: l.th || '', at: new Date(l.at).toISOString() }; })
      .concat((rows || []).filter(function(r) { return !(String(r.id) in ids); }));
  }
  function finish(list) { var w = waiting; waiting = []; asked = false; w.forEach(function(cb) { try { cb(list); } catch (e) {} }); }
  window.__tvRecentReply = function(id, text) {
    var r = null;
    try { r = JSON.parse(text); } catch (e) {}
    if (r && r.ok && Array.isArray(r.rows)) {
      lsSet(KEY, JSON.stringify({ t: Date.now(), rows: r.rows }));
      finish(toList(merged(r.rows)));
    } else {
      // keep showing what was there before, if anything
      var s = saved();
      finish(s && s.rows ? toList(merged(s.rows)) : null);
    }
  };
  window.__tvRecent = {
    on: on,
    get: function(cb, maxAgeMs) {
      if (!on) { cb(null); return; }
      var s = saved(), age = maxAgeMs == null ? 60000 : maxAgeMs;
      if (s && s.rows && Date.now() - s.t < age) { cb(toList(merged(s.rows))); return; }
      waiting.push(cb);
      if (asked) return;
      asked = true;
      try { H.recentSync('r' + (++seq), JSON.stringify({ action: 'vi_recent', limit: 60 })); } catch (e) { finish(null); }
      // no answer within 15 s: give up for now
      setTimeout(function() { if (asked) window.__tvRecentReply('', ''); }, 15000);
    },
    cached: function() {
      if (!on) return null;
      var s = saved();
      return s && s.rows ? toList(merged(s.rows)) : (lsGet(LKEY) ? toList(merged([])) : null);
    },
    saw: function(rec) {
      if (!on || !rec || !/^\d{1,9}$/.test(String(rec.id))) return;
      var loc = [];
      try { loc = JSON.parse(lsGet(LKEY) || '[]') || []; } catch (e) { loc = []; }
      var now = Date.now();
      loc = loc.filter(function(l) { return l && String(l.id) !== String(rec.id) && now - l.at < 86400000; });
      loc.unshift({ id: String(rec.id), te: rec.title_en || '', tj: rec.title_ja || '', th: rec.thumb || '', at: now });
      lsSet(LKEY, JSON.stringify(loc.slice(0, 20)));
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
