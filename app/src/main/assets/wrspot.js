(function(){
  // Wrestlers spotlight (private builds, 2.35.0). In the menu's Wrestlers shelf the names sit in three columns and a
  // portrait on the right follows focus: the wrestler's photo (the small copy, AndroidHost.wrestlerSpot), name,
  // current faction, title reigns and defences, the title they hold now, and a star when they are in My Favorites.
  // Past wrestlers (no photos) show initials. Public builds: on() is false and the shelf keeps its four text columns.
  if (window.__tvWrSpot) return;
  var H = window.AndroidHost || {};

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function parse(s) { try { return JSON.parse(s || 'null'); } catch (e) { return null; } }
  // Android's bridge matches a method by its number of arguments: a no-argument method called with one fails.
  function call(fn, a) { try { return H[fn] ? (arguments.length > 1 ? H[fn](a) : H[fn]()) : ''; } catch (e) { return ''; } }
  function low(s) { return String(s || '').toLowerCase().trim(); }
  function initials(n) { var p = String(n).trim().split(/\s+/); return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase(); }

  function on() {
    try { return !!(H.showPosters && H.showPosters() && H.wrestlerSpot); } catch (e) { return false; }
  }

  // ---- data, read once
  var DATA = null;
  function data() {
    if (DATA) return DATA;
    var facs = ((parse(call('factionsJson')) || {}).factions) || [];
    var past = ((parse(call('pastWrestlersJson')) || {}).past) || [];
    var people = {};   // search (lower) -> { name, search, ja, fac, past }
    facs.forEach(function(f) {
      (f.members || []).forEach(function(m) {
        if (!m || !m.name) return;
        var k = low(m.search || m.name), p = people[k] || (people[k] = { name: m.name, search: m.search || m.name, fac: '', past: true });
        // Current wrestlers are the members of factions that are not former (the menu's CURRENT list).
        if (!f.former) p.past = false;
        if (!f.former && f.id !== 'unaffiliated' && !p.fac) p.fac = f.name;
      });
    });
    past.forEach(function(m) {
      if (!m || !m.name) return;
      var k = low(m.search || m.name);
      if (!people[k]) people[k] = { name: m.name, search: m.search || m.name, ja: m.ja || '', fac: '', past: true };
    });
    var BELTS = ['world', 'wonder', 'goddess', 'artist', 'highspeed', 'future', 'newblood', 'iwgp', 'strong', 'kawaii'];
    var lins = [];
    BELTS.forEach(function(b) { var L = parse(call('lineageJson', b)); if (L && L.reigns) lins.push(L); });
    DATA = { people: people, lins: lins };
    return DATA;
  }

  // Title reigns across every title history (the same reading as the wrestler page, assets/wrestler.js).
  var statCache = {};
  function stats(p) {
    var key = low(p.search);
    if (statCache[key]) return statCache[key];
    var n = 0, defs = 0, now = [];
    data().lins.forEach(function(L) {
      var names = {};
      names[low(p.name)] = 1; names[low(p.search)] = 1;
      Object.keys(L.alias || {}).forEach(function(k) {
        var all = [k].concat(L.alias[k] || []);
        if (all.some(function(x) { return names[low(x)]; })) all.forEach(function(x) { names[low(x)] = 1; });
      });
      (L.reigns || []).forEach(function(r) {
        var who = String(r.champ || '').split(/\s*(?:&|,)\s*/);
        if (!who.some(function(x) { return names[low(x)]; })) return;
        n++;
        defs += r.defCount != null ? r.defCount : (r.defences || []).length;
        if (!r.end) now.push(isJa() && L.ja ? L.ja : String(L.title || L.id).replace(/\s+Championship$/i, ''));
      });
    });
    return (statCache[key] = { n: n, defs: defs, now: now });
  }

  function isFav(p) {
    try { return !!(window.__tvFav && window.__tvFav.load().w.some(function(x) { return low(x.k) === low(p.search); })); } catch (e) { return false; }
  }

  var photoCache = {};
  function photo(p) {
    if (p.past) return '';
    // The transparent cut-out when there is one, else the photo with its dark backdrop.
    if (!(p.name in photoCache)) photoCache[p.name] = call('wrestlerCutout', p.name) || call('wrestlerSpot', p.name) || '';
    return photoCache[p.name];
  }

  // ---- markup and look
  var CSS = [
    '#tv-sm-shelf .tv-wsp-wrap{display:flex;gap:24px;align-items:flex-start;}',
    '#tv-sm-shelf .tv-wsp-names{flex:1 1 auto;min-width:0;}',
    '#tv-sm-shelf .tv-wsp{flex:0 0 300px;width:300px;font-family:Arial,Helvetica,sans-serif;}',
    // Portrait G (2.46.0): stars fading out on every side, warm light behind her, a soft ring, her face and upper body sharp.
    '#tv-sm-shelf .tv-wsp-ph{position:relative;width:300px;height:450px;display:flex;align-items:center;justify-content:center;}',
    '#tv-sm-shelf .tv-wsp-sky,#tv-sm-shelf .tv-wsp-glow,#tv-sm-shelf .tv-wsp-soft,#tv-sm-shelf .tv-wsp-sharp{position:absolute;pointer-events:none;background-repeat:no-repeat;}',
    '#tv-sm-shelf .tv-wsp-sky{left:-24px;top:-20px;width:348px;height:510px;background-size:cover;background-position:center;-webkit-mask-image:radial-gradient(ellipse 174px 255px at 50% 50%,#000 0%,rgba(0,0,0,.94) 40%,rgba(0,0,0,.74) 58%,rgba(0,0,0,.44) 74%,rgba(0,0,0,.16) 89%,rgba(0,0,0,.03) 96%,transparent 100%);}',
    '#tv-sm-shelf .tv-wsp-glow{left:-24px;top:-20px;width:348px;height:470px;mix-blend-mode:screen;background:radial-gradient(circle 172px at 50% 45%,rgba(255,240,205,.40) 0%,rgba(255,236,196,.32) 32%,rgba(250,226,180,.18) 56%,rgba(244,214,160,.07) 78%,rgba(244,210,150,0) 100%);}',
    '#tv-sm-shelf .tv-wsp-soft,#tv-sm-shelf .tv-wsp-sharp{left:0;top:0;width:300px;height:450px;background-position:center top;background-size:cover;}',
    '#tv-sm-shelf .tv-wsp-soft{filter:blur(5px);-webkit-mask-image:radial-gradient(circle 228px at 50% 40%,rgba(0,0,0,.9) 0%,rgba(0,0,0,.84) 60%,rgba(0,0,0,.52) 76%,rgba(0,0,0,.2) 90%,transparent 100%);}',
    '#tv-sm-shelf .tv-wsp-sharp{-webkit-mask-image:radial-gradient(circle 196px at 50% 40%,#000 0%,#000 50%,rgba(0,0,0,.82) 64%,rgba(0,0,0,.5) 78%,rgba(0,0,0,.18) 91%,transparent 100%);}',
    '#tv-sm-shelf .tv-wsp-ini{position:relative;font-size:54px;font-weight:900;color:#C9D2DC;}',
    '#tv-sm-shelf .tv-wsp-n{margin-top:10px;font-size:22px;font-weight:900;color:#ffffff;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#tv-sm-shelf .tv-wsp-l1{margin-top:3px;font-size:15px;font-weight:600;color:#C9D2DC;min-height:18px;}',
    '#tv-sm-shelf .tv-wsp-l2{margin-top:3px;font-size:13px;font-weight:700;color:#F4C242;min-height:16px;}'
  ].join('\n');

  function html() {
    if (!document.getElementById('tv-wsp-style')) {
      var st = document.createElement('style');
      st.id = 'tv-wsp-style';
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    return '<div class="tv-wsp notranslate" translate="no"><div class="tv-wsp-ph"><div class="tv-wsp-sky"></div><div class="tv-wsp-glow"></div><div class="tv-wsp-soft"></div><div class="tv-wsp-sharp"></div><span class="tv-wsp-ini"></span></div>' +
      '<div class="tv-wsp-n"></div><div class="tv-wsp-l1"></div><div class="tv-wsp-l2"></div></div>';
  }

  // The row's search words, from its address (/contents/search?q[keyword]=...).
  function keyOf(a) {
    try { return low(new URL(a.getAttribute('data-go') || a.href, location.origin).searchParams.get('q[keyword]')); } catch (e) { return ''; }
  }

  function attach(shelf) {
    var box = shelf.querySelector('.tv-wsp');
    if (!box) return;
    var ph = box.querySelector('.tv-wsp-ph'), ini = box.querySelector('.tv-wsp-ini');
    var nEl = box.querySelector('.tv-wsp-n'), l1 = box.querySelector('.tv-wsp-l1'), l2 = box.querySelector('.tv-wsp-l2');
    var cur = null, picTimer = null;
    var soft = ph.querySelector('.tv-wsp-soft'), sharp = ph.querySelector('.tv-wsp-sharp'), stars = call('spotStars');
    if (stars) ph.querySelector('.tv-wsp-sky').style.backgroundImage = "url('" + stars + "')";
    function pic(v) { soft.style.backgroundImage = v; sharp.style.backgroundImage = v; }

    function show(a) {
      var k = keyOf(a);
      var p = data().people[k] || { name: (a.textContent || '').trim(), search: k, fac: '', past: true };
      cur = { a: a, p: p };
      var st = stats(p), fav = isFav(p);
      nEl.innerHTML = (fav ? '<span style="color:#F4C242">&#9733; </span>' : '') + esc((a.textContent || p.name).trim());
      l1.textContent = p.fac || (p.past ? T('Past wrestler', '元所属') : '');
      var bits = [];
      if (st.now.length) bits.push(T('Champion: ', '現王者：') + st.now.join(', '));
      if (st.n) bits.push(T(st.n + (st.n === 1 ? ' reign' : ' reigns') + ' · ' + st.defs + (st.defs === 1 ? ' defence' : ' defences'), '戴冠' + st.n + '回・防衛' + st.defs + '回'));
      l2.innerHTML = bits.map(esc).join('<br>');
      // The picture waits a moment, so holding an arrow down doesn't load every photo on the way.
      clearTimeout(picTimer);
      var url = (p.name in photoCache) ? photoCache[p.name] : null;
      var paint = function(u) {
        pic(u ? "url('" + u + "')" : 'none');
        ini.textContent = u ? '' : initials(p.name);
      };
      if (url !== null) paint(url);
      else {
        pic('none');
        ini.textContent = '';
        picTimer = setTimeout(function() { if (cur && cur.p === p) paint(photo(p)); }, 120);
      }
    }

    function firstVisible() {
      var bodies = shelf.querySelectorAll('[data-wbody]');
      for (var i = 0; i < bodies.length; i++) if (bodies[i].style.display !== 'none') return bodies[i].querySelector('.tv-sm-fi');
      return null;
    }

    shelf.addEventListener('focusin', function(e) {
      var a = e.target;
      if (a && a.classList && a.classList.contains('tv-sm-fi') && a.closest('[data-wbody]')) show(a);
      else if (a && a.getAttribute && a.getAttribute('data-wtab') !== null) {
        // A tab: show the first name of the list it opens.
        // Only while a tab still has focus: a quick Down may already have moved on to a name.
        setTimeout(function() {
          var ae = document.activeElement;
          if (!ae || !ae.getAttribute || ae.getAttribute('data-wtab') === null) return;
          var f = firstVisible(); if (f) show(f);
        }, 0);
      }
    });
    // The Menu button adds or removes a favorite: redraw the star.
    shelf.addEventListener('keyup', function() { if (cur) setTimeout(function() { if (cur) show(cur.a); }, 50); });

    var f0 = shelf.querySelector('[data-wbody] .tv-sm-fi:focus') || firstVisible();
    if (f0) show(f0);
  }

  window.__tvWrSpot = { on: on, html: html, attach: attach };
})();
