/**
 * يدمج أذونات البصمة في AndroidManifest إن وُجد مشروع android/ محلي.
 * آمن للتكرار — لا يكرر الأسطر إن وُجدت.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestRel = 'android/app/src/main/AndroidManifest.xml';
const manifestPath = path.join(ROOT, manifestRel);

if (!fs.existsSync(manifestPath)) {
  console.log('[patch-android-biometric] skip — no android project');
  process.exit(0);
}

let xml = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  'android.permission.USE_BIOMETRIC',
  'android.permission.USE_FINGERPRINT',
];
let changed = false;
for (const name of perms) {
  if (xml.includes(name)) continue;
  const line = `    <uses-permission android:name="${name}" />\n`;
  if (xml.includes('android.permission.CAMERA')) {
    xml = xml.replace(
      /(<uses-permission android:name="android\.permission\.CAMERA"\s*\/>)/,
      `$1\n${line.trimEnd()}`,
    );
  } else if (xml.includes('</manifest>')) {
    xml = xml.replace('</manifest>', `${line}</manifest>`);
  }
  changed = true;
}
if (changed) {
  fs.writeFileSync(manifestPath, xml);
  console.log('[patch-android-biometric] patched', manifestRel);
} else {
  console.log('[patch-android-biometric] already present');
}
