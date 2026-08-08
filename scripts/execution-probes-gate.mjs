#!/usr/bin/env node
/**
 * بوابة probes التنفيذ — مسار الحجز + محضر المتابعة (stub detection).
 * يتطلب build:e2e مسبقاً؛ يشغّل vite preview ثم:
 *   .cursor/probe-seizure-workflow.mjs (9/9)
 *   .cursor/probe-followup-stubs.mjs (11/11)
 *
 * Usage: npm run gate:execution:probes
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const previewPort = process.env.E2E_PREVIEW_PORT ?? '8090';
const baseURL = `http://127.0.0.1:${previewPort}/`;

if (!existsSync('dist/index.html')) {
    console.error('✗ dist/index.html missing — run npm run build:e2e first');
    process.exit(1);
}

let failed = false;
let preview = null;

async function waitForUrl(url, timeoutMs = 120_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url, { redirect: 'manual' });
            if (res.ok || res.status < 500) return true;
        } catch {
            // preview still booting
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    return false;
}

function runProbe(name, scriptPath) {
    console.log(`\n[execution-probes] ${name}...`);
    const result = spawnSync('node', [scriptPath], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: {
            ...process.env,
            PLAYWRIGHT_BASE_URL: baseURL,
            E2E_USE_PREVIEW: '1',
        },
    });
    if (result.status !== 0) {
        console.error(`✗ ${name}`);
        failed = true;
    } else {
        console.log(`✓ ${name}`);
    }
}

console.log('=== Execution probes gate (seizure + followup stubs) ===\n');
console.log(`Preview base: ${baseURL}`);

preview = spawn(
    'npm',
    ['run', 'preview', '--', '--port', previewPort, '--host', '127.0.0.1', '--strictPort'],
    {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env },
    },
);

const ready = await waitForUrl(baseURL);
if (!ready) {
    console.error('✗ preview server did not become ready');
    if (preview) preview.kill();
    process.exit(1);
}

runProbe('probe-seizure-workflow', '.cursor/probe-seizure-workflow.mjs');
runProbe('probe-followup-stubs', '.cursor/probe-followup-stubs.mjs');

if (preview) {
    preview.kill();
}

console.log('\n=== Probes gate result ===');
if (failed) {
    console.error('FAILED — seizure/followup probes must be green');
    process.exit(1);
}

console.log('PASSED — seizure + followup probes green');
process.exit(0);
