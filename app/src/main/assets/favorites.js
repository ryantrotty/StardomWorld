(function(){
  // My Favorites: the app's own favorites (wrestlers, one faction, watch later) kept on this device, the
  // Menu-button choices on cards, shelves and the favorites page, and the My Favorites page itself
  // (the My page address carrying tvfav=1 / later / wrestlers). Nothing here calls the site.
  if (window.__tvFav) return;
  var H = window.AndroidHost || {};
  var KEY = 'tvFavV1', REM_KEY = 'tvSchedRemV1';
  var BASE = 'https://www.stardom-world.com';
  var PLI = 0, MODE = 'home';
  var photoCache = {}, logoCache = {};

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
    if (!Array.isArray(d.m)) d.m = [];
    if (!Array.isArray(d.s)) d.s = [];
    if (!Array.isArray(d.pl)) d.pl = [];
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
  function pathOf(h) { try { return new URL(h, location.href).pathname; } catch (e) { return String(h); } }
  function idxIn(arr, href) { var p = pathOf(href); for (var i = 0; i < arr.length; i++) if (pathOf(arr[i].href) === p) return i; return -1; }
  var LISTS = {
    later: { en: 'Watch Later', ja: 'あとで見る' },
    m: { en: 'Favorite Matches', ja: 'お気に入りの試合' },
    s: { en: 'Favorite Shows', ja: 'お気に入りの大会' }
  };
  function item(info) { return { id: info.id, href: info.href, title: info.title, bg: info.bg }; }
  function toggleList(kind, info) {
    var d = load(), arr = d[kind], i = idxIn(arr, info.href), L = LISTS[kind];
    if (i >= 0) { arr.splice(i, 1); save(d); toast(T('Removed from ' + L.en, L.ja + 'から削除しました')); return false; }
    arr.unshift(item(info));
    save(d);
    toast(T('\u2605 Added to ' + L.en, '\u2605 ' + L.ja + 'に追加しました'));
    return true;
  }
  function togglePlaylist(pi, info) {
    var d = load(), pl = d.pl[pi];
    if (!pl) return false;
    var i = idxIn(pl.items, info.href);
    if (i >= 0) { pl.items.splice(i, 1); save(d); toast(T('Removed from ' + pl.name, pl.name + ' から削除しました')); return false; }
    pl.items.unshift(item(info));
    save(d);
    toast(T('\u2605 Added to ' + pl.name, '\u2605 ' + pl.name + ' に追加しました'));
    return true;
  }
  function defaultPlName(d) {
    var n = d.pl.length + 1, names = {};
    d.pl.forEach(function(p) { names[p.name] = 1; });
    while (names[T('Playlist ', 'プレイリスト ') + n]) n++;
    return T('Playlist ', 'プレイリスト ') + n;
  }
  function newPlaylist(info, name) {
    var d = load(), nm = String(name || '').replace(/\s+/g, ' ').trim() || defaultPlName(d);
    var pl = { name: nm, items: info ? [item(info)] : [] };
    d.pl.push(pl);
    save(d);
    toast(T('\u2605 Added to new playlist ' + pl.name, '\u2605 新しいプレイリスト ' + pl.name + ' に追加しました'));
  }
  function renamePlaylist(i, name) {
    var d = load(), pl = d.pl[i], nm = String(name || '').replace(/\s+/g, ' ').trim();
    if (!pl || !nm) return;
    pl.name = nm;
    save(d);
    toast(T('Playlist renamed to ' + nm, 'プレイリスト名を ' + nm + ' に変更しました'));
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
    '#tv-sm-shelf .tv-sm-fi.tv-fv-row{display:flex;align-items:center;gap:12px;padding:12px 14px;margin:0 0 8px 0;background:#161f2a;border:2px solid #222b36;font-size:18px;}',
    '#tv-sm-shelf .tv-fv-l{flex:1 1 auto;min-width:0;}',
    '#tv-sm-shelf .tv-fv-n{color:#F4C242;font-weight:800;font-size:18px;}',
    '#tv-sm-shelf .tv-fv-av{flex:0 0 auto;width:30px;height:30px;border-radius:50%;background:#2a323c center top/cover no-repeat;border:2px solid #121a24;margin-left:-8px;}',
    '#tv-sm-shelf .tv-fv-lg{flex:0 0 auto;height:30px;max-width:130px;padding:3px 10px;border-radius:7px;background:#fff;display:flex;align-items:center;font-size:13px;font-weight:800;color:#111;}',
    '#tv-sm-shelf .tv-fv-lg img{height:100%;width:auto;max-width:110px;object-fit:contain;}',
    '#tv-sm-shelf .tv-sm-fi.tv-fv-open{display:flex;align-items:center;gap:14px;padding:12px 16px;border:3px solid #F4C242;background:#161f2a;margin:0 0 14px 0;font-size:20px;}',
    '#tv-sm-shelf .tv-fv-k{font-size:13px;font-weight:800;letter-spacing:.14em;color:#F4C242;margin:6px 0 10px 2px;}',
    '#tv-sm-shelf .tv-fv-k2{font-size:12px;font-weight:700;letter-spacing:.12em;color:#9aa6b4;margin:10px 0 6px 4px;}',
    '#tv-sm-shelf .tv-sm-fi.tv-fv-pl{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;font-size:16px;background:#161f2a;border:2px solid #222b36;margin:0 0 6px 0;}',
    '#tv-sm-shelf .tv-sm-fi.tv-fv-rem{display:flex;gap:12px;padding:10px;background:#0f1620;border:2px solid #222b36;margin:0 0 8px 0;}',
    '#tv-sm-shelf .tv-fv-rem img{flex:0 0 auto;width:54px;height:76px;object-fit:cover;object-position:top;border-radius:6px;}',
    '#tv-sm-shelf .tv-fv-rem .tv-fv-bell{flex:0 0 auto;width:54px;height:54px;border-radius:8px;background:#161f2a;display:flex;align-items:center;justify-content:center;font-size:22px;}',
    '#tv-sm-shelf .tv-fv-rem .a{font-size:13px;font-weight:800;color:#F4C242;}',
    '#tv-sm-shelf .tv-fv-rem .b{font-size:15px;font-weight:700;line-height:1.2;margin:2px 0;}',
    '#tv-sm-shelf .tv-fv-rem .c{font-size:13px;color:#9aa6b4;}',
    '#tv-sm-shelf .tv-fv-note{font-size:13px;color:#9aa6b4;line-height:1.5;margin:10px 4px 0 4px;}',
    '#tv-fp-pop{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483600;width:560px;max-width:90vw;box-sizing:border-box;background:#0f161e;border:2px solid #2a323c;border-radius:14px;padding:18px 20px;color:#fff;font-family:Arial,Helvetica,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.7);}',
    '#tv-fp-pop, #tv-fp-pop *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;}',
    '#tv-fp-pop .tv-fpp-t{font-size:15px;color:#9aa6b4;margin-bottom:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-fp-pop .tv-fpi{display:block;width:100%;box-sizing:border-box;padding:12px 16px;margin:6px 0;border-radius:10px;border:3px solid #2a323c;background:#0b1118;color:#fff;font-size:22px;font-weight:700;outline:none;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-fp-pop .tv-fpi:focus{border-color:#F4C242;}',
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
          ? T('Menu button on a faction picks it as your one favorite faction (choosing another replaces it).', 'メニューボタン：お気に入りユニットに選択（1つだけ）')
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

  // ---- the video this page is about (the Menu button while watching): its title and picture from the page itself
  function pageInfo() {
    var m = location.pathname.match(/^\/(?:set\/\d+\/)?(contents|set)\/(\d+)/);
    if (!m) return null;
    var t = '', bg = '';
    var h1 = document.querySelector('h1.ttl-lg, .content-title, h1');
    if (h1) t = clean(h1.textContent);
    if (!t) t = clean((document.title || '').split('|')[0]);
    var og = document.querySelector('meta[property="og:image"]');
    if (og) bg = og.getAttribute('content') || '';
    return { id: m[2], href: location.origin + location.pathname, title: t || 'Stardom World Video', bg: bg, card: null };
  }
  function siteFav(id) {
    var $ = window.jQuery || window.$;
    if (!$ || !$.apiCall) { toast('Favorites API not available'); return; }
    $.apiCall({ url: '/user_api/contents/' + id + '/favorites', type: 'POST' }).done(function() { toast('♥ Added to Favorites!'); })
      .fail(function(x) {
        if (x.status === 400) toast('Please log in on Stardom World to sync favorites');
        else $.apiCall({ url: '/user_api/contents/' + id + '/favorites', type: 'DELETE' }).done(function() { toast('Removed from Favorites'); });
      });
  }

  // ---- the pop-up on a video: Favorites (the site's list), Watch Later, Favorite Matches / Shows, Playlist
  var pop = null, popFocus = null, popClose0 = null, popInfo = null, popCtx = null;
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
  function kindFor(info) { return /\/set\/\d+/.test(info.href) ? 's' : 'm'; }
  function popFill(mode) {
    var info = popInfo, d = load(), h = '<div class="tv-fpp-t">' + esc(info.title) + '</div>';
    if (mode === 'name') {
      var cur = popCtx && popCtx.kind === 'rename' && d.pl[popCtx.idx] ? d.pl[popCtx.idx].name : defaultPlName(d);
      h = '<div class="tv-fpp-t">' + esc(popCtx && popCtx.kind === 'rename' ? T('Rename playlist', 'プレイリスト名を変更') : T('Name your playlist', 'プレイリスト名')) + '</div>' +
        '<input id="tv-fpi" class="tv-fpi" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" data-orig="' + esc(cur) + '" value="' + esc(cur) + '">' +
        '<div class="tv-fpp-t" style="margin:2px 0 6px 0;font-size:13px">' + esc(T('Press OK on the box to type, then Down to Save.', 'OKで入力、下キーで保存へ')) + '</div>' +
        '<a class="tv-fpb" tabindex="0" data-act="save">' + esc(T('Save', '保存')) + '</a>' +
        '<a class="tv-fpb" tabindex="0" data-act="cancel">' + esc(T('Cancel', 'キャンセル')) + '</a>';
    } else if (mode === 'plopts') {
      h += '<a class="tv-fpb" tabindex="0" data-act="rename">' + esc(T('Rename playlist', '名前を変更')) + '</a>' +
        '<a class="tv-fpb" tabindex="0" data-act="delpl">' + esc(T('Remove playlist', 'プレイリストを削除')) + '</a>';
    } else if (mode === 'pl') {
      d.pl.forEach(function(pl, i) {
        var has = idxIn(pl.items, info.href) >= 0;
        h += '<a class="tv-fpb" tabindex="0" data-act="pl" data-i="' + i + '">' + esc((has ? T('Remove from ', '削除：') : T('Add to ', '追加：')) + pl.name) + '</a>';
      });
      h += '<a class="tv-fpb" tabindex="0" data-act="newpl">' + esc(T('+ New playlist', '+ 新しいプレイリスト')) + '</a>';
    } else {
      var k = kindFor(info), L = LISTS[k], inLater = idxIn(d.later, info.href) >= 0, inK = idxIn(d[k], info.href) >= 0;
      var isFav = !!(info.card && (info.card.classList.contains('is-favorite') || (info.card.dataset && info.card.dataset.tvFav === 'true')));
      if (info.fromPl !== undefined && d.pl[info.fromPl]) h += '<a class="tv-fpb" tabindex="0" data-act="pl" data-i="' + info.fromPl + '">' + esc(T('Remove from ', '削除：') + d.pl[info.fromPl].name) + '</a>';
      h += '<a class="tv-fpb" tabindex="0" data-act="fav">' + esc(isFav ? T('Remove from Favorites', 'お気に入りから削除') : T('Add to Favorites', 'お気に入りに追加')) + '</a>' +
        '<a class="tv-fpb" tabindex="0" data-act="later">' + esc(inLater ? T('Remove from Watch Later', 'あとで見るから削除') : T('Add to Watch Later', 'あとで見るに追加')) + '</a>' +
        '<a class="tv-fpb" tabindex="0" data-act="kind">' + esc(inK ? T('Remove from ' + L.en, L.ja + 'から削除') : T('Add to ' + L.en, L.ja + 'に追加')) + '</a>' +
        '<a class="tv-fpb" tabindex="0" data-act="plmenu">' + esc(T('Add to a Playlist...', 'プレイリストに追加...')) + '</a>';
    }
    pop.innerHTML = h;
    Array.prototype.forEach.call(pop.querySelectorAll('.tv-fpb'), function(b) {
      b.addEventListener('click', function(ev) { ev.preventDefault(); ev.stopPropagation(); popAct(b); });
    });
    var inp = pop.querySelector('#tv-fpi');
    if (inp) { inp.focus(); try { inp.select(); } catch (e) {} return; }
    var first = pop.querySelector('.tv-fpb');
    if (first) first.focus();
  }
  function popAct(b) {
    var act = b.getAttribute('data-act'), info = popInfo;
    if (act === 'plmenu') { popFill('pl'); return; }
    if (act === 'newpl') { popCtx = { kind: 'new' }; popFill('name'); return; }
    if (act === 'rename') { popCtx = { kind: 'rename', idx: popCtx ? popCtx.idx : 0 }; popFill('name'); return; }
    if (act === 'save') {
      var inpv = pop && pop.querySelector('#tv-fpi'), val = inpv ? inpv.value : '', ctx = popCtx;
      popHide();
      if (ctx && ctx.kind === 'rename') renamePlaylist(ctx.idx, val); else if (info) newPlaylist(info, val);
      if (window.__tvFpRefresh) window.__tvFpRefresh();
      return;
    }
    if (act === 'cancel') { popHide(); return; }
    if (act === 'delpl') {
      var di = popCtx ? popCtx.idx : -1;
      popHide();
      var dd = load();
      if (dd.pl[di]) { var dn = dd.pl[di].name; dd.pl.splice(di, 1); save(dd); toast(T('Removed playlist ' + dn, dn + ' を削除しました')); }
      if (window.__tvFpRefresh) window.__tvFpRefresh();
      return;
    }
    popHide();
    if (!info) return;
    if (act === 'later') toggleList('later', info);
    else if (act === 'kind') toggleList(kindFor(info), info);
    else if (act === 'pl') togglePlaylist(parseInt(b.getAttribute('data-i'), 10), info);
    else if (act === 'fav') {
      try { if (info.card) { if (window.__tvToggleCardFavorite) window.__tvToggleCardFavorite(info.card); } else siteFav(info.id); } catch (e) {}
    }
    if (window.__tvFpRefresh) window.__tvFpRefresh();
  }
  function popKey(e) {
    var k = e.keyCode, bs = popBtns(), ae = document.activeElement, i = bs.indexOf(ae);
    var inp = ae && ae.id === 'tv-fpi' ? ae : null;
    function stop() { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
    if (k === 27 || k === 4) { stop(); popHide(); return; }
    if (inp) {
      if (k === 40) { stop(); if (bs.length) bs[0].focus(); return; }
      if (k === 38) { stop(); return; }
      // OK on the box opens the keyboard; once something has been typed, Enter saves
      if ((k === 13 || k === 23) && inp.value !== inp.getAttribute('data-orig') && inp.value.trim()) { stop(); popAct(bs[0]); return; }
      return;
    }
    if (k === 8) { stop(); popHide(); return; }
    if (k === 38 || k === 37) {
      stop();
      var pin = pop && pop.querySelector('#tv-fpi');
      if (i <= 0 && pin) pin.focus(); else if (bs.length) bs[Math.max(0, i - 1)].focus();
      return;
    }
    if (k === 40 || k === 39) { stop(); if (bs.length) bs[Math.min(bs.length - 1, i + 1)].focus(); return; }
    if (k === 13 || k === 23 || k === 32) { stop(); if (i >= 0) popAct(bs[i]); return; }
  }
  function popShow(info, mode, ctx) {
    popHide();
    popInfo = info;
    popCtx = ctx || null;
    pop = document.createElement('div');
    pop.id = 'tv-fp-pop';
    pop.className = 'notranslate';
    pop.setAttribute('translate', 'no');
    (document.body || document.documentElement).appendChild(pop);
    popFocus = document.activeElement;
    popClose0 = window.__tvMenuClose || null;
    window.__tvMenuClose = function() { popHide(); return true; };
    try { if (H.setSideMenuOpen) H.setSideMenuOpen(true); } catch (e) {}
    window.addEventListener('keydown', popKey, true);
    popFill(mode || 'main');
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
  var ARR = { l: 'later', m: 'm', s: 's' };
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
        var fk = t.getAttribute('data-fk'), fv = t.getAttribute('data-fv') || '', d = load(), ix;
        if (fk === 'w') { ix = hasW(d, fv); if (ix >= 0) { d.w.splice(ix, 1); save(d); toast(T('Removed ' + nameFor(fv) + ' from My Favorites', nameFor(fv) + ' をお気に入りから削除しました')); } }
        else if (fk === 'f') { if (d.f) { var fo = facById(d.f); d.f = ''; save(d); toast(T((fo ? fo.name : 'Faction') + ' removed from My Favorites', (fo ? fo.name : 'ユニット') + ' をお気に入りから削除しました')); } }
        else if (ARR[fk] || fk === 'pi') { var vi = cardInfo([t]); if (vi) { if (fk === 'pi') vi.fromPl = PLI; popShow(vi); } return true; }
        else if (fk === 'p') { var pi = parseInt(fv, 10); if (d.pl[pi]) popShow({ title: d.pl[pi].name, href: '', id: '', bg: '', card: null }, 'plopts', { kind: 'opts', idx: pi }); return true; }
        else if (fk === 'r') { removeReminder(fv); }
        else if (fk === 'h') { var hi = cardInfo([t]); if (hi) popShow(hi); return true; }
        else return true;
        if (window.__tvFpRefresh) window.__tvFpRefresh(true);
        return true;
      }
    }
    // a video card anywhere else, or the video being watched
    var info = cardInfo(c) || pageInfo();
    if (info) { popShow(info); return true; }
    return window.__tvToggleCardFavorite ? window.__tvToggleCardFavorite(arg) : false;
  }

  function posterFor(e) { try { if (H.showPosters && H.showPosters()) return H.posterDataUrl(e.poster || '') || ''; } catch (x) {} return ''; }
  function shelfHtml() {
    var d = load(), fac = d.f ? facById(d.f) : null, rs = reminders();
    function lk(path, cls, inner) { return '<a class="tv-sm-fi ' + cls + '" tabindex="0" data-go="' + esc(path) + '" href="' + esc(BASE + path) + '">' + inner + '</a>'; }
    function row(path, label, right) { return lk(path, 'tv-fv-row', '<span class="tv-fv-l">' + esc(label) + '</span>' + right); }
    function n(v) { return '<span class="tv-fv-n">' + v + '</span>'; }
    var av = '';
    d.w.slice(0, 4).forEach(function(w) { var u = photo(w.k); if (u) av += '<span class="tv-fv-av" style="background-image:url(' + u + ')"></span>'; });
    var facPage = fac && fac.members && fac.members.length ? '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(fac.members[0].search) + '&tvfaction=' + encodeURIComponent(fac.id) : '/mypage?tvfav=1';
    var lg = fac ? logo(fac.id) : '';
    var facRight = fac ? '<span class="tv-fv-lg">' + (lg ? '<img src="' + lg + '" alt="">' : esc(fac.name)) + '</span>' : '<span style="color:#9aa6b4;font-size:15px">' + esc(T('none yet', 'なし')) + '</span>';
    var colA = '<div class="tv-fv-k">' + esc(T('COLLECTIONS', 'コレクション')) + '</div>' +
      row('/mypage?tvfav=wrestlers', T('Wrestlers', 'お気に入り選手'), av + n(d.w.length)) +
      row(facPage, T('My Faction', 'お気に入りユニット'), facRight) +
      row('/mypage?tvfav=m', T('Matches', '試合'), n(d.m.length)) +
      row('/mypage?tvfav=s', T('Shows', '大会'), n(d.s.length));
    var pls = d.pl.slice(0, 5).map(function(pl, i) { return lk('/mypage?tvfav=pl&pi=' + i, 'tv-fv-pl', '<span>' + esc(pl.name) + '</span><span style="color:#9aa6b4;font-size:14px">' + pl.items.length + '</span>'); }).join('');
    var colB = '<div class="tv-fv-k">' + esc(T('LISTS', 'リスト')) + '</div>' +
      row('/mypage?tvfav=later', T('Watch Later', 'あとで見る'), n(d.later.length)) +
      row('/mypage?tvrecent=1', T('Recently Watched', '最近視聴した動画'), '') +
      row('/mypage?tvfav=plall', T('Playlists', 'プレイリスト'), n(d.pl.length)) +
      row('/mypage/favorites', T('Favorite Videos', 'お気に入り動画'), '') +
      (pls ? '<div class="tv-fv-k2">' + esc(T('YOUR PLAYLISTS', 'プレイリスト')) + '</div>' + pls : '');
    var rh = '';
    rs.slice(0, 3).forEach(function(r) {
      var pu = posterFor(r.e);
      rh += '<a class="tv-sm-fi tv-fv-rem" tabindex="0" data-ev="' + esc(r.e.id) + '">' + (pu ? '<img src="' + pu + '" alt="">' : '<span class="tv-fv-bell">\ud83d\udd14</span>') +
        '<div style="min-width:0"><div class="a">' + esc(fmtWhen(r.e._t)) + '</div><div class="b">' + esc(r.e.short || r.e.title) + '</div><div class="c">\ud83d\udd14 ' + esc(offText(r.off)) + '</div></div></a>';
    });
    var colC = '<div class="tv-fv-k">' + esc(T('COMING UP \u00b7 REMINDERS', '今後の予定・通知')) + '</div>' +
      (rh || '<div class="tv-fv-note">' + esc(T('No reminders yet. Set one from Shows.', 'リマインダーはまだありません')) + '</div>') +
      (rs.length > 3 ? '<div class="tv-fv-note">' + esc('+' + (rs.length - 3) + T(' more reminders', '件')) + '</div>' : '') +
      '<div class="tv-fv-note">' + esc(T('Reminders are the ones you set from Shows. Press OK on one to open the event page.', 'Showsで設定した通知です。OKでイベントページを開きます')) + '</div>';
    return lk('/mypage?tvfav=1', 'tv-fv-open', '<span style="font-size:24px;color:#F4C242">\u2605</span><span class="tv-fv-l"><b>' + esc(T('Open My Favorites', 'お気に入りを開く')) + '</b></span>') +
      '<div style="display:grid;grid-template-columns:1.15fr 1fr 1.05fr;gap:22px;"><div>' + colA + '</div><div>' + colB + '</div><div>' + colC + '</div></div>';
  }

  window.__tvFav = { shelfHtml: shelfHtml, decorate: decorate, mark: mark, load: load, toggleWrestler: toggleWrestler, setFaction: setFaction };
  window.__tvMenuKey = menuKey;

  // =============================================================== the My Favorites page
  var P = null;
  var PARAMS = null;
  try { if (location.pathname === '/mypage') { PARAMS = new URLSearchParams(location.search); P = PARAMS.get('tvfav'); } } catch (e) { P = null; }
  if (!P) return;
  MODE = ({ later: 'later', wrestlers: 'wrestlers', m: 'm', s: 's', pl: 'pl', plall: 'plall' })[P] || 'home';
  PLI = parseInt(PARAMS.get('pi') || '0', 10) || 0;
  

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
    '#tv-fp-title{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:22px 24px 8px 30px;font-size:36px;}',
    '#tv-fp-title .tv-fp-bar{flex:0 0 auto;width:12px;height:44px;background:#F4C242;}',
    '#tv-fp-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 24px 60px 24px;scroll-padding-bottom:40px;scrollbar-width:none;}',
    '#tv-fp-in{max-width:1440px;margin:0 auto;}',
    '#tv-fp-scroll::-webkit-scrollbar{display:none;}',
    '.tv-fp-h{display:flex;align-items:baseline;gap:12px;margin:18px 0 8px 2px;font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '.tv-fp-h span{font-size:15px;color:#9aa6b4;letter-spacing:0;font-weight:700;}',
    '.tv-fp-track{display:flex;gap:24px;overflow-x:auto;padding:6px 6px 10px 6px;margin:0 -6px;scrollbar-width:none;}',
    '.tv-fp-track::-webkit-scrollbar{display:none;}',
    '.tv-fp-grid{display:grid;gap:24px;padding:6px;}',
    '.tv-fp-grid .tv-fp-t{flex:none;max-width:none;}',
    '.tv-fp-t{display:block;position:relative;flex:0 0 calc(25% - 18px);max-width:calc(25% - 18px);min-width:0;text-decoration:none !important;color:#fff !important;border-radius:8px;background:#1a1a1a;overflow:hidden;border:3px solid transparent;outline:none !important;cursor:pointer;}',
    '#tv-fp a, #tv-fp a *{opacity:1 !important;filter:none !important;}',
    '#tv-fp a::before, #tv-fp a::after{content:none !important;display:none !important;}',
    '#tv-fp *:focus, #tv-fp-pop *:focus{outline:none !important;box-shadow:none !important;transform:none !important;}',
    '.tv-fp-t:focus, .tv-fp-card:focus, .tv-fp-stk:focus, .tv-fp-tk:focus{border-color:#F4C242 !important;box-shadow:none !important;}',
    '.tv-fp-img{width:100%;aspect-ratio:16/9;height:auto;min-height:165px;background:#222 center/cover no-repeat;border-radius:5px 5px 0 0;}',
    '.tv-fp-badge{position:absolute;right:8px;top:8px;padding:4px 10px;border-radius:6px;background:rgba(0,0,0,.8);color:#F4C242;font-size:15px;font-weight:800;}',
    '.tv-fp-tt{word-break:normal;overflow-wrap:break-word;padding:12px 14px;color:#fff;font-size:15px;font-weight:bold;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;line-height:1.45em;min-height:5.8em;max-height:6.2em;}',
    '.tv-fp-all{display:flex;align-items:center;justify-content:center;border-color:#2a323c;background:#11171E;font-size:22px;font-weight:800;min-height:200px;}',
    '.tv-fp-all:focus{border-color:#F4C242 !important;}',
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
    '.tv-fp-more{flex:0 0 auto;font-size:18px;font-weight:800;color:#F4C242;white-space:nowrap;}',
    '.tv-fp-tks{flex:1 1 0;min-width:0;display:flex;gap:22px;}',
    '.tv-fp-tk{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:14px 22px;border-radius:10px;background:#f3e2b8;color:#2a1c10 !important;text-decoration:none !important;border:3px solid transparent;outline:none !important;cursor:pointer;min-height:98px;}',
    '.tv-fp-tk .a{font-size:13px;font-weight:800;color:#7a5a36;letter-spacing:.5px;}',
    '.tv-fp-tk .b{font-size:23px;font-weight:800;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tv-fp-tk .c{font-size:14px;color:#7a5a36;}',
    '#tv-fp-hint{margin-left:auto;font-size:16px;font-weight:600;color:#9aa6b4;text-align:right;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  var root = document.createElement('div');
  root.id = 'tv-fp';
  root.className = 'notranslate';
  root.setAttribute('translate', 'no');
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';

  function tileHtml(it, fk, idx, badge) {
    return '<a class="tv-fp-t" tabindex="0" data-fk="' + fk + '" data-fv="' + idx + '" href="' + esc(it.href) + '"><div class="tv-fp-img" style="' + (it.bg ? 'background-image:url(' + esc(it.bg) + ');' : '') + '"></div>' + (badge ? '<div class="tv-fp-badge">' + esc(badge) + '</div>' : '') + '<div class="tv-fp-tt">' + esc(it.title) + '</div></a>';
  }
  function plTile(pl, i) {
    var first = pl.items[0] || {};
    return tileHtml({ href: absUrl('/mypage?tvfav=pl&pi=' + i), title: pl.name, bg: first.bg || '' }, 'p', i, pl.items.length + T(' videos', '本'));
  }
  function row(key, tiles, all, n, empty) {
    return '<div class="tv-fp-track" data-row="' + key + '">' + (n ? tiles + all : emptyHtml(empty)) + '</div>';
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
    var allRs = reminders().length;
    return h + '</div>' + (allRs > 2 ? '<div class="tv-fp-more">+' + (allRs - 2) + T(' more', '件') + '</div>' : '') + '</div>';
  }

  function render(keep) {
    var d = load(), h = '', title = T('My Favorites', 'お気に入り');
    var prev = document.activeElement, pk = prev && prev.getAttribute ? prev.getAttribute('data-fk') : null, pv = prev && prev.getAttribute ? prev.getAttribute('data-fv') : null;
    var pidx = -1, pscroll = 0;
    var sc = root.querySelector('#tv-fp-scroll');
    if (sc) pscroll = sc.scrollTop;
    if (prev && root.contains(prev)) pidx = Array.prototype.indexOf.call(root.querySelectorAll('[data-fk]'), prev);
    var body = '';
    var EMPTY_L = T('Nothing saved yet. Press the Menu button on a video and choose Add to Watch Later.', '保存した動画はありません。動画でメニューボタンを押してください。');
    function vtiles(arr, fk, max) { return arr.slice(0, max).map(function(it, i) { return tileHtml(it, fk, i); }).join(''); }
    function gridOf(arr, fk) { return arr.length ? '<div class="tv-fp-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));">' + arr.map(function(it, i) { return tileHtml(it, fk, i); }).join('') + '</div>' : emptyHtml(T('Nothing here yet.', 'まだありません')); }
    if (MODE === 'home') {
      body += topRow(d);
      body += head(T('FAVORITE WRESTLERS', 'お気に入り選手'), d.w.length);
      body += '<div class="tv-fp-track" data-row="w">' + (d.w.length ? d.w.slice(0, 14).map(cardHtml).join('') + (d.w.length > 14 ? allTile(absUrl('/mypage?tvfav=wrestlers'), d.w.length) : '') : emptyHtml(T('No favorite wrestlers yet. Open Wrestlers in the menu, highlight a name and press the Menu button.', '選手はまだありません。メニューの選手から選び、メニューボタンを押してください。'))) + '</div>';
      body += head(T('WATCH LATER', 'あとで見る'), d.later.length);
      body += row('l', vtiles(d.later, 'l', 11), d.later.length > 11 ? allTile(absUrl('/mypage?tvfav=later'), d.later.length) : '', d.later.length, EMPTY_L);
      body += head(T('RECENTLY WATCHED', '最近視聴した動画'), hist.length ? hist.length : '');
      body += '<div class="tv-fp-track" data-row="h">' + (hist.length ? hist.slice(0, 11).map(function(it, i) { return tileHtml(it, 'h', i); }).join('') + allTile(absUrl('/mypage?tvrecent=1'), hist.length) : emptyHtml(histDone ? T('Nothing here yet (log in to see your history).', 'まだありません（ログインが必要です）') : T('Loading...', '読み込み中...'))) + '</div>';
      body += head(T('PLAYLISTS', 'プレイリスト'), d.pl.length);
      body += row('p', d.pl.slice(0, 11).map(plTile).join(''), d.pl.length > 11 ? allTile(absUrl('/mypage?tvfav=plall'), d.pl.length) : '', d.pl.length, T('No playlists yet. Press the Menu button on a video and choose Add to a Playlist.', 'プレイリストはまだありません。動画でメニューボタンを押してください。'));
      body += head(T('FAVORITE MATCHES', 'お気に入りの試合'), d.m.length);
      body += row('m', vtiles(d.m, 'm', 11), d.m.length > 11 ? allTile(absUrl('/mypage?tvfav=m'), d.m.length) : '', d.m.length, T('No favorite matches yet. Press the Menu button on a video or while watching.', '試合はまだありません。'));
      body += head(T('FAVORITE SHOWS', 'お気に入りの大会'), d.s.length);
      body += row('s', vtiles(d.s, 's', 11), d.s.length > 11 ? allTile(absUrl('/mypage?tvfav=s'), d.s.length) : '', d.s.length, T('No favorite shows yet. Press the Menu button on a show (video set).', '大会はまだありません。'));
    } else if (MODE === 'later') {
      title = T('Watch Later', 'あとで見る'); body += gridOf(d.later, 'l');
    } else if (MODE === 'm') {
      title = T('Favorite Matches', 'お気に入りの試合'); body += gridOf(d.m, 'm');
    } else if (MODE === 's') {
      title = T('Favorite Shows', 'お気に入りの大会'); body += gridOf(d.s, 's');
    } else if (MODE === 'plall') {
      title = T('Playlists', 'プレイリスト');
      body += d.pl.length ? '<div class="tv-fp-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));">' + d.pl.map(plTile).join('') + '</div>' : emptyHtml(T('No playlists yet.', 'まだありません'));
    } else if (MODE === 'pl') {
      var pls = d.pl[PLI];
      title = pls ? pls.name : T('Playlist', 'プレイリスト');
      body += pls ? gridOf(pls.items, 'pi') : emptyHtml(T('This playlist is gone.', 'このプレイリストはありません'));
    } else {
      title = T('Favorite Wrestlers', 'お気に入り選手');
      body += d.w.length ? '<div class="tv-fp-grid" style="grid-template-columns:repeat(6,minmax(0,1fr));">' + d.w.map(cardHtml).join('') + '</div>' : emptyHtml(T('No favorite wrestlers yet.', 'まだありません'));
    }
    root.innerHTML = '<div id="tv-fp-title"><span class="tv-fp-bar"></span><span>' + esc(title) + '</span><span id="tv-fp-hint"></span></div><div id="tv-fp-scroll"><div id="tv-fp-in">' + body + '</div></div>';
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
    for (var i = 0; i < all.length; i++) if (/^(w|l|f|m|s|p|pi)$/.test(all[i].getAttribute('data-fk'))) return all[i];
    return all[0] || null;
  }
  function focusables() { return Array.prototype.slice.call(root.querySelectorAll('[data-fk]')); }
  function hint() {
    var el = document.getElementById('tv-fp-hint'), ae = document.activeElement, fk = ae && ae.getAttribute ? ae.getAttribute('data-fk') : '';
    if (!el) return;
    el.textContent = (fk === 'w' || fk === 'f' || fk === 'r') ? T('Menu button: remove', 'メニューボタン：削除')
      : (fk === 'p' ? T('Menu button: rename or remove', 'メニューボタン：名前変更／削除')
      : (fk === 'l' || fk === 'm' || fk === 's' || fk === 'pi') ? T('Menu button: options', 'メニューボタン：オプション')
      : (fk === 'h' ? T('Menu button: add to Favorites or Watch Later', 'メニューボタン：お気に入り／あとで見る') : ''));
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
