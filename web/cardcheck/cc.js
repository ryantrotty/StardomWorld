(function(){
  // StarScope card check on the iPhone (2.91.0): a Safari bookmark on any stardom-world.com page loads this file from
  // GitHub Pages. It opens over the page as its own full-screen app and moves between shows by itself (Log a show lists,
  // a show's card, Next show), reading the site's show and match pages in the background, one at a time, 2 s apart,
  // as the TV does. Saves go straight to the sheet's script with the card check key (CARDCHECK_KEY, logging only).
  // The TV's own scripts do the work underneath: videoindex.js (match page reader), indexpanel.js (library, name and
  // venue matching, faction pre-fill, and the save itself), shownames.js and setorder.js, with a small stand-in for the
  // TV app's bridge (AndroidHost). docs/CARDCHECK_PHONE.md has the setup.
  if (window.__ccPhone) { window.__ccPhone.open(); return; }
  if (!/(^|\.)stardom-world\.com$/.test(location.hostname)) { alert('Open www.stardom-world.com in Safari first, then tap the bookmark.'); return; }
  var me = document.currentScript && document.currentScript.src || '';
  var BASE = me ? me.replace(/[^\/]*$/, '') : 'https://ryantrotty.github.io/StardomWorld/cardcheck/';
  var VER = (/[?&]v=([^&]+)/.exec(me) || [])[1] || String(Date.now());
  var ROSTER = 'https://raw.githubusercontent.com/ryantrotty/StardomWorld/roster-data/roster.json';
  var CFG_KEY = 'ccPhoneCfg', STATE_KEY = 'ccPhoneState', CARDS_KEY = 'ccPhoneCards', YEAR_KEY = 'ccPhoneYear_', SET_KEY = 'ccPhoneSet', REC_KEY = 'ccPhoneRec';
  var GAP = 2000, SET_AGE = 86400000, YEAR_AGE = 86400000, lastSetLook = null;

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ssGet(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function hasJa(t) { return /[　-鿿＀-￯]/.test(String(t || '')); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dateText(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    if (!m) return '';
    return DAY[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()] + ' ' + (+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + m[1];
  }
  function isComment(t) { return /コメント|comments?\b/i.test(t) && !/試合|マッチ|match|commentary/i.test(t); }
  function showName(n, date) { return window.__tvShowName ? window.__tvShowName.en(n, date, false) : n; }

  // ---- the page: one root over everything
  var root = document.createElement('div');
  root.id = 'ccp'; root.className = 'notranslate'; root.setAttribute('translate', 'no');
  var st = document.createElement('style');
  st.textContent = [
    '#ccp{position:fixed;inset:0;z-index:2147483000;background:#0B1118;color:#fff;font:16px -apple-system,system-ui,Arial,sans-serif;overflow:auto;-webkit-overflow-scrolling:touch;-webkit-text-size-adjust:100%}',
    '#ccp *{box-sizing:border-box}#ccp button{font:inherit;-webkit-tap-highlight-color:transparent}',
    '#ccp .top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top) + 10px) 14px 10px;background:rgba(11,17,24,.96);border-bottom:1px solid #2A323C}',
    '#ccp .wm{font-weight:900;letter-spacing:.06em}#ccp .wm b{color:#F4C242}#ccp .tt{flex:1;min-width:0;font:700 14px system-ui;color:#C9D2DC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#ccp .ib{flex:none;min-width:40px;height:40px;border-radius:10px;border:1px solid #2A323C;background:#161F2A;color:#fff;font-weight:700;padding:0 10px}',
    '#ccp .pad{padding:14px 14px calc(env(safe-area-inset-bottom) + 90px)}',
    '#ccp .chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px}#ccp .chip{flex:none;height:36px;padding:0 14px;border-radius:20px;border:1px solid #2A323C;background:#161F2A;color:#C9D2DC;font-weight:700}',
    '#ccp .chip.on{background:#FFB347;border-color:#FFB347;color:#1A1A1A}',
    '#ccp .sc{display:flex;gap:12px;align-items:center;background:#161F2A;border:1px solid #2A323C;border-radius:12px;padding:8px;margin-bottom:10px;width:100%;text-align:left;color:#fff}',
    '#ccp .sc .im{flex:none;width:128px;aspect-ratio:16/9;border-radius:8px;background:#0F151C center/cover no-repeat}#ccp .sc .nm{font-weight:700;font-size:15px;line-height:1.25}#ccp .sc .sb{font-size:13px;color:#9AA6B4;margin-top:4px}',
    '#ccp .cnt{display:inline-block;margin-top:6px;font:800 11px system-ui;letter-spacing:1px;text-transform:uppercase;color:#F4C242}#ccp .cnt.done{color:#7FD3A0}',
    '#ccp .card{background:#0F151C;border:1px solid #2A323C;border-radius:14px;margin-bottom:16px;overflow:hidden}',
    '#ccp .card .pic{width:100%;aspect-ratio:16/9;background:#161F2A center/cover no-repeat}#ccp .card .bd{padding:12px 14px;display:flex;flex-direction:column;gap:8px}',
    '#ccp .hd{display:flex;align-items:center;gap:8px;font-weight:900;font-size:17px}#ccp .hd .t{flex:1;min-width:0}',
    '#ccp .chp{flex:none;font:800 10px system-ui;letter-spacing:1px;text-transform:uppercase;border-radius:20px;padding:4px 8px;white-space:nowrap}',
    '#ccp .chp.t{background:#2A2410;color:#F4C242;border:1px solid #6B5A22}#ccp .chp.w{background:#12261B;color:#7FD3A0;border:1px solid #2E9E5B}#ccp .chp.r{color:#9AA6B4;border:1px dashed #3B4656}#ccp .chp.a{background:#2A1C10;color:#FFB347;border:1px solid #FFB347}',
    '#ccp .gl{font:800 11px system-ui;letter-spacing:1px;text-transform:uppercase;color:#9AA6B4}#ccp .fg{font:800 11px system-ui;letter-spacing:1px;text-transform:uppercase;color:#F4C242}',
    '#ccp .vs{align-self:center;font:900 12px system-ui;letter-spacing:2px;color:#F4C242}',
    '#ccp .pp{display:flex;align-items:center;gap:10px;border:1px solid #2A323C;background:#161F2A;border-radius:10px;padding:6px 10px;min-height:42px;width:100%;text-align:left;color:#fff}',
    '#ccp .pp.bad{border-color:#FFB347;background:#2A1C10}#ccp .pp .mk{flex:none;width:24px;height:24px;border-radius:12px;display:flex;align-items:center;justify-content:center;font:900 13px system-ui;background:#12261B;color:#7FD3A0}',
    '#ccp .pp.bad .mk{background:#2A1C10;color:#FFB347;border:1px solid #FFB347}#ccp .pp .n{font-weight:700;font-size:16px}#ccp .pp small{display:block;font-size:12px;color:#9AA6B4}#ccp .pp small.w{color:#FFB347}',
    '#ccp .rw{display:flex;gap:10px;font-size:14px}#ccp .rw .lb{flex:0 0 92px;font:800 11px system-ui;letter-spacing:1px;text-transform:uppercase;color:#9AA6B4;padding-top:2px}#ccp .rw .vl{flex:1;min-width:0;color:#C9D2DC}',
    '#ccp .sg{display:inline-block;margin:0 6px 4px 0;padding:2px 8px;border-radius:20px;border:1px solid #6B5A22;background:#2A2410;color:#F4C242;font:800 12px system-ui}',
    '#ccp .bt{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}#ccp .b{height:46px;padding:0 16px;border-radius:10px;border:1px solid #2A323C;background:#161F2A;color:#C9D2DC;font-weight:700}',
    '#ccp .b.on{background:#FFB347;border-color:#FFB347;color:#1A1A1A}#ccp .b.wide{flex:1}#ccp .b:disabled{opacity:.5}',
    '#ccp .ven{background:#0F151C;border:1px solid #2A323C;border-radius:12px;padding:10px 12px;margin-bottom:14px;display:flex;flex-direction:column;gap:8px}',
    '#ccp .ven .vv{font-weight:700}#ccp .ven .vv.bad{color:#FFB347}#ccp .ven .vk{font:700 12px system-ui;color:#7FD3A0}#ccp .ven .sub{font-size:12px;color:#9AA6B4}',
    '#ccp input.tx{width:100%;height:44px;border-radius:10px;border:2px solid #2A323C;background:#161F2A;color:#fff;font:600 16px system-ui;padding:0 12px;outline:none}#ccp input.tx:focus{border-color:#F4C242}',
    '#ccp .opt{display:block;width:100%;text-align:left;min-height:44px;padding:8px 12px;border-radius:10px;border:1px solid #2A323C;background:#161F2A;color:#fff;font-weight:700;margin-top:6px}#ccp .opt small{display:block;font-weight:600;color:#9AA6B4;font-size:12px}',
    '#ccp .msg{font:700 13px system-ui;color:#7FD3A0}#ccp .msg.er{color:#FF7A66}#ccp .ld{color:#9AA6B4;padding:12px 0}#ccp .er{color:#FF7A66;padding:8px 0}',
    '#ccp .sheet{position:fixed;left:0;right:0;bottom:0;max-height:80%;overflow:auto;z-index:10;background:#0F151C;border-top:2px solid #F4C242;border-radius:16px 16px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom) + 18px)}',
    '#ccp .shade{position:fixed;inset:0;z-index:9;background:rgba(0,0,0,.55)}',
    '#ccp .end{background:#0F151C;border:2px solid #F4C242;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px}',
    '#ccp .er2{display:flex;align-items:center;gap:10px;font-size:14px}#ccp .er2 b{flex:0 0 22px;color:#9AA6B4}#ccp .er2 span.x{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  ].join('');
  (document.head || document.documentElement).appendChild(st);

  // ---- settings: the card check link, pasted once (script address + key)
  var cfg = lsGet(CFG_KEY), oldCfg = null, setupVals = { u: '', k: '' };
  // 2.91.2: two boxes, the web app address and the key. The address can be pasted with anything after /exec (the
  // phone logger's link, say): only up to /exec is kept. A whole card check link (…/exec?cc=…) in the first box works too.
  function parseLink(addr, key) {
    addr = String(addr || '').replace(/\s+/g, ''); key = String(key || '').trim();
    var m = /(https:\/\/script\.google\.com\/(?:a\/[^\/]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec)/.exec(addr);
    if (!m) return { err: 'The address should look like https://script.google.com/macros/s/…/exec' };
    if (!key) { var k = /[?&]cc=([^&#]+)/.exec(addr); if (k) key = decodeURIComponent(k[1]); }
    if (!key) return { err: 'Paste the card check key (CARDCHECK_KEY) in the second box.' };
    return { u: m[1], k: key };
  }

  // ---- the bridge the TV's scripts expect (AndroidHost), answered here
  var FACT = '{"factions":[]}', MT = '{}', SW = '';
  function post(body, done) {
    body.key = cfg.k; body.device = 'iphone-cardcheck'; body.owner = true;
    fetch(cfg.u, { method: 'POST', body: JSON.stringify(body) })
      .then(function(r) { return r.text().then(function(t) { return { code: r.status, t: t }; }); })
      .then(function(x) { done(/^\s*\{/.test(x.t) ? x.t : JSON.stringify({ ok: false, error: 'HTTP ' + x.code + ' ' + x.t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) })); })
      .catch(function(e) { done(JSON.stringify({ ok: false, error: String(e && e.message || e) })); });
  }
  function host() {
    window.AndroidHost = {
      indexSync: function(id, p) { post(JSON.parse(p), function(t) { if (window.__tvIndexReply) window.__tvIndexReply(id, t); }); },
      starCards: function(id, p) { post(JSON.parse(p), function(t) { if (window.__tvStarCardsReply) window.__tvStarCardsReply(id, t); }); },
      scopeOn: function() { return true; }, videoIndexOn: function() { return true; }, categoriesOn: function() { return true; },
      indexPanel: function() {}, videoIndexPut: function() {},
      factionsJson: function() { return FACT; }, matchTypesJson: function() { return MT; }, showWordsJson: function() { return SW; }
    };
  }
  function getJson(u) { return fetch(u, { cache: 'no-cache' }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  function getText(u) { return fetch(u).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }); }
  // Factions: the app's file with the roster file's changes on top, as the TV app merges them (rosterFactions).
  function mergeFactions(base, roster) {
    var fr = roster && roster.factions, list = (base.factions || []).slice();
    if (!fr) return base;
    var rm = {}; (fr.remove || []).forEach(function(id) { rm[id] = 1; });
    list = list.filter(function(f) { return !rm[f.id]; });
    (fr.set || []).forEach(function(o) {
      if (!o || !o.id) return;
      var at = list.map(function(f) { return f.id; }).indexOf(o.id);
      if (at >= 0) list[at] = o;
      else if (o.former) list.push(o);
      else { var f0 = list.map(function(f) { return !!f.former; }).indexOf(true); if (f0 >= 0) list.splice(f0, 0, o); else list.push(o); }
    });
    Object.keys(fr.members || {}).forEach(function(id) {
      var fac = list.filter(function(f) { return f.id === id; })[0], ch = fr.members[id];
      if (!fac || !ch) return;
      var gone = {}; (ch.remove || []).forEach(function(n) { gone[String(n).trim().toLowerCase()] = 1; });
      var mem = (fac.members || []).filter(function(m) { return !gone[String(m.name || '').trim().toLowerCase()]; });
      (ch.add || []).forEach(function(o) {
        var n = String(o && o.name || '').trim(); if (!n) return;
        if (!o.search) o.search = n;
        var at = mem.map(function(m) { return String(m.name || '').trim().toLowerCase(); }).indexOf(n.toLowerCase());
        if (at >= 0) mem[at] = o; else mem.push(o);
      });
      fac.members = mem;
    });
    base.factions = list;
    return base;
  }
  function loadScript(name) {
    return new Promise(function(ok, bad) {
      var s = document.createElement('script');
      s.src = BASE + name + '?v=' + VER; s.onload = ok; s.onerror = function() { bad(new Error('could not load ' + name)); };
      document.body.appendChild(s);
    });
  }
  function boot() {
    host();
    var roster = getJson(ROSTER).catch(function() { return null; });
    return Promise.all([getJson(BASE + 'factions.json?v=' + VER), getJson(BASE + 'match_types.json?v=' + VER), roster]).then(function(a) {
      FACT = JSON.stringify(mergeFactions(a[0], a[2]));
      var mt = a[1]; if (a[2] && a[2].debuts) { mt.debuts = mt.debuts || {}; Object.keys(a[2].debuts).forEach(function(k) { mt.debuts[k] = a[2].debuts[k]; }); }
      MT = JSON.stringify(mt);
      SW = a[2] && a[2].showWords ? JSON.stringify(a[2].showWords) : '';
      return ['shownames.js', 'setorder.js', 'videoindex.js', 'indexpanel.js'].reduce(function(p, n) { return p.then(function() { return loadScript(n); }); }, Promise.resolve());
    });
  }

  // ---- the StarScope list (what is logged): one request at a time, changes only after the first copy
  var map = (lsGet(CARDS_KEY) || {}).map || {}, cardsBusy = false, cardsAgain = false;
  function cards(full) {
    if (cardsBusy) { cardsAgain = true; return; }
    var c = lsGet(CARDS_KEY), body = { action: 'vi_cards' };
    if (c && c.s && !full && Date.now() - (c.f || 0) < 86400000) body.since = c.s;
    cardsBusy = true;
    post(body, function(t) {
      cardsBusy = false;
      var r = null; try { r = JSON.parse(t); } catch (e) {}
      if (r && r.ok && r.map) {
        if (r.since && c && c.map) {
          var m = c.map; Object.keys(r.map).forEach(function(k) { m[k] = r.map[k]; });
          if (r.all) { var keep = {}; r.all.forEach(function(k) { keep[k] = 1; }); Object.keys(m).forEach(function(k) { if (!keep[k]) delete m[k]; }); }
          map = m; lsSet(CARDS_KEY, { s: r.now || c.s, f: c.f || 0, map: m });
        } else { map = r.map; lsSet(CARDS_KEY, { s: r.now || '', f: Date.now(), map: map }); }
        draw();
      } else if (!Object.keys(map).length && !flash) note('StarScope list: ' + (r && r.error || 'no reply'), true, /key/i.test(r && r.error || ''));
      if (cardsAgain) { cardsAgain = false; setTimeout(function() { cards(); }, 300); }
    });
  }

  // ---- state
  var S = lsGet(STATE_KEY) || { screen: 'home', tab: 'started', year: '', set: '', from: '' };
  function saveState() { lsSet(STATE_KEY, { screen: S.screen, tab: S.tab, year: S.year, set: S.set, from: S.from, y: root.scrollTop }); }
  var kitReady = false, show = null, recs = {}, saved = {}, attn = {}, reading = null, lastFetch = 0, readQ = [], sheetOpen = null, flash = '', flashBad = false, batch = null;
  var vs = { mode: 'view', text: '', busy: '', msg: '', err: '' };
  function kit() { return kitReady && window.__tvIndexKit; }
  var flashKey = false;
  function note(t, bad, keyIssue) { flash = t; flashBad = !!bad; flashKey = !!keyIssue; draw(); }

  // ---- Log a show: shows started, and the site's list of a year's shows (a page at a time, the next when you ask)
  function setCount(set, vids) {
    set = String(set);
    var n = 0, tot = vids ? vids.length : 0, mids = {};
    if (vids) vids.forEach(function(v) { if (map[v.id]) n++; });
    else Object.keys(map).forEach(function(k) { var c = map[k]; if (String(c.vs || c.sid || '') === set && !mids[c.x && c.x.m]) { mids[c.x && c.x.m] = 1; n++; if (+c.t > tot) tot = +c.t; } });
    return { n: n, tot: tot, done: tot > 0 && n >= tot };
  }
  function startedList() {
    var by = {};
    Object.keys(map).forEach(function(k) {
      var c = map[k], sid = String(c.vs || c.sid || ''); if (!sid) return;
      var g = by[sid] = by[sid] || { set: sid, name: c.sh || '', date: c.d || '', venue: c.vn || '', th: '', mids: {}, n: 0, tot: 0 };
      if (!g.th && c.th) g.th = c.th;
      var mid = c.x && c.x.m; if (!g.mids[mid]) { g.mids[mid] = 1; g.n++; }
      if (+c.t > g.tot) g.tot = +c.t;
    });
    return Object.keys(by).map(function(k) { var g = by[k], sc = lsGet(SET_KEY + k); if (sc && sc.videos) { var x = setCount(k, sc.videos); g.n = x.n; g.tot = x.tot; } return g; })
      .filter(function(g) { return !(g.tot > 0 && g.n >= g.tot); })
      .sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  }
  function years() {
    var y = {}; try { y = (JSON.parse(MT).siteCategories || {}).years || {}; } catch (e) {}
    return Object.keys(y).sort(function(a, b) { return b.localeCompare(a); });
  }
  var yl = null;
  function yearOpen(y) {
    var c = lsGet(YEAR_KEY + y);
    yl = c && Date.now() - (c.t || 0) < YEAR_AGE ? { y: y, items: c.items || [], page: c.page || 0, done: !!c.done, t: c.t } : { y: y, items: [], page: 0, done: false, t: Date.now() };
    yl.busy = false; yl.err = '';
    if (!yl.page) yearPage();
  }
  function yearPage() {
    var cat = 0; try { cat = ((JSON.parse(MT).siteCategories || {}).years || {})[yl.y]; } catch (e) {}
    if (!yl || yl.busy || yl.done || !cat) { if (yl && !cat) yl.done = true; return; }
    var mine = yl, n = yl.page + 1; yl.busy = true; yl.err = ''; draw();
    fetch('/contents/search?q%5Bkeyword%5D=&q%5Bcategory_id%5D=' + encodeURIComponent(cat) + '&q%5Btype%5D=set&activetab=contents&page=' + n, { credentials: 'include' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html'), seen = {}, got = 0;
        mine.items.forEach(function(x) { seen[x.set] = 1; });
        Array.prototype.forEach.call(doc.querySelectorAll('.content-list-item, article'), function(it) {
          var a = it.querySelector('a[href*="/set/"]'), m = a && /\/set\/(\d+)/.exec(a.getAttribute('href') || '');
          if (!m || seen[m[1]] || /\/contents\//.test(a.getAttribute('href'))) return;
          seen[m[1]] = 1; got++;
          var bg = it.querySelector('[style*="background-image"]'), mm = bg && /url\(['"]?(.*?)['"]?\)/.exec(bg.getAttribute('style') || '');
          var tEl = it.querySelector('h3, h4, .ttl-xs, .content-title'), name = String((tEl || a).textContent || '').replace(/\s+/g, ' ').trim();
          mine.items.push({ set: m[1], name: name, th: mm ? mm[1] : '' });
        });
        mine.page = n; if (!got) mine.done = true;
        lsSet(YEAR_KEY + mine.y, { t: mine.t, items: mine.items, page: mine.page, done: mine.done });
      })
      .catch(function(e) { mine.err = String(e && e.message || e); })
      .then(function() { mine.busy = false; draw(); });
  }
  function showTile(x, from) {
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+x.set, x.name, from.slice(1) || null) : { show: x.name, date: x.date || '' };
    var sc = lsGet(SET_KEY + x.set), c = setCount(x.set, sc && sc.videos), date = sl.date || x.date || '';
    var label = c.tot ? c.n + '/' + c.tot + (c.done ? ' · logged' : '') : c.n + ' logged';
    return '<button class="sc" data-go="' + esc(x.set) + '" data-from="' + esc(from) + '"><span class="im"' + (x.th ? ' style="background-image:url(\'' + esc(x.th) + '\')"' : '') + '></span><span><span class="nm">' +
      esc(showName(sl.show || x.name, date) || x.name) + '</span><span class="sb">' + esc([dateText(date), sl.venue || x.venue || ''].filter(Boolean).join(' · ')) + '</span><span class="cnt' + (c.done ? ' done' : '') + '">' + esc(label) + '</span></span></button>';
  }
  function homeHtml() {
    var h = '<div class="chips"><button class="chip' + (S.tab === 'started' ? ' on' : '') + '" data-tab="started">Started</button>';
    years().forEach(function(y) { h += '<button class="chip' + (S.tab === 'year' && S.year === y ? ' on' : '') + '" data-year="' + y + '">' + y + '</button>'; });
    h += '</div>';
    if (S.tab === 'started') {
      var L = startedList();
      h += L.length ? L.map(function(g) { return showTile(g, 'started'); }).join('') : '<div class="ld">' + (Object.keys(map).length ? 'Nothing started and unfinished. Pick a year.' : 'Loading the StarScope list…') + '</div>';
    } else {
      if (!yl || yl.y !== S.year) yearOpen(S.year);
      h += yl.items.map(function(x) { return showTile(x, 'y' + S.year); }).join('');
      if (yl.err) h += '<div class="er">Couldn\'t read the list (' + esc(yl.err) + ')</div><button class="b on" data-more="1">Try again</button>';
      else if (yl.busy) h += '<div class="ld">Reading the site\'s list…</div>';
      else if (!yl.done) h += '<button class="b wide" data-more="1">Load more shows</button>';
      else h += '<div class="ld">That\'s every show for ' + esc(S.year) + '.</div>';
    }
    return h;
  }

  // ---- a show: its page read once (kept a day), each match page as you scroll to it
  function readSetHtml(html, set) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var og = doc.querySelector('meta[property="og:title"]'), line = og ? String(og.getAttribute('content') || '').replace(/\s*\|\s*Stardom World\s*$/i, '').trim() : '';
    if (!line) { var hh = doc.querySelector('h1, h2'); line = hh ? hh.textContent.replace(/\s+/g, ' ').trim() : ''; }
    var seen = {}, vids = [];
    Array.prototype.forEach.call(doc.querySelectorAll('a[href*="/set/' + set + '/contents/"]'), function(a) {
      var m = /\/contents\/(\d+)/.exec(a.getAttribute('href') || '');
      if (!m) return;
      var art = a.closest('article') || a.parentElement, v = seen[m[1]];
      if (!v) { v = seen[m[1]] = { id: m[1], t: '', th: '' }; vids.push(v); }
      if (!v.th) { var bg = art && art.querySelector('[style*="background-image"]'), mm = bg && /url\(['"]?(.*?)['"]?\)/.exec(bg.getAttribute('style') || ''); if (mm) v.th = mm[1]; }
      if (!v.t) { var h3 = art && art.querySelector('h3, .ttl-xs'); v.t = (h3 ? h3.textContent : a.textContent || '').replace(/\s+/g, ' ').trim(); }
    });
    // 2.91.4: a page that doesn't link its matches as /set/<id>/contents/<video> (the phone can be sent another layout):
    // the videos in the page's own article cards, outside the related rows.
    if (!vids.length) Array.prototype.forEach.call(doc.querySelectorAll('article a[href*="/contents/"]'), function(a) {
      var m = /\/contents\/(\d+)(?:[?#\/]|$)/.exec(a.getAttribute('href') || '');
      if (!m || seen[m[1]] || a.closest('.related, [class*="related"], [class*="recommend"]')) return;
      var art = a.closest('article'), v = seen[m[1]] = { id: m[1], t: '', th: '' }; vids.push(v);
      var bg = art && art.querySelector('[style*="background-image"]'), mm = bg && /url\(['"]?(.*?)['"]?\)/.exec(bg.getAttribute('style') || ''); if (mm) v.th = mm[1];
      var im = !v.th && art && art.querySelector('img[src], img[data-src]'); if (im) v.th = im.getAttribute('data-src') || im.getAttribute('src');
      var h3 = art && art.querySelector('h3, h4, .ttl-xs'); v.t = (h3 ? h3.textContent : a.textContent || '').replace(/\s+/g, ' ').trim();
    });
    lastSetLook = { title: doc.title, len: html.length, articles: doc.querySelectorAll('article').length, setLinks: doc.querySelectorAll('a[href*="/set/' + set + '/contents/"]').length,
      contentLinks: Array.prototype.filter.call(doc.querySelectorAll('a[href*="/contents/"]'), function(a) { return /\/contents\/\d+/.test(a.getAttribute('href') || ''); }).slice(0, 4).map(function(a) { return a.getAttribute('href'); }),
      scripts: doc.querySelectorAll('script[src]').length, found: vids.length };
    vids = vids.filter(function(v) { return !isComment(v.t); });
    var so = window.__tvSetOrder, ord = so ? so.forSet(set, vids.map(function(v) { return { id: Number(v.id), t: v.t }; })) : null;
    if (ord && ord.flip) vids.reverse();
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+set, line, null) : { show: line };
    return { set: set, line: line, name: sl.show || line, date: sl.date || '', venue: sl.venue || '', videos: vids, t: Date.now() };
  }
  function openShow(set, from) {
    S.screen = 'show'; S.set = String(set); S.from = from || S.from || 'started';
    show = null; recs = {}; attn = {}; readQ = []; diag = ''; vs = { mode: 'view', text: '', busy: '', msg: '', err: '' }; batch = null;
    saveState(); draw(); root.scrollTop = 0;
    var c = lsGet(SET_KEY + set);
    if (c && c.videos && c.videos.length && Date.now() - (c.t || 0) < SET_AGE) { show = c; draw(); return; }
    var go = function() {
      lastFetch = Date.now();
      var got = '';
      fetch('/set/' + set, { credentials: 'include' }).then(function(r) { got = r.url + ' · HTTP ' + r.status; if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function(html) {
        var s = readSetHtml(html, String(set));
        // What the phone was sent, kept on screen (2.91.4), so a different page layout can be seen and read.
        if (!s.videos.length) { var L = lastSetLook || {}; diag = 'Show ' + set + ': ' + got + ' · ' + (L.len || 0) + ' characters · "' + String(L.title || '').slice(0, 60) + '" · ' + (L.articles || 0) + ' article cards · ' + (L.setLinks || 0) + ' match links · ' + (L.scripts || 0) + ' scripts · video links: ' + ((L.contentLinks || []).join(' ') || 'none'); throw new Error('no matches on the page'); }
        if (S.set !== String(set)) return;
        show = s; lsSet(SET_KEY + set, s); draw();
      }).catch(function(e) { if (S.set === String(set)) note('Couldn\'t read the show page (' + (e && e.message || e) + ')', true); });
    };
    var wait = lastFetch + GAP - Date.now();
    if (wait > 0) setTimeout(go, wait); else go();
  }
  function want(id) { if (!recs[id] && readQ.indexOf(id) < 0 && !ssGet(REC_KEY + id)) { readQ.push(id); pump(); } else if (!recs[id]) { recs[id] = ssGet(REC_KEY + id); draw(); } }
  function pump() {
    if (reading || !readQ.length || !show) return;
    var wait = lastFetch + GAP - Date.now();
    if (wait > 0) { setTimeout(pump, wait); return; }
    var id = readQ.shift(), set = show.set;
    reading = id; lastFetch = Date.now();
    fetch('/set/' + set + '/contents/' + id, { credentials: 'include' }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function(html) {
      var rec = window.__tvVixRead ? window.__tvVixRead(new DOMParser().parseFromString(html, 'text/html'), id, set) : null;
      if (!rec) throw new Error('nothing read');
      recs[id] = rec; ssSet(REC_KEY + id, rec);
    }).catch(function(e) { recs[id] = { failed: String(e && e.message || e) }; }).then(function() {
      reading = null; if (show && show.set === set) draw(); pump();
    });
  }
  function status(v) {
    if (saved[v.id]) return { k: 'saved', label: 'Logged' };
    var c = map[v.id];
    if (c) return c.x && c.x.tb ? { k: 'thumb', label: 'Logged from thumbnail' } : { k: 'watched', label: 'Logged while watching' };
    return null;
  }
  function sides(r) { var useEn = r.sides_en && r.sides_en.length >= 2; return { A: useEn ? r.sides_en : (r.sides_ja || []), B: useEn ? (r.sides_ja || []) : [] }; }
  function cls(v) {
    var r = recs[v.id];
    if (status(v)) return 'logged';
    if (!r) return 'unread';
    if (r.failed || attn[v.id]) return 'attn';
    var s = sides(r), K = kit();
    if (s.A.length < 2) return 'attn';
    if (!K) return 'unread';
    return s.A.some(function(names, i) { return names.some(function(raw, j) { var o = s.B[i] && s.B[i].length === names.length ? s.B[i][j] : ''; return !(K.resolve(raw) || K.resolve(o)); }); }) ? 'attn' : 'ready';
  }
  function kindOf(r) {
    var s = sides(r).A; if (s.length < 2) return '';
    var sizes = s.map(function(x) { return x.length; }), size = Math.max.apply(null, sizes), n = s.length;
    if (n > 2 && n < 5 && size < 4 && sizes.every(function(x) { return x === size; })) return n + '-Way ' + ['Battle', 'Tag Battle', 'Trios'][size - 1];
    if (n > 2) return size > 1 ? n + ' teams of ' + size : n + '-Way';
    if (sizes[0] !== sizes[1]) return sizes[0] + '-on-' + sizes[1] + ' handicap';
    return size <= 1 ? 'Singles match' : size === 2 ? 'Tag team match' : (size * 2) + '-person tag';
  }
  function peopleHtml(v, r) {
    var s = sides(r), K = kit(), h = '', date = r.date || show.date;
    if (s.A.length < 2) return '<div class="er">No line-up could be read.</div>';
    s.A.forEach(function(names, i) {
      if (i) h += '<div class="vs">VS</div>';
      var ids = K ? names.map(function(raw, j) { var o = s.B[i] && s.B[i].length === names.length ? s.B[i][j] : ''; return K.resolve(raw) || K.resolve(o); }) : [];
      var g = K && K.side ? K.side(ids, date) : null;
      if (g) h += '<div class="fg">' + esc((g.kind === 'team' ? 'Team' : 'Faction') + ' · ' + g.name) + '</div>';
      names.forEach(function(raw, j) {
        var other = s.B[i] && s.B[i].length === names.length ? s.B[i][j] : '', id = K ? (K.resolve(raw) || K.resolve(other)) : '';
        h += '<button class="pp' + (id || !K ? '' : ' bad') + '"' + (id || !K || status(v) ? '' : ' data-fix="' + esc(v.id) + '" data-raw="' + esc(raw) + '" data-other="' + esc(other) + '"') + '><span class="mk">' + (id ? '✓' : (K ? '?' : '·')) + '</span><span><span class="n">' +
          esc(id ? K.nameOf(id) : raw) + '</span>' + (other && other !== raw ? '<small>' + esc(other) + '</small>' : '') + (!id && K ? '<small class="w">Not in the library · tap to fix</small>' : '') + '</span></button>';
      });
    });
    return h;
  }
  function cardHtml(v, i) {
    var r = recs[v.id], s = status(v), k = cls(v), title = (r && !r.failed && (r.title_en || r.title_ja)) || v.t;
    var chip = s ? '<span class="chp ' + (s.k === 'watched' ? 'w' : 't') + '">' + esc(s.label) + '</span>' : k === 'attn' ? '<span class="chp a">Needs a look</span>' : k === 'unread' ? '<span class="chp r">' + (reading === v.id ? 'Reading…' : 'Not read yet') + '</span>' : '';
    var h = '<div class="card" data-v="' + esc(v.id) + '"><div class="pic"' + (v.th ? ' style="background-image:url(\'' + esc(v.th) + '\')"' : '') + '></div><div class="bd">' +
      '<div class="hd"><span class="t">Match ' + (i + 1) + ' of ' + show.videos.length + '</span>' + chip + '</div><div style="font-weight:700;color:#C9D2DC">' + esc(title) + '</div>';
    if (r && r.failed) h += '<div class="er">Couldn\'t read this page (' + esc(r.failed) + ')</div>';
    else if (r) {
      var K = kit(), sug = K ? K.suggest([r.title_en, r.title_ja, r.h1].filter(Boolean).join(' ')) : [];
      h += '<div class="gl">People</div>' + peopleHtml(v, r) +
        '<div class="rw"><span class="lb">Match type</span><span class="vl">' + esc(kindOf(r) || '–') + '</span></div>' +
        (sug.length ? '<div class="rw"><span class="lb">Suggested</span><span class="vl">' + sug.map(function(x) { return '<span class="sg">' + esc(x.label) + '</span>'; }).join('') + '</span></div>' : '');
    }
    h += '<div class="bt">';
    if (!s && k === 'ready') h += '<button class="b on wide" data-confirm="' + esc(v.id) + '"' + (batch ? ' disabled' : '') + '>' + (batch && batch.at === v.id ? 'Saving…' : 'Confirm') + '</button>';
    h += '<a class="b" style="display:inline-flex;align-items:center;text-decoration:none" href="/contents/' + esc(v.id) + '">Watch</a></div></div></div>';
    return h;
  }
  // The show's venue, set once for the whole show (vi_show_venue), as on the TV (2.89.0).
  function rawVenue() {
    var raw = show && show.venue || '';
    if (show) show.videos.some(function(v) { var r = recs[v.id], s0 = r && r.shows && r.shows[0]; if (s0 && s0.venue) { raw = s0.venue; return true; } return false; });
    return raw;
  }
  function venueNow() {
    var mine = lsGet('ccPhoneVen' + S.set); if (mine && mine.name) return { name: mine.name, how: 'set for the show' };
    var sv = null; Object.keys(map).some(function(k) { var c = map[k]; if (String(c.vs || c.sid) === S.set && c.vn) { sv = c.vn; return true; } return false; });
    if (sv) return { name: sv, how: 'set for the show' };
    var K = kit(), raw = rawVenue(), m = K && raw ? K.venue(raw) : null;
    return m ? { name: m.name, how: 'matched in the library' } : null;
  }
  function venueHtml() {
    var now = venueNow(), raw = rawVenue(), K = kit(), h = '<div class="ven"><div class="gl">Venue</div>';
    if (vs.mode === 'edit') {
      h += '<input class="tx" id="ccp-vin" type="text" autocomplete="off" placeholder="Type a venue name" value="' + esc(vs.text) + '">' + (raw ? '<div class="sub">' + esc(raw) + '</div>' : '') + '<div id="ccp-vl">' + venueList() + '</div><div class="bt"><button class="b" data-vx="1">Cancel</button></div>';
    } else if (now) h += '<div><span class="vv">' + esc(now.name) + '</span> <span class="vk">✓ ' + esc(now.how) + '</span></div><div class="bt"><button class="b" data-vchg="1">Change</button></div>';
    else h += '<div class="vv bad">' + esc(raw ? '? ' + raw : '–') + '</div>' + (K ? '<div class="bt">' + (hasJa(raw) ? '<button class="b on" data-vtr="1">Translate &amp; add</button>' : '') + '<button class="b" data-vpk="1">Pick from list</button></div>' : '');
    if (vs.busy || vs.msg || vs.err) h += '<div class="msg' + (vs.err ? ' er' : '') + '">' + esc(vs.err || vs.busy || vs.msg) + '</div>';
    return h + '</div>';
  }
  function venueList() {
    var K = kit(), L = K && K.venues ? K.venues(vs.text, 5) : [], t = vs.text.trim(), h = '';
    L.forEach(function(v) { h += '<button class="opt" data-vuse="' + esc(v.id) + '" data-nm="' + esc(v.name) + '">' + esc(v.name) + '<small>Use this venue</small></button>'; });
    if (t && !L.some(function(v) { return v.name.toLowerCase() === t.toLowerCase(); })) h += '<button class="opt" data-vnew="1">' + esc(t) + '<small>Save as a new venue</small></button>';
    return h;
  }
  function venueSet(id, name) {
    vs.busy = 'Saving…'; vs.err = ''; draw();
    post({ action: 'vi_show_venue', show: S.set, venue: id, raw: rawVenue(), name: show.name || '', date: show.date || '' }, function(t) {
      var r = null; try { r = JSON.parse(t); } catch (e) {}
      vs.busy = '';
      if (!r || !r.ok) { vs.err = String(r && r.error || 'not saved'); draw(); return; }
      lsSet('ccPhoneVen' + S.set, { id: id, name: name });
      vs.mode = 'view'; vs.msg = 'Set for every match on this show';
      if (window.__tvIndexKit) window.__tvIndexKit.reload();
      cards(); draw();
    });
  }
  function venueNew(name) {
    var raw = rawVenue(); vs.busy = 'Saving…'; vs.err = ''; draw();
    post({ action: 'vi_propose', type: 'new_venue', value: name, entity_id: hasJa(raw) ? raw : '', video: show.videos[0] ? show.videos[0].id : '' }, function(t) {
      var r = null; try { r = JSON.parse(t); } catch (e) {}
      if (!r || !r.ok || !r.applied || !r.id) { vs.busy = ''; vs.err = String(r && (r.error || 'saved for approval') || 'not saved'); draw(); return; }
      window.__tvIndexKit.reload(function() { venueSet(r.id, name); });
    });
  }
  function endHtml() {
    var n = { ready: 0, unread: 0, attn: 0, logged: 0 }, rows = '';
    show.videos.forEach(function(v, i) {
      var k = cls(v), r = recs[v.id]; n[k]++;
      var lab = k === 'logged' ? 'logged' : k === 'ready' ? 'ready' : k === 'attn' ? 'needs a look' : 'not read yet';
      rows += '<div class="er2"><b>' + (i + 1) + '</b><span class="x">' + esc((r && !r.failed && (r.title_en || r.title_ja)) || v.t) + '</span><span class="chp ' + (k === 'logged' ? 't' : k === 'ready' ? 'w' : k === 'attn' ? 'a' : 'r') + '">' + lab + '</span></div>';
    });
    var todo = n.ready + n.unread, nx = nextShow();
    var h = '<div class="end"><div class="hd">End of the card</div>' + rows + '<div class="bt">';
    if (batch) h += '<button class="b on wide" disabled>Confirming ' + Math.min(batch.done + 1, batch.list.length) + ' of ' + batch.list.length + '…</button><button class="b" data-stop="1">Stop</button>';
    else if (todo) h += '<button class="b on wide" data-all="1">Confirm all (' + todo + ')</button>';
    h += '</div>' + (nx ? '<button class="b' + (todo || batch ? '' : ' on') + ' wide" data-go="' + esc(nx.set) + '" data-from="' + esc(S.from) + '">Next: ' + esc(nx.name) + '</button>' : '') + '</div>';
    return h;
  }
  function showHtml() {
    if (!show) return '<div class="ld">Reading the show page…</div>';
    return venueHtml() + show.videos.map(cardHtml).join('') + endHtml();
  }
  // Next show: the next one in the list you came from (a year: the next older one not fully logged; Started: the next).
  function nextShow() {
    var list = [];
    if (/^y\d{4}$/.test(S.from)) { var c = lsGet(YEAR_KEY + S.from.slice(1)); list = (c && c.items || []).map(function(x) { return { set: x.set, name: x.name }; }); }
    else list = startedList().map(function(g) { return { set: g.set, name: g.name }; });
    var at = list.map(function(x) { return x.set; }).indexOf(S.set), rest = list.slice(at + 1).filter(function(x) { var sc = lsGet(SET_KEY + x.set); return !setCount(x.set, sc && sc.videos).done; });
    var nx = rest[0];
    if (!nx) return null;
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+nx.set, nx.name, null) : { show: nx.name };
    return { set: nx.set, name: showName(sl.show || nx.name, sl.date) || nx.name };
  }

  // ---- saving: the TV's logger, without its screen (Confirm & next's quick save)
  function confirmOne(id, done) {
    var i = show.videos.map(function(v) { return v.id; }).indexOf(id), v = show.videos[i], rec = recs[id];
    if (!v || !rec || rec.failed || !window.__tvIndexOpen) { done(false); return; }
    if (!rec.shows || !rec.shows.length) rec.shows = [{ id: Number(show.set), show: show.name, venue: show.venue, date: show.date }];
    if (!rec.date) rec.date = show.date;
    if (!rec.thumb) rec.thumb = v.th;
    var shown = false;
    window.__tvIndexOpen({ set: show.set, video: id, rec: rec, place: { no: i + 1, total: show.videos.length }, thumb: true, tab: 'card', quick: true,
      // The logger wants to show itself (a name it can't place): not on the phone; the match is marked to look at.
      host: function() { shown = true; attn[id] = 1; setTimeout(function() { if (window.__tvIndexBack) window.__tvIndexBack(); }, 0); var d = document.createElement('div'); d.style.display = 'none'; document.body.appendChild(d); return d; },
      done: function(res) { var ok = !shown && res && res.ok; if (ok) saved[id] = 1; done(ok); } });
  }
  function confirmAll() {
    var list = show.videos.filter(function(v) { var k = cls(v); return k === 'ready' || k === 'unread'; }).map(function(v) { return v.id; });
    if (!list.length) return;
    batch = { list: list, done: 0, at: null, stop: false, saved: 0 }; draw(); step();
  }
  function step() {
    var b = batch; if (!b) return;
    if (b.stop || b.done >= b.list.length) { batch = null; if (b.saved) cards(); draw(); return; }
    var id = b.list[b.done], v = show.videos.filter(function(x) { return x.id === id; })[0];
    b.at = id;
    if (!v || status(v)) { b.done++; step(); return; }
    if (!recs[id]) { want(id); draw(); setTimeout(function() { if (batch === b) step(); }, 700); return; }
    if (cls(v) !== 'ready') { b.done++; draw(); step(); return; }
    draw();
    confirmOne(id, function(ok) { if (batch !== b) return; if (ok) b.saved++; b.done++; draw(); setTimeout(step, 300); });
  }

  // ---- fixing a name: a wrestler from the library (the site's spelling becomes her alias), or a new one
  function fixHtml() {
    var f = sheetOpen, K = kit(), L = K && K.talents ? K.talents(f.q, 8) : [];
    var h = '<div class="shade" data-close="1"></div><div class="sheet"><div class="hd" style="margin-bottom:8px">Who is ' + esc(f.raw) + '?</div>' + (f.other ? '<div class="sub" style="color:#9AA6B4;margin-bottom:8px">' + esc(f.other) + '</div>' : '') +
      '<input class="tx" id="ccp-fin" type="text" autocomplete="off" placeholder="Search the library" value="' + esc(f.q) + '"><div id="ccp-fl">';
    h += fixList(L) + '</div>' + (f.err ? '<div class="msg er">' + esc(f.err) + '</div>' : '') + (f.busy ? '<div class="msg">Saving…</div>' : '') + '<div class="bt"><button class="b" data-close="1">Cancel</button></div></div>';
    return h;
  }
  function fixList(L) {
    var f = sheetOpen, h = '';
    L.forEach(function(t) { h += '<button class="opt" data-pick="' + esc(t.id) + '">' + esc(t.name) + (t.other ? '<small>' + esc(t.other) + '</small>' : '') + '</button>'; });
    h += '<button class="opt" data-newp="1">' + esc(f.raw) + '<small>Add as a new wrestler</small></button>';
    return h;
  }
  function fixSave(body) {
    var f = sheetOpen; f.busy = true; f.err = ''; draw();
    post(body, function(t) {
      var r = null; try { r = JSON.parse(t); } catch (e) {}
      if (!r || !r.ok) { f.busy = false; f.err = String(r && r.error || 'not saved'); draw(); return; }
      window.__tvIndexKit.reload(function() { delete attn[f.v]; sheetOpen = null; draw(); });
    });
  }

  // ---- drawing
  var drawT = 0;
  function draw() { if (drawT) return; drawT = setTimeout(function() { drawT = 0; paint(); }, 30); }
  function paint() {
    var ae = document.activeElement;
    if (ae && (ae.id === 'ccp-vin' || ae.id === 'ccp-fin')) return;   // typing: the lists under the box update by themselves
    var y = root.scrollTop, h;
    if (!cfg) h = setupHtml();
    else {
      var title = S.screen === 'show' && show ? showName(show.name, show.date) + (show.date ? ' · ' + dateText(show.date) : '') : 'Log a show';
      h = '<div class="top">' + (S.screen === 'show' ? '<button class="ib" data-home="1">‹</button>' : '') + '<span class="wm">STAR<b>SCOPE</b></span><span class="tt">' + esc(title) + '</span><button class="ib" data-relink="1" aria-label="Card check link">⚙</button><button class="ib" data-closeall="1">✕</button></div><div class="pad">' +
        (flash ? '<div class="msg' + (flashBad ? ' er' : '') + '" style="margin-bottom:10px">' + esc(flash) + '</div>' + (diag ? '<div style="font:600 13px system-ui;color:#C9D2DC;border:1px solid #3B4656;border-radius:10px;padding:8px 10px;margin-bottom:10px">' + esc(diag) + '</div>' : '') + (flashKey ? '<div class="bt" style="margin-bottom:12px"><button class="b on" data-relink="1">Change the card check link</button></div>' : '') : '') +
        (!kitReady ? '<div class="ld">Loading the library…</div>' : '') + (S.screen === 'show' ? showHtml() : homeHtml()) + '</div>' + (sheetOpen ? fixHtml() : '');
    }
    root.innerHTML = h; root.scrollTop = y;
    var vin = root.querySelector('#ccp-vin');
    if (vin) { vin.oninput = function() { vs.text = vin.value; var l = root.querySelector('#ccp-vl'); if (l) l.innerHTML = venueList(); }; if (vs.focus) { vs.focus = false; vin.focus(); } }
    var fin = root.querySelector('#ccp-fin');
    if (fin) fin.oninput = function() { sheetOpen.q = fin.value; var l = root.querySelector('#ccp-fl'); if (l) l.innerHTML = fixList(kit().talents(fin.value, 8)); };
    watchCards();
  }
  // Match pages are read for the cards on screen (and the one after), one at a time.
  var io = null;
  function watchCards() {
    if (!show || S.screen !== 'show') return;
    if (!io && 'IntersectionObserver' in window) io = new IntersectionObserver(function(es) {
      es.forEach(function(e) {
        if (!e.isIntersecting) return;
        var id = e.target.getAttribute('data-v'), i = show.videos.map(function(v) { return v.id; }).indexOf(id);
        [show.videos[i], show.videos[i + 1]].forEach(function(v) { if (v && !recs[v.id] && !status(v)) want(v.id); });
      });
    }, { root: root, rootMargin: '0px 0px 200px 0px' });
    if (io) { io.disconnect(); Array.prototype.forEach.call(root.querySelectorAll('.card[data-v]'), function(c) { io.observe(c); }); }
  }
  function setupHtml() {
    return '<div class="pad" style="padding-top:calc(env(safe-area-inset-top) + 24px)"><div class="wm" style="font-size:22px;margin-bottom:10px">STAR<b>SCOPE</b> card check</div>' +
      '<div style="color:#C9D2DC;margin-bottom:14px">Once: the sheet\'s web app address (the phone logger\'s link works; everything after <b>/exec</b> is left out) and the card check key. Both stay in Safari on this phone.</div>' +
      '<div class="gl" style="margin-bottom:6px">Web app address</div><input class="tx" id="ccp-link" type="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(setupVals.u) + '">' +
      '<div class="gl" style="margin:12px 0 6px">Card check key</div><input class="tx" id="ccp-key" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="CARDCHECK_KEY from the script properties" value="' + esc(setupVals.k) + '">' +
      (flash ? '<div class="msg er" style="margin-top:8px">' + esc(flash) + '</div>' : '') + '<div class="bt" style="margin-top:12px"><button class="b on wide" data-setup="1">Save</button>' + (oldCfg ? '<button class="b" data-unrelink="1">Cancel</button>' : '<button class="b" data-closeall="1">Close</button>') + '</div></div>';
  }

  // ---- taps
  root.addEventListener('click', function(e) {
    var b = e.target.closest('button, a'); if (!b || !root.contains(b)) return;
    var d = b.dataset;
    if (b.tagName === 'A') { saveState(); return; }   // Watch: the site's own page; the bookmark brings card check back here
    if (d.setup) {
      setupVals = { u: (root.querySelector('#ccp-link') || {}).value || '', k: (root.querySelector('#ccp-key') || {}).value || '' };
      var c = parseLink(setupVals.u, setupVals.k);
      if (c.err) { note(c.err, true); return; }
      cfg = c; oldCfg = null; setupVals = { u: '', k: '' }; lsSet(CFG_KEY, c); flash = ''; diag = ''; start(); return;
    }
    // A link pasted wrong (2.91.1): back to the setup box, any time, from ⚙ or from the error.
    if (d.relink) { oldCfg = cfg || oldCfg; setupVals = { u: oldCfg ? oldCfg.u : '', k: '' }; cfg = null; flash = ''; draw(); return; }
    if (d.unrelink) { cfg = oldCfg; oldCfg = null; flash = ''; draw(); return; }
    if (d.closeall) { saveState(); root.style.display = 'none'; document.documentElement.style.overflow = ''; return; }
    if (d.home) { S.screen = 'home'; show = null; flash = ''; saveState(); draw(); root.scrollTop = 0; return; }
    if (d.tab) { S.tab = 'started'; saveState(); draw(); return; }
    if (d.year) { S.tab = 'year'; S.year = d.year; saveState(); draw(); return; }
    if (d.more) { if (yl) { yl.err = ''; yearPage(); } return; }
    if (d.go) { flash = ''; openShow(d.go, d.from); return; }
    if (d.confirm) { if (batch) return; batch = { list: [d.confirm], done: 0, at: d.confirm, stop: false, saved: 0 }; draw(); step(); return; }
    if (d.all) { confirmAll(); return; }
    if (d.stop) { if (batch) batch.stop = true; return; }
    if (d.vtr) {
      vs.busy = 'Translating…'; vs.err = ''; draw();
      post({ action: 'vi_translate', text: rawVenue() }, function(t) { var r = null; try { r = JSON.parse(t); } catch (x) {} vs.busy = ''; vs.mode = 'edit'; vs.text = r && r.ok && r.text ? r.text : rawVenue(); vs.focus = true; if (!(r && r.ok)) vs.err = String(r && r.error || 'translate failed'); draw(); });
      return;
    }
    if (d.vpk || d.vchg) { vs.mode = 'edit'; vs.text = d.vpk && !hasJa(rawVenue()) ? rawVenue() : ''; vs.err = ''; vs.msg = ''; vs.focus = true; draw(); return; }
    if (d.vx) { vs.mode = 'view'; vs.err = ''; draw(); return; }
    if (d.vuse) { venueSet(d.vuse, d.nm); return; }
    if (d.vnew) { if (vs.text.trim()) venueNew(vs.text.trim()); return; }
    if (d.fix) { sheetOpen = { v: d.fix, raw: d.raw, other: d.other, q: d.raw, err: '', busy: false }; draw(); return; }
    if (d.close) { sheetOpen = null; draw(); return; }
    if (d.pick && sheetOpen) { var f = sheetOpen; fixSave({ action: 'vi_propose', type: 'new_alias', value: f.raw, entity_id: d.pick, video: f.v }); return; }
    if (d.newp && sheetOpen) { var g = sheetOpen; fixSave({ action: 'vi_propose', type: 'new_talent', value: g.raw, entity_id: '', video: g.v }); return; }
  });
  root.addEventListener('scroll', function() { clearTimeout(root.__s); root.__s = setTimeout(saveState, 400); }, { passive: true });

  // What the sheet sees (2.91.3), kept on screen: the script's version, whether CARDCHECK_KEY is there, how the key
  // typed here compares with it. Keys themselves are never shown or sent back.
  var diag = '';
  function diagnose() {
    fetch(cfg.u, { method: 'POST', body: JSON.stringify({ action: 'cc_ping', key: cfg.k }) })
      .then(function(r) { return r.text(); })
      .then(function(t) {
        var r = null; try { r = JSON.parse(t); } catch (e) {}
        if (!r) { diag = 'The address answered, but not as the sheet script (' + t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) + '). Check the address.'; }
        else if (!r.script) diag = 'The sheet is running an older script (no setup check): the new version isn\'t deployed at this address. ' + (r.error ? '(' + r.error + ')' : '');
        else diag = 'Script ' + r.script + ' · CARDCHECK_KEY ' + (r.ccSet ? 'found (' + r.ccLen + ' characters)' : 'NOT found') + ' · key typed here: ' + r.sentLen + ' characters · ' +
          ({ exact: 'matches', spaces: 'matches apart from spaces (fixed now)', 'case': 'differs only in capitals', main: 'is the main key, not the card check key', no: 'doesn\'t match' })[r.match] +
          (r.similar && r.similar.length ? ' · properties named like it: ' + r.similar.join(', ') : '');
        draw();
      })
      .catch(function(e) { diag = 'Couldn\'t reach the address (' + (e && e.message || e) + ')'; draw(); });
  }
  var booted = null;
  function start() {
    draw();
    booted = booted || boot();
    booted.then(function() {
      // The link checked first (2.91.1): a wrong key says so, with the way to change it.
      post({ action: 'vi_lib' }, function(t) {
        var r = null; try { r = JSON.parse(t); } catch (e) {}
        if (!r || !r.ok) { kitReady = false; note('The sheet said: ' + (r && r.error || 'no reply') + '. Check the card check link.', true, true); diagnose(); return; }
        window.__tvIndexKit.lib(function(ok) { kitReady = ok; flash = ''; draw(); });
      });
      cards();
      if (S.screen === 'show' && S.set) { var y0 = (lsGet(STATE_KEY) || {}).y || 0; openShow(S.set, S.from); setTimeout(function() { root.scrollTop = y0; }, 300); }
      else draw();
    }).catch(function(e) { note('Couldn\'t start: ' + (e && e.message || e), true); });
  }
  window.__ccPhone = { open: function() { root.style.display = 'block'; document.documentElement.style.overflow = 'hidden'; draw(); if (cards && cfg) cards(); } };
  document.body.appendChild(root);
  document.documentElement.style.overflow = 'hidden';
  if (cfg) start(); else draw();
})();
