(function(){
  // Index panel (private builds with the log address; docs/MATCH_INDEX.md). Opened from the Index button in the bar under
  // the player. Shows who the page says is in the match, each name checked against the approved library in the sheet, so a
  // press of OK confirms it. Only talks to the sheet (AndroidHost.indexSync), never to the video site, and only when opened.
  if (window.__tvIndexPanel) return;
  var U = /^\/(?:set\/([0-9]+)\/)?contents\/([0-9]+)/.exec(location.pathname);
  if (!U || !window.AndroidHost || !AndroidHost.indexSync) return;
  window.__tvIndexPanel = true;
  var LIB_KEY = 'tvVixLibV1', RECENT_KEY = 'tvVixRecentV1', AUTO_KEY = 'tvVixAuto', LIB_AGE = 3600000;
  var ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  var T = ja ? { head: 'この試合を登録', side: 'サイド', add: '+ 選手を追加', addSide: '+ サイド', save: '正しいので保存', next: '保存して次の試合', close: '閉じる',
    resHidden: '結果: 非表示', resShow: '結果', notSet: '未設定', wins: 'の勝ち', draw: '引き分け', nc: 'ノーコンテスト', change: '選手を選ぶ', propose: '新規として提案: ', remove: '削除', moveTo: '移動: ',
    pick: '選手を選ぶ', sug: 'おすすめ', loading: '読み込み中…', noMatch: 'このページから試合を読み取れませんでした。選手を追加できます。', ready: '内容を確認して保存してください。', saving: '保存中…', saved: '保存しました', linked: '同じ試合の別バージョンとしてリンクしました', need: '少なくとも2つのサイドが必要です', unknown: '未登録: ', loaded: '保存済みの内容を表示しています。', proposed: '提案を保存しました', none: '該当なし' }
   : { head: 'INDEX THIS MATCH', side: 'SIDE', add: '+ Add wrestler', addSide: '+ Side', save: 'Looks right, save', next: 'Save and next match', close: 'Close',
    resHidden: 'Result: hidden', resShow: 'Result', notSet: 'Not set', wins: ' wins', draw: 'Draw', nc: 'No contest', change: 'Pick the right name', propose: 'Propose new: ', remove: 'Remove', moveTo: 'Move to ',
    pick: 'Pick a wrestler', sug: 'Suggested', loading: 'Loading…', noMatch: 'No match could be read from this page. You can add wrestlers.', ready: 'Check the names, then save.', saving: 'Saving…', saved: 'Saved', linked: 'Linked as another version of the same match', need: 'A match needs at least two sides', unknown: 'Not in library: ', loaded: 'Showing what was saved.', proposed: 'Proposal added', none: 'Nothing here' };

  var root = null, layer = 'main', state = null, lib = null, rec = null, nameMap = {}, byId = {}, menuFor = null, pick = null, lastFocus = 'save', statusText = '', statusBad = false, seq = 0, cbs = {}, busy = false;

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_-]+/g, ''); }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }

  function call(payload, done) {
    var id = 'x' + (++seq);
    cbs[id] = done;
    try { AndroidHost.indexSync(id, JSON.stringify(payload)); } catch (e) { delete cbs[id]; done({ ok: false, error: String(e) }); }
  }
  window.__tvIndexReply = function(id, text) {
    var f = cbs[id]; delete cbs[id];
    var r; try { r = JSON.parse(text); } catch (e) { r = { ok: false, error: 'bad reply' }; }
    if (f) f(r);
  };

  function setLib(l) {
    lib = l; nameMap = {}; byId = {};
    (l.talent || []).forEach(function(t) { byId[t.id] = t; [t.en, t.ja, t.s].forEach(function(n) { if (n) nameMap[norm(n)] = t.id; }); });
    var merged = {}; (l.merged || []).forEach(function(m) { merged[m[0]] = m[1]; });
    (l.aliases || []).forEach(function(a) { var id = a[1]; while (merged[id]) id = merged[id]; if (byId[id]) nameMap[a[0]] = id; });
  }
  function resolve(raw) { return nameMap[norm(raw)] || ''; }
  function nameOf(id) { var t = byId[id]; return t ? (ja && t.ja ? t.ja : t.en) : id; }

  function fromPage() {
    var useEn = rec.sides_en && rec.sides_en.length >= 2;
    var A = useEn ? rec.sides_en : (rec.sides_ja || []), B = useEn ? (rec.sides_ja || []) : [], roles = (useEn ? rec.roles_en : rec.roles_ja) || [], teams = (useEn ? rec.teams_en : rec.teams_ja) || [];
    return A.map(function(names, i) {
      return { role: roles[i] || '', team: teams[i] || '', people: names.map(function(raw, j) {
        // The other language's line-up, name for name, can settle a spelling the library doesn't know.
        var other = B[i] && B[i].length === names.length ? B[i][j] : '';
        return { id: resolve(raw) || resolve(other), billed: raw };
      }) };
    });
  }
  function fromSaved(r) {
    var sides = [];
    r.participants.forEach(function(p) {
      var i = Number(p.side_no) - 1;
      sides[i] = sides[i] || { role: p.role || '', team: '', people: [] };
      sides[i].people.push({ id: p.talent_id && byId[p.talent_id] ? p.talent_id : '', billed: p.billed_name });
    });
    return sides.filter(Boolean);
  }

  function ensure() {
    if (root) return;
    var st = document.createElement('style');
    st.textContent = [
      '#tvx{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;color:#fff}',
      '#tvx .p{width:1280px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;box-sizing:border-box;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:22px 26px}',
      '#tvx .h{font:800 15px Arial;letter-spacing:.14em;color:#F4C242}',
      '#tvx .t{font:700 22px Arial;margin:8px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#tvx .m{font:600 14px Arial;color:#9AA6B4;margin-bottom:12px}',
      '#tvx .sides{display:flex;gap:12px;overflow:auto;flex:1 1 auto;min-height:150px;padding:3px}',
      '#tvx .c{flex:1 1 0;min-width:220px;background:#121922;border:2px solid #2A323C;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box}',
      '#tvx .l{font:800 12px Arial;letter-spacing:1px;color:#F4C242;display:flex;justify-content:space-between}',
      '#tvx .l em{font-style:normal;color:#9AA6B4}',
      '#tvx button{appearance:none;box-sizing:border-box;background:#161F2A;color:#fff;border:2px solid #2A323C;border-radius:8px;font:700 17px Arial;min-height:44px;padding:6px 12px;text-align:left;outline:none!important;box-shadow:none!important;transform:none!important}',
      '#tvx button:focus{border-color:#F4C242!important;background:#172029!important;color:#fff!important}',
      '#tvx button.bad{color:#FF7A66}',
      '#tvx button.on{background:#FFB347;border-color:#FFB347;color:#1A1A1A}',
      '#tvx button.on:focus{background:#FFB347!important;color:#1A1A1A!important;border-color:#F4C242!important}',
      '#tvx button.ghost{color:#C9D2DC;font-weight:600}',
      '#tvx .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center}',
      '#tvx .s{font:700 15px Arial;color:#C9D2DC;margin-top:12px;min-height:20px}',
      '#tvx .s.bad{color:#FF7A66}',
      '#tvx .ov{position:fixed;inset:0;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center}',
      '#tvx .menu{width:480px;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:8px}',
      '#tvx .pick{width:1240px;max-width:96vw;height:86vh;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:18px;display:flex;flex-direction:column;box-sizing:border-box}',
      '#tvx .ltr{display:flex;flex-wrap:wrap;gap:3px;margin:10px 0}',
      '#tvx .ltr button{min-width:36px;min-height:38px;padding:2px 4px;text-align:center;font-size:15px}',
      '#tvx .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;overflow:auto;padding:3px;align-content:start;flex:1 1 auto}',
      '#tvx .grid small{display:block;font:600 12px Arial;color:#9AA6B4}'
    ].join('\n');
    document.head.appendChild(st);
    root = document.createElement('div');
    root.id = 'tvx'; root.className = 'notranslate'; root.setAttribute('translate', 'no');
    document.body.appendChild(root);
  }

  function chip(k, label, cls, extra) { return '<button type="button" class="tvx-f ' + (cls || '') + '" data-k="' + k + '"' + (extra || '') + '>' + label + '</button>'; }

  function setNext() {
    if (!U[1]) return null;
    var c = document.querySelectorAll('.content-list.js-list-slide, .js-list-slide')[0];
    if (!c) return null;
    var out = [], seen = {};
    Array.prototype.forEach.call(c.querySelectorAll('.content-list-item, .sub-category-list-item'), function(it) {
      if (it.classList.contains('slick-cloned') || it.closest('.slick-cloned')) return;
      var a = it.querySelector('a[href*="/contents/"]'), m = a ? /\/contents\/(\d+)/.exec(a.getAttribute('href')) : null;
      if (!m || seen[m[1]]) return;
      seen[m[1]] = 1; out.push({ id: m[1], href: a.href });
    });
    for (var i = 0; i < out.length - 1; i++) if (out[i].id === U[2]) return out[i + 1].href;
    return null;
  }

  function render() {
    ensure();
    var title = rec ? (rec.title_en || rec.title_ja || rec.h1 || '') : '';
    var show = rec && rec.shows && rec.shows[0] ? rec.shows[0].show : '';
    var h = '<div class="p"><div class="h">' + T.head + '</div><div class="t">' + esc(title) + '</div><div class="m">' + esc([rec && rec.date, show, 'video ' + U[2], rec && rec.version].filter(Boolean).join(' · ')) + '</div><div class="sides">';
    if (state) {
      state.sides.forEach(function(s, i) {
        var tag = s.role === 'champion' ? (ja ? '王者' : 'CHAMPION') : (s.role === 'challenger' ? (ja ? '挑戦者' : 'CHALLENGER') : '');
        h += '<div class="c"><div class="l"><span>' + T.side + ' ' + (i + 1) + '</span><em>' + tag + '</em></div>';
        s.people.forEach(function(p, j) {
          h += chip('p' + i + '_' + j, p.id ? esc(nameOf(p.id)) : '? ' + esc(p.billed), p.id ? '' : 'bad');
        });
        h += chip('a' + i, T.add, 'ghost') + '</div>';
      });
      h += '<div style="display:flex;align-items:flex-start">' + chip('ns', T.addSide, 'ghost') + '</div>';
    }
    h += '</div>';
    if (state) {
      h += '<div class="row">';
      if (!state.resOpen) h += chip('res', T.resHidden, 'ghost');
      else {
        var r = state.result;
        h += chip('r0', T.notSet, !r.type ? 'on' : '');
        state.sides.forEach(function(s, i) { h += chip('rw' + (i + 1), T.side + ' ' + (i + 1) + T.wins, r.type === 'win' && r.side === i + 1 ? 'on' : ''); });
        h += chip('rd', T.draw, r.type === 'draw' ? 'on' : '') + chip('rn', T.nc, r.type === 'nc' ? 'on' : '');
      }
      h += '</div><div class="row">' + chip('save', T.save);
      if (setNext()) h += chip('next', T.next);
      h += chip('close', T.close, 'ghost') + '</div>';
    } else h += '<div class="row">' + chip('close', T.close, 'ghost') + '</div>';
    h += '<div class="s' + (statusBad ? ' bad' : '') + '">' + esc(statusText) + '</div></div>';
    if (layer === 'menu') h += menuHtml();
    if (layer === 'pick') h += pickHtml();
    root.innerHTML = h;
    focusKey(layer === 'main' ? lastFocus : (layer === 'menu' ? 'm0' : (pick.focus || 'first')));
  }

  function menuHtml() {
    var i = menuFor.side, j = menuFor.slot, p = state.sides[i].people[j];
    var h = '<div class="ov"><div class="menu"><div class="h">' + esc(p.id ? nameOf(p.id) : p.billed) + '</div>', n = 0;
    h += chip('m' + (n++), T.change, '', ' data-a="change"');
    if (!p.id) h += chip('m' + (n++), esc(T.propose + p.billed), '', ' data-a="propose"');
    state.sides.forEach(function(s, x) { if (x !== i) h += chip('m' + (n++), T.moveTo + T.side.toLowerCase() + ' ' + (x + 1), '', ' data-a="move" data-to="' + x + '"'); });
    h += chip('m' + (n++), T.moveTo + (ja ? '新しいサイド' : 'a new side'), '', ' data-a="move" data-to="new"');
    h += chip('m' + n, T.remove, '', ' data-a="remove"');
    return h + '</div></div>';
  }

  function firstLetter(t) { var c = norm(t.en || t.id).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; }
  function pickList() {
    var all = (lib.talent || []).slice().sort(function(a, b) { return String(a.en).localeCompare(String(b.en)); });
    if (pick.tab !== '*') return all.filter(function(t) { return firstLetter(t) === pick.tab; });
    var ids = [], add = function(id) { if (byId[id] && ids.indexOf(id) < 0) ids.push(id); };
    (state.onShow || []).forEach(add);
    (load(RECENT_KEY) || []).forEach(add);
    return ids.map(function(id) { return byId[id]; });
  }
  function pickHtml() {
    var h = '<div class="ov"><div class="pick"><div class="h">' + T.pick + (pick.raw ? ' · ' + esc(pick.raw) : '') + '</div><div class="ltr">';
    h += chip('tSUG', T.sug, pick.tab === '*' ? 'on' : '');
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').forEach(function(c) { h += chip('t' + (c === '#' ? 'N' : c), c, pick.tab === c ? 'on' : ''); });
    h += '</div><div class="grid">';
    var L = pickList();
    if (!L.length) h += '<div class="m">' + T.none + '</div>';
    L.forEach(function(t, i) { h += chip('g' + i, esc(t.en) + (t.ja ? '<small>' + esc(t.ja) + '</small>' : ''), '', ' data-id="' + esc(t.id) + '"'); });
    return h + '</div></div></div>';
  }

  function layerRoot() { if (!root) return null; var o = root.querySelector('.ov'); return o || root; }
  function focusKey(k) {
    var r = layerRoot(), el = r.querySelector('[data-k="' + k + '"]');
    if (!el) el = (k === 'first' && r.querySelector('.grid .tvx-f')) || r.querySelector('[data-k="save"]') || r.querySelector('.tvx-f');
    if (el) { el.focus(); try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  }
  function move(dir) {
    var r = layerRoot(), a = document.activeElement;
    if (!r.contains(a) || !a.classList.contains('tvx-f')) { focusKey('save'); return; }
    var A = a.getBoundingClientRect(), ax = A.left + A.width / 2, ay = A.top + A.height / 2, best = null, score = 1e12;
    Array.prototype.forEach.call(r.querySelectorAll('.tvx-f'), function(b) {
      if (b === a) return;
      var B = b.getBoundingClientRect(), dx = B.left + B.width / 2 - ax, dy = B.top + B.height / 2 - ay;
      var main = dir === 'L' ? -dx : dir === 'R' ? dx : dir === 'U' ? -dy : dy, cross = dir === 'L' || dir === 'R' ? Math.abs(dy) : Math.abs(dx);
      if (main < 6) return;
      var s = main + cross * 3;
      if (s < score) { score = s; best = b; }
    });
    if (best) { best.focus(); try { best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  }

  function say(text, bad) { statusText = text; statusBad = !!bad; var s = root && root.querySelector('.s'); if (s) { s.textContent = text; s.className = 's' + (bad ? ' bad' : ''); } }

  function remember(id) { var L = (load(RECENT_KEY) || []).filter(function(x) { return x !== id; }); L.unshift(id); store(RECENT_KEY, L.slice(0, 16)); }

  function press(el) {
    var k = el.getAttribute('data-k');
    if (layer === 'menu') return pressMenu(el);
    if (layer === 'pick') return pressPick(el, k);
    var m;
    lastFocus = k;
    if ((m = /^p(\d+)_(\d+)$/.exec(k))) { menuFor = { side: +m[1], slot: +m[2] }; layer = 'menu'; render(); return; }
    if ((m = /^a(\d+)$/.exec(k))) { pick = { tab: '*', side: +m[1], slot: -1, raw: '' }; layer = 'pick'; render(); return; }
    if (k === 'ns') { state.sides.push({ role: '', team: '', people: [] }); lastFocus = 'a' + (state.sides.length - 1); render(); return; }
    if (k === 'res') { state.resOpen = true; lastFocus = 'r0'; render(); return; }
    if (k === 'r0') { state.result = { type: '', side: 0 }; render(); return; }
    if ((m = /^rw(\d+)$/.exec(k))) { state.result = { type: 'win', side: +m[1] }; render(); return; }
    if (k === 'rd') { state.result = { type: 'draw', side: 0 }; render(); return; }
    if (k === 'rn') { state.result = { type: 'nc', side: 0 }; render(); return; }
    if (k === 'save') return save(null);
    if (k === 'next') return save(setNext());
    if (k === 'close') close();
  }
  function pressMenu(el) {
    var a = el.getAttribute('data-a'), i = menuFor.side, j = menuFor.slot, S = state.sides, p = S[i].people[j];
    layer = 'main';
    if (a === 'change') { pick = { tab: '*', side: i, slot: j, raw: p.id ? '' : p.billed }; layer = 'pick'; }
    else if (a === 'propose') {
      say(T.saving);
      call({ action: 'vi_propose', type: 'new_talent', value: p.billed, video: U[2] }, function(r) { say(r.ok ? T.proposed : String(r.error), !r.ok); });
    } else if (a === 'remove') { S[i].people.splice(j, 1); lastFocus = 'a' + i; }
    else if (a === 'move') {
      var to = el.getAttribute('data-to');
      if (to === 'new') { S.push({ role: '', team: '', people: [] }); to = S.length - 1; } else to = +to;
      S[to].people.push(S[i].people.splice(j, 1)[0]);
      lastFocus = 'p' + to + '_' + (S[to].people.length - 1);
    }
    if (a !== 'propose') nameStatus();
    render();
  }
  function pressPick(el, k) {
    if (k.charAt(0) === 't') {
      var c = k.slice(1); pick.tab = c === 'SUG' ? '*' : (c === 'N' ? '#' : c); pick.focus = k; render(); return;
    }
    var id = el.getAttribute('data-id');
    if (!id) return;
    var S = state.sides[pick.side];
    if (pick.slot < 0) { S.people.push({ id: id, billed: byId[id].en }); lastFocus = 'a' + pick.side; }
    else {
      var p = S.people[pick.slot];
      if (!p.id && p.billed && norm(p.billed)) { state.aliases.push({ raw: p.billed, id: id }); nameMap[norm(p.billed)] = id; }
      p.id = id; lastFocus = 'p' + pick.side + '_' + pick.slot;
    }
    remember(id); layer = 'main'; pick = null; nameStatus(); render();
  }

  function teamFor(s) {
    var ids = s.people.map(function(p) { return p.id; }).filter(Boolean).sort().join('|');
    var t = (lib.teams || []).filter(function(x) { return x.m.slice().sort().join('|') === ids && x.m.length; })[0];
    return t ? t.id : '';
  }
  function factionFor(s) {
    if (!s.team) return '';
    var n = norm(s.team), f = (lib.factions || []).filter(function(x) { return norm(x.en) === n || norm(x.ja) === n; })[0];
    return f ? f.id : '';
  }
  function save(nextHref) {
    if (busy) return;
    var S = state.sides.filter(function(s) { return s.people.length; });
    if (S.length < 2) { say(T.need, true); return; }
    var parts = [], r = state.result, winner = 0;
    S.forEach(function(s, i) {
      if (r.type === 'win' && state.sides[r.side - 1] === s) winner = i + 1;
      var team = teamFor(s), fac = factionFor(s);
      s.people.forEach(function(p, j) { parts.push({ side: i + 1, slot: j + 1, talent_id: p.id, billed: p.billed, role: s.role, team_id: team, faction_id: fac }); });
    });
    var title = (rec.title_en || '') + ' ' + (rec.title_ja || '');
    var show = rec.shows && rec.shows[0];
    busy = true; say(T.saving);
    call({ action: 'vi_save', video: U[2], version: rec.version || 'jp', aliases: state.aliases, participants: parts,
      match: { show_id: show ? show.id : (U[1] || ''), show_name: show ? show.show : '', venue: show ? show.venue : '', date: rec.date, card_no: rec.no, is_dark: rec.no === 0 || /ダイゼロ|Dai Zero/i.test(title), result_type: winner || r.type !== 'win' ? r.type : '', winner_side: winner, level: 1 } },
    function(res) {
      busy = false;
      if (!res.ok) { say(String(res.error || 'not saved'), true); return; }
      state.aliases = [];
      say((res.linked ? T.linked : T.saved) + ' · ' + res.match_id + ' · ' + res.status);
      if (nextHref) { try { sessionStorage.setItem(AUTO_KEY, '1'); } catch (e) {} location.href = nextHref; }
    });
  }

  // The line under the buttons: names still to settle, else what the panel is showing.
  function nameStatus() {
    var missing = [];
    state.sides.forEach(function(s) { s.people.forEach(function(p) { if (!p.id) missing.push(p.billed); }); });
    if (missing.length) { statusText = T.unknown + missing.join(', '); statusBad = true; }
    else { statusText = state.okText; statusBad = false; }
  }
  function begin(saved) {
    var page = rec ? fromPage() : [];
    var showAny = saved && saved.found;
    state = { sides: showAny ? fromSaved(saved) : page, result: { type: '', side: 0 }, resOpen: false, onShow: (saved && saved.onShow) || [], aliases: [] };
    if (showAny && saved.match.result_type) state.result = { type: saved.match.result_type, side: Number(saved.match.winner_side) || 0 };
    if (!state.sides.length) state.sides = [{ role: '', team: '', people: [] }, { role: '', team: '', people: [] }];
    state.okText = showAny ? T.loaded : (page.length ? T.ready : T.noMatch);
    nameStatus();
    lastFocus = 'save';
    render();
  }

  function open() {
    if (window.__tvIndexIsOpen) return;
    window.__tvIndexIsOpen = true;
    if (window.__tvFsCancel) window.__tvFsCancel();
    try { AndroidHost.indexPanel(true); } catch (e) {}
    rec = window.__tvVixRec || null;
    state = null; layer = 'main'; say(T.loading); ensure(); root.style.display = 'flex'; render();
    var cached = load(LIB_KEY);
    function withLib() {
      var show = rec && rec.shows && rec.shows[0];
      call({ action: 'vi_get', video: U[2], show: show ? String(show.id) : '' }, function(r) {
        if (!r.ok) statusText = '';
        begin(r.ok ? r : null);
        if (!r.ok) say(String(r.error), true);
      });
    }
    if (cached && cached.lib && Date.now() - cached.t < LIB_AGE) { setLib(cached.lib); withLib(); return; }
    call({ action: 'vi_lib' }, function(r) {
      if (r.ok) { store(LIB_KEY, { t: Date.now(), lib: r }); setLib(r); withLib(); }
      else if (cached && cached.lib) { setLib(cached.lib); withLib(); }
      else say(String(r.error), true);
    });
  }
  function close() {
    window.__tvIndexIsOpen = false;
    try { AndroidHost.indexPanel(false); } catch (e) {}
    if (root) { root.style.display = 'none'; root.innerHTML = ''; }
    if (window.__tvFocusBar) window.__tvFocusBar('index');
  }
  window.__tvIndexOpen = open;
  // Back: out of the pop-up first, then the panel.
  window.__tvIndexBack = function() {
    if (layer !== 'main') { layer = 'main'; pick = null; render(); } else close();
  };

  // First in line for the keys, so nothing else on the page moves while the panel is up.
  function isOpen() { return !!window.__tvIndexIsOpen; }
  window.addEventListener('keydown', function(e) {
    if (!isOpen()) return;
    var c = e.keyCode;
    e.preventDefault(); e.stopImmediatePropagation();
    if (c === 37) move('L'); else if (c === 39) move('R'); else if (c === 38) move('U'); else if (c === 40) move('D');
    else if ((c === 13 || c === 23) && !e.repeat) { var a = document.activeElement; if (a && a.classList && a.classList.contains('tvx-f')) press(a); }
  }, true);
  window.addEventListener('keyup', function(e) { if (isOpen()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  document.addEventListener('focusin', function(e) { if (isOpen() && root && !root.contains(e.target)) focusKey(layer === 'main' ? lastFocus : 'first'); }, true);

  // "Save and next match": the next page opens the panel once it has read its video.
  var auto = false;
  try { auto = sessionStorage.getItem(AUTO_KEY) === '1'; if (auto) sessionStorage.removeItem(AUTO_KEY); } catch (e) {}
  if (auto) {
    var tries = 0, t = setInterval(function() {
      if (window.__tvVixRec || ++tries > 50) { clearInterval(t); open(); }
    }, 500);
  }
})();
