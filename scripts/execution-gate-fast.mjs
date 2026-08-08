#!/usr/bin/env node
/**
 * بوابة تنفيذ سريعة — audits + unit (بدون E2E) للتكرار المحلي
 * Usage: npm run gate:execution:fast
 */
import { spawnSync } from 'node:child_process';

let failed = false;

function run(name, cmd, args) {
    console.log(`\n[execution-gate:fast] ${name}...`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
        console.error(`✗ ${name}`);
        failed = true;
    } else {
        console.log(`✓ ${name}`);
    }
}

console.log('=== Execution fast gate (audits + unit) ===\n');

run('audit-execution-snapshot', 'npm', ['run', 'audit:execution-snapshot']);
run('audit-execution-chunk-scope', 'npm', ['run', 'audit:execution-chunk-scope']);
run('execution-dashboard-unit', 'npx', [
    'vitest',
    'run',
    'src/app/components/lawyer/ExecutionDashboard',
    '--reporter=dot',
]);
run('execution-application-unit', 'npx', [
    'vitest',
    'run',
    'src/app/application/execution',
    '--reporter=dot',
]);

console.log('\n=== Fast gate result ===');
process.exit(failed ? 1 : 0);
