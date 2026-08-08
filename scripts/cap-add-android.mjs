/**
 * يولّد مشروع android/ بعد رقع توافق tar، ثم يزامن الإضافات.
 * Usage: node scripts/cap-add-android.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(ROOT, 'android');

function runNode(scriptArgs) {
  const r = spawnSync(process.execPath, scriptArgs, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runNpm(args) {
  const r = spawnSync('npm', args, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

runNode(['scripts/ensure-capacitor-cli-tar-compat.mjs']);

if (fs.existsSync(path.join(androidDir, 'app', 'build.gradle'))) {
  console.log('[cap-add-android] android/ already present — run npm run cap:sync:android');
  process.exit(0);
}

if (fs.existsSync(androidDir)) {
  fs.rmSync(androidDir, { recursive: true, force: true });
}

// npm exec يتجنّب مشاكل المسارات ذات المسافات على ويندوز
runNpm(['exec', '--', 'cap', 'add', 'android']);
runNode(['scripts/apply-android-native-ready.mjs']);
console.log('[cap-add-android] OK — next: npm run cap:sync:android && npm run verify:native:android');
