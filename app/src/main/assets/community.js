(function(){
  // Community: most watched / most favorited charts built from the site's own sorted search pages.
  // Every chart is ONE search address (sort by plays or favorites, plus a keyword for the year, month,
  // place, show, title or match type). The page that loads is drawn over by this chart, so a chart costs
  // exactly one request and nothing else is fetched (except the menu's Top 10, at most once a day).
  if (window.__tvComm) return;
  var H = window.AndroidHost || {};
  // How a show's date starts a video title; "This month" searches for it (e.g. "2026.10").
  // The chart prints the words it searched for, so a different style of date is easy to spot and change here.
  var MONTH_FMT = '{y}.{m}';
  var TOP_KEY = 'tvCommTop', TOP_TTL = 24 * 3600 * 1000, RANK_KEY = 'tvCommRank', FOCUS_KEY = 'tvCommFocus';
  var BUILD = '/contents/search?s=pc&o=d&activetab=contents&page=1';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function relUrl(u) { try { var x = new URL(u, location.origin); return x.pathname + x.search; } catch (e) { return u; } }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }
  function jget(fn) { try { return JSON.parse(H[fn]()); } catch (e) { return null; } }
  function clean(t) {
    return (t || '').replace(/月額見放題/g, '')
      .replace(/Unlimited viewing for a monthly fee/gi, '')
      .replace(/Monthly subscription available/gi, '')
      .replace(/Monthly subscription/gi, '')
      .replace(/(Registration date|登録日)\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '')
      .replace(/\s+/g, ' ').trim();
  }

  // ---- video cards of a page (or of a fetched copy of one)
  function readCards(node, skip) {
    var out = [], seen = {};
    Array.prototype.forEach.call(node.querySelectorAll('.content-list-item, article'), function(item) {
      if (item.closest('.slick-cloned')) return;
      if (skip && skip.contains(item)) return;
      var link = item.querySelector('a[href*="/contents/"], a[href*="/set/"]');
      if (!link) return;
      var href = absUrl(link.getAttribute('href') || '');
      var m = href.match(/(?:contents|set)\/(\d+)/);
      if (!m || seen[href]) return;
      seen[href] = true;
      var bg = '', th = item.querySelector('[style*="background-image"]');
      if (th) { var mm = (th.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/); if (mm && mm[1]) bg = mm[1]; }
      if (!bg) {
        var img = item.querySelector('img');
        if (img) bg = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || img.getAttribute('src') || '';
      }
      if (bg.indexOf('data:') === 0) bg = '';
      if (bg) bg = absUrl(bg);
      var tEl = item.querySelector('h3, h4, .ttl-xs, .content-title, .content-info-box');
      var title = clean(tEl ? tEl.textContent : (link.getAttribute('title') || item.textContent)) || 'Stardom World Video';
      out.push({ id: m[1], href: href, title: title, bg: bg });
    });
    return out;
  }

  // ---- chart addresses: metric (pc = plays, fc = favorites), window, optional subject
  function monthWords(d) {
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    return MONTH_FMT.replace('{y}', String(d.getFullYear())).replace('{m}', mm);
  }
  function windowWords(o) {
    var now = new Date();
    if (o.w === 'm') return monthWords(now);
    if (o.w === 'y') return String(now.getFullYear());
    if (o.w === 'yr') return String(o.y || now.getFullYear());
    return '';
  }
  function chartUrl(o) {
    o = o || {};
    var m = o.m === 'fc' ? 'fc' : 'pc', w = o.w || 'a';
    var kw = [o.k || '', windowWords({ w: w, y: o.y })].filter(function(x) { return x; }).join(' ');
    var u = '/contents/search?' + (kw ? 'q%5Bkeyword%5D=' + encodeURIComponent(kw) + '&' : '') + 's=' + m + '&o=d&activetab=contents&page=1&tvcomm=1&tvcw=' + w;
    if (w === 'yr') u += '&tvcy=' + encodeURIComponent(o.y || new Date().getFullYear());
    if (o.s) u += '&tvcs=' + encodeURIComponent(o.s) + '&tvck=' + encodeURIComponent(o.k || '');
    return u;
  }
  var COLL_URL = BUILD + '&tvcomm=coll';

  // ---- the lists behind the collections (all from the app's existing files)
  var FEAT_PLACES = ['Korakuen Hall', 'Yokohama Arena', 'Osaka-jo Hall', 'Edion Arena Osaka', 'Chunichi Hall'];
  var FEAT_TITLES = ['any', 'world', 'goddess', 'wonder', 'future'];
  function places() {
    var d = jget('eventFiltersJson') || {}, out = [];
    (d.locations || []).forEach(function(l) {
      if ((l.venues || []).length) l.venues.forEach(function(v) { out.push({ n: v.name, k: v.search }); });
      else out.push({ n: l.name, k: l.search });
    });
    out.sort(function(a, b) {
      var ia = FEAT_PLACES.indexOf(a.n), ib = FEAT_PLACES.indexOf(b.n);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      return ia !== ib ? ia - ib : a.n.localeCompare(b.n);
    });
    return out;
  }
  function shows() {
    var d = jget('eventFiltersJson') || {};
    return (d.shows || []).map(function(s) { return { n: s.name, k: s.search }; });
  }
  function titles() {
    var out = [], c = jget('championshipsJson') || {}, mt = jget('matchTypesJson') || {};
    (c.groups || []).forEach(function(g) {
      (g.items || []).forEach(function(x) { if (x.id !== 'other') out.push({ n: isJa() && x.ja ? x.ja : x.name, k: x.search, f: FEAT_TITLES.indexOf(x.id) }); });
    });
    out.sort(function(a, b) { var fa = a.f < 0 ? 99 : a.f, fb = b.f < 0 ? 99 : b.f; return fa - fb; });
    (mt.groups || []).forEach(function(g) {
      (g.items || []).forEach(function(x) { out.push({ n: isJa() && x.ja ? x.ja : x.name, k: x.search, f: 99 }); });
    });
    return out;
  }

  // ---- the menu's Top 10 (most watched, all time): kept from the last visit, refreshed at most once a day
  var fetching = false;
  function topCache() {
    try { var d = JSON.parse(lsGet(TOP_KEY) || 'null'); if (d && Array.isArray(d.items)) return d; } catch (e) {}
    return null;
  }
  function saveTop(items) { if (items && items.length) lsSet(TOP_KEY, JSON.stringify({ t: Date.now(), items: items.slice(0, 10).map(function(x) { return { href: x.href, title: x.title, bg: x.bg }; }) })); }
  function fetchTop() {
    if (fetching || !window.fetch) return;
    fetching = true;
    fetch(BUILD, { credentials: 'same-origin' }).then(function(r) { return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      saveTop(readCards(doc, null));
      fetching = false;
      var el = document.getElementById('tv-cm-top');
      if (el) el.innerHTML = topInner();
    }).catch(function() { fetching = false; });
  }
  function topInner() {
    var c = topCache(), items = c ? c.items : [];
    if (!items.length) return '<div style="color:#9aa6b4;font-size:15px;padding:6px 4px;">' + esc(T('Loading the Top 10...', 'トップ10を読み込み中...')) + '</div>';
    var h = '';
    items.forEach(function(it, i) {
      var go = relUrl(it.href);
      if (i === 0) {
        h += '<a class="tv-sm-fi tv-cm-h1" tabindex="0" data-go="' + esc(go) + '" href="' + esc(it.href) + '"><div class="tv-cm-h1i" style="' + (it.bg ? 'background-image:url(' + esc(it.bg) + ');' : '') + '"><span class="tv-cm-rk">1</span></div><div class="tv-cm-h1t">' + esc(it.title) + '</div></a>';
      } else {
        h += '<a class="tv-sm-fi tv-cm-li" tabindex="0" data-go="' + esc(go) + '" href="' + esc(it.href) + '"><span class="tv-cm-n">' + (i + 1) + '</span><span class="tv-cm-lt">' + esc(it.title) + '</span></a>';
      }
    });
    return h;
  }
  function top10Html() {
    var c = topCache();
    if (!c || Date.now() - c.t > TOP_TTL) fetchTop();
    return '<div class="tv-shl-t" style="color:#F4C242;">' + esc(T('TOP 10 · MOST WATCHED · ALL TIME', 'トップ10 · 再生数 · 全期間')) + '</div><div id="tv-cm-top">' + topInner() + '</div>';
  }

  // the menu's Top 10 (inside the shelf) is styled on every page, not only on the Community page
  var shelfCss = document.createElement('style');
  shelfCss.textContent = [
    '#tv-sm-shelf .tv-cm-h1{padding:0 !important;border-radius:10px !important;margin:0 0 8px 0 !important;}',
    '#tv-sm-shelf .tv-cm-h1i{position:relative;width:100%;aspect-ratio:16/9;border-radius:8px;background:#222 center/cover no-repeat;}',
    '#tv-sm-shelf .tv-cm-rk{position:absolute;line-height:1;font-weight:900;color:#F4C242;text-shadow:0 2px 8px rgba(0,0,0,.9);}',
    '#tv-sm-shelf .tv-cm-h1i .tv-cm-rk{font-size:58px;left:12px;bottom:6px;}',
    '#tv-sm-shelf .tv-cm-h1t{padding:8px 4px 2px 4px;font-size:16px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '#tv-sm-shelf .tv-cm-li{display:flex !important;align-items:center;gap:12px;padding:4px 8px !important;margin:0 !important;font-size:15px !important;}',
    '#tv-sm-shelf .tv-cm-n{flex:0 0 26px;font-size:18px;font-weight:900;color:#F4C242;text-align:center;}',
    '#tv-sm-shelf .tv-cm-lt{flex:1 1 0;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(shelfCss);

  window.__tvComm = { url: chartUrl, top10Html: top10Html, collUrl: COLL_URL, buildUrl: BUILD };

  // ============================================================ the Community page
  var PARAMS = null, MODE = '';
  try { if (location.pathname.indexOf('/contents/search') === 0) { PARAMS = new URLSearchParams(location.search); MODE = PARAMS.get('tvcomm') || ''; } } catch (e) { MODE = ''; }
  if (!MODE) return;

  var CUR = { m: PARAMS.get('s') === 'fc' ? 'fc' : 'pc', w: PARAMS.get('tvcw') || 'a', y: PARAMS.get('tvcy') || '', s: PARAMS.get('tvcs') || '', k: PARAMS.get('tvck') || '' };
  if (!/^(a|y|m|yr)$/.test(CUR.w)) CUR.w = 'a';
  var KW = PARAMS.get('q[keyword]') || '';

  var css = document.createElement('style');
  css.textContent = [
    '#tv-cm{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0a0d12;color:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-cm, #tv-cm *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;box-sizing:border-box;}',
    '#tv-cm-title{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:22px 24px 8px 30px;font-size:36px;}',
    '#tv-cm-title .b{flex:0 0 auto;width:12px;height:44px;background:#F4C242;}',
    '#tv-cm-title .sub{color:#9aa6b4;}',
    '#tv-cm-hint{margin-left:auto;font-size:16px;font-weight:600;color:#9aa6b4;text-align:right;}',
    '#tv-cm-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 30px 60px 30px;scroll-padding:24px 0 40px 0;scrollbar-width:none;}',
    '#tv-cm-scroll::-webkit-scrollbar{display:none;}',
    '#tv-cm-in{max-width:1440px;margin:0 auto;}',
    '#tv-cm a, #tv-cm a:visited, #tv-cm a:hover, #tv-cm a *{opacity:1 !important;filter:none !important;color:inherit;text-decoration:none !important;}',
    '#tv-cm a::before, #tv-cm a::after{content:none !important;display:none !important;}',
    '#tv-cm *:focus{outline:none !important;box-shadow:none !important;transform:none !important;}',
    '.tv-cm-bar{display:flex;align-items:center;gap:20px;margin:14px 0 0 0;flex-wrap:wrap;}',
    '.tv-cm-seg{display:flex;border:2px solid #222b36;border-radius:999px;}',
    '.tv-cm-sg{display:block;padding:9px 20px;font-size:15px;font-weight:700;color:#cfd8e3 !important;border:2px solid transparent;border-radius:999px;margin:-2px;cursor:pointer;}',
    '.tv-cm-sg.on{background:#F4C242;color:#111 !important;}',
    '#tv-cm .tv-cm-sg:focus{outline:3px solid #FFD700 !important;outline-offset:1px !important;box-shadow:0 0 16px rgba(255,215,0,.8) !important;position:relative;z-index:3;}',
    '.tv-cm-pill{display:block;margin-left:auto;border:2px solid #F4C242;color:#F4C242 !important;border-radius:999px;padding:9px 20px;font-size:15px;font-weight:700;cursor:pointer;}',
    '#tv-cm .tv-cm-pill:focus{outline:3px solid #FFD700 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(255,215,0,.8) !important;}',
    '.tv-cm-years{display:flex;gap:10px;margin:14px 0 0 -6px;padding:8px 6px;overflow-x:auto;scrollbar-width:none;scroll-padding:0 24px;}',
    '.tv-cm-years::-webkit-scrollbar{display:none;}',
    '.tv-cm-y{flex:0 0 auto;display:block;padding:8px 15px;font-size:16px;font-weight:700;color:#cfd8e3 !important;border:2px solid #222b36;border-radius:8px;cursor:pointer;}',
    '.tv-cm-y.on{background:#F4C242;border-color:#F4C242;color:#111 !important;}',
    '#tv-cm .tv-cm-y:focus{outline:3px solid #FFD700 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(255,215,0,.8) !important;}',
    '.tv-cm-chips{display:flex;align-items:center;gap:10px;margin:16px 0 0 0;flex-wrap:wrap;}',
    '.tv-cm-chips .k{font-size:12px;font-weight:700;letter-spacing:.14em;color:#9aa6b4;margin-right:6px;}',
    '.tv-cm-chip{padding:7px 14px;border-radius:999px;background:#222b36;font-size:14px;font-weight:700;color:#e6edf5;}',
    '.tv-cm-chip.main{background:#F4C242;color:#111;}',
    '.tv-cm-clear{display:block;font-size:14px;font-weight:700;color:#F4C242 !important;padding:6px 10px;border-radius:8px;border:2px solid transparent;margin-left:6px;}',
    '#tv-cm .tv-cm-clear:focus{outline:3px solid #FFD700 !important;outline-offset:1px !important;}',
    '.tv-cm-h{display:flex;align-items:baseline;gap:12px;margin:22px 0 12px 2px;font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '.tv-cm-h span{font-size:14px;color:#9aa6b4;letter-spacing:0;font-weight:700;}',
    '.tv-cm-h .r{margin-left:auto;}',
    '.tv-cm-cap{margin:-6px 0 12px 2px;font-size:13px;color:#7d8998;}',
    '.tv-cm-top{display:grid;grid-template-columns:640px minmax(0,1fr);gap:30px;align-items:start;padding:6px;margin:0 -6px;}',
    '.tv-cm-hero{display:block;border-radius:10px;cursor:pointer;}',
    '.tv-cm-hi{position:relative;width:640px;height:360px;border-radius:10px;background:#222 center/cover no-repeat;}',
    '#tv-cm .tv-cm-hero:focus .tv-cm-hi{outline:3px solid #FFD700 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(255,215,0,.8) !important;}',
    '.tv-cm-big{position:absolute;left:20px;bottom:10px;font-size:96px;line-height:1;font-weight:900;color:#F4C242;text-shadow:0 2px 10px rgba(0,0,0,.9);}',
    '.tv-cm-ht{font-size:22px;font-weight:700;line-height:1.35em;margin-top:16px;color:#fff;max-width:640px;}',
    '.tv-cm-side{display:flex;flex-direction:column;gap:12px;}',
    '.tv-cm-s{display:flex;gap:16px;height:112px;background:#161b22;border-radius:8px;overflow:hidden;cursor:pointer;border:3px solid transparent;}',
    '#tv-cm .tv-cm-s:focus{outline:3px solid #FFD700 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(255,215,0,.8) !important;transform:scale(1.02) !important;position:relative;z-index:5;}',
    '.tv-cm-si{position:relative;width:200px;flex:0 0 200px;background:#222 center/cover no-repeat;}',
    '.tv-cm-sr{position:absolute;left:8px;bottom:4px;font-size:40px;line-height:1;font-weight:900;color:#F4C242;text-shadow:0 2px 8px rgba(0,0,0,.9);}',
    '.tv-cm-st{padding:10px 14px 0 0;font-size:15px;font-weight:700;line-height:1.35em;color:#fff;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}',
    '.tv-cm-track{display:flex;gap:24px;overflow-x:auto;padding:12px 10px;margin:0 -10px;scroll-padding:0 24px;scrollbar-width:none;}',
    '.tv-cm-track::-webkit-scrollbar{display:none;}',
    '.tv-cm-grid{display:grid;gap:24px;padding:6px;}',
    '.tv-cm-t{display:block;position:relative;flex:0 0 calc(25% - 18px);max-width:calc(25% - 18px);min-width:0;color:#fff !important;border-radius:8px;background:#1a1a1a;overflow:hidden;border:3px solid transparent;cursor:pointer;}',
    '.tv-cm-grid .tv-cm-t{flex:none;max-width:none;}',
    '#tv-cm .tv-cm-t:focus{outline:3px solid #FFD700 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(255,215,0,.8) !important;transform:scale(1.03) !important;position:relative;z-index:5;}',
    '.tv-cm-ti{position:relative;width:100%;aspect-ratio:16/9;min-height:165px;background:#222 center/cover no-repeat;border-radius:5px 5px 0 0;}',
    '.tv-cm-tt{padding:12px 14px;font-size:15px;font-weight:bold;line-height:1.45em;min-height:5.8em;max-height:6.2em;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}',
    '.tv-cm-rk{position:absolute;left:10px;bottom:6px;font-size:46px;line-height:1;font-weight:900;color:#F4C242;text-shadow:0 2px 8px rgba(0,0,0,.9);}',
    '.tv-cm-mv{position:absolute;right:8px;top:8px;background:rgba(10,13,18,.82);color:#e6edf5;font-size:12px;font-weight:700;padding:3px 7px;border-radius:4px;letter-spacing:.04em;}',
    '.tv-cm-pr{display:flex;gap:16px;padding:6px;margin:0 -6px;overflow-x:auto;scrollbar-width:none;scroll-padding:0 24px;}',
    '.tv-cm-pr::-webkit-scrollbar{display:none;}',
    '.tv-cm-p{flex:0 0 226px;height:104px;display:flex;flex-direction:column;justify-content:center;gap:6px;border-radius:10px;background:#161b22;border:2px solid #222b36;padding:12px 18px;color:#fff !important;cursor:pointer;overflow:hidden;}',
    '.tv-cm-grid .tv-cm-p{flex:none;}',
    '#tv-cm .tv-cm-p:focus{border-color:#161b22;outline:3px solid #FFD700 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(255,215,0,.8) !important;}',
    '.tv-cm-p b{font-size:20px;line-height:1.15;font-weight:900;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}',
    '.tv-cm-p i{font-style:normal;font-size:12px;font-weight:700;letter-spacing:.14em;color:#9aa6b4;}',
    '.tv-cm-all{align-items:center;text-align:center;font-size:20px;font-weight:800;color:#F4C242 !important;}',
    '.tv-cm-empty{display:flex;align-items:center;min-height:110px;padding:0 24px;border-radius:10px;border:2px dashed #2a323c;color:#9aa6b4;font-size:17px;line-height:1.4;}',
    // the menu's Top 10 (inside the shelf)
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  var root = document.createElement('div');
  root.id = 'tv-cm';
  root.className = 'notranslate';
  root.setAttribute('translate', 'no');
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';

  function metricLabel(m) { return m === 'fc' ? T('Most favorited', 'お気に入り数') : T('Most watched', '再生数'); }
  function windowLabel() {
    var now = new Date();
    if (CUR.w === 'm') { try { return now.toLocaleDateString(isJa() ? 'ja-JP' : 'en-US', { month: 'long', year: 'numeric' }); } catch (e) { return monthWords(now); } }
    if (CUR.w === 'y') return String(now.getFullYear());
    if (CUR.w === 'yr') return String(CUR.y || now.getFullYear());
    return T('All time', '全期間');
  }
  function link(cls, ck, cv, href, inner, extra) {
    return '<a class="' + cls + '" tabindex="0" data-ck="' + ck + '" data-cv="' + esc(cv) + '" href="' + esc(href) + '"' + (extra || '') + '>' + inner + '</a>';
  }
  function seg(items) {
    return '<div class="tv-cm-seg">' + items.map(function(it) { return link('tv-cm-sg' + (it.on ? ' on' : ''), 's', it.id, it.href, esc(it.label)); }).join('') + '</div>';
  }
  function bgStyle(it) { return it.bg ? 'background-image:url(' + esc(it.bg) + ');' : ''; }

  // ---- rank movement since the last visit (kept on this device, no request)
  function rankMoves(list) {
    var key = location.pathname + '?' + (KW || '') + '&' + CUR.m, all = {}, prev = null;
    try { all = JSON.parse(lsGet(RANK_KEY) || '{}') || {}; } catch (e) { all = {}; }
    if (!all._o) all._o = [];
    prev = all[key] || null;
    var cur = {}, mv = [];
    list.forEach(function(it, i) {
      cur[it.href] = i + 1;
      if (!prev) { mv.push(''); return; }
      var r = prev[it.href];
      if (r === undefined) mv.push(T('NEW', '新'));
      else if (r - (i + 1) > 0) mv.push('▲' + (r - (i + 1)));
      else if (r - (i + 1) < 0) mv.push('▼' + ((i + 1) - r));
      else mv.push('–');
    });
    all[key] = cur;
    all._o = all._o.filter(function(k) { return k !== key; }); all._o.push(key);
    while (all._o.length > 25) { delete all[all._o.shift()]; }
    lsSet(RANK_KEY, JSON.stringify(all));
    return mv;
  }

  function plate(p, alt) {
    var u = chartUrl({ m: CUR.m, w: 'a', s: p.n, k: p.k });
    return '<a class="tv-cm-p" tabindex="0" data-ck="p" data-cv="' + esc(p.n) + '" data-alt="' + esc(chartUrl({ m: CUR.m === 'fc' ? 'pc' : 'fc', w: 'a', s: p.n, k: p.k })) + '" href="' + esc(u) + '"><b>' + esc(p.n) + '</b><i>' + esc(alt) + '</i></a>';
  }
  function collections(full) {
    var groups = [[T('PLACES', '開催地'), T('PLACE', '開催地'), places()], [T('SHOWS', '大会'), T('SHOW', '大会'), shows()], [T('TITLES & MATCH TYPES', '王座・試合形式'), T('TITLE / MATCH TYPE', '王座・試合形式'), titles()]];
    var h = '';
    groups.forEach(function(g, gi) {
      if (!g[2].length) return;
      h += '<div class="tv-cm-h">' + esc(g[0]) + '</div>';
      if (full) {
        h += '<div class="tv-cm-grid" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;">' + g[2].map(function(p) { return plate(p, g[1]); }).join('') + '</div>';
      } else {
        h += '<div class="tv-cm-pr" data-row="p' + gi + '">' + g[2].slice(0, 5).map(function(p) { return plate(p, g[1]); }).join('') +
          (g[2].length > 5 ? link('tv-cm-p tv-cm-all', 'a', 'all' + gi, COLL_URL, esc(T('See all', 'すべて見る')) + ' ' + g[2].length + ' &rsaquo;') : '') + '</div>';
      }
    });
    return h;
  }

  var cards = [];
  function render() {
    var title = T('Community', 'みんなの動画'), body = '';
    if (MODE === 'coll') {
      title = T('Collections', 'コレクション');
      body = '<div class="tv-cm-cap">' + esc(T('OK: most watched here · Menu button: most favorited here', 'OK：再生数順 · メニューボタン：お気に入り数順')) + '</div>' + collections(true);
      root.innerHTML = '<div id="tv-cm-title"><span class="b"></span><span>' + esc(title) + '</span><span id="tv-cm-hint"></span></div><div id="tv-cm-scroll"><div id="tv-cm-in">' + body + '</div></div>';
      focusFirst();
      return;
    }
    var def = { m: CUR.m, w: CUR.w, y: CUR.y, s: CUR.s, k: CUR.k };
    function u(patch) { var o = {}; Object.keys(def).forEach(function(k) { o[k] = def[k]; }); Object.keys(patch).forEach(function(k) { o[k] = patch[k]; }); return chartUrl(o); }
    var thisYear = new Date().getFullYear();
    var bar = '<div class="tv-cm-bar">' +
      seg([{ id: 'pc', label: T('Most watched', '再生数'), on: CUR.m === 'pc', href: u({ m: 'pc' }) }, { id: 'fc', label: T('Most favorited', 'お気に入り数'), on: CUR.m === 'fc', href: u({ m: 'fc' }) }]) +
      seg([{ id: 'm', label: T('This month', '今月'), on: CUR.w === 'm', href: u({ w: 'm' }) }, { id: 'y', label: T('This year', '今年'), on: CUR.w === 'y', href: u({ w: 'y' }) },
        { id: 'a', label: T('All time', '全期間'), on: CUR.w === 'a', href: u({ w: 'a' }) }, { id: 'yr', label: T('Pick a year', '年を選ぶ'), on: CUR.w === 'yr', href: u({ w: 'yr', y: CUR.y || String(thisYear) }) }]) +
      link('tv-cm-pill', 'b', 'build', BUILD, esc(T('Build a chart', 'チャートを作る')) + ' &rsaquo;') + '</div>';
    var chips = '';
    if (CUR.s) {
      chips = '<div class="tv-cm-chips"><span class="k">' + esc(T('SHOWING', '表示中')) + '</span><span class="tv-cm-chip main">' + esc(CUR.s) + '</span><span class="tv-cm-chip">' + esc(metricLabel(CUR.m)) + '</span><span class="tv-cm-chip">' + esc(windowLabel()) + '</span>' +
        link('tv-cm-clear', 'c', 'clear', chartUrl({ m: CUR.m, w: 'a' }), esc(T('Clear all', 'すべて解除'))) + '</div>';
    }
    var years = '';
    if (CUR.w === 'yr') {
      years = '<div class="tv-cm-years" data-row="yr">';
      for (var y = thisYear; y >= 2011; y--) years += link('tv-cm-y' + (String(y) === String(CUR.y) ? ' on' : ''), 'y', String(y), u({ w: 'yr', y: String(y) }), String(y));
      years += '</div>';
    }
    var head = [metricLabel(CUR.m), CUR.s, windowLabel()].filter(function(x) { return x; }).join(' · ').toUpperCase();
    var n = Math.min(cards.length, 10);
    var res = '';
    if (!cards.length) {
      res = '<div class="tv-cm-empty">' + esc(CUR.w === 'm' ? T('No videos found for "' + KW + '". The site may write dates differently; MONTH_FMT in community.js sets how the month is searched.', '「' + KW + '」の動画は見つかりませんでした。') : T('No videos found for this chart.', 'この条件の動画は見つかりませんでした。')) + '</div>';
    } else {
      var mv = rankMoves(cards.slice(0, 10));
      var list = cards.slice(0, 10);
      if (n >= 3) {
        var h0 = list[0], side = list.slice(1, 4), more = list.slice(4);
        res += '<div class="tv-cm-top"><div>' + link('tv-cm-hero', 't', '0', h0.href, '<div class="tv-cm-hi" style="' + bgStyle(h0) + '"><span class="tv-cm-big">1</span>' + (mv[0] ? '<span class="tv-cm-mv">' + esc(mv[0]) + '</span>' : '') + '</div>') +
          '<div class="tv-cm-ht">' + esc(h0.title) + '</div></div><div class="tv-cm-side">' +
          side.map(function(it, i) { return link('tv-cm-s', 't', String(i + 1), it.href, '<div class="tv-cm-si" style="' + bgStyle(it) + '"><span class="tv-cm-sr">' + (i + 2) + '</span></div><div class="tv-cm-st">' + esc(it.title) + '</div>'); }).join('') + '</div></div>';
        if (more.length) {
          res += '<div class="tv-cm-h">' + esc(T('NEXT UP IN THE TOP 10', 'トップ10の続き')) + '<span>#5 – #' + n + '</span></div><div class="tv-cm-track" data-row="more">' +
            more.map(function(it, i) { return tileHtml(it, i + 4, mv[i + 4]); }).join('') + '</div>';
        }
      } else {
        res += '<div class="tv-cm-track" data-row="few">' + list.map(function(it, i) { return tileHtml(it, i, mv[i]); }).join('') + '</div>';
      }
    }
    body = bar + chips + years +
      '<div class="tv-cm-h">' + esc(head) + '<span>' + esc(T('Top 10', 'トップ10')) + (cards.length ? '' : '') + '</span></div>' +
      '<div class="tv-cm-cap">' + esc(T('Searching: ', '検索: ') + (KW || T('all videos', 'すべての動画'))) + '</div>' + res;
    if (!CUR.s) {
      body += '<div class="tv-cm-h" style="font-size:22px;letter-spacing:0;color:#fff;margin-top:34px;"><span style="width:12px;height:30px;background:#F4C242;display:inline-block;"></span>' + esc(T('Collections', 'コレクション')) + '<span>' + esc(T('Most watched in...', '再生数の多い動画')) + '</span>' +
        link('tv-cm-clear r', 'a', 'seeall', COLL_URL, esc(T('See all', 'すべて見る')) + ' &rsaquo;') + '</div>' + collections(false);
    }
    root.innerHTML = '<div id="tv-cm-title"><span class="b"></span><span>' + (CUR.s ? '<span class="sub">' + esc(title) + ' › </span>' + esc(CUR.s) : esc(title)) + '</span><span id="tv-cm-hint"></span></div><div id="tv-cm-scroll"><div id="tv-cm-in">' + body + '</div></div>';
    focusFirst();
  }
  function tileHtml(it, idx, mv) {
    return link('tv-cm-t', 't', String(idx), it.href, '<div class="tv-cm-ti" style="' + bgStyle(it) + '"><span class="tv-cm-rk">' + (idx + 1) + '</span>' + (mv ? '<span class="tv-cm-mv">' + esc(mv) + '</span>' : '') + '</div><div class="tv-cm-tt">' + esc(it.title) + '</div>');
  }
  function focusables() { return Array.prototype.slice.call(root.querySelectorAll('[data-ck]')); }
  function focusFirst() {
    var all = focusables(), want = ssGet(FOCUS_KEY), t = null, i;
    ssSet(FOCUS_KEY, null);
    if (want) for (i = 0; i < all.length; i++) if (all[i].getAttribute('data-ck') + '|' + all[i].getAttribute('data-cv') === want) { t = all[i]; break; }
    if (!t) for (i = 0; i < all.length; i++) if (all[i].getAttribute('data-ck') === 't' || all[i].getAttribute('data-ck') === 'p') { t = all[i]; break; }
    if (!t) t = all[0];
    if (t) focusEl(t, true);
  }
  function hint() {
    var el = document.getElementById('tv-cm-hint'), ae = document.activeElement, ck = ae && ae.getAttribute ? ae.getAttribute('data-ck') : '';
    if (!el) return;
    el.textContent = ck === 't' ? T('Menu button: add to Favorites or Watch Later', 'メニューボタン：お気に入り／あとで見る')
      : (ck === 'p' ? T('OK: most watched · Menu button: most favorited', 'OK：再生数 · メニュー：お気に入り数') : T('OK: select', 'OK：選択'));
  }
  function focusEl(el, first) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    if (!first) { try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
    hint();
  }
  function move(dir) {
    var list = focusables(), cur = document.activeElement;
    if (list.indexOf(cur) < 0) { focusEl(list[0]); return true; }
    var cr = cur.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2, cand = [];
    list.forEach(function(it) {
      if (it === cur) return;
      var r = it.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      var sameRow = Math.abs(dy) < Math.min(cr.height, r.height) * 0.75 + 4;
      if (dir === 'left' && sameRow && dx < -4) cand.push({ it: it, s: -dx * 10 + Math.abs(dy) });
      else if (dir === 'right' && sameRow && dx > 4) cand.push({ it: it, s: dx * 10 + Math.abs(dy) });
      else if (dir === 'up' && dy < -4 && !sameRow) cand.push({ it: it, s: Math.abs(dx) * 3 + Math.abs(dy) });
      else if (dir === 'down' && dy > 4 && !sameRow) cand.push({ it: it, s: Math.abs(dx) * 3 + Math.abs(dy) });
    });
    if (!cand.length) {
      if (dir === 'right') {
        var trk = cur.closest ? cur.closest('.tv-cm-track, .tv-cm-pr') : null;
        var firstT = trk ? trk.querySelector('[data-ck]') : null;
        if (firstT && firstT !== cur) { focusEl(firstT); try { trk.scrollLeft = 0; } catch (e) {} return true; }
      }
      return false;
    }
    cand.sort(function(a, b) { return a.s - b.s; });
    focusEl(cand[0].it);
    return true;
  }

  // Menu button: a video gets the Favorites / Watch Later choice; a collection opens its other chart.
  var prevMenuKey = window.__tvMenuKey || null;
  window.__tvMenuKey = function(arg) {
    var ae = document.activeElement, t = ae && ae.closest ? ae.closest('#tv-cm [data-ck]') : null;
    if (t && !document.getElementById('tv-fp-pop')) {
      var ck = t.getAttribute('data-ck');
      if (ck === 'p') { location.href = t.getAttribute('data-alt') || t.getAttribute('href'); return true; }
      if (ck === 't') {
        var idx = parseInt(t.getAttribute('data-cv'), 10), it = cards[idx];
        if (it && window.__tvFav && window.__tvFav.popShow) { window.__tvFav.popShow({ id: it.id, href: it.href, title: it.title, bg: it.bg, card: null }); return true; }
      }
    }
    return prevMenuKey ? prevMenuKey(arg) : false;
  };

  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-cm') || menuOpen() || document.getElementById('tv-fp-pop') || document.getElementById('tv-ev')) return;
    var k = e.keyCode, ae = document.activeElement;
    function stop() { e.preventDefault(); e.stopImmediatePropagation(); }
    var inside = ae && root.contains(ae) && ae.getAttribute && ae.getAttribute('data-ck');
    if (!inside) {
      if (k === 37 || k === 38 || k === 39 || k === 40) { stop(); var f = focusables()[0]; if (f) focusEl(f); else if (k === 37 && window.__tvOpenMenu) window.__tvOpenMenu(); }
      return;
    }
    if (k === 37) { stop(); if (!move('left') && window.__tvOpenMenu) window.__tvOpenMenu(); }
    else if (k === 39) { stop(); move('right'); }
    else if (k === 38) { stop(); if (!move('up')) { var sc = root.querySelector('#tv-cm-scroll'); if (sc) sc.scrollTop = 0; } }
    else if (k === 40) { stop(); move('down'); }
  }, true);
  root.addEventListener('click', function(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-ck]') : null;
    if (t) { var ck = t.getAttribute('data-ck'); if (ck === 's' || ck === 'y' || ck === 'c' || ck === 'b') ssSet(FOCUS_KEY, ck + '|' + t.getAttribute('data-cv')); }
  }, true);
  document.addEventListener('focusin', function() { if (document.getElementById('tv-cm')) hint(); }, true);

  // The results of this very page (the site's own sorted search), read once the list has drawn.
  var tries = 0, last = -1;
  var tm = setInterval(function() {
    tries++;
    var items = [];
    try { items = readCards(document, root); } catch (e) {}
    if (MODE === 'coll' || (items.length && items.length === last) || (!items.length && tries > 10) || tries > 24) {
      clearInterval(tm);
      cards = items;
      if (MODE === '1' && !CUR.s && CUR.w === 'a' && CUR.m === 'pc' && items.length) saveTop(items);
      render();
      return;
    }
    last = items.length;
  }, 400);
})();
