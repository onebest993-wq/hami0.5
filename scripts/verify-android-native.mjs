#!/usr/bin/env node
/**
 * تحقق جاهزية Android/Capacitor — بدون بناء Gradle (لا يحتاج JAVA_HOME).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listCapacitorSplashPngs } from './lib/android-splash-png-hygiene.mjs';

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

const gradleProps = read('android/gradle.properties') ?? '';
if (gradleProps && /android\.newDsl\s*=/.test(gradleProps)) {
    errors.push('gradle.properties still sets android.newDsl — remove opt-out; AGP 9 built-in DSL is required');
}
if (gradleProps && /android\.builtInKotlin\s*=|android\.builtinKotlin\s*=/.test(gradleProps)) {
    errors.push('gradle.properties still sets android.builtInKotlin — remove opt-out; use AGP built-in Kotlin');
}
if (gradleProps && /android\.dependency\.excludeLibraryComponentsFromConstraints\s*=/.test(gradleProps)) {
    errors.push(
        'gradle.properties sets deprecated excludeLibraryComponentsFromConstraints — use android.dependency.useConstraints=false',
    );
}
if (gradleProps && !gradleProps.includes('android.dependency.useConstraints=false')) {
    warnings.push('gradle.properties should set android.dependency.useConstraints=false (AGP 9 import performance)');
}
if (gradleProps && !gradleProps.includes('kotlin.compiler.execution.strategy=in-process')) {
    warnings.push('gradle.properties missing kotlin in-process — run: node scripts/patch-android-gradle-hygiene.mjs');
}

const appBuild = read('android/app/build.gradle') ?? '';
if (appBuild && /org\.jetbrains\.kotlin\.android/.test(appBuild)) {
    errors.push('android/app/build.gradle still applies kotlin-android — migrate to AGP built-in Kotlin + compose plugin');
}

for (const pluginGradle of [
    'node_modules/@capacitor/filesystem/android/build.gradle',
    'node_modules/@capacitor/geolocation/android/build.gradle',
]) {
    const src = read(pluginGradle);
    if (src && /kotlin-android|org\.jetbrains\.kotlin\.android/.test(src)) {
        errors.push(`${pluginGradle} still applies kotlin-android — run: node scripts/patch-capacitor-agp9-kotlin.mjs`);
    }
}

const cordovaGradlePath = path.join(root, 'android/capacitor-cordova-android-plugins/build.gradle');
if (fs.existsSync(cordovaGradlePath)) {
    const cordovaGradle = fs.readFileSync(cordovaGradlePath, 'utf8');
    if (/\bflatDir\b/.test(cordovaGradle)) {
        warnings.push(
            'capacitor-cordova-android-plugins still declares flatDir — run: node scripts/patch-android-gradle-hygiene.mjs',
        );
    }
    if (cordovaGradle.includes("gradle:8.") && !cordovaGradle.includes('gradle:9.3.1')) {
        warnings.push(
            'capacitor-cordova-android-plugins uses old AGP — run: node scripts/patch-android-gradle-hygiene.mjs',
        );
    }
}

const settingsGradle = read('android/settings.gradle') ?? '';
if (settingsGradle && !settingsGradle.includes("version '9.3.1'")) {
    warnings.push('android/settings.gradle AGP is not 9.3.1 — run: npm run cap:apply:android');
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
    'capacitor-local-notifications',
    'capacitor-push-notifications',
];
for (const plugin of requiredPlugins) {
    if (!capGradle.includes(plugin)) {
        errors.push(`capacitor.build.gradle missing plugin: ${plugin}`);
    }
}

const hamiSound = 'android/app/src/main/res/raw/hami_arrival.wav';
if (requireFile(hamiSound, 'hami arrival sound')) {
    console.log(`✓ ${hamiSound}`);
}
const hamiAlarmSound = 'android/app/src/main/res/raw/hami_legal_alarm.wav';
if (requireFile(hamiAlarmSound, 'hami legal alarm sound')) {
    console.log(`✓ ${hamiAlarmSound}`);
}

const gsJson = path.join(root, 'android/app/google-services.json');
if (!fs.existsSync(gsJson)) {
    warnings.push(
        'android/app/google-services.json missing — FCM push when app closed needs Firebase (npm run setup:notifications:android)',
    );
} else {
    const gs = fs.readFileSync(gsJson, 'utf8');
    if (gs.includes('REPLACE_WITH_FIREBASE') || gs.includes('hami-legal-placeholder')) {
        warnings.push('google-services.json is placeholder — replace with real Firebase config for FCM');
    } else {
        console.log('✓ google-services.json present');
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
    if (!manifest.includes('android.hardware.camera') || !manifest.includes('android.hardware.microphone')) {
        errors.push(
            'AndroidManifest missing optional camera/microphone uses-feature (required="false")',
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
        'ios project not present yet — on macOS run: npm run cap:add:ios (merges Face ID / camera / mic plist)',
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
    (!stylesXml.includes('splash_icon') &&
        !stylesXml.includes('splash_text_brand') &&
        !stylesXml.includes('hami_splash_brand') &&
        !stylesXml.includes('splash_launch_brand'))
) {
    errors.push('styles.xml missing dark SplashScreen API config (double-splash guard)');
}
if (stylesXml.includes('splash_icon_blank') && !stylesXml.includes('windowSplashScreenAnimatedIcon">@drawable/splash_icon<')) {
    errors.push('Android 12+ splash must use splash_icon (160dp-safe brand), not blank-only');
}
if (!stylesXml.includes('postSplashScreenTheme')) {
    errors.push('styles.xml missing postSplashScreenTheme');
}
if (!mainActivity.includes('SplashScreen.installSplashScreen')) {
    errors.push('MainActivity missing SplashScreen.installSplashScreen(this)');
}
const hasBootRevealPoll = mainActivity.includes('hamiBootRevealed');
const hasBootReadyEvent = mainActivity.includes('HamiBootPlugin.setReadyListener');
if (!hasBootRevealPoll && !hasBootReadyEvent) {
    errors.push(
        'MainActivity missing splash release (HamiBootPlugin.setReadyListener or hamiBootRevealed poll)',
    );
}
if (mainActivity.includes('hamiAppRuntimeReady')) {
    errors.push('MainActivity must not release splash on hamiAppRuntimeReady (causes double splash)');
}
if (!mainActivity.includes('HamiNotificationSheetPlugin')) {
    errors.push('MainActivity missing HamiNotificationSheetPlugin registration');
}
if (!mainActivity.includes('HamiPrivacyPlugin') || !mainActivity.includes('HamiPrivacyGuard')) {
    errors.push('MainActivity missing HamiPrivacyPlugin / HamiPrivacyGuard recents cover');
}
if (!mainActivity.includes('onUserLeaveHint')) {
    errors.push('MainActivity missing onUserLeaveHint for native recents cover');
}
const privacyFiles = [
    'android/app/src/main/java/iq/hami/legal/privacy/HamiPrivacyPlugin.kt',
    'android/app/src/main/java/iq/hami/legal/privacy/HamiPrivacyGuard.kt',
];
for (const rel of privacyFiles) {
    if (!fs.existsSync(path.join(root, rel))) {
        errors.push(`missing native privacy guard: ${rel}`);
    }
}
const composeSheetFiles = [
    'android/app/src/main/java/iq/hami/legal/notificationsheet/HamiNotificationSheetPlugin.kt',
    'android/app/src/main/java/iq/hami/legal/notificationsheet/HamiNotificationSheetActivity.kt',
    'android/app/src/main/java/iq/hami/legal/notificationsheet/HamiNotificationSheetUi.kt',
];
for (const rel of composeSheetFiles) {
    if (!fs.existsSync(path.join(root, rel))) {
        errors.push(`missing native notification sheet: ${rel}`);
    }
}
const appGradle = read('android/app/build.gradle') ?? '';
const hasComposeFeature =
    /\bcompose\s*=\s*true\b/.test(appGradle) || /\bcompose\s+true\b/.test(appGradle);
const hasResValues =
    /\bresValues\s*=\s*true\b/.test(appGradle) || /\bresValues\s+true\b/.test(appGradle);
if (
    !appGradle.includes('org.jetbrains.kotlin.plugin.compose') ||
    !hasComposeFeature ||
    !appGradle.includes('jvmToolchain(21)')
) {
    errors.push('android/app/build.gradle missing AGP built-in Kotlin + Compose — run node scripts/patch-android-compose.mjs');
}
if (hasComposeFeature && !hasResValues) {
    warnings.push('android/app/build.gradle missing resValues — run: node scripts/patch-android-compose.mjs');
}
const manifestXml = read(manifestPath) ?? '';
if (manifestXml && !manifestXml.includes('HamiNotificationSheetActivity')) {
    errors.push('AndroidManifest missing HamiNotificationSheetActivity');
}
if (stylesXml && !stylesXml.includes('Theme.Hami.TransparentSheet')) {
    errors.push('styles.xml missing Theme.Hami.TransparentSheet for native notification sheet');
}
if (
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable/splash_icon_blank.xml')) &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/splash_text_brand.png')) &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_brand.png')) &&
    !fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_screen.jpg'))
) {
    errors.push('missing splash assets in drawable-nodpi (hami_splash_brand.png or hami_splash_screen.jpg)');
}
if (!fs.existsSync(path.join(root, 'android/app/src/main/res/drawable/splash.xml'))) {
    errors.push('missing drawable/splash.xml (Capacitor androidSplashResourceName=splash)');
}
if (!fs.existsSync(path.join(root, 'android/app/src/main/res/drawable/splash_icon.xml'))) {
    errors.push('missing drawable/splash_icon.xml (Android 12+ 160dp-safe brand)');
}
const androidResDir = path.join(root, 'android/app/src/main/res');
for (const png of listCapacitorSplashPngs(androidResDir)) {
    errors.push(
        `${path.relative(root, png)} duplicates @drawable/splash — Capacitor PNG must not coexist with splash.xml`,
    );
}
if (!fs.existsSync(path.join(root, 'android/app/src/main/res/drawable-nodpi/hami_splash_logo_padded.webp'))) {
    errors.push('missing drawable-nodpi/hami_splash_logo_padded.webp (circle-safe splash logo)');
}
if (!fs.existsSync(path.join(root, 'android/app/src/main/res/layout/hami_boot_overlay.xml'))) {
    errors.push('missing layout/hami_boot_overlay.xml');
}
if (!fs.existsSync(path.join(root, 'android/app/src/main/java/iq/hami/legal/boot/HamiBootProgressView.kt'))) {
    errors.push('missing HamiBootProgressView.kt (code-only progress bar)');
}
if (!mainActivity.includes('BOOT_OVERLAY_FADE_MS') || !mainActivity.includes('attachBootOverlay')) {
    errors.push('MainActivity missing boot overlay attach/fade (150ms, no artificial delay)');
}
if (mainActivity.includes('Thread.sleep') || mainActivity.includes('SystemClock.sleep')) {
    errors.push('MainActivity must not use Thread.sleep during boot');
}
if (!mainActivity.includes('provider -> provider.remove()')) {
    errors.push('MainActivity must remove AndroidX splash instantly onto the overlay');
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
