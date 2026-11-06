(function(){
  // Favorites sync (private builds with the log address; see docs/FAVORITES_SYNC.md). Shares one set of favorites
  // (tvFavV1), show reminders (tvSchedRemV1), PPVs marked bought (tvPpvBoughtV1) and PPVs the app saw play (the app's
  // own ppvOwned setting) between TVs through the private sheet.
  // The saved stores are flattened into one entry per item ("w:<keyword>", "fs:<faction>", "later:<video>", ...).
  // A copy of the last known state (tvFavSyncSnap) shows what changed; changes wait in tvFavSyncQueue until the sheet
  // has them. The app's native code sends the requests and adds the key, so the key never enters the page.
  if (window.__tvFavSync) return;
  var H = window.AndroidHost, on = false;
  try { on = !!(H && H.favSyncOn && H.favSyncOn()); } catch (e) { on = false; }
  var API = { on: on, status: function() { return statusText(); }, sendAll: function(el) { sendAll(el); } };
  window.__tvFavSync = API;
  if (!on) return;

  var FAV = 'tvFavV1', REM = 'tvSchedRemV1', PPV = 'tvPpvBoughtV1';
  var SNAP = 'tvFavSyncSnap', QUEUE = 'tvFavSyncQueue', STATE = 'tvFavSyncState';
  var PULL_EVERY = 60000;

  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function jget(k, def) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function state() { return jget(STATE, {}) || {}; }
  function setState(patch) { var s = state(); for (var k in patch) s[k] = patch[k]; jset(STATE, s); return s; }
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function itemKey(x) { return String((x && (x.id || x.href)) || ''); }
  function copy(x, extra) { var o = {}; for (var k in x) if (k !== 'i') o[k] = x[k]; for (var e in extra) o[e] = extra[e]; return o; }
  function byI(a, b) { return (a.i || 0) - (b.i || 0); }

  // A PPV counts only until its replay window ends (the schedule's replay_end, else 14 days after the show), the same
  // rule My Favorites uses. An expired PPV is not synced, so it drops out of the sheet and off the other TVs too.
  var ends = null;
  function ppvAlive(id) {
    if (!ends) {
      ends = {};
      try {
        (JSON.parse(H.scheduleJson()).events || []).forEach(function(e) {
          if (!e || !e.ppv) return;
          var t = Date.parse(e.ppv.replay_end || ''), st = Date.parse(e.start || '');
          ends[e.id] = isNaN(t) ? (isNaN(st) ? 0 : st + 14 * 86400000) : t;
        });
      } catch (e) {}
    }
    return !!ends[id] && Date.now() < ends[id];
  }
  // ---- the saved stores <-> one entry per item ({key: JSON text of its value})
  function flatten() {
    var out = {}, d = jget(FAV, {}) || {}, fixed = false;
    function put(k, v) { if (k.length <= 300) out[k] = JSON.stringify(v); }
    (d.w || []).forEach(function(x, i) { if (x && x.k) put('w:' + String(x.k).toLowerCase(), { k: x.k, n: x.n, i: i }); });
    (d.fs || []).forEach(function(id, i) { if (id) put('fs:' + id, { id: id, i: i }); });
    (d.t || []).forEach(function(x, i) { if (x && x.id) put('tt:' + x.id, { id: x.id, n: x.n, m: x.m, ms: x.ms, b: x.b, i: i }); });
    ['later', 'm', 's'].forEach(function(kind) { (d[kind] || []).forEach(function(x, i) { if (itemKey(x)) put(kind + ':' + itemKey(x), copy(x, { i: i })); }); });
    (d.pl || []).forEach(function(p, i) {
      if (!p) return;
      if (!p.id) { p.id = rid(); fixed = true; }   // playlists get a lasting id the first time they are synced
      put('pl:' + p.id, { id: p.id, name: p.name, i: i });
      (p.items || []).forEach(function(x, j) { if (itemKey(x)) put('pli:' + p.id + ':' + itemKey(x), copy(x, { i: j })); });
    });
    if (fixed) jset(FAV, d);
    var r = jget(REM, {}) || {}; Object.keys(r).forEach(function(id) { put('rem:' + id, r[id]); });
    // PPVs marked bought, and PPVs this TV has watched (the app's own setting). Expired ones are cleared from this TV too.
    var b = jget(PPV, {}) || {}, bKeep = {}, bGone = 0;
    Object.keys(b).forEach(function(id) { if (ppvAlive(id)) { bKeep[id] = b[id]; put('ppv:' + id, b[id]); } else bGone++; });
    if (bGone) jset(PPV, bKeep);
    var own = {}, oKeep = {}, oGone = 0;
    try { own = JSON.parse((H.ppvOwnedJson && H.ppvOwnedJson()) || '{}') || {}; } catch (e) { own = {}; }
    Object.keys(own).forEach(function(id) { if (ppvAlive(id)) { oKeep[id] = own[id]; put('own:' + id, own[id]); } else oGone++; });
    if (oGone) { try { if (H.ppvOwnedSet) H.ppvOwnedSet(JSON.stringify(oKeep)); } catch (e) {} }
    return out;
  }
  function apply(map) {   // map: {key: value (object)}; writes all three stores, keeping any other favorites fields
    var d = jget(FAV, {}) || {}, ws = [], fs = [], ts = [], L = { later: [], m: [], s: [] }, pls = {}, plis = {}, rem = {}, ppv = {}, own = {};
    Object.keys(map).forEach(function(k) {
      var v = map[k], kind = k.slice(0, k.indexOf(':')), rest = k.slice(k.indexOf(':') + 1);
      if (v == null) return;
      if (kind === 'w') ws.push(v); else if (kind === 'fs') fs.push(v); else if (kind === 'tt') ts.push(v);
      else if (L[kind]) L[kind].push(v);
      else if (kind === 'pl') pls[v.id] = v;
      else if (kind === 'pli') { var pid = rest.slice(0, rest.indexOf(':')); (plis[pid] = plis[pid] || []).push(v); }
      else if (kind === 'rem') rem[rest] = v; else if (kind === 'ppv') { if (ppvAlive(rest)) ppv[rest] = v; } else if (kind === 'own') { if (ppvAlive(rest)) own[rest] = v; }
    });
    d.w = ws.sort(byI).map(function(x) { return { k: x.k, n: x.n }; });
    d.fs = fs.sort(byI).map(function(x) { return x.id; });
    d.t = ts.sort(byI).map(function(x) { return { id: x.id, n: x.n, m: x.m || [], ms: x.ms || [], b: x.b || [] }; });
    d.f = d.fs[0] || '';
    Object.keys(L).forEach(function(kind) { d[kind] = L[kind].sort(byI).map(function(x) { return copy(x, {}); }); });
    d.pl = Object.keys(pls).map(function(id) { return pls[id]; }).sort(byI).map(function(p) {
      return { id: p.id, name: p.name, items: (plis[p.id] || []).sort(byI).map(function(x) { return copy(x, {}); }) };
    });
    jset(FAV, d); jset(REM, rem); jset(PPV, ppv);
    try { if (H.ppvOwnedSet) H.ppvOwnedSet(JSON.stringify(own)); } catch (e) {}
  }
  function parsed(flat) { var o = {}; Object.keys(flat).forEach(function(k) { try { o[k] = JSON.parse(flat[k]); } catch (e) {} }); return o; }

  // ---- requests (through the app)
  var waiting = {};
  window.__tvFavSyncReply = function(id, text) {
    var cb = waiting[id]; if (!cb) return; delete waiting[id];
    var r = null; try { r = JSON.parse(text); } catch (e) { r = { ok: false, error: 'bad reply' }; }
    cb(r || { ok: false, error: 'bad reply' });
  };
  function call(action, payload, cb) {
    var id = rid(), body = { action: action };
    for (var k in payload) body[k] = payload[k];
    waiting[id] = cb;
    setTimeout(function() { if (waiting[id]) { delete waiting[id]; cb({ ok: false, error: 'no reply' }); } }, 45000);
    try { H.favSync(id, JSON.stringify(body)); } catch (e) { delete waiting[id]; cb({ ok: false, error: String(e) }); }
  }
  function done(r) {
    if (r && r.ok) setState({ lastOk: Date.now(), error: '' }); else setState({ error: (r && r.error) || 'failed' });
    paintStatus();
  }

  // ---- local changes -> queue -> sheet
  function diff() {
    var st = state(); if (!st.init) return;
    var cur = flatten(), snap = jget(SNAP, {}) || {}, q = jget(QUEUE, {}) || {}, now = Date.now(), n = 0;
    Object.keys(cur).forEach(function(k) { if (snap[k] !== cur[k]) { q[k] = { key: k, value: JSON.parse(cur[k]), t: now, deleted: false }; n++; } });
    Object.keys(snap).forEach(function(k) { if (!(k in cur)) { q[k] = { key: k, value: null, t: now, deleted: true }; n++; } });
    if (!n) return;
    jset(QUEUE, q); jset(SNAP, cur);
    clearTimeout(pushTimer); pushTimer = setTimeout(push, 3000);
  }
  var pushTimer = null, pushing = false;
  function push() {
    var q = jget(QUEUE, {}) || {}, list = Object.keys(q).slice(0, 500).map(function(k) { return q[k]; });
    if (!list.length || pushing) return;
    pushing = true;
    call('fav_put', { changes: list }, function(r) {
      pushing = false;
      if (r && r.ok) {
        var q2 = jget(QUEUE, {}) || {};
        list.forEach(function(c) { if (q2[c.key] && q2[c.key].t === c.t) delete q2[c.key]; });   // keep anything changed again since
        jset(QUEUE, q2);
        if (Object.keys(q2).length) setTimeout(push, 1000);
      }
      done(r);
    });
  }

  // ---- sheet -> local
  function onFavPage() { return /[?&]tvfav=/.test(location.search); }
  function pull(force) {
    var st = state();
    if (!force && st.lastPull && Date.now() - st.lastPull < PULL_EVERY) return;
    setState({ lastPull: Date.now() });
    var st0 = st;
    call('fav_since', { since: st.init ? (st.seq || 0) : 0 }, function(r) {
      if (!r || !r.ok) { done(r); return; }
      var s = state(), changed = false;
      var full = !s.init || (r.replacedAt && r.replacedAt > (s.seq || 0) && r.replacedAt !== s.sentAt);   // new device, or the base device sent a whole new set
      if (full && s.init && st0.seq) { setState({ init: false }); setState({ lastPull: 0 }); pull(true); return; }   // fetch every row, then take them
      if (full) {
        if (!r.total && !s.init) { setState({ waiting: true }); done(r); return; }   // nothing in the sheet yet: the base device sends first
        var m = {};
        (r.rows || []).forEach(function(x) { if (!x.deleted && x.value != null) m[x.key] = x.value; });
        apply(m);   // a new device takes the sheet's copy in place of its own
        jset(SNAP, flatten()); jset(QUEUE, {});
        setState({ init: true, waiting: false, seq: r.seq });
        changed = true;
      } else if ((r.rows || []).length) {
        var q = jget(QUEUE, {}) || {}, cur = parsed(flatten());
        r.rows.forEach(function(x) {
          if (q[x.key] && q[x.key].t >= x.t) return;   // this TV changed it more recently; its change is on its way
          var before = JSON.stringify(cur[x.key]);
          if (x.deleted || x.value == null) delete cur[x.key]; else cur[x.key] = x.value;
          if (JSON.stringify(cur[x.key]) !== before) changed = true;
        });
        if (changed) { apply(cur); jset(SNAP, flatten()); }
        setState({ seq: r.seq });
      } else setState({ seq: r.seq });
      done(r);
      if (changed && onFavPage()) location.reload();
    });
  }

  // ---- the base device: send everything (Account menu, press OK twice)
  function sendAll(el) {
    if (el && !(el._armed && Date.now() - el._armed < 6000)) {
      el._armed = Date.now();
      el.textContent = T('Press OK again to replace the sheet’s favorites with this TV’s', 'もう一度OKでシートのお気に入りをこのテレビの内容に置き換えます');
      return;
    }
    if (el) { el._armed = 0; el.textContent = T('Sending…', '送信中…'); }
    var flat = flatten(), items = Object.keys(flat).map(function(k) { return { key: k, value: JSON.parse(flat[k]) }; });
    call('fav_replace', { items: items }, function(r) {
      if (r && r.ok) {
        jset(SNAP, flat); jset(QUEUE, {});
        setState({ init: true, waiting: false, seq: r.seq, sentAt: r.seq, lastPull: Date.now() });
        if (el) el.textContent = T('Sent ' + r.count + ' items ✓', r.count + '件を送信しました ✓');
      } else if (el) el.textContent = T('Not sent: ', '送信できません: ') + ((r && r.error) || '');
      done(r);
    });
  }

  // ---- status line on the My Favorites page
  function ago(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return T('just now', 'たった今');
    if (m < 60) return T(m + ' min ago', m + '分前');
    var h = Math.round(m / 60);
    return h < 48 ? T(h + ' h ago', h + '時間前') : T(Math.round(h / 24) + ' days ago', Math.round(h / 24) + '日前');
  }
  function statusText() {
    var st = state();
    if (st.error) return { bad: true, text: T('Not synced: ', '同期できません: ') + st.error };
    if (!st.init) return { bad: false, text: st.waiting ? T('Sync waiting: send favorites from your main TV (Account menu)', '同期待ち: メインのテレビから送信してください（アカウント）') : T('Sync starting…', '同期を開始しています…') };
    var n = Object.keys(jget(QUEUE, {}) || {}).length;
    return { bad: false, text: (st.lastOk ? T('Synced ', '同期: ') + ago(st.lastOk) : T('Synced', '同期済み')) + (n ? T(' · ' + n + ' waiting to send', ' · 未送信 ' + n) : '') };
  }
  function paintStatus() {
    var title = document.getElementById('tv-fp-title');
    if (!title) return;
    var el = document.getElementById('tv-fsync');
    if (!el) {
      el = document.createElement('span');
      el.id = 'tv-fsync';
      el.className = 'notranslate';
      el.setAttribute('translate', 'no');
      el.style.cssText = 'margin-left:16px;font-size:13px;font-weight:700;letter-spacing:0;font-family:Arial,Helvetica,sans-serif;';
      title.appendChild(el);
    }
    var s = statusText();
    el.textContent = s.text;
    el.style.color = s.bad ? '#FF7A66' : '#9AA6B4';
  }

  pull(false);
  setTimeout(function() { diff(); if (Object.keys(jget(QUEUE, {}) || {}).length) push(); }, 2000);   // anything still queued (offline earlier) goes now
  setInterval(diff, 3000);
  setInterval(function() { pull(false); }, PULL_EVERY + 5000);
  setInterval(function() { if (Object.keys(jget(QUEUE, {}) || {}).length) push(); paintStatus(); }, 30000);
  var tries = 0, painter = setInterval(function() { tries++; paintStatus(); if (document.getElementById('tv-fsync') || tries > 20) clearInterval(painter); }, 500);
})();
