(function(){
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
  var DATEISH = /^\s*(\d{4}[\/.\-]\d|\d{4}年|[A-Z][a-z]{2}\.? \d)/;
  function titleOf(card) {
    var t = card.querySelector('.tt, .tv-fp-tl, .content-info-box, h3, .ttl-xs');
    if (t) return t;
    var kids = card.querySelectorAll('div, p, span');
    for (var i = kids.length - 1; i >= 0; i--) if (!kids[i].children.length && (kids[i].textContent || '').trim().length > 2 && !DATEISH.test(kids[i].textContent)) return kids[i];
    return null;
  }
  function apply() {
    if (!map) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="/contents/"]'), function(a) {
      var m = /\/contents\/(\d+)/.exec(a.getAttribute('href') || ''), v = m && map[m[1]];
      if (!v) return;
      var card = a.closest('.content-list-item, article, .tile-inner') || a;
      if (card.closest('#tvx')) return;
      var box = card.querySelector('.tvsc-host');
      if (box && box.querySelector('.tvsc')) return;
      var t = titleOf(card);
      if (!t || !t.parentNode) return;
      t.classList.add('tvsc-host');
      t.innerHTML = block(v);
      // The date moves below the picture, so the badge on the picture goes.
      Array.prototype.forEach.call(card.querySelectorAll('.dt, .tv-fp-badge, span, div'), function(el) {
        if (t.contains(el) || el.children.length) return;
        var s = (el.textContent || '').trim();
        if (s.length < 16 && DATEISH.test(s)) el.style.display = 'none';
      });
    });
  }
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
