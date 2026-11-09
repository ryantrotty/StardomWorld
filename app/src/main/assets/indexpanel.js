(function(){
  // Index panel (private builds with the log address; docs/MATCH_INDEX.md). Opened from the Index button in the bar under
  // the player. Shows who the page says is in the match, each name checked against the approved library in the sheet, so a
  // press of OK confirms it. Only talks to the sheet (AndroidHost.indexSync), never to the video site, and only when opened.
  if (window.__tvIndexPanel) return;
  var U = /^\/(?:set\/([0-9]+)\/)?contents\/([0-9]+)/.exec(location.pathname);
  if (!U || !window.AndroidHost || !AndroidHost.indexSync) return;
  window.__tvIndexPanel = true;
  var LIB_KEY = 'tvVixLibV2', RECENT_KEY = 'tvVixRecentV1', AUTO_KEY = 'tvVixAuto', LIB_AGE = 3600000;
  var ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  var T = ja ? { head: 'この試合を登録', side: 'サイド', add: '+ 選手を追加', addSide: '+ サイド', save: '正しいので保存', next: '保存して次の試合', close: '閉じる',
    resHidden: '結果: 非表示', resShow: '結果', notSet: '未設定', wins: 'の勝ち', draw: '引き分け', nc: 'ノーコンテスト', change: '選手を選ぶ', propose: '新規として提案: ', remove: '削除', moveTo: '移動: ',
    pick: '選手を選ぶ', sug: 'おすすめ', loading: '読み込み中…', noMatch: 'このページから試合を読み取れませんでした。選手を追加できます。', ready: '内容を確認して保存してください。', saving: '保存中…', saved: '保存しました', linked: '同じ試合の別バージョンとしてリンクしました', need: '少なくとも2つのサイドが必要です', unknown: '未登録: ', loaded: '保存済みの内容を表示しています。', proposed: '提案を保存しました', none: '該当なし', tabs: { people: '選手', match: '試合', finish: '決着', moments: '出来事', marks: 'マーク' }, groups: { title: '王座', competition: '大会', round: 'ラウンド', block: 'ブロック', stipulation: '特別ルール', finish: '決着方法', moment: '出来事' }, fall: '勝負を決めた選手', reveal: '結果を表示', bell: 'ゴング', end: '試合終了', clear: '消去', entry: '入場', out: '脱落', noPos: '再生位置を読み取れません', spoil: '結果に関わる項目は「結果を表示」の後に出ます', suggest: '+ 追加を提案', proposeHead: '追加の提案', send: '提案を送る', cancel: 'キャンセル', propHint: 'OKでキーボードを開きます。承認後に選択肢に出ます。', venue: '会場', noVenue: '会場を選ぶ', date: '日付', day: '日', month: '月', year: '年', dateReset: '元の日付に戻す' }
   : { head: 'INDEX THIS MATCH', side: 'SIDE', add: '+ Add wrestler', addSide: '+ Side', save: 'Looks right, save', next: 'Save and next match', close: 'Close',
    resHidden: 'Result: hidden', resShow: 'Result', notSet: 'Not set', wins: ' wins', draw: 'Draw', nc: 'No contest', change: 'Pick the right name', propose: 'Propose new: ', remove: 'Remove', moveTo: 'Move to ',
    pick: 'Pick a wrestler', sug: 'Suggested', loading: 'Loading…', noMatch: 'No match could be read from this page. You can add wrestlers.', ready: 'Check the names, then save.', saving: 'Saving…', saved: 'Saved', linked: 'Linked as another version of the same match', need: 'A match needs at least two sides', unknown: 'Not in library: ', loaded: 'Showing what was saved.', proposed: 'Proposal added', none: 'Nothing here', tabs: { people: 'People', match: 'Match', finish: 'Finish', moments: 'Moments', marks: 'Marks' }, groups: { title: 'TITLE', competition: 'COMPETITION', round: 'ROUND', block: 'BLOCK', stipulation: 'STIPULATION', finish: 'FINISH', moment: 'MOMENTS' }, fall: 'WHO GOT THE FALL', reveal: 'Show result', bell: 'Mark bell', end: 'Mark end', clear: 'Clear', entry: 'Entry', out: 'Out', noPos: 'Could not read the video position', spoil: 'Moments that give away the result appear after Show result', suggest: '+ Propose new', proposeHead: 'PROPOSE AN ADDITION', send: 'Send proposal', cancel: 'Cancel', propHint: 'Press OK on the box to open the keyboard. It appears as a choice once approved in the sheet.', venue: 'VENUE', noVenue: 'Choose a venue', date: 'DATE', day: 'Day', month: 'Month', year: 'Year', dateReset: 'Back to the page date' };

  var TABS = ['people', 'match', 'finish', 'moments', 'marks'], MULTI = { title: 1, stipulation: 1, moment: 1 };
  var SUGGEST = ['title', 'competition', 'round', 'block', 'stipulation', 'moment'], SPOIL = { 'title-change': 1, 'first-title': 1 };
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
      sides[i].people.push({ id: p.talent_id && byId[p.talent_id] ? p.talent_id : '', billed: p.billed_name, entry: p.entry_order || '', elim: p.elim_order || '' });
    });
    return sides.filter(Boolean);
  }

  function ensure() {
    if (root) return;
    var st = document.createElement('style');
    st.textContent = [
      '#tvx{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;color:#fff}',
      '#tvx .p{width:1280px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;box-sizing:border-box;background:rgba(15,21,28,.68);border:2px solid #2A323C;border-radius:12px;padding:22px 26px}',
      '#tvx .h{font:800 15px Arial;letter-spacing:.14em;color:#F4C242}',
      '#tvx .t{font:700 22px Arial;margin:8px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#tvx .m{font:600 14px Arial;color:#9AA6B4;margin-bottom:12px}',
      '#tvx .tabs{display:flex;gap:8px;margin-bottom:10px}',
      '#tvx .body{flex:1 1 auto;min-height:150px;overflow:auto;padding:3px}',
      '#tvx input{box-sizing:border-box;width:100%;height:52px;background:#161F2A;color:#fff;border:2px solid #2A323C;border-radius:8px;font:700 20px Arial;padding:0 12px;outline:none!important}',
      '#tvx input:focus{border-color:#F4C242!important;background:#172029}',
      '#tvx .grp{font:800 12px Arial;letter-spacing:1px;color:#F4C242;margin:10px 0 6px}',
      '#tvx .chips{display:flex;flex-wrap:wrap;gap:8px}',
      '#tvx .sides{display:flex;gap:12px;overflow:auto;flex:1 1 auto;min-height:150px;padding:3px}',
      '#tvx .c{flex:1 1 0;min-width:220px;background:rgba(18,25,34,.55);border:2px solid #2A323C;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box}',
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
      '#tvx .ov{position:fixed;inset:0;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center}',
      '#tvx .menu{width:480px;background:rgba(15,21,28,.86);border:2px solid #2A323C;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:8px}',
      '#tvx .pick{width:1240px;max-width:96vw;height:86vh;background:rgba(15,21,28,.86);border:2px solid #2A323C;border-radius:12px;padding:18px;display:flex;flex-direction:column;box-sizing:border-box}',
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
    var h = '<div class="p"><div class="h">' + T.head + '</div><div class="t">' + esc(title) + '</div><div class="m">' + esc([(state && state.date) || (rec && rec.date), show, 'video ' + U[2], rec && rec.version].filter(Boolean).join(' · ')) + '</div>';
    if (state) h += '<div class="tabs">' + TABS.map(function(t) { return chip('T' + t, T.tabs[t], state.tab === t ? 'on' : ''); }).join('') + '</div>';
    if (state && state.tab !== 'people') h += '<div class="body">' + tabHtml() + '</div>';
    else h += '<div class="sides">';
    if (state && state.tab === 'people') {
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
    if (!state || state.tab === 'people') h += '</div>';
    if (state) {
      if (state.tab === 'people') h += '<div class="row">';
      if (state.tab !== 'people') { /* the result row is on People only */ }
      else if (!state.resOpen) h += chip('res', T.resHidden, 'ghost');
      else {
        var r = state.result;
        h += chip('r0', T.notSet, !r.type ? 'on' : '');
        state.sides.forEach(function(s, i) { h += chip('rw' + (i + 1), T.side + ' ' + (i + 1) + T.wins, r.type === 'win' && r.side === i + 1 ? 'on' : ''); });
        h += chip('rd', T.draw, r.type === 'draw' ? 'on' : '') + chip('rn', T.nc, r.type === 'nc' ? 'on' : '');
      }
      if (state.tab === 'people') h += '</div>';
      h += '<div class="row">' + chip('save', T.save);
      if (setNext()) h += chip('next', T.next);
      h += chip('close', T.close, 'ghost') + '</div>';
    } else h += '<div class="row">' + chip('close', T.close, 'ghost') + '</div>';
    h += '<div class="s' + (statusBad ? ' bad' : '') + '">' + esc(statusText) + '</div></div>';
    if (layer === 'menu') h += menuHtml();
    if (layer === 'pick') h += pickHtml();
    if (layer === 'propose') h += proposeHtml();
    root.innerHTML = h;
    focusKey(layer === 'main' ? lastFocus : (layer === 'menu' ? 'm0' : (layer === 'propose' ? 'in' : (pick.focus || 'first'))));
  }

  // ---- Match, Finish, Moments and Marks tabs
  function listOf(g) { return (lib.lists && lib.lists[g]) || []; }
  function lab(x) { return ja && x.ja ? x.ja : (x.en || x.id); }
  function has(g, v) { return (state.tags[g] || []).indexOf(v) >= 0; }
  function group(g, items) {
    return '<div class="grp">' + T.groups[g] + '</div><div class="chips">' + items.map(function(x) { return chip('c:' + g + ':' + x.id, esc(lab(x)), has(g, x.id) ? 'on' : ''); }).join('') + chip('pr:' + g, T.suggest, 'ghost') + '</div>';
  }
  function people() {
    var out = [];
    state.sides.forEach(function(s, i) { s.people.forEach(function(p, j) { out.push({ p: p, k: i + '_' + j }); }); });
    return out;
  }
  function mmss(v) { v = Math.floor(Number(v) || 0); return Math.floor(v / 60) + ':' + ('0' + (v % 60)).slice(-2); }
  function tabHtml() {
    var h = '';
    if (state.tab === 'match') {
      var comp = (state.tags.competition || [])[0];
      h += '<div class="grp">' + T.venue + '</div><div class="chips">' + chip('vp', state.venue && venueById(state.venue) ? esc(lab(venueById(state.venue))) : (state.venueRaw ? '? ' + esc(state.venueRaw) : T.noVenue), state.venue ? '' : 'bad') + '</div>';
      h += '<div class="grp">' + T.date + '</div><div class="chips" style="align-items:center"><span style="font:800 19px Arial;margin-right:8px">' + esc(state.date || '–') + '</span>';
      [['y', T.year], ['m', T.month], ['d', T.day]].forEach(function(u) { h += chip('d-' + u[0], u[1] + ' −', 'ghost') + chip('d+' + u[0], u[1] + ' +', 'ghost'); });
      if (state.dateManual) h += chip('dr', T.dateReset, 'ghost');
      h += '</div>';
      h += group('title', listOf('title')) + group('competition', listOf('competition')) + group('round', listOf('round'));
      h += group('block', listOf('block').filter(function(b) { return !comp || !b.p || b.p === comp; })) + group('stipulation', listOf('stipulation'));
    } else if (state.tab === 'finish') {
      if (!state.resOpen) h += chip('rev', T.reveal, 'ghost');
      else {
        h += group('finish', listOf('finish'));
        h += '<div class="grp">' + T.fall + '</div><div class="chips">' + people().filter(function(x) { return x.p.id; }).map(function(x) { return chip('f:' + x.p.id, esc(nameOf(x.p.id)), state.fall === x.p.id ? 'on' : ''); }).join('') + '</div>';
      }
    } else if (state.tab === 'moments') {
      h += group('moment', listOf('moment').filter(function(x) { return state.resOpen || !SPOIL[x.id]; }));
      if (!state.resOpen) h += '<div class="m" style="margin-top:12px">' + T.spoil + '</div>' + chip('rev', T.reveal, 'ghost');
    } else if (state.tab === 'marks') {
      h += '<div class="chips">' + chip('mb', T.bell + (state.marks.bell !== '' ? ' · ' + mmss(state.marks.bell) : '')) + (state.marks.bell !== '' ? chip('mbx', T.clear, 'ghost') : '');
      h += chip('me', T.end + (state.marks.end !== '' ? ' · ' + mmss(state.marks.end) : '')) + (state.marks.end !== '' ? chip('mex', T.clear, 'ghost') : '') + '</div>';
      if (state.sides.filter(function(s) { return s.people.length; }).length >= 3) {
        h += '<div class="grp">' + T.entry + ' / ' + T.out + '</div>';
        people().forEach(function(x) {
          h += '<div class="chips" style="margin-bottom:6px;align-items:center"><span style="width:280px;font:700 17px Arial">' + esc(x.p.id ? nameOf(x.p.id) : x.p.billed) + '</span>' + chip('e:' + x.k, T.entry + ': ' + (x.p.entry || '–')) + chip('x:' + x.k, T.out + ': ' + (x.p.elim || '–')) + '</div>';
        });
      }
    }
    return h;
  }
  function suggestTags() {
    var text = [rec && rec.title_en, rec && rec.title_ja, rec && rec.h1].filter(Boolean).join(' ');
    SUGGEST.forEach(function(g) {
      if (g === 'title' && (!/championship|選手権/i.test(text) || /挑戦者決定|next\s*challenger/i.test(text))) return;
      listOf(g).forEach(function(x) {
        if (!x.k) return;
        var hit = false;
        try { hit = new RegExp(x.k, 'i').test(text); } catch (e) {}
        if (hit && !has(g, x.id)) { if (MULTI[g] || !(state.tags[g] || []).length) (state.tags[g] = state.tags[g] || []).push(x.id); }
      });
    });
  }
  function toggle(g, v) {
    var L = state.tags[g] = state.tags[g] || [], i = L.indexOf(v);
    if (MULTI[g]) { if (i >= 0) L.splice(i, 1); else L.push(v); }
    else state.tags[g] = i >= 0 ? [] : [v];
    if (g === 'competition') {
      var c = state.tags.competition[0];
      state.tags.block = (state.tags.block || []).filter(function(b) { var x = listOf('block').filter(function(y) { return y.id === b; })[0]; return c && x && (!x.p || x.p === c); });
    }
  }
  function nextNo(field) { var n = 0; people().forEach(function(x) { n = Math.max(n, Number(x.p[field]) || 0); }); return n + 1; }
  function personAt(k) { var m = /^(\d+)_(\d+)$/.exec(k); return state.sides[+m[1]].people[+m[2]]; }
  function position() {
    try { if (window.__tvRefreshStatus) window.__tvRefreshStatus(); var j = JSON.parse(window.__tvStatusJson || 'null'); if (j && j.t >= 0) return Math.floor(j.t); } catch (e) {}
    return null;
  }
  function venues() { return (lib.venues || []).slice().sort(function(a, b) { return String(a.en).localeCompare(String(b.en)); }); }
  function venueById(id) { return (lib.venues || []).filter(function(v) { return v.id === id; })[0]; }
  function matchVenue(raw) {
    var n = norm(raw), hit = '';
    if (!n) return '';
    (lib.venues || []).some(function(v) { if ([v.en, v.ja, v.s].some(function(x) { return x && n.indexOf(norm(x)) >= 0; })) { hit = v.id; return true; } return false; });
    if (!hit) (lib.venueAliases || []).some(function(a) { if (n.indexOf(a[0]) >= 0) { hit = a[1]; return true; } return false; });
    return hit;
  }
  function shiftDate(u, dir) {
    var d = state.date ? state.date.split('-').map(Number) : (function(x) { return [x.getFullYear(), x.getMonth() + 1, x.getDate()]; })(new Date());
    var t = new Date(Date.UTC(d[0], d[1] - 1, d[2]));
    if (u === 'y') t.setUTCFullYear(t.getUTCFullYear() + dir);
    else if (u === 'm') t.setUTCMonth(t.getUTCMonth() + dir);
    else t.setUTCDate(t.getUTCDate() + dir);
    state.date = t.toISOString().slice(0, 10);
    state.dateManual = true;
    state.touched.match = 1;
  }
  function openPropose(p) { pick = p; layer = 'propose'; render(); }
  function proposeHtml() {
    return '<div class="ov"><div class="menu" style="width:640px"><div class="h">' + T.proposeHead + (pick.label ? ' · ' + esc(pick.label) : '') + '</div><input id="tvx-in" class="tvx-f" data-k="in" type="text" autocomplete="off" value="' + esc(pick.text || '') + '"><div class="m">' + T.propHint + '</div>' +
      chip('psend', T.send) + chip('pcancel', T.cancel, 'ghost') + '</div></div>';
  }
  function pressPropose(k) {
    if (k === 'pcancel') { layer = 'main'; pick = null; render(); return; }
    if (k !== 'psend') return;
    var input = root.querySelector('#tvx-in'), value = input ? input.value.trim() : '', p = pick;
    if (!value) return;
    layer = 'main'; pick = null; render(); say(T.saving);
    call({ action: 'vi_propose', type: p.type, value: value, entity_id: p.entity || '', video: U[2] }, function(r) { say(r.ok ? T.proposed : String(r.error), !r.ok); });
  }
  function pressTab(k) {
    var m, v;
    if ((m = /^pr:(.+)$/.exec(k))) { openPropose({ type: 'new_option', entity: m[1], label: T.groups[m[1]], text: '' }); return true; }
    if (k === 'vp') { pick = { kind: 'venue', tab: '*', raw: state.venueRaw }; layer = 'pick'; render(); return true; }
    if ((m = /^d([-+])([ymd])$/.exec(k))) { shiftDate(m[2], m[1] === '+' ? 1 : -1); render(); return true; }
    if (k === 'dr') { state.date = rec.date || ''; state.dateManual = false; lastFocus = 'd-d'; render(); return true; }
    if (k === 'rev') { state.resOpen = true; lastFocus = k; render(); return true; }
    if ((m = /^c:([a-z]+):(.+)$/.exec(k))) { toggle(m[1], m[2]); render(); return true; }
    if ((m = /^f:(.+)$/.exec(k))) { state.fall = state.fall === m[1] ? '' : m[1]; render(); return true; }
    if ((m = /^e:(.+)$/.exec(k))) { v = personAt(m[1]); v.entry = v.entry ? '' : nextNo('entry'); render(); return true; }
    if ((m = /^x:(.+)$/.exec(k))) { v = personAt(m[1]); v.elim = v.elim ? '' : nextNo('elim'); render(); return true; }
    if (k === 'mb' || k === 'me') {
      v = position();
      if (v === null) { say(T.noPos, true); return true; }
      state.marks[k === 'mb' ? 'bell' : 'end'] = v; render(); return true;
    }
    if (k === 'mbx' || k === 'mex') { state.marks[k === 'mbx' ? 'bell' : 'end'] = ''; lastFocus = k === 'mbx' ? 'mb' : 'me'; render(); return true; }
    return false;
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
    if (pick.kind === 'venue') return venues().filter(function(v) { return pick.tab === '*' || firstLetter(v) === pick.tab; });
    var all = (lib.talent || []).slice().sort(function(a, b) { return String(a.en).localeCompare(String(b.en)); });
    if (pick.tab !== '*') return all.filter(function(t) { return firstLetter(t) === pick.tab; });
    var ids = [], add = function(id) { if (byId[id] && ids.indexOf(id) < 0) ids.push(id); };
    (state.onShow || []).forEach(add);
    (load(RECENT_KEY) || []).forEach(add);
    return ids.map(function(id) { return byId[id]; });
  }
  function pickHtml() {
    var h = '<div class="ov"><div class="pick"><div class="h">' + (pick.kind === 'venue' ? T.venue : T.pick) + (pick.raw ? ' · ' + esc(pick.raw) : '') + '</div><div class="ltr">';
    h += chip('tSUG', T.sug, pick.tab === '*' ? 'on' : '');
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').forEach(function(c) { h += chip('t' + (c === '#' ? 'N' : c), c, pick.tab === c ? 'on' : ''); });
    h += chip('pNew', T.suggest, 'ghost') + '</div><div class="grid">';
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
    if (layer === 'propose') return pressPropose(k);
    var m;
    lastFocus = k;
    if (k.charAt(0) === 'T') { state.tab = k.slice(1); if (state.tab !== 'people') state.touched[state.tab] = 1; render(); return; }
    if (pressTab(k)) return;
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
    if (k === 'pNew') {
      var isV = pick.kind === 'venue';
      openPropose({ type: isV ? 'new_venue' : 'new_talent', label: isV ? T.venue : '', text: pick.raw || '' });
      return;
    }
    if (pick.kind === 'venue' && k.charAt(0) === 'g') {
      var vid = el.getAttribute('data-id');
      if (!vid) return;
      if (state.venueRaw && !matchVenue(state.venueRaw)) state.venueAliases.push({ raw: state.venueRaw, id: vid });
      state.venue = vid; state.touched.match = 1; lastFocus = 'vp'; layer = 'main'; pick = null; render(); return;
    }
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
      s.people.forEach(function(p, j) { parts.push({ side: i + 1, slot: j + 1, talent_id: p.id, billed: p.billed, role: s.role, team_id: team, faction_id: fac, entry: p.entry || '', elim: p.elim || '' }); });
    });
    // Tags pre-picked from the title and never looked at are saved as "auto", so they can be told from confirmed ones.
    var tags = [], TAB_OF = { title: 'match', competition: 'match', round: 'match', block: 'match', stipulation: 'match', finish: 'finish', moment: 'moments' };
    Object.keys(state.tags).forEach(function(g) {
      (state.tags[g] || []).forEach(function(v) { tags.push({ group: g, value: v, source: state.touched[TAB_OF[g]] || state.hadTags ? 'panel' : 'auto' }); });
    });
    if (state.fall) tags.push({ group: 'fall', value: state.fall, source: 'panel' });
    var deep = state.fall || (state.touched.finish && (state.tags.finish || []).length) || (state.touched.moments && (state.tags.moment || []).length) || state.marks.bell !== '' || state.marks.end !== '';
    var level = Math.max(state.savedLevel, deep ? 3 : (state.touched.match ? 2 : 1));
    var title = (rec.title_en || '') + ' ' + (rec.title_ja || '');
    var show = rec.shows && rec.shows[0];
    busy = true; say(T.saving);
    call({ action: 'vi_save', video: U[2], version: rec.version || 'jp', aliases: state.aliases, participants: parts, tags: tags, marks: state.marks, venueAliases: state.venueAliases,
      match: { show_id: show ? show.id : (U[1] || ''), show_name: show ? show.show : '', venue: show ? show.venue : '', venue_id: state.venue, date: state.date, date_manual: state.dateManual, card_no: rec.no, is_dark: rec.no === 0 || /ダイゼロ|Dai Zero/i.test(title), result_type: winner || r.type !== 'win' ? r.type : '', winner_side: winner, level: level } },
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
    state = { sides: showAny ? fromSaved(saved) : page, result: { type: '', side: 0 }, resOpen: false, onShow: (saved && saved.onShow) || [], aliases: [], tab: 'people', tags: {}, touched: {}, fall: '', marks: { bell: '', end: '' }, hadTags: false, savedLevel: showAny ? (Number(saved.match.level) || 1) : 1 };
    if (showAny) {
      (saved.tags || []).forEach(function(t) { if (t.tag_group === 'fall') state.fall = t.tag_value; else (state.tags[t.tag_group] = state.tags[t.tag_group] || []).push(t.tag_value); });
      state.hadTags = !!(saved.tags || []).length;
      var mine = (saved.videos || []).filter(function(v) { return String(v.video_id) === U[2]; })[0];
      if (mine) state.marks = { bell: mine.bell_sec === '' || mine.bell_sec == null ? '' : Number(mine.bell_sec), end: mine.end_sec === '' || mine.end_sec == null ? '' : Number(mine.end_sec) };
    }
    if (!state.hadTags) suggestTags();
    var show0 = rec && rec.shows && rec.shows[0];
    state.venueRaw = (show0 && show0.venue) || ''; state.venueAliases = [];
    state.venue = (saved && saved.show && saved.show.venue_id) || matchVenue(state.venueRaw);
    state.date = (showAny && saved.match.date) || (rec && rec.date) || '';
    state.dateManual = !!(showAny && saved.match.date_set === 'manual');
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
    var c = e.keyCode, tgt = document.activeElement;
    // In the proposal box the keyboard and cursor keys work as usual; Up and Down leave the box.
    if (tgt && tgt.id === 'tvx-in' && c !== 38 && c !== 40) { e.stopImmediatePropagation(); return; }
    e.preventDefault(); e.stopImmediatePropagation();
    if (c === 37) move('L'); else if (c === 39) move('R'); else if (c === 38) move('U'); else if (c === 40) move('D');
    else if ((c === 13 || c === 23) && !e.repeat) { var a = document.activeElement; if (a && a.classList && a.classList.contains('tvx-f')) press(a); }
  }, true);
  window.addEventListener('keyup', function(e) { if (isOpen()) { if (!(document.activeElement && document.activeElement.id === 'tvx-in')) e.preventDefault(); e.stopImmediatePropagation(); } }, true);
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
