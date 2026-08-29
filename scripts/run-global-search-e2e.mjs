#!/usr/bin/env node
/**
 * E2E البحث الشامل — build:e2e (VITE_E2E hooks) ثم preview.
 *
 * Usage:
 *   npm run test:e2e:global-search
 *   node scripts/run-global-search-e2e.mjs --skip-build
 *   node scripts/run-global-search-e2e.mjs --skip-build --all-platforms
 *   node scripts/run-global-search-e2e.mjs --skip-build -- --project=mobile-chrome
 */
import { spawnSync } from 'node:child_process';
import { resolveGlobalSearchE2eProjects } from './e2e-platform-projects.mjs';
import {
    freePreviewPort,
    startPreviewServer,
    stopPreviewServer,
} from './e2e-preview-manager.mjs';

const argv = process.argv.slice(2);
const skipBuild = argv.includes('--skip-build');
const allPlatforms = argv.includes('--all-platforms');
const dash = argv.indexOf('--');
const playwrightArgs = dash >= 0 ? argv.slice(dash + 1) : [];

function run(name, cmd, args, env = process.env) {
    console.log(`\n[global-search-e2e] ${name}...`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env,
    });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

if (!skipBuild && process.env.E2E_SKIP_BUILD !== '1') {
    run('build:e2e', 'npm', ['run', 'build:e2e']);
}

const projectFlags =
    playwrightArgs.length > 0
        ? playwrightArgs
        : await resolveGlobalSearchE2eProjects({ allPlatforms });

console.log(`[global-search-e2e] projects: ${projectFlags.join(' ') || '(default)'}`);

const playwrightEnv = {
    ...process.env,
    E2E_USE_PREVIEW: process.env.E2E_USE_PREVIEW ?? '1',
    E2E_PREVIEW_RELAXED_SECURITY: '1',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
};

function runPlaywrightBatch(flags, { managedPreview = false } = {}) {
    run(
        'playwright',
        'npx',
        ['playwright', 'test', 'e2e/global-search.spec.ts', '--workers=1', ...flags],
        {
            ...playwrightEnv,
            ...(managedPreview ? { E2E_SKIP_WEBSERVER: '1' } : {}),
        },
    );
}

/** منصات متعددة — preview واحد مُدار + رؤوس E2E (بدون upgrade-insecure-requests لـ WebKit) */
if (allPlatforms && projectFlags.length > 1) {
    freePreviewPort();
    let preview = await startPreviewServer({ force: true, keepAttached: true });
    try {
        for (const projectFlag of projectFlags) {
            const status = spawnSync(
                'npx',
                ['playwright', 'test', 'e2e/global-search.spec.ts', '--workers=1', projectFlag],
                {
                    stdio: 'inherit',
                    shell: process.platform === 'win32',
                    env: {
                        ...playwrightEnv,
                        E2E_SKIP_WEBSERVER: '1',
                    },
                },
            ).status;
            if (status !== 0) process.exit(status ?? 1);
        }
        process.exit(0);
    } finally {
        await stopPreviewServer(preview);
    }
}

runPlaywrightBatch(projectFlags);
