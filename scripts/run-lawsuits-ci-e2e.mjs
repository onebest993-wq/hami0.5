#!/usr/bin/env node
/**
 * E2E قسم الدعاوى — افتراضي Vite :8080 (G1 ثم السيناريوهات).
 * LAWSUITS_E2E_USE_PREVIEW=1: vite preview + شرائح ملف-بملف (ويندوز هشّ).
 * LAWSUITS_E2E_SKIP_BUILD=1 يتخطى build:e2e إن وُجد dist (مسار preview فقط).
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
    freePreviewPort,
} from './e2e-preview-manager.mjs';
import http from 'node:http';

const PREVIEW_PORT = process.env.E2E_PREVIEW_PORT ?? '8090';

function probePreviewAlive() {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${PREVIEW_PORT}`, (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2_000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function ensurePreviewAlive(preview) {
    const up = await probePreviewAlive();
    if (!up) {
        await stopPreviewServer(preview);
        freePreviewPort();
        const restarted = await startPreviewServer({ force: true, keepAttached: true });
        await verifyPreviewE2eReady();
        return restarted;
    }
    try {
        await verifyPreviewE2eReady();
    } catch {
        await stopPreviewServer(preview);
        freePreviewPort();
        const restarted = await startPreviewServer({ force: true, keepAttached: true });
        await verifyPreviewE2eReady();
        return restarted;
    }
    return preview;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** ملف واحد لكل دورة — إعادة إحياء preview بين الملفات يمنع ERR_CONNECTION_REFUSED */
const BATCH_A = [
    'e2e/civil-lawsuit-new-case.spec.ts',
    'e2e/personal-status-reload-durability.spec.ts',
    'e2e/personal-status-journal-reload.spec.ts',
    'e2e/civil-lawsuit-smoke.spec.ts',
    'e2e/civil-lawsuit-procedural.spec.ts',
    'e2e/civil-lawsuit-lifecycle.spec.ts',
];

const BATCH_B = [
    'e2e/civil-lawsuit-scenarios.spec.ts',
    'e2e/criminal-dossier-open.spec.ts',
];

const VITE_G1 = [
    'e2e/civil-lawsuit-smoke.spec.ts',
    'e2e/civil-lawsuit-procedural.spec.ts',
    'e2e/civil-lawsuit-new-case.spec.ts',
    'e2e/civil-lawsuit-lifecycle.spec.ts',
    'e2e/criminal-dossier-open.spec.ts',
];

const buildEnv = {
    ...process.env,
    VITE_SHELL_AUTH_OPEN: 'true',
    VITE_BFF_AUTH: 'true',
};

function runPlaywright(specs) {
    const result = spawnSync(
        'npx',
        ['playwright', 'test', ...specs, '--project=chromium', '--workers=1', '--retries=1', '--trace=off'],
        {
            stdio: 'inherit',
            shell: true,
            cwd: ROOT,
            env: {
                ...process.env,
                E2E_USE_PREVIEW: '1',
                E2E_SKIP_WEBSERVER: '1',
                PW_WORKERS: '1',
            },
        },
    );
    return result.status ?? 1;
}

const usePreview = process.env.LAWSUITS_E2E_USE_PREVIEW === '1';

function runPlaywrightVite(specs) {
    const result = spawnSync(
        'npx',
        ['playwright', 'test', ...specs, '--project=chromium', '--workers=1', '--retries=1', '--trace=off'],
        {
            stdio: 'inherit',
            shell: true,
            cwd: ROOT,
            env: {
                ...process.env,
                E2E_USE_PREVIEW: '0',
                E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '0',
                PW_WORKERS: '1',
            },
        },
    );
    return result.status ?? 1;
}

if (usePreview) {
    if (process.env.LAWSUITS_E2E_SKIP_BUILD !== '1' || !existsSync(path.join(ROOT, 'dist/index.html'))) {
        const build = spawnSync('npm', ['run', 'build:e2e'], {
            stdio: 'inherit',
            shell: true,
            cwd: ROOT,
            env: buildEnv,
        });
        if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);
    }

    const preview = await startPreviewServer({ force: true, keepAttached: true });
    let activePreview = preview;
    let failed = 0;
    try {
        activePreview = await ensurePreviewAlive(activePreview);
        console.log('\n=== Lawsuits E2E batch A (preview) ===\n');
        for (const spec of BATCH_A) {
            activePreview = await ensurePreviewAlive(activePreview);
            console.log(`\n--- ${spec} ---\n`);
            const code = runPlaywright([spec]);
            if (code !== 0) failed = code;
        }
        console.log('\n=== Lawsuits E2E batch B (preview) ===\n');
        for (const spec of BATCH_B) {
            activePreview = await ensurePreviewAlive(activePreview);
            console.log(`\n--- ${spec} ---\n`);
            const code = runPlaywright([spec]);
            if (code !== 0) failed = code;
        }
        if (failed !== 0) process.exit(failed);
        console.log('\n✓ lawsuits E2E batches passed\n');
    } finally {
        await stopPreviewServer(activePreview);
    }
} else {
    console.log('\n=== Lawsuits E2E Vite :8080 (set LAWSUITS_E2E_USE_PREVIEW=1 for preview) ===\n');
    const g1 = runPlaywrightVite(VITE_G1);
    const g2 = runPlaywrightVite(['e2e/civil-lawsuit-scenarios.spec.ts']);
    if (g1 !== 0 || g2 !== 0) process.exit(g1 !== 0 ? g1 : g2);
    console.log('\n✓ lawsuits E2E Vite batches passed\n');
}
