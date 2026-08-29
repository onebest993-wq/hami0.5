#!/usr/bin/env node
/**
 * إعداد إشعارات Android — نغمة hami + FCM + مزامنة Capacitor.
 *
 * Usage:
 *   npm run setup:notifications:android
 *   npm run setup:notifications:android -- --build
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const withBuild = args.has('--build');

function run(cmd, cmdArgs, label) {
    console.log(`\n→ ${label}`);
    const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: true });
    if (r.status !== 0) process.exit(r.status ?? 1);
}

const soundAndroid = path.join(ROOT, 'android/app/src/main/res/raw/hami_arrival.wav');
const soundWeb = path.join(ROOT, 'public/sounds/hami_arrival.wav');
const gsJson = path.join(ROOT, 'android/app/google-services.json');
const gsExample = path.join(ROOT, 'android/app/google-services.json.example');

console.log('=== Hami — إعداد إشعارات Android ===\n');

run('node', ['scripts/generate-hami-notification-sound.mjs'], 'توليد نغمة hami_arrival');

if (!fs.existsSync(soundAndroid) || !fs.existsSync(soundWeb)) {
    console.error('✗ فشل توليد ملفات الصوت');
    process.exit(1);
}
console.log('✓ نغمة hami_arrival جاهزة');

if (!fs.existsSync(gsJson)) {
    if (fs.existsSync(gsExample)) {
        fs.copyFileSync(gsExample, gsJson);
        console.log('\n⚠ نُسخ google-services.json.example → google-services.json');
        console.log('  استبدل المفاتيح من Firebase Console قبل نشر FCM على الإنتاج.');
    } else {
        console.log('\n⚠ google-services.json غير موجود — FCM لن يعمل حتى تضيفه من Firebase');
    }
} else {
    const raw = fs.readFileSync(gsJson, 'utf8');
    if (raw.includes('REPLACE_WITH_FIREBASE')) {
        console.log('\n⚠ google-services.json لا يزال placeholder — حدّثه من Firebase Console');
    } else {
        console.log('✓ google-services.json موجود');
    }
}

const envProd = path.join(ROOT, '.env.production');
const envLocal = path.join(ROOT, '.env');
let fcmServer = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
if (!fcmServer && fs.existsSync(envProd)) {
    const m = fs.readFileSync(envProd, 'utf8').match(/^FCM_SERVICE_ACCOUNT_JSON=(.+)$/m);
    if (m?.[1]?.trim()) fcmServer = m[1].trim();
}
if (!fcmServer && fs.existsSync(envLocal)) {
    const m = fs.readFileSync(envLocal, 'utf8').match(/^FCM_SERVICE_ACCOUNT_JSON=(.+)$/m);
    if (m?.[1]?.trim()) fcmServer = m[1].trim();
}
if (fcmServer && fcmServer.includes('project_id')) {
    console.log('✓ FCM_SERVICE_ACCOUNT_JSON مُضبط');
} else {
    console.log('\n⚠ FCM_SERVICE_ACCOUNT_JSON غير مُضبط على الخادم');
    console.log('  push عند إغلاق التطبيق يحتاج Service Account JSON في env الخادم.');
}

run('npm', ['run', 'cap:sync:android'], 'مزامنة Capacitor Android');

if (withBuild) {
    run('npm', ['run', 'cap:build:android'], 'بناء APK debug');
    console.log('\n✓ APK: android/app/build/outputs/apk/debug/app-debug.apk');
}

console.log('\n=== جاهز ===');
console.log('1. حدّث google-services.json من Firebase (package: iq.hami.legal)');
console.log('2. أضف FCM_SERVICE_ACCOUNT_JSON على Vercel/hosting');
console.log('3. npm run cap:install:android — أو افتح Android Studio');
console.log('4. فعّل الإشعارات من لوحة التحكم داخل التطبيق\n');
