/**
 * بعد `npm run cap:add:ios` يدمج قصاصة Face ID / الموقع / الكاميرا / الميكروفون في Info.plist.
 * ios/ gitignored على بعض الآلات — القصاصات في scripts/native-ready هي مصدر الحقيقة.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mergePrivacyKeysIntoPlist,
  parsePlistKeyStrings,
  REQUIRED_IOS_PRIVACY_KEYS,
  ensureUiDeviceFamilyHandheld,
  ensureHamiAppUrlScheme,
} from './lib/ios-info-plist.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'ios/App/App');
const PLIST = path.join(APP, 'Info.plist');
const SNIPPET = path.join(ROOT, 'scripts/native-ready/biometric-ios-Info.plist.snippet.xml');
const IOS_TMPL = path.join(ROOT, 'scripts/native-ready/ios');

function copySplashTemplates(appDir) {
  if (!fs.existsSync(appDir)) return;
  const copies = [
    ['LaunchScreen.storyboard', 'Base.lproj/LaunchScreen.storyboard'],
    ['HamiBootOverlayView.swift', 'HamiBootOverlayView.swift'],
    ['HamiBootPlugin.swift', 'HamiBootPlugin.swift'],
    ['HamiPrivacyPlugin.swift', 'HamiPrivacyPlugin.swift'],
    ['LaunchLogo.imageset/Contents.json', 'Assets.xcassets/LaunchLogo.imageset/Contents.json'],
    ['LaunchLogo.imageset/hami_splash_logo.webp', 'Assets.xcassets/LaunchLogo.imageset/hami_splash_logo.webp'],
  ];
  for (const [fromRel, toRel] of copies) {
    const from = path.join(IOS_TMPL, fromRel);
    if (!fs.existsSync(from)) continue;
    const to = path.join(appDir, toRel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log(`  → ios/App/App/${toRel}`);
  }
}

if (!fs.existsSync(path.join(ROOT, 'ios/App'))) {
  console.error('[apply-ios-native-ready] ios/ missing — run npm run cap:add:ios on macOS');
  process.exit(1);
}

console.log('[apply-ios-native-ready] splash templates');
copySplashTemplates(APP);

if (!fs.existsSync(PLIST)) {
  console.error('[apply-ios-native-ready] Info.plist missing — finish cap add ios on macOS');
  process.exit(1);
}

const snippet = fs.readFileSync(SNIPPET, 'utf8');
const keys = parsePlistKeyStrings(snippet);
for (const required of REQUIRED_IOS_PRIVACY_KEYS) {
  if (!keys[required]) {
    console.error(`[apply-ios-native-ready] snippet missing ${required}`);
    process.exit(1);
  }
}

const before = fs.readFileSync(PLIST, 'utf8');
const after = ensureHamiAppUrlScheme(ensureUiDeviceFamilyHandheld(mergePrivacyKeysIntoPlist(before, keys)));
if (after !== before) {
  fs.writeFileSync(PLIST, after, 'utf8');
  console.log('[apply-ios-native-ready] merged privacy keys into ios/App/App/Info.plist');
} else {
  console.log('[apply-ios-native-ready] Info.plist already has privacy keys');
}

console.log('OK — re-run npm run verify:native:ios');
