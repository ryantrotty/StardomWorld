(function(){
  // My Favorites: the app's own favorites (wrestlers, one faction, watch later) kept on this device, the
  // Menu-button choices on cards, shelves and the favorites page, and the My Favorites page itself
  // (the My page address carrying tvfav=1 / later / wrestlers). Nothing here calls the site.
  if (window.__tvFav) return;
  var H = window.AndroidHost || {};
  var KEY = 'tvFavV1', REM_KEY = 'tvSchedRemV1';
  var BASE = 'https://www.stardom-world.com';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function toast(m) { try { if (H.logDebug) H.logDebug(m); } catch (e) {} }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }

  // ---- store: { w: [{k, n}], f: 'faction id' or '', later: [{id, href, title, bg}] }
  function load() {
    var d = {};
    try { d = JSON.parse(lsGet(KEY) || '{}') || {}; } catch (e) { d = {}; }
    if (!Array.isArray(d.w)) d.w = [];
    if (!Array.isArray(d.later)) d.later = [];
    if (typeof d.f !== 'string') d.f = '';
    return d;
  }
  function save(d) { lsSet(KEY, JSON.stringify(d)); }

  // ---- names: search keyword (lower case) -> English name, from the faction list and the past wrestlers
  var nameMap = null, facList = null;
  function factions() {
    if (facList) return facList;
    facList = [];
    try { facList = (JSON.parse(H.factionsJson()).factions || []); } catch (e) {}
    return facList;
  }
  function names() {
    if (nameMap) return nameMap;
    nameMap = {};
    factions().forEach(function(f) { (f.members || []).forEach(function(m) { if (m && m.name) nameMap[String(m.search || m.name).toLowerCase()] = m.name; }); });
    try { (JSON.parse(H.pastWrestlersJson()).past || []).forEach(function(m) { if (m && m.name) nameMap[String(m.search || m.name).toLowerCase()] = m.name; }); } catch (e) {}
    return nameMap;
  }
  function nameFor(k) { return names()[String(k).toLowerCase()] || k; }
  function facById(id) { var l = factions(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function wrestlerPath(k) { return '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(k); }
  function keywordOf(href) {
    try { return new URL(href, location.href).searchParams.get('q[keyword]') || ''; } catch (e) { return ''; }
  }
  function facIdOf(href) {
    try { return new URL(href, location.href).searchParams.get('tvfaction') || ''; } catch (e) { return ''; }
  }
  function hasW(d, k) { for (var i = 0; i < d.w.length; i++) if (String(d.w[i].k).toLowerCase() === String(k).toLowerCase()) return i; return -1; }

  // ---- changes (each one shows a toast)
  function toggleWrestler(k) {
    var d = load(), i = hasW(d, k), n = nameFor(k);
    if (i >= 0) { d.w.splice(i, 1); save(d); toast(T('Removed ' + n + ' from My Favorites', n + ' をお気に入りから削除しました')); }
    else { d.w.push({ k: k, n: n }); save(d); toast(T('★ ' + n + ' added to My Favorites', '★ ' + n + ' をお気に入りに追加しました')); }
    return i < 0;
  }
  function setFaction(id) {
    var d = load(), f = facById(id), n = f ? f.name : id;
    if (d.f === id) { d.f = ''; save(d); toast(T(n + ' is no longer your favorite faction', n + ' をお気に入りユニットから外しました')); return false; }
    d.f = id; save(d);
    toast(T('★ ' + n + ' is now your favorite faction', '★ ' + n + ' をお気に入りユニットにしました'));
    return true;
  }
  function laterIdx(d, href) { var p = pathOf(href); for (var i = 0; i < d.later.length; i++) if (pathOf(d.later[i].href) === p) return i; return -1; }
  function pathOf(h) { try { return new URL(h, location.href).pathname; } catch (e) { return String(h); } }
  function toggleLater(info) {
    var d = load(), i = laterIdx(d, info.href);
    if (i >= 0) { d.later.splice(i, 1); save(d); toast(T('Removed from Watch Later', 'あとで見るから削除しました')); return false; }
    d.later.unshift({ id: info.id, href: info.href, title: info.title, bg: info.bg });
    save(d);
    toast(T('★ Added to Watch Later', '★ あとで見るに追加しました'));
    return true;
  }
  function removeReminder(id) {
    var r = {};
    try { r = JSON.parse(lsGet(REM_KEY) || '{}') || {}; } catch (e) { r = {}; }
    delete r[id];
    lsSet(REM_KEY, JSON.stringify(r));
    toast(T('Reminder removed', '通知を削除しました'));
  }

  // ---- shelves: the Wrestlers and Factions lists get a star on favorites; Menu on a row adds or removes it
  var st = document.createElement('style');
  st.textContent = [
    '#tv-sm-shelf .tv-sm-fi.tv-fav-on::before{content:"\\2605  ";color:#F4C242;}',
    '#tv-sm-shelf .tv-shl-hint{margin:10px 6px 2px 6px;padding-top:8px;border-top:1px solid #2a323c;font-size:13px;color:#9aa6b4;font-weight:600;}',
    '#tv-fp-pop{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483600;width:560px;max-width:90vw;box-sizing:border-box;background:#0f161e;border:2px solid #2a323c;border-radius:14px;padding:18px 20px;color:#fff;font-family:Arial,Helvetica,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.7);}',
    '#tv-fp-pop, #tv-fp-pop *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;}',
    '#tv-fp-pop .tv-fpp-t{font-size:15px;color:#9aa6b4;margin-bottom:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-fp-pop .tv-fpb{display:block;box-sizing:border-box;padding:12px 16px;margin:6px 0;border-radius:10px;border:3px solid #2a323c;background:#161f2a;font-size:20px;font-weight:700;color:#fff;outline:none;cursor:pointer;}',
    '#tv-fp-pop .tv-fpb:focus{border-color:#F4C242;background:#172029;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  function decorate(shelf, key) {
    if (!shelf) return;
    if (key === 'current' || key === 'factions') {
      Array.prototype.forEach.call(shelf.querySelectorAll('.tv-sm-fi[data-go]'), function(a) {
        var g = a.getAttribute('data-go') || '';
        var fid = facIdOf(g);
        if (fid) { a.setAttribute('data-favf', fid); return; }
        var k = keywordOf(g);
        if (k) a.setAttribute('data-favw', k);
      });
      if (!shelf.querySelector('.tv-shl-hint')) {
        var hint = document.createElement('div');
        hint.className = 'tv-shl-hint';
        hint.textContent = key === 'factions'
          ? T('Menu button on a wrestler adds or removes a favorite. On a faction name it picks your one favorite faction.', 'メニューボタン：選手はお気に入りの追加・削除、ユニット名はお気に入りユニットの選択')
          : T('Menu button on a wrestler adds or removes a favorite.', 'メニューボタン：お気に入りの追加・削除');
        shelf.appendChild(hint);
      }
    }
    mark(shelf);
  }
  function mark(shelf) {
    shelf = shelf || document.getElementById('tv-sm-shelf');
    if (!shelf) return;
    var d = load();
    Array.prototype.forEach.call(shelf.querySelectorAll('[data-favw],[data-favf]'), function(a) {
      var on = a.hasAttribute('data-favw') ? hasW(d, a.getAttribute('data-favw')) >= 0 : d.f === a.getAttribute('data-favf');
      a.classList.toggle('tv-fav-on', !!on);
    });
  }

  // ---- video cards: title, link and thumbnail of the card the remote is on
  function clean(t) {
    return (t || '').replace(/月額見放題/g, '')
      .replace(/Unlimited viewing for a monthly fee/gi, '')
      .replace(/Monthly subscription available/gi, '')
      .replace(/Monthly subscription/gi, '')
      .replace(/(Viewing date|視聴日時|視聴日)\s*[:：]?\s*[0-9.\/\- :]*/gi, '')
      .replace(/\s+/g, ' ').trim();
  }
  function cardInfo(cands) {
    for (var j = 0; j < cands.length; j++) {
      var el = cands[j];
      if (!el || typeof el.closest !== 'function') continue;
      if (el.closest('.slick-cloned')) continue;
      var box = el.closest('article, .content-list-item, .tile-inner, .slick-slide, .content-thumbnail-box, .content-thumbnail, .tv-card, .box-content, .tv-fp-t, .tv-rc') || el;
      var link = box.querySelector('a[href*="/contents/"], a[href*="/set/"]') || el.closest('a[href*="/contents/"], a[href*="/set/"]') || el.querySelector('a[href*="/contents/"], a[href*="/set/"]');
      if (!link) continue;
      var href = absUrl(link.getAttribute('href') || link.href || '');
      var m = href.match(/(?:contents|set)\/(\d+)/);
      if (!m) continue;
      var bg = '';
      var th = box.querySelector('[style*="background-image"]') || (box.style && box.style.backgroundImage ? box : null);
      if (th) { var mm = (th.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/); if (mm && mm[1]) bg = mm[1]; }
      if (!bg) {
        var img = box.querySelector('img');
        if (img) bg = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || img.getAttribute('src') || '';
      }
      if (bg.indexOf('data:') === 0) bg = '';
      if (bg) bg = absUrl(bg);
      var tEl = box.querySelector('h3, h4, .ttl-xs, .content-title, .content-info-box, .tv-rc-t, .tv-fp-tt');
      var title = clean(tEl ? tEl.textContent : (link.getAttribute('title') || link.getAttribute('aria-label') || box.textContent)) || 'Stardom World Video';
      return { id: m[1], href: href, title: title, bg: bg, card: box };
    }
    return null;
  }

  // ---- the two-choice pop-up on a video card: Favorites (the site's list) or Watch Later (this app's list)
  var pop = null, popPrev = null, popFocus = null, popClose0 = null, popInfo = null;
  function popHide() {
    if (!pop) return;
    if (pop.parentNode) pop.parentNode.removeChild(pop);
    pop = null;
    window.removeEventListener('keydown', popKey, true);
    if (popClose0) window.__tvMenuClose = popClose0;
    popClose0 = null;
    try { if (H.setSideMenuOpen) H.setSideMenuOpen(false); } catch (e) {}
    var f = popFocus; popFocus = null;
    if (f && f.isConnected) { try { f.focus({ preventScroll: true }); } catch (e) { try { f.focus(); } catch (e2) {} } }
  }
  function popBtns() { return pop ? Array.prototype.slice.call(pop.querySelectorAll('.tv-fpb')) : []; }
  function popAct(b) {
    var act = b.getAttribute('data-act'), info = popInfo;
    popHide();
    if (!info) return;
    if (act === 'later') { toggleLater(info); if (window.__tvFpRefresh) window.__tvFpRefresh(); }
    else if (act === 'fav') { try { if (window.__tvToggleCardFavorite) window.__tvToggleCardFavorite(info.card); } catch (e) {} }
  }
  function popKey(e) {
    var k = e.keyCode, bs = popBtns(), i = bs.indexOf(document.activeElement);
    function stop() { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
    if (k === 27 || k === 4 || k === 8) { stop(); popHide(); return; }
    if (k === 38 || k === 37) { stop(); if (bs.length) bs[Math.max(0, i - 1)].focus(); return; }
    if (k === 40 || k === 39) { stop(); if (bs.length) bs[Math.min(bs.length - 1, i + 1)].focus(); return; }
    if (k === 13 || k === 23 || k === 32) { stop(); if (i >= 0) popAct(bs[i]); return; }
  }
  function popShow(info) {
    popHide();
    popInfo = info;
    var d = load(), inLater = laterIdx(d, info.href) >= 0;
    var isFav = !!(info.card && (info.card.classList.contains('is-favorite') || (info.card.dataset && info.card.dataset.tvFav === 'true')));
    pop = document.createElement('div');
    pop.id = 'tv-fp-pop';
    pop.className = 'notranslate';
    pop.setAttribute('translate', 'no');
    pop.innerHTML = '<div class="tv-fpp-t">' + esc(info.title) + '</div>' +
      '<a class="tv-fpb" tabindex="0" data-act="fav">' + esc(isFav ? T('Remove from Favorites', 'お気に入りから削除') : T('Add to Favorites', 'お気に入りに追加')) + '</a>' +
      '<a class="tv-fpb" tabindex="0" data-act="later">' + esc(inLater ? T('Remove from Watch Later', 'あとで見るから削除') : T('Add to Watch Later', 'あとで見るに追加')) + '</a>';
    (document.body || document.documentElement).appendChild(pop);
    popFocus = document.activeElement;
    popClose0 = window.__tvMenuClose || null;
    window.__tvMenuClose = function() { popHide(); return true; };
    try { if (H.setSideMenuOpen) H.setSideMenuOpen(true); } catch (e) {}
    window.addEventListener('keydown', popKey, true);
    Array.prototype.forEach.call(pop.querySelectorAll('.tv-fpb'), function(b) {
      b.addEventListener('click', function(ev) { ev.preventDefault(); ev.stopPropagation(); popAct(b); });
    });
    var first = pop.querySelector('.tv-fpb');
    if (first) first.focus();
  }

  // ---- the Menu button
  function candidates(arg) {
    var out = [];
    if (Array.isArray(arg) || (arg && typeof arg.length === 'number' && !(arg instanceof HTMLElement))) {
      for (var i = 0; i < arg.length; i++) if (arg[i]) out.push(arg[i]);
    } else if (arg) out.push(arg);
    if (document.activeElement && out.indexOf(document.activeElement) === -1) out.push(document.activeElement);
    return out;
  }
  function menuKey(arg) {
    if (pop) return true;
    var c = candidates(arg), i, el, t;
    for (i = 0; i < c.length; i++) {
      el = c[i];
      if (!el || typeof el.closest !== 'function') continue;
      // a wrestler or faction in the menu's shelf
      t = el.closest('[data-favw]');
      if (t && t.closest('#tv-sm-shelf')) { toggleWrestler(t.getAttribute('data-favw')); mark(); return true; }
      t = el.closest('[data-favf]');
      if (t && t.closest('#tv-sm-shelf')) { setFaction(t.getAttribute('data-favf')); mark(); return true; }
      // on the My Favorites page
      t = el.closest('#tv-fp [data-fk]');
      if (t) {
        var fk = t.getAttribute('data-fk'), fv = t.getAttribute('data-fv') || '';
        if (fk === 'w') { var d = load(), ix = hasW(d, fv); if (ix >= 0) { d.w.splice(ix, 1); save(d); toast(T('Removed ' + nameFor(fv) + ' from My Favorites', nameFor(fv) + ' をお気に入りから削除しました')); } }
        else if (fk === 'f') { var d2 = load(); if (d2.f) { var fo = facById(d2.f); d2.f = ''; save(d2); toast(T((fo ? fo.name : 'Faction') + ' removed from My Favorites', (fo ? fo.name : 'ユニット') + ' をお気に入りから削除しました')); } }
        else if (fk === 'l') { var d3 = load(), li = parseInt(fv, 10); if (d3.later[li]) { d3.later.splice(li, 1); save(d3); toast(T('Removed from Watch Later', 'あとで見るから削除しました')); } }
        else if (fk === 'r') { removeReminder(fv); }
        else if (fk === 'h') { var hi = cardInfo([t]); if (hi) popShow(hi); return true; }
        else return true;
        if (window.__tvFpRefresh) window.__tvFpRefresh(true);
        return true;
      }
    }
    // a video card anywhere else
    var info = cardInfo(c);
    if (info) { popShow(info); return true; }
    return window.__tvToggleCardFavorite ? window.__tvToggleCardFavorite(arg) : false;
  }

  window.__tvFav = { decorate: decorate, mark: mark, load: load, toggleWrestler: toggleWrestler, setFaction: setFaction };
  window.__tvMenuKey = menuKey;

  // =============================================================== the My Favorites page
  var P = null;
  try { if (location.pathname === '/mypage') P = new URLSearchParams(location.search).get('tvfav'); } catch (e) { P = null; }
  if (!P) return;
  var MODE = P === 'later' ? 'later' : (P === 'wrestlers' ? 'wrestlers' : 'home');

  var HISTORY_RE = /viewing history|視聴履歴|閲覧履歴|履歴/i;
  var hist = [], histDone = false;
  function readHistory() {
    var heads = Array.prototype.slice.call(document.querySelectorAll('h1, h2, h3, h4, h5, .ttl-md, .ttl-lg'));
    var hi = -1;
    for (var i = 0; i < heads.length; i++) {
      if (root && root.contains(heads[i])) continue;
      if (HISTORY_RE.test(heads[i].textContent || '')) { hi = i; break; }
    }
    if (hi < 0) return [];
    var head = heads[hi], nextHead = null;
    for (var j = hi + 1; j < heads.length; j++) {
      if (root && root.contains(heads[j])) continue;
      if (!heads[j].closest('.content-list-item, article')) { nextHead = heads[j]; break; }
    }
    var out = [], seen = {};
    Array.prototype.forEach.call(document.querySelectorAll('.content-list-item, article'), function(item) {
      if (root && root.contains(item)) return;
      if (item.closest('.slick-cloned')) return;
      if (!(head.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      if (nextHead && !(nextHead.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_PRECEDING)) return;
      var inf = cardInfo([item]);
      if (!inf || seen[inf.href]) return;
      seen[inf.href] = true;
      out.push({ href: inf.href, title: inf.title, bg: inf.bg });
    });
    return out;
  }

  var photoCache = {}, logoCache = {};
  function photo(k) {
    var key = String(k).toLowerCase();
    if (photoCache[key] !== undefined) return photoCache[key];
    var u = '';
    try { if (H.wrestlerPhoto) u = H.wrestlerPhoto(k) || ''; } catch (e) {}
    photoCache[key] = u;
    return u;
  }
  function logo(id) {
    if (logoCache[id] !== undefined) return logoCache[id];
    var u = '';
    try { if (H.factionLogo) u = H.factionLogo(id) || ''; } catch (e) {}
    logoCache[id] = u;
    return u;
  }
  function initials(n) {
    var p = String(n).replace(/[^A-Za-zÀ-ɏ぀-ヿ㐀-鿿 ]/g, '').trim().split(/\s+/);
    return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }
  var HUES = [330, 200, 45, 100, 270, 15, 170];
  function hueFor(n) { var s = 0; for (var i = 0; i < n.length; i++) s += n.charCodeAt(i); return HUES[s % HUES.length]; }

  function events() {
    var out = [];
    try {
      (JSON.parse(H.scheduleJson()).events || []).forEach(function(e) {
        var t = Date.parse(e.start);
        if (isNaN(t) || e.own === false) return;
        e._t = t; out.push(e);
      });
    } catch (e) {}
    return out;
  }
  function fmtWhen(ms) {
    var loc = isJa() ? 'ja-JP' : undefined, day = '', tm = '', z = '';
    try { day = new Date(ms).toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) {}
    try { tm = new Date(ms).toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' }); } catch (e) {}
    try { new Intl.DateTimeFormat(loc, { hour: 'numeric', timeZoneName: 'short' }).formatToParts(new Date(ms)).forEach(function(p) { if (p.type === 'timeZoneName') z = p.value; }); } catch (e) {}
    return (day + ' · ' + tm + (z ? ' ' + z : '')).toUpperCase();
  }
  function offText(m) {
    if (m >= 1440) return T('Day before', '前日');
    if (m >= 60) return (m / 60) + T(' h before', '時間前');
    return m + T(' min before', '分前');
  }
  function reminders() {
    var r = {};
    try { r = JSON.parse(lsGet(REM_KEY) || '{}') || {}; } catch (e) { r = {}; }
    var now = Date.now(), out = [];
    events().forEach(function(e) { if (r[e.id] !== undefined && e._t + 3 * 3600000 > now) out.push({ e: e, off: r[e.id] }); });
    out.sort(function(a, b) { return a.e._t - b.e._t; });
    return out;
  }

  var css = document.createElement('style');
  css.textContent = [
    '#tv-fp{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B0F14;color:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-fp, #tv-fp *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;box-sizing:border-box;}',
    '#tv-fp-title{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:22px 40px 8px 40px;font-size:36px;}',
    '#tv-fp-title .tv-fp-bar{flex:0 0 auto;width:12px;height:44px;background:#F4C242;}',
    '#tv-fp-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 40px 70px 40px;scrollbar-width:none;}',
    '#tv-fp-scroll::-webkit-scrollbar{display:none;}',
    '.tv-fp-h{display:flex;align-items:baseline;gap:12px;margin:18px 0 8px 2px;font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '.tv-fp-h span{font-size:15px;color:#9aa6b4;letter-spacing:0;font-weight:700;}',
    '.tv-fp-track{display:flex;gap:24px;overflow-x:auto;padding:6px 6px 10px 6px;margin:0 -6px;scrollbar-width:none;}',
    '.tv-fp-track::-webkit-scrollbar{display:none;}',
    '.tv-fp-grid{display:grid;gap:24px;padding:6px;}',
    '.tv-fp-t{display:flex;flex-direction:column;flex:0 0 calc((100% - 72px) / 4);min-width:0;text-decoration:none !important;color:#fff !important;border-radius:8px;background:#172029;border:3px solid transparent;outline:none !important;cursor:pointer;}',
    '.tv-fp-t:focus, .tv-fp-card:focus, .tv-fp-stk:focus, .tv-fp-tk:focus{border-color:#F4C242 !important;box-shadow:0 0 0 3px rgba(244,194,66,.35) !important;}',
    '.tv-fp-img{width:100%;aspect-ratio:16/9;background:#222 center/cover no-repeat;border-radius:5px 5px 0 0;}',
    '.tv-fp-tt{padding:10px 12px 12px 12px;font-size:17px;line-height:1.3;max-height:3.9em;overflow:hidden;}',
    '.tv-fp-all{align-items:center;justify-content:center;border-color:#F4C242;background:#161f2a;font-size:22px;font-weight:800;aspect-ratio:auto;min-height:150px;}',
    '.tv-fp-all b{display:block;font-size:34px;color:#F4C242;margin-top:2px;}',
    '.tv-fp-empty{flex:1 1 auto;display:flex;align-items:center;min-height:90px;padding:0 22px;border-radius:10px;border:2px dashed #2a323c;color:#9aa6b4;font-size:17px;line-height:1.4;outline:none !important;}',
    '.tv-fp-empty:focus{border-color:#F4C242;}',
    '.tv-fp-card{display:flex;flex-direction:column;flex:0 0 158px;text-decoration:none !important;color:#fff !important;border-radius:12px;padding:4px;background:linear-gradient(135deg,#ff9ad5,#9ad1ff,#fff39a,#b6ffb0,#d6a8ff);border:3px solid transparent;outline:none !important;cursor:pointer;}',
    '.tv-fp-ph{position:relative;width:100%;aspect-ratio:3/4;border-radius:8px;overflow:hidden;background:#fff center top/cover no-repeat;}',
    '.tv-fp-mono{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:54px;font-weight:800;color:#fff;}',
    '.tv-fp-cn{position:absolute;left:0;right:0;bottom:0;padding:22px 8px 7px 8px;background:linear-gradient(0deg,rgba(0,0,0,.88),rgba(0,0,0,0));font-size:16px;font-weight:700;line-height:1.15;}',
    '.tv-fp-top{display:flex;gap:26px;align-items:center;padding:6px;}',
    '.tv-fp-stk{flex:0 0 150px;height:150px;border-radius:50%;background:#fff;border:5px solid #F4C242;padding:14px;display:flex;align-items:center;justify-content:center;text-align:center;color:#111 !important;font-weight:800;font-size:20px;line-height:1.1;text-decoration:none !important;outline:none !important;transform:rotate(-5deg);box-shadow:0 8px 16px rgba(0,0,0,.6);}',
    '.tv-fp-stk img{width:100%;height:100%;object-fit:contain;}',
    '.tv-fp-stk-e{flex:0 0 150px;height:150px;border-radius:50%;border:3px dashed #2a323c;display:flex;align-items:center;justify-content:center;text-align:center;color:#9aa6b4;font-size:14px;padding:16px;outline:none !important;}',
    '.tv-fp-stk-e:focus{border-color:#F4C242;}',
    '.tv-fp-tks{flex:1 1 0;min-width:0;display:flex;gap:22px;}',
    '.tv-fp-tk{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:14px 22px;border-radius:10px;background:#f3e2b8;color:#2a1c10 !important;text-decoration:none !important;border:3px solid transparent;outline:none !important;cursor:pointer;min-height:98px;}',
    '.tv-fp-tk .a{font-size:13px;font-weight:800;color:#7a5a36;letter-spacing:.5px;}',
    '.tv-fp-tk .b{font-size:23px;font-weight:800;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tv-fp-tk .c{font-size:14px;color:#7a5a36;}',
    '#tv-fp-hint{position:absolute;left:0;right:0;bottom:0;padding:10px 40px 14px 40px;background:linear-gradient(0deg,#0B0F14 70%,rgba(11,15,20,0));font-size:16px;color:#9aa6b4;pointer-events:none;min-height:44px;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  var root = document.createElement('div');
  root.id = 'tv-fp';
  root.className = 'notranslate';
  root.setAttribute('translate', 'no');
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';

  function tileHtml(it, fk, idx) {
    return '<a class="tv-fp-t" tabindex="0" data-fk="' + fk + '" data-fv="' + idx + '" href="' + esc(it.href) + '"><div class="tv-fp-img" style="' + (it.bg ? 'background-image:url(' + esc(it.bg) + ');' : '') + '"></div><div class="tv-fp-tt">' + esc(it.title) + '</div></a>';
  }
  function cardHtml(w) {
    var u = photo(w.k), n = w.n || nameFor(w.k);
    var inner = u ? '<div class="tv-fp-ph" style="background-image:url(' + u + ');"><div class="tv-fp-cn">' + esc(n) + '</div></div>'
      : '<div class="tv-fp-ph" style="background:linear-gradient(160deg,hsl(' + hueFor(n) + ',70%,45%),hsl(' + ((hueFor(n) + 40) % 360) + ',60%,25%));"><div class="tv-fp-mono">' + esc(initials(n)) + '</div><div class="tv-fp-cn">' + esc(n) + '</div></div>';
    return '<a class="tv-fp-card" tabindex="0" data-fk="w" data-fv="' + esc(w.k) + '" href="' + esc(absUrl(wrestlerPath(w.k))) + '">' + inner + '</a>';
  }
  function allTile(href, n) {
    return '<a class="tv-fp-t tv-fp-all" tabindex="0" data-fk="a" href="' + esc(href) + '"><span style="text-align:center">' + esc(T('View All', 'すべて見る')) + '<b>' + n + ' &rsaquo;</b></span></a>';
  }
  function emptyHtml(msg) { return '<div class="tv-fp-empty" tabindex="0" data-fk="e">' + esc(msg) + '</div>'; }
  function head(label, n) { return '<div class="tv-fp-h">' + esc(label) + (n !== '' ? '<span>' + n + '</span>' : '') + '</div>'; }

  function topRow(d) {
    var fac = d.f ? facById(d.f) : null, h = '<div class="tv-fp-top">';
    if (fac) {
      var lg = logo(fac.id);
      var page = (fac.members && fac.members.length) ? '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(fac.members[0].search) + '&tvfaction=' + encodeURIComponent(fac.id) : '/';
      h += '<a class="tv-fp-stk" tabindex="0" data-fk="f" data-fv="' + esc(fac.id) + '" href="' + esc(absUrl(page)) + '">' + (lg ? '<img src="' + lg + '" alt="">' : esc(fac.name)) + '</a>';
    } else {
      h += '<div class="tv-fp-stk-e" tabindex="0" data-fk="e">' + esc(T('Pick your faction in the menu: Factions, then the Menu button', 'メニューのユニットで選んでください')) + '</div>';
    }
    var rs = reminders().slice(0, 2);
    h += '<div class="tv-fp-tks">';
    if (rs.length) {
      rs.forEach(function(r) {
        h += '<a class="tv-fp-tk" tabindex="0" data-fk="r" data-fv="' + esc(r.e.id) + '" href="#"><div class="a">' + esc(fmtWhen(r.e._t)) + '</div><div class="b">' + esc(r.e.short || r.e.title) + '</div><div class="c">🔔 ' + esc(offText(r.off)) + '</div></a>';
      });
    } else h += emptyHtml(T('No reminders yet. Open a show under Shows and choose Remind me.', 'リマインダーはまだありません'));
    return h + '</div></div>';
  }

  function render(keep) {
    var d = load(), h = '', title = T('My Favorites', 'お気に入り');
    var prev = document.activeElement, pk = prev && prev.getAttribute ? prev.getAttribute('data-fk') : null, pv = prev && prev.getAttribute ? prev.getAttribute('data-fv') : null;
    var pidx = -1, pscroll = 0;
    var sc = root.querySelector('#tv-fp-scroll');
    if (sc) pscroll = sc.scrollTop;
    if (prev && root.contains(prev)) pidx = Array.prototype.indexOf.call(root.querySelectorAll('[data-fk]'), prev);
    var body = '';
    if (MODE === 'home') {
      body += topRow(d);
      body += head(T('FAVORITE WRESTLERS', 'お気に入り選手'), d.w.length);
      body += '<div class="tv-fp-track" data-row="w">' + (d.w.length ? d.w.slice(0, 14).map(cardHtml).join('') + (d.w.length > 14 ? allTile(absUrl('/mypage?tvfav=wrestlers'), d.w.length) : '') : emptyHtml(T('No favorite wrestlers yet. Open Wrestlers or Factions in the menu, highlight a name and press the Menu button.', '選手はまだありません。メニューの選手から選び、メニューボタンを押してください。'))) + '</div>';
      body += head(T('WATCH LATER', 'あとで見る'), d.later.length);
      body += '<div class="tv-fp-track" data-row="l">' + (d.later.length ? d.later.slice(0, 12).map(function(it, i) { return tileHtml(it, 'l', i); }).join('') + (d.later.length > 12 ? allTile(absUrl('/mypage?tvfav=later'), d.later.length) : '') : emptyHtml(T('Nothing saved yet. Press the Menu button on a video and choose Add to Watch Later.', '保存した動画はありません。動画でメニューボタンを押してください。'))) + '</div>';
      body += head(T('RECENTLY WATCHED', '最近視聴した動画'), hist.length ? hist.length : '');
      body += '<div class="tv-fp-track" data-row="h">' + (hist.length ? hist.slice(0, 12).map(function(it, i) { return tileHtml(it, 'h', i); }).join('') + allTile(absUrl('/mypage?tvrecent=1'), hist.length) : emptyHtml(histDone ? T('Nothing here yet (log in to see your history).', 'まだありません（ログインが必要です）') : T('Loading...', '読み込み中...'))) + '</div>';
    } else if (MODE === 'later') {
      title = T('Watch Later', 'あとで見る');
      body += d.later.length ? '<div class="tv-fp-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));">' + d.later.map(function(it, i) { return tileHtml(it, 'l', i).replace('class="tv-fp-t"', 'class="tv-fp-t" style="flex:none"'); }).join('') + '</div>' : emptyHtml(T('Nothing saved yet.', 'まだありません'));
    } else {
      title = T('Favorite Wrestlers', 'お気に入り選手');
      body += d.w.length ? '<div class="tv-fp-grid" style="grid-template-columns:repeat(6,minmax(0,1fr));">' + d.w.map(cardHtml).join('') + '</div>' : emptyHtml(T('No favorite wrestlers yet.', 'まだありません'));
    }
    root.innerHTML = '<div id="tv-fp-title"><span class="tv-fp-bar"></span><span>' + esc(title) + '</span></div><div id="tv-fp-scroll">' + body + '</div><div id="tv-fp-hint"></div>';
    sc = root.querySelector('#tv-fp-scroll');
    if (keep && sc) sc.scrollTop = pscroll;
    var all = focusables(), target = null;
    if (keep && pk) {
      for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-fk') === pk && all[i].getAttribute('data-fv') === pv) { target = all[i]; break; }
      if (!target && pidx >= 0) target = all[Math.min(pidx, all.length - 1)];
      if (!target) target = firstRealTarget(all);
    } else if (!keep) {
      target = firstRealTarget(all);
    }
    if (target) { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }
    hint();
  }
  function firstRealTarget(all) {
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-fk') === 'w' || all[i].getAttribute('data-fk') === 'l' || all[i].getAttribute('data-fk') === 'f') return all[i];
    return all[0] || null;
  }
  function focusables() { return Array.prototype.slice.call(root.querySelectorAll('[data-fk]')); }
  function hint() {
    var el = document.getElementById('tv-fp-hint'), ae = document.activeElement, fk = ae && ae.getAttribute ? ae.getAttribute('data-fk') : '';
    if (!el) return;
    el.textContent = (fk === 'w' || fk === 'f' || fk === 'l' || fk === 'r') ? T('Menu button: remove', 'メニューボタン：削除')
      : (fk === 'h' ? T('Menu button: add to Favorites or Watch Later', 'メニューボタン：お気に入り／あとで見る') : '');
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
    hint();
  }
  function move(dir) {
    var list = focusables(), cur = document.activeElement;
    if (list.indexOf(cur) < 0) { focusEl(list[0]); return true; }
    var cr = cur.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    var cand = [];
    list.forEach(function(it) {
      if (it === cur) return;
      var r = it.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      var sameRow = Math.abs(dy) < Math.max(cr.height, r.height) * 0.5;
      if (dir === 'left' && sameRow && dx < -4) cand.push({ it: it, s: -dx });
      else if (dir === 'right' && sameRow && dx > 4) cand.push({ it: it, s: dx });
      else if (dir === 'up' && dy < -4 && !sameRow) cand.push({ it: it, s: -dy * 1000 + Math.abs(dx) });
      else if (dir === 'down' && dy > 4 && !sameRow) cand.push({ it: it, s: dy * 1000 + Math.abs(dx) });
    });
    if (!cand.length) return false;
    cand.sort(function(a, b) { return a.s - b.s; });
    focusEl(cand[0].it);
    return true;
  }

  window.__tvFpRefresh = function(keep) { render(keep !== false); };
  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-fp') || menuOpen() || pop || document.getElementById('tv-ev')) return;
    var k = e.keyCode, ae = document.activeElement;
    function stop() { e.preventDefault(); e.stopImmediatePropagation(); }
    var inside = ae && root.contains(ae) && ae.getAttribute && ae.getAttribute('data-fk');
    if (!inside) {
      if (k === 37 || k === 38 || k === 39 || k === 40) { stop(); var f = firstRealTarget(focusables()); if (f) focusEl(f); else if (k === 37 && window.__tvOpenMenu) window.__tvOpenMenu(); }
      return;
    }
    if (k === 37) { stop(); if (!move('left') && window.__tvOpenMenu) window.__tvOpenMenu(); }
    else if (k === 39) { stop(); move('right'); }
    else if (k === 38) { stop(); if (!move('up')) { var sc = root.querySelector('#tv-fp-scroll'); if (sc) sc.scrollTop = 0; } }
    else if (k === 40) { stop(); move('down'); }
    else if ((k === 13 || k === 23 || k === 32) && ae.getAttribute('data-fk') === 'r') {
      stop();
      if (window.__tvEvOpen) window.__tvEvOpen(ae.getAttribute('data-fv'));
    } else if ((k === 13 || k === 23 || k === 32) && (ae.getAttribute('data-fk') === 'e')) { stop(); }
  }, true);
  root.addEventListener('click', function(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-fk="r"]') : null;
    if (t) { e.preventDefault(); if (window.__tvEvOpen) window.__tvEvOpen(t.getAttribute('data-fv')); }
  }, true);
  document.addEventListener('focusin', function() { if (document.getElementById('tv-fp')) hint(); }, true);

  render(false);
  if (MODE === 'home') {
    var tries = 0, last = -1;
    var tm = setInterval(function() {
      tries++;
      var items = [];
      try { items = readHistory(); } catch (e) {}
      if ((items.length && items.length === last) || tries > 24) {
        clearInterval(tm);
        hist = items; histDone = true;
        render(true);
        return;
      }
      last = items.length;
    }, 400);
  }
})();
