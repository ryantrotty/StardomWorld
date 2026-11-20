(function(){
  // New Horizons era page, StarScope version (2.109.0). Read by the Eras page script (MainActivity eraJs) for an era with
  // a "scope" block in assets/eras.json. Only picks are written by hand there; everything else is looked up here when
  // the page opens:
  //  - reigns (holder, days, defences, every reign in the era, the champion now) from the lineage files, every build;
  //  - factions (members, formed, disbanded) from factions.json, every build;
  //  - counts, match thumbnails, show posters and rivalry match lists from the StarScope list the TV already keeps
  //    (window.__tvScopeIdx, assets/starcards.js), only once every year in scope.index.years is a complete year.
  // Nothing here asks the video site for anything: pictures are the site's own thumbnails, loaded as the page draws.
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
  function eraList(e) {
    var X = idx(), f = from(e);
    if (!X) return [];
    return X.find(function(v) { return String(v.d || '') >= f; });
  }

  var css = [
    '#tv-era .tvn-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;}',
    '#tv-era .tvn-stat{background:#121922;border:2px solid #2A323C;border-radius:12px;padding:10px 14px;}',
    '#tv-era .tvn-stat b{display:block;font-size:26px;font-weight:900;color:#fff;line-height:1.05;}',
    '#tv-era .tvn-stat span{display:block;margin-top:3px;font-size:12px;font-weight:800;letter-spacing:.1em;color:#F4C242;text-transform:uppercase;}',
    '#tv-era .tvn-rc{position:relative;background-size:cover;background-position:center;}',
    '#tv-era .tvn-rc .tv-card{background:rgba(15,21,28,.86);}',
    '#tv-era .tvn-rc .tv-card:focus{background:rgba(23,32,41,.9);}',
    '#tv-era .tvn-now{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;background:#F4C242;color:#1A1A1A;font-size:11px;font-weight:800;letter-spacing:.06em;vertical-align:2px;}',
    '#tv-era a.tv-pill.tvn-cur{border-color:#F4C242;color:#fff;}',
    '#tv-era .tvn-mini{display:flex;gap:14px;align-items:center;background:#161F2A;border:3px solid #2A323C;border-radius:12px;padding:8px 12px;flex:1 1 0;min-width:0;}',
    '#tv-era .tvn-mini .tv-belt{width:70px;height:38px;}',
    '#tv-era .tvn-mini .tv-oth{margin:0;}',
    '#tv-era .tvn-trs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;}',
    '#tv-era .tvn-tr{display:block;background:#161F2A;border:3px solid #2A323C;border-radius:8px;overflow:hidden;position:relative;}',
    '#tv-era a.tvn-tr:focus{border-color:#F4C242;background:#172029;}',
    '#tv-era .tvn-tr .im{height:0;padding-top:56.25%;background:#172029 center/cover no-repeat;}',
    '#tv-era .tvn-tr .sc{position:absolute;left:8px;top:8px;background:#F4C242;color:#1A1A1A;border-radius:4px;padding:2px 7px;font-size:13px;font-weight:800;}',
    '#tv-era .tvn-tr .a{padding:7px 10px 0 10px;font-size:14px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;}',
    '#tv-era .tvn-tr .b{padding:2px 10px 9px 10px;font-size:12px;font-weight:600;color:#9AA6B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-era .tvn-all{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:14px;font-size:15px;font-weight:800;color:#F4C242;}',
    '#tv-era .tvn-rvs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}',
    '#tv-era .tvn-rv{display:block;background:#161F2A;border:3px solid #2A323C;border-radius:12px;overflow:hidden;}',
    '#tv-era .tvn-rv:focus{border-color:#F4C242;background:#172029;}',
    '#tv-era .tvn-rv .pic{position:relative;height:150px;background:#0B1118 center/cover no-repeat;overflow:hidden;}',
    '#tv-era .tvn-rv .th{position:absolute;inset:0;background:center/cover no-repeat;opacity:.8;-webkit-mask-image:radial-gradient(ellipse 62% 70% at 50% 45%,#000 0%,rgba(0,0,0,.75) 55%,rgba(0,0,0,.25) 82%,transparent 100%);}',
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
    '#tv-era .tvn-shs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) 210px;gap:16px;align-items:start;}',
    '#tv-era .tvp .sc{border-radius:12px;}',
    '#tv-era .tvp .sc:focus{background:#172029;}',
    '#tv-era .tvn-shs .tvn-all{background:#161F2A;border:3px solid #2A323C;border-radius:12px;min-height:180px;}',
    '#tv-era .tvn-shs .tvn-all:focus{border-color:#F4C242;background:#172029;}',
    '#tv-era .tvn-pp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}',
    '#tv-era .tvn-pt{display:flex;gap:10px;align-items:center;background:#161F2A;border:3px solid #2A323C;border-radius:8px;padding:6px 10px 6px 6px;min-width:0;}',
    '#tv-era .tvn-pt:focus{border-color:#F4C242;background:#172029;}',
    '#tv-era .tvn-pt .ph{width:74px;height:74px;flex:0 0 auto;border-radius:8px;background:#0F151C;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#C9D2DC;}',
    '#tv-era .tvn-pt .a{font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-era .tvn-pt .b{font-size:12px;font-weight:600;color:#9AA6B4;margin-top:2px;}',
    '#tv-era .tvn-pt .c{font-size:12px;font-weight:700;color:#F4C242;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-era .tvn-dbg{margin-top:18px;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:10px 14px;font-size:13px;color:#fff;}',
    '#tv-era .tvn-dbg .h{font-size:13px;font-weight:800;letter-spacing:.14em;color:#F4C242;margin-bottom:6px;}',
    '#tv-era .tvn-dbg .r{display:flex;gap:10px;}#tv-era .tvn-dbg .r i{font-style:normal;color:#9AA6B4;width:28px;text-align:right;}'
  ].join('\n');
  var cssDone = false;
  function addCss() {
    if (cssDone) return;
    cssDone = true;
    var X = idx(), st = document.createElement('style');
    st.textContent = css + (X && X.showCss ? X.showCss('#tv-era .tvp') : '');
    (document.head || document.documentElement).appendChild(st);
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
  function winThumb(b, r) {
    var X = idx();
    if (!X) return '';
    var keys = champNames(r.champ), hit = X.find(function(v) {
      if (String(v.d) !== String(r.won)) return false;
      var x = v.x || {};
      if (!((x.tv || []).indexOf(b) >= 0)) return false;
      return keys.every(function(k) { return (v.p || []).some(function(sd) { return sd.some(function(p) { return p[0].indexOf(k) >= 0; }); }); });
    })[0];
    return hit && hit.v.th ? hit.v.th : '';
  }
  function beltPic(b, oldR) {
    var pic = call('beltDataUri', b);
    if (pic) return '<img src="' + esc(pic) + '" alt="">';
    return '<svg width="104" height="52" viewBox="0 0 120 60" fill="none" stroke="#F4C242" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="20" width="112" height="20" rx="5" fill="' + (b === 'world' ? '#2A1C10' : '#2A323C') + '"></rect><circle cx="60" cy="30" r="21" fill="#161F2A"></circle><circle cx="60" cy="30" r="12"></circle></svg>';
  }
  function chip(b, r) {
    var cur = isNow(r);
    return '<a class="tv-pill' + (cur ? ' tvn-cur' : '') + '" tabindex="0" href="/mypage?tvch=' + esc(b) + '&tvrn=' + r.n + '">' + esc(r.champ) + ' · ' + esc(String(r.won).slice(0, 4)) + (cur ? '<span class="tvn-now">' + esc(T('NOW', '現王者')) + '</span>' : '') + '</a>';
  }
  function reigns(e, withScope) {
    var olds = {};
    (e.reigns || []).forEach(function(r) { olds[r.beltId] = r; });
    var big = '', small = '';
    (e.scope.reigns || []).forEach(function(c) {
      var R = reignsOf(c.beltId, e);
      if (!R || !R.era.length) return;
      var old = olds[c.beltId] || {}, newest = R.era.slice().reverse();   // newest on the left (timeline rule)
      if (c.chips) {
        small += '<div class="tvn-mini"><div class="tv-belt">' + beltPic(c.beltId) + '</div><div style="min-width:0"><div class="tv-1 notranslate" translate="no">' + esc(R.L.title) + '</div><div class="tv-oth">' + newest.map(function(r) { return chip(c.beltId, r); }).join('') + '</div></div></div>';
        return;
      }
      var fr = R.era.filter(function(r) { return r.n === c.feature; })[0];
      if (!fr) fr = R.era.slice().sort(function(x, y) { return days(y.won, y.end || today()) - days(x.won, x.end || today()); })[0];
      var d = days(fr.won, fr.end || today()), df = (fr.defences || []).length, th = withScope ? winThumb(c.beltId, fr) : '';
      var holder = fr.champ + ' · ' + T(ord(reignNo(R.all, fr)) + ' reign', reignNo(R.all, fr) + '度目');
      var stat = T(d + ' days · ' + df + (df === 1 ? ' defence' : ' defences'), d + '日 · 防衛' + df + '回');
      big += '<div class="tv-rc' + (th ? ' tvn-rc' : '') + '"' + (th ? ' style="background-image:url(\'' + esc(th) + '\')"' : '') + '><a class="tv-card" tabindex="0" href="/mypage?tvch=' + esc(c.beltId) + '&tvrn=' + fr.n + '"><div class="tv-rrow"><div class="tv-belt">' + beltPic(c.beltId) + '</div><div><div class="tv-1 notranslate" translate="no">' + esc(R.L.title.replace(/ Championship$/, '')) + (old.belt ? ' <s>· ' + esc(old.belt) + '</s>' : '') + '</div><div class="tv-2">' + esc(holder) + (isNow(fr) ? '<span class="tvn-now">' + esc(T('NOW', '現王者')) + '</span>' : '') + '</div><div class="tv-3">' + esc(stat) + '</div></div></div></a>' +
        '<div class="tv-oth">' + newest.filter(function(r) { return r !== fr; }).map(function(r) { return chip(c.beltId, r); }).join('') + '</div></div>';
    });
    return '<div class="tv-rg">' + big + '</div>' + (small ? '<div class="tv-rg" style="margin-top:10px">' + small + '</div>' : '');
  }

  // ---- the era in numbers (StarScope)
  function stats(e) {
    var list = eraList(e), f = from(e), t = today(), m = {}, sh = {}, ti = {};
    list.forEach(function(x) { var k = (x.v.x && x.v.x.m) || x.id; m[k] = 1; if (x.v.sid) sh[x.v.sid] = 1; if ((x.v.x.tv || []).length || (x.v.x.ti || []).length) ti[k] = 1; });
    var ch = 0;
    BELTS.forEach(function(b) { var L = lineage(b); ((L && L.reigns) || []).forEach(function(r) { if (String(r.won) >= f && String(r.won) <= t) ch++; }); });
    var D = debuts(), db = Object.keys(D).filter(function(k) { return D[k] >= f && D[k] <= t; }).length;
    var it = [[Object.keys(sh).length, T('Shows', '大会')], [Object.keys(m).length, T('Matches', '試合')], [Object.keys(ti).length, T('Title matches', 'タイトルマッチ')], [ch, T('Title changes', '王座移動')], [db, T('Debuts', 'デビュー')]];
    return '<div class="tvn-stats">' + it.map(function(a) { return '<div class="tvn-stat"><b>' + a[0] + '</b><span>' + esc(a[1]) + '</span></div>'; }).join('') + '</div>';
  }

  // ---- top rated: thumbnails (StarScope), from assets/top_matches.json
  function nm(s) { if (s.length >= 5) return s.slice(0, 3).join(', ') + ' +' + (s.length - 3); return s.join(' & '); }
  function topVid(m) {
    var u = String(m.u || ''), mm = /\/contents\/(\d+)/.exec(u);
    if (mm) return mm[1];
    var X = idx();
    if (!X) return '';
    var keys = [].concat.apply([], m.s).map(norm);
    var hit = X.find(function(v) { return String(v.d) === String(m.d) && keys.every(function(k) { return (v.p || []).some(function(sd) { return sd.some(function(p) { return p[0].indexOf(k) >= 0; }); }); }); })[0];
    return hit ? hit.id : '';
  }
  function top(e) {
    var list = topList().filter(function(m) { return m.e === e.n; });
    if (!list.length) return '';
    var X = idx(), h = list.slice(0, 5).map(function(m) {
      var vid = topVid(m), v = vid && X ? X.get(vid) : null, th = v && v.th ? v.th : '';
      var tag = vid ? 'a tabindex="0" href="/contents/' + esc(vid) + '"' : 'div';
      return '<' + tag + ' class="tvn-tr"><div class="im"' + (th ? ' style="background-image:url(\'' + esc(th) + '\')"' : '') + '></div><span class="sc notranslate" translate="no">' + Number(m.r).toFixed(2) + '</span>' +
        '<div class="a notranslate" translate="no">' + esc(m.s.map(nm).join(' vs ')) + '</div><div class="b">' + esc(monY(m.d) + (m.n ? ' · ' + m.n : '')) + '</div></' + (vid ? 'a' : 'div') + '>';
    }).join('');
    h += '<a class="tvn-tr tvn-all" tabindex="0" href="/mypage?tvtop=era&e=' + e.n + '">' + esc(T('All ' + list.length + ' matches in this era', 'この時代の全' + list.length + '試合')) + '</a>';
    return '<div class="tvn-trs">' + h + '</div>';
  }

  // ---- rivalries (StarScope)
  function sideName(s) { if (s.t) return s.t; var f = facs()[s.f]; return f ? String(f.name).replace(/ \(.*\)$/, '') : s.f; }
  function face(s, side) {
    var n = s.t || ((idx() && idx().faction(s.f)) || {}).captain || '', c = cutout(n), h = '';
    h += c ? '<img class="ct ' + side + '" src="' + esc(c) + '" alt="">' : '<div class="ini ' + side + ' notranslate" translate="no">' + esc(initials(s.t || sideName(s))) + '</div>';
    if (s.f) { var lg = call('factionLogo', s.f); if (lg) h += '<img class="lg ' + side + '" src="' + esc(lg) + '" alt="">'; }
    return h;
  }
  function rivalries(e) {
    var X = idx(), f = from(e), sk = stars();
    return '<div class="tvn-rvs">' + (e.scope.rivalries || []).map(function(r) {
      var fac = !!(r.a.f && r.b.f), list = fac ? X.fvs(r.a.f, r.b.f, f) : X.vs(r.a.t, r.b.t, f);
      var ds = list.map(function(x) { return String(x.v.d); }).sort(), sg = list.filter(function(x) { return x.v.x && x.v.x.k === 'singles'; }).length;
      var kv = r.key ? X.get(r.key) : null, th = (kv && kv.th) || (list[0] && list[0].v.th) || '';
      var cnt = list.length + ' ' + T(list.length === 1 ? 'match' : 'matches', '試合') + (fac ? '' : ' (' + sg + ' ' + T('singles', 'シングル') + ')');
      var rng = ds.length ? (monY(ds[0]) === monY(ds[ds.length - 1]) ? monY(ds[0]) : monY(ds[0]) + ' – ' + monY(ds[ds.length - 1])) : '';
      var href = '/mypage?tvscope=' + (fac ? 'f&a=' + encodeURIComponent(r.a.f) + '&b=' + encodeURIComponent(r.b.f) : 'v&a=' + encodeURIComponent(r.a.t) + '&b=' + encodeURIComponent(r.b.t)) + '&from=' + encodeURIComponent(f);
      return '<a class="tvn-rv" tabindex="0" href="' + esc(href) + '"><div class="pic"' + (sk ? ' style="background-image:url(\'' + esc(sk) + '\')"' : '') + '>' + (th ? '<div class="th" style="background-image:url(\'' + esc(th) + '\')"></div>' : '') +
        face(r.a, 'l') + face(r.b, 'r') + '<span class="vs">VS</span></div>' +
        '<div class="tx"><div class="a notranslate" translate="no">' + esc(sideName(r.a) + ' vs ' + sideName(r.b)) + '</div><div class="b">' + esc(r.line || '') + '</div><div class="c">' + esc(cnt + (rng ? ' · ' + rng : '')) + '</div></div></a>';
    }).join('') + '</div>';
  }

  // ---- must-see shows: StarScope poster cards
  function shows(e) {
    var X = idx(), all = X.shows(from(e), ''), cards = (e.scope.shows || []).map(function(s) {
      var h = X.showCard(s.sid);
      return h.replace(/<a class="sc"/, '<a class="sc" tabindex="0"').replace(/ data-bg="([^"]*)"/g, ' style="background-image:url(\'$1\')"');
    }).filter(Boolean);
    if (!cards.length) return '';
    return '<div class="tvn-shs tvp">' + cards.join('') + '<a class="tvn-all" tabindex="0" href="/mypage?tvscope=shows">' + esc(T('All ' + all.length + ' shows of the era', 'この時代の全' + all.length + '大会')) + '<span style="display:block;margin-top:6px;font-size:12px;font-weight:600;color:#9AA6B4">' + esc(T('StarScope Shows', 'StarScope 大会')) + '</span></a></div>';
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
    var f = from(e), X = idx(), n = 0;
    if (withScope) { var k = norm(name); n = eraList(e).filter(function(x) { return (x.v.p || []).some(function(sd) { return sd.some(function(p) { return p[0].indexOf(k) >= 0; }); }); }).length; }
    var sb = window.__tvStar ? window.__tvStar([name], 'card') : '';
    var bl = beltsHeld(name, f), line = withScope ? n + ' ' + T('matches in this era', '試合（この時代）') : '';
    if (rising) {
      var db = debuts()[norm(name)], ft = firstTitle(name);
      if (db && db >= f) line = T('Debut ', 'デビュー ') + monY(db) + (line ? ' · ' + line : '');
      else if (ft && ft.d >= f) line = T('First title ', '初戴冠 ') + monY(ft.d) + (line ? ' · ' + line : '');
    }
    return '<a class="tvn-pt" tabindex="0" href="/mypage?tvwr=' + encodeURIComponent(name) + '"><div class="ph notranslate" translate="no"' + (sb ? ' style="' + esc(sb) + '"' : '') + '>' + (sb ? '' : esc(initials(name))) + '</div><div style="min-width:0"><div class="a notranslate" translate="no">' + esc(name) + '</div><div class="b">' + esc(line) + '</div><div class="c">' + esc(bl.join(' · ')) + '</div></div></a>';
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
      return '<a class="tv-tile tv-fac" tabindex="0" href="' + esc(path) + '"><div class="tv-fmark' + (pic ? ' tv-pic' : '') + '">' + (pic ? '<img src="' + esc(pic) + '" alt="">' : esc(nmx.slice(0, 2))) + '</div><div style="min-width:0"><div class="nm">' + esc(nmx) + '</div>' +
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

  window.__tvEraNew = {
    has: function(e) { return !!(e && e.scope); },
    scopeOn: scopeOn, scopePending: scopePending, addCss: addCss,
    stats: stats, reigns: reigns, top: top, rivalries: rivalries, shows: shows,
    people: people, factions: factions, picks: picks
  };
})();
