(function(){
  // Video index (private builds only): on a video page, read the page's own facts (no extra request), keep the latest
  // copy per video on this TV (localStorage). (2.26.1: the on-screen panel is gone.) When the build has a log
  // address (branding-private/video_index.properties) the app also sends the record to the private log (see
  // docs/VIDEO_INDEX_LOG.md); without one nothing leaves the TV. Only public page facts are read: no account, cookie
  // or viewer details.
  if (window.__tvVideoIndex) return;
  var M = /^\/(?:set\/([0-9]+)\/)?contents\/([0-9]+)/.exec(location.pathname);
  if (!M) return;
  window.__tvVideoIndex = true;
  var KEY = 'tvVideoIndexDry', MAX = 3000;

  function txt(el) { return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function hasJa(s) { return /[぀-ヿ一-鿿]/.test(s || ''); }
  // Full-width digits and letters (３・２２, ＶＳ) to plain ones.
  function half(s) { return String(s || '').replace(/[０-９Ａ-Ｚａ-ｚ]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }); }
  function iso(y, m, d) { return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); }
  // Dates seen at the start of titles: 2026/10/04 (new), 6.14.2015 (old). And on their own line: 2026年10月4日.
  var D_YMD = /^\s*(\d{4})\/(\d{1,2})\/(\d{1,2})\s*/, D_MDY = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*/, D_JA = /^\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*$/;
  // A line that is only a date: 2026年1月21日, 2026/01/21, Sunday, December 29, 2024.
  var D_YMD_ONLY = /^\s*\d{4}\/\d{1,2}\/\d{1,2}\s*$/, D_EN = /^\s*(?:[A-Za-z]+,\s*)?([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\s*$/;
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function enDate(s) { var m = D_EN.exec(half(s)), n = m && MONTHS[m[1].slice(0, 3).toLowerCase()]; return n ? iso(m[3], n, m[2]) : null; }
  function isDateLine(s) { s = half(s); return D_JA.test(s) || D_YMD_ONLY.test(s) || !!enDate(s); }
  function dateOf(s) {
    s = half(s); var m;
    if ((m = D_YMD.exec(s))) return iso(m[1], m[2], m[3]);
    if ((m = D_MDY.exec(s))) return iso(m[3], m[1], m[2]);
    if ((m = D_JA.exec(s))) return iso(m[1], m[2], m[3]);
    return enDate(s);
  }
  var LEAD = /^\s*[◆◇■□●○★☆▼▽▶►・]+\s*/;
  function num(s) { s = half(s).replace(LEAD, ''); if (D_YMD.test(s) || D_MDY.test(s)) return null; var m = /^\s*(\d{1,2})\s*[、,.．]\s*/.exec(s); return m ? +m[1] : null; }
  var ENG_MARK = /^\s*【\s*(?:English\s*Commentary|ENG)\s*】\s*/i;
  function cleanTitle(s) { return half(s).replace(ENG_MARK, '').replace(LEAD, '').replace(D_YMD, '').replace(D_MDY, '').replace(/^\s*\d{1,2}\s*[、,.．]\s*/, '').trim(); }
  var VS = /\s+(?:vs|VS|Vs)\.?\s+/;
  function isVsLine(s) { return /^\s*(?:vs|VS|Vs)\.?\s+/.test(half(s)); }
  // "A & B (TEAM)" vs "C (note) & D": sides of names. A bracket after the last name of a side is the side's team;
  // a bracket after any other name is a note on that wrestler.
  function sides(text) {
    // Japanese line-ups often have no spaces around VS.
    text = half(text || '').replace(/([^\x00-\x7F])\s*(?:VS|vs|Vs)\.?(?=\s|[^\x00-\x7F])/g, '$1 vs ').replace(/\s(?:VS|vs|Vs)(?=[^\x00-\x7F])/g, ' vs ').trim();
    if (!text) return { names: [], teams: [], notes: [], roles: [] };
    var out = { names: [], teams: [], notes: [], roles: [] };
    text.split(VS).forEach(function(side) {
      // 《Champion》 or <Challenger> belongs to the side, not to a name.
      var role = null;
      side = side.replace(/[《<〈＜]([^》>〉＞]*)[》>〉＞]/g, function(_, r) {
        if (/champion|王者/i.test(r) && !/challenger/i.test(r)) role = 'champion';
        else if (/challenger|挑戦者/i.test(r)) role = 'challenger';
        return ' ';
      });
      var parts = side.split(/\s*[&＆]\s*/).map(function(n) { return n.trim(); }).filter(Boolean);
      if (!parts.length) return;
      var team = null, names = [];
      parts.forEach(function(p, i) {
        var bits = [], name = p.replace(/\s*[（(]([^）)]*)[）)]/g, function(_, b) { bits.push(b.trim()); return ''; }).trim();
        if (i === parts.length - 1 && bits.length && parts.length > 1) team = bits.pop();
        bits.forEach(function(b) { out.notes.push([name, b]); });
        if (name) names.push(name);
      });
      out.names.push(names); out.teams.push(team); out.roles.push(role);
    });
    return out;
  }
  // The description: one fact per line. Kept in order; only a line that repeats the one before it is dropped.
  function lines(box) {
    if (!box) return [];
    var c = box.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('br'), function(b) { b.replaceWith('\n'); });
    Array.prototype.forEach.call(c.querySelectorAll('div, p, li'), function(d) { d.insertAdjacentText('beforeend', '\n'); });
    return String(c.textContent || '').split('\n').map(function(s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean)
      .filter(function(s, i, a) { return i === 0 || a[i - 1] !== s; });
  }
  // The description is a Japanese block then an English block, each a title line and its line-up (a line starting
  // with "vs" carries on the line-up). Date-only lines are taken out first.
  function blocks(L) {
    var out = [], cur = null, dates = [];
    L.forEach(function(l) {
      if (isDateLine(l)) { dates.push(dateOf(l)); return; }
      if (LEAD.test(half(l))) { cur = { title: l, lineup: null }; out.push(cur); return; }   // a ◆ line always starts a match
      if (cur && isVsLine(l)) { cur.lineup = (cur.lineup || '') + ' ' + half(l).trim(); return; }
      if (cur && cur.lineup == null) { cur.lineup = half(l).trim(); return; }
      cur = { title: l, lineup: null }; out.push(cur);
    });
    // Full-show descriptions start with sponsor, show and venue lines that pair up like a title and line-up. When any
    // block has a real line-up (two sides or more), only those count.
    var real = out.filter(function(b) { return sides(b.lineup).names.length >= 2; });
    return { list: real.length ? real : out, dates: dates };
  }
  // Set names: "2023/6/25_STARDOM SUNSHINE 2023", "10・4『STARDOM in SHIZUOKA 2026 Oct.』静岡・ツインメッセ静岡", "KAIRI Kollection".
  function setOf(id, name, yearHint) {
    var n = half(name).replace(ENG_MARK, ''), r = { id: id, name: name, date: null, show: n, venue: null }, d;
    if ((d = /^(\d{4})\/(\d{1,2})\/(\d{1,2})[_\s]*(.*)$/.exec(n))) { r.date = iso(d[1], d[2], d[3]); r.show = d[4].trim(); }
    else if ((d = /^\s*(\d{1,2})\s*[・.\/]\s*(\d{1,2})\s*(.*)$/.exec(n))) {
      var rest = d[3], q = /『([^』]+)』\s*(.*)$/.exec(rest);
      if (q) { r.show = q[1].trim(); r.venue = q[2].replace(/[（(]\d{4}\/\d{1,2}\/\d{1,2}[）)]\s*$/, '').trim() || null; } else r.show = rest.trim();
      // The video's own date knows the year; a year inside a show name can be a sponsor's ("... Show 2025 presents ... 2024").
      var y = /(20\d{2}|19\d{2})/.exec(rest);
      var year = yearHint || (y ? y[1] : null);
      r.date = year ? iso(year, d[1], d[2]) : null;
    }
    return r;
  }
  function setsOf(yearHint) {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('.accordion-box a[href*="/set/"]'), function(a) {
      var m = /\/set\/([0-9]+)/.exec(a.getAttribute('href') || ''), name = txt(a);
      if (!m || !name) return;
      var r = setOf(+m[1], name, yearHint);
      out.push(r);
    });
    return out;
  }
  // The facts in the heading and description lines (no page access, so saved lines can be read again the same way).
  function parseText(h1, L) {
    var B = blocks(L), list = B.list;
    var ja = null, en = null;
    if (list.length >= 2) { ja = list[0]; en = list[1]; }                       // Japanese first, English second
    else if (list.length === 1) { if (hasJa(list[0].title + (list[0].lineup || ''))) ja = list[0]; else en = list[0]; }
    // Older format: an English heading and one description line with just the line-up.
    if (en && !ja && en.lineup == null && en.title !== h1 && !hasJa(h1)) en = { title: h1, lineup: en.title };
    if (!ja && hasJa(h1)) ja = { title: h1, lineup: null };
    if (!en && !ja && h1) (hasJa(h1) ? (ja = { title: h1, lineup: null }) : (en = { title: h1, lineup: null }));
    // One "side" is never a match: it is a show or venue line in the line-up's place.
    function two(s) { return s.names.length >= 2 ? s : { names: [], teams: [], notes: [], roles: [] }; }
    var sEn = two(sides(en && en.lineup)), sJa = two(sides(ja && ja.lineup));
    return {
      no: [en && num(en.title), ja && num(ja.title), num(h1)].filter(function(x) { return typeof x === 'number'; }).concat([null])[0],   // 0 is a real card number (dark match)
      date: dateOf(h1) || (en && dateOf(en.title)) || (ja && dateOf(ja.title)) || B.dates[0] || null,
      title_en: en ? cleanTitle(en.title) : '', title_ja: ja ? cleanTitle(ja.title) : '',
      sides_en: sEn.names, teams_en: sEn.teams, notes_en: sEn.notes, roles_en: sEn.roles,
      sides_ja: sJa.names, teams_ja: sJa.teams, notes_ja: sJa.notes, roles_ja: sJa.roles
    };
  }
  window.__tvVixParse = parseText;
  function read() {
    var wrap = document.querySelector('.content-ttl-wrap');
    if (!wrap) return null;
    var h1 = txt(wrap.querySelector('h1'));
    var L = lines(wrap.querySelector('.wswg-wrap')), P = parseText(h1, L);
    var shows = setsOf(P.date ? P.date.slice(0, 4) : null);
    var showName = shows.map(function(x) { return x.name; }).join(' ');
    var version = /ダイジェスト|digest/i.test(h1 + ' ' + L.join(' ')) ? 'digest' : (/【\s*(?:English\s*Commentary|ENG)\s*】|\(English\)/i.test(h1 + ' ' + L.join(' ') + ' ' + showName) ? 'en' : 'jp');
    var og = document.querySelector('meta[property="og:image"]');
    var tags = [];
    Array.prototype.forEach.call(document.querySelectorAll('.tag-wrap a, .tag-wrap span'), function(t) { var s = txt(t); if (s && tags.indexOf(s) < 0) tags.push(s); });
    var access = [];
    Array.prototype.forEach.call(document.querySelectorAll('.content-ttl-wrap ~ * .tag, .content-status-box .tag'), function(t) { var s = txt(t); if (s && !/display:\s*none/.test(t.getAttribute('style') || '') && access.indexOf(s) < 0) access.push(s); });
    return {
      id: +M[2], set: M[1] ? +M[1] : null, h1: h1, version: version,
      no: P.no,
      date: P.date || (shows[0] && shows[0].date) || null,
      title_en: P.title_en, title_ja: P.title_ja,
      sides_en: P.sides_en, teams_en: P.teams_en, notes_en: P.notes_en, roles_en: P.roles_en,
      sides_ja: P.sides_ja, teams_ja: P.teams_ja, notes_ja: P.notes_ja, roles_ja: P.roles_ja,
      shows: shows, tags: tags, access: access,
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

  // The page's text can arrive a little after the script runs: try for about 20 seconds, then use what was found.
  var tries = 0;
  var t = setInterval(function() {
    tries++;
    var rec = read();
    // Ready when the description has lines, or after 3 seconds when its block is there but empty (title-only pages).
    var ready = rec && (rec.lines.length || (tries >= 3 && document.querySelector('.content-ttl-wrap h1')) || tries > 20);
    if (!ready && tries <= 20) return;
    clearInterval(t);
    if (!rec) rec = { id: +M[2], set: M[1] ? +M[1] : null, no: null, date: null, title_en: '', title_ja: '', sides_en: [], teams_en: [], notes_en: [], sides_ja: [], teams_ja: [], notes_ja: [], shows: [], tags: [], access: [], thumb: '', lines: [], read: new Date().toISOString(), note: 'no video information block found on this page' };
    store(rec);
    window.__tvVixRec = rec;
    // Log (private builds with a log address): hand the record to the app, which sends it with its own key.
    // A page with nothing read (no title and no description) is not sent. No panel is shown; the last result is
    // kept on the TV (localStorage tvVideoIndexLast) in case a send needs looking into.
    window.__tvVixStatus = function(id, text) {
      try { localStorage.setItem('tvVideoIndexLast', JSON.stringify({ id: id, result: text, at: new Date().toISOString() })); } catch (e) {}
    };
    try {
      if (window.AndroidHost && AndroidHost.videoIndexOn && AndroidHost.videoIndexOn()) {
        if (rec.title_en || rec.title_ja || rec.lines.length) AndroidHost.videoIndexPut(JSON.stringify(rec));
        else window.__tvVixStatus(rec.id, 'not sent: nothing read on this page');
      }
    } catch (e) {}
  }, 1000);
})();
