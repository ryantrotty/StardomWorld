(function(){
  // Championship lineage page: /mypage?tvch=<id> (World of Stardom first). Shows the belt (private build only),
  // the current champion, every reign as a strip (width = days held), and for the chosen reign the title win and
  // each defence as a video card. The reigns, dates and defences come from assets/lineage/<id>.json, so opening
  // the page makes no request. Videos are looked up with ONE keyword search (a few pages at most) when a reign is
  // chosen, kept on the device, and matched to the win and the defences by the champion, the challenger and the
  // title name in the video title. A debug block at the bottom of the page lists what was searched and matched.
  if (window.__tvLn) return;
  var P = null;
  try { if (location.pathname === '/mypage') P = new URLSearchParams(location.search).get('tvch'); } catch (e) { P = null; }
  if (!P) return;
  window.__tvLn = true;
  var H = window.AndroidHost || {};
  var BASE = 'https://www.stardom-world.com';
  var CACHE_KEY = 'tvLnCacheV1', BLOCK_KEY = 'tvFacBlockUntilV1';
  var GAP_MS = 1200, MAX_PAGES = 3;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }

  var D = null;
  try { D = JSON.parse(H.lineageJson(P)); } catch (e) { D = null; }

  // ------------------------------------------------------------------ dates and numbers
  function ms(iso) { var a = String(iso).split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
  function fmtD(iso) {
    var a = String(iso).split('-');
    return isJa() ? (+a[0]) + '年' + (+a[1]) + '月' + (+a[2]) + '日' : MONTHS[+a[1] - 1] + ' ' + (+a[2]) + ', ' + a[0];
  }
  function fmtMD(iso) { var a = String(iso).split('-'); return isJa() ? (+a[1]) + '月' + (+a[2]) + '日' : MONTHS[+a[1] - 1] + ' ' + (+a[2]); }
  function ord(n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]); }
  function surname(n) { var p = String(n).split(' '); return p[p.length - 1]; }
  var NOW = Date.now();

  // ------------------------------------------------------------------ names and matching
  function norm(t) {
    return String(t || '').toLowerCase().replace(/[☆★]/g, ' ').replace(/[^a-z0-9぀-ヿ一-鿿 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function plain(n) { return String(n || '').replace(/\s*\(.*$/, '').trim(); }
  function aliases(name) {
    var a = [plain(name)].concat((D && D.alias && D.alias[plain(name)]) || []);
    return a.map(norm).filter(Boolean);
  }
  function hasAny(nt, list) { for (var i = 0; i < list.length; i++) if (nt.indexOf(list[i]) >= 0) return list[i]; return ''; }
  function clean(t) {
    return String(t || '').replace(/月額見放題/g, '').replace(/Unlimited viewing for a monthly fee/gi, '')
      .replace(/Monthly subscription available/gi, '').replace(/Monthly subscription/gi, '')
      .replace(/(Registration date|登録日)\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '')
      .replace(/(Viewing date|視聴日時|視聴日)\s*[:：]?\s*[0-9.\/\- :]*/gi, '')
      .replace(/\s+/g, ' ').trim();
  }
  function regDate(txt) {
    var m = /(Registration date|登録日)\s*[:：]?\s*(\d{4})[\/\.\-](\d{2})[\/\.\-](\d{2})/i.exec(txt || '');
    return m ? m[2] + '-' + m[3] + '-' + m[4] : '';
  }

  // ------------------------------------------------------------------ reigns
  var R = [], SEG = [], TOTAL = 1;
  if (D && D.reigns) {
    R = D.reigns;
    R.forEach(function(r) {
      r.ms = ms(r.won); r.endMs = r.end ? ms(r.end) : NOW;
      r.days = Math.max(1, Math.round((r.endMs - r.ms) / 86400000));
      r.cur = !r.end;
    });
    R.forEach(function(r, i) {
      var prev = R[i - 1];
      if (prev && prev.endMs < r.ms) SEG.push({ gap: true, days: Math.round((r.ms - prev.endMs) / 86400000) });
      SEG.push({ i: i, days: r.days });
    });
    SEG.forEach(function(s) { TOTAL += s.days; });
  }

  function eventsOf(r) {
    var ev = [{ kind: 'win', d: r.won, opp: plain(r.vs), venue: r.venue, note: '', n: 0 }];
    r.defences.forEach(function(x, k) { ev.push({ kind: 'def', d: x.d, opp: plain(x.opp), venue: x.venue || '', note: x.note || '', n: k + 1 }); });
    return ev;
  }

  // ------------------------------------------------------------------ video lookups (one search per reign, kept on the device)
  function readCache() { try { return JSON.parse(lsGet(CACHE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeCache(key, v) {
    var all = readCache();
    all[key] = v;
    var keys = Object.keys(all);
    if (keys.length > 14) {
      keys.sort(function(a, b) { return all[a].t - all[b].t; });
      for (var i = 0; i < keys.length - 14; i++) delete all[keys[i]];
    }
    lsSet(CACHE_KEY, JSON.stringify(all));
  }
  function blockedFor() {
    var until = parseInt(lsGet(BLOCK_KEY) || '0', 10) || 0;
    return until > Date.now() ? Math.ceil((until - Date.now()) / 60000) : 0;
  }
  function parseCards(doc) {
    var scope = doc.querySelector('.content-list, [class*="content-list"]') || doc;
    var nodes = scope.querySelectorAll('.content-list-item, article');
    var out = [], seen = {};
    Array.prototype.forEach.call(nodes, function(item) {
      if (item.closest && item.closest('.slick-cloned')) return;
      var link = item.querySelector('a[href*="/contents/"], a[href*="/set/"]');
      if (!link) return;
      var href = absUrl(link.getAttribute('href') || '');
      if (!href || seen[href]) return;
      seen[href] = true;
      var bg = '';
      var th = item.querySelector('[style*="background-image"]');
      if (th) {
        var m = (th.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/);
        if (m && m[1]) bg = m[1];
      }
      if (!bg) {
        var img = item.querySelector('img');
        if (img) bg = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || img.getAttribute('src') || '';
      }
      if (bg.indexOf('data:') === 0) bg = '';
      if (bg) bg = absUrl(bg);
      var tEl = item.querySelector('h3, h4, .ttl-xs, .content-title, .content-info-box');
      var raw = tEl ? tEl.textContent : item.textContent;
      out.push({ h: href, t: clean(raw) || 'Stardom World Video', b: bg, r: regDate(item.textContent) });
    });
    return out;
  }
  function hasNext(doc) { return !!doc.querySelector('a[rel="next"], .pagination a.next, .pagination .next a, li.next a'); }

  var busy = false, lastReq = 0, token = 0;
  var dbg = {};   // per reign: lines shown at the bottom of the page

  function queryFor(r) { return plain(r.champ) + ' ' + (D.search || 'World of Stardom'); }
  function fetchPage(q, page, cb) {
    var url = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(q) + (page > 1 ? '&page=' + page : '');
    fetch(url, { credentials: 'include' }).then(function(res) {
      if (res.status === 429 || res.status === 403 || res.status === 503) { lsSet(BLOCK_KEY, String(Date.now() + 10 * 60000)); throw 'blocked (HTTP ' + res.status + ')'; }
      if (!res.ok) throw 'HTTP ' + res.status;
      if (res.redirected && /login|sign_in|signin/.test(res.url)) throw 'login needed';
      return res.text();
    }).then(function(html) {
      var items = parseCards(new DOMParser().parseFromString(html, 'text/html'));
      var more = hasNext(new DOMParser().parseFromString(html, 'text/html')) || items.length >= 12;
      cb('', items, more);
    }).catch(function(err) { cb(typeof err === 'string' ? err : 'error ' + err); });
  }

  // Loads up to MAX_PAGES result pages for reign i (the saved copy first). done(items, note)
  function loadReign(i, tk, done) {
    var r = R[i], q = queryFor(r), d = (dbg[i] = dbg[i] || []);
    d.length = 0;
    d.push('search: ' + q);
    var c = readCache()[q], ttl = r.cur ? 3 * 3600000 : 14 * 86400000;
    if (c && c.items && c.items.length && Date.now() - c.t < ttl) {
      d.push('saved copy from ' + Math.round((Date.now() - c.t) / 60000) + ' min ago, ' + c.items.length + ' cards, ' + c.pages + ' page(s), no request');
      done(c.items, ''); return;
    }
    var wait = blockedFor();
    if (wait) { d.push('site asked for a pause: ' + wait + ' min left, no request'); done([], 'blocked'); return; }
    var items = [], seen = {}, page = 0;
    function next() {
      if (tk !== token) return;
      if (page >= MAX_PAGES) { finish(''); return; }
      var gap = lastReq + GAP_MS - Date.now();
      if (gap > 0) { setTimeout(next, gap); return; }
      page++; lastReq = Date.now(); busy = true;
      fetchPage(q, page, function(err, got, more) {
        busy = false;
        if (tk !== token) return;
        if (err) { d.push('page ' + page + ': ' + err); finish(err); return; }
        var add = 0;
        got.forEach(function(it) { if (!seen[it.h]) { seen[it.h] = 1; items.push(it); add++; } });
        d.push('page ' + page + ': ' + got.length + ' cards, ' + add + ' new, more=' + (more ? 'yes' : 'no'));
        if (!more || !add) { finish(''); return; }
        if (matchAll(r, items).left === 0) { d.push('every event has a video, stopped after page ' + page); finish(''); return; }
        next();
      });
    }
    function finish(err) {
      if (items.length && !err) writeCache(q, { t: Date.now(), pages: page, items: items.slice(0, 60) });
      done(items, err);
    }
    next();
  }

  // Match the cards to the title win and the defences of reign r.
  function matchAll(r, items) {
    var ev = eventsOf(r), cand = [], rej = [];
    var champA = aliases(r.champ), titleA = (D.titlePatterns || [D.search || '']).map(norm);
    items.forEach(function(it) {
      var nt = norm(it.t);
      if (!hasAny(nt, champA)) { rej.push([it, 'champion not in title']); return; }
      if (!hasAny(nt, titleA)) { rej.push([it, 'title name not in title']); return; }
      cand.push(it);
    });
    var byOpp = {};
    ev.forEach(function(e, k) { e.match = null; e.how = ''; var key = norm(plain(e.opp)); (byOpp[key] = byOpp[key] || { events: [], vids: [], a: aliases(e.opp) }).events.push(e); });
    var used = {};
    cand.forEach(function(it, pos) {
      var nt = norm(it.t), hit = null;
      Object.keys(byOpp).forEach(function(k) { if (!hit && hasAny(nt, byOpp[k].a)) hit = byOpp[k]; });
      if (hit) { it.pos = pos; hit.vids.push(it); used[it.h] = 1; } else rej.push([it, 'no challenger from this reign in title']);
    });
    Object.keys(byOpp).forEach(function(k) {
      var g = byOpp[k], evs = g.events.slice().sort(function(a, b) { return ms(a.d) - ms(b.d); });
      var vids = g.vids.slice();
      if (!vids.length) return;
      var dated = vids.every(function(v) { return !!v.r; });
      if (evs.length === 1) {
        // one fight against this challenger: the video closest in date wins when there are several
        var best = vids[0];
        if (dated) vids.forEach(function(v) { if (Math.abs(ms(v.r) - ms(evs[0].d)) < Math.abs(ms(best.r) - ms(evs[0].d))) best = v; });
        evs[0].match = best; evs[0].how = 'challenger' + (vids.length > 1 ? ' (' + vids.length + ' videos, ' + (dated ? 'closest upload date' : 'first listed') + ')' : '');
        vids.forEach(function(v) { if (v !== best) { v.extra = true; } });
      } else if (dated) {
        evs.forEach(function(e) {
          var best = null;
          vids.forEach(function(v) { if (!v.taken && ms(v.r) >= ms(e.d) - 86400000 && (!best || ms(v.r) < ms(best.r))) best = v; });
          if (best) { best.taken = true; e.match = best; e.how = 'challenger + first upload on or after the match date'; }
        });
      } else {
        // several fights against the same challenger and no dates: pair them up in list order (newest first)
        var vs = vids.slice(0, evs.length), es = evs.slice().reverse();
        vs.forEach(function(v, k) { es[k].match = v; es[k].how = 'challenger, list order (unsure which fight)'; });
      }
    });
    var left = 0;
    ev.forEach(function(e) { if (!e.match) left++; });
    var taken = {};
    ev.forEach(function(e) { if (e.match) taken[e.match.h] = 1; });
    var extra = cand.filter(function(it) { return !taken[it.h]; });
    return { events: ev, left: left, extra: extra, rejected: rej, cand: cand };
  }

  // ------------------------------------------------------------------ page
  var css = document.createElement('style');
  css.textContent = [
    '#tv-ln{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B1118;color:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-ln, #tv-ln *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;box-sizing:border-box;}',
    '#tv-ln-title{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:22px 24px 8px 30px;font-size:30px;font-weight:900;}',
    '#tv-ln-title .bar{flex:0 0 auto;width:10px;height:36px;background:#F4C242;}',
    '#tv-ln-hint{margin-left:auto;font-size:16px;font-weight:600;color:#9AA6B4;text-align:right;}',
    '#tv-ln-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 24px 60px 24px;scroll-padding:24px 0 40px 0;scrollbar-width:none;}',
    '#tv-ln-scroll::-webkit-scrollbar{display:none;}',
    '#tv-ln-in{max-width:1440px;margin:0 auto;}',
    '#tv-ln a, #tv-ln a:visited, #tv-ln a:hover, #tv-ln a *{opacity:1 !important;filter:none !important;mix-blend-mode:normal !important;text-decoration:none !important;color:inherit;}',
    '#tv-ln a::before, #tv-ln a::after{content:none !important;display:none !important;}',
    '#tv-ln *:focus{outline:none !important;box-shadow:none !important;transform:none !important;}',
    '.ln-h{display:flex;align-items:baseline;gap:12px;margin:18px 0 8px 2px;font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '.ln-h span{font-size:15px;color:#9AA6B4;letter-spacing:0;font-weight:700;}',
    '.ln-hero{display:flex;gap:40px;align-items:center;padding:10px 6px 6px 6px;}',
    '.ln-belt{flex:0 0 440px;width:440px;display:flex;align-items:center;justify-content:center;}',
    '.ln-belt img{width:440px;max-height:240px;object-fit:contain;filter:drop-shadow(0 12px 24px rgba(0,0,0,.7));}',
    '.ln-plate{width:300px;height:200px;border-radius:14px;background:#0F151C;border:3px solid #2A323C;display:flex;align-items:center;justify-content:center;}',
    '.ln-hx{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:12px;}',
    '.ln-eb{font-size:13px;font-weight:800;letter-spacing:1px;color:#9AA6B4;text-transform:uppercase;}',
    '.ln-cur{background:#121922;border:3px solid #2A323C;border-radius:14px;padding:18px 24px;display:flex;flex-direction:column;gap:6px;}',
    '.ln-cur .k{font-size:13px;font-weight:800;letter-spacing:1px;color:#F4C242;text-transform:uppercase;}',
    '.ln-cur .n{font-size:26px;font-weight:900;line-height:1.1;}',
    '.ln-cur .s{font-size:16px;color:#C9D2DC;}',
    '.ln-sum{font-size:15px;color:#9AA6B4;}',
    '.ln-btn{align-self:flex-start;display:inline-block;padding:8px 16px;border-radius:8px;background:#161F2A;border:2px solid #2A323C;font-size:17px;font-weight:600;color:#C9D2DC;cursor:pointer;}',
    '#tv-ln .ln-btn:focus{background:#172029;border-color:#F4C242;color:#fff;font-weight:700;}',
    '.ln-strip{display:flex;height:64px;margin:0 2px;}',
    '.ln-b{flex:1 1 0;min-width:9px;box-sizing:border-box;border-right:2px solid #0B1118;background:#2A323C;color:#C9D2DC;font-size:12px;font-weight:700;display:flex;align-items:flex-end;padding:0 6px 6px 6px;overflow:hidden;white-space:nowrap;cursor:pointer;}',
    '.ln-b.cur{background:#3B4656;}',
    '.ln-b.gap{flex:1 1 0;cursor:default;background:transparent;background-image:repeating-linear-gradient(135deg,#2A323C 0,#2A323C 2px,transparent 2px,transparent 6px);}',
    '#tv-ln .ln-b.sel, #tv-ln .ln-b:focus{background:#FFB347;border-right-color:#FFB347;color:#1A1A1A;}',
    '.ln-ticks{position:relative;height:22px;margin:6px 2px 0 2px;}',
    '.ln-tick{position:absolute;top:0;font-size:12px;font-weight:700;color:#9AA6B4;border-left:1px solid #3B4656;padding-left:5px;height:22px;}',
    '.ln-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;padding:6px;}',
    '.ln-c{display:block;position:relative;min-width:0;border-radius:8px;background:#1a1a1a;overflow:hidden;border:3px solid transparent;cursor:pointer;}',
    '#tv-ln .ln-c:focus{outline:3px solid #F4C242 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(244,194,66,.8) !important;transform:scale(1.03) !important;position:relative;z-index:5;}',
    '.ln-c.off{cursor:default;}',
    '.ln-im{position:relative;width:100%;aspect-ratio:16/9;background:#172029 center/cover no-repeat;display:flex;align-items:center;justify-content:center;border-radius:5px 5px 0 0;color:#9AA6B4;font-size:15px;font-weight:700;}',
    '.ln-im.ppv{background-color:#1C1740;}',
    '.ln-im.win{background-color:#2A1C10;}',
    '.ln-bd{position:absolute;right:8px;top:8px;padding:4px 10px;border-radius:4px;background:rgba(0,0,0,.8);color:#F4C242;font-size:15px;font-weight:800;}',
    '.ln-tg{position:absolute;left:8px;top:8px;padding:4px 9px;border-radius:4px;background:#FFB347;color:#1A1A1A;font-size:12px;font-weight:800;letter-spacing:1px;}',
    '.ln-tg.ppv{background:#7B5CFF;color:#fff;}',
    '.ln-tt{padding:10px 12px 4px 12px;font-size:15px;font-weight:700;line-height:1.3;color:#fff;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}',
    '.ln-c.off .ln-tt{color:#9AA6B4;}',
    '.ln-sub{padding:0 12px 12px 12px;font-size:13px;font-weight:700;line-height:1.35;color:#9AA6B4;}',
    '.ln-note{padding:14px 6px;font-size:16px;color:#9AA6B4;}',
    '.ln-dbg{margin:28px 6px 0 6px;padding:14px 18px;border-radius:12px;background:#0F151C;border:2px solid #2A323C;font-size:13px;line-height:1.5;color:#9AA6B4;white-space:pre-wrap;word-break:break-all !important;overflow-wrap:anywhere !important;}',
    '.ln-dbg b{color:#F4C242;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  var root = document.createElement('div');
  root.id = 'tv-ln';
  root.className = 'notranslate';
  root.setAttribute('translate', 'no');
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';

  var STAR = '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#F4C242" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';
  var PLAY = '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';
  var sel = R.length - 1, searching = false, errNote = '', result = null, timer = 0;

  function heroHtml() {
    var cur = R[R.length - 1], belt = '';
    try { belt = H.beltDataUri ? H.beltDataUri(P) : ''; } catch (e) { belt = ''; }
    var longest = R[0];
    R.forEach(function(r) { if (r.days > longest.days) longest = r; });
    var years = Math.floor((NOW - ms(D.since)) / (365.25 * 86400000));
    var pic = belt ? '<img src="' + belt + '" alt="">' : '<div class="ln-plate">' + STAR + '</div>';
    var curLine = cur.cur
      ? '<div class="ln-cur"><div class="k">' + esc(T('Current champion', '現王者')) + ' · ' + esc(T(ord(cur.n) + ' reign', '第' + cur.n + '代')) + '</div><div class="n">' + esc(cur.champ) + '</div><div class="s">' +
        esc(T(cur.days + ' days · ' + cur.defences.length + (cur.defences.length === 1 ? ' defence' : ' defences') + ' · won ' + fmtD(cur.won) + ' vs ' + plain(cur.vs), cur.days + '日 · 防衛' + cur.defences.length + '回 · ' + fmtD(cur.won) + ' 獲得')) + '</div></div>'
      : '<div class="ln-cur"><div class="k">' + esc(T('Vacant', '空位')) + '</div></div>';
    return '<div class="ln-hero"><div class="ln-belt">' + pic + '</div><div class="ln-hx"><div class="ln-eb">' +
      esc(T('Stardom · ' + (D.kind || 'Singles') + ' · since ' + fmtD(D.since), 'スターダム · ' + fmtD(D.since) + '〜')) + '</div>' + curLine +
      '<div class="ln-sum">' + esc(T(R.length + ' reigns · ' + years + ' years · longest reign ' + longest.days + ' days (' + longest.champ + ')', R.length + '代 · ' + years + '年 · 最長 ' + longest.days + '日 (' + longest.champ + ')')) + '</div>' +
      '<a class="ln-btn" tabindex="0" data-k="a" href="' + esc(absUrl(D.path || ('/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(D.search || '')))) + '">' + esc(T('All videos ›', 'すべての動画 ›')) + '</a>' +
      '</div></div>';
  }

  function stripHtml() {
    var h = '<div class="ln-strip">';
    var avail = 1380;
    SEG.forEach(function(s) {
      if (s.gap) { h += '<div class="ln-b gap" style="flex-grow:' + s.days + '"></div>'; return; }
      var r = R[s.i], w = s.days / TOTAL * avail, lab = w >= 46 && surname(r.champ).length * 7.5 + 12 <= w ? esc(surname(r.champ)) : '';
      h += '<div class="ln-b' + (s.i === sel ? ' sel' : '') + (r.cur ? ' cur' : '') + '" tabindex="0" data-k="r" data-i="' + s.i + '" style="flex-grow:' + s.days + '">' + lab + '</div>';
    });
    h += '</div><div class="ln-ticks">';
    var y0 = new Date(ms(R[0].won)).getUTCFullYear(), y1 = new Date(NOW).getUTCFullYear(), t0 = ms(R[0].won);
    for (var y = y0 + 1; y <= y1; y++) {
      var left = (Date.UTC(y, 0, 1) - t0) / 86400000 / TOTAL * 100;
      h += '<div class="ln-tick" style="left:' + left.toFixed(2) + '%">' + y + '</div>';
    }
    return h + '</div>';
  }

  function cardHtml(e, idx, r) {
    var m = e.match, ppv = /PPV/i.test(e.note), win = e.kind === 'win';
    var vs = plain(r.champ) + ' vs ' + e.opp;
    var sub = fmtD(e.d) + (win ? '' : ' · ' + T('Defence ' + e.n, '防衛' + e.n)) + (e.venue ? ' · ' + e.venue : '');
    var tag = win ? '<span class="ln-tg">' + esc(T('TITLE WIN', '王座奪取')) + '</span>' : (ppv ? '<span class="ln-tg ppv">PPV</span>' : '');
    var im = '<div class="ln-im' + (m ? '' : '') + (ppv ? ' ppv' : (win ? ' win' : '')) + '"' + (m && m.b ? ' style="background-image:url(' + esc(m.b) + ')"' : '') + '>' + tag +
      '<span class="ln-bd">' + esc(fmtMD(e.d)) + '</span>' + (m ? PLAY : (searching ? esc(T('Looking for the video...', '動画を検索中...')) : esc(T('No video found', '動画が見つかりません')))) + '</div>';
    if (m) return '<a class="ln-c" tabindex="0" data-k="c" data-e="' + idx + '" href="' + esc(m.h) + '">' + im + '<div class="ln-tt">' + esc(m.t) + '</div><div class="ln-sub">' + esc(sub) + '</div></a>';
    return '<div class="ln-c off" data-e="' + idx + '">' + im + '<div class="ln-tt">' + esc(vs) + '</div><div class="ln-sub">' + esc(sub) + '</div></div>';
  }

  function detailHtml() {
    var r = R[sel], ev = result && result.events ? result.events : eventsOf(r), found = 0;
    ev.forEach(function(e) { if (e.match) found++; });
    var span = r.defences.length
      ? T('the title win, then ' + r.defences.length + (r.defences.length === 1 ? ' defence' : ' defences'), '王座奪取と防衛' + r.defences.length + '回')
      : T('the title win, no defences', '王座奪取のみ（防衛なし）');
    var vid = searching ? T('looking for videos', '動画を検索中') : (result ? found + T(' of ' + ev.length + ' have a video', '/' + ev.length + '件に動画あり') : '');
    var head = '<div class="ln-h">' + esc(T('REIGN ' + r.n + ' · ' + String(r.champ).toUpperCase(), '第' + r.n + '代 · ' + r.champ)) + '<span>' + esc(span + (vid ? ' · ' + vid : '')) + '</span></div>';
    var cards = '<div class="ln-grid">' + ev.map(function(e, k) { return cardHtml(e, k, r); }).join('') + '</div>';
    var more = '';
    if (result && result.extra && result.extra.length) {
      more = '<div class="ln-h">' + esc(T('MORE FROM THIS REIGN', 'この王者期間のその他')) + '<span>' + esc(T('same champion and title, not tied to a listed match', '')) + '</span></div><div class="ln-grid">' +
        result.extra.slice(0, 8).map(function(it) {
          return '<a class="ln-c" tabindex="0" data-k="c" href="' + esc(it.h) + '"><div class="ln-im"' + (it.b ? ' style="background-image:url(' + esc(it.b) + ')"' : '') + '>' + PLAY + '</div><div class="ln-tt">' + esc(it.t) + '</div><div class="ln-sub"></div></a>';
        }).join('') + '</div>';
    }
    var note = errNote ? '<div class="ln-note">' + esc(errNote) + '</div>' : '';
    return head + cards + more + note;
  }

  function debugHtml() {
    var r = R[sel], lines = (dbg[sel] || []).slice();
    if (result) {
      result.events.forEach(function(e) {
        lines.push((e.kind === 'win' ? 'WIN      ' : 'DEF ' + (e.n < 10 ? ' ' : '') + e.n + '   ') + e.d + ' vs ' + e.opp + ' -> ' + (e.match ? 'matched (' + e.how + '): ' + e.match.t + ' [' + e.match.h.replace(/^https?:\/\/[^\/]+/, '') + (e.match.r ? ', registered ' + e.match.r : '') + ']' : 'NO VIDEO'));
      });
      lines.push('cards that fit champion and title: ' + result.cand.length + ', not tied to a match: ' + result.extra.length);
      result.rejected.slice(0, 14).forEach(function(x) { lines.push('skipped: ' + x[0].t + ' (' + x[1] + ')'); });
      if (result.rejected.length > 14) lines.push('... and ' + (result.rejected.length - 14) + ' more skipped');
    }
    return '<div class="ln-dbg"><b>MATCHING DEBUG</b> · reign ' + r.n + ' · ' + esc(r.champ) + '\n' + esc(lines.join('\n')) + '</div>';
  }

  function render(focusTarget) {
    if (!D || !R.length) {
      root.innerHTML = '<div id="tv-ln-title"><span class="bar"></span><span>' + esc(T('Championship', '王座')) + '</span></div><div id="tv-ln-scroll"><div id="tv-ln-in"><div class="ln-note">' + esc(T('No lineage is stored for this title yet.', 'この王座の歴史はまだありません。')) + '</div></div></div>';
      return;
    }
    var prev = document.activeElement, pk = prev && prev.getAttribute ? prev.getAttribute('data-k') : '', pe = prev && prev.getAttribute ? prev.getAttribute('data-e') : '';
    var sc = root.querySelector('#tv-ln-scroll'), top = sc ? sc.scrollTop : 0;
    root.innerHTML = '<div id="tv-ln-title"><span class="bar"></span><span>' + esc(T(D.title, D.ja || D.title)) + '</span><span id="tv-ln-hint"></span></div>' +
      '<div id="tv-ln-scroll"><div id="tv-ln-in">' + heroHtml() +
      '<div class="ln-h">' + esc(T('LINEAGE', '歴代王者')) + '<span>' + esc(T(R.length + ' reigns, width = days held. Left and Right move reign to reign, Down shows its videos', R.length + '代・幅は保持日数。左右で王者を切り替え')) + '</span></div>' +
      stripHtml() + '<div id="ln-detail">' + detailHtml() + '</div><div id="ln-dbgbox">' + debugHtml() + '</div></div></div>';
    sc = root.querySelector('#tv-ln-scroll');
    if (sc) sc.scrollTop = top;
    var t = null;
    if (focusTarget === 'sel') t = root.querySelector('.ln-b[data-i="' + sel + '"]');
    else if (pk === 'r') t = root.querySelector('.ln-b[data-i="' + sel + '"]');
    else if (pk === 'c' && pe !== null && pe !== '') t = root.querySelector('.ln-c[data-e="' + pe + '"][tabindex]') || root.querySelector('.ln-c[tabindex]');
    else if (pk === 'c') t = root.querySelector('.ln-c[tabindex]');
    else if (pk === 'a') t = root.querySelector('.ln-btn');
    if (t) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
    hint();
  }
  // Only the video area and the debug block change while a reign's videos load; the strip and hero stay put.
  function renderDetail() {
    var d = document.getElementById('ln-detail'), g = document.getElementById('ln-dbgbox');
    if (!d || !g) { render(); return; }
    var prev = document.activeElement, pk = prev && prev.getAttribute ? prev.getAttribute('data-k') : '', pe = prev && prev.getAttribute ? prev.getAttribute('data-e') : '';
    d.innerHTML = detailHtml(); g.innerHTML = debugHtml();
    if (pk === 'c' && !root.contains(document.activeElement)) {
      var t = (pe !== null && pe !== '' && root.querySelector('.ln-c[data-e="' + pe + '"][tabindex]')) || root.querySelector('.ln-c[tabindex]');
      if (t) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
    }
  }
  function hint() {
    var el = document.getElementById('tv-ln-hint'), ae = document.activeElement, k = ae && ae.getAttribute ? ae.getAttribute('data-k') : '';
    if (!el) return;
    el.textContent = k === 'r' ? T('Left / Right: reign · Down: videos', '左右：王者 · 下：動画') : (k === 'c' ? T('OK: play the match', 'OK：再生') : '');
  }

  function choose(i, now) {
    if (i === sel && result) return;
    sel = i; result = null; errNote = '';
    token++;
    clearTimeout(timer);
    searching = true;
    // restyle the strip and show the events at once; the search starts once the choice settles
    Array.prototype.forEach.call(root.querySelectorAll('.ln-b'), function(b) { b.classList.toggle('sel', +b.getAttribute('data-i') === sel); });
    renderDetail();
    var tk = token;
    timer = setTimeout(function() {
      loadReign(sel, tk, function(items, err) {
        if (tk !== token) return;
        searching = false;
        if (err && !items.length) errNote = err === 'blocked' ? T('The site asked for a pause. Try again in a few minutes.', 'サイトから一時停止の要請がありました。数分後にお試しください。') : T('Could not load videos (' + err + ').', '動画を読み込めませんでした。');
        result = matchAll(R[sel], items);
        var lines = (dbg[sel] = dbg[sel] || []);
        if (err) lines.push('error: ' + err);
        renderDetail();
      });
    }, now ? 0 : 650);
  }

  // ------------------------------------------------------------------ keys
  function focusables() { return Array.prototype.slice.call(root.querySelectorAll('[tabindex="0"][data-k]')); }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
    hint();
  }
  function selBar() { return root.querySelector('.ln-b[data-i="' + sel + '"]'); }
  function move(dir) {
    var list = focusables(), cur = document.activeElement;
    if (list.indexOf(cur) < 0) { focusEl(list[0]); return true; }
    if (cur.getAttribute('data-k') === 'r' && (dir === 'left' || dir === 'right')) {
      var i = +cur.getAttribute('data-i') + (dir === 'right' ? 1 : -1);
      if (i < 0) return false;
      if (i >= R.length) return true;
      var b = root.querySelector('.ln-b[data-i="' + i + '"]');
      if (b) { focusEl(b); choose(i, false); }
      return true;
    }
    var cr = cur.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2, cand = [];
    list.forEach(function(it) {
      if (it === cur) return;
      var r = it.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      var same = Math.abs(dy) < Math.max(cr.height, r.height) * 0.5;
      if (dir === 'left' && same && dx < -4) cand.push({ it: it, s: -dx });
      else if (dir === 'right' && same && dx > 4) cand.push({ it: it, s: dx });
      else if (dir === 'up' && dy < -4 && !same) cand.push({ it: it, s: -dy * 1000 + Math.abs(dx) });
      else if (dir === 'down' && dy > 4 && !same) cand.push({ it: it, s: dy * 1000 + Math.abs(dx) });
    });
    if (!cand.length) return false;
    cand.sort(function(a, b) { return a.s - b.s; });
    var t = cand[0].it;
    if (t.getAttribute('data-k') === 'r') t = selBar() || t;   // entering the strip lands on the chosen reign
    focusEl(t);
    return true;
  }
  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-ln') || menuOpen()) return;
    var k = e.keyCode, ae = document.activeElement;
    function stop() { e.preventDefault(); e.stopImmediatePropagation(); }
    var inside = ae && root.contains(ae) && ae.getAttribute && ae.getAttribute('data-k');
    if (!inside) {
      if (k === 37 || k === 38 || k === 39 || k === 40) {
        stop();
        var f = selBar() || focusables()[0];
        if (f) focusEl(f); else if (k === 37 && window.__tvOpenMenu) window.__tvOpenMenu();
      }
      return;
    }
    if (k === 37) { stop(); if (!move('left') && window.__tvOpenMenu) window.__tvOpenMenu(); }
    else if (k === 39) { stop(); move('right'); }
    else if (k === 38) { stop(); if (!move('up')) { var sc = root.querySelector('#tv-ln-scroll'); if (sc) sc.scrollTop = 0; } }
    else if (k === 40) { stop(); move('down'); }
    else if ((k === 13 || k === 23 || k === 32) && ae.getAttribute('data-k') === 'r') { stop(); choose(+ae.getAttribute('data-i'), true); var c = root.querySelector('.ln-c[tabindex]'); if (c) focusEl(c); }
  }, true);
  root.addEventListener('click', function(e) {
    var b = e.target && e.target.closest ? e.target.closest('.ln-b[data-i]') : null;
    if (b) { e.preventDefault(); focusEl(b); choose(+b.getAttribute('data-i'), true); }
  }, true);
  document.addEventListener('focusin', function() { if (document.getElementById('tv-ln')) hint(); }, true);

  render('sel');
  if (R.length) choose(R.length - 1, true) || 0;
})();
