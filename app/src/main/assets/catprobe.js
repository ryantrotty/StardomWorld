(function(){
  // Category probe (temporary, all builds): before match categories (Championship, 5★STAR GP, Cinderella, Tag League)
  // are built, this checks which search words the site's search actually answers and how candidate title rules would
  // sort what comes back. Started by its button on a wrestler page or a tag team page; nothing runs until then.
  // One page per search, one search at a time, 3 seconds apart; answers are kept 7 days (pressing again is free).
  // The results stay on screen in the debug panel style, to be photographed.
  if (window.__tvCatProbe) return;

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function parse(s) { try { return JSON.parse(s || 'null'); } catch (e) { return null; } }
  function half(t) { return String(t || '').replace(/[！-～]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/　/g, ' '); }
  function low(s) { return String(s || '').toLowerCase().trim(); }

  var CACHE_KEY = 'tvCatProbeV1', LAST_KEY = 'tvTeamLastReq', BLOCK_KEY = 'tvFacBlockUntilV1', GAP_MS = 3000, KEEP_MS = 7 * 86400000;

  // Candidate title rules (what the probe tests; the real ones go in the categories file once the photos are in).
  var RULES = [
    ['CH', 'Championship', /championship|選手権|title\s*match|タイトルマッチ/i],
    ['5★', '5★STAR GP', /5\s*[★☆*]?\s*star|star\s*gp|(?:blue|red)\s*stars|ブルースターズ|レッドスターズ|ファイブスター/i],
    ['CIN', 'Cinderella', /cinderella|シンデレラ/i],
    ['TL', 'Tag League', /tag\s*league|goddess(?:es)?\s*official|ゴッデス公式|タッグリーグ|(?:blue|red)\s*goddess|ブルーゴッデス|レッドゴッデス/i],
    ['MULTI', 'Bigger or multi-way', /(?:\d+|six|eight|ten|twelve|fourteen)[\s\-‐]*(?:person|man|men|woman|women)|\d+\s*人|(?:[2-6]|two|three|four|five|six)[\s\-‐]*way|trios?|トリオ|gauntlet|ガントレット|battle\s*royal|バトルロイヤル|rumble|ランブル/i],
    ['TAG', 'Tag', /tag|タッグ/i]
  ];
  function tagsOf(title) {
    var t = half(title), out = [];
    RULES.forEach(function(r) { if (r[2].test(t)) out.push(r[0]); });
    if (out.indexOf('MULTI') >= 0) { var i = out.indexOf('TAG'); if (i >= 0) out.splice(i, 1); }
    if (!out.length || (out.indexOf('MULTI') < 0 && out.indexOf('TAG') < 0 && out.indexOf('TL') < 0)) out.push('SGL?');
    return out;
  }
  function dateOf(t) { var m = /(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/.exec(t || ''); return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : ''; }

  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function cleanT(t) { return String(t || '').replace(/月額見放題/g, '').replace(/(Registration date|登録日)\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '').replace(/(Viewing date|視聴日時|視聴日)\s*[:：]?\s*[0-9.\/\- :]*/gi, '').replace(/\s+/g, ' ').trim(); }
  function parseCards(doc) {
    var scope = doc.querySelector('.content-list, [class*="content-list"]') || doc, out = [], seen = {};
    Array.prototype.forEach.call(scope.querySelectorAll('.content-list-item, article'), function(item) {
      var link = item.querySelector('a[href*="/contents/"]');
      if (!link) return;
      var id = (/\/contents\/(\d+)/.exec(absUrl(link.getAttribute('href') || '')) || [])[1];
      if (!id || seen[id]) return;
      seen[id] = 1;
      var tEl = item.querySelector('h3, h4, .ttl-xs, .content-title');
      out.push({ id: id, t: cleanT(tEl ? tEl.textContent : item.textContent) });
    });
    return out;
  }
  function readCache() { return parse(lsGet(CACHE_KEY)) || {}; }
  function fetchPage(q, cb) {
    var c = readCache()[q];
    if (c && Date.now() - c.t < KEEP_MS) { cb('', c.items, c.more, true); return; }
    var block = parseInt(lsGet(BLOCK_KEY) || '0', 10) || 0;
    if (block > Date.now()) { cb('the site asked for a pause: ' + Math.ceil((block - Date.now()) / 60000) + ' min left'); return; }
    var since = Date.now() - (parseInt(lsGet(LAST_KEY) || '0', 10) || 0);
    if (since < GAP_MS) { setTimeout(function() { fetchPage(q, cb); }, GAP_MS - since); return; }
    lsSet(LAST_KEY, String(Date.now()));
    fetch('/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(q) + '&activetab=contents', { credentials: 'include' }).then(function(res) {
      if (res.status === 429 || res.status === 403 || res.status === 503) { lsSet(BLOCK_KEY, String(Date.now() + 10 * 60000)); throw 'blocked (HTTP ' + res.status + ')'; }
      if (!res.ok) throw 'HTTP ' + res.status;
      return res.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html'), items = parseCards(doc);
      var more = !!doc.querySelector('a[rel="next"], .pagination a.next, .pagination .next a, li.next a') || items.length >= 10;
      var all = readCache(); all[q] = { t: Date.now(), items: items, more: more };
      var keys = Object.keys(all); if (keys.length > 40) { keys.sort(function(a, b) { return all[a].t - all[b].t; }); keys.slice(0, keys.length - 40).forEach(function(k) { delete all[k]; }); }
      lsSet(CACHE_KEY, JSON.stringify(all));
      cb('', items, more, false);
    }).catch(function(err) { cb(typeof err === 'string' ? err : 'error ' + err); });
  }

  // Title matches on record for these names, from the bundled or daily lineage files: the match each reign was won in
  // and every defence, by date.
  var BELT_IDS = ['world', 'wonder', 'goddess', 'newblood', 'artist', 'highspeed', 'future', 'strong', 'kawaii', 'iwgp'];
  function onRecord(names) {
    var H = window.AndroidHost || {}, out = [];
    BELT_IDS.forEach(function(id) {
      var L = null;
      try { L = parse(H.lineageJson ? H.lineageJson(id) : ''); } catch (e) { L = null; }
      if (!L || !L.reigns) return;
      var alias = {};
      Object.keys(L.alias || {}).forEach(function(n) { (L.alias[n] || []).concat([n]).forEach(function(a) { alias[low(a)] = low(n); }); });
      function canon(n) { return alias[low(n)] || low(n); }
      var want = names.map(canon);
      L.reigns.forEach(function(r) {
        var champ = String(r.champ || '').split(/\s*&\s*/).map(canon);
        if (!want.every(function(n) { return champ.indexOf(n) >= 0; })) return;
        if (r.won) out.push({ belt: id, d: r.won, what: 'won' });
        (r.defences || []).forEach(function(df) { if (df.d) out.push({ belt: id, d: df.d, what: 'defence' }); });
      });
    });
    return out.sort(function(a, b) { return a.d < b.d ? 1 : -1; });
  }

  function searchesFor(kind, s) {
    if (kind === 'team') {
      var a = s[0], b = s[1];
      return [a + ' ' + b, a + ' Tag Team ' + b, a + ' ' + b + ' Championship', a + ' Goddess ' + b, a + ' ' + b + ' Tag League'];
    }
    var n = s[0];
    return [n, n + ' Championship', n + ' 選手権', n + ' 5★STAR', n + ' STARS', n + ' Cinderella', n + ' シンデレラ', n + ' Goddess'];
  }

  var CSS = [
    '.tv-cp{margin-top:18px;padding:12px 14px;background:#0F151C;border:2px solid #2A323C;border-radius:12px;font:12px/1.4 Arial,Helvetica,sans-serif;color:#C9D2DC;}',
    '.tv-cp .h{font-size:13px;font-weight:800;letter-spacing:.14em;color:#F4C242;}',
    '.tv-cp .g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;margin-top:8px;}',
    '.tv-cp .s{min-width:0;padding:6px 8px;border:1px solid #2A323C;border-radius:8px;}',
    '.tv-cp .q{color:#fff;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tv-cp .k{color:#9AA6B4;}',
    '.tv-cp .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.tv-cp .tg{color:#F4C242;font-weight:700;}',
    '.tv-cp .bad{color:#FF7A66;}',
    '.tv-cp .rec{margin-top:8px;padding:6px 8px;border:1px solid #2A323C;border-radius:8px;}'
  ].join('\n');
  var cssDone = false;

  // opts: { el: where the panel goes, kind: 'wrestler' | 'team', search: [names as the site spells them], names: [as in the title histories] }
  function run(opts) {
    if (!opts || !opts.el || opts.busy) return;
    if (!cssDone) { cssDone = true; var st = document.createElement('style'); st.textContent = CSS; (document.head || document.documentElement).appendChild(st); }
    var qs = searchesFor(opts.kind, opts.search), res = [], rec = onRecord(opts.names || opts.search), net = 0;
    opts.busy = true;
    function paint(note) {
      var h = '<div class="tv-cp"><div class="h">CATEGORY PROBE</div><div class="k">' + esc(note) + ' · searches the site made: ' + net + ' · saved copies are kept 7 days</div><div class="g">';
      qs.forEach(function(q, i) {
        var r = res[i];
        h += '<div class="s"><div class="q">' + (i + 1) + '. ' + esc(q) + '</div>';
        if (!r) { h += '<div class="k">' + (i === res.length ? 'searching…' : 'waiting') + '</div></div>'; return; }
        if (r.err) { h += '<div class="bad">' + esc(r.err) + '</div></div>'; return; }
        var counts = {};
        r.items.forEach(function(it) { tagsOf(it.t).forEach(function(tg) { counts[tg] = (counts[tg] || 0) + 1; }); });
        h += '<div class="k">page 1: ' + r.items.length + ' videos · more pages: ' + (r.more ? 'yes' : 'no') + (r.cached ? ' · saved copy' : '') + '</div>';
        h += '<div class="k">' + (Object.keys(counts).map(function(k) { return k + ' ' + counts[k]; }).join(' · ') || 'no videos') + '</div>';
        r.items.slice(0, 12).forEach(function(it) { h += '<div class="t"><span class="tg">' + esc(tagsOf(it.t).join(' ')) + '</span> ' + esc(it.t) + '</div>'; });
        h += '</div>';
      });
      h += '</div>';
      // title matches on record against every date seen in these results
      var seen = {};
      res.forEach(function(r, i) { if (r && r.items) r.items.forEach(function(it) { var d = dateOf(it.t); if (d) (seen[d] = seen[d] || []).push(i + 1); }); });
      var found = rec.filter(function(x) { return seen[x.d]; }), miss = rec.filter(function(x) { return !seen[x.d]; });
      h += '<div class="rec"><span class="tg">TITLE MATCHES ON RECORD</span> <span class="k">(title histories: reigns won and defences)</span><br>' +
        rec.length + ' on record · ' + found.length + ' with a video in these results' + (rec.length ? '' : ' · none for these names') +
        (found.length ? '<br><span class="k">found:</span> ' + esc(found.slice(0, 14).map(function(x) { return x.d + ' ' + x.belt + ' (search ' + seen[x.d].join(',') + ')'; }).join(' · ')) : '') +
        (miss.length ? '<br><span class="k">not in page 1 of any search:</span> <span class="bad">' + esc(miss.slice(0, 14).map(function(x) { return x.d + ' ' + x.belt + ' ' + x.what; }).join(' · ')) + (miss.length > 14 ? ' …+' + (miss.length - 14) : '') + '</span>' : '') +
        '</div>';
      h += '<div class="k" style="margin-top:6px">Tags: CH championship · 5★ 5★STAR GP · CIN Cinderella · TL Tag League · MULTI bigger or multi-way · TAG 2-on-2 tag · SGL? none of these (likely a single)</div></div>';
      opts.el.innerHTML = h;
    }
    function next(i) {
      if (i >= qs.length) { opts.busy = false; paint('done'); return; }
      paint('running ' + (i + 1) + ' of ' + qs.length);
      fetchPage(qs[i], function(err, items, more, cached) {
        if (!cached && !err) net++;
        res[i] = err ? { err: err } : { items: items || [], more: more, cached: cached };
        if (err && /blocked|pause/.test(err)) { opts.busy = false; paint('stopped: ' + err); return; }
        next(i + 1);
      });
    }
    next(0);
  }
  window.__tvCatProbe = { run: run };
})();
