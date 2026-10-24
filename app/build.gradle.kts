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
        versionCode = 54
        versionName = "1.3.24"

        val startUrl = (project.findProperty("tvhub.startUrl") as String?)
            ?: "https://stardom-world.com"
        buildConfigField("String", "START_URL", "\"$startUrl\"")
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
