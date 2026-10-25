package com.example.tvhub

import android.annotation.SuppressLint
import android.app.Activity
import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.os.Bundle
import android.os.Handler
import android.net.http.SslError
import android.os.Build
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
        // Until the person picks one, follow the device language.
        return prefs.getString("user_lang", null)
            ?: (if (java.util.Locale.getDefault().language == "ja") "ja" else "en")
    }

    // Saves the language and points the site's translation at it. The caller reloads whatever it needs.
    private fun applyLanguage(lang: String) {
        saveLanguage(lang)
        val googtransVal = if (lang == "ja") "/ja/ja" else "/ja/en"
        CookieManager.getInstance().apply {
            setCookie("https://www.stardom-world.com", "googtrans=" + googtransVal + "; Path=/")
            setCookie("https://www.stardom-world.com", "googtrans=" + googtransVal + "; Domain=.stardom-world.com; Path=/")
            flush()
        }
    }

    private fun saveLanguage(lang: String) {
        val prefs = getSharedPreferences("tvhub_prefs", MODE_PRIVATE)
        prefs.edit().putString("user_lang", lang).apply()
        appJa = lang == "ja"
    }

    companion object {
        private const val START_URL = "https://www.stardom-world.com/"
        private const val LOGIN_LOGO_FRACTION = 0.26f
        private const val LOGIN_URL =
            "https://www.stardom-world.com/login?redirect_to=https%3A%2F%2Fwww.stardom-world.com%2Flogin"

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
        // The splash never finishes sooner than this, so the progress bar always visibly travels.
        private const val SPLASH_MIN_FILL_MS = 2600L

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
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 16px !important;
            margin: 0 24px 0 0 !important;
            height: 44px !important;
            flex: 0 1 auto !important;
            min-width: 0 !important;
        }
        form.form-inline, .box-search form, .box-search .input-group, .input-group.flex-nowrap {
            width: 260px !important;
            max-width: 260px !important;
            flex: 0 1 260px !important;
            min-width: 170px !important;
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
        .btn-wrap, .btn-wrap *, .box-header-btn, .box-header-btn *, [class*="user"], [class*="account"], .dropdown-toggle {
            white-space: nowrap !important;
            max-width: none !important;
            width: auto !important;
            overflow: visible !important;
            word-break: normal !important;
        }
        .tv-acct-menu { display: none !important; }
        /* Header controls share one 44px band, all centred on it. */
        #tv-header-flex-wrapper > * { align-self: center !important; margin-top: 0 !important; margin-bottom: 0 !important; top: 0 !important; transform: none !important; }
        #tv-header-flex-wrapper form, #tv-header-flex-wrapper .input-group, #tv-header-flex-wrapper .box-search {
            margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important;
            top: 0 !important; position: relative !important; transform: none !important;
        }
        #tv-header-flex-wrapper .input-group { align-items: stretch !important; }
        #tv-section-select { height: 44px !important; margin-top: 0 !important; margin-bottom: 0 !important; align-self: center !important; }
        .dropdown-wrapper { display: flex !important; align-items: center !important; height: 44px !important; margin: 0 !important; padding: 0 !important; }
        .box-dropdown-key { display: inline-flex !important; align-items: center !important; height: 44px !important; margin: 0 !important; padding: 0 8px !important; line-height: 1 !important; }
        #tv-lang-li {
            margin-left: auto !important;
            padding-left: 16px !important;
        }
        #tv-section-select {
            width: 260px !important;
            max-width: 260px !important;
            flex: 0 1 260px !important;
            min-width: 170px !important;
            height: 44px !important;
            background-color: #1a1a1a !important;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='44' viewBox='0 0 48 44'><rect width='48' height='44' fill='%232a2a2a'/><rect width='1' height='44' fill='%23333333'/><path d='M17 18 L24 26 L31 18' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/></svg>") !important;
            background-repeat: no-repeat !important;
            background-position: right center !important;
            background-size: 48px 44px !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            color: #ffffff !important;
            border: 1px solid #333333 !important;
            border-radius: 4px !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            padding: 0 56px 0 14px !important;
            margin: 0 16px 0 0 !important;
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
            height: 32px !important;
            background: rgba(0, 0, 0, 0.25) !important;
            background-color: rgba(0, 0, 0, 0.25) !important;
            border: 2px solid rgba(255, 255, 255, 0.35) !important;
            border-radius: 16px !important;
            box-shadow: none !important;
            outline: none !important;
            padding: 2px !important;
            margin-left: 8px !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
        }
        #tv-lang-toggle-btn .tv-lang-opt {
            display: inline-block !important;
            height: 24px !important;
            line-height: 24px !important;
            padding: 0 10px !important;
            border-radius: 12px !important;
            font-size: 12px !important;
            font-weight: 700 !important;
            color: #ffffff !important;
            background: transparent !important;
            white-space: nowrap !important;
        }
        #tv-lang-toggle-btn .tv-lang-opt.tv-lang-on {
            background: #FFB347 !important;
            color: #1a1a1a !important;
        }
        #tv-lang-toggle-btn:focus, #tv-lang-toggle-btn:hover {
            border-color: #FFB347 !important;
            box-shadow: 0 0 0 3px rgba(255, 179, 71, 0.55), 0 0 14px rgba(255, 179, 71, 0.6) !important;
            outline: none !important;
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
            white-space: nowrap !important;
            flex: 0 0 auto !important;
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
        /* Unified Sub-Page Video Card & Rounded Thumbnail Styling */
        .content-thumbnail, .content-thumbnail-box, .content-thumbnail-box-inner, .tile-inner {
            border-radius: 8px 8px 0 0 !important;
            overflow: hidden !important;
        }
        .content-thumbnail-box-inner {
            border-radius: 8px 8px 0 0 !important;
            background-size: cover !important;
            background-position: center !important;
        }
        .content-list-item article, .content-list-item .tile-inner {
            background: #1a1a1a !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        }
        .content-info-box, .content-list-item h3 {
            padding: 6px 7px !important;
            color: #ffffff !important;
            font-size: 15px !important;
            font-weight: bold !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 4 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.45em !important;
            min-height: 5.8em !important;
        }
        /* Focus ring goes on the WHOLE card (thumbnail + title box), identical to the
           home page cards. Anything focusable INSIDE a card gets no ring of its own
           (this also beats the generic orange/red *:focus ring from focusJs). */
        .content-list-item *:focus, article *:focus, .tile-inner *:focus, a.tv-thumbnail-link:focus {
            outline: none !important;
            box-shadow: none !important;
            transform: none !important;
            border: none !important;
        }
        .content-list-item article:focus-within, .content-list-item .tile-inner:focus-within:not(article *), .content-list-item article:focus, .tv-card:focus {
            outline: 3px solid #FFD700 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 16px rgba(255, 215, 0, 0.8) !important;
            transform: scale(1.03) !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 5 !important;
            transition: transform 0.15s ease-in-out, outline 0.15s ease-in-out !important;
        }
        .content-thumbnail-box, .tile-inner, .content-list-item article {
            transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out !important;
        }
        .content-list-item article:hover:not(:focus-within) {
            transform: scale(1.03) !important;
            opacity: 0.85 !important;
        }
        /* Home hero banner: focus is shown by the outline only, never by dimming the image.
           (Covers site rules like a:hover/a:focus { opacity } and darkening overlays.) */
        #tv-hero-container, #tv-hero-container a, a.tv-hero-card,
        a.tv-hero-card:hover, a.tv-hero-card:focus, a.tv-hero-card:active,
        a.tv-hero-card:hover img, a.tv-hero-card:focus img, a.tv-hero-card:active img {
            opacity: 1 !important;
            filter: none !important;
            mix-blend-mode: normal !important;
            -webkit-tap-highlight-color: transparent !important;
        }
        /* Hero banner: 5% smaller (width and, with it, height), centred, rounded, and the focus
           ring wraps the rounded edge. */
        #tv-hero-container {
            width: 95% !important;
            margin: 0 auto 35px auto !important;
        }
        a.tv-hero-card {
            display: block !important;
            width: 100% !important;
            border-radius: 18px !important;
            overflow: hidden !important;
            outline: none !important;
            transition: box-shadow 0.15s ease-in-out !important;
        }
        a.tv-hero-card img {
            width: 100% !important;
            height: auto !important;
            border-radius: 18px !important;
        }
        a.tv-hero-card:focus {
            outline: none !important;
            box-shadow: 0 0 0 2px #000000, 0 0 0 5px #FFD700, 0 0 16px rgba(255, 215, 0, 0.8) !important;
        }
        #tv-hero-container::before, #tv-hero-container::after,
        a.tv-hero-card::before, a.tv-hero-card::after {
            content: none !important;
            display: none !important;
        }
        /* Wrap titles at word boundaries only (the site's Japanese-oriented CSS can break
           English words mid-word). A single over-long word still wraps instead of overflowing. */
        .content-info-box, .content-info-box *, .content-list-item h3, .content-list-item h3 *, .ttl-xs, .ttl-xs * {
            word-break: normal !important;
            overflow-wrap: break-word !important;
            word-wrap: break-word !important;
            hyphens: none !important;
            -webkit-hyphens: none !important;
        }
        /* Same page margins as the home page grid: 1440px max width, 24px side padding,
           and room around carousels so edge cards (and their focus ring) are never clipped. */
        .container, .container-fluid {
            width: 100% !important;
            max-width: 1440px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
            box-sizing: border-box !important;
        }
        .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        .content-list, .content-list.js-list-slide {
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        .slick-list {
            padding: 12px 10px !important;
            margin: 0 -10px !important;
        }
    """.trimIndent()

    }

    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private lateinit var cursorView: ImageView
    private lateinit var splashView: FrameLayout
    private lateinit var splashLogo: ImageView
    private lateinit var splashProgress: SplashProgressView
    private var splashFinishing = false

    private lateinit var transitionOverlay: FrameLayout
    private lateinit var transitionView: TransitionOverlayView
    private var transitionShowing = false
    private var lastNavigatedUrl: String? = null

    private val handler = Handler(Looper.getMainLooper())
    private var density = 1f

    private var cursorMode = false
    // True while keyboard focus is inside the embedded video player iframe (set by playerNavJs)
    @Volatile private var playerFocused = false
    private var okPending = false
    private val hideControlsRunnable = Runnable { hidePlayerControls() }
    private var okLongFired = false
    private var cursorX = 0f
    private var cursorY = 0f

    private var splashStartedAt = 0L
    private var splashDone = false

    // First-run guide (shown once, only to people who are not signed in), then the login page.
    private var onboardingView: OnboardingView? = null
    private var onboardingShowing = false
    private var authLoggedOut: Boolean? = null
    private var awaitingLogin = false
    private var authPending = false
    private var loginStarting = false
    private var loginRevealing = false
    private val authTimeoutRunnable = Runnable {
        if (authPending) {
            // Could not tell either way in time: carry on to the main page (not the guide).
            authPending = false
            showSplashProgress()
            onPageReady()
        }
    }
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
    // Reports whether the page looks signed out (a login link in the header or a password box).
    // Polls because the header can appear late on slow devices; "signed in" must hold for a few checks.
    private val authJs = """
        (function() {
          try {
            if (!window.AndroidHost || !window.AndroidHost.reportAuth) return;
            if (window.__tvAuthTimer) return;   // already checking on this page
            var tries = 0, inStreak = 0;
            window.__tvAuthTimer = setInterval(function() {
              tries++;
              var why = '';
              var out = !!document.querySelector('input[type=password]');
              if (out) why = 'password field';
              var hdr = document.querySelector('header, .box-header, .nav-inner, .header');
              if (!out && hdr) {
                var lk = hdr.querySelector('a[href*="login"], a[href*="sign_in"], a[href*="signin"]');
                if (lk) { out = true; why = 'link ' + (lk.getAttribute('href') || '') + ' / ' + (lk.textContent || '').trim().slice(0, 20); }
                var els = hdr.querySelectorAll('a, button');
                for (var i = 0; i < els.length && !out; i++) {
                  var t = (els[i].textContent || '').trim();
                  if (t.length < 30 && /log\s*in|ログイン|new registration|新規登録|新規会員/i.test(t)) { out = true; why = 'text ' + t; }
                }
              }
              if (out) {
                clearInterval(window.__tvAuthTimer);
                window.AndroidHost.reportAuth(true, location.pathname);
              } else if (hdr) {
                inStreak++;
                if (inStreak >= 2) {
                  clearInterval(window.__tvAuthTimer);
                  window.AndroidHost.reportAuth(false, location.pathname);
                }
              }
              if (tries >= 12) clearInterval(window.__tvAuthTimer);
            }, 1000);
          } catch (e) {}
        })();
    """

    // The site's login page, restyled to match the guide (same colours, fonts and sizes): no header,
    // large fields, a clear gold focus highlight, Down/Up through email -> password -> Log in ->
    // Continue without logging in, Enter submits. The page's own login logic and error messages are
    // untouched, so failed attempts and retries behave as on the site.
    private fun loginPageJs(): String {
        val screenW = resources.displayMetrics.widthPixels.toFloat()
        val screenH = resources.displayMetrics.heightPixels.toFloat()
        val cssPerPx = LAYOUT_WIDTH.toFloat() / screenW
        val unit = density * cssPerPx   // CSS pixels in one dp
        val d = resources.getDrawable(R.drawable.splash_logo, null)
        val ratio = if (d != null && d.intrinsicWidth > 0) d.intrinsicHeight.toFloat() / d.intrinsicWidth else 0.25f
        val top = (screenH * 0.04f + screenW * LOGIN_LOGO_FRACTION * ratio + 16f * density) * cssPerPx
        return "var U = " + unit + "; var TOP = " + top + "; var JA = " + isJa + ";" + LOGIN_PAGE_JS_BODY
    }

    private val LOGIN_PAGE_JS_BODY = """
        (function() {
          try {
            if (location.pathname.indexOf('/login') !== 0) {
              if (window.AndroidHost && window.AndroidHost.loginPageReady) window.AndroidHost.loginPageReady(false);
              return;
            }
            var gold = '#FFB347';
            function f(n) { return (n * U).toFixed(1) + 'px'; }
            if (!document.getElementById('tv-login-style')) {
              var st = document.createElement('style');
              st.id = 'tv-login-style';
              st.textContent =
                'html,body{background:#000 !important;color:#fff !important;font-family:Roboto,Arial,sans-serif !important;}' +
                'header,.box-header,.nav-inner,.header,footer,.footer,.breadcrumb,.breadcrumbs,#header,#footer{display:none !important;}' +
                'body{padding-top:' + TOP.toFixed(1) + 'px !important;}' +
                'form{width:' + f(620) + ' !important;max-width:100% !important;margin:0 auto !important;}' +
                'label{color:' + gold + ' !important;font-size:' + f(16) + ' !important;font-weight:bold !important;}' +
                'input[type=text],input[type=email],input[type=password],input:not([type]){display:block !important;height:' + f(64) + ' !important;font-size:' + f(24) + ' !important;padding:0 ' + f(24) + ' !important;margin:' + f(12) + ' 0 0 0 !important;background:#111 !important;color:#fff !important;border:' + f(2) + ' solid rgba(255,179,71,.4) !important;border-radius:' + f(12) + ' !important;width:100% !important;box-sizing:border-box !important;box-shadow:none !important;outline:none !important;}' +
                'input[type=text]:focus,input[type=email]:focus,input[type=password]:focus,input:not([type]):focus{background:#2A2210 !important;border:' + f(5) + ' solid ' + gold + ' !important;box-shadow:none !important;outline:none !important;}' +
                'button[type=submit],input[type=submit],.tv-btn{display:block !important;width:' + f(620) + ' !important;max-width:100% !important;height:' + f(60) + ' !important;margin:' + f(14) + ' auto 0 auto !important;font-size:' + f(20) + ' !important;font-weight:bold !important;font-family:Roboto,Arial,sans-serif !important;background:rgba(0,0,0,.2) !important;color:#fff !important;border:' + f(2) + ' solid ' + gold + ' !important;border-radius:' + f(12) + ' !important;box-shadow:none !important;outline:none !important;cursor:pointer;}' +
                'button[type=submit]:focus,input[type=submit]:focus,.tv-btn:focus{background:' + gold + ' !important;color:#1a1a1a !important;border:' + f(4) + ' solid #fff !important;box-shadow:none !important;outline:none !important;}' +
                'a{color:' + gold + ' !important;font-size:' + f(18) + ' !important;}' +
                'p,li,span,div{font-size:' + f(18) + ';}' +
                '.error,.errors,.alert,.alert-danger,.notice,.flash,[role=alert],[class*=error],[class*=Error],[class*=alert],[id*=error]{color:#FF7A66 !important;font-size:' + f(20) + ' !important;text-align:center !important;}' +
                '.tv-login-title{color:' + gold + ';font-size:' + f(34) + ';font-weight:bold;text-align:center;margin:0 0 ' + f(8) + ' 0;}' +
                '.tv-login-hint{color:#fff;font-size:' + f(22) + ';text-align:center;margin:0 0 ' + f(10) + ' 0;}';
              document.head.appendChild(st);
            }

            function pwInput() { return document.querySelector('input[type=password]'); }
            function scope() { var pw = pwInput(); return (pw && pw.closest('form')) || document; }
            function visible(e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled; }
            function inputs() {
              return [].slice.call(scope().querySelectorAll('input')).filter(function(e) {
                var t = (e.type || 'text').toLowerCase();
                return ['hidden', 'checkbox', 'radio', 'submit', 'button', 'image'].indexOf(t) < 0 && visible(e);
              });
            }
            function submitBtn() {
              var sc = scope();
              var b = sc.querySelector('button[type=submit], input[type=submit]');
              if (b && visible(b)) return b;
              var all = [].slice.call(sc.querySelectorAll('button, input[type=button], a.btn'));
              for (var i = 0; i < all.length; i++) {
                if (all[i].classList.contains('tv-btn')) continue;
                var t = (all[i].textContent || all[i].value || '').trim();
                if (/log\s*in|ログイン|sign\s*in/i.test(t) && visible(all[i])) return all[i];
              }
              return null;
            }
            function contBtn() { return document.querySelector('.tv-continue'); }
            function order() {
              var list = inputs();
              var b = submitBtn();
              if (b) list.push(b);
              var c = contBtn();
              if (c) list.push(c);
              return list;
            }
            function doSubmit() {
              var b = submitBtn();
              if (b) { b.click(); return; }
              var pw = pwInput();
              var fm = pw && pw.closest('form');
              if (fm) { if (fm.requestSubmit) fm.requestSubmit(); else fm.submit(); }
            }

            // Title, hint and the "continue without logging in" button, added around the site's form.
            var pw0 = pwInput();
            var f0 = pw0 && pw0.closest('form');
            if (f0 && f0.parentNode) {
              if (!document.querySelector('.tv-login-title')) {
                var ttl = document.createElement('div');
                ttl.className = 'tv-login-title';
                ttl.textContent = JA ? 'Stardom World にログイン' : 'Log in to Stardom World';
                var hint = document.createElement('div');
                hint.className = 'tv-login-hint';
                hint.textContent = JA ? 'Stardom World のアカウントでログインするか、ログインせずに続けられます。' : 'Use your Stardom World account, or carry on without one.';
                f0.parentNode.insertBefore(ttl, f0);
                f0.parentNode.insertBefore(hint, f0);
              }
              if (!document.querySelector('.tv-continue')) {
                var cb = document.createElement('button');
                cb.type = 'button';
                cb.className = 'tv-btn tv-continue';
                cb.textContent = JA ? 'ログインせずに続ける' : 'Continue without logging in';
                cb.onclick = function() { if (window.AndroidHost && window.AndroidHost.browseWithoutLogin) window.AndroidHost.browseWithoutLogin(); };
                f0.parentNode.insertBefore(cb, f0.nextSibling);
              }
            }

            if (!window.__tvLoginKeys) {
              window.__tvLoginKeys = true;
              document.addEventListener('keydown', function(e) {
                if (location.pathname.indexOf('/login') !== 0) return;
                var list = order();
                var i = list.indexOf(document.activeElement);
                if (i < 0) return;
                if (e.keyCode === 40 || e.keyCode === 38) {
                  e.preventDefault();
                  e.stopPropagation();
                  var n = e.keyCode === 40 ? Math.min(i + 1, list.length - 1) : Math.max(i - 1, 0);
                  list[n].focus();
                } else if (e.keyCode === 13 && document.activeElement.tagName === 'INPUT') {
                  e.preventDefault();
                  e.stopPropagation();
                  var ins = inputs();
                  var k = ins.indexOf(document.activeElement);
                  if (k >= 0 && k < ins.length - 1) ins[k + 1].focus(); else doSubmit();
                }
              }, true);
            }

            // Tell the app the page is ready, and put the focus on the first field.
            var tries = 0, reported = false;
            var timer = setInterval(function() {
              tries++;
              var ins = inputs();
              if (ins.length) {
                if (!reported) {
                  reported = true;
                  if (window.AndroidHost && window.AndroidHost.loginPageReady) window.AndroidHost.loginPageReady(true);
                }
                if (order().indexOf(document.activeElement) < 0) {
                  try { ins[0].focus({ preventScroll: true }); } catch (e) { ins[0].focus(); }
                  try { window.scrollTo(0, 0); } catch (e) {}
                }
                if (tries > 8) clearInterval(timer);
              } else if (tries > 30) {
                clearInterval(timer);
              }
            }, 300);
          } catch (e) {}
        })();
    """

    private val headerJs = """
        (function(){
          if (window.__tvHeaderFix) return;
          window.__tvHeaderFix = true;
          // The page is laid out at a fixed width, so it should never scroll sideways: if focusing
          // something at the far right nudges it, put it straight back.
          window.addEventListener('scroll', function() {
            if (window.scrollX) window.scrollTo(0, window.scrollY);
          }, {passive: true});

          // Left/Right between the account menu and the language switch. The account menu opens when it
          // is focused and its items trap sideways movement, so step across explicitly.
          document.addEventListener('keydown', function(e) {
            if (e.keyCode !== 37 && e.keyCode !== 39) return;
            var lang = document.getElementById('tv-lang-toggle-btn');
            var ae = document.activeElement;
            if (!lang || !ae) return;
            var wrap = lang.closest('ul, .btn-wrap');
            if (!wrap) return;
            function shown(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
            var lis = Array.prototype.filter.call(wrap.children, function(li) {
              return li.id !== 'tv-lang-li' && shown(li) && li.querySelector('a, button');
            });
            if (!lis.length) return;
            var last = lis[lis.length - 1];
            if (e.keyCode === 39 && ae !== lang && last.contains(ae)) {
              e.preventDefault();
              e.stopPropagation();
              lang.focus();
            } else if (e.keyCode === 37 && ae === lang) {
              e.preventDefault();
              e.stopPropagation();
              var t = last.querySelector('.box-dropdown-key, [tabindex]') || last.querySelector('a, button');
              if (t) t.focus();
            }
          }, true);
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
                        defaultOpt.textContent = isJa ? 'カテゴリー' : 'CATEGORIES';
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

                        // Fire TV draws the page's own pop-up list with almost no focus highlight, so it
                        // uses the app's list instead (same look as the Sony TV's list, no radio buttons).
                        if (window.AndroidHost && window.AndroidHost.useNativePicker && window.AndroidHost.useNativePicker()) {
                          var openPicker = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            var now = Date.now();
                            if (window.__tvPickerAt && now - window.__tvPickerAt < 600) return;
                            window.__tvPickerAt = now;
                            var labels = [];
                            for (var oi = 0; oi < select.options.length; oi++) {
                              if (!select.options[oi].disabled) labels.push(select.options[oi].textContent.trim());
                            }
                            window.AndroidHost.pickSection(JSON.stringify(labels));
                          };
                          select.addEventListener('mousedown', openPicker, true);
                          select.addEventListener('click', openPicker, true);
                          select.addEventListener('keydown', function(e) {
                            if (e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 32) openPicker(e);
                          }, true);
                          window.__tvPickSection = function(n) {
                            var c = 0;
                            for (var oi = 0; oi < select.options.length; oi++) {
                              if (select.options[oi].disabled) continue;
                              if (c === n) {
                                select.selectedIndex = oi;
                                select.dispatchEvent(new Event('change', { bubbles: true }));
                                return;
                              }
                              c++;
                            }
                          };
                        }

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
                          langLi.style.setProperty('display', 'flex', 'important');
                          langLi.style.setProperty('align-items', 'center', 'important');
                          langLi.style.setProperty('height', '44px', 'important');
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
                        // A two-position switch: EN | 日本語, the active language filled in gold.
                        if (langBtn.getAttribute('data-lang') !== currentLang) {
                          langBtn.setAttribute('data-lang', currentLang);
                          while (langBtn.firstChild) langBtn.removeChild(langBtn.firstChild);
                          var optEn = document.createElement('span');
                          optEn.className = 'tv-lang-opt' + (currentLang === 'ja' ? '' : ' tv-lang-on');
                          optEn.textContent = 'EN';
                          var optJa = document.createElement('span');
                          optJa.className = 'tv-lang-opt' + (currentLang === 'ja' ? ' tv-lang-on' : '');
                          optJa.textContent = '日本語';
                          langBtn.appendChild(optEn);
                          langBtn.appendChild(optJa);
                        }
                        // Account menu: never drops down by itself; OK / click on the name opens the app's
                        // list (same as the category list), shown in the middle of the page.
                        // The account menu exists only when signed in: a name label (.box-dropdown-key) and a
                        // hidden panel (.dropdown-container) holding the links.
                        var acctLi = null;
                        var acctMenu = null;
                        var acctToggle = btnWrap.querySelector('.box-dropdown-key');
                        if (acctToggle) {
                          var host = acctToggle.parentElement;
                          while (host && host.parentElement !== btnWrap && host !== btnWrap) host = host.parentElement;
                          acctLi = (host && host !== btnWrap) ? host : acctToggle.parentElement;
                          acctMenu = acctLi.querySelector('.dropdown-container') ||
                            Array.prototype.filter.call(acctLi.querySelectorAll('ul, div'), function(x) {
                              return x.querySelectorAll('a').length >= 2 && !x.contains(acctToggle);
                            }).pop() || null;
                          if (!acctMenu && !window.__tvAcctWarned && window.AndroidHost && window.AndroidHost.logDebug) {
                            window.__tvAcctWarned = true;
                            window.AndroidHost.logDebug('Account menu list not found');
                          }
                        }
                        if (acctLi && acctMenu && acctToggle && !acctLi.getAttribute('data-tv-acct') && window.AndroidHost && window.AndroidHost.pickAccountItem) {
                          {
                            acctLi.setAttribute('data-tv-acct', '1');
                            acctMenu.classList.add('tv-acct-menu');
                            if (!acctToggle.hasAttribute('tabindex')) acctToggle.setAttribute('tabindex', '0');
                            var openAcct = function(e) {
                              e.preventDefault();
                              e.stopPropagation();
                              var nowA = Date.now();
                              if (window.__tvAcctAt && nowA - window.__tvAcctAt < 600) return;
                              window.__tvAcctAt = nowA;
                              var items = Array.prototype.filter.call(acctMenu.querySelectorAll('a'), function(x) {
                                return (x.textContent || '').trim().length > 0;
                              });
                              window.__tvAcctItems = items;
                              window.AndroidHost.pickAccountItem(JSON.stringify(items.map(function(x) { return x.textContent.trim(); })));
                            };
                            acctToggle.addEventListener('mousedown', openAcct, true);
                            acctToggle.addEventListener('click', openAcct, true);
                            acctToggle.addEventListener('keydown', function(e) {
                              if (e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 32) openAcct(e);
                            }, true);
                            window.__tvPickAccount = function(n) {
                              var it = (window.__tvAcctItems || [])[n];
                              if (it) it.click();
                            };
                          }
                        }
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

                    // ---- Single-row header: logo | search + category + favorites | account buttons ----
                    if (flexWrapper && btnWrap) {
                      // Favorites only when signed in (the "Log in" / "New registration" buttons mean signed out)
                      var hdrText = btnWrap.textContent || '';
                      var loggedOut = /log\s*in|ログイン|new registration|新規/i.test(hdrText) ||
                        !!btnWrap.querySelector('a[href*="login"], a[href*="sign_in"], a[href*="signin"]');
                      if (favBtn) {
                        if (loggedOut) favBtn.style.setProperty('display', 'none', 'important');
                        else favBtn.style.removeProperty('display');
                      }

                      var commonAncestor = function(x, y) {
                        var n = x;
                        while (n && !n.contains(y)) n = n.parentElement;
                        return n;
                      };
                      var rowEl = commonAncestor(flexWrapper, btnWrap);
                      var logoEl = document.querySelector('h1 a img, .nav-inner h1 img, header a img, .logo img');
                      if (rowEl && logoEl) rowEl = commonAncestor(rowEl, logoEl) || rowEl;

                      if (rowEl && rowEl !== document.body && rowEl !== document.documentElement && rowEl.closest('header, .box-header, .nav-inner, .header')) {
                        var rs = rowEl.style;
                        rs.setProperty('display', 'flex', 'important');
                        rs.setProperty('flex-wrap', 'nowrap', 'important');
                        rs.setProperty('align-items', 'center', 'important');
                        rs.setProperty('gap', '16px', 'important');
                        rs.setProperty('height', 'auto', 'important');
                        rs.setProperty('min-height', '64px', 'important');

                        Array.from(rowEl.children).forEach(function(child) {
                          child.style.setProperty('float', 'none', 'important');
                          child.style.setProperty('position', 'static', 'important');
                          child.style.setProperty('margin-top', '0', 'important');
                          child.style.setProperty('margin-bottom', '0', 'important');
                          child.style.setProperty('width', 'auto', 'important');
                          if (child.contains(flexWrapper)) {
                            child.style.setProperty('flex', '0 1 auto', 'important');
                            child.style.setProperty('min-width', '0', 'important');
                            child.style.setProperty('margin-right', '24px', 'important');
                          } else if (child.contains(btnWrap)) {
                            child.style.setProperty('flex', '0 0 auto', 'important');
                            child.style.setProperty('margin-left', 'auto', 'important');
                            child.style.setProperty('padding-left', '24px', 'important');
                            child.style.setProperty('text-align', 'right', 'important');
                          } else {
                            child.style.setProperty('flex', '0 0 auto', 'important');
                            child.style.setProperty('margin-right', '24px', 'important');
                          }
                        });

                        var bs = btnWrap.style;
                        bs.setProperty('display', 'flex', 'important');
                        bs.setProperty('flex-wrap', 'nowrap', 'important');
                        bs.setProperty('align-items', 'center', 'important');
                        bs.setProperty('gap', '12px', 'important');
                        bs.setProperty('float', 'none', 'important');
                        bs.setProperty('margin', '0 0 0 24px', 'important');
                        bs.setProperty('padding', '0', 'important');
                        bs.setProperty('list-style', 'none', 'important');
                        Array.from(btnWrap.children).forEach(function(li) {
                          li.style.setProperty('float', 'none', 'important');
                          li.style.setProperty('display', 'flex', 'important');
                          li.style.setProperty('align-items', 'center', 'important');
                          li.style.setProperty('height', '44px', 'important');
                          li.style.setProperty('padding-top', '0', 'important');
                          li.style.setProperty('padding-bottom', '0', 'important');
                          li.style.setProperty('margin', '0 6px', 'important');
                          li.style.setProperty('white-space', 'nowrap', 'important');
                          li.style.setProperty('max-width', 'none', 'important');
                          li.style.setProperty('width', 'auto', 'important');

                          Array.from(li.querySelectorAll('*')).forEach(function(sub) {
                            sub.style.setProperty('white-space', 'nowrap', 'important');
                            sub.style.setProperty('max-width', 'none', 'important');
                            sub.style.setProperty('width', 'auto', 'important');
                            sub.style.setProperty('overflow', 'visible', 'important');
                            sub.style.setProperty('word-break', 'normal', 'important');
                          });

                          if (li.id === 'tv-lang-li' || li.querySelector('#tv-lang-toggle-btn')) {
                            li.style.setProperty('margin-left', 'auto', 'important');
                            li.style.setProperty('padding-left', '16px', 'important');
                          }
                        });

                        // The box holding the buttons is the same 44px band as the search and category boxes.
                        var btnHolder = btnWrap.parentElement;
                        if (btnHolder && btnHolder !== rowEl) {
                          btnHolder.style.setProperty('display', 'flex', 'important');
                          btnHolder.style.setProperty('align-items', 'center', 'important');
                          btnHolder.style.setProperty('height', '44px', 'important');
                          btnHolder.style.setProperty('padding-top', '0', 'important');
                          btnHolder.style.setProperty('padding-bottom', '0', 'important');
                        }
                        btnWrap.style.setProperty('height', '44px', 'important');

                        // Logo: half the distance from the left edge it had before.
                        var logoChild = null;
                        Array.from(rowEl.children).forEach(function(ch) { if (logoEl && ch.contains(logoEl)) logoChild = ch; });
                        if (logoChild) {
                          logoChild.style.setProperty('margin-left', '0', 'important');
                          var logoLeft = logoEl.getBoundingClientRect().left;
                          if (logoLeft > 4) logoChild.style.setProperty('margin-left', (-logoLeft / 2).toFixed(1) + 'px', 'important');
                        }

                        // Long account names: more than 8 characters before "-san" are cut short.
                        var keyEl = btnWrap.querySelector('.box-dropdown-key');
                        if (keyEl) {
                          var tw = document.createTreeWalker(keyEl, NodeFilter.SHOW_TEXT, null, false);
                          var tn;
                          while ((tn = tw.nextNode())) {
                            var raw = tn.nodeValue || '';
                            if (!raw.trim()) continue;
                            var mm = raw.match(/^(\s*)(.+?)(\s*[-\u2010]?\s*(?:san|\u3055\u3093))?(\s*)$/i);
                            if (mm) {
                              var nameChars = Array.from(mm[2]);
                              if (nameChars.length > 8 && mm[2].indexOf('\u2026') < 0) {
                                tn.nodeValue = mm[1] + nameChars.slice(0, 8).join('') + '\u2026' + (mm[3] || '') + mm[4];
                              }
                            }
                            break;
                          }
                        }
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
        // Fire OS renders WebView video black / mis-sized with a forced hardware layer; leave it default there.
        if (!isFireTv()) webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
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

        // Transition overlay for page loading
        transitionOverlay = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            isClickable = true
            visibility = View.GONE
            alpha = 0f
        }
        transitionView = TransitionOverlayView(
            this,
            BitmapFactory.decodeResource(resources, R.drawable.cursor_wand),
            density,
            HOT_X,
            HOT_Y
        )
        transitionOverlay.addView(
            transitionView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        root.addView(
            transitionOverlay,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        // Black splash with the logo, drawn above everything until the page is ready.
        splashView = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            isClickable = true
            clipChildren = false
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

        // Gold progress bar with the wand riding its tip, directly under the logo.
        val splashLogoW = (resources.displayMetrics.widthPixels * 0.6f).toInt()
        val logoDrawable = splashLogo.drawable
        val splashLogoH = if (logoDrawable != null && logoDrawable.intrinsicWidth > 0) {
            splashLogoW * logoDrawable.intrinsicHeight / logoDrawable.intrinsicWidth
        } else {
            (splashLogoW * 0.25f).toInt()
        }
        splashProgress = SplashProgressView(
            this,
            BitmapFactory.decodeResource(resources, R.drawable.cursor_wand),
            density,
            HOT_X,
            HOT_Y
        ).apply { alpha = 0f }
        splashView.addView(
            splashProgress,
            FrameLayout.LayoutParams(
                splashLogoW,
                (88 * density).toInt(),
                Gravity.TOP or Gravity.CENTER_HORIZONTAL
            ).apply {
                topMargin = resources.displayMetrics.heightPixels / 2 + splashLogoH / 2 + (20 * density).toInt()
            }
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

        // 1. The splash logo comes first (no loading bar yet). 2. We check whether the person is signed
        // in. 3. Signed in: the bar appears under the logo and the splash finishes onto the main page.
        // 4. Signed out: the guide takes over with the logo in the same place.
        startSplash()
        authPending = true
        handler.postDelayed(authTimeoutRunnable, 10000L)

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
        appJa = initLang == "ja"
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
                if (url != null && url != lastNavigatedUrl) {
                    lastNavigatedUrl = url
                    showPageTransitionOverlay()
                }
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
                // Start the sign-in check as soon as the page is mostly drawn, not only once every
                // image has finished (slow on Fire TV).
                if (newProgress >= 10 && view != null && (authPending || awaitingLogin)) {
                    view.evaluateJavascript(authJs, null)
                }
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
                // Fire TV: GONE collapses the page to 0x0, which shrinks the video layout; keep its size.
                webView.visibility = if (isFireTv()) View.INVISIBLE else View.GONE
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
                scheduleFullScreenResizeNudges()
                // Entered through the player's own full-screen button: start the 8 second countdown and
                // take keyboard focus off the player, otherwise its controls never fade.
                fullScreenInteraction()
                handler.postDelayed({ releasePlayerFocus() }, 500)
                if (isFireTv()) {
                    handler.postDelayed({ fixFireTvCustomView(view) }, 300)
                    handler.postDelayed({ fixFireTvCustomView(view) }, 1500)
                }
            }

            override fun onHideCustomView() {
                hideCustomView()
            }
        }

        webView.loadUrl(START_URL)
    }

    private fun startSplash() {
        splashLogo.animate()
            .alpha(1f)
            .setDuration(400)
            .setInterpolator(DecelerateInterpolator())
            .start()
    }

    // Signed in: the loading bar appears under the logo and starts travelling.
    private fun showSplashProgress() {
        splashStartedAt = SystemClock.uptimeMillis()
        splashProgress.animate().alpha(1f).setDuration(400).setInterpolator(DecelerateInterpolator()).start()
        splashProgress.start()

        // Safety net: if the page never reports ready, still finish (with the full animation).
        handler.postDelayed({ requestSplashFinish() }, SPLASH_MAX_MS)
    }

    // Called when the page is ready. Waits until the bar has had a minimum time to travel, then runs
    // the finish sequence (bar fills to the end, sparkle burst) and only then fades the splash out.
    private fun requestSplashFinish() {
        if (splashDone || splashFinishing || authPending) return
        splashFinishing = true
        val elapsed = SystemClock.uptimeMillis() - splashStartedAt
        handler.postDelayed({
            splashProgress.finish { dismissSplash() }
        }, (SPLASH_MIN_FILL_MS - elapsed).coerceAtLeast(0L))
    }

    private fun onPageReady() {
        if (splashDone || splashDismissScheduled || authPending) return
        splashDismissScheduled = true
        val elapsed = SystemClock.uptimeMillis() - splashStartedAt
        handler.postDelayed({ requestSplashFinish() }, (SPLASH_MIN_MS - elapsed).coerceAtLeast(0L))
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

    // ---------------------------------------------------------------- first-run guide and login

    // Hands over from the splash to the guide: the guide is put underneath, then the splash fades away
    // (its logo sits exactly where the guide's logo is, so only the bar disappears and the text arrives).
    private fun beginGuide() {
        splashDone = true
        showOnboarding()
        // Load the site's login page quietly now, so it is ready by the time "Log in" is pressed.
        awaitingLogin = true
        webView.loadUrl(LOGIN_URL)
    }

    // The page reports whether it looks signed in or out. The first answer of a launch decides between
    // the guide and the normal start; once the guide is up, a "signed in" answer from the login page
    // means the login worked.
    private fun onAuthReported(loggedOut: Boolean, path: String) {
        authLoggedOut = loggedOut
        if (authPending) {
            authPending = false
            handler.removeCallbacks(authTimeoutRunnable)
            if (loggedOut) {
                beginGuide()
            } else {
                showSplashProgress()
                onPageReady()
            }
            return
        }
        if (awaitingLogin && !loggedOut) loginSucceeded(path)
    }

    private fun showOnboarding() {
        onboardingShowing = true
        if (cursorMode) setCursorMode(false)
        // Keep the remote's focus inside the guide: nothing underneath may take it.
        webView.isFocusable = false
        webView.isFocusableInTouchMode = false
        val v = OnboardingView(
            this,
            density,
            BitmapFactory.decodeResource(resources, R.drawable.cursor_wand),
            { startWebLogin() },
            { exitGuideToSite() },
            { lang ->
                // Chosen on the guide's first screen: remember it and reload the (hidden) login page in it.
                applyLanguage(lang)
                webView.loadUrl(LOGIN_URL)
            }
        )
        onboardingView = v
        val lp = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        if (splashView.parent != null) {
            // Under the splash, then the splash fades out.
            root.addView(v, root.indexOfChild(splashView), lp)
            splashView.animate().cancel()
            splashProgress.animate().alpha(0f).setDuration(250).start()
            splashView.animate()
                .alpha(0f)
                .setStartDelay(150)
                .setDuration(600)
                .withEndAction {
                    if (splashView.parent != null) root.removeView(splashView)
                    splashView.animate().setStartDelay(0)
                }
                .start()
        } else {
            v.alpha = 0f
            root.addView(v, lp)
            v.animate().alpha(1f).setDuration(400).start()
        }
        refreshCursorVisibility()
    }

    private fun closeOnboarding() {
        onboardingView?.let { root.removeView(it) }
        onboardingView = null
        onboardingShowing = false
        loginStarting = false
        loginRevealing = false
        webView.isFocusable = true
        webView.isFocusableInTouchMode = true
        webView.requestFocus()
        refreshCursorVisibility()
    }

    // Back out of the experience: the transition screen, then the signed-out main page.
    private fun exitGuideToSite() {
        awaitingLogin = false
        showLoginLogo(false)
        closeOnboarding()
        showPageTransitionOverlay()
        webView.loadUrl(START_URL)
    }

    // "Log in": fade the guide away onto the login page straight away, in whatever state it is in
    // (it has been loading quietly underneath since the guide appeared).
    private fun startWebLogin() {
        if (loginStarting) return
        loginStarting = true
        revealLogin()
    }

    private fun revealLogin() {
        val v = onboardingView ?: return
        if (loginRevealing) return
        loginRevealing = true
        v.animate().alpha(0f).setDuration(400).withEndAction {
            closeOnboarding()
            showLoginLogo(awaitingLogin)
        }.start()
    }

    // A small copy of the logo above the login page, in the same style as the guide.
    private var loginLogoView: ImageView? = null

    private fun showLoginLogo(show: Boolean) {
        if (!show) {
            loginLogoView?.visibility = View.GONE
            return
        }
        var v = loginLogoView
        if (v == null) {
            v = ImageView(this).apply {
                setImageResource(R.drawable.splash_logo)
                adjustViewBounds = true
                isFocusable = false
            }
            loginLogoView = v
            root.addView(
                v,
                FrameLayout.LayoutParams(
                    (resources.displayMetrics.widthPixels * LOGIN_LOGO_FRACTION).toInt(),
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    Gravity.TOP or Gravity.CENTER_HORIZONTAL
                ).apply { topMargin = (resources.displayMetrics.heightPixels * 0.04f).toInt() }
            )
        }
        v.visibility = View.VISIBLE
        root.bringChildToFront(v)
        if (::cursorView.isInitialized) root.bringChildToFront(cursorView)
    }

    // Signed in from the login page: the transition screen, then the main page (no second splash).
    // If the site already moved on to a page of its own, that page is simply left showing.
    private fun loginSucceeded(path: String) {
        awaitingLogin = false
        showLoginLogo(false)
        closeOnboarding()
        if (path.startsWith("/login")) {
            showPageTransitionOverlay()
            webView.loadUrl(START_URL)
        }
    }

    private fun showPageTransitionOverlay() {
        if (!splashDone || transitionShowing || onboardingShowing) return
        transitionShowing = true
        handler.removeCallbacks(hideTransitionRunnable)

        transitionOverlay.visibility = View.VISIBLE
        transitionOverlay.alpha = 1f
        root.bringChildToFront(transitionOverlay)
        if (::cursorView.isInitialized) {
            root.bringChildToFront(cursorView)
        }
        transitionView.startAnimation()

        handler.postDelayed(hideTransitionRunnable, 5000L)
    }

    private val hideTransitionRunnable = Runnable {
        if (!transitionShowing) return@Runnable
        transitionOverlay.animate()
            .alpha(0f)
            .setDuration(500L)
            .withEndAction {
                transitionOverlay.visibility = View.GONE
                transitionShowing = false
            }
            .start()
    }

    // ---------------------------------------------------------------- page scripts

    inner class WebAppInterface {
        @android.webkit.JavascriptInterface
        fun onPageFullyLoaded() {
            handler.post {
                requestSplashFinish()
            }
        }

        @android.webkit.JavascriptInterface
        fun reportAuth(loggedOut: Boolean, path: String) {
            handler.post { onAuthReported(loggedOut, path) }
        }

        // The login page has been restyled and is ready to be shown (or the page is not a login page).
        @android.webkit.JavascriptInterface
        fun loginPageReady(show: Boolean) {
            handler.post {
                if (show) {
                    if (!onboardingShowing) showLoginLogo(awaitingLogin)
                } else {
                    showLoginLogo(false)
                }
            }
        }

        @android.webkit.JavascriptInterface
        fun browseWithoutLogin() {
            handler.post { exitGuideToSite() }
        }

        @android.webkit.JavascriptInterface
        fun useNativePicker(): Boolean = isFireTv()

        @android.webkit.JavascriptInterface
        fun pickSection(labelsJson: String) {
            handler.post { showSectionPicker(labelsJson, "__tvPickSection", "#tv-section-select") }
        }

        @android.webkit.JavascriptInterface
        fun pickAccountItem(labelsJson: String) {
            handler.post { showSectionPicker(labelsJson, "__tvPickAccount", "[data-tv-acct] .box-dropdown-key, [data-tv-acct] a, [data-tv-acct] button") }
        }

        @android.webkit.JavascriptInterface
        fun toggleLanguage(targetLang: String) {
            handler.post {
                applyLanguage(targetLang)
                webView.reload()
            }
        }

        @android.webkit.JavascriptInterface
        fun setPlayerFocused(focused: Boolean) {
            playerFocused = focused
            handler.post {
                if (focused) armControlsIdleTimer() else handler.removeCallbacks(hideControlsRunnable)
            }
        }

        @android.webkit.JavascriptInterface
        fun exitFullScreen() {
            handler.post {
                if (customView != null) hideCustomView()
                webView.evaluateJavascript(
                    "(function(){ try { if (document.webkitExitFullscreen) document.webkitExitFullscreen(); else if (document.exitFullscreen) document.exitFullscreen(); } catch(e) {} })()",
                    null
                )
            }
        }

        @android.webkit.JavascriptInterface
        fun logDebug(msg: String) {
            handler.post {
                val shown = if (!isJa) msg else when (msg) {
                    "Favorites API not available" -> "お気に入り機能は利用できません"
                    "Please log in on Stardom World to sync favorites" -> "お気に入りを同期するには Stardom World にログインしてください"
                    "Removed from Favorites" -> "お気に入りから削除しました"
                    "♥ Added to Favorites!" -> "♥ お気に入りに追加しました"
                    else -> msg
                }
                Toast.makeText(this@MainActivity, shown, Toast.LENGTH_SHORT).show()
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


    // Lets the D-pad escape the cross-origin video player (Vimeo iframe). The page cannot see keys
    // pressed inside the iframe, so the page only reports "player has focus" to Android, and
    // dispatchKeyEvent then handles Up/Down/Left/Right itself while that flag is set.
    private val playerNavJs = """
        (function(){
          if (window.__tvPlayerNavAttached) return;
          window.__tvPlayerNavAttached = true;

          var last = false;
          function check() {
            var ae = document.activeElement;
            var inPlayer = !!(ae && ae.tagName === 'IFRAME' && /vimeo|player/.test(ae.src || ''));
            if (inPlayer !== last) {
              last = inPlayer;
              try { window.AndroidHost.setPlayerFocused(inPlayer); } catch (e) {}
            }
          }
          setInterval(check, 150);
          window.addEventListener('blur', check);
          window.addEventListener('focus', check);

          window.__tvLeavePlayer = function(dir) {
            var iframe = document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]');
            var target = null;
            if (dir === 'down') {
              var cards = Array.from(document.querySelectorAll('a.tv-thumbnail-link, .content-list-item a[href*="/contents/"], .content-list-item a[href*="/set/"]')).filter(function(a) {
                if (a.closest('.slick-cloned')) return false;
                var r = a.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) return false;
                return !iframe || (iframe.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
              });
              target = cards[0] || null;
            } else {
              target = document.querySelector('form.form-inline input[type="submit"], #tv-section-select, #tv-fav-header-btn');
            }
            try { if (document.activeElement) document.activeElement.blur(); } catch (e) {}
            if (target) {
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
            last = false;
            try { window.AndroidHost.setPlayerFocused(false); } catch (e) {}
            return !!target;
          };
        })();
    """.trimIndent()

    // When the current video ends: play the next video in the (chronological) carousel under the
    // player, or leave fullscreen and stay on the contents page when the list is finished.
    private val autoNextJs = """
        (function(){
          if (window.__tvAutoNextAttached) return;
          window.__tvAutoNextAttached = true;

          function pathOf(h) {
            try { return new URL(h, location.href).pathname.replace(/\/+$/, ''); } catch (e) { return ''; }
          }
          function idOf(h) {
            var m = pathOf(h).match(/(\d+)$/);
            return m ? m[1] : pathOf(h);
          }

          // Ordered hrefs of the first carousel under the player (already reversed to chronological)
          function carouselList() {
            var carousels = document.querySelectorAll('.content-list.js-list-slide, .js-list-slide');
            if (!carousels.length) return [];
            var items = Array.from(carousels[0].querySelectorAll('.content-list-item, .sub-category-list-item')).filter(function(el) {
              return !el.classList.contains('slick-cloned') && !el.closest('.slick-cloned');
            });
            var out = [];
            items.forEach(function(it) {
              var a = it.querySelector('a[href*="/contents/"], a[href*="/set/"]');
              if (a && a.href && out.indexOf(a.href) === -1) out.push(a.href);
            });
            return out;
          }

          function indexIn(list, href) {
            var id = idOf(href);
            for (var i = 0; i < list.length; i++) {
              if (idOf(list[i]) === id) return i;
            }
            return -1;
          }

          function onEnded() {
            if (window.__tvAutoNextFired) return;
            window.__tvAutoNextFired = true;

            var list = carouselList();
            var pos = indexIn(list, location.href);
            var stored = null;
            try { stored = JSON.parse(sessionStorage.getItem('tvAutoNextList') || 'null'); } catch (e) {}

            // This page's carousel may not contain the current video (or be empty): use the
            // list remembered from the previous auto-advance instead.
            if (pos < 0 && stored && stored.length) {
              var sp = indexIn(stored, location.href);
              if (sp >= 0) { list = stored; pos = sp; }
            }

            var next = list[pos + 1];
            if (next) {
              try { sessionStorage.setItem('tvAutoNextList', JSON.stringify(list)); } catch (e) {}
              location.href = next;
            } else {
              try { sessionStorage.removeItem('tvAutoNextList'); } catch (e) {}
              try { window.AndroidHost.exitFullScreen(); } catch (e) {}
            }
          }

          function hook() {
            // HTML5 video
            Array.from(document.querySelectorAll('video')).forEach(function(v) {
              if (!v.__tvEndedHooked) {
                v.__tvEndedHooked = true;
                v.addEventListener('ended', onEnded);
              }
            });

            // Vimeo iframe: official Player API when the page loaded it, otherwise raw postMessage
            Array.from(document.querySelectorAll('iframe[src*="vimeo.com"]')).forEach(function(iframe) {
              if (!iframe.__tvFinishHooked && typeof Vimeo !== 'undefined' && Vimeo.Player) {
                try {
                  var player = new Vimeo.Player(iframe);
                  player.on('ended', onEnded);
                  iframe.__tvFinishHooked = true;
                } catch (e) {}
              }
              try {
                iframe.contentWindow.postMessage('{"method":"addEventListener","value":"finish"}', '*');
              } catch (e) {}
            });
          }

          window.addEventListener('message', function(ev) {
            try {
              var data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
              if (data && (data.event === 'finish' || data.event === 'ended')) onEnded();
            } catch (e) {}
          });

          setInterval(hook, 1500);
        })();
    """.trimIndent()

    // Puts the (cross-origin) video player's control overlay away: keyboard focus is moved from the
    // iframe to the box around it, which makes the player hide its controls. Pressing OK, Left or
    // Right on that box hands focus back to the player and the controls reappear. Moving the cursor
    // out of the player hides them straight away.
    private val playerControlsJs = """
        (function(){
          if (window.__tvPlayerCtlAttached) return;
          window.__tvPlayerCtlAttached = true;

          function playerFrame() {
            return document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]');
          }

          window.__tvHidePlayerControls = function() {
            var f = playerFrame();
            if (!f || document.activeElement !== f) return false;
            var holder = f.parentElement;
            if (!holder) return false;
            if (!holder.hasAttribute('tabindex')) holder.setAttribute('tabindex', '-1');
            holder.__tvControlsHidden = true;
            try { holder.focus({ preventScroll: true }); } catch (e) { holder.focus(); }
            return true;
          };

          // ---- Commands from the app while the player is full screen (seek / play-pause) ----
          var tvTime = 0, tvPaused = false;
          window.addEventListener('message', function(ev) {
            try {
              var d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
              if (!d) return;
              if (d.event === 'timeupdate' && d.data) tvTime = d.data.seconds || 0;
              else if (d.event === 'play') tvPaused = false;
              else if (d.event === 'pause') tvPaused = true;
            } catch (err) {}
          });
          function post(f, obj) {
            try { f.contentWindow.postMessage(JSON.stringify(obj), '*'); } catch (err) {}
          }
          setInterval(function() {
            var f = playerFrame();
            if (!f) return;
            post(f, { method: 'addEventListener', value: 'timeupdate' });
            post(f, { method: 'addEventListener', value: 'pause' });
            post(f, { method: 'addEventListener', value: 'play' });
          }, 2000);

          window.__tvPlayerCmd = function(cmd, val) {
            var f = playerFrame();
            if (!f) return false;
            var p = null;
            if (typeof Vimeo !== 'undefined' && Vimeo.Player) {
              try { p = f.__tvPlayer || (f.__tvPlayer = new Vimeo.Player(f)); } catch (err) { p = null; }
            }
            if (cmd === 'seek') {
              if (p) {
                Promise.all([p.getCurrentTime(), p.getDuration()]).then(function(r) {
                  var t = Math.min(Math.max(0, r[0] + val), Math.max(0, r[1] - 1));
                  return p.setCurrentTime(t);
                }).catch(function() {});
              } else {
                post(f, { method: 'setCurrentTime', value: Math.max(0, tvTime + val) });
              }
            } else if (cmd === 'toggle') {
              if (p) {
                p.getPaused().then(function(paused) { return paused ? p.play() : p.pause(); }).catch(function() {});
              } else {
                post(f, { method: tvPaused ? 'play' : 'pause' });
              }
            }
            else if (cmd === 'mute' && p) {
              p.getVolume().then(function(v) { return p.setVolume(v > 0 ? 0 : 1); }).catch(function() {});
            } else if (cmd === 'speed' && p) {
              p.getPlaybackRate().then(function(r) {
                var rates = [0.75, 1, 1.25, 1.5, 2];
                var i = rates.indexOf(r);
                return p.setPlaybackRate(rates[(i + 1) % rates.length]);
              }).catch(function() {});
            } else if (cmd === 'captions' && p) {
              p.getTextTracks().then(function(tr) {
                if (!tr || !tr.length) return;
                var cur = -1;
                for (var i = 0; i < tr.length; i++) { if (tr[i].mode === 'showing') cur = i; }
                if (cur + 1 >= tr.length) return p.disableTextTrack();
                return p.enableTextTrack(tr[cur + 1].language, tr[cur + 1].kind);
              }).catch(function() {});
            }
            return true;
          };

          // Latest player state for the app's own full-screen button bar.
          window.__tvRefreshStatus = function() {
            var f = playerFrame();
            if (!f || typeof Vimeo === 'undefined' || !Vimeo.Player) return;
            var p = null;
            try { p = f.__tvPlayer || (f.__tvPlayer = new Vimeo.Player(f)); } catch (err) { p = null; }
            if (!p) return;
            Promise.all([p.getPaused(), p.getCurrentTime(), p.getDuration(), p.getVolume(), p.getPlaybackRate(), p.getTextTracks()]).then(function(r) {
              var cc = 'Off';
              var tr = r[5] || [];
              for (var i = 0; i < tr.length; i++) { if (tr[i].mode === 'showing') cc = tr[i].label || tr[i].language; }
              window.__tvStatusJson = JSON.stringify({ paused: r[0], t: r[1], d: r[2], vol: r[3], rate: r[4], cc: cc, ncc: tr.length });
            }).catch(function() {});
          };

          document.addEventListener('keydown', function(e) {
            var f = playerFrame();
            var ae = document.activeElement;
            if (!f || !ae || ae !== f.parentElement || !ae.__tvControlsHidden) return;
            var k = e.keyCode;
            if (k === 13 || k === 32 || k === 37 || k === 39 || k === 179) {
              e.preventDefault();
              e.stopPropagation();
              ae.__tvControlsHidden = false;
              f.focus();
            }
          }, true);

          document.addEventListener('mousemove', function(e) {
            var f = playerFrame();
            if (f && document.activeElement === f && e.target !== f) {
              window.__tvHidePlayerControls();
            }
          }, true);
        })();
    """.trimIndent()

    private val cardFavoriteToggleJs = """
        (function(){
          if (window.__tvCardFavoriteAttached) return;
          window.__tvCardFavoriteAttached = true;

          function toggleCardFavorite(input) {
            var $ = window.jQuery || window.$;
            var targets = [];

            if (Array.isArray(input) || (input && typeof input.length === 'number' && !(input instanceof HTMLElement))) {
              for (var i = 0; i < input.length; i++) {
                if (input[i]) targets.push(input[i]);
              }
            } else if (input) {
              targets.push(input);
            }

            if (document.activeElement && targets.indexOf(document.activeElement) === -1) {
              targets.push(document.activeElement);
            }

            var targetContentId = null;
            var targetCard = null;

            for (var j = 0; j < targets.length; j++) {
              var el = targets[j];
              if (!el || typeof el.closest !== 'function') continue;
              if (el.closest('.slick-cloned')) continue;

              var cardContainer = el.closest('article, .content-list-item, .tile-inner, .slick-slide, .content-thumbnail-box, .content-thumbnail, .tv-card, .box-content') || el;
              var link = (cardContainer ? cardContainer.querySelector('a[href*="/contents/"], a[href*="/set/"]') : null) ||
                         el.closest('a[href*="/contents/"], a[href*="/set/"]') ||
                         el.querySelector('a[href*="/contents/"], a[href*="/set/"]');

              if (link) {
                var href = link.getAttribute('href') || link.href || '';
                var match = href.match(/(?:contents|set)\/(\d+)/);
                if (match && match[1]) {
                  targetContentId = match[1];
                  targetCard = cardContainer;
                  break;
                }
              }
            }

            if (!targetContentId) return false;

            var isFavPage = window.location.pathname.indexOf('/favorites') !== -1 || window.location.pathname.indexOf('/favorite') !== -1;
            var isFavorited = isFavPage || (targetCard && (targetCard.classList.contains('is-favorite') || targetCard.dataset.isFav === 'true'));
            var apiType = isFavorited ? 'DELETE' : 'POST';

            if ($ && $.apiCall) {
              $.apiCall({
                url: '/user_api/contents/' + targetContentId + '/favorites',
                type: apiType
              }).done(function(data) {
                if (apiType === 'DELETE') {
                  if (targetCard) {
                    targetCard.classList.remove('is-favorite');
                    targetCard.dataset.isFav = 'false';
                    if (isFavPage) targetCard.style.setProperty('opacity', '0.3', 'important');
                  }
                  if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                    window.AndroidHost.logDebug('Removed from Favorites');
                  }
                } else {
                  if (targetCard) {
                    targetCard.classList.add('is-favorite');
                    targetCard.dataset.isFav = 'true';
                  }
                  if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                    window.AndroidHost.logDebug('♥ Added to Favorites!');
                  }
                }
              }).fail(function(jqXHR) {
                if (jqXHR.status === 400 && window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                  window.AndroidHost.logDebug('Please log in on Stardom World to sync favorites');
                } else if (jqXHR.status === 409 || (jqXHR.responseJSON && jqXHR.responseJSON.message === 'Already favorited')) {
                  $.apiCall({
                    url: '/user_api/contents/' + targetContentId + '/favorites',
                    type: 'DELETE'
                  }).done(function() {
                    if (targetCard) {
                      targetCard.classList.remove('is-favorite');
                      targetCard.dataset.isFav = 'false';
                    }
                    if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                      window.AndroidHost.logDebug('Removed from Favorites');
                    }
                  });
                } else {
                  var newFavState = !isFavorited;
                  if (targetCard) {
                    if (newFavState) {
                      targetCard.classList.add('is-favorite');
                      targetCard.dataset.isFav = 'true';
                    } else {
                      targetCard.classList.remove('is-favorite');
                      targetCard.dataset.isFav = 'false';
                    }
                  }
                  if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                    window.AndroidHost.logDebug(newFavState ? '♥ Added to Favorites!' : 'Removed from Favorites');
                  }
                }
              });
            } else {
              if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') {
                window.AndroidHost.logDebug('Favorites API not available');
              }
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

          function sanitizeTitle(txt) {
            if (!txt) return 'Stardom World Video';
            return txt.replace(/月額見放題/g, '')
                      .replace(/Unlimited viewing for a monthly fee/gi, '')
                      .replace(/Monthly subscription available/gi, '')
                      .replace(/Monthly subscription/gi, '')
                      .replace(/Registration date\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '')
                      .replace(/お気に入り登録日\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '')
                      .replace(/登録日\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '')
                      .replace(/Registration date\s*[:：]?/gi, '')
                      .replace(/お気に入り登録日\s*[:：]?/g, '')
                      .replace(/登録日\s*[:：]?/g, '')
                      .replace(/\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/g, '')
                      .replace(/\s+/g, ' ')
                      .trim();
          }

          function styleSubPageTextBoxes() {
            if (isHomePage()) return;
            var boxes = document.querySelectorAll('.content-info-box, .content-info-box *, .content-list-item h3, .tile-inner h3, .box-content h3');
            boxes.forEach(function(b) {
              b.style.setProperty('background', '#1a1a1a', 'important');
              b.style.setProperty('background-color', '#1a1a1a', 'important');
              b.style.setProperty('color', '#ffffff', 'important');
            });
          }

          function sanitizeSubPageTitles() {
            var path = window.location.pathname;
            if (path === '/' || path === '/index.html' || path === '' || path === '/contents') return;

            var dateEls = document.querySelectorAll('.date, .fav-date, .text-sub, [class*="date"]');
            dateEls.forEach(function(d) {
              if (d.textContent && (d.textContent.indexOf('登録日') !== -1 || d.textContent.indexOf('Registration') !== -1)) {
                d.style.setProperty('display', 'none', 'important');
              }
            });

            var subTitles = document.querySelectorAll('.content-info-box h3, .content-list-item h3, .content-list-item a, .box-content h3');
            subTitles.forEach(function(el) {
              if (el.textContent && (el.textContent.indexOf('月額見放題') !== -1 || el.textContent.indexOf('Unlimited viewing') !== -1 || el.textContent.indexOf('Registration date') !== -1 || el.textContent.indexOf('お気に入り登録日') !== -1 || el.textContent.indexOf('登録日') !== -1)) {
                el.textContent = sanitizeTitle(el.textContent);
              }
            });
          }

          function applySubPageCardBackground() {
            var path = window.location.pathname;
            if (path === '/' || path === '/index.html' || path === '' || path === '/contents') return;

            var titleBoxes = document.querySelectorAll('.content-info-box, .content-list-item h3');
            titleBoxes.forEach(function(box) {
              box.style.setProperty('background', '#1a1a1a', 'important');
              box.style.setProperty('background-color', '#1a1a1a', 'important');
            });
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

          var HERO_FALLBACK = 'https://www.stardom-world.com/file_upload/images/mv_06.jpg';

          function heroUrlOf(img) {
            var u = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || img.currentSrc || img.src || '';
            if (!u || u.indexOf('data:') === 0) u = img.src || '';
            if (!u || u.indexOf('data:') === 0) return '';
            try { u = new URL(u, location.href).href; } catch (err) {}
            return u;
          }

          function isHeroDup(el) {
            return !!(el.closest && el.closest('.slick-cloned, .swiper-slide-duplicate, .owl-item.cloned'));
          }

          // Reads every slide of the site's own hero banner from the live page
          // (the hero is built late by the site's scripts, so this is re-run
          // every second) and hides the original so it can't show at the bottom.
          function collectHeroSlides() {
            var grid = document.getElementById('tv-test-grid');
            var slides = [];
            var seen = {};
            var sources = [];

            function add(url, link, srcEl) {
              if (!url || seen[url]) return;
              seen[url] = true;
              slides.push({ href: link || '#', bgUrl: url });
              if (srcEl && sources.indexOf(srcEl) === -1) sources.push(srcEl);
            }

            var sel = '.main-visual, .box-main-visual, .slider-inner, [class*="main-visual"], [class*="mainvisual"], [class*="mainVisual"], [class*="hero"], [class*="Hero"], [class*="kv"], .swiper, .swiper-container, .slick-slider, [class*="slider"], [class*="carousel"]';
            var cands = Array.from(document.querySelectorAll(sel)).filter(function(el) {
              if (grid && grid.contains(el)) return false;
              if (el.id && el.id.indexOf('tv-') === 0) return false;
              if (el.closest('header, footer, .box-header, #tv-header-flex-wrapper, #tv-test-grid')) return false;
              if (el.querySelector('.content-list-item, article, .tile-inner')) return false;
              return !!el.querySelector('img, [style*="background-image"]');
            });

            cands.forEach(function(cand) {
              Array.from(cand.querySelectorAll('img')).forEach(function(img) {
                if (isHeroDup(img)) return;
                if (img.naturalWidth > 0 && img.naturalWidth < 500) return;
                var a = img.closest('a[href]');
                add(heroUrlOf(img), a ? a.href : '', cand);
              });
              var bgEls = Array.from(cand.querySelectorAll('[style*="background-image"]'));
              if (cand.getAttribute('style') && cand.getAttribute('style').indexOf('background-image') !== -1) bgEls.unshift(cand);
              bgEls.forEach(function(el) {
                if (isHeroDup(el)) return;
                var m = (el.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/);
                if (m && m[1] && m[1].indexOf('data:') === -1) {
                  var a = el.closest('a[href]') || el.querySelector('a[href]');
                  add(m[1], a ? a.href : '', cand);
                }
              });
            });

            // Last resort: any very wide banner-shaped image outside the grid/header
            if (slides.length === 0) {
              Array.from(document.querySelectorAll('img')).forEach(function(img) {
                if (grid && grid.contains(img)) return;
                if (img.closest('header, footer, .box-header, #tv-header-flex-wrapper, #tv-test-grid, .content-list-item, article')) return;
                if (img.naturalWidth >= 1000 && img.naturalWidth / Math.max(img.naturalHeight, 1) >= 1.8) {
                  var a = img.closest('a[href]');
                  add(heroUrlOf(img), a ? a.href : '', img.closest('section, .box-section, div') || img);
                }
              });
            }

            return { slides: slides.slice(0, 8), sources: sources };
          }

          function extractHeroBanner() {
            var found = collectHeroSlides();
            if (found.slides.length > 0) return found.slides[0];
            return { href: '#', bgUrl: HERO_FALLBACK };
          }

          function showHeroSlide(idx) {
            var slides = window.__tvHeroSlides || [];
            if (!slides.length) return;
            idx = (idx + slides.length) % slides.length;
            window.__tvHeroIdx = idx;
            var card = document.querySelector('.tv-hero-card');
            if (!card) return;
            var img = card.querySelector('img');
            if (!img) return;
            var slide = slides[idx];
            img.style.transition = 'opacity 0.35s ease';
            img.style.setProperty('opacity', '0', 'important');
            setTimeout(function() {
              img.src = slide.bgUrl;
              card.href = slide.href || '#';
              img.style.setProperty('opacity', '1', 'important');
            }, 350);
            var dots = document.querySelectorAll('#tv-hero-dots span');
            dots.forEach(function(d, i) {
              d.style.background = (i === idx) ? '#FFB347' : 'rgba(255,255,255,0.55)';
            });
          }

          function updateHero() {
            if (!isHomePage()) return;
            var found = collectHeroSlides();

            // Hide the site's original hero (wherever it ended up) every tick
            found.sources.forEach(function(el) {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('height', '0px', 'important');
            });

            if (!found.slides.length) return;
            var sig = found.slides.map(function(x) { return x.bgUrl; }).join('|');
            if (window.__tvHeroSig === sig) return;
            window.__tvHeroSig = sig;
            window.__tvHeroSlides = found.slides;

            var container = document.getElementById('tv-hero-container');
            if (!container) return;
            container.style.position = 'relative';

            var dots = document.getElementById('tv-hero-dots');
            if (dots) dots.remove();
            if (found.slides.length > 1) {
              dots = document.createElement('div');
              dots.id = 'tv-hero-dots';
              dots.style.cssText = 'position:absolute; left:0; right:0; bottom:14px; text-align:center; pointer-events:none;';
              found.slides.forEach(function() {
                var d = document.createElement('span');
                d.style.cssText = 'display:inline-block; width:12px; height:12px; border-radius:50%; margin:0 6px; background:rgba(255,255,255,0.55);';
                dots.appendChild(d);
              });
              container.appendChild(dots);
            }

            window.__tvHeroIdx = 0;
            showHeroSlide(0);

            if (window.__tvHeroTimer) clearInterval(window.__tvHeroTimer);
            if (found.slides.length > 1) {
              window.__tvHeroTimer = setInterval(function() {
                if (Date.now() < (window.__tvHeroPausedUntil || 0)) return;
                if (!isHomePage()) return;
                showHeroSlide((window.__tvHeroIdx || 0) + 1);
              }, 5000);
            }
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
              html += '<div id="tv-hero-container" style="width:95%; height:auto; margin:0 auto 35px auto !important; padding:0 !important; box-sizing:border-box; border:none; clear:both;">' +
                '<a class="tv-hero-card" tabindex="0" href="' + heroData.href + '" style="display:block; width:100%; height:auto; text-decoration:none; outline:none; border:none; border-radius:18px; overflow:hidden; box-sizing:border-box; cursor:pointer; margin:0; padding:0;"><img src="' + heroData.bgUrl + '" style="width:100%; height:auto; display:block; margin:0 auto; padding:0; border:none; outline:none; box-sizing:border-box;" /></a>' +
                '</div>';
            }

            // 2. All Category Video Rows
            html += '<div style="max-width:1440px; margin:0 auto; padding:0 24px; box-sizing:border-box;">';

            var cardCss = 'flex:0 0 calc(25% - 18px); max-width:calc(25% - 18px); background:#1a1a1a; border-radius:8px; overflow:hidden; cursor:pointer; box-sizing:border-box; text-decoration:none; display:block;';
            var imgCss = 'width:100%; aspect-ratio:16/9; height:auto; min-height:165px; background:#222; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; color:#FFD700; font-size:20px; font-weight:bold; border-radius:8px 8px 0 0;';
            var titleCss = 'word-break:normal; overflow-wrap:break-word; hyphens:none; padding:12px 14px; color:#fff; font-size:15px; font-weight:bold; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; line-height:1.45em; min-height:5.8em; max-height:6.2em; box-sizing:border-box;';

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

            updateHero();
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
                if (e.keyCode === 37 || e.key === 'ArrowLeft' || e.keyCode === 39 || e.key === 'ArrowRight') {
                  var heroSlides = window.__tvHeroSlides || [];
                  if (heroSlides.length > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.__tvHeroPausedUntil = Date.now() + 8000;
                    showHeroSlide((window.__tvHeroIdx || 0) + ((e.keyCode === 37 || e.key === 'ArrowLeft') ? -1 : 1));
                    return;
                  }
                }

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
          setInterval(function() { renderCustomTvGrid(); updateHero(); styleSubPageTextBoxes(); sanitizeSubPageTitles(); }, 1000);
        })();
    """.trimIndent()

    private fun injectPageScripts(view: WebView) {
        view.evaluateJavascript(viewportJs(), null)
        view.evaluateJavascript(hideTranslateJs, null)
        view.evaluateJavascript(translateJs, null)
        view.evaluateJavascript(headerJs, null)
        view.evaluateJavascript(authJs, null)
        view.evaluateJavascript(loginPageJs(), null)
        view.evaluateJavascript(infiniteScrollJs, null)
        view.evaluateJavascript(redirectToFirstMatchJs, null)
        view.evaluateJavascript(reverseFirstCarouselJs, null)
        view.evaluateJavascript(pageFullyLoadedJs, null)
        view.evaluateJavascript(stage1TestGridJs, null)
        view.evaluateJavascript(cardFavoriteToggleJs, null)
        view.evaluateJavascript(autoFullScreenJs, null)
        view.evaluateJavascript(playerNavJs, null)
        view.evaluateJavascript(autoNextJs, null)
        view.evaluateJavascript(playerControlsJs, null)
        injectCustomTvStyles(view)
        if (!cursorMode) view.evaluateJavascript(focusJs, null)
    }

    // ------------------------------------------------------- player controls auto-hide

    private val CONTROLS_IDLE_MS = 8000L

    // (Re)starts the 8 second countdown after which the player's control overlay is put away.
    private fun armControlsIdleTimer() {
        handler.removeCallbacks(hideControlsRunnable)
        if (playerFocused && !fullScreenActive()) {
            handler.postDelayed(hideControlsRunnable, CONTROLS_IDLE_MS)
        }
    }

    private fun hidePlayerControls() {
        if (!fullScreenActive()) {
            // Inline player: move keyboard focus off the player so its controls fade away.
            // Pressing OK / Left / Right on the player again brings them back.
            if (playerFocused) {
                webView.evaluateJavascript(
                    "window.__tvHidePlayerControls && window.__tvHidePlayerControls()", null
                )
            }
        } else {
            // Full screen: tell the player the pointer has left so it hides its controls.
            fsPulseRunning = false
            hideFsOverlay()
            handler.removeCallbacks(fsPulse)
            releasePlayerFocus()
            sendFullScreenHover(MotionEvent.ACTION_HOVER_EXIT, 0f, 0f)
        }
    }

    // ---- Full screen: the app drives the player (the player's own keyboard handling is bypassed,
    // so its controls only show when we ask for them and then go away on their own).

    // Full screen: Down opens the app's own button bar (play, skip, mute, captions, speed, exit).
    // The player's own buttons can't be reached from outside its frame, so these drive it instead.
    private var fsControlsMode = false
    private var fsOverlay: android.widget.LinearLayout? = null
    private var fsTimeText: android.widget.TextView? = null
    private var fsProgress: android.widget.ProgressBar? = null
    private var fsBtnPlay: android.widget.TextView? = null
    private var fsBtnMute: android.widget.TextView? = null
    private var fsBtnCc: android.widget.TextView? = null
    private var fsBtnSpeed: android.widget.TextView? = null

    private val fsStatusRunnable: Runnable = object : Runnable {
        override fun run() {
            if (!fsControlsMode) return
            pollFsStatus()
            handler.postDelayed(this, 500)
        }
    }

    private fun fsButton(label: String, onClick: () -> Unit): android.widget.TextView {
        val tv = android.widget.TextView(this)
        tv.text = label
        tv.setTextColor(Color.WHITE)
        tv.textSize = 18f
        tv.setTypeface(tv.typeface, android.graphics.Typeface.BOLD)
        tv.gravity = Gravity.CENTER
        val padH = (22 * density).toInt()
        val padV = (12 * density).toInt()
        tv.setPadding(padH, padV, padH, padV)
        tv.isFocusable = true
        tv.isClickable = true
        fun paint(focused: Boolean) {
            val d = android.graphics.drawable.GradientDrawable()
            d.cornerRadius = 10 * density
            if (focused) {
                d.setColor(0xFFFFB347.toInt())
                tv.setTextColor(0xFF1A1A1A.toInt())
            } else {
                d.setColor(0x66000000)
                d.setStroke((2 * density).toInt(), 0x88FFFFFF.toInt())
                tv.setTextColor(Color.WHITE)
            }
            tv.background = d
        }
        paint(false)
        tv.setOnFocusChangeListener { _, focused -> paint(focused) }
        tv.setOnClickListener {
            onClick()
            fullScreenInteraction()
            handler.postDelayed({ pollFsStatus() }, 250)
        }
        return tv
    }

    private fun buildFsOverlay(): android.widget.LinearLayout {
        val o = android.widget.LinearLayout(this)
        o.orientation = android.widget.LinearLayout.VERTICAL
        o.setBackgroundColor(0xCC000000.toInt())
        val pad = (28 * density).toInt()
        o.setPadding(pad, (18 * density).toInt(), pad, (22 * density).toInt())

        val time = android.widget.TextView(this)
        time.setTextColor(Color.WHITE)
        time.textSize = 16f
        time.text = "0:00 / 0:00"
        o.addView(time)
        fsTimeText = time

        val bar = android.widget.ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal)
        bar.max = 1000
        bar.progressDrawable.setColorFilter(0xFFFFB347.toInt(), android.graphics.PorterDuff.Mode.SRC_IN)
        o.addView(
            bar,
            android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                (10 * density).toInt()
            ).apply { topMargin = (6 * density).toInt(); bottomMargin = (14 * density).toInt() }
        )
        fsProgress = bar

        val row = android.widget.LinearLayout(this)
        row.orientation = android.widget.LinearLayout.HORIZONTAL
        row.gravity = Gravity.CENTER_VERTICAL
        fun add(b: android.widget.TextView) {
            row.addView(
                b,
                android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { rightMargin = (12 * density).toInt() }
            )
        }
        fsBtnPlay = fsButton(tr("Pause", "一時停止")) { playerCommand("toggle", 0) }
        add(fsBtnPlay!!)
        add(fsButton(tr("-10s", "-10秒")) { playerCommand("seek", -10) })
        add(fsButton(tr("+10s", "+10秒")) { playerCommand("seek", 10) })
        fsBtnMute = fsButton(tr("Mute", "ミュート")) { playerCommand("mute", 0) }
        add(fsBtnMute!!)
        fsBtnCc = fsButton(tr("CC: Off", "字幕: オフ")) { playerCommand("captions", 0) }
        add(fsBtnCc!!)
        fsBtnSpeed = fsButton(tr("Speed 1x", "速度 1x")) { playerCommand("speed", 0) }
        add(fsBtnSpeed!!)
        add(fsButton(tr("Exit full screen", "全画面を終了")) {
            hideFsOverlay()
            hideCustomView()
        })
        o.addView(row)

        o.visibility = View.GONE
        root.addView(
            o,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
            )
        )
        fsOverlay = o
        return o
    }

    private fun showFsOverlay() {
        val o = fsOverlay ?: buildFsOverlay()
        fsControlsMode = true
        // Hide the player's own bar so there is only one set of controls on screen.
        sendFullScreenHover(MotionEvent.ACTION_HOVER_EXIT, 0f, 0f)
        o.visibility = View.VISIBLE
        root.bringChildToFront(o)
        fsBtnPlay?.requestFocus()
        fullScreenInteraction()
        handler.removeCallbacks(fsStatusRunnable)
        handler.post(fsStatusRunnable)
    }

    private fun hideFsOverlay() {
        fsControlsMode = false
        handler.removeCallbacks(fsStatusRunnable)
        fsOverlay?.visibility = View.GONE
    }

    private fun fmtTime(sec: Double): String {
        val t = sec.toInt().coerceAtLeast(0)
        val h = t / 3600
        val m = (t % 3600) / 60
        val sc = t % 60
        return if (h > 0) String.format("%d:%02d:%02d", h, m, sc) else String.format("%d:%02d", m, sc)
    }

    private fun pollFsStatus() {
        webView.evaluateJavascript(
            "(window.__tvRefreshStatus && window.__tvRefreshStatus(), window.__tvStatusJson || '')"
        ) { raw ->
            if (!fsControlsMode || raw == null || raw == "null") return@evaluateJavascript
            try {
                val str = org.json.JSONTokener(raw).nextValue() as? String ?: return@evaluateJavascript
                if (str.isEmpty()) return@evaluateJavascript
                val j = org.json.JSONObject(str)
                val t = j.optDouble("t", 0.0)
                val d = j.optDouble("d", 0.0)
                fsBtnPlay?.text = if (j.optBoolean("paused")) tr("Play", "再生") else tr("Pause", "一時停止")
                fsBtnMute?.text = if (j.optDouble("vol", 1.0) <= 0.0) tr("Unmute", "ミュート解除") else tr("Mute", "ミュート")
                val ccName = j.optString("cc", "Off")
                fsBtnCc?.text = tr("CC: ", "字幕: ") + (if (ccName == "Off") tr("Off", "オフ") else ccName)
                fsBtnSpeed?.text = tr("Speed ", "速度 ") + j.optDouble("rate", 1.0) + "x"
                fsTimeText?.text = fmtTime(t) + " / " + fmtTime(d)
                fsProgress?.progress = if (d > 0) (t / d * 1000).toInt() else 0
            } catch (_: Exception) {
            }
        }
    }

    // Takes keyboard focus off the player frame (a focused player keeps its controls on screen).
    private fun releasePlayerFocus() {
        webView.evaluateJavascript(
            "window.__tvHidePlayerControls && window.__tvHidePlayerControls()", null
        )
    }

    private var fsLastInteraction = 0L
    private var fsPulseRunning = false
    private var fsPulseFlip = false

    private val fsPulse: Runnable = object : Runnable {
        override fun run() {
            val cv = fullScreenView() ?: run { fsPulseRunning = false; return }
            if (SystemClock.uptimeMillis() - fsLastInteraction < CONTROLS_IDLE_MS) {
                // While the player's buttons are being walked, the pointer pulses stop: they made
                // the controls flicker and knocked the keyboard focus back to the first button.
                if (!fsControlsMode) {
                    fsPulseFlip = !fsPulseFlip
                    sendFullScreenHover(
                        MotionEvent.ACTION_HOVER_MOVE,
                        cv.width / 2f + if (fsPulseFlip) 3f else -3f,
                        cv.height * 0.4f
                    )
                }
                handler.postDelayed(this, 600)
            } else {
                hidePlayerControls()
            }
        }
    }

    // Shows the player's controls and keeps them up until 8 seconds after the last remote press.
    private fun fullScreenInteraction() {
        fsLastInteraction = SystemClock.uptimeMillis()
        if (!fsPulseRunning && fullScreenActive()) {
            fsPulseRunning = true
            handler.post(fsPulse)
        }
    }

    private fun sendFullScreenHover(action: Int, x: Float, y: Float) {
        val cv = fullScreenView() ?: return
        val now = SystemClock.uptimeMillis()
        val props = arrayOf(MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_MOUSE
        })
        val coords = arrayOf(MotionEvent.PointerCoords().apply {
            this.x = x
            this.y = y
        })
        val ev = MotionEvent.obtain(
            now, now, action, 1,
            props, coords, 0, 0, 1f, 1f, 0, 0,
            InputDevice.SOURCE_MOUSE, 0
        )
        cv.dispatchGenericMotionEvent(ev)
        ev.recycle()
    }

    private fun playerCommand(cmd: String, value: Int) {
        webView.evaluateJavascript(
            "window.__tvPlayerCmd && window.__tvPlayerCmd('" + cmd + "'," + value + ")", null
        )
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
            if (cursorMode && splashDone && customView == null && !onboardingShowing) View.VISIBLE else View.INVISIBLE
    }

    private fun setCursorMode(on: Boolean) {
        cursorMode = on
        refreshCursorVisibility()
        webView.evaluateJavascript(if (on) removeFocusJs else focusJs, null)
        Toast.makeText(this, if (on) tr("Cursor on", "カーソル オン") else tr("Cursor off", "カーソル オフ"), Toast.LENGTH_SHORT).show()
    }

    // ---- Fire TV specifics. Fire OS needs a few full-screen tweaks (see the Fire TV notes in CHANGELOG);
    // everything below is guarded so other devices keep the standard behaviour.

    // The header's category list as an app dialog: dark panel, clearly lighter highlight on the focused
    // row, no radio buttons. Choosing a row hands the choice back to the page's own list.
    private fun showSectionPicker(labelsJson: String, pickFn: String, focusSelector: String) {
        val labels = ArrayList<String>()
        try {
            val arr = org.json.JSONArray(labelsJson)
            for (i in 0 until arr.length()) labels.add(arr.getString(i))
        } catch (_: Exception) {
            return
        }
        if (labels.isEmpty()) return
        val dialog = android.app.Dialog(this)
        dialog.requestWindowFeature(android.view.Window.FEATURE_NO_TITLE)
        val panel = android.widget.FrameLayout(this)
        val bg = android.graphics.drawable.GradientDrawable()
        bg.setColor(0xFF3A4656.toInt())
        bg.cornerRadius = 14 * density
        panel.background = bg
        panel.clipToOutline = true

        val list = android.widget.ListView(this)
        list.divider = android.graphics.drawable.ColorDrawable(0x33FFFFFF)
        list.dividerHeight = 1
        list.selector = android.graphics.drawable.ColorDrawable(0xFF7C8EA3.toInt())
        list.setDrawSelectorOnTop(false)
        list.isFocusable = true
        list.adapter = object : android.widget.BaseAdapter() {
            override fun getCount() = labels.size
            override fun getItem(position: Int) = labels[position]
            override fun getItemId(position: Int) = position.toLong()
            override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
                val t = (convertView as? android.widget.TextView) ?: android.widget.TextView(this@MainActivity)
                t.text = labels[position]
                t.setTextColor(Color.WHITE)
                t.textSize = 22f
                t.setPadding((24 * density).toInt(), (16 * density).toInt(), (24 * density).toInt(), (16 * density).toInt())
                t.setBackgroundColor(Color.TRANSPARENT)
                return t
            }
        }
        list.setOnItemClickListener { _, _, position, _ ->
            dialog.dismiss()
            webView.evaluateJavascript("if (window." + pickFn + ") window." + pickFn + "(" + position + ");", null)
        }
        dialog.setOnDismissListener {
            webView.evaluateJavascript(
                "(function(){ var s = document.querySelector(" + org.json.JSONObject.quote(focusSelector) + "); if (s) s.focus(); })();", null
            )
        }
        panel.addView(list, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
        dialog.setContentView(panel)
        dialog.window?.let { w ->
            w.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(Color.TRANSPARENT))
            val dm = resources.displayMetrics
            w.setLayout((dm.widthPixels * 0.62f).toInt(), (dm.heightPixels * 0.86f).toInt().coerceAtMost(
                ((labels.size * 62 + 8) * density).toInt()
            ))
            w.setGravity(Gravity.CENTER)
        }
        dialog.show()
        list.requestFocus()
        list.setSelection(0)
    }

    private fun isFireTv(): Boolean =
        Build.MANUFACTURER.equals("Amazon", ignoreCase = true) ||
            packageManager.hasSystemFeature("amazon.hardware.fire_tv")

    private fun fullScreenActive(): Boolean = customView != null

    private fun fullScreenView(): View? = customView

    // Fire TV: make every layer of the system full-screen video view fill the screen, unscaled.
    private fun fixFireTvCustomView(view: View) {
        if (customView !== view) return
        @Suppress("DEPRECATION")
        val sb = StringBuilder(
            "FS view " + view.width + "x" + view.height + " web " + webView.width + "x" + webView.height +
                " scale " + webView.scale + " d" + density
        )
        fun walk(v: View, depth: Int) {
            v.scaleX = 1f
            v.scaleY = 1f
            v.translationX = 0f
            v.translationY = 0f
            if (depth > 0) {
                val lp = v.layoutParams
                if (lp != null && (lp.width != ViewGroup.LayoutParams.MATCH_PARENT || lp.height != ViewGroup.LayoutParams.MATCH_PARENT)) {
                    lp.width = ViewGroup.LayoutParams.MATCH_PARENT
                    lp.height = ViewGroup.LayoutParams.MATCH_PARENT
                    v.layoutParams = lp
                }
            }
            sb.append(" | ").append(v.javaClass.simpleName).append(' ').append(v.width).append('x').append(v.height)
            if (v is ViewGroup) for (i in 0 until v.childCount) walk(v.getChildAt(i), depth + 1)
        }
        walk(view, 0)
        view.requestLayout()
    }

    // Some devices (notably Fire TV sticks) leave the video drawn at its small inline size inside the
    // full-screen player: the controls span the screen but the picture stays in the top-left corner,
    // because the player never learns the window changed size. Briefly changing the full-screen view's
    // size by a couple of pixels, and back, makes the browser send the player a resize so it re-lays
    // out at full size. Harmless where the first layout was already right.
    private val fsNudgeRunnable = Runnable { nudgeFullScreenLayout() }

    private fun scheduleFullScreenResizeNudges() {
        if (!isFireTv()) return
        handler.removeCallbacks(fsNudgeRunnable)
        for (delay in longArrayOf(500L, 1300L, 2600L, 4500L)) {
            handler.postDelayed(fsNudgeRunnable, delay)
        }
    }

    private fun nudgeFullScreenLayout() {
        val v = customView ?: return
        v.setPadding(0, 0, 2, 2)
        handler.postDelayed({ customView?.setPadding(0, 0, 0, 0) }, 150L)
    }

    private fun hideCustomView() {
        val view = customView ?: return
        webView.visibility = View.VISIBLE
        root.removeView(view)
        customView = null
        customCallback?.onCustomViewHidden()
        customCallback = null
        hideFsOverlay()
        handler.removeCallbacks(fsNudgeRunnable)
        handler.removeCallbacks(hideControlsRunnable)
        handler.removeCallbacks(fsPulse)
        fsPulseRunning = false
        refreshCursorVisibility()
    }

    // ---------------------------------------------------------------- remote keys

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (onboardingShowing) {
            if (onboardingView?.handleKey(event) != false) return true
            return super.dispatchKeyEvent(event)
        }
        if (event.action == KeyEvent.ACTION_DOWN && (playerFocused || fullScreenActive())) {
            armControlsIdleTimer()
        }
        if (event.action == KeyEvent.ACTION_DOWN) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_INFO, KeyEvent.KEYCODE_PROG_YELLOW,
                KeyEvent.KEYCODE_SETTINGS, KeyEvent.KEYCODE_BOOKMARK, KeyEvent.KEYCODE_BUTTON_Y -> {
                    val evalJs = if (cursorMode) {
                        "(function(){ var x = window.__tvLastMouseX || 0; var y = window.__tvLastMouseY || 0; var list = document.elementsFromPoint(x, y); return window.__tvToggleCardFavorite ? window.__tvToggleCardFavorite(list) : false; })()"
                    } else {
                        "(function(){ return window.__tvToggleCardFavorite ? window.__tvToggleCardFavorite(document.activeElement) : false; })()"
                    }
                    webView.evaluateJavascript(evalJs, null)
                    return true
                }

                KeyEvent.KEYCODE_BACK -> {
                    if (awaitingLogin && !onboardingShowing) {
                        // Backing out of the login page: the normal signed-out start.
                        exitGuideToSite()
                        return true
                    }
                    if (fsControlsMode && fullScreenActive()) {
                        hideFsOverlay()
                        return true
                    }
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

        // Full screen: Left/Right skip 10 s (30 s while held or with the FF/RW keys), OK plays/pauses.
        // The keys never reach the player itself, so its controls are not stuck in keyboard mode.
        if (fullScreenActive()) {
            if (fsControlsMode) {
                // The button bar is showing: the remote moves between its buttons and OK presses one.
                when (event.keyCode) {
                    KeyEvent.KEYCODE_DPAD_UP -> {
                        if (event.action == KeyEvent.ACTION_DOWN) hideFsOverlay()
                        return true
                    }
                    KeyEvent.KEYCODE_DPAD_DOWN -> return true
                    KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
                    KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                        if (event.action == KeyEvent.ACTION_DOWN) fullScreenInteraction()
                        return super.dispatchKeyEvent(event)
                    }
                }
            } else if (event.keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
                if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) showFsOverlay()
                return true
            }
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_DPAD_LEFT,
                KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, KeyEvent.KEYCODE_MEDIA_REWIND -> {
                    if (event.action == KeyEvent.ACTION_DOWN) {
                        val forward = event.keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
                            event.keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
                        val media = event.keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD ||
                            event.keyCode == KeyEvent.KEYCODE_MEDIA_REWIND
                        val step = if (media || event.repeatCount > 0) 30 else 10
                        playerCommand("seek", if (forward) step else -step)
                        fullScreenInteraction()
                    }
                    return true
                }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER,
                KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY,
                KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                    if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                        playerCommand("toggle", 0)
                        fullScreenInteraction()
                    }
                    return true
                }
                KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN -> {
                    // Never let Up/Down reach the player: they would put its keyboard focus on its own
                    // buttons, where the remote can't leave and its bar never fades.
                    if (event.action == KeyEvent.ACTION_DOWN) fullScreenInteraction()
                    return true
                }
            }
        }

        // Hold OK (about half a second) to turn the on-screen cursor on or off, e.g. to tick a
        // "Verify you are human" box inside the player. A quick press still acts as a normal OK:
        // it is held back until the button is released, then replayed (or tapped at the cursor).
        if ((event.keyCode == KeyEvent.KEYCODE_DPAD_CENTER || event.keyCode == KeyEvent.KEYCODE_ENTER) &&
            !fullScreenActive()
        ) {
            when (event.action) {
                KeyEvent.ACTION_DOWN -> {
                    if (event.repeatCount == 0) {
                        okPending = true
                        okLongFired = false
                    } else if (okPending && !okLongFired) {
                        okLongFired = true
                        setCursorMode(!cursorMode)
                    }
                    return true
                }
                KeyEvent.ACTION_UP -> {
                    val shortPress = okPending && !okLongFired
                    okPending = false
                    okLongFired = false
                    if (shortPress) {
                        if (cursorMode) {
                            clickAtCursor()
                        } else {
                            val t = SystemClock.uptimeMillis()
                            val down = KeyEvent(
                                t, t, KeyEvent.ACTION_DOWN, event.keyCode, 0,
                                event.metaState, event.deviceId, event.scanCode, event.flags, event.source
                            )
                            val up = KeyEvent(
                                t, t + 40, KeyEvent.ACTION_UP, event.keyCode, 0,
                                event.metaState, event.deviceId, event.scanCode, event.flags, event.source
                            )
                            super.dispatchKeyEvent(down)
                            super.dispatchKeyEvent(up)
                        }
                    }
                    return true
                }
            }
        }

        // Focus is inside the video player: Up/Down leave it, Left/Right walk the player's
        // own buttons (sent to the player as Tab / Shift+Tab). OK passes through to the button.
        if (!cursorMode && playerFocused && !fullScreenActive()) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_DPAD_UP -> {
                    if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                        val dir = if (event.keyCode == KeyEvent.KEYCODE_DPAD_DOWN) "down" else "up"
                        playerFocused = false
                        webView.evaluateJavascript("window.__tvLeavePlayer && window.__tvLeavePlayer('" + dir + "')", null)
                    }
                    return true
                }
                KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> {
                    val meta = if (event.keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                        KeyEvent.META_SHIFT_ON or KeyEvent.META_SHIFT_LEFT_ON
                    } else 0
                    val tab = KeyEvent(
                        event.downTime, event.eventTime, event.action,
                        KeyEvent.KEYCODE_TAB, event.repeatCount, meta
                    )
                    return super.dispatchKeyEvent(tab)
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
        if (playerFocused || fullScreenActive()) armControlsIdleTimer()
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


/**
 * Splash progress bar: a gold bar that fills toward ~92% while the page loads (fast at first, then
 * slowing), with the wand riding the tip and a few twinkles trailing behind it. [finish] runs the
 * ending: fill to 100%, a gold flash and a sparkle burst, then calls back so the splash can fade.
 */
private class SplashProgressView(
    context: android.content.Context,
    private val wand: Bitmap,
    private val density: Float,
    private val hotX: Float,
    private val hotY: Float
) : View(context) {

    private var progress = 0f
    private var burst = 0f          // 0..1 sparkle burst at the end
    private var flash = 0f          // 0..1 bar brightening at the end
    private var finishing = false
    private var travel: ValueAnimator? = null
    private val startTime = SystemClock.uptimeMillis()

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x33FFFFFF }
    private val edgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = 0x55FFB347
    }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val shimmerPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val sparklePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFE9A8.toInt() }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFB347.toInt() }
    private val wandPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val clip = Path()
    private val star = Path()
    private val wandMatrix = Matrix()
    private val rect = RectF()

    // Fixed burst pattern (angle in radians, distance factor, size factor)
    private val particles = Array(14) { i ->
        val a = (i / 14f) * 6.2831855f + (i % 3) * 0.21f
        floatArrayOf(a, 0.55f + (i * 37 % 10) / 14f, 0.55f + (i * 53 % 10) / 16f)
    }

    fun start() {
        travel = ValueAnimator.ofFloat(0f, 0.92f).apply {
            duration = 12000L
            interpolator = DecelerateInterpolator(2.2f)
            addUpdateListener {
                progress = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    fun reset() {
        travel?.cancel()
        progress = 0f
        burst = 0f
        flash = 0f
        finishing = false
        invalidate()
    }

    fun finish(onDone: () -> Unit) {
        if (finishing) return
        finishing = true
        travel?.cancel()
        val from = progress
        ValueAnimator.ofFloat(from, 1f).apply {
            duration = 520L
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                progress = it.animatedValue as Float
                flash = ((progress - from) / (1f - from).coerceAtLeast(0.01f)).coerceIn(0f, 1f)
                invalidate()
            }
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    progress = 1f
                    ValueAnimator.ofFloat(0f, 1f).apply {
                        duration = 900L
                        addUpdateListener {
                            burst = it.animatedValue as Float
                            invalidate()
                        }
                        addListener(object : AnimatorListenerAdapter() {
                            override fun onAnimationEnd(animation: Animator) {
                                postDelayed({ onDone() }, 250L)
                            }
                        })
                        start()
                    }
                }
            })
            start()
        }
    }

    override fun onDetachedFromWindow() {
        travel?.cancel()
        super.onDetachedFromWindow()
    }

    private fun drawSparkle(canvas: Canvas, cx: Float, cy: Float, r: Float, alpha: Int) {
        if (r <= 0.5f || alpha <= 0) return
        star.reset()
        star.moveTo(cx, cy - r)
        star.quadTo(cx, cy, cx + r, cy)
        star.quadTo(cx, cy, cx, cy + r)
        star.quadTo(cx, cy, cx - r, cy)
        star.quadTo(cx, cy, cx, cy - r)
        star.close()
        sparklePaint.alpha = alpha.coerceIn(0, 255)
        canvas.drawPath(star, sparklePaint)
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val cy = height / 2f
        val barH = 10f * density
        val padX = 44f * density
        val barW = w - 2f * padX
        val radius = barH / 2f
        val now = SystemClock.uptimeMillis()

        rect.set(padX, cy - barH / 2f, padX + barW, cy + barH / 2f)

        // Soft gold halo while finishing
        if (flash > 0f) {
            for (i in 3 downTo 1) {
                glowPaint.alpha = (flash * (1f - burst * 0.6f) * 28f / i).toInt().coerceIn(0, 255)
                canvas.drawRoundRect(
                    rect.left - i * 3f * density, rect.top - i * 3f * density,
                    rect.right + i * 3f * density, rect.bottom + i * 3f * density,
                    radius + i * 3f * density, radius + i * 3f * density, glowPaint
                )
            }
        }

        // Track
        canvas.drawRoundRect(rect, radius, radius, trackPaint)
        edgePaint.strokeWidth = 1f * density
        canvas.drawRoundRect(rect, radius, radius, edgePaint)

        // Gold fill, clipped to the rounded track
        val fillW = barW * progress
        if (fillW > 0.5f) {
            clip.reset()
            clip.addRoundRect(rect, radius, radius, Path.Direction.CW)
            canvas.save()
            canvas.clipPath(clip)
            fillPaint.shader = LinearGradient(
                padX, 0f, padX + barW, 0f,
                intArrayOf(0xFFB8741A.toInt(), 0xFFFFB347.toInt(), 0xFFFFD700.toInt(), 0xFFFFF1B0.toInt()),
                null, Shader.TileMode.CLAMP
            )
            canvas.drawRect(padX, rect.top, padX + fillW, rect.bottom, fillPaint)

            // Moving highlight
            val sx = padX + ((now - startTime) % 1100L) / 1100f * (barW + 80f * density) - 80f * density
            shimmerPaint.shader = LinearGradient(
                sx, 0f, sx + 80f * density, 0f,
                intArrayOf(0x00FFFFFF, 0x66FFFFFF, 0x00FFFFFF), null, Shader.TileMode.CLAMP
            )
            canvas.drawRect(padX, rect.top, padX + fillW, rect.bottom, shimmerPaint)
            canvas.restore()
        }

        val tipX = padX + fillW

        // Twinkles trailing behind the wand while travelling
        if (!finishing || burst < 1f) {
            for (i in 0 until 6) {
                val t = (now - startTime) / 380f + i * 1.7f
                val tw = (Math.sin(t.toDouble()).toFloat() + 1f) / 2f
                val x = tipX - (10f + i * 13f) * density
                if (x > padX) {
                    val y = cy + (if (i % 2 == 0) -1f else 1f) * (7f + (i % 3) * 3f) * density
                    drawSparkle(canvas, x, y, (2f + 3f * tw) * density, (200 * tw * (1f - i / 7f)).toInt())
                }
            }
        }

        // Wand: the star at its top-left tip sits on the end of the fill
        val wandSize = 52f * density
        val bob = Math.sin(((now - startTime) / 260f).toDouble()).toFloat() * 2f * density
        wandMatrix.reset()
        wandMatrix.postScale(wandSize / wand.width, wandSize / wand.height)
        wandMatrix.postTranslate(tipX - hotX * wandSize, cy - hotY * wandSize + bob)
        canvas.drawBitmap(wand, wandMatrix, wandPaint)

        // Sparkle burst at the finish
        if (burst > 0f && burst < 1f) {
            val ease = 1f - (1f - burst) * (1f - burst)
            for (p in particles) {
                val dist = p[1] * 90f * density * ease
                val px = tipX + Math.cos(p[0].toDouble()).toFloat() * dist
                val py = cy + Math.sin(p[0].toDouble()).toFloat() * dist
                val size = p[2] * 9f * density * (1f - burst * 0.7f)
                drawSparkle(canvas, px, py, size, (255 * (1f - burst)).toInt())
            }
            drawSparkle(canvas, tipX, cy, 26f * density * (1f - burst * 0.5f), (255 * (1f - burst)).toInt())
        }

        postInvalidateOnAnimation()
    }
}


/**
 * Page transition overlay view: solid black background with the wand cursor moving in a loop (0s..3s)
 * with trailing sparkles, followed by a sparkle burst (3s..4s). Entire overlay stays up for 5 seconds total.
 */
private class TransitionOverlayView(
    context: android.content.Context,
    private val wand: Bitmap,
    private val density: Float,
    private val hotX: Float,
    private val hotY: Float
) : View(context) {

    private var animStart = 0L
    private var isAnimating = false

    private val wandPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val sparklePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFE9A8.toInt() }
    private val wandMatrix = Matrix()
    private val star = Path()

    private val particles = Array(16) { i ->
        val a = (i / 16f) * 6.2831855f + (i % 3) * 0.18f
        floatArrayOf(a, 0.6f + (i * 37 % 10) / 14f, 0.6f + (i * 53 % 10) / 16f)
    }

    fun startAnimation() {
        animStart = SystemClock.uptimeMillis()
        isAnimating = true
        invalidate()
    }

    private fun drawSparkle(canvas: Canvas, cx: Float, cy: Float, r: Float, alpha: Int) {
        if (r <= 0.5f || alpha <= 0) return
        star.reset()
        star.moveTo(cx, cy - r)
        star.quadTo(cx, cy, cx + r, cy)
        star.quadTo(cx, cy, cx, cy + r)
        star.quadTo(cx, cy, cx - r, cy)
        star.quadTo(cx, cy, cx, cy - r)
        star.close()
        sparklePaint.alpha = alpha.coerceIn(0, 255)
        canvas.drawPath(star, sparklePaint)
    }

    override fun onDraw(canvas: Canvas) {
        if (!isAnimating) return

        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        val cx = w / 2f
        val cy = h / 2f
        val now = SystemClock.uptimeMillis()
        val elapsedSec = (now - animStart) / 1000f

        val wandSize = 76f * density

        val xOffset: Float
        val yOffset: Float

        if (elapsedSec < 3.0f) {
            val t = elapsedSec * 2.8f
            xOffset = Math.sin(t.toDouble()).toFloat() * 70f * density
            yOffset = Math.sin((t * 2f).toDouble()).toFloat() * 28f * density
        } else {
            xOffset = 0f
            yOffset = -20f * density
        }

        val wandX = cx + xOffset
        val wandY = cy + yOffset

        // Trailing sparkles behind moving wand
        if (elapsedSec < 3.2f) {
            for (i in 1..8) {
                val lag = i * 0.12f
                val tLag = (elapsedSec - lag).coerceAtLeast(0f) * 2.8f
                val sx = cx + Math.sin(tLag.toDouble()).toFloat() * 70f * density
                val sy = cy + Math.sin((tLag * 2f).toDouble()).toFloat() * 28f * density
                val alpha = (220 * (1f - i / 9f)).toInt()
                val size = (6f - i * 0.6f).coerceAtLeast(2.5f) * density
                drawSparkle(canvas, sx, sy, size, alpha)
            }
        }

        // Draw wand
        wandMatrix.reset()
        wandMatrix.postScale(wandSize / wand.width, wandSize / wand.height)
        wandMatrix.postTranslate(wandX - hotX * wandSize, wandY - hotY * wandSize)
        canvas.drawBitmap(wand, wandMatrix, wandPaint)

        // Sparkle burst at 3s to 4s
        if (elapsedSec in 3.0f..4.2f) {
            val burstProgress = ((elapsedSec - 3.0f) / 1.0f).coerceIn(0f, 1f)
            val ease = 1f - (1f - burstProgress) * (1f - burstProgress)
            for (p in particles) {
                val dist = p[1] * 110f * density * ease
                val px = wandX + Math.cos(p[0].toDouble()).toFloat() * dist
                val py = wandY + Math.sin(p[0].toDouble()).toFloat() * dist
                val size = p[2] * 12f * density * (1f - burstProgress * 0.7f)
                drawSparkle(canvas, px, py, size, (255 * (1f - burstProgress)).toInt())
            }
            drawSparkle(canvas, wandX, wandY, 32f * density * (1f - burstProgress * 0.5f), (255 * (1f - burstProgress)).toInt())
        }

        if (elapsedSec < 5.2f) {
            postInvalidateOnAnimation()
        }
    }
}

// The app follows the device language: Japanese when the TV is set to Japanese, English otherwise.
private var appJa = false
private val isJa: Boolean get() = appJa
private fun tr(en: String, ja: String): String = if (isJa) ja else en

// Unauthenticated experience: a few full-screen slides explaining the remote. The first slide keeps
// the splash logo exactly where the splash drew it, so the two flow into each other. The last
// button opens the site's own login page (restyled to match).
private class OnboardingView(
    context: android.content.Context,
    private val density: Float,
    private val wand: Bitmap,
    private val onLogin: () -> Unit,
    private val onBrowse: () -> Unit,
    private val onLanguage: (String) -> Unit
) : FrameLayout(context) {

    private class Slide(val title: String, val body: String)

    private fun buildSlides() = if (isJa) listOf(
        Slide(
            "テレビで Stardom World へようこそ",
            "リモコンでの操作方法をかんたんにご紹介します。"
        ),
        Slide(
            "移動のしかた",
            "矢印ボタンで動画やメニューを移動します。OKで選択した項目を開き、戻るボタンで前のページに戻ります。"
        ),
        Slide(
            "お気に入りに追加",
            "動画を選択して、リモコンのオプション(メニュー)ボタンを押すと、お気に入りに追加・削除できます。ログインが必要です。"
        ),
        Slide(
            "カーソルモード",
            "OKを約0.5秒長押しするとポインターが表示されます。「人間であることを確認」のチェックなどに使えます。もう一度長押しすると解除されます。"
        ),
        Slide(
            "動画と全画面表示",
            "動画は全画面で開き、次の動画が自動で再生されます。下ボタンでコントロールバー、左右ボタンでスキップ、戻るボタンで全画面を終了します。"
        ),
        Slide(
            "日本語と英語",
            "ページ上部の EN / JA ボタンで、いつでも言語を切り替えられます。"
        )
    ) else listOf(
        Slide(
            "Welcome to Stardom World on TV",
            "A quick tour of getting around with your remote."
        ),
        Slide(
            "Moving around",
            "Use the arrow buttons to move between videos and menus. OK opens what is highlighted, and Back returns to the previous page."
        ),
        Slide(
            "Add to favorites",
            "Highlight a video and press the Options (menu) button on your remote to add it to, or remove it from, your favorites. You need to be signed in."
        ),
        Slide(
            "Cursor mode",
            "Hold OK for about half a second to turn on a pointer, for things like the \"Verify you are human\" box. Hold OK again to turn it off."
        ),
        Slide(
            "Videos and full screen",
            "Videos open in full screen and the next one plays by itself. Press Down for the controls bar, Left and Right to skip, and Back to leave full screen."
        ),
        Slide(
            "English or Japanese",
            "Use the EN / JA button at the top of the page to switch language at any time."
        )
    )

    private var slides = buildSlides()

    private val gold = 0xFFFFB347.toInt()
    private var index = 0

    // The first screen asks which language to use; the device language is pre-selected.
    private var langStep = true

    private fun p(v: Int): Int = (v * density).toInt()

    private val art = ArtView(context)
    private val titleView = android.widget.TextView(context)
    private val bodyView = android.widget.TextView(context)
    private val counter = android.widget.TextView(context)
    private val skipBtn = android.widget.TextView(context)
    private val backBtn = android.widget.TextView(context)
    private val nextBtn = android.widget.TextView(context)
    private var focused: android.widget.TextView = if (isJa) nextBtn else skipBtn

    // The splash logo, at the splash's own size and position.
    private val logoView = android.widget.ImageView(context)
    private val screenW = context.resources.displayMetrics.widthPixels
    private val screenH = context.resources.displayMetrics.heightPixels
    private val logoH: Int

    init {
        setBackgroundColor(Color.BLACK)
        isClickable = true

        logoView.setImageResource(R.drawable.splash_logo)
        logoView.adjustViewBounds = true
        val ld = logoView.drawable
        val logoW = (screenW * 0.6f).toInt()
        logoH = if (ld != null && ld.intrinsicWidth > 0) {
            logoW * ld.intrinsicHeight / ld.intrinsicWidth
        } else {
            (logoW * 0.25f).toInt()
        }
        addView(
            logoView,
            FrameLayout.LayoutParams(logoW, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER)
        )

        val col = android.widget.LinearLayout(context)
        col.orientation = android.widget.LinearLayout.VERTICAL
        col.gravity = Gravity.CENTER_HORIZONTAL
        col.setPadding(p(72), p(32), p(72), p(30))

        col.addView(
            art,
            android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.25f
            )
        )

        titleView.setTextColor(gold)
        titleView.textSize = 34f
        titleView.setTypeface(titleView.typeface, android.graphics.Typeface.BOLD)
        titleView.gravity = Gravity.CENTER
        col.addView(
            titleView,
            android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
        )

        bodyView.setTextColor(Color.WHITE)
        bodyView.textSize = 22f
        bodyView.gravity = Gravity.CENTER
        bodyView.setLineSpacing(0f, 1.15f)
        col.addView(
            bodyView,
            android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = p(10); bottomMargin = p(8) }
        )

        counter.setTextColor(0x99FFFFFF.toInt())
        counter.textSize = 16f
        counter.gravity = Gravity.CENTER
        col.addView(
            counter,
            android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = p(10) }
        )

        val row = android.widget.LinearLayout(context)
        row.orientation = android.widget.LinearLayout.HORIZONTAL
        row.gravity = Gravity.CENTER
        for (b in listOf(skipBtn, backBtn, nextBtn)) {
            b.textSize = 20f
            b.setTypeface(b.typeface, android.graphics.Typeface.BOLD)
            b.gravity = Gravity.CENTER
            b.setPadding(p(30), p(12), p(30), p(12))
            row.addView(
                b,
                android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { leftMargin = p(10); rightMargin = p(10) }
            )
        }
        col.addView(
            row,
            android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
        )

        addView(col, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        render()
    }

    private fun visibleButtons(): List<android.widget.TextView> =
        if (!langStep && index > 0) listOf(skipBtn, backBtn, nextBtn) else listOf(skipBtn, nextBtn)

    private fun paintButton(b: android.widget.TextView, isFocused: Boolean) {
        val d = android.graphics.drawable.GradientDrawable()
        d.cornerRadius = 12 * density
        if (isFocused) {
            d.setColor(gold)
            d.setStroke((4 * density).toInt(), Color.WHITE)
            b.setTextColor(0xFF1A1A1A.toInt())
        } else {
            d.setColor(0x33000000)
            d.setStroke((2 * density).toInt(), gold)
            b.setTextColor(Color.WHITE)
        }
        b.background = d
    }

    private fun render() {
        if (langStep) {
            titleView.text = "Language  /  言語"
            bodyView.text = "Choose your language  ·  言語を選択してください"
            counter.text = ""
            skipBtn.text = "English"
            nextBtn.text = "日本語"
            backBtn.visibility = View.GONE
        } else {
            val s = slides[index]
            titleView.text = s.title
            bodyView.text = s.body
            counter.text = (index + 1).toString() + " / " + slides.size
            skipBtn.text = tr("Skip to log in", "スキップしてログイン")
            backBtn.text = tr("Back", "戻る")
            backBtn.visibility = if (index > 0) View.VISIBLE else View.GONE
            nextBtn.text = if (index == slides.size - 1) tr("Log in", "ログイン") else tr("Next", "次へ")
        }
        if (!visibleButtons().contains(focused)) focused = nextBtn
        for (b in listOf(skipBtn, backBtn, nextBtn)) paintButton(b, b === focused)

        val lp = art.layoutParams as android.widget.LinearLayout.LayoutParams
        if (langStep || index == 0) {
            // Leave exactly the splash logo's space (it is centred on the screen) above the title.
            logoView.visibility = View.VISIBLE
            counter.visibility = View.GONE
            lp.weight = 0f
            lp.height = ((screenH + logoH) / 2f + 10 * density - 32 * density).toInt().coerceAtLeast(0)
        } else {
            logoView.visibility = View.GONE
            counter.visibility = View.VISIBLE
            lp.weight = 1.25f
            lp.height = 0
        }
        art.layoutParams = lp
        art.type = if (langStep) 0 else index
        art.invalidate()
    }

    private fun moveFocus(step: Int) {
        val list = visibleButtons()
        val i = list.indexOf(focused).coerceAtLeast(0)
        focused = list[(i + step).coerceIn(0, list.size - 1)]
        render()
    }

    private fun activate() {
        if (langStep) {
            onLanguage(if (focused === skipBtn) "en" else "ja")
            slides = buildSlides()
            langStep = false
            index = 0
            focused = nextBtn
            render()
            return
        }
        when {
            focused === skipBtn -> onLogin()
            focused === backBtn -> { index -= 1; render() }
            else -> if (index >= slides.size - 1) onLogin() else { index += 1; render() }
        }
    }

    fun handleKey(e: KeyEvent): Boolean {
        if (e.action != KeyEvent.ACTION_DOWN) return true
        when (e.keyCode) {
            KeyEvent.KEYCODE_DPAD_LEFT -> moveFocus(-1)
            KeyEvent.KEYCODE_DPAD_RIGHT -> moveFocus(1)
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> activate()
            KeyEvent.KEYCODE_BACK -> when {
                langStep -> onBrowse()
                index > 0 -> { index -= 1; render() }
                else -> { langStep = true; focused = if (isJa) nextBtn else skipBtn; render() }
            }
        }
        return true
    }

    // Simple line drawings, one per slide.
    private inner class ArtView(c: android.content.Context) : View(c) {
        var type = 0
        private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            color = gold
            strokeWidth = 3f * density
        }
        private val fillGold = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = gold }
        private val fillWhite = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
        private val fillDim = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x22FFFFFF }
        private val fillShade = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x66000000 }
        private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        private val tmp = RectF()
        private val path = Path()

        private fun triangle(canvas: Canvas, x1: Float, y1: Float, x2: Float, y2: Float, x3: Float, y3: Float, paint: Paint) {
            path.reset()
            path.moveTo(x1, y1)
            path.lineTo(x2, y2)
            path.lineTo(x3, y3)
            path.close()
            canvas.drawPath(path, paint)
        }

        private fun heart(canvas: Canvas, cx: Float, cy: Float, r: Float, paint: Paint) {
            canvas.drawCircle(cx - r * 0.5f, cy - r * 0.3f, r * 0.55f, paint)
            canvas.drawCircle(cx + r * 0.5f, cy - r * 0.3f, r * 0.55f, paint)
            triangle(canvas, cx - r * 1.02f, cy - r * 0.05f, cx + r * 1.02f, cy - r * 0.05f, cx, cy + r * 1.1f, paint)
        }

        override fun onDraw(canvas: Canvas) {
            val u = minOf(width, height) / 100f
            val cx = width / 2f
            val cy = height / 2f
            when (type) {
                0 -> {}
                1 -> {
                    canvas.drawCircle(cx, cy, 44f * u, fillDim)
                    canvas.drawCircle(cx, cy, 44f * u, line)
                    triangle(canvas, cx, cy - 36f * u, cx - 9f * u, cy - 24f * u, cx + 9f * u, cy - 24f * u, fillWhite)
                    triangle(canvas, cx, cy + 36f * u, cx - 9f * u, cy + 24f * u, cx + 9f * u, cy + 24f * u, fillWhite)
                    triangle(canvas, cx - 36f * u, cy, cx - 24f * u, cy - 9f * u, cx - 24f * u, cy + 9f * u, fillWhite)
                    triangle(canvas, cx + 36f * u, cy, cx + 24f * u, cy - 9f * u, cx + 24f * u, cy + 9f * u, fillWhite)
                    canvas.drawCircle(cx, cy, 15f * u, fillGold)
                    text.color = 0xFF1A1A1A.toInt()
                    text.textSize = 11f * u
                    canvas.drawText("OK", cx, cy + 4f * u, text)
                }
                2 -> {
                    // A video card with a heart, and the remote's Options button pointing at it.
                    tmp.set(cx - 82f * u, cy - 30f * u, cx + 8f * u, cy + 30f * u)
                    canvas.drawRoundRect(tmp, 6f * u, 6f * u, fillDim)
                    canvas.drawRoundRect(tmp, 6f * u, 6f * u, line)
                    heart(canvas, cx - 8f * u, cy - 14f * u, 9f * u, fillGold)
                    tmp.set(cx - 74f * u, cy + 8f * u, cx, cy + 14f * u)
                    canvas.drawRoundRect(tmp, 3f * u, 3f * u, fillWhite)
                    tmp.set(cx - 74f * u, cy + 19f * u, cx - 30f * u, cy + 24f * u)
                    canvas.drawRoundRect(tmp, 3f * u, 3f * u, fillDim)
                    canvas.drawCircle(cx + 58f * u, cy, 20f * u, fillDim)
                    canvas.drawCircle(cx + 58f * u, cy, 20f * u, line)
                    for (k in -1..1) {
                        canvas.drawLine(cx + 49f * u, cy + k * 6f * u, cx + 67f * u, cy + k * 6f * u, line)
                    }
                    canvas.drawLine(cx + 34f * u, cy, cx + 14f * u, cy - 8f * u, line)
                }
                3 -> {
                    tmp.set(cx - 84f * u, cy - 14f * u, cx - 56f * u, cy + 14f * u)
                    canvas.drawRoundRect(tmp, 5f * u, 5f * u, fillDim)
                    canvas.drawRoundRect(tmp, 5f * u, 5f * u, line)
                    text.color = Color.WHITE
                    text.textSize = 9f * u
                    text.textAlign = Paint.Align.LEFT
                    canvas.drawText("Verify you are human", cx - 48f * u, cy + 4f * u, text)
                    text.textAlign = Paint.Align.CENTER
                    val ws = 30f * u
                    val ratio = wand.height.toFloat() / wand.width.toFloat()
                    tmp.set(cx - 70f * u, cy - 2f * u, cx - 70f * u + ws, cy - 2f * u + ws * ratio)
                    canvas.drawBitmap(wand, null, tmp, null)
                    canvas.drawCircle(cx + 62f * u, cy, 22f * u, fillDim)
                    tmp.set(cx + 62f * u - 22f * u, cy - 22f * u, cx + 62f * u + 22f * u, cy + 22f * u)
                    canvas.drawArc(tmp, -90f, 270f, false, line)
                    text.color = Color.WHITE
                    text.textSize = 10f * u
                    canvas.drawText("hold OK", cx + 62f * u, cy + 4f * u, text)
                }
                4 -> {
                    tmp.set(cx - 70f * u, cy - 42f * u, cx + 70f * u, cy + 22f * u)
                    canvas.drawRoundRect(tmp, 4f * u, 4f * u, fillDim)
                    canvas.drawRoundRect(tmp, 4f * u, 4f * u, line)
                    tmp.set(cx - 62f * u, cy + 8f * u, cx + 62f * u, cy + 16f * u)
                    canvas.drawRoundRect(tmp, 3f * u, 3f * u, fillShade)
                    for (k in 0..4) {
                        tmp.set(cx - 58f * u + k * 24f * u, cy + 10f * u, cx - 44f * u + k * 24f * u, cy + 14f * u)
                        canvas.drawRoundRect(tmp, 2f * u, 2f * u, if (k == 1) fillGold else fillWhite)
                    }
                    triangle(canvas, cx, cy + 46f * u, cx - 9f * u, cy + 34f * u, cx + 9f * u, cy + 34f * u, fillGold)
                    triangle(canvas, cx - 18f * u, cy - 14f * u, cx - 18f * u, cy - 2f * u, cx - 7f * u, cy - 8f * u, fillWhite)
                }
                else -> {
                    tmp.set(cx - 34f * u, cy - 14f * u, cx + 34f * u, cy + 14f * u)
                    canvas.drawRoundRect(tmp, 14f * u, 14f * u, fillDim)
                    canvas.drawRoundRect(tmp, 14f * u, 14f * u, line)
                    tmp.set(cx - 32f * u, cy - 12f * u, cx, cy + 12f * u)
                    canvas.drawRoundRect(tmp, 12f * u, 12f * u, fillGold)
                    text.textSize = 13f * u
                    text.color = 0xFF1A1A1A.toInt()
                    canvas.drawText("EN", cx - 16f * u, cy + 5f * u, text)
                    text.color = Color.WHITE
                    canvas.drawText("JA", cx + 17f * u, cy + 5f * u, text)
                }
            }
        }
    }
}
