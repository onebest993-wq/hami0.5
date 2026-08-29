#!/usr/bin/env node
/**
 * Execution world-class gate — all axes (see docs/execution-validation-gate.md)
 *
 * Usage: npm run gate:execution
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { EXECUTION_GATE_E2E_SPECS } from './execution-gate-manifest.mjs';
import { startPreviewServer, stopPreviewServer, verifyPreviewE2eReady } from './e2e-preview-manager.mjs';

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

function run(name, cmd, args, opts = {}) {
    console.log(`\n[execution-gate] ${name}...`);
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...opts,
    });
    if (result.status !== 0) {
        fail(name);
        return false;
    }
    ok(name);
    return true;
}

/**
 * إعادة محاولة — يغطي تذبذب vitest/probes.
 * لا يُعلَّم failed إلا بعد استنفاد كل المحاولات (نجاح لاحق يلغي فشل المحاولة الأولى).
 */
function runWithRetry(name, cmd, args, opts = {}, retries = 1) {
    const maxAttempts = Math.max(1, retries + 1);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const label = attempt === 0 ? name : `${name} (retry ${attempt})`;
        console.log(`\n[execution-gate] ${label}...`);
        const result = spawnSync(cmd, args, {
            stdio: 'inherit',
            shell: process.platform === 'win32',
            ...opts,
        });
        if (result.status === 0) {
            ok(label);
            return true;
        }
        console.error(`✗ ${label}`);
    }
    fail(name);
    return false;
}

async function main() {
    console.log('=== Execution validation gate (world-class axes) ===\n');

    for (const doc of ['docs/execution-validation-gate.md', 'execution-coverage-matrix.md']) {
        if (existsSync(doc)) ok(`doc ${doc}`);
        else {
            console.warn(`⚠ missing ${doc} (non-blocking until restored)`);
        }
    }

    run('audit-execution-snapshot', 'npm', ['run', 'audit:execution-snapshot']);
    run('audit-execution-chunk-scope', 'npm', ['run', 'audit:execution-chunk-scope']);

    runWithRetry('execution-dashboard-unit', 'npx', [
        'vitest',
        'run',
        'src/app/components/lawyer/ExecutionDashboard',
        '--reporter=dot',
        '--pool=forks',
        '--maxWorkers=4',
    ]);

    run('execution-application-unit', 'npx', [
        'vitest',
        'run',
        'src/app/application/execution',
        '--reporter=dot',
    ]);

    run('execution-domain-unit', 'npx', [
        'vitest',
        'run',
        'src/app/utils/__tests__/executionSummonsWorkflow.test.ts',
        'src/app/utils/__tests__/executionDossierIsolation.test.ts',
        'src/app/components/lawyer/ExecutionDashboard/helpers/__tests__/executionPersistPatchSanitizer.test.ts',
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/__tests__/useExecutionDashboardPersistExecutionMerge.uiFirst.test.ts',
        '--reporter=dot',
    ]);

    run('execution-legal-subset', 'npx', [
        'vitest',
        'run',
        'src/app/application/execution/followup/__tests__/buildDebtorSummonsProfileBundle.test.ts',
        '--reporter=dot',
    ]);

    const e2eSpecs = EXECUTION_GATE_E2E_SPECS;

    for (const spec of e2eSpecs) {
        if (!existsSync(spec)) fail(`missing e2e ${spec}`);
        else ok(`e2e spec ${spec}`);
    }

    run('build:e2e', 'npm', ['run', 'build:e2e']);

    const previewEnv = {
        ...process.env,
        E2E_SKIP_WEBSERVER: '1',
        E2E_USE_PREVIEW: '1',
    };

    let previewStarted = null;
    try {
        previewStarted = await startPreviewServer({ force: true, keepAttached: true });
        await verifyPreviewE2eReady();
        console.log('\n[execution-gate] preview server ready for probes + E2E');

        runWithRetry('execution-probes-gate', 'npm', ['run', 'gate:execution:probes'], {
            env: {
                ...previewEnv,
                E2E_KEEP_PREVIEW: '1',
                PREVIEW_MANAGED_BY_PARENT: '1',
            },
        });

        runWithRetry('execution-e2e-suite', 'npx', [
            'playwright',
            'test',
            ...e2eSpecs,
            '--project=chromium',
            '--workers=1',
            '--retries=1',
            '--trace=off',
        ], { env: { ...previewEnv, CI: '', PW_WORKERS: '1' } });
    } catch (previewErr) {
        fail(
            `preview lifecycle: ${previewErr instanceof Error ? previewErr.message : String(previewErr)}`,
        );
    } finally {
        await stopPreviewServer(previewStarted);
    }

    console.log('\n=== Gate result ===');
    if (failed) {
        console.error('FAILED — see execution-coverage-matrix.md for axis mapping');
        process.exit(1);
    }

    console.log('PASSED — all documented execution axes green in this gate');
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
