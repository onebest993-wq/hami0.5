#!/usr/bin/env node
/**
 * تحقق جاهزية iOS/Capacitor — بلا Xcode.
 * على ويندوز: يمرّ إذا القوالب والإعدادات سليمة (المشروع غير مولَّد = تحذير لا فشل).
 * على ماك بعد cap add: يفرض مفاتيح Info.plist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { missingRequiredPrivacyKeys, REQUIRED_IOS_PRIVACY_KEYS } from './lib/ios-info-plist.mjs';

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

requireFile('scripts/native-ready/biometric-ios-Info.plist.snippet.xml', 'iOS privacy snippet');
requireFile('scripts/native-ready/ios/LaunchScreen.storyboard', 'iOS LaunchScreen');
requireFile('scripts/native-ready/ios/HamiBootOverlayView.swift', 'iOS boot overlay');
requireFile('scripts/native-ready/ios/HamiBootPlugin.swift', 'iOS HamiBoot plugin');
requireFile('scripts/native-ready/ios/LaunchLogo.imageset/Contents.json', 'iOS LaunchLogo imageset');
requireFile('scripts/native-ready/ios/LaunchLogo.imageset/hami_splash_logo.webp', 'iOS LaunchLogo webp');
requireFile('scripts/cap-add-ios.mjs', 'cap add ios');
requireFile('scripts/apply-ios-native-ready.mjs', 'apply ios native-ready');
requireFile('capacitor.config.ts', 'Capacitor config');

const snippet = read('scripts/native-ready/biometric-ios-Info.plist.snippet.xml') ?? '';
for (const key of REQUIRED_IOS_PRIVACY_KEYS) {
  if (!snippet.includes(`<key>${key}</key>`)) {
    errors.push(`iOS snippet missing ${key}`);
  }
}

const capConfig = read('capacitor.config.ts') ?? '';
if (!capConfig.includes('Keyboard')) {
  errors.push('capacitor.config.ts missing Keyboard plugin config');
}
if (!capConfig.includes("androidScaleType: 'FIT_CENTER'") && !capConfig.includes('androidScaleType: "FIT_CENTER"')) {
  errors.push("capacitor.config.ts SplashScreen.androidScaleType must be FIT_CENTER (aspect lock)");
}
if (!/backgroundColor:\s*['"]#0A0F1C['"]/.test(capConfig)) {
  errors.push('capacitor.config.ts SplashScreen must keep identity #0A0F1C (not raw black)');
}
if (!/style:\s*['"]DARK['"]/.test(capConfig)) {
  errors.push("capacitor.config.ts Keyboard.style must be 'DARK' (native iOS keyboard chrome)");
}
if (!capConfig.includes('resizeOnFullScreen')) {
  errors.push('capacitor.config.ts missing Keyboard.resizeOnFullScreen');
}
if (!capConfig.includes("autoBackdropColor: 'auto'") && !capConfig.includes('autoBackdropColor: "auto"')) {
  errors.push("capacitor.config.ts Keyboard.autoBackdropColor must be 'auto' (iOS keyboard backdrop)");
}

const pkg = JSON.parse(read('package.json') ?? '{}');
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
if (!deps['@capacitor/ios']) {
  errors.push('package.json missing @capacitor/ios');
}
if (!deps['@aparajita/capacitor-biometric-auth']) {
  errors.push('package.json missing @aparajita/capacitor-biometric-auth');
}

const launchStoryboard = read('scripts/native-ready/ios/LaunchScreen.storyboard') ?? '';
if (!launchStoryboard.includes('scaleAspectFit')) {
  errors.push('LaunchScreen.storyboard must use scaleAspectFit (aspect lock)');
}
if (!launchStoryboard.includes('0.0392156862745098')) {
  errors.push('LaunchScreen.storyboard must use identity navy #0A0F1C');
}
const capAddSrc = read('scripts/cap-add-ios.mjs') ?? '';
if (!capAddSrc.includes("process.platform !== 'darwin'")) {
  errors.push('cap-add-ios.mjs must refuse non-macOS (do not generate a broken ios/ tree on Windows)');
}

const plistPath = 'ios/App/App/Info.plist';
if (fs.existsSync(path.join(root, plistPath))) {
  const plist = read(plistPath) ?? '';
  for (const key of missingRequiredPrivacyKeys(plist)) {
    errors.push(`Info.plist missing ${key} — run npm run cap:apply:ios`);
  }
  if (!fs.existsSync(path.join(root, 'ios/App/Podfile'))) {
    warnings.push('ios/App/Podfile missing — run pod install on the Mac after cap add ios');
  }
} else {
  warnings.push(
    'ios project not present yet — on macOS run: npm run cap:add:ios && npm run cap:sync:ios',
  );
  if (process.platform !== 'darwin') {
    warnings.push('this OS cannot generate ios/ (needs Xcode). Templates are the handoff.');
  }
}

console.log('\n=== Hami Native iOS Verify ===\n');
if (errors.length === 0) {
  console.log('✓ iOS templates + config OK');
} else {
  console.log('✗ failures:');
  for (const e of errors) console.log(`  - ${e}`);
}
if (warnings.length) {
  console.log('\n⚠ warnings:');
  for (const w of warnings) console.log(`  - ${w}`);
}
console.log('\nNext on Mac: npm run cap:add:ios && npm run cap:sync:ios && npx cap open ios');
console.log('Manual on device: Face ID lock, native keyboard inset, camera vault, voice note\n');

process.exit(errors.length ? 1 : 0);
