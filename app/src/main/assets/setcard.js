(function(){
  // Set order controls (private builds, 2.32.x) on a set's video pages (/set/<set>/contents/<video>).
  //  - Card: after a set page sends you to its first match, a small card at the bottom left of the player shows the
  //    FIRST and LAST match during the countdown to full screen, with a Reverse Order button. The set page writes
  //    what it chose to sessionStorage (tvSetStartV1).
  //  - Tile: the set's video row starts with a Reverse Order tile, so the order can be turned around later too.
  // Reverse Order restarts the set from the other end and is remembered for that set on this TV.
  if (window.__tvSetCard) return;
  var m = location.pathname.match(/^\/set\/([0-9]+)\/contents\/([0-9]+)/);
  if (!m) return;
  var so = window.__tvSetOrder;
  if (!so || !so.isPrivate()) return;
  window.__tvSetCard = true;
  var setId = m[1], videoId = m[2];

  var mk = null;
  try { mk = JSON.parse(sessionStorage.getItem('tvSetStartV1') || 'null'); } catch (e) {}
  if (mk && (!mk.start || String(mk.start.id) !== videoId || Date.now() - (mk.at || 0) > 90000)) mk = null;
  if (mk) {
    try { sessionStorage.removeItem('tvSetStartV1'); } catch (e) {}
    window.__tvFsDelay = 12000;
  }

  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  var ja = isJa();
  var L = ja ? {
    head: 'このセットの再生順', first: '最初', last: '最後', swap: '順番を逆にする',
    fsIn: function(s) { return 'あと' + s + '秒で全画面'; }, fsWait: '再生が始まると全画面になります',
    tileSub: '最初から：',
    why: { matches: '順番：試合の内容から', ids: '順番：動画番号から（推定）', mine: '順番：あなたが選んだ順' }
  } : {
    head: 'PLAYING THIS SET', first: 'FIRST', last: 'LAST', swap: 'Reverse Order',
    fsIn: function(s) { return 'Full screen in ' + s + ' s'; }, fsWait: 'Full screen once the video starts',
    tileSub: 'Starts with: ',
    why: { matches: 'Order read from the match titles', ids: 'Order from video numbers (a guess)', mine: 'Order you chose' }
  };

  function esc(t) { return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clean(t) {
    return String(t || '').replace(/月額見放題|Unlimited viewing for a monthly fee|Monthly subscription( available)?/gi, '')
      .replace(/\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/g, '').replace(/\s+/g, ' ').trim();
  }

  // The set's videos in the order they play (the site's first carousel, already turned around if needed).
  function setList() {
    var c = document.querySelectorAll('.content-list.js-list-slide, .js-list-slide')[0];
    if (!c) return [];
    var out = [], seen = {};
    Array.prototype.forEach.call(c.querySelectorAll('.content-list-item, .sub-category-list-item'), function(it) {
      if (it.classList.contains('slick-cloned') || it.closest('.slick-cloned')) return;
      var a = it.querySelector('a[href*="/contents/"]');
      var mm = a ? a.getAttribute('href').match(/\/contents\/(\d+)/) : null;
      if (!mm || seen[mm[1]]) return;
      seen[mm[1]] = 1;
      out.push({ id: parseInt(mm[1], 10), href: a.href, t: it.textContent.replace(/\s+/g, ' ').trim() });
    });
    return out;
  }

  // Start the set from the other end: newStart plays first, newEnd last.
  function reverse(newStart, newEnd, n, newFlip) {
    so.remember(setId, newFlip);
    try {
      sessionStorage.setItem('tvSetStartV1', JSON.stringify({
        set: setId, at: Date.now(), n: n, flip: newFlip, sure: true, why: 'your choice', start: newStart, end: newEnd
      }));
    } catch (e) {}
    window.__tvFsCancel && window.__tvFsCancel();
    close();
    document.documentElement.style.opacity = '0';
    location.replace(newStart.href);
  }

  var st = document.createElement('style');
  st.textContent = [
    '#tv-setcard{position:fixed;z-index:2147483000;width:420px;box-sizing:border-box;background:#0F151C;border:2px solid #2A323C;border-radius:12px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;color:#fff;}',
    '#tv-setcard .sc-h{color:#F4C242;font-size:12px;font-weight:800;letter-spacing:1px;}',
    '#tv-setcard .sc-r{display:flex;gap:10px;align-items:center;margin-top:8px;}',
    '#tv-setcard .sc-tag{flex:none;min-width:52px;box-sizing:border-box;border-radius:4px;font-size:12px;font-weight:800;text-align:center;padding:3px 6px;}',
    '#tv-setcard .sc-now{background:#FFB347;color:#1A1A1A;}',
    '#tv-setcard .sc-end{border:1px solid #3B4656;color:#9AA6B4;}',
    '#tv-setcard .sc-t{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
    '#tv-setcard .sc-t2{color:#C9D2DC;font-weight:600;}',
    '#tv-setcard .sc-bs{display:flex;gap:10px;margin-top:14px;}',
    '#tv-setcard .sc-b{flex:0 0 auto;min-width:200px;background:#161F2A !important;border:2px solid #2A323C !important;color:#fff !important;border-radius:10px;font:700 17px Arial,Helvetica,sans-serif;padding:9px 6px;text-align:center;cursor:pointer;outline:none !important;box-shadow:none !important;transform:none !important;}',
    '#tv-setcard .sc-b:focus{background:#FFB347 !important;border-color:#FFB347 !important;color:#1A1A1A !important;}',
    '#tv-setcard .sc-tr{margin-top:12px;height:4px;background:#3B4656;border-radius:4px;overflow:hidden;}',
    '#tv-setcard .sc-fill{height:4px;width:0;background:#FFB347;}',
    '#tv-setcard .sc-f{color:#9AA6B4;font-size:13px;margin-top:6px;}',
    '#tv-setcard .sc-why{color:#9AA6B4;font-size:12px;margin-top:2px;}',
    'a.tv-card.tv-rev-tile{flex:0 0 calc(25% - 18px);max-width:calc(25% - 18px);box-sizing:border-box;border-radius:8px;background:#11171E;border:2px solid #2A323C;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-decoration:none;cursor:pointer;color:#fff;font-family:Arial,Helvetica,sans-serif;min-height:165px;padding:12px 14px;text-align:center;}',
    'a.tv-card.tv-rev-tile .rt-i{color:#F4C242;font-size:34px;line-height:1;}',
    'a.tv-card.tv-rev-tile .rt-l{font-size:24px;font-weight:700;}',
    'a.tv-card.tv-rev-tile .rt-s{font-size:14px;color:#9AA6B4;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  // ---- Tile: first in the set's video row
  function addTile() {
    var c = document.querySelectorAll('.content-list.js-list-slide, .js-list-slide')[0];
    var sec = c && c.closest('.box-related-content');
    var row = sec && sec.querySelector('.tv-related-row .tv-grid-row');
    if (!row) return false;
    if (row.querySelector('.tv-rev-tile')) return true;
    var list = setList();
    if (list.length < 2) return true;
    var a = document.createElement('a');
    a.className = 'tv-card tv-rev-tile';
    a.setAttribute('tabindex', '0');
    a.setAttribute('href', list[list.length - 1].href);
    a.innerHTML = '<span class="rt-i notranslate" translate="no">&#8645;</span><span class="rt-l notranslate" translate="no">' + esc(L.swap) +
      '</span><span class="rt-s"><span class="notranslate" translate="no">' + esc(L.tileSub) + '</span>' + esc(clean(list[list.length - 1].t)) + '</span>';
    function go(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var l = setList();
      if (l.length < 2) return;
      reverse(l[l.length - 1], l[0], l.length, !window.__tvSetFlip);
    }
    a.addEventListener('click', go);
    a.addEventListener('keydown', function(e) { if (e.keyCode === 13 || e.keyCode === 23) go(e); });
    row.insertBefore(a, row.firstChild);
    return true;
  }
  var tileTries = 0;
  var tileTimer = setInterval(function() { if (addTile() || ++tileTries > 40) clearInterval(tileTimer); }, 500);

  // ---- Card
  var card = null, timer = null, touched = false;
  function open() { return !!(card && card.parentNode); }
  function btn() { return card ? card.querySelector('.sc-b') : null; }
  function focusBtn() { var b = btn(); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } } }
  function close() {
    if (timer) { clearInterval(timer); timer = null; }
    if (card && card.parentNode) card.parentNode.removeChild(card);
  }
  window.__tvSetCardClose = close;
  // Until a key is pressed, the card keeps focus: the player bar would otherwise take it when it is built
  // and again after autoplay (see playerBarJs and the autoplay retry), which left the card unreachable.
  window.__tvSetCardHold = function() {
    if (!open() || touched) return false;
    focusBtn();
    return true;
  };
  function focusPlayer() {
    var f = document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]');
    if (f) { try { f.focus(); } catch (e) {} }
  }

  if (mk) {
    var whyKey = mk.why === 'your choice' ? 'mine' : (mk.sure === false ? 'ids' : 'matches');
    card = document.createElement('div');
    card.id = 'tv-setcard';
    card.innerHTML =
      '<div class="sc-h notranslate" translate="no">' + esc(L.head) + '</div>' +
      '<div class="sc-r"><span class="sc-tag sc-now notranslate" translate="no">' + esc(L.first) + '</span><span class="sc-t">' + esc(clean(mk.start.t)) + '</span></div>' +
      '<div class="sc-r"><span class="sc-tag sc-end notranslate" translate="no">' + esc(L.last) + '</span><span class="sc-t sc-t2">' + esc(clean(mk.end.t)) + '</span></div>' +
      '<div class="sc-bs notranslate" translate="no"><button type="button" class="sc-b">' + esc(L.swap) + '</button></div>' +
      '<div class="sc-tr"><div class="sc-fill"></div></div>' +
      '<div class="sc-f notranslate" translate="no"></div>' +
      '<div class="sc-why notranslate" translate="no">' + esc(L.why[whyKey]) + '</div>';
    card.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('.sc-b')) reverse(mk.end, mk.start, mk.n, !mk.flip);
    });

    var frame = function() { return document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"], video'); };
    var place = function() {
      var f = frame();
      if (!f) return false;
      var r = f.getBoundingClientRect();
      if (r.width < 50 || r.height < 50) return false;
      card.style.left = Math.round(r.left + 16) + 'px';
      var top = Math.min(r.bottom, window.innerHeight) - card.offsetHeight - 16;
      card.style.top = Math.max(8, Math.round(top)) + 'px';
      return true;
    };
    var tick = function() {
      if (!open()) return;
      place();
      var at = window.__tvFsAt || 0, fill = card.querySelector('.sc-fill'), f = card.querySelector('.sc-f');
      if (at) {
        var left = Math.max(0, at - Date.now()), d = window.__tvFsDelay || 12000;
        fill.style.width = Math.round(100 * (1 - left / d)) + '%';
        f.textContent = L.fsIn(Math.ceil(left / 1000));
      } else {
        fill.style.width = '0%';
        f.textContent = L.fsWait;
      }
      if (!touched && !card.contains(document.activeElement)) focusBtn();
    };

    // Any key counts as "the viewer is driving now": the card stops pulling focus back.
    window.addEventListener('keydown', function(e) {
      if (!open()) return;
      var ae = document.activeElement, k = e.keyCode;
      if (ae && card.contains(ae)) {
        touched = true;
        if (k === 37 || k === 39) {
          // One button: Left and Right stay on it.
          e.preventDefault(); e.stopPropagation();
        } else if (k === 13 || k === 23) {
          e.preventDefault(); e.stopPropagation();
          reverse(mk.end, mk.start, mk.n, !mk.flip);
        } else if (k === 38) {
          // Up: the player (the card stays until full screen).
          e.preventDefault(); e.stopPropagation();
          focusPlayer();
        } else if (k === 40) {
          // Down: the player bar, which sits under the picture.
          e.preventDefault(); e.stopPropagation();
          if (!(window.__tvFocusBar && window.__tvFocusBar('play'))) {
            var c = document.querySelector('.tv-related-row a.tv-card, a.tv-thumbnail-link');
            if (c) c.focus();
          }
        }
        return;
      }
      touched = true;
      // Up from the player bar goes back to the card while it is up.
      if (k === 38 && ae && ae.classList && ae.classList.contains('tv-pbtn')) {
        e.preventDefault(); e.stopPropagation();
        focusBtn();
      }
    }, true);

    var tries = 0;
    (function mount() {
      if (!document.body) { setTimeout(mount, 200); return; }
      if (!card.parentNode) { card.style.visibility = 'hidden'; document.body.appendChild(card); }
      if (!place()) { if (++tries < 100) setTimeout(mount, 200); else close(); return; }
      card.style.visibility = '';
      focusBtn();
      timer = setInterval(tick, 200);
      tick();
    })();
  }
})();
