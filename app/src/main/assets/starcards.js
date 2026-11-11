(function(){
  // Normal pages keep their own cards (2.55.1). This draws the StarScope button and its results page only.
  // StarScope video cards (private builds, 2.55.0). A video you have logged shows who is in it instead of the site's generic
  // title: event, the wrestlers, then block, round, match number and date. It never shows the result. Other videos are left
  // alone. Reads one list from the private sheet at most every 30 minutes, and nothing from the video site.
  if (window.__tvStarCards) return;
  var H = window.AndroidHost;
  if (!H || !H.starCards || !H.videoIndexOn || !H.videoIndexOn()) return;
  window.__tvStarCards = true;
  var KEY = 'tvVixCardsV3', AGE = 1800000, map = null, ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && c.map) map = c.map; } catch (e) {}
  var st = document.createElement('style');
  st.textContent = [
    '.tvsc-host{display:block !important;-webkit-line-clamp:unset !important;overflow:visible !important;padding:11px 14px 13px !important;box-sizing:border-box;}',
    '.tvsc,.tvsc *{text-decoration:none !important;}',
    '.tvsc{font-family:Arial,Helvetica,sans-serif;color:#fff;font-weight:400;}',
    '.tvsc .ev{font-size:12px;font-weight:800;letter-spacing:1px;color:#F4C242;text-transform:uppercase;}',
    '.tvsc .nm{margin-top:7px;padding-bottom:8px;border-bottom:1px solid #2A323C;font-size:18px;font-weight:800;line-height:1.22;word-break:normal !important;overflow-wrap:break-word !important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;}',
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
  function block(v) {
    var sides = (ja && v.sj && v.sj.length === v.s.length ? v.sj : v.s), foot = (ja ? v.fj : v.f).slice();
    if (v.n !== '' && v.n != null) foot.push((ja ? '第' : 'Match ') + v.n + (v.t ? '/' + v.t : '') + (ja ? '試合' : ''));
    var lines, tn = ja ? (v.tnj || v.tn) : v.tn, big = sides.length > 2 || sides.some(function(s) { return s.length > 4; });
    if (!big) lines = sides.map(function(s, i) { return (i ? 'vs ' : '') + esc(names(s)); }).join('<br>');
    else {
      // Big matches (2.62.1): team or faction names when every side has one, otherwise the first wrestler of each side
      // and how many more, at most four sides then "+N more teams", so the names never run past three lines.
      var each = sides.map(function(s, i) { return tn && tn[i] ? tn[i] : (s.length > 1 ? s[0] + ' +' + (s.length - 1) : s[0]); });
      var shown = each.slice(0, 4), rest = each.length - shown.length;
      lines = esc(shown.join(tn || sides.every(function(s) { return s.length === 1; }) ? ' vs ' : ' · ')) + (rest ? ' · ' + esc(ja ? 'ほか' + rest + (sides.some(function(s) { return s.length > 1; }) ? 'チーム' : '人') : '+' + rest + ' more' + (sides.some(function(s) { return s.length > 1; }) ? ' teams' : '')) : '');
    }
    return '<div class="tvsc notranslate" translate="no"><div class="ev">' + esc(ja ? v.ej : v.e) + '</div><div class="nm">' + lines + '</div><div class="ft"><span>' + esc(foot.join(' · ')) + '</span><b>' + esc(dateText(v.d)) + '</b></div></div>';
  }
  // The logger's Card tab draws its preview with the same card (2.61.0).
  window.__tvStarCard = { html: block };

  // ---- the telescope button on wrestler and tag team pages, and its results
  var TEL = '<svg width="30" height="30" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="currentColor"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="currentColor"/><path d="M33 12.5H40V27.5H33Z" fill="currentColor"/><ellipse cx="40" cy="20" rx="4.5" ry="8.5" fill="#0B1118" stroke="currentColor" stroke-width="1.4"/></g><path fill="#F4C242" d="M50.5 -13Q50.5 -4.5 59 -4.5Q50.5 -4.5 50.5 4Q50.5 -4.5 42 -4.5Q50.5 -4.5 50.5 -13Z"/><path d="M23 25L14 45M25 25L34 45M24 25V44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_-]+/g, ''); }
  function hasKey(person, want) { return person[0].some(function(k) { return want.indexOf(k) >= 0; }); }
  // Only videos the site's search would miss: the wrestler (or, for a team, either partner) is not named in the video's text.
  function results(kind, a, b) {
    if (!map) return [];
    var out = [];
    Object.keys(map).forEach(function(id) {
      var v = map[id], sides = v.p || [], hit = false;
      if (kind === 'w') {
        var want = [norm(a), norm(b)];
        sides.forEach(function(s) { s.forEach(function(p) { if (p[1] && hasKey(p, want)) hit = true; }); });
      } else {
        var one = [norm(a)], two = [norm(b)];
        sides.forEach(function(s) {
          var x = s.filter(function(p) { return hasKey(p, one); })[0], y = s.filter(function(p) { return hasKey(p, two); })[0];
          if (x && y && (x[1] || y[1])) hit = true;
        });
      }
      if (hit) out.push({ id: id, v: v });
    });
    return out.sort(function(x, y) { return String(y.v.d).localeCompare(String(x.v.d)); });
  }
  function addButtons() {
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
  var Q = null;
  try { Q = new URLSearchParams(location.search); } catch (e) {}
  var scopeKind = Q && location.pathname === '/mypage' ? Q.get('tvscope') : null, scopeDone = false;
  function renderScope() {
    if (scopeDone || !map || !document.body) return;
    scopeDone = true;
    var a = Q.get('a') || '', b = Q.get('b') || '', list = results(scopeKind, a, b);
    var head = scopeKind === 't' ? a + ' & ' + b : a;
    var d = document.createElement('div');
    d.id = 'tvsp'; d.className = 'notranslate'; d.setAttribute('translate', 'no');
    var h = '<style>#tvsp{position:fixed;inset:0;z-index:99000;background:#0B1118;overflow:auto;box-sizing:border-box;padding:28px 40px;font-family:Arial,Helvetica,sans-serif;color:#fff}#tvsp .hd{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:900;margin-bottom:20px}#tvsp .gr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;align-items:stretch}#tvsp a.c{display:block;background:#1a1a1a;border-radius:8px;overflow:hidden;text-decoration:none;outline:none}#tvsp a.c:focus{outline:3px solid #F4C242;outline-offset:2px;box-shadow:0 0 16px rgba(244,194,66,.8)}#tvsp .im{aspect-ratio:16/9;background:#172029 center/cover no-repeat}</style>';
    h += '<div class="hd">' + TEL + esc(head) + '</div><div class="gr">';
    list.forEach(function(x) { h += '<a class="c" tabindex="0" href="/contents/' + esc(x.id) + '"><div class="im" style="background-image:url(\'' + esc(x.v.th || '') + '\')"></div><div class="tvsc-host">' + block(x.v) + '</div></a>'; });
    d.innerHTML = h + '</div>';
    document.body.appendChild(d);
    var first = d.querySelector('a.c'); if (first) first.focus();
    window.addEventListener('keydown', function(e) {
      if (e.defaultPrevented || document.documentElement.classList.contains('tv-sm-open') || document.getElementById('tv-fp-pop')) return;   // the menu and the video options pop-up handle their own keys
      var c = e.keyCode, step = { 37: -1, 39: 1, 38: -4, 40: 4 }[c], all = Array.prototype.slice.call(d.querySelectorAll('a.c')), i = all.indexOf(document.activeElement);
      if (c === 13 || c === 23) { if (i >= 0) { e.preventDefault(); e.stopImmediatePropagation(); location.href = all[i].href; } return; }
      if (!step) return;
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
  var HT = ja ? { tag: '世界中のスターを地図に', recent: '新着', top: '高評価', all: 'すべての試合', matches: '試合', wrestlers: '選手', all0: 'すべて', singles: 'シングル', tagm: 'タッグ', multi: '3チーム以上', title: 'タイトルマッチ', tour: 'トーナメント', more: '詳細', w: '選手', g: 'チーム・ユニット', y: '年', c: 'トーナメント', ti: 'タイトル', r: '評価', sort: '並び順', any: 'すべて', sDate: '新しい順', sOld: '古い順', sAdded: '追加順', sTop: '高評価順', none: '該当する試合はありません', noneTop: 'まだ評価された試合はありません', newest: '新しい順', close: '閉じる' }
    : { tag: 'Map all the Stars in the World', recent: 'Recently added', top: 'Top rated', all: 'All matches', matches: 'matches', wrestlers: 'wrestlers', all0: 'All', singles: 'Singles', tagm: 'Tag', multi: 'Multi-team', title: 'Title matches', tour: 'Tournaments', more: 'More', w: 'Wrestler', g: 'Team or faction', y: 'Year', c: 'Tournament', ti: 'Title', r: 'Rating', sort: 'Sort', any: 'Any', sDate: 'Newest', sOld: 'Oldest', sAdded: 'Recently added', sTop: 'Top rated', none: 'No matches fit these filters.', noneTop: 'No rated matches yet.', newest: 'newest first', close: 'Close' };
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
    return '<a class="hc" data-f="1" data-k="v' + esc(x.id) + '" href="/contents/' + esc(x.id) + '"><div class="im" style="' + (th ? 'background-image:url(\'' + th + '\')' : '') + '"></div>' +
      (badge && X.rc ? '<span class="bd">★ ' + X.r.toFixed(1) + ' · ' + X.rc + '</span>' : '') + '<div class="tvsc-host">' + block(x.v) + '</div></a>';
  }
  function chipH(k, label, on, extra) { return '<button type="button" class="ch' + (on ? ' on' : '') + '" data-f="1" data-k="' + k + '"' + (extra || '') + '>' + label + '</button>'; }
  function homeHtml() {
    var list = homeList(), f = home.f, t = home.tab, ppl = {};
    list.forEach(function(x) { people(x.v).forEach(function(n) { ppl[n] = 1; }); });
    var h = '<div class="hd"><span class="bar"></span>' + TEL.replace('width="30" height="30"', 'width="40" height="40"') + '<span class="wm">STAR<b>SCOPE</b></span><span class="tg">' + HT.tag + '</span><span class="ct">' + list.length + ' ' + HT.matches + ' · ' + Object.keys(ppl).length + ' ' + HT.wrestlers + '</span></div>';
    h += '<div class="row">' + chipH('Trecent', HT.recent, t === 'recent', ' style="border-radius:22px"') + chipH('Ttop', HT.top, t === 'top', ' style="border-radius:22px"') + chipH('Tall', HT.all, t === 'all', ' style="border-radius:22px"') + '</div>';
    var shown;
    if (t === 'all') {
      var prim = [['', HT.all0], ['singles', HT.singles], ['tag', HT.tagm], ['multi', HT.multi], ['title', HT.title], ['tour', HT.tour]].filter(function(p) {
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
  function popHtml(list) {
    var key = home.pop, f = home.f, opts;
    if (key === 'sort') opts = [['date', HT.sDate], ['old', HT.sOld], ['added', HT.sAdded], ['top', HT.sTop]].map(function(o) { return { v: o[0], label: o[1] }; });
    else opts = [{ v: '', label: HT.any }].concat(options(key, list, f).map(function(o) { return { v: o.v, label: (key === 'r' ? '★' + o.v + '+' : o.v) + ' · ' + o.n }; }));
    var cur = key === 'sort' ? (f.sort || 'date') : (f[key] || '');
    return '<div class="ov"><div class="pp"><div class="ph">' + (HT[key] || HT.sort) + '</div><div class="pg">' + opts.map(function(o, i) {
      return chipH('o' + i, esc(o.label), String(o.v) === String(cur), ' data-v="' + esc(o.v) + '"');
    }).join('') + '</div></div></div>';
  }
  var HCSS = '#tvsh{position:fixed;inset:0;z-index:99000;background:#0B1118;overflow:auto;box-sizing:border-box;padding:26px 40px 40px;font-family:Arial,Helvetica,sans-serif;color:#fff}' +
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
    '#tvsh .ph{font:800 15px Arial;letter-spacing:.14em;color:#F4C242;margin-bottom:12px;text-transform:uppercase}#tvsh .pg{display:flex;flex-wrap:wrap;gap:8px}';
  var homeEl = null, prevClose = null;
  function homeRender(keep) {
    if (!homeEl) {
      homeEl = document.createElement('div'); homeEl.id = 'tvsh'; homeEl.className = 'notranslate'; homeEl.setAttribute('translate', 'no');
      var st = document.createElement('style'); st.textContent = HCSS; document.head.appendChild(st);
      document.body.appendChild(homeEl);
      window.addEventListener('keydown', homeKey, true);
    }
    homeEl.innerHTML = homeHtml();
    var el = homeEl.querySelector('[data-k="' + (keep || '') + '"]') || (home.pop ? homeEl.querySelector('.pp .ch.on') || homeEl.querySelector('.pp .ch') : homeEl.querySelector('.ch.on'));
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
    try { history.replaceState(null, '', '/mypage?tvscope=' + home.tab); } catch (e) {}
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
    if (k.charAt(0) === 'v') { location.href = el.getAttribute('href'); return; }
    if ((m = /^T(\w+)$/.exec(k))) { home.tab = m[1]; homeRender(k); return; }
    if ((m = /^k:(.*)$/.exec(k))) { home.f.k = m[1]; homeRender(k); return; }
    if (k === 'more') { home.more = !home.more; homeRender(k); return; }
    if ((m = /^d:(\w+)$/.exec(k))) { openPop(m[1]); return; }
    if (/^o\d+$/.test(k)) {
      var v = el.getAttribute('data-v'), key = home.pop;
      if (key === 'sort') home.f.sort = v; else home.f[key] = key === 'r' ? (+v || 0) : v;
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
    home = { tab: scopeKind, f: { k: '', w: '', g: '', y: '', c: '', ti: '', r: 0, sort: 'date' }, more: false, pop: null };
    homeRender('T' + scopeKind);
  }
  // For the Community menu: the newest StarScope matches, drawn as the same cards.
  window.__tvScope = {
    newest: function(n) { return homeList().sort(sorter('added')).slice(0, n || 3); },
    card: function(x) { return block(x.v); }
  };

  function apply() { if (!map) return; if (scopeKind === 'recent' || scopeKind === 'top' || scopeKind === 'all') renderHome(); else if (scopeKind) renderScope(); else addButtons(); }
  var timer = 0;
  function soon() { if (timer) return; timer = setTimeout(function() { timer = 0; apply(); }, 350); }   // not a debounce: a page that keeps changing must still get its button
  window.__tvStarCardsReply = function(id, text) {
    var r; try { r = JSON.parse(text); } catch (e) { return; }
    if (!r || !r.ok || !r.map) return;
    map = r.map;
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), map: map })); } catch (e) {}
    soon();
  };
  var fresh = 0;
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}, ids = Object.keys(saved.map || {}); if (ids.length && saved.map[ids[0]].x) fresh = saved.t || 0; } catch (e) {}   // a list without the wrestler data is never kept
  if (Date.now() - fresh > AGE) { try { H.starCards('c1', JSON.stringify({ action: 'vi_cards' })); } catch (e) {} }
  function start() { soon(); new MutationObserver(soon).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
