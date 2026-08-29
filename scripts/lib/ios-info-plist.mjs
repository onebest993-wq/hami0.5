/**
 * دمج مفاتيح خصوصية iOS في Info.plist دون تكرار.
 * يُستدعى بعد `cap add ios` / `cap sync ios`.
 */

const KEY_STRING_RE = /<key>([^<]+)<\/key>\s*<string>([\s\S]*?)<\/string>/g;

export const REQUIRED_IOS_PRIVACY_KEYS = [
  'NSFaceIDUsageDescription',
  'NSLocationWhenInUseUsageDescription',
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription',
];

export function parsePlistKeyStrings(xml) {
  const map = {};
  const re = new RegExp(KEY_STRING_RE.source, 'g');
  let m;
  while ((m = re.exec(xml))) {
    map[m[1]] = m[2];
  }
  return map;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * @param {string} plistXml
 * @param {Record<string, string>} keys
 */
export function mergePrivacyKeysIntoPlist(plistXml, keys) {
  if (!plistXml.includes('</dict>')) {
    throw new Error('Info.plist missing </dict>');
  }
  let out = plistXml;
  for (const [key, value] of Object.entries(keys)) {
    const escaped = escapeXml(value);
    const existing = new RegExp(`(<key>${key}</key>\\s*<string>)([\\s\\S]*?)(</string>)`);
    if (existing.test(out)) {
      out = out.replace(existing, `$1${escaped}$3`);
      continue;
    }
    const insert = `\t<key>${key}</key>\n\t<string>${escaped}</string>\n`;
    const idx = out.lastIndexOf('</dict>');
    out = out.slice(0, idx) + insert + out.slice(idx);
  }
  return out;
}

export function missingRequiredPrivacyKeys(plistXml, required = REQUIRED_IOS_PRIVACY_KEYS) {
  return required.filter((key) => !plistXml.includes(`<key>${key}</key>`));
}

/** iPhone (1) + iPad (2) — عقد المنتج: تطبيق يد لا Mac Catalyst. */
export function ensureUiDeviceFamilyHandheld(plistXml) {
  if (plistXml.includes('<key>UIDeviceFamily</key>')) return plistXml;
  if (!plistXml.includes('</dict>')) {
    throw new Error('Info.plist missing </dict>');
  }
  const insert =
    '\t<key>UIDeviceFamily</key>\n\t<array>\n\t\t<integer>1</integer>\n\t\t<integer>2</integer>\n\t</array>\n';
  const idx = plistXml.lastIndexOf('</dict>');
  return plistXml.slice(0, idx) + insert + plistXml.slice(idx);
}

const HAMI_URL_SCHEME_RE =
  /<key>CFBundleURLSchemes<\/key>\s*<array>[\s\S]*?<string>iq\.hami\.legal<\/string>/;

/** روابط iq.hami.legal:// لاستعادة كلمة المرور وتأكيد البريد على الجهاز. */
export function ensureHamiAppUrlScheme(plistXml) {
  if (HAMI_URL_SCHEME_RE.test(plistXml)) return plistXml;
  if (!plistXml.includes('</dict>')) {
    throw new Error('Info.plist missing </dict>');
  }
  const dictEntry =
    '\t\t<dict>\n' +
    '\t\t\t<key>CFBundleURLName</key>\n' +
    '\t\t\t<string>iq.hami.legal</string>\n' +
    '\t\t\t<key>CFBundleURLSchemes</key>\n' +
    '\t\t\t<array>\n' +
    '\t\t\t\t<string>iq.hami.legal</string>\n' +
    '\t\t\t</array>\n' +
    '\t\t</dict>\n';
  const typesKey = plistXml.indexOf('<key>CFBundleURLTypes</key>');
  if (typesKey >= 0) {
    const arrayOpen = plistXml.indexOf('<array>', typesKey);
    if (arrayOpen >= 0) {
      const insertAt = arrayOpen + '<array>'.length;
      return `${plistXml.slice(0, insertAt)}\n${dictEntry}${plistXml.slice(insertAt)}`;
    }
  }
  const insert = `\t<key>CFBundleURLTypes</key>\n\t<array>\n${dictEntry}\t</array>\n`;
  const idx = plistXml.lastIndexOf('</dict>');
  return plistXml.slice(0, idx) + insert + plistXml.slice(idx);
}
