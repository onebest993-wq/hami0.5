/**
 * بعد `npm run cap:add:android` يعيد تطبيق قوالب الأساس (أذونات، splash داكن، MainActivity).
 * android/ gitignored — هذه القوالب هي مصدر الحقيقة القابل للإعادة.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { removeCapacitorSplashPngs } from './lib/android-splash-png-hygiene.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(ROOT, 'scripts/native-ready/android');

function cp(relFrom, relTo) {
  const from = path.join(T, relFrom);
  const to = path.join(ROOT, relTo);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`  → ${relTo}`);
}

if (!fs.existsSync(path.join(ROOT, 'android/app/build.gradle'))) {
  console.error('[apply-android-native-ready] android/ missing — run npm run cap:add:android first');
  process.exit(1);
}

console.log('[apply-android-native-ready]');
cp('gradle.properties', 'android/gradle.properties');
cp('variables.gradle', 'android/variables.gradle');
cp('build.gradle', 'android/build.gradle');
cp('settings.gradle', 'android/settings.gradle');
cp('gradle-wrapper.properties', 'android/gradle/wrapper/gradle-wrapper.properties');
cp('AndroidManifest.xml', 'android/app/src/main/AndroidManifest.xml');
cp('values/colors.xml', 'android/app/src/main/res/values/colors.xml');
cp('values/styles.xml', 'android/app/src/main/res/values/styles.xml');
cp('values/hami_boot_strings.xml', 'android/app/src/main/res/values/hami_boot_strings.xml');
cp('drawable/splash_icon_blank.xml', 'android/app/src/main/res/drawable/splash_icon_blank.xml');
cp('drawable/splash_icon.xml', 'android/app/src/main/res/drawable/splash_icon.xml');
cp('drawable/splash_screen.xml', 'android/app/src/main/res/drawable/splash_screen.xml');
cp('drawable/splash.xml', 'android/app/src/main/res/drawable/splash.xml');
const splashPngs = removeCapacitorSplashPngs(path.join(ROOT, 'android/app/src/main/res'));
for (const png of splashPngs) {
  console.log(`  ✕ ${path.relative(ROOT, png)} (Capacitor PNG duplicates splash.xml)`);
}
cp('layout/hami_boot_overlay.xml', 'android/app/src/main/res/layout/hami_boot_overlay.xml');
cp('java/MainActivity.java', 'android/app/src/main/java/iq/hami/legal/MainActivity.java');
cp(
  'java/boot/HamiBootProgressView.kt',
  'android/app/src/main/java/iq/hami/legal/boot/HamiBootProgressView.kt',
);
cp(
  'java/privacy/HamiPrivacyGuard.kt',
  'android/app/src/main/java/iq/hami/legal/privacy/HamiPrivacyGuard.kt',
);
cp(
  'java/privacy/HamiPrivacyPlugin.kt',
  'android/app/src/main/java/iq/hami/legal/privacy/HamiPrivacyPlugin.kt',
);

const nodpiLogo = path.join(T, 'drawable-nodpi/hami_splash_logo.webp');
const nodpiPadded = path.join(T, 'drawable-nodpi/hami_splash_logo_padded.webp');
if (fs.existsSync(nodpiLogo)) {
  cp('drawable-nodpi/hami_splash_logo.webp', 'android/app/src/main/res/drawable-nodpi/hami_splash_logo.webp');
}
if (fs.existsSync(nodpiPadded)) {
  cp(
    'drawable-nodpi/hami_splash_logo_padded.webp',
    'android/app/src/main/res/drawable-nodpi/hami_splash_logo_padded.webp',
  );
}
cp('xml/data_extraction_rules.xml', 'android/app/src/main/res/xml/data_extraction_rules.xml');
cp('xml/backup_rules.xml', 'android/app/src/main/res/xml/backup_rules.xml');
cp('xml/network_security_config.xml', 'android/app/src/main/res/xml/network_security_config.xml');

const patch = spawnSync(process.execPath, ['scripts/patch-android-proguard-compat.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (patch.status !== 0) process.exit(patch.status ?? 1);

const hygiene = spawnSync(process.execPath, ['scripts/patch-android-gradle-hygiene.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (hygiene.status !== 0) process.exit(hygiene.status ?? 1);

// Capacitor يعيد كتابة build.gradle بـ1.0/1 عند كل توليد — تُستعاد نسخة المشروع بعده
const version = spawnSync(process.execPath, ['scripts/patch-android-app-version.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (version.status !== 0) process.exit(version.status ?? 1);

const compose = spawnSync(process.execPath, ['scripts/patch-android-compose.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (compose.status !== 0) process.exit(compose.status ?? 1);

const agp9Kotlin = spawnSync(process.execPath, ['scripts/patch-capacitor-agp9-kotlin.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (agp9Kotlin.status !== 0) process.exit(agp9Kotlin.status ?? 1);

console.log('OK — re-run npm run verify:native:android');
