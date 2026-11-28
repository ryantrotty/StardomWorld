(function(){
  // Normal pages keep their own cards (2.55.1). This draws the StarScope button and its results page only.
  // StarScope video cards (private builds, 2.55.0). A video you have logged shows who is in it instead of the site's generic
  // title: event, the wrestlers, then block, round, match number and date. It never shows the result. Other videos are left
  // alone. Reads one list from the private sheet at most every 30 minutes, and nothing from the video site.
  if (window.__tvStarCards) return;
  var H = window.AndroidHost;
  // 2.76.0: StarScope reading is its own switch (AndroidHost.scopeOn): your build reads the sheet, other builds the
  // published StarScope file once it is switched on for them. Logging and Log next stay with the sheet.
  if (!H || !H.starCards || !H.scopeOn || !H.scopeOn()) return;
  var SHEET = false; try { SHEET = !!(H.videoIndexOn && H.videoIndexOn()); } catch (e) {}
  window.__tvStarCards = true;
  var KEY = 'tvVixCardsV4', AGE = 1800000, map = null, ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // 2.121.3: the list lives in the app's own files (AndroidHost.scopeListLoad / scopeListSave); the page's storage was
  // too small for it. A copy still in the page's storage is moved over once and removed from there.
  var NATIVE = !!(H.scopeListLoad && H.scopeListSave), KEPT = null;
  try { if (NATIVE) { var raw0 = H.scopeListLoad(); if (raw0) KEPT = JSON.parse(raw0); } } catch (e) { KEPT = null; }
  if (!KEPT || !KEPT.map) {
    KEPT = null;
    try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && c.map) { KEPT = c; if (NATIVE && H.scopeListSave(JSON.stringify(c))) localStorage.removeItem(KEY); } } catch (e) {}
  } else { try { localStorage.removeItem(KEY); } catch (e) {} }
  if (KEPT) map = KEPT.map;
  // 2.122.1: the other scripts (scopeplayer, setorder, cardcheck, shownames) read the list from here, not the page's storage.
  window.__tvScopeList = KEPT;
  window.__tvScopeMap = window.__tvScopeMap || function(){ var L = window.__tvScopeList; if (L && L.map) return L.map; try { var c = JSON.parse(localStorage.getItem('tvVixCardsV4') || 'null'); if (c && c.map) return c.map; } catch (e) {} try { var A = window.AndroidHost, r = A && A.scopeListLoad ? A.scopeListLoad() : ''; if (r) { var c2 = JSON.parse(r); if (c2 && c2.map) { window.__tvScopeList = c2; return c2.map; } } } catch (e) {} return null; };
  var st = document.createElement('style');
  st.textContent = [
    '.tvsc-host{display:block !important;-webkit-line-clamp:unset !important;overflow:visible !important;padding:11px 14px 13px !important;box-sizing:border-box;}',
    '.tvsc,.tvsc *{text-decoration:none !important;}',
    // 2.122.0: English version cue, the player bar's EN box (outlined square, white) in the thumbnail's lower right
    '.tv-enp{position:relative !important;}',
    '.tv-en{position:absolute;right:8px;bottom:8px;z-index:2;display:flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 5px;box-sizing:border-box;border:2px solid #FFFFFF;border-radius:4px;background:rgba(11,17,24,.85);color:#FFFFFF;font:800 13px/1 Arial,Helvetica,sans-serif;letter-spacing:.5px;pointer-events:none;}',
    '.tvsc{font-family:Arial,Helvetica,sans-serif;color:#fff;font-weight:400;}',
    '.tvsc .ev{font-size:12px;font-weight:800;letter-spacing:1px;color:#F4C242;text-transform:uppercase;}',
    '.tvsc .nm{margin-top:7px;padding-bottom:8px;border-bottom:1px solid #2A323C;font-size:18px;font-weight:800;line-height:1.22;word-break:normal !important;overflow-wrap:break-word !important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;}',
    '.tvsc .nm.sm{font-size:15px;line-height:1.26;}.tvsc .nm .ln{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tvsc .ft{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:13px;font-weight:600;color:#C9D2DC;}',
    '.tvsc .ft b{flex:none;color:#F4C242;font-weight:700;}'
  ].join('');
  (document.head || document.documentElement).appendChild(st);

  function names(side) { return side.length > 3 ? side[0] + ' + ' + (side.length - 1) : side.join(' & '); }
  function dateText(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    if (!m) return '';
    if (ja) return m[1] + '年' + (+m[2]) + '月' + (+m[3]) + '日';
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }
  // Multi-person matches (2.85.0): more than two sides, or more than four wrestlers. Rules, in order, until it fits:
  //  A. each side's team or faction name where it has one, its wrestlers where not;
  //  B. the same in smaller type;
  //  D. surnames for the sides without a team name (one-word ring names stay as they are), normal then smaller type;
  //  then whatever is still too long is cut with "…".
  // Up to three sides get a line each ("vs" in front of the second and third); more run on, at most four lines.
  function wide(t) { var n = 0; String(t).split('').forEach(function(c) { n += c.charCodeAt(0) > 0x2e80 ? 1.8 : 1; }); return n; }
  function last(n) { var p = String(n).trim().split(/\s+/); return p.length > 1 ? p[p.length - 1] : n; }
  function multiLines(sides, tn) {
    var per = sides.length <= 3, sep = ja ? '&' : ' & ';
    function fits(L, max) { return per ? L.every(function(x, i) { return wide((i ? 'vs ' : '') + x) <= max; }) : wide(L.join(' vs ')) <= max * 4; }
    // A team or faction name stands for a side of two or more only: a lone wrestler keeps her own name (2.86.0).
    function grp(sd, i) { return tn && tn[i] && sd.length >= 2 ? tn[i] : ''; }
    var A = sides.map(function(sd, i) { return grp(sd, i) || sd.join(sep); });
    var D = sides.map(function(sd, i) { return grp(sd, i) || sd.map(last).join(sep); });
    var pick = fits(A, 27) ? { L: A, sm: false } : fits(A, 33) ? { L: A, sm: true } : fits(D, 27) ? { L: D, sm: false } : { L: D, sm: true };
    var html = per ? pick.L.map(function(x, i) { return '<span class="ln">' + (i ? 'vs ' : '') + esc(x) + '</span>'; }).join('') : esc(pick.L.join(' vs '));
    return { html: html, sm: pick.sm };
  }
  function block(v) {
    var sides = (ja && v.sj && v.sj.length === v.s.length ? v.sj : v.s), foot = (ja ? v.fj : v.f).slice();
    // 2.78.1: no match number on video cards (show cards and the player keep theirs).
    var lines, sm = false, tn = ja ? (v.tnj || v.tn) : v.tn, total = sides.reduce(function(a, s) { return a + s.length; }, 0);
    if (sides.length <= 2 && total <= 4) lines = sides.map(function(s, i) { return (i ? 'vs ' : '') + esc(names(s)); }).join('<br>');
    else { var m = multiLines(sides, tn); lines = m.html; sm = m.sm; }
    return '<div class="tvsc notranslate" translate="no"><div class="ev">' + esc(ja ? v.ej : v.e) + '</div><div class="nm' + (sm ? ' sm' : '') + '">' + lines + '</div><div class="ft"><span>' + esc(foot.join(' · ')) + '</span><b>' + esc(dateText(v.d)) + '</b></div></div>';
  }
  // The logger's Card tab draws its preview with the same card (2.61.0).
  // 2.122.0: English version (match_videos version "en", sent as lg). en(v) is the box, enCls(v) the class its picture needs.
  function isEn(v) { return !!(v && v.lg === 'en'); }
  function enBox(v) { return isEn(v) ? '<span class="tv-en notranslate" translate="no" aria-label="English">EN</span>' : ''; }
  function enCls(v) { return isEn(v) ? ' tv-enp' : ''; }
  window.__tvStarCard = { html: block, en: enBox, enCls: enCls, isEn: isEn };

  // ---- Complete years (2.97.0): StarScope as the source for pages limited to a year whose every show is logged.
  // AndroidHost.scopeCompleteJson() lists those years ([2025, 2026] in your build since 2.106.0, none in others). A complete year is covered
  // up to its latest logged show ("through"); a show after that (one not logged yet) still comes from the site's search.
  // Pages that use this (Tag League, the tournament and title tabs, title histories) show the site's normal cards; the
  // index only decides which videos those are, so nothing on screen changes look. Nothing here asks the video site.
  var CY = null, THRU = null;
  function completeYears() {
    if (CY) return CY;
    CY = [];
    try { var j = JSON.parse(H.scopeCompleteJson ? H.scopeCompleteJson() : '[]'); if (j && j.length) CY = j.map(String).sort(); } catch (e) { CY = []; }
    return CY;
  }
  function through(y) {
    if (!THRU) {
      THRU = {};
      Object.keys(map || {}).forEach(function(id) { var d = String((map[id] || {}).d || ''); if (d.length === 10) { var k = d.slice(0, 4); if (!THRU[k] || d > THRU[k]) THRU[k] = d; } });
    }
    return THRU[String(y)] || '';
  }
  // The first day of the run of complete years that ends with the newest one: [2025, 2026] gives 2025-01-01.
  function coverFrom() {
    var ys = completeYears(), y = ys.length ? +ys[ys.length - 1] : 0;
    if (!y || !through(y)) return '';
    while (ys.indexOf(String(y - 1)) >= 0 && through(y - 1)) y--;
    return y + '-01-01';
  }
  function coverThru() { var ys = completeYears(); return ys.length ? through(ys[ys.length - 1]) : ''; }
  function covered(d) { d = String(d || '').slice(0, 10); var y = d.slice(0, 4); return d.length === 10 && completeYears().indexOf(y) >= 0 && !!through(y) && d <= through(y); }
  // Stardom's own shows on the schedule since the last logged one, up to today (Japan time): the shows still to log.
  function unlogged() {
    var thru = coverThru(), out = [];
    if (!thru) return out;
    var today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    try {
      ((JSON.parse(H.scheduleJson()) || {}).events || []).forEach(function(e) {
        var d = String(e.start || '').slice(0, 10);
        if (e.own !== false && d > thru && d <= today && out.indexOf(d) < 0) out.push(d);
      });
    } catch (e) {}
    return out.sort();
  }
  // 2.106.2: a straight tag match, two sides of two (tag team pages list only these, not 6- or 8-woman tags or 3-ways).
  function twoOnTwo(v) { var s = v.p || v.s || []; return s.length === 2 && s[0].length === 2 && s[1].length === 2; }
  function hasName(v, name) { var k = norm(name); return (v.p || []).some(function(sd) { return sd.some(function(p) { return p[0].indexOf(k) >= 0; }); }); }
  function together(v, a, b) {
    var ka = norm(a), kb = norm(b);
    return (v.p || []).some(function(sd) { return sd.some(function(p) { return p[0].indexOf(ka) >= 0; }) && sd.some(function(p) { return p[0].indexOf(kb) >= 0; }); });
  }
  // Tournaments by id, with the label as a fallback for a list from an older sheet script.
  var COMP = { stargp: ['5star-gp', /5\s*★?\s*star/i], cinderella: ['cinderella', /cinderella/i], tagleague: ['tag-league', /tag\s*league|goddess/i] };
  function inComp(v, key) { var X = v.x || {}, c = COMP[key]; return !!c && (X.cv ? X.cv === c[0] : c[1].test(X.c || '')); }
  function isTitle(v, id) { var X = v.x || {}; if (id) return (X.tv || []).indexOf(id) >= 0; return !!((X.tv && X.tv.length) || (X.ti && X.ti.length)); }
  function siteTitle(v) {
    var t = ja ? (v.vtj || v.vt) : (v.vt || v.vtj);
    if (t) return t;
    var d = String(v.d || '').replace(/-/g, '/');
    return (d ? d + ' ' : '') + (ja ? v.ej : v.e) + ' ' + oneLine(v);
  }
  // window.__tvScopeIdx, not __tvScope: that one (further down) belongs to the menus and card check.
  window.__tvScopeIdx = {
    years: completeYears, through: through, from: coverFrom, thru: coverThru, covered: covered, unlogged: unlogged,
    hasName: hasName, together: together, twoOnTwo: twoOnTwo, inComp: inComp, isTitle: isTitle,
    // Every covered match passing test(v), newest first. withSegments (2.118.0): segments too (a complete career's intro).
    find: function(test, withSegments) {
      var out = [];
      Object.keys(map || {}).forEach(function(id) { var v = map[id]; if (v && v.x && (withSegments || v.x.k !== 'segment') && covered(v.d) && test(v)) out.push({ id: id, v: v }); });
      return out.sort(function(a, b) { return String(b.v.d).localeCompare(String(a.v.d)) || ((+a.v.n || 0) - (+b.v.n || 0)); });
    },
    // A match as the site's search would list it: the shape the team, wrestler and title pages already draw.
    item: function(x) { return { id: x.id, h: location.origin + '/contents/' + x.id, t: siteTitle(x.v), b: x.v.th || '', d: x.v.d, sc: 1 }; },
    // How a page limited to wrestlers who started on "start" (a debut or a team's first date) should look for matches:
    // only: the index has all of it; recent: shows after the last logged one still need the site's newest page.
    plan: function(start) {
      var from = coverFrom(), thru = coverThru(), un = unlogged();
      return { from: from, thru: thru, only: !!(from && start && String(start) >= from), recent: un.length > 0, unlogged: un };
    }
  };

  // ---- the telescope button on wrestler and tag team pages, and its results
  var TEL = '<svg width="30" height="30" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="currentColor"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="currentColor"/><path d="M33 12.5H40V27.5H33Z" fill="currentColor"/><ellipse cx="40" cy="20" rx="4.5" ry="8.5" fill="#0B1118" stroke="currentColor" stroke-width="1.4"/></g><path fill="#F4C242" d="M50.5 -13Q50.5 -4.5 59 -4.5Q50.5 -4.5 50.5 4Q50.5 -4.5 42 -4.5Q50.5 -4.5 50.5 -13Z"/><path d="M23 25L14 45M25 25L34 45M24 25V44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_-]+/g, ''); }
  function hasKey(person, want) { return person[0].some(function(k) { return want.indexOf(k) >= 0; }); }
  // Every logged match with the wrestler (or, for a team, both partners on the same side), the same matches the StarScope
  // page's wrestler filter finds (2.85.0: no longer only the ones the site's search would miss).
  // 2.109.0 (New Horizons era page): 'v' every match with wrestler a and wrestler b on opposite sides; 'f' every match
  // between faction a and faction b (ids in factions.json), a side counting as a faction's when it has two or more
  // wrestlers, all members. Both keep to "from" and "to" (dates) when the address gives them.
  var FACM = null;
  function facMembers(id) {
    if (!FACM) {
      FACM = {};
      try { ((JSON.parse(H.factionsJson()) || {}).factions || []).forEach(function(f) { FACM[f.id] = { name: String(f.name || '').replace(/ \(.*\)$/, ''), keys: (f.members || []).map(function(m) { return norm(m.search || m.name); }), captain: f.captain || (f.captains || [])[0] || '' }; }); } catch (e) {}
    }
    return FACM[id] || null;
  }
  function sideHas(sd, k) { return sd.some(function(p) { return p[0].indexOf(k) >= 0; }); }
  function sideOf(sd, keys) { return sd.length > 1 && sd.every(function(p) { return p[0].some(function(k) { return keys.indexOf(k) >= 0; }); }); }
  function versus(v, a, b) {
    var ka = norm(a), kb = norm(b), sides = v.p || [], ia = -1, ib = -1;
    sides.forEach(function(sd, i) { if (ia < 0 && sideHas(sd, ka)) ia = i; if (ib < 0 && sideHas(sd, kb)) ib = i; });
    return ia >= 0 && ib >= 0 && ia !== ib;
  }
  // 2.121.0: a side is a faction's (a unit side) when two or more of its wrestlers carry that faction in the sheet's
  // participants (shape 4, x.fa) and nobody on it carries another one. Without faction data for the side, it is the
  // old test: two or more wrestlers, all on factions.json's member list. So a 2018 STARS side counts even though
  // factions.json lists today's STARS.
  // 2.121.2: older matches often carry the faction on only some of a side's wrestlers. A wrestler now also counts for
  // the faction when she has no faction on that match but carries it on some other logged match, or is on factions.json's
  // list. The side is the faction's when nobody on it carries another faction, two or more count, and they are more than
  // half of the side.
  var KNOWN = null, KNOWN_AT = null;
  function knownKeys(id) {
    if (!KNOWN || KNOWN_AT !== map) {
      KNOWN = {}; KNOWN_AT = map;
      Object.keys(map || {}).forEach(function(k) {
        var v = map[k], fa = v && v.x && v.x.fa;
        if (!fa) return;
        (v.p || []).forEach(function(sd, i) { (sd || []).forEach(function(p, j) { var f = fa[i] && fa[i][j]; if (f && p[0] && p[0][0]) (KNOWN[f] = KNOWN[f] || {})[p[0][0]] = 1; }); });
      });
    }
    var o = KNOWN[id] || {}, F = facMembers(id);
    if (F && !o.__fj) { F.keys.forEach(function(k) { o[k] = 1; }); o.__fj = 1; KNOWN[id] = o; }
    return o;
  }
  function unitSide(v, i, id) {
    var sd = (v.p || [])[i] || [], fa = v.x && v.x.fa ? v.x.fa[i] : null;
    if (sd.length < 2) return false;
    var K = knownKeys(id), n = 0, other = false;
    sd.forEach(function(p, j) {
      var f = fa ? fa[j] : '';
      if (f === id) n++;
      else if (f) other = true;
      else if ((p[0] || []).some(function(k) { return K[k]; })) n++;
    });
    return !other && n >= 2 && n * 2 > sd.length;
  }
  function facVersus(v, fa, fb) {
    var A = facMembers(fa), B = facMembers(fb), sides = v.p || [], ia = -1, ib = -1;
    if (!A || !B) return false;
    sides.forEach(function(sd, i) { if (ia < 0 && unitSide(v, i, fa)) ia = i; else if (ib < 0 && unitSide(v, i, fb)) ib = i; });
    return ia >= 0 && ib >= 0 && ia !== ib;
  }
  function pairList(kind, a, b, from, to) {
    var out = [];
    Object.keys(map || {}).forEach(function(id) {
      var v = map[id];
      if (!v || (v.x && v.x.k === 'segment') || (from && String(v.d || '') < from) || (to && String(v.d || '') > to)) return;
      if (kind === 'v' ? versus(v, a, b) : facVersus(v, a, b)) out.push({ id: id, v: v });
    });
    return oneEach(out).sort(function(x, y) { return String(y.v.d).localeCompare(String(x.v.d)); });
  }
  // 2.111.2: one entry per match. An English-commentary video linked to the Japanese match is the same match, so counts
  // and lists keep the match's own video (the one in the match's show), else the first one.
  function oneEach(list) {
    var by = {}, out = [];
    list.forEach(function(x) {
      var m = (x.v.x && x.v.x.m) || x.id, own = !x.v.ss;
      if (by[m] == null) { by[m] = out.length; out.push(x); }
      else if (own && out[by[m]].v.ss) out[by[m]] = x;
    });
    return out;
  }
  // 2.128.0: the Matches menu's types worked out from the index: side counts, the special rules and the tournaments.
  function stips(v) { var X = v.x || {}; return (X.sp || X.st || []).map(String); }
  function isType(v, id) {
    var p = v.p || [], n = p.length, sz = p.map(function(s) { return s.length; }), even = function(k) { return sz.every(function(x) { return x === k; }); };
    var sp = stips(v), lab = String(v.e || '') + ' ' + String(v.ej || '');
    function rule(k, re) { return sp.indexOf(k) >= 0 || re.test(lab); }
    switch (id) {
      case 'single': return n === 2 && even(1) && !rule('royal', /battle\s*royal|バトルロイヤル/i);
      case 'tag': return n === 2 && even(2);
      case 'way3': return n === 3 && even(1); case 'way3tag': return n === 3 && even(2); case 'way3trio': return n === 3 && even(3);
      case 'way4': return n === 4 && even(1); case 'way4tag': return n === 4 && even(2); case 'way4trio': return n === 4 && even(3);
      case 'way5': return n === 5; case 'way6': return n === 6;
      case 'six': return n === 2 && even(3); case 'eight': return n === 2 && even(4); case 'ten': return n === 2 && even(5);
      case 'twelve': return n === 2 && even(6); case 'fourteen': return n === 2 && even(7);
      case 'royal': return rule('royal', /battle\s*royal|バトルロイヤル/i);
      case 'cage': return rule('cage', /cage|ケージ/i);
      case 'gauntlet': return rule('gauntlet', /gauntlet|ガントレット/i);
      case 'highspeed': return rule('highspeed', /high[\s-]*speed|ハイスピード/i) || isTitle(v, 'highspeed');
      case 'ladder': return rule('ladder', /ladder|ラダー/i);
      case 'rumble': return rule('rumble', /rumble|ランブル/i);
      case 'handicap': return rule('handicap', /handicap|ハンディキャップ|ハンデ/i) || (n === 2 && sz[0] !== sz[1]);
      case 'champ': return isTitle(v);
      case 'stargp': return inComp(v, 'stargp');
      case 'cinderella': return inComp(v, 'cinderella');
      case 'tagleague': return inComp(v, 'tagleague');
    }
    return stips(v).indexOf(id) >= 0;   // 2.131.0: any other StarScope rule by its id (no-dq, loser-haircut, sparring…)
  }
  function results(kind, a, b) {
    if (!map) return [];
    if (kind === 'v' || kind === 'f') return pairList(kind, a, b, (Q && Q.get('from')) || '', (Q && Q.get('to')) || '');
    if (kind === 'ti') {   // 2.121.0: every logged match for title a (a lineage id), one per match, newest first
      // 2.128.0: also a title tag id (swa-world, roh-women…), '*any' (every title match) and '*other' (titles that
      // aren't Stardom's own belts), for the Championships menu entries with no lineage page.
      var OWN = ['artist', 'future', 'goddess', 'highspeed', 'kawaii', 'newblood', 'wonder', 'world'];
      var tl = [];
      Object.keys(map).forEach(function(id) {
        var v = map[id], tv = (v && v.x && v.x.tv) || [];
        if (!v || !v.x || v.x.k === 'segment') return;
        var hit = a === '*any' ? tv.length > 0 : a === '*other' ? tv.some(function(t) { return OWN.indexOf(t) < 0; }) : tv.indexOf(a) >= 0;
        if (hit) tl.push({ id: id, v: v });
      });
      return oneEach(tl).sort(function(x, y) { return String(y.v.d).localeCompare(String(x.v.d)); });
    }
    if (kind === 'mt') {   // 2.128.0: a match type from the Matches menu (match_types.json id), from the index
      var ml = [];
      Object.keys(map).forEach(function(id) { var v = map[id]; if (v && v.x && v.x.k !== 'segment' && isType(v, a)) ml.push({ id: id, v: v }); });
      return oneEach(ml).sort(function(x, y) { return String(y.v.d).localeCompare(String(x.v.d)); });
    }
    var out = [];
    Object.keys(map).forEach(function(id) {
      var v = map[id], sides = v.p || [], hit = false;
      if (kind === 'w') {
        var want = [norm(a), norm(b)];
        sides.forEach(function(s) { s.forEach(function(p) { if (hasKey(p, want)) hit = true; }); });
      } else if (!(v.x && v.x.k === 'segment') && twoOnTwo(v)) {   // a segment isn't a team match (2.96.0); 2 v 2 only (2.106.2)
        var one = [norm(a)], two = [norm(b)];
        sides.forEach(function(s) {
          var x = s.filter(function(p) { return hasKey(p, one); })[0], y = s.filter(function(p) { return hasKey(p, two); })[0];
          if (x && y) hit = true;
        });
      }
      if (hit) out.push({ id: id, v: v });
    });
    return out.sort(function(x, y) { return String(y.v.d).localeCompare(String(x.v.d)); });
  }
  function addButtons() {
    return;   // 2.126.0: no StarScope button on the wrestler and team filter rows (their pages list every match now)
    Array.prototype.forEach.call(document.querySelectorAll('[data-scope="w"],[data-scope="t"]'), function(row) {
      if (row.querySelector('.tvsp-btn')) return;
      var kind = row.getAttribute('data-scope'), a = row.getAttribute('data-scope-a'), b = row.getAttribute('data-scope-b');
      if (!results(kind, a, b).length) return;
      var btn = document.createElement('a'), chip = row.querySelector('.wr-tab');
      btn.className = (chip ? 'wr-tab' : 'tt-chip') + ' tvsp-btn';
      btn.tabIndex = 0;
      btn.setAttribute('aria-label', 'StarScope');
      btn.href = '/mypage?tvscope=' + kind + '&a=' + encodeURIComponent(a) + '&b=' + encodeURIComponent(b);
      btn.style.cssText = 'padding:0 10px;line-height:0;color:#fff !important;';
      btn.innerHTML = TEL;
      row.appendChild(btn);
    });
  }
  // Pictures by row (2.85.0), on every StarScope page: the first two rows at once, then always the row after the one
  // with focus and the one before it; a row two or more above the focus lets its pictures go, and gets them back when
  // it is one row above again. So a long page never holds, or asks the site for, more than four rows of pictures.
  function rowPictures(root, sel) {
    var cards = Array.prototype.slice.call(root.querySelectorAll(sel));
    if (!cards.length) return;
    var base = root.getBoundingClientRect().top - root.scrollTop, tops = [];
    function top(el) { return Math.round(el.getBoundingClientRect().top - base); }
    cards.forEach(function(c) { var t = top(c); if (tops.indexOf(t) < 0) tops.push(t); });
    tops.sort(function(a, b) { return a - b; });
    var ae = document.activeElement, fi = 0;
    if (ae) { var own = cards.filter(function(c) { return c === ae || c.contains(ae); })[0]; if (own) fi = tops.indexOf(top(own)); }
    var lo = fi - 1, hi = Math.max(fi + 1, 1);
    cards.forEach(function(c) {
      var r = tops.indexOf(top(c));
      Array.prototype.forEach.call(c.querySelectorAll('.im'), function(im) {
        if (r >= lo && r <= hi) {
          var u = im.getAttribute('data-bg');
          if (u) { im.style.backgroundImage = 'url(\'' + u + '\')'; im.setAttribute('data-u', u); im.removeAttribute('data-bg'); }
        } else if (r <= fi - 2 && im.getAttribute('data-u') && im.style.backgroundImage) {
          im.setAttribute('data-bg', im.getAttribute('data-u')); im.style.backgroundImage = '';
        }
      });
    });
  }
  var Q = null;
  try { Q = new URLSearchParams(location.search); } catch (e) {}
  var scopeKind = Q && location.pathname === '/mypage' ? Q.get('tvscope') : null, scopeDone = false;
  function renderScope() {
    if (scopeDone || !map || !document.body) return;
    scopeDone = true;
    var a = Q.get('a') || '', b = Q.get('b') || '', list = results(scopeKind, a, b);
    var head = scopeKind === 't' ? a + ' & ' + b : a;
    if (scopeKind === 'v') head = a + ' vs ' + b;
    if (scopeKind === 'f') { var fa = facMembers(a), fb = facMembers(b); head = (fa ? fa.name : a) + ' vs ' + (fb ? fb.name : b); }
    if (scopeKind === 'ti') { var tln = null; try { tln = JSON.parse(H.lineageJson(a)); } catch (e) { tln = null; } head = tln ? String((ja && tln.ja) || tln.title).replace(/ Championship$/, '') : a; }
    if (Q.get('n')) head = Q.get('n');   // 2.128.0: the menu entry's own name (titles with no lineage file, match types)
    // 2.131.0: the count sits at the right of the filter bar (it follows the filters), not in the title
    var d = document.createElement('div');
    d.id = 'tvsp'; d.className = 'notranslate'; d.setAttribute('translate', 'no');
    var h = '<style>#tvsp{position:fixed;inset:0;z-index:99000;background:#0B1118;overflow:auto;box-sizing:border-box;padding:28px 40px;font-family:Arial,Helvetica,sans-serif;color:#fff}#tvsp .hd{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:900;margin-bottom:20px}#tvsp .gr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;align-items:stretch}#tvsp a.c{display:block;background:#1a1a1a;border-radius:8px;overflow:hidden;text-decoration:none;outline:none}#tvsp a.c:focus{outline:3px solid #F4C242;outline-offset:2px;box-shadow:0 0 16px rgba(244,194,66,.8)}#tvsp .im{aspect-ratio:16/9;background:#172029 center/cover no-repeat}</style>';
    h += '<div class="hd"><span style="display:block;flex:none;width:10px;height:36px;background:#F4C242"></span>' + esc(head) + '</div><div class="fbh"></div><div class="gr">';   // 2.127.0: the page title's gold bar, no telescope
    // 2.128.0: a long list (a match type has thousands) is drawn 48 cards at a time; the next 48 come when focus
    // reaches the last two rows.
    function cardHtml(x) { return '<a class="c" tabindex="0" href="/contents/' + esc(x.id) + '"><div class="im' + enCls(x.v) + '"' + (x.v.th ? ' data-bg="' + esc(x.v.th) + '"' : '') + '>' + enBox(x.v) + '</div><div class="tvsc-host">' + block(x.v) + '</div></a>'; }
    var shown = Math.min(48, list.length);
    list.slice(0, shown).forEach(function(x) { h += cardHtml(x); });
    d.innerHTML = h + '</div>';
    document.body.appendChild(d);
    var grid = d.querySelector('.gr');
    function more() { if (shown >= list.length) return; var nx = list.slice(shown, shown + 48); shown += nx.length; grid.insertAdjacentHTML('beforeend', nx.map(cardHtml).join('')); }
    // 2.131.0: the filter bar (window.__tvScopeFilter) over every one of these grids. Which filters depends on the list:
    // a match type page doesn't offer match types, a title's own list doesn't offer titles. All matches from a title
    // page (&fti=) opens every championship match with that title already chosen.
    var KINDS = { mt: ['ch', 'wr', 'fa', 'yr', 'sh', 'vn', 'tr', 'sort'], v: ['yr', 'mt', 'ch', 'sh', 'tr', 'sort'], t: ['yr', 'mt', 'ch', 'fa', 'sh', 'tr', 'sort'], f: ['yr', 'mt', 'ch', 'wr', 'sh', 'sort'], w: ['yr', 'mt', 'ch', 'wr', 'sh', 'sort'] };
    var kinds = scopeKind === 'ti' ? (a === '*any' || a === '*other' ? ['ch', 'mt', 'wr', 'yr', 'sh', 'vn', 'sort'] : ['mt', 'wr', 'yr', 'sh', 'vn', 'sort']) : (KINDS[scopeKind] || ['yr', 'mt', 'ch', 'wr', 'sort']);
    var pre = {}; if (Q.get('fti')) pre.ch = Q.get('fti');
    var FB = SF.mount(d.querySelector('.fbh'), null, list, {
      kinds: kinds, pre: pre,
      onChange: function(L2) { list = L2; shown = Math.min(48, list.length); grid.innerHTML = list.slice(0, shown).map(cardHtml).join('') + (list.length ? '' : '<div style="grid-column:1/-1;font:700 17px Arial;color:#9AA6B4">' + esc(HT.none) + '</div>'); rowPictures(d, 'a.c'); },
      onDown: function() { var c0 = grid.querySelector('a.c'); if (c0) { c0.focus({ preventScroll: true }); c0.scrollIntoView({ block: 'nearest' }); } },
      onLeft: function() { if (window.__tvOpenMenu) window.__tvOpenMenu(); }
    });
    if (pre.ch) FB.items(list);   // a title chosen up front: draw its list (and count) now

    d.addEventListener('focusin', function(e) {
      var cs = grid.querySelectorAll('a.c'), at = Array.prototype.indexOf.call(cs, e.target);
      if (at >= 0 && at >= cs.length - 8) more();
      rowPictures(d, 'a.c');
    });
    var first = d.querySelector('a.c'); if (first) first.focus();
    rowPictures(d, 'a.c');
    window.addEventListener('keydown', function(e) {
      if (e.defaultPrevented || document.documentElement.classList.contains('tv-sm-open') || document.getElementById('tv-fp-pop')) return;   // the menu and the video options pop-up handle their own keys
      if (FB.owns(document.activeElement)) return;   // 2.131.0: the filter bar moves its own focus
      var c = e.keyCode, step = { 37: -1, 39: 1, 38: -4, 40: 4 }[c], all = Array.prototype.slice.call(d.querySelectorAll('a.c')), i = all.indexOf(document.activeElement);
      if (c === 13 || c === 23) { if (i >= 0) { e.preventDefault(); e.stopImmediatePropagation(); location.href = all[i].href; } return; }
      if (!step) return;
      if (c === 38 && i >= 0 && i < 4) { e.preventDefault(); e.stopImmediatePropagation(); FB.focus(); d.scrollTop = 0; return; }   // the top row's Up: the filter bar
      if (c === 37 && (i % 4 === 0 || !all.length)) { e.preventDefault(); e.stopImmediatePropagation(); if (window.__tvOpenMenu) window.__tvOpenMenu(); return; }   // Left at the edge opens the menu, as elsewhere
      e.preventDefault(); e.stopImmediatePropagation();
      var n = all[i + step] || (c === 40 ? all[all.length - 1] : null);
      if (i < 0) n = all[0];
      if (n && n !== all[i]) { n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest' }); }
    }, true);
  }

  // ---- The StarScope page (2.63.0, private builds): /mypage?tvscope=recent | top | all. Drawn by the app from the
  // index's own list (the same one list the cards use), so the filters only ever offer what has been logged.
  var MIN_RATINGS = 1;   // one TV for now; raise to 3 when StarScope goes public, so one rating can't top the list
  var HT = ja ? { tag: '世界中のスターを地図に', recent: '新着', top: '高評価', all: 'すべての試合', matches: '試合', wrestlers: '選手', all0: 'すべて', singles: 'シングル', tagm: 'タッグ', multi: '3チーム以上', seg: 'セグメント', title: 'タイトルマッチ', tour: 'トーナメント', more: '詳細', w: '選手', g: 'チーム・ユニット', y: '年', c: 'トーナメント', ti: 'タイトル', r: '評価', sort: '並び順', any: 'すべて', sDate: '新しい順', sOld: '古い順', sAdded: '追加順', sTop: '高評価順', none: '該当する試合はありません', noneTop: 'まだ評価された試合はありません', newest: '新しい順', close: '閉じる', shows: '大会', showsN: '大会', latest: '全試合登録済み · 最新', alsoOn: 'ほかの試合', main: 'メインイベント', notMain: 'メインイベント未登録', noSize: '試合数未登録', logged: '試合登録済み', moreN: 'ほか', opener: '第1試合', sy: '年', sv: '会場', sc: '全試合登録済みのみ', ss: '並び順', sMost: '登録数順', noShows: '該当する大会はありません', match: '第', of: '／全', unnum: '番号なし', noNums: '試合番号未登録', next: '次に登録', wNot: '試合視聴済み・未登録', watched: '試合視聴', plays: '回再生', lastW: '最終視聴', notYet: '未登録', nextIntro: '見たけれど登録が終わっていない大会です。登録を始めた大会が先、次に多く見た順。', kLogged: '登録済み', kWatched: '視聴済み', kNot: '未視聴', loadingN: '読み込み中…', noneNext: '見た大会はすべて登録済みです。',
    log: '大会を登録', lNext: '視聴済み・未登録', lStarted: '登録途中', ly: '年', lIntro: 'サムネイルと出場選手から大会のカードを登録します。試合は再生しません。', lMore: '次のページの大会を読み込み中…', lEnd: 'この年の大会はこれですべてです。', lNone: '該当する大会はありません', lErr: '読み込めませんでした', lTry: 'もう一度', lSite: 'サイトの大会', lNew: 'サイトの新着・未登録' }
    : { tag: 'Map all the Stars in the World', recent: 'Recently added', top: 'Top rated', all: 'All matches', matches: 'matches', wrestlers: 'wrestlers', all0: 'All', singles: 'Singles', tagm: 'Tag', multi: 'Multi-team', seg: 'Segments', title: 'Title matches', tour: 'Tournaments', more: 'More', w: 'Wrestler', g: 'Team or faction', y: 'Year', c: 'Tournament', ti: 'Title', r: 'Rating', sort: 'Sort', any: 'Any', sDate: 'Newest', sOld: 'Oldest', sAdded: 'Recently added', sTop: 'Top rated', none: 'No matches fit these filters.', noneTop: 'No rated matches yet.', newest: 'newest first', close: 'Close', shows: 'Shows', showsN: 'shows', latest: 'Fully logged · Latest', alsoOn: 'Also on the card', main: 'Main event', notMain: 'main event not logged', noSize: 'card size not logged', logged: 'logged', moreN: 'more', opener: 'Opener', sy: 'Year', sv: 'Venue', sc: 'Complete only', ss: 'Sort', sMost: 'Most logged', noShows: 'No shows fit these filters.', match: 'Match ', of: ' of ', unnum: 'unnumbered', noNums: 'no match numbers yet', next: 'Log next', wNot: 'watched, not logged', watched: 'watched', plays: 'plays', lastW: 'last watched', notYet: 'not logged yet', nextIntro: "Shows you've watched but not finished logging. Shows you've started come first, then the most watched.", kLogged: 'Logged', kWatched: 'Watched', kNot: 'Not seen', loadingN: 'Loading…', noneNext: "Every show you've watched is logged.",
    log: 'Log a show', lNext: 'Watched, not logged', lStarted: 'Started', ly: 'Year', lIntro: "Log a show's card from its thumbnails and line-ups, without playing anything.", lMore: 'Loading the next page of shows…', lEnd: "That's every show for this year.", lNone: 'No shows to log here.', lErr: "Couldn't load this page.", lTry: 'Try again', lSite: 'From the site', lNew: 'New on the site' };
  var home = null;   // { tab, f: filters, more, pop, focus }
  function homeList() { return Object.keys(map || {}).map(function(id) { return { id: id, v: map[id] }; }).filter(function(x) { return x.v && x.v.x; }); }
  function people(v) { var o = []; (v.s || []).forEach(function(sd) { sd.forEach(function(n) { if (o.indexOf(n) < 0) o.push(n); }); }); return o; }
  function sorter(k) {
    if (k === 'old') return function(a, b) { return String(a.v.d).localeCompare(String(b.v.d)); };
    if (k === 'added') return function(a, b) { return String(b.v.x.u).localeCompare(String(a.v.x.u)); };
    if (k === 'top') return function(a, b) { return (b.v.x.r - a.v.x.r) || (b.v.x.rc - a.v.x.rc) || String(b.v.d).localeCompare(String(a.v.d)); };
    return function(a, b) { return String(b.v.d).localeCompare(String(a.v.d)); };
  }
  function passes(x, f, skip) {
    var v = x.v, X = v.x;
    if (skip !== 'k' && f.k && !(f.k === 'title' ? X.ti.length : f.k === 'tour' ? X.c : X.k === f.k)) return false;
    if (skip !== 'w' && f.w && people(v).indexOf(f.w) < 0) return false;
    if (skip !== 'g' && f.g && X.g.indexOf(f.g) < 0) return false;
    if (skip !== 'y' && f.y && String(v.d).slice(0, 4) !== f.y) return false;
    if (skip !== 'c' && f.c && X.c !== f.c) return false;
    if (skip !== 'ti' && f.ti && X.ti.indexOf(f.ti) < 0) return false;
    if (skip !== 'r' && f.r && !(X.rc >= MIN_RATINGS && X.r >= f.r)) return false;
    return true;
  }
  // Each filter offers only values found in the matches the other filters leave, with how many there are.
  function options(key, list, f) {
    var count = {};
    list.filter(function(x) { return passes(x, f, key); }).forEach(function(x) {
      var v = x.v, X = v.x, vals = key === 'w' ? people(v) : key === 'g' ? X.g : key === 'y' ? [String(v.d).slice(0, 4)] : key === 'c' ? [X.c] : key === 'ti' ? X.ti : key === 'r' ? (X.rc >= MIN_RATINGS ? [4, 3, 2].filter(function(n) { return X.r >= n; }) : []) : [];
      vals.forEach(function(val) { if (val !== '' && val != null) count[val] = (count[val] || 0) + 1; });
    });
    var keys = Object.keys(count);
    keys.sort(key === 'y' || key === 'r' ? function(a, b) { return b.localeCompare(a); } : function(a, b) { return a.localeCompare(b, 'en', { sensitivity: 'base' }); });
    return keys.map(function(k) { return { v: key === 'r' ? +k : k, n: count[k] }; });
  }
  function hcard(x, badge) {
    var th = esc(x.v.th || ''), X = x.v.x;
    return '<a class="hc" data-f="1" data-k="v' + esc(x.id) + '" href="/contents/' + esc(x.id) + '"><div class="im' + enCls(x.v) + '"' + (th ? ' data-bg="' + th + '"' : '') + '>' + enBox(x.v) + '</div>' +
      (badge && X.rc ? '<span class="bd">★ ' + X.r.toFixed(1) + ' · ' + X.rc + '</span>' : '') + '<div class="tvsc-host">' + block(x.v) + '</div></a>';
  }
  function chipH(k, label, on, extra) { return '<button type="button" class="ch' + (on ? ' on' : '') + '" data-f="1" data-k="' + k + '"' + (extra || '') + '>' + label + '</button>'; }
  function homeHtml() {
    var list = homeList(), f = home.f, t = home.tab, ppl = {};
    if (SHMODE && t === 'shows') {   // 2.129.0: the global nav's Shows page: its own title, no StarScope header or tabs
      var stl = f.sb || (f.sy ? (ja ? f.sy + '年の大会' : 'Shows of ' + f.sy) : f.sa ? (ja ? 'すべての大会' : 'All shows') : (ja ? '大会' : 'Shows'));
      return '<div class="hd"><span class="bar"></span><span class="wm">' + esc(stl) + '</span></div>' + showsHtml() + (home.pop ? popHtml(list) : '');
    }
    list.forEach(function(x) { people(x.v).forEach(function(n) { ppl[n] = 1; }); });
    var h = '<div class="hd"><span class="bar"></span>' + TEL.replace('width="30" height="30"', 'width="40" height="40"') + '<span class="wm">STAR<b>SCOPE</b></span><span class="tg">' + HT.tag + '</span><span class="ct">' + (t === 'shows' || t === 'next' || t === 'log' ? '' : list.length + ' ' + HT.matches + ' · ' + Object.keys(ppl).length + ' ' + HT.wrestlers) + '</span></div>';
    h += '<div class="row">' + chipH('Trecent', HT.recent, t === 'recent', ' style="border-radius:22px"') + chipH('Ttop', HT.top, t === 'top', ' style="border-radius:22px"') + chipH('Tall', HT.all, t === 'all', ' style="border-radius:22px"') + chipH('Tshows', HT.shows, t === 'shows', ' style="border-radius:22px"') + (SHEET ? chipH('Tnext', nextLabel(), t === 'next', ' style="border-radius:22px"') : '') + (logOn() ? chipH('Tlog', HT.log, t === 'log', ' style="border-radius:22px"') : '') + '</div>';
    if (t === 'shows') return h + showsHtml() + (home.pop ? popHtml(list) : '');
    if (t === 'next') return h + nextHtml();
    if (t === 'log') return h + logHtml() + (home.pop ? popHtml(list) : '');
    var shown;
    if (t === 'all') {
      var prim = [['', HT.all0], ['singles', HT.singles], ['tag', HT.tagm], ['multi', HT.multi], ['title', HT.title], ['tour', HT.tour], ['segment', HT.seg]].filter(function(p) {
        return !p[0] || list.some(function(x) { return passes(x, { k: p[0] }, ''); });
      });
      h += '<div class="row">' + prim.map(function(p) { return chipH('k:' + p[0], p[1], f.k === p[0]); }).join('') + chipH('more', HT.more + (home.more ? ' ▴' : ' ▾'), false, ' style="margin-left:14px"') + '</div>';
      if (home.more) {
        h += '<div class="row sec">';
        ['w', 'g', 'y', 'c', 'ti', 'r'].forEach(function(key) {
          if (!options(key, list, f).length && !f[key]) return;   // nothing logged for it yet: not offered
          var val = f[key] ? (key === 'r' ? '★' + f[key] + '+' : f[key]) : '';
          h += chipH('d:' + key, HT[key] + (val ? ': ' + esc(val) : '') + ' ▾', !!f[key]);
        });
        h += chipH('d:sort', HT.sort + ': ' + ({ date: HT.sDate, old: HT.sOld, added: HT.sAdded, top: HT.sTop })[f.sort || 'date'] + ' ▾', false, ' style="margin-left:auto"') + '</div>';
      }
      shown = list.filter(function(x) { return passes(x, f, ''); }).sort(sorter(f.sort || 'date'));
      var desc = [f.w, f.g, f.c, f.ti, f.y].filter(Boolean).join(' · ');
      h += '<div class="rs">' + esc((desc ? desc + ' · ' : '') + shown.length + ' ' + HT.matches) + '</div>';
    } else if (t === 'top') shown = list.filter(function(x) { return x.v.x.rc >= MIN_RATINGS; }).sort(sorter('top'));
    else shown = list.sort(sorter('added'));
    h += '<div class="gr">' + shown.slice(0, 160).map(function(x) { return hcard(x, t === 'top' || (t === 'all' && f.sort === 'top')); }).join('') + '</div>';
    if (!shown.length) h += '<div class="rs">' + (t === 'top' ? HT.noneTop : HT.none) + '</div>';
    if (home.pop) h += popHtml(list);
    return h;
  }
  // ---- Shows (2.66.0): every show with a logged match, as a poster card. The main event's picture, the date as a
  // stamp, the venue, the main event, up to three highlights (titles, finals and semis, special rules, tournament
  // matches, the opener) and the card as numbered squares. Built from the same one list; nothing more is fetched.
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function num(x) { if (x === '' || x == null) return null; var n = Number(x); return isFinite(n) ? n : null; }
  // The sheet keeps one name per show, often with a Japanese subtitle: in English the Japanese parts are left out.
  // English names from the schedule or the word list (assets/shownames.js, 2.78.2); the short schedule name on cards.
  function showName(n, date) {
    n = String(n || '');
    if (ja) return n;
    if (window.__tvShowName) return window.__tvShowName.en(n, date, true);
    return n.replace(/[〜～~][^〜～~]*[぀-ヿ㐀-鿿ｦ-ﾟ][^〜～~]*[〜～~]/g, ' ')
      .replace(/[　-〿぀-ヿ㐀-鿿＀-￯]+/g, ' ').replace(/\s+/g, ' ').replace(/[\s·\-–:]+$/, '').trim();
  }
  function oneLine(v) {
    var sides = (ja && v.sj && v.sj.length === v.s.length ? v.sj : v.s) || [], tn = ja ? (v.tnj || v.tn) : v.tn;
    var each = sides.map(function(s, i) { return tn && tn[i] ? tn[i] : (sides.length > 2 && s.length > 1 ? s[0] + ' +' + (s.length - 1) : names(s)); });
    if (each.length > 4) return each.slice(0, 3).join(' vs ') + ' +' + (each.length - 3);
    return each.join(' vs ');
  }
  function eventLine(v) { return [(ja ? v.ej : v.e)].concat((ja ? v.fj : v.f) || []).filter(Boolean).join(' · '); }
  function showsList() {
    var by = {};
    homeList().forEach(function(x) {
      // 2.105.0: a video from another set than its match's show (English commentary linked to the Japanese match) is
      // listed under its own set's show, so each set stays its own show here while the match is kept once.
      var sid = String(x.v.ss && x.v.vs ? x.v.vs : (x.v.sid || ''));
      if (!sid) return;
      if (/^(collection|extra)$/.test(String(x.v.sr || ''))) return;   // 2.125.0: Kairi Collection, interviews: not shows
      var g = by[sid] = by[sid] || { sid: sid, seen: {}, list: [] }, mid = x.v.x.m || x.id;
      // One entry per match (a match can have several videos, e.g. English commentary): keep one with a picture.
      if (g.seen[mid]) { if (!g.seen[mid].v.th && x.v.th) { g.list[g.list.indexOf(g.seen[mid])] = x; g.seen[mid] = x; } return; }
      g.seen[mid] = x; g.list.push(x);
    });
    return Object.keys(by).map(function(sid) {
      var g = by[sid], L = g.list, v0 = L[0].v, dates = {}, total = null, nums = {};
      L.forEach(function(x) {
        dates[x.v.d] = (dates[x.v.d] || 0) + 1;
        var t = num(x.v.t); if (t != null && (total == null || t > total)) total = t;
        var n = num(x.v.n); if (n != null && n > 0 && !x.v.x.dk) nums[n] = x;
      });
      // The show's date: the one most of its matches have (the shows tab can disagree with its own matches).
      var date = Object.keys(dates).sort(function(a, b) { return dates[b] - dates[a]; })[0] || '';
      var ns = Object.keys(nums).map(Number).sort(function(a, b) { return a - b; });
      if (total != null && ns.length && ns[ns.length - 1] > total) total = ns[ns.length - 1];   // a match numbered past the card size: the card is at least that big
      var top = ns.length ? nums[ns[ns.length - 1]] : (L.filter(function(x) { return x.v.x.ti.length; })[0] || L[0]);
      var mainN = num(top.v.n), isMain = total != null && mainN === total;
      var counted = ns.filter(function(n) { return total == null || n <= total; }).length;
      var others = L.filter(function(x) { return x !== top; }).map(function(x) {
        var X = x.v.x, n = num(x.v.n), sc = 9, icon = '';
        if (X.ti.length) { sc = 1; icon = 'belt'; }
        else if ((X.rd || []).some(function(r) { return /^(final|semifinal)$/.test(r); })) { sc = 2; icon = 'trophy'; }
        else if ((X.st || []).length) { sc = 3; icon = 'star'; }
        else if (X.c) { sc = 4; icon = 'trophy'; }
        else if (n === 1) { sc = 5; icon = 'arrow'; }
        return { x: x, sc: sc, icon: icon, n: n == null ? 99 : n };
      }).sort(function(a, b) { return (a.sc - b.sc) || (a.n - b.n); });
      var hl = others.filter(function(o) { return o.sc < 9; }).slice(0, 3);
      var first = ns.length ? nums[ns[0]] : top;
      var S0 = v0.ss || v0, shName = v0.ss ? v0.ss.n : v0.sh;
      return { sid: sid, name: showName(shName, date) || shName || '', date: date, venue: (ja ? (S0.vnj || S0.vn) : S0.vn) || '', total: total,
        list: L, nums: nums, top: top, mainN: mainN, isMain: isMain, counted: counted, complete: total != null && counted >= total,
        hl: hl, more: Math.max(0, L.length - 1 - hl.length), first: first,
        hasDark: L.some(function(x) { return x.v.x.dk || num(x.v.n) === 0; }) };
    });
  }
  var ICON = {
    belt: '<path d="M2 9h20v6H2z"/><rect x="8" y="6.5" width="8" height="11" rx="2"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pin: '<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>'
  };
  function ico(k, size, col) { return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + (col || '#F4C242') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }
  function stamp(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    if (!m) return '';
    return '<div class="st"><div class="m">' + (ja ? (+m[2]) + '月' : MON[+m[2] - 1].toUpperCase()) + '</div><div class="d">' + (+m[3]) + '</div><div class="y">' + m[1] + '</div></div>';
  }
  function countText(s) { return s.total != null ? s.counted + '/' + s.total : s.list.length + ' ' + HT.logged; }
  function matchNo(n) { return ja ? HT.match + n + '試合' : HT.match + n; }
  function mainLabel(s) {
    var n = s.mainN;
    if (s.isMain) return HT.main + ' · ' + matchNo(n);
    if (n != null && s.total != null) return (ja ? HT.match + n + '試合' + HT.of + s.total + '試合' : HT.match + n + HT.of + s.total) + ' · ' + HT.notMain;
    if (n != null) return matchNo(n) + ' · ' + HT.noSize;
    return HT.logged;
  }
  // The card's squares, on every show card (2.66.1). Card size known: one square per match, the last one the main
  // event. Not known: squares up to the highest logged match and a "?" for the rest. No match numbers at all: a line
  // saying so, in the same place, so every card ends the same way.
  function pips(s, wt) {
    wt = wt || {};
    var h = '', unn = s.list.filter(function(x) { return num(x.v.n) == null; }).length;
    var ns = Object.keys(s.nums).map(Number), top = ns.length ? Math.max.apply(null, ns) : 0;
    var tail = s.more ? '+' + s.more + ' ' + HT.moreN : (unn && ns.length ? '+' + unn + ' ' + HT.unnum : '');
    if (s.total == null && !ns.length) return '<div class="pips"><span class="nn">' + esc(s.list.length + ' ' + HT.logged + ' · ' + HT.noNums) + '</span>' + (s.more ? '<span class="mo">+' + s.more + ' ' + HT.moreN + '</span>' : '') + '</div>';
    var wn = Object.keys(wt).map(Number), wtop = wn.length ? Math.max.apply(null, wn) : 0;
    var from = s.hasDark ? 0 : 1, to = Math.min(s.total != null ? s.total : Math.max(top, wtop), 14);
    for (var i = from; i <= to; i++) {
      var on = i === 0 ? s.hasDark : !!s.nums[i], cls = i === s.mainN && s.isMain ? 'main' : (on ? 'on' : (wt[i] ? 'wt' : (s.total != null && i === s.total ? 'mainoff' : 'off')));
      h += '<span class="pip ' + cls + '">' + (i === 0 ? 'D' : i) + '</span>';
    }
    if (s.total == null) h += '<span class="pip off">?</span>';
    return '<div class="pips">' + h + (tail ? '<span class="mo">' + esc(tail) + '</span>' : '') + '</div>';
  }
  function hlRow(o) {
    var v = o.x.v, k = o.sc === 5 ? HT.opener + ' · ' + (ja ? v.ej : v.e) : eventLine(v);
    return '<div class="hl">' + ico(o.icon, 16) + '<div><div class="k">' + esc(k) + '</div><div class="n">' + esc(oneLine(v)) + '</div></div></div>';
  }
  var TEL18 = TEL.replace('width="30" height="30"', 'width="18" height="18"');
  // OK on a show opens its first logged match, so the show plays in card order from there.
  // One show card (Shows and Log next): picture with the date stamp and count, name and venue, main event, the rest.
  function cardHtml(o) {
    var th = esc(o.th || ''), id = String(o.href).replace(/^.*\//, '');
    return '<a class="sc" data-f="1" data-k="v' + esc(id) + '"' + (o.auto ? ' data-auto="1"' : '') + ' href="' + o.href + '"><div class="im"' + (th ? ' data-bg="' + th + '"' : '') + '>' + stamp(o.date) + (o.en ? enBox({ lg: 'en' }) : '') +
      '<span class="cn' + (o.complete ? '' : ' part') + '">' + TEL18 + esc(o.count) + '</span></div>' +
      '<div class="bd"><div><div class="nm">' + esc(o.name) + '</div>' + (o.venue ? '<div class="vn">' + ico('pin', 14, '#C9D2DC') + esc(o.venue) + '</div>' : '') + '</div>' +
      o.main + o.rest + '</div></a>';
  }
  // 2.122.0: a show is English when every logged video in it is the English version (an English-commentary set).
  function showEn(s) { return !!(s && s.list && s.list.length && s.list.every(function(x) { return isEn(x.v); })); }
  function showCard(s, href) {
    var v = s.top.v;
    return cardHtml({ href: href || '/contents/' + esc(s.first.id), th: s.top.v.th, date: s.date, en: showEn(s), count: countText(s), complete: s.complete, name: s.name, venue: s.venue,
      main: '<div class="me"><div class="eb' + (s.isMain ? '' : ' dim') + '">' + esc(mainLabel(s)) + '</div><div class="t">' + esc(oneLine(v)) + '</div><div class="s">' + esc(eventLine(v)) + '</div></div>',
      rest: (s.hl.length ? '<div class="lb">' + HT.alsoOn + '</div>' + s.hl.map(hlRow).join('') : '') + pips(s) });
  }
  // The latest fully logged show, wide: its picture on the left, the whole running order on the right.
  function featured(s) {
    var th = esc(s.top.v.th || ''), rows = '';
    var ns = Object.keys(s.nums).map(Number).sort(function(a, b) { return a - b; });
    ns.slice(-11).forEach(function(n) {
      var v = s.nums[n].v, main = n === s.mainN && s.isMain;
      rows += '<div class="ro' + (main ? ' mn' : '') + '"><span class="no">' + n + '</span><span class="ev">' + esc(main ? HT.main : eventLine(v)) + '</span><span class="rn">' + esc(oneLine(v)) + '</span></div>';
    });
    return '<div class="fe"><div class="lb fl">' + HT.latest + '</div><a class="fc" data-f="1" data-k="v' + esc(s.first.id) + '" href="/contents/' + esc(s.first.id) + '"><div class="im"' + (th ? ' data-bg="' + th + '"' : '') + '>' + stamp(s.date) + (showEn(s) ? enBox({ lg: 'en' }) : '') +
      '<span class="cn">' + TEL18 + esc(countText(s)) + '</span></div><div class="bd"><div class="nm">' + esc(s.name) + '</div>' +
      (s.venue ? '<div class="vn">' + ico('pin', 14, '#C9D2DC') + esc(s.venue) + '</div>' : '') + '<div class="rl">' + rows + '</div></div></a></div>';
  }
  // ---- Shows from the global nav (2.129.0, your build): /mypage?tvscope=shows&sh=1 is the Shows page without the
  // StarScope header and tabs. With no filter it is a landing page: the latest shows, then a row per brand (the brands
  // are the Shows list in event_filters.json, matched on the show's name). &sb=<brand> lists one brand, &sy=<year> a year.
  var SHMODE = !!(Q && Q.get('sh') === '1');
  var BRANDS = null, BRAND_JA = { 'Cinderella': 'シンデレラ', 'Golden Week': 'ゴールデンウ', 'Climax': 'イヤーエンド', 'Triangle': 'トライアングル', 'NEW YEAR DREAM': 'ニューイヤードリーム' };
  function bnorm(t) { return String(t || '').normalize('NFKC').toUpperCase().replace(/[\s\-‐・_☆★]+/g, ''); }
  function brands() {
    if (BRANDS) return BRANDS;
    BRANDS = [];
    try { ((JSON.parse(H.eventFiltersJson()) || {}).shows || []).forEach(function(x) { var k = [bnorm(x.search || x.name)]; if (BRAND_JA[x.search]) k.push(bnorm(BRAND_JA[x.search])); BRANDS.push({ name: x.name, keys: k }); }); } catch (e) {}
    return BRANDS;
  }
  function brandOf(s) {
    var v0 = s.list[0].v, txt = bnorm([s.name, v0.sh, v0.she, v0.ss ? v0.ss.n : ''].join(' '));
    var b = brands().filter(function(x) { return x.keys.some(function(k) { return k && txt.indexOf(k) >= 0; }); })[0];
    return b ? b.name : '';
  }
  function landingHtml(all) {
    var byDate = all.slice().sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
    function sec(title, count, href, list) {
      return '<div class="sbh"><span class="bar"></span><span class="sbt">' + esc(title) + '</span><span class="ct">' + count + ' ' + HT.showsN + '</span>' +
        (href ? '<a class="ch sba" tabindex="0" data-f="1" data-k="vb" href="' + esc(href) + '">' + esc(ja ? 'すべて' : 'All') + ' ▸</a>' : '') + '</div><div class="sgr">' + list.map(function(s) { return showCard(s); }).join('') + '</div>';
    }
    // 2.131.0: one row of the latest shows, with All ▸ to every show (the year filter is there)
    var h = sec(ja ? '最新の大会' : 'Latest shows', all.length, '/mypage?tvscope=shows&sh=1&all=1', byDate.slice(0, 3));
    var groups = {};
    byDate.forEach(function(s) { var b = brandOf(s); if (b) (groups[b] = groups[b] || []).push(s); });
    Object.keys(groups).sort(function(a, b) { return String(groups[b][0].date).localeCompare(String(groups[a][0].date)); }).forEach(function(b) {
      h += sec(b, groups[b].length, '/mypage?tvscope=shows&sh=1&sb=' + encodeURIComponent(b), groups[b].slice(0, 3));
    });
    return h;
  }
  function showsHtml() {
    var f = home.f, all = showsList();
    if (SHMODE && !f.sa && !f.sy && !f.sv && !f.sb && !f.sc && (f.ss || 'date') === 'date') return landingHtml(all);
    var shown = all.filter(function(s) {
      if (f.sb && brandOf(s) !== f.sb) return false;
      if (f.sy && String(s.date).slice(0, 4) !== f.sy) return false;
      if (f.sv && s.venue !== f.sv) return false;
      if (f.sc && !s.complete) return false;
      return true;
    });
    var ss = f.ss || 'date';
    shown.sort(ss === 'old' ? function(a, b) { return String(a.date).localeCompare(String(b.date)); }
      : ss === 'most' ? function(a, b) { return (b.list.length - a.list.length) || String(b.date).localeCompare(String(a.date)); }
      : function(a, b) { return String(b.date).localeCompare(String(a.date)); });
    var h = '<div class="row">' + chipH('d:sy', HT.sy + (f.sy ? ': ' + esc(f.sy) : '') + ' ▾', !!f.sy) + chipH('d:sv', HT.sv + (f.sv ? ': ' + esc(f.sv) : '') + ' ▾', !!f.sv) +
      chipH('tog:sc', HT.sc, !!f.sc) + '<span class="ct" style="margin-left:auto">' + shown.length + ' ' + HT.showsN + ' · ' + shown.reduce(function(a, s) { return a + s.list.length; }, 0) + ' ' + HT.matches + '</span>' +
      chipH('d:ss', HT.ss + ': ' + ({ date: HT.sDate, old: HT.sOld, most: HT.sMost })[ss] + ' ▾', false, ' style="margin-left:12px"') + '</div>';
    if (!shown.length) return h + '<div class="rs">' + HT.noShows + '</div>';
    // Newest first: the latest fully logged show leads, wide, with its whole running order.
    var feat = ss === 'date' ? shown.filter(function(s) { return s.complete; })[0] : null;
    if (feat) h += featured(feat);
    h += '<div class="sgr">' + shown.filter(function(s) { return s !== feat; }).map(function(s) { return showCard(s); }).join('')   /* 2.107.2: map's index was taken as the link */ + '</div>';
    return h;
  }
  // ---- Log next (2.67.0): shows you've watched but not finished logging, from the sheet's video log (vi_suggest).
  // The same show cards as the Shows tab: what's logged is filled in, the rest is left as empty bars, and watched
  // matches get a dashed gold square. One read of the sheet, kept for 10 minutes; nothing from the video site.
  var SKEY = 'tvVixSuggestV1', SAGE = 600000, sug = null, sugAsked = false;
  try { var sc0 = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (sc0 && sc0.sets) sug = sc0; } catch (e) {}
  function askSuggest() {
    if (sugAsked) return;
    sugAsked = true;
    if (sug && Date.now() - (sug.t || 0) < SAGE) return;
    if (!SHEET) return;   // Log next comes from your own watch history: sheet builds only
    try { H.starCards('s1', JSON.stringify({ action: 'vi_suggest' })); } catch (e) {}
  }
  function gotSuggest(r) {
    sug = { t: Date.now(), sets: r.sets || [] };
    try { localStorage.setItem(SKEY, JSON.stringify(sug)); } catch (e) {}
    if (!homeEl || !home) return;
    if (home.tab === 'next') { var ae = document.activeElement, k = ae && ae.getAttribute && ae.getAttribute('data-k'); homeRender(k || 'Tnext'); }
    else { var c = homeEl.querySelector('[data-k="Tnext"]'); if (c) c.textContent = nextLabel(); }
  }
  function shortDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return ja ? (d.getMonth() + 1) + '月' + d.getDate() + '日' : MON[d.getMonth()] + ' ' + d.getDate();
  }
  function nextList() {
    if (!sug) return [];
    var shows = {};
    showsList().forEach(function(s) { shows[s.sid] = s; });
    var out = [];
    (sug.sets || []).forEach(function(g) {
      var s = shows[String(g.set)] || null;
      if (s && s.complete) return;
      var vids = (g.videos || []).filter(function(v) { return !v.comment; }), counted = vids.filter(function(v) { return !v.zero; });
      if (!counted.length) return;
      var views = counted.reduce(function(a, v) { return a + (v.views || 1); }, 0);
      var last = counted.reduce(function(a, v) { return String(v.last) > a ? String(v.last) : a; }, '');
      var first = counted.slice().sort(function(a, b) { return ((a.no == null ? 999 : a.no) - (b.no == null ? 999 : b.no)) || (Number(a.id) - Number(b.id)); })[0];
      out.push({ g: g, s: s, vids: vids, w: counted.length, views: views, last: last, first: first });
    });
    return out.sort(function(a, b) { return ((b.s ? 1 : 0) - (a.s ? 1 : 0)) || (b.w - a.w) || (b.views - a.views) || b.last.localeCompare(a.last); });
  }
  function nextLabel() { var n = nextList().length; return HT.next + (n ? ' · ' + n : ''); }
  function phRow() {
    return '<div class="hl">' + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B4656" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>' +
      '<div class="phs"><span class="ph" style="width:55%"></span><span class="ph" style="width:80%"></span></div></div>';
  }
  function nextCard(e, href0) {
    var s = e.s, g = e.g, wt = {}, hasZero = false;
    e.vids.forEach(function(v) { if (v.zero) hasZero = true; else if (v.no != null && v.no > 0) wt[v.no] = true; });
    var seen = '<div class="seen">' + ico('eye', 16) + '<span><b>' + esc(s ? e.w + ' ' + HT.wNot : e.w + ' ' + HT.watched + ' · ' + e.views + ' ' + HT.plays) + '</b> · ' + esc(HT.lastW + ' ' + shortDate(e.last)) + '</span></div>';
    var href = href0 || '/contents/' + esc(e.first.id), card, auto = !href0;
    if (s) {
      var free = Math.min(3 - s.hl.length, e.w);
      var hl = (s.hl.length || free > 0 ? '<div class="lb">' + HT.alsoOn + '</div>' : '') + s.hl.map(hlRow).join('');
      for (var i = 0; i < free; i++) hl += phRow();
      card = cardHtml({ href: href, auto: auto, th: s.top.v.th, date: s.date, count: countText(s), complete: false, name: s.name, venue: s.venue,
        main: '<div class="me"><div class="eb' + (s.isMain ? '' : ' dim') + '">' + esc(mainLabel(s)) + '</div><div class="t">' + esc(oneLine(s.top.v)) + '</div><div class="s">' + esc(eventLine(s.top.v)) + '</div></div>',
        rest: hl + pips(s, wt) });
    } else {
      var nos = Object.keys(wt).map(Number), top = nos.length ? Math.max.apply(null, nos) : 0, sq = '';
      if (top) {
        if (hasZero) sq += '<span class="pip wt">D</span>';
        for (var n = 1; n <= Math.min(top, 14); n++) sq += '<span class="pip ' + (wt[n] ? 'wt' : 'off') + '">' + n + '</span>';
        sq = '<div class="pips">' + sq + '</div>';
      } else sq = '<div class="pips"><span class="nn">' + esc(e.w + ' ' + HT.watched + ' · ' + HT.noNums) + '</span></div>';
      card = cardHtml({ href: href, auto: auto, th: e.first.th, date: g.date, count: top ? '0/' + top : '0 ' + HT.logged, complete: false,
        name: showName(g.show, g.date) || g.show, venue: g.venue ? (ja ? g.venue.ja || g.venue.en : g.venue.en) : '',
        main: '<div class="me"><div class="eb dim">' + esc(HT.main + ' · ' + HT.notYet) + '</div><div class="phs" style="margin-top:7px"><span class="ph" style="width:85%;height:13px"></span><span class="ph" style="width:50%"></span></div></div>',
        rest: '<div class="lb">' + HT.alsoOn + '</div>' + phRow() + phRow() + phRow() + sq });
    }
    return '<div class="col">' + seen + card + '</div>';
  }
  function nextHtml() {
    var list = nextList();
    var h = '<div class="row nx"><span class="intro">' + HT.nextIntro + '</span><span class="key"><span><i class="k1"></i>' + HT.kLogged + '</span><span><i class="k2"></i>' + HT.kWatched + '</span><span><i class="k3"></i>' + HT.kNot + '</span></span></div>';
    if (!sug) return h + '<div class="rs">' + HT.loadingN + '</div>';
    if (!list.length) return h + '<div class="rs">' + HT.noneNext + '</div>';
    return h + '<div class="sgr">' + list.map(nextCard).join('') + '</div>';
  }

  // ---- Log a show (2.83.0, builds with StarScope logging): shows to log with card check (assets/cardcheck.js).
  // Watched, not logged: Log next's list (your watch history, nothing from the site). Started: shows with some
  // matches logged. Year: the site's own list of that year's shows, read a page at a time, the next page only when
  // the last row has focus; each page is kept for a day. Only the show list is read here, never a match page.
  function logOn() { return SHEET && !!window.__tvIndexKit; }
  // from: where card check was opened, so its Next show follows the same list (2.85.0): next (watched, not logged),
  // started, or y<year>.
  function checkHref(set, from) { return '/mypage?tvscope=check&set=' + encodeURIComponent(set) + '&from=' + encodeURIComponent(from || 'next'); }
  var YCAT = null;
  function yearCats() {
    if (YCAT) return YCAT;
    try { YCAT = ((JSON.parse(H.matchTypesJson()) || {}).siteCategories || {}).years || {}; } catch (e) { YCAT = {}; }
    return YCAT;
  }
  var YKEY = 'tvCcYearV1_', YAGE = 86400000, yl = null;
  function yearLoad(y, retry) {
    if (!y) return;
    if (!yl || yl.y !== y) {
      var c = null; try { c = JSON.parse(localStorage.getItem(YKEY + y) || 'null'); } catch (e) {}
      yl = c && Date.now() - (c.t || 0) < YAGE ? { y: y, items: c.items || [], page: c.page || 0, done: !!c.done, t: c.t } : { y: y, items: [], page: 0, done: false, t: Date.now() };
      yl.busy = false; yl.err = '';
    }
    if (retry) yl.err = '';
    if (!yl.page && !yl.busy) yearPage();
  }
  function yearPage() {
    if (!yl || yl.busy || yl.done || yl.err) return;
    var cat = yearCats()[yl.y], n = yl.page + 1, mine = yl;
    if (!cat) { yl.done = true; return; }
    yl.busy = true;
    fetch('/contents/search?q%5Bkeyword%5D=&q%5Bcategory_id%5D=' + encodeURIComponent(cat) + '&q%5Btype%5D=set&activetab=contents&page=' + n, { credentials: 'include' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function(html) {
        if (yl !== mine) return;
        var doc = new DOMParser().parseFromString(html, 'text/html'), seen = {}, got = 0;
        mine.items.forEach(function(x) { seen[x.set] = 1; });
        Array.prototype.forEach.call(doc.querySelectorAll('.content-list-item, article'), function(it) {
          var a = it.querySelector('a[href*="/set/"]'), m = a && /\/set\/(\d+)/.exec(a.getAttribute('href') || '');
          if (!m || seen[m[1]] || /\/contents\//.test(a.getAttribute('href'))) return;
          seen[m[1]] = 1; got++;
          var bg = it.querySelector('[style*="background-image"]'), mm = bg && /url\(['"]?(.*?)['"]?\)/.exec(bg.getAttribute('style') || '');
          var tEl = it.querySelector('h3, h4, .ttl-xs, .content-title'), name = String((tEl || a).textContent || '').replace(/\s+/g, ' ').trim();
          mine.items.push({ set: m[1], name: name, th: mm ? mm[1] : '' });
        });
        mine.page = n;
        if (!got) mine.done = true;
        try { localStorage.setItem(YKEY + mine.y, JSON.stringify({ t: mine.t || Date.now(), items: mine.items, page: mine.page, done: mine.done })); } catch (e) {}
      })
      .catch(function(e) { mine.err = String(e && e.message || e); })
      .then(function() {
        mine.busy = false;
        if (homeEl && home && home.tab === 'log' && home.lf === 'year') { var ae = document.activeElement, k = ae && ae.getAttribute && ae.getAttribute('data-k'); homeRender(k || 'd:ly'); }
      });
  }
  // The next page loads when a card in the last row gets focus.
  function yearMore(e) {
    if (!home || home.tab !== 'log' || home.lf !== 'year' || !yl || yl.busy || yl.done || yl.err) return;
    var cards = Array.prototype.slice.call(homeEl.querySelectorAll('.sgr .sc')), last = cards[cards.length - 1];
    if (!last || cards.indexOf(e.target) < 0) return;
    if (e.target.getBoundingClientRect().top >= last.getBoundingClientRect().top - 4) yearPage();
  }
  // How much of one site show page (set) is logged (2.90.0). A match's show is the set it was first logged from, so the
  // English commentary page and the Japanese one share their matches: counted here by the page's own videos, from the
  // set each video was saved from (vs) and from the page as card check read it (tvCcSet<set>), before the match's show.
  function setState(set) {
    set = String(set);
    var c = null; try { c = JSON.parse(localStorage.getItem('tvCcSet' + set) || 'null'); } catch (e) {}
    var vids = c && c.videos && c.videos.length ? c.videos : null, mine = 0;
    if (vids) vids.forEach(function(v) { if (map && map[v.id]) mine++; });
    else Object.keys(map || {}).forEach(function(k) { if (String(map[k].vs || '') === set) mine++; });
    var s = showsList().filter(function(x) { return x.sid === set; })[0];
    if (vids && (!s || mine >= s.list.length)) return { count: mine + '/' + vids.length, complete: mine >= vids.length, any: mine > 0 };
    if (s) return { count: countText(s), complete: !!s.complete, any: true };
    return { count: mine ? mine + ' ' + HT.logged : '0 ' + HT.logged, complete: false, any: mine > 0 };
  }
  function yearCard(x) {
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+x.set, x.name, yl.y) : { show: x.name, date: '', venue: '' };
    var st = setState(x.set);
    return cardHtml({ href: checkHref(x.set, 'y' + yl.y), th: x.th, date: sl.date || '', count: st.count, complete: st.complete,
      name: showName(sl.show || x.name, sl.date) || x.name, venue: sl.venue || '',
      main: '<div class="me"><div class="eb dim">' + esc(HT.lSite) + '</div><div class="t" style="font-weight:600;color:#C9D2DC">' + esc(x.name) + '</div></div>', rest: '' });
  }
  // New on the site (2.102.0): the shows in the home page's New row (kept on the TV when the home page is drawn, so no
  // extra request) with nothing logged yet, in the row's order. Keeps a complete year complete as shows come in.
  function newSets() {
    var c = lsJ('tvHomeNewAllV1'), out = [], seen = {}, logged = {};
    if (!c || !c.items) return out;
    Object.keys(map || {}).forEach(function(id) { var v = map[id]; if (v && v.vs) logged[String(v.vs)] = 1; });
    c.items.forEach(function(x) {
      var m = /\/set\/(\d+)/.exec(x.href || '');
      if (!m || seen[m[1]] || logged[m[1]]) return;
      seen[m[1]] = 1;
      var d = /(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})/.exec(x.title || '');
      out.push({ set: m[1], name: String(x.title || '').replace(/\s+/g, ' ').trim(), th: x.bg || '', date: d ? d[1] + '-' + ('0' + d[2]).slice(-2) + '-' + ('0' + d[3]).slice(-2) : '' });
    });
    return out;
  }
  function newCard(x) {
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+x.set, x.name, String(x.date).slice(0, 4)) : { show: x.name, date: x.date, venue: '' };
    return cardHtml({ href: checkHref(x.set, 'new'), th: x.th, date: sl.date || x.date || '', count: 0, complete: false,
      name: showName(sl.show || x.name, sl.date || x.date) || x.name, venue: sl.venue || '',
      main: '<div class="me"><div class="eb dim">' + esc(HT.lNew) + '</div><div class="t" style="font-weight:600;color:#C9D2DC">' + esc(x.name) + '</div></div>', rest: '' });
  }
  function logHtml() {
    var ns = newSets();
    if (!home.lf) home.lf = ns.length ? 'new' : 'next';
    var lf = home.lf, nn = nextList().length;
    var h = '<div class="row">' + (ns.length || lf === 'new' ? chipH('lf:new', HT.lNew + (ns.length ? ' · ' + ns.length : ''), lf === 'new') : '') + chipH('lf:next', HT.lNext + (nn ? ' · ' + nn : ''), lf === 'next') + chipH('lf:started', HT.lStarted, lf === 'started') +
      chipH('d:ly', HT.ly + (home.ly ? ': ' + esc(home.ly) : '') + ' ▾', lf === 'year') + '<span class="intro" style="margin-left:auto">' + esc(HT.lIntro) + '</span></div>';
    var cards = [];
    if (lf === 'new') {
      cards = ns.map(newCard);
    } else if (lf === 'next') {
      if (!sug) return h + '<div class="rs">' + HT.loadingN + '</div>';
      cards = nextList().map(function(e) { return nextCard(e, checkHref(e.g.set, 'next')); });
    } else if (lf === 'started') {
      cards = showsList().filter(function(s) { return !s.complete; }).sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); }).map(function(s) { return showCard(s, checkHref(s.sid, 'started')); });
    } else {
      if (!yl || yl.y !== home.ly) yearLoad(home.ly);
      cards = yl ? yl.items.map(yearCard) : [];
      var tail = yl && yl.err ? '<div class="rs" style="color:#FF7A66">' + esc(HT.lErr + ' (' + yl.err + ')') + '</div><div class="row">' + chipH('ltry', HT.lTry, false) + '</div>'
        : (yl && !yl.done ? '<div class="rs">' + esc(HT.lMore) + '</div>' : (cards.length ? '<div class="rs">' + esc(HT.lEnd) + '</div>' : ''));
      if (!cards.length && yl && yl.done) return h + '<div class="rs">' + HT.lNone + '</div>';
      return h + '<div class="sgr">' + cards.join('') + '</div>' + tail;
    }
    if (!cards.length) return h + '<div class="rs">' + HT.lNone + '</div>';
    return h + '<div class="sgr">' + cards.join('') + '</div>';
  }

  function showOptions(key) {
    var count = {};
    showsList().forEach(function(s) { var val = key === 'sy' ? String(s.date).slice(0, 4) : s.venue; if (val) count[val] = (count[val] || 0) + 1; });
    var keys = Object.keys(count);
    keys.sort(key === 'sy' ? function(a, b) { return b.localeCompare(a); } : function(a, b) { return a.localeCompare(b, 'en', { sensitivity: 'base' }); });
    return keys.map(function(k) { return { v: k, label: k + ' · ' + count[k] }; });
  }

  function popHtml(list) {
    var key = home.pop, f = home.f, opts;
    if (key === 'ss') opts = [['date', HT.sDate], ['old', HT.sOld], ['most', HT.sMost]].map(function(o) { return { v: o[0], label: o[1] }; });
    else if (key === 'sy' || key === 'sv') opts = [{ v: '', label: HT.any }].concat(showOptions(key));
    else if (key === 'ly') opts = Object.keys(yearCats()).sort(function(a, b) { return b.localeCompare(a); }).map(function(y) { return { v: y, label: y }; });
    else if (key === 'sort') opts = [['date', HT.sDate], ['old', HT.sOld], ['added', HT.sAdded], ['top', HT.sTop]].map(function(o) { return { v: o[0], label: o[1] }; });
    else opts = [{ v: '', label: HT.any }].concat(options(key, list, f).map(function(o) { return { v: o.v, label: (key === 'r' ? '★' + o.v + '+' : o.v) + ' · ' + o.n }; }));
    var cur = key === 'sort' ? (f.sort || 'date') : key === 'ss' ? (f.ss || 'date') : key === 'ly' ? (home.ly || '') : (f[key] || '');
    return '<div class="ov"><div class="pp"><div class="ph">' + (HT[key] || HT.sort) + '</div><div class="pg">' + opts.map(function(o, i) {
      return chipH('o' + i, esc(o.label), String(o.v) === String(cur), ' data-v="' + esc(o.v) + '"');
    }).join('') + '</div></div></div>';
  }
  var HCSS = '#tvsh{position:fixed;inset:0;z-index:99000;background:#0B1118;overflow:auto;box-sizing:border-box;padding:26px 40px 40px;font-family:Arial,Helvetica,sans-serif;color:#fff}' +
    // 2.106.1: the site's own CSS breaks words anywhere (it is set for Japanese), which split "HACHINOHE" over two lines
    // on the show cards. Here English wraps between words; a single word longer than the line can still break.
    '#tvsh,#tvsh *{word-break:normal !important;overflow-wrap:break-word !important;line-break:auto !important}' +
    '#tvsh .hd{display:flex;align-items:center;gap:14px;margin-bottom:16px}#tvsh .bar{width:10px;height:36px;background:#F4C242}#tvsh .wm{font:900 30px Arial;letter-spacing:.06em}#tvsh .wm b{color:#F4C242;font-weight:900}' +
    '#tvsh .tg{font:600 15px Arial;color:#C9D2DC}#tvsh .ct{margin-left:auto;font:700 15px Arial;color:#9AA6B4}' +
    '#tvsh .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}#tvsh .row.sec{padding:10px 12px;border-radius:12px;background:#121922;border:2px solid #2A323C}' +
    '#tvsh .ch{appearance:none;height:44px;padding:0 16px;border-radius:10px;border:2px solid #2A323C;background:#161F2A;color:#C9D2DC;font:700 17px Arial;outline:none!important;box-shadow:none!important}' +
    '#tvsh .ch.on{background:#FFB347;border-color:#FFB347;color:#1A1A1A}#tvsh .ch:focus{border-color:#F4C242!important}' +
    '#tvsh .rs{font:700 15px Arial;color:#9AA6B4;margin:4px 0 12px}' +
    '#tvsh .gr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}' +
    '#tvsh .hc{position:relative;display:block;border-radius:8px;overflow:hidden;background:#1A1A1A;text-decoration:none;color:#fff;outline:none;border:3px solid transparent}' +
    '#tvsh .hc:focus{border-color:#F4C242}#tvsh .hc .im{height:0;padding-top:56.25%;background:#161F2A center/cover no-repeat}' +
    '#tvsh .hc .bd{position:absolute;right:8px;top:8px;background:#F4C242;color:#1A1A1A;font:800 13px Arial;padding:3px 8px;border-radius:4px}' +
    '#tvsh .tvsc-host{padding:11px 14px 13px}' +
    '#tvsh .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}' +
    '#tvsh .pp{width:1100px;max-height:80vh;overflow:auto;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:18px}' +
    '#tvsh .ph{font:800 15px Arial;letter-spacing:.14em;color:#F4C242;margin-bottom:12px;text-transform:uppercase}#tvsh .pg{display:flex;flex-wrap:wrap;gap:8px}' +
    // Shows (2.66.0): poster cards, three to a row, and the featured show
    '#tvsh .sgr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}' +
    '#tvsh .sbh{display:flex;align-items:center;gap:14px;margin:28px 0 14px}#tvsh .sbh .bar{width:8px;height:26px}#tvsh .sbh .sbt{font:700 22px Arial;color:#fff}#tvsh .sbh .ct{margin-left:0}#tvsh a.sba{display:inline-flex;align-items:center;margin-left:auto;text-decoration:none}#tvsh a.sba:focus{border-color:#F4C242;color:#fff}' +
    '#tvsh .sc,#tvsh .fc{position:relative;display:block;border-radius:8px;overflow:hidden;background:#1A1A1A;text-decoration:none;color:#fff;outline:none;border:3px solid transparent}' +
    '#tvsh .sc:focus,#tvsh .fc:focus{border-color:#F4C242}' +
    '#tvsh .sc .im{position:relative;height:0;padding-top:56.25%;background:#172029 center/cover no-repeat}' +
    '#tvsh .st{position:absolute;left:12px;top:12px;width:58px;background:#0B1118;border:2px solid #F4C242;border-radius:6px;text-align:center;padding:3px 0}' +
    '#tvsh .st .m{font:800 11px Arial;letter-spacing:1px;color:#F4C242}#tvsh .st .d{font:900 24px Arial;line-height:1}#tvsh .st .y{font:700 11px Arial;color:#C9D2DC}' +
    '#tvsh .cn{position:absolute;right:12px;top:12px;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:4px;background:rgba(11,17,24,.9);font:800 13px Arial;color:#fff}#tvsh .cn.part{color:#C9D2DC}' +
    '#tvsh .sc .bd,#tvsh .fc .bd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:9px}' +
    '#tvsh .sc .nm,#tvsh .fc .nm{font:700 18px Arial;line-height:1.25}' +
    '#tvsh .vn{display:flex;align-items:center;gap:6px;margin-top:3px;font:600 14px Arial;color:#C9D2DC}' +
    '#tvsh .me{padding:9px 11px;border-radius:8px;background:#141A22;border:1px solid #2A323C}' +
    '#tvsh .eb{font:800 12px Arial;letter-spacing:1px;text-transform:uppercase;color:#F4C242}#tvsh .eb.dim{color:#9AA6B4}' +
    '#tvsh .me .t{font:800 15px Arial;margin-top:3px;line-height:1.3}#tvsh .me .s{font:600 13px Arial;color:#C9D2DC;margin-top:2px}' +
    '#tvsh .lb{font:800 11px Arial;letter-spacing:1px;text-transform:uppercase;color:#9AA6B4}#tvsh .lb.fl{color:#F4C242;font-size:12px;margin-bottom:8px}' +
    '#tvsh .hl{display:flex;gap:9px;align-items:flex-start}#tvsh .hl svg{flex:0 0 auto;margin-top:2px}' +
    '#tvsh .hl .k{font:800 11px Arial;letter-spacing:1px;text-transform:uppercase;color:#F4C242}#tvsh .hl .n{font:700 14px Arial;line-height:1.3}' +
    '#tvsh .pips{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding-top:9px;border-top:1px solid #2A323C}' +
    '#tvsh .pip{width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;font:800 10px Arial;box-sizing:border-box}' +
    '#tvsh .pip.on{background:#2A2410;color:#F4C242;border:1px solid #6B5A22}#tvsh .pip.main{background:#F4C242;color:#1A1A1A}' +
    '#tvsh .pip.mainoff{border:1px dashed #F4C242;color:#F4C242}#tvsh .pip.off{border:1px dashed #3B4656;color:#5A6472}' +
    '#tvsh .mo{margin-left:auto;font:700 12px Arial;color:#9AA6B4}#tvsh .nn{font:700 12px Arial;color:#9AA6B4;line-height:20px}' +
    // Log next (2.67.0)
    '#tvsh .pip.wt{border:1px dashed #F4C242;color:#F4C242}' +
    '#tvsh .col{display:flex;flex-direction:column;gap:8px}#tvsh .seen{display:flex;align-items:center;gap:8px;font:600 14px Arial;color:#C9D2DC;min-height:22px}#tvsh .seen b{color:#fff}' +
    '#tvsh .phs{flex:1 1 0;display:flex;flex-direction:column;gap:6px;padding-top:2px}#tvsh .ph{display:block;height:11px;border-radius:4px;background:#2A323C}' +
    '#tvsh .row.nx{margin-bottom:20px}#tvsh .intro{font:600 16px Arial;color:#C9D2DC}' +
    '#tvsh .key{margin-left:auto;display:flex;gap:16px;font:700 13px Arial;color:#9AA6B4;align-items:center}#tvsh .key i{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:6px;vertical-align:-2px;box-sizing:border-box}' +
    '#tvsh .key .k1{background:#2A2410;border:1px solid #6B5A22}#tvsh .key .k2{border:1px dashed #F4C242}#tvsh .key .k3{border:1px dashed #3B4656}' +
    '#tvsh .fe{margin-bottom:26px}#tvsh .fc{display:flex}#tvsh .fc .im{position:relative;flex:0 0 46%;aspect-ratio:16/9;background:#172029 center/cover no-repeat}' +
    '#tvsh .fc .bd{flex:1 1 0;min-width:0}#tvsh .rl{margin-top:4px}' +
    '#tvsh .ro{display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px solid #2A323C}' +
    '#tvsh .ro .no{flex:0 0 24px;font:900 15px Arial;color:#F4C242;text-align:right}' +
    '#tvsh .ro .ev{flex:0 0 200px;font:800 11px Arial;letter-spacing:.5px;text-transform:uppercase;color:#9AA6B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#tvsh .ro .rn{flex:1 1 0;font:700 15px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#tvsh .ro.mn{border-bottom:0;background:#2A2410;margin:4px -14px 0;padding:7px 14px}#tvsh .ro.mn .ev{color:#F4C242}';
  var homeEl = null, prevClose = null;
  // Pictures load a row at a time (2.66.1): the first two rows straight away, then the row below whichever row has
  // focus, so a long page never asks for every thumbnail at once. Rows are the cards' tops on the page.
  function loadPictures() { if (homeEl) rowPictures(homeEl, '.hc, .sc, .fc'); }
  function homeRender(keep) {
    if (!homeEl) {
      homeEl = document.createElement('div'); homeEl.id = 'tvsh'; homeEl.className = 'notranslate'; homeEl.setAttribute('translate', 'no');
      var st = document.createElement('style'); st.textContent = HCSS; document.head.appendChild(st);
      document.body.appendChild(homeEl);
      window.addEventListener('keydown', homeKey, true);
      homeEl.addEventListener('focusin', loadPictures);
      homeEl.addEventListener('focusin', yearMore);
    }
    homeEl.innerHTML = homeHtml();
    var el = homeEl.querySelector('[data-k="' + (keep || '') + '"]') || (home.pop ? homeEl.querySelector('.pp .ch.on') || homeEl.querySelector('.pp .ch') : homeEl.querySelector('.ch.on'));
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
    try { history.replaceState(null, '', '/mypage?tvscope=' + home.tab + (home.tab === 'log' && home.lf === 'year' && home.ly ? '&y=' + home.ly : '') + (home.tab === 'shows' && home.f.sy ? '&sy=' + home.f.sy : '') + (home.tab === 'shows' && SHMODE ? '&sh=1' + (home.f.sb ? '&sb=' + encodeURIComponent(home.f.sb) : '') + (home.f.sa ? '&all=1' : '') : '')); } catch (e) {}   // 2.131.0: the Shows page keeps its own address
    loadPictures();
  }
  function openPop(key) {
    home.pop = key;
    prevClose = window.__tvMenuClose || null;
    window.__tvMenuClose = function() { closePop(); return true; };
    try { if (H && H.setSideMenuOpen) H.setSideMenuOpen(true); } catch (e) {}   // so Back closes the list instead of leaving the page
    homeRender();
  }
  function closePop() {
    var key = home.pop; home.pop = null;
    window.__tvMenuClose = prevClose; prevClose = null;
    try { if (H && H.setSideMenuOpen) H.setSideMenuOpen(false); } catch (e) {}
    homeRender('d:' + key);
  }
  function homePress(el) {
    var k = el.getAttribute('data-k'), m;
    if (!k) return;
    if (k.charAt(0) === 'v') {
      if (el.getAttribute('data-auto')) { try { sessionStorage.setItem('tvVixAuto', '1'); } catch (e) {} }   // Log next: the logger opens on the video (assets/indexpanel.js)
      location.href = el.getAttribute('href'); return;
    }
    if ((m = /^T(\w+)$/.exec(k))) { home.tab = m[1]; homeRender(k); return; }
    if ((m = /^k:(.*)$/.exec(k))) { home.f.k = m[1]; homeRender(k); return; }
    if (k === 'more') { home.more = !home.more; homeRender(k); return; }
    if ((m = /^tog:(\w+)$/.exec(k))) { home.f[m[1]] = !home.f[m[1]]; homeRender(k); return; }
    if ((m = /^lf:(\w+)$/.exec(k))) { home.lf = m[1]; homeRender(k); return; }
    if (k === 'ltry') { yearLoad(home.ly, true); return; }
    if ((m = /^d:(\w+)$/.exec(k))) { openPop(m[1]); return; }
    if (/^o\d+$/.test(k)) {
      var v = el.getAttribute('data-v'), key = home.pop;
      if (key === 'ly') { home.lf = 'year'; home.ly = v; yearLoad(v); }
      else if (key === 'sort') home.f.sort = v; else home.f[key] = key === 'r' ? (+v || 0) : v;
      closePop(); return;
    }
  }
  // D-pad: the nearest button or card in the arrow's direction. Left from the page's left edge opens the menu.
  function homeKey(e) {
    if (e.defaultPrevented) return;   // already handled (the menu's Left that just closed it)
    if (!homeEl || document.documentElement.classList.contains('tv-sm-open') || document.getElementById('tv-fp-pop')) return;
    var c = e.keyCode, dir = { 37: 'l', 38: 'u', 39: 'r', 40: 'd' }[c], scope = home.pop ? homeEl.querySelector('.pp') : homeEl, ae = document.activeElement;
    if (c === 13 || c === 23) { if (ae && homeEl.contains(ae)) { e.preventDefault(); e.stopImmediatePropagation(); homePress(ae); } return; }
    if (!dir) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var all = Array.prototype.slice.call(scope.querySelectorAll('[data-f]'));
    if (!ae || !scope.contains(ae)) { if (all[0]) all[0].focus(); return; }
    var a = ae.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = Infinity;
    all.forEach(function(el) {
      if (el === ae) return;
      var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - ax, dy = y - ay, main, side;
      if (dir === 'l') { if (r.right > a.left + 2) return; main = -dx; side = Math.abs(dy); }
      else if (dir === 'r') { if (r.left < a.right - 2) return; main = dx; side = Math.abs(dy); }
      else if (dir === 'u') { if (r.bottom > a.top + 2) return; main = -dy; side = Math.abs(dx); }
      else { if (r.top < a.bottom - 2) return; main = dy; side = Math.abs(dx); }
      var sc = main + side * (dir === 'l' || dir === 'r' ? 3 : 0.6);
      if (sc < bs) { bs = sc; best = el; }
    });
    if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest' }); }
    else if (dir === 'l' && !home.pop && window.__tvOpenMenu) window.__tvOpenMenu();
    else if (dir === 'u' && !home.pop) homeEl.scrollTop = 0;
  }
  function renderHome() {
    if (scopeDone || !map || !document.body) return;
    scopeDone = true;
    askSuggest();
    home = { tab: scopeKind, f: { k: '', w: '', g: '', y: '', c: '', ti: '', r: 0, sort: 'date', sy: '', sv: '', sb: '', sc: false, ss: 'date' }, more: false, pop: null, lf: '', ly: '' };
    var qy = Q.get('y');
    if (scopeKind === 'log' && qy && yearCats()[qy]) { home.lf = 'year'; home.ly = qy; yearLoad(qy); }
    // A complete year from the Years menu or the Eras page (2.101.0): Shows, filtered to that year.
    var qsy = Q.get('sy');
    if (scopeKind === 'shows' && /^\d{4}$/.test(qsy || '')) home.f.sy = qsy;
    if (scopeKind === 'shows' && Q.get('sb')) home.f.sb = Q.get('sb');   // 2.129.0: one brand from the Shows menu
    if (scopeKind === 'shows' && Q.get('all') === '1') home.f.sa = true;   // 2.131.0: every show (Latest shows' All)
    homeRender('T' + scopeKind);
    homeMap = map;
  }
  // For the Community menu: the newest StarScope matches, drawn as the same cards.
  window.__tvScope = {
    newest: function(n) { return homeList().sort(sorter('added')).slice(0, n || 3); },
    card: function(x) { return block(x.v); },
    // For the StarScope menu (2.83.0): shows to log with card check, from Log next's list (kept on the TV).
    logOn: function() { return logOn(); },
    toLog: function() {
      return nextList().map(function(e) {
        var s = e.s, g = e.g;
        return { set: String(g.set), href: checkHref(g.set, 'next'), th: (s && s.top.v.th) || e.first.th || '', name: s ? s.name : (showName(g.show, g.date) || g.show),
          date: s ? s.date : g.date, venue: s ? s.venue : (g.venue ? (ja ? g.venue.ja || g.venue.en : g.venue.en) : ''), watched: e.w, logged: s ? s.list.length : 0, total: s && s.total };
      });
    },
    years: function() { return Object.keys(yearCats()).sort(function(a, b) { return b.localeCompare(a); }); },
    // For card check's Next show from the New list (2.102.0)
    newShows: function() { return newSets().map(function(x) { return { set: x.set, href: checkHref(x.set, 'new'), name: showName(x.name, x.date) || x.name, date: x.date }; }); },
    // For card check's Next show (2.85.0): shows started and not finished, newest first.
    started: function() {
      return showsList().filter(function(s) { return !s.complete; }).sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); })
        .map(function(s) { return { set: s.sid, href: checkHref(s.sid, 'started'), name: s.name, date: s.date }; });
    }
  };

  // check: StarScope card check's own page (assets/cardcheck.js) draws itself.
  // 2.121.2: a Shows, Recent, Top or All page drawn from the TV's older copy is drawn again when the newer list arrives,
  // keeping the focused control (the 2018 Shows page from the Eras timeline showed only the copy's one 2018 show).
  var homeMap = null;
  function homeAgain() {
    if (!scopeDone || !home || !homeEl || homeMap === map || home.tab === 'check') return;
    homeMap = map;
    var ae = document.activeElement, k = ae && ae.getAttribute && ae.getAttribute('data-k');
    try { homeRender(k || ('T' + home.tab)); } catch (e) {}
  }
  function apply() { if (!map) return; if (scopeKind === 'check') return; if (scopeDone && home) homeAgain(); if (scopeKind === 'recent' || scopeKind === 'top' || scopeKind === 'all' || scopeKind === 'shows' || scopeKind === 'next' || scopeKind === 'log') renderHome(); else if (scopeKind) renderScope(); else addButtons(); }
  var timer = 0;
  function soon() { if (timer) return; timer = setTimeout(function() { timer = 0; apply(); }, 350); }   // not a debounce: a page that keeps changing must still get its button
  // Pictures for card-check matches saved without one (2.84.6): card check keeps each show page it read on this TV
  // (tvCcSet<set>), pictures included. Once the list is in, any logged match with no picture gets it from there, sent
  // to the sheet in one call (vi_thumbs); at most once an hour, and nothing is asked of the site.
  function fillThumbs() {
    if (!SHEET || !map || !H.indexSync) return;
    var last = 0; try { last = Number(localStorage.getItem('tvCcThumbFill') || 0); } catch (e) {}
    if (Date.now() - last < 3600000) return;
    var items = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!/^tvCcSet\d+$/.test(k || '')) continue;
        var c = JSON.parse(localStorage.getItem(k) || 'null');
        ((c && c.videos) || []).forEach(function(v) { var m = map[v.id]; if (m && !m.th && v.th && items.length < 40) items.push({ video: v.id, thumb: v.th }); });
      }
    } catch (e) {}
    try { localStorage.setItem('tvCcThumbFill', String(Date.now())); } catch (e) {}
    if (!items.length) return;
    var prev = window.__tvIndexReply;
    window.__tvIndexReply = function(id, text) {
      if (id !== 'sct1') { if (prev) prev(id, text); return; }
      window.__tvIndexReply = prev;
      var r = null; try { r = JSON.parse(text); } catch (e) {}
      if (r && r.ok && r.filled) ask({ full: true });   // pictures aren't dated, so the whole list
    };
    try { H.indexSync('sct1', JSON.stringify({ action: 'vi_thumbs', items: items })); } catch (e) { window.__tvIndexReply = prev; }
  }
  // 2.87.1: a StarScope page whose list didn't come says so and why (it was left blank), and can ask again.
  function loadFailed(why) {
    if (!scopeKind || scopeKind === 'check' || !document.body) return;
    var d = document.getElementById('tvsc-fail');
    if (!d) { d = document.createElement('div'); d.id = 'tvsc-fail'; d.className = 'notranslate'; d.setAttribute('translate', 'no'); document.body.appendChild(d); }
    d.style.cssText = 'position:fixed;inset:0;z-index:99000;background:#0B1118;color:#fff;font-family:Arial,Helvetica,sans-serif;padding:48px 64px;box-sizing:border-box';
    d.innerHTML = '<div style="font:900 26px Arial;margin-bottom:12px">' + esc(ja ? 'STARSCOPEを読み込めませんでした' : "StarScope couldn't load its list") + '</div>' +
      '<div style="font:600 17px Arial;color:#FF7A66;margin-bottom:22px">' + esc(why) + '</div>' +
      '<button type="button" id="tvsc-retry" style="height:48px;padding:0 22px;border-radius:10px;border:2px solid #FFB347;background:#FFB347;color:#1A1A1A;font:700 17px Arial;outline:none">' + esc(ja ? 'もう一度' : 'Try again') + '</button>';
    var b = d.querySelector('#tvsc-retry');
    b.onclick = function() { b.textContent = ja ? '読み込み中…' : 'Loading…'; ask({ now: true }); };
    b.focus();
  }
  // ---- Asking the sheet for the list (2.88.0)
  //  - One request at a time, across pages: a request in flight is noted on the TV (tvVixCardsAsk) and nothing else asks
  //    for 45 s unless it has answered. A save made meanwhile asks again once the answer is in.
  //  - After a failure, a pause before the next try: 30 s, then 1, 2, 4 … up to 10 minutes (tvVixCardsFail). Try again
  //    on the error screen skips the pause.
  //  - Only what changed: the TV keeps the sheet's time of its last copy (s) and asks for what changed after it; the
  //    answer is merged in. The whole list once a day, or when there's no copy.
  var ASK_KEY = 'tvVixCardsAsk', FAIL_KEY = 'tvVixCardsFail', FULL_AGE = 86400000, asking = false, again = false;
  function lsJ(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsPut(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function kept() { return KEPT && KEPT.map ? KEPT : null; }
  // 2.121.2: the list is big enough to hit the WebView's storage limit. A failed save used to be silent, so every later
  // page read the old copy (stale cards, titles and factions). Now the old copy is dropped first, and if the new one
  // still doesn't fit it is saved without the site's own titles (vt, vtj: rebuilt from the card when missing). The
  // outcome is kept for the debug blocks (window.__tvScopeIdx.saveInfo()).
  var SAVE_INFO = '';
  try { SAVE_INFO = localStorage.getItem('tvVixCardsSave') || ''; } catch (e) {}
  function saveList(c) {
    KEPT = c;
    window.__tvScopeList = c;
    var txt = JSON.stringify(c), kb = Math.round(txt.length / 1024), how = '';
    if (NATIVE) { var okN = false; try { okN = H.scopeListSave(txt); } catch (e) { okN = false; } how = okN ? 'saved to the app' : 'NOT SAVED to the app'; }
    else try { localStorage.setItem(KEY, txt); how = 'saved'; } catch (e) {
      try { localStorage.removeItem(KEY); localStorage.setItem(KEY, txt); how = 'saved after dropping the old copy'; } catch (e2) {
        var slim = {}; Object.keys(c.map).forEach(function(k) { var v = c.map[k], o = {}; Object.keys(v).forEach(function(f) { if (f !== 'vt' && f !== 'vtj') o[f] = v[f]; }); slim[k] = o; });
        var t2 = JSON.stringify({ t: c.t, s: c.s, f: c.f, map: slim });
        try { localStorage.setItem(KEY, t2); how = 'saved without site titles (' + Math.round(t2.length / 1024) + ' KB)'; } catch (e3) { how = 'NOT SAVED: too big for this TV (' + e3 + ')'; }
      }
    }
    SAVE_INFO = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' \u00b7 ' + Object.keys(c.map).length + ' videos \u00b7 ' + kb + ' KB \u00b7 ' + how;
    try { localStorage.setItem('tvVixCardsSave', SAVE_INFO); } catch (e) {}
  }
  function ask(o) {
    o = o || {};
    if (asking) { again = true; return; }
    var lk = lsJ(ASK_KEY);
    if (lk && Date.now() - lk.t < 45000 && !o.now) { again = true; setTimeout(function() { if (again && !asking) { again = false; ask(); } }, 45000 - (Date.now() - lk.t) + 500); return; }
    var fl = lsJ(FAIL_KEY);
    if (fl && !o.now) { var pause = Math.min(30000 * Math.pow(2, fl.n - 1), 600000); if (Date.now() - fl.t < pause) return; }
    var c = kept(), body = { action: 'vi_cards' };
    if (c && c.s && !o.full && Date.now() - (c.f || 0) < FULL_AGE) body.since = c.s;
    asking = true; lsPut(ASK_KEY, { t: Date.now() });
    try { H.starCards('c1', JSON.stringify(body)); } catch (e) { asking = false; lsPut(ASK_KEY, null); }
  }
  window.__tvCardsRefresh = function() { ask(); };   // card check, after a save
  window.__tvStarCardsReply = function(id, text) {
    var r; try { r = JSON.parse(text); } catch (e) { r = null; }
    if (id === 's1') { if (r && r.ok) gotSuggest(r); return; }
    if (id !== 'c1') return;
    asking = false; lsPut(ASK_KEY, null);
    if (!r || !r.ok || !r.map) {
      var fl = lsJ(FAIL_KEY) || { n: 0 }; lsPut(FAIL_KEY, { t: Date.now(), n: Math.min((fl.n || 0) + 1, 6) });
      if (!map) loadFailed(r && r.error ? String(r.error) : 'no reply');
      return;
    }
    lsPut(FAIL_KEY, null);
    var fail = document.getElementById('tvsc-fail'); if (fail) fail.remove();
    var c = kept(), got = 0;
    if (r.since && c && c.map) {
      // Changes only: merged into the copy this TV has; cards the sheet no longer has go.
      var m = c.map;
      Object.keys(r.map).forEach(function(k) { m[k] = r.map[k]; got++; });
      if (r.all) { var keep = {}; r.all.forEach(function(k) { keep[k] = 1; }); Object.keys(m).forEach(function(k) { if (!keep[k]) { delete m[k]; got++; } }); }
      map = m;
      c = { t: Date.now(), s: r.now || c.s, f: c.f || 0, map: m };
    } else {
      map = r.map; got = 1;
      c = { t: Date.now(), s: r.now || '', f: Date.now(), map: map };
    }
    saveList(c);
    THRU = null;
    // 2.124.0: the status pill (assets/bgstatus.js): what this update brought, once it is saved on the TV.
    try {
      if (H.bgNote) {
        var nv = Object.keys(c.map).length, bad = / NOT SAVED/.test(SAVE_INFO);
        if (bad) H.bgNote('StarScope list could not be saved on this TV', 'StarScopeリストをこのテレビに保存できませんでした', false, false);
        else if (!r.since) H.bgNote('Full StarScope list saved: ' + nv + ' videos', 'StarScopeリスト全件を保存：' + nv + '本', true, true);
        else if (got) H.bgNote('StarScope updated: ' + got + (got === 1 ? ' change' : ' changes') + ' saved', 'StarScopeを更新：' + got + '件を保存', true, true);
        else H.bgNote('StarScope up to date', 'StarScopeは最新です', true, false);
      }
    } catch (e) {}
    if (got) {
      try { if (window.__tvScopeUpdate) window.__tvScopeUpdate(); } catch (e) {}   // the video page's StarScope player (assets/scopeplayer.js)
      try { window.dispatchEvent(new Event('tvscopelist')); } catch (e) {}   // 2.121.3: app pages redraw if their decision changed
      soon();
    }
    setTimeout(fillThumbs, 3000);
    if (again) { again = false; setTimeout(ask, 300); }
  };
  // ---- For the Eras page (2.109.0, assets/eranew.js): the same one list, nothing more is asked of the site.
  var SHOWS = null, SHOWS_AT = null;
  function showsBy() {
    if (SHOWS && SHOWS_AT === map) return SHOWS;
    SHOWS = {}; SHOWS_AT = map;
    try { showsList().forEach(function(s) { SHOWS[s.sid] = s; }); } catch (e) {}
    return SHOWS;
  }
  function scopedCss(scope) {
    var skip = /^#tvsh(\{|,)|#tvsh \.(hd|bar|wm|tg|ct|row|ch|rs|gr|hc|ov|pp|ph|pg|sgr|tvsc-host)\b/;
    return HCSS.split('}').filter(function(r) { return r.trim() && !skip.test(r.trim()); }).map(function(r) { return r.replace(/#tvsh /g, scope + ' ') + '}'; }).join('');
  }
  (function(X) {
    X.get = function(id) { return (map || {})[String(id)] || null; };
    // Every logged match passing test(v), dated or not, complete year or not (2.109.1: top rated thumbnails).
    X.any = function(test) { var o = []; Object.keys(map || {}).forEach(function(id) { var v = map[id]; if (v && v.x && v.x.k !== 'segment' && test(v)) o.push({ id: id, v: v }); }); return o; };
    X.oneEach = oneEach;
    X.ready = function() { return !!map; };
    X.saveInfo = function() { return 'list on this TV: ' + Object.keys(map || {}).length + ' videos \u00b7 last save ' + (SAVE_INFO || 'none recorded'); };
    X.vs = function(a, b, from) { return map ? pairList('v', a, b, from || '') : []; };
    X.fvs = function(a, b, from) { return map ? pairList('f', a, b, from || '') : []; };
    X.faction = facMembers;
    X.unitSide = unitSide;   // 2.121.0: (v, side index, faction id)
    X.oneLine = oneLine;
    X.show = function(sid) { return map ? showsBy()[String(sid)] || null : null; };
    X.shows = function(from, to) { var o = []; if (!map) return o; var by = showsBy(); Object.keys(by).forEach(function(k) { var d = String(by[k].date || ''); if (d && d >= (from || '') && (!to || d <= to)) o.push(by[k]); }); return o; };
    X.showCard = function(sid) { var s = X.show(sid); return s ? showCard(s) : ''; };
    X.showCss = scopedCss;
  })(window.__tvScopeIdx);

  // ---- One filter bar for every match grid (2.131.0). The old drop-down bar's look (buttons that open a shelf of
  // choices under them, then a "Showing" row of chips to clear), filled from the index: every choice only offers
  // what is in the list on screen once the other filters are applied, with its count. Nothing is asked of the site.
  // Long lists (wrestlers, venues, teams) open on MOST MATCHES, with A-Z (letter headings) one tab over.
  // window.__tvScopeFilter.mount(parent, before, items, cfg) -> controller. items: objects with .v (an index entry).
  // cfg: kinds ['mt','ch','wr','fa','op','yr','sh','vn','tr','sort'], pre {kind: value}, extra {kind: {label, vals}},
  // onChange(list, f), onDown(), onUp(), onLeft(), arrows (false: the page moves focus between the buttons itself).
  var SF = (function() {
    var MTJ = null, CHJ = null, TAGID = { 'cmll-japan': 'cmll', 'roh-women': 'roh', 'sendai-world': 'sendai', 'swa-world': 'swa' };
    function mtGroups() {
      if (MTJ) return MTJ;
      MTJ = [];
      try { (JSON.parse(H.matchTypesJson()).groups || []).forEach(function(g) { var it = (g.items || []).filter(function(x) { return x.id && x.id !== 'champ'; }); if (it.length) MTJ.push({ name: ja && g.ja ? g.ja : g.name, items: it.map(function(x) { return { id: x.id, name: ja && x.ja ? x.ja : x.name }; }) }); }); } catch (e) {}
      // Rules StarScope logs that the Matches menu doesn't list (the menu has no room left): offered here only, and
      // only when the list on screen has one. Ids as in the sheet's lists tab (stipulation).
      MTJ.push({ name: ja ? 'その他のルール' : 'More rules', items: [['no-dq', 'No DQ', '反則裁定なし'], ['loser-haircut', "Loser's haircut", '敗者髪切り'], ['indian-strap', 'Strap match', 'インディアン・ストラップ'], ['mixed-martial-arts', 'Mixed martial arts', '異種格闘技戦'], ['sparring', 'Sparring session', '公開スパーリング']].map(function(r) { return { id: r[0], name: ja ? r[2] : r[1] }; }) });
      return MTJ;
    }
    function chGroups() {
      if (CHJ) return CHJ;
      CHJ = [];
      try { (JSON.parse(H.championshipsJson()).groups || []).forEach(function(g) { CHJ.push({ name: ja && g.ja ? g.ja : g.name, items: (g.items || []).filter(function(x) { return x.id !== 'any' && x.id !== 'other'; }).map(function(x) { return { id: x.id, name: String(ja && x.ja ? x.ja : x.name).replace(/ Championship$/, '') }; }) }); }); } catch (e) {}
      return CHJ;
    }
    function chName(tag) {
      var id = TAGID[tag] || tag, out = '';
      chGroups().forEach(function(g) { g.items.forEach(function(x) { if (x.id === id) out = x.name; }); });
      return out || String(tag).replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    }
    var ROS = null;
    function roster() {   // the Wrestlers menu's own names (active only): joke and billed-only names stay out of the list
      if (ROS !== null) return ROS;
      ROS = false;
      try { var r = JSON.parse(localStorage.getItem('tvRosterV1') || 'null'); if (r && r.talent && r.talent.length) { ROS = {}; r.talent.forEach(function(t) { ROS[String(t.en || '').toLowerCase()] = 1; }); } } catch (e) {}
      return ROS;
    }
    function venueOf(v) { var S0 = v.ss || v; return String((ja ? (S0.vnj || S0.vn || v.vnj || v.vn) : (S0.vn || v.vn)) || ''); }
    function brandOfV(v) {
      var txt = bnorm([v.sh, v.she, v.ss ? v.ss.n : ''].join(' '));
      var b = brands().filter(function(x) { return x.keys.some(function(k) { return k && txt.indexOf(k) >= 0; }); })[0];
      return b ? b.name : '';
    }
    var L = ja ? { mt: '試合形式', ch: '王座', wr: '選手', fa: 'チーム・ユニット', op: '対戦ユニット', yr: '年', sh: '大会', vn: '会場', tr: 'トーナメント', sort: '並び順', all: 'すべて', showing: '絞り込み', clear: 'すべて解除', most: '試合数順', az: 'A–Z', m: '試合', sDate: '新しい順', sOld: '古い順', sTop: '高評価順' }
      : { mt: 'Match type', ch: 'Championship', wr: 'Wrestler', fa: 'Team or faction', op: 'Opponent faction', yr: 'Year', sh: 'Show', vn: 'Venue', tr: 'Tournament', sort: 'Sort', all: 'All', showing: 'Showing', clear: 'Clear all', most: 'MOST MATCHES', az: 'A–Z', m: 'matches', sDate: 'Newest', sOld: 'Oldest', sTop: 'Top rated' };
    var LONG = { wr: 1, fa: 1, op: 1, vn: 1 };
    // The values an item has for a filter, as [value, label] pairs.
    function vals(kind, x, cfg) {
      var v = x.v, X = v.x || {};
      if (cfg.extra && cfg.extra[kind]) return cfg.extra[kind].vals(x).map(function(s) { return [s, s]; });
      switch (kind) {
        case 'mt': var o = []; mtGroups().forEach(function(g) { g.items.forEach(function(t) { if (isType(v, t.id)) o.push([t.id, t.name]); }); }); return o;
        case 'ch': return (X.tv || []).map(function(t) { return [t, chName(t)]; });
        case 'wr': var R = roster(); return people(v).filter(function(n) { return !R || R[String(n).toLowerCase()]; }).map(function(n) { return [n, n]; });
        case 'fa': return (X.g || []).map(function(n) { return [n, n]; });
        case 'yr': var y = String(v.d || '').slice(0, 4); return y ? [[y, y]] : [];
        case 'sh': var b = brandOfV(v); return b ? [[b, b]] : [];
        case 'vn': var vn = venueOf(v); return vn ? [[vn, vn]] : [];
        case 'tr': return X.c ? [[X.c, X.c]] : [];
      }
      return [];
    }
    function mount(parent, before, items, cfg) {
      cfg = cfg || {};
      var f = {}, kinds = cfg.kinds || [], el = document.createElement('div'), panel = null, openK = '', prevClose = null, tab = 0, lastK = '';
      Object.keys(cfg.pre || {}).forEach(function(k) { f[k] = cfg.pre[k]; });
      f.sort = f.sort || 'date';
      el.className = 'tv-sf notranslate'; el.setAttribute('translate', 'no');
      parent.insertBefore(el, before || null);
      function passes(x, skip) {
        for (var i = 0; i < kinds.length; i++) {
          var k = kinds[i];
          if (k === 'sort' || k === skip || !f[k]) continue;
          if (!vals(k, x, cfg).some(function(p) { return String(p[0]) === String(f[k]); })) return false;
        }
        return true;
      }
      function options(k) {
        var c = {}, lab = {};
        items.forEach(function(x) { if (!passes(x, k)) return; var seen = {}; vals(k, x, cfg).forEach(function(p) { if (seen[p[0]]) return; seen[p[0]] = 1; c[p[0]] = (c[p[0]] || 0) + 1; lab[p[0]] = p[1]; }); });
        return Object.keys(c).map(function(v) { return { v: v, label: lab[v], n: c[v] }; });
      }
      function labelOf(k, v) {
        if (k === 'sort') return ({ date: L.sDate, old: L.sOld, top: L.sTop })[v] || L.sDate;
        var o = null; items.some(function(x) { var p = vals(k, x, cfg).filter(function(q) { return String(q[0]) === String(v); })[0]; if (p) { o = p[1]; return true; } return false; });
        return o || (k === 'ch' ? chName(v) : v);
      }
      function nameOf(k) { return (cfg.extra && cfg.extra[k] && cfg.extra[k].label) || L[k]; }
      function list() {
        var out = items.filter(function(x) { return passes(x, ''); });
        var s = f.sort;
        out.sort(s === 'old' ? function(a, b) { return String(a.v.d).localeCompare(String(b.v.d)); }
          : s === 'top' ? function(a, b) { var A = a.v.x || {}, B = b.v.x || {}; return ((B.rc ? B.r : 0) - (A.rc ? A.r : 0)) || String(b.v.d).localeCompare(String(a.v.d)); }
          : function(a, b) { return String(b.v.d).localeCompare(String(a.v.d)); });
        return out;
      }
      function draw(keep) {
        var shown = list(), h = '<div class="tv-sfr">';
        kinds.forEach(function(k) {
          if (k !== 'sort' && !f[k] && !options(k).length) return;   // nothing in this list for it
          var on = k === 'sort' ? f.sort !== 'date' : !!f[k];
          h += '<div class="tv-sfb' + (on ? ' on' : '') + '" tabindex="0" role="button" data-k="' + k + '">' + esc(nameOf(k) + (k === 'sort' || f[k] ? ': ' + labelOf(k, k === 'sort' ? f.sort : f[k]) : '')) + ' ▾</div>';
        });
        h += '<span class="tv-sfn">' + shown.length + ' ' + esc(L.m) + '</span></div>';
        var set = kinds.filter(function(k) { return k !== 'sort' && f[k]; });
        if (set.length) {
          h += '<div class="tv-sfc"><span class="tv-sfl">' + esc(L.showing) + '</span>' + set.map(function(k) { return '<div class="tv-sfx" tabindex="0" role="button" data-x="' + k + '">' + esc(labelOf(k, f[k])) + ' ×</div>'; }).join('') +
            (set.length > 1 ? '<div class="tv-sfx clr" tabindex="0" role="button" data-x="*">' + esc(L.clear) + '</div>' : '') + '</div>';
        }
        el.innerHTML = h;
        var fo = keep ? el.querySelector(keep) : null;
        if (fo) { try { fo.focus({ preventScroll: true }); } catch (e) { fo.focus(); } }
        return shown;
      }
      function changed(keep) { var shown = draw(keep); if (cfg.onChange) cfg.onChange(shown, f); }
      // ---- the shelf of choices under a button
      function item(v, label, n, cur, extraCls) { return '<div class="tv-sfi' + (cur ? ' cur' : '') + (extraCls || '') + '" tabindex="-1" data-v="' + esc(v) + '">' + esc(label) + (n != null ? '<span class="n">' + n + '</span>' : '') + '</div>'; }
      function openPanel(k) {
        closePanel(false);
        openK = k; lastK = k;
        var cur = k === 'sort' ? f.sort : (f[k] || ''), h = '', wide = false;
        if (k === 'sort') h = [['date', L.sDate], ['old', L.sOld], ['top', L.sTop]].map(function(o) { return item(o[0], o[1], null, cur === o[0]); }).join('');
        else {
          var opts = options(k), by = {}; opts.forEach(function(o) { by[o.v] = o; });
          h = item('', L.all, null, !cur);
          if (k === 'mt' || k === 'ch') {   // grouped in columns, as the old bar
            var groups = k === 'mt' ? mtGroups() : chGroups(), used = {}, cols = '';
            groups.forEach(function(g) {
              var its = g.items.map(function(t) { var tag = k === 'ch' ? Object.keys(TAGID).filter(function(z) { return TAGID[z] === t.id; })[0] || t.id : t.id; return by[tag] ? { v: tag, o: by[tag] } : null; }).filter(Boolean);
              if (!its.length) return;
              cols += '<div class="tv-sfcol"><div class="tv-sfh">' + esc(String(g.name).toUpperCase()) + '</div>' + its.map(function(t) { used[t.v] = 1; return item(t.v, t.o.label, t.o.n, String(cur) === String(t.v)); }).join('') + '</div>';
            });
            var rest = opts.filter(function(o) { return !used[o.v]; });
            if (rest.length) cols += '<div class="tv-sfcol"><div class="tv-sfh">' + esc(ja ? 'その他' : 'OTHER') + '</div>' + rest.map(function(o) { return item(o.v, o.label, o.n, String(cur) === String(o.v)); }).join('') + '</div>';
            h += '<div class="tv-sfcols">' + cols + '</div>'; wide = true;
          } else if (k === 'yr' || k === 'tr' || k === 'sh') {
            opts.sort(k === 'yr' ? function(a, b) { return b.v.localeCompare(a.v); } : function(a, b) { return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }); });
            h += '<div class="tv-sfgrid c' + (opts.length > 12 ? 3 : 2) + '">' + opts.map(function(o) { return item(o.v, o.label, o.n, String(cur) === String(o.v)); }).join('') + '</div>';
          } else if (LONG[k] && opts.length > 24) {
            // Long lists: the most matches first (three columns), A-Z with letter headings on the next tab
            var top = opts.slice().sort(function(a, b) { return b.n - a.n || a.label.localeCompare(b.label); }).slice(0, 30);
            var az = opts.slice().sort(function(a, b) { return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }); }), lastL = '', azh = '';
            az.forEach(function(o) { var l0 = String(o.label).charAt(0).toUpperCase(); if (!/[A-Z]/.test(l0)) l0 = '#'; if (l0 !== lastL) { azh += '<div class="tv-sflt">' + esc(l0) + '</div>'; lastL = l0; } azh += item(o.v, o.label, o.n, String(cur) === String(o.v)); });
            tab = cur && !top.some(function(o) { return String(o.v) === String(cur); }) ? 1 : 0;
            h += '<div class="tv-sftabs">' + item('#t0', L.most, null, false, ' tv-sftab' + (tab === 0 ? ' on' : '')) + item('#t1', L.az, null, false, ' tv-sftab' + (tab === 1 ? ' on' : '')) + '</div>' +
              '<div class="tv-sfbody b0 tv-sfgrid c3"' + (tab === 0 ? '' : ' style="display:none"') + '>' + top.map(function(o) { return item(o.v, o.label, o.n, String(cur) === String(o.v)); }).join('') + '</div>' +
              '<div class="tv-sfbody b1 tv-sfaz"' + (tab === 1 ? '' : ' style="display:none"') + '>' + azh + '</div>';
            wide = true;
          } else {
            opts.sort(function(a, b) { return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }); });
            h += '<div class="tv-sfgrid c' + (opts.length > 16 ? 3 : opts.length > 8 ? 2 : 1) + '">' + opts.map(function(o) { return item(o.v, o.label, o.n, String(cur) === String(o.v)); }).join('') + '</div>';
          }
        }
        panel = document.createElement('div');
        panel.id = 'tv-sfp'; panel.className = 'notranslate' + (wide ? ' wide' : ''); panel.setAttribute('translate', 'no');
        panel.innerHTML = '<div class="tv-sfph">' + esc(nameOf(k).toUpperCase()) + '</div>' + h;
        document.body.appendChild(panel);
        var btn = el.querySelector('.tv-sfb[data-k="' + k + '"]');
        if (btn) btn.classList.add('open');
        var r = btn ? btn.getBoundingClientRect() : { left: 40, bottom: 120, top: 100 }, vw = window.innerWidth, vh = window.innerHeight, pw = panel.offsetWidth, ph = panel.offsetHeight;
        var top0 = r.bottom + 8; if (top0 + ph > vh - 20) top0 = Math.max(20, vh - 20 - ph);
        panel.style.left = Math.max(20, Math.min(r.left, vw - pw - 20)) + 'px'; panel.style.top = top0 + 'px';
        prevClose = window.__tvMenuClose || null;
        window.__tvMenuClose = function() { closePanel(true); return true; };
        try { if (H && H.setSideMenuOpen) H.setSideMenuOpen(true); } catch (e) {}   // Back closes the shelf, not the page
        var first = panel.querySelector('.tv-sfbody:not([style*="none"]) .tv-sfi.cur') || panel.querySelector('.tv-sfi.cur:not(.tv-sftab)') || panel.querySelector('.tv-sftab.on') || panel.querySelector('.tv-sfi');
        if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ block: 'nearest' }); }
      }
      function closePanel(refocus) {
        if (!panel) return;
        panel.remove(); panel = null;
        var b = el.querySelector('.tv-sfb.open'); if (b) b.classList.remove('open');
        window.__tvMenuClose = prevClose; prevClose = null;
        try { if (H && H.setSideMenuOpen) H.setSideMenuOpen(false); } catch (e) {}
        if (refocus && b) b.focus({ preventScroll: true });
        openK = '';
      }
      function showTab(t) {
        if (!panel) return; tab = t;
        Array.prototype.forEach.call(panel.querySelectorAll('.tv-sftab'), function(e, i) { e.classList.toggle('on', i === t); });
        Array.prototype.forEach.call(panel.querySelectorAll('.tv-sfbody'), function(e) { e.style.display = e.classList.contains('b' + t) ? '' : 'none'; });
      }
      function press(e0) {
        if (!e0) return;
        if (e0.classList.contains('tv-sfb')) { openPanel(e0.getAttribute('data-k')); return; }
        if (e0.classList.contains('tv-sfx')) { var x = e0.getAttribute('data-x'); if (x === '*') kinds.forEach(function(k) { if (k !== 'sort') f[k] = ''; }); else f[x] = ''; changed('.tv-sfb'); return; }
        if (e0.classList.contains('tv-sftab')) { showTab(e0.getAttribute('data-v') === '#t1' ? 1 : 0); return; }
        if (e0.classList.contains('tv-sfi') && panel) { var k = openK, v = e0.getAttribute('data-v'); closePanel(false); if (k === 'sort') f.sort = v || 'date'; else f[k] = v; changed('.tv-sfb[data-k="' + k + '"]'); }
      }
      // nearest focusable in the arrow's direction (a shelf: inside it; the bar: its buttons and chips)
      function near(list, ae, dir) {
        var a = ae.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = Infinity;
        list.forEach(function(e1) {
          if (e1 === ae || !e1.offsetParent) return;
          var r = e1.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, main, side;
          if (dir === 'l') { if (r.right > a.left + 2) return; main = ax - x; side = Math.abs(y - ay); }
          else if (dir === 'r') { if (r.left < a.right - 2) return; main = x - ax; side = Math.abs(y - ay); }
          else if (dir === 'u') { if (r.bottom > a.top + 2) return; main = ay - y; side = Math.abs(x - ax); }
          else { if (r.top < a.bottom - 2) return; main = y - ay; side = Math.abs(x - ax); }
          var sc = main + side * (dir === 'l' || dir === 'r' ? 3 : 0.6);
          if (sc < bs) { bs = sc; best = e1; }
        });
        return best;
      }
      function onKey(e) {
        if (e.defaultPrevented || !el.isConnected) return;
        var ae = document.activeElement, inP = panel && panel.contains(ae), inB = el.contains(ae);
        if (!inP && !inB) return;
        if (!inP && document.documentElement.classList.contains('tv-sm-open')) return;
        var c = e.keyCode, dir = { 37: 'l', 38: 'u', 39: 'r', 40: 'd' }[c];
        if (c === 13 || c === 23) { e.preventDefault(); e.stopImmediatePropagation(); press(ae); return; }
        if (!dir) return;
        if (inB && cfg.arrows === false) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (inP) {
          var n = near(Array.prototype.slice.call(panel.querySelectorAll('.tv-sfi')), ae, dir);
          if (n) { n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest' }); if (n.classList.contains('tv-sftab')) showTab(n.getAttribute('data-v') === '#t1' ? 1 : 0); }
          return;
        }
        var m = near(Array.prototype.slice.call(el.querySelectorAll('.tv-sfb, .tv-sfx')), ae, dir);
        if (m) { m.focus({ preventScroll: true }); return; }
        if (dir === 'd' && cfg.onDown) cfg.onDown();
        else if (dir === 'u' && cfg.onUp) cfg.onUp();
        else if (dir === 'l' && cfg.onLeft) cfg.onLeft();
      }
      window.addEventListener('keydown', onKey, true);
      el.addEventListener('click', function(e) { var t = e.target.closest('.tv-sfb, .tv-sfx'); if (t) press(t); });
      document.addEventListener('click', function(e) { if (panel && panel.contains(e.target)) { var t = e.target.closest('.tv-sfi'); if (t) press(t); } });
      var first = draw();
      return {
        el: el, list: list, filters: f, items: function(it) { items = it; changed(); },
        owns: function(x) { return !!x && (el.contains(x) || (panel && panel.contains(x))); },
        focus: function() { var b = el.querySelector('.tv-sfb[data-k="' + lastK + '"]') || el.querySelector('.tv-sfb'); if (b) { b.focus({ preventScroll: true }); return true; } return false; },
        first: first
      };
    }
    var css = document.createElement('style');
    css.textContent = [
      '.tv-sf{font-family:Arial,Helvetica,sans-serif;margin:0 0 18px 0;}',
      '.tv-sf .tv-sfr{display:flex;flex-wrap:wrap;align-items:center;gap:12px 10px;}',
      '.tv-sf .tv-sfb{box-sizing:border-box;padding:10px 14px;border-radius:10px;border:2px solid rgba(255,255,255,0.45);color:#FFFFFF;font-size:19px;font-weight:700;line-height:1.2;white-space:nowrap;background:transparent;cursor:pointer;outline:none !important;}',
      '.tv-sf .tv-sfb.on{border-color:#F4C242;color:#F4C242;}',
      '.tv-sf .tv-sfb:focus,.tv-sf .tv-sfb.open{background:#FFB347;border-color:#FFB347;color:#1A1A1A;box-shadow:none !important;}',
      '.tv-sf .tv-sfn{margin-left:auto;font-size:15px;font-weight:700;color:#9AA6B4;white-space:nowrap;}',
      '.tv-sf .tv-sfc{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;margin-top:12px;}',
      '.tv-sf .tv-sfl{font-size:17px;color:#9AA6B4;}',
      '.tv-sf .tv-sfx{box-sizing:border-box;padding:7px 14px;border-radius:20px;background:#172029;border:2px solid #3B4656;color:#FFFFFF;font-size:17px;font-weight:700;white-space:nowrap;outline:none !important;cursor:pointer;}',
      '.tv-sf .tv-sfx.clr{background:transparent;border-color:transparent;color:#F4C242;}',
      '.tv-sf .tv-sfx:focus{background:#FFB347;border-color:#FFB347;color:#1A1A1A;box-shadow:none !important;}',
      '#tv-sfp{position:fixed;z-index:99300;box-sizing:border-box;padding:12px;border-radius:14px;background:#121922;border:2px solid #2A323C;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;max-height:calc(100vh - 40px);max-width:calc(100vw - 40px);overflow-y:auto;scrollbar-width:none;min-width:260px;}',
      '#tv-sfp::-webkit-scrollbar{display:none;}',
      '#tv-sfp.wide{width:1100px;}',
      '#tv-sfp .tv-sfph{padding:2px 6px 8px 6px;font-size:13px;font-weight:700;letter-spacing:1px;color:#F4C242;}',
      '#tv-sfp .tv-sfi{display:flex;align-items:baseline;gap:10px;box-sizing:border-box;padding:8px 12px;margin:2px 0;border-radius:8px;border:2px solid transparent;font-size:17px;font-weight:600;color:#C9D2DC;outline:none !important;cursor:pointer;break-inside:avoid;min-width:0;}',
      '#tv-sfp .tv-sfi .n{margin-left:auto;font-size:13px;font-weight:700;opacity:.75;}',
      '#tv-sfp .tv-sfi.cur{color:#F4C242;}',
      '#tv-sfp .tv-sfi:focus{background:#172029;border-color:#F4C242;color:#FFFFFF;font-weight:700;box-shadow:none !important;}',
      '#tv-sfp .tv-sfcols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px 10px;align-items:start;}',
      '#tv-sfp .tv-sfcol{min-width:0;}',
      '#tv-sfp .tv-sfh{padding:8px 6px 4px 6px;font-size:13px;font-weight:700;color:#F4C242;white-space:nowrap;}',
      '#tv-sfp .tv-sfgrid{display:grid;gap:0 10px;}',
      '#tv-sfp .tv-sfgrid.c1{grid-template-columns:minmax(0,1fr);}#tv-sfp .tv-sfgrid.c2{grid-template-columns:repeat(2,minmax(0,1fr));}#tv-sfp .tv-sfgrid.c3{grid-template-columns:repeat(3,minmax(0,1fr));}',
      '#tv-sfp .tv-sftabs{display:flex;gap:10px;margin:6px 0 10px 0;}',
      '#tv-sfp .tv-sftabs .tv-sfi{font-weight:700;padding:8px 26px;}',
      '#tv-sfp .tv-sftabs .tv-sfi.on{color:#F4C242;}',
      '#tv-sfp .tv-sfaz{column-count:4;column-gap:10px;}',
      '#tv-sfp .tv-sfaz .tv-sfi{font-size:15px;padding:6px 8px;}',
      '#tv-sfp .tv-sflt{padding:8px 8px 2px 8px;font-size:13px;font-weight:800;color:#F4C242;break-after:avoid;}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(css);
    return { mount: mount };
  })();
  window.__tvScopeFilter = SF;

  if (map) setTimeout(fillThumbs, 5000);
  var fresh = 0;
  try { var saved = kept(), ids = Object.keys((saved && saved.map) || {}); if (ids.length && saved.map[ids[0]].x) fresh = saved.t || 0; } catch (e) {}   // a list without the wrestler data is never kept
  // 2.97.0: once, the whole list, so the copy gets the complete-years fields (tournament, block and title ids, the
  // site's title) from the updated sheet script. An older script simply doesn't send them; the pages fall back.
  // 2.118.0: shape 4, each wrestler's faction (fa) and the match's moments (mo) for complete-career wrestler pages.
  // 2.122.0: shape 7, a full list once more for the English version field (lg).
  // 2.121.3: shape 6, the same once more now that the list is kept in the app's files (2.121.2's could not be saved).
  // 2.121.2: shape 5, one more full list on every TV (the 2018 sweep's merges, billed names and tags never reached the
  // TVs' copies), then a full list again whenever the roster file's starscope.refresh is newer than the last one.
  var shapeOk = false; try { shapeOk = localStorage.getItem('tvVixCardsShape') === '7'; } catch (e) {}
  var rf = ''; try { rf = String(H.scopeRefresh ? H.scopeRefresh() : '' || ''); } catch (e) { rf = ''; }
  var rfAt = ''; try { rfAt = localStorage.getItem('tvVixCardsRefresh') || ''; } catch (e) {}
  if (!shapeOk && SHEET) { try { localStorage.setItem('tvVixCardsShape', '7'); localStorage.setItem('tvVixCardsRefresh', rf); } catch (e) {} ask({ full: true }); }
  else if (SHEET && rf && rf > rfAt) { try { localStorage.setItem('tvVixCardsRefresh', rf); } catch (e) {} ask({ full: true }); }
  else if (Date.now() - fresh > AGE) ask();
  function start() { soon(); new MutationObserver(soon).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
