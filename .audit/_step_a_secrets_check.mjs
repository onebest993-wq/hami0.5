import { spawnSync } from 'node:child_process';

const r = spawnSync('git', ['add', '-A', '--dry-run'], { cwd: process.cwd(), encoding: 'utf8', shell: process.platform === 'win32' });
if (r.status !== 0) {
  console.error('git add dry-run failed:', r.stderr);
  process.exit(2);
}
const lines = (r.stdout || '').split(/\r?\n/).filter(Boolean);
const re = /\.env($|\.)|\.pem$|\.key$|\.keystore$|\.jks$|google-services\.json$|GoogleService-Info\.plist$|serviceAccount/;
const matched = [];
for (const l of lines) {
  if (re.test(l)) matched.push(l);
}
console.log(`=== STEP-A dry-run lines=${lines.length} matched=${matched.length} ===`);
if (matched.length) {
  console.error('FAIL: SECRET PATTERN(S):');
  for (const m of matched) console.error('  >>', m);
  process.exit(1);
}
console.log('STEP-A OK — 0 secret patterns in git add dry-run. SAFE to proceed.');
