#!/usr/bin/env node
/**
 * تحقق جاهزية Android/Capacitor — بدون بناء Gradle (لا يحتاج JAVA_HOME).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

function read(rel) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
}

function requireFile(rel, label) {
    if (!fs.existsSync(path.join(root, rel))) {
        errors.push(`missing ${label}: ${rel}`);
        return false;
    }
    return true;
}

requireFile('dist/index.html', 'web build');
requireFile('android/app/build.gradle', 'android project');
requireFile('android/app/capacitor.build.gradle', 'capacitor android deps');

const capGradle = read('android/app/capacitor.build.gradle') ?? '';
const requiredPlugins = [
    'aparajita-capacitor-biometric-auth',
    'capacitor-community-privacy-screen',
    'capacitor-filesystem',
    'capacitor-geolocation',
    'capacitor-keyboard',
    'capacitor-status-bar',
];
for (const plugin of requiredPlugins) {
    if (!capGradle.includes(plugin)) {
        errors.push(`capacitor.build.gradle missing plugin: ${plugin}`);
    }
}

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(path.join(root, manifestPath))) {
    const manifest = read(manifestPath) ?? '';
    if (!manifest.includes('android.permission.INTERNET')) {
        errors.push('AndroidManifest missing INTERNET permission');
    }
    if (!manifest.includes('android.permission.CAMERA')) {
        errors.push('AndroidManifest missing CAMERA permission (required for vault camera capture)');
    }
    if (!manifest.includes('android.permission.RECORD_AUDIO')) {
        errors.push(
            'AndroidManifest missing RECORD_AUDIO permission (required for voice recording)',
        );
    }
    if (
        !manifest.includes('android.permission.USE_BIOMETRIC') &&
        !manifest.includes('android.permission.USE_FINGERPRINT')
    ) {
        errors.push(
            'AndroidManifest missing USE_BIOMETRIC (or USE_FINGERPRINT) — required for biometric lock',
        );
    }
    if (!manifest.includes('android.permission.ACCESS_FINE_LOCATION')) {
        errors.push(
            'AndroidManifest missing ACCESS_FINE_LOCATION — required for profile office location',
        );
    }
} else {
    warnings.push(
        'android project not present — copy scripts/native-ready/biometric-android-permissions.xml into Manifest after cap add android',
    );
}

const iosPlistPath = 'ios/App/App/Info.plist';
if (fs.existsSync(path.join(root, iosPlistPath))) {
    const plist = read(iosPlistPath) ?? '';
    if (!plist.includes('NSFaceIDUsageDescription')) {
        errors.push('Info.plist missing NSFaceIDUsageDescription — iOS Face ID blocked');
    }
    if (!plist.includes('NSLocationWhenInUseUsageDescription')) {
        errors.push('Info.plist missing NSLocationWhenInUseUsageDescription — profile geolocation blocked');
    }
} else {
    warnings.push(
        'ios project not present yet — merge scripts/native-ready/biometric-ios-Info.plist.snippet.xml when running cap add ios',
    );
}

const biometricSnippet = read('scripts/native-ready/biometric-android-permissions.xml') ?? '';
if (!biometricSnippet.includes('USE_BIOMETRIC')) {
    warnings.push('native-ready biometric Android snippet missing — check scripts/native-ready/');
}

const capConfig = read('capacitor.config.ts') ?? '';
if (!capConfig.includes('preventScreenshots')) {
    warnings.push('capacitor.config.ts missing PrivacyScreen.preventScreenshots');
}

const stylesXml = read('android/app/src/main/res/values/styles.xml') ?? '';
const colorsXml = read('android/app/src/main/res/values/colors.xml') ?? '';
const mainActivity = read('android/app/src/main/java/iq/hami/legal/MainActivity.java') ?? '';
if (!colorsXml.includes('splash_background') || !colorsXml.includes('#0A0F1C')) {
    errors.push('colors.xml missing splash_background #0A0F1C (native white-flash guard)');
}
if (
    !stylesXml.includes('windowSplashScreenBackground') ||
    (!stylesXml.includes('splash_icon_blank') &&
        !stylesXml.includes('splash_text_brand') &&
        !stylesXml.includes('hami_splash_brand'))
) {
    errors.push('styles.xml missing dark SplashScreen API config (double-splash guard)');
}
if (!stylesXml.includes('postSplashScreenTheme')) {
    errors.push('styles.xml missing postSplashScreenTheme');
}
if (!mainActivity.includes('SplashScreen.installSplashScreen')) {
    errors.push('MainActivity missing SplashScreen.installSplashScreen(this)');
}
if (
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable/splash_icon_blank.xml')) &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/splash_text_brand.png')) &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_brand.png')) &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_screen.jpg'))
) {
    errors.push('missing splash assets in drawable-nodpi (hami_splash_brand.png or hami_splash_screen.jpg)');
}
if (
    stylesXml.includes('hami_splash_brand') &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_brand.png'))
) {
    errors.push('styles.xml references hami_splash_brand but PNG is missing');
}
if (
    stylesXml.includes('splash_text_brand') &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/splash_text_brand.png'))
) {
    errors.push('styles.xml references splash_text_brand but PNG is missing');
}

const indexHtml = read('dist/index.html') ?? '';
if (!indexHtml.includes('viewport-fit=cover')) {
    errors.push('dist/index.html missing viewport-fit=cover');
}

const assetsDir = path.join(root, 'dist', 'assets');
if (fs.existsSync(assetsDir)) {
    const bundle = fs
        .readdirSync(assetsDir)
        .filter((name) => name.endsWith('.js'))
        .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
        .join('\n');
    if (bundle.includes('capacitorWebShims/biometricStub')) {
        errors.push('dist bundles biometric web stub — rebuild with: npm run cap:sync:android');
    } else if (!bundle.includes('BiometricAuthNative')) {
        errors.push('dist missing BiometricAuthNative — run native sync build (VITE_BUILD_NATIVE=true)');
    }
} else {
    warnings.push('dist/assets missing — run npm run cap:sync:android before device install');
}

const apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
if (fs.existsSync(path.join(root, apkPath))) {
    console.log(`✓ debug APK present: ${apkPath}`);
} else {
    warnings.push('debug APK not built — run: npm run cap:build:android');
}

console.log('\n=== Hami Native Android Verify ===\n');
if (errors.length === 0) {
    console.log('✓ core native wiring OK');
} else {
    console.log('✗ failures:');
    for (const e of errors) console.log(`  - ${e}`);
}
if (warnings.length) {
    console.log('\n⚠ warnings:');
    for (const w of warnings) console.log(`  - ${w}`);
}
console.log('\nNext on device: npm run cap:open:android → Run on phone/emulator');
console.log('Manual: screenshot guard, biometric lock, camera vault, privacy blur\n');

process.exit(errors.length ? 1 : 0);
