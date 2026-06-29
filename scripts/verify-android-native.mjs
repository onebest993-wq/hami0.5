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
    'capacitor-keyboard',
    'capacitor-status-bar',
];
for (const plugin of requiredPlugins) {
    if (!capGradle.includes(plugin)) {
        errors.push(`capacitor.build.gradle missing plugin: ${plugin}`);
    }
}

const manifest = read('android/app/src/main/AndroidManifest.xml') ?? '';
if (!manifest.includes('android.permission.INTERNET')) {
    errors.push('AndroidManifest missing INTERNET permission');
}
if (!manifest.includes('android.permission.CAMERA')) {
    errors.push('AndroidManifest missing CAMERA permission (required for vault camera capture)');
}

const plist = read('ios/App/App/Info.plist') ?? '';
if (!plist.includes('NSFaceIDUsageDescription')) {
    warnings.push('Info.plist missing NSFaceIDUsageDescription — iOS biometrics blocked');
}

const capConfig = read('capacitor.config.ts') ?? '';
if (!capConfig.includes('preventScreenshots')) {
    warnings.push('capacitor.config.ts missing PrivacyScreen.preventScreenshots');
}

const indexHtml = read('dist/index.html') ?? '';
if (!indexHtml.includes('viewport-fit=cover')) {
    errors.push('dist/index.html missing viewport-fit=cover');
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
