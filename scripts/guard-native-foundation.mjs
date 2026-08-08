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

const privacyPeer = deps['@capacitor-community/privacy-screen'];
if (privacyPeer) {
  try {
    const p = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'node_modules/@capacitor-community/privacy-screen/package.json'), 'utf8'),
    );
    const peer = p.peerDependencies?.['@capacitor/core'] ?? '';
    if (peer && !peer.includes('6')) {
      errors.push(`privacy-screen peers ${peer} — project is Capacitor 6`);
    }
  } catch {
    notes.push('privacy-screen package not installed locally — skip peer probe');
  }
}

requireFile('capacitor.config.ts', 'Capacitor app identity');
requireFile('scripts/native-ready/biometric-android-permissions.xml', 'Android biometric permissions template');
requireFile('scripts/native-ready/biometric-ios-Info.plist.snippet.xml', 'iOS Face ID plist snippet');
requireFile('scripts/verify-android-native.mjs', 'post-generate Android verify');

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
  notes.push('android/ present (gitignored) — run npm run verify:native:android for splash/device wiring');
}
if (!iosPresent) {
  notes.push('ios/ not generated yet — run: npx cap add ios (macOS) then merge Face ID snippet');
}

console.log('[guard-native-foundation]');
if (errors.length) {
  for (const e of errors) console.error(`  FAIL ${e}`);
  process.exit(1);
}
console.log('  OK Capacitor package pins + config + native-ready templates');
for (const n of notes) console.log(`  note: ${n}`);
process.exit(0);
