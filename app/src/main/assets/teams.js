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
  if (!Q || (!Q.get('tvteams') && !Q.get('tvteam') && !Q.get('tvwr'))) return;
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
    '#tv-tt .tt-lg-av{display:flex;flex:none;}',
    '#tv-tt .tt-lg-av i{width:38px;height:38px;overflow:hidden;white-space:nowrap;border-radius:50%;border:2px dashed #3B4656;background:#0F151C center top/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;font-style:normal;color:#C9D2DC;box-sizing:border-box;}',
    '#tv-tt .tt-lg-av i.ph{border-style:solid;border-color:#2A323C;}',
    '#tv-tt .tt-lg-av i + i{margin-left:-10px;}',
    '#tv-tt .tt-lg-row .a{font-size:17px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;}',
    '#tv-tt .tt-lg-row .b{font-size:13px;font-weight:600;color:#9AA6B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;min-width:0;}',
    '#tv-tt .tt-lg-row.tt-fav .a::before{content:"\\2605  ";color:#F4C242;}',
    '#tv-tt .tt-lg-pts{flex:none;min-width:64px;text-align:right;font-size:20px;font-weight:800;color:#fff;}',
    '#tv-tt .tt-lg-pts small{font-size:13px;font-weight:700;color:#9AA6B4;}',
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
    // complete career (2.118.0)
    '#tv-tt .cc-badge{display:flex;align-items:center;gap:8px;margin-left:18px;padding:6px 14px;border:2px solid #2A323C;border-radius:20px;font-size:13px;font-weight:800;letter-spacing:1px;color:#F4C242;align-self:center;}',
    '#tv-tt .cc-n{font-style:normal;font-size:14px;font-weight:700;opacity:.75;margin-left:7px;}',
    '#tv-tt .cc-top{display:flex;gap:32px;align-items:flex-start;}',
    '#tv-tt .cc-col{display:flex;flex-direction:column;min-width:0;}',
    '#tv-tt .cc-grow{flex:1;}',
    '#tv-tt .cc-deb{width:340px;}',
    '#tv-tt .cc-fine{margin-top:12px;font-size:13px;font-weight:700;color:#9AA6B4;}',
    '#tv-tt .cc-miles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;}',
    '#tv-tt .cc-mile{display:flex;flex-direction:column;gap:6px;min-height:104px;box-sizing:border-box;padding:12px 14px;background:#161F2A;border:2px solid #2A323C;border-radius:12px;color:#fff !important;text-decoration:none;}',
    '#tv-tt .cc-mile:focus{border-color:#F4C242;background:#172029;outline:none;}',
    '#tv-tt .cc-mile .r1{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;color:#F4C242;}',
    '#tv-tt .cc-mile .r1 b{font-size:12px;font-weight:800;letter-spacing:1px;}',
    '#tv-tt .cc-mile .r1 b.or{color:#FFB347;}#tv-tt .cc-mile .r1 b.gy{color:#C9D2DC;}',
    '#tv-tt .cc-mile .r2{font-size:17px;font-weight:700;line-height:1.25;}',
    '#tv-tt .cc-mile .r3{font-size:13px;font-weight:600;color:#C9D2DC;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '#tv-tt .cc-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px;}',
    '#tv-tt .cc-row{display:flex;align-items:center;gap:14px;height:60px;padding:0 14px;margin-bottom:10px;background:#161F2A;border:2px solid transparent;border-radius:8px;color:#fff !important;text-decoration:none;}',
    '#tv-tt .cc-row:focus{border-color:#F4C242;background:#172029;outline:none;}',
    '#tv-tt .cc-row .av{width:38px;height:38px;flex:none;border-radius:50%;border:2px dashed #3B4656;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#C9D2DC;}',
    '#tv-tt .cc-row .nm{flex:1;font-size:17px;font-weight:700;}',
    '#tv-tt .cc-row .ct{font-size:20px;font-weight:800;}#tv-tt .cc-row .ct em{font-style:normal;font-size:13px;font-weight:700;color:#9AA6B4;}',
    '#tv-tt .cc-facs{display:flex;gap:12px;}',
    '#tv-tt .cc-fac{min-width:0;padding:12px 14px;background:#161F2A;border:2px solid #2A323C;border-radius:12px;}',
    '#tv-tt .cc-fac.on{border-color:#6B5A22;}',
    '#tv-tt .cc-fac .f1{font-size:17px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}#tv-tt .cc-fac .f2{font-size:13px;font-weight:600;color:#C9D2DC;margin-top:3px;}',
    '#tv-tt .cc-types{display:flex;height:44px;border-radius:10px;overflow:hidden;font-size:14px;font-weight:800;color:#1A1A1A;}',
    '#tv-tt .cc-types div{display:flex;align-items:center;padding-left:10px;min-width:0;white-space:nowrap;overflow:hidden;}',
    '#tv-tt .cc-years{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '#tv-tt .cc-years .lb{font-size:13px;font-weight:700;color:#9AA6B4;letter-spacing:1px;margin-right:6px;}',
    '#tv-tt .cc-yc{height:36px;line-height:32px;padding:0 14px;border-radius:20px;border:2px solid #2A323C;background:#161F2A;font-size:15px;font-weight:700;color:#fff !important;cursor:pointer;}',
    '#tv-tt .cc-yc em{font-style:normal;font-size:13px;opacity:.75;}',
    '#tv-tt .cc-yc:focus{border-color:#F4C242;background:#172029;outline:none;}',
    '#tv-tt .cc-yh{grid-column:1/-1;display:flex;align-items:baseline;gap:12px;margin-top:8px;font-size:22px;font-weight:700;}',
    '#tv-tt .cc-yh span{font-size:14px;font-weight:700;color:#9AA6B4;}',
    '#tv-tt .tt-card .tvsc-host{padding:11px 14px 13px;}',
    '#tv-tt .cc-row .av.ph{border:2px solid #2A323C;}',
    '#tv-tt .cc > div + div, #tv-tt .cc > .cc-two + div{margin-top:4px;}',
    '#tv-tt .cc-frow{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px;padding:10px 12px;background:#121922;border-radius:12px;}',
    '#tv-tt .cc-frow.cc-opts{background:#0F151C;border:2px solid #2A323C;}',
    '#tv-tt .cc-fc{height:40px;line-height:36px;padding:0 14px;border-radius:10px;border:2px solid #2A323C;background:#161F2A;font-size:16px;font-weight:700;color:#fff !important;cursor:pointer;white-space:nowrap;}',
    '#tv-tt .cc-fc em{font-style:normal;font-size:13px;opacity:.75;}',
    '#tv-tt .cc-fc.on{background:#FFB347;border-color:#FFB347;color:#1A1A1A !important;}',
    '#tv-tt .cc-fc.op{border-color:#6B5A22;}',
    '#tv-tt .cc-fc:focus{border-color:#F4C242;outline:none;}',
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
    // points for this year (docs/LEAGUE_POINTS.md): bundled, or the daily file's when as new or newer; none = no numbers
    var LP = (CFG.leaguePoints || {})[Y.year] || null, PTS = null;
    if (LP && LP.points && LP.points.length) {
      PTS = {};
      LP.points.forEach(function(p) { if (p && p.team && p.team.length === 2 && typeof p.pts === 'number') PTS[pairKey(p.team)] = p.pts; });
    }
    var h = '<div class="tt-lg-head">' + wings(44, '#F4C242', '#0B1118') + '<div style="min-width:0"><div class="tt-h1">' + esc(isJa() && L.ja ? L.ja : (L.name || T('Tag League ' + Y.year, 'タッグリーグ ' + Y.year))) + '</div>' +
      '<div class="tt-note">' + esc([L.dates || '', L.winners ? T(L.winners, L.winnersJa || L.winners) : ''].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div class="tt-chips">' + LEAGUES.map(function(x) { return '<a class="tt-chip' + (x === Y ? ' tt-on' : '') + '" tabindex="0" href="' + esc(absUrl(leaguePath(x.year))) + '">' + x.year + '</a>'; }).join('') + '</div></div>';
    h += '<div class="tt-lg-cols">' + L.blocks.map(function(bl) {
      var order = (bl.teams || []).slice();
      // highest points first within the block; equal points keep the roster order, teams without a number go last
      if (PTS) order = order.map(function(m, i) { return { m: m, i: i, p: PTS[pairKey(m)] }; }).sort(function(a, b) {
        var pa = a.p == null ? -1 : a.p, pb = b.p == null ? -1 : b.p;
        return pb - pa || a.i - b.i;
      }).map(function(x) { return x.m; });
      var rows = order.map(function(m) {
        var t = byKey[pairKey(m)];
        if (!t) return '';
        var win = !!(L.winnerTeam && pairKey(L.winnerTeam) === pairKey(m));
        var prev = !win && !!(L.prevWinners && L.prevWinners.team && pairKey(L.prevWinners.team) === pairKey(m));
        // the two wrestlers' circles (the private build's photos, else initials), as on the team page but 38 px
        var av = t.members.map(function(n) {
          var p = call('wrestlerPhoto', n) || call('wrestlerPhoto', siteName(n));
          var sb = window.__tvStar ? window.__tvStar([n, siteName(n)], 'tiny') : '';
          return p ? '<i class="ph" style="' + (sb || 'background-image:url(\'' + esc(p) + '\')') + '"></i>' : '<i class="notranslate" translate="no">' + esc(initials(n)) + '</i>';
        }).join('');
        return '<a class="tt-lg-row' + (isFav(t.id) ? ' tt-fav' : '') + '" tabindex="0" data-favt="' + esc(t.id) + '" href="' + esc(absUrl(teamPath(t))) + '"><span class="tt-lg-av">' + av + '</span><span class="a notranslate" translate="no">' + esc(t.display) + '</span><span class="b notranslate" translate="no">' + esc(t.name ? t.members.join(' & ') : '') + '</span>' +
          (win ? '<span class="tt-tag ch">' + esc(T('WINNERS', '優勝')) + '</span>' : '') +
          (prev ? '<span class="tt-tag ch">' + esc(T(L.prevWinners.year + ' WINNERS', L.prevWinners.year + '年優勝')) + '</span>' : '') + tags(t, true) +
          (PTS ? '<span class="tt-lg-pts">' + (PTS[pairKey(m)] != null ? PTS[pairKey(m)] + '<small>' + esc(T(PTS[pairKey(m)] === 1 ? ' pt' : ' pts', '点')) + '</small>' : '\u2013') + '</span>' : '') + '</a>';
      }).join('');
      // the block's own colour on its bar and name: Blue Goddesses blue, Red Goddesses red (design exception, 2.45.1)
      var bc = /blue|\u30d6\u30eb\u30fc/i.test((bl.name || '') + (bl.ja || '')) ? '#4DA6FF' : /red|\u30ec\u30c3\u30c9/i.test((bl.name || '') + (bl.ja || '')) ? '#FF5A6A' : '';
      return '<div class="tt-lg-col"><div class="tt-sec" style="margin:14px 0 4px 0"><i' + (bc ? ' style="background:' + bc + '"' : '') + '></i><b' + (bc ? ' style="color:' + bc + '"' : '') + '>' + esc(isJa() && bl.ja ? bl.ja : bl.name) + '</b><span>' + esc(T((bl.teams || []).length + ' teams', (bl.teams || []).length + 'チーム')) + '</span></div>' + rows + '</div>';
    }).join('') + '</div>';
    h += '<div class="tt-count">' + esc(T(leagueCount(Y) + ' teams', leagueCount(Y) + 'チーム')) + '</div>';
    if (PTS && LP.updated) h += '<div class="tt-roster">' + esc(T('Points as of ' + fmtD(LP.updated), fmtD(LP.updated) + '時点の勝ち点')) + '</div>';
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
  var DEBUG_ON = false;   // debug panels: private builds only
  try { DEBUG_ON = !!(H.debugOn && H.debugOn()); } catch (e) { DEBUG_ON = false; }
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
  // single: ask for single matches only (q[type]=single); private builds always do. The app-drawn wrestler page
  // asks in every build (2.47.0).
  function fetchPage(q, page, cb, single) {
    var one = CATS_ON || !!single;
    var key = q + '#' + page + (one && !CATS_ON ? '#s' : ''), c = readCache()[key];
    if (c && Date.now() - c.t < KEEP_MS) { cb('', c.items, c.more, true); return; }
    var wait = blockedFor();
    if (wait) { cb('the site asked for a pause: ' + wait + ' min left'); return; }
    var since = Date.now() - (parseInt(lsGet(LAST_KEY) || '0', 10) || 0);
    if (since < GAP_MS) { setTimeout(function() { fetchPage(q, page, cb, single); }, GAP_MS - since); return; }
    lsSet(LAST_KEY, String(Date.now()));
    var url = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(q) + '&activetab=contents' + (one ? '&q%5Btype%5D=single' : '') + (page > 1 ? '&page=' + page : '');
    (window.__tvFetch || fetch)(url, { credentials: 'include' }).then(function(res) {
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
        var cw = scCut(SC_CUT, it);
        if (cw) { V.dropped.push('[' + cw + '] ' + it.t); return; }
        if (!isTagBeltMatch(it.t)) { V.dropped.push(it.t); return; }   // team pages keep tag title matches only
        if (beforeDebut(it)) { V.dropped.push('[before their debut] ' + it.t); return; }
        // a dated Goddess title match must be one this pair was in, by the title history (as champions or challengers);
        // NEW BLOOD tag has no defence list to check against, so those stay
        var dd = dateOfTitle(it.t);
        if (dd && GODDESS_RE.test(half(it.t)) && pairDates().goddess && !pairDates().goddess[dd]) { V.dropped.push('[not this pair, by the title history] ' + it.t); return; }
        // undated: kept only when this pair has some Goddess title match on record
        if (!dd && GODDESS_RE.test(half(it.t)) && pairDates().goddess && !Object.keys(pairDates().goddess).length) { V.dropped.push('[no Goddess title match on record for this pair] ' + it.t); return; }
        var sd = sidesCheck(TEAM, it.id);
        if (sd === 'opponents') { V.dropOpp++; V.dropped.push('[opponents] ' + it.t); return; }
        if (sd === 'partners') { it.ok = 1; V.verified++; }
        kept.push(it);
      });
      C.kept = C.kept.concat(kept);
      V.log.push(C.q + ' · page ' + C.page + ': ' + items.length + ' videos, ' + kept.length + ' kept' + (cached ? ' (saved copy)' : ''));
      dbgSend(C.q, C.page, items, kept, V.dropped.slice(d0), cached);
      C.page++;
      if (!more || (SC_CUT && SC_CUT.after)) C.done = true;   // after the last logged show: the newest page is enough
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
      if (!more || (SC_CUT && SC_CUT.after)) L.done = true;
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
    var id = Math.random().toString(36).slice(2, 10), body = { action: action, team: TEAM ? TEAM.id : '' };
    for (var k in payload) body[k] = payload[k];
    sheetWait[id] = cb || function() {};
    setTimeout(function() { if (sheetWait[id]) { var f = sheetWait[id]; delete sheetWait[id]; f({ ok: false, error: 'no reply' }); } }, 30000);
    try { H.teamSync(id, JSON.stringify(body)); } catch (e) { delete sheetWait[id]; (cb || function() {})({ ok: false, error: String(e) }); }
  }
  // Private builds: the later debut of the two (match_types.json "debuts", plus the roster file's). The site's search
  // also returns older videos neither of them is in; a video dated (or, undated, uploaded) before it is left out.
  var PAIR_DEBUT = null;
  function pairDebut() {
    if (PAIR_DEBUT !== null) return PAIR_DEBUT;
    PAIR_DEBUT = '';
    if (!CATS_ON || !TEAM) return PAIR_DEBUT;
    try {
      var deb = (parse(call('matchTypesJson')) || {}).debuts || {}, low = {};
      Object.keys(deb).forEach(function(k) { low[k.toLowerCase()] = String(deb[k] || ''); });
      TEAM.members.forEach(function(m) { var d = low[String(m).toLowerCase()] || low[String(searchName(m)).toLowerCase()] || ''; if (d > PAIR_DEBUT) PAIR_DEBUT = d; });
    } catch (e) { PAIR_DEBUT = ''; }
    return PAIR_DEBUT;
  }
  function beforeDebut(it) {
    var deb = pairDebut();
    if (!deb) return false;
    var d = dateOfTitle(it.t);
    if (d) return d < deb;
    var yr = /(?:^|[^\d])(20\d\d)(?:[^\d]|$)/.exec(half(it.t));   // "Goddesses of Stardom 2022": the whole year is before it
    if (yr && yr[1] + '-12-31' < deb) return true;
    var m = /[?&]ts=(\d{9,11})/.exec(it.b || '');
    return m ? new Date(+m[1] * 1000).toISOString().slice(0, 10) < deb : false;
  }
  // ---- StarScope complete years (2.98.0; assets/starcards.js window.__tvScopeIdx). The Tag League and Championship tabs on
  // team pages, and the 5★STAR GP, Cinderella, Tag League and Championship tabs on wrestler pages, take a complete year's
  // matches from the index and show them as the site's normal cards. The site's search then only looks for the rest:
  //  - none at all when everything the tab can hold is in complete years (and no show since the last logged one);
  //  - one newest page, kept only after the last logged show, when the schedule has a show not logged yet;
  //  - otherwise the search runs as before, leaving out what the index already gave (a complete year's videos).
  function SC() { var S = window.__tvScopeIdx; return S && S.from && S.from() ? S : null; }
  function scNames(m) { return [m, siteName(m), searchName(m)].concat(ALIAS[String(m).toLowerCase()] || []); }
  function scWith(S, v, members) {   // every member on one side, by any of their spellings
    return (v.p || []).some(function(sd, i) {
      return members.every(function(m) { return scNames(m).some(function(n) { var one = { p: [sd] }; return S.hasName(one, n); }); });
    });
  }
  function scDate(it) { return dateOfTitle(half(it.t)); }
  function scUp(it) { var m = /[?&]ts=(\d{9,11})/.exec(it.b || ''); return m ? new Date(+m[1] * 1000).toISOString().slice(0, 10) : ''; }
  // Why a search result is left out under the cut (cut: { skip: 1 } or { after: 'YYYY-MM-DD' }), or ''.
  function scCut(cut, it) {
    var S = SC();
    if (!cut || !S) return '';
    var d = scDate(it);
    if (cut.after) { var w = d || scUp(it); return !w || w <= cut.after ? 'in StarScope (logged through ' + cut.after + ')' : ''; }
    return d && S.covered(d) ? 'in StarScope (' + d.slice(0, 4) + ' is complete)' : '';
  }
  // The index's matches for a tab, as cards: added to the list given, marked as seen.
  function scAdd(list, found, seen) {
    var S = SC(), n = 0;
    found.forEach(function(x) { if (seen[x.id]) return; seen[x.id] = 1; list.push(S.item(x)); n++; });
    return n;
  }
  var SC_CUT = null;   // the open team tab's cut (Tag League or Championship), read by keepItems and champMore
  function keepItems(items) {   // the 2-on-2 rule and the video index side check, for search results and saved lists alike
    var add = [];
    items.forEach(function(it) {
      if (V.seen[it.id]) return; V.seen[it.id] = 1;
      var cw = scCut(SC_CUT, it);
      if (cw) { V.dropped.push('[' + cw + '] ' + it.t); return; }
      if (beforeDebut(it)) { V.dropped.push('[before their debut] ' + it.t); return; }
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
    // Matches saved in the private sheet's team lists (and those waiting on the TV) keep only the video's number,
    // title and picture, not its address: build the address from the number (2.72.1). Without it the card's link was
    // empty, so OK reloaded the team page and the Menu button found no video to offer.
    var href = it.h || (/^\d{1,9}$/.test(String(it.id)) ? absUrl('/contents/' + it.id) : '');
    return '<a class="tt-card" tabindex="0" data-vid="' + esc(it.id) + '" href="' + esc(href) + '"><div class="im" style="background-image:url(\'' + esc(it.b) + '\')">' + (it.ok ? '<span class="ok">' + esc(T('TEAMMATES', '同じチーム')) + '</span>' : '') + (d ? '<span class="dt">' + esc(fmtD(d)) + '</span>' : '') + '</div><div class="tt">' + esc(it.t) + '</div></a>';
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
  // StarScope for the open team tab (2.98.0): its complete-year matches go in first. Returns whether the site still
  // needs searching. Tag League: only in a league year that isn't complete. Championship: the team's start date (the
  // roster's "since") decides.
  function scTeam(tab) {
    var S = SC(), t = TEAM;
    if (!S || !t) return true;
    var lg = tab === 'tl', list = lg ? L.kept : C.kept;
    var found = S.find(function(v) { return (lg ? S.inComp(v, 'tagleague') : (S.isTitle(v) && v.x.k === 'tag')) && (!S.twoOnTwo || S.twoOnTwo(v)) && scWith(S, v, t.members); });   // 2 v 2 only (2.106.2)
    var n = scAdd(list, found, V.seen), P = S.plan(lg ? '' : t.since), ys = S.years(), only, recent;
    if (lg) {
      var lys = t.league.map(function(x) { return String(x.year); });
      only = lys.length > 0 && lys.every(function(y) { return ys.indexOf(y) >= 0; });
      recent = only && P.recent && lys.indexOf(String(P.thru).slice(0, 4)) >= 0;   // this year's league still running
    } else { only = P.only; recent = P.recent; }
    SC_CUT = only ? (recent ? { after: P.thru } : null) : { skip: 1 };
    V.log.push('StarScope: ' + n + ' match' + (n === 1 ? '' : 'es') + ' from the index (complete ' + ys.join(', ') + ', logged through ' + P.thru + ')' +
      (only ? (recent ? ' · site: newest page only, for ' + P.unlogged.join(', ') : ' · no site search') : ' · site: other years'));
    if (only && !recent) {
      if (lg) { L.done = true; L.ran = true; } else { C.done = true; C.ran = true; }
      return false;
    }
    return true;
  }
  // ---- Complete team history (2.121.0): both wrestlers debuted inside StarScope's run of complete years (match_types.json
  // "debuts", plus the roster file's), so every straight 2 v 2 match they had together is in the index. The All Tag
  // Matches tab then comes from the index alone (no site search, no saved team list), with counts on the tabs. Shows
  // after the last logged one appear once they're logged. Nothing more is asked of the sheet or the site.
  var TCC = null;
  function teamCc() {
    var S = SC(), t = TEAM;
    if (!S || !CATS_ON || !t || !t.members || t.members.length !== 2) return null;
    var ds = [];
    try {
      var deb = (parse(call('matchTypesJson')) || {}).debuts || {}, low = {};
      Object.keys(deb).forEach(function(k) { low[k.toLowerCase()] = String(deb[k] || ''); });
      t.members.forEach(function(m) { ds.push(low[String(m).toLowerCase()] || low[String(searchName(m)).toLowerCase()] || ''); });
    } catch (e) { return null; }
    if (ds.some(function(d) { return !d; })) return null;
    ds.sort();
    var P = S.plan(ds[0]);
    if (!P.only) return null;
    var all = S.find(function(v) { return S.twoOnTwo(v) && scWith(S, v, t.members); });
    if (!all.length) return null;
    var once = S.oneEach ? S.oneEach(all) : all;
    var ch = once.filter(function(x) { return S.isTitle(x.v); }).length, tl = once.filter(function(x) { return S.inComp(x.v, 'tagleague'); }).length;
    return { P: P, first: ds[0], all: all, n: once.length, ch: ch, tl: tl };
  }
  function renderTeam() {
    var t = TEAM;
    if (!t) {
      scroller.innerHTML = '<div class="tt-head"><div class="tt-bar"></div><div class="tt-h1">' + esc(T('Team not found', 'チームが見つかりません')) + '</div></div><div class="tt-empty" style="margin-top:16px">' + esc(T('Open Tag Teams in the menu to choose a team.', 'メニューのタッグチームから選んでください。')) + '</div>';
      return;
    }
    var lgNow = t.league.slice().sort(function(a, b) { return b.year - a.year; })[0];
    var lgLine = lgNow ? ' · ' + esc(T((lgNow.bname ? blockName({ name: lgNow.bname }, true) + ' Goddesses, ' : '') + 'Tag League ' + lgNow.year + (t.league.length > 1 ? ' (' + t.league.length + ' entries)' : ''),
      (lgNow.bja ? lgNow.bja + '・' : '') + 'タッグリーグ' + lgNow.year)) : '';
    TCC = teamCc();
    var h = '<div class="tt-head"><div class="tt-bar"></div><div><div class="tt-h1 notranslate" translate="no">' + esc(t.display) + (t.league.length ? wings(24, '#F4C242', '#0B1118') : '') + '</div><div class="tt-note">' + esc(T('Tag team', 'タッグチーム')) + (t.sub ? ' · ' + esc(t.sub) : '') + lgLine + '</div></div>' +
      (TCC ? '<div class="cc-badge notranslate" translate="no">' + CC_TEL + esc(T('STARSCOPE · EVERY MATCH TOGETHER', 'STARSCOPE · 全タッグマッチ')) + '</div>' : '') +
      '<div class="tt-instr">' + esc(T('Up and Down move between rows. OK opens. Back returns.', '上下で移動、OKで開く、戻るで戻ります。')) + '</div></div>';
    var av = t.members.map(function(m) {
      var p = call('wrestlerPhoto', m) || call('wrestlerPhoto', siteName(m));
      var sb = window.__tvStar ? window.__tvStar([m, siteName(m)], 'circle') : '';
      return p ? '<div class="ph" style="' + (sb || 'background-image:url(\'' + esc(p) + '\')') + '"></div>' : '<div class="notranslate" translate="no">' + esc(initials(m)) + '</div>';
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
        t.members.map(function(m) { var p = '/mypage?tvwr=' + encodeURIComponent(searchName(m)); return '<a class="tt-btn notranslate" translate="no" tabindex="0" href="' + esc(absUrl(p)) + '">' + esc(m) + '</a>'; }).join('') +
        (t.facObj && t.facObj.members && t.facObj.members.length ? '<a class="tt-btn" tabindex="0" href="' + esc(absUrl('/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(t.facObj.members[0].search) + '&tvfaction=' + encodeURIComponent(t.facObj.id) + (CATS_ON ? '&q%5Btype%5D=single' : ''))) + '">' + esc(T('Faction home', 'ユニットページ')) + '</a>' : '') +
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
      var moreUrl = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(searchName(t.members[0]) + ' Tag Team ' + searchName(t.members[1])) + '&activetab=contents&page=1&tvb=' + encodeURIComponent(searchName(t.members[0])) + '&tvmt=tag&tvco=' + encodeURIComponent(searchName(t.members[1])) + (CATS_ON ? '&q%5Btype%5D=single' : '');
      // complete team history (2.121.0): counts on the tabs, no StarScope button (the page is StarScope)
      var tcn = function(id) { return TCC ? '<em class="cc-n">' + (id === 'all' ? TCC.n : id === 'ch' ? TCC.ch : TCC.tl) + '</em>' : ''; };
      h += '<div class="tt-chips" style="margin-top:26px"' + (TCC ? '' : ' data-scope="t" data-scope-a="' + esc(t.members[0]) + '" data-scope-b="' + esc(t.members[1]) + '"') + '>' + tabs.map(function(x) {
        return '<a class="tt-chip' + (x[0] === TAB ? ' tt-on' : '') + '" tabindex="0" href="' + esc(absUrl(teamPath(t) + (x[0] === 'all' ? '' : '&tvtab=' + x[0]))) + '">' + (x[0] === 'tl' ? wings(16, x[0] === TAB ? '#1A1A1A' : '#F4C242', x[0] === TAB ? '#FFB347' : '#161F2A') : '') + esc(x[1]) + tcn(x[0]) + '</a>';
      }).join('') + '<a class="tt-chip" style="margin-left:14px" tabindex="0" href="' + esc(absUrl(moreUrl)) + '">' + esc(T('More', '詳細')) + ' ▸</a></div>';
      h += '<div class="tt-sec"><i></i><b>' + esc(T('MATCHES', '試合')) + '</b><span id="tt-vst"></span></div><div id="tt-vids"></div>' + (DEBUG_ON ? '<div class="tt-dbg notranslate" translate="no" id="tt-dbg"></div>' : '');
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
      if (TAB === 'ch') { if (scTeam('ch')) champMore(); else paintVids(); return; }   // private builds: only the open tab searches
      if (TAB === 'tl') {
        if (!scTeam('tl')) { paintVids(); return; }   // all of it in StarScope: no search, no saved list needed
        // under an "after" cut the saved list's progress doesn't apply: the newest page is read once
        var lf = function() { if (SC_CUT && SC_CUT.after) { L.page = 1; L.done = false; leagueMore(function() { paintVids(); }); } else leagueFirst(function() { paintVids(); }); };
        if (SHEET_ON) fromSheet(lf); else lf();
        return;
      }
      if (TAB === 'all' && TCC) {   // complete team history (2.121.0): the index alone
        var tn = scAdd(V.kept, TCC.all, V.seen);
        V.done = true; V.ran = true;
        V.log.push('Complete team history: ' + tn + ' video' + (tn === 1 ? '' : 's') + ', ' + TCC.n + ' matches from the index (both debuts on or after ' + TCC.P.from + ', first ' + TCC.first + ', logged through ' + TCC.P.thru + ') · no site search' +
          (TCC.P.recent ? ' · not logged yet: ' + TCC.P.unlogged.join(', ') : ''));
        paintVids();
        return;
      }
      if (TAB === 'all') { if (SHEET_ON) fromSheet(function(main) { if (main) main(); else paintVids(); }); else loadMore(); return; }
      if (SHEET_ON) fromSheet(go); else go(loadMore);
    }
    // start when the section is on screen: now if it already is, otherwise once the page scrolls to it
    function inView() { if (!box) return true; var r = box.getBoundingClientRect(), v = scroller.getBoundingClientRect(); return r.top < v.bottom - 40; }
    if (inView()) start();
    else scroller.addEventListener('scroll', function onScroll() { if (inView()) { scroller.removeEventListener('scroll', onScroll); start(); } });
  }

  // ================================================================== a wrestler's page (/mypage?tvwr=<name>[&tvtab=<id>])
  // Drawn by the app like a team page (2.46.0, tested from one menu entry first). assets/wrestler.js works out the
  // wrestler, their title record, debut and header (window.__tvWrApi); this draws the page, runs the open tab's
  // searches through fetchPage (3 s apart, 7-day saved copies) and keeps a card only when it passes the tab's title
  // rule (match_types.json) and the wrestler checks (debut; Championship: their title record). One grid per tab,
  // newest first; the next page loads when focus reaches the last row. More opens the site's search for them with
  // the full filter bar.
  var WP = { api: null, tab: '', x: null, queries: [], qi: 0, page: 1, done: false, busy: false, ran: false, kept: [], seen: {}, dropped: [], log: [], pages: 0, lastLoad: 0 };
  function wpUp(b) { var m = /[?&]ts=(\d{9,11})/.exec(b || ''); return m ? new Date(+m[1] * 1000).toISOString().slice(0, 10) : ''; }
  function wpWords(x) {   // the tab's search words: a faction's own (5★STAR GP: STARS members search BLUE STARS), else the type's
    var api = WP.api, fs = x && x.factionSearch;
    if (fs) for (var i = 0; i < api.factionIds.length; i++) { var o = fs[api.factionIds[i]]; if (o) return { search: o.search || x.search, alts: o.alts || [] }; }
    return { search: (x && x.search) || '', alts: (x && x.alts) || [] };
  }
  function wpRule(x) {
    var re = function(l) { return (l || []).map(function(p) { try { return new RegExp(p, 'i'); } catch (e) { return null; } }).filter(Boolean); };
    return x ? { all: re(x.all), none: re(x.none) } : null;
  }
  function wpJudge(it) {   // '' keeps the card, else why it was left out
    var t = half(it.t), d = dateOfTitle(t), api = WP.api, R = WP.rule;
    var cw = scCut(WP.cut, it);
    if (cw) return cw;
    if (R) {
      for (var i = 0; i < R.all.length; i++) if (!R.all[i].test(t)) return 'not ' + (WP.x.name || WP.tab);
      for (var j = 0; j < R.none.length; j++) if (R.none[j].test(t)) return 'not ' + (WP.x.name || WP.tab);
    }
    var deb = api.debut;
    if (deb) {
      if (d && d < deb) return 'before their debut';
      var yr = d ? null : /(?:^|[^\d])(20\d\d)(?:[^\d]|$)/.exec(t);
      if (yr && yr[1] + '-12-31' < deb) return 'before their debut';
      var up = d ? '' : wpUp(it.b);
      if (up && up < deb) return 'uploaded before their debut';
    }
    if (WP.tab === 'champ' && api.check) { var r = ''; try { r = api.check(t, d, d ? '' : wpUp(it.b)); } catch (e) { r = ''; } if (r) return r; }
    return '';
  }
  function wpLoad(cb) {
    if (WP.busy || WP.done) { if (cb) cb(); return; }
    WP.busy = true; wpPaint();
    var q = WP.queries[WP.qi];
    fetchPage(q, WP.page, function(err, items, more, cached) {
      WP.busy = false; WP.ran = true; WP.lastLoad = Date.now(); WP.pages++;
      if (err) { WP.log.push(q + ' · page ' + WP.page + ': ' + err); WP.done = true; wpPaint(); if (cb) cb(); return; }
      var kept = [], dropped = [];
      items.forEach(function(it) {
        if (WP.seen[it.id]) return; WP.seen[it.id] = 1;
        var why = wpJudge(it);
        if (why) { dropped.push('[' + why + '] ' + it.t); return; }
        kept.push(it);
      });
      WP.kept = WP.kept.concat(kept); WP.dropped = WP.dropped.concat(dropped);
      WP.log.push(q + ' · page ' + WP.page + ': ' + items.length + ' videos, ' + kept.length + ' kept' + (cached ? ' (saved copy)' : ''));
      if (SHEET_ON) sheet('dbg_put', { page: 'wrestler-app', subject: WP.api.W.name, tab: WP.tab, url: location.pathname + location.search,
        record: { query: q, pageNo: WP.page, cached: !!cached, videos: items.length, kept: kept.map(function(x) { return x.t; }), dropped: dropped } }, function() {});
      if (more && !(WP.cut && WP.cut.after)) WP.page++;
      else { WP.qi++; WP.page = 1; if (WP.qi >= WP.queries.length) WP.done = true; }   // after the last logged show: each search's newest page only
      wpPaint();
      if (cb) cb();
    }, true);
  }
  // On opening a tab: pages until there are 8 videos to show, at most 3 pages (the gap between requests still applies).
  function wpStart() {
    (function step(n) { wpLoad(function() { if (!WP.done && WP.kept.length < 8 && n < 3) step(n + 1); }); })(1);
  }
  function wpList() { return WP.tab === 'all' ? WP.kept : byDate(WP.kept); }
  function wpPaint() {
    var box = document.getElementById('tt-vids'), st = document.getElementById('tt-vst'), dbg = document.getElementById('tt-dbg');
    if (!box) return;
    var ae = document.activeElement, had = ae && box.contains(ae) ? (ae.getAttribute('data-vid') || (ae.getAttribute('data-top') ? 'top' : 'more')) : '';
    if (WP.cc) {   // complete career: StarScope cards (2.118.0)
      var cnt = ccPaint(box);
      if (st) st.textContent = cnt + ' ' + T(cnt === 1 ? 'match' : 'matches', '試合');
      if (dbg) dbg.textContent = [WP.ccWhy, T('Complete career · tab: ', '全キャリア · タブ: ') + WP.tab + ' · debut ' + WP.api.debut + ' · ' + WP.cc.D.cards.length + ' videos, ' + WP.cc.St.total + ' matches'].concat(WP.log).join('\n');
      if (had) { var f0 = had === 'top' ? box.querySelector('[data-top]') : had === 'more' ? box.querySelector('[data-wmore]') : box.querySelector('[data-vid="' + had + '"]'); if (f0) focusEl(f0); }
      return;
    }
    var list = wpList(), h = '';
    var more = '<a class="tt-more" tabindex="0" data-wmore="1">' + esc(WP.busy ? T('Searching…', '検索中…') : T('More', 'さらに表示')) + '</a>';
    if (!list.length) {
      h = '<div class="tt-msg">' + esc(WP.done ? T('No matches were found here.', '試合は見つかりませんでした。') : (!WP.ran || WP.busy ? T('Looking for matches...', '試合を検索中...') : T('None on the pages searched so far.', 'これまでのページにはありません。'))) + '</div>';
      if (!WP.done && WP.ran) h += '<div class="tt-vids">' + more + '</div>';
      box.className = '';
    } else {
      box.className = 'tt-vids';
      h = list.map(cardHtml).join('') + (WP.done ? '' : more);
      if (WP.done && list.length > 4) h += '<a class="tt-more tt-top" tabindex="0" data-top="1">' + esc(T('Back to top', 'トップへ戻る')) + ' ↑</a>';
    }
    box.innerHTML = h;
    if (st) st.textContent = WP.busy ? (list.length ? list.length + ' · ' : '') + T('looking for videos', '動画を検索中') : (list.length + ' ' + T(list.length === 1 ? 'match' : 'matches', '試合') + (WP.done ? '' : ' ' + T('so far', 'まで')));
    if (dbg) {
      dbg.textContent = [WP.ccWhy || '', T('Tab: ', 'タブ: ') + WP.tab + ' · ' + T('searches: ', '検索: ') + WP.queries.join(' | ') + (WP.api.debut ? ' · debut ' + WP.api.debut : '')]
        .concat(WP.log)
        .concat(['Kept ' + WP.kept.length + ' · left out ' + WP.dropped.length + (SHEET_ON ? ' · sent to the sheet' : '')])
        .concat(WP.dropped.length ? ['Left out: ' + WP.dropped.slice(0, 8).join(' | ') + (WP.dropped.length > 8 ? ' …' : '')] : []).join('\n');
    }
    if (had) { var f = had === 'top' ? box.querySelector('[data-top]') : had === 'more' ? box.querySelector('[data-wmore]') : box.querySelector('[data-vid="' + had + '"]'); if (f) focusEl(f); }
  }
  // the next page as focus reaches the last row or the More tile (one page per move, 3 s apart)
  function wpNear(el) {
    if (!WP.api || WP.busy || WP.done || !el || Date.now() - WP.lastLoad < 3000) return;
    var box = document.getElementById('tt-vids');
    if (!box || !box.contains(el)) return;
    if (el.getAttribute('data-wmore') != null) { wpLoad(); return; }
    var r = el.getBoundingClientRect(), below = Array.prototype.some.call(box.querySelectorAll('.tt-card'), function(c) { return c.getBoundingClientRect().top > r.bottom - 4; });
    if (!below) wpLoad();
  }
  scroller.addEventListener('focusin', function(e) { if (WP.api) wpNear(e.target); });
  // 2.121.3: when a newer StarScope list arrives, a wrestler page that should now be (or stop being) a complete career is
  // drawn again.
  window.addEventListener('tvscopelist', function() {
    var api = WP.api;
    if (!api || api.missing || !document.getElementById('tv-wr')) return;
    var P = ccPlan(api), now = !!(P && ccData(api).matches.length);
    if (now !== !!WP.cc) { try { renderWrestler(); } catch (e) {} }
  });
  function wpPath(tab) { return '/mypage?tvwr=' + encodeURIComponent(WP.api.W.name) + (tab && tab !== 'all' ? '&tvtab=' + encodeURIComponent(tab) : ''); }
  function renderWrestler(tries) {
    var api = window.__tvWrApi;
    if (!api) {
      if ((tries || 0) < 30) { setTimeout(function() { renderWrestler((tries || 0) + 1); }, 100); return; }
      api = { missing: Q.get('tvwr') };
    }
    if (api.missing) {
      scroller.innerHTML = '<div class="tt-head"><div class="tt-bar"></div><div class="tt-h1">' + esc(T('Wrestler not found', '選手が見つかりません')) + '</div></div><div class="tt-empty" style="margin-top:16px">' + esc(api.missing) + '</div>';
      return;
    }
    WP.api = api;
    var P0 = ccPlan(api);
    WP.cc = null;
    if (P0) { var D0 = ccData(api); if (D0.matches.length) WP.cc = { P: P0, D: D0, St: ccStats(D0) }; }
    (function() {   // 2.121.2: the complete-career decision, for the debug block
      var S = window.__tvScopeIdx, ys = '', fr = '';
      try { ys = (S.years() || []).join(','); fr = S.from(); } catch (e) {}
      WP.ccWhy = 'StarScope: complete years [' + ys + '] \u00b7 complete from ' + (fr || 'none') + ' \u00b7 debut ' + (api.debut || 'none') + ' \u00b7 ' +
        (WP.cc ? 'complete career' : !P0 ? 'not complete (debut missing or before ' + (fr || '?') + ')' : 'not complete (no logged matches found under ' + [api.W.name, api.W.search].join(' / ') + ')') +
        (S && S.saveInfo ? '\n' + S.saveInfo() : '');
    })();
    var CC = WP.cc, cn = function(id) { var n = CC ? (id === 'all' ? CC.St.total : CC.St.tabs[id]) : null; return n != null ? '<em class="cc-n">' + n + '</em>' : ''; };
    var cats = api.cats || [], tab = Q.get('tvtab') || 'all', x = null;
    cats.forEach(function(c) { if (c.id === tab) x = c; });
    if (!x && !(CC && tab === 'singles')) tab = 'all';
    WP.tab = tab; WP.x = x; WP.rule = wpRule(x);
    var base = api.W.search, w = x ? wpWords(x) : null;
    WP.queries = x ? [base + ' ' + w.search].concat(w.alts.map(function(a) { return base + ' ' + a; })) : [base];
    var moreUrl = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(base) + '&activetab=contents&page=1&tvb=' + encodeURIComponent(base) + '&q%5Btype%5D=single&tvmore=1';
    // complete career (2.118.1): no StarScope button (the page is StarScope), a Singles Matches tab, More opens the filters here
    var tabs = '<div class="wr-tabs"' + (CC ? '' : ' data-scope="w" data-scope-a="' + esc(api.W.name) + '" data-scope-b="' + esc(api.W.search) + '"') + '><a class="wr-tab' + (tab === 'all' ? ' wr-tab-on' : '') + '" tabindex="0" href="' + esc(absUrl(wpPath('all'))) + '">' + esc(T('All Matches', 'すべての試合')) + cn('all') + '</a>' +
      (CC ? '<a class="wr-tab' + (tab === 'singles' ? ' wr-tab-on' : '') + '" tabindex="0" href="' + esc(absUrl(wpPath('singles'))) + '">' + esc(T('Singles Matches', 'シングルマッチ')) + '<em class="cc-n">' + CC.St.kinds.singles + '</em></a>' : '') +
      cats.map(function(c) { return '<a class="wr-tab' + (tab === c.id ? ' wr-tab-on' : '') + '" tabindex="0" href="' + esc(absUrl(wpPath(c.id))) + '">' + esc(isJa() && c.ja ? c.ja : c.name) + cn(c.id) + '</a>'; }).join('') +
      (CC ? '<a class="wr-tab wr-tab-more" tabindex="0" data-ccmore="1">' + esc(T('More', '詳細')) + ' ▾</a></div><div id="cc-fil"></div>' :
      '<a class="wr-tab wr-tab-more" tabindex="0" href="' + esc(absUrl(moreUrl)) + '">' + esc(T('More', '詳細')) + ' ▸</a></div>');
    var h = '<div class="tt-head"><div class="tt-bar"></div><div><div class="tt-h1 notranslate" translate="no">' + esc(api.W.name) + '</div><div class="tt-note">' + esc(T('Wrestler', '選手')) + '</div></div>' +
      (CC ? '<div class="cc-badge notranslate" translate="no">' + CC_TEL + esc(T('STARSCOPE · EVERY MATCH SINCE DEBUT', 'STARSCOPE · デビュー以来の全試合')) + '</div>' : '') +
      '<div class="tt-instr">' + esc(T('Up and Down move between rows. OK opens. Back returns.', '上下で移動、OKで開く、戻るで戻ります。')) + '</div></div>';
    h += '<div id="tv-wr" class="notranslate" translate="no" style="margin-top:18px;padding-right:0">' + api.header(tabs) + '</div>';
    h += '<div id="tt-vids"></div>' + (DEBUG_ON ? '<div class="tt-dbg notranslate" translate="no" id="tt-dbg"></div>' : '');
    scroller.innerHTML = h;
    if (CC) {   // the career block goes just above MATCHES (the header's last section)
      var secs = scroller.querySelectorAll('#tv-wr .wr-sec'), mh = secs[secs.length - 1];
      if (mh) mh.insertAdjacentHTML('beforebegin', '<div class="cc">' + ccHtml(api, CC.D, CC.St, CC.P) + '</div>');
      WP.ccf = {}; WP.ccOpen = ''; WP.ccShow = false;
      ccRenders();
    }
    window.__tvWrAppFav = function() { var b = scroller.querySelector('[data-wrfav]'); if (b) { b.innerHTML = api.favInner(); b.classList.toggle('wr-on', api.isFav()); } };
    // a tab was just chosen: open at MATCHES with that tab focused; otherwise on the favorites button
    var on = scroller.querySelector('.wr-tab-on');
    var ccFirst = !!(CC && Q.get('tvtab') && on);   // complete career: a chosen tab lands on its first match (2.118.3)
    if (Q.get('tvtab') && on) { focusEl(on); try { var sec = on.closest('#tv-wr').querySelector('.wr-tabs').previousElementSibling; scroller.scrollTop += sec.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12; } catch (e) {} }
    else focusEl(scroller.querySelector('.wr-btn') || on);
    scWrestler(api, tab);
    wpPaint();
    if (ccFirst) ccFocusFirst(on);
    if (!WP.done) wpStart();
  }
  // StarScope for the open wrestler tab (2.98.0): 5★STAR GP, Cinderella, Tag League and Championship take a complete
  // year's matches from the index; the debut decides whether the site still needs searching for earlier years.
  var SC_TABS = { stargp: 1, cinderella: 1, tagleague: 1, champ: 1 };
  function scWrestler(api, tab) {
    var S = SC();
    WP.cut = null;
    if (!S || !(SC_TABS[tab] || (WP.cc && (tab === 'all' || tab === 'singles')))) return;
    var names = [api.W.name, api.W.search].concat(ALIAS[String(api.W.name).toLowerCase()] || []);
    var found = S.find(function(v) { return (tab === 'all' ? true : tab === 'singles' ? ccKind(v) === 'singles' : tab === 'champ' ? S.isTitle(v) : S.inComp(v, tab)) && names.some(function(n) { return S.hasName(v, n); }); });
    var n = scAdd(WP.kept, found, WP.seen), P = S.plan(api.debut), ys = S.years();
    WP.cut = P.only ? (P.recent ? { after: P.thru } : null) : { skip: 1 };
    WP.log.push('StarScope: ' + n + ' match' + (n === 1 ? '' : 'es') + ' from the index (complete ' + ys.join(', ') + ', logged through ' + P.thru + (api.debut ? ', debut ' + api.debut : '') + ')' +
      (P.only ? (P.recent ? ' · site: newest page only, for ' + P.unlogged.join(', ') : ' · no site search') : ' · site: earlier years'));
    if (P.only && !P.recent) { WP.done = true; WP.ran = true; }
  }

  // ---- Complete career (2.118.0): a wrestler whose debut falls in StarScope's run of complete years has every match
  // in the index. Her page then comes from the index alone (shows after the last logged one still come from the site's
  // newest page): StarScope cards by year, counts on the tabs, her debut, a career strip, partners, rivals, factions and
  // match types. Spoilers are fine here (title matches, how far she got). Everything is worked out on the TV from the
  // one list the StarScope cards already keep; nothing more is asked of the sheet or the site.
  var CC_ROUNDS = ['qualifier', 'league', 'first-round', 'second-round', 'quarterfinal', 'semifinal', 'final'];
  var CC_RL = { qualifier: ['Qualifier', '予選'], league: ['League', '公式戦'], 'first-round': ['First round', '1回戦'], 'second-round': ['Second round', '2回戦'], quarterfinal: ['Quarterfinal', '準々決勝'], semifinal: ['Semifinal', '準決勝'], final: ['Final', '決勝'] };
  var CC_TEL = '<svg width="18" height="18" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="currentColor"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="currentColor"/><path d="M33 12.5H40V27.5H33Z" fill="currentColor"/></g><path d="M23 25L14 45M25 25L34 45M24 25V44" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>';
  function ccNorm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_-]+/g, ''); }
  // Whether this wrestler's page is a complete career, and the plan for it (from, thru, unlogged shows).
  function ccPlan(api) {
    var S = SC();
    if (!S || !api || !api.debut) return null;
    var P = S.plan(api.debut);
    return P.only ? P : null;
  }
  // Every video with her in it (both versions of a linked match), her own place in each, and the matches counted once.
  function ccData(api) {
    var S = SC(), names = [api.W.name, api.W.search].concat(ALIAS[String(api.W.name).toLowerCase()] || []), want = names.map(ccNorm);
    function mine(p) { return p[0].some(function(k) { return want.indexOf(k) >= 0; }); }
    function where(v) { var at = null; (v.p || []).forEach(function(sd, i) { sd.forEach(function(p, j) { if (!at && mine(p)) at = [i, j]; }); }); return at; }
    var vids = S.find(function(v) { return !!where(v); }, true), seen = {}, matches = [], segs = [];
    vids.forEach(function(x) {
      var v = x.v;
      x.at = where(v);
      if (v.x.k === 'segment') { segs.push(x); return; }
      // a match counts once: its two versions share a match id; an English copy logged as its own match has the same people on the same day
      var key = v.x.m || x.id, key2 = v.d + '|' + (v.p || []).map(function(sd) { return sd.map(function(p) { return p[0][0]; }).sort().join('+'); }).sort().join('/');
      if (seen[key] || seen[key2]) return;
      seen[key] = seen[key2] = 1;
      matches.push(x);
    });
    var cards = vids.filter(function(x) { return x.v.x.k !== 'segment'; });
    return { names: names, cards: cards, matches: matches, segs: segs };
  }
  function ccSide(v, i) { return (isJa() && v.sj && v.sj[i] ? v.sj[i] : (v.s || [])[i]) || []; }
  function ccKind(v) {
    var s = v.p || [], n = s.length, sz = s.map(function(x) { return x.length; });
    if (n === 2 && sz[0] === 1 && sz[1] === 1) return 'singles';
    if (n === 2 && sz[0] === 2 && sz[1] === 2) return 'tag';
    if (n === 2 && sz[0] === 3 && sz[1] === 3) return 'six';
    return 'multi';
  }
  function ccStats(D) {
    var S = SC(), M = D.matches, out = { total: M.length, years: {}, kinds: { multi: 0, tag: 0, six: 0, singles: 0 }, tabs: { champ: 0, stargp: 0, cinderella: 0, tagleague: 0 }, partners: {}, rivals: {}, fac: [], miles: [] };
    var byDate = M.slice().sort(function(a, b) { return String(a.v.d).localeCompare(String(b.v.d)) || ((+a.v.n || 0) - (+b.v.n || 0)); });
    function person(v, i, j) { return { k: v.p[i][j][0][0], n: ccSide(v, i)[j] || '' }; }
    byDate.forEach(function(x) {
      var v = x.v, X = v.x, y = String(v.d).slice(0, 4), kd = ccKind(v), at = x.at;
      out.years[y] = (out.years[y] || 0) + 1;
      out.kinds[kd]++;
      if (S.isTitle(v)) out.tabs.champ++;
      ['stargp', 'cinderella', 'tagleague'].forEach(function(c) { if (S.inComp(v, c)) out.tabs[c]++; });
      (v.p || []).forEach(function(sd, i) {
        sd.forEach(function(p, j) {
          if (i === at[0] && j === at[1]) return;
          var who = person(v, i, j), bag = i === at[0] ? (kd === 'tag' ? out.partners : null) : out.rivals;
          if (!bag || !who.k) return;
          var o = bag[who.k] = bag[who.k] || { n: 0, s: 0, name: who.n };
          o.n++; if (kd === 'singles') o.s++;
        });
      });
      // her faction in this match (sheets from 2.118.0 send each wrestler's faction)
      var fa = X.fa && X.fa[at[0]] ? X.fa[at[0]][at[1]] : '';
      if (fa) { var last = out.fac[out.fac.length - 1]; if (last && last.f === fa) { last.to = v.d; last.n++; } else out.fac.push({ f: fa, from: v.d, to: v.d, n: 1 }); }
    });
    // a faction for one or two matches between two stays in the same one is a logging slip: folded into the run around it
    var runs = [];
    out.fac.forEach(function(r) {
      var prev = runs[runs.length - 1];
      if (prev && r.n < 3) { prev.to = r.to; prev.n += r.n; return; }
      if (prev && prev.f === r.f) { prev.to = r.to; prev.n += r.n; return; }
      runs.push({ f: r.f, from: r.from, to: r.to, n: r.n });
    });
    out.fac = runs.reverse();   // newest first
    function top(bag) { return Object.keys(bag).map(function(k) { return bag[k]; }).sort(function(a, b) { return b.n - a.n || b.s - a.s; }).slice(0, 4); }
    out.partners = top(out.partners); out.rivals = top(out.rivals);
    // the career strip
    var miles = [], first = byDate[0];
    function opp(x) { var v = x.v, at = x.at; return (v.p || []).map(function(sd, i) { return i === at[0] ? null : ccSide(v, i).join(' & '); }).filter(Boolean).join(isJa() ? '、' : ' · '); }
    function mates(x) { var s = ccSide(x.v, x.at[0]).filter(function(n, j) { return j !== x.at[1]; }); return s.join(' & '); }
    function showOf(v) { var n = v.sh || ''; if (window.__tvShowName && !isJa()) { try { n = window.__tvShowName.en(n, v.d, true) || n; } catch (e) {} } return n; }
    if (first) miles.push({ pr: 1, d: first.v.d, x: first, tag: T('DEBUT', 'デビュー'), c: 'or', t: T('vs ', 'vs ') + opp(first), s: showOf(first.v) });
    var titles = {};
    byDate.forEach(function(x) {
      var X = x.v.x;
      (X.tv || []).forEach(function(id, i) {
        if (titles[id]) return;
        titles[id] = 1;
        var nm = (X.ti || [])[i] || id;
        miles.push({ pr: 2, d: x.v.d, x: x, tag: T('TITLE MATCH', 'タイトルマッチ'), c: 'gd', t: T('First ' + nm + ' title match', nm + ' 初挑戦'), s: (mates(x) ? T('with ', '') + mates(x) + T(' · ', '組 · ') : '') + T('vs ', 'vs ') + opp(x) });
      });
      if ((x.v.x.mo || []).indexOf('homecoming') >= 0 && !miles.some(function(m) { return m.home; })) miles.push({ pr: 3, d: x.v.d, x: x, home: 1, tag: T('HOMECOMING', '凱旋'), c: 'or', t: T('vs ', 'vs ') + opp(x), s: showOf(x.v) });
    });
    var lastTitle = byDate.filter(function(x) { return S.isTitle(x.v); }).pop();
    if (lastTitle && !miles.some(function(m) { return m.x === lastTitle; })) miles.push({ pr: 6, d: lastTitle.v.d, x: lastTitle, tag: T('TITLE MATCH', 'タイトルマッチ'), c: 'gd', t: ((lastTitle.v.x.ti || [])[0] || ''), s: (mates(lastTitle) ? T('with ', '') + mates(lastTitle) + T(' · ', '組 · ') : '') + showOf(lastTitle.v) });
    // tournaments: her best run in each, and the latest year if it was a league
    ['cinderella', 'stargp', 'tagleague'].forEach(function(c) {
      var runs2 = {};
      byDate.forEach(function(x) {
        if (!S.inComp(x.v, c)) return;
        var y = String(x.v.d).slice(0, 4), r = runs2[y] = runs2[y] || { y: y, best: -1, n: 0, x: x, bk: '' };
        r.n++; r.x = x; if (x.v.x.bk) r.bk = x.v.x.bk;
        (x.v.x.rd || []).forEach(function(rd) { var i = CC_ROUNDS.indexOf(rd); if (i > r.best) r.best = i; });
      });
      var ys = Object.keys(runs2).map(function(k) { return runs2[k]; });
      if (!ys.length) return;
      // a knockout round from the second round on is a run to show; otherwise her latest year in it, by matches
      var best = ys.slice().sort(function(a, b) { return b.best - a.best || b.y.localeCompare(a.y); })[0], ko = best.best >= 3;
      if (!ko) best = ys.slice().sort(function(a, b) { return b.y.localeCompare(a.y); })[0];
      var ev = (isJa() ? best.x.v.ej : best.x.v.e) || '';
      var rl = CC_RL[CC_ROUNDS[best.best]];
      miles.push({ pr: ko ? 4 : 5, d: best.x.v.d, x: best.x, tag: c === 'cinderella' ? 'CINDERELLA' : c === 'stargp' ? '5★STAR GP' : T('TAG LEAGUE', 'タッグリーグ'), c: 'gd',
        t: ko && rl ? T('Reached the ' + rl[0].toLowerCase(), rl[1] + '進出') : T(best.n + ' matches', best.n + '試合'), s: ev + (ko ? T(' · best run', ' · 最高成績') : '') });
    });
    // factions she joined after her first (newest runs are first in out.fac)
    out.fac.slice(0, -1).forEach(function(r) { var x = byDate.filter(function(m) { return m.v.d === r.from; })[0]; miles.push({ pr: 5, d: r.from, x: x, tag: T('FACTION', 'ユニット'), c: 'gy', t: T('Joined ', '') + r.f + T('', '加入'), s: '' }); });
    // eight at most, by what matters most (debut, first title matches, homecoming, a knockout run, then the rest,
    // newer first), then laid out newest on the left
    miles.sort(function(a, b) { return a.pr - b.pr || String(b.d).localeCompare(String(a.d)); });
    miles = miles.slice(0, 8).sort(function(a, b) { return String(b.d).localeCompare(String(a.d)); });
    out.miles = miles;
    out.first = first;
    return out;
  }
  // 2.118.1: the partners' and rivals' circles get their picture after the page is drawn: the cut-out over the
  // Tag League circles' colour and glow, else the photo; initials stay where there's neither.
  function ccRenders() {
    setTimeout(function() {
      Array.prototype.forEach.call(scroller.querySelectorAll('.cc-row .av[data-n]'), function(el) {
        var n = el.getAttribute('data-n'), sb = window.__tvStar ? window.__tvStar([n, siteName(n)], 'tiny') : '', ph = sb ? '' : (call('wrestlerPhoto', n) || call('wrestlerPhoto', siteName(n)));
        if (!sb && !ph) return;
        el.setAttribute('style', sb || 'background:#161F2A url(\'' + ph + '\') center top/cover no-repeat;');
        el.classList.add('ph'); el.textContent = '';
      });
    }, 400);
  }
  function ccWrPath(name) { return '/mypage?tvwr=' + encodeURIComponent(name); }
  function ccSec(title, note) { return '<div class="wr-sec"><i></i><b>' + esc(title) + '</b>' + (note ? '<span>' + esc(note) + '</span>' : '') + '</div>'; }
  function ccCard(x, badge) {
    var v = x.v, d = String(v.d || '');
    var card = window.__tvStarCard ? window.__tvStarCard.html(v) : '<div class="tt">' + esc(v.vt || '') + '</div>';
    return '<a class="tt-card cc-sc" tabindex="0" data-vid="' + esc(x.id) + '" href="' + esc(absUrl('/contents/' + x.id)) + '"><div class="im"' + (v.th ? ' data-bg="' + esc(v.th) + '"' : '') + '>' +
      (badge ? '<span class="ok">' + esc(badge) + '</span>' : '') + (d ? '<span class="dt">' + esc(fmtD(d)) + '</span>' : '') + '</div><div class="tvsc-host">' + card + '</div></a>';
  }
  // The career block, between the header and MATCHES.
  function ccHtml(api, D, St, P) {
    var h = '<div class="cc-top">';
    if (St.first) {
      var lim = new Date(Date.parse(St.first.v.d) + 60 * 86400000).toISOString().slice(0, 10);
      var intro = D.segs.filter(function(x) { return String(x.v.d) <= lim; }).slice(-1)[0];   // newest first: the earliest
      h += '<div class="cc-col">' + ccSec(T('DEBUT', 'デビュー'), fmtD(St.first.v.d)) + '<div class="cc-deb">' + ccCard(St.first, T('DEBUT', 'デビュー')) + '</div>' +
        (intro ? '<div class="cc-fine">' + esc(T('Also logged: ', '登録済み: ') + ((isJa() ? intro.v.ej : intro.v.e) || '') + ' · ' + fmtD(intro.v.d)) + '</div>' : '') + '</div>';
    }
    h += '<div class="cc-col cc-grow">' + ccSec(T('CAREER', 'キャリア'), T('Newest on the left', '左が最新')) + '<div class="cc-miles">' + St.miles.map(function(m) {
      return '<a class="cc-mile" tabindex="0" href="' + esc(m.x ? absUrl('/contents/' + m.x.id) : '') + '"><div class="r1"><b class="' + m.c + '">' + esc(m.tag) + '</b><span>' + esc(fmtD(m.d)) + '</span></div><div class="r2">' + esc(m.t) + '</div>' + (m.s ? '<div class="r3">' + esc(m.s) + '</div>' : '') + '</a>';
    }).join('') + '</div></div></div>';
    function rows(list, rival) {
      return list.map(function(o) {
        var ini = String(o.name || '?').split(/\s+/).map(function(w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        return '<a class="cc-row" tabindex="0" href="' + esc(absUrl(ccWrPath(o.name))) + '"><span class="av notranslate" translate="no" data-n="' + esc(o.name) + '">' + esc(ini) + '</span><span class="nm">' + esc(o.name) + '</span><span class="ct">' + o.n + '<em>' + esc(rival ? T(' matches (' + o.s + ' singles)', '試合（シングル' + o.s + '）') : T(' matches', '試合')) + '</em></span></a>';
      }).join('');
    }
    if (St.partners.length || St.rivals.length) {
      h += '<div class="cc-two"><div>' + ccSec(T('TOP PARTNERS', 'パートナー'), T('2 v 2 matches together', '2対2で組んだ試合')) + rows(St.partners, false) + '</div>' +
        '<div>' + ccSec(T('RIVALS', 'ライバル'), T('Opposite sides, any match', '対戦（すべての試合）')) + rows(St.rivals, true) + '</div></div>';
    }
    if (St.fac.length) {
      h += '<div>' + ccSec(T('FACTIONS', 'ユニット')) + '<div class="cc-facs">' + St.fac.map(function(r, i) {
        var to = i === 0 ? T('now', '現在') : fmtD(r.to);
        return '<div class="cc-fac' + (i === 0 ? ' on' : '') + '" style="flex:' + r.n + '"><div class="f1">' + esc(r.f) + '</div><div class="f2">' + esc(fmtD(r.from) + ' – ' + to + ' · ' + r.n + T(' matches', '試合')) + '</div></div>';
      }).join('') + '</div></div>';
    }
    var K = St.kinds, kinds = [['multi', T('Multi', '3チーム以上'), '#F4C242'], ['tag', T('Tag', 'タッグ'), '#FFB347'], ['six', T('6-person', '6人タッグ'), '#C9D2DC'], ['singles', T('Singles', 'シングル'), '#FFFFFF']].filter(function(k) { return K[k[0]]; });
    h += '<div>' + ccSec(T('MATCH TYPES', '試合形式')) + '<div class="cc-types">' + kinds.map(function(k) { return '<div style="flex:' + K[k[0]] + ';background:' + k[2] + '">' + esc(k[1]) + ' ' + K[k[0]] + '</div>'; }).join('') + '</div></div>';
    h += '<div class="cc-fine">' + esc(T('StarScope: every match from ', 'StarScope: ') + fmtD(api.debut) + T(' to ', '〜') + fmtD(P.thru) + T(' (last logged show).', '（最新の登録済み大会）のすべての試合。') +
      (P.recent ? T(' Newer shows come from the site’s search until they’re logged.', ' それ以降の大会は登録されるまでサイトの検索から表示します。') : '')) + '</div>';
    return h;
  }
  // Pictures near the screen only (pages with hundreds of cards): set as a card comes within a screen of view, let go
  // when it is three screens away.
  var ccIO = null;
  function ccPictures() {
    var box = scroller;   // every StarScope card on the page: the debut card sits outside the grid (2.118.1)
    if (!window.IntersectionObserver) { Array.prototype.forEach.call(box.querySelectorAll('.cc-sc .im[data-bg]'), function(im) { im.style.backgroundImage = 'url(\'' + im.getAttribute('data-bg') + '\')'; }); return; }
    if (ccIO) ccIO.disconnect();
    var near = new IntersectionObserver(function(es) { es.forEach(function(e) { var im = e.target; if (e.isIntersecting && !im.style.backgroundImage) im.style.backgroundImage = 'url(\'' + im.getAttribute('data-bg') + '\')'; }); }, { root: scroller, rootMargin: '600px 0px' });
    var far = new IntersectionObserver(function(es) { es.forEach(function(e) { if (!e.isIntersecting) e.target.style.backgroundImage = ''; }); }, { root: scroller, rootMargin: '1800px 0px' });
    Array.prototype.forEach.call(box.querySelectorAll('.cc-sc .im[data-bg]'), function(im) { near.observe(im); far.observe(im); });
    ccIO = { disconnect: function() { near.disconnect(); far.disconnect(); } };
  }
  // ---- More on a complete career (2.118.1): StarScope's filters on this page, not the site's search. More shows a row
  // of filters (partner, match type (2.118.3), opponent, team or faction, year, tournament, title, sort); a filter opens its choices (each
  // with how many matches) in a row under it; choosing one redraws the cards and focuses the first match.
  var CC_FK = ['p', 'k', 'o', 'g', 'y', 'c', 'ti', 'sort'];
  var CC_KL = { singles: ['Singles', 'シングル'], tag: ['Tag team', 'タッグ'], six: ['Six-person tag', '6人タッグ'], multi: ['Multi-person', '多人数'] };
  function ccFL(k) { return { p: T('Partner', 'パートナー'), k: T('Match type', '試合形式'), o: T('Opponent', '対戦相手'), g: T('Team or faction', 'チーム・ユニット'), y: T('Year', '年'), c: T('Tournament', 'トーナメント'), ti: T('Title', 'タイトル'), sort: T('Sort', '並び順') }[k]; }
  var CC_SORT = { 'new': ['Newest', '新しい順'], old: ['Oldest', '古い順'], top: ['Top rated', '高評価順'] };
  function ccVals(x, k) {
    var v = x.v, X = v.x, at = x.at || [0, 0];
    if (k === 'p') return ccSide(v, at[0]).filter(function(n, j) { return j !== at[1]; });
    if (k === 'k') { var kl = CC_KL[ccKind(v)]; return [T(kl[0], kl[1])]; }
    if (k === 'o') { var o = []; (v.s || []).forEach(function(sd, i) { if (i !== at[0]) o = o.concat(ccSide(v, i)); }); return o; }
    if (k === 'g') return X.g || [];
    if (k === 'y') return [String(v.d).slice(0, 4)];
    if (k === 'c') return X.c ? [X.c] : [];
    if (k === 'ti') return X.ti || [];
    return [];
  }
  function ccFiltered(list) {
    var F = WP.ccf || {};
    var out = list.filter(function(x) { return CC_FK.every(function(k) { return k === 'sort' || !F[k] || ccVals(x, k).indexOf(F[k]) >= 0; }); });
    if (F.sort === 'old') out = out.slice().sort(function(a, b) { return String(a.v.d).localeCompare(String(b.v.d)); });
    if (F.sort === 'top') out = out.slice().sort(function(a, b) { return ((b.v.x.r || 0) - (a.v.x.r || 0)) || String(b.v.d).localeCompare(String(a.v.d)); });
    return out;
  }
  function ccCount(list) { var seen = {}; list.forEach(function(x) { seen[x.v.x.m || x.id] = 1; }); return Object.keys(seen).length; }
  function ccFil(base) {
    var box = document.getElementById('cc-fil');
    if (!box) return;
    if (!WP.ccShow) { box.innerHTML = ''; return; }
    var F = WP.ccf, h = '<div class="cc-frow">';
    CC_FK.forEach(function(k) {
      var val = k === 'sort' ? (F.sort && F.sort !== 'new' ? T(CC_SORT[F.sort][0], CC_SORT[F.sort][1]) : '') : (F[k] || '');
      if (k !== 'sort' && !val && (WP.tab === 'singles' && k === 'k' || !ccOpts(base, k).length)) return;   // nothing to choose
      h += '<a class="cc-fc' + (val ? ' on' : '') + (WP.ccOpen === k ? ' op' : '') + '" tabindex="0" data-ccf="' + k + '"' + (k === 'sort' ? ' style="margin-left:auto"' : '') + '>' + esc(ccFL(k) + (val ? ': ' + val : '')) + ' ▾</a>';
    });
    h += '</div>';
    if (WP.ccOpen) {
      var k = WP.ccOpen, opts = k === 'sort' ? Object.keys(CC_SORT).map(function(s) { return { v: s, l: T(CC_SORT[s][0], CC_SORT[s][1]) }; }) : [{ v: '', l: T('Any', 'すべて') }].concat(ccOpts(base, k).map(function(o) { return { v: o.v, l: o.v, n: o.n }; }));
      h += '<div class="cc-frow cc-opts">' + opts.map(function(o) {
        var on = k === 'sort' ? (F.sort || 'new') === o.v : (F[k] || '') === o.v;
        return '<a class="cc-fc' + (on ? ' on' : '') + '" tabindex="0" data-ccv="' + esc(o.v) + '">' + esc(o.l) + (o.n ? ' <em>' + o.n + '</em>' : '') + '</a>';
      }).join('') + '</div>';
    }
    box.innerHTML = h;
  }
  function ccOpts(base, k) {
    var F = WP.ccf || {}, count = {}, seen = {};
    base.filter(function(x) { return CC_FK.every(function(j) { return j === k || j === 'sort' || !F[j] || ccVals(x, j).indexOf(F[j]) >= 0; }); }).forEach(function(x) {
      var mk = x.v.x.m || x.id;
      ccVals(x, k).forEach(function(val) { if (!val || seen[mk + '|' + val]) return; seen[mk + '|' + val] = 1; count[val] = (count[val] || 0) + 1; });
    });
    return Object.keys(count).map(function(v) { return { v: v, n: count[v] }; }).sort(k === 'y' ? function(a, b) { return b.v.localeCompare(a.v); } : function(a, b) { return b.n - a.n || a.v.localeCompare(b.v); });
  }
  // the first match card of the results (2.118.3); the fallback when there are none
  function ccFocusFirst(fallback) {
    var c = scroller.querySelector('#tt-vids .tt-card');
    if (c) focusEl(c, true); else if (fallback) focusEl(fallback);
  }
  function ccRepaint(focusSel) {
    wpPaint();
    var f = focusSel && scroller.querySelector(focusSel);
    if (f) focusEl(f);
  }
  // MATCHES for a complete career: the open tab's index matches as StarScope cards. All Matches is by year (year chips
  // jump to a year); the other tabs are one grid, newest first. Shows not logged yet (site cards) come first.
  function ccPaint(box) {
    var C = WP.cc, S = SC(), tab = WP.tab, list = C.D.cards.filter(function(x) { return tab === 'all' ? true : tab === 'singles' ? ccKind(x.v) === 'singles' : tab === 'champ' ? S.isTitle(x.v) : S.inComp(x.v, tab); });
    var base = list;
    list = ccFiltered(list);
    ccFil(base);
    var site = WP.kept.filter(function(it) { return !it.sc; }), h = '';
    if (site.length) h += '<div class="cc-yh">' + esc(T('Not logged yet', '未登録')) + '<span>' + site.length + '</span></div>' + site.map(cardHtml).join('');
    var filtered = Object.keys(WP.ccf || {}).some(function(k) { return WP.ccf[k] && k !== 'sort'; }), sorted = WP.ccf && WP.ccf.sort && WP.ccf.sort !== 'new';
    if (tab === 'all' && !filtered && !sorted) {
      var ys = Object.keys(C.St.years).sort().reverse(), byY = {};
      list.forEach(function(x) { var y = String(x.v.d).slice(0, 4); (byY[y] = byY[y] || []).push(x); });
      h = '<div class="cc-years">' + '<span class="lb">' + esc(T('YEAR', '年')) + '</span>' + ys.map(function(y) { return '<a class="cc-yc" tabindex="0" data-wyear="' + y + '">' + y + ' <em>' + C.St.years[y] + '</em></a>'; }).join('') + '</div>' + h;
      ys.forEach(function(y) { h += '<div class="cc-yh" id="cc-y' + y + '">' + y + '<span>' + C.St.years[y] + T(' matches', '試合') + '</span></div>' + (byY[y] || []).map(function(x) { return ccCard(x); }).join(''); });
    } else h += list.map(function(x) { return ccCard(x); }).join('');
    if (!list.length && !site.length) h = '<div class="tt-msg">' + esc(T('No matches here.', '試合はありません。')) + '</div>';
    if (!WP.done) h += '<a class="tt-more" tabindex="0" data-wmore="1">' + esc(WP.busy ? T('Searching…', '検索中…') : T('Newer shows', '最新の大会')) + '</a>';
    if (list.length > 4) h += '<a class="tt-more tt-top" tabindex="0" data-top="1">' + esc(T('Back to top', 'トップへ戻る')) + ' ↑</a>';
    box.className = 'tt-vids';
    box.innerHTML = h;
    ccPictures();
    var n = filtered ? ccCount(list) : tab === 'all' ? C.St.total : tab === 'singles' ? C.St.kinds.singles : (C.St.tabs[tab] || 0);
    return n + site.length;
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
    if (el.getAttribute('data-top') != null) { scroller.scrollTop = 0; focusEl(scroller.querySelector('.tt-chip.tt-on, .wr-tab-on') || scroller.querySelector('[tabindex="0"]')); return true; }
    if (el.getAttribute('data-favb') != null) { if (window.__tvFav && TEAM) window.__tvFav.toggleTeam(TEAM.id); return true; }
    if (el.getAttribute('data-wrfav') != null) { if (WP.api) { WP.api.toggleFav(); if (window.__tvWrAppFav) window.__tvWrAppFav(); } return true; }
    if (el.getAttribute('data-wmore') != null) { if (!WP.busy) wpLoad(); return true; }
    if (el.getAttribute('data-ccmore') != null) { WP.ccShow = !WP.ccShow; WP.ccOpen = ''; ccRepaint(WP.ccShow ? '[data-ccf]' : '[data-ccmore]'); return true; }
    if (el.getAttribute('data-ccf') != null) { var fk = el.getAttribute('data-ccf'); WP.ccOpen = WP.ccOpen === fk ? '' : fk; ccRepaint(WP.ccOpen ? '[data-ccv]' : '[data-ccf="' + fk + '"]'); return true; }
    if (el.getAttribute('data-ccv') != null) { var ok = WP.ccOpen; if (ok) WP.ccf[ok] = el.getAttribute('data-ccv'); WP.ccOpen = ''; ccRepaint(); ccFocusFirst(scroller.querySelector('[data-ccf="' + ok + '"]')); return true; }
    if (el.getAttribute('data-wyear') != null) {   // a year chip: to that year's first card
      var yh = document.getElementById('cc-y' + el.getAttribute('data-wyear')), c = yh && yh.nextElementSibling;
      while (c && !c.classList.contains('tt-card')) c = c.nextElementSibling;
      if (yh) { scroller.scrollTop += yh.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12; if (c) focusEl(c); }
      return true;
    }
    return false;
  }
  scroller.addEventListener('click', function(e) { var el = e.target.closest ? e.target.closest('[tabindex]') : null; if (el && choose(el)) e.preventDefault(); });
  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-tt') || menuOpen() || document.getElementById('tv-fp-pop')) return;   // the video options pop-up has its own keys
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

  if (Q.get('tvwr')) renderWrestler(0); else if (Q.get('tvteam')) renderTeam(); else if (Q.get('league')) renderLeague(null); else renderList(null);
})();
