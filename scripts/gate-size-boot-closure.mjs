#!/usr/bin/env node
/**
 * بوابة إغلاق موجة الحجم + الإقلاع + المسارات الحرجة.
 * Usage: npm run gate:size-boot-closure
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, label) {
    console.log(`\n--- ${label} ---\n`);
    const result = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true });
    return result.status === 0;
}

const vitestTargets = [
    'src/app/runtime/__tests__/perceivedBootWaitCutHonesty.test.ts',
    'src/app/runtime/__tests__/bootColdSectionCloseHonesty.test.ts',
    'src/app/runtime/__tests__/bootClosureHonesty.test.ts',
    'src/app/runtime/__tests__/homeHubCardSectionSurgicalCloseHonesty.test.ts',
    'src/app/runtime/__tests__/worldclassHomeHubCloseHonesty.test.ts',
    'src/app/runtime/__tests__/wave7mFoundationCloseHonesty.test.ts',
    'src/data/__tests__/executionLaws.taxonomy.test.ts',
    'src/app/services/vault/__tests__/vaultDocsWarmCache.test.ts',
    'src/app/services/vault/__tests__/vaultPdfAssetUrls.test.ts',
    'src/app/services/alerts/__tests__/homeHubCardLogic.test.ts',
    'src/app/components/lawyer/LawyerHomeHubCard/components/__tests__/',
    'src/app/services/__tests__/vaultUploadService.test.ts',
];

const steps = [];

console.log('=== Size + Boot closure gate ===\n');

steps.push({
    id: 'build',
    ok: run('npm', ['run', 'build'], 'production build'),
});

steps.push({
    id: 'size-baseline',
    ok: run('node', ['scripts/report-size-baseline.mjs', '--save', '.audit/size-baseline-closure.json'], 'size baseline'),
});

steps.push({
    id: 'cold-entry-dist',
    ok: run('npm', ['run', 'guard:cold-entry:dist'], 'cold-entry dist guard'),
});

steps.push({
    id: 'home-hub-gate',
    ok: run('npm', ['run', 'gate:homeHub'], 'home hub gate'),
});

steps.push({
    id: 'vitest-critical',
    ok: run('npx', ['vitest', 'run', ...vitestTargets], 'critical vitest bundle'),
});

const report = {
    generatedAt: new Date().toISOString(),
    allPassed: steps.every((s) => s.ok),
    steps: steps.map((s) => ({ id: s.id, passed: s.ok })),
};

const outPath = path.join(ROOT, '.audit', 'size-boot-closure-gate.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('\n=== Closure gate summary ===\n');
for (const s of steps) {
    console.log(`${s.ok ? 'PASSED' : 'FAILED'}  ${s.id}`);
}
console.log(`\nReport: .audit/size-boot-closure-gate.json`);

process.exit(report.allPassed ? 0 : 1);
