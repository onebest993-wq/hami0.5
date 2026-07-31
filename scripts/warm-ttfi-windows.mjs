import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const start = Number(process.argv[2] || 22);
const count = Number(process.argv[3] || 6);

const rows = [];
for (let i = 0; i < count; i++) {
  const w = start + i;
  const r = spawnSync(process.execPath, ['scripts/boot-ttfi-warm.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const m = out.match(/\{[\s\S]*?"warmMedianMs"[\s\S]*?\}/);
  if (!m) {
    console.error(`w${w} FAIL parse`, out.slice(-800));
    process.exitCode = 1;
    continue;
  }
  const json = JSON.parse(m[0]);
  fs.mkdirSync(path.join(ROOT, 'perf-reports'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'perf-reports', `worldclass-ttfi-w${w}.json`),
    JSON.stringify(json, null, 2),
  );
  rows.push({
    w,
    cold: json.coldMs,
    median: json.warmMedianMs,
    warms: json.warmMs,
    target: json.targetWarm150,
  });
  console.log(
    `w${w} cold=${json.coldMs} med=${json.warmMedianMs} [${json.warmMs.join(',')}] ${json.targetWarm150}`,
  );
}
console.log(JSON.stringify({ rows }, null, 2));
