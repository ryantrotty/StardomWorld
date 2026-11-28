(function(){
  // One match card everywhere (2.126.0, your build): every video is logged, so a site video card (search results,
  // category pages, the home page rows, the related row under the player) is drawn as the StarScope card: the picture,
  // then event, names and footer. A video the index doesn't have (an extra, a show logged later, a set) keeps its own
  // title but in the same block: names type, 4 lines at most, its date in gold on the right of the footer.
  // Pages that already draw StarScope cards (#tvsh, #tvsp, the app-drawn pages' .tvsc) are left alone.
  if (window.__tvSiteCards) return;
  var H = window.AndroidHost;
  if (!H || !H.scopeOn || !H.scopeOn()) return;   // 2.132.0: wherever StarScope is on (public builds once the published file is switched on)
  if (!window.__tvStarCard || !window.__tvStarCard.html) return;
  window.__tvSiteCards = true;
  var SC = window.__tvStarCard, ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function map() { try { return window.__tvScopeMap ? window.__tvScopeMap() : null; } catch (e) { return null; } }
  var st = document.createElement('style');
  st.textContent = [
    // the card's own title box stays in place (other scripts read its text) but hidden; the StarScope block is drawn
    // next to it with the StarScope card's padding
    '.tv-sc1 .content-info-box{display:none !important;}',
    '.tv-sc1 > .tv-sc1o{display:none !important;}',
    '.tv-sc1 .tv-sch{pointer-events:none;}',
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
  // 2.131.0: in English, a Japanese title is turned into English (assets/shownames.js), never shown as it is. A whole
  // show in one clip (a title with no match in it) is drawn as the show: FULL SHOW, the short English show name (the
  // schedule's, by date), its series bottom left and the date bottom right.
  var JP = /[぀-ヿ㐀-鿿ｦ-ﾟ]/, MATCHY = /マッチ|試合|ＶＳ|\bvs\b|シングル|選手権|公式戦|バトル|ランブル|WAY|match|battle|rumble|six[- ]woman|tag team/i;
  var SERIES = null;
  function seriesOf(t) {
    var n = String(t || '').normalize('NFKC').toUpperCase();
    if (/タッグリーグ|TAG\s*LEAGUE|ゴッデス.?オブ.?スターダム|GODDESSES OF STARDOM/.test(n)) return ja ? 'タッグリーグ' : 'Goddess League';
    if (!SERIES) { SERIES = []; try { (JSON.parse(H.eventFiltersJson()).shows || []).forEach(function(x) { SERIES.push([String(x.search || x.name).normalize('NFKC').toUpperCase(), x.name]); }); } catch (e) {} }
    var hit = SERIES.filter(function(x) { return x[0] && n.indexOf(x[0]) >= 0; })[0];
    if (hit) return hit[1];
    if (/シンデレラ/.test(n)) return 'Cinderella Tournament';
    if (/5\s*★?\s*STAR/.test(n)) return '5★STAR GP';
    return '';
  }
  function siteInfo(title, isSet) {
    var t = cleanTitle(title), date = '', iso = '';
    var m = /^\s*(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})[_\s]*/.exec(t);
    if (m) t = t.slice(m[0].length); else { m = /(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/.exec(t); if (m) t = t.replace(m[0], ' ').replace(/\s+/g, ' ').trim(); }
    if (m) { date = dateText(m[1], m[2], m[3]); iso = m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2); }
    var SN = window.__tvShowName, show = isSet || (!MATCHY.test(t) && !!(seriesOf(t) || /STARDOM|スターダム|\bin\s+[A-Z]/i.test(t)));   // a show's name, not an interview or extra
    var name = t;
    if (!ja && SN) name = show ? SN.en(t, iso, true) : SN.match(t);
    if (!ja && JP.test(name)) {
      name = name.replace(/[　-〿぀-ヿ㐀-鿿＀-￯]+/g, ' ').replace(/\s+/g, ' ').trim();   // whatever is still Japanese goes
      // Japanese names gone from a match title ("Tag League & vs &"): the show's English name by date says more
      if (!show && SN && (/(^|\s)&(\s|$)|(^|\s)vs(\s|$)/.test(name) || name.length < 4)) { var sn = SN.en('', iso, true); if (sn) name = (name.replace(/[&]|\bvs\b/g, ' ').replace(/\s+/g, ' ').trim() || (ja ? '試合' : 'Match')) + ' \u00b7 ' + sn; }
    }
    return { show: show, name: name || 'Stardom World', date: date, series: show ? seriesOf(t) : '' };
  }
  function siteBlock(title, isSet) {
    var i = siteInfo(title, isSet);
    return '<div class="tvsc tvsc-site"><div class="ev">' + esc(i.show ? (ja ? '大会まるごと' : 'Full show') : 'Stardom World') + '</div><div class="nm">' + esc(i.name) + '</div><div class="ft"><span>' + esc(i.series) + '</span><b>' + esc(i.date) + '</b></div></div>';
  }
  // For the menu's lists (2.131.0): one line for a video, the StarScope names when it is logged, else the English title.
  window.__tvVideoLine = function(href, title) {
    var M = map(), id = idOf(href), v = id && M ? M[id] : null;
    if (v && v.x && window.__tvScopeIdx && window.__tvScopeIdx.oneLine) return window.__tvScopeIdx.oneLine(v);
    var i = siteInfo(title, /\/set\/\d+/.test(href || '') && !id);
    return i.name + (i.date ? ' · ' + i.date : '');
  };
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
  function skip(el) { return (el.classList.contains('tv-sc-card') && el.querySelector(':scope > .tvsc-host:not(.tv-sch)')) || el.closest('#tvsh, #tvsp, #tv-sm-shelf, .tv-ppv, #tv-sfp') || (!el.classList.contains('tv-scr') && el.querySelector('.tvsc')); }
  function run() {
    // site cards: an article with the site's title box
    Array.prototype.forEach.call(document.querySelectorAll('article'), function(art) {
      if (art.classList.contains('tv-sc1') || skip(art)) return;
      art.classList.remove('tv-scr');
      var box = art.querySelector('.content-info-box'), link = art.querySelector('a[href*="/contents/"], a[href*="/set/"]');
      if (!box || !link) return;
      var t = art.querySelector('h3, .ttl-xs'), b = body(link.getAttribute('href') || link.href, t ? t.textContent : box.textContent);
      art.classList.add('tv-sc1');
      box.insertAdjacentHTML('afterend', '<div class="tvsc-host tv-sch notranslate" translate="no">' + b.html + '</div>');
      enBox(art.querySelector('.content-thumbnail-box-inner, .content-thumbnail-box'), b.v);
    });
    // the app's own cards: a picture and a title box. a.tv-card (home rows, the related row), a.tv-rc (Recently
    // Watched page), a.tv-fp-t (My Favorites, 2.130.0)
    Array.prototype.forEach.call(document.querySelectorAll('a.tv-card, a.tv-rc, a.tv-fp-t'), function(a) {
      if (a.classList.contains('tv-sc1') || skip(a)) return;
      var href = a.getAttribute('href') || '';
      if (!/\/(contents\/\d+|set\/\d+)/.test(href)) return;
      var tb = a.classList.contains('tv-card') ? (a.children.length === 2 ? a.lastElementChild : null) : a.querySelector(':scope > .tv-rc-t, :scope > .tv-fp-tt');
      if (!tb) return;
      var b = body(href, tb.textContent), old = a.querySelector(':scope > .tv-sch');
      if (old) old.remove();
      a.classList.add('tv-sc1', 'notranslate'); a.classList.remove('tv-scr'); a.setAttribute('translate', 'no');
      tb.classList.add('tv-sc1o');
      tb.insertAdjacentHTML('afterend', '<div class="tvsc-host tv-sch">' + b.html + '</div>');
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
      var h = el.querySelector('.tv-sch'); if (h) h.remove();
    });
    soon();
  });
})();
