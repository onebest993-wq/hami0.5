/**
 * حارس أساس الموبايل — يعمل بلا مشاريع android/ios المولَّدة (وهي gitignored).
 * يفرض: إصدارات Capacitor متماسكة، إعدادات cap، قصاصات الأذونات الجاهزة،
 * وسكربتات التوليد/التحقق موجودة. البناء الأصلي يُولَّد بـ `npx cap add`.
 *
 * Usage: node scripts/guard-native-foundation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const notes = [];

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

function requireFile(rel, why) {
  if (!fs.existsSync(path.join(ROOT, rel))) errors.push(`missing ${rel} — ${why}`);
}

const pkg = JSON.parse(read('package.json') ?? '{}');
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

const pinExact = ['@capacitor/android', '@capacitor/ios', '@capacitor/core', '@capacitor/cli'];
for (const name of pinExact) {
  const v = deps[name];
  if (!v) {
    errors.push(`${name} missing from package.json`);
    continue;
  }
  if (String(v).startsWith('^') || String(v).startsWith('~')) {
    errors.push(`${name}=${v} must be exact (no ^/~) — Cap plugins break across minors`);
  }
}

const coreVer = String(deps['@capacitor/core'] ?? '').replace(/^[\^~]/, '');
for (const name of ['@capacitor/android', '@capacitor/ios', '@capacitor/cli']) {
  const v = String(deps[name] ?? '').replace(/^[\^~]/, '');
  if (coreVer && v && v !== coreVer) {
    errors.push(`${name}@${v} != @capacitor/core@${coreVer}`);
  }
}

const capMajor = Number(coreVer.split('.')[0] || 0);

const privacyPeer = deps['@capacitor-community/privacy-screen'];
if (privacyPeer) {
  try {
    const p = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'node_modules/@capacitor-community/privacy-screen/package.json'), 'utf8'),
    );
    const peer = p.peerDependencies?.['@capacitor/core'] ?? '';
    if (peer && capMajor && !peer.includes(String(capMajor))) {
      errors.push(`privacy-screen peers ${peer} — project is Capacitor ${capMajor}`);
    }
  } catch {
    notes.push('privacy-screen package not installed locally — skip peer probe');
  }
}

/*
 * مستوى الاستهداف — بوّابة نشر لا تفضيل.
 *
 * Play يمنع تقديم أي تطبيق جديد أو تحديث لا يستهدف المستوى المطلوب للسنة، ولا
 * يدعم Capacitor مستوى مخصّصاً: كل إصدار رئيسي مربوط بمستوى واحد (8.x ↔ 36).
 * فربط المطلوب بالنسخة المثبَّتة يجعل الحارس يتقدّم تلقائياً مع كل ترقية بدل
 * أن يتقادم رقمٌ مكتوب باليد.
 *
 * والفحص على القالب لا على android/ وحده: android/ يُعاد توليده، والقالب هو ما
 * يبقى. انحدارٌ صامت في targetSdk = رفض النشر عند أقرب تقديم.
 */
const CAP_TARGET_SDK = { 6: 34, 7: 35, 8: 36 };
const CAP_MIN_SDK = { 6: 22, 7: 23, 8: 24 };
const expectedTarget = CAP_TARGET_SDK[capMajor];
const expectedMin = CAP_MIN_SDK[capMajor];

const VARIABLES_TEMPLATE = 'scripts/native-ready/android/variables.gradle';
requireFile(VARIABLES_TEMPLATE, 'Android build variables template');

if (expectedTarget) {
  const readSdk = (src, key) => {
    const m = new RegExp(`${key}\\s*=\\s*(\\d+)`).exec(src);
    return m ? Number(m[1]) : null;
  };
  const targets = [VARIABLES_TEMPLATE, 'android/variables.gradle'];
  for (const rel of targets) {
    const src = read(rel);
    if (src == null) {
      if (rel.startsWith('android/')) notes.push(`${rel} absent — android/ not generated`);
      else errors.push(`${rel} unreadable`);
      continue;
    }
    const target = readSdk(src, 'targetSdkVersion');
    const compile = readSdk(src, 'compileSdkVersion');
    const min = readSdk(src, 'minSdkVersion');
    if (target !== expectedTarget) {
      errors.push(`${rel}: targetSdkVersion=${target} — Capacitor ${capMajor} requires ${expectedTarget}`);
    }
    if (compile !== expectedTarget) {
      errors.push(`${rel}: compileSdkVersion=${compile} — Capacitor ${capMajor} requires ${expectedTarget}`);
    }
    if (min !== expectedMin) {
      errors.push(`${rel}: minSdkVersion=${min} — Capacitor ${capMajor} requires ${expectedMin}`);
    }
  }
}

requireFile('capacitor.config.ts', 'Capacitor app identity');
requireFile('scripts/native-ready/biometric-android-permissions.xml', 'Android biometric permissions template');
requireFile('scripts/native-ready/biometric-ios-Info.plist.snippet.xml', 'iOS Face ID plist snippet');
requireFile('scripts/verify-android-native.mjs', 'post-generate Android verify');
requireFile('scripts/verify-ios-native.mjs', 'iOS template/project verify');
requireFile('scripts/cap-add-ios.mjs', 'macOS-only ios/ generator');
requireFile('scripts/apply-ios-native-ready.mjs', 'Info.plist privacy merge');
requireFile('scripts/lib/ios-info-plist.mjs', 'Info.plist merge helper');

const cap = read('capacitor.config.ts') ?? '';
if (!cap.includes("appId: 'iq.hami.legal'") && !cap.includes('appId: "iq.hami.legal"')) {
  errors.push('capacitor.config.ts missing appId iq.hami.legal');
}
if (!cap.includes('preventScreenshots')) {
  errors.push('capacitor.config.ts missing PrivacyScreen.preventScreenshots');
}
if (!cap.includes("webDir: 'dist'") && !cap.includes('webDir: "dist"')) {
  errors.push('capacitor.config.ts webDir must be dist');
}
if (!/style:\s*['"]DARK['"]/.test(cap)) {
  errors.push("capacitor.config.ts Keyboard.style must be 'DARK'");
}

/**
 * صلابة بيانات المنصّة الأصلية.
 *
 * القالب هو مصدر الحقيقة (`cap:apply:android` ينسخه فوق المولَّد)، فالفحص يقع
 * عليه أولاً. أضيفت هذه البنود بعد اكتشاف `allowBackup="true"` في تطبيق يحمل
 * إضابير موكّلين: أي جهاز موصول بـadb كان يُصدِّر المخزون كاملاً.
 */
const TEMPLATE_MANIFEST = 'scripts/native-ready/android/AndroidManifest.xml';
const templateManifest = read(TEMPLATE_MANIFEST) ?? '';
const manifestHardening = [
    ['android:allowBackup="false"', 'adb backup / النسخ السحابي يُصدِّر الإضابير'],
    ['android:dataExtractionRules="@xml/data_extraction_rules"', 'النقل بين جهازين على أندرويد ١٢+'],
    ['android:fullBackupContent="@xml/backup_rules"', 'استثناءات النسخ لأندرويد ١١ فما دون'],
    ['android:networkSecurityConfig="@xml/network_security_config"', 'سياسة الشبكة الأصلية'],
    ['android:usesCleartextTraffic="false"', 'منع النص الصريح صراحةً'],
];
for (const [attr, why] of manifestHardening) {
    if (!templateManifest.includes(attr)) {
        errors.push(`${TEMPLATE_MANIFEST} missing ${attr} — ${why}`);
    }
}

if (
    !templateManifest.includes('android.intent.action.VIEW') ||
    !templateManifest.includes('android.intent.category.BROWSABLE') ||
    !templateManifest.includes('android:scheme="iq.hami.legal"')
) {
    errors.push(`${TEMPLATE_MANIFEST} missing deep-link intent-filter for scheme iq.hami.legal`);
}

/*
 * تغييرات الإعداد التي يبتلعها النشاط بنفسه. ما لم يُذكر هنا يُعيد أندرويد
 * إنشاء النشاط عنده — أي إقلاع كامل يفقد الإضبارة المفتوحة وما لم يُحفظ بعد.
 * `density` و`navigation` واجبان منذ Capacitor 8.
 */
const REQUIRED_CONFIG_CHANGES = [
    'orientation',
    'keyboardHidden',
    'keyboard',
    'screenSize',
    'locale',
    'smallestScreenSize',
    'screenLayout',
    'uiMode',
    'navigation',
    'density',
];
const configChangesMatch = /android:configChanges="([^"]+)"/.exec(templateManifest);
if (!configChangesMatch) {
    errors.push(`${TEMPLATE_MANIFEST} missing android:configChanges on the main activity`);
} else {
    const declared = new Set(configChangesMatch[1].split('|').map((s) => s.trim()));
    const missing = REQUIRED_CONFIG_CHANGES.filter((k) => !declared.has(k));
    if (missing.length) {
        errors.push(`${TEMPLATE_MANIFEST} configChanges missing: ${missing.join(', ')} — activity restarts lose state`);
    }
}

/*
 * قفل الاتجاه ممنوع: أندرويد ١٦ يتجاهله على الشاشات الكبيرة، وأندرويد ١٧ يزيل
 * حتى وسيلة الانسحاب. وجوده يعني سلوكاً يعمل على الهاتف ويصمت على اللوحيّ.
 */
if (/android:screenOrientation=/.test(templateManifest)) {
    errors.push(`${TEMPLATE_MANIFEST} sets android:screenOrientation — ignored on large screens from Android 16`);
}

const BACKUP_DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external'];
for (const [rel, root] of [
    ['scripts/native-ready/android/xml/data_extraction_rules.xml', 'data-extraction-rules'],
    ['scripts/native-ready/android/xml/backup_rules.xml', 'full-backup-content'],
]) {
    const xml = read(rel);
    if (!xml) {
        errors.push(`missing ${rel} — backup exclusion rules are referenced by the manifest`);
        continue;
    }
    if (!xml.includes(`<${root}>`)) errors.push(`${rel} missing <${root}> root element`);
    for (const domain of BACKUP_DOMAINS) {
        if (!xml.includes(`domain="${domain}"`)) errors.push(`${rel} does not exclude domain="${domain}"`);
    }
}

const netSec = read('scripts/native-ready/android/xml/network_security_config.xml');
if (!netSec) {
    errors.push('missing scripts/native-ready/android/xml/network_security_config.xml');
} else if (!netSec.includes('cleartextTrafficPermitted="false"')) {
    errors.push('network_security_config.xml must set cleartextTrafficPermitted="false"');
}

const androidSnippet = read('scripts/native-ready/biometric-android-permissions.xml') ?? '';
if (!androidSnippet.includes('USE_BIOMETRIC')) {
  errors.push('Android biometric snippet missing USE_BIOMETRIC');
}
if (!androidSnippet.includes('CAMERA')) {
  errors.push('Android biometric snippet missing CAMERA (vault capture)');
}
if (!androidSnippet.includes('ACCESS_FINE_LOCATION')) {
  errors.push('Android native-ready snippet missing ACCESS_FINE_LOCATION (profile geolocation)');
}

const iosSnippet = read('scripts/native-ready/biometric-ios-Info.plist.snippet.xml') ?? '';
if (!iosSnippet.includes('NSFaceIDUsageDescription')) {
  errors.push('iOS snippet missing NSFaceIDUsageDescription');
}
if (!iosSnippet.includes('NSLocationWhenInUseUsageDescription')) {
  errors.push('iOS snippet missing NSLocationWhenInUseUsageDescription (profile geolocation)');
}
if (!iosSnippet.includes('NSCameraUsageDescription')) {
  errors.push('iOS snippet missing NSCameraUsageDescription (vault capture)');
}
if (!iosSnippet.includes('NSMicrophoneUsageDescription')) {
  errors.push('iOS snippet missing NSMicrophoneUsageDescription (voice notes)');
}

const templateMainActivity = read('scripts/native-ready/android/java/MainActivity.java') ?? '';
if (!templateMainActivity.includes('HamiNotificationSheetPlugin')) {
  errors.push('native-ready MainActivity missing HamiNotificationSheetPlugin registration');
}
if (!templateMainActivity.includes('HamiPrivacyPlugin') || !templateMainActivity.includes('onUserLeaveHint')) {
  errors.push('native-ready MainActivity missing HamiPrivacy recents cover');
}
requireFile('scripts/native-ready/android/java/privacy/HamiPrivacyGuard.kt', 'native privacy guard');
requireFile('scripts/native-ready/android/java/privacy/HamiPrivacyPlugin.kt', 'native privacy plugin');
requireFile('scripts/native-ready/ios/HamiPrivacyPlugin.swift', 'iOS privacy cover');
if (!templateManifest.includes('HamiNotificationSheetActivity')) {
  errors.push(`${TEMPLATE_MANIFEST} missing HamiNotificationSheetActivity`);
}
const templateStyles = read('scripts/native-ready/android/values/styles.xml') ?? '';
if (!templateStyles.includes('Theme.Hami.TransparentSheet')) {
  errors.push('native-ready styles.xml missing Theme.Hami.TransparentSheet');
}
const templateSettings = read('scripts/native-ready/android/settings.gradle') ?? '';
if (!templateSettings.includes('org.jetbrains.kotlin.plugin.compose')) {
  errors.push('native-ready settings.gradle missing Kotlin Compose pluginManagement');
}
requireFile('scripts/patch-android-compose.mjs', 'Compose patch for cap sync');

const gitignore = read('.gitignore') ?? '';
if (!/^\s*android\s*\/?\s*$/m.test(gitignore) || !/^\s*ios\s*\/?\s*$/m.test(gitignore)) {
  notes.push('android/ ios/ should stay gitignored — generate via npx cap add');
}

const androidPresent = fs.existsSync(path.join(ROOT, 'android/app/build.gradle'));
const iosPresent = fs.existsSync(path.join(ROOT, 'ios/App/App/Info.plist'));
if (!androidPresent) {
  notes.push('android/ not generated yet — run: npm run cap:add:android');
} else {
  const manifest = read('android/app/src/main/AndroidManifest.xml') ?? '';
  if (!manifest.includes('USE_BIOMETRIC')) {
    errors.push('android Manifest missing USE_BIOMETRIC after generate — merge native-ready snippet');
  }
  if (!manifest.includes('CAMERA')) {
    errors.push('android Manifest missing CAMERA after generate — merge native-ready snippet');
  }
  if (!manifest.includes('ACCESS_FINE_LOCATION')) {
    errors.push('android Manifest missing ACCESS_FINE_LOCATION after generate — merge native-ready snippet');
  }

  /**
   * تطابق القالب مع المولَّد.
   *
   * انحرفا فعلاً: أربعة أذونات إشعارات عاشت في المولَّد وحده، فكان أول
   * `cap:apply:android` يمسحها ويُسكت إشعارات الجلسات على أندرويد ١٣+ بلا أثر.
   */
  const norm = (s) => s.replace(/\r\n/g, '\n').trimEnd();
  if (templateManifest && norm(manifest) !== norm(templateManifest)) {
    errors.push(
      `android/app/src/main/AndroidManifest.xml drifted from ${TEMPLATE_MANIFEST} — ` +
        'edit the template then run npm run cap:apply:android (the template overwrites the generated file)',
    );
  }
  for (const res of ['data_extraction_rules', 'backup_rules', 'network_security_config']) {
    if (!fs.existsSync(path.join(ROOT, `android/app/src/main/res/xml/${res}.xml`))) {
      errors.push(`android/app/src/main/res/xml/${res}.xml missing — run npm run cap:apply:android`);
    }
  }

  /*
   * هوية النسخة على الجهاز.
   *
   * Capacitor يولّد `versionCode 1` و`versionName "1.0"` دائماً. بقاؤهما يعني
   * أن كل بناء يصل الجهاز بالاسم نفسه — لا الجهاز يميّز التحديث، ولا بلاغ عطل
   * من الميدان يُنسب إلى نسخة، ولا يقبل Play رفع تحديث برمز غير متزايد.
   */
  const appGradle = read('android/app/build.gradle');
  if (appGradle) {
    const expectedName = String(pkg.version ?? '').trim();
    const expected = /^(\d+)\.(\d+)\.(\d+)/.exec(expectedName);
    if (!expected) {
      errors.push(`package.json version "${expectedName}" is not semver — cannot derive Android versionCode`);
    } else {
      const expectedCode = Number(expected[1]) * 10_000 + Number(expected[2]) * 100 + Number(expected[3]);
      const foundName = /versionName\s+"([^"]*)"/.exec(appGradle)?.[1];
      const foundCode = Number(/versionCode\s+(\d+)/.exec(appGradle)?.[1] ?? NaN);
      if (foundName !== expectedName || foundCode !== expectedCode) {
        errors.push(
          `android versionName/${foundName} versionCode/${foundCode} != package.json ${expectedName}/${expectedCode} — ` +
            'run node scripts/patch-android-app-version.mjs',
        );
      }
    }
  }
  notes.push('android/ present (gitignored) — run npm run verify:native:android for splash/device wiring');
}
if (!iosPresent) {
  notes.push('ios/ not generated yet — on macOS run: npm run cap:add:ios');
} else {
  const plist = read('ios/App/App/Info.plist') ?? '';
  for (const key of [
    'NSFaceIDUsageDescription',
    'NSLocationWhenInUseUsageDescription',
    'NSCameraUsageDescription',
    'NSMicrophoneUsageDescription',
  ]) {
    if (!plist.includes(`<key>${key}</key>`)) {
      errors.push(`ios Info.plist missing ${key} — run npm run cap:apply:ios`);
    }
  }
  notes.push('ios/ present — run npm run verify:native:ios');
}

console.log('[guard-native-foundation]');
if (errors.length) {
  for (const e of errors) console.error(`  FAIL ${e}`);
  process.exit(1);
}
console.log('  OK Capacitor package pins + config + native-ready templates');
for (const n of notes) console.log(`  note: ${n}`);
process.exit(0);
