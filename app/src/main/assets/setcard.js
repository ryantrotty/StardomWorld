(function(){
  // Set order card (private builds, 2.32.0). After a set page sends you to its first match, a small card at the
  // bottom left of the player shows where the set starts and ends, during the countdown to full screen.
  // "Play other way" starts the set from the other end (remembered for that set on this TV); "Stay here"
  // keeps the inline player. The set page writes what it chose to sessionStorage (tvSetStartV1).
  if (window.__tvSetCard) return;
  var m = location.pathname.match(/^\/(?:set\/[0-9]+\/)?contents\/([0-9]+)/);
  if (!m) return;
  var so = window.__tvSetOrder;
  if (!so || !so.isPrivate()) return;
  var mk = null;
  try { mk = JSON.parse(sessionStorage.getItem('tvSetStartV1') || 'null'); } catch (e) {}
  if (!mk || !mk.start || String(mk.start.id) !== m[1] || Date.now() - (mk.at || 0) > 90000) return;
  window.__tvSetCard = true;
  try { sessionStorage.removeItem('tvSetStartV1'); } catch (e) {}
  window.__tvFsDelay = 8000;

  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  var ja = isJa();
  var L = ja ? {
    head: 'このセットの再生順', now: '再生中', last: '最後', swap: '逆の順で再生', stay: 'このまま見る',
    fsIn: function(s) { return 'あと' + s + '秒で全画面'; }, fsWait: '再生が始まると全画面になります',
    why: { matches: '順番：試合の内容から', ids: '順番：動画番号から（推定）', mine: '順番：あなたが選んだ順' }
  } : {
    head: 'PLAYING THIS SET', now: 'NOW', last: 'LAST', swap: 'Play other way', stay: 'Stay here',
    fsIn: function(s) { return 'Full screen in ' + s + ' s'; }, fsWait: 'Full screen once the video starts',
    why: { matches: 'Order read from the match titles', ids: 'Order from video numbers (a guess)', mine: 'Order you chose' }
  };

  function esc(t) { return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clean(t) {
    return String(t || '').replace(/月額見放題|Unlimited viewing for a monthly fee|Monthly subscription( available)?/gi, '')
      .replace(/\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/g, '').replace(/\s+/g, ' ').trim();
  }
  var whyKey = mk.why === 'your choice' ? 'mine' : (mk.sure === false ? 'ids' : 'matches');

  var st = document.createElement('style');
  st.textContent = [
    '#tv-setcard{position:fixed;z-index:2147483000;width:420px;box-sizing:border-box;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;color:#fff;}',
    '#tv-setcard .sc-h{color:#F4C242;font-size:12px;font-weight:800;letter-spacing:1px;}',
    '#tv-setcard .sc-r{display:flex;gap:10px;align-items:center;margin-top:8px;}',
    '#tv-setcard .sc-tag{flex:none;min-width:64px;box-sizing:border-box;border-radius:4px;font-size:12px;font-weight:800;text-align:center;padding:3px 6px;}',
    '#tv-setcard .sc-now{background:#FFB347;color:#1A1A1A;}',
    '#tv-setcard .sc-end{border:1px solid #3B4656;color:#9AA6B4;}',
    '#tv-setcard .sc-t{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
    '#tv-setcard .sc-t2{color:#C9D2DC;font-weight:600;}',
    '#tv-setcard .sc-bs{display:flex;gap:10px;margin-top:14px;}',
    '#tv-setcard .sc-b{flex:1;background:#161F2A !important;border:2px solid #2A323C !important;color:#fff !important;border-radius:10px;font:700 17px Arial,Helvetica,sans-serif;padding:9px 6px;text-align:center;cursor:pointer;outline:none !important;box-shadow:none !important;transform:none !important;}',
    '#tv-setcard .sc-b:focus{background:#FFB347 !important;border-color:#FFB347 !important;color:#1A1A1A !important;}',
    '#tv-setcard .sc-tr{margin-top:12px;height:4px;background:#3B4656;border-radius:2px;overflow:hidden;}',
    '#tv-setcard .sc-fill{height:4px;width:0;background:#FFB347;}',
    '#tv-setcard .sc-f{color:#9AA6B4;font-size:13px;margin-top:6px;}',
    '#tv-setcard .sc-why{color:#9AA6B4;font-size:12px;margin-top:2px;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  var card = document.createElement('div');
  card.id = 'tv-setcard';
  card.innerHTML =
    '<div class="sc-h notranslate" translate="no">' + esc(L.head) + '</div>' +
    '<div class="sc-r"><span class="sc-tag sc-now notranslate" translate="no">' + esc(L.now) + ' 1/' + (mk.n || '?') + '</span><span class="sc-t">' + esc(clean(mk.start.t)) + '</span></div>' +
    '<div class="sc-r"><span class="sc-tag sc-end notranslate" translate="no">' + esc(L.last) + '</span><span class="sc-t sc-t2">' + esc(clean(mk.end.t)) + '</span></div>' +
    '<div class="sc-bs notranslate" translate="no"><button type="button" class="sc-b" data-sc="swap">' + esc(L.swap) + '</button><button type="button" class="sc-b" data-sc="stay">' + esc(L.stay) + '</button></div>' +
    '<div class="sc-tr"><div class="sc-fill"></div></div>' +
    '<div class="sc-f notranslate" translate="no"></div>' +
    '<div class="sc-why notranslate" translate="no">' + esc(L.why[whyKey]) + '</div>';

  var timer = null, touched = false, mountedAt = 0;
  function frame() { return document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"], video'); }
  function place() {
    var f = frame();
    if (!f) return false;
    var r = f.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) return false;
    card.style.left = Math.round(r.left + 16) + 'px';
    var top = Math.min(r.bottom, window.innerHeight) - card.offsetHeight - 16;
    card.style.top = Math.max(8, Math.round(top)) + 'px';
    return true;
  }
  function tick() {
    if (!card.parentNode) return;
    place();
    var at = window.__tvFsAt || 0, fill = card.querySelector('.sc-fill'), f = card.querySelector('.sc-f');
    if (at) {
      var left = Math.max(0, at - Date.now()), d = window.__tvFsDelay || 8000;
      fill.style.width = Math.round(100 * (1 - left / d)) + '%';
      f.textContent = L.fsIn(Math.ceil(left / 1000));
    } else {
      fill.style.width = '0%';
      f.textContent = L.fsWait;
    }
    // Something else on the page can take focus while it loads: keep it on the card until a key is pressed.
    if (!touched && Date.now() - mountedAt < 3000 && !card.contains(document.activeElement)) focusBtn(0);
  }
  function btns() { return card.querySelectorAll('.sc-b'); }
  function focusBtn(i) { var b = btns()[i]; if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } } }
  function close() {
    if (timer) { clearInterval(timer); timer = null; }
    var had = card.contains(document.activeElement);
    if (card.parentNode) card.parentNode.removeChild(card);
    window.removeEventListener('keydown', onKey, true);
    return had;
  }
  window.__tvSetCardClose = close;
  function focusPlayer() {
    var f = document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]');
    if (f) { try { f.focus(); } catch (e) {} }
  }
  function act(which) {
    if (which === 'swap') {
      so.remember(mk.set, !mk.flip);
      try {
        sessionStorage.setItem('tvSetStartV1', JSON.stringify({
          set: mk.set, at: Date.now(), n: mk.n, flip: !mk.flip, sure: true, why: 'your choice', start: mk.end, end: mk.start
        }));
      } catch (e) {}
      window.__tvFsCancel && window.__tvFsCancel();
      close();
      document.documentElement.style.opacity = '0';
      location.replace(mk.end.href);
    } else {
      window.__tvFsCancel && window.__tvFsCancel();
      close();
      focusPlayer();
    }
  }
  function onKey(e) {
    var ae = document.activeElement;
    if (!card.parentNode || !ae || !card.contains(ae)) return;
    touched = true;
    var list = Array.prototype.slice.call(btns()), i = list.indexOf(ae);
    var k = e.keyCode;
    if (k === 37 || k === 39) {
      e.preventDefault(); e.stopPropagation();
      focusBtn(k === 37 ? Math.max(0, i - 1) : Math.min(list.length - 1, i + 1));
    } else if (k === 13 || k === 23) {
      e.preventDefault(); e.stopPropagation();
      act(ae.getAttribute('data-sc'));
    } else if (k === 38) {
      // Up: back to the player (the card stays until full screen).
      e.preventDefault(); e.stopPropagation();
      if (!(window.__tvFocusBar && window.__tvFocusBar())) focusPlayer();
    } else if (k === 40) {
      // Down: the related videos under the player (the card stays until full screen).
      e.preventDefault(); e.stopPropagation();
      var c = document.querySelector('.tv-related-row a.tv-card, a.tv-thumbnail-link');
      if (c) c.focus(); else focusPlayer();
    }
  }
  card.addEventListener('click', function(e) {
    var b = e.target.closest && e.target.closest('.sc-b');
    if (b) act(b.getAttribute('data-sc'));
  });

  var tries = 0;
  (function mount() {
    if (!document.body) { setTimeout(mount, 200); return; }
    if (!card.parentNode) { card.style.visibility = 'hidden'; document.body.appendChild(card); }
    if (!place()) { if (++tries < 100) setTimeout(mount, 200); else close(); return; }
    card.style.visibility = '';
    mountedAt = Date.now();
    window.addEventListener('keydown', onKey, true);
    focusBtn(0);
    timer = setInterval(tick, 200);
    tick();
  })();
})();
