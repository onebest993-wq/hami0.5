#!/usr/bin/env node
/**
 * بوابة أداء قسم الدعاوى — TTFI فتح الإضبارة (desktop + mobile واقعي).
 *
 *   npm run gate:lawsuits:perf              # Vite :8080 — desktop + Pixel 7 (بدون CDP slow-mobile)
 *   LAWSUITS_E2E_USE_PREVIEW=1 npm run gate:lawsuits:perf   # preview 4173
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const reportPath = resolve(ROOT, 'perf-reports/lawsuits-dossier-ttfi.json');

/** يمنع الانحدار في CI/preview */
const REGRESSION_BUDGETS = {
    desktop: { dossierOpenMs: 20_000, totalMs: 30_000 },
    mobile: { dossierOpenMs: 12_000, totalMs: 35_000 },
};

/** أهداف «عالمي» — تُبلَّغ دون فشل البوابة */
const ASPIRATION_BUDGETS = {
    desktop: { dossierOpenMs: 8_000, totalMs: 15_000 },
    mobile: { dossierOpenMs: 5_000, totalMs: 12_000 },
};

const SCENARIOS = [
    { device: 'desktop', throttle: 'none', samples: 2 },
    // Pixel 7 بدون CDP slow-mobile: التخفيض يمنع وصول lawyer-dashboard-ready على هذا الجهاز.
    { device: 'mobile', throttle: 'none', samples: 2 },
];

function runProbe(device, throttle, samples) {
    const usePreview = process.env.LAWSUITS_E2E_USE_PREVIEW === '1';
    const args = [
        'scripts/lawsuits-dossier-ttfi-probe.mjs',
        ...(usePreview ? ['--preview'] : ['--url=http://localhost:8080']),
        `--device=${device}`,
        `--throttle=${throttle}`,
        `--samples=${samples}`,
    ];
    const result = spawnSync('node', args, {
        cwd: ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
        console.error(`✗ TTFI probe failed (${device}/${throttle})`);
        process.exit(1);
    }
}

const needPreviewBuild =
    process.env.LAWSUITS_E2E_USE_PREVIEW === '1' &&
    (!existsSync(resolve(ROOT, 'dist/index.html')) || process.env.LAWSUITS_E2E_SKIP_BUILD !== '1');

if (needPreviewBuild) {
    const build = spawnSync('npm', ['run', 'build:e2e'], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: {
            ...process.env,
            VITE_SHELL_AUTH_OPEN: 'true',
            VITE_BFF_AUTH: 'true',
        },
    });
    if (build.status !== 0) process.exit(1);
}

console.log('=== Lawsuits perf gate (dossier TTFI) ===\n');

let aspirationMisses = 0;

for (const scenario of SCENARIOS) {
    const { device, throttle, samples } = scenario;
    console.log(`\n--- ${device} (throttle=${throttle}, samples=${samples}) ---`);
    runProbe(device, throttle, samples);

    if (!existsSync(reportPath)) {
        console.error('✗ missing perf report');
        process.exit(1);
    }

    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const marks = report.marks ?? {};
    const regression = REGRESSION_BUDGETS[device];
    const aspiration = ASPIRATION_BUDGETS[device];

    for (const [key, limit] of Object.entries(regression)) {
        const value = marks[key];
        if (typeof value !== 'number') {
            console.error(`✗ missing mark ${key}`);
            process.exit(1);
        }
        if (value > limit) {
            console.error(`✗ ${device} ${key}=${value}ms exceeds regression budget ${limit}ms`);
            process.exit(1);
        }
        console.log(`✓ ${device} ${key}=${value}ms (regression ≤${limit}ms)`);
    }

    for (const [key, target] of Object.entries(aspiration)) {
        const value = marks[key];
        if (typeof value === 'number' && value > target) {
            aspirationMisses += 1;
            console.warn(`⚠ aspiration miss: ${device} ${key}=${value}ms (target ≤${target}ms)`);
        }
    }

    if (report.deviceProfile) {
        console.log(`  profile: ${report.deviceProfile} · throttle: ${report.throttle ?? 'none'}`);
    }
}

console.log('\nPASSED — lawsuits dossier TTFI within regression budgets');
if (aspirationMisses > 0) {
    console.log(`(aspiration: ${aspirationMisses} mark(s) above world-class target — informational)`);
}
