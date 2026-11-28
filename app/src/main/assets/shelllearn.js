(function(){
  // App page shell (2.71.0). Some app-drawn pages (tag teams, team and wrestler pages, top rated, championship pages,
  // StarScope) used to load the site's My page and draw over it. The app now answers those addresses itself with an
  // empty page, so nothing is asked of the site. That empty page still needs two things the site's pages carry:
  // the site's style sheets (the app's pages inherit their basics: box sizing, line heights, link styles) and the
  // site's own page translator (it turns Japanese video titles into English on the app's pages too).
  // This script runs on real site pages and tells the app where those are, so the shell can include the very same ones.
  if (window.__tvShell || window.__tvShellLearn) return;
  window.__tvShellLearn = true;
  var H = window.AndroidHost;
  if (!H || !H.shellLearn) return;
  function learn() {
    try {
      var css = [];
      Array.prototype.forEach.call(document.querySelectorAll('link[rel~="stylesheet"][href]'), function(l) {
        var h = l.href || '';
        if (/^https:\/\//.test(h) && css.indexOf(h) < 0 && css.length < 12) css.push(h);
      });
      var src = '', init = '';
      Array.prototype.forEach.call(document.scripts, function(s) {
        if (s.src && /translate_a\/element\.js/.test(s.src)) src = s.src;
        else if (!s.src && /TranslateElement/.test(s.textContent || '') && (s.textContent || '').length < 4000) init = s.textContent;
      });
      if (!css.length) return;
      H.shellLearn(JSON.stringify({ css: css, trSrc: src, trInit: init }));
    } catch (e) {}
  }
  // 3.1.0: learned as soon as the page's markup is in (its style sheets and translator are in the markup), so on a new
  // install the very first site page teaches the app its empty page, and the next app page skips the site's page.
  // Learned again once the page has loaded, as before, in case something arrived late.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', learn);
  else learn();
  if (document.readyState === 'complete') setTimeout(learn, 800);
  else window.addEventListener('load', function() { setTimeout(learn, 800); });
})();
