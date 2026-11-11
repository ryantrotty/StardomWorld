(function(){
  // Index panel (private builds with the log address; docs/MATCH_INDEX.md). Opened from the Index button in the bar under
  // the player. Shows who the page says is in the match, each name checked against the approved library in the sheet, so a
  // press of OK confirms it. Only talks to the sheet (AndroidHost.indexSync), never to the video site, and only when opened.
  if (window.__tvIndexPanel) return;
  var U = /^\/(?:set\/([0-9]+)\/)?contents\/([0-9]+)/.exec(location.pathname);
  if (!U || !window.AndroidHost || !AndroidHost.indexSync) return;
  window.__tvIndexPanel = true;
  var LIB_KEY = 'tvVixLibV3', RECENT_KEY = 'tvVixRecentV1', AUTO_KEY = 'tvVixAuto', MARK_KEY = 'tvVixMarks' + U[2];
  var BELL = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F4C242" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-6px;margin-right:8px"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/><path d="M2.5 7.5A10 10 0 0 1 5.5 3M21.5 7.5A10 10 0 0 0 18.5 3"/></svg>';
  var ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  var T = ja ? { head: 'この試合を登録', side: 'サイド', add: '+ 選手を追加', addSide: '+ サイド', save: '保存', notSaved: '保存できませんでした', linkedShort: 'リンクしました', next: '保存して次の試合', close: '閉じる',
    resHidden: '結果: 非表示', resShow: '結果', notSet: '未設定', wins: 'の勝ち', draw: '引き分け', nc: 'ノーコンテスト', change: '選手を選ぶ', propose: '新規として提案: ', remove: '削除', moveTo: '移動: ',
    pick: '選手を選ぶ', sug: 'おすすめ', loading: '読み込み中…', noMatch: 'このページから試合を読み取れませんでした。選手を追加できます。', ready: '内容を確認して保存してください。', saving: '保存中…', saved: '保存しました', linked: '同じ試合の別バージョンとしてリンクしました', need: '少なくとも2つのサイドが必要です', unknown: '未登録: ', loaded: '保存済みの内容を表示しています。', proposed: '提案を保存しました', added: '追加しました', none: '該当なし', tabs: { card: 'プレビュー', people: '選手', match: '試合', finish: '決着', confirm: '確認' }, nextStep: '次へ', check: '各項目を確認', looksRight: '正しいので保存', change: '変更', xo: '入場・退場の順番', xoHint: 'ガントレット、バトルロイヤル', xm: '出来事', xmHint: 'デビュー、王座移動、復帰など', rating: 'あなたの評価', ratingHint: '5点満点。任意、ネタバレなし。', ratingAvg: '平均', ratingN: '件', ratingNone: 'まだ評価はありません', cBell: 'ゴング', cHidden: '入力済み・ネタバレ防止のため非表示', cNone: '未入力', tagline: '世界中のスターを地図に', from: '動画から', fNames: '選手', fEvent: '大会・王座', fWhen: '日付と試合順', fEnd: '決着', cardNow: 'サイトの表示', cardPlaceHead: '試合順', matchNo: '第', dark: 'ダークマッチ', of: '／全', cardNew: 'STARSCOPEの表示', cardIntro: 'サイトでの現在の表示と、StarScopeに登録した後の表示です。', cardHave: '入力済み', cardNames: '選手', cardEvent: '大会・王座', cardRound: 'ブロック・ラウンド', cardPlace: '試合順', cardDate: '日付', groups: { result: '結果', title: '王座', competition: '大会', round: 'ラウンド', block: 'ブロック', stipulation: '特別ルール', finish: '決着方法', moment: '出来事' }, fall: '勝負を決めた選手', reveal: '結果を表示', bell: 'ゴング', end: '試合終了', clear: '消去', entry: '入場', out: '脱落', noPos: '再生位置を読み取れません', spoil: '結果に関わる項目は「結果を表示」の後に出ます', team: 'チーム', faction: 'ユニット', noTeam: 'チーム名なし', noFaction: 'ユニットなし', bellStart: '開始', bellEnd: '終了', suggest: '+ 追加を提案', proposeHead: '追加の提案', send: '提案を送る', cancel: 'キャンセル', propHint: 'OKでキーボードを開きます。承認後に選択肢に出ます。', venue: '会場', noVenue: '会場を選ぶ', date: '日付', day: '日', month: '月', year: '年', dateReset: '元の日付に戻す' }
   : { head: 'INDEX THIS MATCH', side: 'SIDE', add: '+ Add wrestler', addSide: '+ Side', save: 'Save', notSaved: 'Not saved', linkedShort: 'Linked', next: 'Save and next match', close: 'Close',
    resHidden: 'Result: hidden', resShow: 'Result', notSet: 'Not set', wins: ' wins', draw: 'Draw', nc: 'No contest', change: 'Pick the right name', propose: 'Propose new: ', remove: 'Remove', moveTo: 'Move to ',
    pick: 'Pick a wrestler', sug: 'Suggested', loading: 'Loading…', noMatch: 'No match could be read from this page. You can add wrestlers.', ready: 'Check the names, then save.', saving: 'Saving…', saved: 'Saved', linked: 'Linked as another version of the same match', need: 'A match needs at least two sides', unknown: 'Not in library: ', loaded: 'Showing what was saved.', proposed: 'Proposal added', added: 'Added', none: 'Nothing here', tabs: { card: 'Preview', people: 'Competitors', match: 'Match', finish: 'Finish', confirm: 'Confirm' }, nextStep: 'Next', check: 'Check each part', looksRight: 'Looks right · Save', change: 'Change', xo: 'Entry and elimination order', xoHint: 'gauntlets, battle royals', xm: 'Moments', xmHint: 'debut, title change, return, last match…', rating: 'YOUR RATING', ratingHint: 'Your own score, out of 5. Optional, and no spoiler.', ratingAvg: 'Average', ratingN: ' ratings', ratingNone: 'No ratings yet', cBell: 'BELL TIMES', cHidden: 'Set · hidden here so it isn\'t spoiled', cNone: 'Not filled in', tagline: 'Map all the Stars in the World', from: 'FROM THE VIDEO', fNames: 'Wrestlers', fEvent: 'Tournament or title', fWhen: 'Date and match number', fEnd: 'How it ended', cardNow: 'ON THE SITE NOW', cardPlaceHead: 'MATCH ON THE CARD', matchNo: 'Match', dark: 'Dark match', of: 'of', cardNew: 'WITH STARSCOPE', cardIntro: 'How this match looks on the site now, and how it will look once it\'s in StarScope.', cardHave: 'FILLED IN', cardNames: 'Names', cardEvent: 'Event or title', cardRound: 'Block or round', cardPlace: 'Match number', cardDate: 'Date', groups: { result: 'RESULT', title: 'TITLE', competition: 'COMPETITION', round: 'ROUND', block: 'BLOCK', stipulation: 'STIPULATION', finish: 'FINISH', moment: 'MOMENTS' }, fall: 'WHO GOT THE FALL', reveal: 'Show result', bell: 'Mark bell', end: 'Mark end', clear: 'Clear', entry: 'Entry', out: 'Out', noPos: 'Could not read the video position', spoil: 'Moments that give away the result appear after Show result', team: 'Team', faction: 'Faction', noTeam: 'No team name', noFaction: 'No faction', bellStart: 'Match start', bellEnd: 'Match end', suggest: '+ Propose new', proposeHead: 'PROPOSE AN ADDITION', send: 'Send proposal', cancel: 'Cancel', propHint: 'Press OK on the box to open the keyboard. It appears as a choice once approved in the sheet.', venue: 'VENUE', noVenue: 'Choose a venue', date: 'DATE', day: 'Day', month: 'Month', year: 'Year', dateReset: 'Back to the page date' };

  var TABS = ['card', 'people', 'match', 'finish', 'confirm'], STEPS = { people: 1, match: 1, finish: 1 }, MULTI = { title: 1, stipulation: 1, moment: 1 };
  var SUGGEST = ['title', 'competition', 'round', 'block', 'stipulation', 'moment'], SPOIL = { 'title-change': 1, 'first-title': 1 };
  var marks = { bell: '', end: '' };
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
      sides[i] = sides[i] || { role: p.role || '', team: '', people: [], teamId: p.team_id || '', factionId: p.faction_id || '' };
      sides[i].people.push({ id: p.talent_id && byId[p.talent_id] ? p.talent_id : '', billed: p.billed_name, entry: p.entry_order || '', elim: p.elim_order || '' });
    });
    return sides.filter(Boolean);
  }

  function ensure() {
    if (root) return;
    var st = document.createElement('style');
    st.textContent = [
      '#tvx{position:fixed;inset:0;z-index:2147483000;background:linear-gradient(180deg,rgba(0,0,0,.34),rgba(0,0,0,0) 70%);display:flex;align-items:flex-start;justify-content:center;padding-top:88px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#fff}',
      '#tvx .p{width:1280px;max-width:96vw;max-height:calc(100vh - 104px);display:flex;flex-direction:column;box-sizing:border-box;background:linear-gradient(180deg,rgba(15,21,28,.74) 0%,rgba(15,21,28,.46) 50%,rgba(15,21,28,.1) 100%);border:2px solid #2A323C;border-radius:12px;padding:22px 26px}',
      '#tvx .h{font:800 15px Arial;letter-spacing:.14em;color:#F4C242}',
      '#tvx .t{font:700 22px Arial;margin:8px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#tvx .m{font:600 14px Arial;color:#9AA6B4;margin-bottom:12px}',
      '#tvx .tabs{display:flex;gap:8px;margin-bottom:10px}',
      '#tvx .body{flex:1 1 auto;min-height:150px;overflow:auto;padding:3px}',
      '#tvx input{box-sizing:border-box;width:100%;height:52px;background:rgba(5,8,12,.48);color:#fff;border:2px solid #2A323C;border-radius:8px;font:700 20px Arial;padding:0 12px;outline:none!important}',
      '#tvx input:focus{border-color:#F4C242!important;background:rgba(5,8,12,.62)}',
      '#tvx .grp{font:800 12px Arial;letter-spacing:1px;color:#F4C242;margin:10px 0 6px}',
      '#tvx .chips{display:flex;flex-wrap:wrap;gap:8px}',
      '#tvx .sides{display:flex;gap:12px;overflow:auto;flex:1 1 auto;min-height:150px;padding:3px}',
      '#tvx .c{flex:1 1 0;min-width:220px;background:rgba(18,25,34,.44);border:2px solid #2A323C;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box}',
      '#tvx .l{font:800 12px Arial;letter-spacing:1px;color:#F4C242;display:flex;justify-content:space-between}',
      '#tvx .l em{font-style:normal;color:#9AA6B4}',
      // Buttons see through too (2.60.0), a little darker than the panel behind them so they stand out.
      '#tvx button{appearance:none;box-sizing:border-box;background:rgba(5,8,12,.48);color:#fff;border:2px solid #2A323C;border-radius:8px;font:700 17px Arial;min-height:44px;padding:6px 12px;text-align:left;outline:none!important;box-shadow:none!important;transform:none!important}',
      '#tvx button:focus{border-color:#F4C242!important;background:rgba(5,8,12,.62)!important;color:#fff!important}',
      '#tvx button.bad{color:#FF7A66}',
      '#tvx button.on{background:#FFB347;border-color:#FFB347;color:#1A1A1A}',
      '#tvx button.on:focus{background:#FFB347!important;color:#1A1A1A!important;border-color:#F4C242!important}',
      '#tvx button.ghost{color:#C9D2DC;font-weight:600}',
      '#tvx button.star{min-width:48px;padding:6px 8px;text-align:center;line-height:0}',
      '#tvx .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center}',
      '#tvx .s{font:700 15px Arial;color:#C9D2DC;margin-top:12px;min-height:20px}',
      '#tvx .s.bad{color:#FF7A66}',
      '#tvx .ov{position:fixed;inset:0;background:rgba(0,0,0,.24);display:flex;align-items:center;justify-content:center}',
      '#tvx .menu{width:480px;background:rgba(15,21,28,.69);border:2px solid #2A323C;border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:8px}',
      '#tvx .pick{width:1240px;max-width:96vw;height:86vh;background:rgba(15,21,28,.69);border:2px solid #2A323C;border-radius:12px;padding:18px;display:flex;flex-direction:column;box-sizing:border-box}',
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

  // The Save button says how the save went (2.60.2): Saving…, Saved (or Linked), Not saved; back to Save after 3 s.
  var saveLabel = '', saveTimer = 0;
  function saveBtn(text, keep) {
    saveLabel = text;
    var b = root && root.querySelector('[data-k="save"]');
    if (b) b.textContent = text || T.save;
    clearTimeout(saveTimer);
    if (text && !keep) saveTimer = setTimeout(function() { saveBtn(''); }, 3000);
  }
  function chip(k, label, cls, extra) { return '<button type="button" class="tvx-f ' + (cls || '') + '" data-k="' + k + '"' + (extra || '') + '>' + label + '</button>'; }

  // Where this video sits in its set, in show order (the carousel is already in that order). Comment clips don't count.
  function setPlace() {
    if (!U[1]) return null;
    var c = document.querySelectorAll('.content-list.js-list-slide, .js-list-slide')[0];
    if (!c) return null;
    var ids = [], seen = {};
    Array.prototype.forEach.call(c.querySelectorAll('.content-list-item, .sub-category-list-item'), function(it) {
      if (it.classList.contains('slick-cloned') || it.closest('.slick-cloned')) return;
      var a = it.querySelector('a[href*="/contents/"]'), m = a ? /\/contents\/(\d+)/.exec(a.getAttribute('href')) : null, t = it.textContent || '';
      if (!m || seen[m[1]]) return;
      if (/コメント|comments?\b/i.test(t) && !/試合|マッチ|match|commentary/i.test(t)) return;
      seen[m[1]] = 1; ids.push(m[1]);
    });
    var i = ids.indexOf(U[2]);
    return i < 0 ? null : { no: i + 1, total: ids.length };
  }
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
    var h = '<div class="p"><div style="display:flex;align-items:center;gap:12px"><span style="line-height:0"><svg width="34" height="34" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="#fff"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="#fff"/><path d="M33 12.5H40V27.5H33Z" fill="#fff"/><ellipse cx="40" cy="20" rx="4.5" ry="8.5" fill="#0B1118" stroke="#fff" stroke-width="1.4"/></g><path fill="#F4C242" d="M50.5 -13Q50.5 -4.5 59 -4.5Q50.5 -4.5 50.5 4Q50.5 -4.5 42 -4.5Q50.5 -4.5 50.5 -13Z"/><path d="M23 25L14 45M25 25L34 45M24 25V44" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg></span><span style="font:900 24px Arial;letter-spacing:.06em">STAR<span style="color:#F4C242">SCOPE</span></span><span style="font:600 14px Arial;color:#C9D2DC;margin-left:6px">' + T.tagline + '</span></div><div style="height:14px"></div>';
    h += '<div class="tabs">' + chip('bell', BELL + bellLabel(), '') + (state ? TABS.map(function(t) { return chip('T' + t, tabLabel(t), state.tab === t ? 'on' : ''); }).join('') : '') + '</div>';
    if (state && state.tab !== 'people') h += '<div class="body">' + tabHtml() + '</div>';
    else h += '<div class="sides">';
    if (state && state.tab === 'people') {
      state.sides.forEach(function(s, i) {
        var tag = s.role === 'champion' ? (ja ? '王者' : 'CHAMPION') : (s.role === 'challenger' ? (ja ? '挑戦者' : 'CHALLENGER') : '');
        h += '<div class="c"><div class="l"><span>' + T.side + ' ' + (i + 1) + '</span><em>' + tag + '</em></div>';
        s.people.forEach(function(p, j) {
          h += chip('p' + i + '_' + j, p.id ? esc(nameOf(p.id)) : '? ' + esc(p.billed), p.id ? '' : 'bad');
        });
        h += chip('a' + i, T.add, 'ghost');
        if (s.people.length) {
          var tid = sideTeam(s), fid = sideFaction(s), tn = (lib.teams || []).filter(function(x) { return x.id === tid; })[0], fn = (lib.factions || []).filter(function(x) { return x.id === fid; })[0];
          if (s.people.length >= 2) h += chip('tm' + i, T.team + ': ' + esc(tn ? tn.en : '–'), 'ghost');
          h += chip('fc' + i, T.faction + ': ' + esc(fn ? fn.en : '–'), 'ghost');
        }
        h += '</div>';
      });
      h += '<div style="display:flex;align-items:flex-start">' + chip('ns', T.addSide, 'ghost') + '</div>';
    }
    if (!state || state.tab === 'people') h += '</div>';
    if (state && state.tab === 'people') h += entryHtml();
    if (state) {
      // The buttons follow the screen: the Card offers save-as-is or a check of each part, each step a Next.
      var t = state.tab, i = TABS.indexOf(t), saveBtnHtml = chip('save', esc(saveLabel || (t === 'card' ? T.looksRight : T.save)), '', ' style="min-width:132px;text-align:center"');   // wide enough for Saving… so nothing shifts
      h += '<div class="row">';
      if (t === 'card') h += saveBtnHtml + chip('Tpeople', T.check + ' ›');
      else if (t === 'confirm') { h += saveBtnHtml; if (setNext()) h += chip('next', T.next); }
      else h += chip('T' + TABS[i + 1], T.nextStep + ' · ' + T.tabs[TABS[i + 1]] + ' ›') + saveBtnHtml;
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
    return '<div class="grp">' + T.groups[g] + '</div><div class="chips">' + items.map(function(x) { return chip('c:' + g + ':' + x.id, esc(lab(x)), has(g, x.id) ? 'on' : ''); }).join('') + chip('pr:' + g, '+', 'ghost', ' aria-label="' + T.proposeHead + '"') + '</div>';
  }
  function people() {
    var out = [];
    state.sides.forEach(function(s, i) { s.people.forEach(function(p, j) { out.push({ p: p, k: i + '_' + j }); }); });
    return out;
  }
  function bellLabel() {
    if (marks.bell === '') return T.bellStart;
    if (marks.end === '') return T.bellEnd + ' · ' + mmss(marks.bell);
    return mmss(marks.bell) + ' – ' + mmss(marks.end);
  }
  function keepMarks() { store(MARK_KEY, marks); }
  // The player's position right now, asked of the player itself so the mark is not a moment behind.
  function withTime(done) {
    var f = document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]'), p = f && f.__tvPlayer;
    function fallback() {
      try { if (window.__tvRefreshStatus) window.__tvRefreshStatus(); var j = JSON.parse(window.__tvStatusJson || 'null'); if (j && j.t >= 0) { done(Math.floor(j.t)); return; } } catch (e) {}
      done(null);
    }
    if (p && p.getCurrentTime) p.getCurrentTime().then(function(t) { done(Math.floor(t)); }).catch(fallback);
    else fallback();
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
      // Where it is on the show's card: number and total, each with − and +; 0 is the dark match.
      var cn = state.cardNo, ct = state.cardTotal;
      h += '<div class="grp">' + T.cardPlaceHead + '</div><div class="chips" style="align-items:center">' + chip('cn-', '−', 'ghost') + '<span style="font:800 19px Arial;min-width:150px;text-align:center">' + (cn === '' || cn == null ? '–' : (cn === 0 ? T.dark : (ja ? '第' + cn + '試合' : T.matchNo + ' ' + cn))) + '</span>' + chip('cn+', '+', 'ghost') +
        '<span style="font:700 17px Arial;color:#C9D2DC;margin:0 6px 0 14px">' + T.of + '</span>' + chip('ct-', '−', 'ghost') + '<span style="font:800 19px Arial;min-width:40px;text-align:center">' + (ct || '–') + '</span>' + chip('ct+', '+', 'ghost') + '</div>';
      h += group('title', listOf('title')) + group('competition', listOf('competition')) + group('round', listOf('round'));
      h += group('block', listOf('block').filter(function(b) { return !comp || !b.p || b.p === comp; })) + group('stipulation', listOf('stipulation'));
    } else if (state.tab === 'finish') {
      h += finishExtra(true);
      if (!state.resOpen) h += '<div class="chips">' + chip('rev', T.reveal, 'ghost') + '</div>';
      else {
        var r = state.result;
        h += '<div class="grp">' + T.groups.result + '</div><div class="chips">' + chip('r0', T.notSet, !r.type ? 'on' : '');
        state.sides.forEach(function(s, i) { if (s.people.length) h += chip('rw' + (i + 1), T.side + ' ' + (i + 1) + T.wins, r.type === 'win' && r.side === i + 1 ? 'on' : ''); });
        h += chip('rd', T.draw, r.type === 'draw' ? 'on' : '') + chip('rn', T.nc, r.type === 'nc' ? 'on' : '') + '</div>';
        h += group('finish', listOf('finish'));
        h += '<div class="grp">' + T.fall + '</div><div class="chips">' + people().filter(function(x) { return x.p.id; }).map(function(x) { return chip('f:' + x.p.id, esc(nameOf(x.p.id)), state.fall === x.p.id ? 'on' : ''); }).join('') + '</div>';
      }
      h += finishExtra(false);
    } else if (state.tab === 'card') {
      h += cardHtml();
    } else if (state.tab === 'confirm') {
      h += confirmHtml();
    }
    return h;
  }
  // ---- StarScope flow (2.62.0): Card, then the three steps (Competitors, Match, Finish), then Confirm.
  // A step shows a tick once it has what it needs; the steps can be done in any order.
  function stepDone(t) {
    if (!state) return false;
    if (t === 'people') { var S = state.sides.filter(function(s) { return s.people.length; }); return S.length >= 2 && S.every(function(s) { return s.people.every(function(p) { return p.id; }); }); }
    if (t === 'match') return !!(state.venue || ['competition', 'title', 'round', 'block', 'stipulation'].some(function(g) { return (state.tags[g] || []).length; }));
    if (t === 'finish') return !!(state.result.type || state.fall || (state.tags.finish || []).length || state.rating);
    return false;
  }
  function tabLabel(t) { return (STEPS[t] && stepDone(t) ? '<span style="color:' + (state.tab === t ? 'inherit' : '#F4C242') + '">✓</span> ' : '') + T.tabs[t]; }
  // Entry and elimination order, folded under the competitors (gauntlets, battle royals).
  function entryHtml() {
    var h = '<div class="chips" style="margin-top:10px">' + chip('xo', (state.xoOpen ? '▾ ' : '▸ ') + T.xo + ' <span style="color:#9AA6B4;font-weight:600">· ' + T.xoHint + '</span>', 'ghost') + '</div>';
    if (!state.xoOpen) return h;
    people().forEach(function(x) {
      h += '<div class="chips" style="margin-top:6px;align-items:center"><span style="width:280px;font:700 17px Arial">' + esc(x.p.id ? nameOf(x.p.id) : x.p.billed) + '</span>' + chip('e:' + x.k, T.entry + ': ' + (x.p.entry || '–')) + chip('x:' + x.k, T.out + ': ' + (x.p.elim || '–')) + '</div>';
    });
    return h;
  }
  // The end of the Finish step: moments (folded) and the star rating. The rating is not a spoiler, so it shows
  // even while the result is hidden.
  function finishExtra(top) {
    if (top) return '';
    var h = '<div class="chips" style="margin-top:14px">' + chip('xm', (state.momOpen ? '▾ ' : '▸ ') + T.xm + ' <span style="color:#9AA6B4;font-weight:600">· ' + T.xmHint + '</span>', 'ghost') + '</div>';
    if (state.momOpen) {
      h += group('moment', listOf('moment').filter(function(x) { return state.resOpen || !SPOIL[x.id]; }));
      if (!state.resOpen) h += '<div class="m" style="margin-top:8px">' + T.spoil + '</div>';
    }
    h += '<div class="grp">' + T.rating + '</div><div class="chips" style="align-items:center">';
    for (var i = 1; i <= 5; i++) h += chip('rt' + i, '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3L2.9 9.5l6.3-.9z" ' + (i <= (state.rating || 0) ? 'fill="#F4C242"' : 'fill="none" stroke="#5A6472" stroke-width="1.8" stroke-linejoin="round"') + '/></svg>', 'star', ' aria-label="' + i + '/5"');
    h += '<span style="font:800 18px Arial;margin:0 10px">' + (state.rating ? state.rating + ' / 5' : '–') + '</span>';
    if (state.rating) h += chip('rt0', T.clear, 'ghost');
    h += '<span style="font:600 14px Arial;color:#9AA6B4;margin-left:6px">' + (state.ratingN ? T.ratingAvg + ' ' + state.ratingAvg + ' · ' + state.ratingN + T.ratingN : T.ratingNone) + '</span></div>';
    h += '<div class="m" style="margin-top:6px">' + T.ratingHint + '</div>';
    return h;
  }
  // Confirm: one line per step with Change, the bell times, and the new card.
  function confirmHtml() {
    var d = cardData(), en = d.v.s.map(function(x) { return x.join(' & '); }).join(' vs ');
    var matchBits = [d.v.e, d.v.f.join(' · '), d.v.n ? (ja ? '第' + d.v.n + '試合' : 'Match ' + d.v.n + (d.v.t ? ' of ' + d.v.t : '')) : '', state.date, state.venue && venueById(state.venue) ? lab(venueById(state.venue)) : ''].filter(Boolean).join(' · ');
    var fin = stepDone('finish') ? T.cHidden + (state.rating ? ' · ' + state.rating + ' / 5' : '') : T.cNone;
    function line(label, text, k) { return '<div class="chips" style="align-items:center;margin-bottom:8px"><span style="width:150px;font:800 12px Arial;letter-spacing:1px;color:#F4C242">' + label + '</span><span style="flex:1 1 0;min-width:0;font:800 18px Arial">' + esc(text || T.cNone) + '</span>' + chip(k, T.change, 'ghost') + '</div>'; }
    var h = '<div style="display:flex;gap:28px;align-items:flex-start"><div style="flex:1 1 0;min-width:0">';
    h += line(T.tabs.people.toUpperCase(), en, 'Tpeople') + line(T.tabs.match.toUpperCase(), matchBits, 'Tmatch') + line(T.tabs.finish.toUpperCase(), fin, 'Tfinish');
    h += '<div class="chips" style="align-items:center;margin-bottom:8px"><span style="width:150px;font:800 12px Arial;letter-spacing:1px;color:#F4C242">' + T.cBell + '</span><span style="flex:1 1 0;font:800 18px Arial">' + (marks.bell !== '' ? mmss(marks.bell) : '–') + ' – ' + (marks.end !== '' ? mmss(marks.end) : '–') + '</span>' +
      (marks.bell !== '' ? chip('mbx', T.clear + ' ' + T.bell.toLowerCase(), 'ghost') : '') + (marks.end !== '' ? chip('mex', T.clear + ' ' + T.end.toLowerCase(), 'ghost') : '') + '</div>';
    h += '</div><div style="width:330px;flex:none">' + cardPair(true) + '</div></div>';
    return h;
  }

  // ---- Card tab (2.61.0): the video's card as the site shows it now, and as StarScope will show it from what is filled
  // in so far (the same card as the StarScope results, assets/starcards.js). It fills in as the other tabs do.
  function cardData() {
    var sides = state.sides.filter(function(s) { return s.people.length; });
    var en = sides.map(function(s) { return s.people.map(function(p) { var t = p.id && byId[p.id]; return t ? t.en : p.billed; }); });
    var jp = sides.map(function(s) { return s.people.map(function(p) { var t = p.id && byId[p.id]; return t ? (t.ja || t.en) : p.billed; }); });
    function labIn(g, id, lang) { var x = listOf(g).filter(function(o) { return o.id === id; })[0]; return x ? (lang === 'ja' && x.ja ? x.ja : x.en || id) : id; }
    function kind(s, lang) {
      // Same rules as kind() in scripts/video_index_log.gs (2.62.1).
      var st = state.tags.stipulation || [], sizes = s.map(function(x) { return x.length; }), size = Math.max.apply(null, sizes.concat([0])), n = s.length, all = sizes.reduce(function(a, b) { return a + b; }, 0), J = lang === 'ja';
      if (st.indexOf('gauntlet') >= 0) return n > 2 && size > 1 ? (J ? n + 'チーム・ガントレット（' + size + '人）' : n + '-team gauntlet · ' + size + ' per team') : (J ? all + '人ガントレット' : all + '-wrestler gauntlet');
      if (st.indexOf('royal') >= 0) return J ? all + '人バトルロイヤル' : all + '-woman battle royal';
      if (st.indexOf('rumble') >= 0) return J ? all + '人ランブル' : all + '-woman rumble';
      if (n > 2) return size > 1 ? (J ? n + 'チーム（各' + size + '人）' : n + ' teams of ' + size) : (J ? n + 'WAY' : n + '-way match');
      if (n === 2 && sizes[0] !== sizes[1]) return J ? sizes[0] + '対' + sizes[1] + 'ハンディキャップ' : sizes[0] + '-on-' + sizes[1] + ' handicap';
      if (size <= 1) return J ? 'シングルマッチ' : 'Singles match';
      if (size === 2) return J ? 'タッグマッチ' : 'Tag team match';
      return J ? (size * 2) + '人タッグ' : (size * 2) + '-person tag';
    }
    function big(s) { return s.length > 2 || (state.tags.stipulation || []).some(function(x) { return /^(gauntlet|royal|rumble)$/.test(x); }); }
    function teamNames(lang) {
      var out = sides.map(function(sd) { var t = (lib.teams || []).filter(function(x) { return x.id === sideTeam(sd); })[0], f = (lib.factions || []).filter(function(x) { return x.id === sideFaction(sd); })[0]; return t ? t.en : (f ? (lang === 'ja' && f.ja ? f.ja : f.en) : ''); });
      return out.every(Boolean) ? out : null;
    }
    function event(lang, s) {
      var c = (state.tags.competition || [])[0], t = state.tags.title || [];
      if (c) return labIn('competition', c, lang) + ' ' + String(state.date || '').slice(0, 4);
      if (t.length) return t.map(function(v) { return labIn('title', v, lang); }).join(' / ');
      return kind(s, lang);
    }
    function foot(lang, s) {
      var f = [];
      if (big(s) && ((state.tags.competition || []).length || (state.tags.title || []).length)) f.push(kind(s, lang));
      (state.tags.block || []).slice(0, 1).forEach(function(b) { f.push(labIn('block', b, lang)); });
      (state.tags.round || []).slice(0, 1).forEach(function(r) { f.push(String(labIn('round', r, lang)).replace(/ match$/i, '')); });
      return f;
    }
    var place = state.cardNo !== '' && state.cardNo != null ? { no: state.cardNo, total: state.cardTotal } : null;
    return {
      v: { s: en, sj: jp, e: event('en', en), ej: event('ja', jp), f: foot('en', en), fj: foot('ja', jp), tn: big(en) ? teamNames('en') : null, tnj: big(en) ? teamNames('ja') : null, n: place ? place.no : '', t: place ? place.total : '', d: state.date || '' },
      have: [
        [T.cardNames, sides.length >= 2 && sides.every(function(s) { return s.people.every(function(p) { return p.id; }); })],
        [T.cardEvent, !!((state.tags.competition || []).length || (state.tags.title || []).length)],
        [T.cardRound, !!((state.tags.block || []).length || (state.tags.round || []).length)],
        [T.cardPlace, !!place],
        [T.cardDate, !!state.date],
        [T.fEnd, stepDone('finish')]
      ]
    };
  }
  function cardPair(onlyNew) {
    var d = cardData(), th = esc((rec && rec.thumb) || ''), siteTitle = esc((ja ? rec && (rec.title_ja || rec.title_en) : rec && (rec.title_en || rec.title_ja)) || '');
    var img = '<div style="height:186px;background:#0B1118 center/cover no-repeat;' + (th ? 'background-image:url(\'' + th + '\');' : '') + '"></div>';
    var star = window.__tvStarCard ? window.__tvStarCard.html(d.v) : '';
    var mine = '<div style="width:330px"><div class="grp">' + T.cardNew + '</div><div style="background:rgba(26,26,26,.85);border-radius:8px;overflow:hidden">' + img +
      '<div class="tvsc-host" style="padding:11px 14px 13px">' + star + '</div></div></div>';
    if (onlyNew) return mine;
    return '<div style="width:330px"><div class="grp" style="color:#9AA6B4">' + T.cardNow + '</div><div style="background:rgba(26,26,26,.85);border-radius:8px;overflow:hidden">' + img +
      '<div style="padding:11px 14px 13px;font:700 17px/1.3 Arial;color:#fff;min-height:44px">' + (siteTitle || '–') + '</div></div></div>' + mine;
  }
  function cardHtml() {
    var d = cardData();
    var h = '<div class="m" style="font-size:17px;color:#C9D2DC;margin:0 0 12px">' + T.cardIntro + '</div><div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap">' + cardPair(false);
    h += '<div style="min-width:220px;padding-top:4px"><div class="grp">' + T.from + '</div>' + d.have.map(function(x) {
      return '<div style="font:700 17px Arial;margin:8px 0;color:' + (x[1] ? '#fff' : '#9AA6B4') + '"><span style="display:inline-block;width:26px;color:' + (x[1] ? '#F4C242' : '#5A6472') + '">' + (x[1] ? '✓' : '○') + '</span>' + esc(x[0]) + '</div>';
    }).join('') + '</div></div>';
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
    call({ action: 'vi_propose', type: p.type, value: value, entity_id: p.entity || '', video: U[2] }, function(r) { proposed(r, p, value); });
  }
  // Private build: the sheet has already added it, so load the library again and use the new entry where it was asked for.
  function proposed(r, p, value) {
    if (!r.ok) { say(String(r.error), true); return; }
    if (!r.applied || !r.id) { say(T.proposed); return; }
    call({ action: 'vi_lib' }, function(l) {
      if (l.ok) { store(LIB_KEY, { t: Date.now(), lib: l }); setLib(l); }
      if (!state || !window.__tvIndexIsOpen) return;
      var id = r.id, from = p.from || {}, S = from.side != null ? state.sides[from.side] : null;
      if (p.type === 'new_talent' && S) {
        if (from.slot == null || from.slot < 0) { S.people.push({ id: id, billed: value }); lastFocus = 'a' + from.side; }
        else { var q = S.people[from.slot]; if (q) { q.id = id; lastFocus = 'p' + from.side + '_' + from.slot; } }
        remember(id); nameStatus();
      } else if (p.type === 'new_venue') { state.venue = id; state.touched.match = 1; lastFocus = 'vp'; }
      else if (p.type === 'new_team' && S) { S.teamId = id; lastFocus = 'tm' + from.side; }
      else if (p.type === 'new_faction' && S) { S.factionId = id; lastFocus = 'fc' + from.side; }
      else if (p.type === 'new_option' && !has(p.entity, id)) toggle(p.entity, id);
      if (layer === 'main') render();
      say(T.added);
    });
  }
  function mark(which) {
    withTime(function(v) {
      if (v === null) { say(T.noPos, true); return; }
      marks[which] = v; keepMarks();
      if (root && root.style.display !== 'none') render();
    });
  }
  function pressTab(k) {
    var m, v;
    if ((m = /^pr:(.+)$/.exec(k))) { openPropose({ type: 'new_option', entity: m[1], label: T.groups[m[1]], text: '' }); return true; }
    if (k === 'vp') { pick = { kind: 'venue', tab: '*', raw: state.venueRaw }; layer = 'pick'; render(); return true; }
    if ((m = /^d([-+])([ymd])$/.exec(k))) { shiftDate(m[2], m[1] === '+' ? 1 : -1); render(); return true; }
    if (k === 'dr') { state.date = rec.date || ''; state.dateManual = false; lastFocus = 'd-d'; render(); return true; }
    if (k === 'rev') { state.resOpen = true; lastFocus = k; render(); return true; }
    if ((m = /^c:([a-z]+):(.+)$/.exec(k))) { toggle(m[1], m[2]); render(); return true; }
    if ((m = /^f:(.+)$/.exec(k))) {
      state.fall = state.fall === m[1] ? '' : m[1];
      // Whoever got the fall won, unless a result was already set to something else.
      if (state.fall && (!state.result.type || state.result.type === 'win')) state.sides.forEach(function(s, i) { if (s.people.some(function(p) { return p.id === state.fall; })) state.result = { type: 'win', side: i + 1 }; });
      render(); return true;
    }
    if ((m = /^e:(.+)$/.exec(k))) { v = personAt(m[1]); v.entry = v.entry ? '' : nextNo('entry'); render(); return true; }
    if ((m = /^x:(.+)$/.exec(k))) { v = personAt(m[1]); v.elim = v.elim ? '' : nextNo('elim'); render(); return true; }
    if (k === 'mb' || k === 'me') { mark(k === 'mb' ? 'bell' : 'end'); return true; }
    if (k === 'bell') { mark(marks.bell === '' ? 'bell' : 'end'); return true; }
    if (k === 'mbx' || k === 'mex') { marks[k === 'mbx' ? 'bell' : 'end'] = ''; keepMarks(); lastFocus = k === 'mbx' ? 'mb' : 'me'; render(); return true; }
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
    if (pick.kind === 'faction') return (lib.factions || []).slice().sort(function(a, b) { return String(a.en).localeCompare(String(b.en)); }).filter(function(f) { return pick.tab === '*' || firstLetter(f) === pick.tab; });
    if (pick.kind === 'team') {
      var mk = memberKey(state.sides[pick.side].people.map(function(p) { return p.id; }).filter(Boolean));
      return (lib.teams || []).slice().sort(function(a, b) { return String(a.en).localeCompare(String(b.en)); }).filter(function(t) { return pick.tab === '*' ? memberKey(t.m) === mk : firstLetter(t) === pick.tab; });
    }
    var all = (lib.talent || []).slice().sort(function(a, b) { return String(a.en).localeCompare(String(b.en)); });
    if (pick.tab !== '*') return all.filter(function(t) { return firstLetter(t) === pick.tab; });
    var ids = [], add = function(id) { if (byId[id] && ids.indexOf(id) < 0) ids.push(id); };
    (state.onShow || []).forEach(add);
    (load(RECENT_KEY) || []).forEach(add);
    return ids.map(function(id) { return byId[id]; });
  }
  function pickHtml() {
    var h = '<div class="ov"><div class="pick"><div class="h">' + (pick.kind === 'venue' ? T.venue : (pick.kind === 'team' ? T.team : (pick.kind === 'faction' ? T.faction : T.pick))) + (pick.raw ? ' · ' + esc(pick.raw) : '') + '</div><div class="ltr">';
    h += chip('tSUG', T.sug, pick.tab === '*' ? 'on' : '');
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').forEach(function(c) { h += chip('t' + (c === '#' ? 'HASH' : c), c, pick.tab === c ? 'on' : ''); });
    h += chip('pNew', '+', 'ghost', ' aria-label="' + T.proposeHead + '"') + '</div><div class="grid">';
    var L = pickList();
    if (pick.kind === 'team' || pick.kind === 'faction') h += chip('gNone', pick.kind === 'team' ? T.noTeam : T.noFaction, 'ghost');
    else if (!L.length) h += '<div class="m">' + T.none + '</div>';
    L.forEach(function(t, i) { h += chip('g' + i, esc(t.en) + (t.ja ? '<small>' + esc(t.ja) + '</small>' : ''), '', ' data-id="' + esc(t.id) + '"'); });
    return h + '</div></div></div>';
  }

  function layerRoot() { if (!root) return null; var o = root.querySelector('.ov'); return o || root; }
  function focusKey(k) {
    var r = layerRoot(), el = r.querySelector('[data-k="' + k + '"]');
    if (!el) el = (k === 'first' && r.querySelector('.grid .tvx-f')) || r.querySelector('[data-k="save"]') || r.querySelector('.tvx-f');
    if (el) { el.focus(); try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  }
  // The remote's arrows follow the screen's rows, top to bottom. Side columns are walked within a column first.
  function navLines() {
    var r = layerRoot(), all = Array.prototype.slice.call(r.querySelectorAll('.tvx-f')), blocks = [], lines = [];
    all.forEach(function(el) { var b = el.closest('.tabs,.row,.chips,.ltr,.grid,.menu,.sides') || el.parentElement; if (blocks.indexOf(b) < 0) blocks.push(b); });
    blocks.forEach(function(b) {
      if (b.classList.contains('sides')) {
        var cols = Array.prototype.map.call(b.children, function(c) { return Array.prototype.slice.call(c.querySelectorAll('.tvx-f')); }).filter(function(c) { return c.length; });
        lines.push({ cols: cols });
        return;
      }
      var cur = null, top = null;
      all.filter(function(el) { return b.contains(el); }).forEach(function(el) {
        var t = el.getBoundingClientRect().top;
        if (cur === null || Math.abs(t - top) > 10) { cur = { items: [] }; top = t; lines.push(cur); }
        cur.items.push(el);
      });
    });
    return lines;
  }
  function go(el) { if (!el) return; try { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { el.focus(); } }
  function nearest(items, x) {
    var best = items[0], gap = 1e9;
    items.forEach(function(el) { var R = el.getBoundingClientRect(), d = Math.abs(R.left + R.width / 2 - x); if (d < gap) { gap = d; best = el; } });
    return best;
  }
  function enter(line, down, x) {
    if (!line) return null;
    if (!line.cols) return nearest(line.items, x);
    var col = line.cols[0], gap = 1e9;
    line.cols.forEach(function(c) { var R = c[0].getBoundingClientRect(), d = Math.abs(R.left + R.width / 2 - x); if (d < gap) { gap = d; col = c; } });
    return down ? col[0] : col[col.length - 1];
  }
  function move(dir) {
    var a = document.activeElement, lines = navLines(), li = -1, col = -1, idx = -1;
    lines.forEach(function(l, i) {
      if (l.cols) l.cols.forEach(function(c, ci) { var n = c.indexOf(a); if (n >= 0) { li = i; col = ci; idx = n; } });
      else { var n = l.items.indexOf(a); if (n >= 0) { li = i; idx = n; } }
    });
    if (li < 0) { focusKey(layer === 'main' ? 'bell' : 'first'); return; }
    var line = lines[li], R = a.getBoundingClientRect(), x = R.left + R.width / 2, down = dir === 'D';
    if (dir === 'L' || dir === 'R') {
      var step = dir === 'R' ? 1 : -1;
      if (line.cols) { var c = line.cols[col + step]; if (c) go(c[Math.min(idx, c.length - 1)]); }
      else go(line.items[idx + step]);
      return;
    }
    if (line.cols) { var c2 = line.cols[col], n2 = idx + (down ? 1 : -1); if (c2[n2]) { go(c2[n2]); return; } }
    go(enter(lines[li + (down ? 1 : -1)], down, x));
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
    if ((m = /^tm(\d+)$/.exec(k))) { pick = { kind: 'team', tab: '*', side: +m[1] }; layer = 'pick'; render(); return; }
    if ((m = /^fc(\d+)$/.exec(k))) { pick = { kind: 'faction', tab: '*', side: +m[1] }; layer = 'pick'; render(); return; }
    if (k === 'ns') { state.sides.push({ role: '', team: '', people: [] }); lastFocus = 'a' + (state.sides.length - 1); render(); return; }
    if (k === 'res') { state.resOpen = true; lastFocus = 'r0'; render(); return; }
    if (k === 'r0') { state.result = { type: '', side: 0 }; render(); return; }
    if ((m = /^rw(\d+)$/.exec(k))) { state.result = { type: 'win', side: +m[1] }; render(); return; }
    if (k === 'rd') { state.result = { type: 'draw', side: 0 }; render(); return; }
    if (k === 'rn') { state.result = { type: 'nc', side: 0 }; render(); return; }
    if (k === 'xo') { state.xoOpen = !state.xoOpen; render(); return; }
    if ((m = /^c([nt])([-+])$/.exec(k))) {
      var key = m[1] === 'n' ? 'cardNo' : 'cardTotal', cur = state[key] === '' || state[key] == null ? (m[1] === 'n' ? 0 : (state.cardNo || 0)) : Number(state[key]);
      cur += m[2] === '+' ? 1 : -1;
      state[key] = Math.max(m[1] === 'n' ? 0 : 1, Math.min(40, cur));
      if (m[1] === 'n' && state.cardTotal && state.cardNo > state.cardTotal) state.cardTotal = state.cardNo;
      state.touched.match = 1; render(); return;
    }
    if (k === 'xm') { state.momOpen = !state.momOpen; state.touched.moments = 1; render(); return; }
    if ((m = /^rt([0-5])$/.exec(k))) { state.rating = +m[1] === state.rating ? 0 : +m[1]; if (!state.rating) lastFocus = 'rt1'; render(); return; }
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
      call({ action: 'vi_propose', type: 'new_talent', value: p.billed, video: U[2] }, function(r) { proposed(r, { type: 'new_talent', from: { side: i, slot: j } }, p.billed); });
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
      var from = { side: pick.side, slot: pick.slot };
      if (pick.kind === 'team') { openPropose({ type: 'new_team', label: T.team, text: '', from: from, entity: state.sides[pick.side].people.map(function(p) { return p.id; }).filter(Boolean).join('|') }); return; }
      if (pick.kind === 'faction') { openPropose({ type: 'new_faction', label: T.faction, text: '', from: from }); return; }
      openPropose({ type: isV ? 'new_venue' : 'new_talent', label: isV ? T.venue : '', text: pick.raw || '', from: from });
      return;
    }
    if ((pick.kind === 'team' || pick.kind === 'faction') && k.charAt(0) === 'g') {
      var sd = state.sides[pick.side], chosen = k === 'gNone' ? '' : el.getAttribute('data-id');
      if (pick.kind === 'team') { sd.teamId = chosen; lastFocus = 'tm' + pick.side; } else { sd.factionId = chosen; lastFocus = 'fc' + pick.side; }
      layer = 'main'; pick = null; render(); return;
    }
    if (pick.kind === 'venue' && k.charAt(0) === 'g') {
      var vid = el.getAttribute('data-id');
      if (!vid) return;
      if (state.venueRaw && !matchVenue(state.venueRaw)) state.venueAliases.push({ raw: state.venueRaw, id: vid });
      state.venue = vid; state.touched.match = 1; lastFocus = 'vp'; layer = 'main'; pick = null; render(); return;
    }
    if (k.charAt(0) === 't') {
      var c = k.slice(1); pick.tab = c === 'SUG' ? '*' : (c === 'HASH' ? '#' : c); pick.focus = k; render(); return;
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

  function sideTeam(s) { return s.teamId !== undefined ? s.teamId : teamFor(s); }
  function sideFaction(s) { return s.factionId !== undefined ? s.factionId : factionFor(s); }
  function memberKey(ids) { return ids.slice().sort().join('|'); }
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
      var team = sideTeam(s), fac = sideFaction(s);
      s.people.forEach(function(p, j) { parts.push({ side: i + 1, slot: j + 1, talent_id: p.id, billed: p.billed, role: s.role, team_id: team, faction_id: fac, entry: p.entry || '', elim: p.elim || '' }); });
    });
    // Tags pre-picked from the title and never looked at are saved as "auto", so they can be told from confirmed ones.
    var tags = [], TAB_OF = { title: 'match', competition: 'match', round: 'match', block: 'match', stipulation: 'match', finish: 'finish', moment: 'moments' };
    Object.keys(state.tags).forEach(function(g) {
      (state.tags[g] || []).forEach(function(v) { tags.push({ group: g, value: v, source: state.touched[TAB_OF[g]] || state.hadTags ? 'panel' : 'auto' }); });
    });
    if (state.fall) tags.push({ group: 'fall', value: state.fall, source: 'panel' });
    var deep = state.fall || (state.touched.finish && (state.tags.finish || []).length) || (state.touched.moments && (state.tags.moment || []).length) || marks.bell !== '' || marks.end !== '';
    var level = Math.max(state.savedLevel, deep ? 3 : (state.touched.match ? 2 : 1));
    var title = (rec.title_en || '') + ' ' + (rec.title_ja || '');
    var show = rec.shows && rec.shows[0];
    var place = setPlace();
    busy = true; saveBtn(T.saving, true);
    call({ action: 'vi_save', video: U[2], version: rec.version || 'jp', rating: state.rating || 0, aliases: state.aliases, participants: parts, tags: tags, marks: marks, venueAliases: state.venueAliases,
      match: { show_id: show ? show.id : (U[1] || ''), show_name: show ? show.show : '', venue: show ? show.venue : '', venue_id: state.venue, date: state.date, date_manual: state.dateManual, card_total: state.cardTotal || '', card_no: state.cardNo, is_dark: state.cardNo === 0 || /ダイゼロ|Dai Zero/i.test(title), result_type: winner || r.type !== 'win' ? r.type : '', winner_side: winner, level: level } },
    function(res) {
      busy = false;
      if (!res.ok) { saveBtn(T.notSaved); say(String(res.error || 'not saved'), true); return; }
      state.aliases = [];
      try { localStorage.removeItem(MARK_KEY); localStorage.removeItem('tvVixCardsV3'); } catch (e) {}
      saveBtn(res.linked ? T.linkedShort : T.saved);
      if (statusText && !statusBad) say('');   // the button says it now, not the line under it
      // Once the sheet has it, the logger closes by itself (2.62.2), after a moment so "Saved" is seen.
      if (!nextHref) setTimeout(function() { if (window.__tvIndexIsOpen && layer === 'main') close(); }, 700);
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
    state = { sides: showAny ? fromSaved(saved) : page, result: { type: '', side: 0 }, resOpen: false, onShow: (saved && saved.onShow) || [], aliases: [], tab: 'card', tags: {}, touched: {}, fall: '', hadTags: false, savedLevel: showAny ? (Number(saved.match.level) || 1) : 1 };
    // The star rating: this TV's own, and everyone's average (2.62.0).
    state.rating = (saved && Number(saved.myRating)) || 0; state.ratingAvg = (saved && saved.ratingAvg) || ''; state.ratingN = (saved && Number(saved.ratingCount)) || 0;
    if (showAny) {
      (saved.tags || []).forEach(function(t) { if (t.tag_group === 'fall') state.fall = t.tag_value; else (state.tags[t.tag_group] = state.tags[t.tag_group] || []).push(t.tag_value); });
      state.hadTags = !!(saved.tags || []).length;
      var mine = (saved.videos || []).filter(function(v) { return String(v.video_id) === U[2]; })[0];
      // A press not saved yet (kept on this TV) wins over what the sheet has.
      if (mine) ['bell', 'end'].forEach(function(f) { var v = mine[f + '_sec']; if (marks[f] === '' && v !== '' && v != null) marks[f] = Number(v); });
    }
    if (!state.hadTags) suggestTags();
    var show0 = rec && rec.shows && rec.shows[0];
    state.venueRaw = (show0 && show0.venue) || ''; state.venueAliases = [];
    state.venue = (saved && saved.show && saved.show.venue_id) || matchVenue(state.venueRaw);
    state.date = (showAny && saved.match.date) || (rec && rec.date) || '';
    state.dateManual = !!(showAny && saved.match.date_set === 'manual');
    // Match number on the card (2.62.3): what was saved, else the show's video list, else the page's own number.
    var pl0 = setPlace(), sn = showAny ? saved.match.card_no : '', st = showAny ? saved.match.card_total : '';
    state.cardNo = sn !== '' && sn != null ? Number(sn) : (pl0 ? pl0.no : (rec && rec.no != null ? rec.no : ''));
    state.cardTotal = st !== '' && st != null ? Number(st) : (pl0 ? pl0.total : '');
    if (showAny && saved.match.result_type) state.result = { type: saved.match.result_type, side: Number(saved.match.winner_side) || 0 };
    if (!state.sides.length) state.sides = [{ role: '', team: '', people: [] }, { role: '', team: '', people: [] }];
    state.okText = showAny ? T.loaded : (page.length ? T.ready : T.noMatch);
    nameStatus();
    lastFocus = 'bell';
    render();
  }

  function open() {
    if (window.__tvIndexIsOpen) return;
    window.__tvIndexIsOpen = true;
    if (window.__tvFsCancel) window.__tvFsCancel();
    try { AndroidHost.indexPanel(true); } catch (e) {}
    rec = window.__tvVixRec || null;
    marks = load(MARK_KEY) || { bell: '', end: '' };
    state = null; layer = 'main'; lastFocus = 'bell'; say(T.loading); ensure(); root.style.display = 'flex'; render();
    var cached = load(LIB_KEY);
    function withLib() {
      var show = rec && rec.shows && rec.shows[0];
      call({ action: 'vi_get', video: U[2], show: show ? String(show.id) : '' }, function(r) {
        if (!r.ok) statusText = '';
        begin(r.ok ? r : null);
        if (!r.ok) say(String(r.error), true);
      });
    }
    // The last copy opens the panel at once; a fresh one comes in behind it, so sheet changes show without waiting.
    if (cached && cached.lib) {
      setLib(cached.lib); withLib();
      call({ action: 'vi_lib' }, function(r) {
        if (!r.ok) return;
        store(LIB_KEY, { t: Date.now(), lib: r }); setLib(r);
        if (state && layer === 'main' && window.__tvIndexIsOpen) {
          if (!state.venue) state.venue = matchVenue(state.venueRaw);
          var a = document.activeElement; if (a && a.getAttribute && a.getAttribute('data-k')) lastFocus = a.getAttribute('data-k');
          render();
        }
      });
      return;
    }
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
