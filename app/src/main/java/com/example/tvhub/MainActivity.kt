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

        // The player control bar exists twice (a native overlay in full screen, an in-page bar under the player).
        // Both are built from this one list, from barLabel() and from barAction() so they cannot drift apart.
        private val BAR_IDS = listOf("play", "back", "fwd", "mute", "cc", "quality", "speed", "full")
        // Not offered in the bar under the picture: the app draws its own EN / 日本語 captions in full screen only.
        private val BAR_FULLSCREEN_ONLY = setOf("cc")
        private const val BAR_ACCENT = "#FFB347"
        private const val BAR_TEXT_ON_ACCENT = "#1A1A1A"
        private const val BAR_RADIUS_DP = 10

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
        /* The top header lives in the left slide-out menu now. */
        header, .box-header, .nav-inner, .header, #header { display: none !important; }
        html.tv-home .content-list, html.tv-home .box-section, html.tv-home .main-visual, html.tv-home .slider-inner,
        html.tv-home .box-main-visual, html.tv-home .container.box-main, html.tv-home .news-wrap {
            display: none !important;
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
        /* Same gold focus ring as the other highlighted items (no red glow). */
        #tv-section-select:focus {
            outline: 4px solid #FFB347 !important;
            outline-offset: 3px !important;
            box-shadow: none !important;
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
        /* Sort bar on listing pages: evenly spaced, centred, readable, with one clean arrow after each label. */
        .box-sort { display: flex !important; flex-wrap: wrap !important; justify-content: center !important; align-items: center !important; gap: 14px 30px !important; padding: 14px 0 18px 0 !important; }
        .box-sort a, .box-sort a.btn { position: relative !important; display: inline-flex !important; align-items: center !important; gap: 10px !important; font-size: 23px !important; line-height: 1.2 !important; padding: 10px 6px 12px 6px !important; margin: 0 !important; background-image: none !important; white-space: nowrap !important; }
        .box-sort a::before { content: none !important; display: none !important; }
        .box-sort a::after { content: "\25BE" !important; display: inline-block !important; position: static !important; width: auto !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: none !important; border: none !important; font-size: 20px !important; line-height: 1 !important; color: inherit !important; transform: none !important; }
        .box-sort a i, .box-sort a svg, .box-sort a img, .box-sort a [class*="icon"], .box-sort a [class*="arrow"], .box-sort a [class^="fa"] { display: none !important; }
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
    // How many of the player's own buttons the focus has stepped past (0 = on the frame itself, 1 = Play).
    // Left at Play is swallowed: going further back lands on hidden controls in the player's top corner.
    @Volatile private var playerCtrlPos = 0
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
    @Volatile private var sideMenuOpen = false   // the left slide-out menu is showing (set by the page)
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
                      if (iframe.src && iframe.src.indexOf('vimeo.com') !== -1 && (iframe.src.indexOf('autoplay=1') === -1 || iframe.src.indexOf('controls=0') === -1)) {
                        var extra = '';
                        if (iframe.src.indexOf('autoplay=1') === -1) extra = 'autoplay=1&autopause=0&muted=0';
                        // The page's own control bar (under the picture) replaces the player's.
                        if (iframe.src.indexOf('controls=0') === -1) extra += (extra ? '&' : '') + 'controls=0';
                        var sep = iframe.src.indexOf('?') !== -1 ? '&' : '?';
                        iframe.src = iframe.src + sep + extra;
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

                      // One stop per card: the thumbnail link. (A second stop on the box inside it made
                      // each card take several presses to pass.)
                      if (thumbBox) {
                        thumbBox.setAttribute('tabindex', thumbLink ? '-1' : '0');
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
        webView.addJavascriptInterface(webAppInterface, "AndroidHost")
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
                sideMenuOpen = false
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
                if (ccMode == 1 || ccMode == 2) ccStart()
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

    private val webAppInterface by lazy { WebAppInterface() }

    inner class WebAppInterface {
        // Factions page: the list kept in assets/factions.json, and whether faction logos may be shown.
        // Tournament Archives filter bar lists (cities, venues, shows) kept in assets/event_filters.json.
        @android.webkit.JavascriptInterface
        fun eventFiltersJson(): String = try {
            this@MainActivity.assets.open("event_filters.json").bufferedReader().use { it.readText() }
        } catch (_: Exception) { "" }

        @android.webkit.JavascriptInterface
        fun factionsJson(): String = try {
            this@MainActivity.assets.open("factions.json").bufferedReader().use { it.readText() }
        } catch (_: Exception) { "" }

        // A faction's logo from the private branding folder (res/drawable-nodpi/faction_logo_<id>.png, with
        // "-" written as "_"), as a data address. Empty when the build doesn't have it: the page shows text.
        @android.webkit.JavascriptInterface
        fun factionLogo(id: String): String {
            return try {
                val resId = this@MainActivity.resources.getIdentifier(
                    "faction_logo_" + id.replace('-', '_'), "drawable", this@MainActivity.packageName
                )
                if (resId == 0) return ""
                val bytes = this@MainActivity.resources.openRawResource(resId).use { it.readBytes() }
                "data:image/png;base64," + android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
            } catch (_: Exception) { "" }
        }

        // In-page control bar: the page asks for labels and sends button presses here.
        @android.webkit.JavascriptInterface
        fun barIds(): String = org.json.JSONArray(BAR_IDS.filter { it !in BAR_FULLSCREEN_ONLY }).toString()

        @android.webkit.JavascriptInterface
        fun barLabels(statusJson: String): String {
            val j = try { if (statusJson.isEmpty()) null else org.json.JSONObject(statusJson) } catch (_: Exception) { null }
            if (j != null && ccMode == 0 && j.optString("cc", "Off") != "Off") ccMode = 3
            val o = org.json.JSONObject()
            for (id in BAR_IDS) o.put(id, barLabel(id, j))
            return o.toString()
        }

        // Up / Down on the -/+ buttons: change the skip size, answer with the sizes and the chosen one.
        @android.webkit.JavascriptInterface
        fun skipStep(dir: Int): String {
            this@MainActivity.skipStep(dir)
            return this@MainActivity.skipInfoJson()
        }

        @android.webkit.JavascriptInterface
        fun skipInfo(): String = this@MainActivity.skipInfoJson()

        @android.webkit.JavascriptInterface
        fun barAction(id: String) {
            handler.post { this@MainActivity.barAction(id) }
        }

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
        fun setSideMenuOpen(open: Boolean) {
            sideMenuOpen = open
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
            if (focused && !playerFocused) playerCtrlPos = 0
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
              var cards = Array.from(document.querySelectorAll('a.tv-card, a.tv-thumbnail-link, .content-list-item a[href*="/contents/"], .content-list-item a[href*="/set/"]')).filter(function(a) {
                if (a.closest('.slick-cloned')) return false;
                var r = a.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) return false;
                return !iframe || (iframe.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
              });
              target = cards[0] || null;
            }
            // Up has nowhere to go above the player (the menu is the edge tab, opened with Left from the
            // related videos), and a missing target must never leave focus nowhere: stay in the player.
            if (!target) {
              try { window.AndroidHost.setPlayerFocused(true); } catch (e) {}
              return false;
            }
            try { if (document.activeElement) document.activeElement.blur(); } catch (e) {}
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            last = false;
            try { window.AndroidHost.setPlayerFocused(false); } catch (e) {}
            return true;
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

          // Quality list from the player: Auto first, then the resolutions from highest to lowest.
          window.__tvSortQualities = function(qs) {
            qs = (qs || []).slice();
            function num(q) { var n = parseInt(String(q.id), 10); return isNaN(n) ? 0 : n; }
            qs.sort(function(a, b) {
              if (a.id === 'auto') return -1;
              if (b.id === 'auto') return 1;
              return num(b) - num(a);
            });
            return qs;
          };

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
            } else if (cmd === 'quality' && p) {
              p.getQualities().then(function(qs) {
                qs = window.__tvSortQualities(qs);
                if (!qs.length) return;
                var cur = 0;
                for (var i = 0; i < qs.length; i++) { if (qs[i].active) cur = i; }
                return p.setQuality(qs[(cur + 1) % qs.length].id);
              }).catch(function() {});
            } else if (cmd === 'ccoff' && p) {
              p.disableTextTrack().catch(function() {});
            } else if (cmd === 'ccnative' && p) {
              p.getTextTracks().then(function(tr) {
                if (tr && tr.length) return p.enableTextTrack(tr[0].language, tr[0].kind);
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

          // Caption debugging: counts the caption lines the player reports while a track is showing.
          window.__tvCueCount = 0;
          window.__tvLastCue = '';
          function hookCues(f, p) {
            if (f.__tvCueHooked) return;
            f.__tvCueHooked = true;
            try {
              p.on('cuechange', function(e) {
                window.__tvCueCount++;
                try { window.__tvLastCue = (e && e.cues && e.cues.length) ? e.cues.map(function(c) { return c.text; }).join(' / ') : ''; } catch (x) {}
              });
            } catch (x) {}
          }

          // Fills window.__tvCcJson (asynchronously) with what the player says about its caption tracks.
          window.__tvCcRefresh = function() {
            var f = playerFrame();
            if (!f) { window.__tvCcJson = JSON.stringify({ err: 'no player frame' }); return; }
            if (typeof Vimeo === 'undefined' || !Vimeo.Player) { window.__tvCcJson = JSON.stringify({ src: f.src, err: 'player SDK not on page' }); return; }
            var p = null;
            try { p = f.__tvPlayer || (f.__tvPlayer = new Vimeo.Player(f)); } catch (err) { p = null; }
            if (!p) { window.__tvCcJson = JSON.stringify({ src: f.src, err: 'could not attach to player' }); return; }
            hookCues(f, p);
            try { p.getVideoId().then(function(v) { window.__tvVideoId = String(v); }).catch(function() {}); } catch (x) {}
            p.getTextTracks().then(function(tr) {
              window.__tvCcJson = JSON.stringify({
                src: f.src,
                tracks: (tr || []).map(function(t) { return { label: t.label, language: t.language, kind: t.kind, mode: t.mode }; }),
                cues: window.__tvCueCount,
                last: window.__tvLastCue
              });
            }).catch(function(e) { window.__tvCcJson = JSON.stringify({ src: f.src, err: String((e && e.message) || e) }); });
          };

          // Latest player state for the app's own full-screen button bar.
          window.__tvRefreshStatus = function() {
            var f = playerFrame();
            if (!f || typeof Vimeo === 'undefined' || !Vimeo.Player) return;
            var p = null;
            try { p = f.__tvPlayer || (f.__tvPlayer = new Vimeo.Player(f)); } catch (err) { p = null; }
            if (!p) return;
            hookCues(f, p);
            Promise.all([p.getPaused(), p.getCurrentTime(), p.getDuration(), p.getVolume(), p.getPlaybackRate(), p.getTextTracks(), p.getQualities().catch(function() { return []; })]).then(function(r) {
              var cc = 'Off';
              var tr = r[5] || [];
              for (var i = 0; i < tr.length; i++) { if (tr[i].mode === 'showing') cc = tr[i].label || tr[i].language; }
              var qs = r[6] || [], ql = '', qn = qs.length;
              for (var k = 0; k < qs.length; k++) { if (qs[k].active) ql = qs[k].label || qs[k].id; }
              window.__tvStatusJson = JSON.stringify({ paused: r[0], t: r[1], d: r[2], vol: r[3], rate: r[4], cc: cc, ncc: tr.length, q: ql, nq: qn });
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

          function host(msg) {
            if (window.AndroidHost && typeof window.AndroidHost.logDebug === 'function') window.AndroidHost.logDebug(msg);
          }

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
            var isFavorited = isFavPage || (targetCard && (targetCard.classList.contains('is-favorite') || targetCard.dataset.tvFav === 'true'));
            var apiType = isFavorited ? 'DELETE' : 'POST';

            // Adding a video anywhere outside the Favorites page changes nothing on the card: the toast
            // is the only cue. On the Favorites page a removed video is dimmed, as well as the toast.
            function markRemoved() {
              if (!targetCard) return;
              targetCard.classList.remove('is-favorite');
              targetCard.dataset.tvFav = 'false';
              if (isFavPage) targetCard.style.setProperty('opacity', '0.3', 'important');
            }
            function markAdded() {
              if (targetCard) targetCard.dataset.tvFav = 'true';
            }

            if ($ && $.apiCall) {
              $.apiCall({
                url: '/user_api/contents/' + targetContentId + '/favorites',
                type: apiType
              }).done(function(data) {
                if (apiType === 'DELETE') {
                  markRemoved();
                  host('Removed from Favorites');
                } else {
                  markAdded();
                  host('♥ Added to Favorites!');
                }
              }).fail(function(jqXHR) {
                if (jqXHR.status === 400) {
                  host('Please log in on Stardom World to sync favorites');
                } else if (jqXHR.status === 409 || (jqXHR.responseJSON && jqXHR.responseJSON.message === 'Already favorited')) {
                  $.apiCall({
                    url: '/user_api/contents/' + targetContentId + '/favorites',
                    type: 'DELETE'
                  }).done(function() {
                    markRemoved();
                    host('Removed from Favorites');
                  });
                } else {
                  var newFavState = !isFavorited;
                  if (newFavState) markAdded(); else markRemoved();
                  host(newFavState ? '♥ Added to Favorites!' : 'Removed from Favorites');
                }
              });
            } else {
              host('Favorites API not available');
            }
            return true;
          }

          window.__tvToggleCardFavorite = toggleCardFavorite;
        })();
    """.trimIndent()

    // Up/Down on the video listing pages (everything except the home page): one press moves to the
    // video directly above or below, scrolling it into view, instead of stepping through hidden stops.
    // The big "advanced search" block at the bottom of the video listing pages is not used on the TV and
    // flashed up while more videos loaded, so it is hidden. The header's own search box is left alone.
    private val hideBodySearchJs = """
        (function(){
          if (window.__tvHideBodySearch) return;
          window.__tvHideBodySearch = true;

          var css = document.createElement('style');
          css.id = 'tv-hide-body-search';
          css.textContent = '#search-section,[class*="search-detail"],[class*="detail-search"],[class*="advanced-search"],[class*="search-advanced"],[class*="search-modal"],[class*="search-form-area"]{display:none !important;}';
          (document.head || document.documentElement).appendChild(css);

          var HEADER = 'header, .box-header, #tv-header-flex-wrapper, .nav-inner, footer, #tv-sm';
          function sweep() {
            var fields = document.querySelectorAll('input[name^="q["], select[name^="q["], input[name="keyword"], form[action*="search"] input, form[action*="/contents"] input[type="text"]');
            fields.forEach(function(f) {
              if (f.closest(HEADER)) return;
              var node = f.closest('form') || f;
              for (var up = 0; up < 4; up++) {
                var par = node.parentElement;
                if (!par || par === document.body) break;
                // Climb to the module's own wrapper, never to something that also holds the videos.
                if (par.querySelector('.content-list, a.tv-thumbnail-link, .content-list-item, article, iframe') || par.closest(HEADER)) break;
                node = par;
              }
              if (node.querySelector('.content-list, a.tv-thumbnail-link, .content-list-item, article, iframe')) return;
              if (node.dataset.tvHidden !== '1') {
                node.dataset.tvHidden = '1';
                node.style.setProperty('display', 'none', 'important');
              }
            });
          }
          sweep();
          new MutationObserver(sweep).observe(document.documentElement, { childList: true, subtree: true });
          setInterval(sweep, 1000);
        })();
    """.trimIndent()

    // Keeps the home page's banner and rows at one fixed distance from the top while the header settles.
    // The header is first drawn two rows tall, and the site sometimes lifts it out of the page flow a few
    // seconds later (e.g. coming back from another page): either one used to push the banner around.
    // Each frame, before it is painted, the grid's top margin is corrected, so it always appears in place.
    private val homeAnchorJs = """
        (function(){
          if (window.__tvHomeAnchor) return;
          var p = location.pathname;
          if (!(p === '/' || p === '/index.html' || p === '')) return;
          window.__tvHomeAnchor = true;

          var TARGET = 28;   // distance from the top of the page to the banner, in CSS pixels
          var started = performance.now();
          function step() {
            var grid = document.getElementById('tv-test-grid');
            if (grid) {
              var cur = grid.getBoundingClientRect().top + window.scrollY;
              var delta = TARGET - cur;
              if (Math.abs(delta) > 0.5) {
                var mt = parseFloat(grid.dataset.tvMt || '0') + delta;
                grid.dataset.tvMt = String(mt);
                grid.style.setProperty('margin-top', mt + 'px', 'important');
              }
            }
            if (performance.now() - started < 15000) requestAnimationFrame(step);
            else setTimeout(step, 400);
          }
          requestAnimationFrame(step);
        })();
    """.trimIndent()

    // The left slide-out menu: everything the site's top header used to hold (search, categories, favorites,
    // account, language) lives here instead. Left on the first card of any row or list opens it, Right closes it.
    private val sideMenuJs = """
        (function(){
          if (window.__tvSideMenu) return;
          var path0 = location.pathname;
          if (path0.indexOf('/login') === 0) return;
          window.__tvSideMenu = true;

          var BASE = 'https://www.stardom-world.com';
          // Each entry: [English label, path, Japanese label]
          var SHOWS = [
            ['All tournaments', '/contents/category/events', '大会アーカイブス（新着大会）'],
            ['LIVE & On-demand streaming', '/contents/category/live-archives', 'LIVE&見逃し配信'],
            ['Big Match', '/contents/category/bm2025', 'ビッグマッチ'],
            ['English Commentary', '/contents/category/english', 'English Commentary'],
            ['[Special Feature] 5\u2605STAR GP 2026', '/contents/category/fivestar2026', '【特集】5\u2605STAR GP 2026']
          ];
          var NEW_KEY = 'tvNewHrefV1';
          var HOME_ROWS_KEY = 'tvHomeRowsV1';
          // Under Home: the rows the home page itself shows (noted each time the home page loads, no extra request),
          // else the five known ones.
          function homeRows() {
            try {
              var saved = JSON.parse(lsGet(HOME_ROWS_KEY) || 'null');
              if (saved && saved.length) return saved.map(function(r) {
                var en = r[0], ja = r[2] || r[0];
                if (hasJa(en)) {
                  en = ja = r[0];
                  SHOWS.forEach(function(x) { if (hrefPath(r[1]) === x[1]) en = x[0]; });
                  if (en === '新着') en = 'New';
                  CHAMPS.forEach(function(x) { if (hrefPath(r[1]) === x[1]) en = x[0]; });
                  var dm = /^(\d{4})年代$/.exec(en);
                  if (dm) en = dm[1] + 's';
                  var ym = /^(\d{4})年$/.exec(en);
                  if (ym) en = ym[1];
                  if (hasJa(en)) en = xl(en);
                }
                return [en, r[1], ja];
              });
            } catch (e) {}
            return staticHomeRows();
          }
          // What the Home drop-down / flyout lists: the main page itself, then the rows the main page shows.
          function homeList() { return [[T('Main page', 'メインページ'), '/', 'メインページ']].concat(homeRows()); }
          function hrefPath(h) { try { return new URL(h, location.href).pathname; } catch (e) { return String(h); } }
          function staticHomeRows() {
            return [['New', lsGet(NEW_KEY) || '/', '新着']].concat(SHOWS.slice(1));
          }
          // Shows: the big shows, the same list as the Show filter (assets/event_filters.json).
          function showsList() {
            var out = [[SHOWS[0][0], SHOWS[0][1], SHOWS[0][2]]];
            try {
              var d = JSON.parse(AndroidHost.eventFiltersJson());
              (d.shows || []).forEach(function(x) {
                out.push([x.name, '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(x.search) + '&activetab=contents&page=1&tvev=1&tvsh=' + encodeURIComponent(x.name), x.name]);
              });
            } catch (e) {}
            return out;
          }
          function absUrl(p) { return /^https?:/.test(p) ? p : (BASE + p); }
          var CHAMPS = [
            ["IWGP Women's", '/contents/category/iwgp', 'IWGP女子'],
            ['World of Stardom', '/contents/category/world-sd', 'ワールド・オブ・スターダム'],
            ['Wonder of Stardom', '/contents/category/wonder-sd', 'ワンダー・オブ・スターダム'],
            ['High Speed', '/contents/category/high_speed', 'ハイスピード'],
            ['Artist of Stardom', '/contents/search?q%5Bkeyword%5D=Artist%20of%20Stardom&activetab=contents&page=1&tvb=&tvch=artist', 'アーティスト・オブ・スターダム'],
            ['Future of Stardom', '/contents/search?q%5Bkeyword%5D=Future%20of%20Stardom&activetab=contents&page=1&tvb=&tvch=future', 'フューチャー・オブ・スターダム'],
            ['Goddess of Stardom', '/contents/search?q%5Bkeyword%5D=Goddess%20of%20Stardom&activetab=contents&page=1&tvb=&tvch=goddess', 'ゴッデス・オブ・スターダム'],
            ['NEW BLOOD Tag Team', '/contents/search?q%5Bkeyword%5D=NEW%20BLOOD&activetab=contents&page=1&tvb=&tvch=newblood', 'NEW BLOOD タッグ'],
            ['Any championship match', '/contents/search?q%5Bkeyword%5D=Championship&activetab=contents&page=1&tvb=&tvch=any', 'すべての王座戦'],
            ['Other title matches', '/contents/search?q%5Bkeyword%5D=Title%20Match&activetab=contents&page=1&tvb=&tvch=other', 'その他のタイトルマッチ']
          ];
          var MINE = [
            ['Recently Watched', '/mypage?tvrecent=1', '最近視聴した動画'],
            ['My Favorites', '/mypage/favorites', 'お気に入り']
          ];
          var COMMUNITY = [
            ['Most Watched', '/contents/search?s=pc&o=d&activetab=contents&page=1', '再生数の多い動画'],
            ['Most Favorited', '/contents/search?s=fc&o=d&activetab=contents&page=1', 'お気に入り数の多い動画']
          ];
          function yearsList() {
            var out = [];
            for (var y = new Date().getFullYear(); y >= 2011; y--) {
              out.push([String(y), '/contents/category/' + (y === 2020 ? '_2020' : y), String(y)]);   // the site's 2020 page is "_2020"
            }
            return out;
          }
          // [English name, Japanese name]
          var CURRENT_W = [['AZM', 'AZM'], ['Fuwa Chan', 'フワちゃん'], ['Hanan', '羽南'], ['Hazuki', '葉月'], ['Hime Yuria', '姫ゆりあ'], ['Hina', '妃南'], ['Kiyoka Kotatsu', '虎龍清花'], ['Maki Itoh', '伊藤麻希'], ['Natsupoi', 'なつぽい'], ['Rina', '吏南'], ['Sakura Aya', 'さくらあや'], ['Saori Anou', '安納サオリ'], ['Saya Iida', '飯田沙耶'], ['Saya Kamitani', '上谷沙弥'], ['Sayaka Kurara', '玖麗さやか'], ['Starlight Kid', 'スターライト・キッド'], ['Suzu Suzuki', '鈴季すず'], ['Syuri', '朱里'], ['Tomoka Inaba', '稲葉ともか'], ['Utami Hayashishita', '林下詩美']];
          var PAST_W = [['Giulia', 'ジュリア'], ['Hana Kimura', '木村花'], ['Io Shirai', '紫雷イオ'], ['Jamie Hayter', 'ジェイミー・ヘイター'], ['Jungle Kyona', 'ジャングル叫女'], ['Kairi Hane (KAIRI)', 'カイリ・セイン'], ['Kris Wolf', 'クリス・ウルフ'], ['Mariah May', 'マライア・メイ'], ['Mayu Iwatani', '岩谷麻優'], ['Mina Shirakawa', '白川未奈'], ['Sareee', 'Sareee'], ['Tam Nakano', '中野たむ'], ['Thekla', 'テクラ'], ['Toni Storm', 'トニー・ストーム']];
          var SEARCH_AS = { 'Kairi Hane (KAIRI)': 'KAIRI' };   // what to search for when the shown name is not what the site knows
          function searchPath(name) { return '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(SEARCH_AS[name] || name); }
          // The Factions entries come from the app's factions.json: [name, address of its page, name].
          function factionRows() {
            var out = [];
            try {
              var d = JSON.parse(AndroidHost.factionsJson());
              (d.factions || []).forEach(function(f) {
                if (!f.members || !f.members.length) return;
                out.push([f.name, '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(f.members[0].search) + '&tvfaction=' + encodeURIComponent(f.id), f.name]);
              });
            } catch (e) {}
            return out;
          }
          // "Current Wrestlers": everyone listed in the app's factions.json, once each, in alphabetical order.
          var JA_NAMES = {};
          CURRENT_W.concat(PAST_W).forEach(function(n) { JA_NAMES[n[0]] = n[1]; });
          function currentWrestlers() {
            var seen = {}, out = [];
            try {
              var d = JSON.parse(AndroidHost.factionsJson());
              (d.factions || []).forEach(function(f) {
                (f.members || []).forEach(function(m) {
                  if (m && m.name && !seen[m.name]) { seen[m.name] = 1; out.push([m.name, m.search || m.name, JA_NAMES[m.name] || m.name]); }
                });
              });
            } catch (e) {}
            if (!out.length) return wrestlers(CURRENT_W);
            out.sort(function(a, b) { var x = a[0].toLowerCase(), y = b[0].toLowerCase(); return x < y ? -1 : (x > y ? 1 : 0); });
            return out.map(function(m) { return [m[0], '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(m[1]), m[2]]; });
          }
          function wrestlers(list) { return list.map(function(n) { return [n[0], searchPath(n[0]), n[1]]; }); }
          var HINT_KEY = 'tvMenuHintV1';
          var REOPEN_KEY = 'tvMenuReopenV1';

          function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
          function T(en, ja) { return isJa() ? ja : en; }
          function isHome() { return path0 === '/' || path0 === '/index.html' || path0 === ''; }
          function isDetail() { return /^\/contents\/[0-9]+/.test(path0); }
          function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
          function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
          function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

          var st = document.createElement('style');
          st.id = 'tv-sm-style';
          st.textContent = [
            '#tv-sm-scrim{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(5,8,12,.66);z-index:99998;opacity:0;pointer-events:none;transition:opacity .18s;}',
            'html.tv-sm-open #tv-sm-scrim{opacity:1;}',
            '#tv-sm{position:fixed;left:0;top:0;bottom:0;width:430px;box-sizing:border-box;background:#0F151C !important;border-right:1px solid #222b36;z-index:99999;transform:translateX(-104%);transition:transform .18s;padding:26px 24px 22px 24px;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;color:#fff;}',
            'html.tv-sm-open #tv-sm{transform:none;}',
            '#tv-sm, #tv-sm *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;}',
            '#tv-sm .tv-sm-item > span{white-space:normal;min-width:0;padding-right:8px;line-height:1.25;}',
            '#tv-sm .tv-sm-list{flex:1 1 auto;overflow-y:auto;min-height:0;margin:6px 0 10px 0;padding:2px 0;scrollbar-width:none;display:flex;flex-direction:column;}',
            '#tv-sm .tv-sm-logorow{margin:auto 0;padding:4px 0;}',
            '#tv-sm .tv-sm-list::-webkit-scrollbar{display:none;}',
            '#tv-sm .tv-sm-item{display:flex !important;align-items:center;justify-content:space-between;min-height:54px;padding:0 14px;font-size:25px;font-weight:600;color:#ffffff !important;background:transparent !important;border:3px solid transparent !important;border-radius:8px;box-sizing:border-box;text-decoration:none !important;cursor:pointer;outline:none !important;margin:2px 0;width:100%;}',
            '#tv-sm .tv-sm-item:focus{border-color:#F4C242 !important;background:#172029 !important;}',
            '#tv-sm .tv-sm-sub{font-size:23px;font-weight:500;color:#c9d2dc !important;min-height:48px;}',
            '#tv-sm .tv-sm-subs{margin-left:24px;padding-left:10px;border-left:2px solid #2a323c;display:none;}',
            '#tv-sm .tv-sm-grp.tv-sm-expanded > .tv-sm-subs{display:block;}',
            '#tv-sm .tv-sm-grp.tv-sm-expanded > .tv-sm-item{color:#F4C242 !important;}',
            '#tv-sm .tv-sm-grp.tv-sm-expanded > .tv-sm-item .tv-sm-chev{transform:rotate(90deg);}',
            '#tv-sm .tv-sm-chev{flex:0 0 auto;transition:transform .12s;}',
            '#tv-sm .tv-sm-search{gap:12px;justify-content:flex-start;background:#172029 !important;border:1px solid #2a323c !important;padding:0 14px;}',
            '#tv-sm .tv-sm-search:focus-within{border:3px solid #F4C242 !important;padding:0 12px;}',
            '#tv-sm .tv-sm-search input{flex:1 1 auto;min-width:0;height:46px;background:transparent !important;border:0 !important;outline:none !important;color:#ffffff !important;font-size:22px;font-family:inherit;padding:0;}',
            '#tv-sm .tv-sm-mic{flex:0 0 auto;width:44px;height:44px;display:flex;align-items:center;justify-content:center;pointer-events:none;}',
            '#tv-sm .tv-sm-formhost{flex:1 1 auto;min-width:0;display:block;}',
            '#tv-sm .tv-sm-formhost form, #tv-sm .tv-sm-formhost .input-group{display:block !important;width:100% !important;max-width:none !important;min-width:0 !important;flex:1 1 auto !important;height:46px !important;margin:0 !important;padding:0 !important;background:transparent !important;border:0 !important;}',
            '#tv-sm .tv-sm-formhost input[type="text"], #tv-sm .tv-sm-formhost input.form-control, #tv-sm .tv-sm-formhost input[name="q[keyword]"]{display:block !important;width:100% !important;height:46px !important;padding:0 !important;margin:0 !important;background:transparent !important;border:0 !important;border-radius:0 !important;outline:none !important;box-shadow:none !important;color:#ffffff !important;font-size:22px !important;font-family:inherit !important;}',
            '#tv-sm .tv-sm-formhost input[type="submit"], #tv-sm .tv-sm-formhost button, #tv-sm .tv-sm-formhost .input-group-btn, #tv-sm .tv-sm-formhost .input-group-append{display:none !important;}',
            '#tv-sm .tv-sm-home{justify-content:flex-start;gap:18px;margin:0;min-height:58px;}',
            '#tv-sm .tv-sm-home img{max-height:44px;width:auto;object-fit:contain;}',
            '#tv-sm .tv-sm-home .tv-sm-chev{margin-left:auto;}',
            '#tv-sm-shelf{position:fixed;z-index:100000;box-sizing:border-box;left:430px;padding:16px 18px;border-radius:0 14px 14px 0;background:#121922;border:2px solid #2a323c;border-left:4px solid #F4C242;color:#ffffff;font-family:Arial,Helvetica,sans-serif;overflow-y:auto;scrollbar-width:none;}',
            '#tv-sm-shelf::-webkit-scrollbar{display:none;}',
            '#tv-sm-shelf .tv-sm-fi{break-inside:avoid;}',
            '#tv-sm-shelf .tv-shl-t{font-size:13px;letter-spacing:1px;font-weight:700;color:#9aa6b4;margin:0 0 10px 0;}',
            '#tv-sm-shelf .tv-shl-grid{display:grid;gap:2px 8px;}',
            '#tv-sm-shelf .tv-shl-h{padding:4px 6px 6px 6px;font-size:13px;line-height:15px;font-weight:700;color:#F4C242;white-space:nowrap;}',
            '#tv-sm-shelf .tv-shl-blk{margin:0 0 12px 0;min-width:0;}',
            '#tv-sm-shelf .tv-sm-fi{cursor:pointer;display:block;box-sizing:border-box;padding:7px 10px;margin:1px 0;border-radius:8px;border:2px solid transparent;font-size:17px;font-weight:600;color:#c9d2dc !important;text-decoration:none !important;outline:none !important;white-space:normal;}',
            '#tv-sm-shelf .tv-sm-fi:focus{background:#172029;border-color:#F4C242;color:#ffffff !important;font-weight:700;box-shadow:none !important;}',
            '#tv-sm-toast{position:absolute;left:24px;right:24px;bottom:86px;padding:9px 12px;border-radius:10px;background:#172029;border:2px solid #2a323c;color:#F4C242;font-size:15px;font-weight:700;text-align:center;pointer-events:none;transition:opacity .3s;}',
            '#tv-sm .tv-sm-homegrp.tv-sm-expanded > .tv-sm-home svg:first-child{stroke:#F4C242;}',
            '#tv-sm .tv-sm-foot{border-top:1px solid #222b36;padding-top:14px;display:flex;align-items:center;gap:10px;}',
            '#tv-sm .tv-sm-lang{flex:1 1 auto;display:flex !important;width:100%;padding:0;gap:0;min-height:48px;border:3px solid #2a323c !important;border-radius:26px;overflow:hidden;justify-content:stretch;}',
            '#tv-sm .tv-sm-lang:focus{border-color:#F4C242 !important;}',
            '#tv-sm .tv-sm-lang span{flex:1 1 50%;text-align:center;padding:10px 16px;font-size:20px;font-weight:700;color:#c9d2dc;}',
            '#tv-sm .tv-sm-lang span.tv-sm-on{background:#F4C242;color:#0B0F14;}',
            '#tv-sm-tab{position:fixed;left:0;top:42%;width:26px;height:110px;border-radius:0 12px 12px 0;background:rgba(17,23,30,.92);border:1px solid #2a323c;border-left:0;z-index:99990;display:flex;align-items:center;justify-content:center;pointer-events:none;}',
            'html.tv-sm-open #tv-sm-tab{display:none;}',
            '#tv-sm-hint{position:fixed;left:40px;top:calc(42% + 26px);height:58px;padding:0 22px;border-radius:29px;background:#F4C242;color:#0B0F14;z-index:99991;display:flex;align-items:center;gap:10px;font:700 20px Arial,Helvetica,sans-serif;pointer-events:none;transition:opacity .6s;}',
            'html.tv-sm-open #tv-sm-hint{display:none;}',
            '#tv-page-title{display:flex;align-items:center;gap:18px;box-sizing:border-box;padding:22px 40px 12px 40px;font:400 36px Arial,Helvetica,sans-serif;color:#ffffff;background:#000000;}',
            '#tv-page-title .tv-pt-bar{flex:0 0 auto;width:12px;height:44px;background:#F4C242;}',
            '#tv-page-title .tv-pt-txt{min-width:0;line-height:1.2;}'
          ].join('\n');
          (document.head || document.documentElement).appendChild(st);

          var isOpen = false;
          var prevFocus = null;
          var panel = null, scrim = null;

          function setNativeFlag(v) {
            try { if (window.AndroidHost && window.AndroidHost.setSideMenuOpen) window.AndroidHost.setSideMenuOpen(!!v); } catch (e) {}
          }

          function chev() {
            return '<svg class="tv-sm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
          }
          // Menu style: "shelf" (long sections open a panel to the right of the menu) or "classic" (everything inline).
          // Left on a top-level menu row switches between them; the choice is remembered.
          var MODE_KEY = 'tvMenuModeV1';
          function shelfMode() { return true; }
          function group(label, rows, shelfKey) {
            if (shelfKey && shelfMode()) {
              return '<div class="tv-sm-grp notranslate" translate="no"><div class="tv-sm-item" tabindex="0" role="button" data-shelf="' + shelfKey + '"><span>' + esc(label) + '</span>' + chev() + '</div></div>';
            }
            var h = '<div class="tv-sm-grp notranslate" translate="no"><div class="tv-sm-item" tabindex="0" role="button" data-grp="1"><span>' + esc(label) + '</span>' + chev() + '</div><div class="tv-sm-subs">';
            rows.forEach(function(r) {
              h += '<a class="tv-sm-item tv-sm-sub" tabindex="0" data-go="' + esc(r[1]) + '" href="' + esc(absUrl(r[1])) + '">' + esc(isJa() && r[2] ? r[2] : r[0]) + '</a>';
            });
            return h + '</div></div>';
          }
          function signedIn() { return !!document.querySelector('.box-dropdown-key'); }
          // The account name and menu come from the site's header, which is hidden, so the page's translator
          // never reaches it. They are drawn in the menu where the translator can, and what it produces is
          // remembered so the next opening shows the English straight away.
          var XLAT_KEY = 'tvAcctXlatV1';
          function readXlat() { try { return JSON.parse(lsGet(XLAT_KEY) || '{}') || {}; } catch (e) { return {}; } }
          function hasJa(t) { return /[\u3040-\u30ff\u3400-\u9fff]/.test(t || ''); }
          function xl(t) {
            if (isJa() || !hasJa(t)) return t;
            var m = readXlat();
            return m[t] || t;
          }
          function learnXlat() {
            if (isJa()) return;
            var n = 0;
            var tm = setInterval(function() {
              n++;
              if (!isOpen || !panel || n > 20) { clearInterval(tm); return; }
              var m = readXlat(), changed = false;
              Array.prototype.forEach.call(panel.querySelectorAll('[data-orig]'), function(el) {
                var orig = el.getAttribute('data-orig');
                var cur = (el.textContent || '').replace(/\s+/g, ' ').trim();
                if (orig && hasJa(orig) && cur && !hasJa(cur) && m[orig] !== cur) { m[orig] = cur; changed = true; }
              });
              if (changed) lsSet(XLAT_KEY, JSON.stringify(m));
            }, 400);
          }
          function acctName() {
            var k = document.querySelector('.box-dropdown-key');
            var t = k ? (k.textContent || '').replace(/\s+/g, ' ').trim() : '';
            return t || T('Account', 'アカウント');
          }
          // The account menu's own links (My page, Log out, ...): read from the header the site draws, which is
          // hidden but still there, and pressed through the real link so nothing about them changes.
          function acctLinks() {
            var menu = document.querySelector('.tv-acct-menu, [data-tv-acct] .dropdown-container');
            if (!menu) return [];
            var out = [];
            Array.prototype.forEach.call(menu.querySelectorAll('a'), function(a) {
              var t = (a.textContent || '').replace(/\s+/g, ' ').trim();
              if (t) out.push({ label: t, el: a });
            });
            return out;
          }
          function logoSrc() {
            var img = document.querySelector('h1 a img, .nav-inner h1 img, header a img, .logo img');
            return img && img.src ? img.src : '';
          }

          function build() {
            var years = yearsList();
            var ja = isJa();
            var logo = logoSrc();
            var h = '';
            h += '<div class="tv-sm-item tv-sm-search notranslate" translate="no" data-search="1"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9aa6b4" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="tv-sm-formhost"></span><span class="tv-sm-mic" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4DA3FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg></span></div>';
            h += '<div class="tv-sm-list"><div class="tv-sm-logorow"><div class="tv-sm-grp tv-sm-homegrp notranslate" translate="no"><a class="tv-sm-item tv-sm-home notranslate" translate="no" tabindex="0" ' + (shelfMode() ? 'data-shelf="home"' : 'data-go="/" data-homegrp="1"') + ' href="' + BASE + '/" aria-label="Home"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '') + chev() + '</a><div class="tv-sm-subs">' + (shelfMode() ? [] : homeList()).map(function(r) { return '<a class="tv-sm-item tv-sm-sub" tabindex="0" data-go="' + esc(r[1]) + '" href="' + esc(absUrl(r[1])) + '">' + esc(isJa() && r[2] ? r[2] : r[0]) + '</a>'; }).join('') + '</div></div></div>';
            h += group(T('Shows', '番組'), showsList(), 'shows');
            h += group(T('Championships', '王座'), CHAMPS, 'champs');
            h += group(T('Years', '年別'), years, 'years');
            var facRows = factionRows();
            if (facRows.length) h += group(T('Factions', 'ユニット'), facRows, 'factions');
            h += group(T('Current Wrestlers', '現役選手'), currentWrestlers(), 'current');
            h += group(T('Past Wrestlers', '元所属選手'), wrestlers(PAST_W), 'past');
            if (signedIn()) h += group(T('My Videos', 'マイビデオ'), MINE, 'mine');
            h += group(T('Community', 'みんなの動画'), COMMUNITY, 'community');
            if (signedIn()) {
              var links = acctLinks();
              window.__tvMenuAcct = links;
              if (links.length) {
                var an = acctName();
                h += '<div class="tv-sm-grp"><div class="tv-sm-item" tabindex="0" role="button" ' + (shelfMode() ? 'data-shelf="acct"' : 'data-grp="1"') + '><span data-orig="' + esc(an) + '">' + esc(xl(an)) + '</span>' + chev() + '</div><div class="tv-sm-subs">';
                (shelfMode() ? [] : links).forEach(function(l, i) {
                  h += '<div class="tv-sm-item tv-sm-sub" tabindex="0" role="button" data-acctlink="' + i + '"><span data-orig="' + esc(l.label) + '">' + esc(xl(l.label)) + '</span></div>';
                });
                h += '</div></div>';
              } else {
                h += '<a class="tv-sm-item" tabindex="0" data-go="/mypage" href="' + BASE + '/mypage"><span data-orig="' + esc(acctName()) + '">' + esc(xl(acctName())) + '</span></a>';
              }
            } else {
              h += '<a class="tv-sm-item" tabindex="0" data-go="/login" href="' + BASE + '/login"><span>' + esc(T('Log in', 'ログイン')) + '</span></a>';
            }
            h += '</div>';
            h += '<div class="tv-sm-foot notranslate" translate="no"><div class="tv-sm-item tv-sm-lang" tabindex="0" role="button" data-lang="1" aria-label="Language"><span class="' + (ja ? '' : 'tv-sm-on') + '">EN</span><span class="' + (ja ? 'tv-sm-on' : '') + '">\u65e5\u672c\u8a9e</span></div>';
            h += '</div>';
            panel.innerHTML = h;
          }

          function ensureDom() {
            if (panel && panel.isConnected) return;
            var host = document.body || document.documentElement;
            scrim = document.createElement('div');
            scrim.id = 'tv-sm-scrim';
            panel = document.createElement('div');
            panel.id = 'tv-sm';
            host.appendChild(scrim);
            host.appendChild(panel);
          }

          // The search box is the site's own (the one the old header used, which opens the keyboard properly):
          // it is moved into the menu while the menu is open and put back in the header when it closes.
          var searchOrigin = null;
          function realSearchForm() {
            var f = document.querySelector('#tv-header-flex-wrapper form') || document.querySelector('form.form-inline');
            return (f && !(panel && panel.contains(f))) ? f : null;
          }
          function mountSearch() {
            var host = panel.querySelector('.tv-sm-formhost');
            if (!host) return;
            var f = realSearchForm();
            if (f && f.parentNode) {
              searchOrigin = { parent: f.parentNode, next: f.nextSibling, form: f };
              host.appendChild(f);
            } else {
              host.innerHTML = '<input id="tv-sm-q" type="text" autocomplete="off" placeholder="' + esc(T('Search videos or wrestlers', '動画・選手を検索')) + '">';
            }
          }
          function unmountSearch() {
            if (searchOrigin && searchOrigin.parent) {
              try { searchOrigin.parent.insertBefore(searchOrigin.form, (searchOrigin.next && searchOrigin.next.parentNode === searchOrigin.parent) ? searchOrigin.next : null); } catch (e) {}
            }
            searchOrigin = null;
          }
          function searchInput() {
            return panel ? panel.querySelector('.tv-sm-formhost input[type="text"], .tv-sm-formhost input.form-control, .tv-sm-formhost input[name="q[keyword]"], .tv-sm-formhost input:not([type="submit"]):not([type="hidden"])') : null;
          }

          function items() {
            if (!panel) return [];
            return Array.prototype.filter.call(panel.querySelectorAll('.tv-sm-item'), function(el) {
              return el.offsetParent !== null || el.getClientRects().length > 0;
            });
          }
          function focusItem(el) {
            if (!el) return;
            if (el.classList && el.classList.contains('tv-sm-search')) { var si = searchInput(); if (si) el = si; }
            try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
            try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
          }
          function move(d) {
            var list = items();
            var cur = document.activeElement;
            var curRow = cur && cur.closest ? cur.closest('.tv-sm-item') : null;
            var i = list.indexOf(curRow || cur);
            if (i < 0) i = 0; else i = Math.max(0, Math.min(list.length - 1, i + d));
            focusItem(list[i]);
          }
          function collapseAll(except) {
            Array.prototype.forEach.call(panel.querySelectorAll('.tv-sm-grp.tv-sm-expanded'), function(g) {
              if (g !== except) g.classList.remove('tv-sm-expanded');
            });
          }

          function openMenu() {
            if (isOpen) return;
            ensureDom();
            // never stay hidden by a page sweep (the search box lives in here while the menu is open)
            if (panel.dataset.tvHidden) { delete panel.dataset.tvHidden; }
            panel.style.removeProperty('display');
            build();
            mountSearch();
            prevFocus = document.activeElement;
            isOpen = true;
            document.documentElement.classList.add('tv-sm-open');
            lsSet(HINT_KEY, '99');
            var hint = document.getElementById('tv-sm-hint');
            if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
            setNativeFlag(true);
            learnXlat();
            setTimeout(function() { focusItem(items()[2] || items()[0]); }, 30);
          }
          function closeMenu() {
            if (!isOpen) return false;
            closeShelf(false);
            isOpen = false;
            unmountSearch();
            document.documentElement.classList.remove('tv-sm-open');
            setNativeFlag(false);
            try { if (document.activeElement && panel && panel.contains(document.activeElement)) document.activeElement.blur(); } catch (e) {}
            var back = prevFocus;
            if (back && back.isConnected) {
              try { back.focus({ preventScroll: true }); } catch (e) { try { back.focus(); } catch (e2) {} }
            }
            return true;
          }
          window.__tvMenuClose = function() { if (shelfEl) { closeShelf(true); return true; } return closeMenu(); };
          window.__tvOpenMenu = openMenu;
          // After a language switch: bring the menu straight back (focus on the language switch) while the page loads behind it.
          (function() {
            var t0 = parseInt(lsGet(REOPEN_KEY) || '0', 10) || 0;
            if (!t0) return;
            try { localStorage.removeItem(REOPEN_KEY); } catch (e) {}
            if (Date.now() - t0 > 20000) return;
            var tries = 0, done = false;
            function focusLang() {
              var l = panel && panel.querySelector('.tv-sm-lang');
              if (l && isOpen && !(panel.contains(document.activeElement) && document.activeElement === l)) focusItem(l);
            }
            var iv = setInterval(function() {
              tries++;
              if (document.body && !done) { done = true; openMenu(); setTimeout(focusLang, 80); }
              if (isOpen && (tries === 15 || tries === 40)) focusLang();
              if (tries > 40) clearInterval(iv);
            }, 100);
          })();

          function go(rel) {
            closeMenu();
            window.location.href = /^https?:/.test(rel) ? rel : (BASE + rel);
          }

          function submitSearch() {
            var q = searchInput();
            var v = q ? q.value.trim() : '';
            if (!v) return false;
            closeMenu();
            window.location.href = BASE + '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(v);
            return true;
          }

          // ---- shelf flyout (to the right of the menu)
          var shelfEl = null, shelfRow = null;
          function fiHtml(label, path) {
            return '<a class="tv-sm-fi" tabindex="0" data-go="' + esc(path) + '" href="' + esc(absUrl(path)) + '">' + esc(label) + '</a>';
          }
          function rowsHtml(rows) {
            return rows.map(function(r) { return fiHtml(isJa() && r[2] ? r[2] : r[0], r[1]); }).join('');
          }
          function shelfBody(key) {
            var h = '', w = 760;
            if (key === 'shows') {
              h = '<div class="tv-shl-t">' + esc(T('SHOWS', '番組')) + '</div><div class="tv-shl-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));">' + rowsHtml(showsList()) + '</div>';
            } else if (key === 'years') {
              w = 400;
              h = '<div class="tv-shl-t">' + esc(T('YEARS', '年別')) + '</div><div class="tv-shl-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));text-align:center;">' + rowsHtml(yearsList()) + '</div>';
            } else if (key === 'factions') {
              w = 858;
              var blocks = '';
              try {
                var d = JSON.parse(AndroidHost.factionsJson());
                var facs = (d.factions || []).slice().sort(function(a, b) { return String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }); });
                var seen = {};
                facs.forEach(function(f) {
                  var ms = (f.members || []).slice().sort(function(a, b) { return String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }); });
                  var inner = '';
                  ms.forEach(function(m) {
                    if (!m || !m.name || seen[m.name]) return;
                    seen[m.name] = 1;
                    inner += fiHtml(isJa() && JA_NAMES[m.name] ? JA_NAMES[m.name] : m.name, '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(m.search || m.name));
                  });
                  if (inner) blocks += '<div class="tv-shl-blk"><div class="tv-shl-h">' + esc(String(f.name).toUpperCase()) + '</div>' + inner + '</div>';
                });
              } catch (e) {}
              if (!blocks) blocks = rowsHtml(wrestlers(CURRENT_W));
              h = '<div class="tv-shl-t">' + esc(T('FACTIONS', 'ユニット')) + '</div><div class="tv-shl-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:2px 10px;">' + blocks + '</div>';
            } else if (key === 'current') {
              w = 880;
              var crow = currentWrestlers().slice().sort(function(a, b) { return a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }); });
              h = '<div class="tv-shl-t">' + esc(T('CURRENT WRESTLERS', '現役選手')) + '</div><div style="column-count:4;column-gap:10px;">' + rowsHtml(crow) + '</div>';
            } else if (key === 'past') {
              w = 880;
              var rows = wrestlers(PAST_W).slice().sort(function(a, b) { return a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }); });
              h = '<div class="tv-shl-t">' + esc(T('PAST WRESTLERS', '元所属選手')) + '</div><div style="column-count:4;column-gap:10px;">' + rowsHtml(rows) + '</div>';
            }
            else {
              var lists = { home: [T('HOME', 'ホーム'), homeList()], champs: [T('CHAMPIONSHIPS', '王座'), CHAMPS], mine: [T('MY VIDEOS', 'マイビデオ'), MINE], community: [T('COMMUNITY', 'みんなの動画'), COMMUNITY], acct: [T('ACCOUNT', 'アカウント'), null] };
              var L = lists[key];
              if (L) {
                w = (key === 'champs' || key === 'home') ? 440 : 360;
                var body = '';
                if (key === 'acct') {
                  (window.__tvMenuAcct || []).forEach(function(l, i) { body += '<a class="tv-sm-fi" tabindex="0" data-acctlink="' + i + '">' + esc(xl(l.label)) + '</a>'; });
                } else body = rowsHtml(L[1]);
                h = '<div class="tv-shl-t">' + esc(L[0]) + '</div><div>' + body + '</div>';
              }
            }
            return { html: h, width: w };
          }
          function fiItems() { return shelfEl ? Array.prototype.slice.call(shelfEl.querySelectorAll('.tv-sm-fi')) : []; }
          function closeShelf(refocus) {
            if (shelfEl && shelfEl.parentNode) shelfEl.parentNode.removeChild(shelfEl);
            shelfEl = null;
            var r = shelfRow; shelfRow = null;
            if (refocus && r && r.isConnected) focusItem(r);
          }
          function openShelf(key, row) {
            closeShelf(false);
            var b = shelfBody(key);
            if (!b.html) return;
            shelfRow = row;
            shelfEl = document.createElement('div');
            shelfEl.id = 'tv-sm-shelf';
            shelfEl.setAttribute('translate', 'no');
            shelfEl.classList.add('notranslate');
            shelfEl.innerHTML = b.html;
            shelfEl.style.width = Math.min(b.width, window.innerWidth - 430 - 16) + 'px';
            shelfEl.style.maxHeight = (window.innerHeight - 24) + 'px';
            document.body.appendChild(shelfEl);
            var rr = row.getBoundingClientRect();
            shelfEl.style.top = Math.max(12, Math.min(rr.top, window.innerHeight - shelfEl.offsetHeight - 12)) + 'px';
            var list = fiItems(), first = list[0];
            list.forEach(function(a) { try { if (new URL(a.href).pathname + new URL(a.href).search === location.pathname + location.search) first = a; } catch (e) {} });
            if (first) focusItem(first);
          }
          function shelfMove(dir) {
            var list = fiItems(), cur = document.activeElement;
            if (list.indexOf(cur) === -1) { if (list[0]) focusItem(list[0]); return true; }
            var cr = cur.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
            var best = null, bs = 1e9;
            list.forEach(function(it) {
              if (it === cur) return;
              var r = it.getBoundingClientRect();
              var dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy, prim, orth;
              if (dir === 'down') { if (dy <= 4) return; prim = dy; orth = Math.abs(dx); }
              else if (dir === 'up') { if (dy >= -4) return; prim = -dy; orth = Math.abs(dx); }
              else if (dir === 'right') { if (dx <= 4) return; prim = dx; orth = Math.abs(dy); }
              else { if (dx >= -4) return; prim = -dx; orth = Math.abs(dy); }
              var sc = prim + orth * 2;
              if (sc < bs) { bs = sc; best = it; }
            });
            if (best) { focusItem(best); return true; }
            return false;
          }
          function activate(el) {
            if (el.getAttribute('data-shelf')) { openShelf(el.getAttribute('data-shelf'), el); return; }
            if (el.getAttribute('data-grp')) {
              var g = el.parentNode;
              var was = g.classList.contains('tv-sm-expanded');
              collapseAll(null);
              if (!was) { g.classList.add('tv-sm-expanded'); }
              focusItem(el);
              return;
            }
            if (el.getAttribute('data-homegrp')) {
              var hg2 = el.parentNode, hw2 = hg2.classList.contains('tv-sm-expanded');
              collapseAll(null);
              if (!hw2) hg2.classList.add('tv-sm-expanded');
              focusItem(el);
              return;
            }
            if (el.getAttribute('data-go')) { go(el.getAttribute('data-go')); return; }

            if (el.getAttribute('data-lang')) {
              var next = isJa() ? 'en' : 'ja';
              // the page reloads in the new language; the menu is opened again as soon as the new page appears
              lsSet(REOPEN_KEY, String(Date.now()));
              if (window.AndroidHost && typeof window.AndroidHost.toggleLanguage === 'function') window.AndroidHost.toggleLanguage(next);
              return;
            }
            if (el.getAttribute('data-acctlink')) {
              var l = (window.__tvMenuAcct || [])[parseInt(el.getAttribute('data-acctlink'), 10)];
              closeMenu();
              if (l && l.el) l.el.click();
              return;
            }
            if (el.getAttribute('data-acct')) {
              var key = document.querySelector('.box-dropdown-key');
              closeMenu();
              if (key) key.click(); else window.location.href = BASE + '/mypage';
              return;
            }
          }

          function stop(e) { e.preventDefault(); e.stopPropagation(); }



          function cardRect(a) {
            var c = a.closest('.content-list-item, article') || a;
            return c.getBoundingClientRect();
          }
          function atLeftEdge(ae) {
            if (!ae || ae === document.body || ae === document.documentElement) return true;
            if (ae.classList.contains('tv-hero-card')) return true;   // Left on the banner opens the menu (Right still changes slides)
            if (ae.classList.contains('tv-card')) return !ae.previousElementSibling;
            if (ae.classList.contains('tv-thumbnail-link')) {
              var r = cardRect(ae);
              var min = r.left;
              Array.prototype.forEach.call(document.querySelectorAll('a.tv-thumbnail-link'), function(a) {
                if (a.closest('.slick-cloned')) return;
                var rr = cardRect(a);
                if (rr.width > 0 && rr.height > 0 && Math.abs(rr.top - r.top) < r.height && rr.left < min) min = rr.left;
              });
              return r.left <= min + 12;
            }
            return false;
          }

          window.addEventListener('keydown', function(e) {
            var k = e.keyCode;
            if (isOpen && shelfEl) {
              if (k === 40) { stop(e); shelfMove('down'); }
              else if (k === 38) { stop(e); shelfMove('up'); }
              else if (k === 39) { stop(e); shelfMove('right'); }
              else if (k === 37) { stop(e); if (!shelfMove('left')) closeShelf(true); }
              else if (k === 27) { stop(e); closeShelf(true); }
              else if (k === 13 || k === 23 || k === 32) {
                var fa = document.activeElement;
                if (fa && fa.classList && fa.classList.contains('tv-sm-fi')) {
                  stop(e);
                  if (fa.getAttribute('data-acctlink')) { var al = fa.getAttribute('data-acctlink'); closeShelf(false); activate({ getAttribute: function(n) { return n === 'data-acctlink' ? al : null; } }); }
                  else go(fa.getAttribute('data-go'));
                }
              }
              return;
            }
            if (!isOpen) {
              if (k !== 37) return;
              var ae0 = document.activeElement;
              var tag = ae0 && ae0.tagName;
              if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
              if (isDetail() && !(ae0 && ae0.classList && (ae0.classList.contains('tv-thumbnail-link') || ae0.classList.contains('tv-card')))) return;
              if (atLeftEdge(ae0)) { stop(e); openMenu(); }
              return;
            }
            var ae = document.activeElement;
            var inInput = !!(ae && ae.tagName === 'INPUT' && ae.type !== 'submit' && ae.closest && ae.closest('.tv-sm-search'));
            if (k === 40) { stop(e); move(1); return; }
            if (k === 38) { stop(e); move(-1); return; }
            if (k === 39) {
              if (inInput && ae.value && ae.selectionStart < ae.value.length) return;   // let the cursor move inside typed text
              if (ae && ae.getAttribute && ae.getAttribute('data-homegrp')) {
                stop(e);
                var hg = ae.parentNode, hwas = hg.classList.contains('tv-sm-expanded');
                collapseAll(null);
                if (!hwas) hg.classList.add('tv-sm-expanded');
                return;
              }
              if (ae && ae.getAttribute && ae.getAttribute('data-shelf')) { stop(e); openShelf(ae.getAttribute('data-shelf'), ae); return; }
              stop(e); closeMenu(); return;
            }
            if (k === 37) {
              if (inInput && ae.value && ae.selectionStart > 0) return;
              stop(e);
              if (ae && ae.classList && ae.classList.contains('tv-sm-sub')) {
                var par = ae.parentNode.parentNode;
                var head = par && par.firstElementChild;
                if (head) { par.classList.remove('tv-sm-expanded'); focusItem(head); }
              } else if (ae && ae.parentNode && ae.parentNode.classList && ae.parentNode.classList.contains('tv-sm-expanded')) {
                ae.parentNode.classList.remove('tv-sm-expanded');
              }
              return;
            }
            if (k === 27) { stop(e); closeMenu(); return; }
            if (k === 13 || k === 23 || k === 32 && !inInput) {
              if (inInput) return;   // the site's own search box: OK opens the keyboard, Enter searches, as it always did
              if (ae && panel && panel.contains(ae)) { stop(e); activate(ae); }
            }
          }, true);

          // The always-visible edge tab and the first-launch hint.
          function addCues() {
            if (document.getElementById('tv-sm-tab')) return;
            var host = document.body || document.documentElement;
            var tab = document.createElement('div');
            tab.id = 'tv-sm-tab';
            tab.setAttribute('aria-hidden', 'true');
            tab.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4C242" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
            host.appendChild(tab);
            var shown = parseInt(lsGet(HINT_KEY) || '0', 10) || 0;
            if (isHome() && shown < 3) {
              lsSet(HINT_KEY, String(shown + 1));
              var hint = document.createElement('div');
              hint.id = 'tv-sm-hint';
              hint.className = 'notranslate';
              hint.setAttribute('translate', 'no');
              hint.textContent = '◀  ' + T('Press Left for the menu', '左キーでメニュー');
              host.appendChild(hint);
              setTimeout(function() { hint.style.opacity = '0'; }, 12000);
              setTimeout(function() { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 13000);
            }
          }
          // The "New" entry in Shows opens wherever the home page's New row sends its View All tile: remembered
          // from the home page, which is where that row is drawn.
          function rememberNewHref() {
            var grid = document.getElementById('tv-test-grid');
            if (!grid) return false;
            var rows = grid.querySelectorAll('.tv-grid-row');
            if (!rows.length) return false;
            var tiles = rows[0].querySelectorAll('a.tv-card.notranslate');
            var last = tiles.length ? tiles[tiles.length - 1] : null;
            if (last && last.href) lsSet(NEW_KEY, last.href);
            // every row the site draws on the home page (not the app's own Recently Watched / Favorites rows) with its View All address
            var list = [];
            Array.prototype.forEach.call(rows, function(row) {
              var wrap = row.parentNode;
              if (!wrap || wrap.id) return;
              var h2 = wrap.querySelector('h2');
              var title = h2 ? (h2.textContent || '').replace(/\s+/g, ' ').trim() : '';
              var t2 = row.querySelectorAll('a.tv-card.notranslate');
              var va = t2.length ? t2[t2.length - 1] : null;
              if (title && va && va.href) list.push([title, va.href]);
            });
            if (list.length) {
              // keep an English and a Japanese name per row: the page shows whichever language it is in when it is read
              var prev = {};
              try { (JSON.parse(lsGet(HOME_ROWS_KEY) || '[]') || []).forEach(function(r) { prev[r[1]] = r; }); } catch (e) {}
              lsSet(HOME_ROWS_KEY, JSON.stringify(list.map(function(r) {
                var pr = prev[r[1]], en = null, ja = null;
                if (pr) { var pj = pr[2] || pr[0]; if (hasJa(pr[0])) ja = pr[0]; else { en = pr[0]; if (hasJa(pj)) ja = pj; } }
                if (hasJa(r[0])) ja = r[0]; else en = r[0];
                return [en || ja, r[1], ja || en];
              })));
            }
            return true;
          }
          if (isHome()) {
            var nhTries = 0;
            var nhTimer = setInterval(function() {
              nhTries++;
              if (rememberNewHref() || nhTries > 40) clearInterval(nhTimer);
            }, 1000);
            // once the page has been translated, read the rows again to learn the other language's names
            setTimeout(rememberNewHref, 8000);
            setTimeout(rememberNewHref, 16000);
          }
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addCues);
          else addCues();

          // A page title in the home-row style (gold bar + large white text) at the top of every destination page.
          function pageTitleText() {
            var loc = location;
            var params = new URLSearchParams(loc.search);
            var h1 = document.querySelector('h1.ttl-lg, .box-content > h1, h1');
            var h1t = h1 ? (h1.textContent || '').replace(/\s+/g, ' ').trim() : '';
            var docT = (document.title || '').replace(/\s*[|\uFF5C\-]\s*Stardom World.*$/i, '').trim();
            var fallback = (h1t && !/^(search|検索結果?|検索)$/i.test(h1t)) ? h1t : docT;
            var all = [].concat(showsList(), homeRows(), staticHomeRows(), CHAMPS, MINE, COMMUNITY, wrestlers(CURRENT_W), wrestlers(PAST_W), yearsList());
            for (var i = 0; i < all.length; i++) {
              var u = new URL(all[i][1], BASE);
              if (u.pathname !== loc.pathname) continue;
              if (u.pathname === '/contents/search') {
                var up = u.searchParams;
                if ((up.get('s') || '') !== (params.get('s') || '')) continue;
                if ((up.get('q[keyword]') || '') !== (params.get('q[keyword]') || '')) continue;
              }
              return isJa() ? (all[i][2] || fallback) : all[i][0];
            }
            if (isJa()) return fallback;
            var kw = params.get('q[keyword]');
            if (loc.pathname === '/contents/search' && kw) return 'Search: ' + kw;
            return fallback;
          }
          function addPageTitle() {
            var p = location.pathname;
            if (isHome() || isDetail() || p.indexOf('/login') === 0) return true;
            if (!document.body) return false;
            var el = document.getElementById('tv-page-title');
            var txt = pageTitleText();
            if (!txt) return false;
            if (!el) {
              el = document.createElement('div');
              el.id = 'tv-page-title';
              el.className = 'notranslate';
              el.setAttribute('translate', 'no');
              el.innerHTML = '<span class="tv-pt-bar"></span><span class="tv-pt-txt"></span>';
              document.body.insertBefore(el, document.body.firstChild);
            }
            var t = el.querySelector('.tv-pt-txt');
            if (t.textContent !== txt) t.textContent = txt;
            // line the title up with the left edge of the first video card
            var card = document.querySelector('a.tv-thumbnail-link');
            var c = card ? (card.closest('.content-list-item, article') || card) : null;
            var left = c ? c.getBoundingClientRect().left + window.scrollX : 0;
            el.style.paddingLeft = (left > 16 ? left : 40) + 'px';
            return true;
          }
          var ptTries = 0;
          var ptTimer = setInterval(function() {
            ptTries++;
            addPageTitle();
            if (ptTries > 25) clearInterval(ptTimer);
          }, 800);
        })();
    """.trimIndent()

    // Video (detail) pages: a title bar above the player, and Up from the first row of related videos to the player.
    private val playerPageJs = """
        (function(){
          if (window.__tvPlayerPage) return;
          if (!/^\/contents\/[0-9]+/.test(location.pathname)) return;
          window.__tvPlayerPage = true;

          function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
          function playerFrame() { return document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]'); }
          function focusPlayer() {
            var f = playerFrame();
            if (!f) return false;
            try { f.focus(); } catch (e) {}
            try { f.scrollIntoView({ block: 'center' }); } catch (e) {}
            return true;
          }
          function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }

          // After leaving full screen the player's picture can stay offset inside its frame until the frame is
          // resized; nudge the frame's width and put it back so the player lays itself out again.
          window.__tvRefitPlayer = function() {
            var f = playerFrame();
            if (!f) return;
            try { window.dispatchEvent(new Event('resize')); } catch (e) {}
            var w = f.style.width;
            var r = f.getBoundingClientRect();
            if (r.width < 10) return;
            f.style.width = Math.round(r.width - 2) + 'px';
            setTimeout(function() {
              f.style.width = w;
              try { window.dispatchEvent(new Event('resize')); } catch (e) {}
            }, 150);
          };

          var st = document.createElement('style');
          st.id = 'tv-player-style';
          st.textContent = [
            '#tv-player-bar{display:flex;align-items:center;gap:22px;box-sizing:border-box;padding:30px 40px 20px 40px;background:#000000;font-family:Arial,Helvetica,sans-serif;color:#ffffff;}',
            '#tv-player-bar .tv-pb-bar{flex:0 0 auto;width:10px;height:42px;background:#F4C242;}',
            '#tv-player-bar .tv-pb-title{font:400 32px Arial,Helvetica,sans-serif;line-height:1.2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
          ].join('\n');
          (document.head || document.documentElement).appendChild(st);

          function titleText() {
            var el = document.querySelector('.content-ttl-wrap h1, .content-ttl-wrap h2, h1.ttl-lg, h1, h2.ttl-md');
            var t = el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
            var d = (document.title || '').replace(/\s*[|｜\-]\s*Stardom World.*$/i, '').trim();
            return t || d;
          }

          var bar = null;
          function addBar() {
            if (!document.body) return;
            if (!bar) {
              bar = document.createElement('div');
              bar.id = 'tv-player-bar';
              bar.innerHTML = '<span class="tv-pb-bar"></span><span class="tv-pb-title"></span>';
              document.body.insertBefore(bar, document.body.firstChild);
            }
            var tt = bar.querySelector('.tv-pb-title');
            var txt = titleText();
            if (txt && tt.textContent !== txt) tt.textContent = txt;
          }
          addBar();
          var barTries = 0;
          var barTimer = setInterval(function() { barTries++; addBar(); if (barTries > 40) clearInterval(barTimer); }, 1000);

          // Up from the first row of related videos goes to the player.
          window.addEventListener('keydown', function(e) {
            if (e.keyCode !== 38 || menuOpen()) return;
            var ae = document.activeElement;
            if (!ae || !ae.classList || !(ae.classList.contains('tv-thumbnail-link') || ae.classList.contains('tv-card'))) return;
            var c = ae.closest('.content-list-item, article, a.tv-card') || ae;
            var fr = c.getBoundingClientRect();
            var above = false;
            Array.prototype.forEach.call(document.querySelectorAll('a.tv-thumbnail-link, .tv-related-row a.tv-card'), function(a) {
              if (a.closest('.slick-cloned')) return;
              var cc = a.closest('.content-list-item, article, a.tv-card') || a;
              var r = cc.getBoundingClientRect();
              if (r.width > 0 && r.height > 0 && fr.top - r.top > fr.height * 0.5) above = true;
            });
            if (above) return;
            if (window.__tvFocusBar && window.__tvFocusBar()) { e.preventDefault(); e.stopPropagation(); }
            else if (focusPlayer()) { e.preventDefault(); e.stopPropagation(); }
          }, true);
        })();
    """.trimIndent()

    // Video pages: every related-videos row is rebuilt with the same markup and styles as the main page rows
    // (so the main page's own keyboard handling drives it: one card per press, focus follows the scroll,
    // View All as the last tile). The site's carousel stays in the page, hidden, because play-next reads it.
    private val relatedRowJs = """
        (function(){
          if (window.__tvRelatedRows) return;
          if (!/^\/contents\/[0-9]+/.test(location.pathname)) return;
          window.__tvRelatedRows = true;

          var st = document.createElement('style');
          st.textContent = '.box-related-content.tv-related-done > .ttl-wrap, .box-related-content.tv-related-done > .content-list{display:none !important;}';
          (document.head || document.documentElement).appendChild(st);

          // Same values as the main page rows.
          var cardCss = 'flex:0 0 calc(25% - 18px); max-width:calc(25% - 18px); background:#1a1a1a; border-radius:8px; overflow:hidden; cursor:pointer; box-sizing:border-box; text-decoration:none; display:block;';
          var imgCss = 'width:100%; aspect-ratio:16/9; height:auto; min-height:165px; background:#222; background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; color:#FFD700; font-size:20px; font-weight:bold; border-radius:8px 8px 0 0;';
          var titleCss = 'word-break:normal; overflow-wrap:break-word; hyphens:none; padding:12px 14px; color:#fff; font-size:15px; font-weight:bold; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; line-height:1.45em; min-height:5.8em; max-height:6.2em; box-sizing:border-box;';

          function esc(t) {
            return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          }
          function clean(txt) {
            return String(txt || '').replace(/月額見放題/g, '')
              .replace(/Unlimited viewing for a monthly fee/gi, '')
              .replace(/Monthly subscription available/gi, '')
              .replace(/Monthly subscription/gi, '')
              .replace(/Registration date\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '')
              .replace(/登録日\s*[:：]?\s*\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/gi, '')
              .replace(/Registration date\s*[:：]?/gi, '')
              .replace(/登録日\s*[:：]?/g, '')
              .replace(/\d{4}[\/\.\-]\d{2}[\/\.\-]\d{2}/g, '')
              .replace(/\s+/g, ' ').trim();
          }

          function build(sec) {
            var c = sec.querySelector('.js-list-slide');
            if (!c) return false;
            var items = Array.from(c.querySelectorAll('.content-list-item')).filter(function(el) {
              return !el.classList.contains('slick-cloned') && !el.closest('.slick-cloned');
            });
            var cards = [];
            var seen = {};
            items.forEach(function(item) {
              var link = item.querySelector('a[href*="/contents/"], a[href*="/set/"]');
              if (!link || !link.href || seen[link.href]) return;
              seen[link.href] = true;
              var thumbInner = item.querySelector('.content-thumbnail-box-inner, [style*="background-image"]');
              var imgEl = item.querySelector('img');
              var titleBox = item.querySelector('h3, .ttl-xs, .content-info-box');
              var bg = '';
              if (thumbInner) {
                var b = thumbInner.style.backgroundImage || getComputedStyle(thumbInner).backgroundImage;
                var m = b && b.match(/url\(['"]?(.*?)['"]?\)/);
                if (m && m[1]) bg = m[1];
              }
              if (!bg && imgEl) bg = imgEl.src;
              cards.push({ href: link.href, title: clean(titleBox ? titleBox.textContent : '') || 'Stardom World Video', bg: bg });
            });
            if (!cards.length) return false;

            var head = sec.querySelector('.ttl-wrap h2, .ttl-md');
            var title = head ? (head.textContent || '').replace(/\s+/g, ' ').trim() : '';
            var all = sec.querySelector('.ttl-wrap > a[href]');
            var ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;

            var html = '<h2 tabindex="-1" style="display:flex !important; align-items:center; color:#ffffff !important; font-family:Arial,Helvetica,sans-serif !important; font-size:22px; line-height:1.2; margin:0 0 14px 0; font-weight:700 !important; outline:none !important; user-select:none !important;"><span style="display:block; flex:0 0 auto; width:8px; height:26px; background:#F4C242; margin-right:12px;"></span><span>' + esc(title) + '</span></h2>' +
              '<div class="tv-grid-row" style="display:flex; flex-direction:row; gap:24px; overflow-x:auto; scroll-behavior:smooth; padding:12px 10px; margin:0 -10px;">';
            cards.forEach(function(it) {
              var bgStyle = it.bg ? 'background-image:url(' + esc(it.bg) + ');' : '';
              html += '<a class="tv-card" tabindex="0" href="' + esc(it.href) + '" style="' + cardCss + '"><div style="' + imgCss + ' ' + bgStyle + '"></div><div style="' + titleCss + '">' + esc(it.title) + '</div></a>';
            });
            if (all && all.href) {
              html += '<a class="tv-card notranslate" tabindex="0" href="' + esc(all.href) + '" style="flex:0 0 calc(25% - 18px); max-width:calc(25% - 18px); box-sizing:border-box; border-radius:8px; background:#11171E; border:2px solid #2a323c; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-decoration:none; cursor:pointer; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:24px; font-weight:bold; min-height:165px;"><span>' + (ja ? 'すべて見る' : 'View All') + '</span><span style="color:#F4C242; font-size:34px; line-height:1;">&#8594;</span></a>';
            }
            html += '</div>';

            var wrap = document.createElement('div');
            wrap.className = 'tv-related-row';
            wrap.style.cssText = 'margin-bottom:35px;';
            wrap.innerHTML = html;
            sec.classList.add('tv-related-done');
            sec.insertBefore(wrap, sec.firstChild);
            return true;
          }

          var started = Date.now();
          var timer = setInterval(function() {
            var secs = Array.from(document.querySelectorAll('.box-related-content')).filter(function(s) { return !s.classList.contains('tv-related-done'); });
            var elapsed = Date.now() - started;
            // The first carousel is reversed and re-initialised by another script within about 4 seconds; wait for it.
            if (!window.__tvReverseCarouselDone && elapsed < 4600) return;
            secs.forEach(function(s) { build(s); });
            if (elapsed > 12000) clearInterval(timer);
          }, 500);
        })();
    """.trimIndent()

    // Video pages: the player's control bar under the picture. Same buttons, labels and actions as the full screen
    // bar (the app supplies them: AndroidHost.barIds / barLabels / barAction), in one compact row. Focus lives on
    // these buttons, not inside the player frame, so Left/Right can never wander off into the player's hidden controls.
    private val playerBarJs = """
        (function(){
          if (window.__tvPlayerBar) return;
          if (!/^\/(contents|set)\/[0-9]+/.test(location.pathname)) return;
          if (!window.AndroidHost || !AndroidHost.barIds) return;
          window.__tvPlayerBar = true;

          var ACCENT = '${BAR_ACCENT}', DARK = '${BAR_TEXT_ON_ACCENT}', RADIUS = '${BAR_RADIUS_DP}px';
          var ids = [];
          try { ids = JSON.parse(AndroidHost.barIds()); } catch (e) {}
          if (!ids.length) return;

          var st = document.createElement('style');
          st.textContent =
            '#tv-pbar{display:flex;align-items:center;gap:14px;box-sizing:border-box;height:64px;padding:0 14px;margin:0 0 14px 0;background:rgba(0,0,0,0.8);border:none;border-radius:0 0 6px 6px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;}' +
            '#tv-pbar .tv-pb-time{flex:0 0 auto;font-size:14px;white-space:nowrap;}' +
            '#tv-pbar .tv-pb-track{flex:1 1 0;min-width:60px;height:8px;border-radius:4px;background:#3b4656;position:relative;overflow:hidden;}' +
            '#tv-pbar .tv-pb-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:' + ACCENT + ';}' +
            '#tv-pbar .tv-pb-btns{flex:0 0 auto;display:flex;gap:6px;align-items:center;}' +
            '#tv-pbar button.tv-pbtn{margin:0;padding:8px 12px;border-radius:' + RADIUS + ';background:rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.53);color:#ffffff;font:700 15px Arial,Helvetica,sans-serif;white-space:nowrap;cursor:pointer;outline:none;}' +
            '#tv-pbar button.tv-pbtn:focus{background:' + ACCENT + ';border-color:' + ACCENT + ';color:' + DARK + ';}' +
            '#tv-pskip{position:fixed;z-index:2147483000;display:none;flex-direction:column;gap:4px;padding:10px;border-radius:12px;background:rgba(0,0,0,0.88);border:2px solid rgba(255,255,255,0.25);font:700 15px Arial,Helvetica,sans-serif;color:#c9d2dc;}' +
            '#tv-pskip div{padding:5px 14px;border-radius:8px;white-space:nowrap;text-align:center;}' +
            '#tv-pskip div.on{background:' + ACCENT + ';color:' + DARK + ';}' +
            '.tv-nb, .tv-nb:focus{border:0 !important;box-shadow:none !important;outline:0 !important;}';
          (document.head || document.documentElement).appendChild(st);

          function playerFrame() { return document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]'); }
          function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }

          var bar = null, timeEl = null, fillEl = null, btns = {}, lastId = 'play';

          var buildTries = 0;
          function build() {
            var f = playerFrame();
            if (!f || !f.parentElement) return false;
            // The bar goes right above the related-videos section: the player's own wrapper can clip anything
            // placed inside it (it is a fixed-ratio box), which cut the bar off. Wait briefly for the section.
            var sec = document.querySelector('.box-related-content');
            if (!sec && ++buildTries < 8) return false;
            f.setAttribute('tabindex', '-1');   // the frame itself is never a keyboard stop
            // No thin outlines around the player or its wrappers.
            var n = f, depth = 0;
            while (n && n !== document.body && depth < 6) { n.classList.add('tv-nb'); n = n.parentElement; depth++; }
            bar = document.createElement('div');
            bar.id = 'tv-pbar';
            var html = '<span class="tv-pb-time">0:00 / 0:00</span><span class="tv-pb-track"><span class="tv-pb-fill"></span></span><span class="tv-pb-btns">';
            ids.forEach(function(id) { html += '<button type="button" class="tv-pbtn notranslate" translate="no" data-id="' + id + '"></button>'; });
            bar.innerHTML = html + '</span>';
            if (sec && sec.parentElement) sec.parentElement.insertBefore(bar, sec);
            else {
              var host = f.parentElement;
              host.insertAdjacentElement('afterend', bar);
            }
            timeEl = bar.querySelector('.tv-pb-time');
            fillEl = bar.querySelector('.tv-pb-fill');
            Array.prototype.forEach.call(bar.querySelectorAll('button.tv-pbtn'), function(b) {
              btns[b.getAttribute('data-id')] = b;
              b.addEventListener('focus', function() { lastId = b.getAttribute('data-id'); });
              b.addEventListener('click', function(e) { e.preventDefault(); act(b.getAttribute('data-id')); });
            });
            fit();
            refresh();
            return true;
          }

          // The bar is exactly as wide as, and lined up with, the picture above it.
          function fit() {
            var f = playerFrame();
            if (!bar || !f) return;
            var r = f.getBoundingClientRect();
            if (r.width < 50) return;
            bar.style.width = Math.round(r.width) + 'px';
            // Close the gap the player's wrapper leaves under the picture.
            bar.style.marginTop = '0px';
            var gap = bar.getBoundingClientRect().top - r.bottom;
            bar.style.marginTop = (gap > 1 ? -Math.round(gap) : 0) + 'px';
            bar.style.marginLeft = '0px';
            var bl = bar.getBoundingClientRect().left;
            bar.style.marginLeft = Math.max(0, Math.round(r.left - bl)) + 'px';
          }

          function fmt(sec) {
            sec = Math.max(0, Math.floor(sec || 0));
            var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
            return (h > 0 ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (s < 10 ? '0' : '') + s;
          }

          function refresh() {
            if (!bar) return;
            try { if (window.__tvRefreshStatus) window.__tvRefreshStatus(); } catch (e) {}
            var json = window.__tvStatusJson || '';
            var labels = {};
            try { labels = JSON.parse(AndroidHost.barLabels(json)); } catch (e) {}
            ids.forEach(function(id) { if (labels[id] && btns[id].textContent !== labels[id]) btns[id].textContent = labels[id]; });
            if (json) {
              try {
                var j = JSON.parse(json);
                timeEl.textContent = fmt(j.t) + ' / ' + fmt(j.d);
                fillEl.style.width = (j.d > 0 ? Math.min(100, j.t / j.d * 100) : 0) + '%';
              } catch (e) {}
            }
          }

          var skipBox = null, skipTimer = 0;
          function showSkip(info, anchor) {
            if (!skipBox) { skipBox = document.createElement('div'); skipBox.id = 'tv-pskip'; document.body.appendChild(skipBox); }
            skipBox.innerHTML = '';
            // Largest at the top, so Up = bigger and Down = smaller, as on the remote.
            for (var i = info.sizes.length - 1; i >= 0; i--) {
              var d = document.createElement('div');
              d.textContent = info.sizes[i];
              if (i === info.idx) d.className = 'on';
              skipBox.appendChild(d);
            }
            skipBox.style.display = 'flex';
            var r = anchor.getBoundingClientRect();
            var h = skipBox.offsetHeight, w = skipBox.offsetWidth;
            skipBox.style.left = Math.max(8, Math.round(r.left + r.width / 2 - w / 2)) + 'px';
            skipBox.style.top = Math.max(8, Math.round(r.top - h - 10)) + 'px';
            clearTimeout(skipTimer);
            skipTimer = setTimeout(function() { if (skipBox) skipBox.style.display = 'none'; }, 2500);
          }

          function act(id) {
            try { AndroidHost.barAction(id); } catch (e) {}
            setTimeout(refresh, 300);
          }

          window.__tvFocusBar = function(id) {
            var b = btns[id || lastId] || btns[ids[0]];
            if (!b) return false;
            try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
            // Title, picture and bar all fit on screen together, so show the page from the top.
            try { window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
            return true;
          };

          function firstCard() {
            return document.querySelector('.tv-related-row a.tv-card, a.tv-thumbnail-link');
          }

          document.addEventListener('keydown', function(e) {
            if (menuOpen()) return;
            var ae = document.activeElement;
            if (!ae || !ae.classList || !ae.classList.contains('tv-pbtn')) return;
            var k = e.keyCode;
            var i = ids.indexOf(ae.getAttribute('data-id'));
            var did = ae.getAttribute('data-id');
            if ((k === 38 || k === 40) && (did === 'back' || did === 'fwd') && AndroidHost.skipStep) {
              // Up / Down on -/+: choose the skip size (Up = bigger, Down = smaller); OK skips by it.
              e.preventDefault(); e.stopPropagation();
              var info = null;
              try { info = JSON.parse(AndroidHost.skipStep(k === 38 ? 1 : -1)); } catch (x) {}
              refresh();
              if (info) showSkip(info, ae);
              return;
            }
            if (k === 39) {                       // Right: next button, stops at the last
              e.preventDefault(); e.stopPropagation();
              if (i < ids.length - 1) btns[ids[i + 1]].focus();
            } else if (k === 37) {                // Left: previous button; before the first, the menu
              e.preventDefault(); e.stopPropagation();
              if (i > 0) btns[ids[i - 1]].focus();
              else if (window.__tvOpenMenu) window.__tvOpenMenu();
            } else if (k === 38) {                // Up: nothing above the bar
              e.preventDefault(); e.stopPropagation();
            } else if (k === 40) {                // Down: on to the first related video
              var c = firstCard();
              if (c) {
                e.preventDefault(); e.stopPropagation();
                try { c.focus({ preventScroll: true }); } catch (x) { c.focus(); }
                try { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {}
              }
            } else if (k === 13 || k === 23) {
              e.preventDefault(); e.stopPropagation();
              act(ae.getAttribute('data-id'));
            }
          }, true);

          var tries = 0, focused = false;
          var timer = setInterval(function() {
            tries++;
            if (!bar) { build(); }
            else {
              fit();
              if (!focused) {
                focused = true;
                var ae = document.activeElement;
                if (!ae || ae === document.body || ae.tagName === 'IFRAME') window.__tvFocusBar('play');
              }
            }
            if (tries > 120) clearInterval(timer);
          }, 500);
          setInterval(function() { if (bar && !document.hidden) refresh(); }, 500);
          window.addEventListener('resize', fit);
        })();
    """.trimIndent()

    // Factions page: reached from the menu's Factions entry (a search page address carrying "tvfaction=<id>").
    // The faction's members are listed on the left (they stay put); OK or Right on one loads that member's videos
    // into a grid on the right, one page at a time as the remote reaches the bottom. The names come from the
    // app's factions.json; nothing is requested until a member is chosen, and never more than one request at once.
    private val factionJs = """
(function(){
  if (window.__tvFaction) return;
  var mm = /[?&]tvfaction=([A-Za-z0-9_-]+)/.exec(location.search);
  if (!mm || location.pathname.indexOf('/contents/search') !== 0) return;
  if (!window.AndroidHost || !AndroidHost.factionsJson) return;
  var data = null;
  try { data = JSON.parse(AndroidHost.factionsJson()); } catch (e) {}
  var fac = null;
  ((data && data.factions) || []).forEach(function(f) { if (f.id === mm[1]) fac = f; });
  if (!fac || !fac.members || !fac.members.length) return;
  window.__tvFaction = true;
  window.__tvInfiniteScroll = true;   // the site's own result list is not used; this page loads its own pages
  var logoSrc = '';
  try { logoSrc = AndroidHost.factionLogo(fac.id) || ''; } catch (e) {}

  var GAP_MS = 1200;                 // pause between two requests to the site
  var CACHE_KEY = 'tvFacCacheV1', BLOCK_KEY = 'tvFacBlockUntilV1';
  var CACHE_TTL = 12 * 3600 * 1000;
  var MAX_SAVED = 40;                // videos kept per member on the TV (the first pages only)

  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function clean(t) {
    return (t || '').replace(/月額見放題/g, '')
      .replace(/Unlimited viewing for a monthly fee/gi, '')
      .replace(/Monthly subscription available/gi, '')
      .replace(/Monthly subscription/gi, '')
      .replace(/\s+/g, ' ').trim();
  }

  var st = document.createElement('style');
  st.textContent = [
    '#tv-fac{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B0F14;color:#ffffff;display:flex;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-fac, #tv-fac *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;}',
    '#tv-fac-nav{flex:0 0 330px;box-sizing:border-box;padding:30px 20px 20px 30px;display:flex;flex-direction:column;min-height:0;border-right:1px solid #222b36;}',
    '#tv-fac .tv-fh-brandwrap{display:flex;justify-content:center;align-items:center;margin:0 0 16px 0;}',
    '#tv-fac .tv-fh-brand{max-width:100%;max-height:130px;object-fit:contain;}',
    '#tv-fac .tv-fh{display:flex;align-items:center;gap:14px;margin:0 0 18px 8px;min-height:48px;}',
    '#tv-fac .tv-fh-bar{flex:0 0 auto;width:8px;align-self:stretch;min-height:40px;background:#F4C242;}',
    '#tv-fac .tv-fh-name{min-width:0;font-size:26px;font-weight:700;line-height:1.15;white-space:normal;}',
    '#tv-fac-members{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:none;padding:2px;}',
    '#tv-fac-members::-webkit-scrollbar{display:none;}',
    '#tv-fac .tv-fm{display:flex;align-items:center;box-sizing:border-box;min-height:50px;margin:3px 0;padding:0 14px;font-size:22px;font-weight:600;color:#c9d2dc;border:3px solid transparent;border-left:6px solid transparent;border-radius:8px;outline:none !important;cursor:pointer;}',
    '#tv-fac .tv-fm.tv-sel{color:#F4C242;border-left-color:#F4C242;}',
    '#tv-fac .tv-fm:focus{background:#172029;border-color:#F4C242;color:#ffffff;box-shadow:none !important;}',
    '#tv-fac-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;min-height:0;}',
    '#tv-fac-title{display:flex;align-items:center;gap:14px;padding:30px 40px 6px 40px;font-size:28px;font-weight:700;}',
    '#tv-fac-title .tv-ft-bar{width:8px;height:32px;background:#F4C242;}',
    '#tv-fac-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 40px 40px 30px;scrollbar-width:none;}',
    '#tv-fac-scroll::-webkit-scrollbar{display:none;}',
    '#tv-fac-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;}',
    '#tv-fac .tv-fc{display:flex;flex-direction:column;text-decoration:none !important;color:#ffffff !important;border-radius:8px;background:#172029;outline:none !important;border:3px solid transparent;overflow:hidden;box-sizing:border-box;}',
    '#tv-fac .tv-fc:focus{border-color:#FFB347;box-shadow:0 0 0 3px rgba(255,179,71,.35) !important;}',
    '#tv-fac .tv-fc-img{width:100%;aspect-ratio:16/9;background:#222 center/cover no-repeat;}',
    '#tv-fac .tv-fc-t{padding:10px 12px 12px 12px;font-size:17px;line-height:1.3;max-height:3.9em;overflow:hidden;}',
    '#tv-fac-status{padding:26px 6px;font-size:20px;color:#9aa6b4;text-align:center;}',
    '#tv-fac-empty{flex:1 1 auto;display:none;align-items:center;justify-content:center;}',
    '#tv-fac.tv-empty #tv-fac-empty{display:flex;}',
    '#tv-fac.tv-empty #tv-fac-title, #tv-fac.tv-empty #tv-fac-scroll{display:none;}',
    '#tv-fac .tv-em{max-width:560px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:22px;padding:0 30px;}',
    '#tv-fac .tv-em-name{font-size:44px;font-weight:700;line-height:1.15;}',
    '#tv-fac .tv-em-text{font-size:24px;color:#c9d2dc;line-height:1.4;}',
    '#tv-fac .tv-em-hint{padding:10px 22px;border-radius:28px;background:#172029;border:2px solid #2a323c;font-size:18px;font-weight:700;color:#F4C242;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  // ------------------------------------------------------------------ data
  var members = fac.members;
  var S = [];                       // per member: { items, seen, page, more, loaded, err }
  members.forEach(function() { S.push({ items: [], seen: {}, page: 0, more: true, loaded: false, err: '' }); });
  var sel = -1;                     // no member is opened until one is chosen
  var seedIdx = 0;                  // the member whose results the opened page itself holds
  var kw = /[?&]q%5Bkeyword%5D=([^&]*)/i.exec(location.search) || /[?&]q\[keyword\]=([^&]*)/i.exec(location.search);
  if (kw) {
    var want = ''; try { want = decodeURIComponent(kw[1].replace(/\+/g, ' ')); } catch (e) {}
    members.forEach(function(m, i) { if (m.search === want) seedIdx = i; });
  }

  function readCache() { try { return JSON.parse(lsGet(CACHE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeCache(term, s) {
    var c = readCache();
    c[term] = { t: Date.now(), items: s.items.slice(0, MAX_SAVED), more: s.more };
    var keys = Object.keys(c);
    if (keys.length > 80) {
      keys.sort(function(a, b) { return c[a].t - c[b].t; });
      for (var i = 0; i < keys.length - 80; i++) delete c[keys[i]];
    }
    lsSet(CACHE_KEY, JSON.stringify(c));
  }

  function parseCards(doc) {
    var scope = doc.querySelector('.content-list, [class*="content-list"]') || doc;
    var nodes = scope.querySelectorAll('.content-list-item, article');
    var out = [], seen = {};
    Array.prototype.forEach.call(nodes, function(item) {
      if (item.closest && item.closest('.slick-cloned')) return;
      var link = item.querySelector('a[href*="/contents/"], a[href*="/set/"]');
      if (!link) return;
      var href = absUrl(link.getAttribute('href') || '');
      if (!href || seen[href]) return;
      seen[href] = true;
      var bg = '';
      var th = item.querySelector('[style*="background-image"]');
      if (th) {
        var m = (th.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/);
        if (m && m[1]) bg = m[1];
      }
      if (!bg) {
        var img = item.querySelector('img');
        if (img) bg = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || img.getAttribute('src') || '';
      }
      if (bg.indexOf('data:') === 0) bg = '';
      if (bg) bg = absUrl(bg);
      var tEl = item.querySelector('h3, h4, .ttl-xs, .content-title, .content-info-box');
      var title = clean(tEl ? tEl.textContent : item.textContent) || 'Stardom World Video';
      out.push({ href: href, title: title, bgUrl: bg });
    });
    return out;
  }
  function hasNext(doc) {
    return !!doc.querySelector('a[rel="next"], .pagination a.next, .pagination .next a, li.next a');
  }

  // ------------------------------------------------------------------ requests: one at a time, spaced out
  var busy = false, lastReq = 0;
  function blockedFor() {
    var until = parseInt(lsGet(BLOCK_KEY) || '0', 10) || 0;
    return until > Date.now() ? Math.ceil((until - Date.now()) / 60000) : 0;
  }
  function blockNow(mins) { lsSet(BLOCK_KEY, String(Date.now() + mins * 60000)); }

  function fetchPage(term, page, cb) {
    var url = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(term) + (page > 1 ? '&page=' + page : '');
    fetch(url, { credentials: 'include' }).then(function(res) {
      if (res.status === 429 || res.status === 403 || res.status === 503) { blockNow(10); throw 'blocked'; }
      if (!res.ok) throw 'http';
      if (res.redirected && /login|sign_in|signin/.test(res.url)) throw 'login';
      return res.text();
    }).then(function(html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var items = parseCards(doc);
      if (!items.length && /captcha|verify you are human|are you a robot/i.test(html)) { blockNow(10); throw 'blocked'; }
      var more = hasNext(doc) || items.length >= 12;
      cb('', items, more);
    }).catch(function(err) { cb(typeof err === 'string' ? err : 'error'); });
  }

  // Loads the next page of member i (the first one when nothing is loaded yet). done(newItems) afterwards.
  function loadNext(i, done) {
    var s = S[i];
    if (s.loading) return;
    if (busy) { setTimeout(function() { loadNext(i, done); }, 400); return; }
    if (!s.more && s.loaded) { if (done) done([]); return; }
    var wait = blockedFor();
    if (wait) { s.err = 'blocked'; if (done) done([]); return; }
    // first page: the saved copy, if fresh, costs no request
    if (!s.loaded) {
      var c = readCache()[members[i].search];
      if (c && c.items && c.items.length && Date.now() - c.t < CACHE_TTL) {
        c.items.forEach(function(it) { if (!s.seen[it.href]) { s.seen[it.href] = 1; s.items.push(it); } });
        s.page = 1; s.more = !!c.more; s.loaded = true; s.err = '';
        if (done) done(s.items.slice());
        return;
      }
    }
    s.loading = true; busy = true;
    var go = function() {
      lastReq = Date.now();
      fetchPage(members[i].search, s.page + 1, function(err, items, more) {
        s.loading = false; busy = false;
        if (err) { s.err = err; if (done) done([]); return; }
        s.err = '';
        var added = [];
        items.forEach(function(it) { if (!s.seen[it.href]) { s.seen[it.href] = 1; s.items.push(it); added.push(it); } });
        s.page += 1; s.loaded = true;
        s.more = more && added.length > 0;
        if (s.page === 1) writeCache(members[i].search, s);
        if (done) done(added);
      });
    };
    var gap = lastReq + GAP_MS - Date.now();
    if (gap > 0) setTimeout(go, gap); else go();
  }

  // ------------------------------------------------------------------ page
  var root = document.createElement('div');
  root.id = 'tv-fac';
  var head = '';
  // Builds that may show logos: the logo, centered, above the name; the name is laid out the same either way.
  if (logoSrc) head += '<div class="tv-fh-brandwrap"><img class="tv-fh-brand" src="' + esc(logoSrc) + '" alt=""></div>';
  head += '<div class="tv-fh"><span class="tv-fh-bar"></span><div class="tv-fh-name notranslate" translate="no">' + esc(fac.name) + '</div></div>';
  var mh = '';
  members.forEach(function(m, i) {
    mh += '<div class="tv-fm notranslate" translate="no" tabindex="0" role="button" data-i="' + i + '">' + esc(m.name) + '</div>';
  });
  root.innerHTML =
    '<div id="tv-fac-nav">' + head + '<div id="tv-fac-members">' + mh + '</div></div>' +
    '<div id="tv-fac-main"><div id="tv-fac-title"><span class="tv-ft-bar"></span><span id="tv-fac-name" class="notranslate" translate="no"></span></div>' +
    '<div id="tv-fac-scroll"><div id="tv-fac-grid"></div><div id="tv-fac-status"></div></div>' +
    '<div id="tv-fac-empty"><div class="tv-em"><div class="tv-em-name notranslate" translate="no">' + esc(fac.name) + '</div>' +
    '<div class="tv-em-text">' + esc(T('Choose a wrestler on the left to see their videos.', '\u5de6\u306e\u9078\u624b\u3092\u9078\u3093\u3067\u52d5\u753b\u3092\u898b\u307e\u3057\u3087\u3046\u3002')) + '</div>' +
    '<div class="tv-em-hint">\u2190 ' + esc(T('Up / Down to browse, OK or Right to open', '\u4e0a\u4e0b\u3067\u9078\u629e\u3001OK\u304b\u53f3\u3067\u958b\u304f')) + '</div></div></div></div>';
  root.classList.add('tv-empty');
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';
  var logoImg = root.querySelector('.tv-fh-brand'); // not named *logo*: the app's header-logo swap would replace it
  if (logoImg) logoImg.addEventListener('error', function() {
    var w = logoImg.parentNode;
    if (w && w.parentNode) w.parentNode.removeChild(w);
  });

  var nav = root.querySelector('#tv-fac-members');
  var grid = root.querySelector('#tv-fac-grid');
  var status = root.querySelector('#tv-fac-status');
  var scroller = root.querySelector('#tv-fac-scroll');
  var nameEl = root.querySelector('#tv-fac-name');
  var fmEls = Array.prototype.slice.call(root.querySelectorAll('.tv-fm'));

  function cardHtml(it) {
    return '<a class="tv-fc" tabindex="0" href="' + esc(it.href) + '"><div class="tv-fc-img" style="' + (it.bgUrl ? 'background-image:url(' + esc(it.bgUrl) + ');' : '') + '"></div><div class="tv-fc-t">' + esc(it.title) + '</div></a>';
  }
  function cards() { return Array.prototype.slice.call(grid.children); }
  function setStatus(i) {
    var s = S[i];
    var t = '';
    if (s.loading) t = T('Loading...', '読み込み中...');
    else if (s.err === 'blocked') t = T('The site asked us to slow down. Try again in a few minutes.', 'サイトからアクセス制限がかかりました。数分後にお試しください。');
    else if (s.err === 'login') t = T('Please log in to see these videos.', 'ログインしてください。');
    else if (s.err) t = T('Could not load. Press OK on the name to try again.', '読み込めませんでした。名前でOKを押して再試行。');
    else if (s.loaded && !s.items.length) t = T('No videos found for this name.', '動画が見つかりませんでした。');
    status.textContent = t;
  }
  function renderGrid() {
    var s = S[sel];
    var h = '';
    s.items.forEach(function(it) { h += cardHtml(it); });
    grid.innerHTML = h;
    scroller.scrollTop = 0;
    setStatus(sel);
  }
  function markSel() {
    fmEls.forEach(function(el, i) { el.classList.toggle('tv-sel', i === sel); });
    root.classList.toggle('tv-empty', sel < 0);
    nameEl.textContent = sel >= 0 ? members[sel].name : '';
  }
  function focusEl(el, mode) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: mode || 'nearest' }); } catch (e) {}
  }
  function focusNav() { focusEl(fmEls[sel >= 0 ? sel : 0]); }
  window.__tvFacFocusNav = function() { focusNav(); };
  window.__tvFacBase = function() { return sel >= 0 ? members[sel].search : ''; };
  function inNav(el) { return !!(el && el.classList && el.classList.contains('tv-fm')); }
  function inGrid(el) { return !!(el && el.classList && el.classList.contains('tv-fc')); }

  function cols() {
    var c = grid.children;
    if (!c.length) return 1;
    var top = c[0].offsetTop, n = 0;
    while (n < c.length && c[n].offsetTop === top) n++;
    return Math.max(1, n);
  }

  function more(i) {
    var s = S[i];
    if (s.loading || s.queued || !s.more || !s.loaded) return;
    s.queued = true;
    status.textContent = T('Loading...', '\u8aad\u307f\u8fbc\u307f\u4e2d...');
    loadNext(i, function(added) {
      s.queued = false;
      if (i !== sel) return;
      if (added.length) {
        var h = ''; added.forEach(function(it) { h += cardHtml(it); });
        grid.insertAdjacentHTML('beforeend', h);
      }
      setStatus(i);
    });
  }

  // Opens member i: its saved/loaded videos at once, or one request when it has never been opened.
  function openMember(i, enter) {
    sel = i;
    markSel();
    var s = S[i];
    if (s.err && !s.loaded) { s.err = ''; }
    if (s.loaded) {
      renderGrid();
      if (enter) { var f = grid.firstElementChild; if (f) focusEl(f, 'center'); }
      return;
    }
    grid.innerHTML = '';
    status.textContent = T('Loading...', '読み込み中...');
    loadNext(i, function() {
      if (i !== sel) return;
      renderGrid();
      var ae = document.activeElement;
      if (enter && (inNav(ae) || !ae || ae === document.body)) { var f2 = grid.firstElementChild; if (f2) focusEl(f2, 'center'); }
    });
  }

  // ------------------------------------------------------------------ keys
  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-fac') || menuOpen()) return;
    var k = e.keyCode, ae = document.activeElement;
    var stop = function() { e.preventDefault(); e.stopImmediatePropagation(); };
    if (inNav(ae)) {
      var i = parseInt(ae.getAttribute('data-i'), 10);
      if (k === 40) { stop(); if (i < fmEls.length - 1) focusEl(fmEls[i + 1]); }
      else if (k === 38) { stop(); if (i > 0) focusEl(fmEls[i - 1]); }
      else if (k === 39) { stop(); openMember(i, true); }
      else if (k === 37) { stop(); if (window.__tvOpenMenu) window.__tvOpenMenu(); }
      else if (k === 13 || k === 23) { stop(); openMember(i, false); }
      return;
    }
    if (inGrid(ae)) {
      var list = cards(), idx = list.indexOf(ae), n = cols();
      if (k === 37) {
        stop();
        if (idx % n === 0) focusNav(); else focusEl(list[idx - 1]);
      } else if (k === 39) {
        stop();
        if (idx < list.length - 1 && (idx + 1) % n !== 0) focusEl(list[idx + 1]);
      } else if (k === 38) {
        stop();
        if (idx - n >= 0) focusEl(list[idx - n], 'nearest');
        else if (!(window.__tvFacFocusBar && window.__tvFacFocusBar())) scroller.scrollTop = 0;
      } else if (k === 40) {
        stop();
        var row = Math.floor(idx / n), last = Math.floor((list.length - 1) / n);
        if (row < last) focusEl(list[Math.min(idx + n, list.length - 1)], 'nearest');
        else if (S[sel].more) more(sel);
      }
      // Prefetch the next page while the last two rows are on screen
      if ((k === 38 || k === 39 || k === 40) && S[sel].more && !S[sel].loading) {
        var nowIdx = cards().indexOf(document.activeElement);
        if (nowIdx >= 0 && cards().length - nowIdx <= n * 2) more(sel);
      }
    }
  }, true);

  // ------------------------------------------------------------------ start
  markSel();
  // The page that was just opened holds one member's first page of results: keep it as that member's saved copy
  // (shown with no request if that member is chosen later). Nothing is drawn or loaded until a member is chosen.
  (function seedQuietly() {
    var c0 = readCache()[members[seedIdx].search];
    if (c0 && c0.items && c0.items.length && Date.now() - c0.t < CACHE_TTL) return;
    var n = 0;
    (function poll() {
      var items = [];
      try { items = parseCards(document); } catch (e) {}
      n++;
      if (items.length) {
        var s = { items: items.slice(0, MAX_SAVED), more: items.length >= 12 || hasNext(document) };
        writeCache(members[seedIdx].search, s);
      } else if (n <= 8) setTimeout(poll, 300);
    })();
  })();
  var tries = 0;
  var tm = setInterval(function() {
    tries++;
    var ae = document.activeElement;
    if (menuOpen() || inNav(ae) || inGrid(ae)) { if (tries > 6) clearInterval(tm); return; }
    focusNav();
    if (tries > 10) clearInterval(tm);
  }, 300);
})();
    """.trimIndent()

    // Recently Watched page: reached from the menu or the home row's View All (the My page address carrying
    // "tvrecent=1"). It takes the viewing history that page already holds and draws it as a full video grid,
    // like My Favorites, instead of the My page layout. No extra request is made.
    private val recentPageJs = """
(function(){
  if (window.__tvRecentPage) return;
  if (location.pathname !== '/mypage' || !/[?&]tvrecent=1/.test(location.search)) return;
  window.__tvRecentPage = true;

  var HISTORY_RE = /viewing history|視聴履歴|閲覧履歴|履歴/i;
  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function menuOpen() { return document.documentElement.classList.contains('tv-sm-open'); }
  function absUrl(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
  function clean(t) {
    return (t || '').replace(/月額見放題/g, '')
      .replace(/Unlimited viewing for a monthly fee/gi, '')
      .replace(/Monthly subscription available/gi, '')
      .replace(/Monthly subscription/gi, '')
      .replace(/(Viewing date|視聴日時|視聴日)\s*[:：]?\s*[0-9.\/\- :]*/gi, '')
      .replace(/\s+/g, ' ').trim();
  }

  // The video cards listed under the "Viewing history" heading of this very page (no extra request).
  function readHistory() {
    var heads = Array.prototype.slice.call(document.querySelectorAll('h1, h2, h3, h4, h5, .ttl-md, .ttl-lg'));
    var hi = -1;
    for (var i = 0; i < heads.length; i++) {
      if (root && root.contains(heads[i])) continue;
      if (HISTORY_RE.test(heads[i].textContent || '')) { hi = i; break; }
    }
    if (hi < 0) return [];
    var head = heads[hi], nextHead = null;
    for (var j = hi + 1; j < heads.length; j++) {
      if (root && root.contains(heads[j])) continue;
      if (!heads[j].closest('.content-list-item, article')) { nextHead = heads[j]; break; }
    }
    var out = [], seen = {};
    Array.prototype.forEach.call(document.querySelectorAll('.content-list-item, article'), function(item) {
      if (root && root.contains(item)) return;
      if (item.closest('.slick-cloned')) return;
      if (!(head.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      if (nextHead && !(nextHead.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_PRECEDING)) return;
      var link = item.querySelector('a[href*="/contents/"], a[href*="/set/"]');
      if (!link) return;
      var href = absUrl(link.getAttribute('href') || '');
      if (!href || seen[href]) return;
      seen[href] = true;
      var bg = '';
      var th = item.querySelector('[style*="background-image"]');
      if (th) {
        var m = (th.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/);
        if (m && m[1]) bg = m[1];
      }
      if (!bg) {
        var img = item.querySelector('img');
        if (img) bg = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || img.getAttribute('src') || '';
      }
      if (bg.indexOf('data:') === 0) bg = '';
      if (bg) bg = absUrl(bg);
      var tEl = item.querySelector('h3, h4, .ttl-xs, .content-title, .content-info-box');
      var title = clean(tEl ? tEl.textContent : item.textContent) || 'Stardom World Video';
      out.push({ href: href, title: title, bgUrl: bg });
    });
    return out;
  }

  var st = document.createElement('style');
  st.textContent = [
    '#tv-rp{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99000;background:#0B0F14;color:#ffffff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-rp, #tv-rp *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;}',
    '#tv-rp-title{flex:0 0 auto;display:flex;align-items:center;gap:18px;padding:22px 40px 12px 40px;font-size:36px;}',
    '#tv-rp-title .tv-rp-bar{flex:0 0 auto;width:12px;height:44px;background:#F4C242;}',
    '#tv-rp-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 40px 40px 40px;scrollbar-width:none;}',
    '#tv-rp-scroll::-webkit-scrollbar{display:none;}',
    '#tv-rp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;}',
    '#tv-rp .tv-rc{display:flex;flex-direction:column;text-decoration:none !important;color:#ffffff !important;border-radius:8px;background:#172029;outline:none !important;border:3px solid transparent;overflow:hidden;box-sizing:border-box;}',
    '#tv-rp .tv-rc:focus{border-color:#FFB347;box-shadow:0 0 0 3px rgba(255,179,71,.35) !important;}',
    '#tv-rp .tv-rc-img{width:100%;aspect-ratio:16/9;background:#222 center/cover no-repeat;}',
    '#tv-rp .tv-rc-t{padding:10px 12px 12px 12px;font-size:17px;line-height:1.3;max-height:3.9em;overflow:hidden;}',
    '#tv-rp-status{padding:40px 6px;font-size:22px;color:#9aa6b4;text-align:center;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  var root = document.createElement('div');
  root.id = 'tv-rp';
  root.innerHTML =
    '<div id="tv-rp-title"><span class="tv-rp-bar"></span><span class="notranslate" translate="no">' + esc(T('Recently Watched', '最近視聴した動画')) + '</span></div>' +
    '<div id="tv-rp-scroll"><div id="tv-rp-grid"></div><div id="tv-rp-status">' + esc(T('Loading...', '読み込み中...')) + '</div></div>';
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = 'hidden';
  var grid = root.querySelector('#tv-rp-grid');
  var status = root.querySelector('#tv-rp-status');
  var scroller = root.querySelector('#tv-rp-scroll');

  function cards() { return Array.prototype.slice.call(grid.children); }
  function cols() {
    var c = grid.children;
    if (!c.length) return 1;
    var top = c[0].offsetTop, n = 0;
    while (n < c.length && c[n].offsetTop === top) n++;
    return Math.max(1, n);
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }

  var shown = false;
  function render(items) {
    shown = true;
    var h = '';
    items.forEach(function(it) {
      h += '<a class="tv-rc" tabindex="0" href="' + esc(it.href) + '"><div class="tv-rc-img" style="' + (it.bgUrl ? 'background-image:url(' + esc(it.bgUrl) + ');' : '') + '"></div><div class="tv-rc-t">' + esc(it.title) + '</div></a>';
    });
    grid.innerHTML = h;
    status.textContent = items.length ? '' : T('No viewing history yet.', '視聴履歴はまだありません。');
    if (items.length) focusEl(grid.firstElementChild);
  }

  // The list may be drawn by the page's own script a moment after it loads: wait until it stops growing.
  var tries = 0, lastCount = -1;
  var tm = setInterval(function() {
    tries++;
    var items = [];
    try { items = readHistory(); } catch (e) {}
    if ((items.length && items.length === lastCount) || tries > 24) {
      clearInterval(tm);
      render(items);
      return;
    }
    lastCount = items.length;
  }, 400);

  window.addEventListener('keydown', function(e) {
    if (!document.getElementById('tv-rp') || menuOpen()) return;
    var k = e.keyCode, ae = document.activeElement;
    if (!ae || !ae.classList || !ae.classList.contains('tv-rc')) {
      if (shown && (k === 37 || k === 38 || k === 39 || k === 40) && grid.firstElementChild) {
        e.preventDefault(); e.stopImmediatePropagation();
        focusEl(grid.firstElementChild);
      } else if (k === 37) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (window.__tvOpenMenu) window.__tvOpenMenu();
      }
      return;
    }
    var list = cards(), idx = list.indexOf(ae), n = cols();
    var stop = function() { e.preventDefault(); e.stopImmediatePropagation(); };
    if (k === 37) {
      stop();
      if (idx % n === 0) { if (window.__tvOpenMenu) window.__tvOpenMenu(); } else focusEl(list[idx - 1]);
    } else if (k === 39) {
      stop();
      if (idx < list.length - 1 && (idx + 1) % n !== 0) focusEl(list[idx + 1]);
    } else if (k === 38) {
      stop();
      if (idx - n >= 0) focusEl(list[idx - n]); else scroller.scrollTop = 0;
    } else if (k === 40) {
      stop();
      var row = Math.floor(idx / n), last = Math.floor((list.length - 1) / n);
      if (row < last) focusEl(list[Math.min(idx + n, list.length - 1)]);
    }
  }, true);
})();
    """.trimIndent()

    // Filter bar on search pages (wrestler pages, keyword searches): replaces the site sort row with Sort, Match type,
    // Championship, Competitors and Year drop-downs. Each choice only adds words to the keyword search.
    private val filterBarJs = """
(function(){
  if (window.__tvFilterBar) return;
  var CHAMP_PAGES = { '/contents/category/iwgp': 'iwgp', '/contents/category/world-sd': 'world', '/contents/category/wonder-sd': 'wonder', '/contents/category/high_speed': 'highspeed' };
  var champCat = CHAMP_PAGES[location.pathname.replace(/\/+$/, '')] || '';
  var YM = /^\/contents\/category\/(20[0-9]{2}|_2020)\/?$/.exec(location.pathname);
  var yearCat = YM ? (YM[1] === '_2020' ? '2020' : YM[1]) : '';
  var FAC_MODE = /[?&]tvfaction=/.test(location.search);
  if (location.pathname.indexOf('/contents/search') !== 0 && !champCat && !yearCat) return;
  if (/[?&](tvrecent|tvev)=/.test(location.search)) return;
  window.__tvFilterBar = true;

  // Every choice just adds words to the site's own keyword search and opens that page: one request per
  // choice, same as opening any list. The lists below are fixed, so opening a drop-down loads nothing.
  var MT = [
    ['single', 'Single match', 'Single Match'],
    ['tag', 'Tag team', 'Tag Team'],
    ['trio', '3-way', '3-Way'],
    ['six', '6-person', '6-person'],
    ['eight', '8-person', '8-person'],
    ['eightman', '8-man', '8-man'],
    ['royal', 'Battle royal', 'Battle Royal'],
    ['cage', 'Cage match', 'Cage Match']
  ];
  var CH = [
    ['any', 'Any championship match', 'Championship'],
    ['artist', 'Artist of Stardom', 'Artist of Stardom'],
    ['future', 'Future of Stardom', 'Future of Stardom'],
    ['goddess', 'Goddess of Stardom', 'Goddess of Stardom'],
    ['highspeed', 'High-Speed', 'High-Speed Championship'],
    ['iwgp', "IWGP Women's", "IWGP Women's"],
    ['newblood', 'NEW BLOOD Tag Team', 'NEW BLOOD'],
    ['wonder', 'Wonder of Stardom', 'Wonder of Stardom'],
    ['world', 'World of Stardom', 'World of Stardom'],
    ['other', 'Other title matches', 'Title Match']
  ];
  var SH = [], LO = [];
  try {
    var ED = (window.AndroidHost && AndroidHost.eventFiltersJson) ? JSON.parse(AndroidHost.eventFiltersJson()) : null;
    if (ED) {
      SH = (ED.shows || []).map(function(x) { return [x.name, x.name, x.search]; });
      (ED.locations || []).forEach(function(c) {
        LO.push(['c:' + c.name, c.name, c.search, 'city']);
        (c.venues || []).forEach(function(v) { LO.push(['v:' + v.name, v.name, v.search, 'venue']); });
      });
    }
  } catch (e) {}
  var YR = [];
  for (var y = new Date().getFullYear(); y >= 2011; y--) YR.push([String(y), String(y), y + '/']);

  var facs = [];
  try {
    var fd = JSON.parse(AndroidHost.factionsJson());
    facs = ((fd && fd.factions) || []).map(function(f) {
      return { id: f.id, name: f.name, members: (f.members || []).slice().sort(function(a, b) { return String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }); }) };
    }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name), 'en', { sensitivity: 'base' }); });
  } catch (e) {}

  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function qp(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
  }
  var kwNow = '';
  (function() {
    var m = /[?&]q(?:%5B|\[)keyword(?:%5D|\])=([^&]*)/i.exec(location.search);
    if (m) { try { kwNow = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { kwNow = m[1]; } }
  })();

  var S = {
    base: (champCat || yearCat || FAC_MODE) ? '' : (location.search.indexOf('tvb=') !== -1 ? qp('tvb') : kwNow),
    mt: qp('tvmt'), ch: champCat || qp('tvch'), co: qp('tvco'), yr: yearCat || qp('tvyr'), sh: qp('tvsh'), lo: qp('tvlo'),
    s: qp('s'), o: qp('o')
  };
  var SORTS = [
    ['', '', 'Newest'],
    ['di_s', 'a', 'Oldest'],
    ['pc', 'd', 'Most played'],
    ['fc', 'd', 'Most favorited']
  ];

  function wrestlerName(search) {
    var low = String(search || '').toLowerCase(), out = '';
    facs.forEach(function(f) { (f.members || []).forEach(function(m) { if (!out && String(m.search).toLowerCase() === low) out = m.name; }); });
    return out;
  }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i]; return null; }
  function buildUrl(n) {
    var words = [n.base];
    var a = find(MT, n.mt); if (a) words.push(a[2]);
    var b = find(CH, n.ch); if (b) words.push(b[2]);
    if (n.co && n.co !== n.base) words.push(n.co);
    var sh0 = find(SH, n.sh); if (sh0) words.push(sh0[2]);
    var lo0 = find(LO, n.lo); if (lo0) words.push(lo0[2]);
    var c = find(YR, n.yr); if (c) words.push(c[2]);
    var kw = words.filter(function(w) { return w; }).join(' ');
    if (!kw && !n.s) return '/';
    var u = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(kw);
    if (n.s) u += '&s=' + encodeURIComponent(n.s) + '&o=' + encodeURIComponent(n.o || 'd');
    u += '&activetab=contents&page=1';
    if (n.base && (n.mt || n.ch || n.co || n.yr || n.sh || n.lo)) u += '&tvb=' + encodeURIComponent(n.base);
    if (n.mt) u += '&tvmt=' + encodeURIComponent(n.mt);
    if (n.ch) u += '&tvch=' + encodeURIComponent(n.ch);
    if (n.co) u += '&tvco=' + encodeURIComponent(n.co);
    if (n.sh) u += '&tvsh=' + encodeURIComponent(n.sh);
    if (n.lo) u += '&tvlo=' + encodeURIComponent(n.lo);
    if (n.yr) u += '&tvyr=' + encodeURIComponent(n.yr);
    return u;
  }
  function go(patch) {
    var n = {};
    Object.keys(S).forEach(function(k) { n[k] = S[k]; });
    Object.keys(patch).forEach(function(k) { n[k] = patch[k]; });
    if (FAC_MODE && window.__tvFacBase) n.base = window.__tvFacBase();
    location.href = buildUrl(n);
  }

  var st = document.createElement('style');
  st.textContent = [
    'html body .box-sort{display:none !important;}',
    '#tv-fb{display:flex;flex-wrap:wrap;align-items:center;gap:12px 10px;margin:6px 0 18px 0;padding:0;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-fb .tv-fbb{box-sizing:border-box;padding:10px 14px;border-radius:10px;border:2px solid rgba(255,255,255,0.45);color:#ffffff;font-size:19px;font-weight:700;line-height:1.2;white-space:nowrap;background:transparent;cursor:pointer;outline:none !important;}',
    '#tv-fb .tv-fbb.tv-on{border-color:#F4C242;color:#F4C242;}',
    '#tv-fb .tv-fbb:focus, #tv-fb .tv-fbb.tv-open{background:#FFB347;border-color:#FFB347;color:#1A1A1A;box-shadow:none !important;}',
    '#tv-fbp{position:fixed;z-index:99100;box-sizing:border-box;padding:12px;border-radius:14px;background:#121922;border:2px solid #2a323c;font-family:Arial,Helvetica,sans-serif;color:#ffffff;max-height:calc(100vh - 40px);overflow-y:auto;scrollbar-width:none;}',
    '#tv-fbp::-webkit-scrollbar{display:none;}',
    '#tv-fbp .tv-fbi{box-sizing:border-box;padding:9px 14px;margin:2px 0;border-radius:8px;border:2px solid transparent;font-size:19px;font-weight:600;color:#c9d2dc;outline:none !important;cursor:pointer;white-space:nowrap;}',
    '#tv-fbp .tv-fbi{break-inside:avoid;}',
    '#tv-fbp.tv-flo .tv-fbi, #tv-fbp.tv-fsh .tv-fbi{white-space:normal;}',
    '#tv-fbp .tv-fblo{column-count:4;column-gap:14px;}',
    '#tv-fbp .tv-fbcity{break-inside:avoid;margin:0 0 10px 0;}',
    '#tv-fbp .tv-fbch{font-weight:700;color:#F4C242;font-size:17px;}',
    '#tv-fbp .tv-fbv{font-size:16px;padding:7px 8px 7px 22px;}',
    '#tv-fac-main #tv-fb{margin:6px 40px 12px 40px;}',
    '#tv-fac.tv-empty #tv-fb{display:none;}',
    '#tv-fbp .tv-fbi.tv-cur{color:#F4C242;}',
    '#tv-fbp .tv-fbi:focus{background:#172029;border-color:#F4C242;color:#ffffff;font-weight:700;box-shadow:none !important;}',
    '#tv-fbp .tv-fbh{padding:4px 6px 6px 6px;font-size:13px;line-height:15px;font-weight:700;letter-spacing:0;color:#F4C242;white-space:nowrap;}',
    '#tv-fbp .tv-fbcols{display:flex;gap:6px;width:max-content;min-width:100%;}',
    '#tv-fbp .tv-fbcol{flex:1 0 auto;}',
    '#tv-fbp .tv-fbcol .tv-fbi{font-size:15px;padding:7px 8px;white-space:nowrap;}',
    '#tv-fbp.tv-co{overflow-x:auto;overflow-y:auto;padding:10px;}',
    '#tv-fbc{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;margin:-6px 0 18px 0;padding:0;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-fbc .tv-fbl{font-size:17px;color:#9aa6b4;}',
    '#tv-fbc .tv-fbchip{box-sizing:border-box;padding:7px 14px;border-radius:20px;background:#172029;border:2px solid #3b4656;color:#ffffff;font-size:17px;font-weight:700;white-space:nowrap;outline:none !important;cursor:pointer;}',
    '#tv-fbc .tv-fbchip.tv-base{background:#FFB347;border-color:#FFB347;color:#1A1A1A;cursor:default;}',
    '#tv-fbc .tv-fbchip.tv-clr{background:transparent;border-color:transparent;color:#F4C242;}',
    '#tv-fbc .tv-fbchip:focus{background:#FFB347;border-color:#FFB347;color:#1A1A1A;box-shadow:none !important;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  var bar = null, btns = [], lastBtn = 0, panel = null, openBtn = null, prevClose = null;

  function labelFor(kind) {
    var cur, nm;
    if (kind === 'wr') {
      var wn = S.base ? wrestlerName(S.base) : '';
      if (wn) return { text: T('Wrestler', '選手') + ': ' + wn, on: true };
      if (S.base) return { text: T('Search', '検索') + ': ' + S.base, on: true };
      return { text: T('Wrestler', '選手'), on: false };
    }
    if (kind === 'sort') {
      nm = T('Sort', '並び替え');
      for (var i = 0; i < SORTS.length; i++) if (SORTS[i][0] === S.s && (SORTS[i][0] === '' || SORTS[i][1] === (S.o || 'd'))) { cur = SORTS[i]; break; }
      return { text: nm + ': ' + (cur ? T(cur[2], cur[2] === 'Newest' ? '新着順' : cur[2]) : T('Newest', '新着順')), on: !!S.s };
    }
    if (kind === 'mt') { cur = find(MT, S.mt); nm = T('Match type', '試合形式'); }
    if (kind === 'ch') { cur = find(CH, S.ch); nm = T('Championship', '選手権'); }
    if (kind === 'yr') { cur = find(YR, S.yr); nm = T('Year', '年'); }
    if (kind === 'co') { cur = S.co ? [S.co, S.co] : null; nm = T('Competitors', '出場選手'); }
    if (kind === 'sh') { cur = find(SH, S.sh); nm = T('Show', '大会名'); }
    if (kind === 'lo') { cur = find(LO, S.lo); nm = T('Location', '開催地'); }
    return { text: nm + (cur ? ': ' + cur[1] : ''), on: !!cur };
  }

  function mount() {
    if (document.getElementById('tv-fb')) return true;
    var anchor = FAC_MODE ? document.querySelector('#tv-fac-main #tv-fac-scroll') : (document.querySelector('.box-sort') || document.querySelector('.content-list, [class*="content-list"]'));
    if (!anchor || !anchor.parentNode) return false;
    bar = document.createElement('div');
    bar.id = 'tv-fb';
    var kinds = [];
    if (facs.length && !FAC_MODE) kinds.push('wr');
    kinds.push('sort', 'mt', 'ch');
    if (facs.length) kinds.push('co');
    if (SH.length) kinds.push('sh');
    if (LO.length) kinds.push('lo');
    kinds.push('yr');
    btns = [];
    kinds.forEach(function(k) {
      var b = document.createElement('div');
      b.className = 'tv-fbb';
      b.tabIndex = 0;
      b.setAttribute('role', 'button');
      b.setAttribute('data-k', k);
      b.addEventListener('click', function() { openPanel(b); });
      btns.push(b);
      bar.appendChild(b);
    });
    refreshLabels();
    anchor.parentNode.insertBefore(bar, anchor);
    if (FAC_MODE) {
      window.__tvFacFocusBar = function() { var b0 = btns[Math.min(lastBtn, btns.length - 1)] || btns[0]; if (b0) { b0.focus(); return true; } return false; };
      return true;
    }
    buildChips();
    return true;
  }
  var chipBar = null, chips = [];
  function buildChips() {
    var defs = [];
    var a = find(MT, S.mt); if (a) defs.push([a[1], { mt: '' }]);
    var b = find(CH, S.ch); if (b) defs.push([b[1], { ch: '' }]);
    if (S.co) defs.push([T('With ', '対戦: ') + S.co, { co: '' }]);
    var sh1 = find(SH, S.sh); if (sh1) defs.push([sh1[1], { sh: '' }]);
    var lo1 = find(LO, S.lo); if (lo1) defs.push([lo1[1], { lo: '' }]);
    var c = find(YR, S.yr); if (c) defs.push([c[1], { yr: '' }]);
    chips = [];
    var baseName = S.base ? (wrestlerName(S.base) || S.base) : '';
    if (!defs.length && !baseName) return;
    chipBar = document.createElement('div');
    chipBar.id = 'tv-fbc';
    var l = document.createElement('span');
    l.className = 'tv-fbl';
    l.textContent = T('Showing', '絞り込み');
    chipBar.appendChild(l);
    if (baseName) {
      var bc = document.createElement('div');
      bc.className = 'tv-fbchip tv-base';
      bc.textContent = baseName;
      chipBar.appendChild(bc);
    }
    function chip(text, patch, clr) {
      var d = document.createElement('div');
      d.className = 'tv-fbchip' + (clr ? ' tv-clr' : '');
      d.tabIndex = 0;
      d.setAttribute('role', 'button');
      d.textContent = text;
      d._fn = function() { go(patch); };
      d.addEventListener('click', d._fn);
      chips.push(d);
      chipBar.appendChild(d);
    }
    defs.forEach(function(x) { chip(x[0] + ' \u00D7', x[1], false); });
    if (defs.length) chip(T('Clear all', 'すべて解除'), { mt: '', ch: '', co: '', sh: '', lo: '', yr: '' }, true);
    bar.parentNode.insertBefore(chipBar, bar.nextSibling);
    setTimeout(alignBars, 0);
  }
  function refreshLabels() {
    btns.forEach(function(b) {
      var k = b.getAttribute('data-k');
      var l = labelFor(k);
      b.textContent = l.text + ' ▾';
      b.classList.toggle('tv-on', l.on);
    });
  }

  function closePanel(refocus) {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    if (openBtn) openBtn.classList.remove('tv-open');
    var b = openBtn; openBtn = null;
    if (prevClose) { window.__tvMenuClose = prevClose; prevClose = null; }
    try { if (window.AndroidHost && AndroidHost.setSideMenuOpen) AndroidHost.setSideMenuOpen(false); } catch (e) {}
    if (refocus && b) { try { b.focus(); } catch (e) {} }
  }

  function item(text, cur, fn) {
    var d = document.createElement('div');
    d.className = 'tv-fbi' + (cur ? ' tv-cur' : '');
    d.tabIndex = -1;
    d.textContent = text;
    d.addEventListener('click', fn);
    d._fn = fn;
    return d;
  }

  function openPanel(btn) {
    if (panel) closePanel(false);
    var k = btn.getAttribute('data-k');
    panel = document.createElement('div');
    panel.id = 'tv-fbp';
    var all = T('All', 'すべて');
    var first = null;
    function list(rows, curId, key) {
      var a = item(all, !curId, function() { var p = {}; p[key] = ''; go(p); });
      panel.appendChild(a);
      rows.forEach(function(r) {
        var it = item(r[1], r[0] === curId, function() { var p = {}; p[key] = r[0]; go(p); });
        panel.appendChild(it);
        if (r[0] === curId) first = it;
      });
      if (!first) first = a;
    }
    if (k === 'sort') {
      SORTS.forEach(function(r) {
        var cur = (r[0] === S.s) && (r[0] === '' || r[1] === (S.o || 'd'));
        var it = item(r[2], cur, function() { go({ s: r[0], o: r[1] }); });
        panel.appendChild(it);
        if (cur) first = it; else if (!first) first = it;
      });
    } else if (k === 'sh') {
      panel.className = 'tv-fsh';
      panel.style.columnCount = 3; panel.style.columnGap = '10px';
      list(SH, S.sh, 'sh');
    } else if (k === 'lo') {
      panel.className = 'tv-flo';
      first = item(T('All locations', 'すべての開催地'), !S.lo, function() { go({ lo: '' }); });
      panel.appendChild(first);
      var lcols = document.createElement('div');
      lcols.className = 'tv-fblo';
      var lblock = null;
      LO.forEach(function(r) {
        var it = item(r[1], r[0] === S.lo, function() { go({ lo: r[0] }); });
        if (r[3] === 'city') { lblock = document.createElement('div'); lblock.className = 'tv-fbcity'; it.classList.add('tv-fbch'); lcols.appendChild(lblock); }
        else it.classList.add('tv-fbv');
        if (lblock) lblock.appendChild(it);
        if (r[0] === S.lo) first = it;
      });
      panel.appendChild(lcols);
    } else if (k === 'mt') list(MT, S.mt, 'mt');
    else if (k === 'ch') list(CH, S.ch, 'ch');
    else if (k === 'yr') {
      panel.style.columnCount = 2;
      list(YR, S.yr, 'yr');
    } else if (k === 'co' || k === 'wr') {
      panel.className = 'tv-co';
      var isWr = k === 'wr';
      var top = isWr
        ? item(T('Any wrestler', 'すべての選手'), !S.base, function() { go({ base: '' }); })
        : item(T('All competitors', 'すべての選手'), !S.co, function() { go({ co: '' }); });
      panel.appendChild(top);
      first = top;
      var cols = document.createElement('div');
      cols.className = 'tv-fbcols';
      facs.forEach(function(f) {
        var col = document.createElement('div');
        col.className = 'tv-fbcol';
        var h = document.createElement('div');
        h.className = 'tv-fbh';
        h.textContent = String(f.name || '').toUpperCase();
        col.appendChild(h);
        (f.members || []).forEach(function(m) {
          var curM = isWr ? String(S.base).toLowerCase() === String(m.search).toLowerCase() : S.co === m.search;
          var it = item(m.name, curM, function() {
            if (isWr) go({ base: m.search, co: S.co === m.search ? '' : S.co });
            else go({ co: m.search });
          });
          col.appendChild(it);
          if (curM) first = it;
        });
        cols.appendChild(col);
      });
      panel.appendChild(cols);
    }
    document.body.appendChild(panel);
    var r = btn.getBoundingClientRect();
    panel.style.top = Math.max(10, r.bottom + 8) + 'px';
    if (k === 'co' || k === 'wr' || k === 'lo') { panel.style.left = '30px'; panel.style.right = '30px'; }
    else if (k === 'sh') { panel.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 900)) + 'px'; panel.style.width = '880px'; }
    else if (k === 'yr') { panel.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 480)) + 'px'; panel.style.width = '440px'; }
    else panel.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 400)) + 'px';
    btn.classList.add('tv-open');
    openBtn = btn;
    prevClose = window.__tvMenuClose || null;
    window.__tvMenuClose = function() { closePanel(true); return true; };
    try { if (window.AndroidHost && AndroidHost.setSideMenuOpen) AndroidHost.setSideMenuOpen(true); } catch (e) {}
    if (first) { try { first.focus(); } catch (e) {} }
  }

  function panelItems() { return Array.prototype.slice.call(panel.querySelectorAll('.tv-fbi')); }
  function move(dir) {
    var cur = document.activeElement;
    var items = panelItems();
    if (items.indexOf(cur) === -1) { if (items[0]) items[0].focus(); return; }
    var cr = cur.getBoundingClientRect();
    var cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    var best = null, bs = 1e9;
    items.forEach(function(it) {
      if (it === cur) return;
      var r = it.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var dx = x - cx, dy = y - cy, prim, orth;
      if (dir === 'down') { if (dy <= 4) return; prim = dy; orth = Math.abs(dx); }
      else if (dir === 'up') { if (dy >= -4) return; prim = -dy; orth = Math.abs(dx); }
      else if (dir === 'right') { if (dx <= 4) return; prim = dx; orth = Math.abs(dy); }
      else { if (dx >= -4) return; prim = -dx; orth = Math.abs(dy); }
      var sc = prim + orth * 2;
      if (sc < bs) { bs = sc; best = it; }
    });
    if (best) { best.focus(); try { best.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  }

  function stop(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function cardAbove(a) {
    var r = a.getBoundingClientRect();
    var list = document.querySelectorAll('a.tv-thumbnail-link, .content-list-item a[href*="/contents/"]');
    for (var i = 0; i < list.length; i++) {
      var q = list[i].getBoundingClientRect();
      if (q.width > 0 && q.height > 0 && q.top < r.top - 10) return true;
    }
    return false;
  }
  function firstCard() {
    var list = document.querySelectorAll('a.tv-thumbnail-link, .content-list-item a[href*="/contents/"]');
    for (var i = 0; i < list.length; i++) {
      var q = list[i].getBoundingClientRect();
      if (q.width > 0 && q.height > 0) return list[i];
    }
    return null;
  }

  window.addEventListener('keydown', function(e) {
    var k = e.keyCode;
    var menuOpen = document.documentElement.classList.contains('tv-sm-open');
    if (menuOpen) return;
    if (panel) {
      if (k === 38) { stop(e); move('up'); }
      else if (k === 40) { stop(e); move('down'); }
      else if (k === 37) { stop(e); move('left'); }
      else if (k === 39) { stop(e); move('right'); }
      else if (k === 13 || k === 23) {
        var a = document.activeElement;
        if (a && a._fn) { stop(e); a._fn(); }
      } else if (k === 27) { stop(e); closePanel(true); }
      return;
    }
    var ae = document.activeElement;
    if (!ae) return;
    var bi = btns.indexOf(ae);
    if (bi !== -1) {
      lastBtn = bi;
      if (k === 39) { stop(e); if (bi < btns.length - 1) btns[bi + 1].focus(); }
      else if (k === 37) { if (bi > 0) { stop(e); btns[bi - 1].focus(); } else if (FAC_MODE && window.__tvFacFocusNav) { stop(e); window.__tvFacFocusNav(); } }   // at the first button Left opens the menu as usual
      else if (k === 40) { var c = FAC_MODE ? document.querySelector('#tv-fac-grid .tv-fc') : (chips.length ? chips[0] : firstCard()); if (c) { stop(e); c.focus(); try { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} } }
      else if (k === 13 || k === 23) { stop(e); openPanel(ae); }
      return;
    }
    var ci = chips.indexOf(ae);
    if (ci !== -1) {
      if (k === 39) { stop(e); if (ci < chips.length - 1) chips[ci + 1].focus(); }
      else if (k === 37) { if (ci > 0) { stop(e); chips[ci - 1].focus(); } }
      else if (k === 38) { stop(e); var ub = btns[Math.min(lastBtn, btns.length - 1)] || btns[0]; if (ub) ub.focus(); }
      else if (k === 40) { var fc = firstCard(); if (fc) { stop(e); fc.focus(); try { fc.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} } }
      else if (k === 13 || k === 23) { stop(e); if (ae._fn) ae._fn(); }
      return;
    }
    if (k === 38 && bar && ae.tagName === 'A' && ae.closest && ae.closest('.content-list, [class*="content-list"]') && !cardAbove(ae)) {
      stop(e);
      var tb = chips.length ? chips[0] : (btns[Math.min(lastBtn, btns.length - 1)] || btns[0]);
      if (tb) { tb.focus(); try { tb.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} }
    }
  }, true);

  // Line the bar and the chip row up with the left edge of the first thumbnail.
  function alignBars() {
    if (FAC_MODE) return;
    try {
      var t = document.querySelector('.content-list-item .tv-thumbnail-link') || document.querySelector('.content-list-item img') || document.querySelector('.content-list-item');
      if (!t) return;
      var target = t.getBoundingClientRect().left;
      ['tv-fb', 'tv-fbc'].forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.style.marginLeft = '0px';
        el.style.marginLeft = (target - el.getBoundingClientRect().left) + 'px';
      });
    } catch (e) {}
  }
  window.addEventListener('resize', alignBars);
  [300, 900, 2000, 4000].forEach(function(ms) { setTimeout(alignBars, ms); });

  var tries = 0;
  (function tick() {
    if (mount()) return;
    if (++tries < 25) setTimeout(tick, 400);
  })();
})();
    """.trimIndent()

    // Tournament Archives filter bar: Sort, Location, Show and Year drop-downs; each choice adds a word to the keyword search.
    private val eventBarJs = """
(function(){
  if (window.__tvEventBar) return;
  var onArchive = location.pathname === '/contents/category/events' || location.pathname === '/contents/category/events/';
  var onShowCat = /^\/contents\/category\//.test(location.pathname) && !/^\/contents\/category\/(iwgp|world-sd|wonder-sd|high_speed|20[0-9]{2}|_2020)\/?$/.test(location.pathname) && !/^\/contents\/category\/(iwgp|world-sd|wonder-sd|high_speed)/.test(location.pathname);
  var onEvSearch = location.pathname.indexOf('/contents/search') === 0 && /[?&]tvev=1/.test(location.search);
  if (!onArchive && !onEvSearch && !onShowCat) return;
  if (!window.AndroidHost || !AndroidHost.eventFiltersJson) return;
  var D = null;
  try { D = JSON.parse(AndroidHost.eventFiltersJson()); } catch (e) {}
  if (!D) return;
  window.__tvEventBar = true;

  // Every choice adds a word to the site's own keyword search and opens that page: one request per choice.
  // The lists are fixed (assets/event_filters.json), so opening a drop-down loads nothing.
  var KINDS = [
    ['sort', null, 'Sort', '並び替え'],
    ['lo', null, 'Location', '開催地'],
    ['sh', null, 'Show', '大会名'],
    ['yr', null, 'Year', '年']
  ];
  var SORTS = [
    ['', '', 'Newest'],
    ['di_s', 'a', 'Oldest'],
    ['pc', 'd', 'Most played'],
    ['fc', 'd', 'Most favorited']
  ];
  var LISTS = {};
  LISTS.lo = [];
  (D.locations || []).forEach(function(c) {
    LISTS.lo.push(['c:' + c.name, c.name, c.search, 'city']);
    (c.venues || []).forEach(function(v) { LISTS.lo.push(['v:' + v.name, v.name, v.search, 'venue']); });
  });
  LISTS.sh = (D.shows || []).map(function(x) { return [x.name, x.name, x.search]; });
  LISTS.yr = [];
  for (var y = new Date().getFullYear(); y >= 2011; y--) LISTS.yr.push([String(y), String(y), String(y)]);

  function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  function T(en, ja) { return isJa() ? ja : en; }
  function qp(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
  }
  var S = { lo: qp('tvlo'), sh: qp('tvsh'), yr: qp('tvyr'), s: qp('s'), o: qp('o') };
  function find(k, id) { var l = LISTS[k]; for (var i = 0; i < l.length; i++) if (l[i][0] === id) return l[i]; return null; }
  function buildUrl(n) {
    var words = [];
    ['sh', 'lo', 'yr'].forEach(function(k) { var f = find(k, n[k]); if (f) words.push(f[2]); });
    var sortQ = n.s ? 's=' + encodeURIComponent(n.s) + '&o=' + encodeURIComponent(n.o || 'd') : '';
    if (!words.length) return '/contents/category/events' + (sortQ ? '?' + sortQ : '');
    var u = '/contents/search?q%5Bkeyword%5D=' + encodeURIComponent(words.join(' ')) + '&activetab=contents&page=1&tvev=1';
    if (sortQ) u += '&' + sortQ;
    ['lo', 'sh', 'yr'].forEach(function(k) { if (n[k]) u += '&tv' + k + '=' + encodeURIComponent(n[k]); });
    return u;
  }
  function go(patch) {
    var n = {};
    Object.keys(S).forEach(function(k) { n[k] = S[k]; });
    Object.keys(patch).forEach(function(k) { n[k] = patch[k]; });
    location.href = buildUrl(n);
  }

  var st = document.createElement('style');
  st.textContent = [
    '#tv-eb{display:flex;flex-wrap:wrap;align-items:center;gap:12px 14px;margin:6px 0 18px 0;padding:0;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-eb .tv-ebb{box-sizing:border-box;padding:10px 18px;border-radius:10px;border:2px solid rgba(255,255,255,0.45);color:#ffffff;font-size:19px;font-weight:700;line-height:1.2;white-space:nowrap;background:transparent;cursor:pointer;outline:none !important;}',
    '#tv-eb .tv-ebb.tv-on{border-color:#F4C242;color:#F4C242;}',
    '#tv-eb .tv-ebb:focus, #tv-eb .tv-ebb.tv-open{background:#FFB347;border-color:#FFB347;color:#1A1A1A;box-shadow:none !important;}',
    '#tv-ebp{position:fixed;z-index:99100;box-sizing:border-box;padding:12px;border-radius:14px;background:#121922;border:2px solid #2a323c;font-family:Arial,Helvetica,sans-serif;color:#ffffff;max-height:calc(100vh - 40px);overflow-y:auto;scrollbar-width:none;}',
    '#tv-ebp::-webkit-scrollbar{display:none;}',
    '#tv-ebp .tv-ebi{break-inside:avoid;}',
    '#tv-ebp .tv-ebi{box-sizing:border-box;padding:9px 14px;margin:2px 0;border-radius:8px;border:2px solid transparent;font-size:19px;font-weight:600;color:#c9d2dc;outline:none !important;cursor:pointer;white-space:normal;}',
    '#tv-ebp .tv-ebi.tv-cur{color:#F4C242;}',
    '#tv-ebp .tv-ebi:focus{background:#172029;border-color:#F4C242;color:#ffffff;font-weight:700;box-shadow:none !important;}',
    '#tv-ebp .tv-ebcols{column-count:4;column-gap:14px;}',
    '#tv-ebp .tv-ebcity{break-inside:avoid;margin:0 0 10px 0;}',
    '#tv-ebp .tv-ebh{font-weight:700;color:#F4C242;font-size:17px;}',
    '#tv-ebp .tv-ebv{font-size:16px;padding:7px 8px 7px 22px;}',
    '#tv-ebp.tv-lo .tv-ebi{white-space:normal;}',
    'html body .box-sort{display:none !important;}',
    '#tv-ec{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;margin:-6px 0 18px 0;padding:0;font-family:Arial,Helvetica,sans-serif;}',
    '#tv-ec .tv-ebl{font-size:17px;color:#9aa6b4;}',
    '#tv-ec .tv-ebchip{box-sizing:border-box;padding:7px 14px;border-radius:20px;background:#172029;border:2px solid #3b4656;color:#ffffff;font-size:17px;font-weight:700;white-space:nowrap;outline:none !important;cursor:pointer;}',
    '#tv-ec .tv-ebchip.tv-clr{background:transparent;border-color:transparent;color:#F4C242;}',
    '#tv-ec .tv-ebchip:focus{background:#FFB347;border-color:#FFB347;color:#1A1A1A;box-shadow:none !important;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  var bar = null, btns = [], lastBtn = 0, panel = null, openBtn = null, prevClose = null, chips = [];

  function sortCur() {
    for (var i = 0; i < SORTS.length; i++) if (SORTS[i][0] === S.s && (SORTS[i][0] === '' || SORTS[i][1] === (S.o || 'd'))) return SORTS[i];
    return null;
  }
  function kindInfo(k) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i][0] === k) return KINDS[i]; return null; }
  function labelFor(k) {
    var ki = kindInfo(k);
    if (k === 'sort') {
      var sc = sortCur();
      return { text: T(ki[2], ki[3]) + ': ' + T(sc ? sc[2] : 'Newest', (!sc || sc[2] === 'Newest') ? '新着順' : sc[2]), on: !!S.s };
    }
    var cur = find(k, S[k]);
    return { text: T(ki[2], ki[3]) + (cur ? ': ' + cur[1] : ''), on: !!cur };
  }
  function mount() {
    if (document.getElementById('tv-eb')) return true;
    var anchor = document.querySelector('.box-sort') || document.querySelector('.content-list, [class*="content-list"]');
    if (!anchor || !anchor.parentNode) return false;
    bar = document.createElement('div');
    bar.id = 'tv-eb';
    bar.setAttribute('translate', 'no'); bar.setAttribute('lang', 'en'); bar.className = 'notranslate';
    btns = [];
    KINDS.forEach(function(ki) {
      var b = document.createElement('div');
      b.className = 'tv-ebb';
      b.tabIndex = 0;
      b.setAttribute('role', 'button');
      b.setAttribute('data-k', ki[0]);
      var l = labelFor(ki[0]);
      b.textContent = l.text + ' ▾';
      if (l.on) b.classList.add('tv-on');
      b.addEventListener('click', function() { openPanel(b); });
      btns.push(b);
      bar.appendChild(b);
    });
    anchor.parentNode.insertBefore(bar, anchor);
    buildChips();
    return true;
  }
  function buildChips() {
    var defs = [];
    ['lo', 'sh', 'yr'].forEach(function(k) { var f = find(k, S[k]); if (f) { var p = {}; p[k] = ''; defs.push([f[1], p]); } });
    chips = [];
    if (!defs.length) return;
    var cb = document.createElement('div');
    cb.id = 'tv-ec';
    cb.setAttribute('translate', 'no'); cb.setAttribute('lang', 'en');
    var l = document.createElement('span');
    l.className = 'tv-ebl';
    l.textContent = T('Showing', '絞り込み');
    cb.appendChild(l);
    function chip(text, patch, clr) {
      var d = document.createElement('div');
      d.className = 'tv-ebchip' + (clr ? ' tv-clr' : '');
      d.tabIndex = 0;
      d.setAttribute('role', 'button');
      d.textContent = text;
      d._fn = function() { go(patch); };
      d.addEventListener('click', d._fn);
      chips.push(d);
      cb.appendChild(d);
    }
    defs.forEach(function(x) { chip(x[0] + ' ×', x[1], false); });
    chip(T('Clear all', 'すべて解除'), { lo: '', sh: '', yr: '' }, true);
    bar.parentNode.insertBefore(cb, bar.nextSibling);
    setTimeout(alignBars, 0);
  }

  function closePanel(refocus) {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    if (openBtn) openBtn.classList.remove('tv-open');
    var b = openBtn; openBtn = null;
    if (prevClose) { window.__tvMenuClose = prevClose; prevClose = null; }
    try { if (window.AndroidHost && AndroidHost.setSideMenuOpen) AndroidHost.setSideMenuOpen(false); } catch (e) {}
    if (refocus && b) { try { b.focus(); } catch (e) {} }
  }
  function item(text, cur, fn) {
    var d = document.createElement('div');
    d.className = 'tv-ebi' + (cur ? ' tv-cur' : '');
    d.tabIndex = -1;
    d.textContent = text;
    d.addEventListener('click', fn);
    d._fn = fn;
    return d;
  }
  function openPanel(btn) {
    if (panel) closePanel(false);
    var k = btn.getAttribute('data-k');
    panel = document.createElement('div');
    panel.setAttribute('translate', 'no'); panel.setAttribute('lang', 'en');
    panel.id = 'tv-ebp';
    var first = null;
    if (k === 'sort') {
      SORTS.forEach(function(r) {
        var cur = (r[0] === S.s) && (r[0] === '' || r[1] === (S.o || 'd'));
        var it = item(r[2], cur, function() { go({ s: r[0], o: r[1] }); });
        panel.appendChild(it);
        if (cur) first = it; else if (!first) first = it;
      });
    } else if (k === 'lo') {
      panel.className = 'tv-lo';
      first = item(T('All locations', 'すべての開催地'), !S.lo, function() { go({ lo: '' }); });
      panel.appendChild(first);
      var cols = document.createElement('div');
      cols.className = 'tv-ebcols';
      var block = null;
      LISTS.lo.forEach(function(r) {
        var it = item(r[3] === 'city' ? r[1] : r[1], r[0] === S.lo, function() { go({ lo: r[0] }); });
        if (r[3] === 'city') {
          block = document.createElement('div');
          block.className = 'tv-ebcity';
          it.classList.add('tv-ebh');
          cols.appendChild(block);
        } else it.classList.add('tv-ebv');
        if (block) block.appendChild(it);
        if (r[0] === S.lo) first = it;
      });
      panel.appendChild(cols);
    } else {
      first = item(T('All', 'すべて'), !S[k], function() { var p = {}; p[k] = ''; go(p); });
      panel.appendChild(first);
      LISTS[k].forEach(function(r) {
        var it = item(r[1], r[0] === S[k], function() { var p = {}; p[k] = r[0]; go(p); });
        panel.appendChild(it);
        if (r[0] === S[k]) first = it;
      });
      if (k === 'yr') panel.style.columnCount = 2;
      if (k === 'sh') { panel.style.columnCount = 3; panel.style.columnGap = '10px'; }
    }
    document.body.appendChild(panel);
    var r = btn.getBoundingClientRect();
    panel.style.top = Math.max(10, r.bottom + 8) + 'px';
    if (k === 'lo') { panel.style.left = '30px'; panel.style.right = '30px'; }
    else panel.style.left = Math.max(10, Math.min(r.left, window.innerWidth - (k === 'yr' ? 480 : (k === 'sh' ? 900 : 440)))) + 'px';
    if (k === 'yr') panel.style.width = '440px';
    if (k === 'sh') panel.style.width = '880px';
    btn.classList.add('tv-open');
    openBtn = btn;
    prevClose = window.__tvMenuClose || null;
    window.__tvMenuClose = function() { closePanel(true); return true; };
    try { if (window.AndroidHost && AndroidHost.setSideMenuOpen) AndroidHost.setSideMenuOpen(true); } catch (e) {}
    try { first.focus(); first.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }
  function move(dir) {
    var cur = document.activeElement;
    var items = Array.prototype.slice.call(panel.querySelectorAll('.tv-ebi'));
    var i = items.indexOf(cur);
    if (i === -1) { if (items[0]) items[0].focus(); return; }
    var cr = cur.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    var best = null, bs = 1e9;
    items.forEach(function(it) {
      if (it === cur) return;
      var r = it.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy, prim, orth;
      if (dir === 'down') { if (dy <= 4) return; prim = dy; orth = Math.abs(dx); }
      else if (dir === 'up') { if (dy >= -4) return; prim = -dy; orth = Math.abs(dx); }
      else if (dir === 'right') { if (dx <= 4) return; prim = dx; orth = Math.abs(dy); }
      else { if (dx >= -4) return; prim = -dx; orth = Math.abs(dy); }
      var sc = prim + orth * 2;
      if (sc < bs) { bs = sc; best = it; }
    });
    if (best) { best.focus(); try { best.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  }

  function stop(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function cards() { return document.querySelectorAll('a.tv-thumbnail-link, .content-list-item a[href]'); }
  function firstCard() {
    var l = cards();
    for (var i = 0; i < l.length; i++) { var q = l[i].getBoundingClientRect(); if (q.width > 0 && q.height > 0) return l[i]; }
    return null;
  }
  function cardAbove(a) {
    var r = a.getBoundingClientRect(), l = cards();
    for (var i = 0; i < l.length; i++) { var q = l[i].getBoundingClientRect(); if (q.width > 0 && q.height > 0 && q.top < r.top - 10) return true; }
    return false;
  }
  function focusScroll(el) { try { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} }

  window.addEventListener('keydown', function(e) {
    var k = e.keyCode;
    if (document.documentElement.classList.contains('tv-sm-open')) return;
    if (panel) {
      if (k === 38) { stop(e); move('up'); }
      else if (k === 40) { stop(e); move('down'); }
      else if (k === 37) { stop(e); move('left'); }
      else if (k === 39) { stop(e); move('right'); }
      else if (k === 13 || k === 23) { var a = document.activeElement; if (a && a._fn) { stop(e); a._fn(); } }
      else if (k === 27) { stop(e); closePanel(true); }
      return;
    }
    var ae = document.activeElement;
    if (!ae) return;
    var bi = btns.indexOf(ae);
    if (bi !== -1) {
      lastBtn = bi;
      if (k === 39) { stop(e); if (bi < btns.length - 1) btns[bi + 1].focus(); }
      else if (k === 37) { if (bi > 0) { stop(e); btns[bi - 1].focus(); } }
      else if (k === 40) { var c = chips.length ? chips[0] : firstCard(); if (c) { stop(e); focusScroll(c); } }
      else if (k === 13 || k === 23) { stop(e); openPanel(ae); }
      return;
    }
    var ci = chips.indexOf(ae);
    if (ci !== -1) {
      if (k === 39) { stop(e); if (ci < chips.length - 1) chips[ci + 1].focus(); }
      else if (k === 37) { if (ci > 0) { stop(e); chips[ci - 1].focus(); } }
      else if (k === 38) { stop(e); var ub = btns[Math.min(lastBtn, btns.length - 1)] || btns[0]; if (ub) ub.focus(); }
      else if (k === 40) { var fc = firstCard(); if (fc) { stop(e); focusScroll(fc); } }
      else if (k === 13 || k === 23) { stop(e); if (ae._fn) ae._fn(); }
      return;
    }
    if (k === 38 && bar && ae.tagName === 'A' && ae.closest && ae.closest('.content-list, [class*="content-list"]') && !cardAbove(ae)) {
      stop(e);
      var tb = chips.length ? chips[0] : (btns[Math.min(lastBtn, btns.length - 1)] || btns[0]);
      if (tb) focusScroll(tb);
    }
  }, true);

  // Line the bar and the chip row up with the left edge of the first thumbnail.
  function alignBars() {
    try {
      var t = document.querySelector('.content-list-item .tv-thumbnail-link') || document.querySelector('.content-list-item img') || document.querySelector('.content-list-item');
      if (!t) return;
      var target = t.getBoundingClientRect().left;
      ['tv-eb', 'tv-ec'].forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.style.marginLeft = '0px';
        el.style.marginLeft = (target - el.getBoundingClientRect().left) + 'px';
      });
    } catch (e) {}
  }
  window.addEventListener('resize', alignBars);
  [300, 900, 2000, 4000].forEach(function(ms) { setTimeout(alignBars, ms); });

  var tries = 0;
  (function tick() { if (mount()) return; if (++tries < 25) setTimeout(tick, 400); })();
})();
    """.trimIndent()

    private val listNavJs = """
        (function(){
          if (window.__tvListNav) return;
          window.__tvListNav = true;

          function isHome() {
            var p = location.pathname;
            return p === '/' || p === '/index.html' || p === '';
          }

          function stops() {
            return Array.from(document.querySelectorAll('a.tv-thumbnail-link')).filter(function(a) {
              if (a.closest('.slick-cloned')) return false;
              var r = a.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
          }

          function cardRect(a) {
            var c = a.closest('.content-list-item, article') || a;
            return c.getBoundingClientRect();
          }

          function go(from, dir) {
            var list = stops();
            var fr = cardRect(from);
            var fx = fr.left + fr.width / 2;
            var best = null, bestTop = 0, bestDx = 0;
            list.forEach(function(a) {
              if (a === from) return;
              var r = cardRect(a);
              var rowGap = dir > 0 ? (r.top - fr.top) : (fr.top - r.top);
              if (rowGap < fr.height * 0.5) return;
              var top = r.top;
              var dx = Math.abs(r.left + r.width / 2 - fx);
              var closerRow = best === null || (dir > 0 ? top < bestTop - 10 : top > bestTop + 10);
              var sameRow = best !== null && Math.abs(top - bestTop) <= 10;
              if (closerRow || (sameRow && dx < bestDx)) {
                best = a; bestTop = top; bestDx = dx;
              }
            });
            return best;
          }

          document.addEventListener('keydown', function(e) {
            if (e.keyCode !== 38 && e.keyCode !== 40) return;
            if (isHome()) return;
            var ae = document.activeElement;
            if (!ae || !ae.classList || !ae.classList.contains('tv-thumbnail-link')) return;
            var target = go(ae, e.keyCode === 40 ? 1 : -1);
            if (!target) return;   // nothing above/below yet: leave it to the page (header, or more videos loading)
            e.preventDefault();
            e.stopPropagation();
            try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, true);
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

              // The row's "view all" link on the site: a link with a more / view all label, else the
              // heading's own link, else a category link that is not one of the video cards.
              var viewAll = '';
              var moreRe = /view\s*all|see\s*all|more|一覧|すべて|もっと|全て/i;
              var secLinks = Array.from(sec.querySelectorAll('a[href]')).filter(function(a) {
                return !a.closest('.content-list-item, article, .slick-cloned') && a.getAttribute('href') && a.getAttribute('href').indexOf('#') !== 0 && a.getAttribute('href').indexOf('javascript') !== 0;
              });
              for (var li = 0; li < secLinks.length && !viewAll; li++) {
                if (moreRe.test(secLinks[li].textContent || '') || moreRe.test(secLinks[li].className || '')) viewAll = secLinks[li].href;
              }
              if (!viewAll && titleEl) {
                var titleLink = titleEl.closest('a') || titleEl.querySelector('a');
                if (titleLink && titleLink.href) viewAll = titleLink.href;
              }
              if (!viewAll) {
                for (var lj = 0; lj < secLinks.length && !viewAll; lj++) {
                  if (/\/contents\/category\/|\/category\//.test(secLinks[lj].href)) viewAll = secLinks[lj].href;
                }
              }

              if (dataList.length > 0) {
                seenTitles[title] = true;
                result.push({ title: title, items: dataList, viewAll: viewAll });
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
                html += '<div style="margin-bottom:35px;"><h2 tabindex="-1" style="display:flex !important; align-items:center; color:#ffffff !important; font-family:Arial,Helvetica,sans-serif !important; font-size:22px; line-height:1.2; margin:0 0 14px 0; font-weight:700 !important; outline:none !important; user-select:none !important;"><span style="display:block; flex:0 0 auto; width:8px; height:26px; background:#F4C242; margin-right:12px;"></span><span>' + rowSec.title + '</span></h2><div class="tv-grid-row" style="display:flex; flex-direction:row; gap:24px; overflow-x:auto; scroll-behavior:smooth; padding:12px 10px; margin:0 -10px;">';
                rowSec.items.forEach(function(item) {
                  var bgStyle = item.bgUrl ? 'background-image:url(' + item.bgUrl + ');' : '';
                  html += '<a class="tv-card" tabindex="0" href="' + item.href + '" style="' + cardCss + '"><div style="' + imgCss + ' ' + bgStyle + '"></div><div style="' + titleCss + '">' + item.title + '</div></a>';
                });
                if (rowSec.viewAll) {
                  var viewAllJa = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
                  html += '<a class="tv-card notranslate" tabindex="0" href="' + rowSec.viewAll + '" style="flex:0 0 calc(25% - 18px); max-width:calc(25% - 18px); box-sizing:border-box; border-radius:8px; background:#11171E; border:2px solid #2a323c; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-decoration:none; cursor:pointer; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:24px; font-weight:bold; min-height:165px;"><span>' + (viewAllJa ? 'すべて見る' : 'View All') + '</span><span style="color:#F4C242; font-size:34px; line-height:1;">&#8594;</span></a>';
                }
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

            startAccountRows(cardCss, imgCss, titleCss);
          }

          // Two extra rows at the bottom of the home page for signed-in viewers: "Recently Watched" (the site's
          // Viewing history) and "Favorites" (the first 12, then a "Show All" tile). Nothing is added when
          // signed out or when the list is empty.
          function escHtml(t) {
            return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          }

          function cleanHistoryTitle(t) {
            return sanitizeTitle(t || '')
              .replace(/(Viewing date|視聴日時|視聴日)\s*[:：]?\s*[0-9.\/\- :]*/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
          }

          function absUrl(u) {
            try { return new URL(u, location.origin).href; } catch (e) { return u; }
          }

          // The video cards listed under the heading that matches headRe, up to the next heading.
          function extractList(doc, headRe, limit) {
            var heads = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, .ttl-md, .ttl-lg'));
            var hi = -1;
            for (var i = 0; i < heads.length; i++) {
              if (headRe.test(heads[i].textContent || '')) { hi = i; break; }
            }
            if (hi < 0) return [];
            var head = heads[hi];
            var nextHead = null;
            for (var j = hi + 1; j < heads.length; j++) {
              if (!heads[j].closest('.content-list-item, article')) { nextHead = heads[j]; break; }
            }
            var out = [];
            var seen = {};
            Array.from(doc.querySelectorAll('.content-list-item, article')).forEach(function(item) {
              if (item.closest('.slick-cloned')) return;
              if (!(head.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
              if (nextHead && !(nextHead.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_PRECEDING)) return;
              var link = item.querySelector('a[href*="/contents/"], a[href*="/set/"]');
              if (!link) return;
              var href = absUrl(link.getAttribute('href') || '');
              if (!href || seen[href]) return;
              seen[href] = true;

              var bg = '';
              var thumb = item.querySelector('[style*="background-image"]');
              if (thumb) {
                var m = (thumb.style.backgroundImage || '').match(/url\(['"]?(.*?)['"]?\)/);
                if (m && m[1]) bg = m[1];
              }
              if (!bg) {
                var img = item.querySelector('img');
                if (img) bg = img.getAttribute('data-src') || img.getAttribute('data-lazy') || img.getAttribute('data-original') || img.getAttribute('src') || '';
              }
              if (bg.indexOf('data:') === 0) bg = '';
              if (bg) bg = absUrl(bg);

              var tEl = item.querySelector('h3, h4, .ttl-xs, .content-title, .content-info-box');
              var title = cleanHistoryTitle(tEl ? tEl.textContent : item.textContent);
              if (!title) title = 'Stardom World Video';
              out.push({ href: href, title: title, bgUrl: bg });
            });
            return out.slice(0, limit);
          }

          var HISTORY_RE = /viewing history|視聴履歴|閲覧履歴|履歴/i;
          var FAVORITES_RE = /favorites list|favourites list|お気に入り/i;

          // The two account rows sit right under the first row ("NEW"): Recently Watched, then Favorites.
          // Their last-known contents are kept on the device and drawn at once with the page, then refreshed
          // from the site in the background, so they are in place from the first paint on every visit
          // after the first and nothing jumps when the fresh copy arrives.
          var CACHE_KEY = 'tvHomeRowsV1';
          function readCache() {
            try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (e) { return {}; }
          }
          function writeCache(key, val) {
            try {
              var c = readCache();
              if (val) c[key] = val; else delete c[key];
              localStorage.setItem(CACHE_KEY, JSON.stringify(c));
            } catch (e) {}
          }
          function clearCache() {
            try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
          }

          // Runs a change to the page and, if the highlighted card moved because of it, scrolls by the same
          // amount so the card stays where the viewer's eyes are.
          function keepFocusStill(change) {
            var ae = document.activeElement;
            var tracked = !!(ae && ae !== document.body && ae.getBoundingClientRect);
            var t0 = tracked ? ae.getBoundingClientRect().top : 0;
            change();
            if (tracked && document.body.contains(ae)) {
              var d = ae.getBoundingClientRect().top - t0;
              if (Math.abs(d) > 1) {
                try { window.scrollBy({ top: d, left: 0, behavior: 'instant' }); } catch (e) { window.scrollBy(0, d); }
              }
            }
          }

          function rowHtml(rowTitle, items, showAllHref, showAllLabel, css) {
            var html = '<h2 tabindex="-1" style="display:flex !important; align-items:center; color:#ffffff !important; font-family:Arial,Helvetica,sans-serif !important; font-size:22px; line-height:1.2; margin:0 0 14px 0; font-weight:700 !important; outline:none !important; user-select:none !important;"><span style="display:block; flex:0 0 auto; width:8px; height:26px; background:#F4C242; margin-right:12px;"></span><span class="notranslate" translate="no">' + escHtml(rowTitle) + '</span></h2>' +
              '<div class="tv-grid-row" style="display:flex; flex-direction:row; gap:24px; overflow-x:auto; scroll-behavior:smooth; padding:12px 10px; margin:0 -10px;">';
            items.forEach(function(item) {
              var bgStyle = item.bgUrl ? 'background-image:url(' + escHtml(item.bgUrl) + ');' : '';
              html += '<a class="tv-card" tabindex="0" href="' + escHtml(item.href) + '" style="' + css.card + '"><div style="' + css.img + ' ' + bgStyle + '"></div><div style="' + css.title + '">' + escHtml(item.title) + '</div></a>';
            });
            if (showAllHref) {
              html += '<a class="tv-card notranslate" tabindex="0" href="' + escHtml(showAllHref) + '" style="flex:0 0 calc(25% - 18px); max-width:calc(25% - 18px); box-sizing:border-box; border-radius:8px; background:#11171E; border:2px solid #2a323c; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-decoration:none; cursor:pointer; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:24px; font-weight:bold; min-height:165px;"><span>' + escHtml(showAllLabel) + '</span><span style="color:#F4C242; font-size:34px; line-height:1;">&#8594;</span></a>';
            }
            return html + '</div>';
          }

          // Adds, updates or removes one account row. Recently Watched goes straight under the first row and
          // Favorites under Recently Watched, whichever finishes first.
          function upsertRow(id, rowTitle, items, showAllHref, showAllLabel, css) {
            var existing = document.getElementById(id);
            if (!items.length) {
              if (existing && existing.parentNode) keepFocusStill(function() { existing.parentNode.removeChild(existing); });
              return;
            }
            var html = rowHtml(rowTitle, items, showAllHref, showAllLabel, css);
            if (existing) {
              if (existing.dataset.tvSig === html) return;
              if (existing.contains(document.activeElement)) return;   // don't pull the card from under the remote
              keepFocusStill(function() { existing.innerHTML = html; });
              existing.dataset.tvSig = html;
              return;
            }
            var first = document.querySelector('#tv-test-grid .tv-grid-row');
            if (!first || !first.parentElement || !first.parentElement.parentNode) return;
            var firstWrap = first.parentElement;
            // Row order under the first row: Recently Watched, Favorites.
            var ORDER = ['tv-recent-row', 'tv-favorites-row'];
            var after = firstWrap;
            for (var oi = ORDER.indexOf(id) - 1; oi >= 0; oi--) {
              var prev = document.getElementById(ORDER[oi]);
              if (prev) { after = prev; break; }
            }
            var wrap = document.createElement('div');
            wrap.id = id;
            wrap.style.cssText = 'margin-bottom:35px;';
            wrap.innerHTML = html;
            wrap.dataset.tvSig = html;
            keepFocusStill(function() { after.parentNode.insertBefore(wrap, after.nextSibling); });
          }

          // Reads a page of the site that draws its list with script: opens it invisibly, waits until the
          // list has stopped growing, hands over what it found and removes it again.
          function readViaFrame(url, headRe, limit, done) {
            var frame = document.createElement('iframe');
            frame.src = url;
            frame.setAttribute('aria-hidden', 'true');
            frame.tabIndex = -1;
            frame.style.cssText = 'position:absolute; left:-9999px; top:0; width:1280px; height:900px; border:0; visibility:hidden;';
            document.body.appendChild(frame);
            var tries = 0, last = -1, steady = 0;
            var timer = setInterval(function() {
              tries++;
              var doc = null, items = [];
              try { doc = frame.contentDocument; items = extractList(doc, headRe, limit); } catch (e) {}
              if (items.length && items.length === last) steady++; else steady = 0;
              last = items.length;
              if (steady >= 2 || tries > 24) {
                clearInterval(timer);
                var more = false;
                try { more = !!(doc && doc.querySelector('a[rel="next"], .pagination .page-item:not(.disabled):not(.active)')); } catch (e) {}
                try { frame.parentNode.removeChild(frame); } catch (e) {}
                done(items, more);
              }
            }, 500);
          }

          function isJa() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
          var FAV_URL = 'https://www.stardom-world.com/mypage/favorites';

          function showRecent(items, css) {
            upsertRow('tv-recent-row', isJa() ? '最近視聴した動画' : 'Recently Watched', items,
              'https://www.stardom-world.com/mypage?tvrecent=1', isJa() ? 'すべて見る' : 'View All', css);
          }
          function showFavorites(items, more, css) {
            upsertRow('tv-favorites-row', isJa() ? 'お気に入り' : 'My Favorites', items,
              more ? FAV_URL : '', isJa() ? 'すべて見る' : 'Show All', css);
          }

          // Called as soon as the grid exists: draws the saved copies straight away, then refreshes them.
          function startAccountRows(cardCss, imgCss, titleCss) {
            var css = { card: cardCss, img: imgCss, title: titleCss };
            var c = readCache();
            if (c.recent && c.recent.length) showRecent(c.recent, css);
            if (c.fav && c.fav.items && c.fav.items.length) showFavorites(c.fav.items, !!c.fav.more, css);
            // Most Watched / Most Favorited are no longer drawn on the home page: forget their saved copies.
            try { localStorage.removeItem('tvMostWatchedV1'); localStorage.removeItem('tvMostFavoritedV1'); } catch (e) {}
            loadRecentlyWatched(css);
          }

          function loadRecentlyWatched(css) {
            if (window.__tvRecentLoading) return;
            window.__tvRecentLoading = true;

            fetch('/mypage', { credentials: 'include' })
              .then(function(res) {
                if (!res.ok || (res.redirected && /login|sign_in|signin/.test(res.url))) return null;
                return res.text();
              })
              .then(function(html) {
                var doc = html ? new DOMParser().parseFromString(html, 'text/html') : null;
                if (!doc || doc.querySelector('input[type="password"]')) {
                  // Signed out: forget what was saved and show nothing.
                  clearCache();
                  showRecent([], css);
                  showFavorites([], false, css);
                  return;
                }
                var items = extractList(doc, HISTORY_RE, 12);
                var finish = function(list) { writeCache('recent', list.length ? list : null); showRecent(list, css); };
                if (items.length) finish(items);
                else if (!/viewing history|視聴履歴|閲覧履歴/i.test(html)) {
                  // The heading is missing from the plain page: it may be drawn by script.
                  readViaFrame('/mypage', HISTORY_RE, 12, function(list) { finish(list); });
                } else {
                  finish([]);   // heading present, no videos yet: nothing is shown
                }
                loadFavorites(css);   // signed in: the Favorites row is read as well
              })
              .catch(function() {});
          }

          // The first 12 favorites (what the site's own first page shows); a "Show All" tile when there are more.
          function loadFavorites(css) {
            if (window.__tvFavLoading) return;
            window.__tvFavLoading = true;
            readViaFrame('/mypage/favorites', FAVORITES_RE, 12, function(items, more) {
              writeCache('fav', items.length ? { items: items, more: !!more } : null);
              showFavorites(items, more, css);
            });
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
        // On the home page, the site's own banner and rows (which the app replaces with its own grid) are
        // hidden by CSS from the very first paint, instead of a moment later by a timer.
        view.evaluateJavascript(
            "(function(){var p=location.pathname;if(p==='/'||p==='/index.html'||p===''){document.documentElement.classList.add('tv-home');}})();",
            null
        )
        view.evaluateJavascript(viewportJs(), null)
        view.evaluateJavascript(hideTranslateJs, null)
        view.evaluateJavascript(translateJs, null)
        view.evaluateJavascript(headerJs, null)
        view.evaluateJavascript(authJs, null)
        view.evaluateJavascript(loginPageJs(), null)
        view.evaluateJavascript(factionJs, null)
        view.evaluateJavascript(recentPageJs, null)
        view.evaluateJavascript(filterBarJs, null)
        view.evaluateJavascript(eventBarJs, null)
        view.evaluateJavascript(infiniteScrollJs, null)
        view.evaluateJavascript(redirectToFirstMatchJs, null)
        view.evaluateJavascript(reverseFirstCarouselJs, null)
        view.evaluateJavascript(pageFullyLoadedJs, null)
        view.evaluateJavascript(stage1TestGridJs, null)
        view.evaluateJavascript(cardFavoriteToggleJs, null)
        view.evaluateJavascript(listNavJs, null)
        view.evaluateJavascript(homeAnchorJs, null)
        view.evaluateJavascript(sideMenuJs, null)
        view.evaluateJavascript(playerPageJs, null)
        view.evaluateJavascript(relatedRowJs, null)
        view.evaluateJavascript(playerBarJs, null)
        view.evaluateJavascript(hideBodySearchJs, null)
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

    // Full screen: Down opens the app's own button bar (play, skip, mute, captions, quality, speed, exit).
    // The player's own buttons can't be reached from outside its frame, so these drive it instead.
    private var fsControlsMode = false
    private var fsOverlay: android.widget.LinearLayout? = null
    private var fsTimeText: android.widget.TextView? = null
    private var fsProgress: android.widget.ProgressBar? = null
    private var fsBtnPlay: android.widget.TextView? = null
    private var fsBtnMute: android.widget.TextView? = null
    private var fsBtnCc: android.widget.TextView? = null
    private var fsBtnSpeed: android.widget.TextView? = null
    private var fsBtnQuality: android.widget.TextView? = null
    private val fsBtns = LinkedHashMap<String, android.widget.TextView>()
    private var barQuality: String = ""
    private var fsDebugView: android.widget.TextView? = null

    // ---- Captions drawn by the app (translated when needed) ----
    private class CcSentence(val start: Double, val end: Double, val text: String, val ja: Boolean)

    private var ccMode = 0            // 0 off, 1 English, 2 Japanese, 3 the player's own captions
    private var ccView: android.widget.TextView? = null
    @Volatile private var ccSentences: List<CcSentence>? = null
    @Volatile private var ccLoading = false
    @Volatile private var ccFailed = false
    private var ccKey = ""
    @Volatile private var ccNow = 0.0
    private val ccCache = java.util.concurrent.ConcurrentHashMap<String, String>()
    @Volatile private var ccWorkerRunning = false
    @Volatile private var ccBackoffUntil = 0L
    private var ccTicking = false

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
        tv.textSize = 15f
        tv.setTypeface(tv.typeface, android.graphics.Typeface.BOLD)
        tv.gravity = Gravity.CENTER
        val padH = (12 * density).toInt()
        val padV = (8 * density).toInt()
        tv.setPadding(padH, padV, padH, padV)
        tv.isFocusable = true
        tv.isClickable = true
        fun paint(focused: Boolean) {
            val d = android.graphics.drawable.GradientDrawable()
            d.cornerRadius = BAR_RADIUS_DP * density
            if (focused) {
                d.setColor(Color.parseColor(BAR_ACCENT))
                tv.setTextColor(Color.parseColor(BAR_TEXT_ON_ACCENT))
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
            fsDebugView?.visibility = View.GONE
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
        o.setPadding(pad, (14 * density).toInt(), pad, (14 * density).toInt())

        val hint = android.widget.TextView(this)
        hint.setTextColor(Color.WHITE)
        hint.textSize = 15f
        hint.visibility = View.GONE
        hint.setPadding(0, 0, 0, (10 * density).toInt())
        o.addView(hint)
        fsSkipHint = hint

        // One compact row, like the bar under the picture on the video page: time, progress, buttons.
        val main = android.widget.LinearLayout(this)
        main.orientation = android.widget.LinearLayout.HORIZONTAL
        main.gravity = Gravity.CENTER_VERTICAL

        val time = android.widget.TextView(this)
        time.setTextColor(Color.WHITE)
        time.textSize = 14f
        time.text = "0:00 / 0:00"
        main.addView(
            time,
            android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { rightMargin = (14 * density).toInt() }
        )
        fsTimeText = time

        val bar = android.widget.ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal)
        bar.max = 1000
        bar.progressDrawable.setColorFilter(Color.parseColor(BAR_ACCENT), android.graphics.PorterDuff.Mode.SRC_IN)
        main.addView(
            bar,
            android.widget.LinearLayout.LayoutParams(0, (8 * density).toInt(), 1f)
                .apply { rightMargin = (14 * density).toInt() }
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
                ).apply { rightMargin = (6 * density).toInt() }
            )
        }
        for (id in BAR_IDS) {
            val b = fsButton(barLabel(id, null)) { barAction(id) }
            when (id) {
                "play" -> fsBtnPlay = b
                "mute" -> fsBtnMute = b
                "cc" -> fsBtnCc = b
                "quality" -> fsBtnQuality = b
                "speed" -> fsBtnSpeed = b
            }
            fsBtns[id] = b
            add(b)
        }
        main.addView(row)
        o.addView(main)

        // Caption debug panel: only shown after the CC button is pressed.
        val dbg = android.widget.TextView(this)
        dbg.setTextColor(0xFFFFD27A.toInt())
        dbg.textSize = 12f
        dbg.typeface = android.graphics.Typeface.MONOSPACE
        dbg.setPadding(0, (12 * density).toInt(), 0, 0)
        dbg.visibility = View.GONE
        o.addView(dbg)
        fsDebugView = dbg

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
        fsSkipHint?.visibility = View.GONE
        fsDebugView?.visibility = View.GONE
        handler.removeCallbacks(fsStatusRunnable)
        fsOverlay?.visibility = View.GONE
    }

    // Skip size of the -/+ buttons (shared by the bar under the picture and the full screen bar).
    // Up / Down while one of them is focused steps through the sizes; OK skips by the chosen size.
    private val SKIP_SIZES = intArrayOf(10, 30, 60, 300, 600, 1800)
    @Volatile private var skipIdx = 1   // starts at 30 s

    private fun skipText(sec: Int): String =
        if (sec < 60) tr("${sec}s", "${sec}秒") else tr("${sec / 60}m", "${sec / 60}分")

    private fun skipInfoJson(): String {
        val o = org.json.JSONObject()
        o.put("idx", skipIdx)
        o.put("sizes", org.json.JSONArray(SKIP_SIZES.map { skipText(it) }))
        return o.toString()
    }

    // dir > 0: next larger size, dir < 0: next smaller. Stops at the ends.
    private fun skipStep(dir: Int) {
        skipIdx = (skipIdx + if (dir > 0) 1 else -1).coerceIn(0, SKIP_SIZES.size - 1)
    }

    private var fsSkipHint: android.widget.TextView? = null
    private val fsSkipHintHide = Runnable { fsSkipHint?.visibility = View.GONE }

    private fun showFsSkipHint() {
        val tv = fsSkipHint ?: return
        val sb = android.text.SpannableStringBuilder()
        sb.append(tr("Skip size   ", "スキップ幅   "))
        SKIP_SIZES.forEachIndexed { i, sec ->
            val t = skipText(sec)
            val start = sb.length
            sb.append(if (i == skipIdx) "[ $t ]" else " $t ")
            if (i == skipIdx) {
                sb.setSpan(android.text.style.ForegroundColorSpan(Color.parseColor(BAR_ACCENT)), start, sb.length, 0)
                sb.setSpan(android.text.style.StyleSpan(android.graphics.Typeface.BOLD), start, sb.length, 0)
            }
            sb.append("  ")
        }
        tv.text = sb
        tv.visibility = View.VISIBLE
        handler.removeCallbacks(fsSkipHintHide)
        handler.postDelayed(fsSkipHintHide, 2500)
    }

    // Label of one control-bar button, from the player's latest status (null = not known yet).
    private fun barLabel(id: String, j: org.json.JSONObject?): String = when (id) {
        "play" -> if (j?.optBoolean("paused") == true) tr("Play", "再生") else tr("Pause", "一時停止")
        "back" -> "-" + skipText(SKIP_SIZES[skipIdx])
        "fwd" -> "+" + skipText(SKIP_SIZES[skipIdx])
        "mute" -> if (j != null && j.optDouble("vol", 1.0) <= 0.0) tr("Unmute", "ミュート解除") else tr("Mute", "ミュート")
        "cc" -> ccLabel()
        "quality" -> {
            val q = j?.optString("q", "") ?: ""
            if (q.isNotEmpty()) barQuality = if (q.equals("auto", true)) tr("Auto", "自動") else q
            if (barQuality.isEmpty()) tr("Auto", "自動") else barQuality
        }
        "speed" -> (j?.optDouble("rate", 1.0) ?: 1.0).toString() + "x"
        "full" -> if (fullScreenActive()) tr("Exit full screen", "全画面を終了") else tr("Full screen", "全画面")
        else -> id
    }

    // What a control-bar button does; used by the full screen overlay and the in-page bar alike.
    private fun barAction(id: String) {
        when (id) {
            "play" -> playerCommand("toggle", 0)
            "back" -> playerCommand("seek", -SKIP_SIZES[skipIdx])
            "fwd" -> playerCommand("seek", SKIP_SIZES[skipIdx])
            "mute" -> playerCommand("mute", 0)
            "cc" -> cycleCc()
            "quality" -> playerCommand("quality", 0)
            "speed" -> playerCommand("speed", 0)
            "full" -> if (fullScreenActive()) {
                hideFsOverlay()
                hideCustomView()
            } else {
                webAppInterface.triggerFullScreen()
            }
        }
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
                // The player may have its own captions on from the start: show that as the current state.
                if (ccMode == 0 && j.optString("cc", "Off") != "Off") ccMode = 3
                for ((id, btn) in fsBtns) btn.text = barLabel(id, j)
                fsTimeText?.text = fmtTime(t) + " / " + fmtTime(d)
                fsProgress?.progress = if (d > 0) (t / d * 1000).toInt() else 0
            } catch (_: Exception) {
            }
        }
    }

    // ---------------------------------------------------------------- captions (EN / JA / off)

    private fun ccLabel(): String = when (ccMode) {
        1 -> "CC: EN"
        2 -> "CC: 日本語"
        3 -> tr("CC: Original", "字幕: 原文")
        else -> tr("CC: Off", "字幕: オフ")
    }

    private fun cycleCc() {
        ccMode = when (ccMode) { 0 -> 1; 1 -> 2; 2 -> 0; else -> 1 }
        fsBtnCc?.text = ccLabel()
        // The player's own captions always go off: ours replace them (and are shown or hidden below).
        playerCommand("ccoff", 0)
        if (ccMode == 0) {
            handler.removeCallbacks(ccTick)
            ccTicking = false
            ccView?.visibility = View.GONE
        } else {
            ccStart()
        }
    }

    private fun ccEnsureView(): android.widget.TextView {
        ccView?.let { return it }
        val v = android.widget.TextView(this)
        v.setTextColor(Color.WHITE)
        v.textSize = 24f
        v.gravity = Gravity.CENTER
        v.setShadowLayer(4f, 0f, 2f, Color.BLACK)
        v.setBackgroundColor(0x99000000.toInt())
        val padH = (16 * density).toInt()
        val padV = (6 * density).toInt()
        v.setPadding(padH, padV, padH, padV)
        v.maxWidth = (resources.displayMetrics.widthPixels * 0.8f).toInt()
        v.isFocusable = false
        v.visibility = View.GONE
        root.addView(
            v,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            ).apply { bottomMargin = (48 * density).toInt() }
        )
        ccView = v
        return v
    }

    private fun ccShowMessage(msg: String) {
        val v = ccEnsureView()
        v.text = msg
        v.alpha = 0.8f
        v.visibility = View.VISIBLE
        root.bringChildToFront(v)
    }

    private fun ccStart() {
        ccEnsureView()
        if (!ccTicking) {
            ccTicking = true
            handler.removeCallbacks(ccTick)
            handler.post(ccTick)
        }
        if (ccSentences == null && !ccLoading) {
            ccLoading = true
            ccFailed = false
            ccShowMessage(tr("Loading captions...", "字幕を読み込み中..."))
            webView.evaluateJavascript("window.__tvVideoId = ''; window.__tvCcRefresh && window.__tvCcRefresh(); 1", null)
            handler.postDelayed({
                webView.evaluateJavascript(
                    "(window.__tvVideoId || '') + '|' + ((document.querySelector('iframe[src*=vimeo], iframe[src*=player]') || {}).src || '')"
                ) { raw ->
                    val str = try { org.json.JSONTokener(raw ?: "").nextValue() as? String ?: "" } catch (_: Exception) { "" }
                    val cut = str.indexOf('|')
                    val vid = if (cut >= 0) str.substring(0, cut) else ""
                    val src = if (cut >= 0) str.substring(cut + 1) else ""
                    if (src != ccKey) {
                        ccKey = src
                        ccCache.clear()
                    }
                    val ua = webView.settings.userAgentString
                    Thread {
                        val vtt = fetchCcVtt(src, vid, ua)
                        val list = if (vtt != null) parseVttToSentences(vtt) else null
                        runOnUiThread {
                            ccLoading = false
                            if (list != null && list.isNotEmpty()) {
                                ccSentences = list
                                ccFailed = false
                                ccStartWorker(ua)
                            } else {
                                ccFailed = true
                                // Fall back to the player's own captions and show why in the debug panel.
                                ccMode = 3
                                fsBtnCc?.text = ccLabel()
                                playerCommand("ccnative", 0)
                                ccView?.visibility = View.GONE
                                if (fsControlsMode) showCcDebug()
                            }
                        }
                    }.start()
                }
            }, 900)
        } else if (ccSentences != null) {
            val ua = webView.settings.userAgentString
            ccStartWorker(ua)
        }
    }

    private val ccTick: Runnable = object : Runnable {
        override fun run() {
            if ((ccMode != 1 && ccMode != 2) || !fullScreenActive()) {
                ccTicking = false
                ccView?.visibility = View.GONE
                return
            }
            webView.evaluateJavascript(
                "(window.__tvRefreshStatus && window.__tvRefreshStatus(), window.__tvStatusJson || '')"
            ) { raw ->
                try {
                    val str = org.json.JSONTokener(raw ?: "").nextValue() as? String ?: ""
                    if (str.isNotEmpty()) ccNow = org.json.JSONObject(str).optDouble("t", ccNow)
                } catch (_: Exception) {
                }
                ccRender()
            }
            handler.postDelayed(this, 350)
        }
    }

    private fun ccTargetJa(): Boolean = ccMode == 2

    private fun ccRender() {
        val v = ccView ?: return
        if (ccMode != 1 && ccMode != 2) return
        val list = ccSentences ?: return
        if (list.isEmpty()) return
        val t = ccNow
        var lo = 0
        var hi = list.size - 1
        var idx = -1
        while (lo <= hi) {
            val mid = (lo + hi) / 2
            if (list[mid].start <= t) { idx = mid; lo = mid + 1 } else hi = mid - 1
        }
        if (idx < 0 || t > list[idx].end + 1.0) {
            v.visibility = View.GONE
            return
        }
        val sentence = list[idx]
        val tl = if (ccTargetJa()) "ja" else "en"
        val needs = sentence.ja != ccTargetJa()
        val translated = if (needs) ccCache[tl + ":" + idx] else null
        v.text = translated ?: sentence.text
        v.alpha = if (needs && translated == null) 0.55f else 1f
        v.translationY = if (fsControlsMode) -((fsOverlay?.height ?: 0).toFloat()) else 0f
        v.visibility = View.VISIBLE
        if (root.getChildAt(root.childCount - 1) !== v) root.bringChildToFront(v)
    }

    // Translates the sentences just ahead of the playhead, one at a time, and keeps them for later.
    private fun ccStartWorker(ua: String) {
        if (ccWorkerRunning) return
        ccWorkerRunning = true
        Thread {
            try {
                while ((ccMode == 1 || ccMode == 2) && ccSentences != null) {
                    val list = ccSentences ?: break
                    val toJa = ccTargetJa()
                    val tl = if (toJa) "ja" else "en"
                    val t = ccNow
                    var target = -1
                    var i = 0
                    var lo = 0
                    var hi = list.size - 1
                    while (lo <= hi) {
                        val mid = (lo + hi) / 2
                        if (list[mid].start < t - 3) lo = mid + 1 else hi = mid - 1
                    }
                    i = lo
                    while (i < list.size && list[i].start < t + 240) {
                        if (list[i].ja != toJa && !ccCache.containsKey(tl + ":" + i)) { target = i; break }
                        i++
                    }
                    if (target < 0) {
                        Thread.sleep(700)
                        continue
                    }
                    val out = ccTranslate(list[target].text, tl, ua)
                    if (out != null) ccCache[tl + ":" + target] = out else Thread.sleep(2500)
                    Thread.sleep(150)
                }
            } finally {
                ccWorkerRunning = false
            }
        }.start()
    }

    // Google's free web translation, one sentence per request, backing off if it asks us to slow down.
    private fun ccTranslate(text: String, tl: String, ua: String): String? {
        if (System.currentTimeMillis() < ccBackoffUntil) return null
        return try {
            val url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + tl +
                "&dt=t&q=" + java.net.URLEncoder.encode(text, "UTF-8")
            val (code, body) = httpGetText(url, 200000, ua)
            if (code == 429 || code == 403 || code == 503) {
                ccBackoffUntil = System.currentTimeMillis() + 60000
                null
            } else if (code != 200) {
                null
            } else {
                val segs = org.json.JSONArray(body).getJSONArray(0)
                val sb = StringBuilder()
                for (k in 0 until segs.length()) {
                    val seg = segs.optJSONArray(k) ?: continue
                    sb.append(seg.optString(0, ""))
                }
                sb.toString().trim().ifEmpty { null }
            }
        } catch (_: Exception) {
            null
        }
    }

    // Finds the video's caption file (WebVTT) through the player's settings and returns its text.
    private fun fetchCcVtt(src: String, vid: String, ua: String): String? {
        val configs = ArrayList<String>()
        val h = Regex("[?&]h=([0-9a-fA-F]+)").find(src)?.groupValues?.get(1)
        val hq = if (h != null) "?h=" + h else ""
        if (vid.isNotEmpty()) configs.add("https://player.vimeo.com/video/" + vid + "/config" + hq)
        val m = Regex("video/(\\d+)").find(src)
        if (m != null) configs.add("https://player.vimeo.com/video/" + m.groupValues[1] + "/config" + hq)
        if (src.contains("/event/")) {
            try {
                val (_, html) = httpGetText(src, 800000, ua)
                val cm = Regex("\"config_url\"\\s*:\\s*\"([^\"]+)\"").find(html)
                if (cm != null) configs.add(cm.groupValues[1].replace("\\/", "/").replace("\\u0026", "&"))
                val vm = Regex("player\\.vimeo\\.com\\\\?/video\\\\?/(\\d+)").find(html)
                if (vm != null) configs.add("https://player.vimeo.com/video/" + vm.groupValues[1] + "/config")
            } catch (_: Exception) {
            }
        }
        for (cfg in configs) {
            try {
                val (code, body) = httpGetText(cfg, 800000, ua)
                if (code != 200) continue
                val tt = org.json.JSONObject(body).optJSONObject("request")?.optJSONArray("text_tracks") ?: continue
                for (i in 0 until tt.length()) {
                    var u = tt.getJSONObject(i).optString("url", "")
                    if (u.startsWith("/")) u = "https://player.vimeo.com" + u
                    if (u.isEmpty()) continue
                    val (c2, vtt) = httpGetText(u, 6000000, ua)
                    if (c2 == 200 && vtt.contains("-->")) return vtt
                }
            } catch (_: Exception) {
            }
        }
        return null
    }

    private fun isJapaneseText(t: String): Boolean {
        var ja = 0
        for (c in t) {
            if ((c in '\u3040'..'\u30ff') || (c in '\u4e00'..'\u9fff')) ja++
        }
        return ja > 0 && ja * 5 >= t.length
    }

    private fun isCjkChar(c: Char): Boolean =
        (c in '\u3000'..'\u30ff') || (c in '\u4e00'..'\u9fff') || (c in '\uff00'..'\uffef')

    // Turns the caption file's short, mid-sentence cues into whole sentences with the stray spaces removed.
    private fun parseVttToSentences(vtt: String): List<CcSentence> {
        val timeRe = Regex("(?:(\\d+):)?(\\d{1,2}):(\\d{2})[.,](\\d{3})\\s*-->\\s*(?:(\\d+):)?(\\d{1,2}):(\\d{2})[.,](\\d{3})")
        val tagRe = Regex("<[^>]+>")
        val spaceRe = Regex("\\s+")
        val cjkGap = Regex("(?<=[\\u3000-\\u30ff\\u4e00-\\u9fff\\uff00-\\uffef])\\s+(?=[\\u3000-\\u30ff\\u4e00-\\u9fff\\uff00-\\uffef])")
        fun sec(h: String, mn: String, s: String, ms: String): Double =
            (if (h.isEmpty()) 0 else h.toInt()) * 3600.0 + mn.toInt() * 60 + s.toInt() + ms.toInt() / 1000.0

        val out = ArrayList<CcSentence>()
        val lines = vtt.split("\n")
        val cur = StringBuilder()
        var curStart = 0.0
        var curEnd = 0.0
        var lastText = ""
        fun flush() {
            val tx = cur.toString().trim()
            if (tx.isNotEmpty()) out.add(CcSentence(curStart, curEnd, tx, isJapaneseText(tx)))
            cur.setLength(0)
        }
        var i = 0
        while (i < lines.size) {
            val m = timeRe.find(lines[i])
            if (m == null) { i++; continue }
            val g = m.groupValues
            val st = sec(g[1], g[2], g[3], g[4])
            val en = sec(g[5], g[6], g[7], g[8])
            val sb = StringBuilder()
            i++
            while (i < lines.size && lines[i].trim().isNotEmpty()) {
                sb.append(lines[i].trim()).append(' ')
                i++
            }
            var tx = sb.toString().replace(tagRe, "").replace(spaceRe, " ").trim()
            tx = tx.replace(cjkGap, "")
            if (tx.none { it.isLetterOrDigit() }) continue
            if (tx == lastText) continue
            lastText = tx
            if (cur.isNotEmpty() && (st - curEnd > 2.0 || cur.length > 160)) flush()
            if (cur.isEmpty()) {
                curStart = st
                cur.append(tx)
            } else {
                val a = cur[cur.length - 1]
                val b = tx[0]
                if (!(isCjkChar(a) || isCjkChar(b))) cur.append(' ')
                cur.append(tx)
            }
            curEnd = maxOf(curEnd, en)
            val last = tx[tx.length - 1]
            if (last == '.' || last == '!' || last == '?' || last == '。' || last == '！' || last == '？') flush()
        }
        flush()
        return out
    }

    // ---- Caption debugging (shown after the CC button is pressed) ----
    private fun showCcDebug() {
        val dbg = fsDebugView ?: return
        dbg.text = "CC debug: reading..."
        dbg.visibility = View.VISIBLE
        webView.evaluateJavascript("window.__tvCueCount = window.__tvCueCount || 0; window.__tvCcJson = ''; window.__tvCcRefresh && window.__tvCcRefresh(); 1", null)
        handler.postDelayed({ readCcDebug() }, 800)
        handler.postDelayed({ if (dbg.visibility == View.VISIBLE) readCcDebug() }, 4000)
        handler.postDelayed({ dbg.visibility = View.GONE }, 30000)
    }

    private fun readCcDebug() {
        val dbg = fsDebugView ?: return
        webView.evaluateJavascript("window.__tvCcJson || ''") { raw ->
            if (raw == null || raw == "null") return@evaluateJavascript
            val str = try { org.json.JSONTokener(raw).nextValue() as? String ?: "" } catch (_: Exception) { "" }
            if (str.isEmpty()) return@evaluateJavascript
            val j = try { org.json.JSONObject(str) } catch (_: Exception) { return@evaluateJavascript }
            val sb = StringBuilder("CC debug\n")
            if (j.has("err")) sb.append("Player: ").append(j.optString("err")).append('\n')
            val tracks = j.optJSONArray("tracks")
            sb.append("Player tracks: ").append(tracks?.length() ?: 0).append('\n')
            if (tracks != null) {
                for (i in 0 until tracks.length()) {
                    val t = tracks.getJSONObject(i)
                    sb.append("  ").append(t.optString("language")).append(" | ").append(t.optString("label"))
                        .append(" | ").append(t.optString("kind")).append(" | ").append(t.optString("mode")).append('\n')
                }
            }
            sb.append("Lines seen while showing: ").append(j.optInt("cues", 0))
            val last = j.optString("last", "")
            if (last.isNotEmpty()) sb.append("  last: ").append(last.take(60))
            sb.append('\n')
            dbg.text = sb.toString() + "Caption file: checking..."
            val src = j.optString("src", "")
            if (src.isEmpty()) {
                dbg.text = sb.toString() + "Caption file: no player address"
                return@evaluateJavascript
            }
            val ua = webView.settings.userAgentString
            Thread {
                val report = ccFileReport(src, ua)
                runOnUiThread { if (dbg.visibility == View.VISIBLE) dbg.text = sb.toString() + report }
            }.start()
        }
    }

    // Looks up the player's own caption files (with the site as referrer) and reports whether they can be read.
    private fun ccFileReport(src: String, ua: String): String {
        val out = StringBuilder()
        try {
            var cfg: String? = null
            val m = Regex("video/(\\d+)").find(src)
            if (m != null) {
                val h = Regex("[?&]h=([0-9a-fA-F]+)").find(src)?.groupValues?.get(1)
                cfg = "https://player.vimeo.com/video/" + m.groupValues[1] + "/config" + (if (h != null) "?h=" + h else "")
            } else {
                // Live-event style embed (vimeo.com/event/...): look inside the embed page for the video's config link.
                val (ec, html) = httpGetText(src, 800000, ua)
                out.append("Embed page: HTTP ").append(ec).append(", ").append(html.length / 1024).append(" KB\n")
                val cm = Regex("\"config_url\"\\s*:\\s*\"([^\"]+)\"").find(html)
                if (cm != null) {
                    cfg = cm.groupValues[1].replace("\\/", "/").replace("\\u0026", "&")
                } else {
                    val vm = Regex("player\\.vimeo\\.com\\\\?/video\\\\?/(\\d+)").find(html)
                    if (vm != null) cfg = "https://player.vimeo.com/video/" + vm.groupValues[1] + "/config"
                }
                out.append("Has text_tracks: ").append(html.contains("text_tracks")).append(", .vtt links: ")
                    .append(Regex("\\.vtt").findAll(html).count()).append(", config link: ")
                    .append(if (cfg != null) "found" else "not found").append('\n')
            }
            if (cfg == null) return out.toString()
            val (code, body) = httpGetText(cfg, 400000, ua)
            out.append("Config: HTTP ").append(code).append('\n')
            if (code != 200) return out.toString()
            val tt = org.json.JSONObject(body).optJSONObject("request")?.optJSONArray("text_tracks")
            out.append("Config caption tracks: ").append(tt?.length() ?: 0).append('\n')
            if (tt != null) {
                for (i in 0 until tt.length().coerceAtMost(4)) {
                    val t = tt.getJSONObject(i)
                    var u = t.optString("url", "")
                    if (u.startsWith("/")) u = "https://player.vimeo.com" + u
                    out.append("  ").append(t.optString("lang")).append(" | ").append(t.optString("label"))
                        .append(" | ").append(t.optString("kind")).append(" -> ")
                    if (u.isEmpty()) {
                        out.append("no file link\n")
                    } else {
                        val (c2, txt) = httpGetText(u, 2000000, ua)
                        val cues = Regex("-->").findAll(txt).count()
                        out.append("file HTTP ").append(c2).append(", ").append(cues).append(" lines, ")
                            .append(txt.length / 1024).append(" KB\n")
                    }
                }
            }
        } catch (e: Exception) {
            out.append("Caption file error: ").append(e.javaClass.simpleName).append(' ').append((e.message ?: "").take(80))
        }
        return out.toString()
    }

    private fun httpGetText(url: String, maxChars: Int, ua: String): Pair<Int, String> {
        val c = java.net.URL(url).openConnection() as java.net.HttpURLConnection
        c.connectTimeout = 8000
        c.readTimeout = 8000
        c.setRequestProperty("Referer", "https://www.stardom-world.com/")
        c.setRequestProperty("User-Agent", ua)
        val code = c.responseCode
        val text = try {
            (if (code in 200..299) c.inputStream else c.errorStream)?.bufferedReader()?.use { r ->
                val buf = CharArray(8192)
                val sb = StringBuilder()
                while (sb.length < maxChars) {
                    val n = r.read(buf)
                    if (n < 0) break
                    sb.append(buf, 0, n)
                }
                sb.toString()
            } ?: ""
        } catch (_: Exception) { "" }
        c.disconnect()
        return Pair(code, text)
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
        handler.removeCallbacks(ccTick)
        ccTicking = false
        ccView?.visibility = View.GONE
        handler.removeCallbacks(fsNudgeRunnable)
        handler.removeCallbacks(hideControlsRunnable)
        handler.removeCallbacks(fsPulse)
        fsPulseRunning = false
        refreshCursorVisibility()
        playerCtrlPos = 0
        handler.postDelayed({ webView.evaluateJavascript("window.__tvFocusBar && window.__tvFocusBar('full')", null) }, 400)
        for (delay in longArrayOf(250L, 900L, 1800L)) {
            handler.postDelayed({ webView.evaluateJavascript("window.__tvRefitPlayer && window.__tvRefitPlayer()", null) }, delay)
        }
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
                    if (sideMenuOpen) {
                        // Back puts the side menu away before it does anything else.
                        webView.evaluateJavascript("(function(){ return window.__tvMenuClose ? window.__tvMenuClose() : false; })()", null)
                        sideMenuOpen = false
                        return true
                    }
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

        // Full screen: Left/Right skip 30 s (60 s while held or with the FF/RW keys), OK plays/pauses.
        // The keys never reach the player itself, so its controls are not stuck in keyboard mode.
        if (fullScreenActive()) {
            if (fsControlsMode) {
                // The button bar is showing: the remote moves between its buttons and OK presses one.
                when (event.keyCode) {
                    KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN -> {
                        val onSkip = fsBtns["back"]?.isFocused == true || fsBtns["fwd"]?.isFocused == true
                        if (event.action == KeyEvent.ACTION_DOWN) {
                            if (onSkip) {
                                skipStep(if (event.keyCode == KeyEvent.KEYCODE_DPAD_UP) 1 else -1)
                                for ((id, btn) in fsBtns) if (id == "back" || id == "fwd") btn.text = barLabel(id, null)
                                showFsSkipHint()
                                fullScreenInteraction()
                            } else if (event.keyCode == KeyEvent.KEYCODE_DPAD_UP) {
                                hideFsOverlay()
                            }
                        }
                        return true
                    }
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
                        val step = if (media || event.repeatCount > 0) 60 else 30
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
                        webView.evaluateJavascript("window.__tvLeavePlayer && window.__tvLeavePlayer('" + dir + "')", null)
                    }
                    return true
                }
                KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> {
                    if (event.action == KeyEvent.ACTION_DOWN) {
                        if (event.keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) playerCtrlPos++
                        else if (playerCtrlPos > 1) playerCtrlPos--
                        else return true
                    }
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

    private class Slide(val title: String, val body: String, val art: Int)

    private fun buildSlides() = if (isJa) listOf(
        Slide(
            "テレビで Stardom World へようこそ",
            "リモコンでの操作方法をかんたんにご紹介します。",
            0
        ),
        Slide(
            "移動のしかた",
            "矢印ボタンで動画やメニューを移動します。OKで選択した項目を開き、戻るボタンで前のページに戻ります。",
            1
        ),
        Slide(
            "メニュー",
            "各列や一覧の一番左の動画で左ボタンを押すとメニューが開き、右ボタンか戻るボタンで閉じます。検索、番組、王座、年別、選手、マイビデオ、みんなの動画、アカウント、言語の切り替えがあります。",
            6
        ),
        Slide(
            "お気に入りに追加",
            "動画を選択して、リモコンのオプション(メニュー)ボタンを押すと、お気に入りに追加・削除できます。ログインが必要です。",
            2
        ),
        Slide(
            "カーソルモード",
            "OKを約0.5秒長押しするとポインターが表示されます。「人間であることを確認」のチェックなどに使えます。もう一度長押しすると解除されます。",
            3
        ),
        Slide(
            "動画と全画面表示",
            "動画は全画面で開き、次の動画が自動で再生されます。下ボタンでコントロールバー、左右ボタンでスキップ、戻るボタンで全画面を終了します。",
            4
        ),
        Slide(
            "日本語と英語",
            "メニューを開き、一番下の EN / 日本語 の切り替えでいつでも言語を変えられます。",
            5
        )
    ) else listOf(
        Slide(
            "Welcome to Stardom World on TV",
            "A quick tour of getting around with your remote.",
            0
        ),
        Slide(
            "Moving around",
            "Use the arrow buttons to move between videos and menus. OK opens what is highlighted, and Back returns to the previous page.",
            1
        ),
        Slide(
            "The menu",
            "Press Left on the first video in any row or list to open the menu, and Right or Back to close it. Inside you will find Search, Shows, Championships, Years, Wrestlers, My Videos, Community, your Account and the language switch.",
            6
        ),
        Slide(
            "Add to favorites",
            "Highlight a video and press the Options (menu) button on your remote to add it to, or remove it from, your favorites. You need to be signed in.",
            2
        ),
        Slide(
            "Cursor mode",
            "Hold OK for about half a second to turn on a pointer, for things like the \"Verify you are human\" box. Hold OK again to turn it off.",
            3
        ),
        Slide(
            "Videos and full screen",
            "Videos open in full screen and the next one plays by itself. Press Down for the controls bar, Left and Right to skip, and Back to leave full screen.",
            4
        ),
        Slide(
            "English or Japanese",
            "Open the menu and use the EN / 日本語 switch at the bottom to change language at any time.",
            5
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
        art.type = if (langStep) 0 else slides[index].art
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
                6 -> {
                    // The menu: a panel of rows on the left, and the remote's Left button pointing at it.
                    tmp.set(cx - 86f * u, cy - 44f * u, cx - 28f * u, cy + 44f * u)
                    canvas.drawRoundRect(tmp, 5f * u, 5f * u, fillDim)
                    canvas.drawRoundRect(tmp, 5f * u, 5f * u, line)
                    for (k in 0..5) {
                        val top = cy - 36f * u + k * 13f * u
                        tmp.set(cx - 80f * u, top, cx - 80f * u + (if (k % 2 == 0) 40f else 30f) * u, top + 5f * u)
                        canvas.drawRoundRect(tmp, 2.5f * u, 2.5f * u, if (k == 1) fillGold else fillWhite)
                    }
                    canvas.drawCircle(cx + 56f * u, cy, 28f * u, fillDim)
                    canvas.drawCircle(cx + 56f * u, cy, 28f * u, line)
                    triangle(canvas, cx + 36f * u, cy, cx + 48f * u, cy - 9f * u, cx + 48f * u, cy + 9f * u, fillGold)
                    triangle(canvas, cx + 76f * u, cy, cx + 64f * u, cy - 9f * u, cx + 64f * u, cy + 9f * u, fillWhite)
                    canvas.drawLine(cx + 24f * u, cy, cx - 18f * u, cy, line)
                    triangle(canvas, cx - 24f * u, cy, cx - 14f * u, cy - 6f * u, cx - 14f * u, cy + 6f * u, fillGold)
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
