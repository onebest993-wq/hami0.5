#!/usr/bin/env node
/**
 * E2E المستودع الذكي — البلاطة → الطبقة (مفكرة / وسائط).
 *
 * Usage:
 *   npm run test:e2e:repository
 *   node scripts/run-repository-e2e.mjs --skip-build
 *   node scripts/run-repository-e2e.mjs --skip-build -- --project=chromium
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const skipBuild = argv.includes('--skip-build') || process.env.E2E_SKIP_BUILD === '1';
const dash = argv.indexOf('--');
const playwrightArgs = dash >= 0 ? argv.slice(dash + 1) : argv.filter((a) => a !== '--skip-build');

const SPECS = [
    'e2e/smart-repository.spec.ts',
    'e2e/notepad-modal.spec.ts',
    'e2e/smart-vault.spec.ts',
    'e2e/repository-media.spec.ts',
];

function quoteWinArg(arg) {
    if (process.platform !== 'win32') return arg;
    if (/[\s|&<>^]/.test(arg) && !/^".*"$/.test(arg)) {
        return `"${arg.replaceAll('"', '\\"')}"`;
    }
    return arg;
}

function run(name, cmd, args, env = process.env) {
    console.log(`\n[repository-e2e] ${name}...`);
    const result = spawnSync(cmd, args.map(quoteWinArg), {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env,
    });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

if (!skipBuild) {
    run('build:e2e', 'npm', ['run', 'build:e2e']);
}

const projectFlags =
    playwrightArgs.length > 0 ? playwrightArgs : ['--project=chromium', '--workers=1'];

const distReady = existsSync('dist/index.html');
/** حزمة dist إن وُجدت — لا يرث E2E_USE_PREVIEW=0 من جلسة سابقة. للتطوير رغم dist: E2E_FORCE_DEV=1 */
const previewFlag =
    process.env.E2E_FORCE_DEV === '1' ? '0' : distReady ? '1' : process.env.E2E_USE_PREVIEW ?? '0';

console.log(`[repository-e2e] E2E_USE_PREVIEW=${previewFlag} distReady=${distReady}`);

run('playwright', 'npx', ['playwright', 'test', ...SPECS, '--workers=1', ...projectFlags], {
    ...process.env,
    E2E_USE_PREVIEW: previewFlag,
    PW_WORKERS: process.env.PW_WORKERS ?? '1',
});
