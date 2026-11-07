package com.example.tvhub

import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.SecureRandom
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.Executors

/**
 * Usage metrics sent to PostHog (posthog.com) as web-analytics events, so its Web analytics dashboard shows
 * unique visitors, page views, time on page, entry and exit pages and session length.
 *
 * - Off unless a PostHog project key is set (branding-private/posthog.properties or the tvhub.posthogKey Gradle property).
 * - Talks only to the PostHog host: never to stardom-world.com or Stagecrowd, and no extra page loads.
 * - Anonymous: a random id per install (one "visitor" = one TV or Firestick); no account, email or sign-in data.
 * - Events wait in memory and go out together: every 30 seconds while pages change, at 20 events, and when the app
 *   goes to the background. Nothing is sent while nothing happens.
 * - Error tracking: app crashes (sent on the next launch) and errors in the app's own page scripts go to PostHog's
 *   Error tracking as $exception events, with the same anonymous id, page and version.
 */
class Metrics(context: Context) {

    private val apiKey = BuildConfig.POSTHOG_KEY
    private val host = BuildConfig.POSTHOG_HOST.trimEnd('/')
    val enabled = apiKey.isNotEmpty()

    private val prefs = context.getSharedPreferences("metrics", Context.MODE_PRIVATE)
    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    private val rnd = SecureRandom()
    private val queue = ArrayList<JSONObject>()

    private val distinctId: String = prefs.getString("id", null) ?: UUID.randomUUID().toString().also {
        prefs.edit().putString("id", it).apply()
    }
    private var sessionId = ""
    private var lastActivity = 0L

    // The page on screen now, and when it opened (wall clock, so time spent in the background is not counted: see pause()).
    private var curPath: String? = null
    private var curUrl: String? = null
    private var curHost: String? = null
    private var curStart = 0L
    private var paused = false

    /** The app's own EN / JA switch, sent with every event. */
    var appLanguage = "en"

    private val flushTask = Runnable { flush() }

    init {
        if (enabled) {
            sendPendingCrash()
            installCrashHandler()
        }
    }

    // ---- error tracking (PostHog Error tracking: $exception events) ----

    private val errSeen = HashSet<String>()
    private var errCount = 0

    /**
     * App crashes. The details are saved straight to disk (a crashing app can't wait for the network) and sent the
     * next time the app opens, with the page, session and version it crashed on. Android's own crash handling runs
     * afterwards as before.
     */
    private fun installCrashHandler() {
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, err ->
            try {
                val props = baseProps(curUrl ?: "", curHost ?: "", curPath ?: "")
                props.put("\$exception_list", javaExceptionList(err, "UncaughtExceptionHandler"))
                props.put("\$exception_level", "fatal")
                props.put("crash_thread", thread.name)
                val saved = JSONObject().put("ts", System.currentTimeMillis()).put("props", props)
                prefs.edit().putString("crash", saved.toString()).commit()
            } catch (_: Throwable) {}
            previous?.uncaughtException(thread, err)
        }
    }

    private fun sendPendingCrash() {
        val raw = prefs.getString("crash", null) ?: return
        prefs.edit().remove("crash").apply()
        try {
            val saved = JSONObject(raw)
            val at = saved.optLong("ts", System.currentTimeMillis())
            enqueue("\$exception", saved.getJSONObject("props"), at)
            flush()
        } catch (_: Exception) {}
    }

    private fun javaExceptionList(err: Throwable, mechanism: String): JSONArray {
        val list = JSONArray()
        var t: Throwable? = err
        var depth = 0
        while (t != null && depth < 5) {
            val frames = JSONArray()
            // PostHog lists frames oldest call first, so the frame that threw comes last.
            t.stackTrace.take(60).reversed().forEach { e ->
                frames.put(JSONObject().apply {
                    put("platform", "java")
                    put("function", e.methodName ?: "?")
                    put("module", e.className ?: "")
                    if (e.fileName != null) put("filename", e.fileName)
                    if (e.lineNumber > 0) put("lineno", e.lineNumber)
                    put("in_app", (e.className ?: "").startsWith("com.example.tvhub"))
                })
            }
            list.put(JSONObject().apply {
                put("type", t!!.javaClass.name)
                put("value", (t!!.message ?: "").take(500))
                put("mechanism", JSONObject().put("handled", false).put("synthetic", false).put("type", mechanism))
                put("stacktrace", JSONObject().put("type", "raw").put("frames", frames))
            })
            t = t!!.cause.takeIf { it !== t }
            depth++
        }
        return list
    }

    /**
     * A script error in a page (from the error hook in MainActivity.errorHookJs). Only errors from the app's own
     * injected scripts are sent: those run without a web address ("<anonymous>" in the stack), while the site's and
     * Stagecrowd's own scripts have one and are left out, since there's nothing to fix in them here. At most 20 a run,
     * and each distinct error once a run, so a broken page that keeps failing can't flood the free allowance.
     */
    fun jsError(kind: String, message: String, source: String, line: Int, col: Int, stack: String) {
        if (!enabled) return
        if (message.startsWith("Script error")) return      // another site's script, details hidden by the browser
        val frames = parseJsStack(stack)
        if (frames.isEmpty() && line > 0) frames.add(JsFrame("?", source, line, col))
        val fromApp = frames.any { it.file.isEmpty() || it.file == "<anonymous>" } ||
            (frames.isEmpty() && source.isEmpty())
        if (!fromApp) return
        val key = message.take(200) + "|" + (frames.firstOrNull()?.let { it.fn + ":" + it.line } ?: "")
        synchronized(errSeen) {
            if (errCount >= 20 || !errSeen.add(key)) return
            errCount++
        }
        val type = Regex("^([A-Za-z]*Error)\\b").find(message.removePrefix("Uncaught ").trim())?.groupValues?.get(1)
            ?: if (kind == "unhandledrejection") "UnhandledRejection" else "Error"
        val value = message.removePrefix("Uncaught ").removePrefix("$type: ").take(500)
        val jf = JSONArray()
        frames.take(40).reversed().forEach { f ->
            jf.put(JSONObject().apply {
                put("platform", "custom")
                put("lang", "javascript")
                put("function", f.fn)
                put("filename", f.file.ifEmpty { "<anonymous>" })
                if (f.line > 0) put("lineno", f.line)
                if (f.col > 0) put("colno", f.col)
                put("resolved", true)
                put("in_app", f.file.isEmpty() || f.file == "<anonymous>")
            })
        }
        val ex = JSONObject().apply {
            put("type", type)
            put("value", value)
            put("mechanism", JSONObject().put("handled", false).put("synthetic", false)
                .put("type", if (kind == "unhandledrejection") "onunhandledrejection" else "onerror"))
            put("stacktrace", JSONObject().put("type", "raw").put("frames", jf))
        }
        val now = System.currentTimeMillis()
        val props = baseProps(curUrl ?: "", curHost ?: "", curPath ?: "")
        props.put("\$exception_list", JSONArray().put(ex))
        props.put("\$exception_level", "error")
        props.put("error_source", "page script")
        enqueue("\$exception", props, now)
    }

    private class JsFrame(val fn: String, val file: String, val line: Int, val col: Int)

    // Chrome stack lines: "    at name (file:line:col)" or "    at file:line:col". Newest call first.
    private fun parseJsStack(stack: String): MutableList<JsFrame> {
        val out = ArrayList<JsFrame>()
        val re = Regex("^\\s*at (?:(.+?) \\()?(.*?):(\\d+):(\\d+)\\)?\\s*$")
        stack.lineSequence().forEach { l ->
            val m = re.find(l) ?: return@forEach
            out.add(JsFrame(m.groupValues[1].ifEmpty { "?" }, m.groupValues[2].trim(), m.groupValues[3].toInt(), m.groupValues[4].toInt()))
        }
        return out
    }

    /** A remote key was pressed: keeps the session alive while someone is using the app on one page. */
    fun touch() {
        if (!enabled) return
        lastActivity = System.currentTimeMillis()
    }

    /** The WebView moved to a new address. Repeats of the same page (reloads, redirects to itself) are ignored. */
    fun page(rawUrl: String?) {
        if (!enabled || rawUrl == null) return
        val p = describe(rawUrl) ?: return
        if (p.path == curPath && !paused) return
        val now = System.currentTimeMillis()
        ensureSession(now)
        val props = baseProps(p.url, p.host, p.path)
        p.extra.forEach { (k, v) -> props.put(k, v) }
        if (curPath != null && !paused) {
            props.put("\$prev_pageview_pathname", curPath)
            props.put("\$prev_pageview_duration", (now - curStart) / 1000.0)
        }
        enqueue("\$pageview", props, now)
        curPath = p.path; curUrl = p.url; curHost = p.host; curStart = now
        paused = false
        lastActivity = now
    }

    /** App left the screen (Home pressed, TV off, another app): close the current page and send everything. */
    fun pause() {
        if (!enabled) return
        val path = curPath
        if (path != null && !paused) {
            val now = System.currentTimeMillis()
            val props = baseProps(curUrl ?: "", curHost ?: "", path)
            props.put("\$prev_pageview_pathname", path)
            props.put("\$prev_pageview_duration", (now - curStart) / 1000.0)
            enqueue("\$pageleave", props, now)
        }
        paused = true
        flush()
    }

    /** App is back on screen: the page it shows counts as a fresh view (a new session after 30 minutes away). */
    fun resume(currentUrl: String?) {
        if (!enabled || !paused) return
        page(currentUrl)
    }

    // ---- pages ----

    private class PageInfo(val url: String, val host: String, val path: String, val extra: Map<String, Any>)

    /**
     * Turns an address into a readable page name. The app's own pages ride on site addresses with tv… markers
     * (e.g. /mypage?tvfaction=…), so those become /app/… names. Query strings are dropped everywhere else, and
     * Stagecrowd (PPV) pages keep only their path, so nothing from sign-in or payment pages is sent.
     */
    private fun describe(raw: String): PageInfo? {
        val u = try { Uri.parse(raw) } catch (_: Exception) { return null }
        val scheme = u.scheme ?: return null
        if (scheme != "http" && scheme != "https") return null       // splash art (file://), about:blank
        val h = (u.host ?: return null).lowercase(Locale.ROOT)
        val siteHost = h == "stardom-world.com" || h.endsWith(".stardom-world.com")
        val ppvHost = h == "stagecrowd.live" || h.endsWith(".stagecrowd.live")
        val extra = HashMap<String, Any>()
        val path: String = if (siteHost) {
            appPage(u) ?: run {
                val sp = (u.path ?: "/").ifEmpty { "/" }
                if (sp.startsWith("/contents/search")) {
                    val kw = q(u, "q[keyword]")
                    if (kw.isNotEmpty()) extra["search_term"] = kw.take(80)
                    "/search"
                } else sp.trimEnd('/').ifEmpty { "/" }
            }
        } else if (ppvHost) {
            "/ppv" + (u.path ?: "").trimEnd('/')
        } else {
            "/external/$h"
        }
        val section = path.trim('/').split('/').firstOrNull().orEmpty()
        extra["page_section"] = when {
            path == "/" -> "home"
            path.startsWith("/app/") -> path.removePrefix("/app/").substringBefore('/')
            path.startsWith("/contents/") -> "video"
            else -> section
        }
        val logical = if (ppvHost) h else "stardom-world.com"
        return PageInfo("https://$logical$path", logical, path, extra)
    }

    private fun q(u: Uri, name: String): String = try { u.getQueryParameter(name).orEmpty().trim() } catch (_: Exception) { "" }

    private fun slug(s: String): String =
        s.trim().lowercase(Locale.ROOT).replace(Regex("[\\s/?#&]+"), "-").trim('-').take(60).ifEmpty { "all" }

    private fun appPage(u: Uri): String? {
        fun has(n: String) = try { u.getQueryParameter(n) != null } catch (_: Exception) { false }
        val v = { n: String -> q(u, n) }
        return when {
            has("tvfav") -> if (v("tvfav") == "1" || v("tvfav").isEmpty()) "/app/my-favorites" else "/app/my-favorites/" + slug(v("tvfav"))
            has("tvrecent") -> "/app/recently-watched"
            has("tvteams") -> "/app/tag-teams"
            has("tvteam") -> "/app/tag-team/" + slug(v("tvteam"))
            has("tvtop") -> "/app/top-rated/" + slug(v("tvtop")) + (if (v("e").isNotEmpty()) "/" + slug(v("e")) else "")
            has("tvch") && has("tvrn") -> "/app/championship/" + slug(v("tvch")) + "/reign"
            has("tvch") && has("tvb") -> "/app/championship-videos/" + slug(v("tvch"))
            has("tvch") -> "/app/championship/" + slug(v("tvch"))
            has("tvfaction") -> "/app/faction/" + slug(v("tvfaction"))
            has("tvera") -> if (v("tvera") == "0") "/app/years-and-eras" else "/app/era/" + slug(v("tvera"))
            has("tvcomm") -> "/app/community" + (if (v("tvcomm") == "coll") "/collections" else if (v("tvcw").isNotEmpty()) "/" + slug(v("tvcw")) else "")
            has("tvev") -> if (v("tvsh").isNotEmpty()) "/app/show/" + slug(v("tvsh")) else "/app/events"
            has("tvmt") -> "/app/match-type/" + slug(v("tvmt"))
            else -> null
        }
    }

    // ---- events ----

    private fun baseProps(url: String, host: String, path: String): JSONObject = JSONObject().apply {
        put("distinct_id", distinctId)
        put("\$session_id", sessionId)
        put("\$current_url", url)
        put("\$host", host)
        put("\$pathname", path)
        put("\$lib", "stardom-tv")
        put("\$lib_version", BuildConfig.VERSION_NAME)
        put("\$app_version", BuildConfig.VERSION_NAME)
        put("\$os", "Android")
        put("\$os_version", Build.VERSION.RELEASE ?: "")
        put("\$device_type", "TV")
        put("\$device_model", Build.MODEL ?: "")
        put("\$device_manufacturer", Build.MANUFACTURER ?: "")
        put("device_kind", if ((Build.MANUFACTURER ?: "").equals("Amazon", true)) "Fire TV" else "Google TV")
        put("build_type", if (BuildConfig.SHOW_POSTERS) "private" else "public")
        put("app_language", appLanguage)
        put("\$process_person_profile", false)   // anonymous events only: no person profiles are created
    }

    private fun ensureSession(now: Long) {
        // New session after 30 minutes with no page change or key press (PostHog's own rule), or on first use.
        if (sessionId.isEmpty() || now - lastActivity > 30L * 60L * 1000L) {
            sessionId = uuidV7(now)
            curPath = null
        }
    }

    private fun enqueue(event: String, props: JSONObject, at: Long) {
        val e = JSONObject()
        e.put("event", event)
        e.put("properties", props)
        e.put("timestamp", iso(at))
        e.put("uuid", uuidV7(at))
        synchronized(queue) {
            queue.add(e)
            while (queue.size > 300) queue.removeAt(0)   // offline for a long time: keep the newest
        }
        val n = synchronized(queue) { queue.size }
        if (n >= 20) flush() else { main.removeCallbacks(flushTask); main.postDelayed(flushTask, 30_000) }
    }

    private fun flush() {
        main.removeCallbacks(flushTask)
        val batch: List<JSONObject> = synchronized(queue) { if (queue.isEmpty()) return; ArrayList(queue).also { queue.clear() } }
        io.execute {
            val ok = try {
                val body = JSONObject().put("api_key", apiKey).put("batch", JSONArray(batch)).toString().toByteArray()
                val c = URL("$host/batch/").openConnection() as HttpURLConnection
                c.requestMethod = "POST"
                c.connectTimeout = 10_000
                c.readTimeout = 10_000
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body) }
                val code = c.responseCode
                c.disconnect()
                code in 200..299 || code in 400..499   // 4xx: bad key or bad event, retrying won't help
            } catch (_: Exception) { false }
            if (!ok) synchronized(queue) { queue.addAll(0, batch); while (queue.size > 300) queue.removeAt(0) }
        }
    }

    private fun iso(ms: Long): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(ms))

    // PostHog reads a session's start time from its id, so session ids are UUID v7 (time first, then random).
    private fun uuidV7(ms: Long): String {
        val b = ByteArray(16)
        rnd.nextBytes(b)
        for (i in 0 until 6) b[i] = (ms ushr (40 - 8 * i)).toByte()
        b[6] = ((b[6].toInt() and 0x0F) or 0x70).toByte()
        b[8] = ((b[8].toInt() and 0x3F) or 0x80).toByte()
        val hex = b.joinToString("") { "%02x".format(it) }
        return "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}"
    }
}
