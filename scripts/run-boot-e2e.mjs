#!/usr/bin/env node
/**
 * Boot E2E — preview بعد build:e2e افتراضياً.
 *
 *   npm run test:e2e:boot              Chromium + دخان الإقلاع
 *   npm run test:e2e:boot:full         دخان + مسبار كامل على كل مشاريع الويب المتاحة
 *
 * --full لا يشمل APK/IPA على جهاز حقيقي.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { hamiBootScriptFingerprint } from './e2e-build-env.mjs';
import { resolveE2ePlatformProjects } from './e2e-platform-projects.mjs';
import {
    freePreviewPort,
    startPreviewServer,
    stopPreviewServer,
} from './e2e-preview-manager.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distReady = existsSync(path.join(ROOT, 'dist/index.html'));
const STAMP = path.join(ROOT, '.audit', 'e2e-dist-stamp.json');
const BOOT_SPECS = ['e2e/app-boot-smoke.spec.ts', 'e2e/boot-full-path-probe.spec.ts'];

const argv = process.argv.slice(2);
const full = argv.includes('--full');
const extra = argv.filter((a) => a !== '--full');

function distNeedsE2eBuild() {
    if (!distReady) return true;
    if (process.env.E2E_FORCE_REBUILD === '1') return true;
    if (!existsSync(STAMP)) return true;
    try {
        const stamp = JSON.parse(readFileSync(STAMP, 'utf8'));
        if (stamp.shellAuthOpen !== true || stamp.viteE2e !== true) return true;
        if (stamp.hamiBootScript !== hamiBootScriptFingerprint()) return true;
    } catch {
        return true;
    }
    return false;
}

function run(name, cmd, args, env) {
    console.log(`\n[boot-e2e] ${name}...`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        cwd: ROOT,
        env,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

if (distNeedsE2eBuild() && process.env.E2E_SKIP_BUILD !== '1') {
    run('build:e2e', 'npm', ['run', 'build:e2e'], process.env);
}

const playwrightEnv = {
    ...process.env,
    E2E_USE_PREVIEW: process.env.E2E_USE_PREVIEW ?? '1',
    E2E_PREVIEW_RELAXED_SECURITY: '1',
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
    ...(full ? { E2E_BOOT_FULL: '1' } : {}),
};

const specs = full ? BOOT_SPECS : ['e2e/app-boot-smoke.spec.ts'];
const explicitProject = extra.some((a) => a.startsWith('--project'));

const projectFlags = explicitProject
    ? extra.filter((a) => a.startsWith('--project'))
    : await resolveE2ePlatformProjects({
          allPlatforms: full,
          includeDesktopExtras: full,
          logPrefix: '[boot-e2e]',
      });

const rest = extra.filter((a) => !a.startsWith('--project'));

if (full) {
    console.log('[boot-e2e] شامل ويب: دخان + مسبار المسار الكامل');
    console.log(`[boot-e2e] مشاريع: ${projectFlags.join(' ') || '(default)'}`);
    console.log('[boot-e2e] خارج النطاق: Android APK / iOS IPA على جهاز حقيقي');
}

function runPlaywright(flags, env) {
    run(
        `playwright ${flags.join(' ')}`,
        'npx',
        ['playwright', 'test', ...specs, '--workers=1', ...flags, ...rest],
        env,
    );
}

if (full && !explicitProject && projectFlags.length > 1) {
    freePreviewPort();
    const preview = await startPreviewServer({ force: true, keepAttached: true });
    try {
        for (const projectFlag of projectFlags) {
            runPlaywright([projectFlag], { ...playwrightEnv, E2E_SKIP_WEBSERVER: '1' });
        }
    } finally {
        await stopPreviewServer(preview);
    }
    process.exit(0);
}

const flags = explicitProject ? extra.filter((a) => a.startsWith('--project')) : projectFlags;
runPlaywright(flags, playwrightEnv);
