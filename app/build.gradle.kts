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
        versionCode = 129
        versionName = "1.3.99"

        val startUrl = (project.findProperty("tvhub.startUrl") as String?)
            ?: "https://stardom-world.com"
        buildConfigField("String", "START_URL", "\"$startUrl\"")

        val hasPrivateBranding = rootProject.file("branding-private/res").exists()
        buildConfigField("Boolean", "ENABLE_CC_TRANSLATE", hasPrivateBranding.toString())
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
