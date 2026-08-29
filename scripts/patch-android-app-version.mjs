/**
 * يزامن نسخة Android مع `package.json`.
 *
 * Capacitor يولّد `versionCode 1` و`versionName "1.0"` ولا يعرف بنسخة المشروع.
 * تركهما يعني أن كل بناء يصل الجهاز باسم واحد: لا الجهاز يميّز التحديث، ولا
 * بلاغ عطل من الميدان يُنسب إلى نسخة. ورمز `1` ثابتاً يمنع رفع أي تحديث لاحق
 * إلى متجر Play أصلاً — يشترط رمزاً أكبر من سابقه.
 *
 * Usage: node scripts/patch-android-app-version.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appReleaseIdentity } from './app-release-identity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(GRADLE)) {
    console.log('[patch-android-app-version] android/app/build.gradle غير موجود — تخطٍّ');
    process.exit(0);
}

const identity = appReleaseIdentity();
const src = fs.readFileSync(GRADLE, 'utf8');

const next = src
    .replace(/versionCode\s+\d+/, `versionCode ${identity.androidVersionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${identity.androidVersionName}"`);

if (!/versionCode\s+\d+/.test(src) || !/versionName\s+"[^"]*"/.test(src)) {
    console.error('[patch-android-app-version] FAIL — versionCode/versionName غير موجودين في build.gradle');
    process.exit(1);
}

if (next === src) {
    console.log(
        `[patch-android-app-version] OK — متزامن (${identity.androidVersionName} / ${identity.androidVersionCode})`,
    );
    process.exit(0);
}

if (checkOnly) {
    console.error(
        `[patch-android-app-version] DRIFT — يجب أن يكون ${identity.androidVersionName} / ${identity.androidVersionCode}`,
    );
    console.error('[patch-android-app-version] شغّل: node scripts/patch-android-app-version.mjs');
    process.exit(1);
}

fs.writeFileSync(GRADLE, next, 'utf8');
console.log(
    `[patch-android-app-version] WROTE versionName "${identity.androidVersionName}" versionCode ${identity.androidVersionCode}`,
);
