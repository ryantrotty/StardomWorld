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
        versionCode = 7
        versionName = "1.0.7"

        val startUrl = (project.findProperty("tvhub.startUrl") as String?)
            ?: "https://stardom-world.com"
        buildConfigField("String", "START_URL", "\"$startUrl\"")
    }

    buildFeatures {
        buildConfig = true
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
