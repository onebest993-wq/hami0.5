#!/usr/bin/env node
/**
 * بوابة probes التنفيذ — مسار الحجز + محضر المتابعة (stub detection).
 * يتطلب build:e2e مسبقاً؛ يستخدم vite preview ثم:
 *   .cursor/probe-seizure-workflow.mjs
 *   .cursor/probe-followup-stubs.mjs
 *
 * Usage: npm run gate:execution:probes
 * عند السلسلة الكاملة: E2E_KEEP_PREVIEW=1 حتى لا يُقتل preview قبل Playwright.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
    E2E_PREVIEW_PORT,
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
} from './e2e-preview-manager.mjs';

const baseURL = `http://127.0.0.1:${E2E_PREVIEW_PORT}/`;
const keepPreview =
    process.env.E2E_KEEP_PREVIEW === '1' || process.env.E2E_KEEP_PREVIEW === 'true';
const managedExternally =
    process.env.PREVIEW_MANAGED_BY_PARENT === '1' ||
    process.env.PREVIEW_MANAGED_BY_PARENT === 'true';

if (!existsSync('dist/index.html')) {
    console.error('✗ dist/index.html missing — run npm run build:e2e first');
    process.exit(1);
}

let failed = false;
let previewStarted = null;

function runProbe(name, scriptPath) {
    console.log(`\n[execution-probes] ${name}...`);
    const result = spawnSync('node', [scriptPath], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: {
            ...process.env,
            PLAYWRIGHT_BASE_URL: baseURL,
            E2E_USE_PREVIEW: '1',
            E2E_SKIP_WEBSERVER: '1',
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

try {
    if (managedExternally) {
        const res = await fetch(baseURL, { redirect: 'manual' }).catch(() => null);
        if (!res?.ok) {
            throw new Error('preview not ready (PREVIEW_MANAGED_BY_PARENT)');
        }
        await verifyPreviewE2eReady();
        console.log('Using parent-managed preview server');
    } else {
        previewStarted = await startPreviewServer({ force: false });
        if (!previewStarted) {
            console.log('Using existing preview server');
        }
    }

    runProbe('probe-seizure-workflow', '.cursor/probe-seizure-workflow.mjs');
    runProbe('probe-followup-stubs', '.cursor/probe-followup-stubs.mjs');
} catch (err) {
    console.error('✗ preview bootstrap failed:', err instanceof Error ? err.message : err);
    failed = true;
} finally {
    if (!keepPreview) {
        await stopPreviewServer(previewStarted);
    } else if (previewStarted) {
        console.log('Keeping preview alive for chained E2E (E2E_KEEP_PREVIEW)');
    }
}

console.log('\n=== Probes gate result ===');
if (failed) {
    console.error('FAILED — seizure/followup probes must be green');
    process.exit(1);
}

console.log('PASSED — seizure + followup probes green');
process.exit(0);
