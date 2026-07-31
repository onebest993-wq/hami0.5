#!/usr/bin/env node
/**
 * E2E للأقسام المغلقة — build مرة واحدة + preview واحد + boot + اختبارات كل قسم.
 *
 * Usage:
 *   npm run gate:closed-sections:e2e
 *   SKIP_BUILD=1 npm run gate:closed-sections:e2e
 */
import { spawnSync } from 'node:child_process';
import {
    E2E_PREVIEW_PORT,
    freePreviewPort,
    startPreviewServer,
    stopPreviewServer,
} from './e2e-preview-manager.mjs';

const sections = [
    { label: 'boot', script: 'test:e2e:boot', required: true },
    { label: 'الإعدادات', script: 'test:e2e:settings' },
    { label: 'الإشعارات', script: 'test:e2e:notifications' },
    { label: 'البحث', script: 'test:e2e:global-search' },
    { label: 'المهام', script: 'test:e2e:tasks' },
    { label: 'التقويم', script: 'test:e2e:calendar' },
    { label: 'المستودع', script: 'test:e2e:repository' },
    { label: 'المنتدى', script: 'test:e2e:forum' },
    { label: 'التنبيهات/التثبيت', script: 'test:e2e:homeHub' },
    { label: 'الملف المهني', script: 'test:e2e:profile' },
];

function run(label, cmd, args, env) {
    console.log(`\n>>> ${label}\n`);
    const started = Date.now();
    const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, env });
    return { ok: result.status === 0, ms: Date.now() - started };
}

console.log('=== Closed sections — E2E integrity gate ===\n');

if (!process.env.SKIP_BUILD) {
    const build = run('production build', 'npm', ['run', 'build'], process.env);
    if (!build.ok) {
        console.error('\n=== E2E gate ===\nFAILED (build)');
        process.exit(1);
    }
} else {
    console.log('SKIP_BUILD=1 — تخطي البناء\n');
}

freePreviewPort();
let previewChild = null;
try {
    previewChild = await startPreviewServer({ force: true });
    console.log(`preview ready on http://127.0.0.1:${E2E_PREVIEW_PORT}\n`);
} catch (err) {
    console.error('Failed to start preview:', err.message);
    process.exit(1);
}

const e2eEnv = {
    ...process.env,
    PW_WORKERS: '1',
    PW_RETRIES: process.env.PW_RETRIES ?? '1',
    CI: process.env.CI ?? '',
    E2E_USE_PREVIEW: '1',
    E2E_SKIP_WEBSERVER: '1',
    E2E_PREVIEW_PORT,
};

const results = [];

for (const section of sections) {
    const outcome = run(section.label, 'node', ['scripts/run-section-e2e.mjs', section.script], e2eEnv);
    results.push({ ...section, ...outcome });
    if (section.required && !outcome.ok) {
        console.error(`\n⚠ boot smoke failed — continuing remaining E2E suites for full matrix\n`);
    }
}

await stopPreviewServer(previewChild);

console.log('\n\n=== E2E matrix ===\n');
console.log('| القسم | السكربت | النتيجة | المدة |');
console.log('|------|---------|---------|-------|');
for (const r of results) {
    console.log(
        `| ${r.label} | ${r.script} | ${r.ok ? 'PASSED' : 'FAILED'} | ${(r.ms / 1000).toFixed(1)}s |`,
    );
}

const failed = results.filter((r) => !r.ok);
const passed = results.filter((r) => r.ok);
console.log(`\n${passed.length}/${results.length} E2E suites passed.`);

if (failed.length > 0) {
    console.error('\nFailed:', failed.map((f) => f.label).join(', '));
    console.error('\n=== E2E gate ===\nFAILED');
    process.exit(1);
}

console.log('\n=== E2E gate ===\nPASSED');
process.exit(0);
