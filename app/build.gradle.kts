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
        versionCode = 99
        versionName = "1.3.69"

        val startUrl = (project.findProperty("tvhub.startUrl") as String?)
            ?: "https://stardom-world.com"
        buildConfigField("String", "START_URL", "\"$startUrl\"")

        // Translated captions (CC: EN / CC: 日本語) use an unofficial Google endpoint, so they are
        // off in shared builds. They turn on automatically when a local "branding-private" folder
        // exists (your own machine), or when built with -Ptvhub.ccTranslate=true.
        val ccTranslate = (project.findProperty("tvhub.ccTranslate") as String?)?.toBoolean()
            ?: rootProject.file("branding-private").exists()
        buildConfigField("boolean", "CC_TRANSLATE", ccTranslate.toString())
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
