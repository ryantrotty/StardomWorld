import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.tvhub"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.tvhub"
        minSdk = 26
        targetSdk = 34
        versionCode = 421
        versionName = "2.45.0"

        val startUrl = (project.findProperty("tvhub.startUrl") as String?)
            ?: "https://stardom-world.com"
        buildConfigField("String", "START_URL", "\"$startUrl\"")

        val hasPrivateBranding = rootProject.file("branding-private/res").exists()
        buildConfigField("Boolean", "ENABLE_CC_TRANSLATE", hasPrivateBranding.toString())
        // Event poster artwork is only fetched and shown in builds that have the private branding folder.
        buildConfigField("Boolean", "SHOW_POSTERS", hasPrivateBranding.toString())
        // Video index dry run (assets/videoindex.js): private builds only. Reads video pages and shows what it found; sends nothing.
        buildConfigField("Boolean", "VIDEO_INDEX_DRYRUN", hasPrivateBranding.toString())
        // Video index log: address and key from branding-private/video_index.properties (git-ignored). Empty = dry run only.
        val vixProps = Properties().apply {
            val f = rootProject.file("branding-private/video_index.properties")
            if (f.exists()) f.inputStream().use { load(it) }
        }
        fun vixValue(k: String) = (vixProps.getProperty(k) ?: "").trim().replace("\\", "").replace("\"", "")
        buildConfigField("String", "VIDEO_INDEX_URL", "\"" + vixValue("url") + "\"")
        buildConfigField("String", "VIDEO_INDEX_KEY", "\"" + vixValue("key") + "\"")
        // The schedule list kept up to date by a scheduled GitHub job (see .github/workflows/schedule.yml).
        val scheduleUrl = (project.findProperty("tvhub.scheduleUrl") as String?)
            ?: "https://raw.githubusercontent.com/ryantrotty/StardomWorld/schedule-data/schedule.json"
        buildConfigField("String", "SCHEDULE_URL", "\"$scheduleUrl\"")
        // The daily file (schedule, championship lineages and a status report) that the Muse job publishes to the daily-data branch.
        val dailyUrl = (project.findProperty("tvhub.dailyUrl") as String?)
            ?: "https://raw.githubusercontent.com/ryantrotty/StardomWorld/daily-data/daily.json"
        buildConfigField("String", "DAILY_URL", "\"$dailyUrl\"")
        // The roster file (tag teams to add or remove, extra spellings) kept by hand on the roster-data branch, so roster
        // changes reach every installed build without a new APK. See docs/ROSTER.md.
        val rosterUrl = (project.findProperty("tvhub.rosterUrl") as String?)
            ?: "https://raw.githubusercontent.com/ryantrotty/StardomWorld/roster-data/roster.json"
        buildConfigField("String", "ROSTER_URL", "\"$rosterUrl\"")
        // Usage metrics (PostHog, see docs/USAGE_METRICS.md). Project key from branding-private/posthog.properties
        // (git-ignored, your builds only) or the tvhub.posthogKey Gradle property (all builds). Empty = metrics off.
        val phProps = Properties().apply {
            val f = rootProject.file("branding-private/posthog.properties")
            if (f.exists()) f.inputStream().use { load(it) }
        }
        fun phValue(k: String, prop: String, def: String) =
            ((phProps.getProperty(k) ?: (project.findProperty(prop) as String?) ?: def)).trim().replace("\\", "").replace("\"", "")
        buildConfigField("String", "POSTHOG_KEY", "\"" + phValue("key", "tvhub.posthogKey", "") + "\"")
        buildConfigField("String", "POSTHOG_HOST", "\"" + phValue("host", "tvhub.posthogHost", "https://us.i.posthog.com") + "\"")
    }

    buildFeatures {
        buildConfig = true
    }

    // Optional private artwork: if a "branding-private/res" folder exists next to this project,
    // its images override the generic ones in src/main/res. The folder is git-ignored, so your
    // own icon/banner/logos stay on your machine and public builds use the generic artwork.
    // See docs/PRIVATE_BRANDING.md.
    val privateBranding = rootProject.file("branding-private/res")
    if (privateBranding.exists()) {
        sourceSets {
            getByName("debug") { res.srcDir(privateBranding) }
            getByName("release") { res.srcDir(privateBranding) }
        }
    }

    // GitHub's test builds are signed with a fixed, public debug key so each new test build can be
    // installed over the previous one. Only used on GitHub (CI); your own builds keep your usual key.
    val ciKeystore = file("ci-debug.keystore")
    if (System.getenv("CI") == "true" && ciKeystore.exists()) {
        signingConfigs {
            getByName("debug") {
                storeFile = ciKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
