(function(){
  // New Horizons era page, StarScope version (2.109.0). Read by the Eras page script (MainActivity eraJs) for an era with
  // a "scope" block in assets/eras.json. Only picks are written by hand there; everything else is looked up here when
  // the page opens:
  //  - reigns (holder, days, defences, every reign in the era, the champion now) from the lineage files, every build;
  //  - factions (members, formed, disbanded) from factions.json, every build;
  //  - counts, match thumbnails, show posters and rivalry match lists from the StarScope list the TV already keeps
  //    (window.__tvScopeIdx, assets/starcards.js), only once every year in scope.index.years is a complete year.
  // Nothing here asks the video site for anything: pictures are the site's own thumbnails, loaded as the page draws.
  // 2.109.1: one pass over the list per drawing, cut-outs filled in after the page is drawn (so it answers at once),
  // reigns back to the featured cards only, no thumbnails behind reigns or rivalries, posters exactly as on Shows.
  if (window.__tvEraNew) return;
  var H = window.AndroidHost || {};
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function parse(s) { try { return JSON.parse(s || 'null'); } catch (e) { return null; } }
  function call(fn, a) { try { return H[fn] ? (arguments.length > 1 ? H[fn](a) : H[fn]()) : ''; } catch (e) { return ''; } }
  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_-]+/g, ''); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function monY(d) { var a = String(d || '').split('-'); if (a.length < 2) return ''; return isJa() ? a[0] + '年' + (+a[1]) + '月' : MON[+a[1] - 1] + ' ' + a[0]; }
  function today() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }   // Japan time
  function days(a, b) { return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86400000)); }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function initials(n) { var p = String(n).trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }
  function idx() { return window.__tvScopeIdx || null; }
  function priv() { try { return !!(H.videoIndexOn && H.videoIndexOn()); } catch (e) { return false; } }

  // ---- data read once
  var LIN = {}, FACS = null, DEB = null, TOP = null, STARS = null, CUT = {};
  function lineage(b) { if (LIN[b] === undefined) LIN[b] = parse(call('lineageJson', b)); return LIN[b]; }
  function facs() {
    if (!FACS) { FACS = {}; ((parse(call('factionsJson')) || {}).factions || []).forEach(function(f) { FACS[f.id] = f; }); }
    return FACS;
  }
  function debuts() {
    if (!DEB) { DEB = {}; var D = (parse(call('matchTypesJson')) || {}).debuts || {}; Object.keys(D).forEach(function(k) { if (k.charAt(0) !== '_') DEB[norm(k)] = String(D[k] || ''); }); }
    return DEB;
  }
  function topList() { if (!TOP) TOP = ((parse(call('topMatchesJson')) || {}).matches) || []; return TOP; }
  function stars() { if (STARS === null) STARS = call('spotStars') || ''; return STARS; }
  function cutout(n) { if (!n) return ''; if (CUT[n] === undefined) CUT[n] = call('wrestlerCutout', n) || ''; return CUT[n]; }
  var BELTS = ['world', 'wonder', 'goddess', 'artist', 'highspeed', 'future', 'newblood'];
  var BELT_SHORT = { world: 'World', wonder: 'Wonder', goddess: 'Goddess', artist: 'Artist', highspeed: 'High Speed', future: 'Future', newblood: 'NEW BLOOD' };
  function champNames(c) { return String(c || '').split(/\s*&\s*|\s*,\s*/).map(norm); }

  // ---- the switch: every year of the era is a StarScope complete year, and the list is on this TV
  function scopeOn(e) {
    var X = idx(), S = e && e.scope;
    if (!X || !S || !S.index || !X.ready || !X.ready()) return false;
    var ys = (X.years() || []).map(String);
    return (S.index.years || []).every(function(y) { return ys.indexOf(String(y)) >= 0; });
  }
  // Still waiting for assets/starcards.js (it loads after the Eras page script)?
  function scopePending(e) { return !!(e && e.scope && !idx() && H.scopeOn && call('scopeOn')); }
  function from(e) { return (e.scope && e.scope.from) || ''; }
  var EL = { key: '', list: [], people: {}, at: 0 };
  function eraList(e) {
    var X = idx(), f = from(e);
    if (!X) return [];
    if (EL.key === f && Date.now() - EL.at < 2000) return EL.list;   // the same drawing: read once
    // 2.111.2: one entry per match (a linked English video is the same match, it was counted twice).
    var L = X.find(function(v) { return String(v.d || '') >= f; });
    EL = { key: f, at: Date.now(), list: X.oneEach ? X.oneEach(L) : L, people: null };
    return EL.list;
  }
  // Matches per wrestler (by every name key), counted in one pass.
  function peopleCount(e) {
    var list = eraList(e);
    if (EL.people) return EL.people;
    var c = {};
    list.forEach(function(x) { var seen = {}; (x.v.p || []).forEach(function(sd) { sd.forEach(function(p) { (p[0] || []).forEach(function(k) { if (!seen[k]) { seen[k] = 1; c[k] = (c[k] || 0) + 1; } }); }); }); });
    EL.people = c;
    return c;
  }

  var css = [
    '#tv-era .tvn-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;}',
    '#tv-era .tvn-stat{background:#121922;border:2px solid #2A323C;border-radius:12px;padding:10px 14px;}',
    '#tv-era .tvn-stat b{display:block;font-size:26px;font-weight:900;color:#fff;line-height:1.05;}',
    '#tv-era .tvn-stat span{display:block;margin-top:3px;font-size:12px;font-weight:800;letter-spacing:.1em;color:#F4C242;text-transform:uppercase;}',
    '#tv-era .tvn-now{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;background:#F4C242;color:#1A1A1A;font-size:11px;font-weight:800;letter-spacing:.06em;vertical-align:2px;}',
    // 2.111.0: top rated as StarScope video cards in a sideways row, like the reign detail row: four across, 24 apart,
    // scrollbar hidden, look C focus (padding so the ring and lift aren't cut off); rating badge top right as on the
    // StarScope page's Top sort; the All N matches tile is the row's last card.
    '#tv-era .tvn-hr{display:flex;flex-direction:row;align-items:stretch;gap:24px;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;padding:12px 10px;margin:0 -10px;scrollbar-width:none;}',
    '#tv-era .tvn-hr::-webkit-scrollbar{display:none;}',
    '#tv-era .tvn-mc{flex:0 0 calc(25% - 18px);max-width:calc(25% - 18px);display:block;position:relative;min-width:0;border-radius:8px;background:#1A1A1A;overflow:hidden;color:#fff;text-decoration:none;outline:none;}',
    '#tv-era a.tvn-mc:focus{outline:3px solid #F4C242 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(244,194,66,.8) !important;transform:scale(1.03);z-index:5;}',
    '#tv-era .tvn-mc .im{height:0;padding-top:56.25%;background:#161F2A center/cover no-repeat;}',
    '#tv-era .tvn-mc .bd{position:absolute;right:8px;top:8px;background:#F4C242;color:#1A1A1A;font:800 13px Arial;padding:3px 8px;border-radius:4px;}',
    '#tv-era .tvn-mc .tvsc-host{padding:11px 14px 13px;}',
    '#tv-era .tvn-all{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:14px;font-size:17px;font-weight:800;color:#F4C242;background:#161F2A;}',
    '#tv-era .tvn-all span{display:block;margin-top:6px;font-size:13px;font-weight:600;color:#9AA6B4;}',
    '#tv-era .tvn-rvs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}',
    '#tv-era .tvn-rv{display:block;background:#161F2A;border:3px solid #2A323C;border-radius:12px;overflow:hidden;}',
    '#tv-era .tvn-rv:focus{border-color:#F4C242;background:#172029;}',
    '#tv-era .tvn-rv .pic{position:relative;height:150px;background:#0B1118 var(--tv-era-stars) center/cover no-repeat;overflow:hidden;}',
    '#tv-era .tvn-rv .ct{position:absolute;bottom:0;height:146px;width:auto;max-width:52%;object-fit:contain;filter:drop-shadow(0 0 8px rgba(11,17,24,.9));}',
    '#tv-era .tvn-rv .ct.l{left:4px;}#tv-era .tvn-rv .ct.r{right:4px;}',
    '#tv-era .tvn-rv .ini{position:absolute;bottom:22px;width:84px;height:84px;border-radius:50%;border:2px dashed #3B4656;background:#0F151C;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#C9D2DC;}',
    '#tv-era .tvn-rv .ini.l{left:22px;}#tv-era .tvn-rv .ini.r{right:22px;}',
    '#tv-era .tvn-rv .vs{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:20px;font-weight:900;color:#F4C242;text-shadow:0 0 8px #0B1118;}',
    '#tv-era .tvn-rv .lg{position:absolute;bottom:6px;width:54px;height:38px;object-fit:contain;}',
    '#tv-era .tvn-rv .lg.l{left:6px;}#tv-era .tvn-rv .lg.r{right:6px;}',
    '#tv-era .tvn-rv .tx{padding:9px 12px 11px 12px;}',
    '#tv-era .tvn-rv .a{font-size:16px;font-weight:800;line-height:1.2;}',
    '#tv-era .tvn-rv .b{font-size:13px;font-weight:600;color:#C9D2DC;margin-top:3px;line-height:1.25;}',
    '#tv-era .tvn-rv .c{font-size:13px;font-weight:700;color:#F4C242;margin-top:4px;}',
    // Shows: the StarScope Shows grid itself (three to a row, 24 apart); the cards bring their own styles (starcards.js).
    '#tv-era .tvp{font-family:Arial,Helvetica,sans-serif;}',
    '#tv-era .tvp .sgr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start;}',
    '#tv-era .tvn-allb{display:flex;align-items:center;justify-content:space-between;margin-top:14px;height:52px;padding:0 18px;background:#161F2A;border:3px solid #2A323C;border-radius:8px;font-size:17px;font-weight:700;color:#fff;}',
    '#tv-era .tvn-allb span{font-size:13px;font-weight:600;color:#9AA6B4;}',
    '#tv-era .tvn-allb:focus{border-color:#F4C242;background:#172029;}',
    '#tv-era .tvn-pp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}',
    '#tv-era .tvn-pt{display:flex;gap:10px;align-items:center;background:#161F2A;border:3px solid #2A323C;border-radius:8px;padding:6px 10px 6px 6px;min-width:0;}',
    '#tv-era .tvn-pt:focus{border-color:#F4C242;background:#172029;}',
    '#tv-era .tvn-pt .ph{width:74px;height:74px;flex:0 0 auto;border-radius:8px;background:#0F151C;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#C9D2DC;}',
    '#tv-era .tvn-pt .a{font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-era .tvn-pt .b{font-size:12px;font-weight:600;color:#9AA6B4;margin-top:2px;}',
    '#tv-era .tvn-pt .c{font-size:12px;font-weight:700;color:#F4C242;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    // 2.110.0: renders on the reign cards (right side, under the text), tag team tiles
    '#tv-era .tvn-rcard{position:relative;overflow:hidden;}',
    '#tv-era .tvn-rcard .tv-rrow{position:relative;z-index:1;}',
    '#tv-era .tvn-rr{position:absolute;right:0;bottom:0;height:100%;display:flex;align-items:flex-end;justify-content:flex-end;pointer-events:none;}',
    '#tv-era .tvn-rr img{height:96%;width:auto;max-width:150px;object-fit:contain;object-position:bottom;margin-left:-34px;-webkit-mask-image:linear-gradient(to bottom,#000 70%,transparent 100%);}',
    '#tv-era .tvn-rv .lgb{position:absolute;top:50%;transform:translateY(-50%);width:42%;height:118px;object-fit:contain;}',
    '#tv-era .tvn-rv .lgb.l{left:4%;}#tv-era .tvn-rv .lgb.r{right:4%;}',
    '#tv-era .tvn-rv .inif{position:absolute;top:50%;transform:translateY(-50%);width:42%;text-align:center;font-size:22px;font-weight:900;color:#C9D2DC;}',
    '#tv-era .tvn-rv .inif.l{left:4%;}#tv-era .tvn-rv .inif.r{right:4%;}',
    '#tv-era .tvn-tt .ph{width:110px;display:flex;gap:2px;background:none;}',
    '#tv-era .tvn-tt .ph i{flex:1 1 0;height:74px;border-radius:8px;background:#0F151C;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:17px;font-weight:900;color:#C9D2DC;}',
    '#tv-era .tvn-dbg{margin-top:18px;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:10px 14px;font-size:13px;color:#fff;}',
    '#tv-era .tvn-dbg .h{font-size:13px;font-weight:800;letter-spacing:.14em;color:#F4C242;margin-bottom:6px;}',
    '#tv-era .tvn-dbg .r{display:flex;gap:10px;}#tv-era .tvn-dbg .r i{font-style:normal;color:#9AA6B4;width:28px;text-align:right;}'
  ].join('\n');
  // Own styles once; the poster card styles once StarScope's list is there (2.109.1: they were missed when the page
  // drew before it, which left the posters unstyled).
  var cssDone = false, showCssDone = false;
  function addCss() {
    var X = idx();
    if (!cssDone) {
      cssDone = true;
      var st = document.createElement('style');
      st.textContent = css;
      (document.head || document.documentElement).appendChild(st);
    }
    if (!showCssDone && X && X.showCss) {
      showCssDone = true;
      var s2 = document.createElement('style');
      s2.textContent = X.showCss('#tv-era .tvp');
      (document.head || document.documentElement).appendChild(s2);
    }
  }

  // ---- title reigns (lineage files; every build)
  function reignsOf(b, e) {
    var L = lineage(b), f = from(e), t = today();
    if (!L || !L.reigns) return null;
    var all = L.reigns.slice().sort(function(x, y) { return x.n - y.n; });
    var era = all.filter(function(r) { return String(r.won || '') <= t && String(r.end || '9999') >= f; });
    return { L: L, all: all, era: era };
  }
  function isNow(r) { return !r.end && !r.endType; }
  function reignNo(all, r) { var k = norm(r.champ), n = 0; all.forEach(function(x) { if (x.n <= r.n && norm(x.champ) === k) n++; }); return n; }
  function beltPic(b) {
    var pic = call('beltDataUri', b);
    if (pic) return '<img src="' + esc(pic) + '" alt="">';
    return '<svg width="104" height="52" viewBox="0 0 120 60" fill="none" stroke="#F4C242" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="20" width="112" height="20" rx="5" fill="' + (b === 'world' ? '#2A1C10' : '#2A323C') + '"></rect><circle cx="60" cy="30" r="21" fill="#161F2A"></circle><circle cx="60" cy="30" r="12"></circle></svg>';
  }
  // 2.109.1: the featured reign of each belt only (no list of every champion); holder, reign number, days and defences
  // read from the lineage file, so they stay right.
  function reigns(e) {
    var olds = {};
    (e.reigns || []).forEach(function(r) { olds[r.beltId] = r; });
    return '<div class="tv-rg">' + (e.scope.reigns || []).map(function(c) {
      var R = reignsOf(c.beltId, e);
      if (!R || !R.era.length || c.chips) return '';
      var old = olds[c.beltId] || {};
      var fr = R.era.filter(function(r) { return r.n === c.feature; })[0];
      if (!fr) fr = R.era.slice().sort(function(x, y) { return days(y.won, y.end || today()) - days(x.won, x.end || today()); })[0];
      var d = days(fr.won, fr.end || today()), df = (fr.defences || []).length, no = reignNo(R.all, fr);
      var holder = fr.champ + ' · ' + T(ord(no) + ' reign', no + '度目');
      var stat = T(d + ' days · ' + df + (df === 1 ? ' defence' : ' defences'), d + '日 · 防衛' + df + '回');
      var cuts = String(fr.champ).split(/\s*&\s*|\s*,\s*/).join('|');
      return '<div class="tv-rc"><a class="tv-card tvn-rcard" tabindex="0" href="/mypage?tvch=' + esc(c.beltId) + '&tvrn=' + fr.n + '"><div class="tvn-rr" data-cuts="' + esc(cuts) + '"></div><div class="tv-rrow"><div class="tv-belt">' + beltPic(c.beltId) + '</div><div class="notranslate" translate="no"><div class="tv-1">' + esc(R.L.title.replace(/ Championship$/, '')) + (old.belt ? ' <s>· ' + esc(old.belt) + '</s>' : '') + '</div><div class="tv-2">' + esc(holder) + (isNow(fr) ? '<span class="tvn-now">' + esc(T('NOW', '現王者')) + '</span>' : '') + '</div><div class="tv-3">' + esc(stat) + '</div></div></div></a></div>';
    }).join('') + '</div>';
  }

  // ---- the era in numbers (StarScope)
  function stats(e) {
    var list = eraList(e), f = from(e), t = today(), m = {}, sh = {}, ti = {};
    list.forEach(function(x) { var k = (x.v.x && x.v.x.m) || x.id; m[k] = 1; if (x.v.sid) sh[x.v.sid] = 1; if ((x.v.x.tv || []).length || (x.v.x.ti || []).length) ti[k] = 1; });
    var ch = 0;
    BELTS.forEach(function(b) { var L = lineage(b); ((L && L.reigns) || []).forEach(function(r) { if (String(r.won) >= f && String(r.won) <= t) ch++; }); });
    var ppl = {};
    list.forEach(function(x) { (x.v.p || []).forEach(function(sd) { sd.forEach(function(p) { if (p[0] && p[0][0]) ppl[p[0][0]] = 1; }); }); });
    var it = [[Object.keys(sh).length, T('Shows', '大会')], [Object.keys(m).length, T('Matches', '試合')], [Object.keys(ti).length, T('Title matches', 'タイトルマッチ')], [ch, T('Title changes', '王座移動')], [Object.keys(ppl).length, T('Wrestlers', '選手')]];
    return '<div class="tvn-stats notranslate" translate="no">' + it.map(function(a) { return '<div class="tvn-stat"><b>' + a[0] + '</b><span>' + esc(a[1]) + '</span></div>'; }).join('') + '</div>';
  }

  // ---- top rated: thumbnails (StarScope), from assets/top_matches.json
  function nm(s) { if (s.length >= 5) return s.slice(0, 3).join(', ') + ' +' + (s.length - 3); return s.join(' & '); }
  // The match's own logged video for its thumbnail: the list's address when logged, else any logged copy with the same
  // people (and date when it has one); a copy with a picture first.
  function topLogged(m) {
    var X = idx(), u = String(m.u || ''), mm = /\/contents\/(\d+)/.exec(u), id = mm ? mm[1] : '';
    if (!X) return { id: id, th: '', v: null };
    var v = id ? X.get(id) : null;
    if (v && v.th) return { id: id, th: v.th, v: v };
    var keys = [].concat.apply([], m.s).map(norm), best = null;
    (X.any ? X.any : X.find)(function(w) {
      if (w.d && String(w.d) !== String(m.d)) return false;
      return keys.every(function(k) { return (w.p || []).some(function(sd) { return sd.some(function(p) { return p[0].indexOf(k) >= 0; }); }); });
    }).forEach(function(x) { if (!best || (!best.v.th && x.v.th)) best = x; });
    var bv = v || (best ? best.v : null);
    return { id: id || (best ? best.id : ''), th: bv && bv.th ? bv.th : (best && best.v.th ? best.v.th : ''), v: bv };
  }
  // 2.111.0: the StarScope video card (assets/starcards.js), the same block as on the StarScope pages; a match not in
  // StarScope gets the same layout from top_matches.json (names, date).
  function cardBody(m, v) {
    var C = window.__tvStarCard;
    if (v && v.s && C && C.html) return C.html(v);
    var lines = m.s.map(function(sd, i) { return (i ? 'vs ' : '') + esc(nm(sd)); }).join('<br>');
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(m.d || ''), dt = d ? (isJa() ? d[1] + '年' + (+d[2]) + '月' + (+d[3]) + '日' : MON[+d[2] - 1] + ' ' + (+d[3]) + ', ' + d[1]) : '';
    return '<div class="tvsc notranslate" translate="no"><div class="ev">' + esc(m.n || '') + '</div><div class="nm">' + lines + '</div><div class="ft"><span></span><b>' + esc(dt) + '</b></div></div>';
  }
  function top(e) {
    var list = topList().filter(function(m) { return m.e === e.n; });
    if (!list.length) return '';
    var h = list.slice(0, 5).map(function(m) {
      var lg = topLogged(m), vid = lg.id, th = lg.th;
      var tag = vid ? 'a tabindex="0" href="/contents/' + esc(vid) + '"' : 'div';
      return '<' + tag + ' class="tvn-mc"><div class="im"' + (th ? ' style="background-image:url(\'' + esc(th) + '\')"' : '') + '></div><span class="bd notranslate" translate="no">★ ' + Number(m.r).toFixed(2) + '</span>' +
        '<div class="tvsc-host">' + cardBody(m, lg.v) + '</div></' + (vid ? 'a' : 'div') + '>';
    }).join('');
    h += '<a class="tvn-mc tvn-all" tabindex="0" href="/mypage?tvtop=era&e=' + e.n + '">' + esc(T('All ' + list.length + ' matches', '全' + list.length + '試合')) + '<span>' + esc(T('in this era', 'この時代')) + '</span></a>';
    return '<div class="tvn-hr notranslate" translate="no">' + h + '</div>';
  }

  // ---- rivalries (StarScope)
  function sideName(s) { if (s.t) return s.t; var f = facs()[s.f]; return f ? String(f.name).replace(/ \(.*\)$/, '') : s.f; }
  // The picture is filled in after the page is drawn (fill()), initials until then or when there is no cut-out.
  function face(s, side) {
    // 2.110.0: a faction is its logo alone (its name in letters when the build has no logo), no wrestler.
    if (s.f) return '<div class="inif ' + side + '" data-flogo="' + esc(s.f) + '">' + esc(sideName(s)) + '</div>';
    var n = s.t || '';
    return '<div class="ini ' + side + '" data-cut="' + esc(n) + '">' + esc(initials(s.t || sideName(s))) + '</div>' + (s.f ? '<img class="lg ' + side + '" data-logo="' + esc(s.f) + '" alt="" style="display:none">' : '');
  }
  function rivalries(e) {
    var X = idx(), f = from(e);
    return '<div class="tvn-rvs">' + (e.scope.rivalries || []).map(function(r) {
      var rf = r.from || f, rt = r.to || '';
      var fac = !!(r.a.f && r.b.f), list = (fac ? X.fvs(r.a.f, r.b.f, rf) : X.vs(r.a.t, r.b.t, rf)).filter(function(x) { return !rt || String(x.v.d) <= rt; });
      var ds = list.map(function(x) { return String(x.v.d); }).sort(), sg = list.filter(function(x) { return x.v.x && x.v.x.k === 'singles'; }).length;
      var cnt = list.length + ' ' + T(list.length === 1 ? 'match' : 'matches', '試合') + (fac ? '' : ' (' + sg + ' ' + T('singles', 'シングル') + ')');
      var rng = ds.length ? (monY(ds[0]) === monY(ds[ds.length - 1]) ? monY(ds[0]) : monY(ds[0]) + ' – ' + monY(ds[ds.length - 1])) : '';
      var href = '/mypage?tvscope=' + (fac ? 'f&a=' + encodeURIComponent(r.a.f) + '&b=' + encodeURIComponent(r.b.f) : 'v&a=' + encodeURIComponent(r.a.t) + '&b=' + encodeURIComponent(r.b.t)) + '&from=' + encodeURIComponent(rf) + (rt ? '&to=' + encodeURIComponent(rt) : '');
      return '<a class="tvn-rv notranslate" translate="no" tabindex="0" href="' + esc(href) + '"><div class="pic">' + face(r.a, 'l') + face(r.b, 'r') + '<span class="vs">VS</span></div>' +
        '<div class="tx"><div class="a notranslate" translate="no">' + esc(sideName(r.a) + ' vs ' + sideName(r.b)) + '</div><div class="b">' + esc(r.line || '') + '</div><div class="c">' + esc(cnt + (rng ? ' · ' + rng : '')) + '</div></div></a>';
    }).join('') + '</div>';
  }

  // ---- must-see shows: StarScope poster cards
  // 2.109.1: the StarScope Shows page's own cards in its own grid, so they look exactly the same; then one bar to the
  // full Shows page.
  function shows(e) {
    var X = idx(), cards = (e.scope.shows || []).map(function(s) {
      var h = X.showCard(s.sid);
      return h.replace(/<a class="sc"/, '<a class="sc" tabindex="0"').replace(/ data-bg="([^"]*)"/g, ' style="background-image:url(\'$1\')"');
    }).filter(Boolean);
    if (!cards.length) return '';
    return '<div class="tvp notranslate" translate="no"><div class="sgr">' + cards.join('') + '</div></div>';
  }

  // ---- wrestlers and rising stars
  function beltsHeld(name, f) {
    var k = norm(name), out = [];
    BELTS.forEach(function(b) {
      var L = lineage(b);
      if (((L && L.reigns) || []).some(function(r) { return String(r.end || '9999') >= f && champNames(r.champ).indexOf(k) >= 0; })) out.push(T(BELT_SHORT[b], BELT_SHORT[b]));
    });
    return out;
  }
  function firstTitle(name) {
    var k = norm(name), best = null;
    BELTS.forEach(function(b) { var L = lineage(b); ((L && L.reigns) || []).forEach(function(r) { if (champNames(r.champ).indexOf(k) >= 0 && (!best || String(r.won) < best.d)) best = { d: String(r.won), b: b }; }); });
    return best;
  }
  function person(name, e, rising, withScope) {
    var f = from(e), n = withScope ? (peopleCount(e)[norm(name)] || 0) : 0;
    var bl = beltsHeld(name, f), line = withScope ? n + ' ' + T('matches in this era', '試合（この時代）') : '';
    if (rising) {
      var db = debuts()[norm(name)], ft = firstTitle(name);
      if (db && db >= f) line = T('Debut ', 'デビュー ') + monY(db) + (line ? ' · ' + line : '');
      else if (ft && ft.d >= f) line = T('First title ', '初戴冠 ') + monY(ft.d) + (line ? ' · ' + line : '');
    }
    return '<a class="tvn-pt notranslate" translate="no" tabindex="0" href="/mypage?tvwr=' + encodeURIComponent(name) + '"><div class="ph" data-star="' + esc(name) + '">' + esc(initials(name)) + '</div><div style="min-width:0"><div class="a">' + esc(name) + '</div><div class="b">' + esc(line) + '</div><div class="c">' + esc(bl.join(' · ')) + '</div></div></a>';
  }
  // 2.110.0: top tag teams, the pairs that teamed most often in straight 2 v 2 matches in the era.
  function tagTeams(e, count) {
    var c = {}, tn = {};
    eraList(e).forEach(function(x) {
      var v = x.v, S = v.s || [];
      if (S.length !== 2 || S[0].length !== 2 || S[1].length !== 2) return;
      S.forEach(function(sd, i) {
        var k = sd.slice().sort().join(' & ');
        c[k] = (c[k] || 0) + 1;
        var t = v.tn && v.tn[i]; if (t) { var o = tn[k] = tn[k] || {}; o[t] = (o[t] || 0) + 1; }
      });
    });
    var keys = Object.keys(c).sort(function(a, b) { return c[b] - c[a] || a.localeCompare(b); }).slice(0, count || 4);
    return '<div class="tvn-pp">' + keys.map(function(k) {
      var ab = k.split(' & '), names = tn[k] ? Object.keys(tn[k]).sort(function(a, b) { return tn[k][b] - tn[k][a]; }) : [];
      return '<a class="tvn-pt tvn-tt notranslate" translate="no" tabindex="0" href="/mypage?tvscope=t&a=' + encodeURIComponent(ab[0]) + '&b=' + encodeURIComponent(ab[1]) + '"><div class="ph"><i data-star="' + esc(ab[0]) + '" data-half="left">' + esc(initials(ab[0])) + '</i><i data-star="' + esc(ab[1]) + '" data-half="right">' + esc(initials(ab[1])) + '</i></div>' +
        '<div style="min-width:0"><div class="a">' + esc(names[0] || k) + '</div><div class="b">' + esc(names[0] ? k : '') + '</div><div class="c">' + c[k] + ' ' + esc(T('matches together', '試合（タッグ）')) + '</div></div></a>';
    }).join('') + '</div>';
  }
  function people(list, e, rising, withScope) { return '<div class="tvn-pp">' + (list || []).map(function(n) { return person(n, e, rising, withScope); }).join('') + '</div>'; }

  // ---- factions (factions.json; counts with StarScope)
  function factions(e, withScope) {
    var F = facs(), f = from(e), list = withScope ? eraList(e) : [];
    return (e.scope.factions || []).map(function(id) {
      var x = F[id];
      if (!x) return '';
      var keys = (x.members || []).map(function(m) { return norm(m.search || m.name); });
      var n = list.filter(function(it) { return (it.v.p || []).some(function(sd) { return sd.length >= 2 && sd.every(function(p) { return p[0].some(function(k) { return keys.indexOf(k) >= 0; }); }); }); }).length;
      var pic = call('factionLogo', id), nmx = String(x.name).replace(/ \(.*\)$/, '');
      var facts = [];
      if (x.founded && String(x.founded) >= f.slice(0, 4)) facts.push(T('Formed ', '結成 ') + x.founded);
      if (x.former) facts.push(T('Disbanded ', '解散 ') + (x.disbanded || ''));
      if (withScope) facts.push(n + ' ' + T('unit matches', 'ユニット戦'));
      var path = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(x.search || x.name) + '&tvfaction=' + encodeURIComponent(id);
      return '<a class="tv-tile tv-fac notranslate" translate="no" tabindex="0" href="' + esc(path) + '"><div class="tv-fmark' + (pic ? ' tv-pic' : '') + '">' + (pic ? '<img src="' + esc(pic) + '" alt="">' : esc(nmx.slice(0, 2))) + '</div><div style="min-width:0"><div class="nm">' + esc(nmx) + '</div>' +
        '<div style="font-size:12px;font-weight:600;color:#9AA6B4;margin-top:2px">' + esc((x.members || []).map(function(m) { return m.name; }).join(', ')) + '</div>' +
        (facts.length ? '<div style="font-size:12px;font-weight:700;color:#F4C242;margin-top:2px">' + esc(facts.join(' · ')) + '</div>' : '') + '</div></a>';
    }).join('');
  }

  // ---- era picks (your build): the pairings that met most often in singles, to check the rivalry picks against
  function picks(e) {
    if (!priv()) return '';
    var c = {}, rng = {};
    eraList(e).forEach(function(x) {
      var v = x.v;
      if (!v.x || v.x.k !== 'singles' || !v.s || v.s.length !== 2) return;
      var k = [v.s[0][0], v.s[1][0]].sort().join(' vs ');
      c[k] = (c[k] || 0) + 1; (rng[k] = rng[k] || []).push(String(v.d));
    });
    var top10 = Object.keys(c).sort(function(a, b) { return c[b] - c[a] || a.localeCompare(b); }).slice(0, 10);
    return '<div class="tvn-dbg notranslate" translate="no"><div class="h">ERA PICKS · SINGLES MET MOST OFTEN SINCE ' + esc(from(e)) + '</div>' + top10.map(function(k) {
      var d = rng[k].sort(); return '<div class="r"><i>' + c[k] + '</i><span>' + esc(k) + '</span><span style="color:#9AA6B4">' + esc(d[0] + ' – ' + d[d.length - 1]) + '</span></div>';
    }).join('') + '</div>';
  }

  // ---- pictures after the page is drawn: the star field once (a CSS variable), then each cut-out and logo in turn,
  // a few milliseconds apart, so the page can be used while they arrive.
  var fillTimer = null;
  function fill(root) {
    if (fillTimer) { clearTimeout(fillTimer); fillTimer = null; }
    var jobs = [];
    if (root.querySelector('.tvn-rv') && !document.getElementById('tvn-stars')) jobs.push(function() {
      var u = stars();
      if (!u) return;
      var st = document.createElement('style'); st.id = 'tvn-stars';
      st.textContent = '#tv-era{--tv-era-stars:url(' + u + ');}';
      (document.head || document.documentElement).appendChild(st);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-cut]'), function(el) {
      jobs.push(function() {
        var c = cutout(el.getAttribute('data-cut'));
        if (!c || !el.parentNode) return;
        var im = document.createElement('img'); im.className = 'ct ' + (el.classList.contains('l') ? 'l' : 'r'); im.alt = ''; im.src = c;
        el.parentNode.replaceChild(im, el);
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-cuts]'), function(el) {
      jobs.push(function() {
        el.getAttribute('data-cuts').split('|').forEach(function(n) { var c = cutout(n); if (c) { var im = document.createElement('img'); im.alt = ''; im.src = c; el.appendChild(im); } });
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-flogo]'), function(el) {
      jobs.push(function() {
        var lg = call('factionLogo', el.getAttribute('data-flogo'));
        if (!lg || !el.parentNode) return;
        var im = document.createElement('img'); im.className = 'lgb ' + (el.classList.contains('l') ? 'l' : 'r'); im.alt = ''; im.src = lg;
        el.parentNode.replaceChild(im, el);
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-logo]'), function(el) {
      jobs.push(function() { var lg = call('factionLogo', el.getAttribute('data-logo')); if (lg) { el.src = lg; el.style.display = ''; } });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-star]'), function(el) {
      jobs.push(function() {
        var sb = window.__tvStar ? window.__tvStar([el.getAttribute('data-star')], el.getAttribute('data-half') || 'card') : '';
        if (sb) { el.setAttribute('style', sb); el.textContent = ''; }
      });
    });
    function next() { var j = jobs.shift(); if (!j) { fillTimer = null; return; } try { j(); } catch (x) {} fillTimer = setTimeout(next, 30); }
    fillTimer = setTimeout(next, 150);
  }

  window.__tvEraNew = {
    has: function(e) { return !!(e && e.scope); },
    scopeOn: scopeOn, scopePending: scopePending, addCss: addCss,
    stats: stats, reigns: reigns, top: top, rivalries: rivalries, shows: shows,
    people: people, tagTeams: tagTeams, factions: factions, picks: picks, fill: fill
  };
})();
