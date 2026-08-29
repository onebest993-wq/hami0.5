/**
 * يولّد مشروع ios/ على macOS ثم يدمج مفاتيح الخصوصية.
 * ويندوز/لينكس: لا يُنشئ شجرة مكسورة — Xcode وCocoaPods غير متاحين.
 * Usage: node scripts/cap-add-ios.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iosPlist = path.join(ROOT, 'ios/App/App/Info.plist');

function runNode(scriptArgs) {
  const r = spawnSync(process.execPath, scriptArgs, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runNpm(args) {
  const r = spawnSync('npm', args, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.platform !== 'darwin') {
  console.error('[cap-add-ios] iOS can only be added on macOS (Xcode + CocoaPods).');
  console.error('On a Mac: npm run cap:add:ios && npm run cap:sync:ios && npm run verify:native:ios');
  console.error('This machine: templates are ready — npm run verify:native:ios');
  process.exit(2);
}

runNode(['scripts/ensure-capacitor-cli-tar-compat.mjs']);

if (fs.existsSync(iosPlist)) {
  console.log('[cap-add-ios] ios/ already present — merging privacy keys');
  runNode(['scripts/apply-ios-native-ready.mjs']);
  process.exit(0);
}

runNpm(['exec', '--', 'cap', 'add', 'ios']);
runNode(['scripts/apply-ios-native-ready.mjs']);
console.log('[cap-add-ios] OK — next: npm run cap:sync:ios && npm run verify:native:ios');
