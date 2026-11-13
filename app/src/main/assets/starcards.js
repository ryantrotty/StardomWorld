(function(){
  // Normal pages keep their own cards (2.55.1). This draws the StarScope button and its results page only.
  // StarScope video cards (private builds, 2.55.0). A video you have logged shows who is in it instead of the site's generic
  // title: event, the wrestlers, then block, round, match number and date. It never shows the result. Other videos are left
  // alone. Reads one list from the private sheet at most every 30 minutes, and nothing from the video site.
  if (window.__tvStarCards) return;
  var H = window.AndroidHost;
  if (!H || !H.starCards || !H.videoIndexOn || !H.videoIndexOn()) return;
  window.__tvStarCards = true;
  var KEY = 'tvVixCardsV4', AGE = 1800000, map = null, ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
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
  var HT = ja ? { tag: '世界中のスターを地図に', recent: '新着', top: '高評価', all: 'すべての試合', matches: '試合', wrestlers: '選手', all0: 'すべて', singles: 'シングル', tagm: 'タッグ', multi: '3チーム以上', title: 'タイトルマッチ', tour: 'トーナメント', more: '詳細', w: '選手', g: 'チーム・ユニット', y: '年', c: 'トーナメント', ti: 'タイトル', r: '評価', sort: '並び順', any: 'すべて', sDate: '新しい順', sOld: '古い順', sAdded: '追加順', sTop: '高評価順', none: '該当する試合はありません', noneTop: 'まだ評価された試合はありません', newest: '新しい順', close: '閉じる', shows: '大会', showsN: '大会', latest: '全試合登録済み · 最新', alsoOn: 'ほかの試合', main: 'メインイベント', notMain: 'メインイベント未登録', noSize: '試合数未登録', logged: '試合登録済み', moreN: 'ほか', opener: '第1試合', sy: '年', sv: '会場', sc: '全試合登録済みのみ', ss: '並び順', sMost: '登録数順', noShows: '該当する大会はありません', match: '第', of: '／全', unnum: '番号なし' }
    : { tag: 'Map all the Stars in the World', recent: 'Recently added', top: 'Top rated', all: 'All matches', matches: 'matches', wrestlers: 'wrestlers', all0: 'All', singles: 'Singles', tagm: 'Tag', multi: 'Multi-team', title: 'Title matches', tour: 'Tournaments', more: 'More', w: 'Wrestler', g: 'Team or faction', y: 'Year', c: 'Tournament', ti: 'Title', r: 'Rating', sort: 'Sort', any: 'Any', sDate: 'Newest', sOld: 'Oldest', sAdded: 'Recently added', sTop: 'Top rated', none: 'No matches fit these filters.', noneTop: 'No rated matches yet.', newest: 'newest first', close: 'Close', shows: 'Shows', showsN: 'shows', latest: 'Fully logged · Latest', alsoOn: 'Also on the card', main: 'Main event', notMain: 'main event not logged', noSize: 'card size not logged', logged: 'logged', moreN: 'more', opener: 'Opener', sy: 'Year', sv: 'Venue', sc: 'Complete only', ss: 'Sort', sMost: 'Most logged', noShows: 'No shows fit these filters.', match: 'Match ', of: ' of ', unnum: 'unnumbered' };
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
    var h = '<div class="hd"><span class="bar"></span>' + TEL.replace('width="30" height="30"', 'width="40" height="40"') + '<span class="wm">STAR<b>SCOPE</b></span><span class="tg">' + HT.tag + '</span><span class="ct">' + (t === 'shows' ? '' : list.length + ' ' + HT.matches + ' · ' + Object.keys(ppl).length + ' ' + HT.wrestlers) + '</span></div>';
    h += '<div class="row">' + chipH('Trecent', HT.recent, t === 'recent', ' style="border-radius:22px"') + chipH('Ttop', HT.top, t === 'top', ' style="border-radius:22px"') + chipH('Tall', HT.all, t === 'all', ' style="border-radius:22px"') + chipH('Tshows', HT.shows, t === 'shows', ' style="border-radius:22px"') + '</div>';
    if (t === 'shows') return h + showsHtml() + (home.pop ? popHtml(list) : '');
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
  // ---- Shows (2.66.0): every show with a logged match, as a poster card. The main event's picture, the date as a
  // stamp, the venue, the main event, up to three highlights (titles, finals and semis, special rules, tournament
  // matches, the opener) and the card as numbered squares. Built from the same one list; nothing more is fetched.
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function num(x) { if (x === '' || x == null) return null; var n = Number(x); return isFinite(n) ? n : null; }
  // The sheet keeps one name per show, often with a Japanese subtitle: in English the Japanese parts are left out.
  function showName(n) {
    n = String(n || '');
    if (ja) return n;
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
      var sid = String(x.v.sid || '');
      if (!sid) return;
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
      return { sid: sid, name: showName(v0.sh) || v0.sh || '', date: date, venue: (ja ? (v0.vnj || v0.vn) : v0.vn) || '', total: total,
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
  function pips(s) {
    if (s.total == null) return '';
    var h = '', from = s.hasDark ? 0 : 1, to = Math.min(s.total, 14);
    for (var i = from; i <= to; i++) {
      var on = i === 0 ? s.hasDark : !!s.nums[i], cls = i === s.mainN && s.isMain ? 'main' : (on ? 'on' : (i === s.total ? 'mainoff' : 'off'));
      h += '<span class="pip ' + cls + '">' + (i === 0 ? 'D' : i) + '</span>';
    }
    var unn = s.list.filter(function(x) { return num(x.v.n) == null; }).length;
    var tail = s.more ? '+' + s.more + ' ' + HT.moreN : (unn ? '+' + unn + ' ' + HT.unnum : '');
    return '<div class="pips">' + h + (tail ? '<span class="mo">' + esc(tail) + '</span>' : '') + '</div>';
  }
  function hlRow(o) {
    var v = o.x.v, k = o.sc === 5 ? HT.opener + ' · ' + (ja ? v.ej : v.e) : eventLine(v);
    return '<div class="hl">' + ico(o.icon, 16) + '<div><div class="k">' + esc(k) + '</div><div class="n">' + esc(oneLine(v)) + '</div></div></div>';
  }
  var TEL18 = TEL.replace('width="30" height="30"', 'width="18" height="18"');
  // OK on a show opens its first logged match, so the show plays in card order from there.
  function showCard(s) {
    var th = esc(s.top.v.th || ''), v = s.top.v;
    return '<a class="sc" data-f="1" data-k="v' + esc(s.first.id) + '" href="/contents/' + esc(s.first.id) + '"><div class="im" style="' + (th ? 'background-image:url(\'' + th + '\')' : '') + '">' + stamp(s.date) +
      '<span class="cn' + (s.complete ? '' : ' part') + '">' + TEL18 + esc(countText(s)) + '</span></div>' +
      '<div class="bd"><div><div class="nm">' + esc(s.name) + '</div>' + (s.venue ? '<div class="vn">' + ico('pin', 14, '#C9D2DC') + esc(s.venue) + '</div>' : '') + '</div>' +
      '<div class="me"><div class="eb' + (s.isMain ? '' : ' dim') + '">' + esc(mainLabel(s)) + '</div><div class="t">' + esc(oneLine(v)) + '</div><div class="s">' + esc(eventLine(v)) + '</div></div>' +
      (s.hl.length ? '<div class="lb">' + HT.alsoOn + '</div>' + s.hl.map(hlRow).join('') : '') + pips(s) + '</div></a>';
  }
  // The latest fully logged show, wide: its picture on the left, the whole running order on the right.
  function featured(s) {
    var th = esc(s.top.v.th || ''), rows = '';
    var ns = Object.keys(s.nums).map(Number).sort(function(a, b) { return a - b; });
    ns.slice(-11).forEach(function(n) {
      var v = s.nums[n].v, main = n === s.mainN && s.isMain;
      rows += '<div class="ro' + (main ? ' mn' : '') + '"><span class="no">' + n + '</span><span class="ev">' + esc(main ? HT.main : eventLine(v)) + '</span><span class="rn">' + esc(oneLine(v)) + '</span></div>';
    });
    return '<div class="fe"><div class="lb fl">' + HT.latest + '</div><a class="fc" data-f="1" data-k="v' + esc(s.first.id) + '" href="/contents/' + esc(s.first.id) + '"><div class="im" style="' + (th ? 'background-image:url(\'' + th + '\')' : '') + '">' + stamp(s.date) +
      '<span class="cn">' + TEL18 + esc(countText(s)) + '</span></div><div class="bd"><div class="nm">' + esc(s.name) + '</div>' +
      (s.venue ? '<div class="vn">' + ico('pin', 14, '#C9D2DC') + esc(s.venue) + '</div>' : '') + '<div class="rl">' + rows + '</div></div></a></div>';
  }
  function showsHtml() {
    var f = home.f, all = showsList();
    var shown = all.filter(function(s) {
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
    h += '<div class="sgr">' + shown.filter(function(s) { return s !== feat; }).map(showCard).join('') + '</div>';
    return h;
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
    else if (key === 'sort') opts = [['date', HT.sDate], ['old', HT.sOld], ['added', HT.sAdded], ['top', HT.sTop]].map(function(o) { return { v: o[0], label: o[1] }; });
    else opts = [{ v: '', label: HT.any }].concat(options(key, list, f).map(function(o) { return { v: o.v, label: (key === 'r' ? '★' + o.v + '+' : o.v) + ' · ' + o.n }; }));
    var cur = key === 'sort' ? (f.sort || 'date') : key === 'ss' ? (f.ss || 'date') : (f[key] || '');
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
    '#tvsh .ph{font:800 15px Arial;letter-spacing:.14em;color:#F4C242;margin-bottom:12px;text-transform:uppercase}#tvsh .pg{display:flex;flex-wrap:wrap;gap:8px}' +
    // Shows (2.66.0): poster cards, three to a row, and the featured show
    '#tvsh .sgr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}' +
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
    '#tvsh .mo{margin-left:auto;font:700 12px Arial;color:#9AA6B4}' +
    '#tvsh .fe{margin-bottom:26px}#tvsh .fc{display:flex}#tvsh .fc .im{position:relative;flex:0 0 46%;aspect-ratio:16/9;background:#172029 center/cover no-repeat}' +
    '#tvsh .fc .bd{flex:1 1 0;min-width:0}#tvsh .rl{margin-top:4px}' +
    '#tvsh .ro{display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px solid #2A323C}' +
    '#tvsh .ro .no{flex:0 0 24px;font:900 15px Arial;color:#F4C242;text-align:right}' +
    '#tvsh .ro .ev{flex:0 0 200px;font:800 11px Arial;letter-spacing:.5px;text-transform:uppercase;color:#9AA6B4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#tvsh .ro .rn{flex:1 1 0;font:700 15px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#tvsh .ro.mn{border-bottom:0;background:#2A2410;margin:4px -14px 0;padding:7px 14px}#tvsh .ro.mn .ev{color:#F4C242}';
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
    if ((m = /^tog:(\w+)$/.exec(k))) { home.f[m[1]] = !home.f[m[1]]; homeRender(k); return; }
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
    home = { tab: scopeKind, f: { k: '', w: '', g: '', y: '', c: '', ti: '', r: 0, sort: 'date', sy: '', sv: '', sc: false, ss: 'date' }, more: false, pop: null };
    homeRender('T' + scopeKind);
  }
  // For the Community menu: the newest StarScope matches, drawn as the same cards.
  window.__tvScope = {
    newest: function(n) { return homeList().sort(sorter('added')).slice(0, n || 3); },
    card: function(x) { return block(x.v); }
  };

  function apply() { if (!map) return; if (scopeKind === 'recent' || scopeKind === 'top' || scopeKind === 'all' || scopeKind === 'shows') renderHome(); else if (scopeKind) renderScope(); else addButtons(); }
  var timer = 0;
  function soon() { if (timer) return; timer = setTimeout(function() { timer = 0; apply(); }, 350); }   // not a debounce: a page that keeps changing must still get its button
  window.__tvStarCardsReply = function(id, text) {
    var r; try { r = JSON.parse(text); } catch (e) { return; }
    if (!r || !r.ok || !r.map) return;
    map = r.map;
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), map: map })); } catch (e) {}
    try { if (window.__tvScopeUpdate) window.__tvScopeUpdate(); } catch (e) {}   // the video page's StarScope player (assets/scopeplayer.js)
    soon();
  };
  var fresh = 0;
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}, ids = Object.keys(saved.map || {}); if (ids.length && saved.map[ids[0]].x) fresh = saved.t || 0; } catch (e) {}   // a list without the wrestler data is never kept
  if (Date.now() - fresh > AGE) { try { H.starCards('c1', JSON.stringify({ action: 'vi_cards' })); } catch (e) {} }
  function start() { soon(); new MutationObserver(soon).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
