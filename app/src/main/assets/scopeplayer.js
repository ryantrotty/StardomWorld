(function(){
  // StarScope player (2.65.0, private builds). On the page of a video logged in StarScope:
  //  - Title: match number, show, date and venue above the names; the event and the StarScope mark on the right.
  //  - Bell button (in the player bar, drawn by the app): Off / Skip entrances / Bell to bell, picked with Up / Down.
  //    Skip entrances lands 8 s before the bell, once per page, only when the video starts from the beginning
  //    (never on a resumed video, never again after you seek back).
  //  - A card on the full screen video (drawn by the app): the match while the entrances play, with "OK · Skip
  //    entrance" when the bell is Off, or "OK to watch them" after a skip; Up next at the end mark in Bell to bell.
  //  - The row under the player becomes The card when the show is in StarScope: match numbers, Now playing, Up next.
  // Reads only the StarScope list the TV already keeps (assets/starcards.js); nothing is fetched from the video site.
  if (window.__tvScopePlayer) return;
  var M = location.pathname.match(/^\/(?:set\/\d+\/)?contents\/(\d+)/);
  if (!M) return;
  var H = window.AndroidHost;
  if (!H || !H.scopeCard || !H.bellInfo) return;
  window.__tvScopePlayer = true;

  var VID = M[1], KEY = 'tvVixCardsV4', LEAD = 8, ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  var map = null, v = null;
  function load() {
    try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); map = (c && c.map) || null; } catch (e) { map = null; }
    v = (map && map[VID]) || null;
  }
  load();

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(x) { if (x === '' || x == null) return null; var n = Number(x); return isFinite(n) ? n : null; }
  function idOf(h) { var m = String(h || '').match(/\/contents\/(\d+)/); return m ? m[1] : ''; }
  function sidesOf(x) { return (ja && x.sj && x.sj.length === x.s.length ? x.sj : x.s) || []; }
  function side(s) { return s.length > 3 ? s[0] + ' +' + (s.length - 1) : s.join(' & '); }
  function eventOf(x) { return (ja ? x.ej : x.e) || ''; }
  // The show's name in English: the sheet keeps one name, often with a Japanese subtitle (〜しらんけどスターダム〜).
  // In English the Japanese parts are left out; in Japanese the name is shown whole.
  function showName(x) {
    var n = String((x && x.sh) || '');
    if (ja) return n;
    n = n.replace(/[〜～~][^〜～~]*[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f][^〜～~]*[〜～~]/g, ' ')
      .replace(/[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]+/g, ' ')
      .replace(/\s+/g, ' ').replace(/[\s·\-–:]+$/, '').trim();
    return n;
  }
  function matchLabel(x, total) {
    var n = num(x.n);
    if (n == null) return '';
    if (n === 0) return ja ? 'ダークマッチ' : 'Dark match';
    var t = total ? num(x.t) : null;
    return ja ? '第' + n + '試合' + (t ? '（全' + t + '試合）' : '') : 'Match ' + n + (t ? ' of ' + t : '');
  }
  function dateText(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    if (!m) return '';
    if (ja) return m[1] + '年' + (+m[2]) + '月' + (+m[3]) + '日';
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }
  // One line of names, "A & B vs C & D"; big matches use team names when every side has one.
  function namesLine(x) {
    var s = sidesOf(x), tn = ja ? (x.tnj || x.tn) : x.tn;
    return s.map(function(sd, i) { return tn && tn[i] ? tn[i] : side(sd); });
  }

  // ---- bell time and seeking
  function target() { var b = v ? num(v.bl) : null; return b == null ? null : Math.max(0, b - LEAD); }
  function endMark() { return v ? num(v.ed) : null; }
  function mode() { try { return JSON.parse(H.bellInfo()).idx || 0; } catch (e) { return 0; } }
  function state() {
    var s = (window.__tvPlayState ? window.__tvPlayState() : '0|1').split('|');
    return { t: parseFloat(s[0]) || 0, paused: s[1] === '1' };
  }
  function seekTo(t) { try { if (window.__tvPlayerCmd) window.__tvPlayerCmd('seekto', t); } catch (e) {} }
  function card(spec) { try { H.scopeCard(spec ? JSON.stringify(spec) : ''); } catch (e) {} }

  window.__tvScopeHasBell = function() { return target() != null; };

  // ---- the card on the video
  var phase = 'wait', startAt = 0, until = 0, upHref = '', upAt = 0, samples = [];
  var SKIP_MS = 8000, INTRO_MS = 10000, UP_MS = 5000;
  function matchCard(hint, extra) {
    var n = namesLine(v);
    var o = { eb: matchLabel(v, true) || 'StarScope', title: n.length ? n[0] + (n.length > 1 ? '\nvs ' + n.slice(1).join(' vs ') : '') : '', sub: eventOf(v), hint: hint || '', pos: 'left' };
    for (var k in extra) o[k] = extra[k];
    return o;
  }
  window.__tvScopeBell = function() {
    var t = target();
    if (t == null) return false;
    seekTo(t);
    if (phase === 'offer' || phase === 'skipped' || phase === 'intro' || phase === 'wait') { card(null); phase = 'watch'; }
    return true;
  };
  function goNext() {
    card(null); phase = 'gone';
    if (!(window.__tvGoNeighbor && window.__tvGoNeighbor(1)) && upHref) location.href = upHref;
  }
  window.__tvScopeKey = function(k) {
    if (k === 'ok') {
      if (phase === 'offer') { seekTo(target()); card(null); phase = 'watch'; }
      else if (phase === 'skipped') { seekTo(0); card(null); phase = 'watch'; }
      else if (phase === 'upnext') goNext();
    } else if (k === 'back' && phase === 'upnext') { card(null); phase = 'stayed'; }
  };
  function upCard() {
    var nid = idOf(upHref), nv = (map && map[nid]) || null, left = Math.max(0, Math.ceil((upAt - Date.now()) / 1000));
    var title = '', sub = '', lab = '';
    if (nv) {
      var n = namesLine(nv);
      title = n.length ? n[0] + (n.length > 1 ? '\nvs ' + n.slice(1).join(' vs ') : '') : '';
      lab = matchLabel(nv, true);
      sub = num(nv.bl) != null ? (ja ? 'ゴングの8秒前から' : 'Starts 8 s before the bell') : (ja ? 'ゴングの時間はまだありません · 最初から再生' : 'No bell time yet · plays from the start');
    } else {
      var a = document.querySelector('.tv-related-row a.tv-card[href*="/contents/' + nid + '"]');
      title = a ? (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90) : (ja ? '次の動画' : 'Next video');
      sub = ja ? 'StarScope未登録 · 最初から再生' : 'Not logged · plays from the start';
    }
    card({
      eb: (ja ? '次の試合' : 'Up next') + (lab ? ' · ' + lab : '') + ' · ' + left + (ja ? '秒' : ' s'),
      title: title, sub: sub,
      hint: ja ? 'OK 今すぐ再生   ·   戻る このまま' : 'OK  Play now   ·   Back  Stay here',
      hintPage: ja ? '戻る このまま' : 'Back  Stay here',
      bar: Math.round((upAt - Date.now()) / UP_MS * 1000), pos: 'right', page: true, ok: true, back: true
    });
  }
  function tick() {
    if (!v) return;
    var st = state(), now = Date.now();
    if (phase === 'wait') {
      if (st.t <= 0.3) return;   // not playing yet
      // Only a video that really starts from the beginning: watch the first 2 s of playback, since a video that
      // resumes where you left off can report a moment at 0:00 before it moves to its place.
      samples.push(st.t);
      if (samples.length < 4) return;
      startAt = Math.min.apply(null, samples);
      var f = document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]'), at = /#t=(\d+)/.exec((f && f.src) || '');
      var tg = target(), fresh = Math.max.apply(null, samples) < 15 && !(at && +at[1] > 0);
      if (fresh && tg != null && tg > startAt + 3) {
        if (mode() >= 1) {
          seekTo(tg); phase = 'skipped'; until = now + SKIP_MS;
          card(matchCard(ja ? '入場をスキップしました · OKで入場を見る' : 'Entrances skipped · OK to watch them', { bar: 1000, ok: true }));
        } else {
          phase = 'offer';
          card(matchCard(ja ? 'OK · 入場をスキップ' : 'OK · Skip entrance', { ok: true }));
        }
      } else if (fresh) {
        phase = 'intro'; until = now + INTRO_MS; card(matchCard(''));
      } else phase = 'watch';
      return;
    }
    if (phase === 'skipped') {
      if (now >= until) { card(null); phase = 'watch'; }
      else card(matchCard(ja ? '入場をスキップしました · OKで入場を見る' : 'Entrances skipped · OK to watch them', { bar: Math.round((until - now) / SKIP_MS * 1000), ok: true }));
      return;
    }
    if (phase === 'offer') { if (st.t >= target()) { card(null); phase = 'watch'; } return; }
    if (phase === 'intro') { if (now >= until) { card(null); phase = 'watch'; } return; }
    if (phase === 'watch') {
      var end = endMark(), b = v ? num(v.bl) : null;
      if (mode() === 2 && end != null && end > (b || 0) && st.t >= end && st.t < end + 120) {
        upHref = window.__tvNextHref ? window.__tvNextHref() : '';
        if (!upHref) { phase = 'done'; return; }
        phase = 'upnext'; upAt = now + UP_MS; upCard();
      }
      return;
    }
    if (phase === 'upnext') { if (now >= upAt) goNext(); else upCard(); }
  }
  setInterval(tick, 500);

  // ---- the title above the player (drawn by the page's title bar, see playerPageJs)
  var TEL = '<svg width="22" height="22" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="currentColor"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="currentColor"/><path d="M33 12.5H40V27.5H33Z" fill="currentColor"/><ellipse cx="40" cy="20" rx="4.5" ry="8.5" fill="#0B1118" stroke="currentColor" stroke-width="1.4"/></g><path fill="#F4C242" d="M50.5 -13Q50.5 -4.5 59 -4.5Q50.5 -4.5 50.5 4Q50.5 -4.5 42 -4.5Q50.5 -4.5 50.5 -13Z"/><path d="M23 25L14 45M25 25L34 45M24 25V44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
  var st = document.createElement('style');
  st.textContent = [
    '#tv-player-bar.tv-pb-scope .tv-pb-bar{height:70px;}',
    '#tv-player-bar .tv-sc-hd{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:6px;}',
    '#tv-player-bar .tv-sc-eb{font:800 13px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#F4C242;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-player-bar .tv-sc-vs{color:#F4C242;font-size:22px;margin:0 6px;}',
    '#tv-player-bar .tv-sc-tags{flex:0 0 auto;display:flex;gap:10px;align-items:center;}',
    '#tv-player-bar .tv-sc-tag{padding:7px 14px;border:2px solid #2A323C;border-radius:20px;font:700 15px Arial,Helvetica,sans-serif;color:#C9D2DC;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-player-bar .tv-sc-brand{display:flex;align-items:center;gap:8px;font:800 13px Arial,Helvetica,sans-serif;letter-spacing:1px;color:#F4C242;}',
    '#tv-player-bar .tv-sc-brand svg{color:#FFFFFF;}',
    // The card row (2.65.0)
    '.tv-related-row a.tv-card.tv-sc-card > div:first-child{position:relative;}',
    '.tv-sc-no{position:absolute;left:10px;top:10px;padding:4px 10px;border-radius:4px;background:rgba(11,17,24,0.9);color:#F4C242;font:800 12px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;}',
    '.tv-sc-tg{position:absolute;right:10px;top:10px;padding:4px 10px;border-radius:4px;font:800 12px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;}',
    '.tv-sc-tg.now{background:#FFB347;color:#1A1A1A;}',
    '.tv-sc-tg.next{background:rgba(11,17,24,0.9);color:#F4C242;border:1px solid #F4C242;}',
    '.tv-sc-tg.not{background:#141A22;color:#9AA6B4;border:1px solid #3B4656;}',
    '.tv-related-row a.tv-card .tvsc-host{background:#1A1A1A;}',
    '.tv-sc-meta{margin-left:auto;display:flex;align-items:center;gap:8px;font:700 14px Arial,Helvetica,sans-serif;color:#9AA6B4;}',
    '.tv-sc-meta svg{color:#FFFFFF;}'
  ].join('');
  (document.head || document.documentElement).appendChild(st);

  window.__tvScopeTitle = function() {
    if (!v || !(v.s && v.s.length)) return null;
    var n = namesLine(v);
    var eb = [matchLabel(v, true), showName(v), dateText(v.d), ja ? (v.vnj || v.vn) : v.vn].filter(function(x) { return x; });
    var title = n.map(function(x, i) { return (i ? '<span class="tv-sc-vs">vs</span>' : '') + esc(x); }).join(' ');
    var ev = eventOf(v);
    var html = '<span class="tv-pb-bar"></span><div class="tv-sc-hd">' + (eb.length ? '<span class="tv-sc-eb">' + esc(eb.join(' · ')) + '</span>' : '') +
      '<span class="tv-pb-title">' + title + '</span></div><div class="tv-sc-tags">' + (ev ? '<span class="tv-sc-tag">' + esc(ev) + '</span>' : '') +
      '<span class="tv-sc-tag tv-sc-brand">' + TEL + 'STARSCOPE</span></div>';
    return { key: VID + '|' + (ja ? 'ja' : 'en') + '|' + ((v.x && v.x.u) || '') + '|' + eb.join('|') + '|' + n.join('|'), html: html };
  };

  // ---- the row under the player: The card, when the show is in StarScope
  var rowDone = false, scrolled = false;
  function sameShow(x) { return x && (v.sid ? String(x.sid || '') === String(v.sid) : (x.d && x.d === v.d)); }
  function decorate() {
    if (!v || !map) return;
    var row = document.querySelector('.tv-related-row');
    if (!row) return;
    var cards = Array.prototype.filter.call(row.querySelectorAll('a.tv-card'), function(a) { return !a.classList.contains('tv-rev-tile') && idOf(a.getAttribute('href')); });
    if (!cards.length) return;
    var logged = cards.filter(function(a) { return sameShow(map[idOf(a.getAttribute('href'))]); });
    var onSet = /^\/set\//.test(location.pathname);
    if (logged.length < (onSet ? 1 : 2)) return;
    var nextId = idOf(window.__tvNextHref ? window.__tvNextHref() : '');
    var h2 = row.querySelector('h2');
    if (h2 && !h2.__tvsc) {
      h2.__tvsc = true;
      var barEl = h2.firstElementChild, nameEl = h2.children[1];
      var show = showName(v) || (nameEl ? nameEl.textContent : '');
      var total = num(v.t) || cards.length;
      if (nameEl) { nameEl.textContent = show; nameEl.classList.add('notranslate'); nameEl.setAttribute('translate', 'no'); }
      var more = document.createElement('span');
      more.style.cssText = 'color:#9AA6B4;font-weight:400;margin-left:10px;';
      more.textContent = ja ? '· 試合順' : '· The card';
      h2.appendChild(more);
      var meta = document.createElement('span');
      meta.className = 'tv-sc-meta notranslate';
      meta.setAttribute('translate', 'no');
      meta.innerHTML = TEL + esc(ja ? '全' + total + '試合 · 大会の順番 · ' + logged.length + '試合登録済み' : total + ' matches · show order · ' + logged.length + ' logged');
      h2.appendChild(meta);
      if (!barEl) h2.insertBefore(document.createElement('span'), h2.firstChild);
    }
    cards.forEach(function(a) {
      var id = idOf(a.getAttribute('href')), x = map[id], ok = sameShow(x);
      var key = id + '|' + (id === nextId ? 'n' : '') + '|' + (ok ? 'y' : 'n');
      if (a.__tvsc === key) return;
      a.__tvsc = key;
      var thumb = a.children[0], text = a.children[1];
      if (!thumb || !text) return;
      a.classList.add('tv-sc-card');
      Array.prototype.forEach.call(thumb.querySelectorAll('.tv-sc-no,.tv-sc-tg'), function(el) { el.remove(); });
      var tag = id === VID ? ['now', ja ? '再生中' : 'Now playing'] : (id === nextId ? ['next', ja ? '次の試合' : 'Up next'] : (!ok ? ['not', ja ? '未登録' : 'Not logged'] : null));
      var lab = ok ? matchLabel(x, false) : '';
      thumb.insertAdjacentHTML('beforeend', (lab ? '<span class="tv-sc-no notranslate" translate="no">' + esc(lab) + '</span>' : '') +
        (tag ? '<span class="tv-sc-tg ' + tag[0] + ' notranslate" translate="no">' + esc(tag[1]) + '</span>' : ''));
      if (ok && window.__tvStarCard) {
        // The same StarScope card as on the StarScope pages (assets/starcards.js), less the date: the page has it.
        var y = {}; for (var k in x) y[k] = x[k];
        y.d = '';
        text.removeAttribute('style');
        text.className = 'tvsc-host';
        text.innerHTML = window.__tvStarCard.html(y);
      } else if (!ok) a.style.opacity = '0.85';
    });
    // Open the row at the match that is playing (only while nothing in the row has focus).
    if (!scrolled) {
      var cur = cards.filter(function(a) { return idOf(a.getAttribute('href')) === VID; })[0], grid = row.querySelector('.tv-grid-row');
      if (cur && grid && !row.contains(document.activeElement)) { grid.scrollLeft = Math.max(0, cur.offsetLeft - grid.offsetLeft - 10); scrolled = true; }
    }
    rowDone = true;
  }
  var tries = 0, rowTimer = setInterval(function() { tries++; decorate(); if (tries > 40) clearInterval(rowTimer); }, 700);

  window.__tvScopeUpdate = function() {
    load();
    try { if (window.__tvPlayerTitle) window.__tvPlayerTitle(); } catch (e) {}
    decorate();
  };
})();
