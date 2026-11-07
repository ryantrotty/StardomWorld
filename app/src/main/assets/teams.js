(function(){
  // Tag Teams: the menu shelf (window.__tvTeams.shelfHtml), the All Tag Teams page (/mypage?tvteams=1[&era=n|&belt=id])
  // and a team's page (/mypage?tvteam=<id>). Teams are built from the Goddess of Stardom and NEW BLOOD Tag Team title
  // histories (lineageJson, so the daily file's newer copies count), plus assets/tag_teams.json for eras, faction-only
  // pair names, site spellings and teams that never held these titles (merged with the downloaded roster file, docs/ROSTER.md). A team's matches come from one keyword search
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

  // The Tag League mark: a pair of feathered wings, gold line (docs/DESIGN.md "Tag League"). The full drawing is for
  // 28 px and up; the small one (two feather rows, no feather lines) for the 14 to 24 px uses. bg = the fill behind it,
  // so the front feather rows hide the lines of the rows behind.
  var WING_FULL = '<path d="M30 31Q19 9 2 4Q8.44 8.65 1.67 12.81Q-2.81 17.6 3.33 19.89Q1.15 25.32 7 25.25Q7.1 31.32 12.67 28.89Q15.06 35.6 20.33 30.81Q25.02 38.15 30 31Z"/>' +
    '<path fill="none" d="M1.67 12.81L4.12 10.01M3.33 19.89L7.25 15.41M7 25.25L11.41 20.21M12.67 28.89L16.59 24.41M20.33 30.81L22.78 28.01"/>' +
    '<path d="M30 31Q19 9 6 7Q2.42 11.29 7.28 14.04Q5.25 18.82 10.32 19.96Q9.84 25.24 15.12 24.76Q16.19 30.54 21.68 28.44Q24.3 34.71 30 31Z"/>' +
    '<path fill="none" d="M7.28 14.04L8.62 12.14M10.32 19.96L12.34 17.1M15.12 24.76L17.14 21.9M21.68 28.44L23.02 26.54"/>' +
    '<path d="M30 31Q19 9 11 10Q9.81 14.62 14.44 15.81Q13.88 20.69 18.75 21.25Q18.81 26.38 23.94 26.31Q24.62 31.69 30 31Z"/>';
  var WING_SMALL = '<path d="M30 31Q19 9 2 4Q-6.67 10.46 2.25 16.56Q-1.46 24.23 7 25.25Q8.26 34.13 16.25 30.06Q22.47 40.16 30 31Z"/>' +
    '<path d="M30 31Q19 9 8 8Q4.33 15.13 11.78 18.11Q11.23 25.98 19.11 25.78Q21.68 34.38 30 31Z"/>';
  function wings(h, color, bg) {
    var small = h < 28, w = Math.round(h * 68 / 36), sw = small ? (h <= 16 ? 2.6 : 2.2) : (h >= 44 ? 1.1 : 1.4), p = small ? WING_SMALL : WING_FULL;
    return '<svg class="tt-wings" width="' + w + '" height="' + h + '" viewBox="-3 0 68 36" aria-hidden="true"><g fill="' + (bg || '#161F2A') + '" stroke="' + (color || '#F4C242') + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round">' +
      p + '<g transform="translate(62 0) scale(-1 1)">' + p + '</g></g></svg>';
  }
  API.wings = wings;
  // Tag League years from the roster file ("tagLeague": { "2026": { name, ja, dates, winners, blocks: [{ id, name, ja,
  // teams: [[a, b], ...] }] } }), newest first.
  var LEAGUES = (function() {
    var tl = CFG.tagLeague || {}, out = [];
    Object.keys(tl).forEach(function(y) { var L = tl[y]; if (L && L.blocks && L.blocks.length) out.push({ year: +y, L: L }); });
    return out.sort(function(a, b) { return b.year - a.year; });
  })();
  var LG_NOW = LEAGUES[0] || null;
  function leaguePath(y) { return '/mypage?tvteams=1&league=' + y; }
  function leagueCount(Y) { return Y.L.blocks.reduce(function(a, b) { return a + (b.teams || []).length; }, 0); }
  function blockName(b, short) { var n = isJa() && b.ja ? b.ja : (b.name || ''); return short && !isJa() ? n.replace(/^(\w+)\s+Goddesses$/i, function(m, w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }) : n; }
  function pairKey(a) { return a.slice().map(function(n) { return String(n).trim().toLowerCase(); }).sort().join('|'); }
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
    (CFG.hide || []).forEach(function(k) { delete byKey[String(k).toLowerCase()]; });   // roster file "remove"
    // Tag League entrants: each team gets its years and blocks; a pair with no entry yet is added as a team.
    LEAGUES.forEach(function(Y) {
      Y.L.blocks.forEach(function(bl) {
        (bl.teams || []).forEach(function(m) {
          if (!m || m.length !== 2) return;
          var key = pairKey(m), t = byKey[key] = byKey[key] || { members: m, names: {}, reigns: [], since: Y.year + '-11-01' };
          (t.league = t.league || []).push({ year: Y.year, block: bl.id || '', bname: bl.name || '', bja: bl.ja || '' });
        });
      });
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
      t.league = t.league || [];
      return t;
    });
    TEAMS.sort(function(a, b) { return a.last < b.last ? 1 : -1; });   // most recent title first
    return TEAMS;
  }
  function teamById(id) { var l = build(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function teamPath(t) { return '/mypage?tvteam=' + encodeURIComponent(t.id); }
  // ---- My Favorites (assets/favorites.js keeps the list): what a favorite team is saved with, and whether one is a favorite
  API.info = function(id) {
    var t = teamById(id);
    if (!t) return null;
    var b = Object.keys(BELTS).filter(function(k) { return t.reigns.some(function(r) { return r.belt === k; }); });   // in BELTS order: Goddess, then NEW BLOOD
    return { id: t.id, n: t.display, m: t.members.slice(), ms: t.members.map(searchName), b: b };
  };
  function isFav(id) { try { return !!(window.__tvFav && window.__tvFav.hasTeam(id)); } catch (e) { return false; } }
  function favCount() { try { return window.__tvFav ? window.__tvFav.load().t.length : 0; } catch (e) { return 0; } }
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
        '#tv-sm-shelf .tv-shl-mine{color:#F4C242;font-weight:900;}',
        '#tv-sm-shelf .tv-shl-top.tt-top{display:flex;flex-direction:column;gap:10px;}',
        '#tv-sm-shelf .tv-shl-tm.tv-fav-on .a::before{content:"\\2605  ";color:#F4C242;}',
        '#tv-sm-shelf .tv-sm-fi.tv-shl-tm.tv-fav-on::before{content:none;display:none;}',   // the star goes before the name, not on its own line
        '#tv-sm-shelf .tv-shl-ecol .tv-sm-fi.tv-shl-tmore{color:#F4C242 !important;font-size:15px;padding:5px 10px;}',
        '#tv-sm-shelf .tv-shl-tm.tt-lg{position:relative;padding-right:40px !important;}',
        '#tv-sm-shelf .tv-shl-tm.tt-lg .tt-wings{position:absolute;right:8px;top:50%;margin-top:-8px;}',
        '#tv-sm-shelf .tv-shl-all.tt-lgbar{display:flex;align-items:center;gap:12px;}',
        '#tv-sm-shelf .tv-shl-all.tt-lgbar .tt-wings{flex:none;}'
      ].join('\n');
      (document.head || document.documentElement).appendChild(st);
    }
    var all = build(), per = 5, cols = '';
    eraList().forEach(function(e) {
      var list = all.filter(function(t) { return t.era === e.n; }), ep = '/mypage?tvteams=1&era=' + e.n;
      cols += '<div class="tv-shl-ecol"><a class="tv-sm-fi tv-shl-eh" tabindex="0" data-go="' + esc(ep) + '" href="' + esc(absUrl(ep)) + '"><span class="tv-shl-ek notranslate" translate="no">' + esc(e.kanji) + '</span><span class="tv-shl-ex"><span class="tv-shl-e1">' + esc(e.name) + '</span><span class="tv-shl-e2">' + list.length + ' ' + esc(T(list.length === 1 ? 'team' : 'teams', 'チーム')) + '</span></span></a>';
      list.slice(0, per).forEach(function(t) {
        var inLg = LG_NOW && t.league.some(function(x) { return x.year === LG_NOW.year; });
        cols += '<a class="tv-sm-fi tv-shl-tm' + (inLg ? ' tt-lg' : '') + '" tabindex="0" data-go="' + esc(teamPath(t)) + '" href="' + esc(absUrl(teamPath(t))) + '"><span class="a notranslate" translate="no">' + esc(t.display) + '</span><span class="b notranslate" translate="no">' + esc(t.sub) + '</span>' + (inLg ? wings(16, '#F4C242', '#121922') : '') + '</a>';
      });
      if (list.length > per) cols += '<a class="tv-sm-fi tv-shl-tmore" tabindex="0" data-go="' + esc(ep) + '" href="' + esc(absUrl(ep)) + '">' + esc(T('+' + (list.length - per) + ' more', '他' + (list.length - per) + 'チーム')) + '</a>';
      cols += '</div>';
    });
    var ap = '/mypage?tvteams=1', fp = '/mypage?tvfav=teams', fc = favCount();
    var lgBar = '';
    if (LG_NOW) {
      var lp = leaguePath(LG_NOW.year), ln = leagueCount(LG_NOW);
      lgBar = '<a class="tv-sm-fi tv-shl-all tt-lgbar" tabindex="0" data-go="' + esc(lp) + '" href="' + esc(absUrl(lp)) + '">' + wings(22, '#F4C242', '#161F2A') + '<div>' + esc(T('Tag League ' + LG_NOW.year, 'タッグリーグ ' + LG_NOW.year)) +
        '<span>' + esc(T(ln + ' teams · ' + LG_NOW.L.blocks.map(function(b) { return blockName(b, true); }).join(' and ') + (LG_NOW.L.dates ? ' · ' + LG_NOW.L.dates : ''), ln + 'チーム')) + '</span></div></a>';
    }
    return '<div class="tv-shl-t">' + esc(T('TAG TEAMS', 'タッグチーム')) + '</div>' +
      '<div class="tv-shl-top tt-top"><a class="tv-sm-fi tv-shl-all" tabindex="0" data-go="' + ap + '" href="' + esc(absUrl(ap)) + '">' + esc(T('All Tag Teams', 'すべてのタッグチーム')) + '<span>' + esc(T(all.length + ' champion teams, A to Z', '王者チーム' + all.length + '組')) + '</span></a>' + lgBar +
        '<a class="tv-sm-fi tv-shl-all" tabindex="0" data-go="' + fp + '" href="' + esc(absUrl(fp)) + '"><div><b class="tv-shl-mine">\u2605</b> ' + esc(T('My Tag Teams', 'お気に入りチーム')) + '</div><span>' + esc(fc ? T(fc + (fc === 1 ? ' favorite' : ' favorites'), fc + 'チーム') : T('Menu button on a team adds it', 'チームでメニューボタン')) + '</span></a></div>' +
      '<div class="tv-shl-ec">' + cols + '</div>';
  };

  // ---- names the site searches for (used by the pages below and by My Favorites)
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
    '#tv-tt .tt-roster{margin-top:4px;font-size:13px;font-weight:700;color:#9AA6B4;}',
    '#tv-tt .tt-team{display:flex;align-items:center;gap:10px;height:66px;padding:0 14px;background:#161F2A;border:2px solid #161F2A;border-radius:8px;min-width:0;cursor:pointer;}',
    '#tv-tt .tt-team:focus{background:#172029;border-color:#F4C242;}',
    '#tv-tt .tt-team .x{flex:1 1 auto;min-width:0;}',
    '#tv-tt .tt-team.tt-fav .a::before{content:"\\2605  ";color:#F4C242;}',
    '#tv-tt .tt-team .a{font-size:17px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-tt .tt-team .b{font-size:13px;font-weight:600;color:#9AA6B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}',
    '#tv-tt .tt-tag{flex:none;font-size:11px;font-weight:800;letter-spacing:1px;padding:3px 6px;border-radius:4px;border:1px solid #F4C242;color:#F4C242;white-space:nowrap;}',
    '#tv-tt .tt-tag.nb{border-color:#9AA6B4;color:#C9D2DC;}',
    '#tv-tt .tt-tag.ch{background:#F4C242;color:#1A1A1A;}',
    '#tv-tt .tt-tag.tt-lgt{display:flex;align-items:center;gap:5px;}',
    '#tv-tt .tt-chip.tt-lgchip{margin-left:14px;}',
    '#tv-tt .tt-lg-head{display:flex;align-items:center;gap:16px;}',
    '#tv-tt .tt-lg-head .tt-chips{margin:0 0 0 auto;}',
    '#tv-tt .tt-lg-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:8px;}',
    '#tv-tt .tt-lg-col{display:flex;flex-direction:column;gap:8px;min-width:0;}',
    '#tv-tt .tt-lg-row{display:flex;align-items:center;gap:12px;height:50px;padding:0 14px;background:#161F2A;border:2px solid #161F2A;border-radius:8px;min-width:0;cursor:pointer;}',
    '#tv-tt .tt-lg-row:focus{background:#172029;border-color:#F4C242;}',
    '#tv-tt .tt-lg-row .a{font-size:17px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;}',
    '#tv-tt .tt-lg-row .b{font-size:13px;font-weight:600;color:#9AA6B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;min-width:0;}',
    '#tv-tt .tt-lg-row.tt-fav .a::before{content:"\\2605  ";color:#F4C242;}',
    '#tv-tt .tt-sec .tt-wings{flex:none;}',
    '#tv-tt .tt-h1 .tt-wings{margin-left:12px;vertical-align:-2px;}',
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
    '#tv-tt .tt-favb{display:flex;align-items:center;gap:8px;line-height:normal;}',
    '#tv-tt .tt-favb .st{color:#F4C242;font-size:19px;}',
    '#tv-tt .tt-favb.tt-on{background:#2A2410;color:#F4C242 !important;}',
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
    '#tv-tt .tt-more.tt-top{min-height:60px;font-size:17px;align-self:start;}',
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
  function tags(t, noLeague) {
    var h = '';
    if (t.champ.length) h += '<span class="tt-tag ch">' + esc(T('CHAMPIONS', '王者')) + '</span>';
    if (t.count.goddess) h += '<span class="tt-tag">' + esc(T('GODDESS', 'ゴッデス')) + (t.count.goddess > 1 ? ' ×' + t.count.goddess : '') + '</span>';
    if (t.count.newblood) h += '<span class="tt-tag nb">NEW BLOOD' + (t.count.newblood > 1 ? ' ×' + t.count.newblood : '') + '</span>';
    if (t.league.length && !noLeague) h += '<span class="tt-tag tt-lgt">' + wings(14, '#F4C242', '#161F2A') + esc(T('TAG LEAGUE', 'タッグリーグ')) + (t.league.length > 1 ? ' ×' + t.league.length : '') + '</span>';
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
      '<div class="tt-note">' + esc(T('Every pair that has held the Goddess of Stardom or NEW BLOOD Tag Team belts, plus other current teams. A pair known only by its faction shows the two names, with the faction underneath.', 'ゴッデス・オブ・スターダム王座、NEW BLOODタッグ王座を獲得したすべてのチームと、その他の現役チーム。')) + '</div></div>' +
      '<div class="tt-instr">' + esc(T('Left and Right change the filter. Down moves into the list. OK opens a team.', '左右で絞り込み、下で一覧へ。OKでチームを開きます。')) + '</div></div>';
    var chips = [['all', esc(T('All', 'すべて')) + ' <small>' + all.length + '</small>']];
    // short era names keep the chips on one line: "Threedom & the Rebuild" -> "Threedom", "The Draft Years" -> "Draft Years"
    eraList().forEach(function(e) { chips.push(['e' + e.n, '<span class="k notranslate" translate="no">' + esc(e.kanji) + '</span>' + esc(isJa() && e.ja ? e.ja : String(e.name).split(' & ')[0].replace(/^The /, ''))]); });
    // championship filters carry a small drawn belt, so they read apart from the era filters
    var BELT_ICON = '<svg class="bi" width="30" height="16" viewBox="0 0 30 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="5" width="28" height="6" rx="2"></rect><circle cx="15" cy="8" r="5.5" fill="#161F2A"></circle><circle cx="15" cy="8" r="2.2"></circle><circle cx="7" cy="8" r="1.4"></circle><circle cx="23" cy="8" r="1.4"></circle></svg>';
    chips.push(['bgoddess', BELT_ICON + esc(T('Goddess', 'ゴッデス'))]);
    chips.push(['bnewblood', BELT_ICON + 'NEW BLOOD']);
    h += '<div class="tt-chips">' + chips.map(function(c) { return '<a class="tt-chip' + (c[0] === filt ? ' tt-on' : '') + '" tabindex="0" data-f="' + c[0] + '">' + c[1] + '</a>'; }).join('') +
      (LG_NOW ? '<a class="tt-chip tt-lgchip" tabindex="0" href="' + esc(absUrl(leaguePath(LG_NOW.year))) + '">' + wings(16, '#F4C242', '#161F2A') + esc(T('Tag League', 'タッグリーグ')) + '</a>' : '') + '</div>';
    h += '<div class="tt-grid">' + list.map(function(t) {
      return '<a class="tt-team' + (isFav(t.id) ? ' tt-fav' : '') + '" tabindex="0" data-favt="' + esc(t.id) + '" href="' + esc(absUrl(teamPath(t))) + '"><div class="x"><div class="a notranslate" translate="no">' + esc(t.display) + '</div><div class="b notranslate" translate="no">' + esc(t.sub) + '</div></div>' + tags(t) + '</a>';
    }).join('') + '</div>';
    h += '<div class="tt-count">' + esc(T(list.length + (list.length === 1 ? ' team' : ' teams') + (filt === 'all' ? '' : ' of ' + all.length), list.length + 'チーム' + (filt === 'all' ? '' : ' / ' + all.length))) + '</div>';
    // which roster file this TV is using, so a roster change can be checked on screen (stays put, no fading)
    var R = CFG.roster || {};
    h += '<div class="tt-roster">' + esc(R.state === 'ok'
      ? T('Roster file' + (R.updated ? ' of ' + fmtD(R.updated) : '') + ': tag teams ' + R.adds + ' added, ' + R.removes + ' removed · factions ' + (R.factions || 0) + ' changed · faction members ' + (R.members || 0) + ' changed · past wrestlers ' + (R.pastAdds || 0) + ' added, ' + (R.pastRemoves || 0) + ' removed',
          '名簿ファイル' + (R.updated ? '（' + fmtD(R.updated) + '）' : '') + '：タッグ 追加 ' + R.adds + '・削除 ' + R.removes + ' · ユニット 変更 ' + (R.factions || 0) + ' · メンバー 変更 ' + (R.members || 0) + ' · 元所属 追加 ' + (R.pastAdds || 0) + '・削除 ' + (R.pastRemoves || 0))
      : T('Roster file: not downloaded yet (built-in list)', '名簿ファイル：未取得（内蔵リスト）')) + '</div>';
    scroller.innerHTML = h;
    focusEl((focusSel && scroller.querySelector(focusSel)) || scroller.querySelector('.tt-chip.tt-on') || scroller.querySelector('.tt-chip'));
  }

  // ================================================================== Tag League page (/mypage?tvteams=1&league=<year>)
  // The two blocks side by side (docs/DESIGN.md "Tag League"), years newest on the left. Opens no searches.
  function renderLeague(focusSel) {
    var y = +Q.get('league'), Y = null;
    LEAGUES.forEach(function(x) { if (x.year === y) Y = x; });
    Y = Y || LG_NOW;
    if (!Y) { scroller.innerHTML = '<div class="tt-head"><div class="tt-bar"></div><div class="tt-h1">' + esc(T('Tag League', 'タッグリーグ')) + '</div></div><div class="tt-msg">' + esc(T('No Tag League in the roster file yet.', '名簿ファイルにタッグリーグがありません。')) + '</div>'; return; }
    var L = Y.L, byKey = {};
    build().forEach(function(t) { byKey[pairKey(t.members)] = t; });
    var h = '<div class="tt-lg-head">' + wings(44, '#F4C242', '#0B1118') + '<div style="min-width:0"><div class="tt-h1">' + esc(isJa() && L.ja ? L.ja : (L.name || T('Tag League ' + Y.year, 'タッグリーグ ' + Y.year))) + '</div>' +
      '<div class="tt-note">' + esc([L.dates || '', L.winners ? T(L.winners, L.winnersJa || L.winners) : ''].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div class="tt-chips">' + LEAGUES.map(function(x) { return '<a class="tt-chip' + (x === Y ? ' tt-on' : '') + '" tabindex="0" href="' + esc(absUrl(leaguePath(x.year))) + '">' + x.year + '</a>'; }).join('') + '</div></div>';
    h += '<div class="tt-lg-cols">' + L.blocks.map(function(bl) {
      var rows = (bl.teams || []).map(function(m) {
        var t = byKey[pairKey(m)];
        if (!t) return '';
        var win = !!(L.winnerTeam && pairKey(L.winnerTeam) === pairKey(m));
        var prev = !win && !!(L.prevWinners && L.prevWinners.team && pairKey(L.prevWinners.team) === pairKey(m));
        return '<a class="tt-lg-row' + (isFav(t.id) ? ' tt-fav' : '') + '" tabindex="0" data-favt="' + esc(t.id) + '" href="' + esc(absUrl(teamPath(t))) + '"><span class="a notranslate" translate="no">' + esc(t.display) + '</span><span class="b notranslate" translate="no">' + esc(t.name ? t.members.join(' & ') : '') + '</span>' +
          (win ? '<span class="tt-tag ch">' + esc(T('WINNERS', '優勝')) + '</span>' : '') +
          (prev ? '<span class="tt-tag ch">' + esc(T(L.prevWinners.year + ' WINNERS', L.prevWinners.year + '年優勝')) + '</span>' : '') + tags(t, true) + '</a>';
      }).join('');
      return '<div class="tt-lg-col"><div class="tt-sec" style="margin:14px 0 4px 0"><i></i><b>' + esc(isJa() && bl.ja ? bl.ja : bl.name) + '</b><span>' + esc(T((bl.teams || []).length + ' teams', (bl.teams || []).length + 'チーム')) + '</span></div>' + rows + '</div>';
    }).join('') + '</div>';
    h += '<div class="tt-count">' + esc(T(leagueCount(Y) + ' teams', leagueCount(Y) + 'チーム')) + '</div>';
    scroller.innerHTML = h;
    focusEl((focusSel && scroller.querySelector(focusSel)) || scroller.querySelector('.tt-lg-row') || scroller.querySelector('.tt-chip'));
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
  if (!MT_ALL.length) MT_ALL = [/tag|\u30bf\u30c3\u30b0|goddess\s*official|\u30b4\u30c3\u30c7\u30b9\u516c\u5f0f/i];   // Tag League: "Red/Blue Goddess Official Match"
  function half(t) { return String(t || '').replace(/[\uff01-\uff5e]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/\u3000/g, ' '); }
  // Private builds: Titles & tournaments categories (match_types.json, private group; the roster file can change them).
  var CATS_ON = false, CAT = {};
  try { CATS_ON = !!(H.categoriesOn && H.categoriesOn()); } catch (e) { CATS_ON = false; }
  if (CATS_ON) {
    try {
      ((parse(call('matchTypesJson')) || {}).groups || []).forEach(function(g) {
        if (!g.private) return;
        (g.items || []).forEach(function(x) {
          var re = function(l) { return (l || []).map(function(p) { return new RegExp(p, 'i'); }); };
          CAT[x.id] = { x: x, all: re(x.all), none: re(x.none), tagBelt: re(x.tagBelt) };
        });
      });
    } catch (e) { CAT = {}; }
  }
  function catFits(id, t) {
    var c = CAT[id]; if (!c) return false;
    t = half(t);
    return c.all.every(function(r) { return r.test(t); }) && !c.none.some(function(r) { return r.test(t); });
  }
  // a tag title match (Goddess, NEW BLOOD tag): its title has no "tag" in it ("ゴッデス・オブ・スターダム選手権試合")
  function isTagBeltMatch(t) { var c = CAT.champ; return !!(c && catFits('champ', t) && c.tagBelt.some(function(r) { return r.test(half(t)); })); }
  var SHOW_RE = /^\s*\d{4}\/\d{1,2}\/\d{1,2}_|day-?\s*\d/i;   // whole-show uploads ("2021/11/14_…", "…Day-2")
  function isTagTitle(t) {
    if (CATS_ON && SHOW_RE.test(half(t))) return false;
    if (CATS_ON && (isTagBeltMatch(t) || catFits('tagleague', t))) return true;
    t = half(t);
    for (var i = 0; i < MT_ALL.length; i++) if (!MT_ALL[i].test(t)) return false;
    for (var j = 0; j < MT_NONE.length; j++) if (MT_NONE[j].test(t)) return false;
    return true;
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
    var url = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(q) + '&activetab=contents' + (CATS_ON ? '&q%5Btype%5D=single' : '') + (page > 1 ? '&page=' + page : '');
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

  var V = { kept: [], seen: {}, dropMulti: 0, dropOpp: 0, verified: 0, queries: [], qi: 0, page: 1, more: true, busy: false, log: [], done: false, dropped: [] };
  // Private builds: one tab at a time (All Tag Matches, Championship, Tag League); only the open tab searches.
  var TAB = '';   // set in renderTeam (CATS_ON is read further down)
  var C = { q: '', page: 1, done: false, ran: false, kept: [] };   // the Championship tab's search
  function champMore() {
    if (V.busy || C.done) return;
    V.busy = true; V.which = 'C'; paintVids();
    fetchPage(C.q, C.page, function(err, items, more, cached) {
      V.busy = false; C.ran = true;
      if (err) { V.log.push(C.q + ' · page ' + C.page + ': ' + err); C.done = true; paintVids(); return; }
      var kept = [], d0 = V.dropped.length;
      items.forEach(function(it) {
        if (V.seen[it.id]) return; V.seen[it.id] = 1;
        if (!isTagBeltMatch(it.t)) { V.dropped.push(it.t); return; }   // team pages keep tag title matches only
        // a dated Goddess title match must be one this pair was in, by the title history (as champions or challengers);
        // NEW BLOOD tag has no defence list to check against, so those stay
        var dd = dateOfTitle(it.t);
        if (dd && GODDESS_RE.test(half(it.t)) && pairDates().goddess && !pairDates().goddess[dd]) { V.dropped.push('[not this pair, by the title history] ' + it.t); return; }
        var sd = sidesCheck(TEAM, it.id);
        if (sd === 'opponents') { V.dropOpp++; V.dropped.push('[opponents] ' + it.t); return; }
        if (sd === 'partners') { it.ok = 1; V.verified++; }
        kept.push(it);
      });
      C.kept = C.kept.concat(kept);
      V.log.push(C.q + ' · page ' + C.page + ': ' + items.length + ' videos, ' + kept.length + ' kept' + (cached ? ' (saved copy)' : ''));
      dbgSend(C.q, C.page, items, kept, V.dropped.slice(d0), cached);
      C.page++;
      if (!more) C.done = true;
      paintVids();
    });
  }
  // Each search on a tab goes to the private sheet's debug tab, so the rules can be checked from there.
  function dbgSend(q, page, items, kept, dropped, cached) {
    if (!TAB || !SHEET_ON) return;
    var rec = TAB === 'ch' ? champRecord() : null;
    sheet('dbg_put', { page: 'team', subject: TEAM.id, tab: TAB, url: location.pathname + location.search,
      record: { query: q, pageNo: page, cached: !!cached, videos: items.length, kept: kept.map(function(x) { return x.t; }), dropped: dropped, onRecord: rec } }, function(r) {
      V.log.push(r && r.ok ? T('debug sent to the sheet', 'デバッグをシートに送信') : T('debug not sent: ', 'デバッグ未送信: ') + ((r && r.error) || ''));
      paintVids();
    });
  }
  // Goddess of Stardom title matches this pair was in, by date: reigns won, defences, and other champions' defences
  // against them (opp names both). null when the history can't be read.
  var GODDESS_RE = /goddess(?:es)?\s*of\s*stardom|ゴッデス・オブ・スターダム/i, PAIR_DATES = null;
  function pairDates() {
    if (PAIR_DATES) return PAIR_DATES;
    PAIR_DATES = { goddess: null };
    try {
      var L = parse(call('lineageJson', 'goddess'));
      if (!L || !L.reigns) return PAIR_DATES;
      var alias = {};
      Object.keys(L.alias || {}).forEach(function(n) { (L.alias[n] || []).concat([n]).forEach(function(a) { alias[String(a).toLowerCase()] = String(n).toLowerCase(); }); });
      var canon = function(n) { var k = String(n).trim().toLowerCase(); return alias[k] || k; };
      var want = TEAM.members.map(canon);
      var both = function(str) { var who = String(str || '').split(/\s*(?:&|,|・|＆)\s*/).map(canon); return want.every(function(n) { return who.indexOf(n) >= 0; }); };
      var out = {};
      L.reigns.forEach(function(r) {
        var mine = both(r.champ);
        if (mine && r.won) out[r.won] = 1;
        (r.defences || []).forEach(function(df) { if (df && df.d && (mine || both(df.opp))) out[df.d] = 1; });
        if (both(r.vs) && r.won) out[r.won] = 1;   // the match where they lost the belts
      });
      PAIR_DATES.goddess = out;
    } catch (e) {}
    return PAIR_DATES;
  }
  // The Championship tab's check: title matches on record for this team (reigns won and defences) against what was found.
  function champRecord() {
    var rec = [];
    (TEAM.reigns || []).forEach(function(r) { if (r.won) rec.push(r.won); (r.defences || []).forEach(function(d) { if (d && d.d) rec.push(d.d); }); });
    Object.keys(pairDates().goddess || {}).forEach(function(d) { if (rec.indexOf(d) < 0) rec.push(d); });   // incl. their challenges
    rec.sort().reverse();
    var seen = {};
    C.kept.forEach(function(it) { var d = dateOfTitle(it.t); if (d) seen[d] = 1; });
    return { total: rec.length, found: rec.filter(function(d) { return seen[d]; }), missing: rec.filter(function(d) { return !seen[d]; }) };
  }
  function queriesFor(t) {
    // Same words and order as the filter bar: wrestler, then "Tag Team", then the competitor.
    function pair(f) { return f(t.members[0]) + ' Tag Team ' + f(t.members[1]); }
    var q = [pair(searchName)], alt = pair(siteName);
    if (q.indexOf(alt) < 0) q.push(alt);   // another spelling, tried only when the first search finds no videos
    if (t.name) q.push(t.name);
    return q;
  }
  // Tag League official matches ("Red/Blue Goddess Official Match") don't say "Tag Team", so the "Tag Team" search can't
  // find them and the site has no OR. They get their own search, "A Goddess B", shown in its own row above Tag Matches.
  // It runs first; the "Tag Team" search follows MAIN_PAUSE_MS later. Where each search got to: L (here) and V.
  var L = { q: '', page: 1, done: false, ran: false, kept: [] }, MAIN_PAUSE_MS = 5000, LG_KEY = 'tvTeamLeagueV1';
  // Tag League titles (league row): Red/Blue Goddess Official Match, ゴッデス公式戦, 公式リーグ戦, 〜タッグリーグ戦〜.
  // Anything else either search keeps (a Goddess of Stardom title match, say) goes in the Tag Matches row.
  var LEAGUE_RE = /goddess(?:es)?\s*official|tag\s*league|\u30b4\u30c3\u30c7\u30b9\u516c\u5f0f|\u30bf\u30c3\u30b0\u30ea\u30fc\u30b0|\u516c\u5f0f\u30ea\u30fc\u30b0/i;
  function isLeague(it) { return LEAGUE_RE.test(half(it.t)); }
  function place(list, front) {   // kept matches go to the row they belong to
    var lg = list.filter(isLeague), tg = list.filter(function(it) { return !isLeague(it); });
    L.kept = front ? lg.concat(L.kept) : L.kept.concat(lg);
    V.kept = front ? tg.concat(V.kept) : V.kept.concat(tg);
  }
  function lgState() { var a = parse(lsGet(LG_KEY)) || {}; return TEAM ? a[TEAM.id] || null : null; }
  function lgSave() { var a = parse(lsGet(LG_KEY)) || {}; a[TEAM.id] = { page: L.page, done: L.done, at: Date.now(), rule: TM_RULE }; lsSet(LG_KEY, JSON.stringify(a)); }
  // The Tag League search on opening the page. With the sheet, a search this TV finished under the current rule in the
  // last 14 days isn't repeated (its matches came back with the saved list); More carries on an unfinished one. Without
  // the sheet, page 1 is read again (the 7-day saved copy usually answers it). cb(true) when the site was asked.
  function leagueFirst(cb) {
    var st = lgState();
    if (SHEET_ON && st && st.rule === TM_RULE && Date.now() - (st.at || 0) < REFRESH_MS) {
      L.page = st.page || 2; L.done = !!st.done; L.ran = true;
      V.log.push(T('Tag League search: ', 'タッグリーグ検索: ') + L.q + T(st.done ? ' · all pages searched ' : ' · next page from More, searched ', st.done ? ' · 全ページ検索済み ' : ' · 次のページは「さらに表示」 ') + new Date(st.at).toISOString().slice(0, 10));
      paintVids(); cb(false); return;
    }
    L.page = 1; L.done = false;
    leagueMore(cb);
  }
  function leagueMore(cb) {
    if (V.busy || L.done) { if (cb) cb(false); return; }
    V.busy = true; V.which = 'L'; paintVids();
    fetchPage(L.q, L.page, function(err, items, more, cached) {
      V.busy = false; L.ran = true;
      if (err) { V.log.push(L.q + ' · page ' + L.page + ': ' + err); L.done = true; paintVids(); if (cb) cb(true); return; }
      var d0 = V.dropped.length, kept = keepItems(items);
      place(kept, false);
      dbgSend(L.q, L.page, items, kept.filter(isLeague), V.dropped.slice(d0).concat(kept.filter(function(x) { return !isLeague(x); }).map(function(x) { return '[not Tag League: in All Tag Matches] ' + x.t; })), cached);
      V.log.push(L.q + ' · page ' + L.page + ': ' + items.length + ' videos, ' + kept.length + ' kept' + (cached ? ' (saved copy)' : ''));
      L.page++;
      if (!more) L.done = true;
      lgSave(); paintVids();
      save(kept, false, L.q);
      if (cb) cb(!cached);
    });
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
      if (!isTagTitle(it.t)) { V.dropMulti++; V.dropped.push(it.t); return; }
      var s = sidesCheck(TEAM, it.id);
      if (s === 'opponents') { V.dropOpp++; V.dropped.push('[opponents] ' + it.t); return; }
      if (s === 'partners') { it.ok = 1; V.verified++; }
      add.push(it);
    });
    return add;
  }
  // Matches the sheet couldn't take (busy or unreachable) wait on this TV, per team, and go with the next sheet read.
  var PEND_KEY = 'tvTeamPendV1';
  function pendAll() { return parse(lsGet(PEND_KEY)) || {}; }
  function pendGet() { return pendAll()[TEAM.id] || null; }
  function pendSet(p) { var a = pendAll(); if (p) a[TEAM.id] = p; else delete a[TEAM.id]; lsSet(PEND_KEY, JSON.stringify(a)); }
  function pendAdd(items, next, q, fresh) {
    var p = pendGet() || { items: [], next: null, query: '', fresh: true }, have = {};
    p.items.forEach(function(x) { have[x.id] = 1; });
    p.items = items.filter(function(x) { return !have[x.id]; }).concat(p.items).slice(0, 100);
    if (!fresh || !p.next) p.next = next;   // a refresh doesn't move where the deeper search got to
    p.query = q || p.query; p.fresh = p.fresh && !!fresh;
    pendSet(p);
  }
  function flushPending() {
    var p = pendGet();
    if (!p) return;
    sheet('tm_put', { items: p.items, next: p.next, query: p.query, fresh: p.fresh }, function(r) {
      if (r && r.ok) { pendSet(null); V.log.push(T('sent ' + p.items.length + ' matches kept on this TV: ' + r.added + ' new, ' + r.count + ' in all', 'このテレビに保存していた ' + p.items.length + ' 試合を送信: 新規' + r.added + '、計' + r.count)); }
      else V.log.push(T('still kept on this TV (', 'このテレビに保存中（') + p.items.length + T(' matches): ', ' 試合）: ') + ((r && r.error) || ''));
      paintVids();
    });
  }
  function save(items, fresh, q) {
    if (!SHEET_ON) return;
    var list = items.map(function(x) { return { id: x.id, t: x.t, b: x.b }; }), next = { qi: V.qi, page: V.page, done: V.done };
    sheet('tm_put', { items: list, next: next, query: q, fresh: !!fresh }, function(r) {
      if (r && r.ok) V.log.push(T('saved to your sheet: ' + r.added + ' new, ' + r.count + ' in all', 'シートに保存: 新規' + r.added + '、計' + r.count));
      else { pendAdd(list, next, q, fresh); V.log.push(T('sheet busy, kept on this TV to send later: ', 'シートが混雑、このテレビに保存して後で送信: ') + ((r && r.error) || '')); }
      paintVids();
    });
  }
  // A saved list is shown straight away, with no site search. Only a list older than 14 days gets its newest page
  // searched again (new matches go first); everything else waits for "More tag matches".
  // The 2-on-2 rule's version (raise it whenever match_types.json "tag" keeps more titles) and, per TV, the version
  // each team was last searched with.
  var TM_RULE = 5, RULE_KEY = 'tvTeamRuleV1';
  function ruleSeen() { var a = parse(lsGet(RULE_KEY)) || {}; return a[TEAM.id] || 1; }
  function ruleMark() { var a = parse(lsGet(RULE_KEY)) || {}; if (a[TEAM.id] !== TM_RULE) { a[TEAM.id] = TM_RULE; lsSet(RULE_KEY, JSON.stringify(a)); } }
  function fromSheet(done) {   // done(the "Tag Team" search step to run next: loadMore, refreshNewest or null)
    V.busy = true; V.which = 'S'; paintVids();
    sheet('tm_get', {}, function(r) {
      V.busy = false;
      if (r && r.ok) flushPending();
      var pend = pendGet();
      if (pend && r && r.ok) r.items = (r.items || []).concat(pend.items);   // shown now, sent by flushPending
      // A row with no matches yet still counts when its search has moved past page 1 (More carries on from there).
      var nx = (r && r.next) || {};
      if (!r || !r.ok || !r.found || !((r.items || []).length || nx.page > 1 || nx.qi > 0 || nx.done)) {
        V.log.push(r && r.ok ? T('no saved list in your sheet yet', 'シートに保存なし') : T('sheet not read: ', 'シートを読めません: ') + ((r && r.error) || ''));
        done(loadMore); return;
      }
      var add = keepItems(r.items);
      place(add, false);
      V.ran = true;
      // The saved place belongs to the search words it was made with: when this version searches with other words
      // (r.queries doesn't include the first one), the saved matches stay and the new search starts at page 1.
      var sameWords = !r.queries || !r.queries.length || r.queries.indexOf(V.queries[0]) >= 0;
      // A list saved under an older version of the 2-on-2 rule may be missing matches that rule threw away (before
      // 2.40.1, Tag League "Goddess Official Match" titles). Its saved matches stay, and the search starts again from
      // page 1 once on this TV; More then carries on page by page as usual.
      var oldRule = ruleSeen() < TM_RULE;
      if (r.next && sameWords && !oldRule) { V.qi = r.next.qi || 0; V.page = r.next.page || 1; V.done = !!r.next.done; }
      V.log.push(T('saved list from your sheet: ' + add.length + ' matches (searched ' + String(r.searched || '').slice(0, 10) + ')', 'シートの保存: ' + add.length + '試合（' + String(r.searched || '').slice(0, 10) + '）'));
      if (!sameWords) V.log.push(T('saved with other search words: searching page 1 of ', '検索語が変わったため1ページ目から: ') + V.queries[0]);
      else if (oldRule) V.log.push(T('saved under an older match rule: searching again from page 1 of ', '旧ルールで保存：1ページ目から再検索: ') + V.queries[0]);
      paintVids();
      if (!sameWords || oldRule) { done(loadMore); return; }   // one search, as on a first visit
      var age = Date.now() - (Date.parse(r.refreshed || '') || 0);
      done(age > REFRESH_MS ? refreshNewest : null);
    });
  }
  function refreshNewest() {
    if (V.busy) return;
    V.busy = true; V.which = 'V'; paintVids();
    var q = V.queries[0];
    fetchPage(q, 1, function(err, items, more, cached) {
      V.busy = false;
      if (err) { V.log.push(q + ' · page 1 (refresh): ' + err); paintVids(); return; }
      var add = keepItems(items);
      place(add, true);
      V.log.push(q + ' · page 1 (refresh): ' + items.length + ' videos, ' + add.length + ' new' + (cached ? ' (saved copy)' : ''));
      paintVids();
      save(add, true, q);
    });
  }

  function loadMore() {
    if (V.busy || V.done) return;
    V.busy = true; V.which = 'V'; paintVids();
    var q = V.queries[V.qi];
    fetchPage(q, V.page, function(err, items, more, cached) {
      V.busy = false; V.ran = true;
      if (err) { V.log.push(q + ' · page ' + V.page + ': ' + err); V.done = true; paintVids(); return; }
      var d0 = V.dropped.length, kept = keepItems(items), add = kept.length;
      place(kept, false);
      dbgSend(q, V.page, items, kept, V.dropped.slice(d0), cached);
      ruleMark();
      V.log.push(q + ' · page ' + V.page + ': ' + items.length + ' videos, ' + add + ' kept' + (cached ? ' (saved copy)' : ''));
      // The other spelling and the team name are tried only when a search finds no videos at all.
      // the other spelling and the team name are tried only when the "Tag Team" search finds no videos at all
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
  // Private builds: the open tab's one grid.
  function paintTab() {
    var box = document.getElementById('tt-vids'), dbg = document.getElementById('tt-dbg');
    if (!box) return;
    var ae = document.activeElement, had = ae && box.contains(ae) ? (ae.getAttribute('data-vid') || 'more') : '';
    if (TAB === 'ch') {
      paintRow(box, document.getElementById('tt-vst'), byDate(C.kept), C.done, C.ran, V.busy, 'data-cmore',
        [T('No tag title matches were found for this team.', 'このチームのタッグ王座戦の動画は見つかりませんでした。'), T('Looking for title matches...', '王座戦を検索中...'), T('No title matches on the pages searched so far. Press OK on More to search the next page.', 'これまでのページに王座戦はありません。「さらに表示」で次のページを検索します。')]);
    } else if (TAB === 'tl') {
      paintRow(box, document.getElementById('tt-vst'), L.kept, L.done, L.ran, V.busy, 'data-lmore',
        [T('No Tag League matches were found for this team.', 'このチームのタッグリーグ戦の動画は見つかりませんでした。'), T('Looking for Tag League matches...', 'タッグリーグ戦を検索中...'), T('No Tag League matches on the pages searched so far. Press OK on More to search the next page.', 'これまでのページにタッグリーグ戦はありません。「さらに表示」で次のページを検索します。')]);
    } else {
      paintRow(box, document.getElementById('tt-vst'), byDate(V.kept.concat(L.kept)), V.done, V.ran, V.busy, 'data-more',
        [T('No 2-on-2 tag matches were found for this team.', 'このチームのタッグマッチの動画は見つかりませんでした。'), T('Looking for tag matches...', 'タッグマッチを検索中...'), T('No 2-on-2 tag matches on the pages searched so far. Press OK on More to search the next page.', 'これまでのページにタッグマッチはありません。「さらに表示」で次のページを検索します。')]);
    }
    if (dbg) {
      var q = TAB === 'ch' ? C.q : TAB === 'tl' ? L.q : V.queries.join(' | '), lines = [T('Tab: ', 'タブ: ') + TAB + ' · ' + T('search: ', '検索: ') + q].concat(V.log);
      if (TAB === 'ch') { var rc = champRecord(); lines.push('Title matches on record: ' + rc.total + ' · found: ' + rc.found.length + (rc.missing.length ? ' · not found yet: ' + rc.missing.join(', ') : '')); }
      lines.push('Left out ' + V.dropped.length + (V.dropped.length ? ': ' + V.dropped.slice(0, 6).join(' | ') + (V.dropped.length > 6 ? ' …' : '') : ''));
      dbg.textContent = lines.join('\n');
    }
    if (had) { var f = had === 'more' ? box.querySelector('.tt-more') : box.querySelector('[data-vid="' + had + '"]'); if (f) focusEl(f); }
  }
  function cardHtml(it) {
    var d = dateOfTitle(it.t);
    return '<a class="tt-card" tabindex="0" data-vid="' + esc(it.id) + '" href="' + esc(it.h) + '"><div class="im" style="background-image:url(\'' + esc(it.b) + '\')">' + (it.ok ? '<span class="ok">' + esc(T('TEAMMATES', '同じチーム')) + '</span>' : '') + (d ? '<span class="dt">' + esc(fmtD(d)) + '</span>' : '') + '</div><div class="tt">' + esc(it.t) + '</div></a>';
  }
  // One row of video cards: its grid, its More tile and the count beside its heading.
  function paintRow(box, st, list, done, ran, active, moreAttr, msgs) {
    if (!box) return;
    var more = '<a class="tt-more" tabindex="0" ' + moreAttr + '="1">' + esc(V.busy && active ? T('Searching…', '検索中…') : T('More', 'さらに表示')) + '</a>';
    var h = '';
    if (!list.length) {
      h = '<div class="tt-msg">' + esc(done ? msgs[0] : (!ran ? msgs[1] : msgs[2])) + '</div>';
      if (!done && ran) h += '<div class="tt-vids">' + more + '</div>';
      box.className = '';
    } else {
      box.className = 'tt-vids';
      h = list.map(cardHtml).join('') + (done ? '' : more);
    }
    if (TAB && list.length > 4 && done) h += '<a class="tt-more tt-top" tabindex="0" data-top="1">' + esc(T('Back to top', 'トップへ戻る')) + ' \u2191</a>';
    box.innerHTML = h;
    if (st) st.textContent = (V.busy && active) ? (list.length ? list.length + ' · ' : '') + T('looking for videos', '動画を検索中') :
      (!list.length && !done ? (ran ? T('none found yet', 'まだありません') : T('waiting', '待機中')) : list.length + ' ' + T(list.length === 1 ? 'match' : 'matches', '試合'));
  }
  function byDate(list) { return list.slice().sort(function(a, b) { var x = dateOfTitle(a.t), y = dateOfTitle(b.t); return x === y ? 0 : (x < y ? 1 : -1); }); }
  function paintVids() {
    if (TAB) { paintTab(); return; }
    var box = document.getElementById('tt-vids'), lbox = document.getElementById('tt-lvids'), lsec = document.getElementById('tt-lsec'), dbg = document.getElementById('tt-dbg');
    if (!box) return;
    var ae = document.activeElement, had = '';
    if (ae && (box.contains(ae) || (lbox && lbox.contains(ae)))) had = ae.getAttribute('data-vid') || (ae.getAttribute('data-lmore') ? 'lmore' : 'more');
    paintRow(lbox, document.getElementById('tt-lvst'), L.kept, L.done, L.ran, V.busy && V.which === 'L', 'data-lmore',
      [T('No Tag League matches were found for this team.', 'このチームのタッグリーグ戦の動画は見つかりませんでした。'), T('Looking for Tag League matches...', 'タッグリーグ戦を検索中...'), T('No Tag League matches on the pages searched so far. Press OK on More to search the next page.', 'これまでのページにタッグリーグ戦はありません。「さらに表示」で次のページを検索します。')]);
    // the league row shows for entrants, and for any team once a Tag League match turns up
    if (lsec) { var showL = (TEAM && TEAM.league.length) || L.kept.length; lsec.style.display = showL ? '' : 'none'; lbox.style.display = showL ? '' : 'none'; }
    paintRow(box, document.getElementById('tt-vst'), V.kept, V.done, V.ran, V.busy && V.which !== 'L', 'data-more',
      [T('No 2-on-2 tag matches were found for this team.', 'このチームのタッグマッチの動画は見つかりませんでした。'), L.ran ? T('Looking for tag matches...', 'タッグマッチを検索中...') : T('Tag matches are searched after the Tag League row.', 'タッグマッチはタッグリーグ戦の後に検索します。'), T('No 2-on-2 tag matches on the pages searched so far. Press OK on More to search the next page.', 'これまでのページにタッグマッチはありません。「さらに表示」で次のページを検索します。')]);
    if (dbg) dbg.textContent = T('Search: ', '検索: ') + L.q + ' | ' + V.queries.join(' | ') + '\n' + V.log.join('\n') + '\n' +
      T('Kept ' + L.kept.length + ' Tag League + ' + V.kept.length + ' tag (' + V.verified + ' checked as teammates in the video index) · left out ' + V.dropMulti + ' bigger or multi-way matches, ' + V.dropOpp + ' where they were opponents',
        '表示 タッグリーグ' + L.kept.length + '＋タッグ' + V.kept.length + '（動画インデックスで同じチーム確認 ' + V.verified + '）· 除外 ' + V.dropMulti + '（多人数）、' + V.dropOpp + '（対戦）');
    if (had) {
      var f = had === 'more' ? box.querySelector('.tt-more') : had === 'lmore' ? (lbox && lbox.querySelector('.tt-more')) : scroller.querySelector('[data-vid="' + had + '"]');
      if (f) focusEl(f);
    }
  }


  function favBtnInner(id) { var on = isFav(id); return '<span class="st">' + (on ? '\u2605' : '\u2606') + '</span>' + esc(on ? T('In My Favorites', 'お気に入り登録済み') : T('Add to My Favorites', 'お気に入りに追加')); }
  // My Favorites changed (OK on the button, or the Menu button): update the button and the list's stars
  API.favChanged = function() {
    var b = document.querySelector('#tv-tt .tt-favb');
    if (b && TEAM) { b.innerHTML = favBtnInner(TEAM.id); b.classList.toggle('tt-on', isFav(TEAM.id)); }
    Array.prototype.forEach.call(document.querySelectorAll('#tv-tt .tt-team[data-favt]'), function(a) { a.classList.toggle('tt-fav', isFav(a.getAttribute('data-favt'))); });
  };
  function initials(n) { return String(n).split(/\s+/).map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function renderTeam() {
    var t = TEAM;
    if (!t) {
      scroller.innerHTML = '<div class="tt-head"><div class="tt-bar"></div><div class="tt-h1">' + esc(T('Team not found', 'チームが見つかりません')) + '</div></div><div class="tt-empty" style="margin-top:16px">' + esc(T('Open Tag Teams in the menu to choose a team.', 'メニューのタッグチームから選んでください。')) + '</div>';
      return;
    }
    var lgNow = t.league.slice().sort(function(a, b) { return b.year - a.year; })[0];
    var lgLine = lgNow ? ' · ' + esc(T((lgNow.bname ? blockName({ name: lgNow.bname }, true) + ' Goddesses, ' : '') + 'Tag League ' + lgNow.year + (t.league.length > 1 ? ' (' + t.league.length + ' entries)' : ''),
      (lgNow.bja ? lgNow.bja + '・' : '') + 'タッグリーグ' + lgNow.year)) : '';
    var h = '<div class="tt-head"><div class="tt-bar"></div><div><div class="tt-h1 notranslate" translate="no">' + esc(t.display) + (t.league.length ? wings(24, '#F4C242', '#0B1118') : '') + '</div><div class="tt-note">' + esc(T('Tag team', 'タッグチーム')) + (t.sub ? ' · ' + esc(t.sub) : '') + lgLine + '</div></div>' +
      '<div class="tt-instr">' + esc(T('Up and Down move between rows. OK opens. Back returns.', '上下で移動、OKで開く、戻るで戻ります。')) + '</div></div>';
    var av = t.members.map(function(m) {
      var p = call('wrestlerPhoto', m) || call('wrestlerPhoto', siteName(m));
      return p ? '<div class="ph" style="background-image:url(\'' + esc(p) + '\')"></div>' : '<div class="notranslate" translate="no">' + esc(initials(m)) + '</div>';
    }).join('');
    var reignsN = t.reigns.length;
    h += '<div class="tt-hero" data-favt="' + esc(t.id) + '"><div class="tt-av">' + av + '</div><div style="min-width:0">' +
      '<div class="tt-facts">' +
        '<div><div class="k">' + esc(T('MEMBERS', 'メンバー')) + '</div><div class="v notranslate" translate="no">' + esc(t.members.join(' & ')) + '</div></div>' +
        (t.faction ? '<div><div class="k">' + esc(T('FACTION', 'ユニット')) + '</div><div class="v notranslate" translate="no">' + esc(t.faction) + '</div></div>' : '') +
        (t.first ? '<div><div class="k">' + esc(T('FIRST TITLE', '初戴冠')) + '</div><div class="v">' + esc(t.first.slice(0, 4)) + '</div></div>' : '') +
        '<div><div class="k">' + esc(T('REIGNS', '戴冠')) + '</div><div class="v">' + reignsN + '</div></div>' +
        '<div><div class="k">' + esc(T('DEFENCES', '防衛')) + '</div><div class="v">' + t.defTotal + '</div></div>' +
      '</div><div class="tt-btns">' +
        t.members.map(function(m) { var p = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(searchName(m)) + '&activetab=contents&page=1'; return '<a class="tt-btn notranslate" translate="no" tabindex="0" href="' + esc(absUrl(p)) + '">' + esc(m) + '</a>'; }).join('') +
        (t.facObj && t.facObj.members && t.facObj.members.length ? '<a class="tt-btn" tabindex="0" href="' + esc(absUrl('/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(t.facObj.members[0].search) + '&tvfaction=' + encodeURIComponent(t.facObj.id))) + '">' + esc(T('Faction home', 'ユニットページ')) + '</a>' : '') +
        (window.__tvFav ? '<a class="tt-btn tt-favb' + (isFav(t.id) ? ' tt-on' : '') + '" tabindex="0" data-favb="1">' + favBtnInner(t.id) + '</a>' : '') +
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
    TAB = CATS_ON ? (Q.get('tvtab') || 'all') : '';
    if (TAB) {   // private builds: tabs, one grid
      var tabs = [['all', T('All Tag Matches', 'すべてのタッグマッチ')], ['ch', T('Championship', '王座戦')], ['tl', T('Tag League', 'タッグリーグ')]];
      var moreUrl = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(searchName(t.members[0]) + ' Tag Team ' + searchName(t.members[1])) + '&activetab=contents&page=1&tvb=' + encodeURIComponent(searchName(t.members[0])) + '&tvmt=tag&tvco=' + encodeURIComponent(searchName(t.members[1]));
      h += '<div class="tt-chips" style="margin-top:26px">' + tabs.map(function(x) {
        return '<a class="tt-chip' + (x[0] === TAB ? ' tt-on' : '') + '" tabindex="0" href="' + esc(absUrl(teamPath(t) + (x[0] === 'all' ? '' : '&tvtab=' + x[0]))) + '">' + (x[0] === 'tl' ? wings(16, x[0] === TAB ? '#1A1A1A' : '#F4C242', x[0] === TAB ? '#FFB347' : '#161F2A') : '') + esc(x[1]) + '</a>';
      }).join('') + '<a class="tt-chip" style="margin-left:14px" tabindex="0" href="' + esc(absUrl(moreUrl)) + '">' + esc(T('More', '詳細')) + ' ▸</a></div>';
      h += '<div class="tt-sec"><i></i><b>' + esc(T('MATCHES', '試合')) + '</b><span id="tt-vst"></span></div><div id="tt-vids"></div><div class="tt-dbg notranslate" translate="no" id="tt-dbg"></div>';
    } else {
    h += '<div class="tt-sec" id="tt-lsec">' + wings(24, '#F4C242', '#0B1118') + '<b>' + esc(T('TAG LEAGUE MATCHES', 'タッグリーグ戦')) + '</b><span id="tt-lvst"></span></div><div id="tt-lvids"></div>';
    h += '<div class="tt-sec"><i></i><b>' + esc(T('TAG MATCHES', 'タッグマッチ')) + '</b><span id="tt-vst"></span></div><div id="tt-vids"></div><div class="tt-dbg notranslate" translate="no" id="tt-dbg"></div>';
    }
    scroller.innerHTML = h;
    focusEl(scroller.querySelector('.tt-btn') || scroller.querySelector('[tabindex="0"]'));
    V.queries = queriesFor(t);
    L.q = t.members.map(searchName).join(' Goddess ');
    C.q = t.members.map(searchName).join(' ') + ' Championship';
    paintVids();
    var box = document.getElementById(TAB ? 'tt-vids' : 'tt-lvids'), started = false;
    // Tag League row first, then the Tag Matches row MAIN_PAUSE_MS later (only when the league step asked the site).
    function start() {
      if (started) return; started = true;
      var go = function(main) {
        leagueFirst(function(asked) {
          if (!main) { paintVids(); return; }
          if (!asked) { main(); return; }
          V.log.push(T('Tag Matches search in ' + MAIN_PAUSE_MS / 1000 + ' s', 'タッグ検索まで' + MAIN_PAUSE_MS / 1000 + '秒'));
          paintVids();
          setTimeout(main, MAIN_PAUSE_MS);
        });
      };
      if (TAB === 'ch') { champMore(); return; }   // private builds: only the open tab searches
      if (TAB === 'tl') { if (SHEET_ON) fromSheet(function() { leagueFirst(function() { paintVids(); }); }); else leagueFirst(function() { paintVids(); }); return; }
      if (TAB === 'all') { if (SHEET_ON) fromSheet(function(main) { if (main) main(); else paintVids(); }); else loadMore(); return; }
      if (SHEET_ON) fromSheet(go); else go(loadMore);
    }
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
    if (el.getAttribute('data-lmore') != null) { if (!V.busy) leagueMore(); return true; }
    if (el.getAttribute('data-cmore') != null) { if (!V.busy) champMore(); return true; }
    if (el.getAttribute('data-top') != null) { scroller.scrollTop = 0; focusEl(scroller.querySelector('.tt-chip.tt-on') || scroller.querySelector('[tabindex="0"]')); return true; }
    if (el.getAttribute('data-favb') != null) { if (window.__tvFav && TEAM) window.__tvFav.toggleTeam(TEAM.id); return true; }
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

  if (Q.get('tvteam')) renderTeam(); else if (Q.get('league')) renderLeague(null); else renderList(null);
})();
