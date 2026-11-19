(function(){
  // StarScope card check (2.83.0, private builds with StarScope logging): /mypage?tvscope=check&set=<set id>.
  // Log a show's card from its thumbnails and line-ups, without playing anything. The show page is read once (one
  // request, kept for a day); each match's own page is read one at a time as you reach it, at least 2 s apart, and
  // kept for the visit. Nothing is sent to the sheet's watch history: reading a page here is not watching it.
  // Confirm saves the match through the logger (assets/indexpanel.js) as a "thumb" entry: people and sides, no bell
  // times. Edit details and Add result open the logger itself for that match.
  if (window.__tvCardCheck) return;
  if (location.pathname !== '/mypage') return;
  var Q = null; try { Q = new URLSearchParams(location.search); } catch (e) { return; }
  if (!Q || Q.get('tvscope') !== 'check') return;
  var SET = String(Q.get('set') || '').replace(/\D/g, ''), FROM = String(Q.get('from') || 'next');
  if (!SET || !window.AndroidHost || !AndroidHost.indexSync) return;
  window.__tvCardCheck = true;

  var ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  var T = ja ? {
    head: 'カードチェック', loading: '大会ページを読み込み中…', notRead: 'このページを読めませんでした', retry: 'もう一度',
    match: '第', of: '試合 / 全', matchEn: '', reading: '試合ページを読み込み中…', waiting: '順番に読み込みます',
    people: '選手', side: 'サイド', show: '大会', matchInfo: '試合', date: '日付', venue: '会場', place: '試合順', kind: '試合形式',
    sugg: 'タイトルからの候補', none: 'なし', unknown: '未登録',
    confirm: '確認して次へ ▼', edit: '詳細を編集', result: '結果と評価を追加', watch: 'この試合を見る', skip: 'スキップ ▼', next: '次の試合 ▼',
    loggedThumb: 'サムネイルから登録済み', loggedWatched: '視聴して登録済み', savedNow: '登録しました',
    watched: '視聴済み', plays: '回再生', last: '最終', notLogged: '未登録', notWatched: '未視聴',
    hintMove: '前の試合 / 次の試合', hintPress: '選ぶ', hintBack: '戻る',
    doneHead: '大会の登録が完了', doneSub: 'すべての試合がSTARSCOPEに入りました', dThumb: 'サムネイルと出場選手から登録', dWatched: '視聴して登録済み（変更なし）',
    dBell: 'ゴングの時間は視聴時に追加できます（次に登録 › ゴング未記録）', nextShow: '次の大会へ', logShows: '大会を登録', shows: '大会一覧', stay: 'このまま見る',
    noLineup: '出場選手が読み取れませんでした。詳細を編集で追加できます。', comment: 'コメント映像（対象外）', saving: '保存中…', siteT: 'サイトの題名', team: 'タッグチーム', faction: 'ユニット',
    endHead: 'カードの最後', endSub: '各試合を確認したら、まとめて登録できます。', eReady: '登録できます', eLogged: '登録済み', eAttn: '確認が必要', eUnread: '未読込（登録時に読み込み）',
    allBtn: 'すべて登録', allRun: '登録中', stop: '止める', first: '確認が必要な試合へ', back: '最初の試合へ', endNext: 'カードの最後へ ▼',
    vWarn: '会場がまだ設定されていません。上の会場で設定できます。', skipped: '確認が必要なためスキップ',
    vHead: '会場', vSet: '大会に設定済み', vLib: 'ライブラリと一致', vNone: 'ライブラリにありません', vTr: '翻訳して追加', vPick: 'リストから選ぶ', vChange: '変更',
    vSaveNew: '新しい会場として保存', vCancel: 'キャンセル', vTyping: '会場名を入力', vSaving: '保存中…', vSaved: '大会のすべての試合に設定しました', vTrans: '翻訳中…', vUse: 'この会場にする'
  } : {
    head: 'CARD CHECK', loading: 'Reading the show page…', notRead: "Couldn't read this page", retry: 'Try again',
    match: 'Match ', of: ' of ', reading: 'Reading the match page…', waiting: 'Read one at a time',
    people: 'People', side: 'Side', show: 'Show', matchInfo: 'Match', date: 'Date', venue: 'Venue', place: 'Match order', kind: 'Match type',
    sugg: 'Suggested', none: 'None', unknown: 'not in the library',
    confirm: 'Confirm & next ▼', edit: 'Edit details', result: 'Add result & rating', watch: 'Watch this match', skip: 'Skip ▼', next: 'Next match ▼',
    loggedThumb: 'Logged from thumbnail', loggedWatched: 'Logged while watching', savedNow: 'Logged',
    watched: 'Watched', plays: 'plays', last: 'last', notLogged: 'not logged', notWatched: 'Not watched',
    hintMove: 'Previous / next match', hintPress: 'Choose', hintBack: 'Back',
    doneHead: 'Show logged', doneSub: 'All matches on this card are in StarScope', dThumb: 'logged from thumbnails and line-ups', dWatched: 'already logged while watching, left as it was',
    dBell: "Bell times are added when you watch; they're in Log next.", nextShow: 'Next show to log', logShows: 'Log a show', shows: 'Shows', stay: 'Stay here',
    noLineup: 'No line-up could be read. Edit details to add the wrestlers.', comment: 'Comment clip (skipped)', saving: 'Saving…', siteT: 'Site title', team: 'Team', faction: 'Faction',
    endHead: 'End of the card', endSub: "Checked them all? Confirm the ready ones in one go.", eReady: 'ready', eLogged: 'logged', eAttn: 'needs a look', eUnread: 'not read yet (read as it is confirmed)',
    allBtn: 'Confirm all', allRun: 'Confirming', stop: 'Stop', first: 'Go to the first that needs a look', back: 'Back to match 1', endNext: 'End of the card ▼',
    vWarn: "The show's venue isn't set yet. Set it in the Venue line above.", skipped: 'skipped, needs a look',
    vHead: 'Venue', vSet: 'set for the show', vLib: 'matched in the library', vNone: 'not in the library', vTr: 'Translate & add', vPick: 'Pick from list', vChange: 'Change',
    vSaveNew: 'Save as a new venue', vCancel: 'Cancel', vTyping: 'Type a venue name', vSaving: 'Saving…', vSaved: 'Set for every match on this show', vTrans: 'Translating…', vUse: 'Use this venue'
  };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var GAP = 2000, SET_KEY = 'tvCcSet' + SET, SET_AGE = 86400000, REC_KEY = 'tvCcRec';
  var TEL = '<svg width="34" height="34" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="#fff"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="#fff"/><path d="M33 13 L45 9 L45 31 L33 27 Z" fill="#fff"/></g><path d="M22 27 L14 46 M24 27 L24 46 M26 27 L34 46" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M52 2 L53.6 6.4 L58 8 L53.6 9.6 L52 14 L50.4 9.6 L46 8 L50.4 6.4 Z" fill="#F4C242"/></svg>';

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ssGet(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function dateText(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    if (!m) return '';
    if (ja) return m[1] + '年' + (+m[2]) + '月' + (+m[3]) + '日';
    var w = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
    return DAY[w] + ' ' + (+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + m[1];
  }
  function shortDate(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? '' : (ja ? (d.getMonth() + 1) + '月' + d.getDate() + '日' : d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear()); }
  function isComment(t) { return /コメント|comments?\b/i.test(t) && !/試合|マッチ|match|commentary/i.test(t); }
  function showName(n, date) { return (!ja && window.__tvShowName) ? window.__tvShowName.en(n, date, false) : n; }

  // ---- what the TV already knows: the StarScope list (logged, and how) and Log next's watch history
  // The logger clears the TV's copy when it saves; the last one read stays here until the new list arrives.
  var lastMap = null;
  function cardsMap() { var c = lsGet('tvVixCardsV4'); if (c && c.map) lastMap = c.map; return lastMap || {}; }
  var prevUpdate = window.__tvScopeUpdate;
  window.__tvScopeUpdate = function() { try { if (prevUpdate) prevUpdate(); } catch (e) {} if (show && !window.__tvIndexIsOpen) render(); };
  function watchInfo() {
    var s = lsGet('tvVixSuggestV1'), out = {};
    ((s && s.sets) || []).forEach(function(g) { if (String(g.set) === SET) (g.videos || []).forEach(function(v) { out[String(v.id)] = v; }); });
    return out;
  }

  // ---- state
  var show = null;          // { name, date, venue, line, videos: [{ id, t, th }] }
  var cur = 0, recs = {}, saved = {}, err = '', root = null, focusKey = 'confirm', reading = null, lastFetch = 0, queue = [], pumpTimer = 0;
  var kitReady = false, editing = false, savingNow = null;

  // ---- the show page: one request
  function readSetHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var og = doc.querySelector('meta[property="og:title"]'), line = og ? String(og.getAttribute('content') || '').replace(/\s*\|\s*Stardom World\s*$/i, '').trim() : '';
    if (!line) { var h = doc.querySelector('h1, h2'); line = h ? h.textContent.replace(/\s+/g, ' ').trim() : ''; }
    var seen = {}, vids = [];
    Array.prototype.forEach.call(doc.querySelectorAll('a[href*="/set/' + SET + '/contents/"]'), function(a) {
      var m = /\/contents\/(\d+)/.exec(a.getAttribute('href') || '');
      if (!m) return;
      var art = a.closest('article') || a.parentElement, v = seen[m[1]];
      if (!v) { v = seen[m[1]] = { id: m[1], t: '', th: '' }; vids.push(v); }
      if (!v.th) { var bg = art && art.querySelector('[style*="background-image"]'), mm = bg && /url\(['"]?(.*?)['"]?\)/.exec(bg.getAttribute('style') || ''); if (mm) v.th = mm[1]; }
      if (!v.t) { var h3 = art && art.querySelector('h3, .ttl-xs'); v.t = (h3 ? h3.textContent : a.textContent || '').replace(/\s+/g, ' ').trim(); }
    });
    vids = vids.filter(function(v) { return !isComment(v.t); });
    var so = window.__tvSetOrder, ord = so ? so.forSet(SET, vids.map(function(v) { return { id: Number(v.id), t: v.t }; })) : null;
    if (ord && ord.flip) vids.reverse();
    var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+SET, line, null) : { show: line, date: null, venue: null };
    return { line: line, name: sl.show || line, date: sl.date || '', venue: sl.venue || '', videos: vids, t: Date.now() };
  }
  function loadSet() {
    var c = lsGet(SET_KEY);
    if (c && c.videos && c.videos.length && Date.now() - (c.t || 0) < SET_AGE) { show = c; start(); return; }
    render();
    fetch('/set/' + SET, { credentials: 'include' }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function(html) {
      lastFetch = Date.now();
      var s = readSetHtml(html);
      if (!s.videos.length) throw new Error('no matches on the page');
      show = s; lsSet(SET_KEY, s); start();
    }).catch(function(e) { err = T.notRead + ' (' + (e && e.message || e) + ')'; render(); });
  }
  // Logged matches of this show that have no picture yet (saved before 2.84.4): their pictures from the show page we
  // already read, sent once. Nothing more is asked of the site.
  function fillThumbs() {
    var map = cardsMap(), items = show.videos.filter(function(v) { var c = map[v.id]; return c && !c.th && v.th; }).map(function(v) { return { video: v.id, thumb: v.th }; });
    if (!items.length || !window.AndroidHost || !AndroidHost.indexSync) return;
    var prev = window.__tvIndexReply;
    window.__tvIndexReply = function(id, text) {
      if (id !== 'cct1') { if (prev) prev(id, text); return; }
      window.__tvIndexReply = prev;
      try { var r = JSON.parse(text); if (r.ok && r.filled) cardsRefresh(); } catch (e) {}
    };
    try { AndroidHost.indexSync('cct1', JSON.stringify({ action: 'vi_thumbs', items: items })); } catch (e) { window.__tvIndexReply = prev; }
  }
  function start() {
    setTimeout(fillThumbs, 4000);
    // Open on the first match not logged yet.
    var map = cardsMap();
    cur = 0;
    for (var i = 0; i < show.videos.length; i++) if (!map[show.videos[i].id]) { cur = i; break; }
    if (window.__tvIndexKit) window.__tvIndexKit.lib(function(ok) { kitReady = ok; render(); });
    render(); want(cur);
  }

  // ---- match pages: one at a time, at least 2 s apart, only the one on screen and the one after it
  function want(i) {
    var v = show && show.videos[i];
    if (!v || recs[v.id]) { if (v && i === cur) want(cur + 1); return; }
    var c = ssGet(REC_KEY + v.id);
    if (c) { recs[v.id] = c; if (i === cur) { render(); want(cur + 1); } return; }
    if (queue.indexOf(v.id) < 0) queue.push(v.id);
    pump();
  }
  function pump() {
    if (reading || !queue.length) return;
    // Only what is still needed: the match on screen first, then the next one.
    var need = [show.videos[cur], show.videos[cur + 1]].filter(Boolean).map(function(v) { return v.id; });
    queue = queue.filter(function(id) { return need.indexOf(id) >= 0 && !recs[id]; });
    if (!queue.length) return;
    var id = need.filter(function(x) { return queue.indexOf(x) >= 0; })[0];
    var wait = lastFetch + GAP - Date.now();
    if (wait > 0) { if (!pumpTimer) pumpTimer = setTimeout(function() { pumpTimer = 0; pump(); }, wait); return; }
    queue.splice(queue.indexOf(id), 1);
    fetchRec(id, function() {
      if (show.videos[cur] && show.videos[cur].id === id) render();
      want(cur + 1);
      pump();
    });
  }
  function fetchRec(id, done) {
    reading = id;
    lastFetch = Date.now();
    fetch('/set/' + SET + '/contents/' + id, { credentials: 'include' }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var rec = window.__tvVixRead ? window.__tvVixRead(doc, id, SET) : null;
      if (!rec) throw new Error('nothing read');
      recs[id] = rec; ssSet(REC_KEY + id, rec);
    }).catch(function(e) { recs[id] = { failed: String(e && e.message || e) }; }).then(function() { reading = null; done(); });
  }
  // One match page for Confirm all (2.87.0): the same one-at-a-time rule, 2 s apart.
  function readRec(id, done) {
    if (recs[id]) { done(); return; }
    var c = ssGet(REC_KEY + id);
    if (c) { recs[id] = c; done(); return; }
    if (reading) { setTimeout(function() { readRec(id, done); }, 400); return; }
    var wait = lastFetch + GAP - Date.now();
    if (wait > 0) { setTimeout(function() { readRec(id, done); }, wait); return; }
    fetchRec(id, done);
  }

  // ---- what is shown for one match
  // ---- calls to the sheet from card check itself (2.89.0): ids of our own, everything else passed on
  var mine = {}, seq = 0;
  (function() {
    var prev = window.__tvIndexReply;
    window.__tvIndexReply = function(id, text) {
      var f = mine[id];
      if (!f) { if (prev) prev(id, text); return; }
      delete mine[id];
      var r; try { r = JSON.parse(text); } catch (e) { r = { ok: false, error: 'bad reply' }; }
      f(r);
    };
  })();
  function sheet(body, done) {
    var id = 'ccv' + (++seq);
    mine[id] = done;
    try { AndroidHost.indexSync(id, JSON.stringify(body)); } catch (e) { delete mine[id]; done({ ok: false, error: String(e && e.message || e) }); }
  }

  // ---- the show's venue (2.89.0): one line on every match, set once for the whole show.
  // Set: saved to the show in the sheet (vi_show_venue), so every logged match shows it and every match saved after it
  // gets it; the site's spelling becomes the venue's alias, so the next show there needs nothing.
  var pinFocus = false, VEN_KEY = 'tvCcVen' + SET, vs = { mode: 'view', text: '', busy: '', msg: '', err: '' };
  function rawVenue() {
    var raw = show && show.venue || '';
    if (show) show.videos.some(function(v) { var r = recs[v.id], s0 = r && r.shows && r.shows[0]; if (s0 && s0.venue) { raw = s0.venue; return true; } return false; });
    return raw;
  }
  // {id?, name, how: 'set' | 'lib'} or null
  function venueNow() {
    var mineV = lsGet(VEN_KEY);
    if (mineV && mineV.name) return { id: mineV.id, name: mineV.name, how: 'set' };
    var sv = savedVenue();
    if (sv) return { name: sv, how: 'set' };
    var kit = kitReady && window.__tvIndexKit, raw = rawVenue(), m = kit && raw ? kit.venue(raw) : null;
    return m ? { id: m.id, name: m.name, how: 'lib' } : null;
  }
  function hasJa(t) { return /[\u3000-\u9fff\uff00-\uffef]/.test(String(t || '')); }
  function venueLine() {
    var now = venueNow(), raw = rawVenue(), kit = kitReady && window.__tvIndexKit;
    var h = '<div class="vn' + (vs.mode === 'edit' ? ' ed' : '') + '"><div class="vr"><span class="lb">' + esc(T.vHead) + '</span>';
    if (vs.mode === 'edit') {
      h += '<input class="vin" data-k="vin" type="text" autocomplete="off" placeholder="' + esc(T.vTyping) + '" value="' + esc(vs.text) + '">' + btn('vx', T.vCancel) + '</div>';
      if (raw) h += '<div class="vsub">' + esc(raw) + '</div>';
      h += '<div class="vlist">' + venueList() + '</div>';
    } else {
      h += now ? '<span class="vv">' + esc(now.name) + '</span><span class="vk">✓ ' + esc(now.how === 'set' ? T.vSet : T.vLib) + '</span>' + btn('vchg', T.vChange)
        : '<span class="vv bad">' + esc(raw ? '? ' + raw : '–') + '</span>' + (kit ? btn('vpk', T.vPick, !hasJa(raw)) + (hasJa(raw) ? btn('vtr', T.vTr, true) : '') : '');
      h += '</div>';
    }
    if (vs.busy || vs.msg || vs.err) h += '<div class="vmsg' + (vs.err ? ' er' : '') + '">' + esc(vs.err || vs.busy || vs.msg) + '</div>';
    return h + '</div>';
  }
  function venueList() {
    var kit = kitReady && window.__tvIndexKit, list = kit && kit.venues ? kit.venues(vs.text, 4) : [], t = vs.text.trim(), h = '';
    list.forEach(function(v, i) { h += '<button type="button" class="b vo" data-k="vo' + i + '" data-id="' + esc(v.id) + '" data-nm="' + esc(v.name) + '">' + esc(T.vUse + ': ' + v.name) + '</button>'; });
    var exact = list.some(function(v) { return v.name.toLowerCase() === t.toLowerCase(); });
    if (t && !exact) h += btn('vnew', T.vSaveNew + ': ' + t, !list.length);
    return h;
  }
  function venueEdit(text) { vs.mode = 'edit'; vs.text = text || ''; vs.err = ''; vs.msg = ''; focusKey = 'vin'; pinFocus = true; render(); }
  function venueTranslate() {
    var raw = rawVenue();
    vs.busy = T.vTrans; vs.err = ''; render();
    sheet({ action: 'vi_translate', text: raw }, function(r) { vs.busy = ''; venueEdit(r && r.ok && r.text ? String(r.text) : raw); if (!(r && r.ok)) { vs.err = String(r && r.error || 'translate failed'); render(); } });
  }
  function venueSet(id, name) {
    vs.busy = T.vSaving; vs.err = ''; render();
    sheet({ action: 'vi_show_venue', show: SET, venue: id, raw: rawVenue(), name: show.name || '', date: show.date || '' }, function(r) {
      vs.busy = '';
      if (!r || !r.ok) { vs.err = String(r && r.error || 'not saved'); render(); return; }
      lsSet(VEN_KEY, { id: id, name: name, t: Date.now() });
      vs.mode = 'view'; vs.msg = T.vSaved; pinFocus = true;
      focusKey = cur >= show.videos.length ? 'confirmall' : (status(show.videos[cur]) ? 'nextm' : 'confirm');
      if (window.__tvIndexKit && window.__tvIndexKit.reload) window.__tvIndexKit.reload();   // the new alias, for the matches still to save
      cardsRefresh(); render();
    });
  }
  function venueNew(name) {
    var raw = rawVenue(), v = show.videos[Math.min(cur, show.videos.length - 1)];
    vs.busy = T.vSaving; vs.err = ''; render();
    sheet({ action: 'vi_propose', type: 'new_venue', value: name, entity_id: hasJa(raw) ? raw : '', video: v ? v.id : '' }, function(r) {
      if (!r || !r.ok || !r.applied || !r.id) { vs.busy = ''; vs.err = String(r && (r.error || (r.ok ? 'saved for approval' : '')) || 'not saved'); render(); return; }
      var done = function() { venueSet(r.id, name); };
      if (window.__tvIndexKit && window.__tvIndexKit.reload) window.__tvIndexKit.reload(done); else done();
    });
  }
  // The StarScope list after a save (2.88.0): only what changed, one request at a time (assets/starcards.js).
  function cardsRefresh() {
    if (window.__tvCardsRefresh) { window.__tvCardsRefresh(); return; }
    if (window.AndroidHost && AndroidHost.starCards) { try { AndroidHost.starCards('c1', JSON.stringify({ action: 'vi_cards' })); } catch (e) {} }
  }
  function status(v) {
    if (saved[v.id]) return { k: 'saved', label: T.savedNow };
    var c = cardsMap()[v.id];
    if (c) return c.x && c.x.tb ? { k: 'thumb', label: T.loggedThumb, card: c } : { k: 'watched', label: T.loggedWatched, card: c };
    return null;
  }
  // The site's own title for the match, as written (only shown, never saved).
  function siteTitle(rec) { return (ja ? rec.title_ja || rec.title_en : rec.title_en || rec.title_ja) || ''; }
  // The match type StarScope gives it from the people, by the logger's rules (kind() in assets/indexpanel.js) without
  // the stipulations: Singles match, Tag team match, 3-Way Battle… (2.84.2: this row showed the site's title).
  function kindOf(rec) {
    var s = rec.sides_en && rec.sides_en.length >= 2 ? rec.sides_en : (rec.sides_ja || []);
    if (s.length < 2) return '';
    var sizes = s.map(function(x) { return x.length; }), size = Math.max.apply(null, sizes), n = s.length;
    if (n > 2 && n < 5 && size < 4 && sizes.every(function(x) { return x === size; })) return ja ? n + 'WAY' + ['バトル', 'タッグバトル', 'トリオバトル'][size - 1] : n + '-Way ' + ['Battle', 'Tag Battle', 'Trios'][size - 1];
    if (n > 2) return size > 1 ? (ja ? n + 'チーム（各' + size + '人）' : n + ' teams of ' + size) : (ja ? n + 'WAY' : n + '-Way');
    if (sizes[0] !== sizes[1]) return ja ? sizes[0] + '対' + sizes[1] + 'ハンディキャップ' : sizes[0] + '-on-' + sizes[1] + ' handicap';
    if (size <= 1) return ja ? 'シングルマッチ' : 'Singles match';
    if (size === 2) return ja ? 'タッグマッチ' : 'Tag team match';
    return ja ? (size * 2) + '人タッグ' : (size * 2) + '-person tag';
  }
  function peopleHtml(rec) {
    var useEn = rec.sides_en && rec.sides_en.length >= 2, A = useEn ? rec.sides_en : (rec.sides_ja || []), B = useEn ? (rec.sides_ja || []) : [];
    if (A.length < 2) return '<div class="nl">' + esc(T.noLineup) + '</div>';
    var kit = kitReady && window.__tvIndexKit, h = '', date = rec.date || show.date;
    A.forEach(function(names, i) {
      if (i) h += '<div class="vs">VS</div>';
      // The side's team or faction as the logger will pre-fill it (2.86.0).
      var ids = kit ? names.map(function(raw, j) { var o = B[i] && B[i].length === names.length ? B[i][j] : ''; return kit.resolve(raw) || kit.resolve(o); }) : [];
      var grp = kit && kit.side ? kit.side(ids, date) : null;
      h += '<div class="sd">' + (grp ? '<div class="fg">' + esc((grp.kind === 'team' ? T.team : T.faction) + ' · ' + grp.name) + '</div>' : '');
      names.forEach(function(raw, j) {
        var other = B[i] && B[i].length === names.length ? B[i][j] : '';
        var id = kit ? (kit.resolve(raw) || kit.resolve(other)) : '';
        var shown = id ? kit.nameOf(id) : raw, sub = ja ? '' : (other || '');
        h += '<div class="pp' + (id || !kit ? '' : ' bad') + '"><span class="mk">' + (id ? '✓' : (kit ? '?' : '·')) + '</span><span class="pn">' + esc(shown) + (sub && sub !== shown ? '<small>' + esc(sub) + '</small>' : '') +
          (!id && kit ? '<small class="w">' + esc(T.unknown) + '</small>' : '') + '</span></div>';
      });
      h += '</div>';
    });
    return h;
  }
  function row(label, value, cls) { return '<div class="rw"><span class="lb">' + esc(label) + '</span><span class="vl' + (cls ? ' ' + cls : '') + '">' + value + '</span></div>'; }
  function matchHtml(rec, i) {
    var total = show.videos.length, kit = kitReady && window.__tvIndexKit;
    var text = [rec.title_en, rec.title_ja, rec.h1].filter(Boolean).join(' ');
    var sug = kit ? kit.suggest(text) : [];
    var h = row(T.place, esc(ja ? T.match + (i + 1) + T.of + total + '試合' : T.match + (i + 1) + T.of + total));
    h += row(T.kind, esc(kindOf(rec) || '–'));
    h += row(T.sugg, sug.length ? sug.map(function(x) { return '<span class="sg">' + esc(x.label) + '</span>'; }).join('') : '<span class="dim">' + esc(T.none) + '</span>', 'wrap');
    if (siteTitle(rec)) h += row(T.siteT, '<span class="dim">' + esc(siteTitle(rec)) + '</span>', 'wrap');
    return h;
  }
  // The show's venue as the sheet already has it: from a match of this show that is logged (2.84.1).
  function savedVenue() {
    var map = cardsMap(), out = null;
    Object.keys(map).some(function(id) { var c = map[id]; if (String(c.sid) === SET && (c.vn || c.vnj)) { out = ja ? (c.vnj || c.vn) : (c.vn || c.vnj); return true; } return false; });
    return out;
  }
  function showHtml(rec) {
    var kit = kitReady && window.__tvIndexKit, s0 = rec && rec.shows && rec.shows[0];
    var raw = (s0 && s0.venue) || show.venue || '', ven = venueNow();
    var date = (rec && rec.date) || show.date || '';
    return row(T.date, esc(dateText(date) || '–')) + row(T.venue, ven ? esc(ven.name) : (raw ? '? ' + esc(raw) : '–'), 'wrap' + (ven ? '' : (raw ? ' bad' : '')));
  }
  function watchLine(v, st) {
    var w = watchInfo()[v.id];
    if (w) return '<div class="wl on">' + esc(T.watched + ' ' + shortDate(w.last) + ' · ' + (w.views || 1) + ' ' + T.plays + (st ? '' : ' · ' + T.notLogged)) + '</div>';
    if (st && st.k === 'watched') return '<div class="wl on">' + esc(T.loggedWatched) + '</div>';
    return '<div class="wl">' + esc(T.notWatched) + '</div>';
  }
  function squares() {
    return '<div class="sq">' + show.videos.map(function(v, i) {
      var st = status(v), c = st ? (st.k === 'watched' ? 'w' : 't') : '';
      return '<span class="' + c + (i === cur ? ' cur' : '') + '">' + (i + 1) + '</span>';
    }).join('') + '</div>';
  }
  function btn(k, label, on) { return '<button type="button" class="b' + (on ? ' on' : '') + '" data-k="' + k + '">' + esc(label) + '</button>'; }

  var CSS = '#tvcc{position:fixed;inset:0;z-index:99000;background:#0B1118;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#fff;display:flex}' +
    '#tvcc .st{position:relative;flex:0 0 52%;height:100%;overflow:hidden}' +
    '#tvcc .tk{position:absolute;left:48px;right:24px;top:0;transition:transform .25s ease}' +
    '#tvcc .it{margin-bottom:26px;opacity:.38;transition:opacity .2s}#tvcc .it.cur{opacity:1}' +
    '#tvcc .im{width:100%;aspect-ratio:16/9;border-radius:12px;background:#161F2A center/cover no-repeat;border:1px solid #2A323C}' +
    '#tvcc .it .tt{display:flex;align-items:center;gap:12px;margin-top:12px;font:900 24px Arial}#tvcc .it .sb{font:600 16px Arial;color:#C9D2DC;margin-top:6px;line-height:1.5}' +
    '#tvcc .chp{font:800 11px Arial;letter-spacing:1px;text-transform:uppercase;border-radius:20px;padding:3px 9px;white-space:nowrap}' +
    '#tvcc .chp.t,#tvcc .chp.saved{background:#2A2410;color:#F4C242;border:1px solid #6B5A22}#tvcc .chp.w{background:#12261B;color:#7FD3A0;border:1px solid #2E9E5B}#tvcc .chp.r{color:#9AA6B4;border:1px dashed #3B4656}' +
    '#tvcc .pn{flex:1 1 0;min-width:0;padding:22px 48px 70px 8px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box}' +
    '#tvcc .hd{display:flex;align-items:center;gap:12px}#tvcc .wm{font:900 18px Arial;letter-spacing:.06em}#tvcc .wm b{color:#F4C242}#tvcc .hh{font:800 13px Arial;letter-spacing:1px;color:#F4C242}' +
    '#tvcc .sq{margin-left:auto;display:flex;gap:6px}#tvcc .sq span{width:30px;height:22px;border-radius:4px;border:1px dashed #3B4656;color:#5A6472;font:800 11px Arial;display:flex;align-items:center;justify-content:center;box-sizing:border-box}' +
    '#tvcc .sq span.t{background:#2A2410;border:1px solid #6B5A22;color:#F4C242}#tvcc .sq span.w{background:#12261B;border:1px solid #2E9E5B;color:#7FD3A0}#tvcc .sq span.cur{border:2px solid #fff;color:#fff}' +
    '#tvcc .sh{font:600 15px Arial;color:#9AA6B4}' +
    '#tvcc .box{background:#0F151C;border:1px solid #2A323C;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden;flex:1 1 auto}' +
    '#tvcc .wl{font:600 14px Arial;color:#9AA6B4;border:1px solid #2A323C;border-radius:10px;padding:7px 12px}#tvcc .wl.on{color:#7FD3A0;background:#12261B;border-color:#2E9E5B}' +
    '#tvcc .gl{font:800 12px Arial;letter-spacing:1px;text-transform:uppercase;color:#9AA6B4;margin-top:4px}' +
    '#tvcc .fg{font:800 12px Arial;letter-spacing:1px;text-transform:uppercase;color:#F4C242}' +
    '#tvcc .sd{display:flex;flex-direction:column;gap:5px}#tvcc .vs{align-self:center;font:900 13px Arial;letter-spacing:2px;color:#F4C242}' +
    '#tvcc .pp{display:flex;align-items:center;gap:10px;border:1px solid #2A323C;background:#161F2A;border-radius:10px;padding:5px 10px;min-height:40px;box-sizing:border-box}' +
    '#tvcc .pp.bad{border-color:#FFB347;background:#2A1C10}#tvcc .pp .mk{width:24px;height:24px;border-radius:12px;display:flex;align-items:center;justify-content:center;font:900 13px Arial;background:#12261B;color:#7FD3A0;flex:none}' +
    '#tvcc .pp.bad .mk{background:#2A1C10;color:#FFB347;border:1px solid #FFB347}#tvcc .pp .pn{padding:0;display:block;font:700 17px Arial}#tvcc .pp small{display:block;font:600 12px Arial;color:#9AA6B4}#tvcc .pp small.w{color:#FFB347}' +
    '#tvcc .rw{display:flex;align-items:center;gap:12px;border:1px solid #2A323C;background:#161F2A;border-radius:10px;padding:6px 12px;min-height:38px;box-sizing:border-box}' +
    '#tvcc,#tvcc *{word-break:normal!important;overflow-wrap:normal!important}#tvcc .cols .rw .lb{flex-basis:96px}#tvcc .cols .rw .vl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tvcc .cols .rw .vl.wrap{white-space:normal}' +
    '#tvcc .rw .lb{flex:0 0 150px;font:800 11px Arial;letter-spacing:1px;text-transform:uppercase;color:#9AA6B4}#tvcc .rw .vl{flex:1 1 0;font:700 16px Arial;min-width:0}#tvcc .rw .vl.bad{color:#FFB347}' +
    '#tvcc .sg{display:inline-block;margin:2px 6px 2px 0;padding:2px 8px;border-radius:20px;border:1px solid #6B5A22;background:#2A2410;color:#F4C242;font:800 12px Arial}#tvcc .dim{color:#9AA6B4;font-weight:600}' +
    '#tvcc .nl{font:600 15px Arial;color:#9AA6B4;padding:8px 0}' +
    '#tvcc .cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}#tvcc .cols>div{display:flex;flex-direction:column;gap:6px;min-width:0}' +
    '#tvcc .bt{display:flex;flex-wrap:wrap;gap:10px}' +
    '#tvcc .b{appearance:none;height:48px;padding:0 18px;border-radius:10px;border:2px solid #2A323C;background:#161F2A;color:#C9D2DC;font:700 17px Arial;outline:none!important;box-shadow:none!important}' +
    '#tvcc .b.on{background:#FFB347;border-color:#FFB347;color:#1A1A1A}#tvcc .b:focus{border-color:#F4C242!important;color:#fff}#tvcc .b.on:focus{color:#1A1A1A}' +
    '#tvcc .host{flex:1 1 auto;min-height:0}' +
    '#tvcc .ld{font:700 16px Arial;color:#9AA6B4;padding:12px 0}#tvcc .er{font:700 16px Arial;color:#FF7A66;padding:12px 0}' +
    '#tvcc .hn{position:fixed;left:0;right:0;bottom:0;height:52px;display:flex;align-items:center;gap:26px;padding:0 48px;background:rgba(11,17,24,.96);border-top:1px solid #2A323C;font:600 15px Arial;color:#C9D2DC}' +
    '#tvcc .hn i{font-style:normal;display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:26px;padding:0 8px;margin-right:8px;border-radius:6px;border:1px solid #3B4656;background:#161F2A;color:#fff;font:800 13px Arial}' +
    '#tvcc .dn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(11,17,24,.82)}' +
    '#tvcc .dp{width:780px;background:#0F151C;border:2px solid #F4C242;border-radius:16px;padding:32px 40px;display:flex;flex-direction:column;gap:14px}' +
    '#tvcc .dp .t1{font:900 30px Arial}#tvcc .dp .t2{font:600 17px Arial;color:#C9D2DC}#tvcc .dp .ln{display:flex;align-items:center;gap:14px;padding:12px 16px;border:1px solid #2A323C;background:#161F2A;border-radius:12px;font:600 17px Arial;color:#C9D2DC}' +
    '#tvcc .dp .ln b{font:900 26px Arial;width:36px;text-align:center}' +
    '#tvcc .t2e{font:600 15px Arial;color:#C9D2DC}#tvcc .wl.vw{color:#FFB347;border-color:#FFB347;background:#2A1C10}' +
    '#tvcc .el{display:flex;flex-direction:column;gap:5px;overflow:hidden;min-height:0}#tvcc .er2{display:flex;align-items:center;gap:12px;border:1px solid #2A323C;background:#161F2A;border-radius:10px;padding:5px 12px;min-height:36px;box-sizing:border-box}' +
    '#tvcc .er2.now{border-color:#F4C242}#tvcc .er2 b{flex:0 0 26px;font:900 15px Arial;color:#9AA6B4}#tvcc .er2 .tl{flex:1 1 0;min-width:0;font:700 15px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#tvcc .chp.at{background:#2A1C10;color:#FFB347;border:1px solid #FFB347}' +
    '#tvcc .vn{display:flex;flex-direction:column;gap:6px;border:1px solid #2A323C;background:#0F151C;border-radius:12px;padding:8px 12px;flex:none}' +
    '#tvcc .vn .vr{display:flex;align-items:center;gap:12px;min-width:0}#tvcc .vn .lb{flex:none;font:800 11px Arial;letter-spacing:1px;text-transform:uppercase;color:#9AA6B4}' +
    '#tvcc .vn .vv{flex:1 1 auto;min-width:0;font:700 17px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tvcc .vn .vv.bad{color:#FFB347}' +
    '#tvcc .vn .vk{flex:none;font:700 13px Arial;color:#7FD3A0}#tvcc .vn .b{height:40px;font-size:15px;padding:0 14px;flex:none}' +
    '#tvcc .vin{flex:1 1 auto;min-width:0;height:40px;box-sizing:border-box;border-radius:10px;border:2px solid #2A323C;background:#161F2A;color:#fff;font:700 17px Arial;padding:0 12px;outline:none}#tvcc .vin:focus{border-color:#F4C242}' +
    '#tvcc .vsub{font:600 13px Arial;color:#9AA6B4}#tvcc .vlist{display:flex;flex-direction:column;gap:6px;align-items:flex-start}#tvcc .vlist .b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#tvcc .vmsg{font:700 13px Arial;color:#7FD3A0}#tvcc .vmsg.er{color:#FF7A66}';

  function ensure() {
    if (root) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'tvcc'; root.className = 'notranslate'; root.setAttribute('translate', 'no');
    document.body.appendChild(root);
  }
  var doneOpen = false;
  function render(force) {
    if (!document.body) return;
    // While the logger sits in the right panel, nothing here is redrawn under it.
    if (editing && window.__tvIndexIsOpen && !force) return;
    // Typing in the venue box: nothing is redrawn under the keyboard (the list below it updates by itself).
    var ae = document.activeElement; if (!force && ae && ae.classList && ae.classList.contains('vin') && vs.mode === 'edit') return;
    ensure();
    var keep = document.activeElement && root.contains(document.activeElement) ? document.activeElement.getAttribute('data-k') : null;
    if (keep && !pinFocus) focusKey = keep;
    pinFocus = false;
    // Waiting on Skip while the match page was read: once it has been, Confirm is the one to press.
    var wasReady = !!root.querySelector('[data-k="confirm"]');
    if (!show) {
      root.innerHTML = '<div class="pn" style="padding:40px 48px"><div class="hd">' + TEL + '<span class="wm">STAR<b>SCOPE</b></span><span class="hh">' + T.head + '</span></div>' +
        (err ? '<div class="er">' + esc(err) + '</div><div class="bt">' + btn('retry', T.retry, true) + '</div>' : '<div class="ld">' + esc(T.loading) + '</div>') + '</div>';
      focus(); return;
    }
    if (cur >= show.videos.length) { cur = show.videos.length; root.innerHTML = endHtml(); place(); focus(); return; }
    var v = show.videos[cur], rec = recs[v.id], st = status(v);
    // Left: the thumbnails, large, one after another; the current one in full, its neighbours dimmed.
    var h = '<div class="st"><div class="tk">';
    show.videos.forEach(function(x, i) {
      if (i < cur - 1 || i > cur + 1) return;
      var s = status(x), r = recs[x.id], chip = s ? '<span class="chp ' + (s.k === 'watched' ? 'w' : (s.k === 'saved' ? 'saved' : 't')) + '">' + esc(s.label) + '</span>' : (r && !r.failed ? '' : (i === cur ? '<span class="chp r">' + esc(r && r.failed ? T.notRead : T.reading) + '</span>' : ''));
      var title = (r && !r.failed && (ja ? r.title_ja || r.title_en : r.title_en || r.title_ja)) || x.t;
      var line = '';
      if (i === cur && r && !r.failed) {
        var en = (r.sides_en || []).map(function(sd) { return sd.join(' & '); }).join(' vs '), jp = (r.sides_ja || []).map(function(sd) { return sd.join('&'); }).join(' vs ');
        line = [ja ? jp || en : en || jp, ja ? '' : jp].filter(Boolean).map(esc).join('<br>');
      }
      h += '<div class="it' + (i === cur ? ' cur' : '') + '" data-i="' + i + '"><div class="im"' + (x.th ? ' style="background-image:url(\'' + esc(x.th) + '\')"' : '') + '></div>' +
        '<div class="tt">' + esc(ja ? T.match + (i + 1) + '試合' : T.match + (i + 1)) + ' · ' + esc(title) + chip + '</div>' + (line ? '<div class="sb">' + line + '</div>' : '') + '</div>';
    });
    h += '</div></div>';
    // Right: the show, what's known about this match, and what to do with it.
    var name = showName(show.name, show.date);
    h += '<div class="pn"><div class="hd">' + TEL + '<span class="wm">STAR<b>SCOPE</b></span><span class="hh">' + T.head + '</span>' + squares() + '</div>';
    h += '<div class="sh">' + esc([name, dateText(show.date)].filter(Boolean).join(' · ')) + '</div>';
    if (!editing) h += venueLine();
    if (editing) {
      // The logger's own tabs, here in the right panel (2.84.0); the thumbnail stays where it is.
      root.innerHTML = h + '<div id="tvcc-host" class="host"></div></div><div class="hn"><span><i>BACK</i>' + esc(T.hintBack) + '</span></div>';
      place();
      return;
    }
    h += '<div class="box">' + watchLine(v, st);
    if (st && st.card && window.__tvStarCard) {
      h += '<div class="gl">' + esc(st.label) + '</div><div style="background:#1A1A1A;border-radius:8px;padding:11px 14px 13px">' + window.__tvStarCard.html(st.card) + '</div>';
    } else if (!rec || rec.failed) {
      h += '<div class="' + (rec && rec.failed ? 'er' : 'ld') + '">' + esc(rec && rec.failed ? T.notRead + ' (' + rec.failed + ')' : T.reading) + '</div>';
    } else {
      h += '<div class="gl">' + esc(T.people) + '</div>' + peopleHtml(rec);
      h += '<div class="cols"><div><div class="gl">' + esc(T.matchInfo) + '</div>' + matchHtml(rec, cur) + '</div><div><div class="gl">' + esc(T.show) + '</div>' + showHtml(rec) + '</div></div>';
    }
    h += '</div><div class="bt">';
    var ready = rec && !rec.failed;
    if (st) h += btn('nextm', cur === show.videos.length - 1 ? T.endNext : T.next, true) + (ready || st.card ? btn('edit', T.edit) + btn('result', T.result) : '') + btn('watch', T.watch);
    else h += (ready ? btn('confirm', savingNow === v.id ? T.saving : T.confirm, true) + btn('edit', T.edit) + btn('result', T.result) : '') + btn('watch', T.watch) + btn('skip', cur === show.videos.length - 1 ? T.endNext : T.skip, !ready);
    h += '</div></div>';
    if (ready && !st && !wasReady && (focusKey === 'skip' || focusKey === 'watch')) focusKey = 'confirm';
    h += '<div class="hn"><span><i>▲ ▼</i>' + esc(T.hintMove) + '</span><span><i>OK</i>' + esc(T.hintPress) + '</span><span><i>BACK</i>' + esc(T.hintBack) + '</span></div>';
    if (doneOpen) h += doneHtml();
    root.innerHTML = h;
    place();
    focus();
  }
  // The current thumbnail sits at the same height whichever match it is.
  function place() {
    var tk = root.querySelector('.tk'), it = root.querySelector('.it.cur');
    if (!tk || !it) return;
    var top = it.offsetTop, y = Math.max(0, top) - Math.round((root.clientHeight - 52) * 0.14);
    tk.style.transform = 'translateY(' + (-y) + 'px)';
  }
  function focus() {
    var vin = root && root.querySelector('.vin');
    if (vin) vin.oninput = function() { vs.text = vin.value; var l = root.querySelector('.vlist'); if (l) l.innerHTML = venueList(); };
    if (window.__tvIndexIsOpen) return;
    var scope = doneOpen ? root.querySelector('.dp') : root;
    var el = scope && (scope.querySelector('[data-k="' + focusKey + '"]') || scope.querySelector('.bt .b.on') || scope.querySelector('.b.on') || scope.querySelector('.b'));
    if (el) el.focus({ preventScroll: true });
  }

  // ---- the end of the card (2.87.0): ▼ past the last match. Each match's state, and Confirm all for the ready ones.
  // Ready: its page is read and every name is in the library. Needs a look: its page couldn't be read, no line-up, or
  // a name that isn't known (Confirm would stop on the People step). Not read yet: read when Confirm all reaches it.
  function cls(i) {
    var v = show.videos[i], r = recs[v.id];
    if (status(v)) return 'logged';
    if (!r) return 'unread';
    if (r.failed) return 'attn';
    var useEn = r.sides_en && r.sides_en.length >= 2, A = useEn ? r.sides_en : (r.sides_ja || []), B = useEn ? (r.sides_ja || []) : [];
    if (A.length < 2) return 'attn';
    var kit = kitReady && window.__tvIndexKit;
    if (!kit) return 'unread';
    var bad = A.some(function(names, si) { return names.some(function(raw, j) { var o = B[si] && B[si].length === names.length ? B[si][j] : ''; return !(kit.resolve(raw) || kit.resolve(o)); }); });
    return bad ? 'attn' : 'ready';
  }
  function venueOk() { return !rawVenue() || !(kitReady && window.__tvIndexKit) || !!venueNow(); }
  var batch = null;
  function endHtml() {
    var n = { ready: 0, logged: 0, attn: 0, unread: 0 }, rows = '';
    show.videos.forEach(function(v, i) {
      var k = cls(i), r = recs[v.id], st = status(v), skip = batch && batch.skipped.indexOf(i) >= 0 || (lastRun && lastRun.indexOf(i) >= 0);
      n[k]++;
      var title = (r && !r.failed && (ja ? r.title_ja || r.title_en : r.title_en || r.title_ja)) || v.t;
      var chip = st ? '<span class="chp ' + (st.k === 'watched' ? 'w' : (st.k === 'saved' ? 'saved' : 't')) + '">' + esc(st.label) + '</span>'
        : k === 'ready' ? '<span class="chp w">' + esc(T.eReady) + '</span>' : k === 'attn' ? '<span class="chp at">' + esc(skip ? T.skipped : T.eAttn) + '</span>' : '<span class="chp r">' + esc(T.eUnread) + '</span>';
      rows += '<div class="er2' + (batch && batch.at === i ? ' now' : '') + '"><b>' + (i + 1) + '</b><span class="tl">' + esc(title) + '</span>' + chip + '</div>';
    });
    var todo = n.ready + n.unread;
    var h = '<div class="st"><div class="tk"></div></div><div class="pn"><div class="hd">' + TEL + '<span class="wm">STAR<b>SCOPE</b></span><span class="hh">' + T.head + '</span>' + squares() + '</div>';
    h += '<div class="sh">' + esc([showName(show.name, show.date), dateText(show.date)].filter(Boolean).join(' · ')) + '</div>';
    h += venueLine();
    h += '<div class="box"><div class="gl">' + esc(T.endHead) + '</div><div class="t2e">' + esc(T.endSub) + '</div>' + (venueOk() ? '' : '<div class="wl vw">' + esc(T.vWarn) + '</div>') + '<div class="el">' + rows + '</div></div><div class="bt">';
    if (batch) h += btn('allrun', T.allRun + ' ' + Math.min(batch.done + 1, batch.list.length) + T.of + batch.list.length + '…', true) + btn('stop', T.stop);
    else {
      if (todo) h += btn('confirmall', T.allBtn + ' (' + todo + ')', true);
      if (n.attn) h += btn('firstattn', T.first, !todo);
      h += btn('back', T.back, !todo && !n.attn);
    }
    h += '</div></div><div class="hn"><span><i>▲</i>' + esc(T.hintMove) + '</span><span><i>OK</i>' + esc(T.hintPress) + '</span><span><i>BACK</i>' + esc(T.hintBack) + '</span></div>';
    if (doneOpen) h += doneHtml();
    return h;
  }
  var lastRun = null;
  function confirmAll() {
    var list = [];
    show.videos.forEach(function(v, i) { var k = cls(i); if (k === 'ready' || k === 'unread') list.push(i); });
    if (!list.length) return;
    batch = { list: list, done: 0, skipped: [], saved: 0, at: -1, stop: false };
    focusKey = 'stop'; render(); step();
  }
  function step() {
    var b = batch;
    if (!b) return;
    if (b.stop || b.done >= b.list.length) { endAll(); return; }
    var idx = b.list[b.done], v = show.videos[idx];
    b.at = idx;
    if (status(v)) { b.done++; step(); return; }
    if (!recs[v.id] || (!kitReady && !b.libTried)) {
      render();
      readRec(v.id, function() {
        if (batch !== b) return;
        if (!kitReady && !b.libTried && window.__tvIndexKit) { b.libTried = true; window.__tvIndexKit.lib(function(ok) { kitReady = ok; step(); }); return; }
        step();
      });
      return;
    }
    if (cls(idx) !== 'ready') { b.skipped.push(idx); b.done++; render(); step(); return; }
    render();
    openPanel('card', true, idx, function(res) {
      if (batch !== b) return;
      if (res && res.ok) b.saved++; else b.skipped.push(idx);
      b.done++; render();
      setTimeout(step, 300);
    });
  }
  function endAll() {
    var b = batch; batch = null;
    if (!b) return;
    lastRun = b.skipped.slice();
    if (b.saved) cardsRefresh();
    if (allLogged()) { doneOpen = true; focusKey = 'nextshow'; }
    else focusKey = lastRun.length ? 'firstattn' : 'confirmall';
    render();
  }
  function firstAttn() {
    for (var i = 0; i < show.videos.length; i++) if (cls(i) === 'attn') return i;
    return 0;
  }

  function doneHtml() {
    var n = { t: 0, w: 0 };
    show.videos.forEach(function(v) { var s = status(v); if (s) n[s.k === 'watched' ? 'w' : 't']++; });
    return '<div class="dn"><div class="dp"><div class="t1">' + esc(T.doneHead) + '</div><div class="t2">' + esc(showName(show.name, show.date) + ' · ' + T.doneSub) + '</div>' +
      (n.t ? '<div class="ln"><b style="color:#F4C242">' + n.t + '</b>' + esc(T.dThumb) + '</div>' : '') +
      (n.w ? '<div class="ln"><b style="color:#7FD3A0">' + n.w + '</b>' + esc(T.dWatched) + '</div>' : '') +
      '<div class="t2" style="font-size:15px">' + esc(T.dBell) + '</div>' +
      '<div class="bt">' + btn('nextshow', nextLabel(nextTarget()), true) + btn('logshows', T.logShows) + btn('stay', T.stay) + '</div></div></div>';
  }
  function allLogged() { return show.videos.every(function(v) { return !!status(v); }); }

  function go(i) {
    if (!show || i < 0 || i > show.videos.length || batch) return;
    cur = i;
    if (i === show.videos.length) { focusKey = 'confirmall'; render(); return; }
    focusKey = status(show.videos[cur]) ? 'nextm' : 'confirm';
    render(); want(cur);
  }
  function nextUnlogged(from) {
    for (var i = from + 1; i < show.videos.length; i++) if (!status(show.videos[i])) return i;
    return Math.min(from + 1, show.videos.length);   // past the last match: the end of the card (2.87.0)
  }
  // idx and after (2.87.0): Confirm all saves match idx and hands the result to after(). If the logger has to show
  // itself (a name it can't place), Confirm all stops there and that match is put on screen.
  function openPanel(tab, quick, idx, after) {
    var at = idx == null ? cur : idx, v = show.videos[at], rec = recs[v.id], shown = false;
    if (!window.__tvIndexOpen) return;
    if (!rec || rec.failed) {   // a logged match whose page hasn't been read: the panel still has the sheet's copy
      rec = { id: Number(v.id), set: Number(SET), title_en: v.t, title_ja: '', sides_en: [], sides_ja: [], shows: [], lines: [], thumb: v.th, date: show.date };
    }
    if (!rec.shows || !rec.shows.length) rec.shows = [{ id: Number(SET), show: show.name, venue: show.venue, date: show.date }];
    if (!rec.date) rec.date = show.date;
    if (!rec.thumb) rec.thumb = v.th;
    if (quick) { savingNow = v.id; render(); }
    window.__tvIndexOpen({ set: SET, video: v.id, rec: rec, place: { no: at + 1, total: show.videos.length }, thumb: true, tab: tab, quick: !!quick,
      host: function() { if (after) { batch = null; cur = at; shown = true; } editing = true; render(true); return root.querySelector('#tvcc-host'); },
      done: function(res) {
        editing = false; savingNow = null;
        if (res && res.ok) saved[v.id] = 1;
        if (after && !shown) { after(res); return; }
        if (res && res.ok) {
          cardsRefresh();
          if (allLogged()) { doneOpen = true; focusKey = 'nextshow'; render(); return; }
          if (quick && cur === at) { go(nextUnlogged(at)); return; }
        }
        focusKey = quick ? 'confirm' : (tab === 'finish' ? 'result' : 'edit'); render();
      } });
  }
  // Next show (2.85.0) follows the list card check was opened from:
  //  - a year (y2026): the next older show of that year not fully logged, newest to oldest, from the year's pages the
  //    TV has kept; past the year's last show, the newest show of the year before;
  //  - Watched, not logged (next) or Started: the next show in that list.
  // When the TV doesn't have the next page of a year yet, it opens that year's list on the Log a show tab.
  function setDone(id) {
    var c = lsGet('tvCcSet' + id), map = cardsMap();
    return !!(c && c.videos && c.videos.length && c.videos.every(function(v) { return map[v.id] || saved[v.id]; }));
  }
  function yearList(y) {
    var c = lsGet('tvCcYearV1_' + y);
    if (!c || !c.items) return null;
    var items = c.items.map(function(x) {
      var sl = window.__tvVixSetOf ? window.__tvVixSetOf(+x.set, x.name, y) : { show: x.name, date: '' };
      return { set: String(x.set), name: showName(sl.show || x.name, sl.date), date: sl.date || '' };
    }).sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
    return { items: items, done: !!c.done };
  }
  function nextTarget() {
    var m = /^y(\d{4})$/.exec(FROM);
    if (m) {
      var y = +m[1];
      for (var k = 0; k < 2; k++, y--) {
        var yl = yearList(String(y));
        if (!yl) return { href: '/mypage?tvscope=log&y=' + y, name: String(y) };
        var at = k === 0 ? yl.items.map(function(x) { return x.set; }).indexOf(SET) : -1;
        var nx = yl.items.slice(at + 1).filter(function(x) { return x.set !== SET && !setDone(x.set); })[0];
        if (nx) return { href: '/mypage?tvscope=check&set=' + nx.set + '&from=y' + y, name: nx.name, date: nx.date };
        if (!yl.done) return { href: '/mypage?tvscope=log&y=' + y, name: String(y) };
      }
      return { href: '/mypage?tvscope=log', name: '' };
    }
    var sc = window.__tvScope, list = [];
    try { list = sc ? (FROM === 'started' ? sc.started() : FROM === 'new' && sc.newShows ? sc.newShows() : sc.toLog()) : []; } catch (e) { list = []; }
    var i = list.map(function(x) { return String(x.set); }).indexOf(SET);
    var rest = list.slice(i + 1).concat(list.slice(0, Math.max(i, 0))).filter(function(x) { return String(x.set) !== SET; });
    if (rest[0]) return { href: rest[0].href, name: rest[0].name, date: rest[0].date };
    return { href: '/mypage?tvscope=log', name: '' };
  }
  window.__tvCardCheckNext = function() { return nextTarget(); };   // for checking the rule from the console
  function nextLabel(t) {
    if (!t.name) return T.logShows;
    var d = t.date ? ' · ' + (function(x) { var mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x); return mm ? (ja ? (+mm[2]) + '月' + (+mm[3]) + '日' : (+mm[3]) + ' ' + MON[+mm[2] - 1]) : ''; })(t.date) : '';
    return (ja ? '次へ: ' : 'Next: ') + t.name + d;
  }
  function press(k) {
    if (k === 'retry') { err = ''; loadSet(); return; }
    if (k === 'confirm') return openPanel('card', true);
    if (k === 'edit') return openPanel('card', false);
    if (k === 'result') return openPanel('finish', false);
    if (k === 'watch') { location.href = '/contents/' + show.videos[cur].id; return; }
    if (k === 'skip' || k === 'nextm') { go(Math.min(cur + 1, show.videos.length)); return; }
    if (k === 'confirmall') { confirmAll(); return; }
    if (k === 'vtr') { venueTranslate(); return; }
    if (k === 'vpk' || k === 'vchg') { var raw0 = rawVenue(); venueEdit(k === 'vpk' && !hasJa(raw0) ? raw0 : ''); return; }
    if (k === 'vx') { vs.mode = 'view'; vs.err = ''; pinFocus = true; focusKey = venueNow() ? 'vchg' : (hasJa(rawVenue()) ? 'vtr' : 'vpk'); render(); return; }
    if (k === 'vnew') { if (vs.text.trim()) venueNew(vs.text.trim()); return; }
    if (/^vo\d$/.test(k)) { var o = root.querySelector('[data-k="' + k + '"]'); if (o) venueSet(o.getAttribute('data-id'), o.getAttribute('data-nm')); return; }
    if (k === 'stop') { if (batch) batch.stop = true; return; }
    if (k === 'firstattn') { lastRun = null; go(firstAttn()); return; }
    if (k === 'back') { go(0); return; }
    if (k === 'nextshow') { location.href = nextTarget().href; return; }
    if (k === 'logshows') { location.href = '/mypage?tvscope=log'; return; }
    if (k === 'stay') { doneOpen = false; focusKey = cur >= show.videos.length ? 'back' : 'nextm'; render(); return; }
  }
  window.addEventListener('keydown', function(e) {
    if (e.defaultPrevented || !root || window.__tvIndexIsOpen) return;
    if (document.documentElement.classList.contains('tv-sm-open') || document.getElementById('tv-fp-pop')) return;
    var c = e.keyCode, a = document.activeElement;
    var inVin = a && a.classList && a.classList.contains('vin');
    if (c === 13 || c === 23) {
      if (inVin) return;   // the TV keyboard opens on the venue box
      if (a && root.contains(a) && a.getAttribute('data-k')) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && !(vs.busy && /^v/.test(a.getAttribute('data-k')))) press(a.getAttribute('data-k')); }
      return;
    }
    if (c !== 37 && c !== 38 && c !== 39 && c !== 40) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!show) { focus(); return; }
    // The venue box open: ▲ ▼ move through it (the box, Cancel, the venues, Save as new) instead of changing match.
    var vn = root.querySelector('.vn.ed');
    if (vn && a && vn.contains(a) && (c === 38 || c === 40)) {
      var vf = Array.prototype.slice.call(vn.querySelectorAll('.vin, .b')), vi = vf.indexOf(a), to = vf[vi + (c === 40 ? 1 : -1)];
      if (a.classList.contains('vin') && c === 40) to = vn.querySelector('.vlist .b') || to;
      if (to) to.focus({ preventScroll: true });
      return;
    }
    if (!doneOpen && (c === 38 || c === 40)) { go(cur + (c === 40 ? 1 : -1)); return; }
    var scope = doneOpen ? root.querySelector('.dp') : root, bs = Array.prototype.slice.call(scope.querySelectorAll('.b, .vin')), i = bs.indexOf(a);
    if (i < 0) { focus(); return; }
    if (c === 39 && bs[i + 1]) bs[i + 1].focus({ preventScroll: true });
    else if (c === 37) { if (bs[i - 1]) bs[i - 1].focus({ preventScroll: true }); else if (!doneOpen && window.__tvOpenMenu) window.__tvOpenMenu(); }
  }, true);

  function boot() { ensure(); loadSet(); }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
