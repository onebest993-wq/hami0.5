/**
 * تحقق بناء الإنتاج: لا circular chunks + لا تراجع أحجام الـ chunks المراقَبة.
 * الاستخدام: node scripts/verify-production-build.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
    const result = spawnSync(cmd, args, {
        cwd: root,
        encoding: 'utf8',
        shell: true,
        ...opts,
    });
    return result;
}

const build = run('npm', ['run', 'build']);
const buildOutput = `${build.stdout ?? ''}${build.stderr ?? ''}`;
process.stdout.write(build.stdout ?? '');
process.stderr.write(build.stderr ?? '');

if (build.status !== 0) {
    process.exit(build.status || 1);
}

if (/Circular chunk:/i.test(buildOutput)) {
    console.error('[verify-production-build] BLOCKED: circular manual chunks detected in vite build');
    process.exit(1);
}

const report = run('node', ['scripts/report-chunk-sizes.mjs'], { stdio: 'inherit' });
if (report.status !== 0) {
    process.exit(report.status || 1);
}

const diff = run('node', ['scripts/chunk-baseline.mjs', 'diff', '--fail']);
process.stdout.write(diff.stdout ?? '');
process.stderr.write(diff.stderr ?? '');
if (diff.status !== 0) {
    process.exit(diff.status || 1);
}

console.log('[verify-production-build] OK — no circular chunks, chunk regression within budget');
