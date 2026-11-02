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
  // a name matches when it appears as written, or when every word of it appears (so "Suzuki Suzu" finds "Suzu Suzuki")
  function hasAll(nt, a) {
    var w = a.split(' '), pad = ' ' + nt + ' ';
    for (var i = 0; i < w.length; i++) if (pad.indexOf(' ' + w[i] + ' ') < 0) return false;
    return true;
  }
  function hasAny(nt, list) {
    var i;
    for (i = 0; i < list.length; i++) if (nt.indexOf(list[i]) >= 0) return list[i];
    for (i = 0; i < list.length; i++) if (hasAll(nt, list[i])) return list[i];
    return '';
  }
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
    SEG.reverse();   // shown newest first
  }

  function eventsOf(r) {
    var ev = r.noWin ? [] : [{ kind: 'win', d: r.won, opp: plain(r.vs), venue: r.venue, note: '', n: 0 }];
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

  // Tag and trios titles: r.champ lists the members ("A & B"), r.team is the team name shown instead.
  // defence count: r.defCount when only the number is known, else the listed defences
  function dn(r) { return r.defCount != null ? r.defCount : r.defences.length; }
  function nm(r) { return r.team || plain(r.champ); }
  function members(r) { return plain(r.champ).split(/\s*(?:&|,)\s*/).filter(Boolean); }
  function baseQuery(r) { return members(r).join(' ') + ' ' + (D.search || 'World of Stardom'); }
  // Same words as the filter bar (assets/championships.json): the championship's search word with the wrestler's name, plus its
  // other names (D.alts, e.g. "Cutest of Cute") searched once each. A team is searched by all its members first; the first
  // member alone is only tried when nothing was found.
  function queries(r) {
    var m = members(r), q = [baseQuery(r)];
    (D.alts || []).forEach(function(a) { q.push(m.join(' ') + ' ' + a); });
    return q;
  }
  function fallbackQuery(r) { var m = members(r); return m.length > 1 ? m[0] + ' ' + (D.search || 'World of Stardom') : ''; }
  // When the team search finds nothing: each member alone, then each member's other spellings (D.alias), one search each.
  function fallbackQueries(r) {
    var m = members(r), out = [], w = ' ' + (D.search || 'World of Stardom');
    if (m.length < 2) return out;
    function add(q) { if (out.indexOf(q) < 0) out.push(q); }
    m.forEach(function(n) { add(n + w); });
    m.forEach(function(n) { ((D.alias && D.alias[n]) || []).forEach(function(a) { add(a + w); }); });
    return out;
  }
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

  // One search (all its pages, saved copy first). cb(items, err)
  function loadQuery(r, q, tk, d, merged, onPart, cb) {
    var c = readCache()[q], ttl = r.cur ? 3 * 3600000 : 14 * 86400000;
    d.push('search: ' + q);
    function take(list) { var add = 0; list.forEach(function(it) { if (!merged.seen[it.h]) { merged.seen[it.h] = 1; merged.items.push(it); add++; } }); return add; }
    if (c && c.items && c.items.length && Date.now() - c.t < ttl) {
      d.push('  saved copy from ' + Math.round((Date.now() - c.t) / 60000) + ' min ago, ' + c.items.length + ' cards, ' + c.pages + ' page(s), no request');
      take(c.items); cb(''); return;
    }
    var wait = blockedFor();
    if (wait) { d.push('  site asked for a pause: ' + wait + ' min left, no request'); cb('blocked'); return; }
    var got = [], seen = {}, page = 0;
    function next() {
      if (tk !== token) return;
      if (page >= MAX_PAGES) { finish(''); return; }
      var gap = lastReq + GAP_MS - Date.now();
      if (gap > 0) { setTimeout(next, gap); return; }
      page++; lastReq = Date.now(); busy = true;
      fetchPage(q, page, function(err, list, more) {
        busy = false;
        if (tk !== token) return;
        if (err) { d.push('  page ' + page + ': ' + err); finish(err); return; }
        var add = 0;
        list.forEach(function(it) { if (!seen[it.h]) { seen[it.h] = 1; got.push(it); add++; } });
        take(list);
        d.push('  page ' + page + ': ' + list.length + ' cards, ' + add + ' new, more=' + (more ? 'yes' : 'no'));
        if (onPart) onPart();
        if (!more || !add) { finish(''); return; }
        next();
      });
    }
    function finish(err) {
      if (got.length && !err) writeCache(q, { t: Date.now(), pages: page, items: got.slice(0, 60) });
      cb(err);
    }
    next();
  }

  // Searches for reign i: one search per year of the reign, then the plain champion search for whatever is still missing.
  // part() is called as cards arrive so the page can fill in while later searches run. done(items, err)
  function loadReign(i, tk, part, done) {
    var r = R[i], d = (dbg[i] = dbg[i] || []);
    d.length = 0;
    var merged = { items: [], seen: {} }, qs = queries(r), k = 0, firstErr = '', fbs = fallbackQueries(r);
    function step() {
      if (tk !== token) return;
      if (k >= qs.length && !merged.items.length && fbs.length) { qs.push(fbs.shift()); }
      if (k >= qs.length) { done(merged.items, merged.items.length ? '' : firstErr); return; }
      var q = qs[k++];
      loadQuery(r, q, tk, d, merged, function() { if (part) part(merged.items); }, function(err) {
        if (err && !firstErr) firstErr = err;
        if (err === 'blocked' || /^blocked|login/.test(err || '')) { done(merged.items, merged.items.length ? '' : err); return; }
        if (part) part(merged.items);
        step();
      });
    }
    step();
  }

  // Date a card was fought on: written in the title ("(2026/06/20)" or "2026/06/30 ..."), otherwise the upload date.
  function cardDate(it) {
    var m = /(\d{4})[\/.\-](\d{2})[\/.\-](\d{2})/.exec(it.t || '');
    if (m) return { d: m[1] + '-' + m[2] + '-' + m[3], src: 'title' };
    if (it.r) return { d: it.r, src: 'upload' };
    return null;
  }
  function cardId(it) { var m = /\/contents\/(\d+)/.exec(it.h || ''); return m ? +m[1] : 0; }
  // Video numbers grow with time, so a card with no date can be placed between two dated cards with numbers either side of its own.
  function calibration(items) {
    var pts = [];
    items.forEach(function(it) { var d = cardDate(it), id = cardId(it); if (d && id && d.src === 'title' && !/English commentary|【ENG】|\[ENG\]/i.test(it.t)) pts.push({ id: id, t: ms(d.d) }); });
    pts.sort(function(a, b) { return a.id - b.id; });
    return pts;
  }
  function estimate(it, cal) {
    var id = cardId(it);
    if (!id || cal.length < 2) return null;
    for (var i = 1; i < cal.length; i++) {
      if (id >= cal[i - 1].id && id <= cal[i].id) {
        var a = cal[i - 1], b = cal[i], f = b.id === a.id ? 0 : (id - a.id) / (b.id - a.id);
        return new Date(a.t + f * (b.t - a.t)).toISOString().slice(0, 10);
      }
    }
    return null;
  }
  var DAY = 86400000;

  // Loosest match: the search already names the champion, so every card for the championship is a match
  // for that champion. Cards dated inside the reign are marked and listed first.
  function matchAll(r, items) {
    var titleA = (D.titlePatterns || [D.search || '']).map(norm), cal = calibration(items), rows = [], rej = [];
    var from = r.ms - DAY, to = (r.cur ? NOW : r.endMs) + DAY;
    items.forEach(function(it) {
      var nt = norm(it.t);
      if (!hasAny(nt, titleA)) { rej.push([it, 'championship not in title']); return; }
      var cd = cardDate(it), src = '', d = '';
      if (cd) { d = cd.d; src = cd.src; }
      else { var es = estimate(it, cal); if (es) { d = es; src = 'estimated'; } }
      it.cd = d; it.cdSrc = src; it.inReign = !!d && ms(d) >= from - (src === 'estimated' ? 14 * DAY : 0) && ms(d) <= to + (src === 'estimated' ? 14 * DAY : 0);
      it.sortT = d ? ms(d) : -1;
      rows.push(it);
    });
    rows.sort(function(a, b) {
      if (a.inReign !== b.inReign) return a.inReign ? -1 : 1;
      if (a.sortT !== b.sortT) return b.sortT - a.sortT;
      return cardId(b) - cardId(a);
    });
    var inN = 0;
    rows.forEach(function(it) { if (it.inReign) inN++; });
    return { rows: rows, inN: inN, rejected: rej, total: items.length, sample: items.slice(0, 6).map(function(x) { return x.t; }) };
  }

  // ------------------------------------------------------------------ page
  var css = document.createElement('style');
  css.textContent = [
    '#tv-ln{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B1118;color:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-ln, #tv-ln *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;box-sizing:border-box;}',
    '#tv-ln-title{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:14px 24px 4px 30px;font-size:30px;font-weight:900;}',
    '#tv-ln-title .bar{flex:0 0 auto;width:10px;height:36px;background:#F4C242;}',
    '#tv-ln-hint{margin-left:auto;font-size:16px;font-weight:600;color:#9AA6B4;text-align:right;}',
    '#tv-ln-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 24px 60px 24px;scroll-padding:24px 0 40px 0;scrollbar-width:none;}',
    '#tv-ln-scroll::-webkit-scrollbar{display:none;}',
    '#tv-ln-in{max-width:1440px;margin:0 auto;}',
    '#tv-ln a, #tv-ln a:visited, #tv-ln a:hover, #tv-ln a *{opacity:1 !important;filter:none !important;mix-blend-mode:normal !important;text-decoration:none !important;color:inherit;}',
    '#tv-ln a::before, #tv-ln a::after{content:none !important;display:none !important;}',
    '#tv-ln *:focus{outline:none !important;box-shadow:none !important;transform:none !important;}',
    '.ln-h{display:flex;align-items:baseline;gap:12px;margin:14px 0 8px 2px;font-size:15px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '.ln-h span{font-size:15px;color:#9AA6B4;letter-spacing:0;font-weight:700;}',
    '.ln-hero{display:flex;gap:40px;align-items:center;padding:0 6px 0 6px;}',
    '.ln-belt{flex:0 0 400px;width:400px;display:flex;align-items:center;justify-content:center;}',
    '.ln-belt img{width:400px;max-height:190px;object-fit:contain;filter:drop-shadow(0 12px 24px rgba(0,0,0,.7));}',
    '.ln-plate{width:300px;height:170px;border-radius:14px;background:#0F151C;border:3px solid #2A323C;display:flex;align-items:center;justify-content:center;}',
    '.ln-hx{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:10px;}',
    '.ln-eb{font-size:13px;font-weight:800;letter-spacing:1px;color:#9AA6B4;text-transform:uppercase;}',
    '.ln-cur{min-height:132px;background:#121922;border:3px solid #2A323C;border-radius:14px;padding:12px 24px;display:flex;flex-direction:column;gap:4px;}',
    '.ln-cur .k{font-size:13px;font-weight:800;letter-spacing:1px;color:#F4C242;text-transform:uppercase;}',
    '.ln-cur .n{font-size:26px;font-weight:900;line-height:1.1;}',
    '.ln-cur .s{font-size:16px;color:#C9D2DC;}',
    '.ln-sum{font-size:15px;color:#9AA6B4;}',
    '.ln-btn{align-self:stretch;display:block;text-align:center;padding:9px 16px;border-radius:8px;background:#161F2A;border:2px solid #2A323C;font-size:17px;font-weight:600;color:#C9D2DC;cursor:pointer;}',
    '#tv-ln .ln-btn:focus{background:#172029;border-color:#F4C242;color:#fff;font-weight:700;}',
    '.ln-strip{display:flex;height:64px;margin:0 2px;}',
    '.ln-b{flex:1 1 0;min-width:9px;box-sizing:border-box;border-right:2px solid #0B1118;background:#2A323C;color:#C9D2DC;font-size:12px;font-weight:700;display:flex;align-items:flex-end;padding:0 6px 6px 6px;overflow:hidden;white-space:nowrap;cursor:pointer;}',
    '.ln-b.cur{background:#3B4656;}',
    '.ln-b.gap{flex:1 1 0;cursor:default;background:transparent;background-image:repeating-linear-gradient(135deg,#2A323C 0,#2A323C 2px,transparent 2px,transparent 6px);}',
    '#tv-ln .ln-b.sel, #tv-ln .ln-b:focus{background:#FFB347;border-right-color:#FFB347;color:#1A1A1A;}',
    '.ln-ticks{position:relative;height:22px;margin:8px 2px 0 2px;}',
    '.ln-tick{position:absolute;top:0;font-size:12px;font-weight:700;color:#9AA6B4;border-left:1px solid #3B4656;padding-left:5px;height:22px;}',
    '.ln-fx{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;padding:2px 6px 6px 6px;}',
    '.ln-f{display:flex;align-items:baseline;gap:12px;min-width:0;padding:10px 14px;border-radius:8px;background:#161F2A;font-size:15px;color:#C9D2DC;white-space:nowrap;overflow:hidden;}',
    '.ln-f .k{flex:0 0 auto;font-size:12px;font-weight:800;letter-spacing:1px;color:#9AA6B4;}',
    '.ln-f .k.win{color:#F4C242;}',
    '.ln-f .d{flex:0 0 auto;font-weight:700;color:#F4C242;}',
    '.ln-f .o{flex:0 0 auto;font-weight:700;color:#fff;}',
    '.ln-f .v{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#9AA6B4;}',
    '.ln-vh{display:flex;align-items:center;margin:16px 0 4px 6px;font-size:22px;font-weight:700;color:#fff;}',
    '.ln-vh .bar{flex:0 0 auto;width:8px;height:26px;background:#F4C242;margin-right:12px;}',
    '.ln-vh .n{margin-left:16px;font-size:15px;font-weight:700;color:#9AA6B4;}',
    '.ln-vr{display:flex;flex-direction:row;gap:24px;overflow-x:auto;scroll-behavior:smooth;padding:12px 10px;margin:0 -4px;scrollbar-width:none;}',
    '.ln-vr::-webkit-scrollbar{display:none;}',
    '.ln-vr .ln-c{flex:0 0 calc(25% - 18px);max-width:calc(25% - 18px);}',
    '.ln-c{display:block;position:relative;min-width:0;border-radius:8px;background:#1a1a1a;overflow:hidden;border:3px solid transparent;cursor:pointer;}',
    '#tv-ln .ln-c:focus{outline:3px solid #F4C242 !important;outline-offset:2px !important;box-shadow:0 0 16px rgba(244,194,66,.8) !important;transform:scale(1.03) !important;position:relative;z-index:5;}',
    '.ln-c.off{cursor:default;}',
    '.ln-im{position:relative;width:100%;aspect-ratio:16/9;background:#172029 center/cover no-repeat;display:flex;align-items:center;justify-content:center;border-radius:5px 5px 0 0;color:#9AA6B4;font-size:15px;font-weight:700;}',
    '.ln-im.ppv{background-color:#1C1740;}',
    '.ln-im.win{background-color:#2A1C10;}',
    '.ln-bd{position:absolute;right:8px;top:8px;padding:4px 10px;border-radius:4px;background:rgba(0,0,0,.8);color:#F4C242;font-size:15px;font-weight:800;}',
    '.ln-tg{position:absolute;left:8px;top:8px;padding:4px 9px;border-radius:4px;background:#FFB347;color:#1A1A1A;font-size:12px;font-weight:800;letter-spacing:1px;}',
    '.ln-tg.ppv{background:#7B5CFF;color:#fff;}',
    '.ln-tt{padding:12px 14px;min-height:5.8em;font-size:15px;font-weight:700;line-height:1.3;color:#fff;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}',
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
  var sel = R.length - 1, waiting = false, searching = false, errNote = '', result = null, timer = 0;

  function curBox(i) {
    var r = R[i], nx = R[i + 1], lines;
    var k = r.cur ? T('Current champion', '現王者') : T('Champion', '王者');
    var s1 = T(r.days + ' days · ' + dn(r) + (dn(r) === 1 ? ' defence' : ' defences') + (r.noWin ? ' · first match on record ' + fmtD(r.won) : ' · won ' + fmtD(r.won) + ' vs ' + plain(r.vs)), r.days + '日 · 防衛' + dn(r) + '回 · ' + fmtD(r.won) + (r.noWin ? ' 初試合' : ' 獲得'));
    var s2 = '';
    if (!r.cur && r.end) s2 = r.endType === 'vacated' ? T('Vacated ' + fmtD(r.end), fmtD(r.end) + ' 返上') : T('Lost to ' + (nx ? nm(nx) : '') + ' on ' + fmtD(r.end), fmtD(r.end) + ' 陥落');
    return '<div class="ln-cur"><div class="k">' + esc(k + ' · ' + T(ord(r.n) + ' reign', '第' + r.n + '代')) + '</div><div class="n">' + esc(r.team ? r.team + ' \u00b7 ' + plain(r.champ) : r.champ) + '</div><div class="s">' + esc(s1) + '</div>' + (s2 ? '<div class="s">' + esc(s2) + '</div>' : '') + '</div>';
  }
  function lineInfo() {
    var longest = R[0];
    R.forEach(function(r) { if (r.days > longest.days) longest = r; });
    var years = Math.floor((NOW - ms(D.since)) / (365.25 * 86400000));
    return T('Stardom · ' + (D.kind || 'Singles') + ' · Since ' + fmtD(D.since) + ' · ' + R.length + (R.length === 1 ? ' reign' : ' reigns') + (years >= 1 ? ' · ' + years + ' years' : '') + ' · longest reign ' + longest.days + ' days (' + nm(longest) + ')',
      'スターダム · ' + fmtD(D.since) + '〜 · ' + R.length + '代' + (years >= 1 ? ' · ' + years + '年' : '') + ' · 最長 ' + longest.days + '日 (' + nm(longest) + ')');
  }
  function heroHtml() {
    var cur = R[R.length - 1], belt = '';
    try { belt = H.beltDataUri ? H.beltDataUri(P) : ''; } catch (e) { belt = ''; }
    var longest = R[0];
    R.forEach(function(r) { if (r.days > longest.days) longest = r; });
    var years = Math.floor((NOW - ms(D.since)) / (365.25 * 86400000));
    var pic = belt ? '<img src="' + belt + '" alt="">' : '<div class="ln-plate">' + STAR + '</div>';
    var curLine = '<div id="ln-cur">' + curBox(sel) + '</div>';
    return '<div class="ln-hero"><div class="ln-belt">' + pic + '</div><div class="ln-hx">' + curLine +
      '<a class="ln-btn" tabindex="0" data-k="a" href="' + esc(absUrl(D.path || ('/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(D.search || '')))) + '">' + esc(T('All ' + D.title + ' matches ›', 'すべての' + (D.ja || D.title) + 'の動画 ›')) + '</a>' +
      '</div></div>';
  }

  function stripHtml() {
    var h = '<div class="ln-strip">';
    var avail = 1380;
    SEG.forEach(function(s) {
      if (s.gap) { h += '<div class="ln-b gap" style="flex-grow:' + s.days + '"></div>'; return; }
      var r = R[s.i], w = s.days / TOTAL * avail, lab = r.team ? (w >= 46 && r.team.length * 8.6 + 14 <= w ? esc(r.team) : '') : (w >= 46 && surname(r.champ).length * 7.5 + 12 <= w ? esc(surname(r.champ)) : '');
      h += '<div class="ln-b' + (s.i === sel ? ' sel' : '') + (r.cur ? ' cur' : '') + '" tabindex="0" data-k="r" data-i="' + s.i + '" style="flex-grow:' + s.days + '">' + lab + '</div>';
    });
    h += '</div><div class="ln-ticks">';
    var y0 = new Date(ms(R[0].won)).getUTCFullYear(), y1 = new Date(NOW).getUTCFullYear(), tN = R[R.length - 1].endMs;
    for (var y = y0; y <= y1; y++) {
      var left = Math.max(0, (tN - Date.UTC(y + 1, 0, 1)) / 86400000 / TOTAL * 100);
      h += '<div class="ln-tick" style="left:' + left.toFixed(2) + '%">' + y + '</div>';
    }
    return h + '</div>';
  }

  function factHtml(e, r) {
    var ppv = /PPV/i.test(e.note), win = e.kind === 'win';
    var k = win ? T('TITLE WIN', '王座奪取') : T('DEFENCE ' + e.n, '防衛' + e.n);
    return '<div class="ln-f"><span class="k' + (win ? ' win' : '') + '">' + esc(k) + '</span><span class="d">' + esc(fmtD(e.d)) + '</span><span class="o">' + esc(T('vs ', '対 ') + e.opp) + '</span>' +
      '<span class="v">' + esc((e.venue || '') + (ppv ? ' · PPV' : '') + (e.note && !ppv ? ' · ' + e.note : '')) + '</span></div>';
  }
  function videoHtml(it, idx) {
    var tag = it.inReign ? '<span class="ln-tg">' + esc(T('THIS REIGN', 'この王者期間')) + '</span>' : '';
    var bd = it.cd ? '<span class="ln-bd">' + esc((it.cdSrc === 'estimated' ? '~' : '') + fmtMD(it.cd) + (new Date(ms(it.cd)).getUTCFullYear() !== new Date(NOW).getUTCFullYear() ? ' ' + new Date(ms(it.cd)).getUTCFullYear() : '')) + '</span>' : '';
    return '<a class="ln-c" tabindex="0" data-k="c" data-e="' + idx + '" href="' + esc(it.h) + '"><div class="ln-im"' + (it.b ? ' style="background-image:url(' + esc(it.b) + ')"' : '') + '>' + tag + bd + PLAY + '</div><div class="ln-tt">' + esc(it.t) + '</div></a>';
  }

  function detailHtml() {
    var r = R[sel], ev = eventsOf(r);
    var span = r.defences.length
      ? T('the title win, then ' + dn(r) + (dn(r) === 1 ? ' defence' : ' defences'), '王座奪取と防衛' + dn(r) + '回')
      : T('the title win, no defences', '王座奪取のみ（防衛なし）');
    var head = '<div class="ln-h">' + esc(T('REIGN ' + r.n + ' · ' + String(r.champ).toUpperCase(), '第' + r.n + '代 · ' + r.champ)) + '<span>' + esc(span) + '</span></div>';
    var facts = '<div class="ln-fx">' + ev.map(function(e) { return factHtml(e, r); }).join('') + '</div>';
    var vh = '<div class="ln-vh"><span class="bar"></span><span>' + esc(T(D.title + ' matches · ' + nm(r), nm(r) + ' · ' + (D.ja || D.title))) + '</span>' +
      '<span class="n">' + esc(searching ? T('looking for videos', '動画を検索中') : (waiting ? T('not loaded yet', '未読み込み') : result ? T(result.rows.length + ' videos · ' + result.inN + ' from this reign', result.rows.length + '本 · 王者期間 ' + result.inN + '本') : '')) + '</span></div>';
    var row = '';
    if (result && result.rows.length) row = '<div class="ln-vr">' + result.rows.slice(0, 40).map(videoHtml).join('') + '</div>';
    else if (waiting) row = '<div class="ln-note">' + esc(T('Press OK on this reign to load its videos.', 'OKを押すとこの王者の動画を読み込みます。')) + '</div>';
    else if (!searching) row = '<div class="ln-note">' + esc(T('No championship videos were found for this champion.', 'この王者の王座戦動画は見つかりませんでした。')) + '</div>';
    else row = '<div class="ln-note">' + esc(T('Looking for the video...', '動画を検索中...')) + '</div>';
    var note = errNote ? '<div class="ln-note">' + esc(errNote) + '</div>' : '';
    var sum = '';
    if (result) {
      var ql = (dbg[sel] || []).filter(function(l) { return l.indexOf('search: ') === 0; }).map(function(l) { return l.slice(8); }).join('  |  ');
      sum = '<div class="ln-dbg" style="margin-top:14px"><b>SEARCH</b> \u00b7 ' + esc(ql) + ' \u00b7 cards read: ' + result.total + ' \u00b7 championship matches: ' + result.rows.length + ' \u00b7 dated inside this reign: ' + result.inN +
        (result.sample.length ? '\nfirst titles on the page:\n' + esc(result.sample.join('\n')) : '') + '</div>';
    }
    var fh = '<div class="ln-h">' + esc(T('MATCHES IN THIS REIGN', 'この王者期間の試合')) + '</div>';
    return vh + row + note + fh + facts + sum;
  }

  function debugHtml() {
    var r = R[sel], lines = (dbg[sel] || []).slice();
    if (waiting) lines.push('videos not loaded: press OK on this reign (no request made)');
    if (result) {
      result.rows.slice(0, 40).forEach(function(it) {
        lines.push((it.inReign ? 'IN REIGN  ' : 'other     ') + (it.cd ? it.cd + ' (' + it.cdSrc + ')' : 'no date, video ' + (cardId(it) || '?')) + '  ' + it.t + ' [' + it.h.replace(/^https?:\/\/[^\/]+/, '') + ']');
      });
      if (result.rows.length > 40) lines.push('... and ' + (result.rows.length - 40) + ' more not shown');
      result.rejected.slice(0, 14).forEach(function(x) { lines.push('skipped: ' + x[0].t + ' (' + x[1] + ')'); });
      if (result.rejected.length > 14) lines.push('... and ' + (result.rejected.length - 14) + ' more skipped');
    }
    return '<div class="ln-dbg"><b>MATCHING DEBUG</b> \u00b7 reign ' + r.n + ' \u00b7 ' + esc(r.champ) + '\n' + esc(lines.join('\n')) + '</div>';
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
      '<div class="ln-h">' + esc(T('LINEAGE', '歴代王者')) + '<span>' + esc(lineInfo()) + '</span></div>' +
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
    el.textContent = k === 'r' ? T('Left / Right: reign · OK: load videos · Down: videos', '左右：王者 · OK：動画読込 · 下：動画') : (k === 'c' ? T('OK: play the match', 'OK：再生') : (k === 'a' ? T('OK: open all matches · Down: lineage', 'OK：すべて表示 · 下：歴代') : ''));
  }

  function cachedFor(i) {
    var r = R[i], cc = readCache(), ok = false;
    queries(r).concat(fallbackQuery(r) ? [fallbackQuery(r)] : []).forEach(function(q) { var c = cc[q]; if (c && c.items && c.items.length && Date.now() - c.t < (r.cur ? 3 * 3600000 : 14 * 86400000)) ok = true; });
    return ok;
  }
  // Videos load on their own for the current champion and for any reign already saved on the device; the rest wait for OK.
  function choose(i, now, force) {
    if (i === sel && (result || searching) && !force) return;
    sel = i; result = null; errNote = '';
    token++;
    clearTimeout(timer);
    var ce = document.getElementById('ln-cur'); if (ce) ce.innerHTML = curBox(sel);
    if (!force && i !== R.length - 1 && !cachedFor(i)) {
      searching = false; waiting = true;
      Array.prototype.forEach.call(root.querySelectorAll('.ln-b'), function(b) { b.classList.toggle('sel', +b.getAttribute('data-i') === sel); });
      renderDetail();
      return;
    }
    waiting = false;
    searching = true;
    // restyle the strip and show the events at once; the search starts once the choice settles
    Array.prototype.forEach.call(root.querySelectorAll('.ln-b'), function(b) { b.classList.toggle('sel', +b.getAttribute('data-i') === sel); });
    renderDetail();
    var tk = token;
    timer = setTimeout(function() {
      loadReign(sel, tk, function(items) {
        if (tk !== token) return;
        result = matchAll(R[sel], items);
        renderDetail();
      }, function(items, err) {
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
      var i = +cur.getAttribute('data-i') + (dir === 'right' ? -1 : 1);
      if (i >= R.length) return false;
      if (i < 0) return true;
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
    else if (k === 38) { stop(); if (!move('up')) { var sc = root.querySelector('#tv-ln-scroll'); if (sc) sc.scrollTop = Math.max(0, sc.scrollTop - 320); } }
    else if (k === 40) { stop(); if (!move('down')) { var sd = root.querySelector('#tv-ln-scroll'); if (sd) sd.scrollTop += 320; } }
    else if ((k === 13 || k === 23 || k === 32) && ae.getAttribute('data-k') === 'r') { stop(); var oi = +ae.getAttribute('data-i'); if (oi === sel && result) { var c = root.querySelector('.ln-c[tabindex]'); if (c) focusEl(c); } else choose(oi, true, true); }
  }, true);
  root.addEventListener('click', function(e) {
    var b = e.target && e.target.closest ? e.target.closest('.ln-b[data-i]') : null;
    if (b) { e.preventDefault(); focusEl(b); var bi = +b.getAttribute('data-i'); if (bi === sel && result) { var c0 = root.querySelector('.ln-c[tabindex]'); if (c0) focusEl(c0); } else choose(bi, true, true); }
  }, true);
  document.addEventListener('focusin', function() { if (document.getElementById('tv-ln')) hint(); }, true);

  render('sel');
  if (R.length) choose(R.length - 1, true) || 0;
})();
