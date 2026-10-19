package com.example.tvhub

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.net.http.SslError
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.Toast

/**
 * Full-screen WebView host for Google TV / Android TV.
 *
 * - Opens START_URL after a short fade-in/fade-out logo splash.
 * - Cursor mode (default): a wand cursor you move with the arrow keys.
 *     Arrows move it (hold to speed up), OK clicks, pushing against the top or
 *     bottom edge scrolls the page, Channel Up/Down (or Page Up/Down) scroll a
 *     big step. Menu / Info / Yellow toggles between cursor mode and the plain
 *     highlight-ring navigation.
 * - Upgrades http:// pages on stardom-world.com to https://, the way desktop
 *   Chrome does automatically.
 * - Un-sticks fixed page headers so they scroll away with the page.
 * - Lays pages out at LAYOUT_WIDTH CSS pixels wide (desktop-style grid).
 * - Asks the site's Google translate widget for English and hides the widget.
 * - Keeps cookies, so a normal sign-in persists between launches.
 * - Back: exits fullscreen video, then goes back a page, then closes the app.
 * - Media keys control the first <video> on the page.
 */
class MainActivity : Activity() {

    private fun getSavedLanguage(): String {
        val prefs = getSharedPreferences("tvhub_prefs", MODE_PRIVATE)
        return prefs.getString("user_lang", "en") ?: "en"
    }

    private fun saveLanguage(lang: String) {
        val prefs = getSharedPreferences("tvhub_prefs", MODE_PRIVATE)
        prefs.edit().putString("user_lang", lang).apply()
    }

    companion object {
        private const val START_URL = "https://www.stardom-world.com/"

        private const val DESKTOP_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

        // Cursor size in dp, and where the click point (the star centre) sits
        // inside the cursor image, as a fraction of its width/height.
        private const val CURSOR_DP = 56f
        private const val HOT_X = 0.234f
        private const val HOT_Y = 0.234f

        // Mouse-wheel "notches" sent when scrolling.
        private const val SCROLL_NOTCH = 2f

        // Width the page believes the screen is, in CSS pixels. Wider = more videos
        // per row but smaller text.
        private const val LAYOUT_WIDTH = 1440

        private const val SPLASH_MIN_MS = 20000L
        private const val SPLASH_MAX_MS = 25000L

            private val TV_RAW_CSS = """
        html, body, #page-contents-search, #page-contents-index, #main-contents, main, .wrapper, header, .box-header, .header, nav, .nav-inner, .global-nav, .content-list, .content-info-box, .modal-content, .bg-dark, .bg-light, .box-section, .box-sort, .box-search, section, .container, .container-fluid, .col-12, .row, .tile-inner, .l-wrap-md, .ttl-wrap, .slick-slider, .slick-list, .slick-track, .slick-slide {
            background: #000000 !important;
            background-color: #000000 !important;
            color: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
        }
        .content-thumbnail-box-inner {
            background-color: transparent !important;
        }
        header, .box-header, nav, .nav-inner, header::after, .box-header::after, .nav-inner::after, hr, .border-bottom {
            border: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
        }
        .content-status-box, .tag, .tag.premium, .content-status-box span, [class*="tag"], [class*="premium"], .news-wrap, section.news-wrap, .tile-inner.news-wrap, [class*="news-wrap"], nav.box-breadCrumb, .box-breadCrumb, .list-breadCrumb, [class*="breadCrumb"], [class*="breadcrumb" i], .topic-path, ol.breadcrumb, ul.breadcrumb, .wswg-wrap, .inner-sm p, p.txt-gr, .box-set-info p, .set-info-text, .list-btn, footer nav, footer .container, .footer-logo, .box-copyright, footer ul, #toTopBtn, .TopBtn, a.TopBtn {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
        }
        /* Hide grey description text, purchase banners, and social buttons */
        .movieMessage, .inner-sm, .fav-wrap, .box-set-detail, .box-contents-info, .box-contents-head, .btn-share, .box-share, .social-btn, .box-favorite, .btn-favorite, [class*="favorite"], [class*="share"], a[href*="previous"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        /* Hide ONLY the match title text directly below video player */
        h1.ttl-lg, .box-content > h1 {
            display: none !important;
        }
        /* Remove grey background and collapse empty margins on detail-wrap container */
        .detail-wrap, .box-contents-detail, .content-ttl-wrap {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            margin-top: 0px !important;
            margin-bottom: 0px !important;
            padding-top: 0px !important;
            padding-bottom: 0px !important;
        }
        /* Completely hide second/subsequent category carousel section (e.g. '2026') on content pages, keeping Row 1 intact */
        .box-related-content ~ .box-related-content {
            display: none !important;
            visibility: hidden !important;
            height: 0px !important;
            min-height: 0px !important;
            margin: 0px !important;
            padding: 0px !important;
        }
        /* Reduce top margin above set title text tag (.ttl-md, h2.ttl-md) */
        .ttl-md, h2.ttl-md, .ttl-sub, .box-ttl-sub, .sub-category-ttl, .sub-category-list, .box-contents-sub {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #ffffff !important;
            font-weight: bold !important;
            margin-top: 2px !important;
            margin-bottom: 4px !important;
            padding-top: 0px !important;
            padding-bottom: 0px !important;
            height: auto !important;
            min-height: unset !important;
        }
        footer, .box-footer {
            display: block !important;
            background: #000000 !important;
            background-color: #000000 !important;
            padding: 20px 0 40px 0 !important;
            margin: 0 !important;
            border: none !important;
            text-align: center !important;
        }

        .content-info-box, .js-tilefix {
            height: auto !important;
            min-height: 64px !important;
            overflow: visible !important;
        }
        .content-info-box .ttl-xs, .ttl-xs.ellipsis, h3.ttl-xs, .content-info-box h3, .content-info-box h3 a, .content-info-box font {
            white-space: normal !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            height: auto !important;
            min-height: 4.4em !important;
            max-height: 4.8em !important;
            line-height: 1.45em !important;
            font-size: 15px !important;
            color: #ffffff !important;
            margin-bottom: 6px !important;
            padding-bottom: 2px !important;
        }
        .content-list-item, .content-list > div, article {
            margin-bottom: 12px !important;
            padding-bottom: 2px !important;
        }
        #tv-header-flex-wrapper {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 16px !important;
            margin: 0 auto !important;
            height: 44px !important;
        }
        form.form-inline, .box-search form, .box-search .input-group, .input-group.flex-nowrap {
            width: 320px !important;
            max-width: 320px !important;
            height: 44px !important;
            margin: 0 !important;
            background: transparent !important;
            display: flex !important;
            align-items: center !important;
        }
        form.form-inline input.form-control, form.form-inline input[type="text"], input[name="q[keyword]"] {
            height: 44px !important;
            font-size: 15px !important;
            padding-left: 14px !important;
            background-color: #1a1a1a !important;
            color: #ffffff !important;
            border: 1px solid #333333 !important;
            border-radius: 4px 0 0 4px !important;
            box-sizing: border-box !important;
        }
        form.form-inline input[type="submit"], .input-group input[type="submit"], form[action*="search"] input[type="submit"], .input-group-btn, .input-group-append {
            height: 44px !important;
            min-width: 48px !important;
            font-size: 16px !important;
            background-color: #2a2a2a !important;
            color: #ffffff !important;
            border: 1px solid #333333 !important;
            border-left: none !important;
            border-radius: 0 4px 4px 0 !important;
            box-sizing: border-box !important;
        }
        .global-nav-list.global-nav {
            display: none !important;
        }
        #tv-section-select {
            width: 320px !important;
            max-width: 320px !important;
            height: 44px !important;
            background-color: #1a1a1a !important;
            color: #ffffff !important;
            border: 1px solid #333333 !important;
            border-radius: 4px !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            padding: 0 14px !important;
            margin: 0 !important;
            outline: none !important;
            cursor: pointer !important;
            display: inline-block !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
        }
        #tv-section-select option {
            background-color: #111111 !important;
            color: #ffffff !important;
            padding: 10px !important;
        }
        #tv-lang-toggle-btn {
            height: 38px !important;
            min-width: 50px !important;
            background: transparent !important;
            background-color: transparent !important;
            color: #FFB347 !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            padding: 0 8px !important;
            margin-left: 8px !important;
            cursor: pointer !important;
            display: inline-block !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
        }
        #tv-lang-toggle-btn:focus, #tv-lang-toggle-btn:hover {
            color: #ffffff !important;
            text-shadow: 0 0 8px rgba(255, 179, 71, 0.8) !important;
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
        }
        #tv-fav-header-btn {
            height: 44px !important;
            line-height: 44px !important;
            background: transparent !important;
            background-color: transparent !important;
            color: #FFB347 !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            padding: 0 10px !important;
            margin-left: 12px !important;
            cursor: pointer !important;
            display: inline-block !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
            text-decoration: none !important;
        }
        #tv-fav-header-btn:focus, #tv-fav-header-btn:hover {
            color: #ffffff !important;
            text-shadow: 0 0 8px rgba(255, 179, 71, 0.8) !important;
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
        }
            background-color: #2a2a2a !important;
            border-color: #FFB347 !important;
        }
        .box-sort {
            background: #000000 !important;
            background-color: #000000 !important;
            padding: 12px 0 !important;
            margin: 10px 0 15px 0 !important;
            text-align: center !important;
            display: block !important;
            border: none !important;
        }
        .box-sort * {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .box-sort > a, .box-sort a.btn {
            font-size: 17px !important;
            font-weight: 500 !important;
            color: #bbbbbb !important;
            padding: 6px 14px !important;
            margin: 0 8px !important;
            display: inline-block !important;
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            text-decoration: none !important;
            cursor: pointer !important;
        }
        .box-sort > a.active, .box-sort a.btn.active {
            color: #FFB347 !important;
            font-weight: 700 !important;
            border-bottom: 2px solid #FFB347 !important;
            background: transparent !important;
        }
        .box-sort a i, .box-sort a font, .box-sort a span {
            color: inherit !important;
            font-size: inherit !important;
            font-weight: inherit !important;
            display: inline !important;
        }
        /* Enable smooth site hover transitions on video thumbnail cards and links */
        .content-thumbnail-box, .tile-inner, .content-list-item article {
            transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out !important;
        }
        .content-thumbnail-box:hover, .content-list-item article:hover {
            transform: scale(1.03) !important;
            opacity: 0.85 !important;
        }
    """.trimIndent()

    }

    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private lateinit var cursorView: ImageView
    private lateinit var splashView: FrameLayout
    private lateinit var splashLogo: ImageView

    private val handler = Handler(Looper.getMainLooper())
    private var density = 1f

    private var cursorMode = false
    private var cursorX = 0f
    private var cursorY = 0f

    private var splashStartedAt = 0L
    private var splashDone = false
    private var splashDismissScheduled = false

        private var customView: View? = null
    private var customCallback: WebChromeClient.CustomViewCallback? = null

    // Bright ring around whatever the remote has selected (used when cursor mode is off).
    private val focusJs = """
        (function(){
          if (document.getElementById('tv-focus-style')) return;
          var s = document.createElement('style');
          s.id = 'tv-focus-style';
          s.textContent = '*:focus{outline:4px solid #FFB347 !important;outline-offset:3px !important;box-shadow:0 0 0 8px rgba(255,90,78,.55) !important;}';
          (document.head || document.documentElement).appendChild(s);
        })();
    """.trimIndent()

    private val removeFocusJs = """
        (function(){
          var s = document.getElementById('tv-focus-style');
          if (s && s.parentNode) s.parentNode.removeChild(s);
        })();
    """.trimIndent()

    // Turns a fixed/sticky header at the top of the page into a normal one, so it
    // scrolls away with the rest of the page instead of covering the content.
    private val headerJs = """
        (function(){
          if (window.__tvHeaderFix) return;
          window.__tvHeaderFix = true;
          function unfix(){
            try {
              var vw = window.innerWidth, vh = window.innerHeight;
              var xs = [vw * 0.5, vw * 0.25, vw * 0.75];
              for (var i = 0; i < xs.length; i++) {
                var stack = document.elementsFromPoint(xs[i], 4);
                for (var j = 0; j < stack.length; j++) {
                  var el = stack[j];
                  while (el && el !== document.body && el !== document.documentElement) {
                    var cs = getComputedStyle(el);
                    if (cs.position === 'fixed' || cs.position === 'sticky') {
                      var r = el.getBoundingClientRect();
                      if (r.top <= 8 && r.width >= vw * 0.6 && r.height <= vh * 0.4) {
                        el.style.setProperty('position', cs.position === 'fixed' ? 'absolute' : 'relative', 'important');
                      }
                    }
                    el = el.parentElement;
                  }
                }
              }
            } catch (e) {}
          }
          var pending = null;
          function schedule(){
            if (pending) return;
            pending = setTimeout(function(){ pending = null; unfix(); }, 150);
          }
          unfix();
          window.addEventListener('scroll', schedule, {passive: true});
          window.addEventListener('resize', schedule);
          new MutationObserver(schedule).observe(document.documentElement, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style']
          });
          setTimeout(unfix, 500);
          setTimeout(unfix, 1500);
        })();
    """.trimIndent()

    // Hides the Google "Select Language" widget, its banner and tooltips. The
    // translation itself keeps working; only the on-screen controls disappear.
    private val hideTranslateJs = """
        (function(){
          if (document.getElementById('tv-hide-translate')) return;
          var s = document.createElement('style');
          s.id = 'tv-hide-translate';
          s.textContent = '.goog-te-banner-frame,.goog-te-banner-frame.skiptranslate,iframe.skiptranslate,.goog-te-menu-frame,#google_translate_element,.goog-te-gadget,.goog-te-gadget-simple,.goog-te-balloon-frame,#goog-gt-tt,.goog-tooltip,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none !important;} body{top:0px !important; visibility:visible !important; opacity:1 !important;} .goog-text-highlight{background:none !important;box-shadow:none !important;}';
          (document.head || document.documentElement).appendChild(s);
        })();
    """.trimIndent()

    // Fallback: if the translate widget is present but not already on English, pick English.
    private val translateJs = """
        (function(){
          if (window.__tvTranslate) return;
          window.__tvTranslate = true;
          var tries = 0;
          var timer = setInterval(function(){
            tries++;
            var sel = document.querySelector('select.goog-te-combo');
            if (sel && sel.options.length > 1) {
              if (sel.value !== 'en') {
                sel.value = 'en';
                sel.dispatchEvent(new Event('change'));
              }
              if (sel.value === 'en') clearInterval(timer);
            }
            if (tries > 40) clearInterval(timer);
          }, 500);
        })();
    """.trimIndent()

    // Automatically loads the next page of content as the user scrolls near the bottom of desktop pages.
    private val infiniteScrollJs = """
        (function(){
          if (window.__tvInfiniteScroll) return;
          window.__tvInfiniteScroll = true;

          var loading = false;

          function hidePagination() {
            var pagers = document.querySelectorAll('.pagination, .p-pagination, .pager');
            pagers.forEach(function(el) {
              el.style.display = 'none';
            });
          }

          function checkAndLoadNextPage() {
            if (loading) return;

            var scrollBottom = window.innerHeight + window.scrollY;
            var pageHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

            if (pageHeight - scrollBottom > 800) return;

            var nextLink = document.querySelector('a[rel="next"], .pagination a.next, a.page-link[rel="next"]');
            if (!nextLink || !nextLink.href) return;

            var nextUrl = nextLink.href;
            loading = true;

            fetch(nextUrl)
              .then(function(res) { return res.text(); })
              .then(function(html) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(html, 'text/html');

                var container = document.querySelector('.content-list, [class*="content-list"]');
                var newContainer = doc.querySelector('.content-list, [class*="content-list"]');

                if (container && newContainer) {
                  var newItems = Array.from(newContainer.children);
                  newItems.forEach(function(item) {
                    var itemLink = item.querySelector('a[href*="/contents/"], a[href*="/set/"]') || item.querySelector('a[href]');
                    if (itemLink && itemLink.href) {
                      var rawHref = itemLink.getAttribute('href') || itemLink.href;
                      var match = rawHref.match(/(?:contents|set)\/(\d+)/);
                      if (match && match[1]) {
                        var id = match[1];
                        if (container.querySelector('a[href*="/' + id + '"]')) {
                          return;
                        }
                      } else {
                        if (container.querySelector('a[href="' + itemLink.href + '"]')) {
                          return;
                        }
                      }
                    }
                    container.appendChild(item);
                  });
                }

                var oldPagination = document.querySelector('.pagination, .p-pagination, .pager');
                var newPagination = doc.querySelector('.pagination, .p-pagination, .pager');
                if (oldPagination && newPagination) {
                  oldPagination.parentNode.replaceChild(newPagination, oldPagination);
                } else {
                  var nextNext = doc.querySelector('a[rel="next"]');
                  if (nextLink && nextNext) {
                    nextLink.href = nextNext.href;
                  } else if (nextLink) {
                    nextLink.parentNode.removeChild(nextLink);
                  }
                }

                hidePagination();
                loading = false;
              })
              .catch(function(err) {
                loading = false;
              });
          }

          hidePagination();
          window.addEventListener('scroll', checkAndLoadNextPage, { passive: true });
          setInterval(checkAndLoadNextPage, 1000);
        })();
    """.trimIndent()

    // Automatically redirects from a video set page directly to Match 1 (first match of the set)
    private val redirectToFirstMatchJs = """
        (function(){
          if (window.__tvRedirectingToMatch1) return;
          
          var path = window.location.pathname;
          var isContentPage = path.indexOf('/contents/') !== -1;
          var isSetPage = !isContentPage && (
            path.indexOf('/set/') !== -1 || 
            path.indexOf('/box-contents-index/') !== -1 || 
            path.indexOf('/series/') !== -1 ||
            path.indexOf('/contents-set/') !== -1
          );
          
          if (!isSetPage) return;

          function findAndRedirect() {
            if (window.__tvRedirectingToMatch1) return;

            var containers = document.querySelectorAll('.content-list, .box-contents-list, .box-contents, .container.box-main, main, body');
            var targetLink = null;

            for (var i = 0; i < containers.length; i++) {
              var c = containers[i];
              var links = Array.from(c.querySelectorAll('a[href*="/contents/"]')).filter(function(a) {
                return !a.closest('.box-related, .ttl-related, .related-title, .slick-slider, [class*="related"]');
              });

              if (links.length > 0) {
                var contentItems = [];
                links.forEach(function(a) {
                  var m = a.href.match(/\/contents\/(\d+)/);
                  if (m) {
                    contentItems.push({ href: a.href, id: parseInt(m[1], 10) });
                  }
                });

                if (contentItems.length > 0) {
                  // First chronological match (Opening Match) is the LAST item in the set list, AND the HIGHEST content ID
                  var lastItem = contentItems[contentItems.length - 1];
                  var sortedByIdDescending = contentItems.slice().sort(function(a, b) { return b.id - a.id; });
                  var highestIdItem = sortedByIdDescending[0];

                  targetLink = lastItem ? lastItem.href : highestIdItem.href;
                  break;
                }
              }
            }

            if (targetLink && targetLink !== window.location.href) {
              window.__tvRedirectingToMatch1 = true;
              document.documentElement.style.opacity = '0';
              window.location.replace(targetLink);
            }
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', findAndRedirect);
          } else {
            findAndRedirect();
          }
          
          var timer = setInterval(findAndRedirect, 100);
          setTimeout(function() { 
            clearInterval(timer); 
          }, 3000);
        })();
    """.trimIndent()

    // Reverses the order of the first video carousel below the player on content pages so Match 1 is on the left
    private val reverseFirstCarouselJs = """
        (function(){
          if (window.__tvReverseCarouselDone) return;
          var path = window.location.pathname;
          if (path.indexOf('/contents/') === -1) return;

          function doReverse() {
            var $ = window.jQuery || window.$;
            var carousels = document.querySelectorAll('.content-list.js-list-slide, .js-list-slide');
            if (!carousels.length) return;

            var firstCarousel = carousels[0];
            if (firstCarousel.__tvReversed) return;

            var items = Array.from(firstCarousel.querySelectorAll('.content-list-item, .sub-category-list-item')).filter(function(el) {
              return !el.classList.contains('slick-cloned');
            });

            if (items.length < 2) return;

            firstCarousel.__tvReversed = true;
            window.__tvReverseCarouselDone = true;

            var isSlick = $ && $(firstCarousel).hasClass('slick-initialized');
            if (isSlick) {
              try { $(firstCarousel).slick('unslick'); } catch(e) {}
            }

            items.reverse().forEach(function(item) {
              firstCarousel.appendChild(item);
            });

            if ($ && typeof $(firstCarousel).slick === 'function') {
              try {
                $(firstCarousel).slick({
                  dots: false,
                  infinite: false,
                  speed: 300,
                  slidesToShow: 4,
                  slidesToScroll: 2,
                  prevArrow: '<a class="custum-prevBtn btn-theme" href="#"><i class="fa fa-angle-left"></i></a>',
                  nextArrow: '<a class="custum-nextBtn btn-theme" href="#"><i class="fa fa-angle-right"></i></a>',
                  responsive: [
                    { breakpoint: 1200, settings: { slidesToShow: 3, slidesToScroll: 2 } },
                    { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 1 } }
                  ]
                });
              } catch(e) {}
            }
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doReverse);
          } else {
            doReverse();
          }

          var timer = setInterval(doReverse, 300);
          setTimeout(function() { clearInterval(timer); }, 4000);
        })();
    """.trimIndent()

    private fun getResourceBase64(resId: Int): String {
        return try {
            val bytes = resources.openRawResource(resId).use { it.readBytes() }
            "data:image/png;base64," + android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
        } catch (_: Exception) {
            ""
        }
    }

    private fun injectCustomTvStyles(view: WebView) {
        val logoUri = getResourceBase64(R.drawable.header_logo)
        val encodedCss = java.net.URLEncoder.encode(TV_RAW_CSS, "UTF-8").replace("+", "%20")
        val activeLang = getSavedLanguage()

        val js = """
            (function(){
              try {
                // Inject CSS
                if (!document.getElementById('tv-app-style')) {
                  var s = document.createElement('style');
                  s.id = 'tv-app-style';
                  s.textContent = decodeURIComponent('$encodedCss');
                  (document.head || document.documentElement).appendChild(s);
                }
                if (!document.getElementById('tv-top-btn-style')) {
                  var topStyle = document.createElement('style');
                  topStyle.id = 'tv-top-btn-style';
                  topStyle.textContent = '#toTopBtn,.TopBtn,a.TopBtn,[class*="TopBtn"],[class*="topBtn"],[id*="toTop"],[id*="ToTop"]{display:none !important;visibility:hidden !important;opacity:0 !important;width:0 !important;height:0 !important;min-height:0 !important;max-height:0 !important;margin:0 !important;padding:0 !important;pointer-events:none !important;position:absolute !important;left:-9999px !important;}#toTopBtn::before,.TopBtn::before,a.TopBtn::before,#toTopBtn::after,.TopBtn::after,a.TopBtn::after{content:none !important;display:none !important;}';
                  (document.head || document.documentElement).appendChild(topStyle);
                }

                function applyDomCustomizations() {
                  try {
                    // Universal Header Branding Logo Replacement
                    var logoUriStr = '$logoUri';
                    if (logoUriStr) {
                      var siteLogos = document.querySelectorAll('h1 a img, .nav-inner h1 img, .box-header .nav-inner img, header a img, .logo img, [class*="logo"] img');
                      siteLogos.forEach(function(img) {
                        if (img.src !== logoUriStr) {
                          img.src = logoUriStr;
                          img.srcset = '';
                          img.removeAttribute('srcset');
                          img.style.maxHeight = '42px';
                          img.style.width = 'auto';
                          img.style.objectFit = 'contain';
                        }
                      });
                    }

                    // Search input placeholder & language adaptation
                    var isJa = ('$activeLang' === 'ja');
                    var searchInputs = document.querySelectorAll('input[name="q[keyword]"], input[placeholder*="keyword"], input[placeholder*="キーワード"], input[placeholder*="SEARCH"], input[placeholder*="検索"]');
                    searchInputs.forEach(function(inp) {
                      inp.setAttribute('placeholder', isJa ? '検索' : 'SEARCH');
                    });

                    // Header section dropdown
                    var globalNav = document.querySelector('.global-nav-list.global-nav');
                    var searchForm = document.querySelector('form.form-inline, .input-group');

                    if (searchForm && searchForm.parentNode) {
                      var flexWrapper = document.getElementById('tv-header-flex-wrapper');
                      if (!flexWrapper) {
                        flexWrapper = document.createElement('div');
                        flexWrapper.id = 'tv-header-flex-wrapper';
                        searchForm.parentNode.insertBefore(flexWrapper, searchForm);
                        flexWrapper.appendChild(searchForm);
                      }

                      if (globalNav && !document.getElementById('tv-section-select')) {
                        var select = document.createElement('select');
                        select.id = 'tv-section-select';

                        var defaultOpt = document.createElement('option');
                        defaultOpt.id = 'tv-section-default-opt';
                        defaultOpt.value = '';
                        defaultOpt.disabled = true;
                        defaultOpt.selected = true;
                        defaultOpt.textContent = isJa ? 'カテゴリー・セクションを選択...' : 'Select Category / Section...';
                        select.appendChild(defaultOpt);

                        var links = globalNav.querySelectorAll('a');
                        links.forEach(function(link) {
                          var txt = link.textContent.trim();
                          if (txt && link.href) {
                            var opt = document.createElement('option');
                            opt.value = link.href;
                            opt.textContent = txt;
                            select.appendChild(opt);
                          }
                        });

                        select.addEventListener('change', function() {
                          if (this.value) window.location.href = this.value;
                        });

                        flexWrapper.appendChild(select);
                      }

                      // Favorites Heart Button (To the right of Category Dropdown and left of Login/Profile)
                      var sectionSelect = document.getElementById('tv-section-select');
                      var favBtn = document.getElementById('tv-fav-header-btn');
                      if (!favBtn) {
                        favBtn = document.createElement('a');
                        favBtn.id = 'tv-fav-header-btn';
                        favBtn.className = 'notranslate';
                        favBtn.setAttribute('translate', 'no');
                        favBtn.href = 'https://www.stardom-world.com/mypage/favorites';
                        if (sectionSelect && sectionSelect.nextSibling) {
                          flexWrapper.insertBefore(favBtn, sectionSelect.nextSibling);
                        } else {
                          flexWrapper.appendChild(favBtn);
                        }
                      } else if (sectionSelect && favBtn.previousSibling !== sectionSelect) {
                        if (sectionSelect.nextSibling) {
                          flexWrapper.insertBefore(favBtn, sectionSelect.nextSibling);
                        } else {
                          flexWrapper.appendChild(favBtn);
                        }
                      }
                      var currentLang = '$activeLang';
                      favBtn.innerHTML = (currentLang === 'ja') ? '♥ お気に入り' : '♥ Favorites';

                      // Remove old favLi if present
                      var oldFavLi = document.getElementById('tv-fav-li');
                      if (oldFavLi && oldFavLi.parentNode) {
                        oldFavLi.parentNode.removeChild(oldFavLi);
                      }

                      var btnWrap = document.querySelector('.global-nav-list.btn-wrap, .btn-wrap, header .text-right.float-r');
                      if (btnWrap) {
                        // Language toggle button
                        var langLi = document.getElementById('tv-lang-li');
                        if (!langLi) {
                          langLi = document.createElement('li');
                          langLi.id = 'tv-lang-li';
                          langLi.style.setProperty('display', 'inline-block', 'important');
                          langLi.style.setProperty('vertical-align', 'middle', 'important');
                          langLi.style.setProperty('margin-left', '8px', 'important');
                          btnWrap.appendChild(langLi);
                        }

                        var langBtn = document.getElementById('tv-lang-toggle-btn');
                        if (!langBtn) {
                          langBtn = document.createElement('button');
                          langBtn.id = 'tv-lang-toggle-btn';
                          langBtn.className = 'notranslate';
                          langBtn.setAttribute('translate', 'no');
                          langLi.appendChild(langBtn);
                        }
                        langBtn.textContent = (currentLang === 'ja') ? 'EN' : '日本語';
                        langBtn.onclick = function(e) {
                          e.preventDefault();
                          e.stopPropagation();
                          var nextLang = (currentLang === 'ja') ? 'en' : 'ja';
                          if (window.AndroidHost && typeof window.AndroidHost.toggleLanguage === 'function') {
                            window.AndroidHost.toggleLanguage(nextLang);
                          }
                        };
                      }
                    }

                    // Auto-play video (HTML5 video & Vimeo iframe)
                    var vList = document.querySelectorAll('video');
                    vList.forEach(function(v) {
                      if (v && v.paused && !v.__tvAutoPlayed) {
                        v.autoplay = true;
                        var playPromise = v.play();
                        if (playPromise !== undefined && playPromise !== null) {
                          playPromise.then(function() {
                            v.__tvAutoPlayed = true;
                          }).catch(function() {
                            v.muted = true;
                            v.play().catch(function(){});
                            v.__tvAutoPlayed = true;
                          });
                        } else {
                          v.__tvAutoPlayed = true;
                        }
                      }
                    });

                    var vimeoIframes = document.querySelectorAll('iframe[src*="vimeo.com"], iframe[src*="player"]');
                    vimeoIframes.forEach(function(iframe) {
                      if (!iframe.getAttribute('allow') || !iframe.getAttribute('allow').includes('autoplay')) {
                        iframe.setAttribute('allow', 'autoplay; fullscreen');
                        iframe.setAttribute('allowfullscreen', 'true');
                      }
                      if (iframe.src && iframe.src.indexOf('vimeo.com') !== -1 && iframe.src.indexOf('autoplay=1') === -1) {
                        var sep = iframe.src.indexOf('?') !== -1 ? '&' : '?';
                        iframe.src = iframe.src + sep + 'autoplay=1&autopause=0&muted=0';
                      }
                      if (iframe.contentWindow && !iframe.__tvPlaySent) {
                        try {
                          iframe.contentWindow.postMessage('{"method":"play"}', '*');
                          iframe.__tvPlaySent = true;
                        } catch(e) {}
                      }
                    });

                    // Normalize card elements so ONLY the thumbnail image box is interactive
                    var allArticles = document.querySelectorAll('article, .content-list-item');
                    allArticles.forEach(function(art) {
                      art.setAttribute('tabindex', '-1');

                      var thumbBox = art.querySelector('.content-thumbnail-box, .content-thumbnail');
                      var thumbLink = art.querySelector('.content-thumbnail a[href], a[href*="/contents/"], a[href*="/set/"]');

                      if (thumbLink) {
                        thumbLink.classList.add('tv-thumbnail-link');
                        thumbLink.setAttribute('tabindex', '0');
                        thumbLink.style.setProperty('display', 'block', 'important');
                      }

                      if (thumbBox) {
                        thumbBox.setAttribute('tabindex', '0');
                      }

                      var infoBox = art.querySelector('.content-info-box');
                      if (infoBox) {
                        infoBox.setAttribute('tabindex', '-1');
                        infoBox.style.setProperty('pointer-events', 'none', 'important');
                        var titleLinks = infoBox.querySelectorAll('a, h1, h2, h3, h4');
                        titleLinks.forEach(function(tl) {
                          tl.setAttribute('tabindex', '-1');
                          tl.style.setProperty('pointer-events', 'none', 'important');
                        });
                      }

                      var badges = art.querySelectorAll('.label-set, .tag, [class*="label"], [class*="tag"]');
                      badges.forEach(function(b) {
                        b.setAttribute('tabindex', '-1');
                        b.style.setProperty('pointer-events', 'none', 'important');
                      });
                    });

                    // Remove Return-To-Top button completely
                    var topBtns = document.querySelectorAll('#toTopBtn, .TopBtn, a.TopBtn, [class*="TopBtn"], [class*="topBtn"], [id*="toTop"], [id*="ToTop"]');
                    topBtns.forEach(function(btn) {
                      btn.style.setProperty('display', 'none', 'important');
                      btn.style.setProperty('visibility', 'hidden', 'important');
                      btn.style.setProperty('height', '0px', 'important');
                      btn.style.setProperty('width', '0px', 'important');
                      if (btn.parentNode) {
                        try { btn.parentNode.removeChild(btn); } catch(e) {}
                      }
                    });
                  } catch(e) {}
                }

                    // Scoped content page gap tightening & Match Title / Related Videos heading removal
                    if (window.location.pathname.indexOf('/contents/') !== -1) {
                      var matchH1s = document.querySelectorAll('h1.ttl-lg, .box-content > h1');
                      matchH1s.forEach(function(h1) {
                        h1.style.setProperty('display', 'none', 'important');
                      });

                      var allH2s = document.querySelectorAll('h1, h2, h3, h4, .ttl-md, .ttl-related, .related-title, .box-related-ttl');
                      allH2s.forEach(function(el) {
                        var txt = (el.textContent || '').trim().toLowerCase();
                        if (txt === 'related videos' || txt === '関連動画' || txt === '関連コンテンツ' || txt === 'related content' || el.classList.contains('ttl-related') || el.classList.contains('related-title')) {
                          el.style.setProperty('display', 'none', 'important');
                        }
                      });
                    }
                    // Track mouse client coordinates
                    if (!window.__tvHoverInspectorAttached) {
                      window.__tvHoverInspectorAttached = true;
                      document.addEventListener('mousemove', function(e) {
                        window.__tvLastMouseX = e.clientX;
                        window.__tvLastMouseY = e.clientY;
                      }, true);
                    }

                    // Favorites Toggle Function
                    window.__tvToggleCardFavorite = function(list) {
                      function logToScreen(msg, color) {}

                      var $ = window.jQuery || window.$;
                      if (!list) {
                        logToScreen('ERROR: Empty element list received', '#FF4444');
                        return false;
                      }
                      if (!Array.isArray(list)) list = [list];

                      logToScreen('--- Options Pressed ---', '#FFD700');
                      logToScreen('Elements under pointer: ' + list.length + ' items');

                      var targetContentId = null;
                      var targetCard = null;
                      var isSetUrl = false;
                      var matchedHref = '';

                      for (var i = 0; i < list.length; i++) {
                        var el = list[i];
                        if (!el) continue;
                        if (el.closest && el.closest('.slick-cloned')) continue;

                        var parentBox = el.closest('.content-thumbnail-box, .content-thumbnail, article, .content-list-item, .tile-inner, .slick-slide, .content-info-box, .box-content') || (el.parentNode ? el.parentNode : el);
                        var link = (parentBox ? parentBox.querySelector('a[href*="/contents/"], a[href*="/set/"], a[href]') : null) ||
                                   el.closest('a[href*="/contents/"], a[href*="/set/"], a[href]') ||
                                   el.querySelector('a[href*="/contents/"], a[href*="/set/"], a[href]');

                        if (link) {
                          var rawHref = link.getAttribute('href') || link.href || '';
                          var match = rawHref.match(/(?:contents|set)\/(\d+)/);
                          if (match && match[1]) {
                            targetContentId = match[1];
                            matchedHref = rawHref;
                            targetCard = el.closest('article, .content-list-item, .tile-inner, .slick-slide') || el;
                            break;
                          }
                        }
                      }

                      if (!targetContentId) {
                        logToScreen('FAILED: No /contents/ or /set/ ID found under cursor', '#FF4444');
                        return false;
                      }

                      logToScreen('MATCH: ID=' + targetContentId + ' | Type=' + (isSetUrl ? 'Set' : 'Content'), '#00FFFF');
                      logToScreen('URL: ' + matchedHref.substring(0, 50) + '...', '#88FF88');

                      var isFavPage = window.location.pathname.indexOf('/favorites') !== -1 || window.location.pathname.indexOf('/favorite') !== -1;
                      var apiType = isFavPage ? 'DELETE' : 'POST';

                      if (isFavPage && targetCard) {
                        targetCard.style.setProperty('opacity', '0.3', 'important');
                      }

                      if ($ && $.apiCall) {
                        var endpointUrl = '/user_api/contents/' + targetContentId + '/favorites';
                        logToScreen('API: Sending ' + apiType + ' ' + endpointUrl, '#FFFF00');

                        $.apiCall({
                          url: endpointUrl,
                          type: apiType
                        }).done(function(data) {
                          logToScreen('SUCCESS 200 OK: ' + (isFavPage ? 'Removed' : 'Added to Favorites!'), '#00FF66');
                          if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                            window.AndroidHost.logDebug(isFavPage ? 'Removed from Favorites' : '♥ Added to Favorites!');
                          }
                        }).fail(function(jqXHR) {
                          logToScreen('API FAIL HTTP ' + jqXHR.status + ': ' + (jqXHR.responseText || ''), '#FF4444');
                          if (jqXHR.status === 400 && window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                            window.AndroidHost.logDebug('Please log in on Stardom World to sync favorites');
                          }
                        });
                      } else {
                        logToScreen('ERROR: jQuery $.apiCall not available', '#FF4444');
                      }
                      return true;
                    };

                    applyDomCustomizations();
                    if (!window.__tvDomTimer) {
                      window.__tvDomTimer = setInterval(applyDomCustomizations, 300);
                    }
              } catch(e) {}
            })();
        """.trimIndent()

        view.evaluateJavascript(js, null)
    }

    private fun viewportJs(): String {
        val scale = resources.displayMetrics.widthPixels / (LAYOUT_WIDTH * density)
        val content =
            "width=$LAYOUT_WIDTH, initial-scale=$scale, minimum-scale=$scale, " +
                "maximum-scale=$scale, user-scalable=no"
        return """
            (function(){
              var desired = '__CONTENT__';
              function apply(){
                var m = document.querySelector('meta[name=viewport]');
                if (!m) {
                  if (!document.head) return;
                  m = document.createElement('meta');
                  m.setAttribute('name', 'viewport');
                  document.head.appendChild(m);
                }
                if (m.getAttribute('content') !== desired) m.setAttribute('content', desired);
              }
              apply();
              if (!window.__tvViewportObserver && document.head) {
                window.__tvViewportObserver = new MutationObserver(apply);
                window.__tvViewportObserver.observe(document.head, {
                  childList: true, subtree: true, attributes: true,
                  attributeFilter: ['content', 'name']
                });
              }
            })();
        """.trimIndent().replace("__CONTENT__", content)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        density = resources.displayMetrics.density

        root = FrameLayout(this)
        root.setBackgroundColor(Color.BLACK)

        webView = WebView(this)
        webView.setBackgroundColor(Color.BLACK)
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        webView.addJavascriptInterface(WebAppInterface(), "AndroidHost")
        root.addView(
            webView,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        // Wand cursor, drawn above the page.
        val cursorPx = (CURSOR_DP * density).toInt()
        cursorView = ImageView(this).apply {
            setImageResource(R.drawable.cursor_wand)
            scaleType = ImageView.ScaleType.FIT_XY
            isFocusable = false
            visibility = View.INVISIBLE
        }
        root.addView(cursorView, FrameLayout.LayoutParams(cursorPx, cursorPx))

        // Black splash with the logo, drawn above everything until the page is ready.
        splashView = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            isClickable = true
        }
        splashLogo = ImageView(this).apply {
            setImageResource(R.drawable.splash_logo)
            adjustViewBounds = true
            alpha = 0f
        }

        splashView.addView(
            splashLogo,
            FrameLayout.LayoutParams(
                (resources.displayMetrics.widthPixels * 0.6f).toInt(),
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        )
        root.addView(
            splashView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(root)

        root.post {
            cursorX = root.width / 2f
            cursorY = root.height / 2f
            updateCursor()
        }

        startSplash()

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            allowFileAccess = true
            // Present as Desktop Chrome so the site serves its 1440px desktop grid layout.
            userAgentString = DESKTOP_USER_AGENT
        }

        // Start pages already laid out at LAYOUT_WIDTH, scaled to fit the screen.
        webView.setInitialScale(
            (resources.displayMetrics.widthPixels * 100f / (LAYOUT_WIDTH * density) + 0.5f).toInt()
        )

        val initLang = getSavedLanguage()
        val initGoogtrans = if (initLang == "ja") "/ja/ja" else "/ja/en"
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
            setCookie("https://www.stardom-world.com", "googtrans=" + initGoogtrans + "; Path=/")
            setCookie("https://www.stardom-world.com", "googtrans=" + initGoogtrans + "; Domain=.stardom-world.com; Path=/")
            flush()
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                url?.let {
                    val path = android.net.Uri.parse(it).path ?: ""
                    if (!path.contains("/contents/") && (path.contains("/set/") || path.contains("/box-contents-index/") || path.contains("/series/") || path.contains("/contents-set/"))) {
                        view.evaluateJavascript("document.documentElement.style.opacity = '0';", null)
                    }
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url
                val scheme = url.scheme ?: return true
                // Always use https for the Stardom site.
                if (scheme == "http" && (url.host ?: "").endsWith("stardom-world.com")) {
                    view.loadUrl(url.toString().replaceFirst("http://", "https://"))
                    return true
                }
                // Keep web pages inside the app; ignore anything else (intent://, market://, ...).
                return !(scheme == "http" || scheme == "https" || scheme == "file")
            }

            override fun onPageCommitVisible(view: WebView, url: String?) {
                injectPageScripts(view)
            }

            override fun onPageFinished(view: WebView, url: String?) {
                view.evaluateJavascript("document.documentElement.style.opacity = '1';", null)
                injectPageScripts(view)
                CookieManager.getInstance().flush()
                onPageReady()
            }

            @SuppressLint("WebViewClientOnReceivedSslError")
            override fun onReceivedSslError(
                view: WebView,
                handler: SslErrorHandler,
                error: SslError
            ) {
                // Proceed on SSL errors (e.g. missing CA certificates in emulator)
                handler.proceed()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest) {
                handler.post {
                    request.grant(request.resources)
                }
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                if (newProgress >= 90) {
                    onPageReady()
                }
            }

            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                if (customView != null) {
                    callback.onCustomViewHidden()
                    return
                }
                customView = view
                customCallback = callback
                webView.visibility = View.GONE
                view.alpha = 0f
                root.addView(
                    view,
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )
                view.animate()
                    .alpha(1f)
                    .setDuration(800)
                    .setInterpolator(AccelerateDecelerateInterpolator())
                    .start()
                refreshCursorVisibility()
            }

            override fun onHideCustomView() {
                hideCustomView()
            }
        }

        webView.loadUrl(START_URL)
    }

    private fun startSplash() {
        splashStartedAt = SystemClock.uptimeMillis()
        splashLogo.animate()
            .alpha(1f)
            .setDuration(400)
            .setInterpolator(DecelerateInterpolator())
            .start()

        // Dismiss splash automatically if page load takes longer than 3 seconds.
        handler.postDelayed({ dismissSplash() }, SPLASH_MAX_MS)
    }

    private fun onPageReady() {
        if (splashDone || splashDismissScheduled) return
        splashDismissScheduled = true
        // 300ms initial black delay + 500ms fade in + 300ms hold = 1100ms total minimum splash duration
        val elapsed = SystemClock.uptimeMillis() - splashStartedAt
        handler.postDelayed({ dismissSplash() }, (SPLASH_MIN_MS - elapsed).coerceAtLeast(0L))
    }

    private fun dismissSplash() {
        if (splashDone) return
        splashDone = true
        refreshCursorVisibility()
        splashView.animate()
            .alpha(0f)
            .setDuration(800)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction {
                root.removeView(splashView)
            }
            .start()
    }

    // ---------------------------------------------------------------- page scripts

    inner class WebAppInterface {
        @android.webkit.JavascriptInterface
        fun onPageFullyLoaded() {
            handler.post {
                dismissSplash()
            }
        }

        @android.webkit.JavascriptInterface
        fun toggleLanguage(targetLang: String) {
            handler.post {
                saveLanguage(targetLang)
                val googtransVal = if (targetLang == "ja") "/ja/ja" else "/ja/en"
                CookieManager.getInstance().apply {
                    setCookie("https://www.stardom-world.com", "googtrans=" + googtransVal + "; Path=/")
                    setCookie("https://www.stardom-world.com", "googtrans=" + googtransVal + "; Domain=.stardom-world.com; Path=/")
                    flush()
                }
                webView.reload()
            }
        }

        @android.webkit.JavascriptInterface
        fun logDebug(msg: String) {
            handler.post {
                Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
            }
        }

        @android.webkit.JavascriptInterface
        fun triggerFullScreen() {
            handler.post {
                if (customView != null) return@post

                // Dispatch synthetic touch gesture onto player area to satisfy WebKit user gesture requirement
                val now = SystemClock.uptimeMillis()
                val centerX = webView.width / 2f
                val centerY = webView.height * 0.35f

                val down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, centerX, centerY, 0)
                val up = MotionEvent.obtain(now, now + 50, MotionEvent.ACTION_UP, centerX, centerY, 0)
                webView.dispatchTouchEvent(down)
                webView.dispatchTouchEvent(up)
                down.recycle()
                up.recycle()

                handler.postDelayed({
                    webView.evaluateJavascript(
                        "(function(){ var iframe=document.querySelector('iframe[src*=\\'vimeo.com\\']'); if(iframe && typeof Vimeo!=='undefined' && Vimeo.Player){ var p=new Vimeo.Player(iframe); p.requestFullscreen().catch(function(){ if(iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen(); }); } else { var v=document.querySelector('video')||document.querySelector('iframe'); if(v && v.webkitRequestFullscreen) v.webkitRequestFullscreen(); } })()",
                        null
                    )
                }, 100)
            }
        }
    }

    private val pageFullyLoadedJs = """
        (function(){
          if (window.__tvFullyLoadedNotified) return;

          function preloadThumbnails(callback) {
            var bgEls = document.querySelectorAll('.content-thumbnail-box-inner, [style*="background-image"]');
            var imgEls = document.querySelectorAll('img');
            var urls = [];

            bgEls.forEach(function(el) {
              var bg = el.style.backgroundImage || getComputedStyle(el).backgroundImage;
              var m = bg.match(/url\(['"]?(.*?)['"]?\)/);
              if (m && m[1] && m[1].indexOf('data:') === -1) {
                urls.push(m[1]);
              }
            });

            imgEls.forEach(function(img) {
              if (img.src && img.src.indexOf('data:') === -1) {
                urls.push(img.src);
              }
            });

            if (urls.length === 0) {
              callback();
              return;
            }

            var loadedCount = 0;
            var total = urls.length;
            var done = false;

            function doneOne() {
              if (done) return;
              loadedCount++;
              if (loadedCount >= total) {
                done = true;
                callback();
              }
            }

            urls.forEach(function(u) {
              var img = new Image();
              img.onload = doneOne;
              img.onerror = doneOne;
              img.src = u;
              if (img.complete) doneOne();
            });

            setTimeout(function() {
              if (!done) {
                done = true;
                callback();
              }
            }, 2500);
          }

          function checkFullyReady() {
            if (window.__tvFullyLoadedNotified) return;

            var isLoaded = document.readyState === 'complete';
            var hasStyle = !!document.getElementById('tv-app-style');
            var translateDone = true;

            var sel = document.querySelector('select.goog-te-combo');
            if (sel && sel.options.length > 1) {
              translateDone = (sel.value === 'en');
            }

            if (isLoaded && hasStyle && translateDone) {
              window.__tvFullyLoadedNotified = true;
              preloadThumbnails(function() {
                if (window.AndroidHost && typeof window.AndroidHost.onPageFullyLoaded === 'function') {
                  window.AndroidHost.onPageFullyLoaded();
                }
              });
            }
          }

          if (document.readyState === 'complete') {
            checkFullyReady();
          } else {
            window.addEventListener('load', checkFullyReady);
          }

          var readyCheckTimer = setInterval(checkFullyReady, 250);
          setTimeout(function() {
            clearInterval(readyCheckTimer);
            if (!window.__tvFullyLoadedNotified && window.AndroidHost) {
              window.__tvFullyLoadedNotified = true;
              window.AndroidHost.onPageFullyLoaded();
            }
          }, 6000);
        })();
    """.trimIndent()

    private val autoFullScreenJs = """
        (function(){
          if (window.__tvAutoFullScreenAttached) return;
          window.__tvAutoFullScreenAttached = true;

          function tvLog(msg) {}

          var fsTimer = null;

          function scheduleFullScreenIn5Sec() {
            if (fsTimer) return;
            tvLog("Playback detected! Scheduling fullscreen in 5s...");
            fsTimer = setTimeout(function() {
              tvLog("5s passed! Triggering Fullscreen...");
              if (window.AndroidHost && typeof window.AndroidHost.triggerFullScreen === 'function') {
                window.AndroidHost.triggerFullScreen();
              }
            }, 5000);
          }

          function monitorPlayback() {
            var vList = document.querySelectorAll('video');
            vList.forEach(function(v) {
              if (!v.__tvPlayListenerAttached) {
                v.__tvPlayListenerAttached = true;
                v.addEventListener('play', scheduleFullScreenIn5Sec);
                v.addEventListener('playing', scheduleFullScreenIn5Sec);
              }
              if (!v.paused && !fsTimer) {
                scheduleFullScreenIn5Sec();
              }
            });

            var vimeoIframes = document.querySelectorAll('iframe[src*="vimeo.com"]');
            vimeoIframes.forEach(function(iframe) {
              iframe.setAttribute('allow', 'autoplay; fullscreen');
              iframe.setAttribute('allowfullscreen', 'true');
              if (!iframe.__tvInitSent && iframe.contentWindow) {
                iframe.__tvInitSent = true;
                tvLog("Vimeo iframe found & initialized!");
                try {
                  iframe.contentWindow.postMessage('{"method":"addEventListener", "value":"play"}', '*');
                  iframe.contentWindow.postMessage('{"method":"play"}', '*');
                } catch(e) {}
              }
            });
          }

          window.addEventListener('message', function(ev) {
            try {
              var data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
              if (data && (data.event === 'play' || data.event === 'timeupdate')) {
                scheduleFullScreenIn5Sec();
              }
            } catch(e) {}
          });

          setInterval(monitorPlayback, 1000);
        })();
    """.trimIndent()


    private val cardFavoriteToggleJs = """
        (function(){
          if (window.__tvCardFavoriteAttached) return;
          window.__tvCardFavoriteAttached = true;

          function toggleCardFavorite(el) {
            var $ = window.jQuery || window.$;
            if (!el) return false;

            // Strict image-thumbnail check
            var thumbBox = el.closest('.content-thumbnail-box, .content-thumbnail');
            if (!thumbBox) return false;

            var link = thumbBox.querySelector('a[href*="/contents/"], a[href*="/set/"]') ||
                       thumbBox.closest('a[href*="/contents/"], a[href*="/set/"]');

            if (!link && el.tagName === 'A') link = el;
            if (!link || !link.href) return false;

            var href = link.href || '';
            var match = href.match(/\/(?:contents|set)\/(\d+)/);
            if (!match) return false;

            var contentId = match[1];
            var isFavPage = window.location.pathname.indexOf('/favorites') !== -1 || window.location.pathname.indexOf('/favorite') !== -1;
            var apiType = isFavPage ? 'DELETE' : 'POST';

            if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
              window.AndroidHost.logDebug(isFavPage ? 'Removed from Favorites' : '♥ Added to Favorites!');
            }

            if (isFavPage) {
              var parentCard = thumbBox.closest('article, .content-list-item, .tile-inner, .slick-slide') || thumbBox;
              parentCard.style.setProperty('opacity', '0.3', 'important');
            }

            if ($ && $.apiCall) {
              $.apiCall({
                url: '/user_api/contents/' + contentId + '/favorites',
                type: apiType
              }).fail(function(jqXHR) {
                if (jqXHR.status === 400 && window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                  window.AndroidHost.logDebug('Please log in on Stardom World to sync favorites');
                }
              });
            }
            return true;
          }

          window.__tvToggleCardFavorite = toggleCardFavorite;
        })();
    """.trimIndent()

    private val stage1TestGridJs = """
        (function(){
          if (document.getElementById('tv-test-grid')) return;

          function isHomePage() {
            var path = window.location.pathname;
            return path === '/' || path === '/index.html' || path === '';
          }

          function sanitizeTitle(txt) {
            if (!txt) return 'Stardom World Video';
            return txt.replace(/月額見放題/g, '')
                      .replace(/Unlimited viewing for a monthly fee/gi, '')
                      .replace(/Monthly subscription available/gi, '')
                      .replace(/Monthly subscription/gi, '')
                      .replace(/\s+/g, ' ')
                      .trim();
          }

          function extractAllHomeRows() {
            var sections = document.querySelectorAll('.box-section, section, [class*="box-section"]');
            var result = [];
            var seenTitles = {};

            sections.forEach(function(sec) {
              if (sec.closest('header') || sec.id.includes('tv') || sec.id.includes('hero') || sec.classList.contains('box-main')) return;

              var titleEl = sec.querySelector('.ttl-md, .ttl-lg, h2, h1');
              var title = titleEl ? titleEl.textContent.trim() : '';
              if (!title || seenTitles[title]) return;

              var items = Array.from(sec.querySelectorAll('.content-list-item, article')).filter(function(el) {
                return !el.classList.contains('slick-cloned');
              });

              if (items.length === 0) return;

              var dataList = [];
              var seenHrefs = {};

              items.forEach(function(item) {
                var link = item.querySelector('a[href*="/contents/"], a[href*="/set/"]');
                if (!link || !link.href) return;

                var href = link.href;
                if (seenHrefs[href]) return;
                seenHrefs[href] = true;

                var thumbInner = item.querySelector('.content-thumbnail-box-inner, [style*="background-image"]');
                var imgEl = item.querySelector('img');
                var titleBox = item.querySelector('h3, .ttl-xs, .content-info-box');

                var itemTitle = titleBox ? sanitizeTitle(titleBox.textContent) : 'Stardom World Video';

                var bgUrl = '';
                if (thumbInner) {
                  var bg = thumbInner.style.backgroundImage || getComputedStyle(thumbInner).backgroundImage;
                  var m = bg.match(/url\(['"]?(.*?)['"]?\)/);
                  if (m && m[1]) bgUrl = m[1];
                }
                if (!bgUrl && imgEl) {
                  bgUrl = imgEl.src;
                }

                dataList.push({ href: href, title: itemTitle, bgUrl: bgUrl });
              });

              if (dataList.length > 0) {
                seenTitles[title] = true;
                result.push({ title: title, items: dataList });
              }
            });
            return result;
          }

          function extractHeroBanner() {
            var heroImg = document.querySelector('.main-visual img, .slider-inner img, [class*="main-visual"] img, [class*="hero"] img');
            var heroLink = document.querySelector('.main-visual a[href], .slider-inner a[href], [class*="main-visual"] a[href]');

            var href = heroLink ? heroLink.href : (document.querySelector('a[href*="/contents/"], a[href*="/set/"]')?.href || '#');
            var bgUrl = heroImg ? heroImg.src : '';

            if (!bgUrl) {
              var bgEl = document.querySelector('.main-visual, .slider-inner, [class*="main-visual"]');
              if (bgEl) {
                var bg = bgEl.style.backgroundImage || getComputedStyle(bgEl).backgroundImage;
                var m = bg.match(/url\(['"]?(.*?)['"]?\)/);
                if (m && m[1] && m[1].indexOf('data:') === -1) bgUrl = m[1];
              }
            }

            if (!bgUrl) {
              bgUrl = 'https://www.stardom-world.com/file_upload/images/mv_06.jpg';
            }

            return { href: href, bgUrl: bgUrl };
          }

          function renderCustomTvGrid() {
            if (!isHomePage()) return;
            if (document.getElementById('tv-test-grid')) return;

            var header = document.querySelector('header, .box-header, .nav-inner');
            if (!header) return;

            // Ensure top header sits in normal block flow at top
            header.style.setProperty('position', 'relative', 'important');
            header.style.setProperty('top', '0px', 'important');
            header.style.setProperty('margin-top', '0px', 'important');
            header.style.setProperty('margin-bottom', '0px', 'important');
            header.style.setProperty('border', 'none', 'important');
            header.style.setProperty('box-shadow', 'none', 'important');

            if (document.body) {
              document.body.style.setProperty('margin-top', '0px', 'important');
              document.body.style.setProperty('padding-top', '0px', 'important');
            }

            // Insert a clean 75px visible spacer element directly under the header
            var headerSpacer = document.getElementById('tv-header-spacer');
            if (!headerSpacer) {
              headerSpacer = document.createElement('div');
              headerSpacer.id = 'tv-header-spacer';
              headerSpacer.style.cssText = 'width:100%; height:75px !important; display:block; clear:both; margin:0 0 15px 0 !important; padding:0; border:none; background:transparent;';
              if (header.nextSibling) {
                header.parentNode.insertBefore(headerSpacer, header.nextSibling);
              } else {
                header.parentNode.appendChild(headerSpacer);
              }
            }

            var heroData = extractHeroBanner();
            var allRowsData = extractAllHomeRows();

            // Hide original desktop site carousels, news lists, and old hero banners ONLY on home page
            var origContent = document.querySelectorAll('.content-list, .box-section, .main-visual, .slider-inner, .box-main-visual, .container.box-main, .news-wrap, [class*="main-visual"], [class*="slider"]');
            origContent.forEach(function(el) {
              if (!el.closest('header') && !el.id.includes('tv')) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('height', '0px', 'important');
              }
            });

            var gridDiv = document.createElement('div');
            gridDiv.id = 'tv-test-grid';
            gridDiv.style.cssText = 'width:100%; margin:0; padding:0; box-sizing:border-box; relative; z-index:100; border:none;';

            var html = '';

            // 1. Single Un-Cropped Hero Banner Image (With 75px header spacing)
            if (heroData && heroData.bgUrl) {
              html += '<div id="tv-hero-container" style="width:100%; height:auto; margin:0 0 35px 0 !important; padding:0 !important; box-sizing:border-box; border:none; clear:both;">' +
                '<a class="tv-hero-card" tabindex="0" href="' + heroData.href + '" style="display:block; width:100%; height:auto; text-decoration:none; outline:none; border:none; border-radius:0; box-sizing:border-box; cursor:pointer; margin:0; padding:0;"><img src="' + heroData.bgUrl + '" style="width:100%; height:auto; display:block; margin:0 auto; padding:0; border:none; outline:none; box-sizing:border-box;" /></a>' +
                '</div>';
            }

            // 2. All Category Video Rows
            html += '<div style="max-width:1440px; margin:0 auto; padding:0 24px; box-sizing:border-box;">';

            var cardCss = 'flex:0 0 calc(25% - 18px); max-width:calc(25% - 18px); background:#1a1a1a; border-radius:8px; overflow:hidden; cursor:pointer; box-sizing:border-box; text-decoration:none; display:block;';
            var imgCss = 'width:100%; aspect-ratio:16/9; height:auto; min-height:165px; background:#222; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; color:#FFD700; font-size:20px; font-weight:bold; border-radius:8px 8px 0 0;';
            var titleCss = 'padding:12px 14px; color:#fff; font-size:15px; font-weight:bold; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; line-height:1.45em; min-height:5.8em; max-height:6.2em; box-sizing:border-box;';

            if (allRowsData && allRowsData.length > 0) {
              allRowsData.forEach(function(rowSec) {
                html += '<div style="margin-bottom:35px;"><h2 tabindex="-1" style="color:#FFB347; font-size:22px; margin-bottom:14px; font-weight:bold; outline:none !important; user-select:none !important;">' + rowSec.title + '</h2><div class="tv-grid-row" style="display:flex; flex-direction:row; gap:24px; overflow-x:auto; scroll-behavior:smooth; padding:12px 10px; margin:0 -10px;">';
                rowSec.items.forEach(function(item) {
                  var bgStyle = item.bgUrl ? 'background-image:url(' + item.bgUrl + ');' : '';
                  html += '<a class="tv-card" tabindex="0" href="' + item.href + '" style="' + cardCss + '"><div style="' + imgCss + ' ' + bgStyle + '"></div><div style="' + titleCss + '">' + item.title + '</div></a>';
                });
                html += '</div></div>';
              });
            }

            // 3. Return To Top Button at bottom of home grid
            html += '<div style="text-align:center; margin:40px 0 60px 0;">' +
              '<button id="tv-return-to-top-btn" class="tv-card notranslate" tabindex="0" style="background:#1a1a1a; color:#FFB347; border:2px solid #FFB347; border-radius:6px; padding:12px 28px; font-size:18px; font-weight:bold; cursor:pointer; outline:none;">▲ Return to Top</button>' +
              '</div>';

            html += '</div>';

            gridDiv.innerHTML = html;

            // Insert gridDiv directly AFTER headerSpacer
            var insertTarget = headerSpacer || header;
            if (insertTarget.nextSibling) {
              insertTarget.parentNode.insertBefore(gridDiv, insertTarget.nextSibling);
            } else {
              insertTarget.parentNode.appendChild(gridDiv);
            }

            var firstFocus = gridDiv.querySelector('.tv-hero-card, .tv-card');
            if (firstFocus) firstFocus.focus();
          }

          if (!window.__tvGridNavHandlerAttached) {
            window.__tvGridNavHandlerAttached = true;

            // Return to top click handler
            document.addEventListener('click', function(e) {
              if (e.target && e.target.id === 'tv-return-to-top-btn') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                var firstHeader = document.querySelector('form.form-inline input[type="submit"], #tv-section-select, #tv-fav-header-btn');
                if (firstHeader) firstHeader.focus();
              }
            }, true);

            document.addEventListener('keydown', function(e) {
              var active = document.activeElement;
              if (!active) return;

              // Return to Top button navigation
              if (active.id === 'tv-return-to-top-btn') {
                if (e.keyCode === 13 || e.key === 'Enter') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  var firstHeader = document.querySelector('form.form-inline input[type="submit"], #tv-section-select, #tv-fav-header-btn');
                  if (firstHeader) firstHeader.focus();
                  return;
                }
                if (e.keyCode === 38 || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  var allRows = Array.from(document.querySelectorAll('.tv-grid-row'));
                  if (allRows.length > 0) {
                    var lastRow = allRows[allRows.length - 1];
                    var lastRowCards = Array.from(lastRow.querySelectorAll('.tv-card'));
                    if (lastRowCards.length > 0) {
                      var targetLast = lastRowCards[0];
                      targetLast.focus();
                      targetLast.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    }
                  }
                  return;
                }
              }

              // A. Navigation on Hero Banner (.tv-hero-card)
              if (active.classList.contains('tv-hero-card')) {
                if (e.keyCode === 40 || e.key === 'ArrowDown') {
                  var row1Card = document.querySelector('.tv-grid-row .tv-card');
                  if (row1Card) {
                    e.preventDefault();
                    e.stopPropagation();
                    row1Card.focus();
                    row1Card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    return;
                  }
                }

                if (e.keyCode === 38 || e.key === 'ArrowUp') {
                  var searchBtn = document.querySelector('form.form-inline input[type="submit"], .input-group input[type="submit"], #tv-section-select, #tv-fav-header-btn');
                  if (searchBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    searchBtn.focus();
                    return;
                  }
                }
              }

              // B. Navigation from Header Items -> Down to Hero Banner
              var inHeader = active.closest('header, .box-header, #tv-header-flex-wrapper, form.form-inline, .nav-inner');
              if (inHeader && (e.keyCode === 40 || e.key === 'ArrowDown')) {
                var heroCard = document.querySelector('.tv-hero-card');
                if (heroCard) {
                  e.preventDefault();
                  e.stopPropagation();
                  heroCard.focus();
                  heroCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return;
                } else {
                  var firstVideo = document.querySelector('.tv-grid-row .tv-card');
                  if (firstVideo) {
                    e.preventDefault();
                    e.stopPropagation();
                    firstVideo.focus();
                    firstVideo.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    return;
                  }
                }
              }

              // C. Grid Row Navigation (.tv-card)
              if (!active.classList.contains('tv-card')) return;

              var currentRowDiv = active.closest('.tv-grid-row');
              if (!currentRowDiv) return;

              var allRows = Array.from(document.querySelectorAll('.tv-grid-row'));
              var rowIndex = allRows.indexOf(currentRowDiv);

              var rowCards = Array.from(currentRowDiv.querySelectorAll('.tv-card'));
              var colIndex = rowCards.indexOf(active);

              // 1. Right Arrow -> Next Card
              if (e.keyCode === 39 || e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                var nextIndex = (colIndex < rowCards.length - 1) ? colIndex + 1 : 0;
                var nextCard = rowCards[nextIndex];
                nextCard.focus();
                nextCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }

              // 2. Left Arrow -> Previous Card
              if (e.keyCode === 37 || e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                var prevIndex = (colIndex > 0) ? colIndex - 1 : rowCards.length - 1;
                var prevCard = rowCards[prevIndex];
                prevCard.focus();
                prevCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }

              // 3. Down Arrow -> Same Column in Next Row
              if (e.keyCode === 40 || e.key === 'ArrowDown') {
                if (rowIndex >= 0 && rowIndex < allRows.length - 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  var nextRowCards = Array.from(allRows[rowIndex + 1].querySelectorAll('.tv-card'));
                  var targetCol = Math.min(colIndex, nextRowCards.length - 1);
                  if (nextRowCards[targetCol]) {
                    nextRowCards[targetCol].focus();
                    nextRowCards[targetCol].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                  }
                } else if (rowIndex === allRows.length - 1) {
                  var topBtn = document.getElementById('tv-return-to-top-btn');
                  if (topBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    topBtn.focus();
                    topBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }

              // 4. Up Arrow -> Same Column in Previous Row OR Hero Banner
              if (e.keyCode === 38 || e.key === 'ArrowUp') {
                if (rowIndex > 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  var prevRowCards = Array.from(allRows[rowIndex - 1].querySelectorAll('.tv-card'));
                  var targetColPrev = Math.min(colIndex, prevRowCards.length - 1);
                  if (prevRowCards[targetColPrev]) {
                    prevRowCards[targetColPrev].focus();
                    prevRowCards[targetColPrev].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                  }
                } else if (rowIndex === 0) {
                  var heroTarget = document.querySelector('.tv-hero-card');
                  if (heroTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    heroTarget.focus();
                    heroTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } else {
                    var headerTarget = document.querySelector('form.form-inline input[type="submit"], #tv-section-select, #tv-fav-header-btn');
                    if (headerTarget) {
                      e.preventDefault();
                      e.stopPropagation();
                      headerTarget.focus();
                    }
                  }
                }
              }
            }, true);
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderCustomTvGrid);
          } else {
            renderCustomTvGrid();
          }
          setInterval(renderCustomTvGrid, 1000);
        })();
    """.trimIndent()

    private fun injectPageScripts(view: WebView) {
        view.evaluateJavascript(viewportJs(), null)
        view.evaluateJavascript(hideTranslateJs, null)
        view.evaluateJavascript(translateJs, null)
        view.evaluateJavascript(headerJs, null)
        view.evaluateJavascript(infiniteScrollJs, null)
        view.evaluateJavascript(redirectToFirstMatchJs, null)
        view.evaluateJavascript(reverseFirstCarouselJs, null)
        view.evaluateJavascript(pageFullyLoadedJs, null)
        view.evaluateJavascript(stage1TestGridJs, null)
        view.evaluateJavascript(cardFavoriteToggleJs, null)
        view.evaluateJavascript(autoFullScreenJs, null)
        injectCustomTvStyles(view)
        if (!cursorMode) view.evaluateJavascript(focusJs, null)
    }

    // ---------------------------------------------------------------- cursor

    private fun updateCursor() {
        val size = cursorView.layoutParams.width.toFloat()
        cursorView.translationX = cursorX - HOT_X * size
        cursorView.translationY = cursorY - HOT_Y * size
        hoverAtCursor()
    }

    private fun hoverAtCursor() {
        val now = SystemClock.uptimeMillis()
        val props = arrayOf(MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_MOUSE
        })
        val coords = arrayOf(MotionEvent.PointerCoords().apply {
            x = cursorX
            y = cursorY
        })
        val ev = MotionEvent.obtain(
            now, now, MotionEvent.ACTION_HOVER_MOVE, 1,
            props, coords, 0, 0, 1f, 1f, 0, 0,
            InputDevice.SOURCE_CLASS_POINTER, 0
        )
        webView.dispatchGenericMotionEvent(ev)
        ev.recycle()
    }

    private fun refreshCursorVisibility() {
        cursorView.visibility =
            if (cursorMode && splashDone && customView == null) View.VISIBLE else View.INVISIBLE
    }

    private fun setCursorMode(on: Boolean) {
        cursorMode = on
        refreshCursorVisibility()
        webView.evaluateJavascript(if (on) removeFocusJs else focusJs, null)
        Toast.makeText(this, if (on) "Cursor on" else "Cursor off", Toast.LENGTH_SHORT).show()
    }

    private fun hideCustomView() {
        val view = customView ?: return
        webView.visibility = View.VISIBLE
        root.removeView(view)
        customView = null
        customCallback?.onCustomViewHidden()
        customCallback = null
        refreshCursorVisibility()
    }

    // ---------------------------------------------------------------- remote keys

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_INFO, KeyEvent.KEYCODE_PROG_YELLOW,
                KeyEvent.KEYCODE_SETTINGS, KeyEvent.KEYCODE_BOOKMARK, KeyEvent.KEYCODE_BUTTON_Y -> {
                    webView.evaluateJavascript(
                        "(function(){ var x = window.__tvLastMouseX || 0; var y = window.__tvLastMouseY || 0; var list = document.elementsFromPoint(x, y) || [document.activeElement]; if(window.__tvToggleCardFavorite){ return window.__tvToggleCardFavorite(list); } return false; })()",
                        null
                    )
                    return true
                }

                KeyEvent.KEYCODE_BACK -> {
                    if (customView != null) {
                        hideCustomView()
                        return true
                    }
                    if (webView.canGoBack()) {
                        webView.goBack()
                        return true
                    }
                }
            }
        }

        if (cursorMode) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
                KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                    if (handleCursorKey(event)) return true
                }
            }
        }

        return super.dispatchKeyEvent(event)
    }

    override fun onGenericMotionEvent(event: MotionEvent): Boolean {
        if (cursorMode && (event.source and InputDevice.SOURCE_CLASS_POINTER) != 0) {
            if (event.action == MotionEvent.ACTION_HOVER_MOVE) {
                cursorX = event.x
                cursorY = event.y
                updateCursor()
                return true
            }
        }
        return super.onGenericMotionEvent(event)
    }

    // ---------------------------------------------------------------- cursor logic

    private var keyMoveRunning = false
    private val keyState = BooleanArray(4) // UP, DOWN, LEFT, RIGHT
    private var lastKeyTime = 0L

    private fun handleCursorKey(event: KeyEvent): Boolean {
        val idx = when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> 0
            KeyEvent.KEYCODE_DPAD_DOWN -> 1
            KeyEvent.KEYCODE_DPAD_LEFT -> 2
            KeyEvent.KEYCODE_DPAD_RIGHT -> 3
            else -> -1
        }

        if (event.keyCode == KeyEvent.KEYCODE_DPAD_CENTER || event.keyCode == KeyEvent.KEYCODE_ENTER) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                clickAtCursor()
            }
            return true
        }

        if (idx < 0) return false

        if (event.action == KeyEvent.ACTION_DOWN) {
            keyState[idx] = true
            lastKeyTime = SystemClock.uptimeMillis()
            if (!keyMoveRunning) {
                keyMoveRunning = true
                handler.post(keyMoveRunnable)
            }
        } else if (event.action == KeyEvent.ACTION_UP) {
            keyState[idx] = false
        }
        return true
    }

    private val keyMoveRunnable = object : Runnable {
        override fun run() {
            var any = false
            for (b in keyState) if (b) any = true

            if (!any) {
                keyMoveRunning = false
                return
            }

            val now = SystemClock.uptimeMillis()
            val heldMs = (now - lastKeyTime).coerceAtLeast(0L)

            val speedDp = when {
                heldMs > 1500L -> 28f
                heldMs > 600L -> 16f
                else -> 8f
            }
            val step = speedDp * density

            if (keyState[0]) cursorY -= step
            if (keyState[1]) cursorY += step
            if (keyState[2]) cursorX -= step
            if (keyState[3]) cursorX += step

            val w = root.width.toFloat()
            val h = root.height.toFloat()

            if (cursorY < 0f) {
                cursorY = 0f
                scrollByWeb(0f, -SCROLL_NOTCH)
            } else if (cursorY > h) {
                cursorY = h
                scrollByWeb(0f, SCROLL_NOTCH)
            }
            cursorX = cursorX.coerceIn(0f, w)

            updateCursor()
            handler.postDelayed(this, 16L)
        }
    }

    private fun scrollByWeb(dxNotches: Float, dyNotches: Float) {
        val now = SystemClock.uptimeMillis()
        val p = MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_MOUSE
        }
        val c = MotionEvent.PointerCoords().apply {
            x = cursorX
            y = cursorY
            setAxisValue(MotionEvent.AXIS_VSCROLL, -dyNotches)
            setAxisValue(MotionEvent.AXIS_HSCROLL, dxNotches)
        }
        val ev = MotionEvent.obtain(
            now, now, MotionEvent.ACTION_SCROLL, 1,
            arrayOf(p), arrayOf(c), 0, 0, 1f, 1f, 0, 0,
            InputDevice.SOURCE_CLASS_POINTER, 0
        )
        webView.dispatchGenericMotionEvent(ev)
        ev.recycle()
    }

    private fun clickAtCursor() {
        val now = SystemClock.uptimeMillis()
        val down = MotionEvent.obtain(
            now, now, MotionEvent.ACTION_DOWN,
            cursorX, cursorY, 0
        )
        val up = MotionEvent.obtain(
            now, now + 50, MotionEvent.ACTION_UP,
            cursorX, cursorY, 0
        )
        webView.dispatchTouchEvent(down)
        webView.dispatchTouchEvent(up)
        down.recycle()
        up.recycle()

        cursorView.animate()
            .scaleX(0.7f).scaleY(0.7f)
            .setDuration(80)
            .withEndAction {
                cursorView.animate().scaleX(1f).scaleY(1f).setDuration(120).start()
            }
            .start()
    }
}
