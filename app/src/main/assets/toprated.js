(function(){
  // Match type icons (one dot per wrestler, one colour per side), shared by the menu shelf and the Top Rated page.
  if (!window.__tvMatchIcon) {
    var st = document.createElement('style');
    st.textContent = [
      '.tv-mi{position:relative;width:56px;height:40px;flex:0 0 56px;}',
      '.tv-mi i{position:absolute;width:9px;height:9px;border-radius:50%;}',
      '.tv-mi i.sm{width:7px;height:7px;}',
      '.tv-mi .g{background:#F4C242;}.tv-mi .w{background:#FFFFFF;}.tv-mi .o{background:#FFB347;}.tv-mi .b{background:#9AA6B4;}',
      '.tv-mi .gr{background:none;border:2px solid #F4C242;}.tv-mi .pk{background:none;border:2px solid #FFFFFF;}',
      '.tv-mi i.dm{opacity:.45;}',
      '.tv-mi i.ln{background:#9AA6B4;border-radius:0;width:auto;height:auto;}',
      '.tv-mi i.fr{background:none;border:2px solid #9AA6B4;border-radius:4px;}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
    // type icons: one dot per wrestler, one colour per side (gold, white, orange, grey, hollow gold, hollow white)
  var P = function(x, y, c) { return { c: c, s: 'left:' + x + 'px;top:' + y + 'px' }; };
  var S = function(x, y, c) { return P(x, y, c + ' sm'); };
  var R = function(x, y, w, h, k) { return { c: k || 'ln', s: 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px' }; };
  var ring = [];
  for (var k = 0; k < 9; k++) { var a = k * Math.PI * 2 / 9; ring.push(S(Math.round(24.5 + Math.cos(a) * 22), Math.round(16.5 + Math.sin(a) * 16), 'w')); }
  ring.push(P(24, 15, 'g'));
  var ICONS = {
    single: [P(8, 15, 'g'), P(39, 15, 'w')],
    tag: [P(4, 8, 'g'), P(4, 22, 'g'), P(43, 8, 'w'), P(43, 22, 'w')],
    way3: [P(24, 3, 'g'), P(8, 27, 'w'), P(39, 27, 'o')],
    way3tag: [S(20, 2, 'g'), S(29, 2, 'g'), S(2, 30, 'w'), S(11, 30, 'w'), S(38, 30, 'o'), S(47, 30, 'o')],
    way3trio: [S(16, 2, 'g'), S(24, 2, 'g'), S(32, 2, 'g'), S(0, 30, 'w'), S(8, 30, 'w'), S(16, 30, 'w'), S(33, 30, 'o'), S(41, 30, 'o'), S(49, 30, 'o')],
    way4: [P(10, 5, 'g'), P(38, 5, 'w'), P(10, 26, 'o'), P(38, 26, 'b')],
    way4tag: [S(2, 4, 'g'), S(11, 4, 'g'), S(38, 4, 'w'), S(47, 4, 'w'), S(2, 30, 'o'), S(11, 30, 'o'), S(38, 30, 'b'), S(47, 30, 'b')],
    way4trio: [S(0, 4, 'g'), S(8, 4, 'g'), S(16, 4, 'g'), S(33, 4, 'w'), S(41, 4, 'w'), S(49, 4, 'w'), S(0, 30, 'o'), S(8, 30, 'o'), S(16, 30, 'o'), S(33, 30, 'b'), S(41, 30, 'b'), S(49, 30, 'b')],
    way5: [P(24, 1, 'g'), P(42, 13, 'w'), P(36, 30, 'o'), P(12, 30, 'b'), P(6, 13, 'gr')],
    way6: [P(8, 6, 'g'), P(24, 6, 'w'), P(40, 6, 'o'), P(8, 27, 'b'), P(24, 27, 'gr'), P(40, 27, 'pk')],
    six: [S(4, 6, 'g'), S(4, 16, 'g'), S(4, 26, 'g'), S(45, 6, 'w'), S(45, 16, 'w'), S(45, 26, 'w')],
    eight: [S(4, 2, 'g'), S(4, 12, 'g'), S(4, 22, 'g'), S(4, 32, 'g'), S(45, 2, 'w'), S(45, 12, 'w'), S(45, 22, 'w'), S(45, 32, 'w')],
    ten: [S(4, 1, 'g'), S(4, 9, 'g'), S(4, 17, 'g'), S(4, 25, 'g'), S(4, 33, 'g'), S(45, 1, 'w'), S(45, 9, 'w'), S(45, 17, 'w'), S(45, 25, 'w'), S(45, 33, 'w')],
    twelve: [S(2, 6, 'g'), S(11, 6, 'g'), S(2, 16, 'g'), S(11, 16, 'g'), S(2, 26, 'g'), S(11, 26, 'g'), S(38, 6, 'w'), S(47, 6, 'w'), S(38, 16, 'w'), S(47, 16, 'w'), S(38, 26, 'w'), S(47, 26, 'w')],
    fourteen: [S(2, 2, 'g'), S(2, 12, 'g'), S(2, 22, 'g'), S(2, 32, 'g'), S(11, 7, 'g'), S(11, 17, 'g'), S(11, 27, 'g'), S(47, 2, 'w'), S(47, 12, 'w'), S(47, 22, 'w'), S(47, 32, 'w'), S(38, 7, 'w'), S(38, 17, 'w'), S(38, 27, 'w')],
    handicap: [S(4, 6, 'g'), S(4, 16, 'g'), S(4, 26, 'g'), P(40, 15, 'w')],
    royal: ring,
    cage: [R(1, 1, 54, 38, 'fr'), P(13, 15, 'g'), P(34, 15, 'w')],
    gauntlet: [S(2, 14, 'g'), S(13, 14, 'w dm'), S(24, 14, 'w dm'), S(35, 14, 'w dm'), S(46, 14, 'w dm'), R(2, 28, 52, 2, 'ln')],
    highspeed: [R(2, 9, 18, 2), R(8, 19, 14, 2), R(2, 29, 18, 2), P(30, 15, 'g'), P(44, 15, 'w')],
    ladder: [R(20, 1, 2, 38), R(34, 1, 2, 38), R(20, 9, 16, 2), R(20, 19, 16, 2), R(20, 29, 16, 2), P(5, 15, 'g'), P(42, 15, 'w')],
    rumble: [S(2, 18, 'g'), S(12, 6, 'w'), S(22, 26, 'w dm'), S(32, 8, 'w dm'), S(42, 28, 'w dm'), S(49, 14, 'w dm')]
  };
    window.__tvMatchIcon = function(t) {
    var d = ICONS[t === 'other' ? 'handicap' : t] || ICONS.single;
    return '<div class="tv-mi">' + d.map(function(x) { return '<i class="' + x.c + '" style="' + x.s + '"></i>'; }).join('') + '</div>';
    };
  }
})();
(function(){
  // Shared match rows (Top Rated page and the Eras page's Top Rated section): window.__tvTopRows(eraNumber, count)
  // returns { html, total } for that era's best-rated matches from assets/top_matches.json. No requests are made.
  if (window.__tvTopRows) return;
  var css = document.createElement('style');
  css.textContent = [
      '#tv-tp .tp-rows, #tv-era .tp-rows{display:flex;flex-direction:column;gap:8px;margin-top:14px;}',,
      '#tv-tp .tp-row, #tv-era .tp-row{display:flex;align-items:center;gap:18px;height:66px;padding:0 18px;background:#161F2A;border:2px solid #2A323C;border-radius:8px;color:#fff !important;cursor:default;}',,
      '#tv-tp .tp-row.tp-lk, #tv-era .tp-row.tp-lk{cursor:pointer;}',,
      '#tv-tp .tp-watch, #tv-era .tp-watch{flex:none;display:flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 22px;border-radius:8px;background:#FFB347;color:#1A1A1A;font-size:15px;font-weight:800;letter-spacing:1px;white-space:nowrap;}',,
      '#tv-tp .tp-watch i, #tv-era .tp-watch i{width:0;height:0;border-left:11px solid #1A1A1A;border-top:7px solid transparent;border-bottom:7px solid transparent;}',,
      '#tv-tp .tp-row:focus, #tv-era .tp-row:focus{background:#172029;border-color:#F4C242;}',,
      '#tv-tp .tp-rk, #tv-era .tp-rk{flex:0 0 44px;font-size:26px;font-weight:900;color:#F4C242;text-align:center;}',,
      '#tv-tp .tp-sm, #tv-era .tp-sm{display:inline-block;flex:none;position:relative;font-size:22px;letter-spacing:2px;line-height:1;color:#3B4656;white-space:nowrap;}',,
      '#tv-tp .tp-sm b, #tv-era .tp-sm b{position:absolute;left:0;top:0;overflow:hidden;color:#F4C242;font-weight:400;}',,
      '#tv-tp .tp-mt, #tv-era .tp-mt{flex:1 1 0;min-width:0;}',,
      '#tv-tp .tp-mt .a, #tv-era .tp-mt .a{font-size:19px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',,
      '#tv-tp .tp-mt .b, #tv-era .tp-mt .b{font-size:13px;font-weight:600;color:#9AA6B4;margin-top:2px;}',,
      '#tv-tp .tp-bd, #tv-era .tp-bd{flex:none;height:24px;padding:0 10px;border-radius:4px;background:#FFB347;color:#1A1A1A;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;white-space:nowrap;}',,
      '#tv-tp .tp-sc, #tv-era .tp-sc{flex:0 0 74px;font-size:24px;font-weight:900;color:#fff;text-align:right;}',
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function T(en, ja) { return document.cookie.indexOf('googtrans=/ja/ja') !== -1 ? ja : en; }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtD(iso) { var a = String(iso).split('-'); return (+a[2]) + ' ' + MONTHS[+a[1] - 1] + ' ' + a[0]; }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  var NOTE = { twelve: '6 v 6', ten: '5 v 5', 'handicap 32v1 gauntlet': 'Handicap 32v1', 'Career Vs Career': 'Career vs Career', 'Hair Vs Hair': 'Hair vs Hair', 'Knockout Or Submission Only': 'KO or submission only', 'No Disqualification': 'No DQ', 'Loser Leaves': 'Loser leaves', 'No Time Limit': 'No time limit' };
  var TNAME = null;
  function names(s) {
    if (s.length >= 5) return s.slice(0, 3).join(', ') + ' +' + (s.length - 3);
    if (s.length === 1) return s[0];
    return s.slice(0, -1).join(', ') + ' & ' + s[s.length - 1];
  }
  window.__tvTopRow = function(i, m) {
    if (!TNAME) {
      TNAME = { other: 'Handicap match' };
      try { (JSON.parse(window.AndroidHost.matchTypesJson()).groups || []).forEach(function(g) { (g.items || []).forEach(function(x) { TNAME[x.id] = x.name; }); }); } catch (e) {}
    }
    var lk = !!m.u, note = NOTE[m.n] || m.n || '';
    var h = '<' + (lk ? 'a href="' + esc(absUrl(m.u)) + '" tabindex="0"' : 'div') + ' class="tp-row' + (lk ? ' tp-lk' : '') + '" data-id="' + esc(m.id) + '">';
    h += '<div class="tp-rk notranslate" translate="no">' + i + '</div>';
    h += '<div class="tp-sm"><span>★★★★★</span><b style="width:' + (m.r * 10).toFixed(1) + '%">★★★★★</b></div>';
    h += window.__tvMatchIcon(m.t);
    h += '<div class="tp-mt"><div class="a notranslate" translate="no">' + esc(m.s.map(names).join(' vs ')) + '</div><div class="b">' + esc(TNAME[m.t] || m.t) + ' · ' + esc(fmtD(m.d)) + ' · ' + m.v + ' ' + esc(T('votes', '票')) + '</div></div>';
    if (note) h += '<div class="tp-bd">' + esc(note) + '</div>';
    if (lk) h += '<div class="tp-watch"><i></i>' + esc(T('WATCH', '視聴')) + '</div>';
    h += '<div class="tp-sc notranslate" translate="no">' + m.r.toFixed(2) + '</div></' + (lk ? 'a' : 'div') + '>';
    return h;
  };
  window.__tvTopRows = function(era, count) {
    var D = null;
    try { D = JSON.parse(window.AndroidHost.topMatchesJson()); } catch (e) { D = null; }
    if (!D || !D.matches) return null;
    var list = D.matches.filter(function(m) { return m.e === era; });
    if (!list.length) return null;
    var h = '<div class="tp-rows">' + list.slice(0, count).map(function(m, k) { return window.__tvTopRow(k + 1, m); }).join('') + '</div>';
    return { html: h, total: list.length };
  };
})();
(function(){
  // Top Rated Matches page: /mypage?tvtop=overall | era (&e=<1-5>) | type (&t=<match type id>).
  // Stardom matches rated 8.50+ with 25+ votes on Cagematch, from assets/top_matches.json. Opening the page makes no
  // request. A match with a confirmed video address ("u") is a link with a thumbnail and a WATCH NOW strip; one
  // without stays text only. Colours, sizes and focus follow docs/DESIGN.md (single gold focus, orange selected fill).
  if (window.__tvTop) return;
  var Q = null;
  try { if (location.pathname === '/mypage') Q = new URLSearchParams(location.search); } catch (e) { Q = null; }
  if (!Q || !Q.get('tvtop')) return;
  var H = window.AndroidHost || {};
  var D = null, MT = null, ER = null;
  try { D = JSON.parse(H.topMatchesJson()); } catch (e) { D = null; }
  try { MT = JSON.parse(H.matchTypesJson()); } catch (e) { MT = null; }
  try { ER = JSON.parse(H.erasJson()).eras; } catch (e) { ER = null; }
  if (!D || !D.matches || !MT || !ER) return;
  window.__tvTop = true;

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtD(iso) { var a = String(iso).split('-'); return (+a[2]) + ' ' + MONTHS[+a[1] - 1] + ' ' + a[0]; }

  var NOTE = { twelve: '6 v 6', ten: '5 v 5', 'handicap 32v1 gauntlet': 'Handicap 32v1', 'Career Vs Career': 'Career vs Career', 'Hair Vs Hair': 'Hair vs Hair', 'Knockout Or Submission Only': 'KO or submission only', 'No Disqualification': 'No DQ', 'Loser Leaves': 'Loser leaves', 'No Time Limit': 'No time limit' };
  var TNAME = { other: 'Handicap match' };
  var GROUPS = MT.groups || [];
  GROUPS.forEach(function(g) { (g.items || []).forEach(function(x) { TNAME[x.id] = x.name; }); });

  // ---- data
  var M = D.matches.slice();
  var tcount = {}, ecount = {};
  M.forEach(function(m) { tcount[m.t] = (tcount[m.t] || 0) + 1; ecount[m.e] = (ecount[m.e] || 0) + 1; });
  function names(s) {
    if (s.length >= 5) return s.slice(0, 3).join(', ') + ' +' + (s.length - 3);
    if (s.length === 1) return s[0];
    return s.slice(0, -1).join(', ') + ' & ' + s[s.length - 1];
  }
  function title(m) { return m.s.map(names).join(' vs '); }
  function eraOf(n) { var r = null; ER.forEach(function(x) { if (x.n === n) r = x; }); return r; }
  function typeGroupOf(id) { var r = null; GROUPS.forEach(function(g) { (g.items || []).forEach(function(x) { if (x.id === id) r = g; }); }); return r; }
  function gcount(g) { var n = 0; (g.items || []).forEach(function(x) { n += tcount[x.id] || 0; }); return n; }

  // ---- state from the address
  var scope = Q.get('tvtop') === 'era' ? 1 : Q.get('tvtop') === 'type' ? 2 : 0;
  var curEra = parseInt(Q.get('e'), 10) || 5;
  var curType = Q.get('t') || 'single';
  var curGroup = (typeGroupOf(curType) || GROUPS[0] || {}).name;

  var css = document.createElement('style');
  css.textContent = [
    '#tv-tp{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B1118;color:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-tp, #tv-tp *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;box-sizing:border-box;}',
    '#tv-tp a, #tv-tp a *{opacity:1 !important;filter:none !important;text-decoration:none !important;}',
    '#tv-tp *:focus{outline:none !important;box-shadow:none !important;transform:none !important;}',
    '#tv-tp-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:24px 40px 60px 40px;scrollbar-width:none;scroll-padding-bottom:40px;}',
    '#tv-tp-scroll::-webkit-scrollbar{display:none;}',
    '#tv-tp .tp-head{display:flex;align-items:flex-start;gap:14px;}',
    '#tv-tp .tp-bar{flex:0 0 auto;width:10px;height:36px;background:#F4C242;border-radius:0;margin-top:2px;}',
    '#tv-tp .tp-h1{font-size:30px;font-weight:900;line-height:1.2;}',
    '#tv-tp .tp-note{font-size:13px;font-weight:600;color:#9AA6B4;line-height:1.5;margin-top:2px;}',
    '#tv-tp .tp-instr{margin-left:auto;font-size:15px;font-weight:600;color:#9AA6B4;padding-top:6px;text-align:right;}',
    '#tv-tp .tp-chips{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}',
    '#tv-tp .tp-chip{display:flex;align-items:center;height:44px;padding:0 20px;border-radius:20px;border:3px solid #2A323C;background:#161F2A;font-size:16px;font-weight:700;color:#C9D2DC !important;white-space:nowrap;cursor:pointer;}',
    '#tv-tp .tp-chip small{font-size:12px;font-weight:700;margin-left:8px;color:#9AA6B4;}',
    '#tv-tp .tp-chip.tp-on{background:#FFB347;border-color:#FFB347;color:#1A1A1A !important;}',
    '#tv-tp .tp-chip.tp-on small{color:#1A1A1A;}',
    '#tv-tp .tp-chip.tp-dim{opacity:.45 !important;}',
    '#tv-tp .tp-chip:focus{border-color:#F4C242;}',
    '#tv-tp .tp-chip.tp-ci{height:56px;padding:0 18px 0 6px;gap:10px;}',
    '#tv-tp .tp-chip.tp-ci .tp-pl{background:#0F151C;border-radius:8px;width:62px;height:44px;display:flex;align-items:center;justify-content:center;}',
    '#tv-tp .tp-chip.tp-ci .tv-mi{transform:scale(.9);}',
    '#tv-tp .tp-pn{background:#0F151C;border:2px solid #2A323C;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;margin-top:14px;}',
    '#tv-tp .tp-sec{display:flex;align-items:center;gap:10px;}',
    '#tv-tp .tp-sec i{width:8px;height:26px;background:#F4C242;border-radius:0;}',
    '#tv-tp .tp-sec b{font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '#tv-tp .tp-erow{display:flex;gap:10px;}',
    '#tv-tp .tp-era{flex:1 1 0;min-width:0;padding:10px 14px;background:#161F2A;border:2px solid #2A323C;border-radius:8px;display:flex;gap:12px;align-items:center;cursor:pointer;color:#fff !important;}',
    '#tv-tp .tp-era .k{font-size:28px;font-weight:900;color:#F4C242;flex:0 0 36px;text-align:center;line-height:1;}',
    '#tv-tp .tp-era .n{font-size:14px;font-weight:800;line-height:1.15;color:#fff;}',
    '#tv-tp .tp-era .y{font-size:12px;font-weight:600;color:#9AA6B4;margin-top:2px;}',
    '#tv-tp .tp-era .c{font-size:12px;font-weight:700;color:#F4C242;margin-top:2px;}',
    '#tv-tp .tp-era.tp-on{background:#FFB347;border-color:#FFB347;}',
    '#tv-tp .tp-era.tp-on .k, #tv-tp .tp-era.tp-on .n, #tv-tp .tp-era.tp-on .y, #tv-tp .tp-era.tp-on .c{color:#1A1A1A;}',
    '#tv-tp .tp-era:focus{border-color:#F4C242;}',
    '#tv-tp .tp-era.tp-on:focus{border-color:#F4C242;}',
    '#tv-tp .tp-more{font-size:13px;font-weight:700;color:#9AA6B4;text-align:right;padding:2px 6px;margin-top:10px;}',
    '#tv-tp .tp-empty{border:2px dashed #3B4656;border-radius:12px;padding:30px 24px;text-align:center;color:#9AA6B4;font-size:15px;font-weight:600;line-height:1.5;margin-top:14px;}',
    '#tv-tp .tp-empty b{display:block;color:#fff;font-size:20px;font-weight:700;margin-bottom:6px;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  var root = document.createElement('div');
  root.id = 'tv-tp';
  root.innerHTML = '<div id="tv-tp-scroll"></div>';
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';
  var scroller = root.firstChild;

  // ---- pieces
  function chip(label, count, on, dim, attrs, extra) {
    return '<a class="tp-chip' + (extra || '') + (on ? ' tp-on' : '') + (dim ? ' tp-dim' : '') + '" tabindex="0" ' + attrs + '>' + label + (count != null ? '<small>' + count + '</small>' : '') + '</a>';
  }
  function row(i, m) { return window.__tvTopRow(i, m); }
  var SHOW = 1000;   // every match is listed; the page scrolls
  function render(focusSel) {
    var list, sub = '';
    if (scope === 0) list = M;
    else if (scope === 1) list = M.filter(function(m) { return m.e === curEra; });
    else list = M.filter(function(m) { return m.t === curType; });
    var scopes = [T('Overall', '総合'), T('By era', '時代別'), T('By match type', '試合形式別')];
    var h = '<div class="tp-head"><div class="tp-bar"></div><div><div class="tp-h1">' + esc(T('Top Rated Matches', '高評価の試合')) + '</div>' +
      '<div class="tp-note">' + esc(T('Fan voted ratings from Cagematch.net, as of November 2026', 'Cagematch.netのファン投票による評価（2026年11月時点）')) + '</div></div>' +
      '<div class="tp-instr">' + esc(T('Select a match to play it. Matches without a video are text only.', '試合を選ぶと再生します。動画のない試合は文字のみです。')) + '</div></div>';
    h += '<div class="tp-chips">' + scopes.map(function(s, k) { return chip(esc(s), null, k === scope, false, 'data-scope="' + k + '"'); }).join('') + '</div>';
    if (scope === 1) {
      h += '<div class="tp-pn"><div class="tp-sec"><i></i><b>' + esc(T('ERA', '時代')) + '</b></div><div class="tp-erow">' + ER.slice().reverse().map(function(e) {
        return '<a class="tp-era' + (e.n === curEra ? ' tp-on' : '') + '" tabindex="0" data-era="' + e.n + '"><div class="k notranslate" translate="no">' + esc(e.kanji) + '</div><div><div class="n">' + esc(e.name) + '</div><div class="y">' + esc(e.years) + '</div><div class="c">' + (ecount[e.n] || 0) + ' ' + esc(T('matches', '試合')) + '</div></div></a>';
      }).join('') + '</div></div>';
    } else if (scope === 2) {
      var g = null; GROUPS.forEach(function(x) { if (x.name === curGroup) g = x; });
      g = g || GROUPS[0];
      h += '<div class="tp-pn"><div class="tp-sec"><i></i><b>' + esc(T('MATCH TYPE', '試合形式')) + '</b></div><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        GROUPS.map(function(x) { return chip(esc(isJa() && x.ja ? x.ja : x.name), gcount(x), x.name === g.name, !gcount(x), 'data-group="' + esc(x.name) + '"'); }).join('') +
        '</div><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (g.items || []).map(function(x) { return chip('<div class="tp-pl">' + window.__tvMatchIcon(x.id) + '</div>' + esc(isJa() && x.ja ? x.ja : x.name), tcount[x.id] || 0, x.id === curType, !(tcount[x.id] || 0), 'data-type="' + esc(x.id) + '"', ' tp-ci'); }).join('') + '</div></div>';
    }
    if (!list.length) {
      h += '<div class="tp-empty"><b>' + esc(T('No rated matches yet', 'まだ高評価の試合はありません')) + '</b>' + esc(T('Matches appear here once one is rated 8.50 or higher with 25 votes on Cagematch.', 'Cagematchで8.50以上・25票以上の試合がここに表示されます。')) + '</div>';
    } else {
      h += '<div class="tp-rows">' + list.slice(0, SHOW).map(function(m, k) { return row(k + 1, m); }).join('') + '</div>';
      if (list.length > SHOW) h += '<div class="tp-more">' + SHOW + ' ' + esc(T('of', '/')) + ' ' + list.length + ' ' + esc(T('shown', '件表示')) + '</div>';
    }
    scroller.innerHTML = h;
    var f = focusSel ? scroller.querySelector(focusSel) : null;
    if (!f) f = scroller.querySelector('.tp-row[tabindex]') || scroller.querySelector('.tp-chip');
    focusEl(f);
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }

  // ---- choosing: scope chips, era tiles, type chips, rows
  function choose(el) {
    if (el.getAttribute('data-scope') != null) { scope = +el.getAttribute('data-scope'); render('[data-scope="' + scope + '"]'); return true; }
    if (el.getAttribute('data-era') != null) { curEra = +el.getAttribute('data-era'); render('[data-era="' + curEra + '"]'); return true; }
    if (el.getAttribute('data-group') != null) {
      curGroup = el.getAttribute('data-group');
      var g = null; GROUPS.forEach(function(x) { if (x.name === curGroup) g = x; });
      if (g && g.items && g.items.length && !g.items.some(function(x) { return x.id === curType; })) curType = g.items[0].id;
      render('[data-group="' + curGroup.replace(/"/g, '\\"') + '"]'); return true;
    }
    if (el.getAttribute('data-type') != null) { curType = el.getAttribute('data-type'); render('[data-type="' + curType + '"]'); return true; }
    return false;
  }
  scroller.addEventListener('click', function(e) {
    var el = e.target.closest ? e.target.closest('[tabindex]') : null;
    if (el && choose(el)) { e.preventDefault(); }
  });

  // ---- remote: Up/Down move through the rows and the chip rows, Left/Right along a row of chips, Left at the edge opens the menu
  function focusables() { return Array.prototype.slice.call(scroller.querySelectorAll('[tabindex="0"]')); }
  function rowOf(el) { return el.classList.contains('tp-row') ? el : el.parentNode; }
  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-tp') || menuOpen() || document.getElementById('tv-fp-pop')) return;   // the video options pop-up has its own keys
    var k = e.keyCode, ae = document.activeElement, list = focusables();
    var stop = function() { e.preventDefault(); e.stopImmediatePropagation(); };
    if (k === 13 || k === 23) {
      if (ae && ae.getAttribute && scroller.contains(ae)) {
        if (choose(ae)) { stop(); return; }
      }
      return;
    }
    if (k !== 37 && k !== 38 && k !== 39 && k !== 40) return;
    var idx = list.indexOf(ae);
    if (idx < 0) { if (list.length) { stop(); focusEl(list[0]); } else if (k === 37) { stop(); if (window.__tvOpenMenu) window.__tvOpenMenu(); } return; }
    stop();
    var lines = [];
    list.forEach(function(x) { var r = rowOf(x), l = lines.length ? lines[lines.length - 1] : null; if (l && l.r === r) l.els.push(x); else lines.push({ r: r, els: [x] }); });
    var li = 0; lines.forEach(function(l, n) { if (l.els.indexOf(ae) >= 0) li = n; });
    var same = lines[li].els, si = same.indexOf(ae);
    if (k === 37) { if (si > 0) focusEl(same[si - 1]); else if (window.__tvOpenMenu) window.__tvOpenMenu(); }
    else if (k === 39) { if (si < same.length - 1) focusEl(same[si + 1]); }
    else {
      var nl = lines[li + (k === 38 ? -1 : 1)];
      if (nl) { var tg = nl.els[Math.min(si, nl.els.length - 1)]; focusEl(tg); if (tg.classList.contains('tp-row')) { try { tg.scrollIntoView({ block: 'center' }); } catch (e) {} } }
      else if (k === 38) scroller.scrollTop = 0;
      else if (scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 4) scroller.scrollTop += 240;   // text-only rows below: scroll to read them
    }
  }, true);

  render(null);
  if (scope === 1) focusEl(scroller.querySelector('[data-era="' + curEra + '"]'));
})();
