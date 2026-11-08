(function(){
  // Wrestler pages: a wrestler's search results page (/contents/search?q[keyword]=<name>, or a filtered one whose
  // Wrestler filter is that name) gets a header above the filter bar, like a tag team page: photo (private builds) or
  // initials, FIRST TITLE / REIGNS / DEFENCES from every title history, an Add to My Favorites button, buttons for
  // their current and past factions, and TITLES HELD (two per row). The search results and filter bar below are the
  // site's own, under a MATCHES header. Nothing here calls the site.
  if (window.__tvWrestler) return;
  window.__tvWrestler = true;
  if (location.pathname !== '/contents/search') { window.__tvWrReady = true; return; }
  if (/[?&](tvfaction|tvera|tvev|tvcomm|tvrecent|tvch)=/.test(location.search)) { window.__tvWrReady = true; return; }
  var H = window.AndroidHost || {};

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }
  function parse(s) { try { return JSON.parse(s || 'null'); } catch (e) { return null; } }
  // Android's bridge matches a method by its number of arguments: a no-argument method called with one fails.
  function call(fn, a) { try { return H[fn] ? (arguments.length > 1 ? H[fn](a) : H[fn]()) : ''; } catch (e) { return ''; } }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function ms(iso) { var a = String(iso).split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
  function fmtD(iso) { if (!iso) return ''; var a = String(iso).split('-'); return isJa() ? (+a[0]) + '年' + (+a[1]) + '月' + (+a[2]) + '日' : (+a[2]) + ' ' + MONTHS[+a[1] - 1] + ' ' + a[0]; }
  function ord(n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]); }
  function low(s) { return String(s || '').toLowerCase().trim(); }
  function halfW(s) { return String(s || '').replace(/[\uff01-\uff5e]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/\u3000/g, ' '); }
  function qp(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }

  // ---- who is this page about: the Wrestler filter (tvb), else the search words
  var base = qp('tvb') || qp('q[keyword]');
  if (!base) { window.__tvWrReady = true; return; }
  var FACS = ((parse(call('factionsJson')) || {}).factions) || [];
  var PAST = ((parse(call('pastWrestlersJson')) || {}).past) || [];
  var W = null;
  FACS.forEach(function(f) { (f.members || []).forEach(function(m) { if (!W && m && (low(m.search || m.name) === low(base) || low(m.name) === low(base))) W = { name: m.name, search: m.search || m.name, ja: m.ja || '' }; }); });
  PAST.forEach(function(m) { if (!W && m && (low(m.search || m.name) === low(base) || low(m.name) === low(base))) W = { name: m.name, search: m.search || m.name }; });
  if (!W) { window.__tvWrReady = true; return; }
  window.__tvWrestlerName = W.name;   // the page title shows the name (the menu's title code reads this)

  // ---- their factions: the ones that list them, current first (factions.json "former" marks past ones)
  function facPath(f) { var m0 = (f.members || [])[0]; var kw = f.home === false && m0 ? m0.search : (f.search || f.name); return '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(kw) + '&tvfaction=' + encodeURIComponent(f.id) + (H.categoriesOn && H.categoriesOn() ? '&q%5Btype%5D=single' : ''); }
  var myFacs = FACS.filter(function(f) {
    return f.id !== 'unaffiliated' && (f.members || []).some(function(m) { return m && (low(m.name) === low(W.name) || low(m.search) === low(W.search)); });
  }).sort(function(a, b) { return (a.former ? 1 : 0) - (b.former ? 1 : 0); });

  // ---- their title reigns, from every title history (lineageJson, so the daily file's newer copies count)
  var BELT_IDS = ['world', 'wonder', 'goddess', 'artist', 'highspeed', 'future', 'newblood', 'iwgp', 'strong', 'kawaii'];
  var reigns = [], RECORD = [], BELTS = {}, KNOWN = {};
  FACS.forEach(function(f) { (f.members || []).forEach(function(m) { if (m && m.name) KNOWN[low(m.name)] = 1; }); });
  PAST.forEach(function(m) { if (m && m.name) KNOWN[low(m.name)] = 1; });   // RECORD: every title match on record (reign won, defences), for the Championship tab's check
  BELT_IDS.forEach(function(b) {
    var L = parse(call('lineageJson', b));
    if (!L || !L.reigns) return;
    var names = {};
    names[low(W.name)] = 1; names[low(W.search)] = 1;
    Object.keys(L.alias || {}).forEach(function(k) {
      var all = [k].concat(L.alias[k] || []), hit = all.some(function(n) { return names[low(n)]; });
      if (hit) all.forEach(function(n) { names[low(n)] = 1; });
    });
    var title = String(L.title || b).replace(/\s+Championship$/i, '');
    // For the Championship tab's check: how to spot this belt in a video title, and whether its history lists every
    // defence with its date (NEW BLOOD tag doesn't, so its matches can't be checked against the record).
    BELTS[b] = { pats: (L.titlePatterns || [L.search || L.title || b]).map(function(x) { return low(halfW(x)).replace(/\s+/g, ''); }).filter(Boolean),
      strict: !L.reigns.some(function(r) { return r.defCount != null && r.defCount > (r.defences || []).length; }) };
    // A name in the history with an extra word ("Rian Hinata" in the daily file) still counts as theirs, unless that
    // full name is another wrestler on the roster ("Rina Yamashita" is not Rina).
    var inIt = function(str) {
      return String(str || '').replace(/[（(][^）)]*[）)]/g, ' ').split(/\s*(?:&|,|、|＆|\bvs\.?\b)\s*/i).some(function(n) {
        var k = low(n); if (!k) return false;
        if (names[k]) return true;
        var fw = k.split(/\s+/)[0];
        return fw !== k && names[fw] && !KNOWN[k];
      });
    };
    L.reigns.forEach(function(r) {
      // their challenges: the match where they took the belt from this champion, and this champion's defences against them
      if (r.won && inIt(r.vs)) RECORD.push({ belt: b, d: r.won, what: 'lost' });
      (r.defences || []).forEach(function(df) { if (df && df.d && inIt(df.opp)) RECORD.push({ belt: b, d: df.d, what: 'challenge' }); });
      var who = String(r.champ || '').split(/\s*(?:&|,)\s*/).map(function(s) { return s.trim(); }).filter(Boolean);
      if (!who.some(function(n) { return names[low(n)]; })) return;
      if (r.won) RECORD.push({ belt: b, d: r.won, what: 'won' });
      (r.defences || []).forEach(function(df) { if (df && df.d) RECORD.push({ belt: b, d: df.d, what: 'defence' }); });
      reigns.push({ belt: b, title: title, ja: L.ja || '', n: r.n, won: r.won, end: r.end || null,
        defs: r.defCount != null ? r.defCount : (r.defences || []).length,
        with: who.filter(function(n) { return !names[low(n)]; }), team: r.team || '' });
    });
  });
  reigns.sort(function(a, b) { return String(b.won).localeCompare(String(a.won)); });   // newest first
  RECORD.sort(function(a, b) { return a.d < b.d ? 1 : -1; });
  window.__tvWrRecord = RECORD;
  // Private builds: the site's search also returns videos the wrestler isn't in (older shows, other people's title
  // matches), so the filter bar asks these two before keeping a card in a Titles & tournaments tab.
  // __tvWrDebut: their debut (match_types.json "debuts", the roster file can add more); nothing before it is theirs.
  // __tvWrCheck(title, date): '' to keep a Championship tab card, else why it was left out. A belt with a full history
  // must have the match on their record (won, defended, challenged; a day either side for time zones), or, undated,
  // one of their matches for that belt in the 45 days before the upload date (in the picture's address). A title with no history kept here (CMLL, POP…) is kept only when
  // the title names them.
  try {
    var DEB = (parse(call('matchTypesJson')) || {}).debuts || {}, debut = '';
    Object.keys(DEB).forEach(function(k) { if (low(k) === low(W.name) || low(k) === low(W.search)) debut = String(DEB[k] || ''); });
    window.__tvWrDebut = debut;
  } catch (e) { window.__tvWrDebut = ''; }
  function dayNear(a, b) { return a === b || Math.abs(ms(a) - ms(b)) <= 86400000; }
  window.__tvWrCheck = function(title, d, up) {
    var t = low(halfW(title)).replace(/\s+/g, ''), belt = '';
    Object.keys(BELTS).forEach(function(b) { if (!belt && BELTS[b].pats.some(function(p) { return t.indexOf(p) >= 0; })) belt = b; });
    if (!belt) {
      var nm = [W.name, W.search, W.ja].filter(Boolean).map(function(n) { return low(halfW(n)).replace(/\s+/g, ''); });
      return nm.some(function(n) { return t.indexOf(n) >= 0; }) ? '' : 'not on their title record';
    }
    if (!BELTS[belt].strict) return '';
    var mine = RECORD.filter(function(x) { return x.belt === belt; });
    if (!mine.length) return 'no ' + belt + ' title match on their record';
    if (d) return mine.some(function(x) { return dayNear(x.d, d); }) ? '' : 'not a ' + belt + ' title match on their record';
    // undated (old numbered titles, English commentary copies): by upload date, one of their matches for this belt
    // must be in the 45 days before the video went up
    if (up) return mine.some(function(x) { var g = ms(up) - ms(x.d); return g >= -86400000 && g <= 45 * 86400000; }) ? '' : 'undated, uploaded ' + up + ', no ' + belt + ' title match of theirs just before';
    return '';
  };
  window.__tvWrReady = true;

  // ---- private builds: tabs above the filter bar for the Titles & tournaments categories (match_types.json, private group)
  var CATS = [];
  try {
    if (H.categoriesOn && H.categoriesOn()) {
      ((parse(call('matchTypesJson')) || {}).groups || []).forEach(function(g) { if (g.private) (g.items || []).forEach(function(x) { if ((x.pages || []).indexOf('wrestler') >= 0) CATS.push(x); }); });
    }
  } catch (e) { CATS = []; }
  var curMt = qp('tvmt'), otherFilters = /[?&]tv(ch|co|sh|lo|yr)=[^&]/.test(location.search) || (curMt && !CATS.some(function(x) { return x.id === curMt; }));
  function tabsHtml() {
    if (!CATS.length) return '';
    var allOn = !curMt && !otherFilters;
    var h = '<div class="wr-tabs">' + '<a class="wr-tab' + (allOn ? ' wr-tab-on' : '') + '" tabindex="0" data-wrtab="">' + esc(T('All Matches', 'すべての試合')) + '</a>';
    CATS.forEach(function(x) { h += '<a class="wr-tab' + (curMt === x.id && !otherFilters ? ' wr-tab-on' : '') + '" tabindex="0" data-wrtab="' + esc(x.id) + '">' + esc(isJa() && x.ja ? x.ja : x.name) + '</a>'; });
    return h + '<a class="wr-tab wr-tab-more' + (otherFilters ? ' wr-tab-on' : '') + '" tabindex="0" data-wrmore="1">' + esc(T('More', '詳細')) + ' ▾</a></div>';
  }
  window.__tvWrTabFocus = function() { var tab = root && (root.querySelector('.wr-tab-on') || root.querySelector('.wr-tab')); if (tab) { focusEl(tab); return true; } return false; };
  function fbShown() { return !CATS.length || otherFilters || document.documentElement.classList.contains('tv-fb-show'); }
  if (CATS.length && !otherFilters) document.documentElement.classList.add('tv-cats');
  var first = reigns.length ? reigns[reigns.length - 1].won : '', defTotal = 0;
  reigns.forEach(function(r) { defTotal += r.defs || 0; });

  // ---- My Favorites (assets/favorites.js keeps the list)
  function isFav() { try { return !!(window.__tvFav && window.__tvFav.load().w.some(function(x) { return low(x.k) === low(W.search); })); } catch (e) { return false; } }
  function favInner() { var on = isFav(); return '<span class="st">' + (on ? '★' : '☆') + '</span>' + esc(on ? T('In My Favorites', 'お気に入り登録済み') : T('Add to My Favorites', 'お気に入りに追加')); }

  // ---- the header
  var css = document.createElement('style');
  css.textContent = [
    '#tv-wr{box-sizing:border-box;color:#fff;font-family:Arial,Helvetica,sans-serif;margin:4px 0 6px 0;padding-right:20px;}',
    '#tv-wr, #tv-wr *{box-sizing:border-box;word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;}',
    '#tv-wr a, #tv-wr a *{opacity:1 !important;filter:none !important;text-decoration:none !important;color:inherit;}',
    '#tv-wr *:focus{outline:none !important;box-shadow:none !important;transform:none !important;}',
    // The search page puts this header inside the site's article, where the app's card rule removes borders from
    // anything focused (article *:focus { border: none !important }). These rules name the header, so they win.
    '#tv-wr .wr-btn, #tv-wr .wr-belt{border:2px solid #2A323C !important;}',
    '#tv-wr .wr-btn:focus, #tv-wr .wr-belt:focus{border:2px solid #F4C242 !important;background:#172029 !important;}',
    '#tv-wr .wr-hero{display:flex;gap:32px;align-items:center;}',
    '#tv-wr .wr-av{flex:none;width:140px;height:140px;border-radius:50%;border:3px dashed #3B4656;background:#161F2A center top/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:900;color:#C9D2DC;overflow:hidden;white-space:nowrap;}',
    '#tv-wr .wr-av.ph{border-style:solid;border-color:#2A323C;}',
    '#tv-wr .wr-facts{display:flex;gap:36px;flex-wrap:wrap;}',
    '#tv-wr .wr-facts .k{font-size:13px;font-weight:700;color:#9AA6B4;letter-spacing:1px;}',
    '#tv-wr .wr-facts .v{font-size:22px;font-weight:700;margin-top:4px;}',
    '#tv-wr .wr-btns{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}',
    '#tv-wr .wr-btn{display:flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-radius:8px;border:2px solid #2A323C;background:#161F2A;font-size:17px;font-weight:700;color:#fff !important;white-space:nowrap;cursor:pointer;}',
    '#tv-wr .wr-btn:focus{border-color:#F4C242;background:#172029;}',
    '#tv-wr .wr-btn .st{color:#F4C242;font-size:19px;}',
    '#tv-wr .wr-btn.wr-on{background:#2A2410;color:#F4C242 !important;}',
    '#tv-wr .wr-btn small{font-size:13px;font-weight:600;color:#9AA6B4;}',
    '#tv-wr .wr-sec{display:flex;align-items:center;gap:10px;margin:26px 0 10px 0;}',
    '#tv-wr .wr-tabs{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px 0;}',
    '#tv-wr .wr-tab{display:flex;align-items:center;height:44px;padding:0 16px;border-radius:10px;border:2px solid #2A323C !important;background:#161F2A;font-size:17px;font-weight:700;color:#C9D2DC !important;white-space:nowrap;cursor:pointer;}',
    '#tv-wr .wr-tab.wr-tab-on{background:#FFB347;border-color:#FFB347 !important;color:#1A1A1A !important;}',
    '#tv-wr .wr-tab:focus{border-color:#F4C242 !important;}',
    '#tv-wr .wr-tab-more{margin-left:14px;}',
    'html.tv-cats:not(.tv-fb-show) #tv-fb, html.tv-cats:not(.tv-fb-show) #tv-fbc{display:none !important;}',
    '#tv-wr .wr-sec i{width:8px;height:26px;background:#F4C242;}',
    '#tv-wr .wr-sec b{font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '#tv-wr .wr-sec span{font-size:13px;font-weight:600;color:#9AA6B4;}',
    '#tv-wr .wr-belts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
    '#tv-wr .wr-belt{display:flex;align-items:center;gap:18px;min-width:0;padding:12px 16px;border-radius:12px;border:2px solid #2A323C;background:#161F2A;cursor:pointer;}',
    '#tv-wr .wr-belt:focus{border-color:#F4C242;background:#172029;}',
    '#tv-wr .wr-belt .pic{flex:none;width:120px;height:66px;display:flex;align-items:center;justify-content:center;}',
    '#tv-wr .wr-belt .pic img{max-width:100%;max-height:100%;object-fit:contain;}',
    '#tv-wr .wr-belt .pic.ph{border-radius:8px;background:#222B36;color:#9AA6B4;font-size:12px;font-weight:700;letter-spacing:1px;}',
    '#tv-wr .wr-belt .t1{font-size:19px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-wr .wr-belt .t2{font-size:15px;font-weight:600;color:#C9D2DC;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-wr .wr-belt .t3{font-size:13px;font-weight:700;color:#F4C242;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-wr .wr-none{font-size:16px;color:#9AA6B4;padding:4px 6px;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  function initials(n) { var p = String(n).trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }
  function html() {
    var photo = call('wrestlerPhoto', W.name) || (W.search !== W.name ? call('wrestlerPhoto', W.search) : '');
    var av = photo ? '<div class="wr-av ph" style="background-image:url(\'' + esc(photo) + '\')"></div>' : '<div class="wr-av notranslate" translate="no">' + esc(initials(W.name)) + '</div>';
    var cur = myFacs.filter(function(f) { return !f.former; })[0];
    var facts = (cur ? '<div><div class="k">' + esc(T('FACTION', 'ユニット')) + '</div><div class="v notranslate" translate="no">' + esc(cur.name) + '</div></div>' : '') +
      (first ? '<div><div class="k">' + esc(T('FIRST TITLE', '初戴冠')) + '</div><div class="v">' + esc(first.slice(0, 4)) + '</div></div>' : '') +
      '<div><div class="k">' + esc(T('REIGNS', '戴冠')) + '</div><div class="v">' + reigns.length + '</div></div>' +
      '<div><div class="k">' + esc(T('DEFENCES', '防衛')) + '</div><div class="v">' + defTotal + '</div></div>';
    var btns = (window.__tvFav ? '<a class="wr-btn wr-fav' + (isFav() ? ' wr-on' : '') + '" tabindex="0" data-wrfav="1">' + favInner() + '</a>' : '') +
      myFacs.map(function(f) {
        return '<a class="wr-btn" tabindex="0" href="' + esc(absUrl(facPath(f))) + '"><span class="notranslate" translate="no">' + esc(f.name) + '</span>' + (f.former ? '<small>' + esc(T('past', '元')) + '</small>' : '') + '</a>';
      }).join('');
    var h = '<div class="wr-hero">' + av + '<div style="min-width:0"><div class="wr-facts">' + facts + '</div><div class="wr-btns">' + btns + '</div></div></div>';
    if (reigns.length) {
      h += '<div class="wr-sec"><i></i><b>' + esc(T('TITLES HELD', '獲得王座')) + '</b><span>' + reigns.length + '</span></div><div class="wr-belts">' + reigns.map(function(r) {
        var pic = call('beltDataUri', r.belt), days = Math.max(1, Math.round(((r.end ? ms(r.end) : Date.now()) - ms(r.won)) / 86400000));
        var partners = r.with.length ? T(' · with ', ' · ') + r.with.join(' & ') : '';
        return '<a class="wr-belt" tabindex="0" href="' + esc(absUrl('/mypage?tvch=' + r.belt + '&tvrn=' + r.n)) + '"><div class="pic' + (pic ? '' : ' ph') + '">' + (pic ? '<img src="' + esc(pic) + '" alt="">' : 'BELT') + '</div><div style="min-width:0">' +
          '<div class="t1">' + esc(isJa() && r.ja ? r.ja : r.title) + ' · ' + esc(T(ord(r.n) + ' reign', '第' + r.n + '代')) + '</div>' +
          '<div class="t2"><span>' + esc(fmtD(r.won)) + ' – ' + esc(r.end ? fmtD(r.end) : T('now', '現在')) + '</span><span class="notranslate" translate="no">' + esc(partners) + '</span></div>' +
          '<div class="t3">' + esc(T(days + ' days · ' + r.defs + (r.defs === 1 ? ' defence' : ' defences'), days + '日 · 防衛' + r.defs + '回')) + '</div></div></a>';
      }).join('') + '</div>';
    }
    h += '<div class="wr-sec"><i></i><b>' + esc(T('MATCHES', '試合')) + '</b></div>' + tabsHtml();
    return h;
  }

  var root = null;
  function mount() {
    if (document.getElementById('tv-wr')) return true;
    var bar = document.getElementById('tv-fb');
    if (!bar || !bar.parentNode) return false;
    root = document.createElement('div');
    root.id = 'tv-wr';
    // The header writes its own English or Japanese, so the page translator leaves it alone (its highlight box
    // was showing over TITLES HELD).
    root.className = 'notranslate';
    root.setAttribute('translate', 'no');
    root.innerHTML = html();
    bar.parentNode.insertBefore(root, bar);
    align();
    // start on the header, at the top of the page
    var anchorFlag = ''; try { anchorFlag = sessionStorage.getItem('tvFbAnchor'); sessionStorage.removeItem('tvFbAnchor'); } catch (e) {}
    if (anchorFlag) {   // a filter or tab was just chosen: open at MATCHES with its tab (or the filter bar) focused
      // just above the MATCHES header, with the control that was used focused: that filter button, else that tab
      var focused = null;
      var go2 = function() {
        if (focused && document.activeElement !== focused) return;   // the viewer has moved on
        var secs = root.querySelectorAll('.wr-sec'), m = secs[secs.length - 1];
        if (m) { var r = m.getBoundingClientRect(); window.scrollTo(0, Math.max(0, window.scrollY + r.top - 12)); }
        var t0 = null, k0 = String(anchorFlag).indexOf('fb:') === 0 ? anchorFlag.slice(3) : '';
        if (k0 && fbShown()) t0 = document.querySelector('#tv-fb .tv-fbb[data-k="' + k0 + '"]');
        if (!t0) t0 = root.querySelector('.wr-tab-on') || (fbShown() ? document.querySelector('#tv-fb .tv-fbb') : null) || root.querySelector('.wr-tab');
        if (t0) { try { t0.focus({ preventScroll: true }); } catch (e) { t0.focus(); } focused = t0; }
      };
      go2(); setTimeout(go2, 600); setTimeout(go2, 1500);
      return true;
    }
    var ae = document.activeElement;
    if (!ae || ae === document.body || (ae.closest && ae.closest('.content-list, [class*="content-list"]'))) {
      var f0 = root.querySelector('[tabindex="0"]');
      if (f0) { try { f0.focus({ preventScroll: true }); } catch (e) { f0.focus(); } }
      window.scrollTo(0, 0);
    }
    return true;
  }
  // line the header up with the filter bar (which lines itself up with the first thumbnail)
  function align() {
    var bar = document.getElementById('tv-fb');
    if (!root || !bar) return;
    root.style.marginLeft = bar.style.marginLeft || '0px';
  }
  var tries = 0;
  (function wait() { if (mount() || ++tries > 60) return; setTimeout(wait, 250); })();
  [400, 1000, 2100, 4100].forEach(function(t) { setTimeout(align, t); });
  window.addEventListener('resize', align);

  function favChanged() {
    var b = root && root.querySelector('.wr-fav');
    if (b) { b.innerHTML = favInner(); b.classList.toggle('wr-on', isFav()); }
  }

  // ---- remote: arrows move to the nearest header item; Down past the header goes to the filter bar, Up from the
  // filter bar comes back to the header; OK on the favorites button adds or removes them.
  function items() { return root ? Array.prototype.slice.call(root.querySelectorAll('[tabindex="0"]')) : []; }
  function nearest(from, dir, list) {
    var a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = 1e9;
    list.forEach(function(el) {
      if (el === from) return;
      var b = el.getBoundingClientRect(), dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay, p, s;
      if (dir === 'left') { if (b.right > a.left + 4 || Math.abs(dy) > Math.max(a.height, b.height) * 0.6) return; p = -dx; s = Math.abs(dy); }
      else if (dir === 'right') { if (b.left < a.right - 4 || Math.abs(dy) > Math.max(a.height, b.height) * 0.6) return; p = dx; s = Math.abs(dy); }
      else if (dir === 'up') { if (b.bottom > a.top + 4) return; p = -dy; s = Math.abs(dx); }
      else { if (b.top < a.bottom - 4) return; p = dy; s = Math.abs(dx); }
      var sc = p + s * 2;
      if (sc < bs) { bs = sc; best = el; }
    });
    return best;
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }
  window.addEventListener('keydown', function(e) {
    if (!root || menuOpen()) return;
    var k = e.keyCode, ae = document.activeElement;
    var stop = function() { e.preventDefault(); e.stopImmediatePropagation(); };
    if (ae && root.contains(ae)) {
      if ((k === 13 || k === 23) && ae.getAttribute('data-wrtab') != null) {   // a category tab: the filter bar's own address for it
        stop();
        var id = ae.getAttribute('data-wrtab'), p = { mt: id, ch: '', co: '', sh: '', lo: '', yr: '' };
        try { sessionStorage.setItem('tvFbAnchorCtl', 'tab:' + id); } catch (e) {}
        if (window.__tvFbGo) window.__tvFbGo(p);
        return;
      }
      if ((k === 13 || k === 23) && ae.getAttribute('data-wrmore') != null) {   // More: show or hide the full filter bar
        stop();
        document.documentElement.classList.toggle('tv-fb-show');
        if (fbShown()) { var b0 = document.querySelector('#tv-fb .tv-fbb'); if (b0) focusEl(b0); }
        return;
      }
      if ((k === 13 || k === 23) && ae.getAttribute('data-wrfav') != null) {
        stop();
        if (window.__tvFav) { window.__tvFav.toggleWrestler(W.search); favChanged(); }
        return;
      }
      var dir = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' }[k];
      if (!dir) return;
      var n = nearest(ae, dir, items());
      if (n) { stop(); focusEl(n); return; }
      if (dir === 'down') {
        var fb = fbShown() ? document.querySelector('#tv-fb .tv-fbb') : null;
        if (!fb) fb = Array.prototype.filter.call(document.querySelectorAll('.content-list .content-list-item a[href], .content-list a[href*="/contents/"]'), function(x) { var q = x.getBoundingClientRect(); return q.width > 0 && q.height > 0; })[0] || null;   // filter bar hidden: the first video showing
        if (fb) { stop(); focusEl(fb); }
        return;
      }
      if (dir === 'up') { stop(); window.scrollTo(0, 0); return; }
      if (dir === 'right') { stop(); return; }
      if (dir === 'left') { stop(); if (window.__tvOpenMenu) window.__tvOpenMenu(); return; }   // left edge: the menu
      return;
    }
    // filter bar hidden behind More: Up from the first row of videos comes back to the tabs
    if (k === 38 && CATS.length && !fbShown() && ae && ae.closest && ae.closest('.content-list')) {
      var ar0 = ae.getBoundingClientRect(), above = Array.prototype.some.call(document.querySelectorAll('.content-list a[href*="/contents/"]'), function(x) { var r = x.getBoundingClientRect(); return r.height > 0 && r.bottom <= ar0.top - 4; });
      if (!above) { var tab = root.querySelector('.wr-tab-on') || root.querySelector('.wr-tab'); if (tab) { stop(); focusEl(tab); } }
      return;
    }
    if (k === 38 && ae && ae.closest && ae.closest('#tv-fb') && ae.classList.contains('tv-fbb')) {
      var list = items(), best = null, bd = 1e9, ar = ae.getBoundingClientRect();
      list.forEach(function(el) { var r = el.getBoundingClientRect(), d = (ar.top - r.bottom) + Math.abs(r.left - ar.left) * 0.5; if (r.bottom <= ar.top + 4 && d < bd) { bd = d; best = el; } });
      if (best) { stop(); focusEl(best); }
    }
  }, true);
  // Menu button on the page (favorites.js asks first): add or remove this wrestler
  window.__tvWrestlerFav = function() { if (window.__tvFav) { window.__tvFav.toggleWrestler(W.search); favChanged(); return true; } return false; };
})();
