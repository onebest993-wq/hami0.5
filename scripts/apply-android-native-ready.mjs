/**
 * بعد `npm run cap:add:android` يعيد تطبيق قوالب الأساس (أذونات، splash داكن، MainActivity).
 * android/ gitignored — هذه القوالب هي مصدر الحقيقة القابل للإعادة.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
cp('AndroidManifest.xml', 'android/app/src/main/AndroidManifest.xml');
cp('values/colors.xml', 'android/app/src/main/res/values/colors.xml');
cp('values/styles.xml', 'android/app/src/main/res/values/styles.xml');
cp('drawable/splash_icon_blank.xml', 'android/app/src/main/res/drawable/splash_icon_blank.xml');
cp('drawable/splash_screen.xml', 'android/app/src/main/res/drawable/splash_screen.xml');
cp('java/MainActivity.java', 'android/app/src/main/java/iq/hami/legal/MainActivity.java');

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

console.log('OK — re-run npm run verify:native:android');
