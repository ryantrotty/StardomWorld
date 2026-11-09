(function(){
  // Star backdrop for wrestler portraits (private builds, 2.47.0). Puts the transparent cut-out over stars and warm light,
  // as CSS for the element that already shows the portrait, so no size or layout changes. Answers '' when a wrestler has
  // no cut-out: the page then keeps the photo it showed before.
  if (window.__tvStar) return;
  var H = window.AndroidHost;
  if (!H || !H.wrestlerCutout || !H.spotStars) return;
  var cuts = {}, ready = false;
  function cut(n) {
    if (!n) return '';
    if (cuts[n] === undefined) { try { cuts[n] = H.wrestlerCutout(n) || ''; } catch (e) { cuts[n] = ''; } }
    return cuts[n];
  }
  // One copy of the star picture for the whole page; every portrait points to it.
  function sky() {
    if (ready) return;
    ready = true;
    var u = ''; try { u = H.spotStars(); } catch (e) {}
    if (!u) return;
    var st = document.createElement('style');
    st.textContent = ':root{--tv-stars:url(' + u + ');}';
    (document.head || document.documentElement).appendChild(st);
  }
  var GLOW = 'radial-gradient(circle at 50% 42%,rgba(255,236,196,.42) 0%,rgba(250,226,180,.2) 42%,rgba(244,210,150,0) 72%)';
  // mode: 'circle' (140 px circles), 'card', 'left' / 'right' (the halves of a pair card share one sky), 'tiny' (38 px, colour and glow only)
  window.__tvStar = function(names, mode) {
    var c = '';
    for (var i = 0; i < names.length && !c; i++) c = cut(names[i]);
    if (!c) return '';
    if (mode === 'tiny') return 'background-image:url(' + c + '),' + GLOW + ',linear-gradient(160deg,#1B2540,#0B1118);background-size:cover,100% 100%,100% 100%;background-position:center top,center,center;background-repeat:no-repeat;';
    sky();
    var size = mode === 'circle' ? '260% auto' : (mode === 'card' ? '170% auto' : '220% auto');
    var pos = mode === 'left' ? '0% 30%' : (mode === 'right' ? '100% 30%' : '66% 30%');
    return 'background-image:url(' + c + '),' + GLOW + ',var(--tv-stars);background-size:cover,100% 100%,' + size + ';background-position:center top,center,' + pos + ';background-repeat:no-repeat;';
  };
})();
