(function(){
  // Tag Teams: the menu shelf (window.__tvTeams.shelfHtml), the All Tag Teams page (/mypage?tvteams=1[&era=n|&belt=id])
  // and a team's page (/mypage?tvteam=<id>). Teams are built from the Goddess of Stardom and NEW BLOOD Tag Team title
  // histories (lineageJson, so the daily file's newer copies count), plus assets/tag_teams.json for eras, faction-only
  // pair names, site spellings and teams that never held these titles. A team's matches come from one keyword search
  // (both members' names + "Tag Team"), narrowed to 2-on-2 matches by title (match_types.json "tag" exclusions), and,
  // where the video index has the match, to matches where the two were on the same side.
  if (window.__tvTeams) return;
  var H = window.AndroidHost || {};
  var API = {};
  window.__tvTeams = API;

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function parse(s) { try { return JSON.parse(s || 'null'); } catch (e) { return null; } }
  // Android's bridge matches a method by its number of arguments: a no-argument method called with one fails.
  function call(fn, a) { try { return H[fn] ? (arguments.length > 1 ? H[fn](a) : H[fn]()) : ''; } catch (e) { return ''; } }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function ms(iso) { var a = String(iso).split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
  function fmtD(iso) { if (!iso) return ''; var a = String(iso).split('-'); return isJa() ? (+a[0]) + '年' + (+a[1]) + '月' + (+a[2]) + '日' : (+a[2]) + ' ' + MONTHS[+a[1] - 1] + ' ' + a[0]; }
  function ord(n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function norm(t) { return String(t || '').toLowerCase().replace(/[☆★]/g, ' ').replace(/[^a-z0-9぀-ヿ一-鿿 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  var CFG = parse(call('tagTeamsJson')) || {};
  var ERAS = ((parse(call('erasJson')) || {}).eras) || [];
  var FACS = ((parse(call('factionsJson')) || {}).factions) || [];
  var BELTS = {
    goddess: { name: 'Goddess of Stardom', ja: 'ゴッデス・オブ・スターダム', tag: 'GODDESS', tagJa: 'ゴッデス' },
    newblood: { name: 'NEW BLOOD Tag Team', ja: 'NEW BLOOD タッグ', tag: 'NEW BLOOD', tagJa: 'NEW BLOOD' }
  };

  // ---- the teams
  function eraOf(iso) {
    var starts = CFG.eraStarts || {}, e = 1;
    [2, 3, 4, 5].forEach(function(n) { if (starts[n] && iso && iso >= starts[n]) e = n; });
    return e;
  }
  function facIdByName(name) {   // "Oedo Tai" -> the factions.json entry ("Tokyo Cyber Squad (TCS)" matches "Tokyo Cyber Squad")
    var n = norm(name);
    for (var i = 0; i < FACS.length; i++) if (norm(String(FACS[i].name).replace(/\s*\(.*$/, '')) === n || norm(FACS[i].name) === n) return FACS[i];
    return null;
  }
  var TEAMS = null;
  var ALIAS = {};   // the title histories' other spellings of a name ("Wakana Tsukiyama" -> "Waka Tsukiyama")
  function build() {
    if (TEAMS) return TEAMS;
    var byKey = {}, facNames = {};
    (CFG.factionNames || []).forEach(function(n) { facNames[n.toLowerCase()] = 1; });
    Object.keys(BELTS).forEach(function(b) {
      var L = parse(call('lineageJson', b));
      if (!L || !L.reigns) return;
      Object.keys(L.alias || {}).forEach(function(n) { ALIAS[n.toLowerCase()] = (ALIAS[n.toLowerCase()] || []).concat(L.alias[n] || []); });
      L.reigns.forEach(function(r, i) {
        var mem = String(r.champ || '').split(/\s*&\s*/).map(function(s) { return s.trim(); }).filter(Boolean);
        if (mem.length !== 2) return;
        var key = mem.slice().sort().join('|').toLowerCase(), t = byKey[key];
        if (!t) t = byKey[key] = { members: mem, names: {}, reigns: [] };
        if (r.team) t.names[r.team] = 1;
        var nx = L.reigns[i + 1];
        t.reigns.push({ belt: b, n: r.n, won: r.won, end: r.end || null, endType: r.endType || '', vs: r.vs || '', venue: r.venue || '',
          defs: r.defCount != null ? r.defCount : (r.defences || []).length, defences: r.defences || [], lostTo: nx ? (nx.team || nx.champ) : '' });
      });
    });
    (CFG.extra || []).forEach(function(x) {
      if (!x || !x.members || x.members.length !== 2) return;
      var key = x.members.slice().sort().join('|').toLowerCase();
      var t = byKey[key] = byKey[key] || { members: x.members, names: {}, reigns: [] };
      if (x.name) t.names[x.name] = 1;
      t.since = x.since; t.facName = x.faction;
    });
    TEAMS = Object.keys(byKey).map(function(k) {
      var t = byKey[k], names = Object.keys(t.names);
      var real = names.filter(function(n) { return !facNames[n.toLowerCase()]; });
      var fac = names.filter(function(n) { return facNames[n.toLowerCase()]; })[0] || t.facName || (real[0] && facIdByName(real[0]) ? real[0] : '');
      t.reigns.sort(function(a, b) { return a.won < b.won ? -1 : 1; });
      t.name = real[0] || '';
      t.display = t.name || t.members.join(' & ');
      t.sub = t.name ? t.members.join(' & ') : (fac || '');
      t.faction = fac || '';
      t.facObj = fac ? facIdByName(fac) : null;
      t.first = t.reigns.length ? t.reigns[0].won : (t.since || '');
      t.last = t.reigns.length ? t.reigns[t.reigns.length - 1].won : (t.since || '');
      t.era = eraOf(t.first);
      t.champ = t.reigns.filter(function(r) { return !r.end; }).map(function(r) { return r.belt; });
      t.count = {}; t.reigns.forEach(function(r) { t.count[r.belt] = (t.count[r.belt] || 0) + 1; });
      t.defTotal = t.reigns.reduce(function(a, r) { return a + (r.defs || 0); }, 0);
      t.id = slug(t.members.join(' '));
      return t;
    });
    TEAMS.sort(function(a, b) { return a.last < b.last ? 1 : -1; });   // most recent title first
    return TEAMS;
  }
  function teamById(id) { var l = build(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function teamPath(t) { return '/mypage?tvteam=' + encodeURIComponent(t.id); }
  function eraList() { return ERAS.slice().sort(function(a, b) { return b.n - a.n; }); }   // newest first (timelines run newest on the left)

  // ---- menu shelf: "All Tag Teams" on top, then one column per era, newest on the left
  var shelfCss = false;
  API.shelfHtml = function() {
    if (!shelfCss) {
      shelfCss = true;
      var st = document.createElement('style');
      st.textContent = [
        '#tv-sm-shelf .tv-shl-ecol .tv-sm-fi.tv-shl-tm{padding:5px 10px;margin:0;font-size:16px;}',
        '#tv-sm-shelf .tv-shl-tm .a{display:block;font-size:16px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '#tv-sm-shelf .tv-shl-tm .b{display:block;font-size:12px;font-weight:600;color:#9aa6b4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}',
        '#tv-sm-shelf .tv-shl-ecol .tv-sm-fi.tv-shl-tmore{color:#F4C242 !important;font-size:15px;padding:5px 10px;}'
      ].join('\n');
      (document.head || document.documentElement).appendChild(st);
    }
    var all = build(), per = 5, cols = '';
    eraList().forEach(function(e) {
      var list = all.filter(function(t) { return t.era === e.n; }), ep = '/mypage?tvteams=1&era=' + e.n;
      cols += '<div class="tv-shl-ecol"><a class="tv-sm-fi tv-shl-eh" tabindex="0" data-go="' + esc(ep) + '" href="' + esc(absUrl(ep)) + '"><span class="tv-shl-ek notranslate" translate="no">' + esc(e.kanji) + '</span><span class="tv-shl-ex"><span class="tv-shl-e1">' + esc(e.name) + '</span><span class="tv-shl-e2">' + list.length + ' ' + esc(T(list.length === 1 ? 'team' : 'teams', 'チーム')) + '</span></span></a>';
      list.slice(0, per).forEach(function(t) {
        cols += '<a class="tv-sm-fi tv-shl-tm" tabindex="0" data-go="' + esc(teamPath(t)) + '" href="' + esc(absUrl(teamPath(t))) + '"><span class="a notranslate" translate="no">' + esc(t.display) + '</span><span class="b notranslate" translate="no">' + esc(t.sub) + '</span></a>';
      });
      if (list.length > per) cols += '<a class="tv-sm-fi tv-shl-tmore" tabindex="0" data-go="' + esc(ep) + '" href="' + esc(absUrl(ep)) + '">' + esc(T('+' + (list.length - per) + ' more', '他' + (list.length - per) + 'チーム')) + '</a>';
      cols += '</div>';
    });
    var ap = '/mypage?tvteams=1';
    return '<div class="tv-shl-t">' + esc(T('TAG TEAMS', 'タッグチーム')) + '</div>' +
      '<div class="tv-shl-top"><a class="tv-sm-fi tv-shl-all" tabindex="0" data-go="' + ap + '" href="' + esc(absUrl(ap)) + '">' + esc(T('All Tag Teams', 'すべてのタッグチーム')) + '<span>' + esc(T(all.length + ' champion teams, A to Z', '王者チーム' + all.length + '組')) + '</span></a></div>' +
      '<div class="tv-shl-ec">' + cols + '</div>';
  };

  // ---- pages
  var Q = null;
  try { if (location.pathname === '/mypage') Q = new URLSearchParams(location.search); } catch (e) { Q = null; }
  if (!Q || (!Q.get('tvteams') && !Q.get('tvteam'))) return;
  var TEAM = Q.get('tvteam') ? teamById(Q.get('tvteam')) : null;

  var css = document.createElement('style');
  css.textContent = [
    '#tv-tt{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B1118;color:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-tt, #tv-tt *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;box-sizing:border-box;}',
    '#tv-tt a, #tv-tt a *{opacity:1 !important;filter:none !important;text-decoration:none !important;color:inherit;}',
    '#tv-tt *:focus{outline:none !important;box-shadow:none !important;}',
    '#tv-tt-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:24px 40px 60px 40px;scrollbar-width:none;}',
    '#tv-tt-scroll::-webkit-scrollbar{display:none;}',
    '#tv-tt .tt-head{display:flex;align-items:flex-start;gap:14px;}',
    '#tv-tt .tt-bar{flex:0 0 auto;width:10px;height:36px;background:#F4C242;margin-top:2px;}',
    '#tv-tt .tt-h1{font-size:30px;font-weight:900;line-height:1.2;}',
    '#tv-tt .tt-note{font-size:13px;font-weight:600;color:#9AA6B4;line-height:1.5;margin-top:2px;}',
    '#tv-tt .tt-instr{margin-left:auto;font-size:15px;font-weight:600;color:#9AA6B4;padding-top:6px;text-align:right;max-width:520px;}',
    '#tv-tt .tt-chips{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;align-items:center;}',
    '#tv-tt .tt-chip{display:flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-radius:10px;border:2px solid #2A323C;background:#161F2A;font-size:17px;font-weight:700;color:#C9D2DC !important;white-space:nowrap;cursor:pointer;}',
    '#tv-tt .tt-chip .k{font-size:17px;font-weight:900;color:#F4C242;}',
    '#tv-tt .tt-chip .bi{color:#F4C242;flex:none;}',
    '#tv-tt .tt-chip.tt-on .bi{color:#1A1A1A;}',
    '#tv-tt .tt-chip.tt-on .bi circle[fill]{fill:#FFB347;}',
    '#tv-tt .tt-chip[data-f="bgoddess"]{margin-left:14px;}',
    '#tv-tt .tt-chip small{font-size:12px;font-weight:700;color:#9AA6B4;}',
    '#tv-tt .tt-chip.tt-on{background:#FFB347;border-color:#FFB347;color:#1A1A1A !important;}',
    '#tv-tt .tt-chip.tt-on .k, #tv-tt .tt-chip.tt-on small{color:#1A1A1A;}',
    '#tv-tt .tt-chip:focus{border-color:#F4C242;}',
    '#tv-tt .tt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 12px;margin-top:22px;}',
    '#tv-tt .tt-count{margin-top:14px;font-size:15px;font-weight:700;color:#9AA6B4;}',
    '#tv-tt .tt-team{display:flex;align-items:center;gap:10px;height:66px;padding:0 14px;background:#161F2A;border:2px solid #161F2A;border-radius:8px;min-width:0;cursor:pointer;}',
    '#tv-tt .tt-team:focus{background:#172029;border-color:#F4C242;}',
    '#tv-tt .tt-team .x{flex:1 1 auto;min-width:0;}',
    '#tv-tt .tt-team .a{font-size:17px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-tt .tt-team .b{font-size:13px;font-weight:600;color:#9AA6B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}',
    '#tv-tt .tt-tag{flex:none;font-size:11px;font-weight:800;letter-spacing:1px;padding:3px 6px;border-radius:4px;border:1px solid #F4C242;color:#F4C242;white-space:nowrap;}',
    '#tv-tt .tt-tag.nb{border-color:#9AA6B4;color:#C9D2DC;}',
    '#tv-tt .tt-tag.ch{background:#F4C242;color:#1A1A1A;}',
    '#tv-tt .tt-sec{display:flex;align-items:center;gap:10px;margin:26px 0 10px 0;}',
    '#tv-tt .tt-sec i{width:8px;height:26px;background:#F4C242;}',
    '#tv-tt .tt-sec b{font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '#tv-tt .tt-sec span{font-size:13px;font-weight:600;color:#9AA6B4;}',
    '#tv-tt .tt-hero{display:flex;gap:32px;align-items:center;margin-top:18px;}',
    '#tv-tt .tt-av{display:flex;flex:none;}',
    '#tv-tt .tt-av div{width:140px;height:140px;overflow:hidden;white-space:nowrap;border-radius:50%;border:3px dashed #3B4656;background:#161F2A center top/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:900;color:#C9D2DC;}',
    '#tv-tt .tt-av div.ph{border-style:solid;border-color:#2A323C;}',
    '#tv-tt .tt-av div + div{margin-left:-26px;}',
    '#tv-tt .tt-facts{display:flex;gap:36px;flex-wrap:wrap;}',
    '#tv-tt .tt-facts .k{font-size:13px;font-weight:700;color:#9AA6B4;letter-spacing:1px;}',
    '#tv-tt .tt-facts .v{font-size:22px;font-weight:700;margin-top:4px;}',
    '#tv-tt .tt-btns{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}',
    '#tv-tt .tt-btn{height:44px;line-height:40px;padding:0 16px;border-radius:8px;border:2px solid #2A323C;background:#161F2A;font-size:17px;font-weight:700;color:#fff !important;cursor:pointer;}',
    '#tv-tt .tt-btn:focus{border-color:#F4C242;background:#172029;}',
    '#tv-tt .tt-belts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
    '#tv-tt .tt-belt{display:flex;gap:16px;align-items:center;padding:12px 16px;background:#161F2A;border:2px solid #2A323C;border-radius:12px;cursor:pointer;min-width:0;}',
    '#tv-tt .tt-belt:focus{border-color:#F4C242;background:#172029;}',
    '#tv-tt .tt-belt .pic{width:120px;height:66px;flex:none;display:flex;align-items:center;justify-content:center;}',
    '#tv-tt .tt-belt .pic img{max-width:100%;max-height:100%;object-fit:contain;}',
    '#tv-tt .tt-belt .pic.ph{border:2px dashed #3B4656;border-radius:10px;font-size:11px;font-weight:800;letter-spacing:1px;color:#9AA6B4;}',
    '#tv-tt .tt-belt .t1{font-size:19px;font-weight:700;}',
    '#tv-tt .tt-belt .t2{font-size:15px;font-weight:600;color:#C9D2DC;margin-top:3px;}',
    '#tv-tt .tt-belt .t3{font-size:13px;font-weight:700;color:#F4C242;margin-top:3px;}',
    '#tv-tt .tt-vids{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;}',
    '#tv-tt .tt-card{display:block;background:#1a1a1a;border-radius:8px;overflow:hidden;cursor:pointer;transition:transform .12s;}',
    '#tv-tt .tt-card:focus{outline:3px solid #F4C242 !important;outline-offset:2px;box-shadow:0 0 16px rgba(244,194,66,.8) !important;transform:scale(1.03);}',
    '#tv-tt .tt-card .im{width:100%;aspect-ratio:16/9;background:#172029 center/cover no-repeat;position:relative;}',
    '#tv-tt .tt-card .dt{position:absolute;right:8px;top:8px;padding:4px 10px;border-radius:6px;background:rgba(0,0,0,.8);color:#F4C242;font-size:15px;font-weight:800;}',
    '#tv-tt .tt-card .ok{position:absolute;left:8px;top:8px;padding:3px 8px;border-radius:4px;background:#FFB347;color:#1A1A1A;font-size:11px;font-weight:800;letter-spacing:1px;}',
    '#tv-tt .tt-card .tt{padding:12px 14px;font-size:15px;font-weight:700;color:#fff;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}',
    '#tv-tt .tt-more{display:flex;align-items:center;justify-content:center;min-height:200px;border:2px solid #2A323C;background:#11171E;border-radius:8px;font-size:20px;font-weight:800;color:#F4C242 !important;cursor:pointer;}',
    '#tv-tt .tt-more:focus{border-color:#F4C242;background:#172029;}',
    '#tv-tt .tt-msg{padding:14px 6px;font-size:16px;color:#9AA6B4;}',
    '#tv-tt .tt-empty{border:2px dashed #3B4656;border-radius:12px;padding:26px 24px;text-align:center;color:#9AA6B4;font-size:15px;font-weight:600;line-height:1.5;}',
    '#tv-tt .tt-dbg{margin-top:22px;padding:12px 16px;background:#0F151C;border:2px solid #2A323C;border-radius:10px;font:13px/1.5 Arial,Helvetica,sans-serif;color:#9AA6B4;white-space:pre-wrap;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  var root = document.createElement('div');
  root.id = 'tv-tt';
  root.innerHTML = '<div id="tv-tt-scroll"></div>';
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';
  var scroller = root.firstChild;

  function focusEl(el, center) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: center ? 'center' : 'nearest' }); } catch (e) {}
  }
  function tags(t) {
    var h = '';
    if (t.champ.length) h += '<span class="tt-tag ch">' + esc(T('CHAMPIONS', '王者')) + '</span>';
    if (t.count.goddess) h += '<span class="tt-tag">' + esc(T('GODDESS', 'ゴッデス')) + (t.count.goddess > 1 ? ' ×' + t.count.goddess : '') + '</span>';
    if (t.count.newblood) h += '<span class="tt-tag nb">NEW BLOOD' + (t.count.newblood > 1 ? ' ×' + t.count.newblood : '') + '</span>';
    return h;
  }

  // ================================================================== All Tag Teams
  var filt = Q.get('era') ? 'e' + Q.get('era') : Q.get('belt') ? 'b' + Q.get('belt') : 'all';
  function renderList(focusSel) {
    var all = build().slice().sort(function(a, b) { return a.display.localeCompare(b.display, 'en', { sensitivity: 'base' }); });
    var list = all.filter(function(t) {
      if (filt === 'all') return true;
      if (filt[0] === 'e') return t.era === +filt.slice(1);
      return !!t.count[filt.slice(1)];
    });
    var h = '<div class="tt-head"><div class="tt-bar"></div><div><div class="tt-h1">' + esc(T('All Tag Teams', 'すべてのタッグチーム')) + '</div>' +
      '<div class="tt-note">' + esc(T('Every pair that has held the Goddess of Stardom or NEW BLOOD Tag Team belts. A pair known only by its faction shows the two names, with the faction underneath.', 'ゴッデス・オブ・スターダム王座、NEW BLOODタッグ王座を獲得したすべてのチーム。')) + '</div></div>' +
      '<div class="tt-instr">' + esc(T('Left and Right change the filter. Down moves into the list. OK opens a team.', '左右で絞り込み、下で一覧へ。OKでチームを開きます。')) + '</div></div>';
    var chips = [['all', esc(T('All', 'すべて')) + ' <small>' + all.length + '</small>']];
    // short era names keep the chips on one line: "Threedom & the Rebuild" -> "Threedom", "The Draft Years" -> "Draft Years"
    eraList().forEach(function(e) { chips.push(['e' + e.n, '<span class="k notranslate" translate="no">' + esc(e.kanji) + '</span>' + esc(isJa() && e.ja ? e.ja : String(e.name).split(' & ')[0].replace(/^The /, ''))]); });
    // championship filters carry a small drawn belt, so they read apart from the era filters
    var BELT_ICON = '<svg class="bi" width="30" height="16" viewBox="0 0 30 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="5" width="28" height="6" rx="2"></rect><circle cx="15" cy="8" r="5.5" fill="#161F2A"></circle><circle cx="15" cy="8" r="2.2"></circle><circle cx="7" cy="8" r="1.4"></circle><circle cx="23" cy="8" r="1.4"></circle></svg>';
    chips.push(['bgoddess', BELT_ICON + esc(T('Goddess', 'ゴッデス'))]);
    chips.push(['bnewblood', BELT_ICON + 'NEW BLOOD']);
    h += '<div class="tt-chips">' + chips.map(function(c) { return '<a class="tt-chip' + (c[0] === filt ? ' tt-on' : '') + '" tabindex="0" data-f="' + c[0] + '">' + c[1] + '</a>'; }).join('') + '</div>';
    h += '<div class="tt-grid">' + list.map(function(t) {
      return '<a class="tt-team" tabindex="0" href="' + esc(absUrl(teamPath(t))) + '"><div class="x"><div class="a notranslate" translate="no">' + esc(t.display) + '</div><div class="b notranslate" translate="no">' + esc(t.sub) + '</div></div>' + tags(t) + '</a>';
    }).join('') + '</div>';
    h += '<div class="tt-count">' + esc(T(list.length + (list.length === 1 ? ' team' : ' teams') + (filt === 'all' ? '' : ' of ' + all.length), list.length + 'チーム' + (filt === 'all' ? '' : ' / ' + all.length))) + '</div>';
    scroller.innerHTML = h;
    focusEl((focusSel && scroller.querySelector(focusSel)) || scroller.querySelector('.tt-chip.tt-on') || scroller.querySelector('.tt-chip'));
  }

  // ================================================================== a team's page
  var MT_NONE = [];
  try {
    ((parse(call('matchTypesJson')) || {}).groups || []).forEach(function(g) { (g.items || []).forEach(function(x) { if (x.id === 'tag') (x.none || []).forEach(function(p) { MT_NONE.push(new RegExp(p, 'i')); }); }); });
  } catch (e) { MT_NONE = []; }
  // a built-in copy of the 2-on-2 rule, so the page never shows bigger matches if the match types can't be read
  if (!MT_NONE.length) MT_NONE = ["(?:\\d+|six|eight|ten|twelve|fourteen)[\\s\\-\u2010]*(?:person|man|men|woman|women)", "\\d+\\s*\u4eba", "(?:[2-6]|two|three|four|five|six)[\\s\\-\u2010]*way", "trios?|\u30c8\u30ea\u30aa", "gauntlet|\u30ac\u30f3\u30c8\u30ec\u30c3\u30c8", "battle\\s*royal|\u30d0\u30c8\u30eb\u30ed\u30a4\u30e4\u30eb", "rumble|\u30e9\u30f3\u30d6\u30eb"].map(function(p) { return new RegExp(p, 'i'); });
  // A 2-on-2 match title says tag (Tag Team Match, タッグマッチ, a tag title match) and none of the bigger-match words.
  // Full-width letters and digits (４ＷＡＹ) are read as plain ones first.
  var MT_ALL = [];
  try {
    ((parse(call('matchTypesJson')) || {}).groups || []).forEach(function(g) { (g.items || []).forEach(function(x) { if (x.id === 'tag') (x.all || []).forEach(function(p) { MT_ALL.push(new RegExp(p, 'i')); }); }); });
  } catch (e) { MT_ALL = []; }
  if (!MT_ALL.length) MT_ALL = [/tag|\u30bf\u30c3\u30b0/i];
  function half(t) { return String(t || '').replace(/[\uff01-\uff5e]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/\u3000/g, ' '); }
  function isTagTitle(t) {
    t = half(t);
    for (var i = 0; i < MT_ALL.length; i++) if (!MT_ALL[i].test(t)) return false;
    for (var j = 0; j < MT_NONE.length; j++) if (MT_NONE[j].test(t)) return false;
    return true;
  }
  var SPELL = CFG.spell || {};
  function siteName(n) { return SPELL[n] || n; }
  // The name the Wrestler and Competitors filters search for (factions.json "search"), so a team page asks the site
  // exactly what the filter bar asks for "Wrestler: A, Match type: Tag team, Competitors: B".
  var ROSTER = {};
  FACS.forEach(function(f) { (f.members || []).forEach(function(m) { if (m && m.name) ROSTER[String(m.name).toLowerCase()] = m.search || m.name; }); });
  // The roster's name, else the roster's name for one of the history's other spellings, else the spelling list, else as written.
  function searchName(n) {
    var k = String(n).toLowerCase(), al = ALIAS[k] || [];
    if (ROSTER[k]) return ROSTER[k];
    for (var i = 0; i < al.length; i++) if (ROSTER[String(al[i]).toLowerCase()]) return ROSTER[String(al[i]).toLowerCase()];
    return siteName(n);
  }

  // One search page at a time: the first when the Tag Matches section comes into view, the next only when More is pressed.
  // Saved copies last 7 days (a video's title doesn't change) and searches are at least 3 seconds apart.
  var CACHE_KEY = 'tvTeamCacheV1', BLOCK_KEY = 'tvFacBlockUntilV1', LAST_KEY = 'tvTeamLastReq', GAP_MS = 3000, KEEP_MS = 7 * 86400000;
  function readCache() { return parse(lsGet(CACHE_KEY)) || {}; }
  function writeCache(k, v) {
    var all = readCache(); all[k] = v;
    var keys = Object.keys(all);
    if (keys.length > 30) { keys.sort(function(a, b) { return all[a].t - all[b].t; }); keys.slice(0, keys.length - 30).forEach(function(x) { delete all[x]; }); }
    lsSet(CACHE_KEY, JSON.stringify(all));
  }
  function blockedFor() { var u = parseInt(lsGet(BLOCK_KEY) || '0', 10) || 0; return u > Date.now() ? Math.ceil((u - Date.now()) / 60000) : 0; }
  function cleanT(t) {
    return String(t || '').replace(/月額見放題/g, '').replace(/(Registration date|登録日)\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '').replace(/(Viewing date|視聴日時|視聴日)\s*[:：]?\s*[0-9.\/\- :]*/gi, '').replace(/\s+/g, ' ').trim();
  }
  function parseCards(doc) {
    var scope = doc.querySelector('.content-list, [class*="content-list"]') || doc, out = [], seen = {};
    Array.prototype.forEach.call(scope.querySelectorAll('.content-list-item, article'), function(item) {
      var link = item.querySelector('a[href*="/contents/"]');
      if (!link) return;   // sets (whole shows) are left out
      var href = absUrl(link.getAttribute('href') || ''), id = (/\/contents\/(\d+)/.exec(href) || [])[1];
      if (!id || seen[id]) return;
      seen[id] = 1;
      var bg = '', th = item.querySelector('[style*="background-image"]');
      if (th) { var m = (th.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/); if (m && m[1]) bg = absUrl(m[1]); }
      var tEl = item.querySelector('h3, h4, .ttl-xs, .content-title');
      out.push({ id: id, h: href, t: cleanT(tEl ? tEl.textContent : item.textContent), b: bg });
    });
    return out;
  }
  function fetchPage(q, page, cb) {
    var key = q + '#' + page, c = readCache()[key];
    if (c && Date.now() - c.t < KEEP_MS) { cb('', c.items, c.more, true); return; }
    var wait = blockedFor();
    if (wait) { cb('the site asked for a pause: ' + wait + ' min left'); return; }
    var since = Date.now() - (parseInt(lsGet(LAST_KEY) || '0', 10) || 0);
    if (since < GAP_MS) { setTimeout(function() { fetchPage(q, page, cb); }, GAP_MS - since); return; }
    lsSet(LAST_KEY, String(Date.now()));
    var url = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(q) + '&activetab=contents' + (page > 1 ? '&page=' + page : '');
    fetch(url, { credentials: 'include' }).then(function(res) {
      if (res.status === 429 || res.status === 403 || res.status === 503) { lsSet(BLOCK_KEY, String(Date.now() + 10 * 60000)); throw 'blocked (HTTP ' + res.status + ')'; }
      if (!res.ok) throw 'HTTP ' + res.status;
      return res.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html'), items = parseCards(doc);
      var more = !!doc.querySelector('a[rel="next"], .pagination a.next, .pagination .next a, li.next a') || items.length >= 10;
      writeCache(key, { t: Date.now(), items: items, more: more });
      cb('', items, more, false);
    }).catch(function(err) { cb(typeof err === 'string' ? err : 'error ' + err); });
  }

  // The video index (private builds) knows each video's sides: keep a match only when both members are on one side.
  var VIX = parse(lsGet('tvVideoIndexDry')) || {};
  function onSide(side, name) {
    var n = norm(name), words = n.split(' ');
    return side.some(function(x) { var s = norm(x); return s === n || s.indexOf(n) >= 0 || words.every(function(w) { return (' ' + s + ' ').indexOf(' ' + w + ' ') >= 0; }); });
  }
  function sidesCheck(t, id) {
    var r = VIX[id];
    if (!r || !r.sides_en || r.sides_en.length < 2) return '';
    var names = t.members.map(function(m) { return [m, siteName(m), searchName(m)].concat(ALIAS[String(m).toLowerCase()] || []); });
    var a = -1, b = -1;
    r.sides_en.forEach(function(side, i) {
      if (names[0].some(function(n) { return onSide(side, n); })) a = i;
      if (names[1].some(function(n) { return onSide(side, n); })) b = i;
    });
    if (a < 0 || b < 0) return '';
    return a === b ? 'partners' : 'opponents';
  }

  var V = { kept: [], seen: {}, dropMulti: 0, dropOpp: 0, verified: 0, queries: [], qi: 0, page: 1, more: true, busy: false, log: [], done: false };
  function queriesFor(t) {
    // Same words and order as the filter bar: wrestler, then "Tag Team", then the competitor.
    function pair(f) { return f(t.members[0]) + ' Tag Team ' + f(t.members[1]); }
    var q = [pair(searchName)], alt = pair(siteName);
    if (q.indexOf(alt) < 0) q.push(alt);   // another spelling, tried only when the first search finds no videos
    if (t.name) q.push(t.name);
    return q;
  }
  // ---- the private sheet's saved list for this team (private builds with the log set up; see docs/TEAM_MATCH_LISTS.md)
  var SHEET_ON = false;
  try { SHEET_ON = !!(H.teamSync && H.favSyncOn && H.favSyncOn()); } catch (e) { SHEET_ON = false; }
  var REFRESH_MS = 14 * 86400000, sheetWait = {};
  window.__tvTeamSyncReply = function(id, text) {
    var cb = sheetWait[id]; if (!cb) return; delete sheetWait[id];
    var r = parse(text); cb(r || { ok: false, error: 'bad reply' });
  };
  function sheet(action, payload, cb) {
    var id = Math.random().toString(36).slice(2, 10), body = { action: action, team: TEAM.id };
    for (var k in payload) body[k] = payload[k];
    sheetWait[id] = cb || function() {};
    setTimeout(function() { if (sheetWait[id]) { var f = sheetWait[id]; delete sheetWait[id]; f({ ok: false, error: 'no reply' }); } }, 30000);
    try { H.teamSync(id, JSON.stringify(body)); } catch (e) { delete sheetWait[id]; (cb || function() {})({ ok: false, error: String(e) }); }
  }
  function keepItems(items) {   // the 2-on-2 rule and the video index side check, for search results and saved lists alike
    var add = [];
    items.forEach(function(it) {
      if (V.seen[it.id]) return; V.seen[it.id] = 1;
      if (!isTagTitle(it.t)) { V.dropMulti++; return; }
      var s = sidesCheck(TEAM, it.id);
      if (s === 'opponents') { V.dropOpp++; return; }
      if (s === 'partners') { it.ok = 1; V.verified++; }
      add.push(it);
    });
    return add;
  }
  function save(items, fresh, q) {
    if (!SHEET_ON) return;
    sheet('tm_put', { items: items.map(function(x) { return { id: x.id, t: x.t, b: x.b }; }), next: { qi: V.qi, page: V.page, done: V.done }, query: q, fresh: !!fresh }, function(r) {
      V.log.push(r && r.ok ? T('saved to your sheet: ' + r.added + ' new, ' + r.count + ' in all', 'シートに保存: 新規' + r.added + '、計' + r.count) : T('not saved to your sheet: ', 'シートに保存できません: ') + ((r && r.error) || ''));
      paintVids();
    });
  }
  // A saved list is shown straight away, with no site search. Only a list older than 14 days gets its newest page
  // searched again (new matches go first); everything else waits for "More tag matches".
  function fromSheet(fallback) {
    V.busy = true; paintVids();
    sheet('tm_get', {}, function(r) {
      V.busy = false;
      // A row with no matches yet still counts when its search has moved past page 1 (More carries on from there).
      var nx = (r && r.next) || {};
      if (!r || !r.ok || !r.found || !((r.items || []).length || nx.page > 1 || nx.qi > 0 || nx.done)) {
        V.log.push(r && r.ok ? T('no saved list in your sheet yet', 'シートに保存なし') : T('sheet not read: ', 'シートを読めません: ') + ((r && r.error) || ''));
        fallback(); return;
      }
      var add = keepItems(r.items);
      V.kept = V.kept.concat(add);
      V.ran = true;
      // The saved place belongs to the search words it was made with: when this version searches with other words
      // (r.queries doesn't include the first one), the saved matches stay and the new search starts at page 1.
      var sameWords = !r.queries || !r.queries.length || r.queries.indexOf(V.queries[0]) >= 0;
      if (r.next && sameWords) { V.qi = r.next.qi || 0; V.page = r.next.page || 1; V.done = !!r.next.done; }
      V.log.push(T('saved list from your sheet: ' + add.length + ' matches (searched ' + String(r.searched || '').slice(0, 10) + ')', 'シートの保存: ' + add.length + '試合（' + String(r.searched || '').slice(0, 10) + '）'));
      if (!sameWords) V.log.push(T('saved with other search words: searching page 1 of ', '検索語が変わったため1ページ目から: ') + V.queries[0]);
      paintVids();
      if (!sameWords) { loadMore(); return; }   // one search, as on a first visit
      var age = Date.now() - (Date.parse(r.refreshed || '') || 0);
      if (age > REFRESH_MS) refreshNewest();
    });
  }
  function refreshNewest() {
    if (V.busy) return;
    V.busy = true; paintVids();
    var q = V.queries[0];
    fetchPage(q, 1, function(err, items, more, cached) {
      V.busy = false;
      if (err) { V.log.push(q + ' · page 1 (refresh): ' + err); paintVids(); return; }
      var add = keepItems(items);
      V.kept = add.concat(V.kept);
      V.log.push(q + ' · page 1 (refresh): ' + items.length + ' videos, ' + add.length + ' new' + (cached ? ' (saved copy)' : ''));
      paintVids();
      save(add, true, q);
    });
  }

  function loadMore() {
    if (V.busy || V.done) return;
    V.busy = true; paintVids();
    var q = V.queries[V.qi];
    fetchPage(q, V.page, function(err, items, more, cached) {
      V.busy = false; V.ran = true;
      if (err) { V.log.push(q + ' · page ' + V.page + ': ' + err); V.done = true; paintVids(); return; }
      var kept = keepItems(items), add = kept.length;
      V.kept = V.kept.concat(kept);
      V.log.push(q + ' · page ' + V.page + ': ' + items.length + ' videos, ' + add + ' kept' + (cached ? ' (saved copy)' : ''));
      // The other spelling and the team name are tried only when a search finds no videos at all.
      if (V.page === 1 && !items.length && V.qi + 1 < V.queries.length) {
        V.qi++; V.page = 1; paintVids(); loadMore(); return;
      }
      V.page++;
      if (!more) V.done = true;
      paintVids();
      save(kept, false, q);
    });
  }
  function dateOfTitle(t) { var m = /(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})/.exec(t || ''); return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : ''; }
  function paintVids() {
    var box = document.getElementById('tt-vids'), st = document.getElementById('tt-vst'), dbg = document.getElementById('tt-dbg');
    if (!box) return;
    var had = document.activeElement && box.contains(document.activeElement) ? document.activeElement.getAttribute('data-vid') || 'more' : '';
    var h = '';
    // With nothing kept yet, a plain grey line like the championship pages' "Press OK on this reign" note:
    // "Looking…" during the first search, "none found" once every page is done, otherwise "Press OK on More" above the More tile.
    var more = '<a class="tt-more" tabindex="0" data-more="1">' + esc(V.busy ? T('Searching…', '検索中…') : T('More tag matches', 'さらに表示')) + '</a>';
    if (!V.kept.length) {
      var msg = V.done ? T('No 2-on-2 tag matches were found for this team.', 'このチームのタッグマッチの動画は見つかりませんでした。') :
        (V.busy && !V.ran) ? T('Looking for tag matches...', 'タッグマッチを検索中...') :
        T('No 2-on-2 tag matches on the pages searched so far. Press OK on More tag matches to search the next page.', 'これまでのページにタッグマッチはありません。「さらに表示」でOKを押すと次のページを検索します。');
      h = '<div class="tt-msg">' + esc(msg) + '</div>';
      if (!V.done && V.ran) h += '<div class="tt-vids">' + more + '</div>';
      box.className = '';
    } else {
      box.className = 'tt-vids';
      h = V.kept.map(function(it) {
        var d = dateOfTitle(it.t);
        return '<a class="tt-card" tabindex="0" data-vid="' + esc(it.id) + '" href="' + esc(it.h) + '"><div class="im" style="background-image:url(\'' + esc(it.b) + '\')">' + (it.ok ? '<span class="ok">' + esc(T('TEAMMATES', '同じチーム')) + '</span>' : '') + (d ? '<span class="dt">' + esc(fmtD(d)) + '</span>' : '') + '</div><div class="tt">' + esc(it.t) + '</div></a>';
      }).join('');
      if (!V.done) h += more;
    }
    box.innerHTML = h;
    if (st) st.textContent = V.busy ? (V.kept.length ? V.kept.length + ' ' + T(V.kept.length === 1 ? 'tag match' : 'tag matches', '試合') + T(' · ', ' · ') : '') + T('looking for videos', '動画を検索中') :
      (!V.kept.length && !V.done ? T('none found yet', 'まだありません') : V.kept.length + ' ' + T(V.kept.length === 1 ? 'tag match' : 'tag matches', '試合'));
    if (dbg) dbg.textContent = T('Search: ', '検索: ') + V.queries.join(' | ') + '\n' + V.log.join('\n') + '\n' +
      T('Kept ' + V.kept.length + ' (' + V.verified + ' checked as teammates in the video index) · left out ' + V.dropMulti + ' bigger or multi-way matches, ' + V.dropOpp + ' where they were opponents',
        '表示 ' + V.kept.length + '（動画インデックスで同じチーム確認 ' + V.verified + '）· 除外 ' + V.dropMulti + '（多人数）、' + V.dropOpp + '（対戦）');
    if (had) { var f = had === 'more' ? box.querySelector('.tt-more') : box.querySelector('[data-vid="' + had + '"]'); if (f) focusEl(f); }
  }

  function initials(n) { return String(n).split(/\s+/).map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function renderTeam() {
    var t = TEAM;
    if (!t) {
      scroller.innerHTML = '<div class="tt-head"><div class="tt-bar"></div><div class="tt-h1">' + esc(T('Team not found', 'チームが見つかりません')) + '</div></div><div class="tt-empty" style="margin-top:16px">' + esc(T('Open Tag Teams in the menu to choose a team.', 'メニューのタッグチームから選んでください。')) + '</div>';
      return;
    }
    var h = '<div class="tt-head"><div class="tt-bar"></div><div><div class="tt-h1 notranslate" translate="no">' + esc(t.display) + '</div><div class="tt-note">' + esc(T('Tag team', 'タッグチーム')) + (t.sub ? ' · ' + esc(t.sub) : '') + '</div></div>' +
      '<div class="tt-instr">' + esc(T('Up and Down move between rows. OK opens. Back returns.', '上下で移動、OKで開く、戻るで戻ります。')) + '</div></div>';
    var av = t.members.map(function(m) {
      var p = call('wrestlerPhoto', m) || call('wrestlerPhoto', siteName(m));
      return p ? '<div class="ph" style="background-image:url(\'' + esc(p) + '\')"></div>' : '<div class="notranslate" translate="no">' + esc(initials(m)) + '</div>';
    }).join('');
    var reignsN = t.reigns.length;
    h += '<div class="tt-hero"><div class="tt-av">' + av + '</div><div style="min-width:0">' +
      '<div class="tt-facts">' +
        '<div><div class="k">' + esc(T('MEMBERS', 'メンバー')) + '</div><div class="v notranslate" translate="no">' + esc(t.members.join(' & ')) + '</div></div>' +
        (t.faction ? '<div><div class="k">' + esc(T('FACTION', 'ユニット')) + '</div><div class="v notranslate" translate="no">' + esc(t.faction) + '</div></div>' : '') +
        (t.first ? '<div><div class="k">' + esc(T('FIRST TITLE', '初戴冠')) + '</div><div class="v">' + esc(t.first.slice(0, 4)) + '</div></div>' : '') +
        '<div><div class="k">' + esc(T('REIGNS', '戴冠')) + '</div><div class="v">' + reignsN + '</div></div>' +
        '<div><div class="k">' + esc(T('DEFENCES', '防衛')) + '</div><div class="v">' + t.defTotal + '</div></div>' +
      '</div><div class="tt-btns">' +
        t.members.map(function(m) { var p = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(searchName(m)) + '&activetab=contents&page=1'; return '<a class="tt-btn notranslate" translate="no" tabindex="0" href="' + esc(absUrl(p)) + '">' + esc(m) + '</a>'; }).join('') +
        (t.facObj && t.facObj.members && t.facObj.members.length ? '<a class="tt-btn" tabindex="0" href="' + esc(absUrl('/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(t.facObj.members[0].search) + '&tvfaction=' + encodeURIComponent(t.facObj.id))) + '">' + esc(T('Faction home', 'ユニットページ')) + '</a>' : '') +
      '</div></div></div>';
    if (t.reigns.length) {
      h += '<div class="tt-sec"><i></i><b>' + esc(T('TITLES HELD', '獲得王座')) + '</b></div><div class="tt-belts">' + t.reigns.slice().reverse().map(function(r) {
        var B = BELTS[r.belt], pic = call('beltDataUri', r.belt), days = Math.max(1, Math.round(((r.end ? ms(r.end) : Date.now()) - ms(r.won)) / 86400000));
        return '<a class="tt-belt" tabindex="0" href="' + esc(absUrl('/mypage?tvch=' + r.belt + '&tvrn=' + r.n)) + '"><div class="pic' + (pic ? '' : ' ph') + '">' + (pic ? '<img src="' + esc(pic) + '" alt="">' : 'BELT') + '</div><div style="min-width:0">' +
          '<div class="t1">' + esc(isJa() ? B.ja : B.name) + ' · ' + esc(T(ord(r.n) + ' reign', '第' + r.n + '代')) + '</div>' +
          '<div class="t2">' + esc(fmtD(r.won)) + ' – ' + esc(r.end ? fmtD(r.end) : T('now', '現在')) + '</div>' +
          '<div class="t3">' + esc(T(days + ' days · ' + r.defs + (r.defs === 1 ? ' defence' : ' defences'), days + '日 · 防衛' + r.defs + '回')) + '</div></div></a>';
      }).join('') + '</div>';
    }
    h += '<div class="tt-sec"><i></i><b>' + esc(T('TAG MATCHES', 'タッグマッチ')) + '</b><span id="tt-vst"></span></div><div id="tt-vids"></div><div class="tt-dbg notranslate" translate="no" id="tt-dbg"></div>';
    scroller.innerHTML = h;
    focusEl(scroller.querySelector('.tt-btn') || scroller.querySelector('[tabindex="0"]'));
    V.queries = queriesFor(t);
    paintVids();
    var box = document.getElementById('tt-vids'), started = false;
    function start() { if (started) return; started = true; if (SHEET_ON) fromSheet(loadMore); else loadMore(); }
    // start when the section is on screen: now if it already is, otherwise once the page scrolls to it
    function inView() { if (!box) return true; var r = box.getBoundingClientRect(), v = scroller.getBoundingClientRect(); return r.top < v.bottom - 40; }
    if (inView()) start();
    else scroller.addEventListener('scroll', function onScroll() { if (inView()) { scroller.removeEventListener('scroll', onScroll); start(); } });
  }

  // ================================================================== remote: arrows move to the nearest item in that direction
  function focusables() { return Array.prototype.slice.call(scroller.querySelectorAll('[tabindex="0"]')).filter(function(e) { return e.offsetParent !== null; }); }
  function nearest(from, dir) {
    var a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = 1e9;
    focusables().forEach(function(el) {
      if (el === from) return;
      var b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay, p, s;
      if (dir === 'left') { if (b.right > a.left + 4 || Math.abs(dy) > Math.max(a.height, b.height) * 0.6) return; p = -dx; s = Math.abs(dy); }
      else if (dir === 'right') { if (b.left < a.right - 4 || Math.abs(dy) > Math.max(a.height, b.height) * 0.6) return; p = dx; s = Math.abs(dy); }
      else if (dir === 'up') { if (b.bottom > a.top + 4) return; p = -dy; s = Math.abs(dx); }
      else { if (b.top < a.bottom - 4) return; p = dy; s = Math.abs(dx); }
      var score = p + s * 2;
      if (score < bs) { bs = score; best = el; }
    });
    return best;
  }
  function choose(el) {
    if (el.getAttribute('data-f') != null) { filt = el.getAttribute('data-f'); renderList('[data-f="' + filt + '"]'); return true; }
    if (el.getAttribute('data-more') != null) { if (!V.busy) loadMore(); return true; }
    return false;
  }
  scroller.addEventListener('click', function(e) { var el = e.target.closest ? e.target.closest('[tabindex]') : null; if (el && choose(el)) e.preventDefault(); });
  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-tt') || menuOpen()) return;
    var k = e.keyCode, ae = document.activeElement;
    var stop = function() { e.preventDefault(); e.stopImmediatePropagation(); };
    if (k === 13 || k === 23) { if (ae && scroller.contains(ae) && choose(ae)) stop(); return; }
    var dir = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' }[k];
    if (!dir) return;
    stop();
    if (!ae || !scroller.contains(ae)) { focusEl(focusables()[0]); return; }
    var n = nearest(ae, dir);
    if (n) { focusEl(n, n.classList.contains('tt-card') || n.classList.contains('tt-more')); return; }
    if (dir === 'left') { if (window.__tvOpenMenu) window.__tvOpenMenu(); }
    else if (dir === 'up') scroller.scrollTop = 0;
    else if (dir === 'down') scroller.scrollTop += 240;   // fact rows below: scroll to read them
  }, true);

  if (Q.get('tvteam')) renderTeam(); else renderList(null);
})();
