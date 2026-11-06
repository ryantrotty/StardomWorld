(function(){
  // Video index, step 1 (dry run, private builds only): on a video page, read the page's own facts (no extra request),
  // keep the latest copy per video on this TV (localStorage) and show what would be sent in a panel that stays on
  // screen. Nothing leaves the TV. Only public page facts are read: no account, cookie or viewer details.
  if (window.__tvVideoIndex) return;
  var M = /^\/(?:set\/([0-9]+)\/)?contents\/([0-9]+)/.exec(location.pathname);
  if (!M) return;
  window.__tvVideoIndex = true;
  var KEY = 'tvVideoIndexDry', MAX = 3000;

  function txt(el) { return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hasLatin(s) { return /[A-Za-z]{3}/.test(s) && !/[぀-ヿ一-鿿]/.test(s); }
  function hasJa(s) { return /[぀-ヿ一-鿿]/.test(s); }
  // Older titles start with the show date ("6.14.2015 World of Stardom Title Match"); newer ones with the match number ("6、...").
  var DATE = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*/;
  function dateOf(s) { var m = DATE.exec(s || ''); return m ? m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2) : null; }
  function num(s) { if (DATE.test(s || '')) return null; var m = /^\s*(\d{1,2})\s*[、,.．]\s*/.exec(s || ''); return m ? +m[1] : null; }
  function stripNum(s) { return String(s || '').replace(DATE, '').replace(/^\s*\d{1,2}\s*[、,.．]\s*/, '').trim(); }
  function sides(line, ja) {
    if (!line) return [];
    var parts = ja ? line.split(/\s*[VＶ][SＳ]\s*/) : line.split(/\s+vs\.?\s+/i);
    return parts.map(function(p) { return p.split(/\s*[＆&]\s*/).map(function(n) { return n.trim(); }).filter(Boolean); }).filter(function(s) { return s.length; });
  }
  // The description block: one fact per line (Japanese title, Japanese line-up, English title, English line-up).
  function lines(box) {
    if (!box) return [];
    var c = box.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('br'), function(b) { b.replaceWith('\n'); });
    Array.prototype.forEach.call(c.querySelectorAll('div, p, li'), function(d) { d.insertAdjacentText('beforeend', '\n'); });
    return String(c.textContent || '').split('\n').map(function(s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean)
      .filter(function(s, i, a) { return a.indexOf(s) === i; });
  }
  function setsOf() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('.accordion-box a[href*="/set/"]'), function(a) {
      var m = /\/set\/([0-9]+)/.exec(a.getAttribute('href') || ''), name = txt(a);
      if (!m || !name) return;
      var d = /^(\d{4})\/(\d{1,2})\/(\d{1,2})[_\s]*(.*)$/.exec(name);
      out.push({ id: +m[1], name: name, date: d ? d[1] + '-' + ('0' + d[2]).slice(-2) + '-' + ('0' + d[3]).slice(-2) : null, show: d ? d[4].trim() : name });
    });
    return out;
  }
  function read() {
    var wrap = document.querySelector('.content-ttl-wrap');
    if (!wrap) return null;
    var h1 = txt(wrap.querySelector('h1'));
    var L = lines(wrap.querySelector('.wswg-wrap'));
    var en = L.filter(hasLatin), ja = L.filter(hasJa);
    var enTitle = en[0] || '', enNames = en.length > 1 ? en[1] : '';
    var jaTitle = ja[0] || (hasJa(h1) ? h1 : ''), jaNames = ja.length > 1 ? ja[1] : '';
    // Older format: an English heading and one description line with just the line-up.
    if (!hasJa(h1) && en.length === 1 && /\svs\.?\s/i.test(en[0])) { enTitle = h1; enNames = en[0]; }
    var og = document.querySelector('meta[property="og:image"]');
    var tags = [];
    Array.prototype.forEach.call(document.querySelectorAll('.tag-wrap a, .tag-wrap span'), function(t) { var s = txt(t); if (s && tags.indexOf(s) < 0) tags.push(s); });
    var access = [];
    Array.prototype.forEach.call(document.querySelectorAll('.content-ttl-wrap ~ * .tag, .content-status-box .tag'), function(t) { var s = txt(t); if (s && !/display:\s*none/.test(t.getAttribute('style') || '') && access.indexOf(s) < 0) access.push(s); });
    return {
      id: +M[2], set: M[1] ? +M[1] : null,
      no: num(enTitle) || num(jaTitle), date: dateOf(h1) || dateOf(enTitle),
      title_en: stripNum(enTitle), title_ja: stripNum(jaTitle),
      sides_en: sides(enNames, false), sides_ja: sides(jaNames, true),
      shows: setsOf(), tags: tags, access: access,
      thumb: og ? og.getAttribute('content') : '',
      lines: L, read: new Date().toISOString()
    };
  }
  function store(rec) {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { all = {}; }
    all[rec.id] = rec;
    var ids = Object.keys(all);
    if (ids.length > MAX) ids.sort(function(a, b) { return String(all[a].read).localeCompare(String(all[b].read)); }).slice(0, ids.length - MAX).forEach(function(k) { delete all[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
    return Object.keys(all).length;
  }

  var st = document.createElement('style');
  st.textContent = [
    '#tv-vix{margin:24px 40px;padding:16px 20px;background:#0F151C;border:2px solid #2A323C;border-radius:12px;font:13px/1.45 Arial,Helvetica,sans-serif;color:#C9D2DC;}',
    '#tv-vix .h{font-size:13px;font-weight:800;letter-spacing:.14em;color:#F4C242;margin-bottom:8px;}',
    '#tv-vix .h span{color:#9AA6B4;letter-spacing:0;font-weight:700;margin-left:10px;}',
    '#tv-vix table{border-collapse:collapse;width:100%;margin-bottom:10px;}',
    '#tv-vix td{padding:3px 10px 3px 0;vertical-align:top;}',
    '#tv-vix td.k{width:120px;color:#9AA6B4;font-weight:700;white-space:nowrap;}',
    '#tv-vix td.v{color:#FFFFFF;}',
    '#tv-vix .bad{color:#FF7A66;}',
    '#tv-vix pre{margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.4 Menlo,Consolas,monospace;color:#9AA6B4;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  function row(k, v, bad) { return '<tr><td class="k">' + esc(k) + '</td><td class="v' + (bad ? ' bad' : '') + '">' + esc(v) + '</td></tr>'; }
  function show(rec, count) {
    var box = document.getElementById('tv-vix');
    if (!box) {
      box = document.createElement('div');
      box.id = 'tv-vix';
      box.className = 'notranslate';
      box.setAttribute('translate', 'no');
      // Right after the match description; the app hides parts of the page, so if that spot is hidden the panel
      // goes just above the footer instead.
      var at = document.querySelector('.content-ttl-wrap');
      if (at && at.parentNode) at.parentNode.insertBefore(box, at.nextSibling); else document.body.appendChild(box);
      if (box.offsetParent === null) {
        var f = document.querySelector('footer, .box-footer');
        if (f && f.parentNode) f.parentNode.insertBefore(box, f); else document.body.appendChild(box);
      }
    }
    var sh = rec.shows.map(function(s) { return (s.date || '?') + ' · ' + s.show + ' (set ' + s.id + ')'; }).join(' | ');
    var fmt = function(s) { return s.map(function(x) { return x.join(' & '); }).join('  vs  '); };
    box.innerHTML = '<div class="h">VIDEO INDEX · DRY RUN<span>nothing is sent · saved on this TV: ' + count + ' video' + (count === 1 ? '' : 's') + '</span></div>' +
      '<table>' + row('Video', rec.id + (rec.set ? ' (in set ' + rec.set + ')' : '')) +
      row('Match no.', rec.no == null ? 'not found' : rec.no, rec.no == null) + row('Date in title', rec.date || 'none') +
      row('Title (EN)', rec.title_en || 'not found', !rec.title_en) + row('Title (JA)', rec.title_ja || 'not found', !rec.title_ja) +
      row('Line-up (EN)', rec.sides_en.length ? fmt(rec.sides_en) : 'not found', !rec.sides_en.length) +
      row('Line-up (JA)', rec.sides_ja.length ? fmt(rec.sides_ja) : 'not found', !rec.sides_ja.length) +
      row('Show', sh || 'not found', !sh) + row('Tags', rec.tags.join(', ') || 'none') + row('Access', rec.access.join(', ') || 'none') + '</table>' +
      '<pre>' + esc(JSON.stringify(rec)) + '</pre>';
  }

  // The page's text can arrive a little after the script runs: try for about 20 seconds, then show what was found.
  var tries = 0;
  var t = setInterval(function() {
    tries++;
    var rec = read();
    var ready = rec && (rec.lines.length || tries > 20);
    if (!ready && tries <= 20) return;
    clearInterval(t);
    if (!rec) rec = { id: +M[2], set: M[1] ? +M[1] : null, no: null, date: null, title_en: '', title_ja: '', sides_en: [], sides_ja: [], shows: [], tags: [], access: [], thumb: '', lines: [], read: new Date().toISOString(), note: 'no video information block found on this page' };
    show(rec, store(rec));
  }, 1000);
})();
