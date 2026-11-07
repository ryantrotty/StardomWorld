(function(){
  if (window.__tvSetOrder) return;
  // The site lists a set's matches in two different ways: Nighter-style shows run in show order,
  // while PPV-style shows put the main event first and the opener last (video IDs go either way,
  // so they are no help on their own). This says whether the list has to be turned around to get show order.

  // Score every match (2.32.0; all builds since 2.34.0) on the card and compare the top half with the bottom half.
  // The half with the bigger matches is the end of the show. When nothing tells them apart, the lowest
  // video ID is taken as the opener.
  function score(t) {
    t = t || '';
    if (/ダイゼロ|ゼロタイム|zero\s*-?\s*time|第0試合|match\s*0\b/i.test(t)) return -3;
    // Backstage comment clips are not matches: they don't count either way.
    if (/コメント|comments?\b/i.test(t) && !/試合|マッチ|match|commentary/i.test(t)) return null;
    var s = 0;
    if (/ワールド・オブ|world of stardom|IWGP/i.test(t)) s = 4;
    else if (/選手権|王座|title\s*match|champion/i.test(t)) s = 3;
    // Tournament rounds (Japanese, or the page translator's English). Round names are checked before
    // "final", since 決勝トーナメント1回戦 reads "Final Tournament Round 1" once translated.
    if (/準決勝|semi\s*-?\s*finals?/i.test(t)) s = Math.max(s, 2);
    else if (/2回戦|準々決勝|quarter\s*-?\s*finals?|round\s*2\b|2nd\s+round|second\s+round/i.test(t)) s = Math.max(s, 1.5);
    else if (/1回戦|round\s*1\b|1st\s+round|first\s+round/i.test(t)) s = Math.max(s, 1);
    else if (/優勝決定|決勝(?!トーナメント)|\bfinals?\b/i.test(t)) s = Math.max(s, 4);
    return s;
  }

  // items: [{ id: number, t: title }] in the order the site lists them.
  // Returns { flip, sure, why }; sure is false when the answer came from the video IDs alone.
  function decide(items) {
    var it = (items || []).filter(function(x){ return x && x.t; });
    if (it.length < 2) return { flip: false, sure: true, why: 'one video' };
    var sc = [], idx = [];
    it.forEach(function(x, i){ var v = score(x.t); sc.push(v); if (v !== null) idx.push(i); });
    var n = idx.length, h = Math.floor(n / 2), top = 0, bot = 0;
    for (var k = 0; k < h; k++) { top += sc[idx[k]]; bot += sc[idx[n - 1 - k]]; }
    if (top !== bot) return { flip: top > bot, sure: true, why: 'matches ' + top + ' v ' + bot };
    var up = 0, down = 0;
    for (var i = 1; i < it.length; i++) { if (+it[i].id > +it[i - 1].id) up++; else if (+it[i].id < +it[i - 1].id) down++; }
    return { flip: down > up, sure: false, why: 'video ids' };
  }

  // Order chosen with the swap button, per set, on this TV.
  var KEY = 'tvSetOrderV1';
  var SKEY = 'tvSetOrderSesV1';
  function saved() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function remember(set, flip) {
    if (!set) return;
    try { var m = saved(); m[set] = flip ? 1 : 0; localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {}
    try { var ses = JSON.parse(sessionStorage.getItem(SKEY) || '{}') || {}; delete ses[set]; sessionStorage.setItem(SKEY, JSON.stringify(ses)); } catch (e) {}
  }

  // The answer for one set: the Reverse Order choice, else the rule.
  function forSet(set, items) {
    var m = saved();
    if (set && Object.prototype.hasOwnProperty.call(m, set)) return { flip: m[set] === 1, sure: true, why: 'your choice' };
    // Same answer for the whole visit: the set page and the video page's row can read the titles before
    // and after the page translator has changed them.
    var ses = {};
    try { ses = JSON.parse(sessionStorage.getItem(SKEY) || '{}') || {}; } catch (e) {}
    if (set && ses[set]) return ses[set];
    var d = decide(items);
    if (set) { try { ses[set] = d; sessionStorage.setItem(SKEY, JSON.stringify(ses)); } catch (e) {} }
    return d;
  }

  // The set a page belongs to: /set/8470, /set/8470/contents/8469, or the other set page kinds.
  function setKey(path) {
    path = path || location.pathname;
    var m = path.match(/\/set\/(\d+)/);
    if (m) return m[1];
    m = path.match(/\/(box-contents-index|series|contents-set)\/(\d+)/);
    return m ? m[1] + ':' + m[2] : '';
  }

  window.__tvSetOrder = { decide: decide, forSet: forSet, remember: remember, setKey: setKey, score: score };
})();
