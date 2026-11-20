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
  var CFG_KEY = 'ccPhoneCfg', STATE_KEY = 'ccPhoneState', CARDS_KEY = 'ccPhoneCards', YEAR_KEY = 'ccPhoneYear2_', SET_KEY = 'ccPhoneSet2_', REC_KEY = 'ccPhoneRec3_';   // 2.91.7: new names, so lists read wrongly before are dropped
  var GAP = 2000, SET_AGE = 86400000, YEAR_AGE = 86400000, lastSetLook = null, report = '';
  // 2.91.5: the page the phone was sent, as text to copy and paste (the phone gets the site's mobile layout, which the
  // reader doesn't know yet): its size and title, then the first article cards and anything that looks like a link to a
  // video (data attributes, onclick), tags and attributes only, query strings left out.
  function pageReport(label, html, doc) {
    var clean = function(x) { return String(x || '').replace(/\?[^"'\s>]*/g, '?…'); };
    var shape = function(el) { return clean(el.outerHTML.replace(/>[^<]+</g, function(m) { return m.length > 40 ? '>' + m.slice(1, 30).replace(/\s+/g, ' ') + '…<' : m.replace(/\s+/g, ' '); })).slice(0, 1500); };
    var out = [label, 'size ' + html.length + ' · title ' + doc.title + ' · ' + navigator.userAgent];
    Array.prototype.slice.call(doc.querySelectorAll('article'), 0, 3).forEach(function(a, i) { out.push('--- article ' + (i + 1) + '\n' + shape(a)); });
    var hints = [];
    Array.prototype.forEach.call(doc.querySelectorAll('*'), function(el) {
      if (hints.length >= 12) return;
      Array.prototype.forEach.call(el.attributes || [], function(at) { if (hints.length < 12 && /contents|set\/\d|video/i.test(at.value) && at.name !== 'class') hints.push(el.tagName.toLowerCase() + '[' + at.name + '="' + clean(at.value).slice(0, 120) + '"]'); });
    });
    out.push('--- attributes naming contents / set / video\n' + (hints.join('\n') || 'none'));
    var sc = Array.prototype.filter.call(doc.querySelectorAll('script:not([src])'), function(x) { return /contents|set_id|video/i.test(x.textContent); }).slice(0, 2);
    sc.forEach(function(x, i) { out.push('--- inline script ' + (i + 1) + '\n' + clean(x.textContent.replace(/\s+/g, ' ')).slice(0, 1200)); });
    return out.join('\n');
  }

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
  // English match titles for Japanese-only titles (2.103.0, shownames.js); the line-up reading still uses the site's own.
  function mtEn(t) { return window.__tvShowName && window.__tvShowName.match ? window.__tvShowName.match(t) : t; }
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
    '#ccp .sc .im{flex:none;width:128px;aspect-ratio:16/9;border-radius:8px;background:#0F151C center/cover no-repeat}#ccp .sc .nm{display:block;font-weight:700;font-size:15px;line-height:1.25}#ccp .sc .sb{display:block;font-size:13px;color:#9AA6B4;margin-top:4px}',
    '#ccp .cnt{display:inline-block;margin-top:6px;font:800 11px system-ui;letter-spacing:1px;text-transform:uppercase;color:#F4C242}#ccp .cnt.done{color:#7FD3A0}#ccp .cnt.none{color:#9AA6B4;font-weight:700}',
    '#ccp .card{background:#0F151C;border:1px solid #2A323C;border-radius:14px;margin-bottom:16px;overflow:hidden}',
    '#ccp .card .pic{width:100%;aspect-ratio:16/9;background:#161F2A center/cover no-repeat}#ccp .card .bd{padding:12px 14px;display:flex;flex-direction:column;gap:8px}',
    '#ccp .hd{display:flex;align-items:center;gap:8px;font-weight:900;font-size:17px;color:#fff}#ccp .card .hd .t{color:#fff}#ccp .hd .t{flex:1;min-width:0}',
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
    '#ccp .shw{background:#0F151C;border:1px solid #2A323C;border-radius:12px;padding:12px;margin-bottom:12px}#ccp .shw .n1{font:900 18px system-ui;color:#fff;line-height:1.25}#ccp .shw .n2{font-size:13px;color:#9AA6B4;margin-top:3px}#ccp .shw .d{font:700 14px system-ui;color:#F4C242;margin-top:6px}',
    '#ccp textarea.tx{height:150px;padding:10px;font:13px ui-monospace,Menlo,monospace}#ccp .sug{display:flex;gap:10px;align-items:flex-start;border:1px solid #2A323C;background:#161F2A;border-radius:10px;padding:10px;margin-top:8px;width:100%;text-align:left;color:#fff}',
    '#ccp .sug .bx{flex:none;width:24px;height:24px;border-radius:6px;border:2px solid #3B4656;display:flex;align-items:center;justify-content:center;font:900 14px system-ui;color:#1A1A1A}#ccp .sug.on .bx{background:#FFB347;border-color:#FFB347}#ccp .sug small{display:block;color:#9AA6B4;font-size:12px;margin-top:2px}#ccp .src{font-size:12px;color:#9AA6B4;margin-top:8px;word-break:break-all}',
    '#ccp .ven.in{background:none;border:0;padding:0;margin:0 0 6px}#ccp .er2[data-row]{cursor:pointer}#ccp .er2.open b{color:#F4C242}#ccp .end{margin-bottom:6px}',
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
  var FACT = '{"factions":[]}', MT = '{}', SW = '', MW = '';
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
      factionsJson: function() { return FACT; }, matchTypesJson: function() { return MT; }, showWordsJson: function() { return SW; }, matchWordsJson: function() { return MW; }
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
    try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (/^ccPhoneSet\d|^ccPhoneYear_/.test(k || '')) localStorage.removeItem(k); } } catch (e) {}   // lists kept before 2.91.7
    var roster = getJson(ROSTER).catch(function() { return null; });
    return Promise.all([getJson(BASE + 'factions.json?v=' + VER), getJson(BASE + 'match_types.json?v=' + VER), roster]).then(function(a) {
      FACT = JSON.stringify(mergeFactions(a[0], a[2]));
      var mt = a[1]; if (a[2] && a[2].debuts) { mt.debuts = mt.debuts || {}; Object.keys(a[2].debuts).forEach(function(k) { mt.debuts[k] = a[2].debuts[k]; }); }
      MT = JSON.stringify(mt);
      SW = a[2] && a[2].showWords ? JSON.stringify(a[2].showWords) : '';
      MW = a[2] && a[2].matchWords ? JSON.stringify(a[2].matchWords) : '';
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
  // Segments (2.96.0): cards you've marked as a retirement, homecoming, debut, return, award or announcement, by video:
  // { type, ids }. Kept for this visit; Confirm / Confirm all save them like any ready card.
  var segs = ssGet('ccPhoneSegs') || {};
  function segSet(id, v) { if (v) segs[id] = v; else delete segs[id]; ssSet('ccPhoneSegs', segs); }
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
    yl = c && Date.now() - (c.t || 0) < YEAR_AGE && (c.items || []).length ? { y: y, items: c.items || [], page: c.page || 0, done: !!c.done, t: c.t } : { y: y, items: [], page: 0, done: false, t: Date.now() };
    yl.busy = false; yl.err = '';
    if (!yl.page) yearPage();
  }
  function yearPage() {
    var cat = 0; try { cat = ((JSON.parse(MT).siteCategories || {}).years || {})[yl.y]; } catch (e) {}
    if (!yl || yl.busy || yl.done || !cat) { if (yl && !cat) yl.done = true; return; }
    var mine = yl, n = yl.page + 1; yl.busy = true; yl.err = ''; draw();
    // 2.91.8: the site's own list of a year's shows, as its mobile search page reads it (/user_api/contents with
    // search[type]=set and search[category_ids][]), 20 a page, newest first.
    fetch('/user_api/contents?size=20&search%5Btype%5D=set&search%5Bcategory_ids%5D%5B%5D=' + encodeURIComponent(cat) + '&sort=di_s&order=d&page=' + n, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); mine.total = Number(r.headers.get('x-total-count')) || mine.total || 0; return r.json(); })
      .then(function(list) {
        var seen = {}, got = 0;
        mine.items.forEach(function(x) { seen[x.set] = 1; });
        (Array.isArray(list) ? list : []).forEach(function(x) {
          if (!x || x.type !== 'set' || seen[x.id]) return;
          seen[x.id] = 1; got++;
          mine.items.push({ set: String(x.id), name: String(x.display_name || '').replace(/\s+/g, ' ').trim(), th: (x.thumbnails && (x.thumbnails.lg || x.thumbnails.md)) || '' });
        });
        mine.page = n;
        if (!got || (Array.isArray(list) && list.length < 20) || (mine.total && mine.items.length >= mine.total)) mine.done = true;
        lsSet(YEAR_KEY + mine.y, { t: mine.t, items: mine.items, page: mine.page, done: mine.done, total: mine.total });
      })
      .catch(function(e) { mine.err = String(e && e.message || e); })
      .then(function() { mine.busy = false; draw(); });
  }
  function showTile(x, from) {
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+x.set, x.name, from.slice(1) || null) : { show: x.name, date: x.date || '' };
    var sc = lsGet(SET_KEY + x.set), c = setCount(x.set, sc && sc.videos), date = sl.date || x.date || '';
    // 2.91.9: the state in words, so "0 logged" no longer reads like a logged tag.
    var label = c.done ? '✓ All ' + c.tot + ' logged' : !c.n ? 'Not started' : c.tot ? c.n + ' of ' + c.tot + ' logged' : c.n + ' logged';
    var cls2 = c.done ? ' done' : !c.n ? ' none' : '';
    return '<button class="sc" data-go="' + esc(x.set) + '" data-from="' + esc(from) + '"><span class="im"' + (x.th ? ' style="background-image:url(\'' + esc(x.th) + '\')"' : '') + '></span><span><span class="nm">' +
      esc(showName(sl.show || x.name, date) || x.name) + '</span><span class="sb">' + esc([dateText(date), sl.venue || x.venue || ''].filter(Boolean).join(' · ')) + '</span><span class="cnt' + cls2 + '">' + esc(label) + '</span></span></button>';
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
      // Newest show first by its date (the site lists them by when each was put up).
      var dOf = function(x) { var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+x.set, x.name, S.year) : null; return (sl && sl.date) || ''; };
      h += yl.items.map(function(x, i) { return { x: x, d: dOf(x), i: i }; }).sort(function(a, b) { return String(b.d).localeCompare(String(a.d)) || a.i - b.i; })
        .map(function(o) { return showTile(o.x, 'y' + S.year); }).join('');
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
    // 2.91.7: no guessing from other cards on the page (2.91.4 picked up the site's newest videos, which aren't this
    // show's): a page without match links is read from the show's own list (fromApi).
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
    show = null; recs = {}; attn = {}; readQ = []; diag = ''; openCards = {}; showAllCards = false; vs = { mode: 'view', text: '', busy: '', msg: '', err: '' }; batch = null;
    saveState(); draw(); root.scrollTop = 0;
    var c = lsGet(SET_KEY + set);
    if (c && c.videos && c.videos.length && Date.now() - (c.t || 0) < SET_AGE) {
      var sl0 = window.__tvVixSetOf && c.line ? window.__tvVixSetOf(+set, c.line, null) : null;   // 2.96.5: the date read again (a typo'd month fixed)
      if (sl0 && sl0.date && sl0.date !== c.date) { c.date = sl0.date; lsSet(SET_KEY + set, c); }
      show = c; draw(); return;
    }
    var go = function() {
      lastFetch = Date.now();
      var got = '', html = '';
      fetch('/set/' + set, { credentials: 'include' }).then(function(r) { got = r.url + ' · HTTP ' + r.status; if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function(h0) {
        html = h0;
        var s = readSetHtml(html, String(set));
        // 2.91.6: the phone's (mobile) show page loads its matches from the site's own list, /user_api/set/<id>/contents,
        // which also has each match's line-up: one more request, and no match page needs reading at all.
        if (!s.videos.length) return fromApi(String(set), s).then(function(s2) { return s2; }, function(e) { got += ' · list: ' + (e && e.message || e); return s; });
        return s;
      }).then(function(s) {
        // What the phone was sent, kept on screen (2.91.4), so a different page layout can be seen and read.
        if (!s.videos.length) { report = pageReport('Show page /set/' + set, html, new DOMParser().parseFromString(html, 'text/html')); var L = lastSetLook || {}; diag = 'Show ' + set + ': ' + got + ' · ' + (L.len || 0) + ' characters · "' + String(L.title || '').slice(0, 60) + '" · ' + (L.articles || 0) + ' article cards · ' + (L.setLinks || 0) + ' match links · ' + (L.scripts || 0) + ' scripts · video links: ' + ((L.contentLinks || []).join(' ') || 'none'); throw new Error('no matches on the page'); }
        if (S.set !== String(set)) return;
        show = s; lsSet(SET_KEY + set, s); draw();
      }).catch(function(e) { if (S.set === String(set)) note('Couldn\'t read the show page (' + (e && e.message || e) + ')', true); });
    };
    var wait = lastFetch + GAP - Date.now();
    if (wait > 0) setTimeout(go, wait); else go();
  }
  function fromApi(set, s) {
    return new Promise(function(ok, bad) {
      var go = function() {
        lastFetch = Date.now();
        fetch('/user_api/set/' + set + '/contents?size=60', { credentials: 'include', headers: { Accept: 'application/json' } })
          .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function(list) {
            var vids = (Array.isArray(list) ? list : []).filter(function(x) { return x && x.type === 'single' && !isComment(x.display_name); }).map(function(x) {
              return { id: String(x.id), t: String(x.display_name || '').trim(), th: (x.thumbnails && (x.thumbnails.lg || x.thumbnails.md)) || '', d: String(x.description || '') };
            });
            var so = window.__tvSetOrder, ord = so ? so.forSet(set, vids.map(function(v) { return { id: Number(v.id), t: v.t }; })) : null;
            if (ord && ord.flip) vids.reverse();
            s.videos = vids; s.api = 1; ok(s);
          }).catch(bad);
      };
      var wait = lastFetch + GAP - Date.now();
      if (wait > 0) setTimeout(go, wait); else go();
    });
  }
  // A match read from the list's own description (2.91.6): the same reader as a match page, on a page made of the
  // list's title, description and the show's line. Nothing is asked of the site.
  function recFromList(v) {
    if (!v.d || !window.__tvVixRead || !show) return null;
    var line = show.line || '', br = line.replace(/』\s*/, '』<br>');
    var html = '<html><head><meta property="og:image" content="' + esc(v.th) + '"></head><body><div class="content-ttl-wrap"><h1>' + esc(v.t) + '</h1><div class="wswg-wrap">' + v.d + '</div></div>' +
      '<div class="accordion-box"><a href="/set/' + esc(show.set) + '">' + br + '</a></div></body></html>';
    try { return window.__tvVixRead(new DOMParser().parseFromString(html, 'text/html'), v.id, show.set); } catch (e) { return null; }
  }
  function want(id) {
    var v0 = show && show.videos.filter(function(x) { return x.id === id; })[0];
    if (!recs[id] && v0 && v0.d) { var r0 = recFromList(v0); if (r0) { recs[id] = r0; draw(); return; } } if (!recs[id] && readQ.indexOf(id) < 0 && !ssGet(REC_KEY + id)) { readQ.push(id); pump(); } else if (!recs[id]) { recs[id] = ssGet(REC_KEY + id); draw(); } }
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
    if (sending[v.id]) return { k: 'saved', label: 'Saving to the sheet…' };
    if (saved[v.id]) return { k: 'saved', label: 'Logged' };
    var c = map[v.id];
    if (c) return c.x && c.x.tb ? { k: 'thumb', label: 'Logged from thumbnail' } : { k: 'watched', label: 'Logged while watching' };
    return null;
  }
  // 2.96.2: English first, unless the Japanese line-up has the same sides and more names: the English one missed an
  // "&" ("Natsupoi & Aya Sakura Sayaka Kurara"), the Japanese one didn't.
  function enFirst(r) {
    var en = r.sides_en || [], ja = r.sides_ja || [], n = function(s) { return s.reduce(function(a, x) { return a + x.length; }, 0); };
    return en.length >= 2 && !(ja.length === en.length && n(ja) > n(en));
  }
  function sides(r) { var useEn = enFirst(r); return { A: useEn ? r.sides_en : (r.sides_ja || []), B: useEn ? (r.sides_ja || []) : (r.sides_en || []) }; }
  function placeOf(v) { return show ? show.videos.indexOf(v) + 1 : 0; }
  // 2.93.0: a logged match whose saved number isn't its place on the card as it now stands: re-saved by Confirm all.
  function misplaced(v) { var c = map[v.id]; return !!(c && !saved[v.id] && c.n !== '' && c.n != null && Number(c.n) > 0 && Number(c.n) !== placeOf(v)); }
  function cls(v) {
    var r = recs[v.id];
    if (status(v)) return misplaced(v) ? 'renumber' : 'logged';
    if (!r) return 'unread';
    if (r.failed) return 'attn';
    if (segs[v.id]) return 'ready';
    if (attn[v.id]) return 'attn';
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
        h += '<button class="pp' + (id || !K ? '' : ' bad') + '"' + (!K || status(v) ? '' : ' data-fix="' + esc(v.id) + '" data-raw="' + esc(raw) + '" data-other="' + esc(other) + '"' + (id ? ' data-now="' + esc(id) + '"' : '')) + '><span class="mk">' + (id ? '✓' : (K ? '?' : '·')) + '</span><span><span class="n">' +
          esc(id ? K.nameOf(id) : raw) + '</span>' + (other && other !== raw ? '<small>' + esc(other) + '</small>' : '') + (!id && K ? '<small class="w">Not in the library · tap to fix</small>' : '') + '</span></button>';
      });
    });
    return h;
  }
  // A card the site gives no line-up for, whose title names a segment type and wrestlers in the library: offered as
  // a segment, one tap to accept.
  function segText(v, r) { return [r && r.title_en, r && r.title_ja, r && r.h1, v.t].filter(Boolean).join(' '); }
  function segGuess(v, r) {
    var K = kit(); if (!K || !K.list || !r || r.failed || sides(r).A.length >= 2) return null;
    var text = segText(v, r), types = K.list('segment'), type = '';
    (K.suggest(text) || []).some(function(x) { if (x.group !== 'segment') return false; var t = types.filter(function(y) { return y.name === x.label; })[0]; if (t) type = t.id; return !!t; });
    var ids = K.inText(text);
    return type || ids.length ? { type: type, ids: ids } : null;
  }
  function segLabel(type) { var t = (kit() && kit().list ? kit().list('segment') : []).filter(function(x) { return x.id === type; })[0]; return t ? t.name : type; }
  function segHtml() {
    var f = sheetOpen, K = kit(), L = K && f.q ? K.talents(f.q, 6) : [];
    var h = '<div class="shade" data-close="1"></div><div class="sheet"><div class="hd" style="margin-bottom:4px">Segment, not a match</div><div class="sub" style="color:#9AA6B4;margin-bottom:8px">' + esc(f.title) + '</div><div class="gl">Type</div><div class="bt" style="flex-wrap:wrap">';
    (K ? K.list('segment') : []).forEach(function(t) { h += '<button class="b' + (f.type === t.id ? ' on' : '') + '" data-segty="' + esc(t.id) + '">' + esc(t.name) + '</button>'; });
    h += '</div><div class="gl">In the segment</div>';
    f.ids.forEach(function(id) { h += '<button class="pp" data-segrm="' + esc(id) + '"><span class="mk">✓</span><span><span class="n">' + esc(K.nameOf(id)) + '</span><small>Tap to remove</small></span></button>'; });
    if (!f.ids.length) h += '<div class="sub" style="color:#9AA6B4">No one yet: search below.</div>';
    h += '<input class="tx" id="ccp-sin" type="text" autocomplete="off" placeholder="Add a wrestler" value="' + esc(f.q) + '" style="margin-top:8px"><div id="ccp-sl">' + segList(L) + '</div>';
    h += '<div class="bt"><button class="b on wide" data-segok="1"' + (f.type && f.ids.length ? '' : ' disabled') + '>Use as segment</button>' + (segs[f.v] ? '<button class="b" data-unseg="' + esc(f.v) + '">Not a segment</button>' : '') + '<button class="b" data-close="1">Cancel</button></div></div>';
    return h;
  }
  function segList(L) { return L.filter(function(t) { return sheetOpen.ids.indexOf(t.id) < 0; }).map(function(t) { return '<button class="opt" data-segadd="' + esc(t.id) + '">' + esc(t.name) + (t.other ? '<small>' + esc(t.other) + '</small>' : '') + '</button>'; }).join(''); }
  function segOpen(v) {
    var r = recs[v.id], g = segs[v.id] || segGuess(v, r) || { type: '', ids: [] };
    sheetOpen = { seg: 1, v: v.id, title: mtEn((r && !r.failed && (r.title_en || r.title_ja)) || v.t), type: g.type, ids: g.ids.slice(), q: '' }; draw();
  }
  // A line-up you type (2.108.0): for a card the site gives no line-up for (a sparring session, a debut), or one you
  // entered before. Sides of wrestlers from the library, or a new wrestler under the name you type. Used as the read
  // line-up, so Confirm saves it like any other card.
  function manOpen(v) {
    var r = recs[v.id], K = kit(), cur = [];
    if (r && r.manIds) cur = r.manIds.map(function(x) { return x.slice(); });
    else if (r && !r.failed && K) cur = sides(r).A.map(function(names) { return names.map(function(n) { return K.resolve(n); }).filter(Boolean); });
    while (cur.length < 2) cur.push([]);
    var at = 0; cur.some(function(x, i) { if (!x.length) { at = i; return true; } return false; });
    sheetOpen = { man: 1, v: v.id, title: mtEn((r && !r.failed && (r.title_en || r.title_ja)) || v.t), sides: cur, at: at, q: '', err: '', busy: false }; draw();
  }
  function manHtml() {
    var f = sheetOpen, K = kit(), L = K && f.q ? K.talents(f.q, 6) : [];
    var h = '<div class="shade" data-close="1"></div><div class="sheet"><div class="hd" style="margin-bottom:4px">Match: who was in it</div><div class="sub" style="color:#9AA6B4;margin-bottom:8px">' + esc(f.title) + '</div>';
    f.sides.forEach(function(ids, i) {
      if (i) h += '<div class="vs">VS</div>';
      h += '<div class="bt" style="margin-top:4px"><button class="b' + (f.at === i ? ' on' : '') + '" data-mside="' + i + '">Side ' + (i + 1) + (f.at === i ? ' · adding here' : '') + '</button></div>';
      ids.forEach(function(id) { h += '<button class="pp" data-mrm="' + i + ':' + esc(id) + '"><span class="mk">✓</span><span><span class="n">' + esc(K ? K.nameOf(id) : id) + '</span><small>Tap to remove</small></span></button>'; });
      if (!ids.length) h += '<div class="sub" style="color:#9AA6B4">No one yet</div>';
    });
    if (f.sides.length < 4) h += '<div class="bt"><button class="b" data-mplus="1">+ Side</button></div>';
    h += '<input class="tx" id="ccp-min" type="text" autocomplete="off" placeholder="Add to side ' + (f.at + 1) + '" value="' + esc(f.q) + '" style="margin-top:8px"><div id="ccp-ml">' + manList(L) + '</div>';
    if (f.err) h += '<div class="msg er">' + esc(f.err) + '</div>';
    if (f.busy) h += '<div class="msg">Adding…</div>';
    var ok = f.sides.filter(function(x) { return x.length; }).length >= 2;
    h += '<div class="bt"><button class="b on wide" data-mok="1"' + (ok && !f.busy ? '' : ' disabled') + '>Use this line-up</button><button class="b" data-close="1">Cancel</button></div></div>';
    return h;
  }
  function manList(L) {
    var f = sheetOpen, taken = [].concat.apply([], f.sides), h = '';
    L.filter(function(t) { return taken.indexOf(t.id) < 0; }).forEach(function(t) { h += '<button class="opt" data-madd="' + esc(t.id) + '">' + esc(t.name) + (t.other ? '<small>' + esc(t.other) + '</small>' : '') + '</button>'; });
    var typed = String(f.q || '').trim();
    if (typed && !badAlias(typed) && !L.some(function(t) { return String(t.name).toLowerCase() === typed.toLowerCase(); }))
      h += '<button class="opt" data-mnew="1">' + esc(typed) + '<small>Add as a new wrestler</small></button>';
    return h;
  }
  // A singles card fills fastest: adding to an empty side moves on to the next empty side.
  function manAdd(id) {
    var f = sheetOpen, side = f.sides[f.at], was = side.length;
    if ([].concat.apply([], f.sides).indexOf(id) < 0) side.push(id);
    if (!was) f.sides.some(function(x, i) { if (i !== f.at && !x.length) { f.at = i; return true; } return false; });
    f.q = ''; f.focus = true; draw();
  }
  function manUse() {
    var f = sheetOpen, K = kit(), r = recs[f.v]; if (!r || !K) return;
    var ids = f.sides.filter(function(x) { return x.length; }), names = ids.map(function(x) { return x.map(function(id) { return K.nameOf(id); }); });
    r.sides_en = names; r.sides_ja = names.map(function(x) { return x.slice(); }); r.manIds = ids;
    ['roles_en', 'roles_ja', 'teams_en', 'teams_ja'].forEach(function(k) { delete r[k]; });
    ssSet(REC_KEY + f.v, r); delete attn[f.v]; delete sendFail[f.v]; segSet(f.v, null);
    sheetOpen = null; draw();
  }
  function cardHtml(v, i) {
    var r = recs[v.id], s = status(v), k = cls(v), title = mtEn((r && !r.failed && (r.title_en || r.title_ja)) || v.t);
    var chip = k === 'renumber' ? '<span class="chp a">Saved as match ' + esc(map[v.id].n) + '</span>' : s ? '<span class="chp ' + (s.k === 'watched' ? 'w' : 't') + '">' + esc(s.label) + '</span>' : k === 'attn' ? '<span class="chp a">Needs a look</span>' : k === 'unread' ? '<span class="chp r">' + (reading === v.id ? 'Reading…' : 'Not read yet') + '</span>' : '';
    var h = '<div class="card" data-v="' + esc(v.id) + '"><div class="pic"' + (v.th ? ' style="background-image:url(\'' + esc(v.th) + '\')"' : '') + '></div><div class="bd">' +
      '<div class="hd"><span class="t">Match ' + (i + 1) + ' of ' + show.videos.length + '</span>' + chip + '</div><div style="font-weight:700;color:#C9D2DC">' + esc(title) + '</div>';
    if (sendFail[v.id]) h += '<div class="er">The sheet turned this down: ' + esc(sendFail[v.id]) + '</div>';
    if (r && r.failed) h += '<div class="er">Couldn\'t read this page (' + esc(r.failed) + ')</div>';
    else if (r) {
      var K = kit(), sug = K ? K.suggest([r.title_en, r.title_ja, r.h1].filter(Boolean).join(' ')) : [];
      var sg = segs[v.id], gs = !s && !sg ? segGuess(v, r) : null, K0 = kit();
      if (sg) h += '<div class="gl">Segment · ' + esc(segLabel(sg.type)) + '</div>' + sg.ids.map(function(id) { return '<div class="pp"><span class="mk">✓</span><span class="n">' + esc(K0 ? K0.nameOf(id) : id) + '</span></div>'; }).join('') +
        '<div class="rw"><span class="lb">Result</span><span class="vl">None: segments don\'t count as matches</span></div>';
      else if (gs && gs.type && gs.ids.length) h += '<div class="er" style="color:#C9D2DC;border-color:#6B5A22">Looks like a segment: ' + esc(segLabel(gs.type)) + ' · ' + esc(gs.ids.map(function(id) { return K0.nameOf(id); }).join(', ')) + '<div class="bt"><button class="b on" data-segyes="' + esc(v.id) + '">Yes, a segment</button><button class="b" data-seg="' + esc(v.id) + '">Change</button></div></div>';
      if (!sg) h += '<div class="gl">People' + (r.manIds ? ' · entered by you' : '') + '</div>' + peopleHtml(v, r) +
        '<div class="rw"><span class="lb">Match type</span><span class="vl">' + esc(kindOf(r) || '–') + '</span></div>' +
        (sug.length ? '<div class="rw"><span class="lb">Suggested</span><span class="vl">' + sug.map(function(x) { return '<span class="sg">' + esc(x.label) + '</span>'; }).join('') + '</span></div>' : '');
    }
    h += '<div class="bt">';
    if ((!s && k === 'ready') || k === 'renumber') h += '<button class="b on wide" data-confirm="' + esc(v.id) + '"' + (batch ? ' disabled' : '') + '>' + (batch && batch.at === v.id ? 'Saving…' : k === 'renumber' ? 'Save as match ' + placeOf(v) : 'Confirm') + '</button>';
    if (!s && k === 'attn' && !segs[v.id]) h += '<button class="b on" data-aione="' + esc(v.id) + '">Ask Gemini</button>';
    if (!s && r && !r.failed && !segs[v.id] && (r.manIds || sides(r).A.length < 2)) h += '<button class="b" data-man="' + esc(v.id) + '">' + (r.manIds ? 'Edit line-up' : 'Match…') + '</button>';
    if (!s && r && !r.failed) h += '<button class="b" data-seg="' + esc(v.id) + '">' + (segs[v.id] ? 'Edit segment' : 'Segment…') + '</button>';
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
    var now = venueNow(), raw = rawVenue(), K = kit(), h = '<div class="ven in">';
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
  // 2.94.0: the card at the top: the venue first, then each match with its state (tap one to see its card); Confirm all
  // and Next. Only matches that need a look (and any tapped open) are shown as cards; when all are ready, none are, so
  // no picture is loaded.
  var openCards = {}, showAllCards = false;
  function needsCard(v) { var k = cls(v); return k === 'attn' || k === 'renumber' || !!sendFail[v.id] || !!openCards[v.id] || showAllCards; }
  function endHtml() {
    var n = { ready: 0, unread: 0, attn: 0, logged: 0, renumber: 0 }, rows = '', now = venueNow();
    rows += '<div class="er2 vrow"><b>📍</b><span class="x">' + esc(now ? now.name : (rawVenue() ? '? ' + rawVenue() : 'Venue not read')) + '</span><span class="chp ' + (now ? 'w' : 'a') + '">' + (now ? 'venue ✓' : 'venue needs a look') + '</span></div>';
    if (!now || vs.mode === 'edit' || vs.busy || vs.err || vs.msg) rows += venueHtml();
    else rows += '<div class="bt" style="margin:-2px 0 4px"><button class="b" data-vchg="1">Change venue</button></div>';
    show.videos.forEach(function(v, i) {
      var k = cls(v), r = recs[v.id]; n[k] = (n[k] || 0) + 1;
      var lab = k === 'renumber' ? 'logged as ' + map[v.id].n + ', save as ' + (i + 1) : k === 'logged' ? 'logged' : k === 'ready' ? (segs[v.id] ? 'ready · segment' : 'ready') : k === 'attn' ? 'needs a look' : 'not read yet';
      rows += '<div class="er2' + (needsCard(v) ? ' open' : '') + '" data-row="' + esc(v.id) + '"><b>' + (i + 1) + '</b><span class="x">' + esc(mtEn((r && !r.failed && (r.title_en || r.title_ja)) || v.t)) + '</span><span class="chp ' + (k === 'logged' ? 't' : k === 'ready' ? 'w' : k === 'attn' || k === 'renumber' ? 'a' : 'r') + '">' + lab + '</span></div>';
    });
    var todo = n.ready + n.unread + n.renumber, nx = nextShow();
    var h = '<div class="end"><div class="hd">The card<span style="flex:1"></span><button class="b" style="height:36px;font-size:13px" data-allcards="1">' + (showAllCards ? 'Hide cards' : 'Show all cards') + '</button></div>' + rows + '<div class="bt">';
    if (batch) h += '<button class="b on wide" disabled>Confirming ' + Math.min(batch.done + 1, batch.list.length) + ' of ' + batch.list.length + '…</button><button class="b" data-stop="1">Stop</button>';
    else if (todo) h += '<button class="b on wide" data-all="1">Confirm all (' + todo + ')</button>';
    h += '</div>' + (nx ? '<button class="b' + (todo || batch ? '' : ' on') + ' wide" data-go="' + esc(nx.set) + '" data-from="' + esc(S.from) + '">Next: ' + esc(nx.name) + '</button>' : '') + '</div>';
    return h;
  }
  function showHtml() {
    if (!show) return '<div class="ld">Reading the show page…</div>';
    var cardsH = show.videos.map(function(v, i) { return needsCard(v) ? cardHtml(v, i) : ''; }).join('');
    return showHead() + endHtml() + (cardsH ? '<div class="gl" style="margin:14px 0 8px">' + (showAllCards ? 'Every match' : 'To look at') + '</div>' + cardsH : '');
  }
  // ---- the show at the top (2.92.0), and help from an AI for what the site doesn't say
  function showHead() {
    var en = showName(show.name, show.date), date = show.date || '', unknown = 0;
    show.videos.forEach(function(v) { if (cls(v) === 'attn') unknown++; });
    return '<div class="shw"><div class="n1">' + esc(en || show.line) + '</div>' + (show.line && show.line !== en ? '<div class="n2">' + esc(show.line) + '</div>' : '') +
      '<div class="d">' + esc(dateText(date) || 'Date not read') + '</div>' +
      '<div class="n2" style="margin-top:6px">Card order: match 1 is ' + esc(firstLast()) + (show.orderBy ? ' · ' + esc(show.orderBy) : '') + '</div>' +
      '<div class="bt"><button class="b" data-rev="1">⇅ Reverse order</button><button class="b' + (unknown || !venueNow() ? ' on' : '') + '" data-aiask="1">' + esc(aiAskLabel()) + '</button><button class="b" data-aicopy="1">Copy AI prompt</button><button class="b" data-aipaste="1">Paste AI answer</button></div></div>';
  }
  function firstLast() { var v = show.videos[0], r = v && recs[v.id]; return v ? '"' + String(mtEn((r && !r.failed && (r.title_en || r.title_ja)) || v.t)).slice(0, 40) + '"' : '–'; }
  // The card in a new order (2.93.0): reversed, or as an AI answer has it. Kept with the show on the phone; logged
  // matches whose saved number no longer fits are marked to re-save.
  function setOrder(vids, why) {
    show.videos = vids; show.orderBy = why; lsSet(SET_KEY + show.set, show);
    draw();
  }
  function personText(raw, other) { return other && other !== raw ? raw + ' (' + other + ')' : raw; }
  // 2.96.3: a focused question. Every match goes in as one short line (for the running order); only what's missing is
  // asked about in full: the names card check couldn't place, line-ups the site didn't give, the venue if unknown.
  // With nothing missing it is a yes / no on the order.
  function aiNeeds() {
    var K = kit(), need = [], unknownNames = 0;
    show.videos.forEach(function(v, i) {
      if (status(v) || segs[v.id]) return;
      var r = recs[v.id];
      if (!r || r.failed) { need.push({ i: i, what: 'line-up' }); return; }
      var sd = sides(r);
      if (sd.A.length < 2) { need.push({ i: i, what: 'line-up' }); return; }
      var q = [];
      sd.A.forEach(function(names, si) { names.forEach(function(rw, j) { var o = sd.B[si] && sd.B[si].length === names.length ? sd.B[si][j] : ''; if (!(K && (K.resolve(rw) || K.resolve(o)))) q.push(personText(rw, o)); }); });
      if (q.length) { need.push({ i: i, what: 'names', names: q }); unknownNames += q.length; }
    });
    return { list: need, names: unknownNames, venue: !venueNow() };
  }
  function aiAskLabel() {
    var n = aiNeeds(), bits = [];
    if (n.names) bits.push(n.names + (n.names === 1 ? ' name' : ' names'));
    var lu = n.list.filter(function(x) { return x.what === 'line-up'; }).length;
    if (lu) bits.push(lu + (lu === 1 ? ' line-up' : ' line-ups'));
    if (n.venue) bits.push('venue');
    return bits.length ? 'Ask Gemini: order + ' + bits.join(', ') : 'Check order with Gemini';
  }
  // 2.96.4: one match only (the Ask Gemini button on its card): who is in it, nothing else.
  function aiPromptOne(vi) {
    var K = kit(), v = show.videos[vi], r = recs[v.id], ven = venueNow(), raw = rawVenue(), title = (r && !r.failed && (r.title_en || r.title_ja)) || v.t, have = [];   // the site's own title for Gemini
    if (r && !r.failed) {
      var sd = sides(r);
      have = sd.A.map(function(names, si) { return names.map(function(rw, j) { var o = sd.B[si] && sd.B[si].length === names.length ? sd.B[si][j] : '', id = K ? (K.resolve(rw) || K.resolve(o)) : ''; return id ? K.nameOf(id) : '?' + personText(rw, o); }).join(' & '); });
    }
    return [
      'I am logging one match from a STARDOM (Japanese women\'s pro wrestling) show. Please search reliable sources (the STARDOM official site, Cagematch, Wikipedia, news reports) before answering.',
      '',
      'Show: ' + (show.line || show.name) + (showName(show.name, show.date) !== show.line ? ' (' + showName(show.name, show.date) + ')' : ''),
      'Date: ' + (show.date || 'unknown'),
      'Venue: ' + (ven ? ven.name : (raw || 'unknown')),
      'Match ' + (vi + 1) + ' of ' + show.videos.length + ' as the video site lists it: ' + title,
      'The site\'s line-up: ' + (have.length >= 2 ? have.join(' vs ') : '(none)') + (have.join('').indexOf('?') >= 0 ? '  (names starting with ? are ones I could not identify; one entry may be two wrestlers run together, or one wrestler under a special name)' : ''),
      '',
      'Give only this match\'s full line-up: every wrestler on each side, with her English and Japanese name as used at the time. Answer with only this JSON (no other text); use null for anything you are not sure of, do not guess.',
      '```json',
      '{"matches": [{"listed": ' + (vi + 1) + ', "sides": [[{"en": "", "ja": ""}], [{"en": "", "ja": ""}]]}]}',
      '```'
    ].join('\n');
  }
  function aiPrompt() {
    var K = kit(), lines = [], ven = venueNow(), raw = rawVenue(), need = aiNeeds();
    show.videos.forEach(function(v, i) {
      var r = recs[v.id], title = (r && !r.failed && (r.title_en || r.title_ja)) || v.t, c = map[v.id], txt = '';
      if (segs[v.id]) txt = 'segment: ' + segLabel(segs[v.id].type) + ' · ' + segs[v.id].ids.map(function(id) { return K.nameOf(id); }).join(', ');
      else if ((!r || r.failed) && c && c.s) txt = c.s.map(function(x) { return x.join(' & '); }).join(' vs ');
      else if (r && !r.failed) {
        var sd = sides(r);
        txt = sd.A.map(function(names, si) { return names.map(function(rw, j) { var o = sd.B[si] && sd.B[si].length === names.length ? sd.B[si][j] : '', id = K ? (K.resolve(rw) || K.resolve(o)) : ''; return id ? K.nameOf(id) : '?' + personText(rw, o); }).join(' & '); }).join(' vs ');
      }
      lines.push((i + 1) + '. ' + title + (txt ? ': ' + txt : ' (no line-up)'));
    });
    var ask = ['1. Is the list above the real running order (opener first, main event last)? Answer "order" with "same", "reversed", or the list numbers in the real order, e.g. [3,1,2].'];
    if (need.list.length) {
      ask.push('2. Only for these matches, give the full line-up (every wrestler, English and Japanese name as used at the time). "listed" is the number in the list above, "no" its real place on the card:');
      need.list.forEach(function(x) { ask.push('   - #' + (x.i + 1) + (x.what === 'names' ? ': who is ' + x.names.join(', ') + '?' : ': the site gives no line-up')); });
    }
    if (need.venue) ask.push((need.list.length ? '3' : '2') + '. The venue: its English and Japanese name.');
    var shape = '{"order": "same", ' + (need.venue ? '"venue": {"en": "", "ja": ""}, ' : '') + '"matches": [' + (need.list.length ? '{"listed": 1, "no": 1, "sides": [[{"en": "", "ja": ""}], [{"en": "", "ja": ""}]]}' : '') + ']}';
    return [
      'I am logging a STARDOM (Japanese women\'s pro wrestling) show. Please search reliable sources (the STARDOM official site, Cagematch, Wikipedia, news reports) before answering.',
      '',
      'Show: ' + (show.line || show.name) + (showName(show.name, show.date) !== show.line ? ' (' + showName(show.name, show.date) + ')' : ''),
      'Date: ' + (show.date || 'unknown'),
      'Venue: ' + (ven ? ven.name : (raw ? raw + ' (not confirmed)' : 'unknown')),
      '',
      'The card as the video site lists it (names starting with ? are ones I could not identify; the site sometimes lists a show backwards):',
      lines.join('\n'),
      '',
      'Please answer only these:',
      ask.join('\n'),
      '',
      'Answer with only this JSON (no other text). Use null for anything you are not sure of; do not guess.' + (need.list.length ? '' : ' "matches" stays empty.'),
      '```json', shape, '```'
    ].join('\n');
  }
  function copyText(t, btn, label) {
    var done = function() { if (btn) btn.textContent = label; };
    var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; root.appendChild(ta);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function() { ta.select(); document.execCommand('copy'); done(); });
    else { ta.select(); document.execCommand('copy'); done(); }
    setTimeout(function() { ta.remove(); }, 500);
  }
  // The answer, read: suggestions to approve. Names the site gave that the library doesn't know, paired with the AI's
  // people on the same side of the same match (matched by the wrestlers both already agree on); the venue.
  function aiRead(text) {
    var a = String(text || ''), i = a.indexOf('{'), j = a.lastIndexOf('}'), data = null;
    if (i >= 0 && j > i) { try { data = JSON.parse(a.slice(i, j + 1)); } catch (e) {} }
    if (data && !Array.isArray(data.matches) && data.order != null) data.matches = [];
    if (!data || !Array.isArray(data.matches)) return { err: 'No card found in the answer. It should hold the JSON block the prompt asks for.' };
    var K = kit(), out = [], norm = function(x) { return String(x || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_\-]+/g, ''); };
    var aiId = function(p) { return p ? (K.resolve(p.en || '') || K.resolve(p.ja || '')) : ''; };
    var used = {}, newSeen = {}, same = data.matches.length === show.videos.length;
    // 2.93.0: the card's order, checked by the wrestlers: each match the library knows two or more people in is found
    // in the answer; if the answer has them reversed or shuffled, its order is offered (and line-ups below follow it).
    var at = {}, pairs = [];
    show.videos.forEach(function(v, vi) {
      var r = recs[v.id], ids = {}, c = map[v.id];
      if (r && !r.failed) { var sd = sides(r); sd.A.forEach(function(names, si) { names.forEach(function(rw, k) { var o = sd.B[si] && sd.B[si].length === names.length ? sd.B[si][k] : '', id = K.resolve(rw) || K.resolve(o); if (id) ids[id] = 1; }); }); }
      else if (c && c.s) (c.s || []).forEach(function(x, si) { x.forEach(function(nm, k) { var id = K.resolve(nm) || K.resolve(((c.sj || [])[si] || [])[k]); if (id) ids[id] = 1; }); });   // logged: its saved names
      if (Object.keys(ids).length < 2) return;
      var best = -1, bs = 0;
      data.matches.forEach(function(m, mi) { var sc = 0; (m.sides || []).forEach(function(x) { (x || []).forEach(function(p) { if (ids[aiId(p)]) sc++; }); }); if (sc > bs) { bs = sc; best = mi; } });
      if (best >= 0 && bs >= 2) { at[v.id] = best; pairs.push([vi, best]); }
    });
    var place = function(mi) { var m = data.matches[mi]; return Number(m.no) > 0 ? Number(m.no) : mi + 1; };
    var orderNote = '', reorder = null, ord = data.order, nV = show.videos.length;
    // 2.96.3: the answer says the order outright: "same", "reversed", or the list numbers in the real order.
    if (ord === 'same' || ord === true) { orderNote = 'Gemini confirms this running order.'; pairs = []; }
    else if (ord === 'reversed') { reorder = show.videos.slice().reverse(); pairs = []; out.unshift({ k: 'order', vids: reorder.map(function(v) { return v.id; }), why: 'reversed (the answer)', text: 'Reverse the card: the answer has it the other way round', on: true }); }
    else if (Array.isArray(ord) && ord.length === nV && ord.map(Number).slice().sort(function(a, b) { return a - b; }).every(function(x, k) { return x === k + 1; })) {
      pairs = [];
      if (ord.every(function(x, k) { return Number(x) === k + 1; })) orderNote = 'Gemini confirms this running order.';
      else { reorder = ord.map(function(x) { return show.videos[Number(x) - 1]; }); out.unshift({ k: 'order', vids: reorder.map(function(v) { return v.id; }), why: 'as the answer has it', text: 'Put the matches in the answer\'s order', on: true }); }
    }
    if (pairs.length >= 2) {
      var ident = pairs.every(function(p) { return place(p[1]) === p[0] + 1; });
      var rev = pairs.every(function(p) { return place(p[1]) === show.videos.length - p[0]; });
      if (ident) orderNote = 'The answer has the matches in this order.';
      else {
        var key = {}; show.videos.forEach(function(v, vi) { key[v.id] = at[v.id] != null ? place(at[v.id]) : (rev ? show.videos.length - vi : vi + 1); });
        reorder = show.videos.slice().sort(function(x, y) { return key[x.id] - key[y.id]; });
        out.unshift({ k: 'order', vids: reorder.map(function(v) { return v.id; }), why: rev ? 'reversed (the answer)' : 'as the answer has it', text: rev ? 'Reverse the card: the answer has these matches the other way round' : 'Put the matches in the answer\'s order', on: true });
      }
    }
    var cardPos = function(vi) { if (!reorder) return vi; var id = show.videos[vi].id; return reorder.map(function(v) { return v.id; }).indexOf(id); };
    var addNew = function(p, v, no) {
      var key = norm(p.en || p.ja); if (!key || newSeen[key] || aiId(p)) return;
      newSeen[key] = 1;
      out.push({ k: 'new', v: v, no: no, raw: p.ja || p.en, other: p.ja && p.en ? p.en : '', en: p.en || '', ja: p.ja || '', on: true });
    };
    // 2.92.1: a match the site gave no line-up for takes the answer's, matched by its place on the card (when the
    // answer has as many matches as the site) and offered as a line-up to approve; its unknown wrestlers as new ones.
    show.videos.forEach(function(v, vi) {
      var r = recs[v.id]; if (status(v)) return;
      // 2.96.4: an answer about this one match whose sides hold a different number of people than the site's (two
      // names run together, a missing "&") replaces the line-up instead of fixing names one by one.
      var one = data.matches.filter(function(m) { return Number(m.listed) === vi + 1 && Array.isArray(m.sides); })[0];
      var shape = function(ss) { return ss.map(function(x) { return (x || []).filter(function(p) { return p && (typeof p === 'string' || p.en || p.ja); }).length; }).join(','); };
      if (r && !r.failed && sides(r).A.length >= 2 && !(one && shape(one.sides) !== shape(sides(r).A))) return;
      var mi = -1;
      var cp = cardPos(vi);
      data.matches.forEach(function(m, k) { if (mi < 0 && !used[k] && Number(m.listed) === vi + 1) mi = k; });
      data.matches.forEach(function(m, k) { if (mi < 0 && !used[k] && m.listed == null && (Number(m.no) === cp + 1 || (same && k === cp))) mi = k; });
      var am = mi >= 0 ? data.matches[mi] : null;
      if (!am || !Array.isArray(am.sides) || am.sides.length < 2) return;
      used[mi] = 1;
      var aS = am.sides.map(function(x) { return (x || []).filter(function(p) { return p && (p.en || p.ja); }); });
      if (aS.some(function(x) { return !x.length; })) return;
      out.push({ k: 'lineup', v: v.id, no: vi + 1, en: aS.map(function(x) { return x.map(function(p) { return p.en || p.ja; }); }), ja: aS.map(function(x) { return x.map(function(p) { return p.ja || p.en; }); }),
        text: aS.map(function(x) { return x.map(function(p) { var id = aiId(p); return id ? K.nameOf(id) : (p.en || p.ja); }).join(' & '); }).join(' vs '), type: am.type || '', on: true });
      aS.forEach(function(x) { x.forEach(function(p) { addNew(p, v.id, vi + 1); }); });
    });
    show.videos.forEach(function(v, vi) {
      var r = recs[v.id]; if (!r || r.failed || status(v)) return;
      var sd = sides(r), mine = sd.A.map(function(names, si) { return names.map(function(rw, k) { var o = sd.B[si] && sd.B[si].length === names.length ? sd.B[si][k] : ''; return { raw: rw, other: o, id: K.resolve(rw) || K.resolve(o) }; }); });
      if (!mine.some(function(sd2) { return sd2.some(function(p) { return !p.id; }); })) return;
      // the AI's match: the most wrestlers in common, else the same place on the card
      var best = null, bs = -1;
      data.matches.forEach(function(m, mi) {
        if (used[mi] || !Array.isArray(m.sides)) return;
        var ids = {}; m.sides.forEach(function(x) { (x || []).forEach(function(p) { var id = aiId(p); if (id) ids[id] = 1; }); });
        var sc = 0; mine.forEach(function(x) { x.forEach(function(p) { if (p.id && ids[p.id]) sc += 2; }); });
        if (Number(m.listed) === vi + 1) sc += 3; else if (Number(m.no) === vi + 1 || (same && mi === vi)) sc += 1;
        if (sc > bs) { bs = sc; best = mi; }
      });
      if (best == null || bs < 1) return;
      used[best] = 1;
      var am = data.matches[best], aSides = am.sides.map(function(x) { return (x || []).filter(Boolean); }), takenSide = {};
      mine.forEach(function(myS, si) {
        var unk = myS.filter(function(p) { return !p.id; }); if (!unk.length) return;
        var known = {}; myS.forEach(function(p) { if (p.id) known[p.id] = 1; });
        var pick = -1, ps = -1;
        aSides.forEach(function(as, ai) {
          if (takenSide[ai]) return;
          var sc = as.filter(function(p) { return known[aiId(p)]; }).length * 2 + (as.length === myS.length ? 1 : 0) + (ai === si ? 0.5 : 0);
          if (sc > ps) { ps = sc; pick = ai; }
        });
        if (pick < 0) return;
        takenSide[pick] = 1;
        var pool = aSides[pick].filter(function(p) { var id = aiId(p); return !(id && known[id]); }), left = pool.slice();
        unk.forEach(function(u) {
          // the same spelling first, then in order
          var at = -1; left.forEach(function(p, k) { if (at < 0 && [p.en, p.ja].some(function(x) { return x && (norm(x) === norm(u.raw) || norm(x) === norm(u.other)); })) at = k; });
          if (at < 0) at = left.length ? 0 : -1;
          if (at < 0) return;
          var p = left.splice(at, 1)[0], id = aiId(p), nm = p.en || p.ja;
          if (!nm) return;
          if (id && badAlias(u.raw)) out.push({ k: 'use', v: v.id, no: vi + 1, raw: u.raw, other: u.other, id: id, name: K.nameOf(id), on: true });
          else if (id && !badAlias(u.raw)) out.push({ k: 'alias', v: v.id, no: vi + 1, raw: u.raw, other: badAlias(u.other) ? '' : u.other, id: id, name: K.nameOf(id), on: true });
          else if (!newSeen[norm(p.en || p.ja)]) { newSeen[norm(p.en || p.ja)] = 1; out.push({ k: 'new', v: v.id, no: vi + 1, raw: u.raw, other: u.other, en: p.en || '', ja: p.ja || '', on: true }); }
        });
      });
    });
    // the venue, when the show hasn't one
    var vv = data.venue || {}, now = venueNow();
    if (!now && (vv.en || vv.ja)) {
      var m2 = (vv.ja && K.venue(vv.ja)) || (vv.en && K.venue(vv.en));
      out.unshift(m2 ? { k: 'venue', id: m2.id, name: m2.name, on: true } : { k: 'venueNew', en: vv.en || vv.ja, ja: vv.ja || '', on: true });
    }
    var note = data.date && show.date && data.date !== show.date ? 'The answer gives the date as ' + data.date + ' (the site: ' + show.date + ').' : '';
    return { list: out, note: note, info: orderNote };
  }
  function aiHtml() {
    var a = sheetOpen, h = '<div class="shade" data-close="1"></div><div class="sheet"><div class="hd" style="margin-bottom:8px">AI answer</div>';
    if (a.busy) h += '<div class="ld">' + esc(a.busy) + '</div>';
    if (!a.sug) {
      h += '<textarea class="tx" id="ccp-ai" placeholder="Paste the AI\'s answer here">' + esc(a.text || '') + '</textarea><div class="bt"><button class="b on wide" data-airead="1">Read answer</button><button class="b" data-close="1">Cancel</button></div>';
    } else if (!a.sug.length) {
      h += (a.info ? '<div class="msg">✓ ' + esc(a.info) + '</div>' : '') + '<div class="ld">Nothing to fill in from this answer: no unknown names it could place' + (venueNow() ? '' : ' and no venue') + '.</div><div class="bt"><button class="b" data-close="1">Close</button></div>';
    } else {
      if (a.note) h += '<div class="msg er">' + esc(a.note) + '</div>';
      if (a.info) h += '<div class="msg">✓ ' + esc(a.info) + '</div>';
      h += '<div class="gl">Tap to leave any out, then Apply</div>';
      a.sug.forEach(function(x, i) {
        var t = x.k === 'order' ? x.text : x.k === 'lineup' ? 'Match ' + x.no + ' line-up → ' + x.text : x.k === 'alias' || x.k === 'use' ? personText(x.raw, x.other) + ' → ' + x.name : x.k === 'new' ? personText(x.raw, x.other) + ' → new wrestler ' + personText(x.en || x.ja, x.ja && x.en ? x.ja : '') :
          x.k === 'venue' ? 'Venue → ' + x.name : 'Venue → new venue ' + personText(x.en, x.ja && x.ja !== x.en ? x.ja : '');
        var sub = x.k === 'order' ? 'Logged matches with another number are marked to save again' : x.k === 'lineup' ? (x.type ? x.type + ' · ' : '') + 'the site gave none; used for this match' : x.k === 'alias' ? 'Match ' + x.no + ' · in the library; this spelling becomes hers' : x.k === 'use' ? 'Match ' + x.no + ' · in the library; used for this match only' : x.k === 'new' ? 'Match ' + x.no + ' · added to the library' : 'Set once for the whole show';
        h += '<button class="sug' + (x.on ? ' on' : '') + '" data-aitog="' + i + '"><span class="bx">' + (x.on ? '✓' : '') + '</span><span>' + esc(t) + '<small>' + esc(sub) + '</small></span></button>';
      });
      var n = a.sug.filter(function(x) { return x.on; }).length;
      h += '<div class="bt"><button class="b on wide" data-aiapply="1"' + (n && !a.busy ? '' : ' disabled') + '>Apply ' + n + '</button><button class="b" data-close="1">Cancel</button></div>';
    }
    if (a.err) h += '<div class="msg er">' + esc(a.err) + '</div>';
    if (a.sources && a.sources.length) h += '<div class="src">Sources: ' + a.sources.map(function(x) { return esc(x.title || x.uri); }).join(' · ') + '</div>';
    return h + '</div>';
  }
  // One at a time: venue, new wrestlers (then her other spelling), spellings for wrestlers already known.
  function aiApply() {
    var a = sheetOpen, rank = { order: 0, venue: 0, venueNew: 0, 'new': 1, alias: 2, use: 2, lineup: 3 }, done = 0, fail = [];
    var todo = a.sug.filter(function(x) { return x.on; }).sort(function(x, y) { return rank[x.k] - rank[y.k]; });
    var next = function() {
      if (!todo.length) {
        a.busy = ''; a.err = fail.length ? 'Not saved: ' + fail.join('; ') : '';
        window.__tvIndexKit.reload(function() { if (!fail.length) { sheetOpen = null; note('Applied ' + done + ' from the AI answer.', false); } else draw(); attn = {}; draw(); });
        return;
      }
      var x = todo.shift(); a.busy = 'Saving ' + (done + 1) + '…'; draw();
      var after = function(t) { var r = null; try { r = JSON.parse(t); } catch (e) {} if (r && r.ok) done++; else fail.push((x.raw || x.name || x.en) + ': ' + (r && r.error || 'no reply')); return r; };
      if (x.k === 'order') {
        var byId = {}; show.videos.forEach(function(v) { byId[v.id] = v; });
        var nv = x.vids.map(function(id) { return byId[id]; }).filter(Boolean);
        if (nv.length === show.videos.length) { setOrder(nv, x.why); done++; }
        next(); return;
      }
      if (x.k === 'lineup') {
        var v = show.videos.filter(function(y) { return y.id === x.v; })[0], r = recs[x.v] && !recs[x.v].failed ? recs[x.v] : { id: Number(x.v), set: Number(show.set), title_en: v ? v.t : '', title_ja: '', shows: [], lines: [], thumb: v ? v.th : '', date: show.date };
        r.sides_en = x.en; r.sides_ja = x.ja; r.fromAi = 1; recs[x.v] = r; ssSet(REC_KEY + x.v, r); delete attn[x.v]; done++;
        next(); return;
      }
      if (x.k === 'use') {
        var ru = recs[x.v];
        if (ru) { ['sides_en', 'sides_ja'].forEach(function(k) { (ru[k] || []).forEach(function(side) { side.forEach(function(n, j) { if (n === x.raw || (x.other && n === x.other)) side[j] = x.name; }); }); }); ssSet(REC_KEY + x.v, ru); delete attn[x.v]; }
        done++; next(); return;
      }
      if (x.k === 'alias') {
        post({ action: 'vi_propose', type: 'new_alias', value: x.raw, entity_id: x.id, video: x.v }, function(t) {
          after(t);
          if (x.other && x.other !== x.raw) post({ action: 'vi_propose', type: 'new_alias', value: x.other, entity_id: x.id, video: x.v }, function() { next(); }); else next();
        });
      } else if (x.k === 'new') {
        post({ action: 'vi_propose', type: 'new_talent', value: x.en || x.ja, entity_id: '', video: x.v }, function(t) {
          var r = after(t), id = r && r.ok && r.id;
          var spell = [x.raw, x.other, x.ja].filter(function(s2, k, all) { return s2 && s2 !== (x.en || x.ja) && all.indexOf(s2) === k; });
          var go = function() { if (!id || !spell.length) { next(); return; } post({ action: 'vi_propose', type: 'new_alias', value: spell.shift(), entity_id: id, video: x.v }, go); };
          go();
        });
      } else if (x.k === 'venue') {
        post({ action: 'vi_show_venue', show: S.set, venue: x.id, raw: rawVenue(), name: show.name || '', date: show.date || '' }, function(t) { if (after(t) && JSON.parse(t).ok) lsSet('ccPhoneVen' + S.set, { id: x.id, name: x.name }); next(); });
      } else {
        post({ action: 'vi_propose', type: 'new_venue', value: x.en, entity_id: x.ja || (hasJa(rawVenue()) ? rawVenue() : ''), video: show.videos[0] ? show.videos[0].id : '' }, function(t) {
          var r = after(t);
          if (!r || !r.ok || !r.id) { next(); return; }
          window.__tvIndexKit.reload(function() { post({ action: 'vi_show_venue', show: S.set, venue: r.id, raw: rawVenue(), name: show.name || '', date: show.date || '' }, function(t2) { var r2 = null; try { r2 = JSON.parse(t2); } catch (e) {} if (r2 && r2.ok) lsSet('ccPhoneVen' + S.set, { id: r.id, name: x.en }); next(); }); });
        });
      }
    };
    next();
  }
  // Next show: the next one in the list you came from (a year: the next older one not fully logged; Started: the next).
  function nextShow() {
    var list = [];
    if (/^y\d{4}$/.test(S.from)) {
      var c = lsGet(YEAR_KEY + S.from.slice(1)), yy = S.from.slice(1);
      list = (c && c.items || []).map(function(x, i) { var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+x.set, x.name, yy) : null; return { set: x.set, name: x.name, d: (sl && sl.date) || '', i: i }; })
        .sort(function(a, b) { return String(b.d).localeCompare(String(a.d)) || a.i - b.i; });   // the same order as the list on screen
    }
    else list = startedList().map(function(g) { return { set: g.set, name: g.name }; });
    var at = list.map(function(x) { return x.set; }).indexOf(S.set), rest = list.slice(at + 1).filter(function(x) { var sc = lsGet(SET_KEY + x.set); return !setCount(x.set, sc && sc.videos).done; });
    var nx = rest[0];
    if (!nx) return null;
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+nx.set, nx.name, null) : { show: nx.name };
    return { set: nx.set, name: showName(sl.show || nx.name, sl.date) || nx.name };
  }

  // ---- saving: the TV's logger, without its screen (Confirm & next's quick save)
  // 2.94.0: Confirm and Confirm all build each match's save on the phone (the logger's collect: no read of the sheet) and
  // send the card as one request (vi_save_many) in the background; card check moves on at once. A match being sent shows
  // "Saving to the sheet…"; one the sheet turns down goes back to "needs a look" with its reason.
  var sending = {}, sendFail = {};
  function showVenueId() {
    var mine = lsGet('ccPhoneVen' + S.set); if (mine && mine.id) return mine.id;
    var K = kit(), raw = rawVenue(), m = K && raw ? K.venue(raw) : null;
    return m ? m.id : '';
  }
  function collectOne(id, done) {
    var i = show.videos.map(function(v) { return v.id; }).indexOf(id), v = show.videos[i], rec = recs[id];
    if (!v || !rec || rec.failed || !window.__tvIndexOpen) { done(null); return; }
    if (!rec.shows || !rec.shows.length) rec.shows = [{ id: Number(show.set), show: show.name, venue: show.venue, date: show.date }];
    if (!rec.date) rec.date = show.date;
    if (!rec.thumb) rec.thumb = v.th;
    var shown = false;
    window.__tvIndexOpen({ set: show.set, video: id, rec: rec, place: { no: i + 1, total: show.videos.length }, thumb: true, tab: 'card', quick: true, collect: true, venue: showVenueId(), segment: segs[id] || null,
      host: function() { shown = true; attn[id] = 1; setTimeout(function() { if (window.__tvIndexBack) window.__tvIndexBack(); }, 0); var d = document.createElement('div'); d.style.display = 'none'; document.body.appendChild(d); return d; },
      done: function(res) { done(!shown && res && res.collected ? res.collected : null); } });
  }
  function sendCard(bodies, tries) {
    var ids = bodies.map(function(x) { return String(x.video); });
    ids.forEach(function(id) { sending[id] = 1; delete sendFail[id]; });
    draw();
    post({ action: 'vi_save_many', items: bodies }, function(t) {
      var r = null; try { r = JSON.parse(t); } catch (e) {}
      if (r && !r.ok && r.busy && (tries || 0) < 3) { setTimeout(function() { sendCard(bodies, (tries || 0) + 1); }, 4000 * ((tries || 0) + 1)); return; }   // the sheet was busy: again
      ids.forEach(function(id) { delete sending[id]; });
      if (!r || !r.ok) { ids.forEach(function(id) { sendFail[id] = String(r && r.error || 'no reply'); }); note('Not saved: ' + (r && r.error || 'no reply') + '. Confirm again to retry.', true); return; }
      var bad = 0;
      // a name or side the sheet won't take needs a look; anything else stays ready to confirm again
      (r.results || []).forEach(function(x) { if (x.ok) saved[x.video] = 1; else { bad++; sendFail[x.video] = x.error || 'not saved'; if (/library|side/i.test(x.error || '')) attn[x.video] = 1; } });
      note(r.saved + ' saved to the sheet' + (bad ? ', ' + bad + ' turned down (see the match)' : '') + '.', !!bad);
      cards();
    });
  }
  function confirmOne(id, done) {
    var i = show.videos.map(function(v) { return v.id; }).indexOf(id), v = show.videos[i], rec = recs[id], re = v && cls(v) === 'renumber';
    if (re && (!rec || rec.failed)) rec = { id: Number(id), set: Number(show.set), title_en: v.t, title_ja: '', sides_en: [], sides_ja: [], shows: [], lines: [], thumb: v.th, date: show.date };
    if (!v || !rec || rec.failed || !window.__tvIndexOpen) { done(false); return; }
    if (!rec.shows || !rec.shows.length) rec.shows = [{ id: Number(show.set), show: show.name, venue: show.venue, date: show.date }];
    if (!rec.date) rec.date = show.date;
    if (!rec.thumb) rec.thumb = v.th;
    var shown = false;
    window.__tvIndexOpen({ set: show.set, video: id, rec: rec, place: { no: i + 1, total: show.videos.length }, thumb: true, tab: 'card', quick: true, reorder: !!re,
      // The logger wants to show itself (a name it can't place): not on the phone; the match is marked to look at.
      host: function() { shown = true; attn[id] = 1; setTimeout(function() { if (window.__tvIndexBack) window.__tvIndexBack(); }, 0); var d = document.createElement('div'); d.style.display = 'none'; document.body.appendChild(d); return d; },
      done: function(res) { var ok = !shown && res && res.ok; if (ok) { saved[id] = 1; if (map[id]) map[id].n = i + 1; } done(ok); } });
  }
  function confirmAll() {
    var list = show.videos.filter(function(v) { var k = cls(v); return k === 'ready' || k === 'unread' || k === 'renumber'; }).map(function(v) { return v.id; });
    if (!list.length) return;
    batch = { list: list, done: 0, at: null, stop: false, saved: 0 }; draw(); step();
  }
  function step() {
    var b = batch; if (!b) return;
    b.bodies = b.bodies || [];
    if (b.stop || b.done >= b.list.length) { batch = null; if (b.bodies.length) sendCard(b.bodies); else if (b.saved) cards(); draw(); return; }
    var id = b.list[b.done], v = show.videos.filter(function(x) { return x.id === id; })[0];
    b.at = id;
    var re = v && cls(v) === 'renumber';
    if (!v || (status(v) && !re)) { b.done++; step(); return; }
    if (!re && !recs[id]) { want(id); draw(); setTimeout(function() { if (batch === b) step(); }, 700); return; }
    if (!re && cls(v) !== 'ready') { b.done++; draw(); step(); return; }
    if (re) { draw(); confirmOne(id, function(ok) { if (batch !== b) return; if (ok) b.saved++; b.done++; draw(); setTimeout(step, 300); }); return; }   // a new number: as before, reading the match first
    collectOne(id, function(body) { if (batch !== b) return; if (body) b.bodies.push(body); b.done++; setTimeout(step, 0); });
  }

  // ---- fixing a name: a wrestler from the library (the site's spelling becomes her alias), or a new one
  function fixHtml() {
    var f = sheetOpen, K = kit(), L = K && K.talents ? K.talents(f.q, 8) : [];
    var h = '<div class="shade" data-close="1"></div><div class="sheet"><div class="hd" style="margin-bottom:8px">Who is ' + esc(f.raw) + '?</div>' + (f.other ? '<div class="sub" style="color:#9AA6B4;margin-bottom:8px">' + esc(f.other) + '</div>' : '') +
      (f.now && K ? '<div class="sub" style="color:#9AA6B4;margin-bottom:8px">Now: ' + esc(K.nameOf(f.now)) + '</div>' : '') +
      '<input class="tx" id="ccp-fin" type="text" autocomplete="off" placeholder="Search the library" value="' + esc(f.q) + '"><div id="ccp-fl">';
    // 2.96.2: two library names run together ("Aya Sakura Sayaka Kurara"): split into both.
    var two = K && K.inText ? K.inText([f.raw, f.other].filter(Boolean).join(' ')) : [];
    if (two.length >= 2) h += '<button class="opt" data-split="1" style="border-color:#6B5A22">' + esc(two.map(function(id) { return K.nameOf(id); }).join(' + ')) + '<small>Two wrestlers run together: split into ' + two.length + '</small></button>';
    h += fixList(L) + '</div>' + (f.err ? '<div class="msg er">' + esc(f.err) + '</div>' : '') + (f.busy ? '<div class="msg">Saving…</div>' : '') + '<div class="bt"><button class="b" data-close="1">Cancel</button></div></div>';
    return h;
  }
  function fixList(L) {
    var f = sheetOpen, h = '';
    L.forEach(function(t) { h += '<button class="opt" data-pick="' + esc(t.id) + '">' + esc(t.name) + (t.other ? '<small>' + esc(t.other) + '</small>' : '') + '</button>'; });
    // 2.103.1: what is typed in the search box can be the new wrestler's name (an English name for a Japanese-only
    // spelling), with the site's spelling kept as her alias. Before, only the site's spelling could be added.
    var typed = String(f.q || '').trim();
    if (typed && typed !== f.raw && typed !== f.other && !badAlias(typed) && !L.some(function(t) { return String(t.name).toLowerCase() === typed.toLowerCase(); }))
      h += '<button class="opt" data-newp="2">' + esc(typed) + '<small>Add as a new wrestler · ' + esc(f.raw) + ' kept as her spelling</small></button>';
    if (!f.now) h += '<button class="opt" data-newp="1">' + esc(f.raw) + '<small>Add as a new wrestler' + (hasJa(f.raw) ? ' (Japanese name only: type her English name above to use it instead)' : '') + '</small></button>';
    return h;
  }
  // The sheet refuses spellings that aren't one name (2.95.0): this mirrors its quick checks, so a misread line
  // isn't offered as an alias in the first place.
  function badAlias(s) {
    s = String(s || '').normalize('NFKC').trim();
    return !s || s.length > 40 || /[,、;\/&]|\bvs\.?(\s|$)|(^|\s)\d/i.test(s) ||
      /\b(match|tournament|round|battle|league|final|title|championship|cup)\b|戦|試合|トーナメント/i.test(s) ||
      (/^[\x00-\x7f★☆]+$/.test(s) && s.split(/\s+/).length > 3);
  }

  // The pick for this match only, in the read line-up (used when the sheet won't keep the spelling, or when the
  // spelling still finds someone else in the library, e.g. it is that wrestler's own name).
  function useHere(f, id) {
    var rc = recs[f.v]; if (!rc) return '';
    var nm = kit().nameOf(id);
    ['sides_en', 'sides_ja'].forEach(function(k) { (rc[k] || []).forEach(function(side) { side.forEach(function(n, j) { if (n === f.raw || (f.other && n === f.other)) side[j] = nm; }); }); });
    ssSet(REC_KEY + f.v, rc); delete attn[f.v];
    return nm;
  }
  function fixSave(body, spell) {
    var f = sheetOpen; f.busy = true; f.err = ''; draw();
    var done = function(id) {
      window.__tvIndexKit.reload(function() {
        var K = kit();
        if (id && K && K.resolve(f.raw) !== id && !(f.other && K.resolve(f.other) === id)) useHere(f, id);
        delete attn[f.v]; sheetOpen = null; draw();
      });
    };
    post(body, function(t) {
      var r = null; try { r = JSON.parse(t); } catch (e) {}
      // 2.96.1: a spelling the sheet won't keep as an alias (match words, two names): the pick still counts for this
      // match, so the card can be confirmed; nothing is saved for next time.
      if (r && !r.ok && body.type === 'new_alias' && /^Not saved as an alias/.test(r.error || '') && recs[f.v]) {
        var nm = useHere(f, body.entity_id); sheetOpen = null; note('Used ' + nm + ' for this match (that spelling isn\'t kept as an alias).', false); return;
      }
      if (!r || !r.ok) { f.busy = false; f.err = String(r && r.error || 'not saved'); draw(); return; }
      var id = body.type === 'new_alias' ? body.entity_id : (r.id || '');
      var left = (spell || []).slice();
      // a new wrestler under her typed name: the site's spellings become her aliases, so she is found next time
      var go = function() { if (!id || !left.length) { done(id); return; } post({ action: 'vi_propose', type: 'new_alias', value: left.shift(), entity_id: id, video: f.v }, go); };
      go();
    });
  }

  // ---- drawing
  var drawT = 0;
  function draw() { if (drawT) return; drawT = setTimeout(function() { drawT = 0; paint(); }, 30); }
  function paint() {
    var ae = document.activeElement;
    if (ae && (ae.id === 'ccp-vin' || ae.id === 'ccp-fin' || ae.id === 'ccp-sin' || ae.id === 'ccp-min' || ae.id === 'ccp-ai')) return;   // typing: the lists under the box update by themselves
    var y = root.scrollTop, h;
    if (!cfg) h = setupHtml();
    else {
      var title = S.screen === 'show' && show ? showName(show.name, show.date) + (show.date ? ' · ' + dateText(show.date) : '') : 'Log a show';
      h = '<div class="top">' + (S.screen === 'show' ? '<button class="ib" data-home="1">‹</button>' : '') + '<span class="wm">STAR<b>SCOPE</b></span><span class="tt">' + esc(title) + '</span><button class="ib" data-relink="1" aria-label="Card check link">⚙</button><button class="ib" data-closeall="1">✕</button></div><div class="pad">' +
        (flash ? '<div class="msg' + (flashBad ? ' er' : '') + '" style="margin-bottom:10px">' + esc(flash) + '</div>' + (diag ? '<div style="font:600 13px system-ui;color:#C9D2DC;border:1px solid #3B4656;border-radius:10px;padding:8px 10px;margin-bottom:10px">' + esc(diag) + (report ? '<div class="bt"><button class="b on" data-copyrep="1">Copy page report</button></div>' : '') + '</div>' : '') + (flashKey ? '<div class="bt" style="margin-bottom:12px"><button class="b on" data-relink="1">Change the card check link</button></div>' : '') : '') +
        (!kitReady ? '<div class="ld">Loading the library…</div>' : '') + (S.screen === 'show' ? showHtml() : homeHtml()) + '</div>' + (sheetOpen ? (sheetOpen.ai ? aiHtml() : sheetOpen.seg ? segHtml() : sheetOpen.man ? manHtml() : fixHtml()) : '');
    }
    root.innerHTML = h; root.scrollTop = y;
    var vin = root.querySelector('#ccp-vin');
    if (vin) { vin.oninput = function() { vs.text = vin.value; var l = root.querySelector('#ccp-vl'); if (l) l.innerHTML = venueList(); }; if (vs.focus) { vs.focus = false; vin.focus(); } }
    var sin = root.querySelector('#ccp-sin');
    if (sin) { sin.oninput = function() { sheetOpen.q = sin.value; var l = root.querySelector('#ccp-sl'); if (l) l.innerHTML = segList(kit().talents(sin.value, 6)); }; if (sheetOpen.focus) { sheetOpen.focus = false; sin.focus(); } }
    var min = root.querySelector('#ccp-min');
    if (min) { min.oninput = function() { sheetOpen.q = min.value; var l = root.querySelector('#ccp-ml'); if (l) l.innerHTML = manList(kit().talents(min.value, 6)); }; if (sheetOpen.focus) { sheetOpen.focus = false; min.focus(); } }
    var fin = root.querySelector('#ccp-fin');
    if (fin) fin.oninput = function() { sheetOpen.q = fin.value; var l = root.querySelector('#ccp-fl'); if (l) l.innerHTML = fixList(kit().talents(fin.value, 8)); };
    if (fin && sheetOpen && sheetOpen.focus) { sheetOpen.focus = false; fin.focus(); }
    watchCards();
  }
  // Match pages are read for the cards on screen (and the one after), one at a time.
  var io = null;
  function watchCards() {
    if (!show || S.screen !== 'show') return;
    show.videos.forEach(function(v) { if (!recs[v.id] && !status(v) && !needsCard(v)) want(v.id); });   // 2.94.0: no card on screen to ask for it
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
    var b = e.target.closest('button, a, [data-row]'); if (!b || !root.contains(b)) return;
    var d = b.dataset;
    if (b.tagName === 'A') { saveState(); return; }   // Watch: the site's own page; the bookmark brings card check back here
    if (d.setup) {
      setupVals = { u: (root.querySelector('#ccp-link') || {}).value || '', k: (root.querySelector('#ccp-key') || {}).value || '' };
      var c = parseLink(setupVals.u, setupVals.k);
      if (c.err) { note(c.err, true); return; }
      cfg = c; oldCfg = null; setupVals = { u: '', k: '' }; lsSet(CFG_KEY, c); flash = ''; diag = ''; start(); return;
    }
    // A link pasted wrong (2.91.1): back to the setup box, any time, from ⚙ or from the error.
    if (d.copyrep) {
      var done = function() { b.textContent = 'Copied: paste it to Claude'; };
      var ta = document.createElement('textarea'); ta.value = report; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; root.appendChild(ta);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(report).then(done, function() { ta.select(); document.execCommand('copy'); done(); });
      else { ta.select(); document.execCommand('copy'); done(); }
      setTimeout(function() { ta.remove(); }, 500);
      return;
    }
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
    if (d.fix) { sheetOpen = { v: d.fix, raw: d.raw, other: d.other, now: d.now || '', q: d.now ? '' : d.raw, err: '', busy: false, focus: !!d.now }; draw(); return; }
    if (d.close) { sheetOpen = null; draw(); return; }
    if (d.split && sheetOpen && recs[sheetOpen.v]) {
      var fs = sheetOpen, K1 = kit(), ids = K1.inText([fs.raw, fs.other].filter(Boolean).join(' ')), rc = recs[fs.v], nm = ids.map(function(id) { return K1.nameOf(id); });
      ['sides_en', 'sides_ja'].forEach(function(k) { (rc[k] || []).forEach(function(side, i) { var j = side.indexOf(fs.raw); if (j < 0 && fs.other) j = side.indexOf(fs.other); if (j >= 0) rc[k][i] = side.slice(0, j).concat(nm, side.slice(j + 1)); }); });
      ssSet(REC_KEY + fs.v, rc); delete attn[fs.v]; sheetOpen = null; draw(); return;
    }
    if (d.man && show) { var mv = show.videos.filter(function(x) { return x.id === d.man; })[0]; if (mv) manOpen(mv); return; }
    if (d.mside && sheetOpen) { sheetOpen.at = +d.mside; sheetOpen.focus = true; draw(); return; }
    if (d.mplus && sheetOpen) { sheetOpen.sides.push([]); sheetOpen.at = sheetOpen.sides.length - 1; sheetOpen.focus = true; draw(); return; }
    if (d.mrm && sheetOpen) { var mi = +d.mrm.split(':')[0], mid = d.mrm.slice(d.mrm.indexOf(':') + 1); sheetOpen.sides[mi] = sheetOpen.sides[mi].filter(function(x) { return x !== mid; }); draw(); return; }
    if (d.madd && sheetOpen) { manAdd(d.madd); return; }
    if (d.mnew && sheetOpen) {
      var mf = sheetOpen, mname = String(mf.q || '').trim(); if (!mname) return;
      mf.busy = true; mf.err = ''; draw();
      post({ action: 'vi_propose', type: 'new_talent', value: mname, entity_id: '', video: mf.v }, function(t) {
        var r = null; try { r = JSON.parse(t); } catch (e) {}
        if (sheetOpen !== mf) return;
        if (!r || !r.ok || !r.id) { mf.busy = false; mf.err = String(r && r.error || (r && r.ok ? 'Sent for approval: not in the library yet' : 'not saved')); draw(); return; }
        window.__tvIndexKit.reload(function() { mf.busy = false; if (sheetOpen === mf) manAdd(r.id); });
      });
      return;
    }
    if (d.mok && sheetOpen) { manUse(); return; }
    if (d.seg && show) { var sv = show.videos.filter(function(x) { return x.id === d.seg; })[0]; if (sv) segOpen(sv); return; }
    if (d.segyes && show) { var yv = show.videos.filter(function(x) { return x.id === d.segyes; })[0], yg = yv && segGuess(yv, recs[yv.id]); if (yg && yg.type && yg.ids.length) { segSet(d.segyes, yg); delete attn[d.segyes]; delete sendFail[d.segyes]; } draw(); return; }
    if (d.segty && sheetOpen) { sheetOpen.type = d.segty; draw(); return; }
    if (d.segrm && sheetOpen) { sheetOpen.ids = sheetOpen.ids.filter(function(x) { return x !== d.segrm; }); draw(); return; }
    if (d.segadd && sheetOpen) { sheetOpen.ids.push(d.segadd); sheetOpen.q = ''; sheetOpen.focus = true; draw(); return; }
    if (d.segok && sheetOpen) { var so = sheetOpen; if (so.type && so.ids.length) { segSet(so.v, { type: so.type, ids: so.ids.slice() }); delete attn[so.v]; delete sendFail[so.v]; } sheetOpen = null; draw(); return; }
    if (d.unseg) { segSet(d.unseg, null); sheetOpen = null; draw(); return; }
    if (d.row && show) { openCards[d.row] = !openCards[d.row]; draw(); if (openCards[d.row]) setTimeout(function() { var c = root.querySelector('.card[data-v="' + d.row + '"]'); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 80); return; }
    if (d.allcards) { showAllCards = !showAllCards; draw(); return; }
    if (d.rev && show) { setOrder(show.videos.slice().reverse(), show.orderBy === 'reversed by you' ? 'as listed' : 'reversed by you'); return; }
    if (d.aicopy) { copyText(aiPrompt(), b, 'Copied: paste it into Gemini'); return; }
    if (d.aipaste) { sheetOpen = { ai: 1, text: '', sug: null }; draw(); return; }
    if (d.airead && sheetOpen) { sheetOpen.text = (root.querySelector('#ccp-ai') || {}).value || ''; var rd = aiRead(sheetOpen.text); if (rd.err) sheetOpen.err = rd.err; else { sheetOpen.sug = rd.list; sheetOpen.note = rd.note; sheetOpen.info = rd.info; sheetOpen.err = ''; } draw(); return; }
    if (d.aitog && sheetOpen && sheetOpen.sug) { var it = sheetOpen.sug[+d.aitog]; it.on = !it.on; draw(); return; }
    if (d.aiapply && sheetOpen) { aiApply(); return; }
    if (d.aiask || d.aione) {
      var vi1 = d.aione ? show.videos.map(function(x) { return x.id; }).indexOf(d.aione) : -1;
      sheetOpen = { ai: 1, text: '', sug: null, busy: 'Asking Gemini' + (vi1 >= 0 ? ' about match ' + (vi1 + 1) : '') + ' (it searches first; this can take half a minute)…' }; draw();
      post({ action: 'vi_ai', prompt: vi1 >= 0 ? aiPromptOne(vi1) : aiPrompt() }, function(t) {
        var r = null; try { r = JSON.parse(t); } catch (e) {}
        if (!sheetOpen || !sheetOpen.ai) return;
        sheetOpen.busy = '';
        if (!r || !r.ok) { sheetOpen.err = 'Gemini: ' + (r && r.error || 'no reply'); draw(); return; }
        sheetOpen.text = r.text; sheetOpen.sources = r.sources || [];
        var rd = aiRead(r.text); if (rd.err) sheetOpen.err = rd.err; else { sheetOpen.sug = rd.list; sheetOpen.note = rd.note; sheetOpen.info = rd.info; }
        draw();
      });
      return;
    }
    if (d.pick && sheetOpen && d.pick === sheetOpen.now) { sheetOpen = null; draw(); return; }
    if (d.pick && sheetOpen) { var f = sheetOpen; fixSave({ action: 'vi_propose', type: 'new_alias', value: f.raw, entity_id: d.pick, video: f.v }); return; }
    if (d.newp && sheetOpen) {
      var g = sheetOpen, nm2 = d.newp === '2' ? String(g.q || '').trim() : g.raw;
      fixSave({ action: 'vi_propose', type: 'new_talent', value: nm2, entity_id: '', video: g.v }, d.newp === '2' ? [g.raw, g.other].filter(function(x, k, all) { return x && x !== nm2 && all.indexOf(x) === k; }) : []);
      return;
    }
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
