(function(){
  // My Favorites: the app's own favorites (wrestlers, one faction, watch later) kept on this device, the
  // Menu-button choices on cards, shelves and the favorites page, and the My Favorites page itself
  // (the My page address carrying tvfav=1 / later / wrestlers). Nothing here calls the site.
  if (window.__tvFav) return;
  var H = window.AndroidHost || {};
  var KEY = 'tvFavV1', REM_KEY = 'tvSchedRemV1', MAXF = 6;
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

  // ---- store: { w: [{k, n}], t: [{id, n, m, ms, b}] (tag teams), fs: ['faction id', ...] (f = the first), later: [{id, href, title, bg}] }
  function load() {
    var d = {};
    try { d = JSON.parse(lsGet(KEY) || '{}') || {}; } catch (e) { d = {}; }
    if (!Array.isArray(d.w)) d.w = [];
    if (!Array.isArray(d.t)) d.t = [];
    if (!Array.isArray(d.later)) d.later = [];
    if (!Array.isArray(d.m)) d.m = [];
    if (!Array.isArray(d.s)) d.s = [];
    if (!Array.isArray(d.pl)) d.pl = [];
    if (typeof d.f !== 'string') d.f = '';
    if (!Array.isArray(d.fs)) d.fs = d.f ? [d.f] : [];   // up to MAXF favorite factions; d.f stays as the first one
    return d;
  }
  function save(d) { d.f = (d.fs && d.fs[0]) || ''; lsSet(KEY, JSON.stringify(d)); }

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
  // the app-drawn wrestler page (private 2.46.1, every build 2.47.0)
  function wrestlerPath(k) { return '/mypage?tvwr=' + encodeURIComponent(k); }
  function keywordOf(href) {
    try { var sp = new URL(href, location.href).searchParams; return sp.get('tvwr') || sp.get('q[keyword]') || ''; } catch (e) { return ''; }   // the app page (tvwr) or a search
  }
  function facIdOf(href) {
    try { return new URL(href, location.href).searchParams.get('tvfaction') || ''; } catch (e) { return ''; }
  }
  function hasW(d, k) { for (var i = 0; i < d.w.length; i++) if (String(d.w[i].k).toLowerCase() === String(k).toLowerCase()) return i; return -1; }

  // ---- tag teams: {id: the team page id, n: name, m: member names, ms: their search names, b: belts held}
  function hasT(d, id) { for (var i = 0; i < d.t.length; i++) if (d.t[i].id === id) return i; return -1; }
  function teamInfo(id) { try { return window.__tvTeams && window.__tvTeams.info ? window.__tvTeams.info(id) : null; } catch (e) { return null; } }
  function toggleTeam(id) {
    var d = load(), i = hasT(d, id), info = teamInfo(id), name = (info && info.n) || (i >= 0 ? d.t[i].n : id);
    if (i >= 0) { d.t.splice(i, 1); save(d); toast(T('Removed ' + name + ' from My Favorites', name + ' をお気に入りから削除しました')); }
    else if (info) { d.t.unshift({ id: id, n: info.n, m: info.m, ms: info.ms, b: info.b }); save(d); toast(T('\u2605 ' + name + ' added to My Favorites', '\u2605 ' + name + ' をお気に入りに追加しました')); }
    try { if (window.__tvTeams && window.__tvTeams.favChanged) window.__tvTeams.favChanged(); } catch (e) {}
    return hasT(load(), id) >= 0;
  }
  function memberPhoto(t, j) { var m = (t.m || [])[j] || '', s2 = (t.ms || [])[j] || ''; return (m && photo(m)) || (s2 && s2 !== m && photo(s2)) || ''; }
  function teamInitials(n) { var p = String(n).trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }
  function teamOf(href) { try { return new URL(href, location.href).searchParams.get('tvteam') || ''; } catch (e) { return ''; } }

  // ---- changes (each one shows a toast)
  function toggleWrestler(k) {
    var d = load(), i = hasW(d, k), n = nameFor(k);
    if (i >= 0) { d.w.splice(i, 1); save(d); toast(T('Removed ' + n + ' from My Favorites', n + ' をお気に入りから削除しました')); }
    else { d.w.push({ k: k, n: n }); save(d); toast(T('★ ' + n + ' added to My Favorites', '★ ' + n + ' をお気に入りに追加しました')); }
    return i < 0;
  }
  function setFaction(id) {
    var d = load(), f = facById(id), n = f ? f.name : id, i = d.fs.indexOf(id);
    if (i >= 0) { d.fs.splice(i, 1); save(d); toast(T(n + ' removed from My Favorites', n + ' をお気に入りユニットから外しました')); return false; }
    if (d.fs.length >= MAXF) { toast(T('You can keep up to ' + MAXF + ' factions. Remove one first.', 'ユニットは' + MAXF + 'つまでです。先に1つ外してください')); return false; }
    d.fs.push(id); save(d);
    toast(T('\u2605 ' + n + ' added to My Favorites', '\u2605 ' + n + ' をお気に入りユニットに追加しました'));
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
    '#tv-sm-shelf .tv-fv-av{flex:0 0 auto;width:30px;height:30px;border-radius:50%;background:#2a323c center top/cover no-repeat;border:2px solid #121922;margin-left:-8px;}',
    '#tv-sm-shelf .tv-fv-pr{display:flex;align-items:center;margin-left:4px;}',
    '#tv-sm-shelf .tv-fv-av.tv-fv-ini{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;background:#3B4656;}',
    '#tv-sm-shelf .tv-fv-lg{flex:0 0 auto;height:30px;max-width:130px;padding:3px 10px;border-radius:7px;background:#fff;display:flex;align-items:center;font-size:13px;font-weight:800;color:#111;}',
    '#tv-sm-shelf .tv-fv-lg.dk{background:#0f151c;}',
    '#tv-sm-shelf .tv-fv-lg img{height:100%;width:auto;max-width:110px;object-fit:contain;}',
    '#tv-sm-shelf .tv-sm-fi.tv-fv-open{display:flex;align-items:center;gap:14px;padding:12px 16px;border:2px solid #222b36;background:#161f2a;margin:0 0 14px 0;font-size:20px;}',
    '#tv-sm-shelf .tv-sm-fi.tv-fv-row, #tv-sm-shelf .tv-sm-fi.tv-fv-row:visited, #tv-sm-shelf .tv-sm-fi.tv-fv-row:hover, #tv-sm-shelf .tv-sm-fi.tv-fv-open, #tv-sm-shelf .tv-sm-fi.tv-fv-open:visited, #tv-sm-shelf .tv-sm-fi.tv-fv-open:hover, #tv-sm-shelf .tv-sm-fi.tv-fv-pl, #tv-sm-shelf .tv-sm-fi.tv-fv-rem{opacity:1 !important;filter:none !important;mix-blend-mode:normal !important;}',
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
    '#tv-fp-pop{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483600;width:560px;max-width:90vw;box-sizing:border-box;background:#0F1620;border:2px solid #2a323c;border-radius:14px;padding:18px 20px;color:#fff;font-family:Arial,Helvetica,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.7);}',
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
    if (key === 'tagteams') {
      Array.prototype.forEach.call(shelf.querySelectorAll('.tv-sm-fi[data-go]'), function(a) { var id = teamOf(a.getAttribute('data-go') || ''); if (id) a.setAttribute('data-favt', id); });
      if (!shelf.querySelector('.tv-shl-hint')) {
        var th = document.createElement('div');
        th.className = 'tv-shl-hint';
        th.textContent = T('Menu button on a team adds or removes a favorite.', 'メニューボタン：お気に入りチームの追加・削除');
        shelf.appendChild(th);
      }
    }
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
          ? T('Menu button on a faction adds or removes it from My Favorites (up to ' + MAXF + ').', 'メニューボタン：お気に入りユニットの追加・削除（' + MAXF + 'つまで）')
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
    Array.prototype.forEach.call(shelf.querySelectorAll('[data-favw],[data-favf],[data-favt]'), function(a) {
      var on = a.hasAttribute('data-favw') ? hasW(d, a.getAttribute('data-favw')) >= 0 : a.hasAttribute('data-favt') ? hasT(d, a.getAttribute('data-favt')) >= 0 : d.fs.indexOf(a.getAttribute('data-favf')) >= 0;
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
      // A video inside a set links as /set/<set>/contents/<video>: the video is what was chosen, not the set.
      var m = href.match(/contents\/(\d+)/) || href.match(/set\/(\d+)/);
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
  function kindFor(info) { return /\/set\/\d+/.test(info.href) && !/\/contents\/\d+/.test(info.href) ? 's' : 'm'; }   // a single video in a set is a match
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
      // a wrestler's page: the header at the top (assets/wrestler.js)
      if (el.closest('#tv-wr') && window.__tvWrestlerFav) { window.__tvWrestlerFav(); return true; }
      // a tag team: its menu row, its tile on All Tag Teams, or the top of its own page
      t = el.closest('[data-favt]');
      if (t && (t.closest('#tv-sm-shelf') || t.closest('#tv-tt'))) { toggleTeam(t.getAttribute('data-favt')); mark(); return true; }
      // on the My Favorites page
      t = el.closest('#tv-fp [data-fk]');
      if (t) {
        var fk = t.getAttribute('data-fk'), fv = t.getAttribute('data-fv') || '', d = load(), ix;
        if (fk === 't') { ix = hasT(d, fv); if (ix >= 0) { var tn = d.t[ix].n; d.t.splice(ix, 1); save(d); toast(T('Removed ' + tn + ' from My Favorites', tn + ' をお気に入りから削除しました')); } }
        else if (fk === 'w') { ix = hasW(d, fv); if (ix >= 0) { d.w.splice(ix, 1); save(d); toast(T('Removed ' + nameFor(fv) + ' from My Favorites', nameFor(fv) + ' をお気に入りから削除しました')); } }
        else if (fk === 'f') { ix = d.fs.indexOf(fv); if (ix >= 0) { var fo = facById(fv); d.fs.splice(ix, 1); save(d); toast(T((fo ? fo.name : 'Faction') + ' removed from My Favorites', (fo ? fo.name : 'ユニット') + ' をお気に入りから削除しました')); } }
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
    var d = load(), fac = d.fs.length ? facById(d.fs[0]) : null, rs = reminders();
    function lk(path, cls, inner) { return '<a class="tv-sm-fi ' + cls + '" tabindex="0" data-go="' + esc(path) + '" href="' + esc(BASE + path) + '">' + inner + '</a>'; }
    function row(path, label, right) { return lk(path, 'tv-fv-row', '<span class="tv-fv-l">' + esc(label) + '</span>' + right); }
    function n(v) { return '<span class="tv-fv-n">' + v + '</span>'; }
    var av = '';
    d.w.slice(0, 4).forEach(function(w) { var u = photo(w.k); if (u) av += '<span class="tv-fv-av" style="background-image:url(' + u + ')"></span>'; });
    // tag teams: the newest team's members, as a paired photo (initials without photos)
    var tav = '';
    d.t.slice(0, 1).forEach(function(t) {
      tav += '<span class="tv-fv-pr">' + (t.m || []).slice(0, 2).map(function(m, j) {
        var u = memberPhoto(t, j);
        return u ? '<span class="tv-fv-av" style="background-image:url(' + u + ')"></span>' : '<span class="tv-fv-av tv-fv-ini">' + esc(teamInitials(m)) + '</span>';
      }).join('') + '</span>';
    });
    var facPage = fac && fac.members && fac.members.length ? '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(fac.members[0].search) + '&tvfaction=' + encodeURIComponent(fac.id) + (H.categoriesOn && H.categoriesOn() ? '&q%5Btype%5D=single' : '') : '/mypage?tvfav=1';
    var lg = fac ? logo(fac.id) : '';
    var facRight = fac ? '<span class="tv-fv-lg' + (fac.plate === 'dark' ? ' dk' : '') + '">' + (lg ? '<img src="' + lg + '" alt="">' : esc(fac.name)) + '</span>' + (d.fs.length > 1 ? n(d.fs.length) : '') : '<span style="color:#9aa6b4;font-size:15px">' + esc(T('none yet', 'なし')) + '</span>';
    var colA = '<div class="tv-fv-k">' + esc(T('COLLECTIONS', 'コレクション')) + '</div>' +
      row('/mypage?tvfav=wrestlers', T('Wrestlers', 'お気に入り選手'), av + n(d.w.length)) +
      row('/mypage?tvfav=teams', T('Tag Teams', 'タッグチーム'), tav + n(d.t.length)) +
      row(facPage, d.fs.length > 1 ? T('My Factions', 'お気に入りユニット') : T('My Faction', 'お気に入りユニット'), facRight) +
      row('/mypage?tvfav=m', T('Matches', '試合'), n(d.m.length)) +
      row('/mypage?tvfav=s', T('Shows', '大会'), n(d.s.length));
    var pls = d.pl.slice(0, 5).map(function(pl, i) { return lk('/mypage?tvfav=pl&pi=' + i, 'tv-fv-pl', '<span>' + esc(pl.name) + '</span><span style="color:#9aa6b4;font-size:14px">' + pl.items.length + '</span>'); }).join('');
    var colB = '<div class="tv-fv-k">' + esc(T('LISTS', 'リスト')) + '</div>' +
      row('/mypage?tvfav=later', T('Watch Later', 'あとで見る'), n(d.later.length)) +
      row('/mypage?tvrecent=1', T('Recently Watched', '最近視聴した動画'), (parseInt(lsGet('tvFavHistN') || '0', 10) > 0 ? n(parseInt(lsGet('tvFavHistN'), 10)) : '')) +
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

  window.__tvFav = { popShow: popShow, shelfHtml: shelfHtml, decorate: decorate, mark: mark, load: load, toggleWrestler: toggleWrestler, setFaction: setFaction, toggleTeam: toggleTeam, hasTeam: function(id) { return hasT(load(), id) >= 0; } };
  window.__tvMenuKey = menuKey;

  // =============================================================== the My Favorites page
  var P = null;
  var PARAMS = null;
  try { if (location.pathname === '/mypage') { PARAMS = new URLSearchParams(location.search); P = PARAMS.get('tvfav'); } } catch (e) { P = null; }
  if (!P) return;
  MODE = ({ later: 'later', wrestlers: 'wrestlers', teams: 'teams', m: 'm', s: 's', pl: 'pl', plall: 'plall' })[P] || 'home';
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
    '#tv-fp{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B1118;color:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-fp, #tv-fp *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;box-sizing:border-box;}',
    '#tv-fp-title{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:22px 24px 8px 30px;font-size:36px;}',
    '#tv-fp-title .tv-fp-bar{flex:0 0 auto;width:12px;height:44px;background:#F4C242;}',
    '#tv-fp-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 24px 60px 24px;scroll-padding:24px 0 40px 0;scrollbar-width:none;}',
    '#tv-fp-in{max-width:1440px;margin:0 auto;}',
    '#tv-fp-scroll::-webkit-scrollbar{display:none;}',
    '.tv-fp-h{display:flex;align-items:baseline;gap:12px;margin:18px 0 8px 2px;font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '.tv-fp-h span{font-size:15px;color:#9aa6b4;letter-spacing:0;font-weight:700;}',
    '.tv-fp-track{display:flex;gap:24px;overflow-x:auto;padding:12px 10px;margin:0 -10px;scroll-padding:0 24px;scrollbar-width:none;}',
    '.tv-fp-track::-webkit-scrollbar{display:none;}',
    '.tv-fp-grid{display:grid;gap:24px;padding:6px;}',
    '.tv-fp-grid .tv-fp-t{flex:none;max-width:none;}',
    '.tv-fp-t{display:block;position:relative;flex:0 0 calc(25% - 18px);max-width:calc(25% - 18px);min-width:0;text-decoration:none !important;color:#fff !important;border-radius:8px;background:#1a1a1a;overflow:hidden;border:3px solid transparent;outline:none !important;cursor:pointer;}',
    '#tv-fp a, #tv-fp a:visited, #tv-fp a:hover, #tv-fp a *{opacity:1 !important;filter:none !important;mix-blend-mode:normal !important;}',
    '#tv-fp a:visited, #tv-fp a:hover{color:#fff !important;}',
    '#tv-fp a::before, #tv-fp a::after{content:none !important;display:none !important;}',
    '#tv-fp *:focus, #tv-fp-pop *:focus{outline:none !important;box-shadow:none !important;transform:none !important;}',
    '#tv-fp .tv-fp-bd:focus, #tv-fp .tv-fp-tk:focus{outline:3px solid #F4C242 !important;outline-offset:3px !important;box-shadow:0 0 18px rgba(244,194,66,.8) !important;transform:scale(1.03) !important;position:relative;z-index:5;}',
    '#tv-fp .tv-fp-bd:focus{background:#172029;}',
    '#tv-fp .tv-fp-card:focus, .tv-fp-card:focus{background:#F4C242;border-color:#F4C242 !important;box-shadow:0 0 18px rgba(244,194,66,.8) !important;transform:scale(1.06) !important;position:relative;z-index:5;}',
    '#tv-fp .tv-fp-t:focus{outline:3px solid #F4C242 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(244,194,66,.8) !important;transform:scale(1.03) !important;position:relative;z-index:5;}',
    '.tv-fp-img{width:100%;aspect-ratio:16/9;height:auto;min-height:165px;background:#172029 center/cover no-repeat;border-radius:5px 5px 0 0;}',
    '.tv-fp-badge{position:absolute;right:8px;top:8px;padding:4px 10px;border-radius:6px;background:rgba(0,0,0,.8);color:#F4C242;font-size:15px;font-weight:800;}',
    '.tv-fp-tt{word-break:normal;overflow-wrap:break-word;padding:12px 14px;color:#fff;font-size:15px;font-weight:bold;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;line-height:1.45em;min-height:5.8em;max-height:6.2em;}',
    '.tv-fp-all{display:flex;align-items:center;justify-content:center;border-color:#2a323c;background:#11171E;font-size:22px;font-weight:800;min-height:200px;}',
    '.tv-fp-all:focus{border-color:#F4C242 !important;}',
    '.tv-fp-all b{display:block;font-size:34px;color:#F4C242;margin-top:2px;}',
    '.tv-fp-empty{flex:1 1 auto;display:flex;align-items:center;min-height:90px;padding:0 22px;border-radius:10px;border:2px dashed #2a323c;color:#9aa6b4;font-size:17px;line-height:1.4;outline:none !important;}',
    '.tv-fp-empty:focus{border-color:#F4C242;}',
    '.tv-fp-card{display:flex;flex-direction:column;flex:0 0 158px;text-decoration:none !important;color:#fff !important;border-radius:12px;padding:4px;background:#161F2A;border:3px solid #2A323C;outline:none !important;cursor:pointer;transition:transform .15s ease-in-out;}',
    '.tv-fp-ph{position:relative;width:100%;aspect-ratio:3/4;border-radius:8px;overflow:hidden;background:#fff center top/cover no-repeat;}',
    '.tv-fp-mono{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:54px;font-weight:800;color:#fff;}',
    '.tv-fp-cn{position:absolute;left:0;right:0;bottom:0;padding:22px 8px 7px 8px;background:linear-gradient(0deg,rgba(0,0,0,.88),rgba(0,0,0,0));font-size:16px;font-weight:700;line-height:1.15;}',
    // tag team pair card: two halves of the wrestler card, the team name over the photos, members underneath
    '.tv-fp-card.tv-fp-pc{flex:0 0 324px;}',
    '.tv-fp-pc .tv-fp-pr{position:relative;display:flex;width:100%;aspect-ratio:3/2;border-radius:8px;overflow:hidden;background:#172029;}',
    '.tv-fp-pc .tv-fp-half{flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;background:#fff center top/cover no-repeat;font-size:54px;font-weight:800;color:#fff;}',
    '.tv-fp-pc .tv-fp-half + .tv-fp-half{border-left:3px solid #161F2A;}',
    '.tv-fp-pc .tv-fp-cn{padding:26px 12px 9px 12px;}',
    '.tv-fp-pc .tv-fp-cn .a{font-size:20px;font-weight:900;line-height:1.1;}',
    '.tv-fp-pc .tv-fp-cn .b{font-size:13px;font-weight:600;color:#C9D2DC;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tv-fp-more{flex:0 0 auto;font-size:18px;font-weight:800;color:#F4C242;white-space:nowrap;}',
    '.tv-fp-sec{padding:6px 10px 12px 10px;}',
    '.tv-fp-bands{display:grid;gap:16px 20px;}',
    '.tv-fp-bands.n1{grid-template-columns:1fr;}',
    '.tv-fp-bands.n2{grid-template-columns:1fr 1fr;}',
    '.tv-fp-bands.n3{grid-template-columns:1fr 1fr 1fr;}',
    '.tv-fp-bd{display:flex;align-items:center;min-width:0;border-radius:14px;background:#121922;border:3px solid #2A323C;color:#fff !important;text-decoration:none !important;outline:none !important;cursor:pointer;}',
    '.tv-fp-bd .tl{flex:none;padding:12px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;color:#111;font-weight:900;text-align:center;line-height:1.1;overflow:hidden;}',
    '.tv-fp-bd .tl.dk{background:#0F151C;}',
    '.tv-fp-bd .tl img{max-width:100%;max-height:100%;object-fit:contain;}',
    '.tv-fp-bd .tx{min-width:0;}',
    '.tv-fp-bd .nm{font-weight:900;line-height:1.1;}',
    '.tv-fp-bd .mm{color:#C9D2DC;}',
    '.tv-fp-bd .go{margin-left:auto;background:#FFB347;color:#1A1A1A;font-weight:700;font-size:16px;padding:9px 16px;border-radius:10px;white-space:nowrap;}',
    '.tv-fp-bd.l{height:170px;gap:26px;padding:10px 24px 10px 10px;}',
    '.tv-fp-bd.l .tl{width:280px;height:146px;font-size:26px;}',
    '.tv-fp-bd.l .nm{font-size:40px;}',
    '.tv-fp-bd.l .mm{font-size:16px;margin-top:6px;}',
    '.tv-fp-bd.m{height:150px;gap:22px;padding:10px 20px 10px 10px;}',
    '.tv-fp-bd.m .tl{width:230px;height:126px;font-size:22px;}',
    '.tv-fp-bd.m .nm{font-size:30px;}',
    '.tv-fp-bd.m .mm{font-size:15px;margin-top:6px;}',
    '.tv-fp-bd.s{height:140px;gap:16px;padding:10px 14px 10px 10px;}',
    '.tv-fp-bd.s .tl{width:170px;height:116px;padding:10px;font-size:18px;}',
    '.tv-fp-bd.s .nm{font-size:22px;}',
    '.tv-fp-bd.s .mm{font-size:14px;margin-top:5px;}',
    '.tv-fp-bd.s .go{display:none;}',
    '.tv-fp-bd-e{display:flex;align-items:center;min-height:90px;padding:0 22px;border-radius:14px;border:3px dashed #2a323c;color:#9aa6b4;font-size:17px;line-height:1.4;outline:none !important;}',
    '.tv-fp-bd-e:focus{border-color:#F4C242;}',
    '.tv-fp-tks{display:grid;grid-template-columns:1fr 1fr;gap:20px 24px;padding:6px 10px 18px 10px;}',
    '.tv-fp-tk{position:relative;display:flex;align-items:stretch;overflow:hidden;min-width:0;min-height:112px;border-radius:12px;background:#F3E2B8;color:#2A1C10 !important;text-decoration:none !important;border:0;outline:none !important;cursor:pointer;}',
    '.tv-fp-tk .nt{position:absolute;left:112px;width:22px;height:22px;border-radius:50%;background:#0B1118;}',
    '.tv-fp-tk .nt1{top:-11px;}',
    '.tv-fp-tk .nt2{bottom:-11px;}',
    '.tv-fp-tk .dv{position:absolute;left:123px;top:14px;bottom:14px;border-left:2px dashed rgba(42,28,16,.4);}',
    '.tv-fp-tk .stub{width:124px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:10px;}',
    '.tv-fp-tk .stub.ppv{background:#7B5CFF;color:#fff;}',
    '.tv-fp-tk .stub.gld{background:#F4C242;color:#1A1A1A;}',
    '.tv-fp-tk .stub.red{background:#D62839;color:#fff;}',
    '.tv-fp-tk .big{font-size:40px;font-weight:900;line-height:1;}',
    '.tv-fp-tk .sm{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}',
    '.tv-fp-tk .body{flex:1 1 0;min-width:0;padding:14px 22px;display:flex;flex-direction:column;justify-content:center;gap:4px;}',
    '.tv-fp-tk .a{font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#6B4A26;}',
    '.tv-fp-tk .b{font-size:23px;font-weight:800;line-height:1.15;}',
    '.tv-fp-tk .c{display:flex;align-items:center;gap:6px;font-size:14px;color:#6B4A26;}',
    '.tv-fp-tk .go{align-self:center;margin-right:18px;background:#FFB347;color:#1A1A1A;font-weight:700;font-size:15px;padding:9px 14px;border-radius:10px;white-space:nowrap;display:none;}',
    '#tv-fp .tv-fp-tk:focus .go{display:block;}',
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
    var sb = window.__tvStar ? window.__tvStar([w.k], 'card') : '';
    var inner = u ? '<div class="tv-fp-ph" style="' + (sb || 'background-image:url(' + u + ');') + '"><div class="tv-fp-cn">' + esc(n) + '</div></div>'
      : '<div class="tv-fp-ph" style="background:linear-gradient(160deg,hsl(' + hueFor(n) + ',70%,45%),hsl(' + ((hueFor(n) + 40) % 360) + ',60%,25%));"><div class="tv-fp-mono">' + esc(initials(n)) + '</div><div class="tv-fp-cn">' + esc(n) + '</div></div>';
    return '<a class="tv-fp-card" tabindex="0" data-fk="w" data-fv="' + esc(w.k) + '" href="' + esc(absUrl(wrestlerPath(w.k))) + '">' + inner + '</a>';
  }
  function teamCardHtml(t) {
    var halves = (t.m || []).slice(0, 2).map(function(m, j) {
      var u = memberPhoto(t, j);
      var sb = window.__tvStar ? window.__tvStar([m, (t.ms || [])[j]], j ? 'right' : 'left') : '';
      return u ? '<div class="tv-fp-half" style="' + (sb || 'background-image:url(' + u + ');') + '"></div>'
        : '<div class="tv-fp-half" style="background:linear-gradient(160deg,hsl(' + hueFor(m) + ',70%,45%),hsl(' + ((hueFor(m) + 40) % 360) + ',60%,25%));">' + esc(teamInitials(m)) + '</div>';
    }).join('');
    var sub = (t.m || []).join(' & ');
    return '<a class="tv-fp-card tv-fp-pc" tabindex="0" data-fk="t" data-fv="' + esc(t.id) + '" href="' + esc(absUrl('/mypage?tvteam=' + encodeURIComponent(t.id))) + '"><div class="tv-fp-pr">' + halves +
      '<div class="tv-fp-cn"><div class="a">' + esc(t.n) + '</div>' + (sub && sub !== t.n ? '<div class="b">' + esc(sub) + '</div>' : '') + '</div></div></a>';
  }
  function allTile(href, n) {
    return '<a class="tv-fp-t tv-fp-all" tabindex="0" data-fk="a" href="' + esc(href) + '"><span style="text-align:center">' + esc(T('View All', 'すべて見る')) + '<b>' + n + ' &rsaquo;</b></span></a>';
  }
  function emptyHtml(msg) { return '<div class="tv-fp-empty" tabindex="0" data-fk="e">' + esc(msg) + '</div>'; }
  function head(label, n) { return '<div class="tv-fp-h">' + esc(label) + (n !== '' ? '<span>' + n + '</span>' : '') + '</div>'; }

  // ---- the top of the page: My Faction (one to six bands) and My Reminders (paper tickets)
  var SVG_BELL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B4A26" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z"/><path d="M10 21h4"/>';
  var SVG_BELL_ON = SVG_BELL + '</svg>', SVG_BELL_OFF = SVG_BELL + '<path d="M4 4l16 16"/></svg>';
  var SVG_OWNED = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E9E5B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';
  function dateBits(ms) {
    var loc = isJa() ? 'ja-JP' : undefined, o = { m: '', w: '', d: new Date(ms).getDate() };
    try { o.m = new Date(ms).toLocaleDateString(loc, { month: 'short' }); o.w = new Date(ms).toLocaleDateString(loc, { weekday: 'short' }); } catch (e) {}
    return o;
  }
  function ppvEnd(e) { var t = Date.parse((e.ppv && e.ppv.replay_end) || ''); return isNaN(t) ? e._t + 14 * 86400000 : t; }
  // PPV shows this TV has really played (the app records it), still inside their replay window, soonest ending first
  function ownedPpvs() {
    var o = {}, now = Date.now(), out = [];
    try { if (H.ppvOwnedJson) o = JSON.parse(H.ppvOwnedJson() || '{}') || {}; } catch (e) {}
    events().forEach(function(e) { if (e.ppv && o[e.id] && now < ppvEnd(e)) out.push({ e: e, end: ppvEnd(e) }); });
    out.sort(function(a, b) { return a.end - b.end; });
    return out;
  }
  function ticketItems() {
    var now = Date.now(), items = [], seen = {};
    ownedPpvs().forEach(function(x) {
      var left = x.end - now, last = left < 86400000;
      seen[x.e.id] = 1;
      items.push({
        fk: 'o', fv: x.e.id, cls: last ? 'red' : 'ppv',
        stub: last ? '<div class="big">' + Math.max(1, Math.ceil(left / 3600000)) + 'h</div><div class="sm">' + esc(T('left', '残り')) + '</div>'
          : '<div class="big">' + Math.ceil(left / 86400000) + '</div><div class="sm">' + esc(T('days left', '日')) + '</div>',
        a: (last ? T('Last day · ends ', '最終日 · ') : T('On demand · until ', 'オンデマンド · ')) + fmtWhen(x.end),
        b: x.e.short || x.e.title, c: SVG_OWNED + esc(T('Owned · press OK to watch', '購入済み · OKで視聴')), go: T('Open', '開く')
      });
    });
    reminders().forEach(function(r) {
      if (seen[r.e.id]) return;
      seen[r.e.id] = 1;
      var live = r.e._t <= now, b = dateBits(r.e._t);
      items.push({
        fk: 'r', fv: r.e.id, cls: live ? 'red' : 'gld',
        stub: live ? '<div class="big" style="font-size:30px">LIVE</div><div class="sm">' + esc(T('now', '配信中')) + '</div>'
          : '<div class="sm">' + esc(b.m) + '</div><div class="big">' + b.d + '</div><div class="sm">' + esc(b.w) + '</div>',
        a: live ? T('On now', '配信中') : fmtWhen(r.e._t),
        b: r.e.short || r.e.title, c: SVG_BELL_ON + esc(T('Reminder set · ', '通知 · ') + offText(r.off)), go: T('Details', '詳細')
      });
    });
    var total = items.length;
    if (total < 2) {
      // fill the second place with the next show that has no reminder yet
      var nx = events().filter(function(e) { return e._t > now && !seen[e.id]; }).sort(function(a, b) { return a._t - b._t; })[0];
      if (nx) {
        var nb = dateBits(nx._t);
        items.push({
          fk: 'n', fv: nx.id, cls: 'gld',
          stub: '<div class="sm">' + esc(nb.m) + '</div><div class="big">' + nb.d + '</div><div class="sm">' + esc(nb.w) + '</div>',
          a: fmtWhen(nx._t), b: nx.short || nx.title, c: SVG_BELL_OFF + esc(T('No reminder · press OK to add', '通知なし · OKで追加')), go: T('Details', '詳細')
        });
      }
    }
    return { list: items, total: total };
  }
  function tkHtml(o) {
    return '<a class="tv-fp-tk" tabindex="0" data-fk="' + o.fk + '" data-fv="' + esc(o.fv) + '" href="#"><i class="nt nt1"></i><i class="nt nt2"></i><i class="dv"></i>' +
      '<div class="stub ' + o.cls + '">' + o.stub + '</div><div class="body"><div class="a">' + esc(o.a) + '</div><div class="b">' + esc(o.b) + '</div><div class="c">' + o.c + '</div></div>' +
      '<span class="go">' + esc(o.go) + '</span></a>';
  }
  function bandHtml(f, cls) {
    var lg = logo(f.id), cnt = (f.members || []).length;
    var page = cnt ? '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(f.members[0].search) + '&tvfaction=' + encodeURIComponent(f.id) + (H.categoriesOn && H.categoriesOn() ? '&q%5Btype%5D=single' : '') : '/';
    return '<a class="tv-fp-bd ' + cls + '" tabindex="0" data-fk="f" data-fv="' + esc(f.id) + '" href="' + esc(absUrl(page)) + '">' +
      '<div class="tl' + (f.plate === 'dark' ? ' dk' : '') + '">' + (lg ? '<img src="' + lg + '" alt="">' : esc(f.name)) + '</div>' +
      '<div class="tx"><div class="nm">' + esc(f.name) + '</div><div class="mm">' + cnt + T(' members', '人') + (cls === 'l' ? T(' · OK opens their videos', ' · OKで動画を開く') : '') + '</div></div>' +
      '<span class="go">' + esc(T('Open', '開く')) + '</span></a>';
  }
  function topRow(d) {
    var facs = d.fs.map(facById).filter(function(f) { return !!f; }), n = facs.length, hf;
    if (n) {
      var cls = n === 1 ? 'l' : (n === 2 ? 'm' : 's');
      hf = '<div class="tv-fp-bands n' + Math.min(n, 3) + '">' + facs.map(function(f) { return bandHtml(f, cls); }).join('') + '</div>';
    } else {
      hf = '<div class="tv-fp-bd-e" tabindex="0" data-fk="e">' + esc(T('Pick your factions in the menu: Factions, then the Menu button', 'メニューのユニットで選んでください')) + '</div>';
    }
    var tk = ticketItems(), ht;
    if (tk.list.length) ht = '<div class="tv-fp-tks">' + tk.list.slice(0, 2).map(tkHtml).join('') + '</div>' + (tk.total > 2 ? '<div class="tv-fp-more" style="padding:4px 12px">+' + (tk.total - 2) + T(' more', '件') + '</div>' : '');
    else ht = emptyHtml(T('No reminders yet. Open a show under Shows and choose Remind me.', 'リマインダーはまだありません'));
    return head(n > 1 ? T('MY FACTIONS', 'お気に入りユニット') : T('MY FACTION', 'お気に入りユニット'), n > 1 ? n : '') + '<div class="tv-fp-sec">' + hf + '</div>' +
      head(T('MY REMINDERS', 'マイリマインダー'), tk.total || '') + ht;
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
      body += head(T('FAVORITE TAG TEAMS', 'お気に入りタッグチーム'), d.t.length);
      body += '<div class="tv-fp-track" data-row="t">' + (d.t.length ? d.t.slice(0, 8).map(teamCardHtml).join('') + (d.t.length > 8 ? allTile(absUrl('/mypage?tvfav=teams'), d.t.length) : '') : emptyHtml(T('No favorite tag teams yet. Open Tag Teams in the menu, highlight a team and press the Menu button.', 'タッグチームはまだありません。メニューのタッグチームから選び、メニューボタンを押してください。'))) + '</div>';
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
    } else if (MODE === 'teams') {
      title = T('Favorite Tag Teams', 'お気に入りタッグチーム');
      body += d.t.length ? '<div class="tv-fp-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">' + d.t.map(teamCardHtml).join('') + '</div>' : emptyHtml(T('No favorite tag teams yet.', 'まだありません'));
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
    for (var i = 0; i < all.length; i++) if (/^(w|t|l|f|m|s|p|pi)$/.test(all[i].getAttribute('data-fk'))) return all[i];
    return all[0] || null;
  }
  function focusables() { return Array.prototype.slice.call(root.querySelectorAll('[data-fk]')); }
  function hint() {
    var el = document.getElementById('tv-fp-hint'), ae = document.activeElement, fk = ae && ae.getAttribute ? ae.getAttribute('data-fk') : '';
    if (!el) return;
    el.textContent = (fk === 'w' || fk === 't' || fk === 'f' || fk === 'r') ? T('Menu button: remove', 'メニューボタン：削除')
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
    if (!cand.length) {
      // the end of a row wraps round to its first tile
      if (dir === 'right') {
        var trk = cur.closest ? cur.closest('.tv-fp-track') : null;
        var firstT = trk ? trk.querySelector('[data-fk]') : null;
        if (firstT && firstT !== cur) { focusEl(firstT); return true; }
      }
      return false;
    }
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
    else if ((k === 13 || k === 23 || k === 32) && /^(r|o|n)$/.test(ae.getAttribute('data-fk'))) {
      stop();
      if (window.__tvEvOpen) window.__tvEvOpen(ae.getAttribute('data-fv'));
    } else if ((k === 13 || k === 23 || k === 32) && (ae.getAttribute('data-fk') === 'e')) { stop(); }
  }, true);
  root.addEventListener('click', function(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-fk="r"],[data-fk="o"],[data-fk="n"]') : null;
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
        if (items.length) lsSet('tvFavHistN', String(items.length));
        render(true);
        return;
      }
      last = items.length;
    }, 400);
  }
})();
