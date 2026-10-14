package com.example.tvhub

import android.animation.ObjectAnimator
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
import android.widget.TextView
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
        private const val PAGE_NOTCH = 6f

        // Width the page believes the screen is, in CSS pixels. Wider = more videos
        // per row but smaller text.
        private const val LAYOUT_WIDTH = 1440

        private const val SPLASH_MIN_MS = 1100L
        private const val APP_VERSION = "v1.0.4"
        private const val SPLASH_MAX_MS = 10000L

        private const val TV_CSS_B64 = "aHRtbCwgYm9keSwgI3BhZ2UtY29udGVudHMtc2VhcmNoLCAjcGFnZS1jb250ZW50cy1pbmRleCwgI21haW4tY29udGVudHMsIG1haW4sIC53cmFwcGVyLCBoZWFkZXIsIC5ib3gtaGVhZGVyLCAuaGVhZGVyLCBuYXYsIC5uYXYtaW5uZXIsIC5nbG9iYWwtbmF2LCAuY29udGVudC1saXN0LCAuY29udGVudC1pbmZvLWJveCwgLm1vZGFsLWNvbnRlbnQsIC5iZy1kYXJrLCAuYmctbGlnaHQsIC5ib3gtc2VjdGlvbiwgLmJveC1zb3J0LCAuYm94LXNlYXJjaCwgc2VjdGlvbiwgLmNvbnRhaW5lciwgLmNvbnRhaW5lci1mbHVpZCwgLmNvbC0xMiwgLnJvdywgLnRpbGUtaW5uZXIsIC5sLXdyYXAtbWQsIC50dGwtd3JhcCwgLnNsaWNrLXNsaWRlciwgLnNsaWNrLWxpc3QsIC5zbGljay10cmFjaywgLnNsaWNrLXNsaWRlLCAuc2xpY2stYXJyb3csIC5zbGljay1uZXh0LCAuc2xpY2stcHJldiB7CiAgICBiYWNrZ3JvdW5kOiAjMDAwMDAwICFpbXBvcnRhbnQ7CiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDAwMDAwICFpbXBvcnRhbnQ7CiAgICBjb2xvcjogI2ZmZmZmZiAhaW1wb3J0YW50OwogICAgYm94LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50OwogICAgYm9yZGVyOiBub25lICFpbXBvcnRhbnQ7Cn0KLmNvbnRlbnQtdGh1bWJuYWlsLWJveC1pbm5lciB7CiAgICBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudCAhaW1wb3J0YW50Owp9CmhlYWRlciwgLmJveC1oZWFkZXIsIG5hdiwgLm5hdi1pbm5lciwgaGVhZGVyOjphZnRlciwgLmJveC1oZWFkZXI6OmFmdGVyLCAubmF2LWlubmVyOjphZnRlciwgaHIsIC5ib3JkZXItYm90dG9tIHsKICAgIGJvcmRlcjogbm9uZSAhaW1wb3J0YW50OwogICAgYm9yZGVyLWJvdHRvbTogbm9uZSAhaW1wb3J0YW50OwogICAgYm94LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50Owp9Ci5jb250ZW50LXN0YXR1cy1ib3gsIC50YWcsIC50YWcucHJlbWl1bSwgLmNvbnRlbnQtc3RhdHVzLWJveCBzcGFuLCBbY2xhc3MqPSJ0YWciXSwgW2NsYXNzKj0icHJlbWl1bSJdIHsKICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsKICAgIHZpc2liaWxpdHk6IGhpZGRlbiAhaW1wb3J0YW50OwogICAgb3BhY2l0eTogMCAhaW1wb3J0YW50Owp9Ci5uZXdzLXdyYXAsIHNlY3Rpb24ubmV3cy13cmFwLCAudGlsZS1pbm5lci5uZXdzLXdyYXAsIFtjbGFzcyo9Im5ld3Mtd3JhcCJdIHsKICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsKICAgIHZpc2liaWxpdHk6IGhpZGRlbiAhaW1wb3J0YW50OwogICAgaGVpZ2h0OiAwICFpbXBvcnRhbnQ7CiAgICBtYXJnaW46IDAgIWltcG9ydGFudDsKICAgIHBhZGRpbmc6IDAgIWltcG9ydGFudDsKfQovKiBIaWRlIGJyZWFkY3J1bWJzIGxpbmUgYmVsb3cgbmF2aWdhdGlvbiAtIGNhc2Utc2Vuc2l0aXZlIGNhbWVsQ2FzZSBtYXRjaGluZyAqLwpuYXYuYm94LWJyZWFkQ3J1bWIsIC5ib3gtYnJlYWRDcnVtYiwgLmxpc3QtYnJlYWRDcnVtYiwgW2NsYXNzKj0iYnJlYWRDcnVtYiJdLCBbY2xhc3MqPSJicmVhZGNydW1iIiBpXSwgLnRvcGljLXBhdGgsIG9sLmJyZWFkY3J1bWIsIHVsLmJyZWFkY3J1bWIgewogICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OwogICAgdmlzaWJpbGl0eTogaGlkZGVuICFpbXBvcnRhbnQ7CiAgICBoZWlnaHQ6IDAgIWltcG9ydGFudDsKICAgIG1pbi1oZWlnaHQ6IDAgIWltcG9ydGFudDsKICAgIG1hcmdpbjogMCAhaW1wb3J0YW50OwogICAgcGFkZGluZzogMCAhaW1wb3J0YW50Owp9Ci8qIEhpZGUgc2Vjb25kYXJ5IHJlcGVhdGluZyBzbWFsbGVyIHRleHQgbGluZXMgYmVsb3cgbWFpbiBzZXQgdGl0bGUgKi8KLndzd2ctd3JhcCwgLmRldGFpbC13cmFwIHAsIC5pbm5lci1zbSBwLCBwLnR4dC1tZCwgcC50eHQtZ3IsIC5ib3gtc2V0LWRldGFpbCBwLCAuYm94LXNldC1pbmZvIHAsIC5zZXQtaW5mby10ZXh0LCAubGlzdC1idG4gewogICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OwogICAgdmlzaWJpbGl0eTogaGlkZGVuICFpbXBvcnRhbnQ7CiAgICBoZWlnaHQ6IDAgIWltcG9ydGFudDsKICAgIG1hcmdpbjogMCAhaW1wb3J0YW50OwogICAgcGFkZGluZzogMCAhaW1wb3J0YW50Owp9Ci8qIFJlbW92ZSBlbnRpcmUgZ3JleSBib3ggc2VjdGlvbiBhbmQgY29sbGFwc2UgZW1wdHkgc3BhY2Ugb24gc2V0IHBhZ2VzICovCi5kZXRhaWwtd3JhcCwgLmJveC1jb250ZW50cy1kZXRhaWwsIC5ib3gtc2V0LWRldGFpbCwgLmJveC1kZXRhaWwsIC5ib3gtY29udGVudHMtaW5mbywgLmJveC1jb250ZW50cy1oZWFkLCBkaXZbY2xhc3MqPSJkZXRhaWwiXSB7CiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7CiAgICB2aXNpYmlsaXR5OiBoaWRkZW4gIWltcG9ydGFudDsKICAgIGhlaWdodDogMCAhaW1wb3J0YW50OwogICAgbWluLWhlaWdodDogMCAhaW1wb3J0YW50OwogICAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7CiAgICBwYWRkaW5nOiAwICFpbXBvcnRhbnQ7Cn0KLmNvbnRlbnQtdHRsLXdyYXAsIC5ib3gtY29udGVudCwgLnRpbGUtaW5uZXIgewogICAgbWFyZ2luLWJvdHRvbTogMCAhaW1wb3J0YW50OwogICAgcGFkZGluZy1ib3R0b206IDAgIWltcG9ydGFudDsKICAgIG1pbi1oZWlnaHQ6IHVuc2V0ICFpbXBvcnRhbnQ7Cn0KZm9vdGVyIG5hdiwgZm9vdGVyIC5jb250YWluZXIsIC5mb290ZXItbG9nbywgLmJveC1jb3B5cmlnaHQsIGZvb3RlciB1bCB7CiAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7CiAgICB2aXNpYmlsaXR5OiBoaWRkZW4gIWltcG9ydGFudDsKfQpmb290ZXIsIC5ib3gtZm9vdGVyIHsKICAgIGRpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7CiAgICBiYWNrZ3JvdW5kOiAjMDAwMDAwICFpbXBvcnRhbnQ7CiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDAwMDAwICFpbXBvcnRhbnQ7CiAgICBwYWRkaW5nOiAzMHB4IDAgNjBweCAwICFpbXBvcnRhbnQ7CiAgICBtYXJnaW46IDAgIWltcG9ydGFudDsKICAgIGJvcmRlcjogbm9uZSAhaW1wb3J0YW50OwogICAgdGV4dC1hbGlnbjogY2VudGVyICFpbXBvcnRhbnQ7Cn0KI3RvVG9wQnRuLCAuVG9wQnRuLCBhLlRvcEJ0biB7CiAgICBmb250LXNpemU6IDAgIWltcG9ydGFudDsKICAgIGNvbG9yOiB0cmFuc3BhcmVudCAhaW1wb3J0YW50OwogICAgdGV4dC1pbmRlbnQ6IC05OTk5cHggIWltcG9ydGFudDsKICAgIG92ZXJmbG93OiBoaWRkZW4gIWltcG9ydGFudDsKICAgIGRpc3BsYXk6IGlubGluZS1ibG9jayAhaW1wb3J0YW50OwogICAgdmlzaWJpbGl0eTogdmlzaWJsZSAhaW1wb3J0YW50OwogICAgb3BhY2l0eTogMSAhaW1wb3J0YW50OwogICAgcG9zaXRpb246IHJlbGF0aXZlICFpbXBvcnRhbnQ7CiAgICBtYXJnaW46IDAgYXV0byAhaW1wb3J0YW50OwogICAgbGVmdDogMCAhaW1wb3J0YW50OwogICAgcmlnaHQ6IDAgIWltcG9ydGFudDsKICAgIHRvcDogMCAhaW1wb3J0YW50OwogICAgYm90dG9tOiAwICFpbXBvcnRhbnQ7CiAgICB0cmFuc2Zvcm06IG5vbmUgIWltcG9ydGFudDsKICAgIHdpZHRoOiA1MnB4ICFpbXBvcnRhbnQ7CiAgICBoZWlnaHQ6IDUycHggIWltcG9ydGFudDsKICAgIGJhY2tncm91bmQtY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsKICAgIGJvcmRlci1yYWRpdXM6IDUwJSAhaW1wb3J0YW50OwogICAgbGluZS1oZWlnaHQ6IDUycHggIWltcG9ydGFudDsKICAgIHRleHQtYWxpZ246IGNlbnRlciAhaW1wb3J0YW50OwogICAgei1pbmRleDogOTk5OTkgIWltcG9ydGFudDsKICAgIGN1cnNvcjogcG9pbnRlciAhaW1wb3J0YW50Owp9CiN0b1RvcEJ0bjo6YWZ0ZXIsIC5Ub3BCdG46OmFmdGVyLCBhLlRvcEJ0bjo6YWZ0ZXIgewogICAgY29udGVudDogIuKWsiIgIWltcG9ydGFudDsKICAgIGNvbG9yOiAjMDAwMDAwICFpbXBvcnRhbnQ7CiAgICBmb250LXNpemU6IDE4cHggIWltcG9ydGFudDsKICAgIGZvbnQtd2VpZ2h0OiBib2xkICFpbXBvcnRhbnQ7CiAgICB0ZXh0LWluZGVudDogMCAhaW1wb3J0YW50OwogICAgZGlzcGxheTogZmxleCAhaW1wb3J0YW50OwogICAgYWxpZ24taXRlbXM6IGNlbnRlciAhaW1wb3J0YW50OwogICAganVzdGlmeS1jb250ZW50OiBjZW50ZXIgIWltcG9ydGFudDsKICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7CiAgICBoZWlnaHQ6IDEwMCUgIWltcG9ydGFudDsKICAgIGxpbmUtaGVpZ2h0OiA1MnB4ICFpbXBvcnRhbnQ7Cn0KLnNsaWNrLW5leHQsIC5zbGljay1wcmV2LCAuc2xpY2stYXJyb3cgewogICAgYmFja2dyb3VuZDogIzAwMDAwMCAhaW1wb3J0YW50OwogICAgYmFja2dyb3VuZC1jb2xvcjogIzAwMDAwMCAhaW1wb3J0YW50OwogICAgYm9yZGVyOiBub25lICFpbXBvcnRhbnQ7Cn0KLnNsaWNrLW5leHQ6OmJlZm9yZSwgLnNsaWNrLXByZXY6OmJlZm9yZSB7CiAgICBjb2xvcjogI2ZmZmZmZiAhaW1wb3J0YW50OwogICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQgIWltcG9ydGFudDsKfQouY29udGVudC1pbmZvLWJveCwgLmpzLXRpbGVmaXggewogICAgaGVpZ2h0OiBhdXRvICFpbXBvcnRhbnQ7CiAgICBtaW4taGVpZ2h0OiA2NHB4ICFpbXBvcnRhbnQ7CiAgICBvdmVyZmxvdzogdmlzaWJsZSAhaW1wb3J0YW50Owp9Ci5jb250ZW50LWluZm8tYm94IC50dGwteHMsIC50dGwteHMuZWxsaXBzaXMsIGgzLnR0bC14cywgLmNvbnRlbnQtaW5mby1ib3ggaDMsIC5jb250ZW50LWluZm8tYm94IGgzIGEsIC5jb250ZW50LWluZm8tYm94IGZvbnQgewogICAgd2hpdGUtc3BhY2U6IG5vcm1hbCAhaW1wb3J0YW50OwogICAgZGlzcGxheTogLXdlYmtpdC1ib3ggIWltcG9ydGFudDsKICAgIC13ZWJraXQtbGluZS1jbGFtcDogMyAhaW1wb3J0YW50OwogICAgLXdlYmtpdC1ib3gtb3JpZW50OiB2ZXJ0aWNhbCAhaW1wb3J0YW50OwogICAgb3ZlcmZsb3c6IGhpZGRlbiAhaW1wb3J0YW50OwogICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXMgIWltcG9ydGFudDsKICAgIGhlaWdodDogYXV0byAhaW1wb3J0YW50OwogICAgbWluLWhlaWdodDogNC40ZW0gIWltcG9ydGFudDsKICAgIG1heC1oZWlnaHQ6IDQuOGVtICFpbXBvcnRhbnQ7CiAgICBsaW5lLWhlaWdodDogMS40NWVtICFpbXBvcnRhbnQ7CiAgICBmb250LXNpemU6IDE1cHggIWltcG9ydGFudDsKICAgIGNvbG9yOiAjZmZmZmZmICFpbXBvcnRhbnQ7CiAgICBtYXJnaW4tYm90dG9tOiA2cHggIWltcG9ydGFudDsKICAgIHBhZGRpbmctYm90dG9tOiAycHggIWltcG9ydGFudDsKfQouY29udGVudC1saXN0LWl0ZW0sIC5jb250ZW50LWxpc3QgPiBkaXYsIGFydGljbGUgewogICAgbWFyZ2luLWJvdHRvbTogMTZweCAhaW1wb3J0YW50OwogICAgcGFkZGluZy1ib3R0b206IDRweCAhaW1wb3J0YW50Owp9CiN0di1oZWFkZXItZmxleC13cmFwcGVyIHsKICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDsKICAgIGZsZXgtZGlyZWN0aW9uOiByb3cgIWltcG9ydGFudDsKICAgIGFsaWduLWl0ZW1zOiBjZW50ZXIgIWltcG9ydGFudDsKICAgIGp1c3RpZnktY29udGVudDogY2VudGVyICFpbXBvcnRhbnQ7CiAgICBnYXA6IDE2cHggIWltcG9ydGFudDsKICAgIG1hcmdpbjogMCBhdXRvICFpbXBvcnRhbnQ7CiAgICBoZWlnaHQ6IDQ0cHggIWltcG9ydGFudDsKfQpmb3JtLmZvcm0taW5saW5lLCAuYm94LXNlYXJjaCBmb3JtLCAuYm94LXNlYXJjaCAuaW5wdXQtZ3JvdXAsIC5pbnB1dC1ncm91cC5mbGV4LW5vd3JhcCB7CiAgICB3aWR0aDogMzIwcHggIWltcG9ydGFudDsKICAgIG1heC13aWR0aDogMzIwcHggIWltcG9ydGFudDsKICAgIGhlaWdodDogNDRweCAhaW1wb3J0YW50OwogICAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7CiAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudCAhaW1wb3J0YW50OwogICAgZGlzcGxheTogZmxleCAhaW1wb3J0YW50OwogICAgYWxpZ24taXRlbXM6IGNlbnRlciAhaW1wb3J0YW50Owp9CmZvcm0uZm9ybS1pbmxpbmUgaW5wdXQuZm9ybS1jb250cm9sLCBmb3JtLmZvcm0taW5saW5lIGlucHV0W3R5cGU9InRleHQiXSwgaW5wdXRbbmFtZT0icVtrZXl3b3JkXSJdIHsKICAgIGhlaWdodDogNDRweCAhaW1wb3J0YW50OwogICAgZm9udC1zaXplOiAxNXB4ICFpbXBvcnRhbnQ7CiAgICBwYWRkaW5nLWxlZnQ6IDE0cHggIWltcG9ydGFudDsKICAgIGJhY2tncm91bmQtY29sb3I6ICMxYTFhMWEgIWltcG9ydGFudDsKICAgIGNvbG9yOiAjZmZmZmZmICFpbXBvcnRhbnQ7CiAgICBib3JkZXI6IDFweCBzb2xpZCAjMzMzMzMzICFpbXBvcnRhbnQ7CiAgICBib3JkZXItcmFkaXVzOiA0cHggMCAwIDRweCAhaW1wb3J0YW50OwogICAgYm94LXNpemluZzogYm9yZGVyLWJveCAhaW1wb3J0YW50Owp9CmZvcm0uZm9ybS1pbmxpbmUgaW5wdXRbdHlwZT0ic3VibWl0Il0sIC5pbnB1dC1ncm91cCBpbnB1dFt0eXBlPSJzdWJtaXQiXSwgZm9ybVthY3Rpb24qPSJzZWFyY2giXSBpbnB1dFt0eXBlPSJzdWJtaXQiXSwgLmlucHV0LWdyb3VwLWJ0biwgLmlucHV0LWdyb3VwLWFwcGVuZCB7CiAgICBoZWlnaHQ6IDQ0cHggIWltcG9ydGFudDsKICAgIG1pbi13aWR0aDogNDhweCAhaW1wb3J0YW50OwogICAgZm9udC1zaXplOiAxNnB4ICFpbXBvcnRhbnQ7CiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMmEyYTJhICFpbXBvcnRhbnQ7CiAgICBjb2xvcjogI2ZmZmZmZiAhaW1wb3J0YW50OwogICAgYm9yZGVyOiAxcHggc29saWQgIzMzMzMzMyAhaW1wb3J0YW50OwogICAgYm9yZGVyLWxlZnQ6IG5vbmUgIWltcG9ydGFudDsKICAgIGJvcmRlci1yYWRpdXM6IDAgNHB4IDRweCAwICFpbXBvcnRhbnQ7CiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94ICFpbXBvcnRhbnQ7Cn0KLmdsb2JhbC1uYXYtbGlzdC5nbG9iYWwtbmF2IHsKICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsKfQojdHYtc2VjdGlvbi1zZWxlY3QgewogICAgd2lkdGg6IDMyMHB4ICFpbXBvcnRhbnQ7CiAgICBtYXgtd2lkdGg6IDMyMHB4ICFpbXBvcnRhbnQ7CiAgICBoZWlnaHQ6IDQ0cHggIWltcG9ydGFudDsKICAgIGJhY2tncm91bmQtY29sb3I6ICMxYTFhMWEgIWltcG9ydGFudDsKICAgIGNvbG9yOiAjZmZmZmZmICFpbXBvcnRhbnQ7CiAgICBib3JkZXI6IDFweCBzb2xpZCAjMzMzMzMzICFpbXBvcnRhbnQ7CiAgICBib3JkZXItcmFkaXVzOiA0cHggIWltcG9ydGFudDsKICAgIGZvbnQtc2l6ZTogMTVweCAhaW1wb3J0YW50OwogICAgZm9udC13ZWlnaHQ6IDUwMCAhaW1wb3J0YW50OwogICAgcGFkZGluZzogMCAxNHB4ICFpbXBvcnRhbnQ7CiAgICBtYXJnaW46IDAgIWltcG9ydGFudDsKICAgIG91dGxpbmU6IG5vbmUgIWltcG9ydGFudDsKICAgIGN1cnNvcjogcG9pbnRlciAhaW1wb3J0YW50OwogICAgZGlzcGxheTogaW5saW5lLWJsb2NrICFpbXBvcnRhbnQ7CiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94ICFpbXBvcnRhbnQ7CiAgICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlICFpbXBvcnRhbnQ7Cn0KI3R2LXNlY3Rpb24tc2VsZWN0IG9wdGlvbiB7CiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMTExMTExICFpbXBvcnRhbnQ7CiAgICBjb2xvcjogI2ZmZmZmZiAhaW1wb3J0YW50OwogICAgcGFkZGluZzogMTBweCAhaW1wb3J0YW50Owp9Ci5ib3gtc29ydCB7CiAgICBiYWNrZ3JvdW5kOiAjMDAwMDAwICFpbXBvcnRhbnQ7CiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMDAwMDAwICFpbXBvcnRhbnQ7CiAgICBwYWRkaW5nOiAxMnB4IDAgIWltcG9ydGFudDsKICAgIG1hcmdpbjogMTBweCAwIDE1cHggMCAhaW1wb3J0YW50OwogICAgdGV4dC1hbGlnbjogY2VudGVyICFpbXBvcnRhbnQ7CiAgICBkaXNwbGF5OiBibG9jayAhaW1wb3J0YW50OwogICAgYm9yZGVyOiBub25lICFpbXBvcnRhbnQ7Cn0KLmJveC1zb3J0ICogewogICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQgIWltcG9ydGFudDsKICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50ICFpbXBvcnRhbnQ7CiAgICBib3JkZXI6IG5vbmUgIWltcG9ydGFudDsKICAgIG91dGxpbmU6IG5vbmUgIWltcG9ydGFudDsKICAgIGJveC1zaGFkb3c6IG5vbmUgIWltcG9ydGFudDsKICAgIG1hcmdpbjogMCAhaW1wb3J0YW50OwogICAgcGFkZGluZzogMCAhaW1wb3J0YW50Owp9Ci5ib3gtc29ydCA+IGEsIC5ib3gtc29ydCBhLmJ0biB7CiAgICBmb250LXNpemU6IDE3cHggIWltcG9ydGFudDsKICAgIGZvbnQtd2VpZ2h0OiA1MDAgIWltcG9ydGFudDsKICAgIGNvbG9yOiAjYmJiYmJiICFpbXBvcnRhbnQ7CiAgICBwYWRkaW5nOiA2cHggMTRweCAhaW1wb3J0YW50OwogICAgbWFyZ2luOiAwIDhweCAhaW1wb3J0YW50OwogICAgZGlzcGxheTogaW5saW5lLWJsb2NrICFpbXBvcnRhbnQ7CiAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudCAhaW1wb3J0YW50OwogICAgYmFja2dyb3VuZC1jb2xvcjogdHJhbnNwYXJlbnQgIWltcG9ydGFudDsKICAgIGJvcmRlcjogbm9uZSAhaW1wb3J0YW50OwogICAgdGV4dC1kZWNvcmF0aW9uOiBub25lICFpbXBvcnRhbnQ7CiAgICBjdXJzb3I6IHBvaW50ZXIgIWltcG9ydGFudDsKfQouYm94LXNvcnQgPiBhLmFjdGl2ZSwgLmJveC1zb3J0IGEuYnRuLmFjdGl2ZSB7CiAgICBjb2xvcjogI0ZGQjM0NyAhaW1wb3J0YW50OwogICAgZm9udC13ZWlnaHQ6IDcwMCAhaW1wb3J0YW50OwogICAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICNGRkIzNDcgIWltcG9ydGFudDsKICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50ICFpbXBvcnRhbnQ7Cn0KLmJveC1zb3J0IGEgaSwgLmJveC1zb3J0IGEgZm9udCwgLmJveC1zb3J0IGEgc3BhbiB7CiAgICBjb2xvcjogaW5oZXJpdCAhaW1wb3J0YW50OwogICAgZm9udC1zaXplOiBpbmhlcml0ICFpbXBvcnRhbnQ7CiAgICBmb250LXdlaWdodDogaW5oZXJpdCAhaW1wb3J0YW50OwogICAgZGlzcGxheTogaW5saW5lICFpbXBvcnRhbnQ7Cn0KLnR2LXVzZXItYXZhdGFyIHsKICAgIHdpZHRoOiAzNnB4ICFpbXBvcnRhbnQ7CiAgICBoZWlnaHQ6IDM2cHggIWltcG9ydGFudDsKICAgIGJvcmRlci1yYWRpdXM6IDUwJSAhaW1wb3J0YW50OwogICAgb2JqZWN0LWZpdDogY292ZXIgIWltcG9ydGFudDsKICAgIHZlcnRpY2FsLWFsaWduOiBtaWRkbGUgIWltcG9ydGFudDsKICAgIGJvcmRlcjogMnB4IHNvbGlkICNGRkIzNDcgIWltcG9ydGFudDsKICAgIG1hcmdpbi1sZWZ0OiA4cHggIWltcG9ydGFudDsKICAgIG1hcmdpbi1yaWdodDogOHB4ICFpbXBvcnRhbnQ7CiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2sgIWltcG9ydGFudDsKfQ=="
    }

    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private lateinit var cursorView: ImageView
    private lateinit var splashView: FrameLayout
    private lateinit var splashLogo: ImageView

    private val handler = Handler(Looper.getMainLooper())
    private var pulse: ObjectAnimator? = null
    private var density = 1f

    private var cursorMode = true
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
          s.textContent = '.goog-te-banner-frame,.goog-te-banner-frame.skiptranslate,iframe.skiptranslate,.goog-te-menu-frame,#google_translate_element,.goog-te-gadget,.goog-te-gadget-simple,.goog-te-balloon-frame,#goog-gt-tt,.goog-tooltip,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none !important;} body{top:0px !important;} .goog-text-highlight{background:none !important;box-shadow:none !important;}';
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

    // Custom TV App UI modifications:
    // 1) All-black background.
    // 2) Suppress "Unlimited viewing for a monthly fee" badge.
    // 3) Expand video titles from 1 line to 2 lines.
    // 4) Expand search bar width and height, set placeholder to "SEARCH".
    // 5) Transform top section navigation links into a dropdown matching search bar width.
    // 6) Replace top-right user account icon with circular profile picture avatar.
        // Custom TV App UI modifications:
    // 1) All-black background.
    // 2) Suppress "Unlimited viewing for a monthly fee" badge.
    // 3) Expand video titles from 1 line to 2 lines.
    // 4) Expand search bar width and height, set placeholder to "SEARCH".
    // 5) Transform top section navigation links into a dropdown matching search bar width.
    // 6) Replace top-right user account icon with circular profile picture avatar.
        private fun getResourceBase64(resId: Int): String {
        return try {
            val bytes = resources.openRawResource(resId).use { it.readBytes() }
            "data:image/png;base64," + android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
        } catch (_: Exception) {
            ""
        }
    }

private fun injectCustomTvStyles(view: WebView) {
        val avatarUri = getResourceBase64(R.drawable.profile_avatar_small)
        val logoUri = getResourceBase64(R.drawable.splash_logo)

        val js = """
            (function(){
              try {
                // Inject CSS
                if (!document.getElementById('tv-app-style')) {
                  var s = document.createElement('style');
                  s.id = 'tv-app-style';
                  s.textContent = atob('$TV_CSS_B64');
                  (document.head || document.documentElement).appendChild(s);
                }

                function applyDomCustomizations() {
                  try {
                    // Universal Header Branding Logo Replacement (Excludes User Avatar)
                    var logoUriStr = '$logoUri';
                    if (logoUriStr) {
                      var siteLogos = document.querySelectorAll('h1 a img, .nav-inner h1 img, .box-header .nav-inner img');
                      siteLogos.forEach(function(img) {
                        if (!img.classList.contains('tv-user-avatar') && img.src !== logoUriStr) {
                          img.src = logoUriStr;
                          img.style.maxHeight = '42px';
                          img.style.width = 'auto';
                          img.style.objectFit = 'contain';
                        }
                      });
                    }

                    // Search input placeholder
                    var searchInputs = document.querySelectorAll('input[name="q[keyword]"], input[placeholder*="keyword"], input[placeholder*="キーワード"]');
                    searchInputs.forEach(function(inp) {
                      inp.setAttribute('placeholder', 'SEARCH');
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
                        defaultOpt.value = '';
                        defaultOpt.disabled = true;
                        defaultOpt.selected = true;
                        defaultOpt.textContent = 'Select Category / Section...';
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
                    }

                    // User Profile Circular Avatar
                    var avatarUriStr = '$avatarUri';
                    var topRightNav = document.querySelector('.global-nav-list.text-right, .btn-wrap');
                    if (topRightNav && avatarUriStr) {
                      var existingAvatar = topRightNav.querySelector('.tv-user-avatar');
                      if (!existingAvatar) {
                        var avatarImg = document.createElement('img');
                        avatarImg.className = 'tv-user-avatar';
                        avatarImg.src = avatarUriStr;
                        avatarImg.alt = 'Profile';
                        topRightNav.appendChild(avatarImg);
                      } else if (existingAvatar.src !== avatarUriStr) {
                        existingAvatar.src = avatarUriStr;
                      }
                    }
                  } catch(e) {}
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
        // Subtle build version display
        val versionTextView = TextView(this).apply {
            text = APP_VERSION
            setTextColor(Color.parseColor("#888888"))
            textSize = 12f
            gravity = Gravity.CENTER
        }
        splashView.addView(
            versionTextView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            ).apply {
                bottomMargin = (24 * density).toInt()
            }
        )

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

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
            // Ask the site's Google translate widget for Japanese -> English.
            setCookie("https://www.stardom-world.com", "googtrans=/ja/en; Path=/")
            setCookie(
                "https://www.stardom-world.com",
                "googtrans=/ja/en; Domain=.stardom-world.com; Path=/"
            )
            flush()
        }

        webView.webViewClient = object : WebViewClient() {
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
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                if (customView != null) {
                    callback.onCustomViewHidden()
                    return
                }
                customView = view
                customCallback = callback
                webView.visibility = View.GONE
                root.addView(
                    view,
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )
                refreshCursorVisibility()
            }

            override fun onHideCustomView() {
                hideCustomView()
            }
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(START_URL)
        }
        webView.requestFocus()
    }

    // ---------------------------------------------------------------- splash

    private fun startSplash() {
        splashStartedAt = SystemClock.uptimeMillis()
        // Start 300ms on full black screen, then fade logo in over 500ms
        handler.postDelayed({
            if (splashDone) return@postDelayed
            splashLogo.animate()
                .alpha(1f)
                .setDuration(500)
                .setInterpolator(DecelerateInterpolator())
                .start()
        }, 300L)
        // Safety net: never leave the splash up forever if a page fails to load.
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
            .setDuration(600)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction {
                root.removeView(splashView)
            }
            .start()
    }

    // ---------------------------------------------------------------- page scripts

    private fun injectPageScripts(view: WebView) {
        view.evaluateJavascript(viewportJs(), null)
        view.evaluateJavascript(hideTranslateJs, null)
        view.evaluateJavascript(translateJs, null)
        view.evaluateJavascript(headerJs, null)
        view.evaluateJavascript(infiniteScrollJs, null)
        injectCustomTvStyles(view)
        if (!cursorMode) view.evaluateJavascript(focusJs, null)
    }

    // ---------------------------------------------------------------- cursor

    private fun updateCursor() {
        val size = cursorView.layoutParams.width.toFloat()
        cursorView.translationX = cursorX - HOT_X * size
        cursorView.translationY = cursorY - HOT_Y * size
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

    private fun moveCursor(keyCode: Int, repeat: Int) {
        val w = root.width.toFloat()
        val h = root.height.toFloat()
        if (w <= 0f || h <= 0f) return
        val step = density * (6f + minOf(repeat, 30) * 0.8f)
        var nx = cursorX
        var ny = cursorY
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_LEFT -> nx -= step
            KeyEvent.KEYCODE_DPAD_RIGHT -> nx += step
            KeyEvent.KEYCODE_DPAD_UP -> {
                ny -= step
                if (ny < 0f) wheel(cursorX, cursorY, SCROLL_NOTCH)
            }
            KeyEvent.KEYCODE_DPAD_DOWN -> {
                ny += step
                if (ny > h - 1f) wheel(cursorX, cursorY, -SCROLL_NOTCH)
            }
        }
        cursorX = nx.coerceIn(0f, w - 1f)
        cursorY = ny.coerceIn(0f, h - 1f)
        updateCursor()
        hover(cursorX, cursorY)
    }

    /** A finger-style tap at the cursor: triggers links, buttons and the text keyboard. */
    private fun tap() {
        val x = cursorX
        val y = cursorY
        val downTime = SystemClock.uptimeMillis()
        val down = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0)
        down.source = InputDevice.SOURCE_TOUCHSCREEN
        webView.dispatchTouchEvent(down)
        down.recycle()
        handler.postDelayed({
            val upTime = SystemClock.uptimeMillis()
            val up = MotionEvent.obtain(downTime, upTime, MotionEvent.ACTION_UP, x, y, 0)
            up.source = InputDevice.SOURCE_TOUCHSCREEN
            webView.dispatchTouchEvent(up)
            up.recycle()
        }, 50)
    }

    /** Mouse-style hover, so menus and hover effects react to the cursor. */
    private fun hover(px: Float, py: Float) {
        val t = SystemClock.uptimeMillis()
        val props = arrayOf(MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_MOUSE
        })
        val coords = arrayOf(MotionEvent.PointerCoords().apply {
            x = px
            y = py
        })
        val ev = MotionEvent.obtain(
            t, t, MotionEvent.ACTION_HOVER_MOVE, 1, props, coords,
            0, 0, 1f, 1f, 0, 0, InputDevice.SOURCE_MOUSE, 0
        )
        webView.dispatchGenericMotionEvent(ev)
        ev.recycle()
    }

    /** Mouse-wheel scroll at a point. Positive scrolls up, negative scrolls down. */
    private fun wheel(px: Float, py: Float, vScroll: Float) {
        val t = SystemClock.uptimeMillis()
        val props = arrayOf(MotionEvent.PointerProperties().apply {
            id = 0
            toolType = MotionEvent.TOOL_TYPE_MOUSE
        })
        val coords = arrayOf(MotionEvent.PointerCoords().apply {
            x = px
            y = py
            setAxisValue(MotionEvent.AXIS_VSCROLL, vScroll)
        })
        val ev = MotionEvent.obtain(
            t, t, MotionEvent.ACTION_SCROLL, 1, props, coords,
            0, 0, 1f, 1f, 0, 0, InputDevice.SOURCE_MOUSE, 0
        )
        webView.dispatchGenericMotionEvent(ev)
        ev.recycle()
    }

    // ---------------------------------------------------------------- keys

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val down = event.action == KeyEvent.ACTION_DOWN

        when (event.keyCode) {
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_INFO, KeyEvent.KEYCODE_PROG_YELLOW -> {
                if (down && event.repeatCount == 0 && splashDone) setCursorMode(!cursorMode)
                return true
            }
        }

        if (cursorMode && customView == null) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_LEFT,
                KeyEvent.KEYCODE_DPAD_RIGHT,
                KeyEvent.KEYCODE_DPAD_UP,
                KeyEvent.KEYCODE_DPAD_DOWN -> {
                    if (down && splashDone) moveCursor(event.keyCode, event.repeatCount)
                    return true
                }
                KeyEvent.KEYCODE_DPAD_CENTER -> {
                    if (down && event.repeatCount == 0 && splashDone) tap()
                    return true
                }
                KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_PAGE_UP -> {
                    if (down && splashDone) wheel(cursorX, cursorY, PAGE_NOTCH)
                    return true
                }
                KeyEvent.KEYCODE_CHANNEL_DOWN, KeyEvent.KEYCODE_PAGE_DOWN -> {
                    if (down && splashDone) wheel(cursorX, cursorY, -PAGE_NOTCH)
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        when (keyCode) {
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
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                videoJs("if(v.paused){v.play();}else{v.pause();}")
                return true
            }
            KeyEvent.KEYCODE_MEDIA_PLAY -> {
                videoJs("v.play();")
                return true
            }
            KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                videoJs("v.pause();")
                return true
            }
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> {
                videoJs("v.currentTime+=10;")
                return true
            }
            KeyEvent.KEYCODE_MEDIA_REWIND -> {
                videoJs("v.currentTime-=10;")
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    // ---------------------------------------------------------------- misc

    private fun hideCustomView() {
        val view = customView ?: return
        root.removeView(view)
        customView = null
        webView.visibility = View.VISIBLE
        customCallback?.onCustomViewHidden()
        customCallback = null
        webView.requestFocus()
        refreshCursorVisibility()
    }

    private fun videoJs(action: String) {
        webView.evaluateJavascript(
            "(function(){var v=document.querySelector('video');if(!v)return;$action})()",
            null
        )
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        pulse?.cancel()
        root.removeAllViews()
        webView.destroy()
        super.onDestroy()
    }
}
