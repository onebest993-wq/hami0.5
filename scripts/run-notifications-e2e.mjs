#!/usr/bin/env node
/**
 * E2E لوحة الإشعارات — build:e2e (VITE_E2E hooks) ثم preview.
 *
 * Usage:
 *   npm run test:e2e:notifications
 *   npm run test:e2e:notifications:mobile
 *   npm run test:e2e:notifications:all
 *   node scripts/run-notifications-e2e.mjs --project=mobile-chrome
 *   node scripts/run-notifications-e2e.mjs --all-platforms
 *   node scripts/run-notifications-e2e.mjs --skip-build --all-platforms
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGlobalSearchE2eProjects } from './e2e-platform-projects.mjs';
import {
    freePreviewPort,
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
} from './e2e-preview-manager.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAMP_PATH = path.join(ROOT, '.audit', 'e2e-dist-stamp.json');

const argv = process.argv.slice(2);
const skipBuild = argv.includes('--skip-build') || process.env.E2E_SKIP_BUILD === '1';
const allPlatforms = argv.includes('--all-platforms');
const projectArg = argv.find((arg) => arg.startsWith('--project='));

function run(name, cmd, args, env = process.env) {
    console.log(`\n[notifications-e2e] ${name}...`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env,
    });
    return result.status ?? 1;
}

function readE2eStamp() {
    try {
        return JSON.parse(fs.readFileSync(STAMP_PATH, 'utf8'));
    } catch {
        return null;
    }
}

if (!skipBuild) {
    const buildStatus = run('build:e2e', 'npm', ['run', 'build:e2e']);
    if (buildStatus !== 0) {
        const stamp = readE2eStamp();
        const distReady = fs.existsSync(path.join(ROOT, 'dist', 'index.html'));
        if (distReady && stamp?.viteE2e) {
            console.warn(
                '[notifications-e2e] build:e2e failed — reusing existing VITE_E2E dist (stop preview on :8090 and retry for a clean build)',
            );
        } else {
            process.exit(buildStatus);
        }
    }
}

const projectFlags = projectArg
    ? [projectArg]
    : allPlatforms
      ? await resolveGlobalSearchE2eProjects({ allPlatforms: true })
      : [
            `--project=${process.env.E2E_NOTIFICATIONS_PROJECT || 'chromium'}`,
        ];

console.log(`[notifications-e2e] projects: ${projectFlags.join(' ') || '(default)'}`);

function runPlaywrightBatch(flags, { managedPreview = false } = {}) {
    return run(
        'playwright',
        'npx',
        ['playwright', 'test', 'e2e/notifications-panel.spec.ts', 'e2e/notifications-mobile.spec.ts', '--workers=1', ...flags],
        {
            ...process.env,
            E2E_USE_PREVIEW: '1',
            ...(managedPreview ? { E2E_SKIP_WEBSERVER: '1' } : {}),
            PW_WORKERS: '1',
        },
    );
}

/** منصات متعددة — preview واحد مُدار يمنع ERR_CONNECTION_REFUSED بين المشاريع */
if (allPlatforms && projectFlags.length > 1) {
    freePreviewPort();
    let preview = await startPreviewServer({ force: true, keepAttached: true });
    try {
        for (const projectFlag of projectFlags) {
            freePreviewPort();
            preview = await startPreviewServer({ force: true, keepAttached: true });
            const status = runPlaywrightBatch([projectFlag], { managedPreview: true });
            if (status !== 0) process.exit(status);
        }
        process.exit(0);
    } finally {
        await stopPreviewServer(preview);
    }
}

const testStatus = runPlaywrightBatch(projectFlags);
process.exit(testStatus);
