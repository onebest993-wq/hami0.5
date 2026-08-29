#!/usr/bin/env node
/**
 * بوابة إغلاق قسم الدعاوى — أمان + سلامة بيانات + هيكل + اختبارات حرجة.
 *
 * Usage:
 *   npm run gate:lawsuits
 *   npm run gate:lawsuits -- --with-e2e   # Vite :8080 (G1+G2). LAWSUITS_E2E_USE_PREVIEW=1 للشرائح
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
    startPreviewServer,
    stopPreviewServer,
    verifyPreviewE2eReady,
} from './e2e-preview-manager.mjs';

const LAWSUITS_GATE_E2E_SPECS = [
    'e2e/civil-lawsuit-smoke.spec.ts',
    'e2e/civil-lawsuit-procedural.spec.ts',
    'e2e/civil-lawsuit-new-case.spec.ts',
    'e2e/civil-lawsuit-scenarios.spec.ts',
    'e2e/civil-lawsuit-lifecycle.spec.ts',
    'e2e/criminal-dossier-open.spec.ts',
];

const withE2e = process.argv.includes('--with-e2e');

const criticalPaths = [
    'src/app/domain/lawsuit/lawsuitFilesRepository.ts',
    'src/app/domain/lawsuit/lawsuitFileMutationGuard.ts',
    'src/app/services/cloudSyncEngine.ts',
    'src/app/utils/lawsuitDossierTombstones.ts',
    'src/app/services/caseShare/caseShareDossierOwnership.ts',
    'src/app/components/lawyer/smart-modal/SmartFileModalContent.tsx',
    'src/app/components/lawyer/criminal-system/criminalStore.ts',
    'src/app/components/lawyer/criminal-system/criminalStorePersistOptions.ts',
    'src/app/services/criminalShardedPersistStorage.ts',
    'e2e/civil-lawsuit-smoke.spec.ts',
    'e2e/civil-lawsuit-cloud-sync.spec.ts',
    'e2e/helpers/cloudLawsuitE2EFixtures.ts',
];

let failed = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    failed = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

function run(name, cmd, args, opts = {}) {
    console.log(`\n[lawsuits-gate] ${name}...`);
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

console.log('=== Lawsuits production gate ===\n');

for (const path of criticalPaths) {
    if (existsSync(path)) ok(path);
    else fail(`missing ${path}`);
}

if (!run('import-cycles', 'npm', ['run', 'guard:cycles'])) process.exit(1);

run('lawsuit-domain', 'npx', [
    'vitest',
    'run',
    'src/app/domain/lawsuit',
    '--reporter=dot',
]);

run('lawsuit-persist-layer', 'npx', [
    'vitest',
    'run',
    'src/app/hooks/__tests__/useLawsuitFileMutations.persist.test.ts',
    'src/app/domain/lawsuit/__tests__/lawsuitFileMutationGuard.test.ts',
    'src/app/domain/lawsuit/__tests__/lawsuitSegmentStorage.test.ts',
    'src/app/domain/lawsuit/__tests__/lawsuitFilesRepository.test.ts',
    'src/app/components/lawyer/smart-modal/smartFile/__tests__/cloudSavePayload.test.ts',
    'src/app/services/__tests__/cloudSyncLawsuitTombstoneGuard.test.ts',
    'src/app/services/__tests__/cloudSyncLawsuitBucket.test.ts',
    'src/app/utils/__tests__/lawsuitTrash.test.ts',
    'src/app/utils/__tests__/lawsuitFilesStorage.test.ts',
    '--reporter=dot',
]);

run('caseShare', 'npx', ['vitest', 'run', 'src/app/services/caseShare', '--reporter=dot']);

run('smartFile', 'npx', [
    'vitest',
    'run',
    'src/app/components/lawyer/smart-modal/smartFile',
    '--reporter=dot',
]);

run('criminal-system', 'npx', [
    'vitest',
    'run',
    'src/app/components/lawyer/criminal-system',
    '--reporter=dot',
]);

run('criminal-shard-storage', 'npx', [
    'vitest',
    'run',
    'src/app/services/criminalShardedPersistStorage.test.ts',
    'src/app/services/secureStorageKeys.test.ts',
    'src/app/services/__tests__/plaintextFallbackVisibility.test.ts',
    '--reporter=dot',
]);

run('lawsuits-mobile-touch-floors', 'npx', [
    'vitest',
    'run',
    'src/app/components/lawyer/ArchivePortal/__tests__/lawsuitArchiveTouchTargetFloors.test.ts',
    'src/app/components/lawyer/smart-modal/__tests__/smartFileTouchTargetFloors.test.ts',
    '--reporter=dot',
]);

run('lawsuits-workspace-chrome', 'npx', [
    'vitest',
    'run',
    'src/app/components/lawyer/dashboard/__tests__/lawsuitsResourceHonesty.test.ts',
    'src/app/components/lawyer/dashboard/__tests__/LawsuitsWorkspaceShell.close.test.tsx',
    'src/app/runtime/__tests__/phase15SectionFirstOpenCut.test.ts',
    'src/app/runtime/__tests__/phase16LawsuitChromeCut.test.ts',
    '--reporter=dot',
]);

async function runLawsuitsE2e() {
    for (const spec of LAWSUITS_GATE_E2E_SPECS) {
        if (!existsSync(spec)) fail(`missing e2e ${spec}`);
        else ok(`e2e spec ${spec}`);
    }

    const usePreview = process.env.LAWSUITS_E2E_USE_PREVIEW === '1';

    if (!usePreview) {
        // ويندوز: vite preview يُقتل بعد ~2–4 د. محور الإثبات المستقر هو Vite :8080.
        console.log('[lawsuits-gate] E2E axis: Vite :8080 (LAWSUITS_E2E_USE_PREVIEW=1 for preview slices)');
        const viteEnv = {
            ...process.env,
            E2E_USE_PREVIEW: '0',
            E2E_SKIP_WEBSERVER: process.env.E2E_SKIP_WEBSERVER ?? '0',
            PW_WORKERS: '1',
            CI: '',
        };
        run('e2e-g1', 'npx', [
            'playwright',
            'test',
            'e2e/civil-lawsuit-smoke.spec.ts',
            'e2e/civil-lawsuit-procedural.spec.ts',
            'e2e/civil-lawsuit-new-case.spec.ts',
            'e2e/civil-lawsuit-lifecycle.spec.ts',
            'e2e/criminal-dossier-open.spec.ts',
            '--project=chromium',
            '--workers=1',
            '--retries=1',
            '--trace=off',
        ], { env: viteEnv });
        run('e2e-g2-scenarios', 'npx', [
            'playwright',
            'test',
            'e2e/civil-lawsuit-scenarios.spec.ts',
            '--project=chromium',
            '--workers=1',
            '--retries=1',
            '--trace=off',
        ], { env: viteEnv });
        return;
    }

    const skipBuild = process.env.LAWSUITS_E2E_SKIP_BUILD === '1' && existsSync('dist/index.html');
    if (skipBuild) {
        console.log('[lawsuits-gate] skipping build:e2e (LAWSUITS_E2E_SKIP_BUILD=1, dist present)');
    } else if (!run('build:e2e', 'npm', ['run', 'build:e2e'])) {
        return;
    }

    const previewEnv = {
        ...process.env,
        E2E_SKIP_WEBSERVER: '1',
        E2E_USE_PREVIEW: '1',
        LAWSUITS_E2E_SKIP_BUILD: '1',
    };

    // شريحة = اختبار واحد تقريباً: vite preview على ويندوز يُقتل بعد ~2–4 د.
    const e2eSlices = [
        { name: 'e2e-smoke-open', args: ['e2e/civil-lawsuit-smoke.spec.ts', '--grep', 'opens lawsuits workspace'] },
        { name: 'e2e-smoke-reload', args: ['e2e/civil-lawsuit-smoke.spec.ts', '--grep', 'reload keeps dossier'] },
        { name: 'e2e-smoke-back', args: ['e2e/civil-lawsuit-smoke.spec.ts', '--grep', 'dossier back button'] },
        { name: 'e2e-procedural-add', args: ['e2e/civil-lawsuit-procedural.spec.ts', '--grep', 'adds administrative'] },
        { name: 'e2e-procedural-survive', args: ['e2e/civil-lawsuit-procedural.spec.ts', '--grep', 'survives closing'] },
        { name: 'e2e-procedural-toggle', args: ['e2e/civil-lawsuit-procedural.spec.ts', '--grep', 'toggles task'] },
        { name: 'e2e-new-case-open', args: ['e2e/civil-lawsuit-new-case.spec.ts', '--grep', 'opens civil jurisdiction'] },
        { name: 'e2e-new-case-civil', args: ['e2e/civil-lawsuit-new-case.spec.ts', '--grep', 'creates civil lawsuit'] },
        { name: 'e2e-new-case-ps-kw', args: ['e2e/civil-lawsuit-new-case.spec.ts', '--grep', 'personal-status keywords'] },
        { name: 'e2e-new-case-ps-create', args: ['e2e/civil-lawsuit-new-case.spec.ts', '--grep', 'creates personal-status'] },
        { name: 'e2e-lifecycle-trash', args: ['e2e/civil-lawsuit-lifecycle.spec.ts', '--grep', 'trash and restores'] },
        { name: 'e2e-lifecycle-archive', args: ['e2e/civil-lawsuit-lifecycle.spec.ts', '--grep', 'archives a file'] },
        { name: 'e2e-lifecycle-delete', args: ['e2e/civil-lawsuit-lifecycle.spec.ts', '--grep', 'permanently deletes'] },
        { name: 'e2e-criminal-open', args: ['e2e/criminal-dossier-open.spec.ts', '--grep', 'تبويب جزائي'] },
        { name: 'e2e-criminal-close', args: ['e2e/criminal-dossier-open.spec.ts', '--grep', 'زر الإغلاق'] },
        { name: 'e2e-criminal-back', args: ['e2e/criminal-dossier-open.spec.ts', '--grep', 'زر الرجوع'] },
        { name: 'e2e-sc-high-claim', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'auto-switches stage'] },
        { name: 'e2e-sc-fixed-fee', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'fixed-fee type'] },
        { name: 'e2e-sc-appeal-roles', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'appeal court shows'] },
        { name: 'e2e-sc-blocked-ps', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'blocked personal-status'] },
        { name: 'e2e-sc-no-client', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'save without'] },
        { name: 'e2e-sc-interpleader-ui', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'interpleader third party disabled'] },
        { name: 'e2e-sc-persist-high', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'persists stage'] },
        { name: 'e2e-sc-persist-inter', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'creates case with interpleader'] },
        { name: 'e2e-sc-persist-undetermined', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'undetermined value flag'] },
        { name: 'e2e-sc-filter', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'archive filter'] },
        { name: 'e2e-sc-eviction', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'eviction type'] },
        { name: 'e2e-sc-one-client', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'only one'] },
        { name: 'e2e-sc-affiliative', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'affiliative third party'] },
        { name: 'e2e-sc-retrial-hides', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'retrial stage hides'] },
        { name: 'e2e-sc-absent', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'absent objection'] },
        { name: 'e2e-sc-extra-req', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'requires underlying stage'] },
        { name: 'e2e-sc-retrial-create', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'creates retrial case'] },
        { name: 'e2e-sc-appeal-route', args: ['e2e/civil-lawsuit-scenarios.spec.ts', '--grep', 'appeal route'] },
    ];

    let previewStarted = null;
    try {
        for (const slice of e2eSlices) {
            await stopPreviewServer(previewStarted);
            previewStarted = await startPreviewServer({ force: true, keepAttached: true });
            await verifyPreviewE2eReady();
            console.log(`\n[lawsuits-gate] preview ready for ${slice.name}`);
            run(slice.name, 'npx', [
                'playwright',
                'test',
                ...slice.args,
                '--project=chromium',
                '--workers=1',
                '--retries=1',
                '--trace=off',
            ], { env: { ...previewEnv, PW_WORKERS: '1', CI: '' } });
        }
    } catch (previewErr) {
        fail(
            `preview lifecycle: ${previewErr instanceof Error ? previewErr.message : String(previewErr)}`,
        );
    } finally {
        await stopPreviewServer(previewStarted);
    }
}

if (withE2e) {
    await runLawsuitsE2e();
}

console.log('\n=== Gate result ===');
if (failed) {
    console.error('FAILED');
    process.exit(1);
}

console.log('PASSED');
if (!withE2e) {
    console.log('(E2E skipped — run: npm run release:check:lawsuits for full axis)');
}
process.exit(0);
