(function(){
  // Normal pages keep their own cards (2.55.1). This draws the StarScope button and its results page only.
  // StarScope video cards (private builds, 2.55.0). A video you have logged shows who is in it instead of the site's generic
  // title: event, the wrestlers, then block, round, match number and date. It never shows the result. Other videos are left
  // alone. Reads one list from the private sheet at most every 30 minutes, and nothing from the video site.
  if (window.__tvStarCards) return;
  var H = window.AndroidHost;
  if (!H || !H.starCards || !H.videoIndexOn || !H.videoIndexOn()) return;
  window.__tvStarCards = true;
  var KEY = 'tvVixCardsV1', AGE = 1800000, map = null, ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && c.map) map = c.map; } catch (e) {}
  var st = document.createElement('style');
  st.textContent = [
    '.tvsc-host{display:block !important;-webkit-line-clamp:unset !important;overflow:visible !important;padding:11px 14px 13px !important;box-sizing:border-box;}',
    '.tvsc,.tvsc *{text-decoration:none !important;}',
    '.tvsc{font-family:Arial,Helvetica,sans-serif;color:#fff;font-weight:400;}',
    '.tvsc .ev{font-size:12px;font-weight:800;letter-spacing:1px;color:#F4C242;text-transform:uppercase;}',
    '.tvsc .nm{margin-top:7px;padding-bottom:8px;border-bottom:1px solid #2A323C;font-size:18px;font-weight:800;line-height:1.22;}',
    '.tvsc .ft{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:13px;font-weight:600;color:#C9D2DC;}',
    '.tvsc .ft b{flex:none;color:#F4C242;font-weight:700;}'
  ].join('');
  (document.head || document.documentElement).appendChild(st);

  function names(side) { return side.length > 3 ? side[0] + ' + ' + (side.length - 1) : side.join(' & '); }
  function dateText(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    if (!m) return '';
    if (ja) return m[1] + '年' + (+m[2]) + '月' + (+m[3]) + '日';
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }
  function block(v) {
    var sides = (ja && v.sj && v.sj.length === v.s.length ? v.sj : v.s), foot = (ja ? v.fj : v.f).slice();
    if (v.n !== '' && v.n != null) foot.push((ja ? '第' : 'Match ') + v.n + (v.t ? '/' + v.t : '') + (ja ? '試合' : ''));
    var lines = sides.map(function(s, i) { return (i ? 'vs ' : '') + esc(names(s)); }).join('<br>');
    return '<div class="tvsc notranslate" translate="no"><div class="ev">' + esc(ja ? v.ej : v.e) + '</div><div class="nm">' + lines + '</div><div class="ft"><span>' + esc(foot.join(' · ')) + '</span><b>' + esc(dateText(v.d)) + '</b></div></div>';
  }
  // ---- the telescope button on wrestler and tag team pages, and its results
  var TEL = '<svg width="30" height="30" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="currentColor"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="currentColor"/><path d="M33 12.5H40V27.5H33Z" fill="currentColor"/><ellipse cx="40" cy="20" rx="4.5" ry="8.5" fill="#0B1118" stroke="currentColor" stroke-width="1.4"/></g><path fill="#F4C242" d="M50.5 -13Q50.5 -4.5 59 -4.5Q50.5 -4.5 50.5 4Q50.5 -4.5 42 -4.5Q50.5 -4.5 50.5 -13Z"/><path d="M23 25L14 45M25 25L34 45M24 25V44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_-]+/g, ''); }
  function hasKey(person, want) { return person[0].some(function(k) { return want.indexOf(k) >= 0; }); }
  // Only videos the site's search would miss: the wrestler (or, for a team, either partner) is not named in the video's text.
  function results(kind, a, b) {
    if (!map) return [];
    var out = [];
    Object.keys(map).forEach(function(id) {
      var v = map[id], sides = v.p || [], hit = false;
      if (kind === 'w') {
        var want = [norm(a), norm(b)];
        sides.forEach(function(s) { s.forEach(function(p) { if (p[1] && hasKey(p, want)) hit = true; }); });
      } else {
        var one = [norm(a)], two = [norm(b)];
        sides.forEach(function(s) {
          var x = s.filter(function(p) { return hasKey(p, one); })[0], y = s.filter(function(p) { return hasKey(p, two); })[0];
          if (x && y && (x[1] || y[1])) hit = true;
        });
      }
      if (hit) out.push({ id: id, v: v });
    });
    return out.sort(function(x, y) { return String(y.v.d).localeCompare(String(x.v.d)); });
  }
  function addButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-scope]'), function(row) {
      if (row.querySelector('.tvsp-btn')) return;
      var kind = row.getAttribute('data-scope'), a = row.getAttribute('data-scope-a'), b = row.getAttribute('data-scope-b');
      if (!results(kind, a, b).length) return;
      var btn = document.createElement('a'), chip = row.querySelector('.wr-tab');
      btn.className = (chip ? 'wr-tab' : 'tt-chip') + ' tvsp-btn';
      btn.tabIndex = 0;
      btn.setAttribute('aria-label', 'StarScope');
      btn.href = '/mypage?tvscope=' + kind + '&a=' + encodeURIComponent(a) + '&b=' + encodeURIComponent(b);
      btn.style.cssText = 'padding:0 10px;line-height:0;color:#fff !important;';
      btn.innerHTML = TEL;
      row.appendChild(btn);
    });
  }
  var Q = null;
  try { Q = new URLSearchParams(location.search); } catch (e) {}
  var scopeKind = Q && location.pathname === '/mypage' ? Q.get('tvscope') : null, scopeDone = false;
  function renderScope() {
    if (scopeDone || !map || !document.body) return;
    scopeDone = true;
    var a = Q.get('a') || '', b = Q.get('b') || '', list = results(scopeKind, a, b);
    var head = scopeKind === 't' ? a + ' & ' + b : a;
    var d = document.createElement('div');
    d.id = 'tvsp'; d.className = 'notranslate'; d.setAttribute('translate', 'no');
    var h = '<style>#tvsp{position:fixed;inset:0;z-index:99000;background:#0B1118;overflow:auto;box-sizing:border-box;padding:28px 40px;font-family:Arial,Helvetica,sans-serif;color:#fff}#tvsp .hd{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:900;margin-bottom:20px}#tvsp .gr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;align-items:stretch}#tvsp a.c{display:block;background:#1a1a1a;border-radius:8px;overflow:hidden;text-decoration:none;outline:none}#tvsp a.c:focus{outline:3px solid #F4C242;outline-offset:2px;box-shadow:0 0 16px rgba(244,194,66,.8)}#tvsp .im{aspect-ratio:16/9;background:#172029 center/cover no-repeat}</style>';
    h += '<div class="hd">' + TEL + esc(head) + '</div><div class="gr">';
    list.forEach(function(x) { h += '<a class="c" tabindex="0" href="/contents/' + esc(x.id) + '"><div class="im" style="background-image:url(\'' + esc(x.v.th || '') + '\')"></div><div class="tvsc-host">' + block(x.v) + '</div></a>'; });
    d.innerHTML = h + '</div>';
    document.body.appendChild(d);
    var first = d.querySelector('a.c'); if (first) first.focus();
    window.addEventListener('keydown', function(e) {
      var c = e.keyCode, step = { 37: -1, 39: 1, 38: -4, 40: 4 }[c], all = Array.prototype.slice.call(d.querySelectorAll('a.c')), i = all.indexOf(document.activeElement);
      if (c === 13 || c === 23) { if (i >= 0) { e.preventDefault(); e.stopImmediatePropagation(); location.href = all[i].href; } return; }
      if (!step) return;
      if (c === 37 && i % 4 === 0) return;   // Left at the edge opens the menu, as elsewhere
      e.preventDefault(); e.stopImmediatePropagation();
      var n = all[i + step] || (c === 40 ? all[all.length - 1] : null);
      if (i < 0) n = all[0];
      if (n && n !== all[i]) { n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest' }); }
    }, true);
  }
  function apply() { if (!map) return; if (scopeKind) renderScope(); else addButtons(); }
  var timer = 0;
  function soon() { clearTimeout(timer); timer = setTimeout(apply, 350); }
  window.__tvStarCardsReply = function(id, text) {
    var r; try { r = JSON.parse(text); } catch (e) { return; }
    if (!r || !r.ok || !r.map) return;
    map = r.map;
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), map: map })); } catch (e) {}
    soon();
  };
  var fresh = 0;
  try { fresh = (JSON.parse(localStorage.getItem(KEY) || '{}') || {}).t || 0; } catch (e) {}
  if (Date.now() - fresh > AGE) { try { H.starCards('c1', JSON.stringify({ action: 'vi_cards' })); } catch (e) {} }
  function start() { soon(); new MutationObserver(soon).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
