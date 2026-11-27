(function(){
  // One match card everywhere (2.126.0, your build): every video is logged, so a site video card (search results,
  // category pages, the home page rows, the related row under the player) is drawn as the StarScope card: the picture,
  // then event, names and footer. A video the index doesn't have (an extra, a show logged later, a set) keeps its own
  // title but in the same block: names type, 4 lines at most, its date in gold on the right of the footer.
  // Pages that already draw StarScope cards (#tvsh, #tvsp, the app-drawn pages' .tvsc) are left alone.
  if (window.__tvSiteCards) return;
  var H = window.AndroidHost;
  if (!H || !H.videoIndexOn || !H.videoIndexOn()) return;   // your build only (public builds switch at 3.0)
  if (!window.__tvStarCard || !window.__tvStarCard.html) return;
  window.__tvSiteCards = true;
  var SC = window.__tvStarCard, ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function map() { try { return window.__tvScopeMap ? window.__tvScopeMap() : null; } catch (e) { return null; } }
  var st = document.createElement('style');
  st.textContent = [
    // the site's own title box, emptied and given the StarScope card's padding
    '.tv-sc1 .content-info-box{display:block !important;-webkit-line-clamp:unset !important;min-height:0 !important;max-height:none !important;padding:0 !important;overflow:visible !important;}',
    '.tv-sc1 .content-info-box > *:not(.tvsc-host){display:none !important;}',
    '.tv-sc1 .tvsc-host{pointer-events:none;}',
    // the app's own card title (home and related rows), the same
    '.tv-sc1 > .tv-sc1t{display:block !important;-webkit-line-clamp:unset !important;min-height:0 !important;max-height:none !important;padding:0 !important;overflow:visible !important;}',
    // a site title in the names style
    '.tvsc.tvsc-site .nm{font-size:16px;line-height:1.26;}'
  ].join('');
  (document.head || document.documentElement).appendChild(st);
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateText(y, m, d) { return ja ? y + '年' + (+m) + '月' + (+d) + '日' : MON[+m - 1] + ' ' + (+d) + ', ' + y; }
  function cleanTitle(t) {
    return String(t || '').replace(/月額見放題|Unlimited viewing for a monthly fee|Monthly subscription( available)?/gi, '')
      .replace(/(登録日|Registration date)\s*[:：]?\s*\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}/gi, '').replace(/\s+/g, ' ').trim();
  }
  // A video the index doesn't have: its title, with a leading date ("2024/3/20_…") moved to the footer.
  function siteBlock(title, isSet) {
    var t = cleanTitle(title), date = '';
    var m = /^\s*(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})[_\s]*/.exec(t);
    if (m) { date = dateText(m[1], m[2], m[3]); t = t.slice(m[0].length); }
    else { m = /(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/.exec(t); if (m) date = dateText(m[1], m[2], m[3]); }
    return '<div class="tvsc tvsc-site"><div class="ev">' + esc(isSet ? (ja ? 'セット' : 'Show') : 'Stardom World') + '</div><div class="nm">' + esc(t || 'Stardom World') + '</div><div class="ft"><span></span><b>' + esc(date) + '</b></div></div>';
  }
  function idOf(href) { var m = /\/contents\/(\d+)(?:[\/?#]|$)/.exec(href || ''); return m ? m[1] : ''; }
  function body(href, title) {
    var M = map(), id = idOf(href), v = id && M ? M[id] : null;
    if (v && v.x) return { html: SC.html(v), v: v };
    return { html: siteBlock(title, /\/set\/\d+/.test(href || '') && !id), v: null };
  }
  function enBox(thumb, v) {
    if (!thumb || !v || !SC.isEn || !SC.isEn(v) || thumb.querySelector('.tv-en')) return;
    thumb.classList.add('tv-enp');
    thumb.insertAdjacentHTML('beforeend', SC.en(v));
  }
  function skip(el) { return el.closest('#tvsh, #tvsp, #tv-sm-shelf, .tv-ppv') || (!el.classList.contains('tv-scr') && el.querySelector('.tvsc')); }
  function run() {
    // site cards: an article with the site's title box
    Array.prototype.forEach.call(document.querySelectorAll('article'), function(art) {
      if (art.classList.contains('tv-sc1') || skip(art)) return;
      art.classList.remove('tv-scr');
      var box = art.querySelector('.content-info-box'), link = art.querySelector('a[href*="/contents/"], a[href*="/set/"]');
      if (!box || !link) return;
      var t = art.querySelector('h3, .ttl-xs'), b = body(link.getAttribute('href') || link.href, t ? t.textContent : box.textContent);
      art.classList.add('tv-sc1');
      box.insertAdjacentHTML('beforeend', '<div class="tvsc-host notranslate" translate="no">' + b.html + '</div>');
      enBox(art.querySelector('.content-thumbnail-box-inner, .content-thumbnail-box'), b.v);
    });
    // the app's own cards: a.tv-card with a picture and a title box (home rows, the related row)
    Array.prototype.forEach.call(document.querySelectorAll('a.tv-card'), function(a) {
      if (a.classList.contains('tv-sc1') || skip(a) || a.children.length !== 2) return;
      var href = a.getAttribute('href') || '';
      if (!/\/(contents\/\d+|set\/\d+)/.test(href)) return;
      var tb = a.lastElementChild, t0 = tb.getAttribute('data-t') || tb.textContent, b = body(href, t0);
      a.classList.add('tv-sc1', 'notranslate'); a.classList.remove('tv-scr'); a.setAttribute('translate', 'no');
      tb.classList.add('tv-sc1t', 'tvsc-host'); tb.setAttribute('data-t', t0);
      tb.innerHTML = b.html;
      enBox(a.firstElementChild, b.v);
    });
  }
  var pend = 0;
  function soon() { if (pend) return; pend = setTimeout(function() { pend = 0; try { run(); } catch (e) {} }, 250); }
  try { run(); } catch (e) {}
  new MutationObserver(soon).observe(document.documentElement, { childList: true, subtree: true });
  // the list can arrive after the page: draw again once it is there
  window.addEventListener('tvscopelist', function() {
    Array.prototype.forEach.call(document.querySelectorAll('.tv-sc1'), function(el) {
      if (!el.querySelector('.tvsc-site')) return;
      el.classList.remove('tv-sc1'); el.classList.add('tv-scr');
      var h = el.querySelector('.content-info-box > .tvsc-host'); if (h) h.remove();
    });
    soon();
  });
})();
