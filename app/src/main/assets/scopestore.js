(function(){
  // The StarScope list, read once per page (3.1.0). Every script that needs the list (starcards, sitecards, shownames,
  // setorder, scopeplayer, card check) asks here, so a page reads it at most once, and only when something needs it.
  // The app keeps a compact copy of the list (AndroidHost.scopeListLoadC): about 45% smaller than the full list, so a
  // page reads, receives and unpacks far less. Unpacked, it gives exactly the cards of the full list:
  //  - z: 1 marks the compact form
  //  - A: each wrestler's search keys, kept once; a card's "p" refers to them by number (negative: the flag is true)
  //  - TP: the site's thumbnail address prefix; a card's "th" starting with "~" is TP + the rest
  //  - D / XD: values most cards share (empty text, null, 0, false) for the card and its "x" block; left out of the
  //    cards that have them, and put back here.
  // With no compact copy yet (or one older than the full list), the full list is read and a compact copy is written for
  // the next page. compact() here and scopeCompact() in MainActivity.kt make the same thing.
  if (window.__tvScopeStore) return;
  window.__tvScopeStore = true;
  var H = window.AndroidHost;
  var D0 = { sr: '', she: '', bl: '', ed: '', ss: null, vt: '', vtj: '', tn: null, tnj: null };
  var XD0 = { sg: '', sgj: '', c: '', r: 0, rc: 0, dk: false, cv: '', bk: '' };
  var TP0 = 'https://www.stardom-world.com/storage/generated/images/thumbnail/960x540/content-';
  var HEAD = { z: 1, D: 1, XD: 1, TP: 1, A: 1, map: 1 };

  function expand(c) {
    if (!c || !c.z || !c.map) return c;
    var D = c.D || {}, XD = c.XD || {}, A = c.A || [], TP = c.TP || '', dk = Object.keys(D), xk = Object.keys(XD), m = c.map, i, k;
    function one(e) { return typeof e === 'number' ? (e < 0 ? [A[-1 - e], true] : [A[e], false]) : e; }
    function side(sd) { return Array.isArray(sd) ? sd.map(one) : sd; }
    for (var id in m) {
      var v = m[id];
      if (!v || typeof v !== 'object') continue;
      for (i = 0; i < dk.length; i++) { k = dk[i]; if (!(k in v)) v[k] = D[k]; }
      if (v.x && typeof v.x === 'object') for (i = 0; i < xk.length; i++) { k = xk[i]; if (!(k in v.x)) v.x[k] = XD[k]; }
      if (Array.isArray(v.p)) v.p = v.p.map(side);
      if (typeof v.th === 'string' && v.th.charAt(0) === '~') v.th = TP + v.th.slice(1);
    }
    var out = {};
    Object.keys(c).forEach(function(h) { if (!HEAD[h]) out[h] = c[h]; });
    out.map = m;
    return out;
  }

  function same(a, b) { return a === b || (a == null && b == null); }
  function compact(c) {
    if (!c || !c.map) return '';
    var idx = {}, A = [], m = {};
    Object.keys(c.map).forEach(function(id) {
      var s = c.map[id];
      if (!s || typeof s !== 'object') { m[id] = s; return; }
      var v = {};
      Object.keys(s).forEach(function(k) { if (!(k in D0 && same(s[k], D0[k]))) v[k] = s[k]; });
      if (s.x && typeof s.x === 'object' && !Array.isArray(s.x)) {
        var x = {};
        Object.keys(s.x).forEach(function(k) { if (!(k in XD0 && same(s.x[k], XD0[k]))) x[k] = s.x[k]; });
        v.x = x;
      }
      var ok = Array.isArray(s.p) && s.p.every(function(sd) {
        return Array.isArray(sd) && sd.every(function(e) { return Array.isArray(e) && e.length === 2 && Array.isArray(e[0]) && typeof e[1] === 'boolean'; });
      });
      if (ok) v.p = s.p.map(function(sd) {
        return sd.map(function(e) {
          var key = JSON.stringify(e[0]), n = idx[key];
          if (n == null) { n = idx[key] = A.length; A.push(e[0]); }
          return e[1] ? -1 - n : n;
        });
      });
      if (typeof s.th === 'string' && s.th.indexOf(TP0) === 0) v.th = '~' + s.th.slice(TP0.length);
      m[id] = v;
    });
    var out = { z: 1, D: D0, XD: XD0, TP: TP0, A: A };
    Object.keys(c).forEach(function(h) { if (h !== 'map' && !HEAD[h]) out[h] = c[h]; });
    out.map = m;
    return JSON.stringify(out);
  }

  var tried = false;
  // The list ({ t, s, f, map, ... }) or null. force: read it again (a newer list was just saved).
  window.__tvScopeLoad = function(force) {
    if (!force && window.__tvScopeList && window.__tvScopeList.map) return window.__tvScopeList;
    if (!force && tried) return null;
    tried = true;
    var t0 = Date.now(), raw = '', L = null, how = '';
    try { if (H && H.scopeListLoadC) { raw = H.scopeListLoadC() || ''; if (raw) { L = expand(JSON.parse(raw)); how = 'compact'; } } } catch (e) { L = null; }
    if (!L || !L.map) {
      L = null;
      try { if (H && H.scopeListLoad) { raw = H.scopeListLoad() || ''; if (raw) { L = JSON.parse(raw); how = 'full'; } } } catch (e) { L = null; }
      // no compact copy yet: write one, so the next page reads that
      if (L && L.map && H && H.scopeListSaveC) { try { H.scopeListSaveC(compact(L)); } catch (e) {} }
    }
    window.__tvScopePerf = { ms: Date.now() - t0, kb: Math.round(raw.length / 1024), how: how || 'none' };
    raw = '';
    if (L && L.map) { window.__tvScopeList = L; return L; }
    return null;
  };
  // Your build saves each updated list: the full list (scopeListSave), then this compact copy for the pages.
  window.__tvScopeSaveCompact = function(c) {
    try { return !!(H && H.scopeListSaveC && H.scopeListSaveC(compact(c))); } catch (e) { return false; }
  };
  // The card map, for the scripts that only look cards up (same answer as before 3.1.0, from the one shared read).
  window.__tvScopeMap = function() {
    var L = window.__tvScopeLoad();
    if (L && L.map) return L.map;
    try { var c = JSON.parse(localStorage.getItem('tvVixCardsV4') || 'null'); if (c && c.map) return c.map; } catch (e) {}
    return null;
  };
})();
